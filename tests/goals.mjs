// Q4：目的 5 つそれぞれの道筋を、筋のよいボット（tests/bots.mjs）で通しで遊んで確かめる。
// 目的ごと・職業ごとに決まった種で遊ばせ、目的の節目に着いた割合・着いた手番・死因などを表にする。
// 数字を出すだけで、テストの失敗にはしない（CI の確認は tests/checks/q4_goals.mjs）。
//   node tests/goals.mjs                 … 目的ごとに 100 回（職業 5 × 20）
//   GOALS_GAMES=40 node tests/goals.mjs  … 回数を変える
//   GOALS_ONLY=king node tests/goals.mjs … 目的を絞る
//   GOALS_STEPS=8000 …                   … 1 回の行動の上限（既定 6000）
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEngine, seeded } from "./lib.mjs";
import { makeBot, startRun } from "./bots.mjs";

export function playGoal(G, goal, cls, seed, { steps = 6000, save = 0, strong = false } = {}) {
  startRun(G, { goal, cls, seed, seeded, strong });
  const bot = makeBot(G, goal, { endAtGoal: true });
  let n = 0;
  for (; n < steps; n++) {
    if (save && n % save === save - 1) G.S = JSON.parse(JSON.stringify(G.S)); // 保存して読み込む
    if (!bot.step()) break;
  }
  const S = G.S;
  return { goal, cls, seed, S, info: bot.info, steps: n, reached: !!bot.info.reached, over: S.over, ending: S.ending && S.ending.id, story: !!S.story, bot };
}

export function measureGoals(opts = {}) {
  const GAMES = opts.games ?? Number(process.env.GOALS_GAMES || 100);
  const STEPS = opts.steps ?? Number(process.env.GOALS_STEPS || 6000);
  const STRONG = opts.strong ?? process.env.GOALS_STRONG === "1";
  const only = process.env.GOALS_ONLY ? process.env.GOALS_ONLY.split(",") : null;
  const G = loadEngine();
  const D = G.data;
  const classes = Object.keys(D.CLASSES);
  const goals = Object.keys(D.GOALS).filter((g) => !only || only.includes(g));
  const t0 = Date.now();
  const rows = [];
  for (const [gi, goal] of goals.entries()) {
    const r = { goal, games: 0, reached: 0, ended: 0, story: 0, dead: 0, timeout: 0, turns: [], days: [], deathTurns: [], causes: {}, byCls: {}, stuck: 0, errors: 0, fame: 0, gold: 0, stage: {} };
    for (let i = 0; i < GAMES; i++) {
      const cls = classes[i % classes.length];
      const seed = 500000 + gi * 10000 + i;
      let res;
      try { res = playGoal(G, goal, cls, seed, { steps: STEPS, strong: STRONG }); }
      catch (e) { r.errors++; if (r.errors <= 3) console.log(`例外 ${goal} ${cls} ${seed}: ${e.stack}`); continue; }
      const S = res.S;
      r.games++;
      const bc = (r.byCls[cls] = r.byCls[cls] || { n: 0, ok: 0 });
      bc.n++;
      r.stuck += res.info.stuck;
      r.fame += S.fame; r.gold += S.gold;
      const st = stageOf(goal, S);
      r.stage[st] = (r.stage[st] || 0) + 1;
      if (res.reached) { r.reached++; bc.ok++; r.turns.push(res.info.reachedTurn); r.days.push(res.info.reachedDay); }
      if (S.over === "end" && res.reached) r.ended++;
      if (S.over && S.story) r.story++;
      if (S.over === "dead") { r.dead++; r.deathTurns.push(S.turn); const c = S.deathCause || "?"; r.causes[c] = (r.causes[c] || 0) + 1; }
      if (!S.over) r.timeout++;
    }
    rows.push(r);
  }
  const md = report(D, rows, { GAMES, STEPS, ms: Date.now() - t0 });
  console.log(md.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) { try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join("\n") + "\n"); } catch {} }
  return rows;
}

// どこまで進んだか（届かなかった回の見立て用）
function stageOf(goal, S) {
  const blade = ["volgrim", "byakuya"].some((k) => (S.inv && S.inv[k]) || S.weapon === k);
  if (goal === "king") return S.title || "無位";
  if (goal === "sword") return blade ? "剣" : S.visited.onigashima ? "鬼ヶ島に着いた" : S.visited.yakumo ? "八雲に着いた" : "大陸";
  if (goal === "majin") return S.flags.graw ? "討った" : S.visited.majincastle ? "居城に着いた" : blade ? "剣" : "剣なし";
  if (goal === "rich") return S.gold >= 10000 ? "10000G" : S.gold >= 3000 ? "3000G〜" : S.gold >= 1000 ? "1000G〜" : "〜1000G";
  return S.day >= 30 ? "30日〜" : "〜30日";
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "-");

function report(D, rows, { GAMES, STEPS, ms }) {
  const out = [];
  const classes = Object.keys(D.CLASSES);
  out.push("");
  out.push(`## 目的の道筋（目的ごとに ${GAMES} 回・職業は順番に・1 回 ${STEPS} 行動まで・${(ms / 1000).toFixed(1)} 秒）`);
  out.push("筋のよいボット（tests/bots.mjs）で遊んだ結果。到達 = 目的の節目で尋ねられた。手番は節目に着いたときの S.turn。");
  out.push("");
  out.push("| 目的 | 到達率 | 平均手番 | 手番（中央値） | 平均日数 | 終えて物語が出た | 死亡 | 打ち切り | " + classes.map((c) => D.CLASSES[c].name).join(" | ") + " |");
  out.push("|---|--:|--:|--:|--:|--:|--:|--:|" + "--:|".repeat(classes.length));
  for (const r of rows) {
    out.push(`| ${D.GOALS[r.goal].name} | ${pct(r.reached, r.games)} | ${Math.round(mean(r.turns))} | ${Math.round(median(r.turns))} | ${Math.round(mean(r.days))} | ${pct(r.ended, r.reached)} | ${pct(r.dead, r.games)} | ${pct(r.timeout, r.games)} | ${classes.map((c) => (r.byCls[c] ? pct(r.byCls[c].ok, r.byCls[c].n) : "-")).join(" | ")} |`);
  }
  out.push("");
  out.push("| 目的 | 届かなかった回の内訳（最後に居た段階） | 死因（上位 3） | 例外 |");
  out.push("|---|---|---|--:|");
  for (const r of rows) {
    const st = Object.entries(r.stage).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join("・");
    const top = Object.entries(r.causes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}（${v}）`).join("・") || "-";
    out.push(`| ${D.GOALS[r.goal].name} | ${st} | ${top} | ${r.errors} |`);
  }
  out.push("");
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) measureGoals();
