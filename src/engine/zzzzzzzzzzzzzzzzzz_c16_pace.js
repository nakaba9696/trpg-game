// C16：時間の進み。持ち主の決定「暦は 360 日のまま。ふつうに遊んだ 1 回の冒険で 1〜2 年たつように、時間を早める」
//   1. 道のり：場所のデータの links・sea に書いてある数は「道のり」（1〜4。近い・遠い）。読み込んだときに一度だけ、本当の日数に直す
//      町と町（陸路）は 1〜3 週間、野・迷宮へ出る道は 4〜10 日、船は 1〜3 週間。元の道のりは L.legs・sea[x].legs に残す（旅の出来事の数・襲撃の割合は道のりで決める）
//      日数を読む所（行き先の一覧・道しるべ・依頼の期限・噂の広がり・交易）は、直したあとの日数をそのまま読む
//   2. 野と迷宮：野（wild）・迷宮（dungeon）で時間の進む行動は 1 日かかる（今までは 4 分の 1 日）。町の中は今までどおり 4 分の 1 日。
//      日をまたぐ行動の後は、同じ時間帯（朝に出れば次の日の朝）から続く
//   旅（G.passDays）は今までどおり夕方に着く。宿・野営（G.sleep）は朝に起きる
// 数は C16.ROAD・C16.SPAN。測り方は tests/c16_pace.mjs、確かめは tests/checks/c16_calendar.mjs。乱数は使わない。DOM なし。
// セーブ（G.S）に足すものは無い（S.w6.legs は無くても動く）。レーン C（C16）
(function (G) {
  const D = G.data;
  const C16 = (G.c16 = G.c16 || {});

  // ---------------------------------------------------------------- 道のり → 日数
  // 日数 = a × 道のり + b
  C16.ROAD = {
    town: [5, 3],   // 町と町の陸路：道のり 1 → 8 日・2 → 13 日・3 → 18 日・4 → 21 日（3 週間まで）
    field: [3, 1],  // 片方が野か迷宮：道のり 1 → 4 日・2 → 7 日・3 → 10 日
    sea: [3, 3],    // 船：道のり 1 → 6 日・2 → 9 日・3 → 12 日・5 → 18 日・6 → 21 日
  };
  C16.MAX_DAYS = 21; // どの旅も 3 週間まで
  C16.kindOf = (a, b, sea) => (sea ? "sea" : (D.LOCS[a] || {}).type === "town" && (D.LOCS[b] || {}).type === "town" ? "town" : "field");
  C16.daysOf = (legs, kind) => { const [a, b] = C16.ROAD[kind] || C16.ROAD.field; return Math.max(1, Math.min(C16.MAX_DAYS, Math.round(a * (Number(legs) || 1) + b))); };
  // 元の道のり（無ければ日数から戻す。旅の途中の古いセーブなど）
  C16.legsOf = (from, to, sea) => {
    const L = D.LOCS[from] || {};
    if (sea) { const s = (L.sea || {})[to]; return s ? s.legs || s.days : 1; }
    return (L.legs || {})[to] || (L.links || {})[to] || 1;
  };
  C16.roads = () => {
    if (D.C16_ROADS) return;
    D.C16_ROADS = true;
    Object.entries(D.LOCS).forEach(([id, L]) => {
      if (L.links) {
        L.legs = Object.assign({}, L.links);
        Object.keys(L.links).forEach((to) => { L.links[to] = C16.daysOf(L.legs[to], C16.kindOf(id, to, false)); });
      }
      Object.entries(L.sea || {}).forEach(([to, s]) => { if (s && s.legs == null) { s.legs = s.days; s.days = C16.daysOf(s.legs, "sea"); } });
    });
  };
  C16.roads();

  // ---------------------------------------------------------------- 野と迷宮の行動は日をまたぐ
  C16.SPAN = { wild: 4, dungeon: 4 };   // 時間帯の数（4 で 1 日）
  C16.SKIP = ["travel", "sail", "w6go"];
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (!S || C16.SKIP.includes(head)) return act0(head, arg, a);
    const loc = S.loc, t0 = S.day * 4 + S.phase;
    const r = act0(head, arg, a);
    const S2 = G.S;
    if (!S2 || S2.over || S2 !== S || S2.loc !== loc || S2.travel) return r;
    const span = C16.SPAN[(D.LOCS[loc] || {}).type] || 0;
    const dt = S2.day * 4 + S2.phase - t0;
    if (span && dt > 0 && dt < span) G.pass(span - dt);
    return r;
  };
})(globalThis.G = globalThis.G || {});
