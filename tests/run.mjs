// エンジンの自動テスト（DOM なしで動く）。node tests/run.mjs
// 1. データの整合（存在しない場所・敵・アイテムを参照していないか）
// 2. ランダムに遊び続けるテスト（例外が出ないか、数値が範囲に収まるか）
// 3. 釣り合いの測定（職業ごとの数字を出すだけ。失敗にはしない）。tests/balance.mjs
// 1〜2c と保存の鍵の確認は tests/core.mjs に書いてある（T2 で切り出した。出力はこれまでどおり checks より先、この順）。
// 新しい確認は tests/checks/<id>.mjs に置けば名前順に自動で読まれる（export default ({ G, fail, ok, loadEngine, seeded }) => {...}）
// 速さ：tests/core.mjs の節・tests/checks・q2 の遊ぶ回・釣り合いの測定は、どれも一つずつの仕事として node:worker_threads で並べて動かす。
//   出力は名前順のまま、最後に遅いものの一覧を出す。
//   JOBS=1 node tests/run.mjs   … 並べずに一つずつ（既定はコアの数）
//   ONLY=q2,q4 node tests/run.mjs … 名前にその文字を含む checks だけ（手元で直すとき。CI では使わない。釣り合いの測定は ONLY に balance を含めたときだけ）
//   SHARD=2/5 node tests/run.mjs … 仕事を 5 つに分けた 2 つ目だけ（CI の matrix。.github/workflows/ci.yml）。
//     分け方は下の WEIGHT（かかる秒の目安）で決まり、どの番号でも同じ。1/5〜5/5 を全部動かすと、SHARD なしと同じ確認が一度ずつ走る。
// checks は別々の働き手で、ほかの checks と同時に動く。ほかの check の後始末やグローバルの状態に頼らないこと（今までも順番には頼れなかった）
import { readdirSync } from "node:fs";
import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { loadEngine } from "./lib.mjs";
import { drain, runTask } from "./worker.mjs";
import { SECTIONS } from "./core.mjs";
import { assignShards } from "./shard.mjs";
import { balancePlan, checkPlan, measureBalance, splitTasks, splitKey, CHECK_PLAN } from "./balance.mjs";

let failures = 0;
const fail = (msg) => { failures++; console.log("FAIL " + msg); };

// ---------------------------------------------------------------- 仕事の一覧
// かかる秒の目安（コアの数だけ並べて動かしたときの、一つずつの時間。TIMES=all で全部出る。載っていない check は 5 秒とみなす）。
// 重いものから取らせると早く終わる。SHARD の分け方にも使う（目安がずれても、確認が抜けたり二度走ったりはしない。遅くなるだけ）
const WEIGHT = {
  "core:2. ランダムに遊ぶ": 150,
  "e3_apostles.mjs": 200, "c2_people.mjs": 160, "m4_world.mjs": 120, "m10_love.mjs": 90, "m2_companions.mjs": 65, "m6_ending.mjs": 65,
  "m7_reroll.mjs": 55, "m9_plague.mjs": 45, "q4_goals.mjs": 45, "u7_glossary.mjs": 35,
  "balance:random": 0.3, "balance:smart": 1.6, // 遊ぶ一回あたり
};
const weightOf = (t) => t.kind === "balance" ? (t.games - (t.start || 0)) * (WEIGHT["balance:" + t.mode] || 1) : WEIGHT[t.kind === "core" ? "core:" + t.name : t.name] ?? 5;

function shardSpec() {
  if (!process.env.SHARD) return null;
  const m = /^(\d+)\/(\d+)$/.exec(process.env.SHARD);
  if (!(m && +m[1] >= 1 && +m[1] <= +m[2])) throw new Error(`SHARD は 1/6 のように書く（${process.env.SHARD}）`);
  return m;
}
const timings = [];
const checkDir = new URL("./checks/", import.meta.url);
const checkNames = readdirSync(checkDir).filter((n) => n.endsWith(".mjs")).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  .filter((n) => !process.env.ONLY || process.env.ONLY.split(",").some((k) => n.includes(k)));
const Q2 = "q2_balance.mjs";
const q2On = checkNames.includes(Q2);
const classes = Object.keys(loadEngine().data.CLASSES);
// q2 が遊ぶ回（tests/balance.mjs の CHECK_PLAN を playSplit と同じに小分けしたもの）は、ほかの仕事と同じ並びで先に遊んでおき、
// 最後に親が q2 を動かす（playSplit は先に遊んだ回を使う。働き手の中で働き手を起こさないので、コアの数より多く動かない）
// SHARD で分けるときは、遊び方ごと（random・smart）に別のまとまりにする（q2 は遊び方ごとに確かめるので、別のジョブで動かせる）
const q2Modes = !q2On ? [] : shardSpec() ? [["random"], ["smart"]] : [["random", "smart"]];
const q2Parts = (modes) => modes.flatMap((mode) => splitTasks({ mode, ...CHECK_PLAN[mode], seed: CHECK_PLAN.seed, classes }).map((t) => ({ ...t, name: `q2 の回 ${mode} ${t.cls} ${t.start}〜${t.games}` })));
// 釣り合いの表は、q2 が遊んだ回（tests/balance.mjs の CHECK_PLAN）をそのまま使う（同じ回を二度遊ばない）。
// q2 を動かさないとき（ONLY=balance など）や、回数を変えたとき（BALANCE_GAMES など）だけ、遊び方ごと・職業ごとに分けてここで並べて遊ぶ
// （種は職業ごと・回ごとに決まっているので、分けても数字は同じ）
const fromQ2 = q2On && JSON.stringify(balancePlan()) === JSON.stringify(checkPlan());
const balanceOn = !(process.env.BALANCE === "0" || (process.env.ONLY && !process.env.ONLY.includes("balance") && !fromQ2));
const balanceParts = !balanceOn || fromQ2 ? [] : balancePlan().flatMap((p) => classes.map((cls) => ({ kind: "balance", name: `釣り合いの測定 ${p.mode} ${cls}`, ...p, cls })));

// 仕事のまとまり。SHARD で分けるときは、まとまりごとに一つの番号へ（q2 は遊ぶ回と一緒、釣り合いの測定は全部で一つ）
const groups = [
  ...SECTIONS.map(([name]) => ({ key: "core:" + name, tasks: [{ kind: "core", name }] })),
  ...checkNames.filter((n) => n !== Q2).map((name) => ({ key: name, tasks: [{ kind: "check", name }] })),
  ...q2Modes.map((modes) => ({ key: modes.length > 1 ? Q2 : `${Q2} ${modes[0]}`, tasks: q2Parts(modes), q2: modes })),
  ...(balanceParts.length ? [{ key: "balance", tasks: balanceParts, balance: true }] : []),
].map((g) => ({ ...g, weight: g.tasks.reduce((a, t) => a + weightOf(t), 0) }));
let mine = groups;
const shard = shardSpec();
if (shard) {
  const N = +shard[2], { parts, load } = assignShards(groups, N);
  mine = parts[+shard[1] - 1];
  console.log(`SHARD ${shard[1]}/${N}（目安 ${Math.round(load[+shard[1] - 1])}s・全体 ${load.map(Math.round).join("/")}s）：${mine.map((g) => g.key).join("・")}`);
}
const shown = mine.flatMap((g) => g.tasks);
const tasks = shown.map((t, at) => ({ ...t, at })).sort((a, b) => weightOf(b) - weightOf(a) || a.at - b.at);
const results = new Array(tasks.length);
const counter = new Int32Array(new SharedArrayBuffer(4));
const JOBS = Math.max(1, Number(process.env.JOBS || availableParallelism()));
const workers = Array.from({ length: Math.min(JOBS - 1, tasks.length) }, () => new Promise((resolve) => {
  const w = new Worker(new URL("./worker.mjs", import.meta.url), { workerData: { tasks, counter: counter.buffer } });
  let died = null;
  w.on("message", (m) => { if (m.end) w.terminate(); else results[m.i] = m; });
  w.on("error", (e) => { died = e; });
  w.on("exit", () => resolve(died));
}));

// ---------------------------------------------------------------- 動かす
// 働き手と一緒に親も残りの仕事を取る。終わったら、tests/core.mjs の節 → checks の名前順に出す（釣り合いの表は最後）
await drain(tasks, counter, (i, r) => { results[i] = r; });
for (const e of await Promise.all(workers)) if (e) fail(`働き手が止まった: ${e.stack || e}`);
const resultOf = (t) => results[tasks.findIndex((x) => x.at === shown.indexOf(t))];
// q2：先に遊んだ回を渡して、親が動かす（遊び方を分けたときは、受け持った遊び方だけ確かめる）
const q2Results = new Map();
for (const g of mine.filter((x) => x.q2)) {
  const pre = new Map();
  let ms = 0;
  for (const t of g.tasks) {
    const r = resultOf(t);
    if (!r) { fail(`${t.name}: 結果が返ってこなかった（働き手が途中で止まった）`); continue; }
    ms += r.ms;
    if (r.data && !r.data.error) pre.set(splitKey(t), r.data); // 止まった回は q2 の中で遊び直す（そこで例外として出る）
  }
  globalThis.__preplayed = pre;
  globalThis.__q2modes = g.q2;
  let r;
  try { r = await runTask({ kind: "check", name: Q2 }); } finally { globalThis.__preplayed = null; globalThis.__q2modes = null; }
  r.ms += ms;
  q2Results.set(g, r);
}
const played = {};
const out = [
  ...mine.filter((g) => g.tasks[0].kind === "core"),
  ...mine.filter((g) => g.tasks[0].kind === "check" || g.q2).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
  ...mine.filter((g) => g.balance),
];
for (const g of out) {
  for (const t of g.q2 ? [{ kind: "check", name: Q2 }] : g.tasks) {
    const r = g.q2 ? q2Results.get(g) : resultOf(t);
    if (!r) { fail(`${t.name}: 結果が返ってこなかった（働き手が途中で止まった）`); continue; }
    for (const l of r.lines) console.log(l);
    failures += r.failures;
    timings.push([t.kind === "check" ? `tests/checks/${t.name}` : t.name, r.ms]);
    if (t.kind === "balance") {
      const p = (played[t.mode] ||= { rows: [], ms: 0, error: null });
      p.ms += r.ms;
      if (r.data?.error) { p.error = r.data.error; continue; }
      p.rows.push(...r.data);
    }
  }
}
// 3. 釣り合いの測定（失敗にはしない）。SHARD で分けたときは、q2 か釣り合いの測定を受け持った番号だけが、受け持った遊び方の表を出す
const modesHere = shard ? [...mine.flatMap((g) => g.q2 || []), ...(mine.some((g) => g.balance) ? balancePlan().map((p) => p.mode) : [])] : balancePlan().map((p) => p.mode);
if (fromQ2 && balanceOn) {
  // q2 が遊んだ回（同じ遊び方・回数・行動の上限・種で、全部の職業）を使う。q2 が途中で止まったときは表を出さない（q2 の失敗で分かる）
  // 表の秒は、q2 の回を遊んだ時間の合計（働き手ごとの時間を足したもの）
  const all = [...q2Results.values()].flatMap((r) => r.played || []);
  for (const { mode, games, steps, seed } of balancePlan()) {
    const pre = all.find((x) => x.mode === mode && x.start === 0 && x.games === games && x.steps === steps && x.seed === seed && !x.classes);
    const ms = mine.filter((g) => g.q2).flatMap((g) => g.tasks).filter((t) => t.mode === mode).reduce((a, t) => a + (resultOf(t)?.ms || 0), 0);
    if (pre) played[mode] = { rows: pre.rows, ms };
  }
}
if (balanceOn && modesHere.length) {
  const bad = Object.values(played).find((p) => p.error);
  const missing = balancePlan({ modes: modesHere }).filter((p) => !played[p.mode]);
  try {
    if (bad) throw new Error(bad.error);
    if (missing.length) throw new Error(`q2 が遊んだ回が見つからない（${missing.map((p) => p.mode).join("・")}）`);
    measureBalance({ played, modes: modesHere });
  } catch (e) {
    console.log("NOTE 釣り合いの測定を出せなかった（失敗にはしない）: " + (e.stack || e));
  }
}

if (process.env.TIMES === "all") console.log("TIMES " + JSON.stringify(Object.fromEntries([...timings].sort((a, b) => b[1] - a[1]).map(([n, ms]) => [n, Math.round(ms / 100) / 10]))));
const slow = timings.sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, ms]) => `${n} ${(ms / 1000).toFixed(1)}s`);
console.log(`TIME 全体 ${(performance.now() / 1000).toFixed(1)}s（働き手 ${workers.length}＋親）。遅い順：${slow.join("・")}`);
console.log(failures ? `DONE failures=${failures}` : "DONE failures=0");
process.exit(failures ? 1 : 0);
