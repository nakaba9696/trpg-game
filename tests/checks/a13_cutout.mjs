// A13：立ち絵の白い背景を消して、背景の絵になじませる（src/ui/a13_cutout.js・v4_assets.js・ui/a13_cutout.css）
// - 縁からつながった白い背景は透明になる。線画に囲まれた内側の白（服）は残る。線画に囲まれた小さな背景の白（耳と髪のあいだ）は消える
// - 白い背景でない絵（隅が白くない）は何も消さない
// - 画素を読めないとき（file:// など）は元の絵のまま描き、cut の印を付けない。読めれば、消した絵を描いて cut の印を付ける。同じ鍵は一度だけ処理する
// - 消せた絵の覆いは CSS で替える（足元だけを溶かす）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const errs = [];
  const F = (m) => { errs.push(m); fail("A13 " + m); };
  const src = (f) => readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8");

  // ---------------------------------------------------------------- 消し方（作った絵で）
  // 64×80 の白い背景に、濃い線画の枠（人の形の代わり）。枠の中は薄い影の色、その中に真っ白の服、枠の中に線画で囲った背景の白（耳と髪のあいだの代わり）
  const W = 64, H = 80;
  const make = (bgc = [255, 255, 255]) => {
    const p = new Uint8ClampedArray(W * H * 4);
    const set = (x, y, c) => { const i = (y * W + x) * 4; p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = 255; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, bgc);
    for (let y = 10; y < H; y++) for (let x = 10; x < 54; x++) set(x, y, x < 12 || x > 51 || y < 12 ? [40, 30, 30] : [214, 206, 196]); // 線画の枠と影（下は絵の下の縁まで）
    for (let y = 40; y < 60; y++) set(9, y, [200, 200, 200]); // 線画の外の、白と混ざった縁（アンチエイリアス）
    for (let y = 40; y < 70; y++) for (let x = 20; x < 44; x++) set(x, y, [255, 255, 255]); // 服の白（影の色に囲まれる）
    for (let y = 16; y < 32; y++) for (let x = 18; x < 34; x++) set(x, y, x === 18 || x === 33 || y === 16 || y === 31 ? [60, 40, 35] : [255, 255, 255]); // 線画で囲った背景の白
    return p;
  };
  const c = vm.createContext({ console });
  vm.runInContext(src("a13_cutout.js"), c, { filename: "ui/a13_cutout.js" });
  const A13 = c.G.a13;
  const p = make();
  const gone = A13.keyOut(p, W, H);
  const a = (x, y) => p[(y * W + x) * 4 + 3];
  if (a(2, 2) !== 0 || a(60, 40) !== 0 || a(5, 75) !== 0) F(`縁からつながった白い背景が透明にならない（${a(2, 2)}・${a(60, 40)}・${a(5, 75)}）`);
  if (a(30, 55) !== 255 || a(21, 41) !== 255) F(`線画の内側の白（服）まで消した（${a(30, 55)}・${a(21, 41)}）`);
  if (a(30, 20) !== 0) F(`線画で囲った背景の白（耳と髪のあいだ）が消えない（${a(30, 20)}）`);
  if (a(15, 30) !== 255 || a(10, 40) === 0) F(`人の形（影・線画）を消した（${a(15, 30)}・${a(10, 40)}）`);
  if (!(gone > 0.2 && gone < 0.6)) F(`消えた割合がおかしい：${gone}`);
  // 境目に白い縁取りを残さない：背景に接する線画の画素は、白に寄った色を戻す（明るくならない）
  const edge = (y) => { const i = (y * W + 9 + 1) * 4; return [p[i], p[i + 1], p[i + 2], p[i + 3]]; };
  const e = edge(40);
  if (e[3] === 0 || e[0] > 60) F(`背景に接する線画が消えたか、白っぽくなった：${e.join(",")}`);
  const aa = ((50 * W) + 9) * 4;
  if (!(p[aa + 3] < 200 && p[aa + 3] > 0 && p[aa] < 190)) F(`白と混ざった縁が、白っぽいまま残る（白い縁取り）：${[p[aa], p[aa + 1], p[aa + 2], p[aa + 3]].join(",")}`);
  // 白い背景でない絵：何も消さない
  const grey = make([128, 120, 110]);
  const before = grey.slice();
  if (A13.keyOut(grey, W, H) !== 0 || grey.some((v, i) => v !== before[i])) F("白い背景でない絵まで消した");
  // 隅に何かが掛かっていても、ほかの縁の白で背景を決める
  const corner = make();
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = (y * W + x) * 4; corner[i] = 30; corner[i + 1] = 90; corner[i + 2] = 30; }
  A13.keyOut(corner, W, H);
  if (corner[(2 * W + 30) * 4 + 3] !== 0) F("左上の隅に何かが掛かると、白い背景を消さない");

  // ---------------------------------------------------------------- 描き方（v4_assets.js から）
  const loaded = [];
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.ls = {}; loaded.push(this); }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    set src(v) { this._src = v; }
    get src() { return this._src; }
    fire() { this.complete = true; this.naturalWidth = W * 5; this.naturalHeight = H * 5; (this.ls.load || []).forEach((f) => f()); }
  }
  const calls = [];
  let reads = 0, readable = true;
  const grad = { addColorStop() {} };
  const canvas = () => {
    const cls = new Set();
    const cv = { width: 0, height: 0, classList: { add: (k) => cls.add(k), remove: (k) => cls.delete(k), toggle: (k, on) => (on ? cls.add(k) : cls.delete(k)), contains: (k) => cls.has(k) }, getBoundingClientRect: () => ({ width: 128, height: 160 }) };
    const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createLinearGradient" || k === "createRadialGradient" ? () => grad
      : k === "getImageData" ? (x, y, w, h) => { reads++; if (!readable) throw new Error("読めない"); return { data: make() }; }
      : (...args) => calls.push([k, args, cv])), set: (t, k, v) => ((t[k] = v), true) });
    cv.getContext = () => ctx;
    return cv;
  };
  const load = () => {
    const g = { data: G.data, MOODS: G.MOODS, ASSET_MODE: "files", ASSETS: { "portraits/nora": `portraits/packs/people-1.svg#xywh=${W},0,${W},${H}`, "portraits/sheila": `portraits/packs/people-1.svg#xywh=0,0,${W},${H}` } };
    for (const k of ["eventWho", "companionWho", "heroWho", "facWho"]) if (G[k]) g[k] = G[k];
    const vc = vm.createContext({ console, G: g, Image: FakeImage, document: { createElement: canvas }, setTimeout: () => 0 });
    for (const f of ["a13_cutout.js", "art_people.js", "r1_race.js", "v4_assets.js"]) vm.runInContext(src(f), vc, { filename: "ui/" + f });
    return g;
  };
  // 画素を読めないとき：元の絵（スプライトの升目）のまま描き、cut の印を付けない
  readable = false; loaded.length = 0;
  let g = load();
  let cv = canvas();
  g.drawPortrait(cv, { kind: "villager", seed: "c2:nora", name: "ノラ" });
  loaded.forEach((i) => i.fire());
  let d = calls.filter(([k, , c2]) => k === "drawImage" && c2 === cv).pop();
  if (!d || d[1][0] !== loaded[0] || d[1][1] < W) F(`画素を読めないとき、元の絵の升目を描かない：${d ? d[1].slice(1, 5).join() : "描かない"}`);
  if (cv.classList.contains("cut")) F("画素を読めないのに cut の印を付けた");
  // 読めるとき：消した絵（canvas）を描き、cut の印を付ける。同じ鍵は一度だけ処理する
  readable = true; reads = 0; calls.length = 0; loaded.length = 0;
  g = load();
  cv = canvas();
  g.drawPortrait(cv, { kind: "villager", seed: "c2:nora", name: "ノラ" });
  loaded.forEach((i) => i.fire());
  d = calls.filter(([k, , c2]) => k === "drawImage" && c2 === cv).pop();
  if (!d || d[1][0] === loaded[0] || !d[1][0].getContext) F("画素を読めるのに、背景を消した絵を描かない");
  if (d && (d[1][1] !== 0 || d[1][2] < 0)) F(`消した絵を、升目の位置のまま切り出した：${d[1].slice(1, 5).join()}`);
  if (!cv.classList.contains("cut")) F("背景を消した絵に cut の印が無い");
  const cv2 = canvas();
  g.drawPortrait(cv2, { kind: "villager", seed: "c2:nora", name: "ノラ" });
  if (reads !== 1) F(`同じ絵の背景を ${reads} 回処理した（一度だけのはず）`);
  if (!cv2.classList.contains("cut")) F("二度目に描いた canvas に cut の印が無い");
  // 主人公は立ち絵なし、絵の無い人は絵を出さない（A10）は変わらない
  calls.length = 0;
  g.drawPortrait(canvas(), { kind: "hero", seed: "x" });
  if (calls.some(([k]) => k === "drawImage")) F("主人公の立ち絵を描いた");

  // ---------------------------------------------------------------- 覆い（CSS）
  const css = src("a13_cutout.css");
  if (!/#stand \.standFace\.cut/.test(css) || !/\.v9fig\.img \.v9face\.cut/.test(css) || !/mask-image/.test(css)) F("ui/a13_cutout.css に、消せた立ち絵の覆い（#stand・PC の配置）が無い");

  if (!errs.length) ok(`A13 立ち絵の背景：白い背景は透明（${Math.round(gone * 100)}%）・服の白と線画は残る・囲まれた背景の白も消える・画素を読めなければ元の絵・同じ絵は一度だけ`);
};
