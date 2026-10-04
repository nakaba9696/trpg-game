// S2：能力値を小さな数（点）で見せる・初期値をダイスで振る（docs/s2_stats.md）
// - 初期値：能力値ごとに 3D6（15 以上なら +1D6）＋職業・種族・年齢・生まれの補正。だいたい 5〜18、能力値ごとに約 5％で 20 以上
// - ボーナス点：5 点で決まり＋トロフィー 1 つにつき +1（合計の上限なし）。トロフィーの分は 1 つの能力値に 10 点まで
// - 鍵は無い。振り直しは初期値を振り直す（何度でも）
// - 換算：1 点 ＝ 成功率 4％。冒険に渡す値は点×4。判定の成功率は今までの式のまま
// - 成長：割合で伸び、4 たまると 1 点。点が上がったときだけ「伸びた」を見せる。上限は無い（99 を超えても壊れない。古いセーブの caps は効かない）
// - 古いセーブ：0〜99 の尺度のまま読め、点で見える。読み直しても値が変わらない（二度換算しない）
// - 作成画面：ボーナス点・上振れの印、点で出す
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
  if (!(midR >= 0.85)) fail(`初期値が 5〜18 に収まる割合 ${(midR * 100).toFixed(1)}% が低い`);
  if (!(hiR >= 0.03 && hiR <= 0.07)) fail(`初期値が 20 以上の割合 ${(hiR * 100).toFixed(2)}% が約 5％でない`);

  // ---------------------------------------------------------------- 振り直し（鍵は無い）
  {
    if (cre.toggleLock || cre.rollBonus || D.LOCK_MAX !== undefined || D.TROPHY_BONUS_MAX !== undefined) fail("鍵・振るボーナス点・トロフィーの合計の上限が残っている");
    const dr = cre.fresh(rnd);
    const seen = new Set();
    for (let i = 0; i < 100; i++) { cre.roll(dr, rnd); seen.add(JSON.stringify(dr.dice)); if (cre.bonusUsed(dr) !== 0) fail("振り直したあとボーナスが残っている"); }
    if (seen.size < 90) fail("振り直しても初期値が変わらない");
    if (dr.best < cre.total(dr)) fail("これまでの最高（合計）が覚えられていない");
  }

  // ---------------------------------------------------------------- ボーナス点（5 点＋トロフィー）
  {
    const P0 = G.P;
    const dr = cre.fresh(rnd);
    G.P = { trophies: {}, graves: [] };
    if (cre.bonusPoints(dr) !== 5) fail(`トロフィー 0 個でボーナス点が 5 にならない（${cre.bonusPoints(dr)}）`);
    G.P.trophies = Object.fromEntries(Array.from({ length: 40 }, (_, i) => ["t" + i, { name: "t" }]));
    if (cre.bonusPoints(dr) !== 45) fail(`トロフィー 40 個でボーナス点が 45 にならない（上限が残っている？ ${cre.bonusPoints(dr)}）`);
    // 1 つの能力値には 5＋10＝15 点まで
    const k0 = D.STATS[0];
    while (cre.canAdd(dr, k0)) cre.addBonus(dr, k0, 1);
    if (dr.bonus[k0] !== 5 + D.S2.TROPHY_PER_STAT) fail(`1 つの能力値に ${dr.bonus[k0]} 点足せた（5＋${D.S2.TROPHY_PER_STAT} まで）`);
    // 決まりの 5 点を使い切ったあと、ほかの能力値には 10 点まで
    const k1 = D.STATS[1];
    while (cre.canAdd(dr, k1)) cre.addBonus(dr, k1, 1);
    if (dr.bonus[k1] !== D.S2.TROPHY_PER_STAT) fail(`2 つめの能力値に ${dr.bonus[k1]} 点足せた（トロフィーの分 ${D.S2.TROPHY_PER_STAT} まで）`);
    // 全部使い切れる（6 能力 × 10 ＋ 5 より少なければ）
    while (cre.bonusLeft(dr) > 0) { const k = D.STATS.find((s) => cre.canAdd(dr, s)); if (!k) { fail("ボーナス点を使い切れない"); break; } cre.addBonus(dr, k, 1); }
    // トロフィーが減ったら戻る
    G.P.trophies = {};
    cre.fit(dr);
    if (cre.bonusLeft(dr) < 0 || !cre.trophyOk(dr)) fail("トロフィーが減ったあと、ボーナスが戻らない");
    G.P = P0;
  }

  // ---------------------------------------------------------------- 換算
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  G.P = { trophies: {}, graves: [] };
  G.rand = seeded(2202);
  const q = cre.quickStats("merc", G.rand);
  G.newGame({ cls: "merc", stats: q.stats, caps: q.caps, goal: "rich", profile: { name: "テスト", sex: "男", age: 30, history: "テスト用" } });
  const S = G.S;
  if (G.pt(48) !== 12 || G.pt(51) !== 12 || G.pt(52) !== 13 || G.ptExp(51) !== 3) fail("点の換算（割合÷4 の切り捨て・端数は経験）が合わない");
  S.stats.知力 = 12 * PCT;
  if (G.chance("知力", "普通") !== 12 * PCT || G.chance("知力", "難しい") !== 12 * PCT - 20) fail("成功率が 点×4＋難しさ になっていない");
  if (G.maxHpOf(st(10 * PCT)) !== 10 + Math.floor(10 * PCT / 3)) fail("HP の式が変わった");
  if (!/%$/.test(G.statModText("筋力", 5))) fail("装備の能力値の補正が％で書かれていない");

  // ---------------------------------------------------------------- 成長
  S.stats.筋力 = 12 * PCT; S.caps.筋力 = 14 * PCT;   // 古いセーブの caps：効かない
  let g = G.grow("筋力", 1);
  if (g[0] !== 12 || g[1] !== 12 || g[2] !== 1) fail(`1 だけの成長で点が上がった（${g}）`);
  g = G.grow("筋力", 3);
  if (g[0] !== 12 || g[1] !== 13) fail(`経験が 4 たまっても点が上がらない（${g}）`);
  g = G.grow("筋力", 40);
  if (g[1] !== 23 || S.stats.筋力 !== 92) fail(`古い caps で止まった・40 伸ばして 92 にならない（${g}・${S.stats.筋力}）`);
  g = G.grow("筋力", 40);
  if (g[1] !== 33 || S.stats.筋力 !== 132) fail(`上限で止まった（上限は無いはず。${g}・${S.stats.筋力}）`);
  if (G.chance("筋力", "普通") !== 95 || G.chance("筋力", "至難") !== 92) fail("99 を超えた能力値の成功率が 95％で止まらない");
  if (G.pt(S.stats.筋力) !== 33) fail("99 を超えた能力値の点が出ない");
  const logN = S.log.length;
  S.stats.魅力 = 10 * PCT; S.caps.魅力 = 20 * PCT;
  G.apply({ grow: { 魅力: 1 } });
  const added = S.log.slice(logN);
  if (added.some((e) => e.k === "grow")) fail("点が上がらない成長で「伸びた」が出た");
  if (!added.some((e) => /少し鍛えられた/.test(e.text))) fail("点が上がらない成長に一言が無い");
  G.apply({ grow: { 魅力: 3 } });
  if (!S.log.slice(logN).some((e) => e.k === "grow" && e.text.includes("10→11"))) fail("点が上がった成長が 10→11 で出ない");
  // 判定の成長は、見せるときは点
  S.stats.敏捷 = 10 * PCT + 3; S.caps.敏捷 = 20 * PCT;
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
    D.STATS.forEach((k) => { S.stats[k] = 10 * PCT; });
    S.stats.知力 = 17 * PCT + 3;
    if (t70.test(S)) fail("トロフィー「一流」が 17 点で取れた");
    S.stats.知力 = 18 * PCT; S.caps.知力 = 20 * PCT;
    if (!t70.test(S)) fail("トロフィー「一流」が 18 点で取れない");
  }

  // ---------------------------------------------------------------- 古いセーブ（0〜99 の尺度）
  {
    const old = JSON.parse(JSON.stringify(S));
    Object.assign(old.stats, { 筋力: 52, 体力: 47, 敏捷: 38, 知力: 25, 魔力: 11, 魅力: 33 });
    Object.assign(old.caps, { 筋力: 88, 体力: 80, 敏捷: 70, 知力: 61, 魔力: 40, 魅力: 66 });
    const json = JSON.stringify(old);
    G.S = JSON.parse(json);
    const shown = G.ptStats(G.S.stats);
    if (shown.筋力 !== 13 || shown.体力 !== 11 || shown.魔力 !== 2) fail(`古いセーブの点が合わない（${JSON.stringify(shown)}）`);
    if (G.chance("筋力", "普通") !== G.clamp(G.statEff("筋力"), 5, 95) || G.statEff("筋力") < 40) fail("古いセーブの成功率が変わった");
    // 読んで、保存して、また読む：値はそのまま（換算しないので二度換算もない）
    const again = JSON.parse(JSON.stringify(G.S));
    if (JSON.stringify(again.stats) !== JSON.stringify(old.stats) || JSON.stringify(G.ptStats(again.stats)) !== JSON.stringify(shown)) fail("古いセーブを読み直すと値が変わる");
    G.S = S;
  }

  // ---------------------------------------------------------------- 作成画面（DOM なしなので、書き方を読む）
  {
    const src = readFileSync(fileURLToPath(new URL("../../src/ui/setup.js", import.meta.url)), "utf8");
    if (!/上振れ/.test(src) || !/lucky/.test(src)) fail("作成画面に上振れの印が無い");
    if (!/cre\.bonusPoints\(draft\)/.test(src)) fail("作成画面にボーナス点が出ない");
    if (!/TROPHY_PER_STAT/.test(src)) fail("作成画面に、トロフィーの分は 1 つの能力値に 10 点まで、が出ない");
    if (/才能限界|鍵をかけ|大当たり/.test(src)) fail("作成画面に、なくした仕組みの言葉が残っている");
    if (/String\(o\.stats\[k\]\)/.test(src)) fail("作成画面のシートが割合のまま出している");
    const ui = readFileSync(fileURLToPath(new URL("../../src/ui/ui.js", import.meta.url)), "utf8");
    if (/String\(S\.stats\[k\]\)/.test(ui) || /限界/.test(ui)) fail("ステータスの能力値が割合のまま／「限界」が残っている");
  }

  if (!bad) ok(`S2 能力値（作成 ${made} 人・初期値 ${lo}〜${top} 点・5〜18 に ${(midR * 100).toFixed(1)}%・20 以上 ${(hiR * 100).toFixed(2)}%（そういう能力値を持つ人 ${(chars20 / 50).toFixed(1)}%）・ボーナス点 5＋トロフィー）`);
};
