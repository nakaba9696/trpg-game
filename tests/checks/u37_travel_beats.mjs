// U37：旅の出来事の区切り（src/engine/zzzzzzzzzzzzzzzzzzzzz_u37_beats.js）
// - 旅の出来事（襲撃を含む）の一件ごとに、その本文の前に区切りの印（記録の u37）が一つ出る
// - 出来事が終わっても次の出来事を始めず、「先へ進む」（w6go）を待つ。最後の出来事のあとの到着も、印を置いてから
// - 出来事の無い旅は、印も待ちも無く着く。古いセーブ（S.w6 に u37 の項目が無い旅の途中）も動く
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail(m); };
  const start = (G, seed, loc) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 55]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.loc = loc; G.S.visited[loc] = true;
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  const G = loadEngine();
  const D = G.data;
  if (!G.u37) { F("G.u37 が無い"); return; }
  const S = start(G, 3701, "karna");
  const isW6 = (id) => { const e = D.EVENTS.find((x) => x.id === id); return !!(e && e.w6 || e && e.r12); };
  const beats = (from) => S.log.slice(from).filter((e) => e.u37);
  let trips = 0, withEv = 0, evTotal = 0, raids = 0, holds = 0;
  for (let t = 0; t < 40 && !S.over; t++) {
    const to = t % 2 ? "karna" : "zephara";
    S.loc = t % 2 ? "zephara" : "karna"; S.mode = "explore"; S.event = null; S.combat = null; S.travel = null; S.w6 = null; S.hp = S.maxHp; S.sanity = 100; S.flags = {};
    const L = D.LOCS[S.loc];
    if (!L.links || L.links[to] == null) { F(`${S.loc} から ${to} への道が無い`); return; }
    S.log.push({ k: "sys", text: "--" });
    const mark = S.log[S.log.length - 1];
    const at = () => S.log.lastIndexOf(mark) + 1;
    let n = 0, last = null, fights = 0, guard = 0;
    G.act("travel:" + to);
    trips++;
    while (!S.over && guard++ < 300 && (S.travel || S.combat || S.mode === "event")) {
      if (S.mode === "event") {
        if (S.event !== last && isW6(S.event)) {
          n++;
          if (beats(at()).filter((e) => e.u37.kind === "road").length !== n + fights) F(`${n} 件目の出来事 ${S.event} の前に区切りの印が無い（印 ${beats(at()).length}）`);
        }
        last = S.event;
        const list = G.actions()[0].list.filter((a) => !a.disabled);
        if (!list.length) { F(`${S.event}: 選べる選択肢が無い`); break; }
        G.act(list[0].id);
        continue;
      }
      if (S.mode === "combat") {
        if (!S.combat.u37seen) {
          S.combat.u37seen = 1;
          // 襲撃（W6 の最後の戦い）：「〜の途中、…に襲われた」の行の前に、印が一つ増えている
          const raidAt = S.log.findIndex((e, i) => i >= at() && /途中.*襲われた/.test(e.text || "") && !e.u37seen);
          if (raidAt >= 0) {
            S.log[raidAt].u37seen = 1; fights++; raids++;
            if (beats(at()).filter((e) => e.u37.kind === "road").length !== n + fights) F("襲撃の前に区切りの印が無い");
          }
        }
        const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "cb:attack") || G.actions()[0].list[0];
        G.act(a.id);
        continue;
      }
      // 出来事・戦いのあと：次へ勝手に進まず、「先へ進む」を待つ
      if (S.travel) {
        if (!(S.w6 && S.w6.u37hold)) F("旅の出来事のあとで待っていない");
        const ids = G.actions().flatMap((g) => g.list).map((a) => a.id);
        if (!ids.includes("w6go") || ids.some((id) => /^(travel|sail|explore)/.test(id))) F(`旅の途中の選択肢に「先へ進む」が無いか、旅・探索が混ざる（${ids.join()}）`);
        holds++;
        G.act("w6go");
      }
    }
    if (S.over) break;
    if (S.loc !== to) { F(`${to} に着いていない（${S.loc}）`); continue; }
    const bs = beats(at());
    const road = bs.filter((e) => e.u37.kind === "road").length;
    const arr = bs.filter((e) => e.u37.kind === "arrive");
    if (road) {
      withEv++; evTotal += road;
      if (arr.length !== 1) F(`出来事のある旅の到着の印が ${arr.length} 個`);
      // 到着の印は、場所の見出しより前
      const ti = S.log.findIndex((e, i) => i >= at() && e.k === "title" && e.text === D.LOCS[to].name);
      const ai = S.log.indexOf(arr[0]);
      if (ti >= 0 && !(ai >= 0 && ai < ti)) F("到着の印が場所の見出しより後にある");
      if (!/日目/.test(bs[0].text)) F(`道中の一行に日が無い（${bs[0].text}）`);
    } else if (arr.length) F("出来事の無い旅に到着の印がある");
  }
  if (!withEv) F("出来事のある旅が一つも無かった（確かめられない）");
  if (!holds) F("「先へ進む」を待つことが一度も無かった");
  // 日の割り振り：一件目は前のほう、最後は後のほう
  if (G.u37.dayOf(1, 3, 12) !== 3 || G.u37.dayOf(3, 3, 12) !== 9 || G.u37.dayOf(1, 1, 1) !== 1) F("日の割り振りがおかしい");

  // 出来事の無い旅：印も待ちも無い
  {
    const G2 = loadEngine();
    const S2 = start(G2, 3702, "karna");
    G2.w6.count = () => 0;
    G2.w6.raidChance = () => 0;
    const n0 = S2.log.length;
    G2.act("travel:forest");
    if (S2.travel || S2.loc !== "forest") F("出来事の無い旅でそのまま着かない");
    if (S2.log.slice(n0 - 1).some((e) => e.u37)) F("出来事の無い旅に区切りの印がある");
  }
  // 襲撃だけの旅：「何者かに襲われた」の前に印、戦いのあとは着かずに待ち、到着の印から着く
  {
    const G4 = loadEngine();
    const S4 = start(G4, 3704, "karna");
    G4.w6.count = () => 0;
    G4.w6.raidChance = () => 1;
    G4.act("travel:forest");
    const bi = S4.log.findIndex((e) => e.u37 && e.u37.kind === "road");
    const ri = S4.log.findIndex((e) => /途中.*襲われた/.test(e.text || ""));
    if (S4.mode !== "combat" || bi < 0 || !(ri > bi)) F("襲撃の前に区切りの印が無い");
    else {
      if (S4.combat.after === "arrive") F("襲撃の戦いが、終わればすぐ着く形のまま");
      for (let i = 0; i < 80 && S4.mode === "combat"; i++) G4.act("cb:attack");
      if (S4.over) F("襲撃で倒れた（確かめられない）");
      else {
        if (!(S4.travel && S4.w6 && S4.w6.u37hold)) F("襲撃の戦いのあとで待っていない");
        G4.act("w6go");
        const ai = S4.log.findIndex((e) => e.u37 && e.u37.kind === "arrive");
        if (S4.loc !== "forest" || ai < 0) F("襲撃のあと、到着の印から着かない");
      }
    }
  }
  // 古いセーブ：u37 の項目が無い旅の途中でも、先へ進めて着く
  {
    const G3 = loadEngine();
    const S3 = start(G3, 3703, "karna");
    S3.travel = "forest";
    S3.w6 = { dest: "forest", from: "karna", sea: false, days: 2, legs: 1, danger: 1, left: 0, raid: false, seen: ["x"], tod: "昼" };
    G3.act("w6go");
    if (S3.travel || S3.loc !== "forest") F("古いセーブの旅の途中から着かない");
  }
  if (!bad) ok(`旅の出来事の区切り（${trips} 回の旅・出来事のある旅 ${withEv}・印 ${evTotal}（襲撃 ${raids}）・「先へ進む」待ち ${holds}）`);
};
