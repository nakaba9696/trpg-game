// K5：技の巻物は読めば必ず覚える。そのかわり手に入れにくい（持ち主「確定取得でいい。入手を難しくすればいい」）
// - 読むのに判定が無い（知力の見込みを出さない）。古い字の巻物は時間が長い
// - 初級（段 1）の巻物は町の店にふつうに並ぶ（持ち主「初級や簡単なものは店売りでもいいよ」）。中級・上級は店に無い
// - 中級・上級は、人から（師が名か依頼の数に届いた者に譲る・打ち解けた仲間）・依頼の礼・強い敵の落とし物。上級は条件が重く見込みが低い。どの技にも道がある
// - 落とす敵は段 3 以上（上級は段 5 以上か主）だけで、見込みは低い
// - どの巻物にも入手場所がある（図鑑）
// - 150 回ランダムに遊んで、序盤（150 手まで）に中級以上（段 2・3）の巻物が手に入りすぎない（初級は許す）
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const K = G.k1, X = G.k5;
  if (!K || !X) { fail("G.k1・G.k5 が無い"); return; }
  const SK = D.SKILLS;
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  const start = (cls = "merc", seed = 31, n = 16) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls, stats: st(n), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.companions = [];
    return G.S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const scrolls = X.scrolls();

  // ---------------------------------------------------------------- 読めば必ず覚える
  {
    const S = start("merc", 11, 20);
    S.stats.知力 = 3;   // 知力が低くても、目安を満たしていれば覚える
    const sc = scrolls.filter((id) => !D.ITEMS[id].old && !K.knows(D.ITEMS[id].skill) && !K.needMiss(D.ITEMS[id].skill, S).length);
    let n = 0;
    for (const id of sc.slice(0, 12)) {
      G.give(id);
      const row = acts().find((a) => a.id === "k1scroll:" + id);
      if (!row) { fail(`巻物 ${id} を読む行動が出ない`); continue; }
      if (/知力 \d+%/.test(row.sub)) fail(`巻物を読む行動に判定の見込みが出ている（${row.sub}）`);
      const p0 = S.day * 4 + S.phase;
      G.act(row.id);
      if (!K.knows(D.ITEMS[id].skill)) fail(`巻物 ${id} を読んでも覚えない`);
      if (S.inv[id]) fail(`読んだ巻物 ${id} が残っている`);
      if (S.day * 4 + S.phase - p0 !== 1) fail(`ふつうの巻物を読む時間がひとときでない（${S.day * 4 + S.phase - p0}）`);
      n++;
    }
    if (n < 5) fail(`読める巻物で試せた数が少ない（${n}）`);
    if (K.scrollChance) fail("K.scrollChance（読む見込み）が残っている");
    const old = scrolls.find((id) => D.ITEMS[id].old);
    if (old) {
      S.stats.知力 = 30;
      G.give(old);
      const row = acts().find((a) => a.id === "k1scroll:" + old);
      if (!row || row.disabled || !/半日/.test(row.sub)) fail(`古い巻物に「半日」と出ない（${row && row.sub}）`);
      const p0 = S.day * 4 + S.phase;
      if (row) G.act(row.id);
      if (!K.knows(D.ITEMS[old].skill)) fail("古い巻物を読んでも覚えない");
      if (S.day * 4 + S.phase - p0 !== 2) fail("古い巻物を読むのに半日かからない");
    }
  }

  // ---------------------------------------------------------------- 店
  {
    const onShelf = Object.entries(D.LOCS).flatMap(([lid, L]) => (L.shop || []).filter((it) => D.ITEMS[it] && D.ITEMS[it].type === "k1scroll").map((it) => [lid, it]));
    onShelf.forEach(([lid, it]) => { if (D.K5.tier(D.ITEMS[it].skill) !== 1) fail(`${lid} の店に、初級でない巻物（${D.ITEMS[it].name}）が並んでいる`); });
    const easyTowns = new Set(onShelf.map(([lid]) => lid));
    if (easyTowns.size < 5) fail(`初級の巻物を売る町が少ない（${easyTowns.size}）`);
    const kinds = new Set([...easyTowns].map((lid) => onShelf.filter(([l]) => l === lid).map(([, it]) => it).sort().join(",")));
    if (kinds.size < 3) fail("初級の巻物の品ぞろえが、どの町も同じ");
    if (D.K5_SHOP) fail("中級以上を売る奥の棚（D.K5_SHOP）が残っている");
  }

  // ---------------------------------------------------------------- 人から：師が譲る・仲間の贈り物
  {
    const tid = "veteran";
    const T = D.K1_TEACHERS[tid];
    const loc = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && (D.LOCS[id].fac || []).includes(T.fac));
    const S = start("merc", 61, 20);
    S.loc = loc; S.mode = "fac"; S.fac = T.fac; S.fame = 0; S.counters.quests = 0;
    const rows = () => acts().filter((a) => /^k5gift:/.test(a.id));
    if (rows().length) fail("名も依頼の数も無いのに、師が巻物を譲る行動が出る");
    S.fame = D.K5.GIVE[2].fame;
    if (!rows().some((a) => a.id === `k5gift:${tid}:2`)) fail("名が知られても、師が中級の巻物を譲らない");
    if (rows().some((a) => a.id === `k5gift:${tid}:3`)) fail("中級の条件だけで、師が上級の巻物を譲る");
    const inv0 = scrolls.filter((id) => S.inv[id]).length;
    G.act(`k5gift:${tid}:2`);
    const got = scrolls.filter((id) => S.inv[id]);
    if (got.length !== inv0 + 1) fail("師に譲ってもらっても巻物が増えない");
    else if (D.K5.tier(D.ITEMS[got[got.length - 1]].skill) !== 2 && !got.some((id) => D.K5.tier(D.ITEMS[id].skill) === 2)) fail("師が譲った巻物が中級でない");
    S.mode = "fac"; S.fac = T.fac;
    if (rows().some((a) => a.id === `k5gift:${tid}:2`)) fail("師が中級の巻物を二度譲る");
    S.fame = D.K5.GIVE[3].fame; S.counters.quests = D.K5.GIVE[3].quests;
    if (!rows().some((a) => a.id === `k5gift:${tid}:3`)) fail("名も依頼の数も重ねたのに、師が上級の巻物を譲らない");
    // 仲間の贈り物（一人一度）
    const W = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "wild");
    const S2 = start("merc", 62, 20);
    S2.loc = W; S2.mode = "explore";
    S2.companions = [{ id: "t5", name: "テストの仲間", cls: "傭兵", power: 40, dmg: 1, desc: "", bond: 90 }];
    let n = 0;
    for (let i = 0; i < 200 && !S2.over; i++) { S2.mode = "explore"; S2.combat = null; S2.loc = W; S2.hp = S2.maxHp; G.exploreAct("camp"); }
    n = scrolls.filter((id) => S2.inv[id]).length;
    if (n < 1) fail("打ち解けた仲間が、巻物を一度もくれない");
    if (n > 1) fail(`同じ仲間が巻物を何度もくれる（${n}）`);
    // どの中級・上級の技にも、人から・落とし物の道がある
    const giv = new Set(Object.values(D.K5_GIVERS).flatMap((g) => [...(g[2] || []), ...(g[3] || [])]));
    const drop = new Set(Object.values(D.ENEMIES).flatMap((e) => (e.loot || []).map(([it]) => D.ITEMS[it] && D.ITEMS[it].skill)).filter(Boolean));
    for (const id of scrolls) {
      const sk = D.ITEMS[id].skill;
      if (D.K5.tier(sk) < 2) continue;
      if (!giv.has(sk)) fail(`${SK[sk].name}（${D.K5.tier(sk) >= 3 ? "上級" : "中級"}）を譲る人がいない`);
      if (!drop.has(sk)) fail(`${SK[sk].name}（${D.K5.tier(sk) >= 3 ? "上級" : "中級"}）を落とす敵がいない`);
    }
    Object.values(D.K5_GIVERS).forEach((g) => { (g[2] || []).forEach((id) => { if (D.K5.tier(id) !== 2) fail(`師が中級として譲る技（${id}）が中級でない`); }); (g[3] || []).forEach((id) => { if (D.K5.tier(id) !== 3) fail(`師が上級として譲る技（${id}）が上級でない`); }); });
    if (!(D.K5.GIVE[3].fame > D.K5.GIVE[2].fame)) fail("上級を譲る条件が、中級より重くない");
    const q2 = D.K5.QUEST.find((x) => x.tier === 2), q3 = D.K5.QUEST.find((x) => x.tier === 3);
    if (!q2 || !q3 || !(q3.danger > q2.danger) || !(q3.p < q2.p)) fail("上級の依頼の礼が、中級より難しくないか見込みが低くない");
  }

  // ---------------------------------------------------------------- 落とし物・入手場所
  {
    for (const [eid, e] of Object.entries(D.ENEMIES)) for (const [it, p] of e.loot || []) {
      const x = D.ITEMS[it];
      if (!x || x.type !== "k1scroll") continue;
      const t = D.K5.tier(x.skill);
      if ((e.tier || 1) < D.K5.DROP_TIER && !e.boss) fail(`段の低い敵（${e.name}）が巻物を落とす`);
      if (t >= 3 && !e.boss && (e.tier || 1) < 5) fail(`並の敵（${e.name}）が上級の巻物（${x.name}）を落とす`);
      if (!e.boss && p > 0.03) fail(`${e.name}が巻物を落とす見込みが高い（${p}）`);
    }
    for (const id of scrolls) if (!G.codexItemWhere(id).length) fail(`巻物 ${id} の入手場所が無い`);
    const tiers = [1, 2, 3].map((t) => Object.keys(SK).filter((id) => SK[id].learn.scroll && D.K5.tier(id) === t).length);
    if (tiers.some((n) => !n)) fail(`巻物の段に空きがある（${tiers}）`);
  }

  // ---------------------------------------------------------------- 150 回ランダムに遊ぶ
  {
    const GAMES = 150, STEPS = 250, EARLY = 150;
    let early = 0, total = 0, strongEarly = 0, gamesEarly = 0, easy = 0;
    const give0 = G.give;
    let step = 0;
    G.give = (id, n) => {
      const r = give0(id, n);
      if (r && D.ITEMS[id] && D.ITEMS[id].type === "k1scroll" && G.S && G.S.turn > 0) {
        if (D.K5.tier(D.ITEMS[id].skill) < 2) { easy++; return r; }   // 初級は数えない（店で買える）
        total++;
        if (step <= EARLY) { early++; if (D.K5.tier(D.ITEMS[id].skill) >= 3) strongEarly++; }
      }
      return r;
    };
    try {
      for (let g = 0; g < GAMES; g++) {
        G.rand = seeded(1000 + g);
        G.P = { trophies: {}, graves: [], codex: {} };
        const cls = Object.keys(D.CLASSES)[g % 5];
        const stats = {};
        D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; });
        G.newGame({ cls, stats, goal: Object.keys(D.GOALS)[g % 4], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
        const e0 = early;
        for (step = 0; step < STEPS && !G.S.over; step++) {
          const list = acts().filter((a) => !a.disabled);
          if (!list.length) break;
          G.act(list[Math.floor(G.rand() * list.length)].id);
        }
        if (early > e0) gamesEarly++;
      }
    } catch (e) { fail(`ランダムに遊ぶと例外 ${e.stack || e}`); }
    G.give = give0;
    console.log(`NOTE K5：ランダムに ${GAMES} 回遊んで、手に入った中級以上の巻物 ${total} 本（${EARLY} 手まで ${early} 本・${gamesEarly} 回の冒険で・上級 ${strongEarly} 本）・初級 ${easy} 本`);
    if (gamesEarly > GAMES * 0.1) fail(`序盤（${EARLY} 手まで）に中級以上の巻物が手に入る冒険が多すぎる（${gamesEarly}/${GAMES}）`);
    if (strongEarly > 0) fail(`序盤に上級の巻物が手に入った（${strongEarly} 本）`);
    if (total > GAMES * 0.3) fail(`一冒険で手に入る中級以上の巻物が多すぎる（${GAMES} 回で ${total} 本）`);
  }

  if (!bad) ok("巻物（読めば必ず覚える・判定なし・初級は店売り・中級以上は人と依頼と強い敵から・序盤に中級以上が出すぎない）");
};
