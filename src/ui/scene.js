// 背景の絵の入口。絵は V2（scene_v2.js と scene_v2_*.js。G.SV2.OUT・G.SV2.IN）がすべて描く。
// G.paintScene(canvas, { key, phase, seed, foes: [{ id, shape, eye, boss }], sky }) は scene_v2.js が置く
// 古い描き方（OUT・IN の約 1100 行）は消した（issue #140 の持ち主の決定）。ここに残るのは、場所から絵の名前を決める二つだけ
// 名前は描くときに V2 の表を見る（このファイルは V2 より先に読まれるため）。key を足すときは scene_v2_*.js に関数を足す。レーン A（絵）
(function (G) {
  const V = () => G.SV2 || { OUT: {}, IN: {} };
  // 迷宮の中の絵：「<場所の絵>_in」があればそれ、墓場・洞窟・使徒の城は外と同じ絵、ほかは石の通路（dungeon）
  // W8：町の特色の場所（G.data.W8S_SPOTS）の室内は scene_v2_zw8s.js が V2 の表に足す
  G.dungeonScene = (L) => (L && V().IN[L.scene + "_in"] ? L.scene + "_in" : L && ["bones", "cave", "majin"].includes(L.scene) ? L.scene : "dungeon");
  // 描ける絵の名前（tests/checks/a4_art.mjs が、汎用の絵に落ちている場所を探すのに使う）
  G.sceneNames = () => ({ out: Object.keys(V().OUT), inside: Object.keys(V().IN) });
})(globalThis.G = globalThis.G || {});
