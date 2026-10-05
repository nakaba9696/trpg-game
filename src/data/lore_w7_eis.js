// 用語説明（W7）：北の港アイゼルヴァン（w7_eisenvan）で知ったことだけ、一行ずつ書き足される。書き方は src/data/lore_u3.js の頭の説明と同じ
// どれも〔噂〕の深さまで。東の沖のこと・帰らない船の行き先は書かない（docs/lore/voice.md）
// 着いたときの一文（D.W7_ARRIVE）は engine/zzzzzzzzz_w7_arrive.js が見出しのあとに一つ出す
// レーン W（場所）と V（出来事）が管理
(function (G) {
  const D = (G.data = G.data || {});
  if (!D.LORE || !D.LORE_ON) return;

  Object.assign(D.LORE, {
    w7_eis: { sec: "国と人", title: "北の港", lines: [
      ["first", "北の港アイゼルヴァンは帝国の北西の外海の港。舫い綱は朝ごとに叩いて氷を落とす。"],
      ["hald", "港の酒場の窓ぎわには、漁に出られない日の漁師たちが座っている。", { hint: ["ハルド"] }],
      ["scale", "港の年寄りは、魚の鱗を陽にかざして明日の天気を読む。答えは、だいたい「三日待ち」だ。", { hint: ["鱗"] }],
      ["window", "坂の上に、窓の灯を朝まで落とさない家がある。", { hint: ["窓の灯"] }],
      ["east", "灯を継ぐ女は「東へ出た船」と言いかけて、やめた。", { hint: ["東へ出た船"] }],
    ] },
  });

  D.LORE_ON.loc = D.LORE_ON.loc || {};
  D.LORE_ON.loc.w7_eisenvan = "w7_eis";

  D.W7_ARRIVE = D.W7_ARRIVE || {};
  D.W7_ARRIVE.w7_eisenvan = [
    "どこかで木槌が杭を叩いている。乾いた音のあとに、氷が水に落ちる小さな音が続く。",
    "風が、潮と魚の油の匂いを顔に叩きつけてくる。外套の襟を立てても、匂いは入ってくる。",
    "港の口で、灰色の波が白く砕けている。桟橋の舟は、一艘も出ていない。",
  ];
})(globalThis.G = globalThis.G || {});
