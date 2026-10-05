// 用語説明（W7b）：蝋燭の町リュミエ。旅人が知れることだけ（〔噂〕まで）。書き方は lore_w7_zai.js と同じ
// 着いたときの一文（D.W7_ARRIVE）もここに書く
// レーン W（W7b）
(function (G) {
  const D = (G.data = G.data || {});
  if (!D.LORE || !D.LORE_ON) return;

  Object.assign(D.LORE, {
    w7b_lum: { sec: "国と人", title: "蝋燭の町", lines: [
      ["first", "リュミエは光天教会領の町で、大聖堂で灯す蜜蝋の蝋燭は、すべてここで作られる。夜になっても、窓の蝋燭で町は暗くならない。"],
      ["count", "リュミエの浸し場では、芯を蝋に沈める回数を、神々の名前を順に唱えて数える。", { hint: ["神々の名前の順"] }],
      ["stubs", "大聖堂は、使い終えた燃えさしを溶かし直すためにリュミエへ返してくる。ただ、地下へ下ろす分の燃えさしは、返ってきたことがないという。", { hint: ["下ろす分", "燃えさし"] }],
    ] },
  });

  D.LORE_ON.loc = D.LORE_ON.loc || {};
  D.LORE_ON.loc.w7_lumie = "w7b_lum";

  D.W7_ARRIVE = D.W7_ARRIVE || {};
  D.W7_ARRIVE.w7_lumie = [
    "門の手前から、焦がした蜜の匂いがした。門番の外套の袖口が、蝋で白く固まっている。",
    "門の脇の祠には、溶けて形の崩れた蝋燭が、山のように供えてあった。どれも、まだ少し温かい。",
  ];
})(globalThis.G = globalThis.G || {});
