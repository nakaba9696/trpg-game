// W9：町の特色の場所の専用の絵の名前（G.data.W9_ART の w9s_*）を V2 に置く。描くのは借りる絵（D.FAC_SCENE：室内の絵か、町の外の景色）。
// 名前の zw9s で、ほかの scene_v2_*.js が V.IN・V.OUT を書き終えたあとに読まれる。画像は docs/art/scenes.json の in_w9s_*（あれば scene_v3_photo.js がそちらを出す）。
// レーン A（絵）。W9 が足した
(function (G) {
  const V = G.SV2;
  const D = G.data || {};
  if (!V || !V.IN) return;
  Object.entries(D.W9_ART || {}).forEach(([f, art]) => {
    const b = (D.FAC_SCENE || {})[f];
    if (!b || V.IN[art]) return;
    if (V.IN[b]) V.IN[art] = V.IN[b];
    else if (V.OUT[b]) { V.IN[art] = (P) => V.OUT[b](P); V.IN[art].outdoor = true; } // 町の外の景色（畑・狩り場と同じ）
  });
})(globalThis.G = globalThis.G || {});
