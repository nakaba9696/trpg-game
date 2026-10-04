// （名前の zz_ は、u5_creation.js の G.cre より後に読ませるため）
// U10：トロフィーの数だけ、キャラクター作成のボーナス点が増える（冒険をまたいで残る記録 G.P.trophies から数える）
// 1 個につき +1、増えるのは TROPHY_BONUS_MAX（24）まで。振ったボーナス点（S2：src/data/zs2_points.js）に足す（cre.extraBonus）。
// 能力値の上限（24 点）までの余地より多いときは、余った点は使えない。
// 古い記録（trophies が無い）でも 0 として動く。レーン U（決まりは engine、画面は ui/setup.js）
(function (G) {
  const D = G.data;
  const cre = G.cre;
  if (!cre) return;
  D.TROPHY_BONUS_MAX = D.STATS.length * 5 - D.BONUS_POINTS;

  // トロフィーで増える点
  cre.trophyBonus = () => {
    const t = (G.P && G.P.trophies) || {};
    return Math.min(Object.keys(t).length, D.TROPHY_BONUS_MAX);
  };
  // 振ったボーナス点に足す（u5_creation.js の cre.bonusPoints が数える）
  cre.extraBonus = () => cre.trophyBonus();
})(globalThis.G = globalThis.G || {});
