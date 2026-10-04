// U10：手引きと画面の手直し（持ち主の声）
// - 消した文（仲間の居場所の決まり・「歩いて確かめるしかない」・暦と鐘の説明）が、どこにも残っていない
// - トロフィーの数だけキャラクター作成のボーナス点が増える（上限つき。古い記録・トロフィー無しでも動く）
// - タイトルのメニューは「はじめる」（と、保存があるときの「つづきから」）だけ
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
    G.P = { graves: [] }; // 古い記録（trophies が無い）
    if (cre.trophyBonus() !== 0 || cre.bonusPoints() !== D.BONUS_POINTS) fail("トロフィーの無い記録でボーナス点が基本の値にならない");
    G.P = { trophies: {}, graves: [] };
    if (cre.bonusPoints() !== D.BONUS_POINTS) fail("トロフィー 0 個でボーナス点が基本の値にならない");
    const keys = D.TROPHIES.map((t) => t.key);
    for (const n of [1, 3, 10]) {
      G.P.trophies = Object.fromEntries(keys.slice(0, n).map((k) => [k, { name: k }]));
      if (cre.bonusPoints() !== D.BONUS_POINTS + n) fail(`トロフィー ${n} 個でボーナス点が ${D.BONUS_POINTS + n} にならない（${cre.bonusPoints()}）`);
    }
    // 全部取ったとき：上限で止まり、どう振っても使い切れ、才能限界を超えない
    G.P.trophies = Object.fromEntries(keys.map((k) => [k, { name: k }]));
    const all = cre.bonusPoints();
    if (all !== Math.min(D.BONUS_POINTS + keys.length, D.STATS.length * 5)) fail(`全部取ったときのボーナス点が合わない（${all}）`);
    const rnd = seeded(1010);
    for (let i = 0; i < 40; i++) {
      const dr = cre.fresh(rnd);
      while (cre.bonusLeft(dr) > 0) { const k = D.STATS.find((s) => cre.canAdd(dr, s)); if (!k) { fail(`作成 ${i}: トロフィーのボーナスを使い切れない`); break; } cre.addBonus(dr, k, 1); }
      if (cre.bonusUsed(dr) !== all) fail(`作成 ${i}: 使った点が ${all} にならない`);
      const o = cre.options(dr, rnd);
      for (const k of D.STATS) if (o.stats[k] > o.caps[k]) fail(`作成 ${i}: ${k} が才能限界を超えた`);
    }
  } finally { G.P = P0; }

  // タイトルのメニュー（画面のソースで確かめる）
  const setup = readFileSync(path.join(root, "ui/setup.js"), "utf8");
  const title = setup.slice(setup.indexOf("function title("), setup.indexOf("function person("));
  const labels = [...title.matchAll(/btn\("([^"]+)"/g)].map((m) => m[1]);
  if (labels.join("|") !== "はじめる|つづきから") fail(`タイトルのボタンが「はじめる」「つづきから」だけでない：${labels.join("・")}`);
  if (!/if \(live\)[\s\S]*つづきから/.test(title)) fail("「つづきから」が保存のあるときだけになっていない");
  if (/openTrophies|btn\("記録/.test(title)) fail("タイトルに記録（墓碑・トロフィー）が残っている");
  if (!/trophyBonus/.test(setup) || !/トロフィーで \+/.test(setup)) fail("作成画面に「トロフィーで +N」が無い");
};
