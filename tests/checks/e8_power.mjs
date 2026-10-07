// E8：討伐できる使徒の強さの目標（持ち主の決定。src/engine/zz_e8_power.js・docs/VISION.md の「格ごとの勝率の目安」）
// やりこんだ主人公（能力値の点 55・王国騎士の甲冑・回復薬 5。大技の気配が見えたら守る）が一人で挑む。乱数は固定、幅を持たせて確かめる
// E10 からは「弱点の品・条件をそろえる（当たり前の備え）＋弱らせる出来事を起こす」で目安を測る。出来事の表がある使徒は、弱点だけでは目安より明らかに低い
//   S 級：正面（絶界を破る剣だけ・条件なし）0%／弱点＋出来事で 1〜2 割（0〜30%）
//   A 級：正面ほぼ 0%（1 割まで）／弱点＋出来事で約 3 割（10 回の測りなので幅 10〜50%）。B 級より勝ちにくい（E10-3）
//   B 級：正面ほぼ勝てない（2 割まで）／弱点＋出来事で約 5 割（10 回の測りなので幅 20〜80%）／弱点だけ 25% まで
// E12b からは使徒ごとに斬打突・属性の効き目が違う（src/data/e12_affinity.js）。「弱点をそろえる」ときは、その使徒にいちばん効く物理の種類の刃で斬る
//   （ミスリルの剣の種類だけを替えて測る。剣の強さは同じ）。正面は伝説の武具（斬）のまま。防具（王国騎士の甲冑）の効き目も使徒の攻め手に効く
export default ({ fail, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  if (!D.E8_POWER) return fail("使徒の強さの表（D.E8_POWER）が無い");
  const keys0 = G.e3Keys;
  const fight = (id, seed, allKeys, evs) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("merc", G.rand);
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 30, history: "", personality: "" } });
    const S = G.S;
    D.STATS.forEach((k) => { S.stats[k] = Math.max(S.stats[k], 55); });
    S.maxHp = S.hp = G.maxHpOf(S.stats);
    S.weapon = allKeys ? "mithril" : "volgrim";
    const dt0 = D.ITEMS.mithril.dtype;
    if (allKeys && G.dmgMod) { const a = D.E3.LIST[id]; D.ITEMS.mithril.dtype = [["slash", "blunt", "pierce"].sort((x, y) => G.dmgMod(a.foe, y) - G.dmgMod(a.foe, x))[0]]; }
    S.armor = "i3a_knightplate";
    S.inv.potion = 5;
    if (evs && G.e10Fill) G.e10Fill(S);
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
    D.ITEMS.mithril.dtype = dt0;
    return !!(S.e3 && S.e3.done && S.e3.done.includes(id));
  };
  const RANGE = { S: { front: 0, keys: [0, 0.3], only: 0.1 }, A: { front: 0.1, keys: [0.1, 0.5], only: 0.2 }, B: { front: 0.2, keys: [0.2, 0.8], only: 0.25 } };
  const N = 10;
  const rows = [];
  const sum = {}; // 格ごと・段ごとの勝ち数（同じ段で B ≥ A ≥ S を確かめる）
  const add = (r, k, n) => { sum[r] = sum[r] || { front: [0, 0], keys: [0, 0], only: [0, 0] }; sum[r][k][0] += n; sum[r][k][1] += N; };
  for (const a of Object.values(D.E3.LIST).filter((x) => !x.noslay)) {
    let f = 0, k = 0, o = 0;
    const hasEv = !!(G.e10Of && G.e10Of(a.id));
    for (let i = 0; i < N; i++) {
      if (fight(a.id, 300 + i, false)) f++;
      if (fight(a.id, 600 + i, true, true)) k++;
      if (hasEv && fight(a.id, 600 + i, true, false)) o++;
    }
    const R = RANGE[a.rank];
    add(a.rank, "front", f); add(a.rank, "keys", k); if (hasEv) add(a.rank, "only", o);
    rows.push(`${a.id}(${a.rank}) 正面 ${f}/${N}・弱点＋出来事 ${k}/${N}${hasEv ? `・弱点だけ ${o}/${N}` : ""}`);
    if (hasEv && o / N > R.only) fail(`${a.rank} 級の使徒 ${a.id}: 出来事を起こさず弱点だけで ${o}/${N} 勝てる（${Math.round(R.only * 100)}% まで。弱らせる本体は出来事）`);
    if (f / N > R.front) fail(`${a.rank} 級の使徒 ${a.id}: 正面（剣だけ）で ${f}/${N} 勝てる（${Math.round(R.front * 100)}% まで）`);
    if (k / N < R.keys[0] || k / N > R.keys[1]) fail(`${a.rank} 級の使徒 ${a.id}: 弱点＋出来事の勝率 ${k}/${N} が目安（${R.keys.map((x) => Math.round(x * 100)).join("〜")}%）から外れる`);
  }
  // 格の順：同じ段（正面・弱点だけ・弱点＋出来事）で、勝率の平均が B ≥ A ≥ S
  const avg = (r, k) => (sum[r] && sum[r][k][1] ? sum[r][k][0] / sum[r][k][1] : null);
  for (const k of ["front", "only", "keys"]) {
    const [b, a, s] = ["B", "A", "S"].map((r) => avg(r, k));
    if (b != null && a != null && b < a) fail(`段「${k}」で A 級（${Math.round(a * 100)}%）が B 級（${Math.round(b * 100)}%）より勝ちやすい`);
    if (a != null && s != null && a < s) fail(`段「${k}」で S 級（${Math.round(s * 100)}%）が A 級（${Math.round(a * 100)}%）より勝ちやすい`);
  }
  console.log("NOTE E8 使徒の強さ（やりこんだ主人公が一人）: " + rows.join(" ／ "));
};
