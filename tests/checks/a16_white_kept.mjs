// A16：白いものを誤って抜かない・透明つきの絵は切り抜かない（src/ui/a13_cutout.js の a13core）
// - 白い服の中の平らな白い塊（線で囲まれ、線の向こうもまた白い服）は残る
// - 白い髪の束（線で区切られた細い束。束の中に陰の濃淡がある）は残る
// - もう透明を持つ絵（背景を除いて透明つきに置き換えた絵）は、画素を一つも変えず、「消せた絵」として返る
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export default ({ fail, ok }) => {
  const g = {};
  vm.runInContext(readFileSync(fileURLToPath(new URL("../../src/ui/a13_cutout.js", import.meta.url)), "utf8"), vm.createContext({ G: g, console }), { filename: "ui/a13_cutout.js" });
  const keyOut = g.a13.core();
  const W = 200, H = 220;
  const p = new Uint8ClampedArray(W * H * 4);
  const set = (x, y, c) => { const i = (y * W + x) * 4; p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = 255; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, typeof c === "function" ? c(x, y) : c); };
  const ink = [25, 25, 30], white = [255, 255, 255];
  rect(0, 0, W, H, white);
  // 白い服：外を線で囲み、中に線で囲んだ平らな白い塊（襟・前掛けの一部）
  rect(20, 100, 180, 215, ink); rect(23, 103, 177, 212, white);
  rect(60, 130, 140, 190, ink); rect(63, 133, 137, 187, white);
  // 白い髪：線で区切った細い束（幅 9px・陰の濃淡がある）
  rect(40, 10, 160, 90, ink);
  for (let k = 0; k < 11; k++) {
    const x0 = 43 + k * 10;
    rect(x0, 13, x0 + 9, 87, (x, y) => { const v = 255 - Math.round(Math.abs(x - x0 - 4) * 4 + (y % 30) * 0.6); return [v, v, Math.min(255, v + 4)]; });
  }
  keyOut(p, W, H, {});
  const a = (x, y) => p[(y * W + x) * 4 + 3];
  if (a(3, 3) !== 0) fail("A16 外の背景が消えていない");
  if (a(100, 160) < 250) fail("A16 白い服の中の平らな白い塊を消した・薄くした（不透明度 " + a(100, 160) + "）");
  if (a(50, 120) < 250) fail("A16 白い服を消した");
  let bad = 0;
  for (let k = 0; k < 11; k++) if (a(43 + k * 10 + 4, 50) < 250) bad++;
  if (bad) fail(`A16 白い髪の束を ${bad} 本消した・薄くした`);
  // 透明つきの絵：四隅が透明。中に白い穴（囲まれた白）があっても触らない
  const q = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { q[i * 4] = q[i * 4 + 1] = q[i * 4 + 2] = 255; q[i * 4 + 3] = 0; }
  for (let y = 30; y < 190; y++) for (let x = 30; x < 170; x++) { const i = (y * W + x) * 4; const edge = x < 33 || x >= 167 || y < 33 || y >= 187; q[i] = q[i + 1] = q[i + 2] = edge ? 20 : 255; q[i + 3] = 255; }
  const before = q.slice();
  const r = keyOut(q, W, H, {});
  if (!(r >= g.a13.MIN)) fail("A16 透明つきの絵が「消せた絵」として返らない（" + r + "）");
  if (q.some((v, i) => v !== before[i])) fail("A16 透明つきの絵の画素を書き換えた（切り抜きを通った）");
  ok("A16 白い服の平らな塊・白い髪の束は残る・透明つきの絵は切り抜かない");
};
