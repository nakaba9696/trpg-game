// F1：戦闘の読み合い・賭けの技・山場（engine/zzzzzzzzzz_f1_duel.js・data/f1_tells.js）
// - 気配の文と癖（D.F1_STYLE）が、今ある敵を指している。どの気配にも文がある
// - 大技の溜め：受けると傷が小さくなって敵が崩れ、次の手番は動けない。割り込めば潰せる。躱せば丸ごと外れる
// - 待ちの構え：刃は浅く、返しの一撃が来る。術は深く入る
// - 賭けの技：身を削ると HP が減る。目つぶしは道具を一つ失って敵を崩す。捨て身を外すと無防備
// - 知っている敵だけ、気配に一言と「◎」が付く（成功率は変わらない）
// - 雑魚はとどめで早く終わる。強敵は HP が半分を切ると本気になる。勝っても「手応え」の一行は出さない（F5。持ち主の指示でやめた）
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("F1：" + m); };
  const G = loadEngine();
  const D = G.data;
  const F1 = G.f1;
  if (!F1) { F("G.f1 が無い"); return; }

  // ---------------------------------------------------------------- データ
  for (const k of ["heavy", "quick", "brace", "chant", "ult"]) {
    const T = D.F1_TELLS[k];
    if (!T || !(T.any || []).length) F(`気配 ${k} に any の文が無い`);
    if (!D.F1_HINT[k] || !D.F1_NAME[k] || !(D.F1_ANSWER[k] || []).length) F(`気配 ${k} の一言・名前・合う手が無い`);
  }
  for (const [id, st] of Object.entries(D.F1_STYLE)) {
    if (!D.ENEMIES[id]) F(`癖の表の ${id} が敵に無い`);
    for (const k of Object.keys({ ...(st.w || {}), ...(st.tell || {}) })) if (!D.F1_TELLS[k]) F(`${id} の癖に知らない気配 ${k}`);
  }
  for (const id of Object.keys(D.ENEMIES)) if (!F1.styles(id).length) F(`${id} に気配が一つも無い`);

  // ---------------------------------------------------------------- 遊ぶ準備
  const fresh = () => {
    G.rand = seeded(5);
    G.P = { trophies: {}, graves: [] };
    const cls = Object.keys(D.CLASSES)[0];
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; caps[k] = stats[k] + 30; });
    G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
    G.S.maxHp = G.S.hp = 999;
    G.S.companions = [];
    Object.keys(G.S.inv).forEach((id) => { if ((D.ITEMS[id] || {}).type === "use") delete G.S.inv[id]; });
  };
  const with_ = (r, fn) => { const r0 = G.rand; G.rand = () => r; try { fn(); } finally { G.rand = r0; } };
  const fight = (id, k) => { G.startCombat([id], {}); const f = G.S.combat.foes[0]; f.hp = f.max = 999; f.f1i = k ? { k } : null; return f; };
  // 敵の命中を必ず当たるに、こちらの判定は rand で決める
  const sure = (id, fn) => { const h = D.ENEMIES[id].hit; D.ENEMIES[id].hit = 999; try { fn(); } finally { D.ENEMIES[id].hit = h; } };

  fresh();
  // 大技：受けると小さく、崩れる
  let lostGuard = 0, lostOpen = 0;
  sure("orc", () => {
    let f = fight("orc", "heavy");
    let hp = G.S.hp;
    with_(0.5, () => G.combatAct("guard"));
    lostGuard = hp - G.S.hp;
    if (!(f.f1stun && f.f1open)) F("大技を受け止めても敵が崩れない");
    hp = G.S.hp;
    with_(0.5, () => G.combatAct("guard"));
    if (G.S.hp !== hp) F("崩れた敵が次の手番に殴ってきた");
    f = fight("orc", "heavy");
    hp = G.S.hp;
    with_(0.5, () => G.combatAct("attack")); // 構わず斬りかかる：まともに受ける
    lostOpen = hp - G.S.hp;
    if (!(lostGuard > 0 && lostGuard * 2 < lostOpen)) F(`大技を受けても傷が小さくならない（受けた ${lostGuard}・受けない ${lostOpen}）`);
    // 割り込み：溜めを潰す
    f = fight("orc", "heavy");
    hp = G.S.hp;
    with_(0.01, () => G.combatAct("f1cut"));
    if (G.S.hp !== hp || f.hp >= f.max) F("割り込みで大技を潰せない（か、当たらない）");
    // 躱す：丸ごと外れて崩れる
    f = fight("orc", "heavy");
    hp = G.S.hp;
    with_(0.01, () => G.combatAct("f1dodge"));
    if (G.S.hp !== hp || !f.f1stun) F("躱しても大技が当たる（か、崩れない）");
  });
  G.S.combat = null; G.S.mode = "explore";

  // 構え：刃は浅く返される、術は深い
  sure("orc", () => {
    const n0 = (() => { const f = fight("orc", null); with_(0.2, () => G.combatAct("attack")); return f.max - f.hp; })();
    const f = fight("orc", "brace");
    const hp = G.S.hp;
    with_(0.2, () => G.combatAct("attack"));
    if (!(f.max - f.hp < n0)) F(`構えた敵に刃が浅くならない（${f.max - f.hp} / ふだん ${n0}）`);
    if (!(G.S.hp < hp)) F("構えた敵に踏み込んでも返しの一撃が来ない");
    const g = fight("orc", "brace");
    const hp2 = G.S.hp;
    G.S.mp = G.S.maxMp = 99;
    with_(0.2, () => G.combatAct("fire"));
    if (G.S.hp !== hp2) F("構えた敵が、術を使った手番に殴ってきた");
    if (!(g.hp < g.max)) F("構えた敵に術が入らない");
  });
  G.S.combat = null; G.S.mode = "explore";

  // 賭けの技
  {
    const f = fight("orc", null);
    const hp = G.S.hp;
    const acts = () => G.combatActions().flatMap((g) => g.list);
    for (const id of ["cb:f1cut", "cb:f1dodge", "cb:f1all", "cb:f1blood", "cb:f1throw"]) if (!acts().some((a) => a.id === id)) F(`戦闘に ${id} が無い`);
    if (!acts().find((a) => a.id === "cb:f1throw").disabled) F("投げる物が無いのに目つぶしが選べる");
    const sureMiss = D.ENEMIES.orc.hit;
    D.ENEMIES.orc.hit = -999;
    try {
      with_(0.5, () => G.combatAct("f1blood"));
      if (!(G.S.hp <= hp - F1.bloodCost(G.S))) F("身を削る一撃で HP が減らない");
      G.give("herb", 1);
      f.f1i = null;
      if (!acts().find((a) => a.id === "cb:f1throw").disabled) F("狙いが何も仕掛けてこないのに目つぶしが選べる");
      f.f1i = { k: "heavy" };
      if (acts().find((a) => a.id === "cb:f1throw").disabled) F("薬草を持っていて、狙いが仕掛けてくるのに目つぶしが選べない");
      with_(0.01, () => G.combatAct("f1throw"));
      if (G.S.inv.herb) F("目つぶしで道具が減らない");
      if (!f.f1open) F("目つぶしが決まっても敵が崩れない");
      with_(0.99, () => G.combatAct("f1all"));
      if (!G.S.log.slice(-12).some((l) => /捨て身|空を切/.test(l.text || ""))) F("捨て身を外した文が無い");
    } finally { D.ENEMIES.orc.hit = sureMiss; }
  }
  G.S.combat = null; G.S.mode = "explore";

  // 知っている敵：一言と◎（成功率は同じ）
  {
    fresh();
    const tellOf = () => G.S.log.filter((l) => l.tell).pop();
    let f = fight("ogre", "heavy");
    const plain = G.combatActions().flatMap((g) => g.list).find((a) => a.id === "cb:guard").sub;
    if (/◎/.test(plain)) F("知らない敵なのに◎が付いた");
    G.P.codex = { foes: { ogre: { kills: 1 } }, items: {}, people: {} };
    const marked = G.combatActions().flatMap((g) => g.list).find((a) => a.id === "cb:guard").sub;
    if (!/◎/.test(marked)) F("知っている敵の大技に、身を守るの◎が付かない");
    with_(0.01, () => G.combatAct("attack"));
    const t = tellOf();
    if (G.S.combat && !(t && t.text.includes(D.F1_HINT[t.f1]))) F("知っている敵の気配に一言が付かない");
    G.S.combat = null; G.S.mode = "explore";
  }

  // とどめ・本気・手応えを出さない
  {
    fresh();
    G.startCombat(["orc"], {});
    const f = G.S.combat.foes[0];
    f.hp = Math.ceil(f.max * 0.2) + 1;
    with_(0.2, () => G.combatAct("attack"));
    if (G.S.combat) F("雑魚の HP が 2 割を切る一撃で、とどめにならない");
    if (G.S.log.some((l) => /^手応え：|相手の手は、最後にはすべて見えていた/.test(l.text || ""))) F("勝った戦いのあとに「手応え」の一行が出る（やめたはず）");
    if (G.S.f1last || G.f1Summary) F("手応えの記録（S.f1last・G.f1Summary）が残っている");
    const boss = Object.keys(D.ENEMIES).find((id) => D.ENEMIES[id].boss && !D.ENEMIES[id].majin);
    G.startCombat([boss], {});
    const b = G.S.combat.foes[0];
    if (!G.S.log.some((l) => l.tell === b.name)) F("強敵が初めから気配を見せない");
    b.hp = Math.floor(b.max / 2);
    with_(0.6, () => G.combatAct("guard"));
    if (G.S.combat && !(b.f1rage && G.S.log.some((l) => l.rage))) F("強敵が HP 半分を切っても本気にならない");
    G.S.combat = null; G.S.mode = "explore";
  }

  // 図鑑：倒した敵の気配
  if (G.codexFoeStats) {
    G.P.codex = { foes: { orc: { kills: 1 } }, items: {}, people: {} };
    const row = (G.codexFoeStats("orc") || []).find((r) => r[0] === "気配");
    if (!row || !/大技/.test(row[1])) F("図鑑のオークに気配が載らない");
  }

  // 乱数を変えて、いろいろな敵と最後まで戦える（例外が出ない）
  {
    fresh();
    const ids = Object.keys(D.ENEMIES);
    let rounds = 0;
    for (let i = 0; i < ids.length; i += 3) {
      G.rand = seeded(100 + i);
      G.S.hp = G.S.maxHp; G.S.mp = G.S.maxMp;
      G.give("herb", 1);
      G.startCombat([ids[i]], {});
      const all = ["cb:attack", "cb:guard", "cb:f1cut", "cb:f1dodge", "cb:f1all", "cb:f1blood", "cb:f1throw", "cb:vital"];
      for (let n = 0; n < 40 && G.S.combat && !G.S.over; n++) {
        const can = G.combatActions().flatMap((g) => g.list).filter((a) => !a.disabled && all.includes(a.id));
        G.act(can[Math.floor(G.rand() * can.length)].id);
        rounds++;
        if (!(G.S.hp >= 0 && G.S.hp <= G.S.maxHp)) { F(`${ids[i]}: HP が範囲外`); break; }
      }
      G.S.combat = null; G.S.mode = "explore";
    }
    if (!bad) ok(`F1 読み合い（気配 5 種・癖 ${Object.keys(D.F1_STYLE).length} 体・大技 受けて ${lostGuard}／受けずに ${lostOpen}・${rounds} 手番を通しで）`);
  }
};
