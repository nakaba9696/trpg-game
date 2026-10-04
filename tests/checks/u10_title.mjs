// U10：手引きと画面の手直し（持ち主の声）
// - 消した文（仲間の居場所の決まり・「歩いて確かめるしかない」・暦と鐘の説明）が、どこにも残っていない
// - トロフィーの数だけキャラクター作成のボーナス点が増える（上限つき。古い記録・トロフィー無しでも動く）
// - タイトルのメニューは「はじめる」（と、保存があるときの「つづきから」）だけ
// - 主人公の性格・口癖・好きなもの・苦手なものは作らない・見せない。生い立ちはおまかせで埋めない（空けておける）
// - 恋の相性は主人公の性格に頼らない（魅力で決まる）
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../src/", import.meta.url));
const files = (d) => readdirSync(path.join(root, d)).filter((f) => f.endsWith(".js")).map((f) => path.join(d, f));

export default ({ G, fail, seeded }) => {
  const D = G.data;
  const cre = G.cre;
  // 消した文
  const src = ["data", "engine", "ui"].flatMap(files).map((f) => [f, readFileSync(path.join(root, f), "utf8")]);
  const GONE = [
    /仲間になりうる人は/, /時期ごとに居る場所がだいたい決まっている/, /その時期にそこへ行けば/, /居る場所と時期が分かることがある/,
    /歩いて確かめるしかない/, /暦は古い年の数え方/, /朝・昼・夕べ・消灯に区切る/,
  ];
  for (const [f, t] of src) for (const re of GONE) if (re.test(t)) fail(`${f}: 消した文が残っている（${re.source}）`);
  if (/確かめるしかない/.test(D.WORLD.intro)) fail("手引きの書き出しが前のまま");

  // トロフィーとボーナス点
  const P0 = G.P;
  try {
    // ボーナス点は、振った点（S2）＋トロフィーの数（cre.extraBonus）
    const dr0 = cre.fresh(seeded(1009));
    const rolled = dr0.bonusRoll;
    G.P = { graves: [] }; // 古い記録（trophies が無い）
    if (cre.trophyBonus() !== 0 || cre.bonusPoints(dr0) !== rolled) fail("トロフィーの無い記録でボーナス点が振った点にならない");
    G.P = { trophies: {}, graves: [] };
    if (cre.bonusPoints(dr0) !== rolled) fail("トロフィー 0 個でボーナス点が振った点にならない");
    const keys = D.TROPHIES.map((t) => t.key);
    for (const n of [1, 3, 10]) {
      G.P.trophies = Object.fromEntries(keys.slice(0, n).map((k) => [k, { name: k }]));
      if (cre.bonusPoints(dr0) !== rolled + n) fail(`トロフィー ${n} 個でボーナス点が ${rolled + n} にならない（${cre.bonusPoints(dr0)}）`);
    }
    // 全部取ったとき：上限で止まり、能力値の上限（24 点）まで使え、上限を超えない
    G.P.trophies = Object.fromEntries(keys.map((k) => [k, { name: k }]));
    if (cre.trophyBonus() !== Math.min(keys.length, D.TROPHY_BONUS_MAX)) fail(`全部取ったときのトロフィーの分が合わない（${cre.trophyBonus()}）`);
    const rnd = seeded(1010);
    for (let i = 0; i < 40; i++) {
      const dr = cre.fresh(rnd);
      const all = cre.bonusPoints(dr);
      if (all !== dr.bonusRoll + cre.trophyBonus()) fail(`作成 ${i}: ボーナス点が振った点＋トロフィーにならない`);
      while (cre.bonusLeft(dr) > 0) { const k = D.STATS.find((s) => cre.canAdd(dr, s)); if (!k) break; cre.addBonus(dr, k, 1); }
      const room = D.STATS.reduce((a, k) => a + cre.cap(dr, k) - cre.base(dr, k), 0);
      if (cre.bonusUsed(dr) !== Math.min(all, room)) fail(`作成 ${i}: 使った点が ${Math.min(all, room)} にならない（${cre.bonusUsed(dr)}）`);
      const o = cre.options(dr, rnd);
      for (const k of D.STATS) if (o.stats[k] > o.caps[k]) fail(`作成 ${i}: ${k} が上限を超えた`);
    }
  } finally { G.P = P0; }

  // 性格・口癖・好きなもの・苦手なもの（主人公だけ。仲間の性格・好き嫌いは別物）
  {
    const rnd = seeded(1011);
    for (let i = 0; i < 20; i++) {
      const dr = cre.fresh(rnd);
      for (const k of ["personality", "quote", "like", "dislike"]) if (dr.profile[k]) fail(`作成 ${i}: おまかせで ${k} が入った`);
      if (dr.profile.history) fail(`作成 ${i}: おまかせで生い立ちが埋まった`);
      if (!dr.profile.look) fail(`作成 ${i}: 外見が空`);
      dr.profile.personality = "無口"; dr.profile.quote = "古い口癖"; dr.profile.like = "酒"; dr.profile.dislike = "虫";
      const o = cre.options(dr, rnd);
      for (const k of ["personality", "quote", "like", "dislike"]) if (k in o.profile) fail(`作成 ${i}: 旅立つ人物に ${k} が残る`);
      if (!cre.prologue(o).every((pg) => pg.every((t) => typeof t === "string" && t && !t.includes("undefined")))) fail(`作成 ${i}: 生い立ちが空だと導入が崩れる`);
    }
    if (D.PROFILE.quote || D.PROFILE.like || D.PROFILE.dislike) fail("口癖・好きなもの・苦手なものの表が残っている");
    for (const f of ["ui/setup.js", "ui/ui.js"]) {
      const t = readFileSync(path.join(root, f), "utf8");
      if (/"性格"|"口癖"|"好きなもの"|"苦手なもの"|p\.personality|p\.quote|p\.like|p\.dislike/.test(t)) fail(`${f}: 主人公の性格・口癖・好き嫌いを出している`);
    }
    if (/profile\.personality/.test(readFileSync(path.join(root, "engine/gm.js"), "utf8"))) fail("GM への説明に主人公の性格が残っている");
    // 恋の相性：同じ魅力なら、古いセーブの性格が何であっても同じ
    if (G.m10Compat) {
      const st = Object.fromEntries(D.STATS.map((k) => [k, 50]));
      const c = { name: "誰か", trait: "loyal" };
      const vals = ["無口だが義理堅い", "冷酷で、どこまでも合理的", "", undefined].map((pp) => G.m10Compat(c, { stats: st, profile: { name: "テスト", personality: pp } }));
      if (new Set(vals).size !== 1) fail(`恋の相性が主人公の性格で変わる（${vals}）`);
      const hi = G.m10Compat(c, { stats: { ...st, 魅力: 80 }, profile: {} }), lo = G.m10Compat(c, { stats: { ...st, 魅力: 10 }, profile: {} });
      if (!(hi > lo)) fail(`恋の相性が魅力で変わらない（高 ${hi}・低 ${lo}）`);
    }
  }

  // タイトルのメニュー（画面のソースで確かめる）
  const setup = readFileSync(path.join(root, "ui/setup.js"), "utf8");
  const title = setup.slice(setup.indexOf("function title("), setup.indexOf("function person("));
  const labels = [...title.matchAll(/btn\("([^"]+)"/g)].map((m) => m[1]);
  if (labels.join("|") !== "はじめる|つづきから") fail(`タイトルのボタンが「はじめる」「つづきから」だけでない：${labels.join("・")}`);
  if (!/if \(live\)[\s\S]*つづきから/.test(title)) fail("「つづきから」が保存のあるときだけになっていない");
  if (/openTrophies|btn\("記録/.test(title)) fail("タイトルに記録（墓碑・トロフィー）が残っている");
  if (!/trophyBonus/.test(setup) || !/トロフィーで \+/.test(setup)) fail("作成画面に「トロフィーで +N」が無い");
};
