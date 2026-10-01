// docs/art/portraits.json（人物の絵の一覧。こちらが元）から docs/art/portraits.md（読む用の表）を作る。
// node tools/portraits.mjs        … md を書き直す
// tests/checks/v4_assets.mjs が、md が json と合っているかを見る（renderPortraitsMd を使う）
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const JSON_PATH = path.join(here, "..", "docs", "art", "portraits.json");
export const MD_PATH = path.join(here, "..", "docs", "art", "portraits.md");

const GROUPS = [
  ["c2", "キャラメモの人物", "持ち主のスプレッドシート「キャラメモ」の人（`src/data/c2_people.js`）。出来事でも仲間になってからも同じ絵を使う。"],
  ["named", "名のある人物", "出来事や施設に出る、名前の決まった人（使徒の人の姿・眷属・店や宿の主など）。どの出来事に出るかは `src/ui/v4_assets.js` の `NAMED`。"],
  ["companion", "仲間の種類", "名前の決まっていない仲間（雇った傭兵など）。種類と性別で一枚。"],
  ["hero", "主人公", "職業 × 性別 × 種族。年齢は若者が基本（下の「主人公の年齢・獣人の獣」で足せる）。外見の文で変わる髪や目の色は入れていない。"],
];
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

export function renderPortraitsMd(data) {
  const { size, heroAge, beasts, portraits } = data;
  const L = [];
  L.push("# 人物の絵（Stable Diffusion のプロンプト一覧）", "");
  L.push("このファイルは `node tools/portraits.mjs` で `docs/art/portraits.json` から作る。直すときは json を直してから作り直す。", "");
  L.push("## 作り方", "");
  L.push(`- 大きさ：**${size.width}×${size.height}**（${size.framing}）。形式：**${size.format}**、1枚 **${size.maxKB}KB 以下**。`);
  L.push("- タグはその人の**特徴だけ**。画風・品質（masterpiece・anime style など）・構図・ネガティブは持ち主の側で足す。");
  L.push("- できた画像は表の「ファイル」の名前で置く（例：`assets/portraits/dil.webp`）。`node tools/build.mjs` で HTML に埋め込まれ、ゲームはその人をこの画像で描く。無い人は今の canvas の絵のまま。");
  L.push("- png・jpg でもよい（同じ名前なら webp を使う）。埋め込みの合計が 12MB を超えるとビルドとテストが止まる（`tools/assets.mjs`）。");
  L.push("");
  L.push("## 主人公の年齢・獣人の獣", "");
  L.push("主人公は、職業・性別・種族が合う画像のうち、獣・年齢が一番近いものを使う。表の行は若者・狼が基本。足したいときは：", "");
  L.push(`- 中年：ファイル名の後ろに \`_mid\`（例：\`hero_merc_m_human_mid.webp\`）。タグの \`young man\` / \`young woman\`・\`20 years old\` を \`${heroAge.mid}\` に替える。`);
  L.push(`- 老人：\`_old\`。\`${heroAge.old}\` に替える。`);
  L.push("- 獣人の獣：`hero_<職業>_<m|f>_beast_<獣>`（例：`hero_thief_f_beast_cat.webp`）。狼の耳と尻尾のタグを次に替える。獣ごとの画像が無ければ `_beast`（狼）を使う。");
  L.push("");
  L.push("| 獣 | 耳と尻尾のタグ |", "|---|---|");
  for (const [k, t] of Object.entries(beasts)) L.push(`| \`${k}\` | ${cell(t)} |`);
  L.push("");
  L.push("仲間の種類も同じように、エルフなら `kind_<種類>_<m|f>_elf`、獣人なら `kind_<種類>_<m|f>_beast[_<獣>]` を置ける（無ければ今の絵）。", "");
  for (const [g, title, note] of GROUPS) {
    const rows = portraits.filter((p) => p.group === g);
    L.push(`## ${title}（${rows.length}）`, "", note, "");
    L.push("| ファイル | 名前 | 特徴のタグ | メモ |", "|---|---|---|---|");
    for (const p of rows) L.push(`| \`${p.file}\` | ${cell(p.name)} | ${cell(p.tags)} | ${cell(p.memo)} |`);
    L.push("");
  }
  return L.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  writeFileSync(MD_PATH, renderPortraitsMd(data));
  console.log(`docs/art/portraits.md（${data.portraits.length} 人）`);
}
