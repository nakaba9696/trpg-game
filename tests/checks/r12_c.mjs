// R12（レーン C）：R11 のプレイレビュー（docs/review/playreview_2026-10-11.md）の中 2・中 3・中 19
// - 中 2：エピローグの「印象的な出来事」に暦の節目（「一年」「十年」）を選ばない
// - 中 3：雇っていない仲間が放っておかれて下がるのは「ふつう」で止まる。理由の行に負の数を出さない（段が変われば段の言葉）
// - 中 19：年の変わり目に主人公の歳（S.profile.age）が進む。古いセーブ（S.r12age が無い・もう何年もたった）でも歳が合う
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const f = (m) => { bad++; fail("R12-C: " + m); };
  const start = (G, cls, seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats(cls, G.rand);
    G.newGame({ cls, stats, caps, goal: "king", profile: { name: "テスト", sex: "女", age: 24, history: "", personality: "無口" } });
    return G.S;
  };
  const Y = (G) => G.YEAR_DAYS;

  // ---------------------------------------------------------------- 中 2
  {
    const G = loadEngine();
    const S = start(G, "merc", 1201);
    S.chronicle = [{ day: Y(G) + 1, date: G.dateOf(Y(G) + 1), text: "節目に着く：一年", kind: "milestone" }];
    for (let i = 0; i < 20; i++) {
      const F = G.r11.facts(S, {});
      if (F.big) { f(`暦の節目が印象的な出来事に選ばれる（${F.big.text}）`); break; }
    }
    S.chronicle.push({ day: 50, date: G.dateOf(50), text: "灰色の塔で叙任を受ける", kind: "trophy" });
    const F = G.r11.facts(S, {});
    if (!F.big || F.big.text !== "灰色の塔で叙任を受ける") f(`ほかの出来事があっても選ばれない（${JSON.stringify(F.big)}）`);
  }

  // ---------------------------------------------------------------- 中 3
  {
    const G = loadEngine();
    const S = start(G, "merc", 1202);
    S.mode = "explore";
    G.addCompanion({ name: "旅の連れのテスト", cls: "fighter", power: 30, dmg: [1, 6, 0], desc: "無口な剣士" });
    const c = S.companions[S.companions.length - 1];
    G.m2State(S);
    S.m2.day = S.day;
    S.gold = 100;
    c.bond = 60;
    for (let i = 0; i < 200; i++) { S.day += 5; G.endTurn(); if (S.over) break; }
    if (G.m2Mood(c.bond) !== "ふつう") f(`放っておかれた仲間が「ふつう」で止まらない（bond ${c.bond}・${G.m2Mood(c.bond)}）`);
    const lines = S.log.map((l) => l.text || "").filter((t) => /口をきいてもらえず/.test(t));
    if (!lines.length) f("放っておかれて下がる理由の行が出ない");
    if (lines.some((t) => /-\d|−\d/.test(t))) f(`理由の行に負の数が出る：${lines.find((t) => /-\d/.test(t))}`);
    if (!lines.some((t) => /（.+ → ふつう）/.test(t))) f(`段が変わったときに段の言葉が出ない：${lines.join(" / ")}`);
    // ふつうより下にいる仲間は、放っておかれてもそれ以上は下がらない
    c.bond = 30; c.talkDay = 1;
    for (let i = 0; i < 10; i++) { S.day += 5; G.endTurn(); }
    if (c.bond < 30) f(`ふつうより下の仲間が放っておかれてさらに下がる（${c.bond}）`);
  }

  // ---------------------------------------------------------------- 中 19
  {
    const G = loadEngine();
    let S = start(G, "priest", 1203);
    const act = () => {
      S.mode = "explore"; S.fac = null; S.event = null; S.combat = null;
      const a = G.actions().flatMap((g) => g.list).find((x) => !x.disabled && /^(rest|wait|camp|look|explore)/.test(x.id)) || G.actions().flatMap((g) => g.list).find((x) => !x.disabled);
      G.act(a.id);
    };
    act();
    if (S.profile.age !== 24) f(`一年目に歳が変わる（${S.profile.age}）`);
    S.day = Y(G) + 1; act();
    if (S.profile.age !== 25) f(`年が改まっても歳が進まない（${S.profile.age}）`);
    if (!S.log.some((l) => /25歳になった/.test(l.text || ""))) f("歳が進んだ一行が無い");
    S.day = 3 * Y(G) + 5; act();
    if (S.profile.age !== 27) f(`三年たって 27 歳にならない（${S.profile.age}）`);
    if (G.r11.retireAge(S) !== 34) f(`引退の歳（始めた歳＋10）が変わった（${G.r11.retireAge(S)}）`);
    // 古いセーブ：S.r12age が無く、もう五年目
    S = start(G, "priest", 1204);
    delete S.r12age; S.r11.age0 = 30; S.profile.age = 30; S.day = 4 * Y(G) + 10;
    act();
    if (S.profile.age !== 34) f(`古いセーブで歳が追いつかない（${S.profile.age}）`);
    // R11 も無い古いセーブ（歳が文字）
    S = start(G, "priest", 1205);
    delete S.r12age; delete S.r11; S.profile.age = "40"; S.day = 2 * Y(G) + 3;
    act();
    if (S.profile.age !== 42 || (S.r11 && S.r11.age0 !== 40)) f(`R11 も無い古いセーブで歳が合わない（${S.profile.age}・${S.r11 && S.r11.age0}）`);
  }

  if (!bad) ok("R12-C：エピローグに暦の節目を選ばない・放っておかれる減りはふつうまで・主人公が年を取る");
};
