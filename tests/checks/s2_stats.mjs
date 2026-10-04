// S2：能力値を小さな数（点）で見せる・初期値をダイスで振る（docs/s2_stats.md）
// - 初期値：能力値ごとに 3D6（8％で +1D6）＋職業・種族・年齢・生まれの補正。だいたい 5〜18、1 人のうちどれか 1 つが 20 以上になるのが約 5％
// - ボーナス点：5 点で決まり＋トロフィーの格の点（銅 1・銀 2・金 5）10 点ごとに +1（合計の上限なし）。どの能力値にも好きなだけ
// - 鍵は無い。振り直しは初期値を振り直す（何度でも）
// - 換算（S5）：冒険に渡す値もセーブも点そのもの（D.S2.PCT = 1）。成功率は相手・難しさの点との差（tests/checks/s5_scale.mjs）
// - 成長：経験がたまって 1 点（12 点なら経験 4 で 1 点）。点が上がったときだけ「伸びた」を見せる。上限は無い（99 を超えても壊れない。古いセーブの caps は効かない）
// - 古いセーブ：0〜99 の尺度のセーブは、読み込むときに ÷4 して点にする（G.s5Upgrade）。二度換算しない
// - 才（M8）は無い：判定は能力値だけ。古いセーブの S.m8・仲間の c.m8 は効かない
// - 作成画面：ボーナス点・上振れの印、点で出す。能力値の合計（ボーナス込みも）。目的は行き先を出さない。種族は選べない（主人公は人間だけ）。マイナスの補正は太字・濃い色
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ G, fail: fail0, ok, seeded }) => {
  const D = G.data;
  const cre = G.cre;
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const PCT = D.S2.PCT;

  // ---------------------------------------------------------------- 初期値
  for (const [id, c] of Object.entries(D.CLASSES)) for (const k of D.STATS) if (!(Math.abs(c.mod2[k] || 0) <= 3)) fail(`職業 ${id}: ${k} の補正 ${c.mod2[k]} が大きすぎる`);
  for (const T of [D.AGES, D.ORIGINS, D.RACES, D.BEASTS]) for (const [id, o] of Object.entries(T)) {
    for (const [k, v] of Object.entries(o.mod || {})) if (!D.STATS.includes(k) || Math.abs(v) > 3) fail(`補正 ${id}: ${k} ${v} が点になっていない`);
  }
  const rnd = seeded(2200);
  let n = 0, mid = 0, hi20 = 0, chars20 = 0, lo = 99, top = 0, made = 0;
  for (let i = 0; i < 5000; i++) {
    const dr = cre.fresh(rnd);
    let any = false;
    for (const k of D.STATS) {
      const b = cre.base(dr, k);
      n++; if (b >= 5 && b <= 18) mid++; if (b >= 20) { hi20++; any = true; }
      lo = Math.min(lo, b); top = Math.max(top, b);
      if (b < D.S2.MIN) fail(`作成 ${i}: ${k} の初期値 ${b} が下限より低い`);
      if (dr.dice[k] < 3 || dr.dice[k] > 24) fail(`作成 ${i}: ${k} のダイス ${dr.dice[k]} が 3D6（＋1D6）の外`);
    }
    if (any) chars20++;
    if (i < 300) {
      cre.autoBonus(dr);
      const o = cre.options(dr, rnd);
      for (const k of D.STATS) if (o.stats[k] !== cre.value(dr, k) * PCT) fail(`作成 ${i}: 冒険に渡す値が点×${PCT}でない`);
      made++;
    }
  }
  const midR = mid / n, hiR = hi20 / n;
  if (!(midR >= 0.9)) fail(`初期値が 5〜18 に収まる割合 ${(midR * 100).toFixed(1)}% が低い`);
  const perChar = chars20 / 5000;
  if (!(perChar >= 0.035 && perChar <= 0.065)) fail(`1 人のうちどれか 1 つが 20 以上になる割合 ${(perChar * 100).toFixed(1)}% が約 5％でない`);
  if (!(hiR >= 0.004 && hiR <= 0.015)) fail(`能力値ごとに 20 以上の割合 ${(hiR * 100).toFixed(2)}% が 1％弱でない`);

  // ---------------------------------------------------------------- 振り直し（鍵は無い）
  {
    if (cre.toggleLock || cre.rollBonus || D.LOCK_MAX !== undefined || D.TROPHY_BONUS_MAX !== undefined) fail("鍵・振るボーナス点・トロフィーの合計の上限が残っている");
    const dr = cre.fresh(rnd);
    const seen = new Set();
    for (let i = 0; i < 100; i++) { cre.roll(dr, rnd); seen.add(JSON.stringify(dr.dice)); if (cre.bonusUsed(dr) !== 0) fail("振り直したあとボーナスが残っている"); }
    if (seen.size < 90) fail("振り直しても初期値が変わらない");
    if (dr.best < cre.total(dr)) fail("これまでの最高（合計）が覚えられていない");
  }

  // ---------------------------------------------------------------- ボーナス点（5 点＋トロフィーの格の点 10 点ごとに 1）
  {
    const P0 = G.P;
    const dr = cre.fresh(rnd);
    const tr = (list) => Object.fromEntries(list.map((tier, i) => ["t" + i, { name: "t", tier }]));
    G.P = { trophies: {}, graves: [] };
    if (cre.bonusPoints(dr) !== 5) fail(`トロフィー 0 個でボーナス点が 5 にならない（${cre.bonusPoints(dr)}）`);
    G.P.trophies = tr(Array(9).fill("銅"));
    if (cre.bonusPoints(dr) !== 5 || cre.trophyNext() !== 1) fail(`銅 9 個（9 点）で +1 になった・次まで 1 点でない（${cre.bonusPoints(dr)}）`);
    G.P.trophies = tr(Array(10).fill("銅"));
    if (cre.bonusPoints(dr) !== 6) fail(`銅だけ 10 個で +1 にならない（${cre.bonusPoints(dr)}）`);
    G.P.trophies = tr(Array(2).fill("金"));
    if (cre.trophyScore() !== 10 || cre.bonusPoints(dr) !== 6) fail(`金 2 個（10 点）で +1 にならない（${cre.trophyScore()}・${cre.bonusPoints(dr)}）`);
    G.P.trophies = tr(Array(5).fill("銀"));
    if (cre.bonusPoints(dr) !== 6) fail(`銀 5 個（10 点）で +1 にならない`);
    // 1 つの能力値にいくらでも足せる（トロフィーの分の 1 能力 10 点までの決まりは外した）
    if (cre.trophyOk || (D.S2 && D.S2.TROPHY_PER_STAT)) fail("トロフィーの分の 1 能力 10 点までの決まりが残っている");
    G.P.trophies = tr(Array(200).fill("銅"));   // 20 点 → +20（合計 25 点）
    const k0 = D.STATS[0];
    while (cre.canAdd(dr, k0)) cre.addBonus(dr, k0, 1);
    if (dr.bonus[k0] !== 25) fail(`1 つの能力値に全部（25 点）足せない（${dr.bonus[k0]}）`);
    // トロフィーが減ったら戻る
    G.P.trophies = {};
    cre.fit(dr);
    if (cre.bonusLeft(dr) < 0) fail("トロフィーが減ったあと、ボーナスが戻らない");
    G.P = P0;
  }

  // ---------------------------------------------------------------- 換算
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  G.P = { trophies: {}, graves: [] };
  G.rand = seeded(2202);
  const q = cre.quickStats("merc", G.rand);
  G.newGame({ cls: "merc", stats: q.stats, caps: q.caps, goal: "rich", profile: { name: "テスト", sex: "男", age: 30, history: "テスト用" } });
  const S = G.S;
  if (PCT !== 1 || G.pt(12) !== 12 || G.pt(52) !== 52) fail("セーブの値が点そのものでない（S5）");
  S.stats.知力 = 12;
  if (G.chance("知力", "普通") !== 50 || G.chance("知力", "難しい") !== 28) fail(`12 点の成功率が 普通 50％・難しい 28％でない（${G.chance("知力", "普通")}・${G.chance("知力", "難しい")}）`);
  if (G.maxHpOf(st(10)) !== 10 + Math.floor(40 / 3)) fail("HP の式が変わった（20 点までは今までと同じ）");
  if (/%$/.test(G.statModText("筋力", 6)) || G.statModText("筋力", 6) !== "筋力+2") fail(`装備の能力値の補正が点で書かれていない（${G.statModText("筋力", 6)}）`);

  // ---------------------------------------------------------------- 成長
  S.stats.筋力 = 12; S.caps.筋力 = 14; S.s5exp = {};   // 古いセーブの caps：効かない
  let g = G.grow("筋力", 1);
  if (g[0] !== 12 || g[1] !== 12 || g[2] !== 1) fail(`1 だけの成長で点が上がった（${g}）`);
  g = G.grow("筋力", 3);
  if (g[0] !== 12 || g[1] !== 13) fail(`経験が 4 たまっても点が上がらない（${g}）`);
  g = G.grow("筋力", 40);
  if (!(g[1] > 14 && g[1] < 23)) fail(`古い caps で止まった・高い点ほど伸びにくくなっていない（40 伸ばして ${g}）`);
  g = G.grow("筋力", 5000);
  if (!(S.stats.筋力 > 99)) fail(`上限で止まった（上限は無いはず。${g}・${S.stats.筋力}）`);
  if (G.chance("筋力", "普通") !== 95 || G.chance("筋力", "至難") !== 95) fail("99 を超えた能力値の成功率が 95％で止まらない");
  if (G.pt(S.stats.筋力) !== S.stats.筋力) fail("99 を超えた能力値の点が出ない");
  const logN = S.log.length;
  S.stats.魅力 = 10; S.caps.魅力 = 20;
  G.apply({ grow: { 魅力: 1 } });
  const added = S.log.slice(logN);
  if (added.some((e) => e.k === "grow")) fail("点が上がらない成長で「伸びた」が出た");
  if (!added.some((e) => /少し鍛えられた/.test(e.text))) fail("点が上がらない成長に一言が無い");
  G.apply({ grow: { 魅力: 3 } });
  if (!S.log.slice(logN).some((e) => e.k === "grow" && e.text.includes("10→11"))) fail("点が上がった成長が 10→11 で出ない");
  // 判定の成長は、見せるときは点
  S.stats.敏捷 = 10; S.s5exp.敏捷 = 75; S.caps.敏捷 = 20;
  G.rand = seeded(2203);
  for (let i = 0; i < 200; i++) {
    const r = G.check("敏捷", "易しい", "テスト");
    if (r.growth && !(r.growth[1] > r.growth[0])) { fail(`判定の成長が点でない（${r.growth}）`); break; }
  }
  // 訓練場の表示は点
  const fac = S.mode; S.mode = "fac"; S.fac = "train";
  const tr = G.facActions ? G.facActions().flatMap((x) => x.list).find((a) => a.id === "train:魅力") : null;
  if (tr && !tr.sub.includes(`今 ${G.pt(S.stats.魅力)}`)) fail(`訓練場の「今」が点でない（${tr.sub}）`);
  S.mode = fac; S.fac = null;
  // トロフィー（点で書く）
  const t70 = D.TROPHIES.find((t) => t.key === "stat70");
  if (t70) {
    D.STATS.forEach((k) => { S.stats[k] = 10; });
    S.stats.知力 = 39;
    if (t70.test(S)) fail("トロフィー「一流」が 39 点で取れた");
    S.stats.知力 = 40; S.caps.知力 = 20;
    if (!t70.test(S)) fail("トロフィー「一流」が 40 点で取れない");
  }

  // ---------------------------------------------------------------- 古いセーブ（0〜99 の尺度）
  {
    const old = JSON.parse(JSON.stringify(S));
    delete old.s5; delete old.s5exp;
    Object.assign(old.stats, { 筋力: 52, 体力: 47, 敏捷: 38, 知力: 25, 魔力: 11, 魅力: 33 });
    Object.assign(old.caps, { 筋力: 88, 体力: 80, 敏捷: 70, 知力: 61, 魔力: 40, 魅力: 66 });
    const json = JSON.stringify(old);
    G.S = JSON.parse(json); G.fixOldNames(G.S);   // 読み込みの入口（q7_slots.js・main.js）と同じ
    const shown = G.ptStats(G.S.stats);
    if (shown.筋力 !== 13 || shown.体力 !== 11 || shown.魔力 !== 2) fail(`古いセーブの点が合わない（${JSON.stringify(shown)}）`);
    if (G.s5Progress("体力") !== 75) fail(`古いセーブの端数が経験にならない（${G.s5Progress("体力")}）`);
    // 読んで、保存して、また読む：値はそのまま（二度換算しない）
    const again = JSON.parse(JSON.stringify(G.S));
    G.fixOldNames(again);
    if (JSON.stringify(G.ptStats(again.stats)) !== JSON.stringify(shown)) fail("古いセーブを読み直すと値が変わる");
    G.S = S;
  }

  // ---------------------------------------------------------------- 才（M8）は無い：判定は能力値（と難しさ・装備など）だけで決まる。古いセーブの才は効かない
  {
    const left = ["m8Of", "m8Lv", "m8Mod", "m8Roll", "m8CapBonus", "m8Comp", "m8CompLabel", "m8Appraise", "m8ui", "m8FlavorsOf"].filter((k) => G[k] !== undefined);
    if (left.length || D.TALENTS || D.TALENT_KEYS || D.FLAVORS || cre.talents) fail(`才の仕組みが残っている（${left.join("・")}）`);
    if (Object.values(D.RACES).concat(Object.values(D.BEASTS)).some((r) => r.talents)) fail("種族の表に才が残っている");
    const old = JSON.parse(JSON.stringify(S));
    old.m8 = { t: { sword: 3, magic: 3, lore: 3, stealth: 3, talk: 3, pray: 3, spear: 3, bow: 3, wild: 3 }, f: { cook: 3 }, src: "roll" };
    old.companions = [{ name: "古い仲間", cls: "傭兵", power: 50, dmg: 1, m8: { t: { sword: 3 }, known: true } }];
    G.S = old;
    G.S.stats.知力 = 10; G.S.conds = [];
    if (G.chance("知力", "普通") !== G.s5Plain(10)) fail(`古いセーブの才が成功率に効いている（${G.chance("知力", "普通")}）`);
    G.rand = seeded(2204);
    try { for (let i = 0; i < 30 && !G.S.over; i++) { const a = G.actions().flatMap((x) => x.list).filter((x) => !x.disabled); if (!a.length) break; G.act(a[i % a.length].id); } }
    catch (e) { fail("古いセーブ（才あり）で遊ぶと例外 " + (e.stack || e)); }
    G.S = S;
  }

  // ---------------------------------------------------------------- 作成画面（DOM なしなので、書き方を読む）
  {
    const src = readFileSync(fileURLToPath(new URL("../../src/ui/setup.js", import.meta.url)), "utf8");
    if (!/上振れ/.test(src) || !/lucky/.test(src)) fail("作成画面に上振れの印が無い");
    if (!/cre\.bonusPoints\(draft\)/.test(src)) fail("作成画面にボーナス点が出ない");
    if (!/trophyScore/.test(src) || !/次の \+1 まであと/.test(src)) fail("作成画面に、トロフィーの点と次の +1 までが出ない");
    if (/才能限界|鍵をかけ|大当たり|m8ui|才の付きやすい/.test(src)) fail("作成画面に、なくした仕組みの言葉が残っている");
    if (/String\(o\.stats\[k\]\)/.test(src)) fail("作成画面のシートが割合のまま出している");
    // 目的は行き先・手順を出さない（名前と目指すことだけ。「自分で決める」の遊び方の説明は残す）
    const WHERE = /竜の墓場|鬼ヶ島|最奥|エンバルダ|絶界|10000|騎士、領主|ヴォルグリム|白夜/;
    for (const [id, g] of Object.entries(D.GOALS)) {
      if (id !== "custom" && g.hint) fail(`目的 ${id} に行き先の説明（hint）が残っている`);
      if (WHERE.test(g.text || "") || WHERE.test(g.name || "")) fail(`目的 ${id} の文に行き先・手順がある（${g.text}）`);
    }
    if (!/g\.hint \|\| g\.text/.test(src)) fail("作成画面の目的の説明が、名前と目指すことだけになっていない");
    // 能力値の合計：初期値（補正込み）の合計と、ボーナス込みの合計が出て、能力値の和と合う
    if (!/statSum/.test(src) || !/cre\.baseTotal\(draft\)/.test(src)) fail("作成画面に能力値の合計が出ない");
    {
      const dr = cre.fresh(rnd);
      cre.autoBonus(dr);
      const base = D.STATS.reduce((a, k) => a + cre.base(dr, k), 0), all = D.STATS.reduce((a, k) => a + cre.value(dr, k), 0);
      if (cre.baseTotal(dr) !== base || cre.total(dr) !== all || all !== base + cre.bonusUsed(dr)) fail(`能力値の合計が和と合わない（${cre.baseTotal(dr)}/${base}・${cre.total(dr)}/${all}）`);
    }
    // 人物の札（あなたは何者か）には、職業の説明・得意・出発地を出さない。最後のシートに出す
    {
      const f = src.slice(src.indexOf("function refresh()"), src.indexOf("lay.append(card)"));
      if (/c\.blurb|得意：|出発地/.test(f)) fail("作成画面の人物の札に、職業の説明・得意・出発地が残っている");
      const sh = src.slice(src.indexOf("function sheet("));
      if (!/\["職業", c\.blurb\]/.test(sh) || !/\["得意", cre\.strengths/.test(sh) || !/\["出発地"/.test(sh)) fail("最後のシートに、職業の説明・得意・出発地が出ない");
    }
    // 外見・生い立ちは中身に合わせて伸びる textarea（長い文でも切れない。持ち主の要望）
  {
    const fe = src.slice(src.indexOf("function fieldEl("), src.indexOf("function fieldEl(") + 1500);
    if (!/h\("textarea", "fit"\)/.test(fe) || !/fitArea\(inp\)/.test(fe) || !/function fitArea\(/.test(src)) fail("作成画面の外見・生い立ちの欄が、文の長さに合わせて伸びない");
  }
  // 主人公は人間だけ：作成画面で種族を選べない
    if (/raceSec|cre\.setRace|cre\.randomRace|radios\("race"/.test(src)) fail("作成画面に種族を選ぶ所が残っている");
    const o = cre.options(cre.fresh(rnd), rnd);
    if (o.profile.race !== "human") fail("作成した主人公が人間でない");
    // マイナスの補正はプラスと同じくらい読める（太字・専用の濃い色）
    const css = readFileSync(fileURLToPath(new URL("../../src/ui/s2_stats.css", import.meta.url)), "utf8");
    if (!/\.det \.minus \{ color: var\(--minus\)/.test(css) || !/\.plus, \.creStats \.det \.minus \{ font-weight: 700/.test(css)) fail("マイナスの補正の色・太さが決まっていない");
    const ui = readFileSync(fileURLToPath(new URL("../../src/ui/ui.js", import.meta.url)), "utf8");
    if (/String\(S\.stats\[k\]\)/.test(ui) || /限界/.test(ui)) fail("ステータスの能力値が割合のまま／「限界」が残っている");
  }

  if (!bad) ok(`S2 能力値（作成 ${made} 人・初期値 ${lo}〜${top} 点・5〜18 に ${(midR * 100).toFixed(1)}%・20 以上 ${(hiR * 100).toFixed(2)}%（そういう能力値を持つ人 ${(chars20 / 50).toFixed(1)}%）・ボーナス点 5＋トロフィー）`);
};
