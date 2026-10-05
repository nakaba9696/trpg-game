// W7g：使徒領への関所と警告（data/events_w7g.js・items_w7g.js・engine/zzzzzzzzz_w7_gate.js）
// 持ち主の声「使徒領に簡単に入れすぎる。敵が明らかに強いので、警告なりなんなり欲しい。一般人が行っても自殺行為なので」
// - 人の土地から D.LAWLESS（人と魔の境・使徒領）へ入る道は、旅の選択肢に見える（控えめな印つき）が、押すと砦で止められる（場所は動かない）
// - 条件なしで選べるのは、夜番を手伝う（戦い）・兵の目を盗む（判定）・引き返す。名と位・通行証・崖の道は、条件を満たしたときだけ
// - 名と位（名声か騎士以上）／通行証／夜番に勝つ／目を盗む／崖の道 → 入る直前の警告。「それでも進む」で入れる、「引き返す」で入らない
// - 目を盗みそこねると捕まる（日がたつ・悪名）。崖の道は、密輸人の出来事で見つけてから
// - 中から外へ、中の道どうしは止めない（古いセーブで中にいても戻れる）。地図の道に gate の印
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("W7g：" + m); };
  const G = loadEngine();
  const D = G.data;
  const W = G.w7g;
  if (!W || typeof W.gated !== "function") return F("G.w7g.gated が無い");
  const fresh = (seed, loc = "fort") => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 22 } });
    const S = G.S;
    S.loc = loc; S.visited[loc] = true; S.maxHp = S.hp = 400; S.gold = 300;
    return S;
  };
  const labels = () => G.eventChoices().map(({ c }) => c.label);
  const pick = (re) => { const x = G.eventChoices().find(({ c }) => re.test(c.label)); if (!x) return false; G.act("ev:" + x.i); return true; };
  // 旅を最後まで進める（旅の出来事・戦い）
  const finish = (S) => {
    for (let k = 0; k < 300 && !S.over; k++) {
      if (S.combat) { G.act("cb:attack"); continue; }
      if (S.mode === "event") { const ch = G.eventChoices(); G.act("ev:" + ch[ch.length - 1].i); continue; }
      if (S.travel) { const a = G.actions().flatMap((g) => g.list).find((x) => !x.disabled); if (a) G.act(a.id); continue; }
      break;
    }
  };

  // 入口の道
  const gates = [];
  for (const [id, L] of Object.entries(D.LOCS)) for (const to of Object.keys(L.links || {})) if (W.gated(id, to)) gates.push([id, to]);
  if (!gates.length) F("人の土地から使徒領・人と魔の境へ入る道が無い（関所の対象が無い）");
  for (const [a, b] of gates) if (W.gated(b, a)) F(`${b}→${a}（外へ出る道）まで止めている`);

  // 1. 条件なし：止められる
  for (const [from, to] of gates) {
    const S = fresh(3, from);
    const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "travel:" + to);
    if (!a) { F(`${from}: ${to} への旅の選択肢が見えない`); continue; }
    if (!/砦が道を塞ぐ/.test(a.sub || "")) F(`${from}: ${to} への選択肢に印が無い（${a.sub}）`);
    G.act("travel:" + to);
    if (S.loc !== from || S.mode !== "event" || S.event !== "w7g_gate") F(`${from}→${to}: 条件なしで砦に止められない（${S.loc}・${S.event}）`);
    const ls = labels();
    if (ls.some((l) => /名と位|通行証|崖の道|通ったこと/.test(l))) F(`条件なしで、条件つきの手が見える：${ls.join("／")}`);
    if (!ls.some((l) => /引き返す/.test(l)) || !ls.some((l) => /夜番/.test(l)) || !ls.some((l) => /目を盗/.test(l))) F(`条件なしの手が足りない：${ls.join("／")}`);
    pick(/引き返す/);
    if (S.loc !== from || S.mode === "event") F("引き返しても、砦に戻らない");
  }

  // 2. 名と位 → 警告 → 進む
  {
    const S = fresh(5);
    S.fame = 200;
    G.act("travel:mountains");
    if (!pick(/名と位/)) F("名の知れた者に「名と位を名乗る」が出ない");
    if (S.event !== "w7g_warn") F(`名乗ったあと、警告が出ない（${S.event}）`);
    if (!S.flags.w7g_pass || !(S.inv.w7g_writ > 0)) F("名乗っても、通った印か通行証が残らない");
    if (S.loc !== "fort") F("警告の前に入ってしまう");
    pick(/それでも進む/);
    finish(S);
    if (!S.over && S.loc !== "mountains") F(`「それでも進む」で入れない（${S.loc}）`);
    // 中から外へは止めない
    if (!S.over) {
      S.mode = "explore"; S.event = null; S.combat = null; S.travel = null;
      G.act("travel:fort");
      finish(S);
      if (!S.over && S.loc !== "fort") F(`中から砦へ戻れない（${S.loc}・${S.event}）`);
    }
  }
  // 3. 通ったことがある → 警告で引き返す
  {
    const S = fresh(6);
    S.flags.w7g_pass = true;
    G.act("travel:mountains");
    if (!pick(/通ったこと/)) F("通った者に「通ったことがあると言う」が出ない");
    if (S.event !== "w7g_warn") F("通った者でも、入る前の警告が出ない");
    pick(/引き返す/);
    if (S.loc !== "fort" || S.mode === "event") F("警告で引き返しても、砦にいない");
  }
  // 4. 騎士・通行証
  {
    const S = fresh(7);
    S.title = "騎士";
    G.act("travel:mountains");
    if (!labels().some((l) => /名と位/.test(l))) F("騎士に「名と位を名乗る」が出ない");
    const S2 = fresh(8);
    S2.inv.w7g_writ = 1;
    G.act("travel:mountains");
    if (!pick(/通行証/) || S2.event !== "w7g_warn") F("通行証を見せても警告に進まない");
  }
  // 5. 目を盗む：しくじると捕まる（日がたつ・悪名）／うまくいけば警告
  {
    let caught = false, slipped = false;
    for (let seed = 1; seed <= 40 && !(caught && slipped); seed++) {
      const S = fresh(100 + seed);
      const day = S.day;
      G.act("travel:mountains");
      pick(/目を盗/);
      if (S.event === "w7g_warn") slipped = true;
      else if (S.loc === "fort" && S.day > day) caught = true;
    }
    if (!caught) F("目を盗みそこねても、捕まらない（日がたたない）");
    if (!slipped) F("目を盗んでも、警告に進まない");
  }
  // 6. 崖の道：密輸人の出来事で見つけてから
  {
    const S = fresh(9);
    G.act("travel:mountains");
    if (labels().some((l) => /崖の道/.test(l))) F("崖の道を知らないのに、崖の道が出る");
    pick(/引き返す/);
    const ev = D.EVENTS.find((e) => e.id === "w7g_cliff");
    if (!ev || !ev.where.includes("fort")) F("砦で崖の道を聞く出来事が無い");
    else {
      let found = false;
      for (let seed = 1; seed <= 30 && !found; seed++) {
        const s = fresh(200 + seed);
        G.startEvent("w7g_cliff");
        pick(/パン|毛皮/);
        if (s.flags.w7g_cliff) found = true;
      }
      if (!found) F("密輸人の出来事で崖の道を知る手が無い");
    }
    const s = fresh(10);
    s.flags.w7g_cliff = true;
    G.act("travel:mountains");
    if (!labels().some((l) => /崖の道/.test(l))) F("崖の道を知っていても、崖の道が出ない");
  }
  // 7. 夜番を手伝う（戦い）に勝つと、通行証と警告
  {
    let done = false;
    for (let seed = 1; seed <= 10 && !done; seed++) {
      const S = fresh(300 + seed);
      S.maxHp = S.hp = 2000;
      G.act("travel:mountains");
      pick(/夜番/);
      for (let k = 0; k < 200 && S.combat && !S.over; k++) G.act("cb:attack");
      if (S.event === "w7g_warn" && S.inv.w7g_writ > 0) done = true;
    }
    if (!done) F("夜番の戦いに勝っても、通行証と警告にならない");
  }
  // 8. 地図の印・古いセーブ
  {
    const S = fresh(11);
    const vis = { visited: Object.fromEntries(Object.keys(D.LOCS).map((k) => [k, true])), loc: "fort" };
    const roads = G.w5.roads(vis);
    for (const [a, b] of gates) if (!roads.some((r) => ((r.a === a && r.b === b) || (r.a === b && r.b === a)) && r.gate)) F(`地図の ${a}–${b} に、砦が塞ぐ印が無い`);
    if (roads.some((r) => r.gate && !gates.some(([a, b]) => (r.a === a && r.b === b) || (r.a === b && r.b === a)))) F("関所でない道に、砦が塞ぐ印がある");
    S.loc = "wasteland"; S.mode = "explore";
    const out = G.actions().flatMap((g) => g.list).find((x) => x.id === "travel:mountains");
    if (!out) F("使徒領の中で、断界山脈への道が見えない");
    else { G.act(out.id); if (S.event === "w7g_gate") F("使徒領の中の道まで止めている"); }
  }
  if (!bad) ok(`W7g（関所の道 ${gates.length}：${gates.map((g) => g.join("→")).join("・")}）`);
};
