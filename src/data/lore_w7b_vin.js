// 用語説明（W7b）：葡萄の町ヴィナレ。旅人が知れることだけ（〔噂〕まで）。書き方は lore_w7_zai.js と同じ
// 着いたときの一文（D.W7_ARRIVE）もここに書く（engine/zzzzzzzzz_w7_arrive.js が読む）
// レーン W（W7b）
(function (G) {
  const D = (G.data = G.data || {});
  if (!D.LORE || !D.LORE_ON) return;

  Object.assign(D.LORE, {
    w7b_vin: { sec: "国と人", title: "葡萄の町", lines: [
      ["first", "ヴィナレは自由都市連合の町で、南向きの斜面に葡萄の棚が段になって続いている。ここの酒は三つの国に売られる。"],
      ["brand", "ヴィナレの樽屋は、同じ酒の樽に、獅子・鷲・木の葉の焼印を押し分ける。", { hint: ["焼印"] }],
      ["cellar", "ヴィナレの酒蔵の奥には、祖父の代から開けていない古い樽があるという。", { hint: ["祖父の代の樽"] }],
      ["shrine", "斜面のいちばん上の祠には、毎年最初の房が掛けられる。石には「先に飲んだ者が、」とだけ読める。", { hint: ["先に飲んだ者が"] }],
    ] },
  });

  D.LORE_ON.loc = D.LORE_ON.loc || {};
  D.LORE_ON.loc.w7_vinale = "w7b_vin";

  D.W7_ARRIVE = D.W7_ARRIVE || {};
  D.W7_ARRIVE.w7_vinale = [
    "町の入口の水桶が、うっすら紫に濁っている。誰かが、ここで足を洗ったらしい。",
    "坂の上から、樽の転がる音が下りてくる。門番は振り向きもせず、道の端へ一歩よけた。",
  ];
})(globalThis.G = globalThis.G || {});
