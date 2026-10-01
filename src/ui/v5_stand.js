// V5：話している人物を大きく立たせる（Ruina のように、人物が場面の絵の中に立つ）。
// 出来事の人（出来事のデータの who）と施設の人（G.facWho）がいるとき、肖像を背景の絵の上に大きく出す。
//   ・PC：絵の窓の右寄りに、画面の高さの 6〜7 割ほど。下の端は文章の窓の後ろへ沈む（下をフェード）
//   ・スマホ：絵の帯の中で、帯の高さいっぱい。文章の窓には掛からない
//   ・肖像の無地の背景は切り抜かず、縁をぼかして下をフェードさせ、背景の絵になじませる（style.css の #stand）
//   ・人が変わる・いなくなるときはフェードで出入り（動きを減らす設定では切り替えるだけ）
// 画像（G.ASSETS。v4_assets.js）がある人だけ大きく立たせ、canvas の絵の人は今の小さな額（ui.js の #who）のまま
// （canvas の絵は小さな額向けに作ってあり、大きくすると粗さが目立つため）。敵（戦闘）の絵は変えない。
// ui.js の G.ui.render を包むだけ。レーン U（画面）が管理
(function (G) {
  const stand = (G.stand = {});
  const FADE = 450; // 出入りの長さ（ミリ秒。style.css の #stand .standFig と合わせる）

  // 今話している人（ui.js の paintWho と同じ決め方）。いなければ null。戦闘中は出さない
  stand.whoOf = (S) => {
    if (!S || S.combat) return null;
    const D = G.data || {};
    const e = S.mode === "event" && S.event && G.eventWho && D.EVENTS ? D.EVENTS.find((x) => x.id === S.event) : null;
    if (e) return G.eventWho(e) || null;
    return S.mode === "fac" && G.facWho ? G.facWho(S) || null : null;
  };
  // 大きく立たせるか（持ち主の画像がある人だけ）
  stand.big = (who) => !!(who && who.kind !== "foe" && G.v4PortraitKey && G.v4PortraitKey(who));
  // 呼び名（名前が無ければ人の種類の名前）
  stand.nameOf = (who) => {
    if (!who) return "";
    const kind = G.PEOPLE && G.PEOPLE[who.kind];
    return who.name || (kind ? kind.name : "");
  };
  // 同じ人かどうか（同じなら描き直さない）
  stand.sig = (who) => (who ? JSON.stringify([who.seed || "", who.kind || "", who.name || "", G.v4PortraitKey ? G.v4PortraitKey(who) : ""]) : "");
  // 大きさ（DOM なし。テストからも呼べる）。vw・vh は画面、sceneH は絵の窓の高さ
  // 高さは画面の 66%（スマホは絵の帯いっぱい）。上は絵の窓の上の端まで、はみ出した分は文章の窓の後ろへ
  stand.fit = (vw, vh, sceneH) => {
    vw = Math.max(200, vw || 0); vh = Math.max(200, vh || 0); sceneH = Math.max(80, sceneH || 0);
    const narrow = vw <= 880;
    let h = narrow ? sceneH : Math.max(sceneH, Math.min(vh * 0.66, sceneH + 220));
    let w = h * 0.8; // 肖像は 4:5
    const maxW = narrow ? vw * 0.72 : vw * 0.42;
    if (w > maxW) { w = maxW; h = w / 0.8; }
    return { w: Math.round(w), h: Math.round(h), under: Math.max(0, Math.round(h - sceneH)), narrow };
  };
  stand.FADE = FADE;

  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.render) return;
  const $ = (s) => document.querySelector(s);
  const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let box = null; // #stand（絵の窓の中。立ち絵の層を重ねる）
  let cur = null; // { el, sig, who }
  function ensure() {
    const scene = $(".scene");
    if (!scene) return null;
    if (box && box.parentNode === scene) return box;
    box = document.createElement("div");
    box.id = "stand";
    box.setAttribute("aria-hidden", "true");
    // 場面の名前（figcaption）より後ろに置く
    scene.insertBefore(box, scene.querySelector("figcaption"));
    return box;
  }
  function size() {
    const scene = $(".scene");
    if (!scene || !box) return;
    const f = stand.fit(document.documentElement.clientWidth || window.innerWidth, window.innerHeight, scene.clientHeight);
    box.style.setProperty("--stand-w", f.w + "px");
    box.style.setProperty("--stand-h", f.h + "px");
    box.style.setProperty("--stand-under", f.under + "px");
    scene.style.setProperty("--stand-w", f.w + "px");
    return f;
  }
  function make(who) {
    const el = document.createElement("div");
    el.className = "standFig";
    const cv = document.createElement("canvas");
    cv.className = "standFace";
    cv.width = 512; cv.height = 640;
    const name = document.createElement("span");
    name.className = "standName";
    name.textContent = stand.nameOf(who);
    el.append(cv, name);
    return el;
  }
  function leave(el) {
    el.classList.remove("on");
    if (calm()) return el.remove();
    setTimeout(() => el.remove(), FADE + 50);
  }
  function update() {
    const S = G.S, scene = $(".scene");
    const play = $("#play");
    const who = S && play && !play.hidden ? stand.whoOf(S) : null;
    const big = stand.big(who);
    if (scene) scene.classList.toggle("standing", big);
    const sig = big ? stand.sig(who) : "";
    if (cur && cur.sig === sig) { if (big) size(); return; }
    if (cur) { leave(cur.el); cur = null; }
    if (!big || !ensure()) return;
    size();
    const el = make(who);
    box.append(el);
    cur = { el, sig, who };
    if (G.drawPortrait) G.drawPortrait(el.querySelector("canvas"), who);
    // 次の描画でフェードを始める（足した直後に on を付けると、フェードせずに出てしまう）
    if (calm()) el.classList.add("on");
    else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
  }
  stand.update = update;
  const base = ui.render;
  ui.render = (...a) => { const r = base(...a); update(); return r; };
  let timer = 0;
  window.addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(() => { if (cur) size(); }, 120); });
})(globalThis.G = globalThis.G || {});
