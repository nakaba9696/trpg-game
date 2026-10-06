// 用語説明（W7c）：峠の庵ザレム。旅人が知れることだけ（〔噂〕まで）。書き方は lore_w7_zai.js と同じ
// 着いたときの一文（D.W7_ARRIVE）もここに書く（engine/zzzzzzzzz_w7_arrive.js が読む）
// レーン W（W7c）
(function (G) {
  const D = (G.data = G.data || {});
  if (!D.LORE || !D.LORE_ON) return;

  Object.assign(D.LORE, {
    w7c_zar: { sec: "国と人", title: "峠の庵", lines: [
      ["first", "峠の庵ザレムは断界山脈の南の峠の集落で、崩れかけた庵のまわりに、山を越えられなかった者たちが住みついている。"],
      ["altar", "峠の庵ザレムの庵の祭壇に供えた物は、翌朝には少し減っている。住人はそれを喜び、減らない朝は黙りこむという。", { hint: ["減ってた", "祭壇"] }],
      ["carving", "峠の庵ザレムの祭壇には、器を捧げ持つ人の列が彫られている。列の先は苔に埋もれて見えない。", { hint: ["器を捧げ持つ"] }],
      ["return", "峠の庵ザレムには、峠を越えに出て、気がつくと集落の門の前に戻っていた、と言う者がいる。", { hint: ["戻ってた", "九本目"] }],
      ["bell", "霧の日、峠の庵ザレムの峠の上で鈴が鳴ることがある。住人は戸を閉め、返事をしない。", { hint: ["鈴"] }],
    ] },
  });

  D.LORE_ON.loc = D.LORE_ON.loc || {};
  D.LORE_ON.loc.w7_hermitage = "w7c_zar";

  D.W7_ARRIVE = D.W7_ARRIVE || {};
  D.W7_ARRIVE.w7_hermitage = [
    "峠道の最後の曲がり角で甘い匂いがした。干した杏と古い蝋の匂いだ。",
    "集落の入口で、女が二人、立ち話をしていた。一人が指を二本立てもう一人が「よかった」と言った。あなたを見て二人とも黙った。",
  ];
})(globalThis.G = globalThis.G || {});
