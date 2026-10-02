// A5：男の型（docs/art/style_male.json の types・docs/art/portraits.json の type・tools/gen_portraits.mjs）
// - 型は ojisan・classic・bishonen・brute（ほか elder・boy）があり、どれも prefix を持つ。共通の prefix に handsome が無い（型の側に置く）
// - ネガティブの ugly face を外すのは brute だけ。default_type が型にある
// - 男の人物（tools/portraits.mjs の isMale）はみな type を持ち、それが型にある。男でない人は type を持たない。ojisan がいちばん多い
// - 型と矛盾する体つきの語が identity・tags に無い（巨漢なのに slender など）
// - 型の語・男の人物のタグに作家名・作品名らしき語が無い（特徴の語だけで書く）
// - 生成の道具が型を読み（types・negative_remove・negative_add）、--type で型を選べる
import { readFileSync } from "node:fs";
import { JSON_PATH, isMale } from "../../tools/portraits.mjs";

const NEED = ["ojisan", "classic", "bishonen", "brute"];
// 作家・作品の名前を書かない（持ち主の好みの作家も、その作品も）。by / artist: / style of のような作家指定の形も
const NAMES = /\bkita\b|yasuaki|木多|康昭|makuhari|幕張|kenka\s*(shoubai|shobai|kagyou|kagyo)|喧嘩(商売|稼業)|uguisu|うぐいす|artist:|\b(drawn|art|illustrated|artwork) by\b|style of|in the style|\(artist\)/i;
const CLASH = {
  brute: /\b(slender|slim|lean|delicate features|bishounen|petite)\b/,
  bishonen: /\b(huge man|fat|chubby|very muscular|full beard|burly)\b/,
  boy: /\b(beard|stubble|old man|middle-aged)\b/,
  elder: /\b(young man|child|boy,)\b/,
};

export default ({ fail, ok }) => {
  const F = (m) => fail("A5：" + m);
  const male = JSON.parse(readFileSync(new URL("../../docs/art/style_male.json", import.meta.url), "utf8"));
  const types = Object.fromEntries(Object.entries(male.types || {}).filter(([k]) => !k.startsWith("_")));
  for (const t of NEED) if (!types[t]) F(`style_male.json の types に ${t} が無い`);
  for (const [t, v] of Object.entries(types)) {
    if (typeof v.prefix !== "string" || !v.prefix.trim()) F(`型 ${t} に prefix が無い`);
    const txt = [v.prefix, v.negative_add, (v.negative_remove || []).join(", ")].join(", ");
    if (NAMES.test(txt)) F(`型 ${t} に作家名・作品名らしき語がある：${txt.match(NAMES)[0]}`);
    if ((v.negative_remove || []).some((x) => /ugly/i.test(x)) && t !== "brute") F(`ugly 系をネガティブから外すのは brute だけ（${t}）`);
  }
  if (!(types.brute && (types.brute.negative_remove || []).includes("ugly face"))) F("brute がネガティブの ugly face を外していない");
  if (!/\bugly face\b/.test(male.negative || "")) F("共通のネガティブに ugly face が無い（brute 以外の型で使う）");
  if (/\bhandsome\b/.test(male.prefix || "")) F("共通の prefix に handsome がある（型の側に置く）");
  if (!types[male.default_type]) F(`default_type（${male.default_type}）が types に無い`);

  const list = JSON.parse(readFileSync(JSON_PATH, "utf8")).portraits || [];
  const men = list.filter(isMale);
  const count = {};
  for (const p of list) {
    if (!isMale(p)) { if (p.type !== undefined) F(`${p.id} は男でないのに type がある`); continue; }
    if (!p.type) { F(`${p.id}（${p.name}）に男の型（type）が無い`); continue; }
    if (!types[p.type]) { F(`${p.id} の型 ${p.type} が style_male.json に無い`); continue; }
    count[p.type] = (count[p.type] || 0) + 1;
    const txt = [p.identity, p.tags, p.face, ...Object.values(p.variants || {})].filter(Boolean).join(", ");
    if (NAMES.test(txt)) F(`${p.id} のタグに作家名・作品名らしき語がある：${txt.match(NAMES)[0]}`);
    const c = CLASH[p.type];
    const look = [p.identity, p.tags].filter(Boolean).join(", ");
    if (c && c.test(look)) F(`${p.id} の型 ${p.type} と矛盾する語がある：${look.match(c)[0]}`);
  }
  if (men.length < 40) F(`男の人物が少ない：${men.length}`);
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[0] !== "ojisan") F(`ojisan がいちばん多い型でない：${JSON.stringify(count)}`);
  for (const t of NEED) if (!count[t]) F(`型 ${t} の男がいない`);

  const gen = readFileSync(new URL("../../tools/gen_portraits.mjs", import.meta.url), "utf8");
  if (!/m\.types/.test(gen) || !/negative_remove/.test(gen) || !/negative_add/.test(gen)) F("tools/gen_portraits.mjs が型（types・negative_remove・negative_add）を読んでいない");
  if (!/"--type"/.test(gen)) F("tools/gen_portraits.mjs に --type が無い");
  if (!/P\.isMale/.test(gen)) F("tools/gen_portraits.mjs の男の見分けが tools/portraits.mjs の isMale でない");

  ok(`A5：男 ${men.length} 人に型（${Object.entries(count).map(([k, v]) => `${k} ${v}`).join("・")}）、作家名なし`);
};
