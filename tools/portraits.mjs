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
  ["people", "型：名もない人", "名もない仲間・出来事の町の人など。人物の種類 × 性別。13 歳未満は子ども、60 歳以上は老人の型を使う。"],
];
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
// 表情の種類（docs/art/moods.json）。喜怒哀楽（V8）が先、そのあとにその人らしい表情（V11）。src/data/v11_moods.js と同じ並び
export const MOODS_PATH = path.join(here, "..", "docs", "art", "moods.json");
export const MOODS_MD_PATH = path.join(here, "..", "docs", "art", "moods.md");
export const MOOD_DATA = JSON.parse(readFileSync(MOODS_PATH, "utf8"));
export const MOODS = Object.keys(MOOD_DATA.moods);
export const BASE_MOODS = MOOD_DATA.base;
const MOOD_NAME = Object.fromEntries(MOODS.map((m) => [m, MOOD_DATA.moods[m].name]));
// 人物の特徴のタグ（V10）：見た目を固定する identity（名のある人物）＋ tags（役・ポーズ・手に持つ物）＋ 表情。
// 喜怒哀楽の差分も同じ identity と tags を一字一句そのまま使い、表情（face）だけ差し替える（tools/gen_portraits.mjs も使う）
export const joinTags = (...a) => a.map((s) => String(s || "").trim().replace(/^,|,$/g, "").trim()).filter(Boolean).join(", ");
export const featureOf = (p, face) => joinTags(p.identity, p.tags, face === undefined ? p.face : face);
// 絵の版（A9）：style.json の art が今の版。一覧の人の art はその人の基本の絵を描いた版（無ければ 1＝ikezawa shin を prefix から外していたころ）。
// 基本の絵（txt2img）は今の版で作り、差分（img2img。variant が true）はその人の基本の絵の版にそろえて、style.art_drop[版] の語を prefix から外す
export const artNow = (style) => (style && style.art) || 1;
export const artOf = (p) => (p && p.art) || 1;
export function artPrefix(prefix, style, p, variant) {
  const v = variant ? artOf(p) : artNow(style);
  if (v === artNow(style)) return prefix;
  const drop = new Set((((style && style.art_drop) || {})[v] || []).map((t) => t.trim().toLowerCase()));
  return String(prefix || "").split(",").map((t) => t.trim()).filter((t) => t && !drop.has(t.toLowerCase())).join(", ");
}
// 男の人物（identity・tags に 1boy / male / old man / boy がある人）。tools/gen_portraits.mjs が style_male.json を重ね、type（男の型）で顔立ちを替える
const MALE_RE = /(^|,\s*)(\d*boys?|male|male focus|old man|man|young man)(\s*,|$)/i;
export const isMale = (p) => MALE_RE.test([p.identity, p.tags].flat().filter(Boolean).join(", "));
const tagsCell = (p) => {
  let t = (p.redo ? `**作り直す**（\`redo: ${p.redo}\`${p.redo === "multi" ? "：2人以上写っている" : p.redo === "color" ? "：髪の色を変えた" : ""}）<br>` : "") + (p.art ? `絵の版：${p.art}<br>` : "") + (p.type ? `型：\`${p.type}\`<br>` : "") + (p.identity ? `見た目（固定）：${cell(p.identity)}<br>` : "") + cell(p.tags);
  if (p.face) t += `<br>表情：${cell(p.face)}`;
  if (p.variants) t += Object.keys(p.variants).map((m) => `<br>${MOOD_NAME[m] || m}（\`_${m}\`）：${cell(p.variants[m])}`).join("");
  return t;
};

export function renderPortraitsMd(data) {
  const { size, beasts, portraits } = data;
  const L = [];
  L.push("# 人物の絵（Stable Diffusion のプロンプト一覧）", "");
  L.push("このファイルは `node tools/portraits.mjs` で `docs/art/portraits.json` から作る。直すときは json を直してから作り直す。", "");
  L.push("## 作り方", "");
  L.push(`- 大きさ：**${size.width}×${size.height}**（${size.framing}）。形式：**${size.format}**、1枚 **${size.maxKB}KB 以下**。`);
  L.push("- 名のある人物は**見た目（固定）**（`identity`：髪の色・長さ・髪型、目の色と形、肌、眉、印、服の色と形、いつも身につけている物、年齢と体格）を持つ。プロンプトはその後ろに、ポーズ・手に持つ物のタグ、表情の順に付く。差分も見た目とポーズは同じで、表情だけ替える。");
  L.push("- **髪の色・髪型・目の色**は全員の見た目（`identity`）に書く（絵師タグに髪色を引っ張られないため。A9）。絵がある人は今の絵と同じ色。");
  L.push("- **絵の版**：基本の絵を ikezawa shin 入りの prefix（`style.json` の `art`＝2）で描いた人には「絵の版：2」と出る。出ていない人の基本の絵は ikezawa shin なしで描いたので、差分もなしで作る（[README.md](README.md)）。**作り直す**（`redo`）と出ている人は、今の絵を作り直す（`multi`＝2人以上写っている・`color`＝髪の色を変えたので描き直す）。");
  L.push("- 男の人は**型**（`type`：`ojisan`・`classic`・`bishonen`・`brute`・`elder`・`boy`）で顔立ちを替える。型の語は `style_male.json` の `types` にあり、生成のときに前に足される（[README.md](README.md)）。");
  L.push("- タグはその人の**特徴だけ**。画風・品質（masterpiece・anime style など）・構図・ネガティブは持ち主の側で足す。");
  L.push("- できた画像は表の「ファイル」の名前で置く（例：`assets/portraits/dil.webp`）。`node tools/build.mjs` で HTML に埋め込まれ、ゲームはその人をこの画像で描く。無い人は絵を出さない（canvas の人物の絵はやめた。A10）。");
  L.push("- 作るのは `node tools/gen_portraits.mjs`（AUTOMATIC1111 / Forge の API。手順は [README.md](README.md)）。名のある人物は、気に入った絵の seed を `--keep <id>` で一覧に残す（名前の下に出る）。作り直すときはその seed を使う。");
  L.push("- **表情**は基本の絵の顔（プロンプトでは特徴のタグの後ろに付く）。差分（**喜・怒・哀・楽**と、その人らしい表情。種類は [moods.md](moods.md)）がある人は、基本の絵から差分を作る（`node tools/gen_portraits.mjs --variants`。`--mood shy,surprise` でその表情だけ。img2img で表情のタグだけ差し替える）。ファイルは `<id>_joy.webp`・`_shy` など。無い表情は近い表情か、基本の絵のまま。");
  L.push("- png・jpg でもよい（同じ名前なら webp を使う）。埋め込みの合計が 12MB を超えるとビルドとテストが止まる（`tools/assets.mjs`）。");
  L.push("");
  const types = [];
  types.push("## 型の足し方（任意）", "");
  types.push("型の画像は、性別・種族が合うもののうち、獣が一番近いものを使う。表の行は人間だけなので、エルフ・獣人は下の画像を足すまで人間の型を使う（耳は合わない）。足したいときは、ファイル名の後ろに付けて、タグを替える：", "");
  types.push(`- エルフ：\`_elf\`（例：\`kind_villager_f_elf.webp\`）。\`${data.races.elf}\` を足す。`);
  types.push(`- 獣人：\`_beast_<獣>\`（例：\`kind_priest_f_beast_cat.webp\`）か、獣を問わない \`_beast\`。下の表の耳と尻尾のタグを足す。`);
  types.push("- 主人公は立ち絵を出さない（持ち主の決定。A10）ので、主人公の型（`hero_*`）は作らない。");
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

// 表情の一覧（docs/art/moods.md）。種類・既定のタグ・落とし先と、人ごとの割り当て
export function renderMoodsMd(moods, data) {
  const L = [];
  const people = data.portraits.filter((p) => p.variants);
  L.push("# 表情の種類（立ち絵の差分）", "");
  L.push("このファイルは `node tools/portraits.mjs` で `docs/art/moods.json`（種類）と `docs/art/portraits.json`（人ごとの割り当て）から作る。直すときは json を直してから作り直す。", "");
  L.push("## 決まり", "");
  L.push("- 差分のある人は、**喜怒哀楽の 4 つ**（`joy`・`anger`・`sorrow`・`fun`）を必ず持ち、さらに**その人らしい表情を 3〜5 個**持つ（仲間になる人・スプレッドシートの人物・使徒の人の姿）。");
  L.push("- 人ごとのタグは `portraits.json` の `variants` に書く。下の表の「既定のタグ」を元に、その人の性格に合わせて書き替える（獣人は耳・尻尾、仮面の人は目だけ、など）。タグは**表情の特徴だけ**：画風・品質・構図・作家名・作品名・性的な語は書かない（テストが見る）。男の照れも `blush` でよい（#185）。");
  L.push("- 見た目（`identity`）とポーズ（`tags`）は基本の絵と一字一句同じで、表情（`face`）だけ差し替えて img2img で作る（V10）。");
  L.push("- 絵が無い表情は、下の「落とし先」を左から探し、どれも無ければ基本の絵を出す。だから、その人に合わない表情は持たせなくてよい。");
  L.push("- 新しい人を足すとき（C5〜C8 など）：`portraits.json` の人に `face` と `variants`（喜怒哀楽＋3〜5 個）を書き、`node tools/portraits.mjs` で md を作り直す。新しい表情の種類が要るときは `moods.json` と `src/data/v11_moods.js` の両方に足す（並び・落とし先をそろえる）。");
  L.push("- ゲームでは、出来事・結果・会話（K1）・掛け合いのデータに `mood: \"shy\"` のように書く。書いていない出来事は文から推す（「頬を染め」→照れ、「号泣」→泣き など。`src/data/v11_moods.js` の `MOOD_GUESS`）。既存の出来事に後から付けるときは、そのファイルを書き換えずに `D.EVENT_MOODS[出来事の id] = \"surprise\"` と書ける。");
  L.push("- 作る：`node tools/gen_portraits.mjs --variants`（全部）、`--variants --mood shy,surprise`（その表情だけ）、`--variants --only nora`（その人だけ）、`--only nora_shy`（一枚だけ）。", "");
  L.push("## 種類", "");
  L.push("| 鍵 | 名前 | 既定のタグ | 落とし先 | 使う場面 | 持つ人 |", "|---|---|---|---|---|---|");
  for (const [m, t] of Object.entries(moods.moods)) {
    const n = people.filter((p) => p.variants[m]).length;
    L.push(`| \`${m}\` | ${cell(t.name)} | ${cell(t.tags)} | ${t.fallback.length ? t.fallback.map((f) => `${moods.moods[f].name}`).join(" → ") + " → 基本" : "基本"} | ${cell(t.memo || "")} | ${n} |`);
  }
  L.push("", `## 人ごとの割り当て（${people.length} 人）`, "");
  L.push("| 人 | 喜怒哀楽のほかの表情 |", "|---|---|");
  for (const p of people) {
    const extra = Object.keys(p.variants).filter((m) => !moods.base.includes(m));
    L.push(`| ${cell(p.name)}（\`${p.id}\`） | ${extra.map((m) => `${moods.moods[m] ? moods.moods[m].name : m}（\`${m}\`）`).join("・") || "—"} |`);
  }
  L.push("");
  return L.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  writeFileSync(MD_PATH, renderPortraitsMd(data));
  writeFileSync(MOODS_MD_PATH, renderMoodsMd(MOOD_DATA, data));
  console.log(`docs/art/portraits.md（${data.portraits.length} 人）・moods.md（${MOODS.length} 種）`);
}
