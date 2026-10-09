// C16：時間の進みを測る（テストではなく測るだけ。node tests/c16_pace.mjs [回数/職業] [行動の上限]）
// 職業ごとに、筋のよいボット（目的の道筋 tests/bots.mjs・釣り合いの tests/bot.mjs）と雑なボット（出ている行動からでたらめに選ぶ）で遊び、
//   1. 1 回の冒険の日数（死ぬか、行動の上限まで）
//   2. 日数の内訳（旅・野外の探索・迷宮・町の探索・野営・施設・出来事・ほか）
//   3. 世界の大事（M12）・帝国の筋（M4）・長編（E7）・人の予定がどこまで進むか
//   4. 時限の出来事の密度：日ごとに「今動ける時限の出来事」がいくつ開いているか・何も開いていない空白の長さ
//      時限の出来事 = 進行中の世界の大事（M12）＋帝国の戦（M4）＋期限つきの依頼（受けたもの）＋進行中の長編（E7）
//                    ＋季節の催し（V13 の表の季節の出来事で、今がその季節・まだ済んでいない・舞台が今いる所か、道か船ひとつで行ける所）
// を Markdown の表で出す。乱数は種で固定。
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";
import { makeBot, startRun } from "./bots.mjs";

const N = Number(process.argv[2]) || 4;
const STEPS = Number(process.argv[3]) || 3000;
const G = loadEngine();
const D = G.data;
const CLASSES = Object.keys(D.CLASSES);
const GOALS = ["king", "sword", "majin", "rich", "custom"];

const TRAVEL = new Set(["travel", "sail", "w8go"]);
const CAMP = new Set(["camp", "k1camp"]);
function catOf(id, mode, loc) {
  const p = String(id).split(":")[0];
  if (TRAVEL.has(p)) return "旅";
  if (CAMP.has(p)) return "野営";
  if (mode === "fac") return p === "train" ? "施設（稽古）" : p === "inn" ? "施設（宿）" : "施設（ほか）";
  if (mode === "event") return "出来事";
  if (mode === "combat") return "戦闘";
  const t = (D.LOCS[loc] || {}).type;
  if (t === "dungeon") return "迷宮";
  if (t === "wild") return "野外の探索";
  if (t === "town") return "町の探索";
  return "ほか";
}
// [世の中の時限（依頼を除く）, 期限つきの依頼]
function openTimed(S) {
  let n = 0;
  if (G.m12 && G.m12.active) n += G.m12.active(S).length;
  if (S.world && S.world.war) n++;
  const q = (S.quests || []).filter((q) => q.q5 && !q.done && q.deadline != null && q.deadline >= S.day).length;
  n += Object.values(S.e7 || {}).filter((st) => st && st.on && !st.end).length;
  const sets = (D.V13 && D.V13.LEADS) || [];
  if (G.seasonOf) {
    const now = G.seasonOf(S.day);
    sets.filter((set) => set.kind === "season" && set.season === now).forEach((set) => {
      const e = (D.EVENTS || []).find((x) => x.id === set.ev);
      if (!e || (e.once && S.flags && S.flags["ev:" + e.id])) return;
      const targets = [].concat(e.where || []).filter((id) => D.LOCS[id]);
      const L = D.LOCS[S.loc] || {};
      if (targets.some((t) => t === S.loc || (L.links || {})[t] != null || (L.sea || {})[t] != null)) n++;
    });
  }
  return [n, q];
}

const pickRandom = () => { const a = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled); return a.length ? a[Math.floor(G.rand() * a.length)].id : null; };

function play(kind, cls, i) {
  const seed = 700000 + CLASSES.indexOf(cls) * 1000 + i;
  const goal = GOALS[i % GOALS.length];
  startRun(G, { goal, cls, seed, seeded });
  const S0 = G.S;
  let choose;
  if (kind === "goal") { const b = makeBot(G, goal); choose = () => b.step(); }
  else if (kind === "smart") { const b = makeSmartBot(G); choose = () => { const id = b.choose(); if (!id) return false; G.act(id); return true; }; }
  else choose = () => { const id = pickRandom(); if (!id) return false; G.act(id); return true; };
  const time = {}, dens = [], densQ = [];
  let steps = 0;
  let err = "";
  for (let s = 0; s < STEPS && !G.S.over; s++) {
    const S = G.S, t0 = S.day * 4 + S.phase, d0 = S.day;
    // 行動を選ぶ前の場面で分類する（goal ボットは中で G.act を呼ぶので、行動の id は記録から拾う）
    const mode = S.mode, loc = S.loc;
    let id = "";
    const act0 = G.act;
    G.act = (x) => { if (!id) id = x; return act0(x); };
    let okStep;
    try { okStep = choose(); } catch (e) { err = String(e && e.message); G.act = act0; break; }
    G.act = act0;
    if (okStep === false) break;
    steps++;
    const dt = G.S.day * 4 + G.S.phase - t0;
    if (dt > 0) { const c = catOf(id, mode, loc); time[c] = (time[c] || 0) + dt / 4; }
    if (G.S.day > d0) { const [w, q] = openTimed(G.S); for (let d = d0; d < G.S.day; d++) { dens.push(w); densQ.push(w + q); } }
  }
  const S = G.S;
  const W = S.world || {}, hist = W.hist || [];
  const m4 = ["emp_worse", "emp_dead", "heir", "war", "truce", "treaty_ok", "treaty_broken"].filter((k) => hist.some((h) => h.kind === k));
  const m12 = (S.m12 && S.m12.list) || [];
  const e7 = Object.values(S.e7 || {}).filter((st) => st && st.on);
  return { kind, cls, goal, day: S.day, steps, dead: S.over === "dead", err, time, dens, densQ, m4,
    m12Start: m12.length, m12Done: m12.filter((e) => e.st >= 4).length, e7On: e7.length, e7Ch: e7.reduce((a, st) => a + (st.ch || 0), 0), e7End: e7.filter((st) => st.end).length,
    raids: hist.filter((h) => h.kind === "raid").length, seasons: Math.floor((S.day - 1) / (G.SEASON_DAYS || 90)) + 1 };
}

const KINDS = { goal: "筋のよいボット（目的の道筋）", smart: "筋のよいボット（釣り合い）", random: "雑なボット（でたらめ）" };
const runs = [];
const t0 = Date.now();
for (const kind of Object.keys(KINDS)) for (const cls of CLASSES) for (let i = 0; i < N; i++) runs.push(play(kind, cls, i));

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (x) => `${Math.round(x * 100)}%`;
const out = [];
out.push(`## 時間の進み（職業 ${CLASSES.length}×ボット 3×${N} 回・1 回 ${STEPS} 行動まで・暦 1 季節 ${G.SEASON_DAYS || 90} 日・${((Date.now() - t0) / 1000).toFixed(0)} 秒）`);
out.push("");
out.push("### 1 回の冒険の日数");
out.push("| ボット | 職業 | 回 | 死亡 | 日数（中央値） | 日数（平均） | 最短〜最長 | 100 行動あたりの日数 | 年齢の伸び（平均） |");
out.push("|---|---|--:|--:|--:|--:|--:|--:|--:|");
for (const kind of Object.keys(KINDS)) {
  for (const cls of [...CLASSES, "*"]) {
    const rs = runs.filter((r) => r.kind === kind && (cls === "*" || r.cls === cls));
    const ds = rs.map((r) => r.day);
    out.push(`| ${cls === "*" ? "**" + KINDS[kind] + " 全体**" : KINDS[kind]} | ${cls === "*" ? "" : D.CLASSES[cls].name} | ${rs.length} | ${rs.filter((r) => r.dead).length} | ${median(ds)} | ${mean(ds).toFixed(0)} | ${Math.min(...ds)}〜${Math.max(...ds)} | ${(100 * ds.reduce((a, b) => a + b, 0) / Math.max(1, rs.reduce((a, r) => a + r.steps, 0))).toFixed(1)} | ${mean(ds.map((d) => Math.floor(d / (G.YEAR_DAYS || 360)))).toFixed(2)} 年 |`);
  }
}
out.push("");
out.push("### 日数の内訳（進んだ日数のうちの割合）");
const cats = [...new Set(runs.flatMap((r) => Object.keys(r.time)))].sort();
out.push(`| ボット | ${cats.join(" | ")} |`);
out.push(`|---|${cats.map(() => "--:").join("|")}|`);
for (const kind of Object.keys(KINDS)) {
  const rs = runs.filter((r) => r.kind === kind);
  const tot = {}; rs.forEach((r) => Object.entries(r.time).forEach(([c, v]) => (tot[c] = (tot[c] || 0) + v)));
  const all = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
  out.push(`| ${KINDS[kind]} | ${cats.map((c) => pct((tot[c] || 0) / all)).join(" | ")} |`);
}
out.push("");
out.push("### 世界と物語がどこまで進むか（1 回あたり）");
out.push("| ボット | 過ぎた季節 | 大事（M12）が始まった／決着 | 帝国の筋（M4。その段に着いた回の割合） | 襲来 | 長編（E7）始めた／進んだ章／結末 |");
out.push("|---|--:|--:|---|--:|--:|");
for (const kind of Object.keys(KINDS)) {
  const rs = runs.filter((r) => r.kind === kind);
  const m4 = ["emp_worse", "emp_dead", "heir", "war", "truce", "treaty_ok", "treaty_broken"].map((k) => `${k} ${pct(rs.filter((r) => r.m4.includes(k)).length / rs.length)}`).join("・");
  out.push(`| ${KINDS[kind]} | ${mean(rs.map((r) => r.seasons)).toFixed(1)} | ${mean(rs.map((r) => r.m12Start)).toFixed(1)}／${mean(rs.map((r) => r.m12Done)).toFixed(1)} | ${m4} | ${mean(rs.map((r) => r.raids)).toFixed(1)} | ${mean(rs.map((r) => r.e7On)).toFixed(2)}／${mean(rs.map((r) => r.e7Ch)).toFixed(2)}／${mean(rs.map((r) => r.e7End)).toFixed(2)} |`);
}
out.push("");
out.push("### 時限の出来事の密度（日ごとに開いている数の割合・何も開いていない空白）");
out.push("「世の中」は大事・戦・長編・近くの季節の催し。「依頼込み」はそれに受けている期限つきの依頼を足したもの（依頼はボットが受けた数しだい）。");
out.push("| ボット | 数え方 | 0 | 1 | 2 | 3 | 4 以上 | 空白の最長（中央値） | 空白の最長（最大） |");
out.push("|---|---|--:|--:|--:|--:|--:|--:|--:|");
for (const kind of Object.keys(KINDS)) {
  for (const [key, label] of [["dens", "世の中"], ["densQ", "依頼込み"]]) {
    const rs = runs.filter((r) => r.kind === kind);
    const all = rs.flatMap((r) => r[key]);
    const b = [0, 0, 0, 0, 0]; all.forEach((n) => b[Math.min(4, n)]++);
    const gaps = rs.map((r) => { let g = 0, m = 0; r[key].forEach((n) => { g = n ? 0 : g + 1; m = Math.max(m, g); }); return m; });
    out.push(`| ${KINDS[kind]} | ${label} | ${b.map((x) => pct(x / (all.length || 1))).join(" | ")} | ${median(gaps)} 日 | ${Math.max(0, ...gaps)} 日 |`);
  }
}
const errs = runs.filter((r) => r.err);
if (errs.length) out.push(`\n例外で止まった回 ${errs.length}：${[...new Set(errs.map((r) => r.err))].slice(0, 3).join(" / ")}`);
console.log(out.join("\n"));
