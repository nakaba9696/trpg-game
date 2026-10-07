// F3：戦闘で仲間に指示を出す（engine/zzzzzzzzzzzz_f3_orders.js・data/f3_orders.js）
// - 任せる（作戦も指示も出さない）と、今まで通り：指示の仕組みを外したときと、同じ乱数でまったく同じ記録になる
// - 指示どおり動く：狙いを攻める（あなたの狙いへ）・手当て（少しの傷でも）・庇う（あなたの受ける傷が減り、仲間が受ける）・下がる（受ける傷が半分）・薬を使う
// - 作戦が効く：守り重視なら大技の気配で庇う・早めに手当て。全力ならあなたの狙いを攻める。作戦は戦いをまたいで残り、指示は手番の終わりに消える
// - 指示・作戦を変えても手番は進まない。仲間が持っていない手（回復役でない者の手当てなど）は出ない
// - 渋る：好感度が低い臆病者に「庇え」と言うと、渋ることがある（一言出る）。好感度が高ければ（臆病者でなければ）渋らない
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("F3 仲間への指示：" + m); };
  const G = loadEngine();
  const D = G.data;
  if (!G.f3 || !G.cbAllyOrder) { F("指示の仕組み（G.f3・G.cbAllyOrder）が無い"); return; }
  const mk = (i, extra) => Object.assign({ id: "f3c" + i, name: `仲間${"アイウ"[i]}`, cls: "傭兵", power: 60, dmg: 2, desc: "無口", trait: "loyal", bond: 70 }, extra || {});
  const begin = (seed, comps) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 40; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999;
    S.companions = comps;
    G.b5Party(S);
    return S;
  };
  const ids = () => G.actions().flatMap((g) => g.list).map((a) => a.id);
  const textOf = (S, from) => S.log.slice(from).map((l) => l.text || `${l.reason}:${l.roll}`).join("\n");

  // ---------------------------------------------------------------- 任せる＝今まで通り
  {
    const run = (off) => {
      const S = begin(11, [mk(0), mk(1, { heal: true, cls: "僧侶" }), mk(2, { fire: true, cls: "魔法使い" })]);
      const keep = G.cbAllyOrder;
      if (off) G.cbAllyOrder = null;
      try {
        G.startCombat(["orc", "goblin"], {});
        const from = S.log.length;
        for (let i = 0; i < 12 && S.combat; i++) G.act("cb:attack");
        return textOf(S, from);
      } finally { G.cbAllyOrder = keep; }
    };
    if (run(false) !== run(true)) F("作戦も指示も出さない（任せる）と、指示の仕組みが無いときと戦いが変わる");
  }

  // ---------------------------------------------------------------- 選択肢・手番が進まない
  {
    const S = begin(12, [mk(0), mk(1, { heal: true, cls: "僧侶" })]);
    G.startCombat(["orc", "goblin"], {});
    const list = ids();
    if (!list.includes("f3:tac:guard")) F("作戦の選択肢が無い");
    if (!list.includes("f3:ord:f3c0:cover") || !list.includes("f3:ord:f3c1:heal")) F("仲間ごとの指示が出ない");
    if (list.includes("f3:ord:f3c0:heal")) F("回復役でない仲間に「手当て」が出る");
    const turn = S.turn, round = S.combat.round, logN = S.log.length;
    G.act("f3:tac:guard");
    G.act("f3:ord:f3c0:back");
    if (S.turn !== turn || S.combat.round !== round || S.log.length !== logN) F("作戦・指示を変えると手番が進む（か、記録が増える）");
    if (S.f3tactic !== "guard" || S.combat.f3ord.f3c0 !== "back") F("作戦・指示が覚えられない");
    G.act("cb:guard");
    if (S.combat && S.combat.f3ord && S.combat.f3ord.f3c0) F("指示が手番の終わりに消えない");
    if (S.f3tactic !== "guard") F("作戦が手番のあとに消えた");
  }

  // 呼び名が重なる仲間でも、指示の組の見出しは重ならない（押すと開く組の鍵になる）
  {
    begin(22, [mk(0, { name: "剣士のノエル" }), mk(1, { name: "弓使いのノエル" })]);
    G.startCombat(["goblin"], {});
    const titles = G.actions().map((g) => (g.title || "").replace(/（.*$/, "")).filter((t) => /ノエル/.test(t));
    if (titles.length !== 2 || titles[0] === titles[1]) F(`呼び名の重なる仲間の指示の組が見分けられない：${titles.join("・")}`);
  }

  // ---------------------------------------------------------------- 指示どおり動く
  {
    // 狙いを攻める：あなたの狙い（二体目）へ
    const S = begin(13, [mk(0, { power: 95 })]);
    G.startCombat(["goblin", "orc"], {});
    S.combat.foes.forEach((f) => { f.hp = f.max = 500; });
    G.setAim(1);
    let onAim = 0;
    for (let i = 0; i < 6; i++) {
      G.act("f3:ord:f3c0:attack");
      const from = S.log.length;
      G.act("cb:guard");
      if (S.log.slice(from).some((l) => l.fx === "hit" && l.foe === S.combat.foes[1].name && /仲間ア/.test(l.text))) onAim++;
      if (S.log.slice(from).some((l) => l.fx === "hit" && l.foe === S.combat.foes[0].name && /仲間ア/.test(l.text))) F("「狙いを攻める」で、狙っていない敵を攻めた");
    }
    if (!onAim) F("「狙いを攻める」で、あなたの狙う敵に一度も当たらない");
  }
  {
    // 手当て：少しの傷でも治す
    const S = begin(14, [mk(0, { heal: true, cls: "僧侶" })]);
    G.startCombat(["goblin"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 500;
    S.hp = 900;
    G.act("f3:ord:f3c0:heal");
    const hp0 = S.hp;
    const r0 = G.rand; G.rand = () => 0.99; // 敵は外す
    try { G.act("cb:guard"); } finally { G.rand = r0; }
    if (!(S.hp > hp0)) F("「手当て」で、少しの傷を治さない");
  }
  {
    // 庇う：あなたの受ける傷が減り、仲間が受ける。下がる：仲間の受ける傷が半分
    const S = begin(15, [mk(0), mk(1)]);
    G.startCombat(["orc"], {});
    const f = S.combat.foes[0];
    f.hp = f.max = 500;
    const hit = D.ENEMIES.orc.hit; D.ENEMIES.orc.hit = 999;
    try {
      // 敵があなたを狙う手番まで、毎手番「庇え」と言う
      const c = S.companions[0];
      let covered = false;
      for (let i = 0; i < 12 && S.combat && !covered; i++) {
        G.act("f3:ord:f3c0:cover");
        const hp0 = c.hp, from = S.log.length;
        G.act("cb:guard");
        covered = c.hp < hp0 && S.log.slice(from).some((l) => /あなたを庇い/.test(l.text || ""));
      }
      if (!covered) F("「庇う」で、仲間があなたの代わりに傷を受けない");
      const backHurt = (back) => {
        const s2 = begin(16, [mk(0)]);
        G.startCombat(["orc"], {});
        s2.combat.foes[0].hp = s2.combat.foes[0].max = 500;
        if (back) G.act("f3:ord:f3c0:back");
        // 仲間を必ず狙わせる（敵の狙いの乱数を固定）
        s2.combat.f3back = back ? ["仲間ア"] : [];
        const c2 = s2.companions[0];
        return G.cbAllyHurt(c2, 10);
      };
      if (!(backHurt(true) < backHurt(false))) F("「下がる」で、仲間の受ける傷が減らない");
    } finally { D.ENEMIES.orc.hit = hit; }
  }
  {
    // 薬を使う：持ち物の薬が減り、傷が治る
    const S = begin(17, [mk(0)]);
    G.startCombat(["goblin"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 500;
    G.give("potion", 1);
    S.hp = 700;
    if (!ids().includes("f3:ord:f3c0:potion")) F("薬を持っているのに「薬を使う」が出ない");
    const meds = () => Object.keys(S.inv).filter((id) => (D.ITEMS[id] || {}).hp).reduce((a, id) => a + S.inv[id], 0);
    const n0 = meds();
    G.act("f3:ord:f3c0:potion");
    const r0 = G.rand; G.rand = () => 0.99;
    try { G.act("cb:guard"); } finally { G.rand = r0; }
    if (!(meds() < n0 && S.hp > 700)) F("「薬を使う」で、薬が減らない（か、治らない）");
  }

  // ---------------------------------------------------------------- 作戦が効く
  {
    // 守り重視：大技の気配で庇う
    const S = begin(18, [mk(0)]);
    G.startCombat(["orc"], {});
    S.combat.foes[0].hp = S.combat.foes[0].max = 500;
    G.act("f3:tac:guard");
    S.combat.foes[0].f1i = { k: "heavy" };
    const from = S.log.length;
    G.act("cb:guard");
    if (!S.log.slice(from).some((l) => /あなたの前に出て/.test(l.text || ""))) F("作戦「守り重視」で、大技の気配に仲間が庇わない");
    // 回復優先：少しの傷で手当て。任せるでは手当てしない
    const healed = (tac) => {
      const s2 = begin(19, [mk(0, { heal: true, cls: "僧侶" })]);
      G.startCombat(["goblin"], {});
      s2.combat.foes[0].hp = s2.combat.foes[0].max = 500;
      s2.hp = 800; // 8 割：回復優先（85% 未満）なら治し、任せる（50% 未満）なら治さない
      if (tac) G.act("f3:tac:" + tac);
      const hp0 = s2.hp;
      const r0 = G.rand; G.rand = () => 0.99;
      try { G.act("cb:guard"); } finally { G.rand = r0; }
      return s2.hp > hp0;
    };
    if (!healed("heal")) F("作戦「回復優先」で、少しの傷を手当てしない");
    if (healed(null)) F("任せるのに、少しの傷で手当てした（今までと違う）");
    // 作戦は戦いをまたいで残る
    const s3 = begin(20, [mk(0)]);
    s3.f3tactic = "all";
    G.startCombat(["goblin"], {});
    G.S.combat = null; G.S.mode = "explore";
    G.startCombat(["goblin"], {});
    if (G.f3.tactic(s3) !== "all") F("作戦が次の戦いに残らない");
  }

  // ---------------------------------------------------------------- 渋る
  {
    const balks = (bond, trait) => {
      const S = begin(21, [mk(0, { bond, trait })]);
      G.startCombat(["goblin"], {});
      S.combat.foes[0].hp = S.combat.foes[0].max = 500;
      G.act("f3:ord:f3c0:cover");
      const from = S.log.length;
      const r0 = G.rand; G.rand = () => 0.01;
      try { G.act("cb:guard"); } finally { G.rand = r0; }
      return S.log.slice(from).some((l) => (D.F3_BALK[trait] || D.F3_BALK.any).some((t) => (l.text || "").includes(t.split("{n}").pop().slice(0, 6))));
    };
    if (!balks(10, "coward")) F("好感度の低い臆病者に「庇え」と言っても、渋らない");
    if (balks(90, "loyal") || balks(90, "soft")) F("好感度が高いのに、「庇え」を渋った（臆病者でない）");
    if (G.f3.balkChance({ bond: 90, trait: "loyal", hp: 30 }, "attack") !== 0) F("好感度の高い仲間が、ふつうの攻めを渋ることがある");
  }

  if (!bad) ok("F3 仲間への指示（作戦 4・指示 8。任せると今まで通り・指示どおり・作戦が効く・手番は進まない・渋る）");
};
