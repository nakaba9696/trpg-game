// （名前の zz_ は、u5_creation.js の G.cre より後に読ませるため）
// U10・S2：トロフィーで、キャラクター作成のボーナス点が増える（冒険をまたいで残る記録 G.P.trophies から数える）
// トロフィーの格ごとに点（銅 1・銀 2・金 5。D.TROPHY_POINTS）を数え、その合計 10 点（D.TROPHY_PER_BONUS）ごとにボーナス点 +1（端数は切り捨て）。
// 難しいトロフィーほど効く（持ち主の決定）。決まりの 5 点（D.BONUS_POINTS）に足す（cre.extraBonus）。合計の上限は無い。
// 古い記録（trophies が無い・格が書いていない）でも動く。格が分からないトロフィーは銅として数える。レーン U（決まりは engine、画面は ui/setup.js）
(function (G) {
  const D = G.data;
  const cre = G.cre;
  if (!cre) return;
  D.TROPHY_POINTS = { 銅: 1, 銀: 2, 金: 5 };
  D.TROPHY_PER_BONUS = 10;
  // トロフィーの点の合計（記録 P の、取ったトロフィーの格ごとの点）
  cre.trophyScore = (P) => {
    const t = ((P || G.P) && (P || G.P).trophies) || {};
    return Object.entries(t).reduce((a, [key, v]) => {
      const tier = (v && v.tier) || ((D.TROPHIES || []).find((x) => x.key === key) || {}).tier;
      return a + (D.TROPHY_POINTS[tier] || D.TROPHY_POINTS.銅);
    }, 0);
  };
  // トロフィーで増えるボーナス点
  cre.trophyBonus = (P) => Math.floor(cre.trophyScore(P) / D.TROPHY_PER_BONUS);
  // 次の +1 まであと何点か
  cre.trophyNext = (P) => D.TROPHY_PER_BONUS - (cre.trophyScore(P) % D.TROPHY_PER_BONUS);
  // 決まりの 5 点に足す（u5_creation.js の cre.bonusPoints が数える）
  cre.extraBonus = () => cre.trophyBonus();
})(globalThis.G = globalThis.G || {});
