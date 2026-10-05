// U16：作成画面で名前・年齢・生まれを選ぶ（engine/zu16_creation.js）を DOM なしで確かめる
// - 名前の候補は性別と生まれの響きの表から。「別の候補」で並びが変わる。表に無い名前は選べない
// - 歳は年頃の幅の中だけ。生まれは表から
// - 選んだ値がそのまま主人公（G.newGame）に入る。「おまかせ」でも幅・表の中に収まる
// - 18 歳未満の主人公は恋の出来事が起きない（決まりは変えない）
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data, cre = G.cre;
  const rnd = seeded(1616);
  let bad = 0;
  const no = (m) => { bad++; fail("U16: " + m); };

  for (let t = 0; t < 40; t++) {
    const dr = cre.fresh(rnd);
    for (const sex of ["男", "女"]) {
      cre.setSex(dr, sex, rnd);
      for (const oid of Object.keys(D.ORIGINS)) {
        cre.setOrigin(dr, oid, rnd);
        const pool = cre.namePool(dr);
        const cul = D.ORIGINS[oid].culture;
        if (pool.join() !== D.PROFILE.names[cul][sex].join()) no(`${oid}・${sex} の名前の表が違う`);
        const opts = cre.nameOptions(dr, rnd);
        if (!opts.length || opts.length > cre.NAME_N) no(`候補の数がおかしい ${opts.length}`);
        if (opts.some((n) => !pool.includes(n))) no(`表に無い候補 ${opts}`);
        if (new Set(opts).size !== opts.length) no(`候補が重なる ${opts}`);
        if (!opts.includes(dr.profile.name)) no(`今の名前 ${dr.profile.name} が候補に無い`);
        const next = cre.drawNames(dr, rnd);
        if (pool.length >= cre.NAME_N * 2 && next.some((n) => opts.includes(n))) no(`別の候補が前と重なる ${opts} → ${next}`);
        if (next.some((n) => !pool.includes(n))) no(`別の候補に表に無い名前 ${next}`);
      }
    }
    if (cre.setName(dr, "存在しない名前")) no("表に無い名前を選べた");
  }

  // 選んだ値がそのまま主人公に入る
  for (let t = 0; t < 30; t++) {
    const dr = cre.fresh(rnd);
    const sex = t % 2 ? "女" : "男";
    cre.setSex(dr, sex, rnd);
    const oid = Object.keys(D.ORIGINS)[t % Object.keys(D.ORIGINS).length];
    cre.setOrigin(dr, oid, rnd);
    const band = Object.keys(D.AGES)[t % 3];
    cre.setAge(dr, band, rnd);
    const ages = cre.ageChoices(dr);
    const [lo, hi] = D.AGES[band].range;
    if (ages[0] !== lo || ages[ages.length - 1] !== hi || ages.length !== hi - lo + 1) no(`${band} の歳の幅が違う ${ages[0]}〜${ages[ages.length - 1]}`);
    if (cre.setAgeNum(dr, hi + 1)) no(`${band} で幅の外の ${hi + 1} 歳を選べた`);
    const age = ages[t % ages.length];
    if (!cre.setAgeNum(dr, age)) no(`${age} 歳を選べない`);
    const opts = cre.drawNames(dr, rnd);
    const name = opts[opts.length - 1];
    if (!cre.setName(dr, name)) no(`候補の ${name} を選べない`);
    const o = cre.options(dr, rnd);
    const S = G.newGame(o);
    const p = S.profile;
    if (p.name !== name) no(`名前 ${name} が主人公に入らない（${p.name}）`);
    if (p.sex !== sex) no(`性別 ${sex} が入らない（${p.sex}）`);
    if (String(p.age) !== String(age)) no(`歳 ${age} が入らない（${p.age}）`);
    if (p.ageBand !== band) no(`年頃 ${band} が入らない（${p.ageBand}）`);
    if (p.origin !== oid) no(`生まれ ${oid} が入らない（${p.origin}）`);
    if (G.loveHeroMinor && G.loveHeroMinor(S) !== (age < 18)) no(`${age} 歳の恋の決まりが違う`);
  }

  // おまかせ：表と幅の中に収まる
  for (let t = 0; t < 200; t++) {
    const dr = cre.fresh(rnd);
    cre.randomPart(dr, ["name", "age", "origin"][t % 3], rnd);
    if (!D.ORIGINS[dr.origin]) no(`おまかせの生まれ ${dr.origin} が無い`);
    if (!cre.ageChoices(dr).includes(Number(dr.profile.age))) no(`おまかせの歳 ${dr.profile.age} が ${dr.ageBand} の幅の外`);
    if (!cre.namePool(dr).includes(dr.profile.name)) no(`おまかせの名前 ${dr.profile.name} が表に無い`);
  }

  if (!bad) ok("U16: 名前・年齢・生まれを選べ、選んだ値がそのまま主人公に入る");
};
