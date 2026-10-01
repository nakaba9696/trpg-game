// 背景の舞台（V1）：場面の絵を画面全体の背景に敷く。
// ui.js が #scene に描くとき（G.paintScene）を横取りして、画面の後ろの舞台に描く。絵の中身は scene.js のまま。
//   ・絵は画面の幅いっぱい、高さは画面の上から6割ほど（G.stage.fit）。その下は同じ絵をぼかして伸ばした「にじみ」で埋める
//   ・場面が変わると、2枚の層を入れ替えてゆっくり切り替える（フェード）。動きを減らす設定では切り替えるだけ
//   ・タイトルと人物づくりの画面にも背景を敷く（夜の町／酒場）
// レーン U（画面）が管理
(function (G) {
  const stage = (G.stage = {});
  const FADE = 1100; // 切り替えの長さ（ミリ秒）

  // 画面の大きさから、絵の大きさを決める（DOM なし。テストからも呼べる）
  // 幅は画面いっぱい。高さは画面の 62%（狭い画面は 58%）を目安に、横長すぎ（2.6:1）・縦長すぎ（3:4）にならないよう抑える
  // full（タイトル）なら画面の高さいっぱい
  stage.fit = (vw, vh, full) => {
    vw = Math.max(200, Math.round(vw || 0));
    vh = Math.max(200, Math.round(vh || 0));
    if (full) return { w: vw, h: vh };
    const want = vh * (vw <= 880 ? 0.58 : 0.62);
    const h = Math.round(Math.min(vh, Math.max(vw / 2.6, Math.min(vw / 0.75, want))));
    return { w: vw, h };
  };
  // タイトルと人物づくりの背景（scene.js にある場面を使う）
  stage.titleOpt = (step) =>
    step && step !== "title"
      ? { key: "tavern", phase: 3, seed: "title:tavern" }
      : { key: "town", phase: 3, seed: "title:town", sky: { season: "秋", weather: "晴" }, full: true };
  // 同じ絵かどうか（大きさは含めない。大きさだけ変わったときはフェードせずに描き直す）
  stage.sig = (opt) => JSON.stringify([opt.key, opt.phase, opt.seed, opt.foes || [], opt.sky || null, !!opt.redMoon, !!opt.full, G.S ? [G.S.mode, G.S.fac, G.S.loc] : null]);

  if (typeof document === "undefined" || typeof window === "undefined") return;
  const paintRaw = G.paintScene;
  if (!paintRaw) return;
  const $ = (s) => document.querySelector(s);
  const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- 舞台（2枚の層。それぞれ絵とにじみ）
  const root = document.createElement("div");
  root.id = "backdrop";
  root.setAttribute("aria-hidden", "true");
  const layers = [0, 1].map(() => {
    const el = document.createElement("div");
    el.className = "bgLayer";
    const echo = document.createElement("canvas");
    echo.className = "bgEcho";
    echo.width = 48; echo.height = 32;
    const pic = document.createElement("canvas");
    pic.className = "bgPic";
    el.append(echo, pic);
    root.append(el);
    return { el, pic, echo, sig: "" };
  });
  const shade = document.createElement("div");
  shade.className = "bgShade";
  root.append(shade);
  document.body.prepend(root);
  document.body.classList.add("v1stage");

  let cur = 0;
  let last = null; // 最後に描いた絵の指定
  let size = { w: 0, h: 0 };
  let timer = 0;

  function measure(full) {
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight;
    // スマホはスクロールでアドレスバーが出入りして高さが少し変わる。幅が同じで差が小さいときは描き直さない
    if (size.w === vw && size.vh && size.full === !!full && Math.abs(size.vh - vh) < 140) return false;
    const f = stage.fit(vw, vh, full);
    size = { w: f.w, h: f.h, vh, full: !!full };
    if (!full) document.documentElement.style.setProperty("--pic-h", f.h + "px");
    return true;
  }
  function draw(L, opt) {
    L.el.classList.toggle("full", !!opt.full);
    L.pic.style.width = size.w + "px";
    L.pic.style.height = size.h + "px";
    paintRaw(L.pic, opt);
    // にじみ：絵を小さく写し、CSS で大きく伸ばしてぼかす（絵の下の余白を同じ色で埋める）
    const c = L.echo.getContext("2d");
    if (c && L.pic.width) c.drawImage(L.pic, 0, 0, L.echo.width, L.echo.height);
  }
  // 絵を見せる。違う絵ならフェードで切り替え、同じ絵なら（大きさが変わったときだけ）その場で描き直す
  function show(opt, force) {
    const resized = measure(opt.full);
    const sig = stage.sig(opt);
    last = opt;
    const L = layers[cur];
    if (sig === L.sig) { if (resized || force) draw(L, opt); return; }
    if (!L.sig || calm()) { L.sig = sig; draw(L, opt); L.el.classList.add("on"); return; }
    const N = layers[1 - cur];
    N.sig = sig;
    draw(N, opt);
    N.el.classList.add("on");
    L.el.classList.remove("on");
    L.sig = "";
    cur = 1 - cur;
  }
  stage.show = show;
  stage.current = () => last;

  let playOpt = null; // タイトルへ出たときの冒険の絵（つづきから戻ったときに見せ直す）
  // ui.js の #scene への描画を舞台に回す（#scene の canvas は CSS で隠す）。ほかの canvas はそのまま描く
  G.paintScene = (canvas, opt) => {
    if (canvas && canvas.id === "scene") { playOpt = null; return show(opt || {}); }
    return paintRaw(canvas, opt);
  };

  // タイトル・人物づくりと冒険を見張って、背景を合わせる
  function sync() {
    const setup = $("#setup"), play = $("#play");
    if (setup && !setup.hidden) {
      if (last && last.seed && !String(last.seed).startsWith("title:")) playOpt = last;
      show(stage.titleOpt(setup.dataset.step));
    } else if (play && !play.hidden && playOpt) {
      const o = playOpt;
      playOpt = null;
      show(o);
    }
  }
  const mo = new MutationObserver(sync);
  ["#setup", "#play"].forEach((s) => { const el = $(s); if (el) mo.observe(el, { attributes: true, attributeFilter: ["hidden", "data-step"] }); });
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (last && measure(last.full)) layers.forEach((L) => { if (L.sig) draw(L, last); }); }, 120);
  });
  document.addEventListener("DOMContentLoaded", sync);
  setTimeout(sync, 0);
  stage.FADE = FADE;
})(globalThis.G = globalThis.G || {});
