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
  ["c2", "名のある人物：キャラメモ", "持ち主のスプレッドシート「キャラメモ」の人（`src/data/c2_people.js`。id はデータの id）。時間軸は同じなので、どの冒険で会っても同じ一人＝一枚。出来事でも仲間になってからも同じ絵。"],
  ["named", "名のある人物：出来事・施設", "出来事や施設に出る、名前の決まった人（使徒の人の姿・眷属・宰相・店や宿の主など。使徒は `D.MAJIN` の id）。どの出来事に出るかは `src/ui/v4_assets.js` の `NAMED`。どの出来事でも同じ顔に固定してある。"],
  ["hero", "型：主人公", "冒険ごとに作られる主人公は一人ずつ作れないので、職業 × 性別の型に当てる（人間・若者が基本。エルフ・獣人・年齢は下の「型の足し方」）。外見の文で変わる髪や目の色は入れていない。"],
  ["people", "型：名もない人", "名もない仲間・出来事の町の人など。人物の種類 × 性別。13 歳未満は子ども、60 歳以上は老人の型を使う。"],
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
  L.push("- 作るのは `node tools/gen_portraits.mjs`（AUTOMATIC1111 / Forge の API。手順は [README.md](README.md)）。名のある人物は、気に入った絵の seed を `--keep <id>` で一覧に残す（名前の下に出る）。作り直すときはその seed を使う。");
  L.push("- png・jpg でもよい（同じ名前なら webp を使う）。埋め込みの合計が 12MB を超えるとビルドとテストが止まる（`tools/assets.mjs`）。");
  L.push("");
  const types = [];
  types.push("## 型の足し方（任意）", "");
  types.push("型の画像は、性別・種族が合うもののうち、獣・年齢が一番近いものを使う。表の行は人間だけなので、エルフ・獣人は下の画像を足すまで今の canvas の絵のまま。足したいときは、ファイル名の後ろに付けて、タグを替える：", "");
  types.push(`- エルフ：\`_elf\`（例：\`hero_mage_f_elf.webp\`・\`kind_villager_f_elf.webp\`）。\`${data.races.elf}\` を足す。`);
  types.push(`- 獣人：\`_beast_<獣>\`（例：\`hero_thief_m_beast_cat.webp\`）か、獣を問わない \`_beast\`。下の表の耳と尻尾のタグを足す。`);
  types.push(`- 主人公の中年：さらに後ろに \`_mid\`（例：\`hero_merc_m_mid.webp\`）。\`young man\` / \`young woman\`・\`20 years old\` を \`${heroAge.mid}\` に替える。老人は \`_old\` で \`${heroAge.old}\`。`);
  types.push("");
  types.push("| 獣 | 耳と尻尾のタグ |", "|---|---|");
  for (const [k, t] of Object.entries(beasts)) types.push(`| \`${k}\` | ${cell(t)} |`);
  types.push("");
  for (const [g, title, note] of GROUPS) {
    const rows = portraits.filter((p) => p.group === g);
    L.push(`## ${title}（${rows.length}）`, "", note, "");
    L.push("| ファイル | 名前 | 特徴のタグ | メモ |", "|---|---|---|---|");
    for (const p of rows) L.push(`| \`${p.file}\` | ${cell(p.name)}${Number.isInteger(p.seed) ? `<br>seed ${p.seed}` : ""} | ${cell(p.tags)} | ${cell(p.memo)} |`);
    L.push("");
    if (g === "people") L.push(...types);
  }
  return L.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  writeFileSync(MD_PATH, renderPortraitsMd(data));
  console.log(`docs/art/portraits.md（${data.portraits.length} 人）`);
}
