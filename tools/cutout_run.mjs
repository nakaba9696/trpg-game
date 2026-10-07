// 透過の点検（tools/cutout_sheets.py が呼ぶ）：生の RGBA（<名前>.<幅>x<高さ>.raw）を、ゲームと同じ背景消し（src/ui/a13_cutout.js の G.a13.keyOut）に通して書き戻す。
// node tools/cutout_run.mjs <a13_cutout.js> <raw のフォルダ> <bottom: 0|1>
// 人物は下の縁から消さない（bottom 0）、魔物は下からも消す（bottom 1）。ゲームの呼び方（v4_assets.js・v6_monsters.js）と同じ
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const [, , src, dir, bottom] = process.argv;
const G = {};
vm.runInContext(fs.readFileSync(src, "utf8"), vm.createContext({ G, console, setTimeout, Map }), { filename: "a13_cutout.js" });
let n = 0;
for (const f of fs.readdirSync(dir)) {
  const m = /^(.*)\.(\d+)x(\d+)\.raw$/.exec(f);
  if (!m) continue;
  const p = path.join(dir, f);
  const a = new Uint8ClampedArray(fs.readFileSync(p));
  G.a13.keyOut(a, +m[2], +m[3], { bottom: bottom === "1" });
  fs.writeFileSync(p, a);
  n++;
}
console.log(`cutout ${n}`);
