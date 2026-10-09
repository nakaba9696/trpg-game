// T2：トロフィーを 100 個にする（足りない 27 個）。test(S) が真になった手番の終わりに獲得する（core.js の G.checkTrophies）。
// 格の目安（T2 で決めた。T3 で見直し、今の決まりは trophies_t3.js。ここの見出しの格と違うものは、測った結果で上げ下げしたもの）：
//   銅 … ふつうに遊べばたいてい取れる（ランダムの遊びで 3 割以上か、筋のよい遊び方で 7 割半以上の冒険で取れる）
//   銀 … 狙って遊べば取れる・何度か遊ぶうちに取れる
//   金 … やりこみ・まれな結末・高難度
// 冒険をまたぐもの（「冒険をまたいで」と説明に書く）は G.P（墓碑・図鑑・覚え書き）から数える。どれも古い記録に項目が無くても動く。
// 条件はゲームのデータと今ある状態だけで判定する（Claude は呼ばない）。キーの頭は t2_。レーン T
(function (G) {
  const D = (G.data = G.data || {});
  const T2 = (G.t2 = G.t2 || {});

  const P = () => G.P || {};
  // 終えた冒険（墓碑）。今の冒険が終わったところなら、それも一つと数える（墓碑に載るのは G.checkTrophies のあと）
  T2.runs = (S) => {
    const seen = new Set();
    const out = [];
    for (const g of P().graves || []) if (g && !seen.has(g.id) && (!S || g.id !== S.id)) { seen.add(g.id); out.push(g); }
    if (S && S.over) out.push({ id: S.id, cls: S.clsName, end: S.over, cause: S.deathCause, ending: S.ending ? S.ending.id : "", title: S.title });
    return out;
  };
  const visitedOf = (S, type) => Object.keys(S.visited || {}).filter((id) => D.LOCS[id] && (!type || D.LOCS[id].type === type));
  T2.regions = () => [...new Set(Object.values(D.LOCS).map((L) => L.region).filter(Boolean))];
  const regionsOf = (S) => new Set(visitedOf(S).map((id) => D.LOCS[id].region).filter(Boolean));
  T2.dungeonBosses = () => [...new Set(Object.values(D.LOCS).filter((L) => L.type === "dungeon" && L.boss).map((L) => L.boss))];
  const codexFoes = () => (P().codex && P().codex.foes) || {};
  const alive = (S) => S.over !== "dead";
  const n = (o) => Object.keys(o || {}).length;

  D.TROPHIES.push(
    // ---------------------------------------------------------------- 銅：ふつうに遊べばたいてい取れる
    { key: "t2_ally", name: "道連れ", tier: "銅", desc: "仲間を連れて歩いた", test: (S) => (S.companions || []).length >= 1 },
    { key: "t2_quest1", name: "初仕事", tier: "銅", desc: "依頼を一件こなした", test: (S) => S.counters.quests >= 1 },
    { key: "t2_dungeon", name: "暗がりへ", tier: "銅", desc: "迷宮に足を踏み入れた", test: (S) => visitedOf(S, "dungeon").length >= 1 },
    { key: "t2_kills20", name: "腕慣らし", tier: "銅", desc: "一度の冒険で敵を二十体倒した", test: (S) => S.counters.kills >= 20 },
    { key: "t2_day30", name: "ひと月", tier: "銅", desc: "旅立って三十日を生き延びた", test: (S) => S.day >= 30 && alive(S) },
    { key: "t2_travel10", name: "旅慣れ", tier: "銅", desc: "町から町へ、十度旅をした", test: (S) => (S.counters.travels || 0) >= 10 },
    { key: "t2_gear", name: "身支度", tier: "銅", desc: "持たされた武器か防具を別の物に替えた",
      test: (S) => { const c = D.CLASSES[S.cls] || {}; return (!!S.weapon && S.weapon !== c.weapon) || (!!S.armor && S.armor !== c.armor); } },
    { key: "t2_region3", name: "国境越え", tier: "銅", desc: "三つの地方に足を踏み入れた", test: (S) => regionsOf(S).size >= 3 },
    { key: "t2_know", name: "手帳の一行目", tier: "銅", desc: "覚え書きを初めて手帳に残した", test: () => n(P().know) >= 1 },
    { key: "t2_codex30", name: "図鑑の頁", tier: "銀", desc: "冒険をまたいで図鑑に魔物が三十種載った", test: () => n(codexFoes()) >= 30 },
    { key: "t2_runs3", name: "三つ目の墓碑", tier: "銅", desc: "冒険を三度終えた", test: (S) => T2.runs(S).length >= 3 },

    // ---------------------------------------------------------------- 銀：狙って遊べば取れる・何度か遊ぶうちに取れる
    { key: "t2_quests30", name: "ギルドの古株", tier: "金", desc: "一度の冒険で依頼を三十件こなした", test: (S) => S.counters.quests >= 30 },
    { key: "t2_year", name: "一年の旅", tier: "金", desc: "旅立って一年を生き延びた", test: (S) => S.day > G.YEAR_DAYS && alive(S) },
    { key: "t2_custom", name: "自分で決めた道", tier: "銀", desc: "自分で決めた目的で旅の区切りに着いた",
      test: (S) => S.goal.id === "custom" && S.day >= 30 && (S.fame >= 20 || S.counters.quests >= 3 || S.counters.bosses >= 1) },
    { key: "t2_bond", name: "背中を預ける", tier: "銀", desc: "仲間と深い絆を結んだ", test: (S) => (S.companions || []).some((c) => (c.bond || 0) >= 90) },
    { key: "t2_q9", name: "頼みの結末", tier: "銀", desc: "仲間の頼みごとを最後まで見届けた", test: () => Object.values(P().q9 || {}).some((m) => n(m) >= 1) },
    { key: "t2_people30", name: "人の名簿", tier: "銀", desc: "冒険をまたいで図鑑に人物が三十人載った", test: () => n(P().codex && P().codex.people) >= 30 },
    { key: "t2_allcls", name: "五つの生き方", tier: "銀", desc: "すべての職業で冒険を終えた",
      test: (S) => { const done = new Set(T2.runs(S).map((g) => g.cls)); return Object.values(D.CLASSES).every((c) => done.has(c.name)); } },
    { key: "t2_dead5", name: "死んで覚える", tier: "銀", desc: "冒険をまたいで五度死んだ", test: (S) => T2.runs(S).filter((g) => g.end === "dead").length >= 5 },
    { key: "t2_boss1", name: "大物食い", tier: "銀", desc: "迷宮の主か、名のある強敵を倒した", test: (S) => S.counters.bosses >= 1 },
    { key: "t2_endings3", name: "三つの物語", tier: "銀", desc: "冒険をまたいで、三通りの結末で物語を閉じた",
      test: (S) => new Set(T2.runs(S).filter((g) => g.end === "end" && g.ending).map((g) => g.ending)).size >= 3 },

    // ---------------------------------------------------------------- 金：やりこみ・まれな結末・高難度
    { key: "t2_regions", name: "すべての国境", tier: "金", desc: "一度の冒険で、すべての地方に足を踏み入れた", test: (S) => T2.regions().every((r) => regionsOf(S).has(r)) },
    { key: "t2_kills200", name: "屍の山", tier: "金", desc: "一度の冒険で敵を二百体倒した", test: (S) => S.counters.kills >= 200 },
    { key: "t2_spells", name: "六つの術", tier: "金", desc: "一度の冒険で六つの術を覚えた", test: (S) => Object.keys(D.SPELLS || {}).filter((id) => (G.knows ? G.knows(id, S) : (S.spells || []).includes(id))).length >= 6 },
    { key: "t2_lairs", name: "迷宮の主の名簿", tier: "金", desc: "冒険をまたいで、すべての迷宮の主を倒したことがある",
      test: () => { const f = codexFoes(); return T2.dungeonBosses().every((id) => f[id] && f[id].kills > 0); } },
    { key: "t2_bestiary", name: "魔物の博物誌", tier: "金", desc: "冒険をまたいで、図鑑の魔物の頁を半分埋めた",
      test: () => !!G.codexCount && (({ foes, foesAll }) => foesAll > 0 && foes * 2 >= foesAll)(G.codexCount()) },
    { key: "t2_traps", name: "罠の地図", tier: "白金", desc: "冒険をまたいで、迷宮の罠の覚え書きをすべて集めた",
      test: () => { const mk = () => { const K = G.l1 && G.l1.build ? G.l1.build() : D.KNOW || {}; return Object.keys(K).filter((id) => K[id].kind === "trap"); }; const ids = G.t3Once ? G.t3Once("know:trap", mk, true) : mk(); const k = P().know || {}; return ids.length > 0 && ids.every((id) => k[id]); } },
  );
})(globalThis.G = globalThis.G || {});
