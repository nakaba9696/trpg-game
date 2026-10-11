// U32：作成画面の合計と術の才の要約（src/ui/zzz_u32_cre_top.js）が、術の才の箱（zm14_magic.js）の後に読まれる
// 見え方（スクロールなしで見えるか）は node tools/shots_u32.mjs で確かめる
import { listFiles } from "../../tools/files.mjs";
import { fileURLToPath } from "node:url";

export default ({ fail }) => {
  const ui = listFiles(fileURLToPath(new URL("../../src", import.meta.url))).ui;
  const a = ui.findIndex((f) => f.endsWith("zm14_magic.js")), b = ui.findIndex((f) => f.endsWith("zzz_u32_cre_top.js"));
  if (b < 0) fail("zzz_u32_cre_top.js が読み込まれない");
  else if (a < 0 || b < a) fail("zzz_u32_cre_top.js は zm14_magic.js のあとに読まれる必要がある（statsExtra を包むため）");
};
