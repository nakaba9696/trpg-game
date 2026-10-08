// F9：攻撃は「〇〇で攻撃」だけ、防御の見出しを足す（持ち主「割り込むも面倒なので無くていい。防御コマンドを作って」）
// - 見出しは 攻撃・防御・戦技・魔法・その他・道具 の順。攻撃は cb:attack だけ、防御は cb:guard だけ。急所・割り込む・躱す・捨て身・身を削るは手の欄に出ない
// - 防御：受ける傷が減る（大技も和らぐ）・盾があれば効きが増す・敏捷が高いと避けやすい
// - 武器の急所の補正（vital）は、当たった一撃が会心になる見込みに（G.cb.critBonus）。急所の目（K2）も足す
// - 古いセーブ（前の手が cb:vital・cb:f1cut・cb:f1dodge など）でも「前と同じ」で落ちない。作戦「守りを固めろ」の仲間は、傷が深いと防御する
// - 仲間の番（F8）にも防御の見出しがある
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0("F9 攻撃と防御：" + m); };
  const G = loadEngine();
  const D = G.data;
  const begin = (seed, agi, comps) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 99; });
    if (agi != null) stats["敏捷"] = agi;
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999;
    if (comps) { S.companions = comps; if (G.b5Party) G.b5Party(S); }
    return S;
  };
  const acts = () => G.actions().flatMap((g) => g.list).map((a) => a.id);

  // ---------------------------------------------------------------- 手の欄
  {
    begin(1);
    G.give("herb", 1);
    G.startCombat(["orc"], {});
    const gs = G.actions().filter((g) => g.list.length && !g.sub);
    const cats = gs.map((g) => g.cat);
    const want = ["attack", "guard", "tech", "magic", "misc", "item"].filter((c) => cats.includes(c));
    if (cats.join() !== want.join()) fail(`見出しの順が 攻撃・防御・戦技・魔法・その他・道具 でない（${cats}）`);
    const of = (c) => G.actions().filter((g) => g.cat === c).flatMap((g) => g.list.map((a) => a.id));
    if (of("attack").join() !== "cb:attack") fail(`攻撃の見出しが「〇〇で攻撃」だけでない（${of("attack")}）`);
    if (of("guard").join() !== "cb:guard") fail(`防御の見出しが「防御」だけでない（${of("guard")}）`);
    const g = G.actions().flatMap((x) => x.list).find((a) => a.id === "cb:guard");
    if (!g || g.label !== "防御") fail("防御の手の名前が「防御」でない");
    for (const id of ["cb:vital", "cb:f1cut", "cb:f1dodge", "cb:f1all", "cb:f1blood"]) if (acts().includes(id)) fail(`手の欄に ${id} が残っている`);
    G.S.combat = null; G.S.mode = "explore";
  }

  // ---------------------------------------------------------------- 防御の効き目（受ける傷・盾・敏捷）
  const hurt = (seed, act, setup) => {
    // 同じ乱数で一巡だけ殴られて、受けた傷の合計（何度も繰り返す）
    let sum = 0;
    for (let i = 0; i < 60; i++) {
      const S = begin(seed + i, 50);
      if (setup) setup(S);
      G.startCombat(["orc"], {});
      const f = S.combat.foes[0];
      f.hp = f.max = 999;
      const h0 = D.ENEMIES.orc.hit;
      D.ENEMIES.orc.hit = 999; // 敵は必ず当てる（防御の避けは測らない）
      try { G.combatAct(act); } finally { D.ENEMIES.orc.hit = h0; }
      sum += 999 - S.hp;
      S.combat = null; S.mode = "explore";
    }
    return sum;
  };
  {
    const open = hurt(100, "attack"), guard = hurt(100, "guard");
    if (!(open > 0)) fail("防御しないときに傷を受けない（測れない）");
    else if (!(guard * 2 <= open)) fail(`防御しても受ける傷が大きく減らない（防御 ${guard}・受けず ${open}）`);
    const shield = hurt(100, "guard", () => { G.give("i2s_buckler", 1); G.equip("i2s_buckler", "off"); });
    if (!G.cb.shield) fail("G.cb.shield が無い");
    if (!(shield < guard)) fail(`盾を構えても防御の効きが増えない（盾 ${shield}・素手 ${guard}）`);
    begin(5, 50); G.give("i2s_buckler", 1); G.equip("i2s_buckler", "off"); G.startCombat(["orc"], {});
    if (!G.cb.shield()) fail("左手に盾を持っても G.cb.shield() が真にならない");
    if (!/盾/.test(G.actions().flatMap((g) => g.list).find((a) => a.id === "cb:guard").sub)) fail("盾があるのに防御の札に盾の一言が無い");
    G.S.combat = null; G.S.mode = "explore";
  }
  {
    begin(6, 20); const lo = G.cb.guardEvade();
    begin(6, 90); const hi = G.cb.guardEvade();
    if (!(hi > lo)) fail(`敏捷が高くても防御で避けやすくならない（低 ${lo}・高 ${hi}）`);
    if (hi > 15) fail(`防御の避けの上乗せが大きすぎる（${hi}）`);
    G.startCombat(["orc"], {});
    const e = G.foeData(G.S.combat.foes[0]);
    const plain = G.foeHitChance(e, 0);
    G.S.combat = null; G.S.mode = "explore";
    if (!(plain > 0)) fail("敵の命中が測れない");
  }

  // ---------------------------------------------------------------- 大技を防御で和らげる（F1 の溜め）
  {
    const S = begin(7, 50);
    G.startCombat(["orc"], {});
    const f = S.combat.foes[0];
    f.hp = f.max = 999;
    if (G.f1 && D.F1_ANSWER && D.F1_ANSWER.heavy) {
      if (!D.F1_ANSWER.heavy.includes("cb:guard") || !D.F1_ANSWER.chant.includes("cb:guard")) fail("溜め・詠唱に合う手が防御でない");
      if (D.F1_ANSWER.heavy.some((id) => !/^cb:(guard|k1:|f1throw)/.test(id) && id !== "cb:guard")) fail(`溜めに合う手に、外した手が残る（${D.F1_ANSWER.heavy}）`);
    }
    S.combat = null; S.mode = "explore";
  }

  // ---------------------------------------------------------------- 会心（武器の急所の補正を移した）
  {
    begin(8, 50);
    if (!G.cb.critBonus) fail("G.cb.critBonus が無い");
    else {
      const has = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].type === "weapon" && D.ITEMS[id].vital > 0);
      if (!has.length) fail("急所の補正を持つ武器が無い（測れない）");
      else {
        const id = has.includes("dagger") ? "dagger" : has[0];
        G.give(id, 1); G.equip(id);
        const cb = G.cb.critBonus();
        if (!(cb >= D.ITEMS[id].vital)) fail(`急所の補正 ${D.ITEMS[id].vital} の武器で、会心の見込みが ${cb}`);
        G.startCombat(["orc"], {});
        const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "cb:attack");
        if (!/会心\+/.test(a.sub)) fail(`会心の見込みが攻撃の札に出ない（${a.sub}）`);
        // 何度も殴ると、会心が出る
        let crit = 0;
        for (let i = 0; i < 200 && G.S.combat; i++) {
          G.S.combat.foes[0].hp = G.S.combat.foes[0].max = 9999;
          G.S.hp = 999;
          const n = G.S.log.length;
          G.combatAct("attack");
          if (G.S.log.slice(n).some((l) => l.fx === "crit")) crit++;
        }
        if (!crit) fail("急所の補正がある武器で 200 回殴っても会心が出ない");
        G.S.combat = null; G.S.mode = "explore";
      }
      // 急所の目（K2）は会心に足す
      if (!(D.SKILLS && D.SKILLS.k2_vitaleye && G.k1 && G.k1.learn)) fail("急所の目（k2_vitaleye）か G.k1.learn が無い");
      else {
        const before = G.cb.critBonus();
        G.k1.learn("k2_vitaleye", "train");
        if (!(G.cb.critBonus() > before)) fail("急所の目を覚えても会心の見込みが増えない");
      }
    }
  }

  // ---------------------------------------------------------------- 古いセーブ：前の手が外した手
  for (const old of ["vital", "f1cut", "f1dodge", "f1all", "f1blood", "guard"]) {
    const S = begin(9, 50);
    G.startCombat(["orc"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 999;
    S.combat.f4last = "cb:" + old;
    try {
      const a = G.f4 && G.f4.lastAction ? G.f4.lastAction(S) : null;
      if (old === "guard") { if (!a || a.id !== "cb:guard") fail("前の手が cb:guard のとき「前と同じ」が防御にならない"); }
      else if (a) fail(`前の手が cb:${old}（外した手）のとき「前と同じ」が出る`);
      G.actions();
      G.act("cb:attack");
    } catch (e) { fail(`前の手が cb:${old} の古いセーブで例外：${e && e.message}`); }
    S.combat = null; S.mode = "explore";
  }

  // ---------------------------------------------------------------- 仲間：作戦で防御する・F8 の仲間の番に防御
  {
    const mk = (i, x) => Object.assign({ id: "f9c" + i, name: `仲間${"アイ"[i]}`, cls: "傭兵", power: 70, dmg: 3, desc: "無口", trait: "loyal", bond: 70 }, x || {});
    const S = begin(10, 50, [mk(0)]);
    S.f3tactic = "wait";
    G.startCombat(["orc"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 999;
    G.act("cb:attack");
    const gs = G.actions();
    const g = gs.find((x) => x.cat === "guard");
    if (!g || !g.list.some((a) => a.id === "f3:ord:f9c0:back" && a.label === "防御")) fail(`仲間の番に「防御」の見出し・手が無い（${gs.map((x) => x.cat)}）`);
    S.combat = null; S.mode = "explore";
    // 守りを固めろ：傷が深い仲間は防御する
    const S2 = begin(11, 50, [mk(0, { f5tac: "shield" })]);
    G.startCombat(["orc"], {});
    S2.combat.foes[0].hp = S2.combat.foes[0].max = 999;
    const c = S2.companions[0];
    if (c.maxHp) c.hp = Math.max(1, Math.floor(c.maxHp * 0.2));
    const n = S2.log.length;
    G.combatAct("attack");
    if (c.maxHp && !S2.log.slice(n).some((l) => /防御を固め|守りを固めて/.test(l.text || ""))) fail("作戦「守りを固めろ」で、傷の深い仲間が防御しない");
    S2.combat = null; S2.mode = "explore";
  }

  // ---------------------------------------------------------------- 乱数を変えて最後まで戦える
  let rounds = 0;
  for (let gi = 0; gi < 40; gi++) {
    const S = begin(300 + gi, 30 + gi);
    if (gi % 2) { G.give("i2s_buckler", 1); G.equip("i2s_buckler", "off"); }
    G.startCombat([G.pick(["goblin", "orc", "ogre"])], {});
    try {
      for (let i = 0; i < 60 && S.combat && !S.over; i++) {
        const all = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled && /^cb:(attack|guard)$/.test(a.id));
        G.act(all[Math.floor(G.rand() * all.length)].id);
        rounds++;
      }
    } catch (e) { fail(`攻撃と防御だけで戦って例外：${e && e.stack ? e.stack.split("\n").slice(0, 2).join(" ") : e}`); break; }
    S.combat = null; S.mode = "explore";
  }

  if (!bad) ok(`F9 攻撃と防御（見出し 6 つ・攻撃は一つ・防御で傷が減り盾で増す・敏捷で避ける・急所は会心に・古いセーブ・仲間の防御・${rounds} 手番）`);
};
