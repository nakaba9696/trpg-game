// S5：点の分布を測る（何日目にどのくらい伸びるか）。数字を出すだけ。PR 本文の表の出どころ
//   node tests/s5_probe.mjs            … 筋のよい遊び方 職業ごとに 10 回・行動 3000 まで
//   GAMES=20 STEPS=6000 node tests/s5_probe.mjs
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";

const GAMES = Number(process.env.GAMES || 10);
const STEPS = Number(process.env.STEPS || 3000);
const DAYS = [10, 30, 60, 120, 240, 480];
const G = loadEngine();
const D = G.data;
const pt = (v) => (G.s5 ? v : G.pt(v));
const rows = [];
for (const cls of Object.keys(D.CLASSES)) {
  const snap = Object.fromEntries(DAYS.map((d) => [d, []]));
  let dead = 0, deadEarly = 0, checks = 0, days = 0, bosses = 0;
  for (let i = 0; i < GAMES; i++) {
    G.rand = seeded(777000 + i * 31 + cls.length);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats(cls, G.rand);
    G.newGame({ cls, stats, caps, goal: "majin", profile: { name: "測定", sex: "男", age: 20, history: "測定", personality: "無口" } });
    const bot = makeSmartBot(G);
    let next = 0;
    try {
      for (let s = 0; s < STEPS && !G.S.over; s++) {
        const id = bot.choose(); if (!id) break;
        G.act(id);
        while (next < DAYS.length && G.S.day >= DAYS[next]) {
          const v = D.STATS.map((k) => pt(G.S.stats[k]));
          snap[DAYS[next]].push({ max: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length });
          next++;
        }
      }
    } catch (e) { console.log("ERR", cls, e.message); }
    if (G.S.over === "dead") { dead++; if (G.S.day <= 30) deadEarly++; }
    checks += G.S.counters.checks; days += G.S.day; bosses += G.S.counters.bosses;
  }
  const cell = (d) => { const a = snap[d]; if (!a.length) return "—"; const m = (k) => (a.reduce((x, y) => x + y[k], 0) / a.length).toFixed(0); return `${m("avg")}/${m("max")}（${a.length}）`; };
  rows.push(`| ${D.CLASSES[cls].name} | ${dead}/${GAMES}（30日以内 ${deadEarly}） | ${Math.round(days / GAMES)} | ${Math.round(checks / GAMES)} | ${bosses} | ${DAYS.map(cell).join(" | ")} |`);
}
console.log(`筋のよい遊び方 職業ごとに ${GAMES} 回・行動 ${STEPS} まで。点は「6 つの平均／いちばん高い能力値」（その日まで生きていた回の数）`);
console.log(`| 職業 | 死んだ回 | 平均日数 | 判定の回数 | ボス撃破 | ${DAYS.map((d) => d + "日目").join(" | ")} |`);
console.log(`|---|---|---|---|---|${DAYS.map(() => "---").join("|")}|`);
rows.forEach((r) => console.log(r));
