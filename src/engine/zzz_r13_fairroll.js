// R13（R10 の中 16）：振りが悪くても序盤で詰まないように。数と文は src/data/r13_fairroll.js（D.R13_ROLL）。レーン C
// - 職業の下支え：職業の要の能力値（一つ目 12・二つ目 10）と体力（11）は、振りが悪くてもそれより下がらない（cre.roll を包み、ダイスの目を持ち上げる。dr.r13.floored に記す）
// - 埋め合わせ：ボーナス前の合計が、その職業のふつうより 4 点下がるごとに一段（4 段まで）。一段ごとにボーナス点 +2（cre.extraBonus に足す）・
//   所持金 +20G・薬草 1 つ（冒険を始めるとき。cre.options が r13 を渡し、G.newGame が足す）
// - G.r13.off：測定（tests/r13_rolls.mjs）で、下支えも埋め合わせも無い振りと比べるため
// 古いセーブには関わらない（作成のときだけ。S.r13roll は記録のためだけで、無くても動く）
(function (G) {
  const D = G.data, cre = G.cre;
  if (!cre || !D.R13_ROLL) return;
  const R = D.R13_ROLL;
  const r13 = (G.r13 = G.r13 || {});
  const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));

  r13.keys = (cls) => R.KEY[cls] || cre.strengths(cls);
  // その職業のふつうの合計（年齢の補正込み。ダイスの平均 10.5）
  r13.usual = (dr) => Math.round(D.STATS.reduce((a, k) => a + 10.5 + cre.classMod(dr.cls, k) + cre.mod(dr, k), 0));
  r13.of = (dr) => {
    const short = Math.max(0, r13.usual(dr) - cre.baseTotal(dr));
    const lv = Math.min(R.MAX, Math.floor(short / R.STEP));
    return { short, lv, pts: lv * R.PER.pts, gold: lv * R.PER.gold, herb: lv * R.PER.herb };
  };

  const roll0 = cre.roll;
  cre.roll = (dr, rnd) => {
    roll0(dr, rnd);
    delete dr.r13;
    if (r13.off || !dr.dice || !D.CLASSES[dr.cls]) return;
    const floored = [];
    r13.keys(dr.cls).forEach((k, i) => {
      const min = R.FLOOR[i];
      if (min == null || dr.rolled[k] >= min) return;
      dr.dice[k] = min - cre.classMod(dr.cls, k);
      dr.rolled[k] = min;
      floored.push(k);
    });
    // 体（HP の元）：要の能力値でなくても、R.BODY より下げない
    const body = "体力";
    if (R.BODY && !r13.keys(dr.cls).includes(body) && dr.rolled[body] < R.BODY) {
      dr.dice[body] = R.BODY - cre.classMod(dr.cls, body);
      dr.rolled[body] = R.BODY;
      floored.push(body);
    }
    dr.r13 = Object.assign(r13.of(dr), { floored });
    dr.best = Math.max(dr.best || 0, cre.total(dr));
  };

  const extra0 = cre.extraBonus;
  cre.extraBonus = (dr, ...a) => (extra0 ? extra0(dr, ...a) || 0 : 0) + (dr && dr.r13 && !r13.off ? dr.r13.pts || 0 : 0);

  // 冒険に渡す埋め合わせ（無ければ空）
  cre.r13Options = (dr) => (dr && dr.r13 && dr.r13.lv ? { r13: { gold: dr.r13.gold, herb: dr.r13.herb, lv: dr.r13.lv } } : {});
  const options0 = cre.options;
  cre.options = (dr, ...a) => Object.assign(options0(dr, ...a), cre.r13Options(dr));

  const newGame0 = G.newGame;
  G.newGame = (opt, ...a) => {
    const out = newGame0(opt, ...a);
    const c = opt && opt.r13;
    const S = G.S;
    if (S && c && (c.gold > 0 || c.herb > 0)) {
      S.gold = (S.gold || 0) + (c.gold || 0);
      if (c.herb > 0) G.give("herb", c.herb);
      S.r13roll = { lv: c.lv || 0, gold: c.gold || 0, herb: c.herb || 0 };
      G.note(fill(R.START, c));
    }
    return out;
  };

  // 作成画面の一言（DOM なし。画面は src/ui/zzzz_r13_cre.js）
  r13.creLines = (dr) => {
    const out = [];
    const x = dr && dr.r13;
    if (!x) return out;
    if (x.floored && x.floored.length) out.push({ k: "floor", text: fill(R.FLOORED, { list: x.floored.map((k) => `${k}は ${r13.keys(dr.cls).includes(k) ? R.FLOOR[r13.keys(dr.cls).indexOf(k)] : R.BODY}`).join("、") }) });
    if (x.lv) out.push({ k: "low", text: fill(R.LOW, { total: cre.baseTotal(dr), usual: r13.usual(dr), pts: x.pts, gold: x.gold, herb: x.herb, key: r13.keys(dr.cls)[0] }) });
    return out;
  };
})(globalThis.G = globalThis.G || {});
