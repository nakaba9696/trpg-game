// U25：作成画面で性別を独立した項目にしたので、性別も「おまかせ」で決め直せるようにする（DOM に触らない）。
// 名前の響きが変わるので、名前も作り直す（cre.setSex）。名前の頭の zu25 は、engine/zu16_creation.js（cre.randomPart）のあとに読むため。レーン U（作成画面）
(function (G) {
  const cre = G.cre;
  if (!cre || !cre.randomPart) return;
  const part0 = cre.randomPart;
  cre.randomPart = (dr, key, rnd) => {
    if (key !== "sex") return part0(dr, key, rnd);
    cre.setSex(dr, rnd() < 0.5 ? "男" : "女", rnd);
    dr.nameOpts = null;
    cre.nameOptions(dr, rnd);
    return dr;
  };
})(globalThis.G = globalThis.G || {});
