// W9：町の特色の場所（src/engine/w9_spots.js）の背景。施設の絵の名前は D.FAC_SCENE（室内の絵か、町の外の景色）。
// ui.js の施設の絵の表は書き換えず、#scene に描くとき、施設にいて絵の名前が決まっていなければ D.FAC_SCENE を使う。レーン A（W9）
(function (G) {
  const paint0 = G.paintScene;
  if (!paint0) return;
  G.paintScene = (canvas, opt) => {
    const S = G.S;
    const D = G.data;
    const k = S && S.mode === "fac" && S.fac && D && D.FAC_SCENE && D.FAC_SCENE[S.fac];
    if (k && opt && !opt.key && !(opt.foes && opt.foes.length)) opt = { ...opt, key: k, seed: `${S.loc}:${S.fac}` };
    return paint0(canvas, opt);
  };
})(globalThis.G = globalThis.G || {});
