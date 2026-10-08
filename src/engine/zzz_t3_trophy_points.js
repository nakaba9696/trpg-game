// T3：トロフィーの四つ目の格「白金」の点（作成のボーナス点に数える。zz_u10_trophy_bonus.js の D.TROPHY_POINTS に足す）。
// 銅 1・銀 2・金 5・白金 10。格の名と順は src/data/trophies_t3.js の D.TROPHY_TIERS。古い記録はそのまま数える（表の今の格で数える）。レーン T
(function (G) {
  const D = G.data;
  if (D.TROPHY_POINTS && D.TROPHY_POINTS.白金 == null) D.TROPHY_POINTS.白金 = 10;
})(globalThis.G = globalThis.G || {});
