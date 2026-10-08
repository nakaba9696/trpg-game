// K5：技の巻物は読めば必ず覚える。そのかわり手に入れにくい（持ち主「確定取得でいい。入手を難しくすればいい」）
// - 読むのに判定が無い（知力の見込みを出さない）。古い字の巻物は時間が長い
// - 初級（段 1）の巻物は町の店にふつうに並ぶ（持ち主「初級や簡単なものは店売りでもいいよ」）。段 2 は奥の棚だけで、名か評判が要り、高値で一本きり。奥義は店に無い
// - 落とす敵は段 3 以上（奥義は段 5 以上か主）だけで、見込みは低い
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
    const towns = Object.keys(D.K5_SHOP).filter((loc) => D.LOCS[loc] && (D.LOCS[loc].fac || []).includes("shop"));
    if (towns.length < 2 || towns.length > 8) fail(`奥の棚のある町の数がおかしい（${towns.length}）`);
    Object.keys(D.K5_SHOP).forEach((loc) => X.shopList(loc).forEach((id) => { if (D.K5.tier(id) !== 2) fail(`奥の棚に段 2 でない巻物（${SK[id].name}）がある`); }));
    const loc = towns[0];
    const S = start("merc", 21, 20);
    S.loc = loc; S.mode = "fac"; S.fac = "shop"; S.gold = 99999; S.fame = 0; S.repute = {};
    const rows = () => acts().filter((a) => /^k5buy:/.test(a.id));
    if (rows().length) fail("名も評判も無いのに、奥の棚が見える");
    S.fame = 999;
    const r = rows();
    if (!r.length) fail("名が知られても、奥の棚が見えない");
    else {
      const item = r[0].id.slice(6);
      const base = D.ITEMS[item].price;
      const price = X.price(D.ITEMS[item].skill);
      if (price < base * 3) fail(`奥の棚の巻物が安い（${price}G）`);
      const g0 = S.gold;
      G.act(r[0].id);
      if (!S.inv[item]) fail("奥の棚で買っても巻物が手に入らない");
      if (g0 - S.gold !== price) fail("奥の棚の値が引かれない");
      S.inv[item] = 0; delete S.inv[item];
      S.mode = "fac"; S.fac = "shop";
      if (rows().some((a) => a.id === r[0].id)) fail("奥の棚の巻物が、一本きりでなく何度も買える");
    }
  }

  // ---------------------------------------------------------------- 落とし物・入手場所
  {
    for (const [eid, e] of Object.entries(D.ENEMIES)) for (const [it, p] of e.loot || []) {
      const x = D.ITEMS[it];
      if (!x || x.type !== "k1scroll") continue;
      const t = D.K5.tier(x.skill);
      if ((e.tier || 1) < D.K5.DROP_TIER && !e.boss) fail(`段の低い敵（${e.name}）が巻物を落とす`);
      if (t >= 3 && !e.boss && (e.tier || 1) < 5) fail(`並の敵（${e.name}）が奥義の巻物（${x.name}）を落とす`);
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
    console.log(`NOTE K5：ランダムに ${GAMES} 回遊んで、手に入った中級以上の巻物 ${total} 本（${EARLY} 手まで ${early} 本・${gamesEarly} 回の冒険で・奥義 ${strongEarly} 本）・初級 ${easy} 本`);
    if (gamesEarly > GAMES * 0.1) fail(`序盤（${EARLY} 手まで）に中級以上の巻物が手に入る冒険が多すぎる（${gamesEarly}/${GAMES}）`);
    if (strongEarly > 0) fail(`序盤に奥義の巻物が手に入った（${strongEarly} 本）`);
    if (total > GAMES * 0.3) fail(`一冒険で手に入る中級以上の巻物が多すぎる（${GAMES} 回で ${total} 本）`);
  }

  if (!bad) ok("巻物（読めば必ず覚える・判定なし・初級は店売り・中級は奥の棚だけ・強い敵だけが落とす・序盤に中級以上が出すぎない）");
};
