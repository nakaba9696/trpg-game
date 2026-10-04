// Q8：序盤の死にやすさの測定。新しい人物（作成と同じ振り方）で、出発地の近くで戦う遊び方を何度も回し、
// 最初の何戦で死ぬか・死んだときの手番と日数を数える。tests/checks/q8_early.mjs が軽い回数で使う。
//   node tests/early.mjs                … 表を出す（職業ごとに 200 回・1 回 300 行動まで）
//   EARLY_GAMES=500 EARLY_STEPS=400 …   … 回数・行動の上限
//   EARLY_MODES=reckless,smart …        … 遊び方を選ぶ
// 遊び方（乱数は G.rand だけ。同じ種なら同じ数字）：
//   smart     … tests/bot.mjs の筋のよい遊び方（勝ち目を見積もる・逃げる・宿で休む・危険の低い所から）
//   reckless  … 人がやりがちな「とにかく戦う」。いちばん近い野（危険度の低い順）で探索を続け、戦いでは逃げずに殴る
//               （魔法使いは MP があれば炎・尽きたら魔力の水、破戒神官は傷が深ければ癒し）。HP が 35% を切ったら薬、4 割を切ったら野営、町では 6 割を切ったら宿。
//               出来事の選択肢はでたらめに選ぶ
//   careful   … reckless と同じく戦い続けるが、危険度 1 までの野だけで遊び、選択肢の横の「命がけ」は避ける（危険の知らせを読む人）
//   wander    … 行き先をでたらめに選んで旅を続ける（危険度の高い所へも行く。無謀な遊び方の目安）
import { fileURLToPath } from "node:url";
import { loadEngine, seeded } from "./lib.mjs";
import { makeSmartBot } from "./bot.mjs";

// いちばん近い（町だけを通って行ける）条件に合う場所への、次の一歩
function nextToward(G, ok) {
  const D = G.data;
  const from = G.S.loc;
  const prev = { [from]: null };
  const q = [from];
  while (q.length) {
    const u = q.shift();
    const L = D.LOCS[u];
    if (u !== from && ok(L)) { let v = u; while (prev[v] !== from) v = prev[v]; return "travel:" + v; }
    for (const v of Object.keys(L.links || {})) if (!(v in prev) && (D.LOCS[v].type === "town" || ok(D.LOCS[v]))) { prev[v] = u; q.push(v); }
  }
  return null;
}

export function makeEarlyBot(G, mode) {
  if (mode === "smart") return makeSmartBot(G);
  const D = G.data;
  const wander = mode === "wander", careful = mode === "careful";
  const pickR = (list) => list[Math.floor(G.rand() * list.length)];
  return { choose() {
    const S = G.S;
    const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
    const has = (id) => acts.some((a) => a.id === id);
    if (!acts.length) return null;
    if (S.mode === "combat") {
      if (S.hp < S.maxHp * 0.35) { const h = acts.find((a) => /^cb:item:(potion|herb|riceball|jerky)/.test(a.id)); if (h) return h.id; }
      if (S.cls === "priest" && S.hp < S.maxHp * 0.5 && has("cb:heal")) return "cb:heal";
      if (S.cls === "mage" && has("cb:fire")) return "cb:fire";
      if (S.mp < 3 && S.maxMp >= 6) { const m = acts.find((a) => a.id === "cb:item:manawater"); if (m) return m.id; }
      return has("cb:attack") ? "cb:attack" : acts[0].id;
    }
    if (S.mode === "event") {
      const ok = careful ? acts.filter((a) => !/命がけ/.test(a.sub || "")) : acts;
      return pickR(ok.length ? ok : acts).id;
    }
    if (S.mode === "fac") return S.fac === "inn" && has("inn:rest") && S.hp < S.maxHp ? "inn:rest" : has("back") ? "back" : acts[0].id;
    const L = G.loc();
    const travel = acts.filter((a) => a.id.startsWith("travel:"));
    if (L.type === "town") {
      if (S.hp < S.maxHp * 0.6 && has("fac:inn") && S.gold >= 10) return "fac:inn";
      if (!travel.length) return acts[0].id;
      if (wander) return pickR(travel).id;
      if (careful) return nextToward(G, (T) => T.type === "wild" && T.danger <= 1) || travel[0].id;
      const wild = travel.map((a) => [a, D.LOCS[a.id.slice(7)]]).filter(([, T]) => T.type === "wild").sort((x, y) => x[1].danger - y[1].danger);
      return (wild[0] || [travel[0]])[0].id;
    }
    if (L.type === "wild") {
      if (wander && travel.length && G.rand() < 0.5) return pickR(travel).id;
      if (careful && L.danger > 1) return nextToward(G, (T) => T.type === "wild" && T.danger <= 1) || travel[0].id;
      return S.hp < S.maxHp * 0.4 ? "camp" : "explore";
    }
    const out = acts.find((a) => a.id === "leave") || travel[0];
    return (out || acts[0]).id;
  } };
}

// 職業ごとに games 回遊ばせる。fights は戦いの始まった数（出来事の戦いも数える）
export function playEarly({ mode = "reckless", games = 200, steps = 300, seed = 0, classes: only } = {}) {
  const G = loadEngine();
  const D = G.data;
  const goals = Object.keys(D.GOALS).filter((k) => k !== "custom");
  return Object.keys(D.CLASSES).filter((c) => !only || only.includes(c)).map((cls, ci) => {
    const r = { cls, games: 0, deaths: 0, dead5: 0, dead10: 0, fightsAtDeath: [], turnsAtDeath: [], daysAtDeath: [], turns: [], causes: {} };
    for (let i = 0; i < games; i++) {
      G.rand = seeded(777000 + seed * 1000000 + ci * 10000 + i);
      G.P = { trophies: {}, graves: [] };
      const { stats, caps } = G.cre.quickStats(cls, G.rand);
      G.newGame({ cls, stats, caps, goal: goals[i % goals.length], profile: { name: "測定", sex: "男", age: 20, history: "測定用", personality: "無口" } });
      const bot = makeEarlyBot(G, mode);
      let fights = 0;
      for (let s = 0; s < steps && !G.S.over; s++) {
        const was = !!G.S.combat;
        const id = bot.choose();
        if (!id) break;
        G.act(id);
        if (!was && G.S.combat) fights++;
      }
      const S = G.S;
      r.games++;
      r.turns.push(S.turn);
      if (S.over === "dead") {
        r.deaths++;
        if (fights <= 5) r.dead5++;
        if (fights <= 10) r.dead10++;
        r.fightsAtDeath.push(fights);
        r.turnsAtDeath.push(S.turn);
        r.daysAtDeath.push(S.day);
        r.causes[S.deathCause] = (r.causes[S.deathCause] || 0) + 1;
      }
    }
    return r;
  });
}

export const sum = (rows, k) => rows.reduce((a, r) => a + (Array.isArray(r[k]) ? r[k].length : r[k]), 0);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "-");

export function earlyReport(mode, rows, { games, steps }) {
  const all = (k) => rows.flatMap((r) => r[k]);
  const n = sum(rows, "games");
  const out = [`\n## 序盤の死にやすさ：${mode}（職業ごとに ${games} 回・1 回 ${steps} 行動まで）`, ""];
  out.push(`- 全体：5 戦以内に死ぬ ${pct(sum(rows, "dead5"), n)}・10 戦以内 ${pct(sum(rows, "dead10"), n)}・${steps} 行動までに死ぬ ${pct(sum(rows, "deaths"), n)}・平均の生存手番 ${Math.round(mean(all("turns")))}`);
  out.push(`- 死んだとき（中央値）：${median(all("fightsAtDeath"))} 戦目・${median(all("turnsAtDeath"))} 手番・${median(all("daysAtDeath"))} 日目`);
  out.push("", "| 職業 | 5 戦以内 | 10 戦以内 | 死亡 | 平均手番 | 死因（上位 3） |", "|---|--:|--:|--:|--:|---|");
  for (const r of rows) {
    const top = Object.entries(r.causes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, k]) => `${c} ${k}`).join("・");
    out.push(`| ${r.cls} | ${pct(r.dead5, r.games)} | ${pct(r.dead10, r.games)} | ${pct(r.deaths, r.games)} | ${Math.round(mean(r.turns))} | ${top || "-"} |`);
  }
  return out.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const games = Number(process.env.EARLY_GAMES || 200), steps = Number(process.env.EARLY_STEPS || 300);
  for (const mode of (process.env.EARLY_MODES || "smart,careful,reckless,wander").split(",")) {
    console.log(earlyReport(mode, playEarly({ mode, games, steps, seed: Number(process.env.EARLY_SEED || 0) }), { games, steps }));
  }
}
