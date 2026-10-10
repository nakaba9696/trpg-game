// R13：振りの悪い主人公と良い主人公で、序盤の死に方が大きく違わないかを測る（筋のよいボット tests/bots.mjs）
//   node tests/r13_rolls.mjs [本数=60] [手数=600]
// 職業ごとに振り（G.cre.roll。作成画面と同じ、職業の下支えと埋め合わせ込み）を作り、合計の下の三割と上の三割で比べる
import { loadEngine, seeded } from "./lib.mjs";
import { makeBot } from "./bots.mjs";

// policy：bot（筋のよいボット）か rand（出ている行動から乱数で選ぶ。tests/run.mjs の 150 回と同じ遊び方）
export function runRolls(G, { n = 60, steps = 600, seed0 = 13000, raw = false, policy = "bot" } = {}) {
  const D = G.data, cre = G.cre;
  const out = [];
  const classes = Object.keys(D.CLASSES);
  for (let i = 0; i < n; i++) {
    const cls = classes[i % classes.length];
    G.rand = seeded(seed0 + i);
    G.P = { trophies: {}, graves: [] };
    const dr = { cls, ageBand: "prime", profile: {}, bonus: {}, rolls: 0 };
    if (raw && G.r13) G.r13.off = true;
    cre.roll(dr, G.rand);
    cre.autoBonus(dr, false);
    if (G.r13) G.r13.off = false;
    const total = cre.baseTotal(dr);
    const extra = raw ? {} : (cre.r13Options ? cre.r13Options(dr) : {});
    G.newGame(Object.assign({ cls, stats: cre.final(dr), caps: cre.caps(dr), goal: "custom", goalText: "自分の店を持つ",
      profile: { name: "ボット", sex: "女", age: 24, history: "", personality: "無口" } }, extra));
    const bot = policy === "bot" ? makeBot(G, "custom") : null;
    const randStep = () => {
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) return false;
      G.act(G.pick(acts).id);
      return true;
    };
    let k = 0, fights = 0, rounds = 0, low = 0, was = false;
    for (; k < steps && !G.S.over; k++) {
      if (!(bot ? bot.step() : randStep())) break;
      const S = G.S, c = S.mode === "combat";
      if (c) { rounds++; if (!was) fights++; }
      was = c;
      if (S.hp > 0 && S.hp < S.maxHp * 0.25) low++;
    }
    out.push({ cls, total, short: (dr.r13 && dr.r13.short) || 0, dead: G.S.over === "dead", day: G.S.day, steps: k, rpf: fights ? rounds / fights : 0, low });
  }
  return out;
}

export function compare(rows) {
  const by = {};
  rows.forEach((r) => (by[r.cls] = by[r.cls] || []).push(r));
  const lo = [], hi = [];
  Object.values(by).forEach((list) => {
    list.sort((a, b) => a.total - b.total);
    const m = Math.max(1, Math.round(list.length * 0.3));
    lo.push(...list.slice(0, m)); hi.push(...list.slice(-m));
  });
  const avg = (l, f) => Math.round((l.reduce((a, r) => a + f(r), 0) / Math.max(1, l.length)) * 100) / 100;
  const pack = (l) => ({ n: l.length, total: avg(l, (r) => r.total), dead: avg(l, (r) => (r.dead ? 1 : 0)), deadDay: avg(l.filter((r) => r.dead), (r) => r.day), roundsPerFight: avg(l, (r) => r.rpf), lowHpSteps: avg(l, (r) => r.low) });
  return { lo: pack(lo), hi: pack(hi) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = +process.argv[2] || 60, steps = +process.argv[3] || 600, policy = process.argv[4] || "bot";
  // R13='{"PER":{"pts":2,"gold":15,"herb":1}}' のように、D.R13_ROLL を差し替えて比べられる。RAW=0 なら比べる元を省く
  for (const raw of process.env.RAW === "0" ? [false] : [true, false]) {
    const G = loadEngine();
    if (process.env.R13) Object.assign(G.data.R13_ROLL, JSON.parse(process.env.R13));
    const rows = runRolls(G, { n, steps, raw, policy });
    console.log(policy, raw ? "下支え・埋め合わせなし" : "あり", JSON.stringify(compare(rows)));
  }
}
