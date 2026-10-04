// S2：能力値を小さな数（点）で見せる・ボーナス点を振る（docs/s2_stats.md）
// - 初期値の範囲：職業の素の値は 4〜14 点、補正を足しても 1〜18 点。ボーナス点を足しても共通の上限（24 点）を超えない。能力値ごとの上限（旧・才能限界）は無い
// - ボーナス点の分かれ方：ふつう 5〜10・当たり 15〜20（1 割ほど）・大当たり 25 以上（1〜2％）
// - 換算：1 点 ＝ 成功率 4％。冒険に渡す値は点×4。判定の成功率は今までの式のまま
// - 成長：割合で伸び、4 たまると 1 点。点が上がったときだけ「伸びた」を見せる。共通の上限（24 点）で止まり、古いセーブの caps は効かない
// - 古いセーブ：0〜99 の尺度のまま読め、点で見える。読み直しても値が変わらない（二度換算しない）
// - 作成画面：ボーナス点の数と当たりの印、点で出す
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ G, fail: fail0, ok, seeded }) => {
  const D = G.data;
  const cre = G.cre;
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const PCT = D.S2.PCT, MAX = D.S2.MAX;

  // ---------------------------------------------------------------- 初期値の範囲
  for (const [id, c] of Object.entries(D.CLASSES)) {
    for (const k of D.STATS) if (!(c.pt[k] >= 4 && c.pt[k] <= 14)) fail(`職業 ${id}: ${k} の素の値 ${c.pt[k]} が 4〜14 の外`);
  }
  for (const T of [D.AGES, D.ORIGINS, D.RACES, D.BEASTS]) for (const [id, o] of Object.entries(T)) {
    for (const [k, v] of Object.entries(o.mod || {})) if (!D.STATS.includes(k) || Math.abs(v) > 3) fail(`補正 ${id}: ${k} ${v} が点になっていない`);
  }
  const rnd = seeded(2200);
  let lo = 99, hi = 0, made = 0;
  for (let i = 0; i < 300; i++) {
    const dr = cre.fresh(rnd);
    cre.autoBonus(dr);
    for (const k of D.STATS) {
      const b = cre.base(dr, k), v = cre.value(dr, k), cap = cre.cap(dr, k);
      lo = Math.min(lo, b); hi = Math.max(hi, b);
      if (!(b >= 1 && b <= 18)) fail(`作成 ${i}: ${k} の素の値＋補正 ${b} が範囲の外`);
      if (!(v <= cap && cap === MAX)) fail(`作成 ${i}: ${k} ${v}／上限 ${cap} が合わない`);
    }
    const o = cre.options(dr, rnd);
    for (const k of D.STATS) if (o.stats[k] !== cre.value(dr, k) * PCT || o.caps[k] !== MAX * PCT) fail(`作成 ${i}: 冒険に渡す値が点×${PCT}でない`);
    made++;
  }

  // ---------------------------------------------------------------- ボーナス点の分かれ方
  const N = 20000;
  const r2 = seeded(2201);
  const tiers = { ふつう: 0, 当たり: 0, 大当たり: 0 };
  let sum = 0, top = 0;
  for (let i = 0; i < N; i++) {
    const b = cre.rollBonus(r2);
    tiers[b.tier]++;
    sum += b.n; top = Math.max(top, b.n);
    const ok1 = b.tier === "ふつう" ? b.n >= 5 && b.n <= 10 : b.tier === "当たり" ? b.n >= 15 && b.n <= 20 : b.n >= 25 && b.n <= 35;
    if (!ok1) { fail(`ボーナス点 ${b.n} が ${b.tier} の幅の外`); break; }
  }
  const rate = (k) => tiers[k] / N;
  if (!(rate("当たり") >= 0.08 && rate("当たり") <= 0.12)) fail(`当たりの割合 ${(rate("当たり") * 100).toFixed(1)}% が 1 割ほどでない`);
  if (!(rate("大当たり") >= 0.01 && rate("大当たり") <= 0.02)) fail(`大当たりの割合 ${(rate("大当たり") * 100).toFixed(2)}% が 1〜2％でない`);
  if (top <= 30) fail("大当たりの上乗せ（31 点以上）が一度も出ない");
  // 振り直しは何度でも。振るたびにボーナス点が変わる
  {
    const dr = cre.fresh(rnd);
    const seen = new Set();
    for (let i = 0; i < 300; i++) { cre.roll(dr, rnd); seen.add(dr.bonusRoll); if (cre.bonusLeft(dr) < 0) fail("振り直したあと、ボーナス点の残りが負になる"); }
    if (seen.size < 8) fail("振り直してもボーナス点が変わらない");
    if (dr.best < Math.max(...seen)) fail("これまでの最高が覚えられていない");
  }
  // ほかの仕組みが足す分（トロフィーなど。cre.extraBonus）
  {
    const dr = cre.fresh(rnd);
    const before = cre.bonusPoints(dr);
    cre.extraBonus = () => 3;
    if (cre.bonusPoints(dr) !== before + 3) fail("cre.extraBonus がボーナス点に足されない");
    delete cre.extraBonus;
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
  if (g[1] !== MAX || S.stats.筋力 !== MAX * PCT) fail(`共通の上限で止まらない（${g}・${S.stats.筋力}）`);
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
    if (r.growth && !(r.growth[1] > r.growth[0] && r.growth[1] <= MAX)) { fail(`判定の成長が点でない（${r.growth}）`); break; }
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
    if (!/bonusTier/.test(src) || !/大当たり/.test(src)) fail("作成画面に当たりの印が無い");
    if (!/cre\.bonusPoints|draft\.bonusRoll/.test(src)) fail("作成画面に振ったボーナス点が出ない");
    if (/String\(o\.stats\[k\]\)/.test(src)) fail("作成画面のシートが割合のまま出している");
    if (!/G\.pt\(o\.stats\[k\]\)/.test(src)) fail("作成画面のシートが点で出していない");
    const ui = readFileSync(fileURLToPath(new URL("../../src/ui/ui.js", import.meta.url)), "utf8");
    if (/String\(S\.stats\[k\]\)/.test(ui)) fail("ステータスの能力値が割合のまま");
  }

  if (!bad) ok(`S2 能力値（作成 ${made} 人・素の値＋補正 ${lo}〜${hi} 点・ボーナス点 平均 ${(sum / N).toFixed(1)}：ふつう ${(rate("ふつう") * 100).toFixed(1)}%・当たり ${(rate("当たり") * 100).toFixed(1)}%・大当たり ${(rate("大当たり") * 100).toFixed(2)}%・最高 ${top}）`);
};
