// 白い背景の絵を、ゲームと同じやり方（外側の白を抜く。src/ui/a13_cutout.js）で透明にする
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
const [repo, list] = process.argv.slice(2);
const c = vm.createContext({ console });
vm.runInContext(readFileSync(repo + "/src/ui/a13_cutout.js", "utf8"), c);
const A = c.G ? c.G.a13 : c.window?.G?.a13;
for (const [inp, out, w, h, bottom] of JSON.parse(readFileSync(list, "utf8"))) {
  const data = new Uint8ClampedArray(readFileSync(inp));
  A.keyOut(data, w, h, { bottom });
  writeFileSync(out, data);
}
