// 砦の関所（w7g_gate・w7g_warn。src/data/events_w7g.js）には、状態や技で現れる型の選択肢（C10・K1・F3・M14）を足さない。
// 関所の続きは結果の中の next（ok.next）なので、型を足す側の「続きのある出来事は外す」（choices[].next）に掛からず、
// 「針金で、錠を壊さずに開ける」などのお金が出るだけの選択肢が、門を通らないまま何度でも選べていた（ボットが関所から出られなくなった）
(function (G) {
  const D = G.data;
  (D.EVENTS || []).forEach((e) => { if (e.id === "w7g_gate" || e.id === "w7g_warn") e.noC10 = true; });
})(globalThis.G = globalThis.G || {});
