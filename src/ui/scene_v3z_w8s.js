// W8：町の特色の場所の画像。その場所の絵（in_w8s_*）がまだ無ければ、借りている室内の絵（データの scene）の画像を出す。
// scene_v3_photo.js の G.sceneImageIds を包む（名前の v3z で、そのあとに読まれる）。レーン A（絵）。W8 が足した
(function (G) {
  const ids0 = G.sceneImageIds;
  if (!ids0) return;
  G.sceneImageIds = (key) => {
    const out = ids0(key);
    const s = ((G.data && G.data.W8S_SPOTS) || {})[key];
    if (s && s.scene) ids0(s.scene).forEach((id) => { if (!out.includes(id)) out.push(id); });
    return out;
  };
})(globalThis.G = globalThis.G || {});
