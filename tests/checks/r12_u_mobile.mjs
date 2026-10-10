// R12-U（低 6・7・8）：依頼の知らせは一つ・スマホ縦の知らせと所持金の増減の札が重ならない（作りを読む）
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export default ({ fail, ok }) => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const read = (f) => readFileSync(path.join(root, f), "utf8");
  if (!/ギルドに報告/.test(read("src/engine/zzzzzzzzzzz_u17_quest_new.js"))) fail("R12 低 6：Q7 が「果たした」を重ねて出している");
  const css = read("src/ui/zzzzzzzzzz_r12_mobile.css");
  if (!/#toast \{ top: calc\(var\(--v9-ty/.test(css)) fail("R12 低 7：縦の #toast が舞台の側にない");
  if (!/#u8note \{ top: calc\(var\(--v9-ty, 120px\) - 32px/.test(css)) fail("R12 低 7：縦の #u8note が見出しの上にない");
  if (!/\.u11d[^{]*\{ top: 100%/.test(css)) fail("R12 低 8：増減の札が数字の下にない");
  ok("R12-U：依頼の知らせ一つ・縦の知らせ・増減の札");
};
