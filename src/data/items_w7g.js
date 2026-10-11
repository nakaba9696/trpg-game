// 砦の通行証（W7g。使徒領への関所 data/events_w7g.js・engine/zzzzzzzzz_w7_gate.js）。items.js のあとに読まれる。レーン W
(function (G) {
  const D = (G.data = G.data || {});
  Object.assign((D.ITEMS = D.ITEMS || {}), {
    w7g_writ: { name: "砦の通行証", type: "key", price: 0, desc: "黒鉄の砦の守将の印が押された木の札。裏に小刀で日付が刻んである。日付の数は札の裏の余白より多い。",
      flavor: "黒鉄の砦の守将の印が押された木の札。裏に通った者が小刀で日付を刻んでいく。刻みの数は札の裏の余白より多い。帰ってきた日付は、どこにも刻まれていない。" },
  });
})(globalThis.G = globalThis.G || {});
