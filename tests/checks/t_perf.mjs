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

  // ---------------------------------------------------------------- 遅い端末では背景の動きのコマ数を下げる
  if (typeof V.paceStep !== "function") F("scene_v2.js に V.paceStep（遅い端末で背景の動きを間引く）が無い");
  else {
    const P = V.pace;
    const run = (ms, every) => { let t = (P.prev || 1000); const end = t + ms; let g = 0; while (t < end) { t += every; g = V.paceStep(t); } return g; };
    Object.assign(P, { gap: 42, ema: 16, prev: 0, n: 0, since: 0 });
    if (run(10000, 16.7) !== 42) F("速い端末で背景の動きを間引いた");
    if (run(6000, 70) !== 84) F("遅い端末（毎コマ 70ms）で背景の動きを間引かない");
    if (run(5000, 16.7) !== 84) F("間引いてすぐに戻した（20 秒はそのまま）");
    if (run(20000, 16.7) !== 42) F("速くなっても間引いたまま");
  }

  // ---------------------------------------------------------------- 音の卓は 32kHz・同じ揺れは一つの発振器で
  {
    const snd = src("sound.js"), bgm = src("sound_bgm.js");
    if (!/snd\.RATE = 32000/.test(snd) || !/makeDesk\(snd\.newContext\(\)\)/.test(snd) || !/snd\.newContext \?/.test(bgm)) F("音の卓を 32kHz で作っていない（効果音・BGM とも snd.newContext）");
    if (/vibr\(B, a, t, end, 5\.6, 18, 0\.25\); vibr\(B, b/.test(bgm) || /vibr\(B, a, t, end, 5\.2, 14, 0\.35\); vibr\(B, b/.test(bgm)) F("同じ揺れを二つの発振器で作っている（一つで済む）");
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

  // ---------------------------------------------------------------- 白抜きを少しずつ（図鑑の一覧）
  if (typeof A13.queue !== "function" || typeof A13.has !== "function") F("a13_cutout.js に G.a13.queue・has が無い");
  else {
    const timers = [];
    const cq = vm.createContext({ console, setTimeout: (f) => timers.push(f) });
    vm.runInContext(src("a13_cutout.js"), cq, { filename: "ui/a13_cutout.js" });
    const Q = cq.G.a13;
    const did = [];
    Q.queue(() => did.push(1));
    Q.queue(() => did.push(2), () => false); // 窓を閉じた・見えなくなった仕事は飛ばす
    Q.queue(() => did.push(3));
    let turns = 0;
    while (timers.length && turns < 10) { timers.shift()(); turns++; if (turns === 1 && did.join() !== "1") F(`1 回に 1 枚ずつではない（${did.join()}）`); }
    if (did.join() !== "1,3") F(`少しずつ片づける順番か、飛ばし方が違う（${did.join()}）`);
    if (Q.queued() !== 0) F("片づけ終わっても仕事が残る");
    const pic2 = { naturalWidth: 8, naturalHeight: 8 };
    if (A13.has("t_perf2")) F("まだ処理していない鍵を、処理済みとみなす");
    A13.cutout("t_perf2", pic2, null);
    if (!A13.has("t_perf2")) F("処理した鍵を覚えていない");
  }
  // ---------------------------------------------------------------- 白抜きを Worker で（画面を止めない）
  // Worker で動かすのは A13.core の文字列。外の名前を使わず、それだけで同じ結果になること
  {
    const core = vm.runInNewContext(`(${A13.core.toString()})()`, {});
    const mk = () => { const W = 40, H = 50, p = new Uint8ClampedArray(W * H * 4).fill(255); for (let y = 12; y < 44; y++) for (let x = 10; x < 30; x++) { const i = (y * W + x) * 4; p[i] = 60; p[i + 1] = 40; p[i + 2] = 30; } return { p, W, H }; };
    const a = mk(), b = mk();
    const ra = A13.keyOut(a.p, a.W, a.H, { bottom: true }), rb = core(b.p, b.W, b.H, { bottom: true });
    if (ra !== rb || a.p.some((v, i) => v !== b.p[i])) F("Worker で動かす白抜き（A13.core）が、画面の側と同じ結果にならない（外の名前を使っている？）");
  }
  {
    // Worker の無い所では、暇なとき（setTimeout）にこの場で。同じ鍵を続けて頼んでも一度だけ処理し、済んだら知らせる
    const timers = [];
    class ID { constructor(data, width, height) { this.data = data; this.width = width; this.height = height; } }
    const canvas = () => ({ width: 0, height: 0, getContext() { const c = this; return { drawImage() {}, putImageData() {}, getImageData: (x, y, w, h) => new ID(new Uint8ClampedArray(w * h * 4).fill(255), w, h) }; } });
    const cw = vm.createContext({ console, setTimeout: (f) => timers.push(f), ImageData: ID, document: { createElement: canvas } });
    vm.runInContext(src("a13_cutout.js"), cw, { filename: "ui/a13_cutout.js" });
    const W2 = cw.G.a13;
    let runs = 0;
    const k0 = W2.keyOut;
    W2.keyOut = (...a) => { runs++; return k0(...a); };
    const got = [];
    const pic = { naturalWidth: 12, naturalHeight: 12 };
    W2.prepare("w1", pic, null, undefined, (c) => got.push(c ? "cut" : "none"));
    W2.prepare("w1", pic, null, undefined, (c) => got.push(c ? "cut" : "none"));
    if (W2.worker()) F("Worker の無い所で Worker を使うことになっている");
    if (got.length) F("白抜きを頼んだその場で処理した（暇なときにするはず）");
    for (let n = 0; timers.length && n < 20; n++) timers.shift()();
    if (runs !== 1) F(`同じ鍵を続けて頼んだら ${runs} 回処理した（一度だけのはず）`);
    if (got.join() !== "cut,cut") F(`済んだ知らせが違う（${got.join()}）`);
    if (!W2.has("w1")) F("暇なときに処理した白抜きを覚えていない");
    W2.prepare("w1", pic, null, undefined, (c) => got.push("again"));
    if (got[2] !== "again" || runs !== 1) F("処理済みの鍵を頼んだら、すぐ知らせずにもう一度処理した");
  }
  const f2 = src("f2_codex.js"), v6 = src("v6_monsters.js"), v4 = src("v4_assets.js");
  if (!/G\.a13\.prepare\(key, img, rect/.test(v4)) F("立ち絵を描くとき、白抜きをその場でしている（裏で済ませてから描く）");
  if (!/spriteLater\(key, img, repaint\)/.test(v6)) F("戦闘の魔物の白抜きを、その場でしている（裏で済ませてから描く）");
  if (!/const warm = /.test(v6)) F("今いる場所の魔物の白抜きを、先に済ませていない");

  // ---------------------------------------------------------------- 記録の行は使い回す（ui.js）
  const uiSrc = src("ui.js");
  if (!/logEls\.get\(e\)/.test(uiSrc) || /log\.textContent = "";\n    const shown/.test(uiSrc)) F("記録を手番ごとに全部作り直している（増えた行だけ足す）");
  if (!/ui\.logInvalidate\(\)/.test(src("u8_glossary.js")) || !/ui\.logInvalidate\(\)/.test(src("zi2_flavor.js"))) F("用語・品名の書き足しの決まりが変わったとき、記録を作り直していない");
  if (!/G\.v6Pending = /.test(v6) || !/G\.v6Build = /.test(v6)) F("v6_monsters.js に、図鑑の一覧用の G.v6Pending・v6Build が無い");
  if (!/foeCanvas\(id, 56, !rec, true\)/.test(f2) || !/personCanvas\(id, 48, 60, false, true\)/.test(f2)) F("図鑑の一覧の絵が、まとめて白抜きをしている（見えているものから 1 枚ずつにする）");
  if (!/IntersectionObserver/.test(f2)) F("図鑑の一覧の絵が、見えていないものまで処理する");

  // ---------------------------------------------------------------- 描き直しの途中で配置を測らない
  const log = src("ui.js");
  if (!/requestAnimationFrame\(scrollLog\)/.test(log)) F("ログの位置合わせを描き直しの途中でしている（次のコマの頭で一度だけ）");
  if (/void body\.offsetWidth;\n    body\.classList\.add/.test(src("v9_pc.js"))) F("暗転・光の掛け直しで、描き直しの途中に配置の計算を走らせている");

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
  if (!bad) ok(`T 速さ（裏の層は止める・画像の読み込み中は canvas の絵を描かない（${waitOps}/${heavy} 命令）・白抜きは一度だけ・図鑑の一覧は見えている絵から 1 枚ずつ・閉じたシートは描き込まない・配置はコマの頭で測る・白抜きは裏で・記録の行は使い回す・遅い端末は背景の動きを間引く・音は 32kHz）`);
};
