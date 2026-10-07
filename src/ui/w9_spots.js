// W9：町の特色の場所（src/engine/w9_spots.js）の背景。施設の絵の名前は D.FAC_SCENE（室内の絵か、町の外の景色）。
// ui.js の施設の絵の表は書き換えず、#scene に描くとき、施設にいて絵の名前が決まっていなければ専用の絵（D.W9_ART）か D.FAC_SCENE を使う。レーン A（W9）
(function (G) {
  const paint0 = G.paintScene;
  if (!paint0) return;
  G.paintScene = (canvas, opt) => {
    const S = G.S;
    const D = G.data;
    // 専用の絵の名前（w9s_*。画像が無いあいだは借りる絵を描く）を V2 が知っていればそれ、無ければ借りる絵の名前
    const art = S && S.fac && D && D.W9_ART && D.W9_ART[S.fac];
    const k = S && S.mode === "fac" && S.fac && D && D.FAC_SCENE && (art && G.SV2 && G.SV2.IN && G.SV2.IN[art] ? art : D.FAC_SCENE[S.fac]);
    if (k && opt && !opt.key && !(opt.foes && opt.foes.length)) opt = { ...opt, key: k, seed: `${S.loc}:${S.fac}` };
    return paint0(canvas, opt);
  };
})(globalThis.G = globalThis.G || {});
