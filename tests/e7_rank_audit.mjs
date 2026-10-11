// E7：使徒の格の点検（CI では動かさない。node tests/e7_rank_audit.mjs [回数] [能力値の点]）。
// 持ち主の決定：B 級＝主人公たちだけで正面から倒せる（備えは要る）／A 級＝主人公たちだけの正面では基本は勝てない（仲間の使徒・弱点・軍と組めば勝てる）／
//              S 級＝主人公たちだけでは基本は無理（弱点をそろえても）。格は G.e7.grade を通して読む
// 強い主人公（能力値の点 55・ミスリルの剣か絶界を破る剣・王国騎士の甲冑・回復薬 5）が一人で、E3 の使徒の戦いを
//   (a) 正面：絶界を破る剣だけ（条件なし） (b) 弱点：条件をすべて満たす（剣なし。zekkai の条件で刃が届く）
// で何度も戦い、勝った割合から、格の決まりと合わない使徒を挙げる。
import { loadEngine, seeded } from "./lib.mjs";

const N = +(process.argv[2] || 20);
const STAT = +(process.argv[3] || 55);
const G = loadEngine();
const D = G.data;
const keys0 = G.e3Keys;
function fight(id, seed, allKeys) {
  G.rand = seeded(seed);
  G.P = { trophies: {}, graves: [] };
  const { stats, caps } = G.cre.quickStats("merc", G.rand);
  G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 30, history: "", personality: "" } });
  const S = G.S;
  D.STATS.forEach((k) => { S.stats[k] = Math.max(S.stats[k], STAT); });
  S.maxHp = S.hp = G.maxHpOf(S.stats);
  S.weapon = allKeys ? "mithril" : "volgrim";
  S.armor = "i3a_knightplate";
  S.inv.potion = 5;
  G.e3Keys = allKeys ? (a, s) => keys0(a, s).map((k) => Object.assign(k, { met: true })) : keys0;
  G.apply({ e3fight: id });
  let n = 0;
  while (S.mode === "combat" && !S.over && n++ < 200) {
    const foe = S.combat.foes.find((f) => f.hp > 0);
    const tell = foe && foe.f1i && foe.f1i.k;
    let act = "cb:attack";
    if (S.hp < S.maxHp * 0.3 && S.inv.potion > 0) act = "cb:item:potion";
    else if (["heavy", "ult", "chant"].includes(tell)) act = "cb:guard";
    const ids = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled).map((a) => a.id);
    G.act(ids.includes(act) ? act : ids[0]);
  }
  G.e3Keys = keys0;
  return !!(S.e3 && S.e3.done && S.e3.done.includes(id));
}
const rows = [];
for (const a of Object.values(D.E3.LIST)) {
  let fa = 0, fb = 0;
  for (let i = 0; i < N; i++) { if (fight(a.id, 300 + i, false)) fa++; if (fight(a.id, 600 + i, true)) fb++; }
  const ra = Math.round((fa * 100) / N), rb = Math.round((fb * 100) / N);
  let why = "";
  const g = G.e7.grade(a.id);
  if (g === "B" && rb < 30) why = "弱点をそろえても倒しにくい（強すぎ）";
  if (g === "B" && ra >= 80) why = "剣だけで備えなしに倒せる（弱すぎ）";
  if (g === "A" && ra >= 20) why = "剣だけで、主人公一人の正面で倒せる（弱すぎ）";
  if (g === "A" && rb < 30) why = "弱点をそろえても倒しにくい（強すぎ）";
  if (g === "S" && rb >= 30) why = "主人公一人でも、弱点をそろえれば倒せる（弱すぎ）";
  rows.push({ id: a.id, name: G.e3FoeData(a.id).name, rank: `${g} 級`, ra, rb, why });
}
console.log(`| 使徒 | 格 | 正面（剣だけ） | 弱点をそろえる | 点検 |`);
console.log(`|---|---|---|---|---|`);
for (const r of rows) console.log(`| ${r.name}（${r.id}） | ${r.rank} | ${r.ra}% | ${r.rb}% | ${r.why || "合う"} |`);
