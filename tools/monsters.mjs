// docs/art/monsters.json（魔物の絵の一覧。こちらが元）から docs/art/monsters.md（読む用の表）を作る。V6
// node tools/monsters.mjs        … 名前を敵のデータ（G.data.ENEMIES）から取り直して json に書き、md を書き直す
// 敵の名前は出来事・世界観の都合で変わることがあるので、一覧の名前は手で直さず、これで作り直す
// tests/checks/v6_monsters.mjs が、md が json と合っているかを見る（renderMonstersMd を使う）
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const JSON_PATH = path.join(here, "..", "docs", "art", "monsters.json");
export const MD_PATH = path.join(here, "..", "docs", "art", "monsters.md");

const GROUPS = [
  ["boss", "使徒・ボス", "使徒の魔物の姿と、ボス。特にていねいに。気に入った絵は `--keep <id>` で seed を残す。"],
  ["monster", "魔物", "ふつうの敵のうち、魔物の姿のもの。"],
  ["human", "人の姿の敵", "盗賊・衛兵など、人の姿の敵（一覧の `human: true`）。後置きとネガティブが人向けに替わる（`style_monsters.json` の `human`）。"],
];
const groupOf = (m) => (m.boss ? "boss" : m.human ? "human" : "monster");
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

// 名前を敵のデータから取り直す（変わったものの id を返す）
export function refreshNames(data, ENEMIES) {
  const changed = [];
  for (const m of data.monsters) {
    const e = ENEMIES[m.id];
    if (!e) continue;
    if (m.name !== e.name) { m.name = e.name; changed.push(m.id); }
    if (!!e.boss !== !!m.boss) { if (e.boss) m.boss = true; else delete m.boss; changed.push(m.id); }
  }
  return changed;
}

export function renderMonstersMd(data) {
  const { size, people, monsters } = data;
  const L = [];
  L.push("# 魔物の絵（Stable Diffusion のプロンプト一覧）", "");
  L.push("このファイルは `node tools/monsters.mjs` で `docs/art/monsters.json` から作る（名前は敵のデータから取り直す）。直すときは json を直してから作り直す。", "");
  L.push("## 作り方", "");
  L.push(`- 大きさ：**${size.width}×${size.height}**（${size.framing}）。形式：**${size.format}**、1枚 **${size.maxKB}KB 以下**。`);
  L.push("- タグはその魔物の**特徴だけ**。画風・品質・構図・背景・ネガティブは [style_monsters.json](style_monsters.json) で足す（人物の `style.json` とは別）。");
  L.push("- できた画像は表の「ファイル」の名前で置く（例：`assets/monsters/goblin.webp`）。`node tools/build.mjs` で HTML に埋め込まれ、戦闘ではその敵をこの画像で描く（`src/ui/v6_monsters.js`。白い背景は周りをぼかして消す）。無い敵は今の canvas の絵のまま。");
  L.push("- 作るのは `node tools/gen_portraits.mjs --monsters`（`--only goblin,slime`・`--force`・`--dry`・`--keep`・`--new-seed` は人物と同じ。手順は [README.md](README.md)）。");
  L.push("- 「**異形**」と書いた魔物（一覧の `style: \"eldritch\"`）は、人の形を持たない格上の存在。別のモデルの [style_eldritch.json](style_eldritch.json)（暗い油彩の挿絵）で作る。ほかは `style_monsters.json`。");
  L.push("- 埋め込みの合計の上限（12MB）は人物と魔物を合わせて数える。");
  L.push("");
  // R5c・R5d：描き直し待ち（今の絵は載せない。その敵は絵なし）
  const redo = monsters.filter((m) => m.redraw);
  if (redo.length) {
    L.push(`## 描き直し待ち（${redo.length}）`, "", "今の絵は、この世界に合わない（現代の服に見えるなど）ので載せていない（戦闘では絵なし）。描き直して同じファイル名で置き、一覧（json）の `redraw` を外す（`gen_portraits.mjs` で作れば自動で外れる。人の姿の敵は、ネガティブに今の服の語が自動で足される）。", "");
    L.push(`作る：\`node tools/gen_portraits.mjs --monsters --only ${redo.map((m) => m.id).join(",")} --force --new-seed\`（人物の描き直しは [portraits.md](portraits.md) の「画像のセッションへ」）`, "");
    L.push("| ファイル | 名前 | 何が合わないか | どう直すか | 特徴のタグ |", "|---|---|---|---|---|");
    for (const m of redo) L.push(`| \`${m.file}\` | ${cell(m.name)} | ${cell(m.redraw.modern)} | ${cell(m.redraw.fix)} | ${cell(m.tags)} |`);
    L.push("");
  }
  for (const [g, title, note] of GROUPS) {
    const rows = monsters.filter((m) => groupOf(m) === g);
    L.push(`## ${title}（${rows.length}）`, "", note, "");
    L.push("| ファイル | 名前 | 特徴のタグ | メモ |", "|---|---|---|---|");
    for (const m of rows) {
      const tags = m.same_as ? `（\`${m.same_as}\` と同じ絵）` : cell(m.tags);
      L.push(`| \`${m.file}\` | ${cell(m.name)}${m.style === "eldritch" ? "<br>**異形**" : ""}${Number.isInteger(m.seed) ? `<br>seed ${m.seed}` : ""} | ${tags} | ${cell(m.memo)} |`);
    }
    L.push("");
  }
  L.push("## 人物の側に任せる敵", "");
  L.push("人物の一覧（[portraits.md](portraits.md)）に載っている人の姿の敵。ここでは作らない（戦闘では今の canvas の絵）。", "");
  L.push("| 敵の id | 人物の id |", "|---|---|");
  for (const [e, p] of Object.entries(people || {})) L.push(`| \`${e}\` | \`${p}\` |`);
  L.push("");
  return L.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const { loadEngine } = await import("../tests/lib.mjs");
  const E = loadEngine().data.ENEMIES;
  const changed = refreshNames(data, E);
  const listed = new Set([...data.monsters.map((m) => m.id), ...Object.keys(data.people || {})]);
  const missing = Object.keys(E).filter((id) => !listed.has(id));
  const gone = data.monsters.filter((m) => !E[m.id]).map((m) => m.id);
  writeFileSync(JSON_PATH, JSON.stringify(data, null, 1) + "\n");
  writeFileSync(MD_PATH, renderMonstersMd(data));
  console.log(`docs/art/monsters.md（${data.monsters.length} 体${changed.length ? `・名前を取り直した：${changed.join("、")}` : ""}）`);
  if (missing.length) console.warn(`一覧に無い敵：${missing.join("、")}（monsters.json に足すか、people に人物の id で書く）`);
  if (gone.length) console.warn(`敵のデータに無い：${gone.join("、")}`);
}
