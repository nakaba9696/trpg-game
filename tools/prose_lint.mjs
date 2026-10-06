// 文の癖を数える（V3。持ち主「AI っぽくない文章にしてほしい」）。docs/VISION.md の「避ける癖」の語を、src/data の文から数える。
//   node tools/prose_lint.mjs            全体の数と、癖の濃いファイルの上位
//   node tools/prose_lint.mjs <ファイル…> 指定したファイルだけ
// 数えるのは文字列の中だけ（// の注釈は外す）。率は、文の千字あたりの数。
// 読点：一文（。！？で区切る）あたりの「、」の数（commas）と、短い文（二十字まで）に打った読点の数（shortCommas）も出す。
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

// 文に分ける（。！？と改行で。「」の内も一文として数える）
export const SHORT = 20;
export const sentencesOf = (text) => String(text).split(/[。！？!?\n]+/).map((x) => x.replace(/[「」『』\s]/g, "")).filter((x) => x.length >= 2);

export const lintText = (text) => {
  const counts = {};
  let total = 0;
  for (const [k, re] of TICS) { const n = (text.match(re) || []).length; counts[k] = n; total += n; }
  const chars = text.replace(/\s/g, "").length;
  const sents = sentencesOf(text);
  const commas = sents.reduce((a, s) => a + (s.match(/、/g) || []).length, 0);
  const short = sents.filter((s) => s.length <= SHORT);
  const shortCommas = short.reduce((a, s) => a + (s.match(/、/g) || []).length, 0);
  return { counts, total, chars, rate: chars ? (total * 1000) / chars : 0, dots: chars ? (counts["……"] * 1000) / chars : 0,
    sents: sents.length, commas, perSent: sents.length ? commas / sents.length : 0, shortCommas, short: short.length };
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
  const ns = rows.reduce((a, r) => a + r.sents, 0), nc = rows.reduce((a, r) => a + r.commas, 0);
  const nsh = rows.reduce((a, r) => a + r.short, 0), nshc = rows.reduce((a, r) => a + r.shortCommas, 0);
  console.log(`読点：一文あたり ${(nc / Math.max(1, ns)).toFixed(3)}（文 ${ns}・読点 ${nc}）。${SHORT} 字までの短い文 ${nsh} のうち読点 ${nshc}`);
  console.log("\n読点の多いファイル（一文あたり。文が百以上のもの）");
  rows.filter((r) => r.sents >= 100).sort((a, b) => b.perSent - a.perSent).slice(0, args.length ? rows.length : 15)
    .forEach((r) => console.log(`${r.perSent.toFixed(2).padStart(6)}  ${r.f}  （文 ${r.sents}・短い文の読点 ${r.shortCommas}）`));
  const all = files.flatMap((f) => sentencesOf(stringsOf(readFileSync(f, "utf8")).join("\n")));
  console.log("\n読点の多い短い文の例");
  all.filter((x) => x.length <= SHORT && /、.*、|^.{1,6}、/.test(x)).slice(0, 8).forEach((x) => console.log("  " + x));
  console.log("\n癖の濃いファイル（千字あたり。文が千字以上のもの）");
  rows.filter((r) => r.chars >= 1000).sort((a, b) => b.rate - a.rate).slice(0, args.length ? rows.length : 25)
    .forEach((r) => console.log(`${r.rate.toFixed(2).padStart(6)}  ${r.f}  （${Object.entries(r.counts).filter(([, n]) => n).map(([k, n]) => `${k}${n}`).join(" ")}）`));
}
