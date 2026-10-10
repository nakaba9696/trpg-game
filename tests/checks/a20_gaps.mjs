// A20：囲まれて残った背景（髪のすき間・腕と胴のあいだ・武器と体のあいだ）も透明にした絵（tools/a20/a20_gaps.py。一覧は docs/art/a20_gaps.json）
// - 一覧の絵はすべて assets/ にあり、透明つきの webp（VP8X の透明の印と ALPH の塊がある）。元の絵より大きくなりすぎていない
// - 試しの絵（tests/fixtures/a20/*.png。作った絵を 1/4 に縮めた写し）で：四隅と外周の縁が透明（不透明な縁が残らない）、
//   消した囲まれた背景は透明、残るはずの白（白い服・白い帯・白い髪）は不透明。ゲームの白抜き（keyOut）は透明を持つ絵をそのまま使う
import { readFileSync, existsSync, statSync } from "node:fs";
import { inflateSync } from "node:zlib";
import vm from "node:vm";

// 8bit の RGBA の PNG を読む（試しの絵だけを読めればよい）
function png(buf) {
  let i = 8, w = 0, h = 0, ct = 0;
  const idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i), type = buf.toString("ascii", i + 4, i + 8), d = buf.subarray(i + 8, i + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8) throw new Error("8bit でない"); ct = d[9]; }
    if (type === "IDAT") idat.push(d);
    i += 12 + len;
  }
  if (ct !== 6) throw new Error("RGBA の PNG でない");
  const bpp = 4, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = new Uint8ClampedArray(w * h * 4), prev = new Uint8Array(stride), row = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pr = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      row[x] = (src[x] + pr) & 255;
    }
    out.set(row, y * stride);
    prev.set(row);
  }
  return { w, h, data: out };
}

// webp の塊の名前と、VP8X の透明の印
function webpInfo(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunks = [];
  let alphaFlag = false;
  for (let i = 12; i + 8 <= buf.length;) {
    const t = buf.toString("ascii", i, i + 4), len = buf.readUInt32LE(i + 4);
    chunks.push(t);
    if (t === "VP8X") alphaFlag = !!(buf[i + 8] & 0x10);
    i += 8 + len + (len & 1);
  }
  return { chunks, alphaFlag };
}

export default ({ fail, ok }) => {
  const errs = [];
  const F = (m) => { errs.push(m); fail("A20 " + m); };
  const root = new URL("../../", import.meta.url);
  const list = JSON.parse(readFileSync(new URL("docs/art/a20_gaps.json", root), "utf8")).files;
  const keys = Object.keys(list);
  if (keys.length < 30) F(`一覧の絵が ${keys.length} 枚しかない`);
  let gaps = 0, bytes = 0, orig = 0;
  for (const k of keys) {
    const p = new URL(`assets/${k}.webp`, root);
    if (!existsSync(p)) { F(`${k}.webp が無い`); continue; }
    const buf = readFileSync(p), info = webpInfo(buf);
    if (!info || !info.alphaFlag || !info.chunks.includes("ALPH") && !info.chunks.includes("VP8L")) F(`${k}.webp が透明つきの webp でない（${info ? info.chunks.join(",") : "webp でない"}）`);
    const b = statSync(p).size, o = list[k].orig;
    if (b > Math.max(o * 1.5, o + 12 * 1024)) F(`${k}.webp が ${(b / 1024).toFixed(0)}KB で、元の ${(o / 1024).toFixed(0)}KB より大きくなりすぎ`);
    bytes += b; orig += o;
    if (list[k].gapPx > 0) gaps++;
  }
  if (bytes > orig * 1.15) F(`作った絵の合計が ${(bytes / 1048576).toFixed(1)}MB で、元の ${(orig / 1048576).toFixed(1)}MB より大きくなりすぎ`);

  // 試しの絵
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(new URL("src/ui/a13_cutout.js", root), "utf8"), ctx);
  const A13 = ctx.G.a13;
  const pts = JSON.parse(readFileSync(new URL("tests/fixtures/a20/points.json", root), "utf8"));
  let nGap = 0, nKeep = 0;
  for (const [n, m] of Object.entries(pts)) {
    const { w, h, data } = png(readFileSync(new URL(`tests/fixtures/a20/${n}.png`, root)));
    const a = (x, y) => data[(y * w + x) * 4 + 3];
    if (![a(0, 0), a(w - 1, 0), a(0, h - 1), a(w - 1, h - 1)].every((v) => v < 16)) F(`${n}：四隅が透明でない`);
    // 外周の縁（上と左右。人物の下は胸から下の服で切れている）に、背景の白のまま不透明な画素が残っていない（絵が縁に掛かるのはよい）
    const bgRim = (x, y) => { const i = (y * w + x) * 4; return data[i + 3] > 128 && Math.min(data[i], data[i + 1], data[i + 2]) > 235; };
    let rim = 0;
    for (let x = 0; x < w; x++) if (bgRim(x, 0)) rim++;
    for (let y = 0; y < h * 0.6; y++) { if (bgRim(0, y)) rim++; if (bgRim(w - 1, y)) rim++; }
    if (rim > 4) F(`${n}：外周の縁に背景の白が不透明なまま ${rim} 画素残る`);
    for (const [x, y] of m.gaps) { nGap++; if (a(x, y) > 48) F(`${n}：囲まれた背景（${x},${y}）が透明でない（${a(x, y)}）`); }
    for (const [x, y] of m.keep) { nKeep++; if (a(x, y) < 240) F(`${n}：残るはずの白（${x},${y}）に穴が空いた（${a(x, y)}）`); }
    // ゲームの白抜きは、透明を持つ絵を切り抜かずにそのまま使う
    const copy = new Uint8ClampedArray(data);
    const r = A13.keyOut(copy, w, h, { bottom: m.key.startsWith("monsters/") });
    if (!(r >= A13.MIN) || copy.some((v, i) => v !== data[i])) F(`${n}：keyOut が透明つきの絵をそのまま使わない（${r}）`);
  }
  if (!errs.length) ok(`A20 囲まれた背景も透明にした絵：${keys.length} 枚（隙間を消した ${gaps} 枚・${(bytes / 1048576).toFixed(1)}MB／元 ${(orig / 1048576).toFixed(1)}MB）・試し ${Object.keys(pts).length} 枚で隙間 ${nGap} 点が透明・白 ${nKeep} 点が残る`);
};
