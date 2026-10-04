// B5 の測り（PR の数字用・CI では動かさない）：node tests/b5_probe.mjs [smart|random] [回数]
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";
const mode = process.argv[2] || "smart", games = Number(process.argv[3] || 50), steps = mode === "smart" ? 800 : 500;
const G = loadEngine();
const D = G.data;
const t = { games: 0, compTurns: 0, joined: 0, falls: 0, deaths: 0, dooms: 0, heroDeaths: 0, allyHits: 0, heroHits: 0, turns: 0, ended: {} };
let cur = null;
const log0 = G.log;
G.log = (k, text, x) => { if (x && x.fx === "allydown") t.falls++; if (x && x.fx === "ally") t.allyHits++; if (x && x.fx === "hurt") t.heroHits++; return log0(k, text, x); };
const classes = Object.keys(D.CLASSES), goals = Object.keys(D.GOALS).filter((k) => k !== "custom");
for (let i = 0; i < games; i++) {
  const cls = classes[i % classes.length];
  G.rand = seeded(777000 + i);
  G.P = { trophies: {}, graves: [] };
  const { stats, caps } = G.cre.quickStats(cls, G.rand);
  G.newGame({ cls, stats, caps, goal: goals[i % goals.length], profile: { name: "測定", sex: "男", age: 20, history: "測定用", personality: "無口" } });
  const bot = mode === "smart" ? makeSmartBot(G) : null;
  const seen = new Set();
  for (let s = 0; s < steps && !G.S.over; s++) {
    let id;
    if (bot) id = bot.choose();
    else { const a = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled); id = a.length ? a[Math.floor(G.rand() * a.length)].id : null; }
    if (!id) break;
    G.act(id);
    const S = G.S;
    (S.companions || []).forEach((c) => seen.add(c.id || c.name));
    if (S.combat) t.compTurns += (S.companions || []).length;
  }
  const S = G.S;
  t.games++; t.turns += S.turn;
  t.joined += seen.size;
  t.deaths += S.m2 ? S.m2.counts.death : 0;
  if (S.over === "dead") t.heroDeaths++;
}
console.log(mode, JSON.stringify(t), `平均手番 ${Math.round(t.turns / t.games)}・仲間へ ${Math.round(100 * t.allyHits / Math.max(1, t.allyHits + t.heroHits))}%`);
