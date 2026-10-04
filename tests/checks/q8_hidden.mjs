// Q8：悪名は、罪が人に知られたときだけ上がる（data/q8_hidden.js・engine/zzzzzzz_q8_hidden.js）
// - 人目のない所（荒野の夜）の罪では、悪名が上がらないことがある。町の昼のほうが見られやすい
// - 見られたら、その場で悪名が上がる
// - 見られなかった罪は隠れた罪として残り、あとで発覚して悪名が上がる（一行と年表）。日がたつほど発覚しにくく、やがて消える
// - 罪の匂い（S.sin）と犯した行い（S.q8deeds）は、見られなくても残る
// - 古いセーブ（隠れた罪の項目が無い）でも動く
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("q8 隠れた罪: " + m); };
  const start = (seed) => {
    const G = loadEngine();
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("thief", G.rand);
    G.newGame({ cls: "thief", stats, caps, goal: "rich", profile: { name: "測定", sex: "男", age: 24 } });
    return G;
  };
  const inf = (G, nat) => ((G.S.repute || {})[nat] || { inf: 0 }).inf;

  // ---- 人目：町の昼と荒野の夜で、悪名が上がった回を数える
  {
    const G = start(1);
    const S = G.S;
    const count = (loc, phase) => {
      let up = 0;
      for (let i = 0; i < 300; i++) {
        S.repute = {}; S.q8hid = []; S.loc = loc; S.phase = phase;
        const nat = G.nationOf();
        G.crime("theft");
        if (inf(G, nat) > 0) up++;
      }
      return up;
    };
    const town = count("karna", 1), wild = count("plains", 3);
    if (!(wild < 300)) F("荒野の夜の盗みが、いつも見られた");
    if (!(wild > 0)) F("荒野の夜の盗みが、一度も見られない");
    if (!(town > wild)) F(`町の昼（${town}/300）が荒野の夜（${wild}/300）より見られにくい`);
    if (!(G.q8Watch("murder") > G.q8Watch("theft"))) F("殺しが盗みより見つかりにくい");
  }

  // ---- 見られた・見られなかった・あとで発覚・罪の匂い
  {
    const G = start(2);
    const D = G.data, S = G.S;
    S.loc = "karna";
    const nat = G.nationOf();
    const sin0 = S.sin || 0;
    const seen0 = G.q8Seen;
    G.q8Seen = () => true;
    G.crime("murder");
    if (inf(G, nat) !== D.CRIMES.murder.inf) F(`見られた人殺しで悪名が ${inf(G, nat)}（${D.CRIMES.murder.inf} のはず）`);
    G.q8Seen = () => false;
    S.repute = {};
    G.crime("murder");
    if (inf(G, nat) !== 0) F("見られなかった人殺しで、その場で悪名が上がった");
    if ((S.sin || 0) - sin0 !== 2 * D.CRIMES.murder.sin) F("見られなかった罪で、罪の匂いが残らない");
    if (!(S.q8deeds && S.q8deeds.murder === 2)) F("見られなかった罪が、犯した行いに残らない");
    if (!(S.q8hid && S.q8hid.length === 1 && S.q8hid[0].kind === "murder")) F("見られなかった罪が、隠れた罪に残らない");
    G.q8Seen = seen0;
    // あとで発覚（乱数を 0 にして、次の日に必ず発覚させる）
    S.loc = "plains";
    const r0 = G.rand;
    G.rand = () => 0;
    S.day += 1;
    G.endTurn(); // 最初の手番は、日を覚えるだけ
    S.day += 1;
    G.endTurn();
    G.rand = r0;
    if (inf(G, nat) !== D.CRIMES.murder.inf) F(`隠れた人殺しが発覚しても、悪名が ${inf(G, nat)}（${D.CRIMES.murder.inf} のはず）`);
    if (S.q8hid.length) F("発覚した罪が、隠れた罪に残る");
    if (!S.log.some((l) => D.Q8H.KIND.murder.how.includes(l.text))) F("発覚したときの一行が出ない");
    if (!S.chronicle.some((c) => /隠していた罪/.test(c.text))) F("発覚が年表に残らない");
    if (S.log.some((l) => /[0-9０-９]/.test(l.text) && D.Q8H.KIND.murder.how.includes(l.text))) F("発覚の一行に数が出る");
  }
  {
    // 日がたつほど発覚しにくく、やがて消える
    const G = start(3);
    const D = G.data, H = D.Q8H, S = G.S;
    const p = (age) => H.KIND.theft.later * H.DAILY * Math.pow(H.FADE, age);
    if (!(p(30) < p(1))) F("日がたっても発覚しやすさが変わらない");
    S.q8hid = [{ kind: "theft", day: S.day - H.KEEP - 1, inf: [[6, "王国"]], loose: 0 }];
    G.q8Discover();
    if (S.q8hid.length) F("ずっと前の隠れた罪が消えない");
    // 古いセーブ（項目が無い）
    delete S.q8hid; delete S.q8hidDay;
    try { S.day += 3; G.endTurn(); S.day += 1; G.endTurn(); S.loc = "karna"; G.crime("theft"); } catch (e) { F("古いセーブで例外 " + e.message); }
  }
  {
    // 遊んでも壊れない（裏路地で盗みを続ける）。どこかで隠れた罪ができ、どこかで見られる
    const G = start(4);
    const S = G.S;
    S.loc = "karna";
    let hidden = 0, seen = 0;
    for (let i = 0; i < 60; i++) {
      const nat = G.nationOf();
      const a = inf(G, nat), h = (S.q8hid || []).length;
      G.crime("theft");
      if ((S.q8hid || []).length > h) hidden++;
      else if (inf(G, nat) > a) seen++;
      S.day++; G.endTurn();
    }
    if (!hidden || !seen) F(`盗みを続けて、隠れた ${hidden}・見られた ${seen}（どちらもあるはず）`);
  }
  if (!n) ok("q8 隠れた罪（人目・見られたら上がる・あとで発覚・日がたつと消える・罪の匂いは残る・古いセーブ）");
};
