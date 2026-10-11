// 読点を減らす（V4。持ち主「句読点多すぎかも」）。決まりは docs/VISION.md の「避ける癖」。
//   node tools/commas.mjs <ファイル…>          どこが変わるかを見るだけ（数と例）
//   node tools/commas.mjs --write <ファイル…>  書き換える
// 文字列の中だけを直す。直さないもの：選択肢の名前（label:）・表の鍵（"…": の形）・`…` の文字列・ほかの所にも同じ文字列がある文（差し替えの表や確認が文そのものを指している）・侍を含む文（E7 の改名と重ならないように）。
// 外す読点：
//   1. 二十字までの短い文で、助詞・接続の形（は が も と て で ら ば に を）のあとの読点。文の頭から二字以内（「で、」「俺は、」の前の形）と、言いよどみ（ええと・あのね）は残す
//   2. 文の頭の短い主語（あなた・名前・男・女 など）の「は、」
//   3. 台詞を受ける「」と、」の読点
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHORT = 20;
const P = new Set("はがもとてでらばにを");
const KEEP_BEFORE = /(ええと|えっと|あのね|あのう|ねえ|おい|いや|はい|ああ|うん)$/;
const SUBJ = /^((?:あなた|\{n\}|\{c\}|\{m\}|男|女|俺|私|彼|彼女|老人|少年|少女|娘|爺さん|婆さん|主人|親方|[ァ-ヶー・]{2,8})は)、/;

// 一つの文を直す
export const fixSentence = (s) => {
  let t = s.replace(/」と、/g, "」と");
  t = t.replace(SUBJ, "$1");
  const bare = t.replace(/[「」『』]/g, "");
  if (bare.length <= SHORT) {
    let out = "";
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (ch === "、" && i >= 2 && P.has(t[i - 1]) && !KEEP_BEFORE.test(t.slice(0, i)) && !/[「『{、]/.test(t[i + 1] || "「")) continue;
      out += ch;
    }
    t = out;
  }
  return t;
};
// 文字列の中身を、文ごとに直す（区切り。！？と改行・「」の切れ目は残す）
export const fixText = (str) => str.split(/(?<=[。！？!?」』\n])/).map(fixSentence).join("");

// 全体の文字列の数（同じ文字列がほかにもあるものは直さない）
const literalCounts = () => {
  const m = new Map();
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).forEach((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    if (!/\.(m?js)$/.test(d.name)) return;
    const re = /"((?:[^"\\\n]|\\.)*)"/g;
    const src = readFileSync(p, "utf8");
    let x;
    while ((x = re.exec(src))) m.set(x[1], (m.get(x[1]) || 0) + 1);
  });
  ["src", "tests", "tools"].forEach((d) => walk(path.join(root, d)));
  return m;
};

export const fixFile = (src, counts) => {
  let changed = 0, removed = 0;
  const out = src.replace(/(label:\s*)?"((?:[^"\\\n]|\\.)*)"(\s*:)?/g, (all, lab, body, key) => {
    if (lab || key) return all;
    if (!/、/.test(body) || /侍/.test(body)) return all;
    if (counts && (counts.get(body) || 0) > 1) return all;
    const nb = body.split("\\n").map(fixText).join("\\n");
    if (nb === body) return all;
    changed++;
    removed += (body.match(/、/g) || []).length - (nb.match(/、/g) || []).length;
    return all.replace(`"${body}"`, `"${nb}"`);
  });
  return { out, changed, removed };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const write = args[0] === "--write";
  const files = write ? args.slice(1) : args;
  const counts = literalCounts();
  let tc = 0, tr = 0;
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const { out, changed, removed } = fixFile(src, counts);
    tc += changed; tr += removed;
    if (write && out !== src) writeFileSync(f, out);
    if (!write && changed) console.log(`${f}: 文字列 ${changed}・読点 -${removed}`);
  }
  console.log(`${write ? "書き換えた" : "変わる"}：文字列 ${tc}・読点 -${tr}`);
}
