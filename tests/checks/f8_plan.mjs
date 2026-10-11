// F8：一巡の手を、主人公 → 仲間A → 仲間B … と決めてから解く（engine/zzzzzzzzzzzzzzz_f8_plan.js。持ち主「主人公の行動 ⇒ 仲間Aの行動 ⇒ … と決めていき、一通り終わったらダイスなどで戦闘する」）
// - 仲間二人（作戦「命を待て」）：主人公の手 → 仲間Aの番 → 仲間Bの番 → 一巡が解ける。決めている間は手番・記録が進まない。一つ前に戻れる。仲間の手は 5 つの見出し
// - 作戦を付けた仲間（命を待て以外）・倒れている仲間は飛ばす。主人公の番には、仲間ごとの指示の組を出さない（決める段に吸収）
// - 「誰に使う？」（B5）で選んだ手のあとも仲間の番が来る。G.combatAct を直に呼ぶと今まで通り解ける。古いセーブ（作戦が無い・f8 が無い）は決める段なし
// - 決める段ありで 150 回ランダムに遊んでも、止まらない・例外が出ない
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { if (bad < 30) fail0("F8 一巡の手を決めてから解く：" + m); bad++; };
  const G = loadEngine();
  const D = G.data;
  const F8 = G.f8;
  if (!F8 || !F8.turn) { F("G.f8 が無い"); return; }
  const mk = (i, x) => Object.assign({ id: "f8c" + i, name: `仲間${"アイウ"[i]}`, cls: "傭兵", power: 70, dmg: 3, desc: "無口", trait: "loyal", bond: 70 }, x || {});
  const begin = (seed, comps, tac, cls) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 99; });
    G.newGame({ cls: cls || "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 400;
    if (comps) { S.companions = comps; G.b5Party(S); }
    if (tac) S.f3tactic = tac;
    return S;
  };
  const ids = () => G.actions().flatMap((g) => g.list).map((a) => a.id);
  const whoName = (S) => { const w = F8.turn(S); return w === "you" ? "you" : w ? w.id : null; };

  // ---------------------------------------------------------------- 仲間二人
  {
    const S = begin(1, [mk(0), mk(1, { heal: true, cls: "僧侶" })], "wait");
    G.startCombat(["orc"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 500;
    if (whoName(S) !== "you") F("戦いの初めが主人公の番でない");
    if (ids().some((id) => /^f3:ord:/.test(id))) F("主人公の番に、仲間ごとの指示の組が出る（決める段に吸収していない）");
    if (!ids().includes("f3:tac:wait")) F("主人公の番に作戦の組が無い");
    const turn = S.turn, round = S.combat.round, logN = S.log.length;
    G.act("cb:attack");
    if (whoName(S) !== "f8c0") F(`主人公の手のあと、仲間アの番にならない（${whoName(S)}）`);
    const gs = G.actions();
    if (!gs.length || gs.some((g) => !["attack", "guard", "tech", "magic", "misc", "item"].includes(g.cat))) F("仲間の番の手が 6 つの見出しに分かれていない");
    if (!ids().includes("f3:ord:f8c0:attack") || ids().includes("f3:ord:f8c0:heal")) F("仲間アの番に、仲間アの手（だけ）が出ない");
    if (!ids().includes("f8:back")) F("仲間の番に「一つ前に戻る」が無い");
    G.act("f8:back");
    if (whoName(S) !== "you") F("一つ前に戻ると、主人公の番に戻らない");
    G.act("cb:guard");
    G.act("f3:ord:f8c0:feint");
    if (whoName(S) !== "f8c1") F("仲間アのあと、仲間イの番にならない");
    if (!ids().includes("f3:ord:f8c1:heal")) F("回復役の仲間イの番に「手当て」が無い");
    G.act("f8:back");
    if (whoName(S) !== "f8c0" || (S.combat.f3ord || {}).f8c0) F("仲間イの番から戻ると、仲間アの手が消えて仲間アの番にならない");
    G.act("f3:ord:f8c0:back");
    if (S.turn !== turn || S.combat.round !== round || S.log.length !== logN) F("手を決めている間に、手番・記録が進む");
    G.act("f3:ord:f8c1:back");
    if (S.combat.round === round && S.turn === turn) F("全員の手が決まっても、一巡が解けない");
    const text = S.log.slice(logN).map((l) => l.text || "").join("\n");
    if (!/防御する/.test(text)) F("主人公の手（防御）で解かれない");
    if (!/仲間アは防御を固めて|仲間イは防御を固めて/.test(text)) F("仲間の手（防御）で解かれない");
    if (whoName(S) !== "you" || (S.combat && S.combat.f3ord && Object.keys(S.combat.f3ord).length)) F("一巡のあと、主人公の番に戻らない（か、指示が残る）");
  }

  // ---------------------------------------------------------------- 作戦を付けた仲間・倒れた仲間は飛ばす
  {
    const S = begin(2, [mk(0, { f5tac: "press" }), mk(1)], "wait");
    G.startCombat(["orc"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 500;
    G.act("cb:guard");
    if (whoName(S) !== "f8c1") F("作戦を付けた仲間（押し切れ）が飛ばされない");
    G.act("f8:back");
    S.companions[1].hp = 0;
    if (F8.queue(S).length) F("倒れている仲間の番が来る");
    const round = S.combat.round;
    G.act("cb:guard");
    if (S.combat && S.combat.round === round) F("手を選ぶ仲間がいないのに、主人公の手で一巡が解けない");
  }
  // 古いセーブ：作戦が無い（機を見て）なら、決める段は無く今まで通り
  {
    const S = begin(3, [mk(0), mk(1)]);
    delete S.f3tactic;
    G.startCombat(["orc"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 500;
    const round = S.combat.round;
    if (F8.planning(S)) F("作戦の無い古いセーブで、決める段が出る");
    G.act("cb:guard");
    if (S.combat && S.combat.round === round) F("作戦の無い古いセーブで、主人公の手で一巡が解けない");
    // 直に G.combatAct を呼ぶと、決める段を通らずに解ける
    S.f3tactic = "wait";
    const r2 = S.combat && S.combat.round;
    G.act("cb:guard");
    G.combatAct("guard");
    if (S.combat && (S.combat.round === r2 || S.combat.f8)) F("G.combatAct を直に呼んでも解けない（か、決める段が残る）");
  }
  // 「誰に使う？」（B5）で選んだ手のあとも、仲間の番が来る
  {
    const S = begin(4, [mk(0)], "wait");
    G.give("herb", 2);
    G.startCombat(["orc"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 500;
    const pick = ids().find((id) => /^b5:pick:/.test(id) && /herb/.test(id));
    if (pick) {
      G.act(pick);
      const tgt = ids().find((id) => /^cb:item:herb:/.test(id));
      if (!tgt) F("「誰に使う？」の問いが出ない");
      else {
        G.act(tgt);
        if (whoName(S) !== "f8c0" || S.b5pick) F("「誰に使う？」で選んだあと、仲間の番にならない（問いが残る）");
      }
    }
  }

  // ---------------------------------------------------------------- 150 回ランダムに遊ぶ（決める段あり・仲間二人）
  let stuck = 0, errs = 0, rounds = 0, steps = 0;
  const classes = Object.keys(D.CLASSES);
  for (let gi = 0; gi < 150; gi++) {
    const rnd = seeded(1000 + gi);
    try {
      const S = begin(500 + gi, null, null, classes[gi % classes.length]);
      S.companions = [];
      for (let k = 0; k < 2; k++) G.addCompanion(G.genCompanion());
      S.f3tactic = "wait";
      if (gi % 3 === 0 && S.companions[0]) S.companions[0].f5tac = "adapt"; // 作戦を付けた仲間も混ぜる
      for (let fight = 0; fight < 3 && !S.over; fight++) {
      S.hp = S.maxHp;
      G.startCombat([G.pick(["goblin", "orc", "goblin"])], {});
      for (let i = 0; i < 80 && S.combat && !S.over; i++) {
        const all = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
        if (!all.length) { stuck++; break; }
        const r0 = S.combat.round;
        const a = all[Math.floor(rnd() * all.length)];
        G.act(a.id);
        steps++;
        if (!S.combat || S.combat.round !== r0) rounds++;
      }
      if (S.combat) { S.combat = null; S.mode = "explore"; }
      }
    } catch (e) { errs++; if (errs < 3) F(`ランダムに遊んで例外：${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" ") : e}`); }
  }
  if (stuck) F(`ランダムに遊んで、選べる手が無くなった（${stuck} 回）`);
  if (!rounds) F("ランダムに遊んで、一巡が一度も解けない");

  if (!bad) ok(`F8 一巡の手を決めてから解く（仲間二人・戻る・作戦と倒れた仲間は飛ばす・誰に使う？・古いセーブ・150 回で ${rounds} 巡／${steps} 手）`);
};
