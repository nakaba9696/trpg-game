// T：速さのための決まり（見た目と遊びは変えずに、無駄な描き直しをしない）。DOM なしで確かめられる範囲
// - 背景の絵（scene_v2.js）は、舞台（v1_stage.js）の裏に回った層（.bgLayer に on が無い）を動かさない
// - 背景の画像（A11）を読み込み中は、重い canvas の絵を描かずに空の色だけを敷き、それを取っておかない。読み終われば画像で描き直す。読めなければ canvas の絵
// - 白い背景を消す処理（A13）は、同じ鍵では二度しない
// - 閉じているステータスの窓は、位置を読まず（配置の計算を走らせない）、仲間の顔は開いたときに描く（ui.js）
// - 測る道具 tools/perf.mjs がある（重いので CI では回さない）
import { readFileSync, readdirSync, existsSync } from "node:fs";
import vm from "node:vm";

export default ({ loadEngine, fail, ok }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("T 速さ: " + m); };
  const dir = new URL("../../src/ui/", import.meta.url);
  const src = (f) => readFileSync(new URL(f, dir), "utf8");

  // ---------------------------------------------------------------- 偽の canvas と画像
  let ops = 0;
  const grad = { addColorStop() {} };
  const drawn = [];
  const ctx = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : (...a) => { ops++; if (k === "drawImage") drawn.push(a[0]); return k === "createRadialGradient" || k === "createLinearGradient" || k === "createPattern" ? grad : k === "createImageData" || k === "getImageData" ? { data: new Uint8ClampedArray(16) } : k === "measureText" ? { width: 10 } : undefined; }),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const canvas = (w, h) => ({ width: 0, height: 0, isConnected: true, getBoundingClientRect: () => ({ width: w, height: h }), getContext: () => ctx });
  const imgs = [];
  class Img {
    constructor() { this.complete = false; this.naturalWidth = 0; this.ls = {}; imgs.push(this); }
    addEventListener(k, f) { (this.ls[k] = this.ls[k] || []).push(f); }
    fire(k) { (this.ls[k] || []).forEach((f) => f()); }
  }
  const G = loadEngine();
  const D = G.data;
  const loc = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town");
  const key = D.LOCS[loc].scene;
  G.ASSETS = { ["scenes/" + loc]: "scenes/x.svg#xywh=0,0,1232,704" };
  G.S = { mode: "explore", loc, flags: {} };
  const c = vm.createContext({ console, G, Image: Img, document: { createElement: () => canvas(10, 10) }, setTimeout: () => 0, matchMedia: () => ({ matches: false }) });
  const v2 = readdirSync(dir).filter((f) => /^scene_v2.*\.js$/.test(f)).sort();
  for (const f of ["scene.js", ...v2, "scene_v3_photo.js"]) vm.runInContext(src(f), c, { filename: "ui/" + f });
  const V = G.SV2;

  // ---------------------------------------------------------------- 裏に回った層
  if (typeof V.hiddenLayer !== "function") F("scene_v2.js に V.hiddenLayer が無い");
  else {
    const layer = (on) => ({ parentNode: { classList: { contains: (k) => k === "bgLayer" || (on && k === "on") } } });
    if (!V.hiddenLayer(layer(false))) F("裏に回った層（on の無い .bgLayer）を動かしてしまう");
    if (V.hiddenLayer(layer(true))) F("見えている層（.bgLayer.on）を止めてしまう");
    if (V.hiddenLayer({ parentNode: { classList: { contains: () => false } } }) || V.hiddenLayer({ parentNode: null })) F("舞台の外の canvas を止めてしまう");
    if (!/hiddenLayer\(st\.cv\)\) continue/.test(src("scene_v2.js"))) F("毎コマの描き直し（tick）が裏に回った層を飛ばしていない");
  }

  // ---------------------------------------------------------------- 画像を読み込み中は、canvas の絵を描かない
  const opt = { key, phase: 1, seed: loc, sky: { season: "春", weather: "晴" } };
  const full = () => { ops = 0; G.paintScene(canvas(800, 450), { ...opt, canvasOnly: true }); return ops; };
  const heavy = full();
  ops = 0;
  const cv = canvas(800, 450);
  G.paintScene(cv, opt);
  const waitOps = ops;
  const pend = (k, o) => !!(V.photoPending && V.photoPending(k, o));
  const img = imgs.find((i) => i.src === "scenes/x.svg");
  if (!img) F("背景の画像を読みに行かない");
  else {
    if (!pend(key, opt)) F("読み込み中なのに V.photoPending が真にならない");
    if (!(waitOps * 3 < heavy)) F(`読み込み中に重い canvas の絵を描いた（${waitOps} 命令。canvas の絵は ${heavy}）`);
    // 読み終わる → 画像で描き直す
    img.complete = true; img.naturalWidth = 2464; img.naturalHeight = 1408;
    drawn.length = 0;
    img.fire("load");
    if (!drawn.includes(img)) F("読み終わっても、画像で描き直さない");
    if (pend(key, opt)) F("読み終わったのに、まだ読み込み中とみなす");
    // 読めなかった → 次は canvas の絵（仮の絵を取っておいて使い回さない）
    const loc2 = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && D.LOCS[id].scene !== key);
    if (loc2) {
      const k2 = D.LOCS[loc2].scene;
      G.ASSETS["scenes/" + loc2] = "scenes/y.svg#xywh=0,0,1232,704";
      G.S.loc = loc2;
      const o2 = { key: k2, phase: 2, seed: loc2, sky: { season: "夏", weather: "晴" } };
      const cv2 = canvas(800, 450);
      G.paintScene(cv2, o2);
      const im2 = imgs.find((i) => i.src === "scenes/y.svg");
      if (im2) {
        im2.a11bad = true;
        ops = 0;
        im2.fire("error");
        if (pend(k2, o2)) F("読めなかった画像を、まだ読み込み中とみなす");
        const afterErr = ops;
        ops = 0;
        G.paintScene(canvas(800, 450), { ...o2, canvasOnly: true });
        const heavy2 = ops;
        if (!(afterErr * 2 > heavy2)) F(`画像が読めなかったのに、canvas の絵を描かない（${afterErr} 命令。canvas の絵は ${heavy2}）`);
      } else F("二つ目の背景の画像を読みに行かない");
    }
  }

  // ---------------------------------------------------------------- 白い背景を消す処理は一度だけ
  const c13 = vm.createContext({ console, document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {}, putImageData() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) }) }) }) } });
  vm.runInContext(src("a13_cutout.js"), c13, { filename: "ui/a13_cutout.js" });
  const A13 = c13.G.a13;
  let runs = 0;
  const keyOut = A13.keyOut;
  A13.keyOut = (...a) => { runs++; return keyOut(...a); };
  const pic = { naturalWidth: 16, naturalHeight: 16 };
  A13.cutout("t_perf", pic, null);
  A13.cutout("t_perf", pic, null);
  A13.cutout("t_perf", pic, null);
  if (runs !== 1) F(`同じ鍵の白抜きを ${runs} 回した（一度だけのはず）`);

  // ---------------------------------------------------------------- 閉じているステータスの窓（ui.js。DOM が要るので書き方で見る）
  const ui = src("ui.js");
  const sheet = ui.slice(ui.indexOf("function renderSheet"), ui.indexOf("ui.setSheetOpen ="));
  if (!/const keep = open \? sh\.scrollTop : 0/.test(sheet) || !/if \(open\) sh\.scrollTop = keep/.test(sheet)) F("閉じているステータスの窓の位置を読み書きしている（手番ごとに配置の計算が走る）");
  if (!/if \(open\) \{ sheetFaces = \[\]; drawFaces\(\); \}/.test(sheet)) F("閉じているステータスの窓の仲間の顔を、手番ごとに描いている");
  if (!/on && sheetFaces\.length/.test(ui)) F("ステータスの窓を開いたときに、仲間の顔を描かない");

  // ---------------------------------------------------------------- にじみのぼかしを焼き込む（v1_stage.js）
  const st = src("v1_stage.js");
  if (!/ec\.filter = /.test(st) || !/echo\.style\.filter = "none"/.test(st)) F("にじみのぼかしを CSS の filter で毎コマかけている（canvas に焼き込む）");

  if (!existsSync(new URL("../../tools/perf.mjs", import.meta.url))) F("測る道具 tools/perf.mjs が無い");
  if (!bad) ok(`T 速さ（裏の層は止める・画像の読み込み中は canvas の絵を描かない（${waitOps}/${heavy} 命令）・白抜きは一度だけ・閉じたシートは描き込まない）`);
};
