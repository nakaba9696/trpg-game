// E7：長編の決戦の強さを測る（CI では動かさない。node tests/e7_probe.mjs [回数]）。
// 中盤の終わりくらいの主人公（能力値の点 40・よい武器と鎧・回復薬）で、備えの数ごとに決戦を何度も戦い、勝った割合を出す。
// 遊び方：読み合いの気配が大技・必殺なら身を守り、HP が三割を切ったら回復薬、ほかは攻撃。
import { loadEngine, seeded } from "./lib.mjs";

export function fightFinal(G, { seed, preps = [], allies = {}, stat = 40, sword = false, potions = 5, bert = false }) {
  const D = G.data;
  G.rand = seeded(seed);
  G.P = { trophies: {}, graves: [] };
  const { stats, caps } = G.cre.quickStats("merc", G.rand);
  G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 30, history: "", personality: "" } });
  const S = G.S;
  D.STATS.forEach((k) => { S.stats[k] = Math.max(S.stats[k], stat); });
  S.maxHp = S.hp = G.maxHpOf(S.stats);
  S.weapon = sword ? "volgrim" : "mithril";
  S.armor = "i3a_knightplate";
  S.inv.potion = potions;
  S.loc = "wasteland";
  if (bert && G.c2Join) G.c2Join("bertrand");
  const st = G.e7.of("mirza", S);
  st.on = true; st.ch = 8;
  preps.forEach((p) => { st.prep[p] = true; });
  Object.assign(st.f, allies);
  G.apply({ e7: { id: "mirza", fight: "final" } });
  let n = 0;
  while (S.mode === "combat" && !S.over && n++ < 200) {
    const C = S.combat;
    const foe = C.foes.find((f) => f.hp > 0 && f.e7);
    const tell = foe && foe.f1i && foe.f1i.k;
    let id = "cb:attack";
    if (S.hp < S.maxHp * 0.3 && S.inv.potion > 0) id = "cb:item:potion";
    else if (tell === "heavy" || tell === "ult" || tell === "chant") id = "cb:guard";
    const ids = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled).map((a) => a.id);
    if (!ids.includes(id)) id = ids.includes("cb:attack") ? "cb:attack" : ids[0];
    G.act(id);
  }
  return { win: !!st.won, dead: S.over === "dead", rounds: n, hp: S.hp };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const N = +(process.argv[2] || 40);
  const STAT = +(process.argv[3] || 55);
  const G = loadEngine();
  const CASES = [
    ["備えなし（剣で絶界は破る）", { sword: true }],
    ["陣だけ", { preps: ["ward"] }],
    ["陣と刃", { preps: ["ward", "arms"] }],
    ["陣・刃・鍛える", { preps: ["ward", "arms", "train"] }],
    ["陣・刃・鍛える・傭兵", { preps: ["ward", "arms", "train", "host"] }],
    ["五つ全部", { preps: ["ward", "arms", "train", "host", "price"] }],
    ["陣・刃＋ベルトラン", { preps: ["ward", "arms"], allies: { ally_bert: "with" }, bert: true }],
    ["陣・刃・鍛える＋ベルトラン・ミュゼット・フィーネ", { preps: ["ward", "arms", "train"], allies: { ally_bert: "with", mus: "ally", fine: "back" }, bert: true }],
    ["五つ全部＋仲間みな", { preps: ["ward", "arms", "train", "host", "price"], allies: { ally_bert: "with", mus: "ally", fine: "back" }, bert: true }],
    ["五つ全部＋仲間みな（点 55）", { preps: ["ward", "arms", "train", "host", "price"], allies: { ally_bert: "with", mus: "ally", fine: "back" }, bert: true, stat: 55 }],
  ];
  for (const [name, o] of CASES) {
    let w = 0, d = 0, r = 0;
    for (let i = 0; i < N; i++) { const x = fightFinal(G, { seed: 9000 + i, stat: STAT, ...o }); if (x.win) w++; if (x.dead) d++; r += x.rounds; }
    console.log(`${name.padEnd(28)} 勝ち ${Math.round(w * 100 / N)}%・死 ${Math.round(d * 100 / N)}%・手番 ${(r / N).toFixed(1)}`);
  }
}
