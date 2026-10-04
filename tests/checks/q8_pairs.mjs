// Q8：恋の相手と組み合わせ（data/q8_pairs.js・engine/zzzzzzz_q8_pairs.js）
// - 恋の相手になれるのは一覧（人間の見た目の、名のある人）だけ。ゴブリンの仲間（ギグラ）・名の無い仲間は、好感度が高くても恋に進まない
// - 主人公と相手が「男と男」では恋の出来事を出さない。「男と女」「女と女」では出る
// - 仲間になってすぐは恋の気配が立たない（日数と身の上話）
// - 格の違う相手も一覧と組み合わせ。古いセーブの男と男の連れ合いは、そのまま残る
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("q8 恋の相手: " + m); };
  const start = (sex, ids, seed) => {
    const G = loadEngine();
    G.rand = seeded(seed || 1);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("merc", G.rand);
    G.newGame({ cls: "merc", stats, caps, goal: "custom", goalText: "店を持つ", profile: { name: "測定", sex, age: 26 } });
    ids.forEach((id) => G.c2Join(id));
    return G;
  };
  const by = (G, id) => G.S.companions.find((c) => c.c2 === id);
  const ready = (G, c) => { // 恋の気配が立つための、好感度・日数・身の上話をそろえる
    const S = G.S;
    c.bond = 90;
    S.day += G.data.Q8P.SPARK.days;
    const h = G.tkState(S).heard;
    for (let i = 1; i <= G.data.Q8P.SPARK.heard; i++) h[`${c.c2}_p${i}`] = { day: S.day, k: "" };
  };

  // ---- 組み合わせ
  {
    const M = start("男", ["dil", "adele"]);
    if (M.m10Can(by(M, "dil"))) F("男の主人公と男のディルが恋の相手になる");
    if (!M.m10Can(by(M, "adele"))) F("男の主人公と女のアデルが恋の相手になれない");
    const W = start("女", ["dil", "adele"]);
    if (!W.m10Can(by(W, "dil"))) F("女の主人公と男のディルが恋の相手になれない");
    if (!W.m10Can(by(W, "adele"))) F("女の主人公と女のアデルが恋の相手になれない");
    // 男と男では、恋の気配も恋の話題も出ない（好感度が高くても）。情の出来事のほうになる
    const d = by(M, "dil");
    ready(M, d);
    if (M.m10P.spark(d, M.S)) F("男と男で恋の気配が立つ");
    if (M.tk.loveOk(d, M.S)) F("男と男で恋の話題が出る");
    if (M.r2Topics(d, M.S).some((t) => t.r2 && t.r2.type === "step")) F("男と男で恋の筋の段が出る");
    if (!M.bondKin(d, M.S)) F("男と男の、好感度の高い仲間に情の出来事の道が無い");
    const w = by(W, "adele");
    ready(W, w);
    if (!W.m10P.spark(w, W.S)) F("女と女で、条件をそろえても恋の気配が立たない");
  }

  // ---- ゴブリンの仲間・名の無い仲間
  {
    const G = start("男", ["gigra"]);
    const g = by(G, "gigra");
    ready(G, g);
    g.bond = 100;
    if (G.m10Can(g)) F("ゴブリンの仲間（ギグラ）が恋の相手になる");
    if (G.m10P.spark(g, G.S)) F("ゴブリンの仲間に恋の気配が立つ");
    g.m10 = { st: "spark", cool: 0 };
    if (G.m10P.confess(g, G.S)) F("ゴブリンの仲間が告白してくる");
    if (G.tk.loveOk(g, G.S)) F("ゴブリンの仲間に恋の話題が出る");
    if (G.r2Topics(g, G.S).some((t) => t.r2 && t.r2.type === "step")) F("ゴブリンの仲間に恋の筋の段が出る");
    G.addCompanion({ name: "槍兵のテス", cls: "傭兵", power: 40, dmg: 1, sex: "女" });
    const t = G.S.companions[G.S.companions.length - 1];
    t.bond = 100;
    if (G.m10Can(t)) F("名の無い仲間が恋の相手になる");
    // 一覧：恋の相手は全員、人間の見た目の理由が書いてある。romance の印のある人は、一覧か、入れない理由のどちらかにある
    const D = G.data;
    for (const id of G.romanceIds()) if (!D.Q8P.ALLOW[id] && !D.Q8P.DENY[id]) F(`${id}: 恋の相手の一覧にも、入れない理由にも無い`);
    for (const [id, why] of Object.entries(D.Q8P.ALLOW)) {
      const p = D.C2_PEOPLE[id];
      if (!p || p.romance !== true) F(`${id}: 一覧にあるのに、恋の相手として作られていない`);
      else if ((parseInt(p.age, 10) || 0) < 18) F(`${id}: 18 歳未満が一覧にある`);
      if (!why) F(`${id}: 一覧に理由が無い`);
    }
  }

  // ---- いきなり惚れない
  {
    const G = start("女", ["adele"]);
    const S = G.S, a = by(G, "adele");
    a.bond = 95;
    if (G.m10P.spark(a, S)) F("仲間になったその日に恋の気配が立つ");
    if (G.r2Gate(G.r2Topic("r2_adele_1"), a, S)) F("仲間になったその日に恋の筋の一段目が出る");
    S.day += G.data.Q8P.SPARK.days;
    if (G.m10P.spark(a, S)) F("身の上話を聞かずに恋の気配が立つ");
    const h = G.tkState(S).heard;
    h.adele_p1 = { day: S.day, k: "" }; h.adele_p2 = { day: S.day, k: "" };
    if (!G.m10P.spark(a, S)) F("日数と身の上話がそろっても恋の気配が立たない");
  }

  // ---- 格の違う相手・古いセーブの仲
  {
    const M = start("男", []), W = start("女", []);
    if (M.m11ApAt("zalve", 0, M.S)) F("男の主人公と、男の両替商の続き物が進む");
    if (!W.m11ApAt("zalve", 0, W.S)) F("女の主人公と、両替商の続き物が進まない");
    if (!M.m11ApAt("yoi", 0, M.S)) F("男の主人公と、煙の女の続き物が進まない");
    const O = start("男", ["dil"]);
    const d = by(O, "dil");
    d.m10 = { st: "wed", since: 1 };
    if (O.m10Spouse(O.S) !== d) F("古いセーブの男と男の連れ合いが消えた");
    if (!O.m10Can(d)) F("古いセーブの男と男の連れ合いが、恋の相手から外れた");
  }
  if (!n) ok("q8 恋の相手（男と女・女と女だけ・ゴブリンと名の無い仲間は恋しない・一覧の理由・いきなり惚れない・格の違う相手・古いセーブ）");
};
