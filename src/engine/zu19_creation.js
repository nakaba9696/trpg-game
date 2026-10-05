// U19：作成画面の並びを「誰か（名前・年齢・生まれ）」→「何をする者か（職業・目的）」にした。
// 生まれを先に選ぶので、あとから職業を変えても、自分で選んだ生まれ（と、その響きの名前）は動かさない。
// おまかせの下書きのまま（生まれをまだ選んでいない）なら、今までどおり職業に似合う生まれへ寄せる（cre.setClass）。
// 名前の頭の zu19 は、engine/u5_creation.js（G.cre）・zu16_creation.js のあとに読むため。DOM に触らない。レーン U（作成画面）
(function (G) {
  const cre = G.cre;
  if (!cre) return;
  const setOrigin0 = cre.setOrigin;
  cre.setOrigin = (dr, id, rnd) => { dr.originPicked = true; return setOrigin0(dr, id, rnd); };
  const setClass0 = cre.setClass;
  cre.setClass = (dr, cls, rnd) => {
    if (!dr.originPicked) return setClass0(dr, cls, rnd);
    const origin = dr.origin, name = dr.profile.name;
    setClass0(dr, cls, rnd);
    dr.origin = origin;
    dr.profile.name = name;
    cre.fit(dr);
  };
})(globalThis.G = globalThis.G || {});
