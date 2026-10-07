// A16（二回め）：囲まれた背景の扱い（src/ui/a13_cutout.js の a13core）を、真っ白の背景の小さな合成画像で確かめる
// - 腕と体のあいだのような囲まれた白（線の向こうが肌の色・中にむらが無い）は透明に
// - 陰のある白い服（中に広いむら）は残す
// - 髪の房・指のあいだ程度の小さめの囲まれた白は、完全には消さず薄白の半透明に（迷う塊）
// - 白目・歯ほどの小さな白は触らない
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export default ({ fail, ok }) => {
  const g = {};
  vm.runInContext(readFileSync(fileURLToPath(new URL("../../src/ui/a13_cutout.js", import.meta.url)), "utf8"), vm.createContext({ G: g, console }), { filename: "ui/a13_cutout.js" });
  const keyOut = g.a13.core(); // Worker と同じ、閉じた核
  const W = 200, H = 200;
  const p = new Uint8ClampedArray(W * H * 4);
  const set = (x, y, c) => { const i = (y * W + x) * 4; p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = 255; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, typeof c === "function" ? c(x, y) : c); };
  const ink = [20, 20, 20], skin = [240, 200, 160], white = [255, 255, 255];
  rect(0, 0, W, H, white);
  rect(20, 20, 180, 180, ink); rect(23, 23, 177, 177, skin);
  rect(30, 30, 73, 110, ink); rect(33, 33, 70, 107, white); // 囲まれた背景（大きい）
  rect(90, 30, 153, 110, ink); rect(93, 33, 150, 107, (x, y) => { const v = 255 - Math.round(((x - 93) / 57) * 30); return [v, v, Math.min(255, v + 6)]; }); // 陰のある白い服
  rect(40, 130, 54, 145, ink); rect(43, 133, 51, 142, white); rect(43, 142, 51, 143, white); // 小さめの囲まれた白（8×10＝80px）
  rect(120, 140, 126, 146, white); // 白目ほどの小さな白（36px）
  const r = keyOut(p, W, H, {});
  const a = (x, y) => p[(y * W + x) * 4 + 3];
  if (!(r > 0)) fail("A16 真っ白の背景の絵で何も消えていない");
  if (a(5, 5) !== 0) fail("A16 外の背景が消えていない");
  if (a(50, 70) !== 0) fail("A16 囲まれた背景（大きい）が透明になっていない：" + a(50, 70));
  if (a(100, 70) < 200 || a(140, 70) < 200) fail("A16 陰のある白い服を消した");
  const s = a(47, 137);
  if (s === 0 || s > 90) fail("A16 小さめの囲まれた白が薄白の半透明になっていない（不透明度 " + s + "）");
  if (p[(137 * W + 47) * 4] < 240) fail("A16 薄白の半透明が白くない");
  if (a(123, 143) < 200) fail("A16 白目ほどの小さな白を消した");
  if (a(25, 100) < 200) fail("A16 肌を消した");
  ok("A16 囲まれた背景の核：透明・薄白・残すの区別");
};
