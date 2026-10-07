// E7b：長編（E7）で道中に死んだ名のある人の、恋の筋・頼みごと・会話・出来事が、死んだあとに出ない
// - 恋人・連れ合いだった人が長編で死ぬと、M10 の「失ったとき」の扱い（過去の相手に死別として残る・恋人や連れ合いの欄が空く）になる
// - 家に残した連れ合いが長編で死んでも同じ
// - 死んだ人（ベルトラン・ミュゼット）の出来事は、どの場所でも起きない。行動の欄にその人の名が出ない。仲間の欄にいない
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let failures = 0;
  const fail = (m) => { failures++; fail0("E7b: " + m); };
  const G = loadEngine();
  const D = G.data;
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("merc", G.rand);
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 28, history: "", personality: "" } });
    G.S.day = 60;
    return G.S;
  };
  const sweep = (S, id, nm, where) => {
    const hits = new Set();
    for (const loc of Object.keys(D.LOCS)) {
      S.loc = loc; S.mode = "explore"; S.event = null; S.fac = null; S.travel = null;
      const tags = G.eventTags();
      for (const e of D.EVENTS) {
        const c2 = [].concat(e.c2 || []);
        if (!c2.includes(id) || !(e.w > 0) || !e.where.some((w) => tags.includes(w))) continue;
        let on = true;
        try { on = !e.cond || e.cond(S); } catch { on = false; }
        if (on) hits.add(e.id);
      }
      try { G.actions().flatMap((g) => g.list).forEach((a) => { if (String(a.label || "").includes(nm)) hits.add("行動「" + a.label + "」"); }); } catch (e) { hits.add("例外 " + e.message); }
    }
    if (hits.size) fail(`${where}：死んだ${nm}の出来事・行動が出る：${[...hits].slice(0, 6).join("・")}`);
    if ((S.companions || []).some((c) => c.c2 === id)) fail(`${where}：死んだ${nm}が仲間の欄にいる`);
  };
  const kill = (key) => G.apply({ e7: { id: "mirza", lose: key } });

  // 1. 仲間にいて、恋人だったベルトラン
  {
    const S = start(11);
    G.c2Join("bertrand");
    const c = S.companions.find((x) => x.c2 === "bertrand");
    if (!c) fail("ベルトランを仲間にできない");
    else {
      G.m10Of(c).st = "love";
      G.m10State(S).lover = c.id;
      kill("bert");
      const m = G.m10State(S);
      if (G.m10Partner(S)) fail("恋人のベルトランが死んでも、恋人の欄が空かない");
      if (!(m.past || []).some((p) => p.how === "death")) fail("恋人のベルトランの死が、過去の相手に死別として残らない");
      if (!G.c2Gone("bertrand", S)) fail("ベルトランが、もういない人になっていない");
      sweep(S, "bertrand", "ベルトラン", "恋人のベルトラン");
    }
  }
  // 2. 家に残した連れ合いのベルトラン
  {
    const S = start(12);
    G.c2Join("bertrand");
    const c = S.companions.find((x) => x.c2 === "bertrand");
    if (c) {
      G.m10Of(c).st = "wed";
      const m = G.m10State(S);
      m.spouse = { id: c.id, name: c.name, cls: c.cls, sex: "男", day: S.day, loc: "どこか", how: "church" };
      S.flags.m10_sp = c.name;
      S.companions.splice(S.companions.indexOf(c), 1);
      m.atHome = c;
      kill("bert");
      if (m.atHome) fail("家に残した連れ合いが死んでも、家に残ったまま");
      if (!(m.spouse && m.spouse.lost === "death")) fail("家に残した連れ合いの死が、連れ合いを亡くしたことにならない");
      if (!S.chronicle.some((x) => /連れ合いの.*を亡くす/.test(x.text))) fail("年表に、連れ合いを亡くした行が無い");
      sweep(S, "bertrand", "ベルトラン", "家に残した連れ合いのベルトラン");
    }
  }
  // 3. 仲間にいないまま長編で死んだベルトランとミュゼット
  {
    const S = start(13);
    G.c2Meet("bertrand"); G.c2Meet("musette");
    kill("bert"); kill("mus");
    sweep(S, "bertrand", "ベルトラン", "仲間にいなかったベルトラン");
    sweep(S, "musette", "ミュゼット", "ミュゼット");
    G.c2Join("bertrand");
    if (S.companions.some((x) => x.c2 === "bertrand")) fail("死んだベルトランを、また仲間に誘える");
  }
  if (failures === 0) ok("E7b 長編で死んだ人の恋の筋・頼みごと・出来事が止まる（恋人・家の連れ合い・仲間でない人）");
};
