// A14：白い背景の消し方（src/ui/a13_cutout.js の G.a13.keyOut・G.a13.draw、v6_monsters.js）
// - 実際の絵（tests/fixtures/a14/*.png。assets/ の webp を縮めた写し）で：外周の背景は透明になり、絵の中の白（白い魔物の体・白い毛皮・白い服・白髪）は残る。
//   消えた所はすべて外周とつながっている（中に穴が空かない）。境目は半透明（ソフトマット）
// - 作った絵で：境目の白と混ざった色は、白を取り除いて戻る（白いにじみが残らない）。線画に囲まれた白目・歯・光の反射は残る
// - 魔物の背景消しも同じ処理（下の縁からも）。大きく縮めて描くときは段階的に、なめらかに縮める
import { readFileSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import vm from "node:vm";

// 8bit の RGBA・RGB の PNG を読む（ImageMagick が書いた試しの絵だけを読めればよい）
function png(buf) {
  let i = 8, w = 0, h = 0, ct = 0;
  const idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i), type = buf.toString("ascii", i + 4, i + 8), d = buf.subarray(i + 8, i + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8) throw new Error("8bit でない"); ct = d[9]; }
    if (type === "IDAT") idat.push(d);
    i += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0;
  if (!bpp) throw new Error("RGBA か RGB の PNG でない");
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = new Uint8ClampedArray(w * h * 4), prev = new Uint8Array(stride), row = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pr = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      row[x] = (src[x] + pr) & 255;
    }
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; out[o] = row[x * bpp]; out[o + 1] = row[x * bpp + 1]; out[o + 2] = row[x * bpp + 2]; out[o + 3] = bpp === 4 ? row[x * bpp + 3] : 255; }
    prev.set(row);
  }
  return { w, h, data: out };
}

// 試しの絵ごとに：残るはずの白い所（3×3 の平均の不透明さを見る）。座標は試しの絵（128 幅）の上で
const KEEP = {
  e1_bowshroom: { bottom: true, pts: [[38, 35, "傘の白い斑点"], [51, 76, "体の白っぽい所（顔のまわり）"], [56, 92, "体"]] },
  e4k_dreamsheep: { bottom: true, pts: [[66, 84, "白い羊毛"], [61, 107, "顔"]] },
  e4_snowwolf: { bottom: true, pts: [[48, 56, "白い胸の毛（あごの下）"], [58, 33, "白い頭"], [75, 107, "白い脚"]] },
  e4k_whiteacolyte: { bottom: true, pts: [[77, 28, "白髪"], [72, 87, "白いローブ"]] },
  nora: { pts: [[80, 87, "白いシャツ"], [45, 108, "白い包帯"]] },
  kind_beggar_f: { pts: [[64, 100, "白い服"], [47, 37, "白に近い髪"]] },
  kind_noble_f: { pts: [[64, 125, "白いドレス"], [39, 105, "白い袖"]] },
};

export default ({ fail, ok }) => {
  const errs = [];
  const F = (m) => { errs.push(m); fail("A14 " + m); };
  const c = vm.createContext({ console });
  vm.runInContext(readFileSync(new URL("../../src/ui/a13_cutout.js", import.meta.url), "utf8"), c, { filename: "ui/a13_cutout.js" });
  const A = c.G.a13;

  // ---------------------------------------------------------------- 実際の絵
  const dir = new URL("../fixtures/a14/", import.meta.url);
  const names = readdirSync(dir).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4));
  for (const k of Object.keys(KEEP)) if (!names.includes(k)) F(`試しの絵 tests/fixtures/a14/${k}.png が無い`);
  let soft = 0, total = 0;
  for (const name of names) {
    const conf = KEEP[name];
    if (!conf) continue;
    const { w, h, data } = png(readFileSync(new URL(name + ".png", dir)));
    const orig = data.slice();
    const gone = A.keyOut(data, w, h, { bottom: !!conf.bottom });
    const al = (x, y) => data[(y * w + x) * 4 + 3];
    if (!(gone > 0.15)) F(`${name}：背景がほとんど消えない（${(gone * 100).toFixed(0)}%）`);
    if (al(1, 1) !== 0 || al(w - 2, 1) !== 0) F(`${name}：上の隅の背景が透明にならない（${al(1, 1)}・${al(w - 2, 1)}）`);
    // 残るはずの白い所
    for (const [x, y, what] of conf.pts) {
      let sum = 0, white = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { sum += al(x + dx, y + dy); const o = ((y + dy) * w + x + dx) * 4; if (Math.min(orig[o], orig[o + 1], orig[o + 2]) > 175) white++; }
      if (sum / 9 < 230) F(`${name}：${what}（${x},${y}）が消えた・透けた（不透明さ ${(sum / 9).toFixed(0)}）`);
      if (white < 3) F(`${name}：試しの点 ${what}（${x},${y}）が白っぽい所に当たっていない（座標を直す）`);
    }
    // 中に穴が空かない：透けた所（不透明さ 128 未満）は、すべて外周から透けた所づたいにつながっている
    const n = w * h, seen = new Uint8Array(n), q = new Int32Array(n);
    let qt = 0;
    const clear = (i) => data[i * 4 + 3] < 128;
    const push = (i) => { if (!seen[i] && clear(i)) { seen[i] = 1; q[qt++] = i; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    for (let k = 0; k < qt; k++) { const i = q[k], x = i % w; if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (i >= w) push(i - w); if (i < n - w) push(i + w); }
    let holes = 0;
    for (let i = 0; i < n; i++) if (clear(i) && !seen[i]) holes++;
    if (holes > n * 0.002) F(`${name}：絵の中に透けた穴が ${holes} 画素ある（外周からつながった背景だけを消すはず）`);
    // 境目は半透明（ソフトマット）
    for (let i = 0; i < n; i++) { const a = data[i * 4 + 3]; if (a > 16 && a < 240) soft++; }
    total++;
  }
  if (total && soft / total < 20) F(`境目の半透明の画素がほとんど無い（0/1 で切っている。1 枚あたり ${(soft / total).toFixed(0)}）`);

  // ---------------------------------------------------------------- 作った絵：色のにじみ抜き・線画の中の白
  const W = 48, H = 48;
  const p = new Uint8ClampedArray(W * H * 4);
  const set = (x, y, col) => { const o = (y * W + x) * 4; p[o] = col[0]; p[o + 1] = col[1]; p[o + 2] = col[2]; p[o + 3] = 255; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, [255, 255, 255]);
  for (let y = 12; y < 40; y++) for (let x = 12; x < 36; x++) set(x, y, [200, 40, 40]); // 赤い体
  for (let y = 12; y < 40; y++) set(11, y, [228, 148, 148]); // 境目：赤と白の半々（アンチエイリアス）
  for (let y = 20; y < 24; y++) for (let x = 20; x < 24; x++) set(x, y, [255, 255, 255]); // 体の中の白（白目・歯・光の反射の代わり）
  A.keyOut(p, W, H, { bottom: true });
  const o = (16 * W + 11) * 4;
  if (!(p[o + 3] > 60 && p[o + 3] < 200)) F(`赤と白の半々の境目が半透明にならない（不透明さ ${p[o + 3]}）`);
  if (!(p[o] > 170 && p[o + 1] < 90 && p[o + 2] < 90)) F(`境目の色から白が取り除かれていない（白いにじみ）：${p[o]},${p[o + 1]},${p[o + 2]}`);
  if (p[(21 * W + 21) * 4 + 3] !== 255) F("体の中の白（白目・歯・光の反射）を消した");
  if (p[(20 * W + 30) * 4 + 3] !== 255) F("体の中を透かした");

  // ---------------------------------------------------------------- 魔物：同じ処理を使う
  const v6 = readFileSync(new URL("../../src/ui/v6_monsters.js", import.meta.url), "utf8");
  if (!/G\.a13\.keyOut\(d\.data, W, H, \{ bottom: true \}\)/.test(v6)) F("v6_monsters.js が共有の背景消し（G.a13.keyOut・下の縁からも）を使っていない");
  if (/n \* 0\.006/.test(v6)) F("v6_monsters.js に、縁とつながらない大きな白も消す古い決まりが残っている（中抜けの原因）");

  // ---------------------------------------------------------------- 縮めて描く：段階的に・なめらかに
  const made = [];
  const mk = () => { const cv = { width: 0, height: 0, calls: [] }; cv.getContext = () => ({ set imageSmoothingEnabled(v) { cv.smooth = v; }, get imageSmoothingEnabled() { return cv.smooth; }, set imageSmoothingQuality(v) { cv.q = v; }, drawImage: (...a) => cv.calls.push(a) }); made.push(cv); return cv; };
  const d = vm.createContext({ console, document: { createElement: mk }, WeakMap });
  vm.runInContext(readFileSync(new URL("../../src/ui/a13_cutout.js", import.meta.url), "utf8"), d, { filename: "ui/a13_cutout.js" });
  const target = mk(), tctx = target.getContext();
  made.length = 0;
  const src = { width: 512, height: 640 };
  d.G.a13.draw(tctx, src, 0, 0, 512, 640, 0, 0, 64, 80);
  if (made.length < 2) F(`8 分の 1 に縮めるのに、途中の段階が ${made.length} つ（半分ずつ縮めるはず）`);
  if (made.some((cv) => cv.smooth !== true || cv.q !== "high") || target.smooth !== true || target.q !== "high") F("縮めるときに imageSmoothingEnabled・imageSmoothingQuality を high にしていない");
  const last = target.calls.pop();
  if (!last || last[0] === src || last.slice(5).join() !== "0,0,64,80") F(`縮めた途中の絵から描いていない：${last ? last.slice(1).join() : "描かない"}`);
  made.length = 0;
  d.G.a13.draw(tctx, src, 0, 0, 512, 640, 0, 0, 64, 80);
  if (made.length) F("同じ大きさに縮めた絵を覚えていない（毎回作り直した）");

  if (!errs.length) ok(`A14 白い背景の消し方：実際の絵 ${total} 枚で背景は透明・白い体や服は残る・穴なし・境目は半透明（1 枚あたり ${(soft / total).toFixed(0)} 画素）・にじみ抜き・段階的に縮める`);
};
