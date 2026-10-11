// M15：魔導書は読めば必ず覚える。中級・上級の書は手に入りにくい（初級は店で売ってよい）
// - 読めば一度で覚える（大失敗の目でも）。判定も借りも無い。成功率は出さない
// - 才が無い・届かない属性の書は「読み解く」が出ず、持ち物から開くと一度だけわけを言う
// - 店は中級・上級の書を売らない。上級（伝承の書）は段 5 以上の主がまれに落とすだけ。中級の書にも入手先がある
// - 序盤（ランダムと筋のよい遊び方、それぞれ最初の 300 手）に中級以上の書が手に入りすぎない
import { makeSmartBot } from "../bot.mjs";

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const M = G.m14;
  let n = 0;
  const F = (m) => { n++; fail(m); };
  const tierOf = (id) => { const it = D.ITEMS[id]; return it && it.type === "tome" && D.SPELLS[it.teach] ? D.SPELLS[it.teach].tier || 1 : 0; };
  const tomes = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].type === "tome");

  // ---------------------------------------------------------------- 入手先
  for (const L of Object.values(D.LOCS)) for (const id of L.shop || []) if (tierOf(id) >= 2) F(`${L.name} の店が ${D.ITEMS[id].name}（${D.M14_TIERS[tierOf(id)]}）を売っている`);
  for (const id of D.SHOP_BASE || []) if (tierOf(id) >= 2) F(`どの店でも ${id} を売っている`);
  if (!tomes.some((id) => tierOf(id) === 1 && Object.values(D.LOCS).some((L) => (L.shop || []).includes(id)))) F("初級の魔導書を売る店が無い");
  for (const [eid, e] of Object.entries(D.ENEMIES)) for (const [it, p] of e.loot || []) {
    const t = tierOf(it);
    if (t === 3 && (!e.boss || (e.tier || 1) < 5 || p > 0.05)) F(`${e.name} が伝承の書を落としすぎる（段 ${e.tier}・${p}）`);
    if (t === 2 && p > 0.05) F(`${e.name} が中級の書を落としすぎる（${p}）`);
  }
  const mids = tomes.filter((id) => tierOf(id) === 2);
  if (mids.length < D.M14_ELEM_KEYS.length) F(`中級の書が属性の数だけ無い（${mids.length}）`);

  // ---------------------------------------------------------------- 読めば必ず覚える
  const start = (cls, magic, seed) => {
    G.rand = seeded(seed || 1);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 5; });   // 知力が低くても覚える
    G.newGame({ cls, stats, caps: stats, goal: "majin", profile: { name: "テスト", sex: "男", age: 20 }, magic });
    return G.S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const worst = (fn) => { const r = G.rand; G.rand = () => 0.999; try { return fn(); } finally { G.rand = r; } };
  let S = start("merc", { lv: 1, good: ["fire"], bad: ["ice"] });
  G.give("m14_tome_wind");
  const a = acts().find((x) => x.id === "tome:m14_tome_wind");
  if (!a || a.disabled) F("読める魔導書の「読み解く」が出ない");
  else if (/\d+%/.test(a.sub)) F(`魔導書に成功率が出ている（${a.sub}）`);
  const debt0 = S.magicDebt || 0, f0 = S.counters.fumbles;
  worst(() => G.act("tome:m14_tome_wind"));
  if (!G.knows("wind1")) F("魔導書を読んでも一度で覚えない");
  if ((S.magicDebt || 0) !== debt0 || S.counters.fumbles !== f0) F("魔導書を読むのに判定か借りがある");
  // 苦手な属性の中級は読めない（行動が出ない）。持ち物から開くと一度だけわけを言う
  G.learnSpell("ice");
  G.give("m15_tome_ice");
  if (acts().some((x) => x.id === "tome:m15_tome_ice")) F("苦手な属性の中級の書に「読み解く」が出る");
  const logN = () => S.log.length;
  const l0 = logN();
  G.useItem("m15_tome_ice"); const l1 = logN(); G.useItem("m15_tome_ice");
  if (G.knows("ice2")) F("苦手な属性の中級を書で覚えた");
  if (!(l1 > l0) || logN() !== l1) F("読めない書のわけが、一度だけ出ない");
  // 得意な属性の中級の書は読める
  G.give("m15_tome_fire");
  worst(() => G.act("tome:m15_tome_fire"));
  if (!G.knows("fire2")) F("得意な属性の中級の書で覚えない");
  // 才なし
  S = start("merc", { lv: 0, good: [], bad: [] }, 2);
  G.give("m14_tome_fire");
  if (acts().some((x) => x.id === "tome:m14_tome_fire")) F("才なしに「読み解く」が出る");
  G.useItem("m14_tome_fire");
  if (G.knows("fire")) F("才なしが魔導書で覚えた");
  if (!S.log.some((l) => /術の才が無く/.test(l.text || ""))) F("才なしに読めないわけが出ない");

  // ---------------------------------------------------------------- 序盤に中級以上の書が手に入りすぎない
  const early = (mode, games, steps) => {
    let hit = 0, low = 0;
    const classes = Object.keys(D.CLASSES);
    for (let i = 0; i < games; i++) {
      const cls = classes[i % classes.length];
      G.rand = seeded(15000 + i);
      G.P = { trophies: {}, graves: [] };
      const { stats, caps } = G.cre.quickStats(cls, G.rand);
      G.newGame({ cls, stats, caps, goal: "majin", profile: { name: "測定", sex: "男", age: 20 } });
      const bot = mode === "smart" ? makeSmartBot(G) : null;
      const got = new Set();
      const give0 = G.give;
      G.give = (id, k) => { const r = give0(id, k); if (r && tierOf(id)) got.add(id); return r; };
      try {
        for (let s = 0; s < steps && !G.S.over; s++) {
          let id;
          if (bot) id = bot.choose();
          else { const l = acts().filter((x) => !x.disabled); id = l.length ? l[Math.floor(G.rand() * l.length)].id : null; }
          if (!id) break;
          G.act(id);
        }
      } finally { G.give = give0; }
      if ([...got].some((id) => tierOf(id) >= 2)) hit++;
      if ([...got].some((id) => tierOf(id) === 1)) low++;
    }
    return { hit, low, games };
  };
  const r = early("random", 50, 300), s = early("smart", 15, 300);
  if (r.hit > 2) F(`ランダムに遊んだ最初の 300 手で、中級以上の書が ${r.hit}/${r.games} 回手に入った（2 回まで）`);
  if (s.hit > 1) F(`筋のよい遊び方の最初の 300 手で、中級以上の書が ${s.hit}/${s.games} 回手に入った（1 回まで）`);
  console.log(`NOTE M15 序盤 300 手で魔導書：ランダム 中級以上 ${r.hit}/${r.games}・初級 ${r.low}/${r.games}／筋のよい遊び方 中級以上 ${s.hit}/${s.games}・初級 ${s.low}/${s.games}`);

  if (!n) ok(`魔導書（${tomes.length} 冊・中級 ${mids.length}・必ず覚える・読めない書は出さない・店は初級だけ・序盤に中級以上が出すぎない）`);
};
