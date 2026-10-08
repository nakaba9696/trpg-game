// C16: 暦（1 季節 30 日・1 年 120 日。長さは core.js の G.SEASON_DAYS・G.YEAR_DAYS）
// - 30 日で季節が、120 日で年が変わる。季節・年を引く仕組み（日付・空・仲間の予定・賽の夜・世界の出来事）がみな同じ暦を使う
// - 仲間の予定（時期 × 場所）が暦の範囲内。どの日も居場所が一つに決まる
// - 協定の結び直しが 1130 年の春にある。大事（M12）の季節の条件が暦の季節と合う
// - 古いセーブ（S.cal が無い・1 年 360 日のころ）：落ちない・協定が過去に置き去りにならず一度だけ・年齢が跳ねない・予定の揺れが縮む
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
  const run = (G, S, upto) => {
    for (let i = 0; i < 2000 && S.day < upto && !S.over; i++) {
      S.day += 3;
      G.endTurn();
      if (S.mode === "event") { S.mode = "explore"; S.event = null; }
      if (S.mode === "combat") { S.mode = "explore"; S.combat = null; }
    }
  };

  // ---------------------------------------------------------------- 暦の数
  {
    const G = loadEngine();
    if (G.SEASON_DAYS !== 30 || G.YEAR_DAYS !== 120) F(`1 季節 ${G.SEASON_DAYS} 日・1 年 ${G.YEAR_DAYS} 日（30・120 のはず）`);
    const want = [[1, "1127年 春 1日"], [30, "1127年 春 30日"], [31, "1127年 夏 1日"], [61, "1127年 秋 1日"], [91, "1127年 冬 1日"], [120, "1127年 冬 30日"], [121, "1128年 春 1日"], [361, "1130年 春 1日"]];
    want.forEach(([d, t]) => { if (G.dateOf(d) !== t) F(`${d}日目が「${G.dateOf(d)}」（「${t}」のはず）`); });
    const S = start(G, 3);
    for (let d = 1; d <= G.YEAR_DAYS * 3; d++) {
      const si = Math.floor(((d - 1) % 120) / 30), s = G.SEASONS[si];
      if (G.seasonOf(d) !== s) F(`${d}日目の季節（空）が ${G.seasonOf(d)}`);
      if (G.m4Season(d) !== s) F(`${d}日目の季節（世界の出来事）が ${G.m4Season(d)}`);
      if (G.f4.seasonOf(d) !== s) F(`${d}日目の季節（仲間の予定）が ${G.f4.seasonOf(d)}`);
      if (G.isWinter(d) !== (s === "冬")) F(`${d}日目の冬の判定が違う`);
      if (G.yearOf(d) !== Math.floor((d - 1) / 120)) F(`${d}日目の年の番号が ${G.yearOf(d)}`);
      S.day = d;
      const t = G.f4Today(S);
      if (!t || t.season !== s || t.d !== ((d - 1) % 30) + 1 || t.text !== G.dateOf(d)) F(`${d}日目の今日が ${JSON.stringify(t)}`);
      const sky = G.skyAt("leavel", d);
      if (!G.SEASONS.includes(sky.season)) F(`${d}日目の空の季節が ${sky.season}`);
      if (n > 5) break;
    }
    if (!S.cal || S.cal.d !== 30 || S.cal.old) F(`新しい冒険の S.cal が ${JSON.stringify(S.cal)}`);
    if (G.calYearsLived(119) !== 0 || G.calYearsLived(120) !== 1 || G.calYearsLived(600) !== 5) F("旅の年数が 120 日で 1 年になっていない");
  }

  // ---------------------------------------------------------------- 仲間の予定が暦の範囲内
  {
    const G = loadEngine();
    const S = start(G, 5);
    const F4 = G.f4;
    let rows = 0;
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
      S.f4.shift = {};
      for (let d = 1; d <= G.YEAR_DAYS; d++) {
        const hits = sc.filter((e) => { const w = F4.whereOn(id, S, d); return w && w.e === e; });
        if (hits.length > 1) F(`${id}: ${d}日目の居場所が二つ`);
      }
    }
    if (!rows) F("予定を持つ人がいない");
  }

  // ---------------------------------------------------------------- 世界の出来事の暦
  {
    const G = loadEngine();
    const S = start(G, 11);
    run(G, S, 40);
    const P = S.world && S.world.plan;
    if (!P) F("世界の筋の日取りができない");
    else if (!/^1130年 春/.test(G.dateOf(P.treaty))) F(`協定の結び直しの日取りが ${G.dateOf(P.treaty)}（1130年の春のはず）`);
    const M12 = G.data.M12;
    const K = (M12 && (M12.KINDS || M12.kinds)) || {};
    const cond = (k, d) => { const x = K[k]; return x && x.cond ? !!x.cond({ ...S, day: d }) : null; };
    if (cond("locust", 15) === false || cond("locust", 75) === true) F("蝗の年が春・夏でなく始まる");
    if (cond("winter", 75) === false || cond("winter", 15) === true) F("長い冬が秋・冬でなく始まる");
  }

  // ---------------------------------------------------------------- 古いセーブ
  {
    const G = loadEngine();
    const S = start(G, 17);
    run(G, S, 300);
    // 1 年 360 日のころのセーブに見せかける：暦の印が無い・協定は古い暦の 1130 年・予定の揺れは ±6 日
    delete S.cal;
    S.world.treaty = ""; S.world.hist = S.world.hist.filter((h) => !h.kind.startsWith("treaty"));
    S.world.plan.treaty = 1081 + 20;
    if (S.f4 && S.f4.shift) Object.keys(S.f4.shift).forEach((id, i) => { S.f4.shift[id] = i % 2 ? 6 : -6; });
    const old = JSON.parse(JSON.stringify(S));
    G.fixOldNames(old);
    if (!old.cal || old.cal.old !== S.day) F(`古いセーブの S.cal が ${JSON.stringify(old.cal)}`);
    if (!(old.world.plan.treaty >= 361 && old.world.plan.treaty <= 380)) F(`古いセーブの協定の日 ${old.world.plan.treaty} が新しい暦の 1130 年春に移らない`);
    if (old.f4 && old.f4.shift && Object.values(old.f4.shift).some((v) => Math.abs(v) > 2)) F("古いセーブの予定の揺れが縮まない");
    G.fixOldNames(old);
    if (old.cal.old !== S.day) F("読み替えを二度すると変わる");
    // 年齢：読み替えまでは 360 日で 1 年
    if (G.calYearsLived(300, 300) !== 0 || G.calYearsLived(420, 300) !== 1 || G.calYearsLived(1000, 900) !== 3) F("古いセーブの年齢の数え方が違う");
    // 続けて遊んでも落ちず、協定は一度だけ
    G.S = old;
    try { run(G, old, 600); } catch (e) { F("古いセーブで続けると落ちる：" + e.message); }
    const tr = old.world.hist.filter((h) => h.kind.startsWith("treaty"));
    if (tr.length !== 1) F(`古いセーブで協定の結び直しが ${tr.length} 回`);
    // 予定の揺れ・日付は引ける
    if (!G.f4Today(old)) F("古いセーブで今日が引けない");
    // 墓碑の年齢：読み替え前の日数で跳ねない
    const L = { ageN: 20, days: 600, calOld: 300 };
    if (20 + G.calYearsLived(L.days, L.calOld) !== 23) F("古いセーブの年齢が跳ねる");
  }

  if (!n) ok("C16 暦：1 季節 30 日・1 年 120 日、予定と世界の出来事の暦、古いセーブ");
};
