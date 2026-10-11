// F2：仲間がいれば、使徒との戦いの勝率は一人のときより上がる（少なくとも下がらない）。持ち主の方針（E8 #345 で見つかった）
// - 測り方は E8（tests/checks/e8_power.mjs）と同じ主人公・同じ乱数で、弱点＋出来事をそろえる。一人と、傭兵三人を連れたときを比べる
//   B 級の灼け口・忘れ水・白霧・鉄喰い（前に仲間ありで下がっていた）。四体の合計で 仲間あり ≥ 一人、一体ごとにも大きく下がらない
// - 仕組み（engine/zzzzzzzzzzz_f2_party.js）：歯が立たない相手には、仲間は斬りかからずに庇う・牽制する
//   庇うと、あなたの受ける一撃が減り、庇った仲間が受ける。牽制が決まると敵の構えが揺らぐ（次の一撃が深く入る）。当たる相手には今まで通り斬りかかる
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("F2 仲間の援護：" + m); };
  const G = loadEngine();
  const D = G.data;
  if (!G.f2party || !G.cbAllyAssist || !G.cbCover) { F("仲間の援護（G.cbAllyAssist・G.cbCover）が無い"); return; }
  const keys0 = G.e3Keys;
  const PARTY = () => [0, 1, 2].map((i) => ({ id: "f2t" + i, name: `傭兵${"アベル,ブラン,カイ".split(",")[i]}`, cls: "傭兵", power: 70, dmg: 2, desc: "無口" }));
  const begin = (seed, party) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("merc", G.rand);
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 30, history: "", personality: "" } });
    const S = G.S;
    D.STATS.forEach((k) => { S.stats[k] = Math.max(S.stats[k], 55); });
    S.maxHp = S.hp = G.maxHpOf(S.stats);
    S.weapon = "mithril"; S.armor = "i3a_knightplate"; S.inv.potion = 5;
    S.companions = party ? PARTY() : [];
    return S;
  };
  const fight = (id, seed, party) => {
    const S = begin(seed, party);
    if (G.e10Fill) G.e10Fill(S);
    G.e3Keys = (a, s) => keys0(a, s).map((k) => Object.assign(k, { met: true }));
    try {
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
    } finally { G.e3Keys = keys0; }
    return !!(S.e3 && S.e3.done && S.e3.done.includes(id));
  };

  // ---------------------------------------------------------------- しくみ
  {
    const S = begin(1, true);
    G.startCombat(["goblin"], {});
    const gob = S.combat.foes[0];
    const c = S.companions[0];
    if (G.cbAllyAssist(c, gob, G.foeData(gob))) F("当たる相手（ゴブリン）なのに、仲間が斬りかからずに援護に回った");
    S.combat = null; S.mode = "explore";
    const ap = Object.values(D.E3.LIST).find((a) => a.id === "tetsukui");
    G.e3Keys = (a, s) => keys0(a, s).map((k) => Object.assign(k, { met: true }));
    try { G.apply({ e3fight: ap.id }); } finally { G.e3Keys = keys0; }
    const f = S.combat && S.combat.foes[0];
    if (!f) { F("鉄喰いとの戦いが始まらない（確認の前提が崩れた）"); return; }
    const e = G.foeData(f);
    if (G.allyHitChance(c, e) > G.f2party.OUTCLASSED) F(`傭兵（腕前 70）の使徒への当たる見込みが ${G.allyHitChance(c, e)}%（援護に回る ${G.f2party.OUTCLASSED}% を超える。確認の前提が崩れた）`);
    // 大技の気配 → 庇う。庇った分だけあなたの傷が減り、仲間が受ける
    f.f1i = { k: "heavy" };
    S.combat.f2cover = [];
    if (!G.cbAllyAssist(c, f, e) || S.combat.f2cover.length !== 1) F("大技の気配があるのに、仲間が庇わない");
    const hp0 = c.hp;
    const got = G.cbCover(f, e, 20);
    if (!(got < 20 && c.hp < hp0 && (20 - got) === hp0 - c.hp)) F(`庇った分が合わない（あなた ${got}/20・仲間 ${hp0}→${c.hp}）`);
    if (G.cbCover(f, e, 20) !== 20) F("庇うのが、その手番の最初の一撃のあとも続く");
    // 気配なし → 牽制（決まれば構えが揺らぐ）
    f.f1i = null; f.f1open = false;
    const r0 = G.rand; G.rand = () => 0.01;
    try { G.cbAllyAssist(c, f, e); } finally { G.rand = r0; }
    if (!f.f1open) F("牽制が決まっても、使徒の構えが揺らがない");
    S.combat = null; S.mode = "explore";
  }

  // ---------------------------------------------------------------- 勝率
  const IDS = ["aurelia", "levian", "notari", "tetsukui"].filter((id) => D.E3.LIST[id] && !D.E3.LIST[id].noslay);
  const N = 12;
  let sumSolo = 0, sumParty = 0;
  const rows = [];
  for (const id of IDS) {
    let s = 0, p = 0;
    for (let i = 0; i < N; i++) { if (fight(id, 600 + i, false)) s++; if (fight(id, 600 + i, true)) p++; }
    sumSolo += s; sumParty += p;
    rows.push(`${id} 一人 ${s}/${N}・仲間三人 ${p}/${N}`);
    if (p < s - 2) F(`${id}: 仲間三人で ${p}/${N}、一人の ${s}/${N} より大きく下がる`);
  }
  if (sumParty < sumSolo) F(`四体の合計で、仲間三人（${sumParty}）が一人（${sumSolo}）より勝てない`);
  console.log("NOTE F2 使徒との戦いの勝率（弱点＋出来事）: " + rows.join(" ／ "));
  if (!bad) ok(`F2 仲間の援護（庇う・牽制）。四体の合計 一人 ${sumSolo}/${N * IDS.length} → 仲間三人 ${sumParty}/${N * IDS.length}`);
};
