// W8：町の特色の場所（G.data.W8S_SPOTS）の室内は、データの scene に書いた近い室内の絵を借りる（scene.js と同じ決まり）。
// 名前の zw8s で、ほかの scene_v2_*.js が V.IN を書き終えたあとに読まれる。画像は docs/art/scenes.json の in_w8s_*（あれば scene_v3_photo.js がそちらを出す）。
// レーン A（絵）。W8 が足した
(function (G) {
  const V = G.SV2;
  if (!V || !V.IN) return;
  Object.entries((G.data && G.data.W8S_SPOTS) || {}).forEach(([k, s]) => { if (s.scene && V.IN[s.scene] && !V.IN[k]) V.IN[k] = V.IN[s.scene]; });
})(globalThis.G = globalThis.G || {});
