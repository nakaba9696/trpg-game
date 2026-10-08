// A17：背景込みの一枚絵として出す魔物（src/ui/a17_keep_bg.js）。絵があり、透明を持たない元の絵のままであること（切り抜いた版を入れていない）
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root = fileURLToPath(new URL("../../", import.meta.url));
export default ({ fail, ok }) => {
  const g = {};
  vm.runInContext(readFileSync(root + "src/ui/a17_keep_bg.js", "utf8"), vm.createContext({ globalThis: { G: g }, G: g }), { filename: "ui/a17_keep_bg.js" });
  const set = g.a17KeepBg;
  if (!set || !set.size) return fail("A17 背景込みの魔物の一覧（G.a17KeepBg）が無い");
  let n = 0;
  for (const k of set) {
    if (!k.startsWith("monsters/")) { fail(`A17 一覧は魔物の絵だけ：${k}`); continue; }
    const f = root + "assets/" + k + ".webp";
    if (!existsSync(f)) { fail(`A17 絵が無い：${k}`); continue; }
    const b = readFileSync(f);
    // webp の VP8X の印の alpha（0x10）か、VP8L（可逆。透明を持てる）の印。元の絵は VP8（不可逆・透明なし）
    const kind = b.toString("latin1", 12, 16);
    const alpha = kind === "VP8X" ? (b[20] & 0x10) !== 0 : kind === "VP8L";
    if (alpha) { fail(`A17 背景込みのはずの絵が透明を持つ（切り抜いた版が入っている）：${k}`); continue; }
    n++;
  }
  ok(`A17 背景込みの魔物 ${n} 枚（切り抜かず・表示の背景消しにも通さない）`);
};
