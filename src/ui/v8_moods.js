// V8：立ち絵の喜怒哀楽の差分を選んで出す。who.mood（"joy"・"anger"・"sorrow"・"fun"）があり、その人の差分の絵
// （G.ASSETS["portraits/<id>_<mood>"]。assets/portraits/<id>_joy.webp など）があればそれ、無ければ通常の絵（v4_assets.js の鍵）。
// 表情は src/engine/v8_moods.js が場面ごとに決める（G.moodOf(S)）。
// V5 の立ち絵（v5_stand.js）の中身は変えず、外から包むだけ（画面の配置は V9 が作り直すため）：
//   ・G.v4PortraitKey を包み、who.mood があれば差分の鍵を返す
//   ・G.drawPortrait を包み、立ち絵の顔（canvas.standFace。PC の配置では話している人の canvas.v9face）を描くときだけ、その場の表情を who に付ける
//   ・G.ui.render を包み、同じ人のまま表情が変わったら、顔だけを軽いフェードで入れ替える（V5 は同じ人なら描き直さないため）
// 立ち絵の印（G.stand.sig）は表情を付けない who で取られるので、表情が変わっても人は出入りしない。レーン A（絵）の V8
(function (G) {
  const key0 = G.v4PortraitKey;
  if (!key0) return;
  const MOOD_FADE = 300; // 顔の入れ替えの長さ（ミリ秒）
  G.v8MoodKey = (key, mood) => {
    if (!key || !mood || !(G.isMood ? G.isMood(mood) : true)) return key;
    const k = key + "_" + mood;
    return (G.ASSETS || {})["portraits/" + k] ? k : key;
  };
  G.v4PortraitKey = (who) => {
    const key = key0(who);
    return who && who.mood ? G.v8MoodKey(key, who.mood) : key;
  };
  // その場の表情を付けた who（表情が無ければそのまま。DOM なし。テストからも呼べる）
  G.v8WithMood = (who, S) => {
    const mood = who && !who.mood && G.moodOf ? G.moodOf(S) : null;
    return mood ? Object.assign({}, who, { mood }) : who;
  };
  G.v8 = { MOOD_FADE };

  // 表情を付ける顔：V5 の立ち絵（canvas.standFace）と、PC の配置（V9）で話している人の顔（.v9fig.speaker の canvas.v9face）
  const isStand = (cv) => !!(cv && cv.classList && (cv.classList.contains("standFace") || (cv.classList.contains("v9face") && cv.parentNode && cv.parentNode.classList && cv.parentNode.classList.contains("speaker"))));
  const draw0 = G.drawPortrait;
  if (draw0) G.drawPortrait = (cv, who, ...rest) => {
    if (!isStand(cv) || !who) return draw0(cv, who, ...rest);
    const face = G.v8WithMood(who, G.S);
    if (cv.dataset) cv.dataset.v8key = G.v4PortraitKey(face) || "";
    return draw0(cv, face, ...rest);
  };

  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui, st = G.stand;
  if (!ui || !ui.render || !st || !st.whoOf || !st.big) return;
  const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let waiting = null; // 読み込みを待っている差分の鍵
  // 今の立ち絵（#stand の最後の人。出ていく人は前に残っている）の顔を、その場の表情に合わせる
  function sync() {
    const box = document.getElementById("stand");
    const fig = box && box.lastElementChild;
    if (!fig) return;
    const faces = Array.from(fig.querySelectorAll("canvas.standFace"));
    const top = faces[faces.length - 1];
    if (!top || !top.dataset) return;
    const S = G.S;
    const who = S ? st.whoOf(S) : null;
    if (!who || !st.big(who)) return;
    const face = G.v8WithMood(who, S);
    const key = G.v4PortraitKey(face) || "";
    if (top.dataset.v8key === key) return;
    // 外のファイルの差分がまだ読めていなければ、今の顔のまま読み終わるのを待つ（読めなければ通常の絵の代わりの絵で入れ替える）
    const img = key && G.v4Image ? G.v4Image(key) : null;
    if (img && !img.v4bad && !(img.complete && (img.naturalWidth || img.width))) {
      if (waiting !== key) {
        waiting = key;
        const go = () => { if (waiting === key) { waiting = null; sync(); } };
        img.addEventListener("load", go, { once: true });
        img.addEventListener("error", go, { once: true });
      }
      return;
    }
    waiting = null;
    // 新しい顔を上に重ねてフェードで入れ、古い顔を外す
    const cv = document.createElement("canvas");
    cv.className = top.className;
    cv.width = top.width || 512; cv.height = top.height || 640;
    Object.assign(cv.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", opacity: "0", transition: `opacity ${MOOD_FADE}ms ease` });
    fig.insertBefore(cv, top.nextSibling);
    G.drawPortrait(cv, who);
    const done = () => faces.forEach((o) => o.remove());
    if (calm()) { cv.style.transition = "none"; cv.style.opacity = "1"; return done(); }
    requestAnimationFrame(() => requestAnimationFrame(() => { cv.style.opacity = "1"; }));
    setTimeout(done, MOOD_FADE + 50);
  }
  G.v8.sync = sync;
  const base = ui.render;
  ui.render = (...a) => { const r = base(...a); try { sync(); } catch (e) { /* 表情の入れ替えに失敗しても、画面は止めない */ } return r; };
})(globalThis.G = globalThis.G || {});
