// A16：囲まれた背景（腕と体のあいだ・脚のあいだ）も消す（src/ui/a13_cutout.js の keyOut）
// - 背景が少し灰色の絵：線画に囲まれ、まわりが肌や濃い服の色の背景は消える
// - 白い服（線の向こうがまた白い）・小さな白（白目・歯）は残る
// - 背景が真っ白の絵では囲まれた所を消さない（白い服と見分けられない）
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export default ({ fail, ok }) => {
  const g = {};
  vm.runInContext(readFileSync(fileURLToPath(new URL("../../src/ui/a13_cutout.js", import.meta.url)), "utf8"), vm.createContext({ G: g, console }), { filename: "ui/a13_cutout.js" });
  const keyOut = g.a13.keyOut;
  const W = 200, H = 200;
  // 絵：背景 bg の中に、肌色の大きな四角（外に黒い線）。その中に、黒い線で囲んだ「背景の色の穴」と「白い服（中に線が一本あり、線の向こうも白）」と「小さな白」
  const make = (bg, cloth) => {
    const p = new Uint8ClampedArray(W * H * 4);
    const set = (x, y, c) => { const i = (y * W + x) * 4; p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = 255; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, c); };
    rect(0, 0, W, H, bg);
    rect(20, 20, 180, 180, [20, 20, 20]);
    rect(23, 23, 177, 177, [240, 200, 160]); // 肌
    rect(40, 40, 83, 120, [20, 20, 20]); rect(43, 43, 80, 117, bg); // 囲まれた背景（腕と体のあいだ）
    rect(100, 40, 163, 120, [20, 20, 20]); rect(103, 43, 160, 117, cloth); rect(130, 43, 132, 117, [20, 20, 20]); // 白い服（折り目の線）
    rect(60, 140, 66, 146, bg); // 小さな白（白目・歯）
    return p;
  };
  const alpha = (p, x, y) => p[(y * W + x) * 4 + 3];
  // 少し灰色の背景・白い服は同じ灰色（いちばん見分けにくい形）
  const grey = [246, 246, 246];
  const a = make(grey, grey);
  keyOut(a, W, H, {});
  if (alpha(a, 5, 5) !== 0) fail("A16 外の背景が消えていない");
  if (alpha(a, 60, 80) !== 0) fail("A16 囲まれた背景（腕と体のあいだ）が消えていない");
  if (alpha(a, 115, 80) < 200 || alpha(a, 145, 80) < 200) fail("A16 白い服（線の向こうも白い）を消した");
  if (alpha(a, 62, 142) < 200) fail("A16 小さな白（白目・歯）を消した");
  if (alpha(a, 50, 30) < 200) fail("A16 肌を消した");
  // 真っ白の背景：囲まれた所は消さない
  const white = [255, 255, 255];
  const b = make(white, white);
  keyOut(b, W, H, {});
  if (alpha(b, 5, 5) !== 0) fail("A16 真っ白の背景で外の背景が消えていない");
  if (alpha(b, 60, 80) < 200) fail("A16 真っ白の背景の絵で囲まれた所を消した（白い服と見分けられないので消さない）");
  // holes: false なら今までどおり
  const c = make(grey, grey);
  keyOut(c, W, H, { holes: false });
  if (alpha(c, 60, 80) < 200) fail("A16 holes: false でも囲まれた背景を消した");
  ok("A16 囲まれた背景を消す（白い服・小さな白・真っ白の背景の絵は残す）");
};
