// R5：#scene の背景を場面に合わせる（道中の戦闘は道中の野の絵、酒場の中の出来事は酒場の室内）。決め方はエンジン（src/engine/zzzzzzzzzzzzzzzz_r5_scene.js の G.r5.sceneOf）。
// ui.js は書き換えず、G.paintScene をいちばん外から包む（名前の z の数で、v1_stage.js・v9_pc.js・w9_spots.js より後に読ませる）。
// ui.js の描き直しの印には場面の種類が入っていないので、G.ui.render を包み、決まった絵が変わったら描き直す。レーン A（R5）
(function (G) {
  const paint0 = G.paintScene;
  if (!paint0) return;
  // 描ける絵の名前か（canvas の絵がある名前。画像は scene_v3_photo.js がその名前で探す）
  const can = (k) => {
    if (!k) return false;
    const a = G.sceneNames ? G.sceneNames() : { out: [], inside: [] };
    const b = G.sceneNamesV2 ? G.sceneNamesV2() : { out: [], inside: [] };
    return [a.out, a.inside, b.out, b.inside].some((l) => l.includes(k));
  };
  const keyNow = () => {
    const r = G.S && G.r5 && G.r5.sceneOf ? G.r5.sceneOf(G.S) : null;
    return !r ? null : can(r.key) ? r.key : can(r.alt) ? r.alt : null;
  };
  G.r5SceneKey = keyNow;
  G.paintScene = (canvas, opt) => {
    if (canvas && canvas.id === "scene" && G.S) {
      const k = keyNow();
      if (k && (!opt || opt.key !== k)) opt = Object.assign({}, opt, { key: k, seed: `${G.S.loc}:r5:${k}` });
    }
    return paint0(canvas, opt);
  };
  const ui = G.ui;
  if (!ui || !ui.render) return;
  let last = "";
  const render0 = ui.render;
  ui.render = (...a) => {
    const r = render0(...a);
    const k = G.S ? keyNow() || "" : "";
    if (k !== last) { last = k; if (ui.repaint) ui.repaint(); }
    return r;
  };
})(globalThis.G = globalThis.G || {});
