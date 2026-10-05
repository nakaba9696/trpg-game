// 用語説明（W7b）：傭兵の町グラッツ。旅人が知れることだけ（〔噂〕まで）。書き方は lore_w7_zai.js と同じ
// 着いたときの一文（D.W7_ARRIVE）もここに書く（engine/zzzzzzzzz_w7_arrive.js が読む）
// レーン W（W7b）
(function (G) {
  const D = (G.data = G.data || {});
  if (!D.LORE || !D.LORE_ON) return;

  Object.assign(D.LORE, {
    w7b_gla: { sec: "国と人", title: "傭兵の町", lines: [
      ["first", "グラッツは自由都市連合の町で、柵で囲った練兵場のまわりに、宿と酒場と鍛冶屋だけが並んでいる。"],
      ["board", "グラッツの広場の板に貼られる雇い札には、どれも「命の保証なし」とある。赤い字の札は、日当が倍だという。", { hint: ["命の保証なし", "赤い字"] }],
      ["bet", "グラッツの酒場では、明日発つ傭兵の名前を壁に書き、誰が帰ってこないかに銅貨を賭ける。", { hint: ["誰が帰ってこないか"] }],
      ["seal", "名前の違う雇い主の札に、同じ欠け方の判が押されていることがある。", { hint: ["判の欠け方"] }],
    ] },
  });

  D.LORE_ON.loc = D.LORE_ON.loc || {};
  D.LORE_ON.loc.w7_glatz = "w7b_gla";

  D.W7_ARRIVE = D.W7_ARRIVE || {};
  D.W7_ARRIVE.w7_glatz = [
    "柵の向こうから、木剣のぶつかる乾いた音が続いている。掛け声は、ときどき笑い声に変わる。",
    "門の脇で、傭兵が二人、一足の長靴を取り合っている。どちらの足にも、少し大きいように見えた。",
  ];
})(globalThis.G = globalThis.G || {});
