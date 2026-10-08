// A10：どの人物・魔物にどの生成画像を当てるか（canvas の絵はやめた）。表を docs/art/a10_map.md に書く
//   node tools/a10_map.mjs        … 今の assets/ で表を作り直す
// 中身は tests/checks/a10_no_canvas.mjs と同じ調べ方（a10Survey）。画面の部品（art_people.js・r1_race.js・v4_assets.js・v6_monsters.js）を DOM なしで読む
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { siteAssets } from "./assets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(here, "..");
export const MAP_PATH = path.join(ROOT, "docs", "art", "a10_map.md");
export const UI_FILES = ["art_monsters.js", "art_people.js", "r1_race.js", "v4_assets.js", "v6_monsters.js"];

// 画面の部品を G に読み込む（Image は読み込みを待たない偽物）
export function loadArt(G, assets) {
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.ls = {}; }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    set src(v) { this._src = v; }
    get src() { return this._src; }
  }
  G.ASSETS = assets;
  G.ASSET_MODE = "files";
  const ctx = vm.createContext({ console, G, Image: FakeImage });
  for (const f of UI_FILES) vm.runInContext(readFileSync(path.join(ROOT, "src", "ui", f), "utf8"), ctx, { filename: "ui/" + f });
  return G;
}
export const realAssets = () => siteAssets(path.join(ROOT, "assets")).map;

const SEX = { m: "男", f: "女" };
const AGES = [["子ども（9）", 9], ["若者（25）", 25], ["中年（45）", 45], ["老人（70）", 70]];

// 調べる。G は loadEngine() したもの（G.rand を差し替えて仲間を作るので、使い捨てにする）。seeded は決まった乱数
export function a10Survey(G, seeded) {
  const D = G.data;
  const art = (w) => (w ? G.portraitArt(w) : null);
  const out = { types: [], races: [], named: [], events: { art: 0, none: [], foe: 0 }, comps: { art: 0, none: [], seen: 0 }, foes: { art: 0, none: [], person: [] }, hero: [] };
  // 型：人の種類 × 性別 × 年頃（人間）
  for (const kind of Object.keys(G.PEOPLE)) for (const s of ["m", "f"]) {
    out.types.push({ kind, sex: s, cells: AGES.map(([, age]) => { const k = art({ kind, sex: SEX[s], age, seed: "a10" }); return k ? k.replace(/^portraits\//, "") : null; }) });
  }
  // 種族：エルフ・獣人（獣ごと）は、種族の型が無ければ人間の型
  const beasts = Object.keys(D.BEASTS || {});
  for (const [label, look] of [["エルフ", { ears: "pointy" }], ...beasts.map((b) => [`獣人（${(D.BEASTS[b] && D.BEASTS[b].name) || b}）`, { ears: "none", beast: b }])]) {
    const k = art({ kind: "priest", sex: "女", age: 25, seed: "a10", look });
    out.races.push({ label, key: k ? k.replace(/^portraits\//, "") : null });
  }
  // 名のある人（キャラメモ・出来事と施設の人）
  const named = new Map();
  for (const [id, p] of Object.entries(D.C2_PEOPLE || {})) named.set(id, { id, name: p.name, who: p.who });
  for (const id of Object.keys(G.V4_NAMED || {})) if (!named.has(id)) named.set(id, { id, name: id, who: G.v4Canon(id) || { kind: "villager", seed: "v4:" + id } });
  for (const n of named.values()) out.named.push({ id: n.id, name: n.name, key: art(n.who) });
  // 出来事の人（仲間の顔の出来事＝getter は仲間で見る）
  for (const e of D.EVENTS) {
    const d = Object.getOwnPropertyDescriptor(e, "who");
    if (d && d.get) continue;
    const w = G.eventWho(e);
    if (!w) continue;
    if (w.kind === "foe") out.events.foe++;
    if (art(w)) out.events.art++;
    else out.events.none.push(`${e.id}（${w.kind}${w.kind === "foe" ? ":" + w.foe : ""}）`);
  }
  // 施設の人
  for (const id of Object.keys(D.LOCS)) { const w = G.facWho && G.facWho({ mode: "fac", fac: "castle", loc: id, flags: {} }); if (w && !art(w)) out.events.none.push(`王城 ${id}`); }
  // 仲間：乱数の仲間と、出来事で仲間になる人・魔物
  const comps = [];
  const scan = (o) => { if (!o || typeof o !== "object") return; if (o.companion && typeof o.companion === "object") comps.push(o.companion); for (const k of ["ok", "ng", "win"]) scan(o[k]); };
  for (const e of D.EVENTS) for (const c of e.choices || []) scan(c);
  for (const seed of [11, 12, 13]) {
    G.rand = seeded(seed);
    G.newGame({ cls: Object.keys(D.CLASSES)[seed % 5], stats: Object.fromEntries(D.STATS.map((k) => [k, 40])), caps: Object.fromEntries(D.STATS.map((k) => [k, 70])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    for (let i = 0; i < 80; i++) comps.push(G.genCompanion());
  }
  for (const c of comps) {
    out.comps.seen++;
    const w = G.companionWho(c);
    if (art(w)) out.comps.art++;
    else out.comps.none.push(`${c.name}（${w.kind}）`);
  }
  // 魔物：敵のすべてと、戦いが始まるときに足される使徒（D.E3.FOES）
  for (const id of new Set([...Object.keys(D.ENEMIES), ...Object.keys((D.E3 && D.E3.FOES) || {})])) {
    const k = G.v6ArtKey(id);
    if (k) { out.foes.art++; if (k.startsWith("portraits/")) out.foes.person.push(`${id} → \`${k.slice(10)}\``); } else out.foes.none.push(id);
  }
  // 主人公：どの職業・性別・種族でも絵なし
  for (const cls of Object.keys(D.CLASSES)) for (const sex of ["男", "女"]) for (const race of ["human", "elf", "beast"]) {
    const w = G.heroWho({ name: "テスト", sex, age: 30, race, beast: race === "beast" ? beasts[0] : undefined }, cls);
    if (art(w) || G.v4PortraitKey(w)) out.hero.push(`${cls}・${sex}・${race}`);
  }
  return out;
}

export function renderA10Md(s, G) {
  const L = [];
  const cell = (k) => (k ? `\`${k}\`` : "絵なし");
  L.push("# 人物と魔物に当てる絵（A10）", "");
  L.push("このファイルは `node tools/a10_map.mjs` で、今の `assets/` から作る（絵を足したら作り直す）。決め方は `src/ui/v4_assets.js`（人物）・`src/ui/v6_monsters.js`（魔物）。", "");
  L.push("- **canvas の人物・魔物の絵は使わない**（持ち主の決定）。生成画像が無い人・読めない画像は「絵なし」（枠を出さない）。", "");
  L.push("- **主人公**は立ち絵を出さない（話す場面・シート・戦闘・作成の画面・墓碑・左上の札）。`hero_*` の型も作らない。", "");
  L.push("- **名のある人**（キャラメモの人・出来事と施設の名のある人・`src/data/r5_named.js` の人・名前の付いた `who.name`（「写し場の古株ヤン」））はその人の絵だけ。無ければ絵なし（型の絵は使わない。R5）。", "");
  L.push("- **名もない人**（乱数の仲間・出来事の町の人）は、人の種類 × 性別の型 `kind_<種類>_<m|f>`。13 歳未満は `child`、60 歳以上は `elder`。who に年齢があれば、年頃（若者・壮年・老境）が同じか 8 歳以内の型だけで、合う型が無ければ絵なし（R5。下の表の「若者（25）」の絵なしはそのため）。種族の型（`_elf`・`_beast[_<獣>]`）が無ければ人間の型（耳は合わない）。人の姿の使徒（`majin`）は型が無いので絵なし。", "");
  L.push("- **魔物**は `assets/monsters/<id>.webp`（色違いは `same_as`）。人の姿の敵は人物の絵（`docs/art/monsters.json` の `people`）。仲間の魔物・出来事の魔物は魔物の絵を胸から上に切り取る。", "");
  L.push("## 名もない人の型（人間）", "");
  L.push(`| 種類 | 性別 | ${AGES.map(([l]) => l).join(" | ")} |`, `|---|---|${AGES.map(() => "---").join("|")}|`);
  for (const t of s.types) L.push(`| ${t.kind}（${(G.PEOPLE[t.kind] || {}).name || ""}） | ${SEX[t.sex]} | ${t.cells.map(cell).join(" | ")} |`);
  const alts = Object.keys(G.ASSETS || {}).filter((k) => /^portraits\/kind_[a-z]+_[mf]_b$/.test(k)).map((k) => k.slice(10));
  L.push("", "上の表は一人の例。二枚目の型（`_b`）がある種類・性別は、人ごと（seed）に半分ほどが二枚目になる：" + (alts.length ? alts.map((k) => `\`${k}\``).join("・") : "なし"));
  L.push("", "### 二枚目の型（もとは主人公の型。主人公の立ち絵をやめたので回した）", "", "| もとの絵 | 今の id | 当てる人 |", "|---|---|---|");
  const FROM = { adventurer: "merc", rogue: "thief", mage: "mage", priest: "priest", ronin: "samurai" };
  for (const k of alts) { const [, kind, sx] = /^kind_([a-z]+)_([mf])_b$/.exec(k); L.push(`| \`hero_${FROM[kind] || "?"}_${sx}\` | \`${k}\` | ${(G.PEOPLE[kind] || {}).name || kind}（${SEX[sx]}）の名もない人の半分ほど |`); }
  L.push("", "## 種族（例：25 歳の女の神官）", "", "| 種族 | 当てる絵 |", "|---|---|");
  for (const r of s.races) L.push(`| ${r.label} | ${cell(r.key)} |`);
  const noNamed = s.named.filter((n) => !n.key);
  L.push("", `## 名のある人（${s.named.length} 人。絵あり ${s.named.length - noNamed.length}）`, "");
  L.push(noNamed.length ? `絵の無い人（絵なし）：${noNamed.map((n) => `${n.name}（\`${n.id}\`）`).join("・")}` : "全員に絵がある。");
  L.push("", "## 出来事の人・仲間・魔物", "");
  L.push(`- 出来事の人：絵あり ${s.events.art}（うち魔物 ${s.events.foe}）・絵なし ${s.events.none.length}${s.events.none.length ? "：" + s.events.none.join("・") : ""}`);
  L.push(`- 仲間（乱数の仲間 240 人と出来事の仲間）：絵あり ${s.comps.art}／${s.comps.seen}${s.comps.none.length ? "・絵なし：" + [...new Set(s.comps.none)].join("・") : ""}`);
  L.push(`- 魔物（敵と使徒 ${s.foes.art + s.foes.none.length}）：絵あり ${s.foes.art}${s.foes.none.length ? "・絵なし（絵ができるまで何も描かない）：" + s.foes.none.join("・") : ""}`);
  L.push(`- 人の姿の絵で描く敵：${s.foes.person.join("・")}`);
  L.push("");
  return L.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { loadEngine, seeded } = await import("../tests/lib.mjs");
  const G = loadArt(loadEngine(), realAssets());
  const s = a10Survey(G, seeded);
  writeFileSync(MAP_PATH, renderA10Md(s, G));
  console.log(`${path.relative(ROOT, MAP_PATH)}（名のある人 ${s.named.length}・出来事の絵なし ${s.events.none.length}・仲間の絵なし ${s.comps.none.length}・魔物の絵なし ${s.foes.none.length}）`);
}
