// W9：町の特色の場所の画像。専用の絵（in_w9s_*）がまだ無ければ、借りている絵（D.FAC_SCENE の室内か町の外の景色）の画像を出す。
// 鍵は専用の絵の名前（w9s_*。src/ui/w9_spots.js が渡す）か、施設の名前（w9_*。scene_v3_photo.js の先読み）。
// scene_v3_photo.js の G.sceneImageIds を包む（名前の v3z で、そのあとに読まれる）。レーン A（絵）。W9 が足した
(function (G) {
  const ids0 = G.sceneImageIds;
  if (!ids0) return;
  G.sceneImageIds = (key) => {
    const D = G.data || {};
    const art = D.W9_ART || {};
    const f = key && (art[key] ? key : Object.keys(art).find((k) => art[k] === key));
    if (!f) return ids0(key);
    const out = ["in_" + art[f]];
    ids0((D.FAC_SCENE || {})[f]).forEach((id) => { if (!out.includes(id)) out.push(id); });
    return out;
  };
})(globalThis.G = globalThis.G || {});
