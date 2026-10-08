// R6：序盤の難しさを測る（数字を出すだけ。PR 本文の表の出どころ）
//   node tests/r6_probe.mjs              … 作りたての 5 職業で
//     1. D 級二匹（ゴブリン二匹・狼二匹・盗賊二人）と戦い、残った HP の割合（筋のよい遊び方の手で戦う）
//     2. 最初の 10 日の生存率（筋のよい遊び方・目的の道筋のボット〔おまかせ〕・でたらめ）と、出会った C 級以上の群れの数
//   GAMES=60 node tests/r6_probe.mjs
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";
import { makeBot, startRun } from "./bots.mjs";

const GAMES = Number(process.env.GAMES || 40);
const DAYS = 10;
const G = loadEngine();
const D = G.data;
const classes = Object.keys(D.CLASSES);
const pct = (n, d) => (d ? Math.round((n / d) * 100) + "%" : "-");
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const fresh = (cls, seed, goal = "majin") => {
  G.rand = seeded(seed);
  G.P = { trophies: {}, graves: [] };
  const { stats, caps } = G.cre.quickStats(cls, G.rand);
  G.newGame({ cls, stats, caps, goal, profile: { name: "測定", sex: "男", age: 20, history: "測定", personality: "無口" } });
  return G.S;
};

// ---- 1. D 級二匹
const PAIRS = [["goblin", "goblin"], ["wolf", "wolf"], ["bandit", "bandit"]];
// 手：smart は筋のよい遊び方（薬・急所・術・逃げる）、plain は初めての人の素直な手（薬も逃げるも使わない。
// 魔法使いは MP のあるうちは炎、破戒神官は傷が深ければ癒し、ほかは「攻撃」だけ）
const HANDS = { smart: "筋のよい手", plain: "素直な手" };
const plainHand = () => {
  const S = G.S;
  const can = (id) => G.actions().flatMap((x) => x.list).some((a) => a.id === id && !a.disabled);
  if (S.cls === "mage" && can("cb:fire")) return "cb:fire";
  if (S.cls === "priest" && S.hp < S.maxHp * 0.4 && can("cb:heal")) return "cb:heal";
  return "cb:attack";
};
console.log(`### D 級二匹（作りたて・職業ごとに組ごと ${GAMES} 回）`);
console.log("| 職業 | 組 | 手 | 残った HP（中央） | 半分以上残った | 死んだ | 逃げた |");
console.log("|---|---|---|---|---|---|---|");
if (process.env.ONLY !== "days") for (const cls of classes) {
  for (const pair of PAIRS) for (const hand of Object.keys(HANDS)) {
    const left = []; let half = 0, dead = 0, fled = 0;
    for (let i = 0; i < GAMES; i++) {
      const S = fresh(cls, 610000 + i * 17 + cls.length * 1000);
      const bot = hand === "smart" ? makeSmartBot(G) : { choose: plainHand };
      // 野で出会ったときと同じに（直す前のエンジンには G.r6 が無い）
      if (G.r6 && G.r6.wild) G.r6.wild(() => G.startCombat(pair.slice(), {})); else G.startCombat(pair.slice(), {});
      for (let s = 0; s < 80 && S.mode === "combat" && !S.over; s++) { const id = bot.choose(); if (!id) break; G.act(id); }
      if (S.over === "dead") { dead++; left.push(0); continue; }
      if ((S.combat && S.combat.foes || []).length && S.mode === "combat") continue;
      const r = S.hp / S.maxHp;
      left.push(r);
      if (r >= 0.5) half++;
      if (S.counters.kills < 2) fled++;
    }
    console.log(`| ${D.CLASSES[cls].name} | ${pair.map((x) => D.ENEMIES[x].name).join("・")} | ${HANDS[hand]} | ${Math.round(med(left) * 100)}% | ${pct(half, GAMES)} | ${dead} | ${fled} |`);
  }
}

// ---- 2. 最初の 10 日
const rank = (id) => (G.gradeRank ? G.gradeRank(G.gradeOf(id)) : 9);
const C = G.gradeRank ? G.gradeRank("C") : 0;
const MODES = {
  smart: (cls, i) => { fresh(cls, 620000 + i * 13 + cls.length * 1000); const b = makeSmartBot(G); return () => b.choose(); },
  goal: (cls, i) => { startRun(G, { goal: ["majin", "king", "sword", "rich", "custom"][i % 5], cls, seed: 630000 + i * 11 + cls.length * 1000, seeded }); const b = makeBot(G, G.S.goal.id || "majin"); return () => (b.step() ? "__done" : null); },
  random: (cls, i) => { fresh(cls, 640000 + i * 7 + cls.length * 1000); return () => { const a = G.actions().flatMap((x) => x.list).filter((x) => !x.disabled); return a.length ? a[Math.floor(G.rand() * a.length)].id : null; }; },
};
const NAME = { smart: "筋のよい遊び方", goal: "目的の道筋（おまかせ）", random: "でたらめ" };
console.log(`\n### 最初の ${DAYS} 日（作りたて・職業ごとに ${GAMES} 回）`);
console.log("| 遊び方 | 職業 | 10 日生きた | 死んだ（日） | C 級以上の出会い（野の戦い） |");
console.log("|---|---|---|---|---|");
if (process.env.ONLY !== "pairs") for (const mode of Object.keys(MODES)) {
  for (const cls of classes) {
    let alive = 0, hard = 0; const deadDays = [];
    for (let i = 0; i < GAMES; i++) {
      const next = MODES[mode](cls, i);
      const S = G.S;
      const day0 = S.day;
      const sc = G.startCombat;
      G.startCombat = (ids, opt) => {
        const r = sc(ids, opt);
        const c = G.S.combat;
        if (c && !(opt && opt.win) && !c.boss && c.foes.some((f) => rank(f.id) <= C)) hard++;
        return r;
      };
      try {
        for (let s = 0; s < 1500 && !G.S.over && G.S.day - day0 < DAYS; s++) {
          const id = next(); if (!id) break;
          if (id !== "__done") G.act(id);
        }
      } catch (e) { console.log("ERR", mode, cls, e.message); }
      G.startCombat = sc;
      if (G.S.over === "dead") deadDays.push(G.S.day - day0 + 1); else alive++;
    }
    console.log(`| ${NAME[mode]} | ${D.CLASSES[cls].name} | ${pct(alive, GAMES)} | ${deadDays.length ? deadDays.sort((a, b) => a - b).join("・") : "—"} | ${hard} |`);
  }
}
