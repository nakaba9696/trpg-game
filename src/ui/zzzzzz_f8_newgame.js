// F8：新しく始めた冒険は、仲間の手を一人ずつ選ぶ（一行の作戦「命を待て」）を初めの作戦にする（持ち主「初期値は一つずつ選ぶ」）。
// 古いセーブ・テスト（画面を通らずに G.newGame を呼ぶ）は今まで通り（作戦が無ければ「機を見て」）。作戦は戦闘の「その他」や宿でいつでも変えられる。レーン B＋U（F8）
(function (G) {
  if (typeof document === "undefined" || !G.newGame) return;
  const newGame0 = G.newGame;
  G.newGame = (...a) => {
    const r = newGame0(...a);
    if (G.S && !G.S.f3tactic) G.S.f3tactic = "wait";
    return r;
  };
})(globalThis.G = globalThis.G || {});
