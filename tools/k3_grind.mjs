// K3：「ひたすら稽古する遊び方」と「ふつうに冒険する遊び方」を比べる（持ち主「一人で街の外に出てひたすら稽古していればどんどん覚えるから、それが最適ムーブになっている」）
// node tools/k3_grind.mjs [リポジトリの根（省くとここ）]　MODES=grind,adv,town,adv2 で遊び方を選ぶ（CI では動かさない）
//   grind 野営でひたすら稽古（荒野で稽古と野営だけ。襲われたら筋のよいボットで戦う）・adv ふつうに冒険（筋のよいボット）
//   town 町でひたすら鍛える（訓練場で能力値か技を鍛え、傷ついたら宿。はじめに +600G）・adv2 ふつうに冒険（はじめに +600G）
// それぞれ 30 回・400 行動。覚えた戦技・スキル・術の数、能力値の伸び、死亡、生き残った体で黒騎士と 12 回戦った勝率
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { loadEngine, seeded } = await import(root + "/tests/lib.mjs");
const { makeSmartBot } = await import(root + "/tests/bot.mjs");
const G = loadEngine(); const D = G.data;
const STEPS = 400, N = 30;
const acts = () => G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
const known = (S) => (S.skills || []).length + (S.spells || []).length;
const statSum = (S) => D.STATS.reduce((a, k) => a + S.stats[k], 0);
function strength(S0) {
  // 同じ体で、段 4 の黒騎士と 12 回戦って何回勝つか（HP・MP・気力は満タンから）
  let win = 0;
  for (let i = 0; i < 12; i++) {
    G.S = JSON.parse(JSON.stringify(S0)); const S = G.S;
    S.hp = S.maxHp; S.mp = S.maxMp; if (S.k1) S.k1.ki = 99; S.over = ""; S.mode = "explore"; S.combat = null; S.event = null; S.fac = null; S.companions = [];
    G.rand = seeded(9000 + i);
    const bot = makeSmartBot(G);
    G.startCombat(["blackknight"]);
    for (let t = 0; t < 60 && S.combat && !S.over; t++) {
      // 戦技も使う：気力があって使える戦技があれば三回に一回
      const k = acts().find((a) => /^cb:k1:/.test(a.id));
      G.act(k && t % 3 === 0 ? k.id : bot.choose());
    }
    if (!S.over && !S.combat) win++;
  }
  return win / 12;
}
function run(mode, i) {
  G.rand = seeded(500 + i); G.P = { trophies: {}, graves: [] };
  const cls = Object.keys(D.CLASSES)[i % 5];
  const { stats, caps } = G.cre.quickStats(cls, G.rand);
  G.newGame({ cls, stats, caps, goal: "rich", profile: { name: "t", sex: "男", age: 20, history: "x", personality: "無口" } });
  const S = G.S; const k0 = known(S), s0 = statSum(S);
  const bot = makeSmartBot(G);
  const L0 = D.LOCS[S.loc];
  const wild = Object.keys(L0.links || {}).find((id) => D.LOCS[id] && D.LOCS[id].type === "wild") || Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "wild");
  if (mode === "grind") { S.loc = wild; S.visited[wild] = true; }
  const tt = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && (D.LOCS[id].fac || []).includes("train") && (D.LOCS[id].fac || []).includes("inn"));
  if (mode === "town") { S.loc = tt; S.visited[tt] = true; S.gold += 600; }
  if (mode === "adv2") S.gold += 600;
  for (let st = 0; st < STEPS && !S.over; st++) {
    let id;
    if (mode === "town" && S.mode !== "combat" && S.mode !== "event") {
      // 町でひたすら鍛える：訓練場で能力値か技、学院、傷ついたら宿
      if (S.mode === "fac" && S.fac !== "train") { G.act("back"); continue; }
      if (S.mode === "explore") { G.act(S.hp < S.maxHp * 0.5 ? "fac:inn" : "fac:train"); if (S.mode === "fac" && S.fac === "inn") { const r = acts().find((x) => x.id === "inn:rest"); if (r) G.act(r.id); G.act("back"); } continue; }
      const a = acts();
      const sk = a.find((x) => /^k1train:/.test(x.id));
      const tr = a.filter((x) => /^train:/.test(x.id)).sort((x, y) => G.s5Fresh(y.id.slice(6)) - G.s5Fresh(x.id.slice(6)))[0];
      const pick = sk || tr;
      if (!pick) break;
      G.act(pick.id);
      continue;
    }
    if (mode === "adv" || mode === "adv2" || S.mode !== "explore") id = bot.choose();
    else {
      const a = acts();
      const learnCamp = a.find((x) => /^k1camp:k\d_/.test(x.id));
      const drill = a.find((x) => x.id === "k1camp:drill");
      if (S.hp < S.maxHp * 0.5) id = "camp";
      else id = (learnCamp || drill || a.find((x) => x.id === "camp") || a[0]).id;
    }
    if (!id) break;
    G.act(id);
  }
  const out = { dead: S.over === "dead", learned: known(S) - k0, stat: statSum(S) - s0, turns: S.turn };
  out.str = S.over ? null : strength(S);
  return out;
}
for (const mode of (process.env.MODES || "grind,adv").split(",")) {
  const r = []; for (let i = 0; i < N; i++) r.push(run(mode, i));
  const avg = (f) => (r.reduce((a, x) => a + f(x), 0) / r.length);
  console.log(`${{ grind: "野営でひたすら稽古", adv: "ふつうに冒険", town: "町でひたすら鍛える（+600G）", adv2: "ふつうに冒険（+600G）" }[mode]}: 覚えた数 ${avg((x) => x.learned).toFixed(1)}・能力値の伸び ${avg((x) => x.stat).toFixed(1)}・死亡 ${r.filter((x) => x.dead).length}/${N}・生き残りの、黒騎士への勝率 ${(100 * r.filter((x) => x.str != null).reduce((a, x) => a + x.str, 0) / Math.max(1, r.filter((x) => x.str != null).length)).toFixed(0)}%`);
}
