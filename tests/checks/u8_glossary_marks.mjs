// U8：用語集に載る言葉の強調（src/ui/u8_glossary.js・u8_glossary.css）。DOM なしで確かめられる範囲
// - 本文から用語の位置を拾う関数（G.gloss.find・split）が、手引きに開いている語だけを返す（まだ開いていない語・〔秘〕は返さない）
// - 同じ語（同じ項目）は一つの場面で一度だけ。別名（hint）も同じ項目として数える。長い語を先に当てる
// - 新しく載った項目を、前の写しとの差で拾える（G.gloss.fresh）
// - 他の画面（I2 など）が呼ぶ入口 G.gloss.mark がある。見た目がビルドに入っている
import { readFileSync } from "node:fs";
import vm from "node:vm";

const PROFILE = { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" };

export default ({ fail: failTo, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U8：" + m); };
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;
  vm.runInContext(src("ui/u8_glossary.js"), vm.createContext({ console, G }), { filename: "ui/u8_glossary.js" });
  const gl = G.gloss;
  const need = ["words", "find", "split", "fresh", "snap", "tipText", "noteTitle", "aliasOk", "titleOk"];
  if (!gl || need.some((k) => typeof gl[k] !== "function")) return fail("G.gloss の入口が足りない");
  if (!/gl\.mark = /.test(src("ui/u8_glossary.js"))) fail("ほかの画面から呼ぶ G.gloss.mark が無い");

  G.P = { trophies: {}, graves: [] };
  G.rand = seeded(8);
  const cls = Object.keys(D.CLASSES)[0];
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; caps[k] = stats[k] + 30; });
  const S = G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { ...PROFILE } });

  const opened = (S.lore.majin || []).length > 0;
  if (opened) S.lore.majin = [];
  const text = "使徒が来る。ソラスさまに誓って、使徒は見ていない。冒険者ギルドへ行く。";

  // ---- 開いていない語は返さない
  let w = gl.words(S);
  if (w.some((x) => x.id === "majin")) fail("まだ開いていない「使徒」が言葉の表に入っている");
  if (gl.find(text, w).some((x) => x.w === "使徒" || x.w === "ソラス")) fail("まだ開いていない語を本文から拾った");
  if (!gl.find(text, w).some((x) => x.w === "冒険者ギルド")) fail("はじめから手引きに載る「冒険者ギルド」を拾わない");

  // ---- 開くと返す。同じ語は一度だけ
  const before = gl.snap(S);
  G.openLore("majin:first", true);
  G.openLore("gods:soras", true);
  w = gl.words(S);
  const hits = gl.find(text, w);
  const shito = hits.filter((x) => x.id === "majin");
  if (shito.length !== 1) fail(`「使徒」を ${shito.length} 回拾った（一度だけにしたい）`);
  else if (shito[0].at !== 0) fail("同じ語は最初の 1 回を拾いたい");
  if (!hits.some((x) => x.w === "ソラス" && x.id === "gods" && x.title === "三柱の神さま")) fail("開いた行の別名（ソラス → 三柱の神さま）を拾わない");
  hits.forEach((x) => { if (text.slice(x.at, x.at + x.len) !== x.w) fail(`位置がずれている（${x.w}）`); if (!x.tip) fail(`説明が空（${x.w}）`); });
  // 一つの場面（used を共有）では、次の文でも同じ項目は拾わない
  const used = new Set();
  gl.find("使徒が来た。", w, used);
  if (gl.find("また使徒だ。", w, used).length) fail("同じ場面の次の文で、同じ語をもう一度拾った");
  if (!gl.find("また使徒だ。", w, new Set()).length) fail("次の場面では、同じ語をまた拾いたい");
  // 切り分けると元の文に戻る
  const parts = gl.split(text, w);
  if (parts.map((p) => (typeof p === "string" ? p : p.w)).join("") !== text) fail("切り分けた文が元に戻らない");
  // 新しく載った項目
  const fr = gl.fresh(before, S);
  if (!fr.includes("majin") || !fr.includes("gods")) fail("新しく載った項目を拾わない");
  if (gl.fresh(gl.snap(S), S).length) fail("増えていないのに、新しく載ったことになる");
  if (gl.noteTitle("手引きに書き足された：使徒") !== "使徒") fail("「手引きに書き足された」の見出しを取れない");

  // ---- 長い語を先に（「レオネスト王国」を「レオネスト」より先に）・別名と見出しの決まり
  for (let i = 1; i < w.length; i++) if (w[i].w.length > w[i - 1].w.length) { fail("言葉の表が長い語から並んでいない"); break; }
  if (gl.titleOk("あれ") || gl.titleOk("格")) fail("ひらがなだけ・1 字の見出しを強調する");
  if (gl.aliasOk("七十二") || gl.aliasOk("窓に布") || !gl.aliasOk("ネフィリア") || !gl.aliasOk("黒鉄の砦")) fail("別名にする hint の選び方が違う");

  // ---- 全部開いても、〔秘〕の語・空の説明は出ない
  Object.entries(D.LORE).forEach(([id, e]) => e.lines.forEach((l) => G.openLore(`${id}:${l[0]}`, true)));
  w = gl.words(S);
  w.forEach((x) => { if (/〔秘〕/.test(x.w + x.tip)) fail(`〔秘〕の語が出る（${x.w}）`); if (!x.tip || !x.title) fail(`説明か見出しが空（${x.w}）`); });
  if (new Set(w.map((x) => x.w)).size !== w.length) fail("同じ語が言葉の表に二度ある");
  const T = gl.find("レオネスト王国のヴァレオン", w);
  if (!T.some((x) => x.w === "レオネスト王国")) fail("長い語（レオネスト王国）を先に当てていない");

  // ---- 見た目
  const css = src("ui/u8_glossary.css");
  if (!/\.u8term\b/.test(css) || !/\.u8new/.test(css) || !/#u8note/.test(css) || !/prefers-reduced-motion/.test(css)) fail("見た目（u8_glossary.css）が足りない");

  if (!bad) ok(`U8：用語の強調（言葉 ${w.length} 語・開いた語だけ・同じ語は一度・新しく載った語）`);
};
