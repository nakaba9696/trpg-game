// U15：作成画面の決まり（DOM に触らない）。初めての人か（トロフィーも墓碑も無い）と、「おまかせのまま旅立つ」の仕上げ。
// 名前の頭の z は、engine/u5_creation.js（G.cre）のあとに読むため
// レーン U（作成画面）
(function (G) {
  const cre = G.cre;
  if (!cre) return;
  // 初めて遊ぶ人：冒険をまたいで残るもの（トロフィー・墓碑）が何も無い
  cre.firstTime = () => {
    const P = G.P || {};
    return !Object.keys(P.trophies || {}).length && !(P.graves || []).length;
  };
  // おまかせのまま旅立つ：残りのボーナス点を職業の得意な能力値へ配る（能力値の画面を飛ばしても点を捨てない）
  cre.quickFinish = (dr) => { cre.autoBonus(dr); return dr; };
})(globalThis.G = globalThis.G || {});
