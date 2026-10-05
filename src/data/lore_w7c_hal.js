// 用語説明（W7c）：最後の村ハルト。旅人が知れることだけ（〔噂〕まで）。書き方は lore_w7_zai.js と同じ
// 着いたときの一文（D.W7_ARRIVE）もここに書く（engine/zzzzzzzzz_w7_arrive.js が読む）
// レーン W（W7c）
(function (G) {
  const D = (G.data = G.data || {});
  if (!D.LORE || !D.LORE_ON) return;

  Object.assign(D.LORE, {
    w7c_hal: { sec: "国と人", title: "最後の村", lines: [
      ["first", "最後の村ハルトは断界山脈の北の肩にある石の村で、地図では人の住む東の端になっている。村の者は山の石を掘って砦に売る。"],
      ["statue", "最後の村ハルトの戸口には、山に背を向けた小さな石の像がある。村の者は素手で触れず、向きが変われば火ばさみで直す。", { hint: ["火ばさみ", "戸口の像"] }],
      ["quarry", "最後の村ハルトの石切り場の男たちは、切り出した石の裏側を見ないようにしている。見てしまった者は、黙って伏せる。", { hint: ["石の裏"] }],
      ["touch", "最後の村ハルトの者は、山の向こうから流れてきた物に手を触れない。拾った子は、手のひらを雪で擦っていた。", { hint: ["白い物"] }],
    ] },
  });

  D.LORE_ON.loc = D.LORE_ON.loc || {};
  D.LORE_ON.loc.w7_lastvillage = "w7c_hal";

  D.W7_ARRIVE = D.W7_ARRIVE || {};
  D.W7_ARRIVE.w7_lastvillage = [
    "最初に聞こえたのは、楔を打つ乾いた音だった。山に跳ねて、少し遅れてもう一度届く。",
    "村の入口の石垣に腰かけていた子どもが、あなたを見て立ち上がり、山のほうを見ないように回れ右をしてから、家へ走っていった。",
  ];
})(globalThis.G = globalThis.G || {});
