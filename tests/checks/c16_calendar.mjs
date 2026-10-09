// C16: 暦の長さを一か所に（core.js の G.SEASON_DAYS・G.YEAR_DAYS）
// - 季節・年を引く仕組み（日付・空・仲間の予定・賽の夜・世界の出来事・大事の季節）が、みな同じ暦（G.cal*）を使う
// - 仲間の予定（時期 × 場所）が暦の範囲内。どの日も居場所が一つに決まる
// - 協定の結び直しが 1130 年の春にある
// 値（今は 1 季節 90 日・1 年 360 日）を変えても、この確認はそのまま通るように書く
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C16: " + m); };
  const start = (G, seed) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "暦", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };

  // ---------------------------------------------------------------- 暦の数と、それを読む仕組み
  {
    const G = loadEngine();
    const SD = G.SEASON_DAYS, YD = G.YEAR_DAYS;
    if (!(SD > 0) || YD !== SD * G.SEASONS.length) F(`1 季節 ${SD} 日・1 年 ${YD} 日が食い違う`);
    const MD = G.MONTH_DAYS, last = G.MONTHS[G.MONTHS.length - 1];
    if (MD * G.MONTHS.length !== SD) F(`月の日数 ${MD}×${G.MONTHS.length} が季節の日数 ${SD} と合わない`);
    const want = [[1, "1127年 春 一の月 1日"], [MD, `1127年 春 一の月 ${MD}日`], [MD + 1, "1127年 春 二の月 1日"], [MD + 12, "1127年 春 二の月 12日"], [SD, `1127年 春 ${last} ${MD}日`],
      [SD + 1, "1127年 夏 一の月 1日"], [SD * 3 + 1, "1127年 冬 一の月 1日"], [YD, `1127年 冬 ${last} ${MD}日`], [YD + 1, "1128年 春 一の月 1日"], [YD * 3 + 1, "1130年 春 一の月 1日"]];
    want.forEach(([d, t]) => { if (G.dateOf(d) !== t) F(`${d}日目が「${G.dateOf(d)}」（「${t}」のはず）`); });
    const S = start(G, 3);
    for (let d = 1; d <= YD * 2 && n < 5; d++) {
      const s = G.SEASONS[Math.floor(((d - 1) % YD) / SD)];
      if (G.seasonOf(d) !== s) F(`${d}日目の季節（空）が ${G.seasonOf(d)}`);
      if (G.m4Season(d) !== s) F(`${d}日目の季節（世界の出来事）が ${G.m4Season(d)}`);
      if (G.f4.seasonOf(d) !== s) F(`${d}日目の季節（仲間の予定）が ${G.f4.seasonOf(d)}`);
      if (G.isWinter(d) !== (s === "冬")) F(`${d}日目の冬の判定が違う`);
      if (G.yearOf(d) !== Math.floor((d - 1) / YD)) F(`${d}日目の年の番号が ${G.yearOf(d)}`);
      S.day = d;
      const t = G.f4Today(S);
      if (!t || t.season !== s || t.sd !== ((d - 1) % SD) + 1 || t.d !== ((d - 1) % G.MONTH_DAYS) + 1 || t.month !== G.MONTHS[Math.floor(((d - 1) % SD) / G.MONTH_DAYS)] || t.text !== G.dateOf(d)) F(`${d}日目の今日が ${JSON.stringify(t)}`);
    }
    // 大事（M12）の季節の条件
    const K = (G.data.M12 && G.data.M12.KINDS) || {};
    const cond = (k, d) => (K[k] && K[k].cond ? !!K[k].cond({ ...S, day: d }) : null);
    const mid = (si) => si * SD + Math.ceil(SD / 2);
    if (cond("locust", mid(0)) === false || cond("locust", mid(2)) === true) F("蝗の年が春・夏でなく始まる");
    if (cond("winter", mid(2)) === false || cond("winter", mid(0)) === true) F("長い冬が秋・冬でなく始まる");
  }

  // ---------------------------------------------------------------- 仲間の予定が暦の範囲内
  {
    const G = loadEngine();
    const S = start(G, 5);
    const F4 = G.f4;
    let rows = 0;
    S.f4.shift = {};
    for (const id of Object.keys(G.data.C2_PEOPLE || {})) {
      const sc = F4.schedule(id, null);
      if (!sc) continue;
      for (const e of sc) {
        rows++;
        for (const x of [e.from, e.to]) {
          if (typeof x === "number" && !(x >= 1 && x <= G.YEAR_DAYS)) F(`${id}: 予定の日 ${x} が 1〜${G.YEAR_DAYS} の外`);
          if (typeof x === "string" && !G.SEASONS.includes(x)) F(`${id}: 予定の時期 ${x} が季節でない`);
        }
        if (!F4.seasonsOf(e).length) F(`${id}: 予定 ${e.from}〜${e.to} がどの季節にも入らない`);
      }
    }
    if (!rows) F("予定を持つ人がいない");
  }

  // ---------------------------------------------------------------- 世界の出来事の暦
  {
    const G = loadEngine();
    const S = start(G, 11);
    for (let i = 0; i < 100 && S.day < 40 && !S.over; i++) {
      S.day += 3;
      G.endTurn();
      if (S.mode === "event") { S.mode = "explore"; S.event = null; }
    }
    const P = S.world && S.world.plan;
    if (!P) F("世界の筋の日取りができない");
    else if (!/^1130年 春/.test(G.dateOf(P.treaty))) F(`協定の結び直しの日取りが ${G.dateOf(P.treaty)}（1130年の春のはず）`);
  }

  if (!n) ok("C16 暦の長さが一か所（G.SEASON_DAYS・G.YEAR_DAYS）：日付・季節・予定・世界の出来事が同じ暦を読む");
};
