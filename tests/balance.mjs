// 釣り合いの測定：職業ごとに遊ばせて、生存手番・死因・到達した場所・ボス撃破を表にする。
// 遊び方は二通り。数字を出すだけで、テストの失敗にはしない（CI の軽い確認は tests/checks/q2_balance.mjs）。
//   ランダム       … tests/run.mjs のランダムプレイと同じ（できる行動から等確率で選ぶ）
//   筋のよい遊び方 … tests/bot.mjs（勝ち目を見積もる・逃げる・宿で休む・装備を買う・鍛える・危険の低い所から）
// どちらも金や能力値の底上げはせず、キャラクター作成の画面と同じ振り方で始める。
//   node tests/run.mjs                 … テストのあとに表を出す（tests/checks/q2_balance.mjs が遊んだ回を使い回す）
//   node tests/balance.mjs             … 表だけ出す（働き手に分けて遊ぶ。JOBS=1 なら一つずつ）
//   BALANCE_GAMES=600 node tests/balance.mjs   … ランダムの職業ごとの回数（既定は q2 と同じ。下の CHECK_PLAN）
//   BALANCE_SMART_GAMES=100 …          … 筋のよい遊び方の回数（既定は q2 と同じ）
//   STEPS=500 / SMART_STEPS=1500 …     … 1回の行動の上限（既定は q2 と同じ）
//   BALANCE_SEED=1 …                   … 乱数の出発点をずらす（揺れの確認用。既定 0）
//   BALANCE=0 node tests/run.mjs       … 測定を省く
// GitHub Actions では GITHUB_STEP_SUMMARY にも同じ表を書く。
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";

const TOP_CAUSES = 3;

// tests/checks/q2_balance.mjs が遊ぶ回の組（職業ごとの回数・1回の行動の上限・種）。表の既定も同じにして、run.mjs では q2 の回を使い回す
// 回数は種によるぶれから決めた（Q6）。種を 0〜9 に変えて測った職業の差（最長 ÷ 最短）：
//   ランダム       240 回 1.31〜1.50 倍（平均 1.41・標準偏差 0.071） → 600 回 1.25〜1.44 倍（平均 1.36・0.065）
//   筋のよい遊び方  30 回 1.24〜1.99 倍（平均 1.43・0.228）           →  50 回 1.12〜1.24 倍（平均 1.18・0.046。tests/bot.mjs の MP の見積もりも直した）
// ランダムは 1 回ごとの手番のばらつき（標準偏差が平均とほぼ同じ）が大きく、ぶれを ±0.03 倍にするには職業ごとに 1 万回ほど要る。
// テスト全体の時間（CI で 8 分以内）に収まる回数にした。
export const CHECK_PLAN = { random: { games: 600, steps: 500 }, smart: { games: 50, steps: 800 }, seed: 0 };

// q2 の回の組（balancePlan と同じ形。環境変数は見ない）
export const checkPlan = () => balancePlan({ games: CHECK_PLAN.random.games, smartGames: CHECK_PLAN.smart.games, steps: CHECK_PLAN.random.steps, smartSteps: CHECK_PLAN.smart.steps, seed: CHECK_PLAN.seed });

// 測る回の組（遊び方ごとの回数・行動の上限・種）。tests/run.mjs はこれを職業ごとに分けて並べて遊ばせ、opts.played で渡す
export function balancePlan(opts = {}) {
  const GAMES = opts.games ?? Number(process.env.BALANCE_GAMES || CHECK_PLAN.random.games);
  const SMART_GAMES = opts.smartGames ?? Number(process.env.BALANCE_SMART_GAMES || CHECK_PLAN.smart.games);
  const STEPS = opts.steps ?? Number(process.env.STEPS || CHECK_PLAN.random.steps);
  const SMART_STEPS = opts.smartSteps ?? Number(process.env.SMART_STEPS || CHECK_PLAN.smart.steps);
  const SEED = opts.seed ?? Number(process.env.BALANCE_SEED || CHECK_PLAN.seed);
  return [["random", GAMES, STEPS], ["smart", SMART_GAMES, SMART_STEPS]]
    .filter(([mode]) => !opts.modes || opts.modes.includes(mode))
    .map(([mode, games, steps]) => ({ mode, games, steps, seed: SEED }));
}

// opts.played = { random: { rows, ms }, smart: { rows, ms } } があれば、遊ばずにその結果で表を出す（ms は職業ごとにかかった時間の合計）
export function measureBalance(opts = {}) {
  if (process.env.BALANCE === "0") return null;
  const quiet = !!opts.quiet;
  const D = loadEngine().data;
  Object.keys(D.CLASSES).forEach((k) => { CLASS_NAME[k] = D.CLASSES[k].name; });
  const out = {};
  const md = [];
  for (const { mode, games, steps, seed: SEED } of balancePlan(opts)) {
    const t0 = Date.now();
    const pre = opts.played && opts.played[mode];
    const rows = pre ? pre.rows : playGames({ mode, games, steps, seed: SEED, classes: opts.classes });
    out[mode] = rows;
    md.push(...report(D, rows, { mode, GAMES: games, STEPS: steps, SEED, ms: pre ? pre.ms : Date.now() - t0 }));
  }
  md.push(...ratioLines(out));
  if (!quiet) console.log(md.map((l, i) => (l.startsWith("|") ? alignRow(md, i) : l)).join("\n"));
  if (!quiet && process.env.GITHUB_STEP_SUMMARY) {
    try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join("\n") + "\n"); } catch { /* 書けなくても失敗にしない */ }
  }
  return out;
}

// 職業ごとの平均手番の、いちばん長い職業 ÷ いちばん短い職業
export function turnRatio(rows) {
  const m = rows.map((r) => mean(r.turns));
  return Math.max(...m) / Math.max(1, Math.min(...m));
}
function ratioLines(out) {
  const lines = ["", "### 職業の差（平均手番の 最長 ÷ 最短。目標は 1.5 倍以内）", ""];
  for (const [mode, rows] of Object.entries(out)) {
    const m = rows.map((r) => [(CLASS_NAME[r.cls] || r.cls), mean(r.turns)]).sort((a, b) => a[1] - b[1]);
    lines.push(`- ${MODE_NAME[mode]}：${turnRatio(rows).toFixed(2)} 倍（最短 ${m[0][0]} ${Math.round(m[0][1])}・最長 ${m[m.length - 1][0]} ${Math.round(m[m.length - 1][1])}）`);
  }
  lines.push("");
  return lines;
}
const MODE_NAME = { random: "ランダム", smart: "筋のよい遊び方" };
const CLASS_NAME = {};

// 職業ごとに games 回遊ばせて集計する。mode は random（できる行動から等確率）か smart（tests/bot.mjs）
// start を渡すと、その回から遊ぶ（前の回は別に遊んで mergeRows で足す。種は回ごとに決まっているので、分けても数字は同じ）
// globalThis.__played が配列なら、遊んだ結果をそこにも残す（tests/run.mjs が、q2 の遊んだ回を釣り合いの測定に使い回す）
export function playGames({ mode = "random", games = 400, steps = 500, seed = 0, classes: only, start = 0 } = {}) {
  const rows = playGames0({ mode, games, steps, seed, only, start });
  if (Array.isArray(globalThis.__played)) globalThis.__played.push({ mode, games, steps, seed, start, rows });
  return rows;
}

// playGames と同じ数字を、職業ごと・回の途中で分けて働き手（tests/worker.mjs）に遊ばせて出す。全部の職業の行を返す
// 種は職業ごと・回ごとに決まっているので、分けても一度に遊んだときと同じ（tests/checks/qt1_split.mjs）。
// globalThis.__played が配列なら、足し終えた結果を一つにまとめてそこに残す（run.mjs が釣り合いの表に使い回す）
// jobs は働き手の数（既定は BALANCE_JOBS か JOBS かコアの数。1 なら働き手を使わずにここで遊ぶ）。chunk は一つの仕事で遊ぶ回数（既定は下の CHUNK）
// T2：globalThis.__preplayed（Map：splitKey → 遊んだ行）に先に遊んだ回があれば、それを使って遊び直さない。
//   tests/run.mjs が q2 の回を、ほかの checks と同じ並びの仕事として先に遊ばせておく（働き手の中でさらに働き手を起こさない）。種も回も同じなので数字は変わらない
const CHUNK = { random: 100, smart: 10 };
export function splitTasks({ mode = "random", games = 400, steps = 500, seed = 0, classes, chunk } = {}) {
  const n = chunk || CHUNK[mode] || games;
  return classes.flatMap((cls) => Array.from({ length: Math.ceil(games / n) }, (_, k) => ({ kind: "balance", mode, steps, seed, cls, start: k * n, games: Math.min(games, (k + 1) * n) })));
}
export const splitKey = (t) => JSON.stringify([t.mode, t.steps, t.seed, t.cls, t.start || 0, t.games]);
export async function playSplit({ mode = "random", games = 400, steps = 500, seed = 0, classes: only, jobs, chunk } = {}) {
  const classes = only || Object.keys(loadEngine().data.CLASSES);
  const all = splitTasks({ mode, games, steps, seed, classes, chunk });
  const pre = globalThis.__preplayed instanceof Map ? globalThis.__preplayed : new Map();
  const parts = all.map((t) => pre.get(splitKey(t)));
  const tasks = all.filter((_, i) => !parts[i]);
  const at = all.map((_, i) => i).filter((i) => !parts[i]);
  const J = Math.max(1, Math.min(tasks.length, jobs ?? Number(process.env.BALANCE_JOBS || process.env.JOBS || availableParallelism())));
  const keep = globalThis.__played;
  const t0 = Date.now();
  if (!tasks.length) { /* 全部先に遊んであった */ }
  else if (J === 1) {
    globalThis.__played = null;
    try { tasks.forEach((t, i) => { parts[at[i]] = playGames({ ...t, classes: [t.cls] }); }); } finally { globalThis.__played = keep; }
  } else {
    // 小分けにした仕事を、働き手が数え札で取り合う（tests/worker.mjs の drain）
    const counter = new Int32Array(new SharedArrayBuffer(4));
    const errors = [];
    await Promise.all(Array.from({ length: J }, () => new Promise((resolve) => {
      const w = new Worker(new URL("./worker.mjs", import.meta.url), { workerData: { tasks, counter: counter.buffer } });
      w.on("message", (m) => { if (m.end) w.terminate(); else if (m.data && m.data.error) errors.push(m.data.error); else parts[at[m.i]] = m.data; });
      w.on("error", (e) => errors.push(String(e.stack || e)));
      w.on("exit", resolve);
    })));
    if (errors.length) throw new Error(errors[0]);
    if (parts.some((p) => !p)) throw new Error(`${mode}: 働き手から返ってこなかった回がある`);
  }
  const rows = [];
  all.forEach((t, i) => {
    for (const r of parts[i]) {
      const at = rows.findIndex((x) => x.cls === r.cls);
      if (at < 0) rows.push(r);
      else rows[at] = mergeRows(rows[at], r);
    }
  });
  if (Array.isArray(globalThis.__played)) globalThis.__played.push({ mode, games, steps, seed, start: 0, classes: only || null, rows, ms: Date.now() - t0 });
  return rows;
}

// 同じ職業の、続きの回の集計を足す（a の回が先。並びも一度に遊んだときと同じになる）
export function mergeRows(a, b) {
  const r = { ...a };
  for (const k of ["games", "deaths", "errors", "days", "places", "bossKills", "bossRuns", "bossMet", "kills"]) r[k] = a[k] + b[k];
  for (const k of ["turns", "deathTurns"]) r[k] = [...a[k], ...b[k]];
  for (const k of ["causes", "visited", "diedAt", "bossNames", "bossDown", "milestones"]) {
    r[k] = { ...a[k] };
    for (const [x, n] of Object.entries(b[k])) r[k][x] = (r[k][x] || 0) + n;
  }
  return r;
}

function playGames0({ mode, games, steps, seed, only, start }) {
  const G = loadEngine();
  const D = G.data;
  const classes = Object.keys(D.CLASSES);
  classes.forEach((k) => { CLASS_NAME[k] = D.CLASSES[k].name; });
  const goals = Object.keys(D.GOALS).filter((k) => D.GOALS[k].text); // 果たす中身のある目的だけ（自分で決める・目的なしは除く。R7c）
  return classes.map((cls, ci) => {
    const r = { cls, games: 0, deaths: 0, errors: 0, turns: [], deathTurns: [], days: 0, places: 0, bossKills: 0, bossRuns: 0, bossMet: 0, kills: 0, causes: {}, visited: {}, diedAt: {}, bossNames: {}, bossDown: {}, milestones: {} };
    if (only && !only.includes(cls)) return r;
    for (let i = start; i < games; i++) {
      // 職業ごとに別の範囲の種を使う（職業を足しても他の職業の数字が変わらないように）
      G.rand = seeded(100000 + seed * 1000000 + ci * 10000 + i);
      G.P = { trophies: {}, graves: [] };
      // 作成画面（src/ui/setup.js）と同じ振り方（G.cre.quickStats。S2）。ボーナス点は均等に配る
      const { stats, caps } = G.cre.quickStats(cls, G.rand);
      G.newGame({ cls, stats, caps, goal: goals[i % goals.length], profile: { name: "測定", sex: "男", age: 20, history: "測定用", personality: "無口" } });
      const bot = mode === "smart" ? makeSmartBot(G) : null;
      let met = false;
      try {
        for (let step = 0; step < steps && !G.S.over; step++) {
          let id;
          if (bot) id = bot.choose();
          else {
            const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
            id = acts.length ? acts[Math.floor(G.rand() * acts.length)].id : null;
          }
          if (!id) break;
          const C = G.S.combat;
          const bossesBefore = G.S.counters.bosses;
          G.act(id);
          if (C && C.boss && G.S.counters.bosses > bossesBefore) C.foes.filter((f) => D.ENEMIES[f.id].boss).forEach((f) => { r.bossDown[f.id] = (r.bossDown[f.id] || 0) + 1; });
          if (!met && G.S.combat && G.S.combat.boss) { met = true; const b = G.S.combat.foes.find((f) => D.ENEMIES[f.id].boss); if (b) r.bossNames[b.id] = (r.bossNames[b.id] || 0) + 1; }
        }
      } catch {
        r.errors++; // 例外は tests/run.mjs の 2 が拾う。ここでは数えるだけ
        continue;
      }
      const S = G.S;
      r.games++;
      r.turns.push(S.turn);
      r.days += S.day;
      r.kills += S.counters.kills;
      r.bossKills += S.counters.bosses;
      if (S.counters.bosses > 0) r.bossRuns++;
      if (met) r.bossMet++;
      for (const m of Object.keys((S.m6 && S.m6.reached) || {})) r.milestones[m] = (r.milestones[m] || 0) + 1;
      const v = Object.keys(S.visited || {});
      r.places += v.length;
      for (const id of v) r.visited[id] = (r.visited[id] || 0) + 1;
      if (S.over === "dead") {
        r.deaths++;
        r.deathTurns.push(S.turn);
        const cause = S.deathCause || "（不明）";
        r.causes[cause] = (r.causes[cause] || 0) + 1;
        r.diedAt[S.loc] = (r.diedAt[S.loc] || 0) + 1;
      }
    }
    return r;
  }).filter((r) => r.games || r.errors);
}

// ---------------------------------------------------------------- 表を組む（Markdown）
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// 平均の 95% の幅（± 1.96 × 標準誤差）。職業どうしの差が揺れより大きいかを見る目安
const ci95 = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a), v = a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1);
  return 1.96 * Math.sqrt(v / a.length);
};
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "-");
const f1 = (x) => x.toFixed(1);

function report(D, rows, { mode, GAMES, STEPS, SEED, ms }) {
  const name = (r) => D.CLASSES[r.cls].name;
  const out = [];
  out.push("");
  out.push(`## 釣り合いの測定：${MODE_NAME[mode]}（職業ごとに ${GAMES} 回・1回 ${STEPS} 行動まで・種 ${SEED}・${(ms / 1000).toFixed(1)} 秒）`);
  out.push(mode === "smart"
    ? "tests/bot.mjs の遊び方（勝ち目を見積もって戦う・逃げる・宿で休む・装備を買う・鍛える・危険の低い所から）。手番は死ぬか打ち切られるまでの数。"
    : "ランダムな行動で遊んだ結果。手番は死ぬか打ち切られるまでの数。失敗にはしない。");
  out.push("");
  out.push("| 職業 | 死亡率 | 平均手番 | 死亡時の手番（中央値） | 平均日数 | 平均撃破 | ボス撃破（合計） | ボスを倒した回 | ボスに挑んだ回 | 平均到達地 |");
  out.push("|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|");
  for (const r of rows) {
    const n = r.games;
    out.push(`| ${name(r)} | ${pct(r.deaths, n)} | ${Math.round(mean(r.turns))} ±${Math.round(ci95(r.turns))} | ${Math.round(median(r.deathTurns))} | ${f1(r.days / (n || 1))} | ${f1(r.kills / (n || 1))} | ${r.bossKills} | ${pct(r.bossRuns, n)} | ${pct(r.bossMet, n)} | ${f1(r.places / (n || 1))} |`);
  }
  const errs = rows.reduce((a, r) => a + r.errors, 0);
  if (errs) out.push(`\n例外で止まった回 ${errs}（数字から除いた）`);
  const tally = (key, names) => rows.map((r) => {
    const t = Object.entries(r[key]).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${names(id)} ${n}`).join("・");
    return `- ${name(r)}：${t || "なし"}`;
  });
  out.push("");
  out.push("倒したボス（回数）");
  out.push(...tally("bossDown", (id) => (D.ENEMIES[id] ? D.ENEMIES[id].name : id)));
  out.push("");
  out.push("着いた節目（M6。回数）");
  out.push(...tally("milestones", (id) => { const m = D.M6 && D.M6.MILESTONES.find((x) => x.id === id); return m ? m.title : id; }));

  out.push("");
  out.push(`### 死因（上位 ${TOP_CAUSES}）`);
  out.push("");
  out.push("| 職業 | " + Array.from({ length: TOP_CAUSES }, (_, i) => `${i + 1}位`).join(" | ") + " |");
  out.push("|---|" + "---|".repeat(TOP_CAUSES));
  for (const r of rows) {
    const top = Object.entries(r.causes).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, TOP_CAUSES);
    const cells = Array.from({ length: TOP_CAUSES }, (_, i) => (top[i] ? `${top[i][0]}（${pct(top[i][1], r.deaths)}）` : "-"));
    out.push(`| ${name(r)} | ${cells.join(" | ")} |`);
  }
  out.push("");
  out.push("割合は、その職業で死んだ回のうち。");

  out.push("");
  out.push("### 到達した場所（その場所に一度でも着いた回の割合）と死んだ場所");
  out.push("");
  out.push("| 場所 | 種類 | 危険 | " + rows.map(name).join(" | ") + " | 死んだ数 |");
  out.push("|---|---|--:|" + "--:|".repeat(rows.length) + "--:|");
  const typeName = { town: "町", wild: "野外", dungeon: "迷宮" };
  const locs = Object.entries(D.LOCS).sort((a, b) => (a[1].danger || 0) - (b[1].danger || 0));
  for (const [id, L] of locs) {
    const died = rows.reduce((a, r) => a + (r.diedAt[id] || 0), 0);
    out.push(`| ${L.name} | ${typeName[L.type] || L.type} | ${L.danger || 0} | ${rows.map((r) => pct(r.visited[id] || 0, r.games)).join(" | ")} | ${died} |`);
  }
  out.push("");
  return out;
}

// 手元の端末で読みやすいように、表の列を見た目の幅でそろえる（全角は幅 2）
const width = (s) => [...s].reduce((a, ch) => a + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1), 0);
const cellsOf = (l) => l.slice(1, -1).split("|").map((c) => c.trim());
function alignRow(all, i) {
  // 同じ表（連続する | 行）の中で列幅をそろえる
  const line = all[i];
  let a = i, b = i;
  while (a > 0 && all[a - 1].startsWith("|")) a--;
  while (b < all.length - 1 && all[b + 1].startsWith("|")) b++;
  const table = all.slice(a, b + 1).map(cellsOf);
  const w = table[0].map((_, j) => Math.max(3, ...table.filter((_, k) => k !== 1).map((row) => width(row[j] || ""))));
  const sep = table[1];
  const cells = cellsOf(line);
  if (i === a + 1) return "|" + w.map((n, j) => (sep[j].endsWith(":") ? "-".repeat(n + 1) + ":" : "-".repeat(n + 2))).join("|") + "|";
  return "| " + cells.map((c, j) => {
    const pad = " ".repeat(Math.max(0, w[j] - width(c)));
    return sep[j]?.endsWith(":") ? pad + c : c + pad;
  }).join(" | ") + " |";
}

// 表だけ出す：遊び方ごとに働き手に分けて遊び、その結果で表を組む
if (process.argv[1] === fileURLToPath(import.meta.url) && process.env.BALANCE !== "0") {
  const played = {};
  for (const { mode, games, steps, seed } of balancePlan()) {
    const t0 = Date.now();
    const rows = await playSplit({ mode, games, steps, seed });
    played[mode] = { rows, ms: Date.now() - t0 };
  }
  measureBalance({ played });
}
