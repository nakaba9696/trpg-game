// 文の癖を数える（V3。持ち主「AI っぽくない文章にしてほしい」）。docs/VISION.md の「避ける癖」の語を、src/data の文から数える。
//   node tools/prose_lint.mjs            全体の数と、癖の濃いファイルの上位
//   node tools/prose_lint.mjs <ファイル…> 指定したファイルだけ
// 数えるのは文字列の中だけ（// の注釈は外す）。率は、文の千字あたりの数。
// tests/checks/v3_lint.mjs が、V3 で書き足したファイル（src/data/zv3_*.js）の率に上限をかける（既存の全体は落とさない）。
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TICS = [
  ["……", /……/g],
  ["少しだけ", /少しだけ/g],
  ["どこか", /どこか/g],
  ["そっと", /そっと/g],
  ["気がし", /気がし/g],
  ["なぜか", /なぜか/g],
  ["静かに", /静かに/g],
  ["ふと", /ふと/g],
  ["まるで", /まるで/g],
];

// 文字列の中身だけを取り出す（"…"・'…'・`…`）。注釈の行は外す
export const stringsOf = (src) => {
  const code = src.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  const out = [];
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(code))) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  return out.filter((s) => /[぀-ヿ一-鿿]/.test(s));
};

export const lintText = (text) => {
  const counts = {};
  let total = 0;
  for (const [k, re] of TICS) { const n = (text.match(re) || []).length; counts[k] = n; total += n; }
  const chars = text.replace(/\s/g, "").length;
  return { counts, total, chars, rate: chars ? (total * 1000) / chars : 0, dots: chars ? (counts["……"] * 1000) / chars : 0 };
};

export const lintFile = (file) => lintText(stringsOf(readFileSync(file, "utf8")).join("\n"));

const here = path.dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.join(here, "..", "src", "data");
  const args = process.argv.slice(2);
  const files = args.length ? args : readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => path.join(dir, f));
  const rows = files.map((f) => ({ f: path.relative(path.join(here, ".."), f), ...lintFile(f) }));
  const sum = {};
  let chars = 0, total = 0;
  rows.forEach((r) => { chars += r.chars; total += r.total; Object.entries(r.counts).forEach(([k, n]) => { sum[k] = (sum[k] || 0) + n; }); });
  console.log(`文 ${chars} 字・癖 ${total}（千字あたり ${(total * 1000 / Math.max(1, chars)).toFixed(2)}）`);
  console.log(Object.entries(sum).map(([k, n]) => `${k} ${n}`).join("・"));
  console.log("\n癖の濃いファイル（千字あたり。文が千字以上のもの）");
  rows.filter((r) => r.chars >= 1000).sort((a, b) => b.rate - a.rate).slice(0, args.length ? rows.length : 25)
    .forEach((r) => console.log(`${r.rate.toFixed(2).padStart(6)}  ${r.f}  （${Object.entries(r.counts).filter(([, n]) => n).map(([k, n]) => `${k}${n}`).join(" ")}）`));
}
