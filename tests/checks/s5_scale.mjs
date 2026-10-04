// S5：能力値の目盛り（点そのもの。作成で 5〜18 ほど、やりこめば 99 まで）と、相手・難しさとの差で決まる成功率（docs/s2_stats.md）
// - 曲線：差 0 で 50〜60％、+10 で 80％台、−10 で 20〜30％。差が大きいほど急には変わらない（5〜95％で止まる）
// - 強い相手ほど、同じ点でも成功率が下がる（敵の段が上がるほど、こちらの攻撃が当たりにくく、敵の攻撃は当たりやすい）。点が高いほど強い相手に効く
// - 序盤の手応えは今まで（成功率＝点×4＋難しさ）とほぼ同じ：12 点の普通・易しい・難しい、ゴブリンへの攻撃・逃走・ゴブリンの命中
// - 成長：点が 99 まで伸びうる（上限は無い）。高い点ほど次の 1 点に要る経験が多い。強い相手に勝つほど多く伸びる
// - 古いセーブ（成功率の尺度 0〜99）は読み込むとき ÷4 して点に（端数は経験）。二度は換算しない
export default ({ G, fail: fail0, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const near = (a, b, d) => Math.abs(a - b) <= d;

  // ---------------------------------------------------------------- 曲線
  const p = (d) => G.s5p(d);
  if (!(p(0) >= 50 && p(0) <= 60)) fail(`差 0 の成功率 ${p(0).toFixed(1)}% が 50〜60％でない`);
  if (!(p(10) >= 80 && p(10) < 90)) fail(`差 +10 の成功率 ${p(10).toFixed(1)}% が 80％台でない`);
  if (!(p(-10) >= 20 && p(-10) <= 30)) fail(`差 −10 の成功率 ${p(-10).toFixed(1)}% が 20〜30％でない`);
  for (let d = -40; d < 40; d++) if (!(p(d + 1) > p(d))) { fail(`曲線が差 ${d} で上がっていない`); break; }
  // 差が大きいほど 1 点の重みは小さい（急に変わりすぎない）
  if (!(p(1) - p(0) > p(16) - p(15) && p(-14) - p(-15) < p(1) - p(0))) fail("差が大きい所で 1 点の重みが小さくなっていない");

  // ---------------------------------------------------------------- 序盤の手応え（今までの式との差）
  G.rand = seeded(5500);
  G.P = { trophies: {}, graves: [] };
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  G.newGame({ cls: "merc", stats: st(12), caps: st(99), goal: "rich", profile: { name: "テスト", sex: "男", age: 30, history: "テスト用" } });
  const S = G.S;
  S.conds = [];
  S.armor = ""; S.ring = "";
  const old = { 易しい: 68, 普通: 48, 難しい: 28, 至難: 8 };   // 今まで：12 点 ＝ 48％＋難しさ
  for (const [d, v] of Object.entries(old)) if (!near(G.chance("知力", d), v, 5)) fail(`12 点・${d} の成功率 ${G.chance("知力", d)}% が今まで（${v}％）から 5 より離れた`);
  const vs = (n) => { S.stats.知力 = n; return G.chance("知力", "普通"); };
  for (const n of [8, 10, 14, 16]) if (!near(vs(n), n * 4, 6)) fail(`${n} 点・普通の成功率 ${vs(n)}% が今まで（${n * 4}％）から 6 より離れた`);
  S.stats.知力 = 12;
  const gob = D.ENEMIES.goblin;
  const eva = (e, n) => G.clamp(Math.round(G.s5p(n - G.foeVs.eva(e))), 5, 95);
  if (!near(eva(gob, 12), 48, 4)) fail(`12 点でゴブリンへの攻撃 ${eva(gob, 12)}% が今まで（48％）から離れた`);
  S.stats.敏捷 = 12;
  if (!near(G.foeHitChance(gob), 50 - 10, 4)) fail(`敏捷 12 へのゴブリンの命中 ${G.foeHitChance(gob)}% が今まで（40％）から離れた`);
  const flee = G.clamp(Math.round(G.s5p(12 - G.foeVs.flee(gob))), 5, 95);
  if (!near(flee, 48 + 10 - gob.agi, 4)) fail(`12 点でゴブリンから逃げる ${flee}% が今まで（${48 + 10 - gob.agi}％）から離れた`);

  // ---------------------------------------------------------------- 強い相手ほど下がる・点が高いほど効く
  {
    const tiers = [1, 2, 3, 4, 5, 6, 7, 8].map((t) => ({ tier: t, def: 10, hit: 60, mres: 10 }));
    const at30 = tiers.map((e) => eva(e, 30));
    for (let i = 1; i < at30.length; i++) if (!(at30[i] <= at30[i - 1])) fail(`段 ${i + 1} の敵の方が段 ${i} より当てやすい（${at30.join("・")}）`);
    if (!(at30[0] - at30[5] >= 40)) fail(`30 点で段 1 と段 6 の敵への攻撃の差が小さい（${at30.join("・")}）`);
    // ボスは同じ段の敵より強い
    if (!(G.foeLv({ tier: 4, boss: true }) > G.foeLv({ tier: 4 }))) fail("ボスが同じ段の敵より強くない");
    // 敵の段が上がると、あなたに当たりやすい
    S.stats.敏捷 = 30;
    const hits = tiers.map((e) => G.foeHitChance(e));
    for (let i = 1; i < hits.length; i++) if (!(hits[i] >= hits[i - 1])) fail(`段 ${i + 1} の敵の命中が段 ${i} より低い（${hits.join("・")}）`);
    // 強い相手には、点が高いほど効く（天井で意味が無くならない）
    const graw = D.ENEMIES.graw;
    const ladder = [20, 40, 60, 80, 99].map((n) => eva(graw, n));
    for (let i = 1; i < ladder.length; i++) if (!(ladder[i] > ladder[i - 1] || ladder[i] === 95)) fail(`使徒への攻撃が点を上げても伸びない（${ladder.join("・")}）`);
    if (!(ladder[0] <= 10 && ladder[2] >= 50)) fail(`使徒への攻撃：20 点 ${ladder[0]}%・60 点 ${ladder[2]}%（高い点が前提の強さになっていない）`);
    // 難しい判定も、点が高いほど効く
    const hard = [12, 30, 50].map((n) => { S.stats.知力 = n; return G.chance("知力", "至難"); });
    if (!(hard[0] < hard[1] && hard[1] < hard[2] && hard[2] >= 90)) fail(`至難の判定が点で伸びない（${hard.join("・")}）`);
    // 危険な場所の出来事は難しい（同じ「普通」でも）
    S.stats.知力 = 20;
    const town = G.chance("知力", G.s5EventDiff("普通"));
    const keep = S.loc;
    const deep = Object.keys(D.LOCS).find((id) => (D.LOCS[id].danger || 0) >= 5);
    S.loc = deep;
    const far = G.chance("知力", G.s5EventDiff("普通"));
    S.loc = keep;
    if (!(far < town - 20)) fail(`危険な場所の出来事が難しくなっていない（町 ${town}%・${D.LOCS[deep].name} ${far}%）`);
  }

  // ---------------------------------------------------------------- 成長
  {
    if (!(G.s5Need(42) >= G.s5Need(12) * 2 && G.s5Need(90) > G.s5Need(42))) fail("高い点ほど次の 1 点に要る経験が多くなっていない");
    S.stats.筋力 = 12; S.s5exp = {};
    // 訓練（経験 1〜3）を繰り返せば 99 に届く（届くまでの回数が有限で、やりこみの量）
    G.rand = seeded(5501);
    let n = 0;
    while (S.stats.筋力 < 99 && n < 5000) { G.grow("筋力", G.d(3)); n++; }
    if (S.stats.筋力 < 99) fail(`訓練を ${n} 回しても 99 に届かない（${S.stats.筋力}）`);
    if (!(n > 300)) fail(`99 まで ${n} 回で届いた（早すぎる）`);
    // 強い相手に勝つほど多く伸びる：同じ回数の成功で比べる
    const gain = (vsPt) => {
      S.stats.魔力 = 20; S.s5exp.魔力 = 0;
      G.rand = seeded(5502);
      let tries = 0, wins = 0;
      const mpBefore = S.maxMp;
      while (wins < 40 && tries < 5000) { tries++; const r = G.check("魔力", { vs: vsPt }, "テスト"); if (r.ok) wins++; }
      S.maxMp = mpBefore;
      return S.stats.魔力 + (S.s5exp.魔力 || 0) / G.s5Need(S.stats.魔力);
    };
    const weak = gain(5), strong = gain(30);
    if (!(strong > weak + 2)) fail(`強い相手に勝っても伸びが変わらない（弱い相手 ${weak.toFixed(1)}・強い相手 ${strong.toFixed(1)}）`);
    // 体の目盛り：20 点までは今まで（点×4）と同じ。その先も伸び続ける
    if (G.maxHpOf(st(12)) !== 10 + 16 || !(G.maxHpOf(st(60)) > G.maxHpOf(st(30)))) fail("HP が点に合わせて伸びない");
  }

  // ---------------------------------------------------------------- 古いセーブ
  {
    const sv = JSON.parse(JSON.stringify(S));
    delete sv.s5; delete sv.s5exp;
    sv.stats = { 筋力: 52, 体力: 47, 敏捷: 38, 知力: 25, 魔力: 11, 魅力: 99 };
    sv.startStats = { 筋力: 40, 体力: 40, 敏捷: 36, 知力: 24, 魔力: 8, 魅力: 30 };
    sv.maxHp = 10 + Math.floor(47 / 3); sv.hp = sv.maxHp;
    G.fixOldNames(sv);
    const want = { 筋力: 13, 体力: 11, 敏捷: 9, 知力: 6, 魔力: 2, 魅力: 24 };
    if (JSON.stringify(sv.stats) !== JSON.stringify(want)) fail(`古いセーブの読み替えが今の見せ方（÷4）と違う（${JSON.stringify(sv.stats)}）`);
    if (sv.startStats.筋力 !== 10 || !sv.s5) fail("古いセーブの始めの能力値が読み替わらない");
    if (sv.hp !== sv.maxHp || sv.maxHp !== G.maxHpOf(sv.stats) || !near(sv.maxHp, 10 + Math.floor(47 / 3), 1)) fail(`古いセーブの HP が変わった（${sv.hp}/${sv.maxHp}）`);
    G.fixOldNames(sv);
    if (JSON.stringify(sv.stats) !== JSON.stringify(want)) fail("古いセーブが二度換算された");
    // 墓碑：古いものは ÷4、新しいものはそのまま
    if (G.s5GraveStats({ stats: { 筋力: 52 } }).筋力 !== 13 || G.s5GraveStats({ s5: 1, stats: { 筋力: 52 } }).筋力 !== 52) fail("墓碑の能力値の読み替えが違う");
  }

  // ---------------------------------------------------------------- 画面
  if (G.s5Bar(99) !== 100 || G.s5Bar(12) !== 12) fail("能力値の棒が 99 を満点にしていない");

  if (!bad) ok(`S5 目盛り（差 0 ${p(0).toFixed(0)}%・+10 ${p(10).toFixed(0)}%・−10 ${p(-10).toFixed(0)}%。12 点：易しい ${Math.round(p(12 - D.DIFF.易しい))}%・普通 ${G.s5Plain(12)}%。使徒への攻撃 20/40/60/80/99 点：${[20, 40, 60, 80, 99].map((n) => eva(D.ENEMIES.graw, n)).join("・")}%）`);
};
