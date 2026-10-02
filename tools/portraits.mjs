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
// 喜怒哀楽の差分（V8。src/engine/v8_moods.js の G.MOODS と同じ並び）
export const MOODS = ["joy", "anger", "sorrow", "fun"];
const MOOD_NAME = { joy: "喜", anger: "怒", sorrow: "哀", fun: "楽" };
// 人物の特徴のタグ（V10）：見た目を固定する identity（名のある人物）＋ tags（役・ポーズ・手に持つ物）＋ 表情。
// 喜怒哀楽の差分も同じ identity と tags を一字一句そのまま使い、表情（face）だけ差し替える（tools/gen_portraits.mjs も使う）
export const joinTags = (...a) => a.map((s) => String(s || "").trim().replace(/^,|,$/g, "").trim()).filter(Boolean).join(", ");
export const featureOf = (p, face) => joinTags(p.identity, p.tags, face === undefined ? p.face : face);
// 男の人物（identity・tags に 1boy / male / old man / boy がある人）。tools/gen_portraits.mjs が style_male.json を重ね、type（男の型）で顔立ちを替える
const MALE_RE = /(^|,\s*)(\d*boys?|male|male focus|old man|man|young man)(\s*,|$)/i;
export const isMale = (p) => MALE_RE.test([p.identity, p.tags].flat().filter(Boolean).join(", "));
const tagsCell = (p) => {
  let t = (p.type ? `型：\`${p.type}\`<br>` : "") + (p.identity ? `見た目（固定）：${cell(p.identity)}<br>` : "") + cell(p.tags);
  if (p.face) t += `<br>表情：${cell(p.face)}`;
  if (p.variants) t += MOODS.filter((m) => p.variants[m]).map((m) => `<br>${MOOD_NAME[m]}（\`_${m}\`）：${cell(p.variants[m])}`).join("");
  return t;
};

export function renderPortraitsMd(data) {
  const { size, heroAge, beasts, portraits } = data;
  const L = [];
  L.push("# 人物の絵（Stable Diffusion のプロンプト一覧）", "");
  L.push("このファイルは `node tools/portraits.mjs` で `docs/art/portraits.json` から作る。直すときは json を直してから作り直す。", "");
  L.push("## 作り方", "");
  L.push(`- 大きさ：**${size.width}×${size.height}**（${size.framing}）。形式：**${size.format}**、1枚 **${size.maxKB}KB 以下**。`);
  L.push("- 名のある人物は**見た目（固定）**（`identity`：髪の色・長さ・髪型、目の色と形、肌、眉、印、服の色と形、いつも身につけている物、年齢と体格）を持つ。プロンプトはその後ろに、ポーズ・手に持つ物のタグ、表情の順に付く。差分も見た目とポーズは同じで、表情だけ替える。");
  L.push("- 男の人は**型**（`type`：`ojisan`・`classic`・`bishonen`・`brute`・`elder`・`boy`）で顔立ちを替える。型の語は `style_male.json` の `types` にあり、生成のときに前に足される（[README.md](README.md)）。");
  L.push("- タグはその人の**特徴だけ**。画風・品質（masterpiece・anime style など）・構図・ネガティブは持ち主の側で足す。");
  L.push("- できた画像は表の「ファイル」の名前で置く（例：`assets/portraits/dil.webp`）。`node tools/build.mjs` で HTML に埋め込まれ、ゲームはその人をこの画像で描く。無い人は今の canvas の絵のまま。");
  L.push("- 作るのは `node tools/gen_portraits.mjs`（AUTOMATIC1111 / Forge の API。手順は [README.md](README.md)）。名のある人物は、気に入った絵の seed を `--keep <id>` で一覧に残す（名前の下に出る）。作り直すときはその seed を使う。");
  L.push("- **表情**は基本の絵の顔（プロンプトでは特徴のタグの後ろに付く）。**喜・怒・哀・楽**がある人は、基本の絵から差分を作る（`node tools/gen_portraits.mjs --variants`。img2img で表情のタグだけ差し替える）。ファイルは `<id>_joy.webp`・`_anger`・`_sorrow`・`_fun`。無ければ基本の絵のまま。");
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
    for (const p of rows) L.push(`| \`${p.file}\` | ${cell(p.name)}${Number.isInteger(p.seed) ? `<br>seed ${p.seed}` : ""} | ${tagsCell(p)} | ${cell(p.memo)} |`);
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
