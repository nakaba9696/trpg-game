// R11（時間の進み）：依頼の期限・旅の出来事・世の大事の間隔を測る（テストではなく測るだけ。node tests/r11_pace.mjs [回数/職業] [行動の上限]）
// 筋のよいボット三つ（目的の道筋 tests/bots.mjs・釣り合いの tests/bot.mjs・釣り合いのボットが受けた依頼へまっすぐ向かうもの）で遊び、
//   1. 受けたギルドの依頼（Q5）の結果の割合（果たした・期限切れ・ほか）
//   2. 旅一回あたりの道中の出来事（W6）の数（旅の日数ごと）
//   3. 世の大事（M12）が始まった数（360 日あたり）
// を Markdown の表で出す。乱数は種で固定。
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";
import { makeBot, startRun } from "./bots.mjs";

const N = Number(process.argv[2]) || 3;
const STEPS = Number(process.argv[3]) || 2000;
const G = loadEngine();
const D = G.data;
const CLASSES = Object.keys(D.CLASSES);
const GOALS = ["king", "sword", "majin", "rich", "custom"];

// 受けた依頼へまっすぐ向かう：取りかかれるなら取りかかり、まだなら依頼の場所へ旅をし、着いたら探索する（傷が浅いときだけ。ほかは釣り合いのボット）
function questStep() {
  const S = G.S;
  if (S.over || S.mode !== "explore" || S.combat || S.travel || S.hp < S.maxHp * 0.5) return null;
  const avail = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled).map((a) => a.id);
  const go = avail.find((id) => id.startsWith("q5go:"));
  if (go) return go;
  const w = (G.questWays ? G.questWays(S) : []).find((x) => x.q && x.q.q5 && !x.q.done);
  if (!w) return null;
  if (w.next) return ["travel:" + w.next, "sail:" + w.next].find((id) => avail.includes(id)) || null;
  const L = D.LOCS[S.loc] || {};
  if (L.type === "wild" && avail.includes("explore")) return "explore";
  if (L.type === "dungeon" && avail.includes("deeper") && (S.depth || 0) < (L.floors || 1) - 1) return "deeper";
  return null;
}

function play(kind, cls, i) {
  const seed = 910000 + CLASSES.indexOf(cls) * 1000 + i;
  const goal = GOALS[i % GOALS.length];
  startRun(G, { goal, cls, seed, seeded });
  let choose;
  if (kind === "goal") { const b = makeBot(G, goal); choose = () => b.step(); }
  else {
    const b = makeSmartBot(G);
    const pick = kind === "quest" ? () => questStep() || b.choose() : () => b.choose();
    choose = () => { const id = pick(); if (!id) return false; G.act(id); return true; };
  }
  const trips = []; // [日数, 道中の出来事の数]
  let trip = null;
  const start0 = G.w6 && G.w6.start;
  if (start0) G.w6.start = (dest, days, cost) => { trip = [days, 0]; trips.push(trip); return start0(dest, days, cost); };
  const ev0 = G.startEvent;
  G.startEvent = (e, ...r) => { if (trip && e && e.w6 && G.S && G.S.travel) trip[1]++; return ev0(e, ...r); };
  for (let s = 0; s < STEPS && !G.S.over; s++) {
    let ok;
    try { ok = choose(); } catch (e) { break; }
    if (ok === false) break;
    if (!G.S.travel) trip = null;
  }
  if (start0) G.w6.start = start0;
  G.startEvent = ev0;
  const S = G.S;
  return { kind, day: S.day, res: Object.assign({}, (S.q5 && S.q5.res) || {}), trips, m12: ((S.m12 && S.m12.list) || []).length };
}

const runs = [];
const KINDS = ["goal", "smart", "quest"];
for (const kind of KINDS) for (const cls of CLASSES) for (let i = 0; i < N; i++) runs.push(play(kind, cls, i));
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "-");
const out = [];
out.push(`## R11 時間の進み（職業 ${CLASSES.length}×ボット 3×${N} 回・1 回 ${STEPS} 行動まで）`, "");
out.push("| ボット | 受けた依頼の結果 | 果たした | 期限切れ | 旅 | 旅一回の出来事 | 7〜10 日の旅 | 11〜15 日 | 16 日〜 | 大事（360 日あたり） |");
out.push("|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|");
for (const kind of [...KINDS, "*"]) {
  const rs = runs.filter((r) => kind === "*" || r.kind === kind);
  const res = {};
  rs.forEach((r) => Object.entries(r.res).forEach(([k, v]) => (res[k] = (res[k] || 0) + v)));
  const tot = Object.values(res).reduce((a, b) => a + b, 0);
  const ok = (res.ok || 0) + (res.expose || 0) + (res.trap || 0) + (res.ally || 0);
  const trips = rs.flatMap((r) => r.trips);
  const avg = (ts) => (ts.length ? (ts.reduce((a, t) => a + t[1], 0) / ts.length).toFixed(2) : "-");
  const days = rs.reduce((a, r) => a + r.day, 0);
  out.push(`| ${kind === "*" ? "**全体**" : kind} | ${tot} | ${pct(ok, tot)} | ${pct(res.late || 0, tot)} | ${trips.length} | ${avg(trips)} | ${avg(trips.filter((t) => t[0] <= 10))} | ${avg(trips.filter((t) => t[0] > 10 && t[0] <= 15))} | ${avg(trips.filter((t) => t[0] > 15))} | ${((360 * rs.reduce((a, r) => a + r.m12, 0)) / Math.max(1, days)).toFixed(1)} |`);
}
console.log(out.join("\n"));
