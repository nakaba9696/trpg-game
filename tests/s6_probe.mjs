// S6：遊び方の偏りを測る（数字を出すだけ）。PR 本文の表の出どころ
//   node tests/s6_probe.mjs   … 筋のよい遊び方（tests/bot.mjs）とランダムで、判定に使った能力値の割合・よく出た出来事・選んだ選択肢
//   GAMES=20 STEPS=1500 node tests/s6_probe.mjs
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";

const GAMES = Number(process.env.GAMES || 20);
const STEPS = Number(process.env.STEPS || 1500);
const G = loadEngine();
const D = G.data;
const out = {};
// 判定を数える（G.check を包む。記録は 240 行で切られるので、記録からは数えない）
let counting = null;
const check0 = G.check;
G.check = (stat, ...a) => { if (counting && stat) counting[stat] = (counting[stat] || 0) + 1; return check0(stat, ...a); };
for (const mode of ["smart", "random"]) {
  const use = {}, grow = {}, seen = {}, picked = {};
  let evChoices = 0, bestPick = 0;
  for (const cls of Object.keys(D.CLASSES)) {
    for (let i = 0; i < GAMES; i++) {
      G.rand = seeded(606000 + i * 37 + cls.length);
      G.P = { trophies: {}, graves: [] };
      const { stats, caps } = G.cre.quickStats(cls, G.rand);
      G.newGame({ cls, stats, caps, goal: "custom", goalText: "測る", profile: { name: "測定", sex: "男", age: 20, history: "測定", personality: "無口" } });
      const start = { ...G.S.stats };
      const bot = mode === "smart" ? makeSmartBot(G) : null;
      try {
        for (let s = 0; s < STEPS && !G.S.over; s++) {
          let id;
          if (bot) id = bot.choose();
          else { const a = G.actions().flatMap((x) => x.list).filter((x) => !x.disabled); id = a.length ? a[Math.floor(G.rand() * a.length)].id : null; }
          if (!id) break;
          if (G.S.mode === "event" && id.startsWith("ev:")) {
            const e = D.EVENTS.find((x) => x.id === G.S.event);
            seen[e.id] = (seen[e.id] || 0) + 1;
            const cs = G.eventChoices().filter(({ c }) => c.stat);
            if (cs.length >= 2) {
              evChoices++;
              const ch = cs.map(({ c, i }) => ({ i, p: G.chance(c.stat, G.s5EventDiff(c.diff), c.bonus ? G.gearBonus(c.bonus) : 0) }));
              const best = ch.reduce((a, b) => (b.p > a.p ? b : a));
              if (Number(id.slice(3)) === best.i) bestPick++;
            }
          }
          counting = use;
          G.act(id);
          counting = null;
        }
      } catch (e) { console.log("ERR", e.message); }
      D.STATS.forEach((k) => { grow[k] = (grow[k] || 0) + Math.max(0, G.S.stats[k] - start[k]); });
    }
  }
  const pct = (o) => D.STATS.map((k) => `${k} ${Math.round((100 * (o[k] || 0)) / Math.max(1, D.STATS.reduce((a, x) => a + (o[x] || 0), 0)))}%`).join("・");
  out[mode] = { use: pct(use), grow: pct(grow), best: evChoices ? Math.round((100 * bestPick) / evChoices) : 0, top: Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 40) };
  console.log(`## ${mode}（職業ごとに ${GAMES} 回・${STEPS} 行動）`);
  console.log(`判定に使った能力値：${out[mode].use}`);
  console.log(`伸びた点の内訳：${out[mode].grow}`);
  console.log(`判定のある選択肢が 2 つ以上の出来事で、いちばん成功率の高いものを選んだ割合：${out[mode].best}%（${evChoices} 回）`);
}
if (process.env.TOP) console.log("よく出た出来事：" + out.random.top.concat(out.smart.top).map(([id, n]) => `${id} ${n}`).join("・"));
