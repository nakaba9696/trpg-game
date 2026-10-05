// D2：地名は「種類＋名前」で（決まりは src/data/d2_places.js）
// - プレイヤーが初めて目にしうる文（用語の吹き出し・手引き・図鑑・噂・依頼・出来事の地の文・人物の説明・アイテムの説明など）で、
//   町の短い名前（ヴァレンツァ）が、同じ文の中で種類つき（港町ヴァレンツァ）より先に、種類なしで出ていないか。
//   国は「レオネスト王国」のように国の名で書く。会話（「」『』の中）と、話す言葉だけの表（掛け合い・口ぐせなど）は見ない
// - 種類つきの呼び名が町ごとに一つ（港町ヴァレンツァと港の都ヴァレンツァが混ざらない）
// - {place:id}・{placeShort:id} が置き換わっている。G.placeName・G.placeShort・G.placeText・G.regionName が動く
import { readFileSync } from "node:fs";
import vm from "node:vm";

// 話す言葉だけの表と、名前そのものの表（短い名前で書くのが正しい）。E4.RG は正規表現
const SPEECH = /^(E4\.RG|TALK_BANTER|TALK_PARTS|C2_VOICE|K10_VOICE|K10_VOICE_EXCEPT|BOSS_LINES|LORE_GM|C3_NAMES|PLACE_COUNTRY|PLACE_REGION)(\.|$)/;
// 都の名が国の名と同じもの：後ろに国の種類が付けば国の名
const COUNTRY = { "レオネスト": "王国", "ノルディア": "帝国", "エルメシア": "共和国" };
// 南西の島々
const ISLES = { "シェルアーク": "諸島" };
const KIND_END = /[都町港村島里場浜庵台]$/;

export default ({ fail: failTo, ok, loadEngine }) => {
  let bad = 0;
  const fail = (m) => { bad++; if (bad <= 40) failTo("D2：" + m); };
  const G = loadEngine();
  const D = G.data;

  // 町の呼び名：種類（前）＋短い名前（終わりのカタカナ）
  const T = [];
  for (const [id, L] of Object.entries(D.LOCS)) {
    if (L.type !== "town") continue;
    const m = L.name.match(/^(.+?)([ァ-ヶー]+)$/);
    if (m) T.push({ id, full: L.name, pre: m[1], s: m[2] });
  }
  T.sort((a, b) => b.s.length - a.s.length);
  // 一つの町に一つの呼び名・短い名前も重ならない
  const byShort = {};
  T.forEach((x) => { if (byShort[x.s]) fail(`短い名前「${x.s}」が二つの町にある（${byShort[x.s]}・${x.id}）`); byShort[x.s] = x.id; });

  // 地名を含むほかの固有の名前（エルヴィナの地下墓地・シェルアーク・朧島・アイテムの名など）はそのままでよい
  const protect = [...new Set([
    ...Object.values(D.LOCS).map((L) => L.name).filter((n) => !T.some((x) => x.full === n)),
    ...Object.values(D.ITEMS).map((i) => i && i.name), ...Object.values(D.ENEMIES).map((e) => e && e.name),
  ].filter((n) => typeof n === "string" && T.some((x) => n.includes(x.s))))];
  const blank = (q) => "\0".repeat(q.length);
  const mask = (t) => {
    let s = t.replace(/「[^」]*」/g, blank).replace(/『[^』]*』/g, blank);
    protect.forEach((p) => { s = s.split(p).join(blank(p)); });
    return s;
  };
  const RE = new Map(T.map((x) => [x.s, new RegExp(`(?<![ァ-ヶー・])${x.s}(?![ァ-ヶー])`, "g")]));
  const first = (t) => {
    const s = mask(t);
    for (const x of T) {
      const re = RE.get(x.s);
      re.lastIndex = 0;
      const m = re.exec(s);
      if (!m) continue;
      const before = s.slice(0, m.index), after = s.slice(m.index + x.s.length);
      if (before.endsWith(x.pre)) continue;
      if (COUNTRY[x.s] && after.startsWith(COUNTRY[x.s])) continue;
      if (ISLES[x.s] && after.startsWith(ISLES[x.s])) continue;
      return { x, near: t.slice(Math.max(0, m.index - 8), m.index + x.s.length + 8) };
    }
    return null;
  };
  // 違う種類で呼んでいる（「王都ヴァレンツァ」など）
  const wrongKind = (t) => {
    const s = mask(t);
    for (const x of T) {
      const re = RE.get(x.s);
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(s))) {
        const before = s.slice(0, m.index);
        if (KIND_END.test(before) && !before.endsWith(x.pre) && !before.endsWith("島の都と") && !/[のと、・]$/.test(before)) {
          const k = before.match(/[\p{Script=Han}\p{Script=Hiragana}]{1,4}$/u);
          if (k && !x.pre.endsWith(k[0]) && /[都町港村]$/.test(k[0])) return { x, near: t.slice(Math.max(0, m.index - 8), m.index + x.s.length) };
        }
      }
    }
    return null;
  };

  let seen = 0;
  const visited = new Set();
  const walk = (v, path) => {
    if (SPEECH.test(path)) return;
    if (typeof v === "string") {
      seen++;
      if (/\{place(Short)?:/.test(v)) fail(`${path}：{place:…} が置き換わっていない：${v.slice(0, 40)}`);
      if (/^[ァ-ヶー・]+$/.test(v)) return; // 名前そのもの（hint・nation など）
      const b = first(v);
      if (b) fail(`${path}：「${b.x.s}」が種類なしで出ている（${b.x.full} と書く）：…${b.near}…`);
      const w = wrongKind(v);
      if (w) fail(`${path}：「${w.x.s}」を違う種類で呼んでいる（${w.x.full}）：…${w.near}…`);
      return;
    }
    if (!v || typeof v !== "object" || visited.has(v)) return;
    visited.add(v);
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + "." + i));
    else for (const [k, x] of Object.entries(v)) walk(x, path ? path + "." + k : k);
  };
  walk(D, "");

  // 用語の吹き出し（手引きに最初から載る行・開いた行の最初の一文）
  vm.runInContext(readFileSync(new URL("../../src/ui/u8_glossary.js", import.meta.url), "utf8"), vm.createContext({ console, G }), { filename: "ui/u8_glossary.js" });
  if (G.gloss) {
    const all = {};
    Object.entries(D.LORE || {}).forEach(([id, e]) => { all[id] = (e.lines || []).map((l) => l[0]); });
    const words = G.gloss.words({ lore: all, id: "d2" });
    words.forEach((w) => { const b = first(w.tip); if (b) fail(`用語の吹き出し「${w.w}」：「${b.x.s}」が種類なしで出ている：${w.tip}`); });
  } else fail("G.gloss が無い");

  // 入口
  if (G.placeName("nerva") !== "港町ヴァレンツァ" || G.placeShort("nerva") !== "ヴァレンツァ" || G.placeKind("nerva") !== "港町") fail("G.placeName・placeShort・placeKind が違う");
  if (G.placeText("{place:karna}の{placeShort:nerva}・{place:nowhere}") !== "自由都市ブランデールのヴァレンツァ・{place:nowhere}") fail("G.placeText の置き換えが違う");
  if (G.regionName("シェルアーク") !== "シェルアーク諸島" || G.regionName("使徒領") !== "使徒領") fail("G.regionName が違う");

  if (bad > 40) failTo(`D2：ほかに ${bad - 40} 件`);
  if (!bad) ok(`D2：地名は種類つきで出る（町 ${T.length}・文 ${seen}）`);
};
