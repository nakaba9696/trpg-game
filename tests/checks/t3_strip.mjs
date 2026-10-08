// T3：ビルドで行まるごとのコメントを落とす（tools/strip.mjs）。落としても中身が変わらないこと。
// - 文字列・テンプレート文字列・正規表現・ブロックコメントの中の「// で始まる行」は残す
// - src のどのファイルも、落としたあと構文が通る
// - エンジン（data・engine）を、落とす前と後のファイルで読み込んで、ゲームのデータ（G.data。関数を除く）が同じ
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { listFiles } from "../../tools/files.mjs";
import { stripLineComments } from "../../tools/strip.mjs";

export default ({ fail, ok }) => {
  let bad = 0;
  const B = (m) => { bad++; fail("T3 strip: " + m); };

  // 小さな例
  const cases = [
    ["a = 1;\n// 落とす\nb = 2;", "a = 1;\nb = 2;"],
    ["// ==== data/x.js\nx();", "// ==== data/x.js\nx();"],
    ["t = `一行目\n// 本文\n`;", "t = `一行目\n// 本文\n`;"],
    ["t = `${a ? `x\n// 本文` : 1}\n// 本文`;\n// 落とす", "t = `${a ? `x\n// 本文` : 1}\n// 本文`;"],
    ["r = /'/g; s = '//';\n  // 落とす\nq = 1 / 2 / 3;", "r = /'/g; s = '//';\nq = 1 / 2 / 3;"],
    ["/* はじまり\n// 中\n*/\nx();", "/* はじまり\n// 中\n*/\nx();"],
    ["s = 'a\\\n// 続き';", "s = 'a\\\n// 続き';"],
    ["x = `閉じない\n// 本文", "x = `閉じない\n// 本文"], // 読み違えたかもしれないときは触らない
  ];
  cases.forEach(([src, want], i) => { const got = stripLineComments(src); if (got !== want) B(`例 ${i}：${JSON.stringify(got)}（${JSON.stringify(want)} のはず）`); });

  // 本物の src
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
  const { engine, ui } = listFiles(root);
  let before = 0, after = 0;
  const raw = {}, cut = {};
  for (const f of [...engine, ...ui]) {
    raw[f] = readFileSync(path.join(root, f), "utf8");
    cut[f] = stripLineComments(raw[f]);
    before += Buffer.byteLength(raw[f]); after += Buffer.byteLength(cut[f]);
    try { new vm.Script(cut[f], { filename: f }); } catch (e) { B(`${f}：落としたあと構文が通らない（${e.message}）`); }
  }
  const load = (src) => {
    const ctx = vm.createContext({ console });
    for (const f of engine) new vm.Script(src[f], { filename: f }).runInContext(ctx);
    return JSON.stringify(ctx.G.data);
  };
  const a = load(raw), b = load(cut);
  if (a !== b) B("落とす前と後で、ゲームのデータ（G.data）が違う");
  if (!bad) ok(`T3 ビルドで行まるごとのコメントを落とす（${((before - after) / 1000).toFixed(0)} KB 減。ゲームのデータは同じ）`);
};
