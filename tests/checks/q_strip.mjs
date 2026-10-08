// ビルドで落とす注（tools/strip.mjs）：行まるごとの「//」の注だけを落とし、どのファイルも落としたあとも JS として読める。
// 複数行のテンプレート文字列の中に「//」で始まる行があると、落とすと文字列が変わるので失敗にする（その行は書き方を変える）
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { listFiles } from "../../tools/files.mjs";
import { stripLineComments, unsafeLines } from "../../tools/strip.mjs";

export default ({ fail }) => {
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
  const { engine, ui } = listFiles(src);
  if (stripLineComments("a\n  // x\nb // y") !== "a\nb // y") fail("strip: 行まるごとの注だけを落としていない");
  for (const f of [...engine, ...ui]) {
    const s = readFileSync(path.join(src, f), "utf8");
    unsafeLines(s).forEach(([n, l]) => fail(`strip: ${f}:${n} はテンプレート文字列の中の「//」の行（ビルドで落ちてしまう）：${l.trim().slice(0, 40)}`));
    try { new vm.Script(stripLineComments(s), { filename: f }); } catch (e) { fail(`strip: ${f} が注を落とすと読めない：${e.message}`); }
  }
};
