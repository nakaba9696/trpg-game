// 釣り合いの測定：職業ごとにランダムに遊ばせて、生存手番・死因・到達した場所・ボス撃破を表にする。
// 数字を出すだけで、テストの失敗にはしない（直すのは Q2）。
//   node tests/run.mjs                 … テストのあとに表を出す
//   node tests/balance.mjs             … 表だけ出す
//   BALANCE_GAMES=400 node tests/balance.mjs   … 職業ごとの回数（既定 400）
//   BALANCE_SEED=1 …                   … 乱数の出発点をずらす（揺れの確認用。既定 0）
//   BALANCE=0 node tests/run.mjs       … 測定を省く
// GitHub Actions では GITHUB_STEP_SUMMARY にも同じ表を書く。
//
// 遊び方は tests/run.mjs のランダムプレイと同じ（できる行動から等確率で選ぶ）が、
// 金や能力値の底上げはせず、キャラクター作成の画面と同じ振り方で始める。
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEngine, seeded } from "./lib.mjs";

const TOP_CAUSES = 3;

export function measureBalance(opts = {}) {
  if (process.env.BALANCE === "0") return null;
  const GAMES = opts.games ?? Number(process.env.BALANCE_GAMES || 400);
  const STEPS = opts.steps ?? Number(process.env.STEPS || 500);
  const SEED = opts.seed ?? Number(process.env.BALANCE_SEED || 0);
  const G = loadEngine();
  const D = G.data;
  const classes = Object.keys(D.CLASSES);
  const goals = Object.keys(D.GOALS).filter((k) => k !== "custom");
  const t0 = Date.now();

  const rows = classes.map((cls, ci) => {
    const r = { cls, games: 0, deaths: 0, errors: 0, turns: [], deathTurns: [], days: 0, places: 0, bossKills: 0, bossRuns: 0, kills: 0, causes: {}, visited: {}, diedAt: {} };
    for (let i = 0; i < GAMES; i++) {
      // 職業ごとに別の範囲の種を使う（職業を足しても他の職業の数字が変わらないように）
      G.rand = seeded(100000 + SEED * 1000000 + ci * 10000 + i);
      G.P = { trophies: {}, graves: [] };
      const c = D.CLASSES[cls];
      // 作成画面（src/ui/setup.js）と同じ振り方。ボーナス点は均等に配る
      const stats = {}, caps = {};
      D.STATS.forEach((k, j) => {
        stats[k] = Math.min(90, Math.max(5, c.base[k] + G.d(6) + G.d(6) + G.d(6) - 3));
        caps[k] = Math.min(99, Math.max(stats[k] + 10, stats[k] + 20 + G.d(10) + G.d(10) + G.d(10)));
        const bonus = Math.floor(D.BONUS_POINTS / D.STATS.length) + (j < D.BONUS_POINTS % D.STATS.length ? 1 : 0);
        stats[k] = Math.min(caps[k], stats[k] + bonus);
      });
      G.newGame({ cls, stats, caps, goal: goals[i % goals.length], profile: { name: "測定", sex: "男", age: 20, history: "測定用", personality: "無口" } });
      try {
        for (let step = 0; step < STEPS && !G.S.over; step++) {
          const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
          if (!acts.length) break;
          G.act(acts[Math.floor(G.rand() * acts.length)].id);
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
  });

  const md = report(D, rows, { GAMES, STEPS, SEED, ms: Date.now() - t0 });
  console.log(md.map((l, i) => (l.startsWith("|") ? alignRow(md, i) : l)).join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join("\n") + "\n"); } catch { /* 書けなくても失敗にしない */ }
  }
  return rows;
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

function report(D, rows, { GAMES, STEPS, SEED, ms }) {
  const name = (r) => D.CLASSES[r.cls].name;
  const out = [];
  out.push("");
  out.push(`## 釣り合いの測定（職業ごとに ${GAMES} 回・1回 ${STEPS} 行動まで・種 ${SEED}・${(ms / 1000).toFixed(1)} 秒）`);
  out.push("ランダムな行動で遊んだ結果。手番は死ぬか打ち切られるまでの数。失敗にはしない。");
  out.push("");
  out.push("| 職業 | 死亡率 | 平均手番 | 死亡時の手番（中央値） | 平均日数 | 平均撃破 | ボス撃破（合計） | ボスを倒した回 | 平均到達地 |");
  out.push("|---|--:|--:|--:|--:|--:|--:|--:|--:|");
  for (const r of rows) {
    const n = r.games;
    out.push(`| ${name(r)} | ${pct(r.deaths, n)} | ${Math.round(mean(r.turns))} ±${Math.round(ci95(r.turns))} | ${Math.round(median(r.deathTurns))} | ${f1(r.days / (n || 1))} | ${f1(r.kills / (n || 1))} | ${r.bossKills} | ${pct(r.bossRuns, n)} | ${f1(r.places / (n || 1))} |`);
  }
  const errs = rows.reduce((a, r) => a + r.errors, 0);
  if (errs) out.push(`\n例外で止まった回 ${errs}（数字から除いた）`);

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

if (process.argv[1] === fileURLToPath(import.meta.url)) measureBalance();
