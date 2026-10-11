// U16：作成画面で名前・年齢を選ぶ決まり（DOM に触らない。生まれは U25 で無くした）。自由入力は無いので、名前は候補から選び、「別の候補」で引き直す。
// 年齢は年齢の区分の幅の中から選ぶ。どれも「おまかせ」で今までどおり自動でも決められる（cre.randomPart）。
// 名前の頭の zu16 は、engine/u5_creation.js（G.cre）と zr1_race.js（cre.ageRange）のあとに読むため。乱数は引数 rnd（作成は G.rand を進めない）。
// レーン U（作成画面）
(function (G) {
  const D = G.data;
  const cre = G.cre;
  if (!cre) return;
  const pickR = (rnd, a) => a[Math.floor(rnd() * a.length)];
  const shuffle = (rnd, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  cre.NAME_N = 4;   // 一度に並べる名前の候補の数

  // 名前の表（性別で決まる。cre.gen の "name" と同じ表。cre.heroNames）
  cre.namePool = (dr) => cre.heroNames(dr.sex).slice();
  const poolKey = (dr) => dr.sex;

  // 今の候補。響きか性別が変わっていれば、今の名前を先頭に入れて作り直す（下書きに覚えておく。描き直しても同じ並び）
  cre.nameOptions = (dr, rnd) => {
    const pool = cre.namePool(dr);
    if (!dr.nameOpts || dr.nameKey !== poolKey(dr) || dr.nameOpts.some((n) => !pool.includes(n))) {
      const cur = pool.includes(dr.profile.name) ? [dr.profile.name] : [];
      dr.nameOpts = cur.concat(shuffle(rnd, pool.filter((n) => !cur.includes(n)))).slice(0, cre.NAME_N);
      dr.nameKey = poolKey(dr);
    }
    return dr.nameOpts;
  };
  // 別の候補：今並んでいない名前を優先して引き直す（表が小さければ、足りない分は並んでいた名前から）。選んでいる名前は変えない
  cre.drawNames = (dr, rnd) => {
    const pool = cre.namePool(dr), shown = cre.nameOptions(dr, rnd);
    const fresh = shuffle(rnd, pool.filter((n) => !shown.includes(n)));
    dr.nameOpts = fresh.concat(shuffle(rnd, shown)).slice(0, cre.NAME_N);
    dr.nameKey = poolKey(dr);
    return dr.nameOpts;
  };
  // 候補（表）にある名前だけ選べる
  cre.setName = (dr, name) => {
    if (!cre.namePool(dr).includes(name)) return false;
    dr.profile.name = name;
    return true;
  };

  // 選べる歳（今の区分の幅の中）
  cre.ageChoices = (dr, band) => {
    const [a, b] = (cre.ageRange ? cre.ageRange(dr, band) : D.AGES[band || dr.ageBand].range);
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  };
  cre.setAgeNum = (dr, n) => {
    n = Number(n);
    if (!cre.ageChoices(dr).includes(n)) return false;
    dr.profile.age = String(n);
    return true;
  };

  // 一項目だけおまかせ（今までの自動と同じ決め方。cre.randomAll）
  cre.randomPart = (dr, key, rnd) => {
    if (key === "name") {
      dr.profile.name = cre.gen(dr, "name", rnd);
      dr.nameOpts = null;
      cre.nameOptions(dr, rnd);
    } else if (key === "age") {
      cre.setAge(dr, rnd() < 0.2 ? "old" : pickR(rnd, ["young", "prime"]), rnd);
    }
    return dr;
  };
})(globalThis.G = globalThis.G || {});
