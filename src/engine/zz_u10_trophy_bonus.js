// （名前の zz_ は、u5_creation.js の G.cre より後に読ませるため）
// U10：トロフィーの数だけ、キャラクター作成のボーナス点が増える（冒険をまたいで残る記録 G.P.trophies から数える）
// 1 個につき +1、増えるのは TROPHY_BONUS_MAX まで。どの能力値も「振った値＋5」より上に才能限界があるので、
// 基本の点と合わせて 能力値の数×5 までなら、どう振っても必ず使い切れる（才能限界は超えない）。
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
  // この冒険で足せる点の合計
  cre.bonusPoints = () => D.BONUS_POINTS + cre.trophyBonus();
  cre.bonusLeft = (dr) => cre.bonusPoints() - cre.bonusUsed(dr);
})(globalThis.G = globalThis.G || {});
