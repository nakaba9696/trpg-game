// （名前の zz_ は、u5_creation.js の G.cre より後に読ませるため）
// U10：トロフィーの数だけ、キャラクター作成のボーナス点が増える（冒険をまたいで残る記録 G.P.trophies から数える）
// 1 個につき +1。合計の上限は無い（持ち主の決定）。決まりの 5 点（D.BONUS_POINTS）に足す（cre.extraBonus）。
// トロフィーの分は 1 つの能力値に 10 点（D.S2.TROPHY_PER_STAT）まで。数えるのは u5_creation.js の cre.trophyOk。
// 古い記録（trophies が無い）でも 0 として動く。レーン U（決まりは engine、画面は ui/setup.js）
(function (G) {
  const D = G.data;
  const cre = G.cre;
  if (!cre) return;
  // トロフィーで増える点
  cre.trophyBonus = () => {
    const t = (G.P && G.P.trophies) || {};
    return Object.keys(t).length;
  };
  // 決まりの 5 点に足す（u5_creation.js の cre.bonusPoints が数える）
  cre.extraBonus = () => cre.trophyBonus();
})(globalThis.G = globalThis.G || {});
