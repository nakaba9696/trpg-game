// Q8：仲間の好感度の上がり方（data/q8_bond.js）と、恋人になる条件（data/q8_love.js）
// - 雑談（話す・夜の会話・掛け合い）だけでは、一日の上限があり、「信頼している」の入り口で頭打ちになる
// - それ以外（一緒の戦い・出来事）で上がる分も減る。下がる分はそのまま
// - 町で話してばかりの遊び方を決まった乱数で回し、好感度が頭打ちになる
// - 好感度だけ高くても、その人の条件がそろわないと恋仲にならない（告白の出来事が起きない・恋仲の結果が先送り）。そろえばなれる
// - 条件の「罪」は、はっきりした大きな行いだけ（好感度が下がったことは条件にしない）
// 節目（目的以外は尋ねない・仲間との終わりは結婚で）は tests/checks/m6_ending.mjs
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("q8 恋と好感度: " + m); };
  const start = (seed, ids) => {
    const G = loadEngine();
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("merc", G.rand);
    G.newGame({ cls: "merc", stats, caps, goal: "custom", goalText: "店を持つ", profile: { name: "測定", sex: "女", age: 24 } });
    ids.forEach((id) => G.c2Join(id));
    return G;
  };
  const aff = (G, c) => G.affFromBond(c.bond);

  // ---- 雑談の上限と頭打ち
  {
    const G = start(1, ["dil"]);
    const D = G.data, S = G.S, c = S.companions[0];
    S.tk = S.tk || {}; S.tk.cur = { cid: c.id }; // 話している最中
    const a0 = aff(G, c);
    G.affAdd("dil", 10);
    G.affAdd("dil", 10);
    if (aff(G, c) - a0 > D.Q8B.chatPerDay) F(`一日の雑談で ${aff(G, c) - a0} 上がった（上限 ${D.Q8B.chatPerDay}）`);
    if (aff(G, c) === a0) F("雑談で少しも上がらない");
    for (let d = 0; d < 80; d++) { S.day++; G.affAdd("dil", 10); }
    if (aff(G, c) > D.Q8B.chatTop) F(`雑談だけで ${aff(G, c)} まで上がった（${D.Q8B.chatTop} で頭打ちのはず）`);
    S.tk.cur = null;
    const a1 = aff(G, c);
    G.affAdd("dil", 10);
    if (aff(G, c) - a1 !== 10 * D.Q8B.mul.deed) F(`雑談でないところの +10 が ${aff(G, c) - a1}（${10 * D.Q8B.mul.deed} のはず）`);
    const a2 = aff(G, c);
    G.affAdd("dil", -6);
    if (aff(G, c) - a2 !== -6) F("下がる分が変わった");
    // ふつうの仲間（M2 の bond）：端数は持ち越して、合計では割合どおり
    G.addCompanion({ name: "槍兵のテス", cls: "傭兵", power: 40, dmg: 1 });
    const m = S.companions[S.companions.length - 1];
    const b0 = m.bond;
    for (let i = 0; i < 10; i++) G.m2Bond(m, 1, true);
    if (m.bond - b0 !== 10 * D.Q8B.mul.deed) F(`ふつうの仲間の bond +1 を十回で ${m.bond - b0}（${10 * D.Q8B.mul.deed} のはず）`);
  }

  // ---- 町で話してばかりの遊び方（決まった乱数）：雑談の上限で頭打ちになる
  {
    const G = start(2, ["adele", "kaidel"]);
    const D = G.data, S = G.S;
    S.gold = 5000;
    for (let s = 0; s < 3000 && !S.over && S.day < 90; s++) {
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      let a;
      if (S.mode === "event" || S.mode === "combat") a = acts[0];
      else if (S.mode === "fac") a = acts.find((x) => x.id === "inn:rest") || acts.find((x) => x.id === "back") || acts[0];
      else a = acts.find((x) => x.id.startsWith("m2talk:")) || acts.find((x) => x.id === "fac:inn") || acts[0];
      G.act(a.id);
    }
    const top = Math.max(...S.companions.map((c) => aff(G, c)));
    if (top > D.Q8B.chatTop + 12) F(`町で話してばかりで ${top} まで上がった（${S.day} 日目）`);
  }

  // ---- 恋人になる条件
  // 告白の出来事が起きるか（恋の筋の人は、すれ違いの段〔4〕まで済んでいることにして見る）
  const confessable = (G, c) => { c.m10 = Object.assign(c.m10 || {}, { st: "spark", cool: 0 }); if (G.r2Has(c)) G.r2Of(c.c2, G.S).st = 4; return G.m10P.confess(c, G.S); };
  {
    const G = start(3, ["dil", "adele"]);
    const S = G.S;
    const [dil, adele] = S.companions;
    dil.bond = 95; adele.bond = 95;
    if (confessable(G, dil)) F("好感度だけで、ディルの告白が起きる");
    G.m10Do("love", dil, { confess: true });
    if (G.m10St(dil) === "love") F("条件のそろわないディルと恋仲になった");
    if (!S.log.some((l) => (l.text || "").includes("その時ではない"))) F("恋仲が先送りになったとき、一言も出ない");
    G.tkState(S).heard.dil_p4 = { day: S.day, k: "" };
    dil.m10.cool = 0;
    if (!confessable(G, dil)) F(`条件がそろったのに、ディルの告白が起きない（${G.q8LoveMissing(dil, S).join("・")}）`);
    G.crime("betrayal");
    if (G.q8LoveOk(dil, S)) F("人を売ったのに、ディルの条件がそろったまま");
    // アデル：話と、麦の都へ一緒に行くこと
    G.tkState(S).heard.adele_p6 = { day: S.day, k: "" };
    if (G.q8LoveOk(adele, S)) F("麦の都へ一緒に行かずに、アデルの条件がそろった");
    G.arrive("w2_granbel");
    if (!G.q8LoveOk(adele, S)) F(`麦の都へ一緒に行ったのに、アデルの条件がそろわない（${G.q8LoveMissing(adele, S).join("・")}）`);
    G.m10Do("love", adele, { confess: true });
    if (G.m10St(adele) !== "love") F("条件のそろったアデルと恋仲になれない");
  }
  {
    // 日数の条件（カイデル）・好感度が下がったことは条件にしない（マルゴ）
    const G = start(4, ["kaidel", "margot"]);
    const S = G.S;
    const [kai, mar] = S.companions;
    G.tkState(S).heard.kaidel_p5 = { day: S.day, k: "" };
    if (G.q8LoveOk(kai, S)) F("加わったその日に、カイデルの条件（一緒に旅した日数）がそろった");
    S.day += 31;
    if (!G.q8LoveOk(kai, S)) F(`ひと月旅したのに、カイデルの条件がそろわない（${G.q8LoveMissing(kai, S).join("・")}）`);
    G.tkState(S).heard.margot_p5 = { day: S.day, k: "" };
    G.affAdd("margot", -30);
    G.crime("theft");
    if (!G.q8LoveOk(mar, S)) F("好感度が下がった・小さな罪で、マルゴの条件がそろわない");
    G.crime("murder");
    if (G.q8LoveOk(mar, S)) F("罪のない人を殺したのに、マルゴの条件がそろう");
  }
  {
    // 難しい道の人（ギグラ）：恋の筋の告白の条件を、M10 の告白にも当てる
    const G = start(5, ["gigra"]);
    const S = G.S, c = S.companions[0];
    c.bond = 95;
    if (confessable(G, c)) F("身の上の最後を聞かずに、ギグラの告白が起きる");
    G.tkState(S).heard.gigra_p6 = { day: S.day, k: "" };
    c.m10.cool = 0;
    if (!confessable(G, c)) F(`身の上の最後を聞いたのに、ギグラの告白が起きない（${G.q8LoveMissing(c, S).join("・")}）`);
    // 名の無い仲間は、一緒に旅した日数
    G.addCompanion({ name: "槍兵のテス", cls: "傭兵", power: 40, dmg: 1 });
    const m = S.companions[S.companions.length - 1];
    if (G.q8LoveOk(m, S)) F("名の無い仲間が、加わったその日に恋人になれる");
    S.day += G.data.Q8L.ANY.days;
    if (!G.q8LoveOk(m, S)) F("名の無い仲間と長く旅したのに、恋人になれない");
  }
  // ---- 持ち主の場面：ゴブリンの仲間（ギグラ）と少し旅して仲良くなっても、旅の終わりを勧められない
  {
    const G = start(6, ["gigra"]);
    const S = G.S, c = S.companions[0];
    G.arrive("fort"); G.arrive("mountains");
    c.bond = 100;
    G.endTurn();
    if (S.m6 && S.m6.pending) F(`ギグラと仲良くなったら、物語を終えるか尋ねられた（${S.m6.pending}）`);
    if (G.m6Reached(S).some((m) => m.id === "bond")) F("結婚していないのに、仲間との終わりの節目に着いた");
  }

  // ---- 表：恋の相手は全員、好感度のほかの条件を持つ。話題・場所・罪の種類は実在する。全員同じ条件ではない
  {
    const G = loadEngine();
    const D = G.data;
    const ids = G.romanceIds();
    const seen = new Set();
    for (const id of ids) {
      const r = D.Q8L.PEOPLE[id];
      if (!r) { F(`${id}: 恋人になる条件が無い`); continue; }
      seen.add(JSON.stringify(r));
      (r.heard || []).forEach((t) => { if (!(D.TALK[id] && D.TALK[id].topics.some((x) => x.id === t))) F(`${id}: 話題 ${t} が無い`); });
      if (r.with && !D.LOCS[r.with]) F(`${id}: 場所 ${r.with} が無い`);
      (r.clean || []).forEach((k) => { if (!D.CRIMES[k]) F(`${id}: 罪 ${k} が無い`); });
      if (r.arc && !(D.R2.ARCS[id] && D.R2.ARCS[id].hard && D.R2.ARCS[id].hard.need && D.R2.ARCS[id].hard.need[5])) F(`${id}: 恋の筋の告白の条件が無い`);
      if (!r.heard && !r.days && !r.with && !r.clean && !r.arc) F(`${id}: 条件が空`);
    }
    if (seen.size < ids.length / 2) F("恋の相手の条件が、ほとんど同じ");
  }
  if (!n) ok("q8 恋と好感度（雑談の上限と頭打ち・上がる割合・恋人になる条件・大きな行いだけ・名の無い仲間）");
};
