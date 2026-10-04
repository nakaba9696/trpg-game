// V12：物語の文（地の文・台詞・噂・覚え書き・手引きの行・図鑑の覚え書きなど）に、ゲームの内部の数を出さない
// この世界の人は、名声・好感度・能力値・成功率・HP などの数を知らない（持ち主の方針）。
// - 物の値段・報酬・日数・人数など、世界の人が口にする数はよい（拾う形にしていない）
// - 画面の案内（選択肢の横の sub・トロフィー・決まりの説明・作成画面の表・GM だけに渡す裏設定・作り手のメモ）は対象外
// - 1. G.data の文を全部たどる  2. src/engine の文字列のうち、地の文・台詞らしいもの（「 か 。 を含む）を拾う
// - 3. 用語（手引き）の見出しが「あれ」「〜の誰か」のような指示語・あいまいな言葉でない（V12 の続き）
import { readFileSync, readdirSync } from "node:fs";

const KW = "(名声|評判|好感度?|信頼度|能力値?|成功率|命中率?|経験値?|レベル|HP|MP|筋力|体力|敏捷|知力|魔力|魅力|正気度?)";
const BAD = new RegExp(`${KW}[^。」、]{0,6}?[0-9０-９]+|[0-9０-９]+\\s*[%％]`);

// たどらない項目（画面の案内・作り手のメモ・GM だけの文）
const SKIP_KEY = new Set(["note", "hint", "sub", "secret", "test", "need"]);
const SKIP_TOP = new Set(["RULES_TEXT", "TROPHIES", "STAT_HINT", "CLASSES", "GOALS", "LORE_GM", "worldPrompt", "S2", "R1_TRAITS", "SPELLS", "FAME_RANKS", "DIFF"]);
// アイテムの説明の頭にある効き目の一覧（「筋力+5・盗み+10。」）は、装備の案内なので除く
const stripEffects = (t) => t.replace(/^(?:(?:[^・。]+[+\-−][0-9]+|呪い)[・。])+/, "");
// 誤検出の許し表（物語の文ではない、または世界の人が口にして自然な数）
const ALLOW = ["（最大 HP -1）"];
// src/engine で見ないファイル（GM への指示・遊び方の案内）
const SKIP_FILE = new Set(["gm.js", "u4_guide.js"]);

const literals = (src) => {
  const out = [];
  let i = 0, line = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === "\n") { line++; i++; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); line += (src.slice(i, e).match(/\n/g) || []).length; i = e + 2; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1, s = "";
      const l0 = line;
      while (j < src.length && src[j] !== c) { if (src[j] === "\\") { s += src[j + 1]; j += 2; continue; } if (src[j] === "\n") line++; s += src[j]; j++; }
      out.push([l0, s]);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
};

export default ({ fail, ok, loadEngine }) => {
  let failures = 0;
  const F = (m) => { failures++; fail(m); };
  const bad = (t) => { let s = t; ALLOW.forEach((a) => { s = s.split(a).join(""); }); return BAD.test(s) ? s.match(BAD)[0] : null; };

  // 1. データの文
  const G = loadEngine();
  const D = G.data;
  const seen = new Set();
  let n = 0;
  const walk = (x, path) => {
    if (x == null) return;
    if (typeof x === "string") {
      n++;
      const t = path.startsWith("ITEMS.") && path.endsWith(".desc") ? stripEffects(x) : x;
      const m = bad(t);
      if (m) F(`物語の文に内部の数「${m}」：${path}「${x.slice(0, 50)}…」`);
      return;
    }
    if (typeof x !== "object" || seen.has(x)) return;
    seen.add(x);
    for (const [k, v] of Object.entries(x)) if (!SKIP_KEY.has(k)) walk(v, `${path}.${k}`);
  };
  for (const [k, v] of Object.entries(D)) if (!SKIP_TOP.has(k)) walk(v, k);

  // 2. エンジンの地の文・台詞
  const dir = new URL("../../src/engine/", import.meta.url);
  let m2 = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".js") && !SKIP_FILE.has(x))) {
    for (const [line, s] of literals(readFileSync(new URL(f, dir), "utf8"))) {
      if (!/[「。]/.test(s)) continue;
      m2++;
      const m = bad(s);
      if (m) F(`物語の文に内部の数「${m}」：src/engine/${f}:${line}「${s.slice(0, 50)}…」`);
    }
  }

  // 3. 用語（手引き）の見出しは、ひと目で何の用語か分かる単語にする（指示語・あいまいな言葉・文の切れ端にしない）
  const VAGUE = /^(あれ|これ|それ|あそこ|そこ|もの|こと)$|^(例の|あの|その|この)|(誰か|何か|のこと|やつ)$|…|。|「/;
  const vague = (t) => !t || VAGUE.test(t);
  for (const [id, e] of Object.entries(D.LORE || {})) if (vague(e.title)) F(`用語の見出しが指示語・あいまい：${id}「${e.title}」`);
  if (!vague("あれ") || !vague("足音のしない誰か") || vague("手に負えない化け物") || vague("畑を動かすもの") || vague("あれこれ帳")) F("用語の見出しの確かめが効いていない");

  // 拾い方が効いているか（作った例で）
  if (!bad("情報屋が囁いた。「名声150と金500だ」")) F("「名声150」を拾えない");
  if (!bad("命中はおよそ55%。")) F("「55%」を拾えない");
  if (bad("宿の主が言った。「一晩 20 G だ」")) F("値段を誤って拾う");

  if (!failures) ok(`V12 物語の文に内部の数が無い（データの文 ${n} 件・エンジンの地の文 ${m2} 件）`);
};
