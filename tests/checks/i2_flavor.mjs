// I2：アイテムひとつずつのフレーバーの説明（src/data/i2_flavor.js・src/engine/i2_flavor.js・src/ui/zi2_flavor.js）
// - 全アイテムに説明（it.flavor）がある。表に、無いアイテムの id が無い
// - 長さが 40〜200 字ほど・二文以上。説明どうしが重ならない
// - 禁じた言葉が無い（u3_voice の BANNED と、d6_walker の「魔王」・神々の裏設定の言葉、d8・d9 の古い設定）
// - 手に入れたときに開く用語は、ある項目・行を指していて、職業の持ち始めの品には付いていない。手に入れると開く
// - 効果の短い説明（G.itemEffect）が、どのアイテムでも文字列で返る
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const u3 = readFileSync(here("./u3_voice.mjs"), "utf8").match(/const BANNED = \/(.+)\/;/);
const BANNED = new RegExp(u3 ? u3[1] : "見世物|観客|客席|舞台|台本|言霊");
const SECRET = /魔王|神々|もういない|正体|眺めて/;
const OLD = /八雲|魔物界|ロゥム|酒呑|侍と忍|十二単|ミルザ|グラウ(?!ンド)|レヴィアン|ゴルモア|ザルヴェ|アウレリア|宵姫|モルドゥ|シェザール|ユラ|アズラグ|ルグゥ|ノタリ|狐面|丁半|皇子|病床|鬼灯/;
const SEX = /裸|夜伽|色事|乳房/;

export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const before = { n: 0 };
  const F = (m) => { before.n++; fail("I2: " + m); };

  // ---- 全アイテムに説明
  const ids = Object.keys(D.ITEMS);
  for (const id of ids) {
    const t = D.ITEMS[id].flavor;
    if (typeof t !== "string" || !t) { F(`${id}（${D.ITEMS[id].name}）に説明が無い`); continue; }
    if (G.itemFlavor(id) !== t) F(`${id}: G.itemFlavor が説明を返さない`);
    const len = [...t].length;
    if (len < 40 || len > 200) F(`${id}: 説明の長さが ${len} 字（40〜200）`);
    const sentences = t.split("。").filter((s) => s.trim()).length;
    if (sentences < 2) F(`${id}: 説明が一文だけ`);
    for (const [re, why] of [[BANNED, "禁じた言葉"], [SECRET, "明かさない言葉"], [OLD, "古い設定"], [SEX, "性的な言葉"]]) {
      const m = t.match(re);
      if (m) F(`${id}: 説明に${why}「${m[0]}」`);
    }
    if (/！/.test(t.replace(/「[^」]*」/g, ""))) F(`${id}: 地の文に「！」`);
    if (typeof G.itemEffect(D.ITEMS[id]) !== "string") F(`${id}: G.itemEffect が文字列を返さない`);
  }
  for (const id of Object.keys(D.I2_FLAVOR)) if (!D.ITEMS[id]) F(`表の ${id} はアイテムに無い`);
  const seen = new Map();
  for (const [id, t] of Object.entries(D.I2_FLAVOR)) { if (seen.has(t)) F(`${id} と ${seen.get(t)} の説明が同じ`); seen.set(t, id); }
  if (G.itemFlavor("x:謎の石") !== "") F("その場で作った物（x:）に説明を返す");

  // ---- 効果の短い説明
  if (!/1D4\+1/.test(G.itemEffect(D.ITEMS.dagger))) F(`短剣の効果に威力が無い：${G.itemEffect(D.ITEMS.dagger)}`);
  if (!/逃げられ/.test(G.itemEffect(D.ITEMS.smoke))) F(`煙玉の効果に「逃げられる」が無い：${G.itemEffect(D.ITEMS.smoke)}`);
  if (!/筋力\+5/.test(G.itemEffect(D.ITEMS.i1_fangring))) F(`牙の指輪の効果に筋力+5 が無い：${G.itemEffect(D.ITEMS.i1_fangring)}`);

  // ---- 用語説明のきっかけ
  const valid = (t) => { const [id, key] = String(t).split(":"); const e = D.LORE[id]; return !!e && (!key || e.lines.some((l) => l[0] === key)); };
  const list = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const start = new Set(Object.values(D.CLASSES).flatMap((c) => [c.weapon, c.armor, ...Object.keys(c.items || {})]).filter(Boolean));
  for (const [id, t] of Object.entries(D.I2_LORE || {})) {
    if (!D.ITEMS[id]) F(`I2_LORE: ${id} はアイテムに無い`);
    if (start.has(id)) F(`I2_LORE: ${id} は職業の持ち始めの品（はじめから用語が開く）`);
    list(t).forEach((x) => { if (!valid(x)) F(`I2_LORE.${id}: ${x} が無い`); if (!list(D.LORE_ON.item[id]).includes(x)) F(`I2_LORE.${id}: ${x} が LORE_ON.item に足されていない`); });
  }
  if (!list(D.LORE_ON.item.volgrim).includes("swords:volgrim")) F("もとの LORE_ON.item（volgrim）が消えた");
  {
    const G2 = loadEngine();
    G2.rand = seeded(5);
    G2.P = { trophies: {}, graves: [] };
    const D2 = G2.data;
    const stats = Object.fromEntries(D2.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D2.STATS.map((k) => [k, 80]));
    G2.newGame({ cls: Object.keys(D2.CLASSES)[0], stats, caps, goal: Object.keys(D2.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G2.give("w2_honeycake");
    if (!((G2.S.lore || {}).u7_races || []).includes("elf")) F(`蜜菓子を手に入れても「エルフ」の行が開かない：${JSON.stringify(G2.S.lore)}`);
  }

  if (!before.n) ok(`I2 フレーバー（${ids.length} 品・用語のきっかけ ${Object.keys(D.I2_LORE || {}).length}）`);
};
