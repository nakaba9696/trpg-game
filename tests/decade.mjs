// R11：十年を通して遊ぶ測定（CI では動かさない。`node tests/decade.mjs [本数] [年数]`）。
// 筋のよい遊び方（tests/bot.mjs）に、日が進まなくなったら宿・野営・旅に出る手を足したボットで、職業を巡って回す。
// 戦いで倒れたら、その場で HP を戻して町から続ける（正気の減り方を十年ぶん見るため）。正気が尽きたら、そこで数えて正気を 50 に戻して続ける。
// 出すもの：正気で倒れた本数（一度でも尽きた本数）・年末の正気の分布・正気の減った理由の合計（G.r11m.tally）。
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";

const RUNS = Number(process.argv[2] || 10);
const YEARS = Number(process.argv[3] || 10);
const SEED = Number(process.env.SEED || 7);

const G = loadEngine();
const D = G.data;
const classes = Object.keys(D.CLASSES);
const goals = Object.keys(D.GOALS).filter((k) => D.GOALS[k].text);
const why = {};
const out = [];
for (let i = 0; i < RUNS; i++) {
  const cls = classes[i % classes.length];
  G.rand = seeded(SEED * 100000 + i);
  G.P = { trophies: {}, graves: [] };
  const { stats, caps } = G.cre.quickStats(cls, G.rand);
  G.newGame({ cls, stats, caps, goal: goals[i % goals.length], profile: { name: "測定", sex: "男", age: 20, history: "", personality: "無口" } });
  const S0 = G.S;
  const bot = makeSmartBot(G);
  const r = { cls, mad: 0, madYear: null, died: 0, years: [], low: 100 };
  // 倒れても続ける
  const die0 = G.die, end0 = G.m5End;
  G.die = (cause) => { const S = G.S; r.died++; S.hp = S.maxHp; S.conds = []; if (!S.combat) { S.event = null; S.mode = "explore"; S.depth = 0; S.loc = D.CLASSES[S.cls].start; } };   // 戦いの途中は HP だけ戻す（戦いの片付けは戦いの側で）
  G.m5End = (kind) => { const S = G.S; if (kind === "mad") { r.mad++; if (r.madYear == null) r.madYear = G.calYi(S.day) + 1; S.sanity = 50; } else { S.beast = 0; } };
  let lastDay = 0, still = 0, steps = 0;
  try {
    while (G.S.day <= YEARS * G.YEAR_DAYS && steps < YEARS * 9000) {
      steps++;
      const S = G.S;
      if (S.over) break;
      let id = bot.choose();
      if (S.day === lastDay) still++; else { still = 0; lastDay = S.day; }
      if (still > 60 && S.mode !== "combat" && S.mode !== "event") {
        const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
        const f = ["inn:rest", "fac:inn", "camp", "back", "leave"].find((x) => acts.some((a) => a.id === x));
        id = f || (acts.find((a) => /^travel:|^sail:/.test(a.id)) || acts[0] || {}).id;
      }
      if (!id) break;
      const y0 = G.calYi(S.day);
      G.act(id);
      r.low = Math.min(r.low, G.sanityOf(G.S));
      const y1 = G.calYi(G.S.day);
      if (y1 > y0) for (let y = y0; y < y1; y++) r.years.push(G.sanityOf(G.S));
    }
  } catch (e) { r.error = String(e && e.stack || e).split("\n").slice(0, 3).join(" | "); }
  G.die = die0; G.m5End = end0;
  const W = (G.r11m && G.r11m.tally) || {};
  r.why = Object.entries(W).sort((a, b) => a[1] - b[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join("・");
  for (const [k, v] of Object.entries(W)) why[k] = (why[k] || 0) + v;
  if (G.r11m) G.r11m.tally = {};
  r.day = G.S.day; r.over = G.S.over || "";
  out.push(r);
  console.log(`${i} ${cls}: 正気で尽きた ${r.mad} 回（初めて ${r.madYear ?? "-"} 年目）・戦いで倒れた ${r.died}・最低 ${r.low}・年末 ${r.years.join(",")}・減った理由 ${r.why}${r.error ? " 例外 " + r.error : ""}`);
}
const madRuns = out.filter((r) => r.mad).length;
console.log(`\n${RUNS} 本・${YEARS} 年：正気が尽きた本数 ${madRuns}（${Math.round((100 * madRuns) / RUNS)}％）`);
for (let y = 0; y < YEARS; y++) {
  const v = out.map((r) => r.years[y]).filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) continue;
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  console.log(`${y + 1} 年目の末：最小 ${v[0]}・下位四分の一 ${q(0.25)}・中央 ${q(0.5)}・上位四分の一 ${q(0.75)}・最大 ${v[v.length - 1]}（${v.length} 本）`);
}
const tot = Object.values(why).reduce((a, b) => a + b, 0);
if (tot) console.log("\n減った理由（合計）：" + Object.entries(why).sort((a, b) => a[1] - b[1]).map(([k, v]) => `${k} ${v}`).join("・"));
