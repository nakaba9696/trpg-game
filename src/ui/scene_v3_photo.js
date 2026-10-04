// 背景の画像（A11）：持ち主が Stable Diffusion で作った背景（assets/scenes/<id>.webp。tools/gen_scenes.mjs・docs/art/scenes.md）があれば、
// canvas の背景（scene_v2.js）の静止の層の代わりにその画像を敷く。雨・雪・霧・花びらの粒と、寄り（戦闘・出来事）・周辺減光は scene_v2.js のまま重なる。
// 時間帯・季節・天候は、画像の上に色味を重ねて表す（朝の暖色・夕方の赤み・夜の暗さ・冬の白さ・雨の灰色・霧）。画像は昼・晴れで作ってある。
// 画像が無い・読めない・読み込み中は、今の canvas の背景を描く（読み終わったら描き直す）。
// どの画像を使うか（G.sceneImageId(背景の絵の名前)）：tools/scenes.mjs と同じ決まり
//   屋外の絵 → 今いる場所の id（その場所の絵なら）→ 同じ絵を使う場所の id（タイトルの町など）
//   施設の中・迷宮の中 → 「in_」＋ 絵の名前（末尾の _in は外す。inn → in_inn、ruins_in → in_ruins）
// G.ASSETS["scenes/<id>"] は、外のファイルの形なら組ごとのスプライト（scenes/<組>.svg）の「#xywh=x,y,w,h」の升目（tools/assets.mjs）、埋め込みなら data URI。
// レーン A（絵）
(function (G) {
  const V = (G.SV2 = G.SV2 || {});
  const A = () => G.ASSETS || {};
  const SPRITE = /#xywh=(\d+),(\d+),(\d+),(\d+)$/;
  const insideId = (key) => "in_" + String(key).replace(/_in$/, "");

  // ---------------------------------------------------------------- どの画像か
  G.sceneImageIds = (key) => {
    if (!key) return [];
    const LOCS = (G.data && G.data.LOCS) || {};
    const out = [];
    const loc = G.S && G.S.loc;
    if (loc && LOCS[loc] && LOCS[loc].scene === key) out.push(loc);
    for (const id of Object.keys(LOCS)) if (LOCS[id].scene === key && !out.includes(id)) out.push(id);
    out.push(insideId(key));
    return out;
  };
  G.sceneImageId = (key) => G.sceneImageIds(key).find((id) => A()["scenes/" + id]) || null;
  const where = (id) => {
    const v = String(A()["scenes/" + id] || "");
    const m = SPRITE.exec(v);
    return m ? { src: v.slice(0, m.index), rect: m.slice(1, 5).map(Number) } : { src: v, rect: null };
  };
  G.sceneWhere = (id) => (id && A()["scenes/" + id] ? where(id) : null);

  // ---------------------------------------------------------------- 読む（同じファイル＝同じスプライトは一度だけ）
  const imgs = {};
  const waiting = typeof Map === "function" ? new Map() : null; // canvas → 待っているファイル
  const ready = (img) => !!(img && !img.a11bad && img.complete && (img.naturalWidth || img.width));
  function image(src) {
    if (imgs[src]) return imgs[src];
    if (typeof Image !== "function" || !src) return null;
    const img = new Image();
    img.a11bad = false;
    img.addEventListener("error", () => { img.a11bad = true; done(src); });
    img.addEventListener("load", () => done(src));
    img.src = src;
    return (imgs[src] = img);
  }
  G.sceneImage = (id) => { const w = G.sceneWhere(id); return w ? image(w.src) : null; };
  // 読み終わった（か読めなかった）とき、その画像を待っていた背景を描き直す。舞台（v1_stage.js）の絵なら舞台ごと（下のにじみも合わせる）
  function done(src) {
    if (!waiting) return;
    let stage = false;
    const mine = [];
    for (const [cv, s] of waiting) if (s === src) mine.push(cv);
    for (const cv of mine) {
      waiting.delete(cv); // 描き直しでまた待ちに入っても、この回では回さない（読み終わっても大きさが分からない画像で回り続けないように）
      const st = cv.__sv2;
      if (!st || !st.opt || (cv.isConnected === false)) continue;
      const id = G.sceneImageId(st.lastKey);
      const w = id && where(id);
      if (!w || w.src !== src) continue; // もう別の場面
      if (cv.classList && cv.classList.contains("bgPic") && G.stage && G.stage.show && G.stage.current && G.stage.current()) stage = true;
      else if (V.paint) V.paint(cv, st.opt);
    }
    if (stage) G.stage.show(G.stage.current(), true);
  }

  // scene_v2.js が 1 枚描くたびに呼ぶ：読み終わった画像があれば { id, img, rect }、無ければ null（canvas の絵）
  V.photo = (key, opt, canvas) => {
    if (opt && opt.canvasOnly) return null;
    const id = G.sceneImageId(key);
    if (!id) return null;
    const w = where(id);
    const img = image(w.src);
    if (!img || img.a11bad) return null;
    nearby();
    if (ready(img)) { if (waiting && canvas) waiting.delete(canvas); return { id, img, rect: w.rect }; }
    if (waiting && canvas) waiting.set(canvas, w.src);
    return null;
  };

  // 画像があって、まだ読み込み中か（scene_v2.js が、重い canvas の絵を描かずに待つのに使う。T）
  V.photoPending = (key, opt) => {
    if (opt && opt.canvasOnly) return false;
    const id = G.sceneImageId(key);
    if (!id) return false;
    const img = imgs[where(id).src];
    return !!(img && !img.a11bad && !ready(img));
  };

  // 今いる場所の施設・迷宮の中・道の先の背景を、暇なときに先読みする（場所が変わったときに一度）
  let nearLoc = null;
  function nearby() {
    const S = G.S, LOCS = (G.data && G.data.LOCS) || {};
    if (!S || !S.loc || S.loc === nearLoc || typeof setTimeout !== "function") return;
    nearLoc = S.loc;
    const L = LOCS[S.loc];
    if (!L) return;
    const keys = [];
    (L.fac || []).forEach((f) => keys.push(f === "castle" ? "throne" : f));
    if (L.type === "dungeon" && G.dungeonScene) keys.push(G.dungeonScene(L));
    const ids = keys.map((k) => G.sceneImageId(k));
    Object.keys(Object.assign({}, L.links, L.sea)).forEach((to) => ids.push(A()["scenes/" + to] ? to : null));
    setTimeout(() => ids.forEach((id) => { if (id) G.sceneImage(id); }), 1500);
  }

  // ---------------------------------------------------------------- 描く
  // 画像を枠いっぱいに（はみ出す分は真ん中で切る）敷き、時間帯・季節・天候の色味を重ねる
  V.paintPhoto = (P, ph) => {
    const { ctx, w, h } = P;
    const img = ph.img;
    const [ox, oy, iw, ih] = ph.rect || [0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height];
    if (iw && ih) {
      const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
      ctx.drawImage(img, ox + (iw - sw) / 2, oy + (ih - sh) * 0.55, sw, sh, 0, 0, w, h);
    }
    const fn = V.OUT && (V.OUT[P.key] || (V.IN && V.IN[P.key]));
    G.sceneTint(ctx, w, h, { phase: P.phase, season: P.season, weather: P.weather, inside: P.inside, red: P.red, fixed: !!(fn && fn.phase != null), fogC: P.fogC, redMoon: P.redMoon });
  };

  // 色味（DOM なし。テストからも呼べる）。t：{ phase（0 朝・1 昼・2 夕・3 夜）, season（spring|summer|autumn|winter）, weather（rain|snow|fog）, inside, red, fixed（時間帯の決まった絵）, fogC, redMoon }
  // 室内はそのまま。使徒領の赤い空の絵と、時間帯の決まった絵（朧島の夜など）には時間帯の色味を重ねない
  G.sceneTint = (ctx, w, h, t) => {
    if (!ctx || t.inside) return;
    const night = t.phase === 3;
    ctx.save();
    const fill = (mode, color, a) => { if (a <= 0) return; ctx.globalCompositeOperation = mode; ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); };
    const grad = (mode, top, bot, a) => {
      if (a <= 0 || !ctx.createLinearGradient) return;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, top); g.addColorStop(1, bot);
      ctx.globalCompositeOperation = mode; ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    };
    // 時間帯
    if (!t.red && !t.fixed) {
      if (t.phase === 0) { grad("soft-light", "#ffb070", "#ffe0c0", 0.45); fill("multiply", "#f6e0d0", 0.3); }
      else if (t.phase === 2) { fill("multiply", "#f2a27a", 0.55); grad("soft-light", "#3a2460", "#ff8a4a", 0.6); }
      else if (night) { fill("multiply", "#34446e", 0.85); fill("soft-light", "#6a88c8", 0.3); if (t.redMoon) fill("multiply", "#d05040", 0.35); }
    }
    // 季節
    if (t.season === "winter") { fill("saturation", "#808080", 0.35); fill("screen", "#dfe8f4", night ? 0.06 : 0.2); }
    else if (t.season === "autumn") fill("soft-light", "#ff9a40", 0.28);
    else if (t.season === "spring") fill("soft-light", "#ffd0e0", 0.14);
    else if (t.season === "summer" && !night) fill("soft-light", "#fff0a0", 0.14);
    // 天候（降る粒・霧のゆらぎは scene_v2.js が毎コマ重ねる）
    if (t.weather === "rain") { fill("saturation", "#808080", 0.45); fill("multiply", "#7a8494", night ? 0.25 : 0.55); }
    else if (t.weather === "snow") { fill("saturation", "#808080", 0.4); fill("screen", "#e8eef6", night ? 0.08 : 0.22); }
    else if (t.weather === "fog") {
      const c = t.fogC || "#d6dce4", k = night ? 0.25 : 0.5;
      grad("source-over", hexA(c, 0.35 * k), hexA(c, 0.95 * k), 1);
      fill("saturation", "#808080", 0.3);
    }
    ctx.restore();
  };
  function hexA(c, a) {
    const n = parseInt(String(c).replace("#", ""), 16) || 0;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
  }
})(globalThis.G = globalThis.G || {});
