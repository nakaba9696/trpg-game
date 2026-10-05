// F2：序盤の引き（src/data/f2_threads.js・src/engine/zzzzzzzzz_f2_opening.js）
// - どの目的・職業でも、冒険を始めると因縁を一つ持ち、着いた文で目に入り、行動の欄のいちばん上に出る。導入の最後の頁にも一節（生まれ育った町かどうかで変わる）
// - 因縁は近場で回る：一段目・二段目・四段目は出発地、三段目は出発地から二日以内の野（最初の戦い）、五段目は隣の町。五段で一区切り
// - どの段にも、判定も条件も要らない進み方か「今はやめておく」がある。戦いに勝っても進む。逃げても残る
// - 最初の段から報酬（銭・品・名声のどれか）が出る。物語の文に数字や「！」を書かない
// - 依頼の一覧（Q7）に二段目から載り、行き先の町の名が出る。R3 の続きも載る
// - 町をぶらついて何も起きなかったら、因縁の気配が一行（一日一回）
// - 古いセーブ（S.f2o が無い）でも動く
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("F2: " + m); };
  const start = (G, cls, goal, seed, origin, name) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 40]));
    G.newGame({ cls, stats, caps: Object.fromEntries(D.STATS.map((k) => [k, 70])), goal, profile: { name: name || "テスト", sex: "女", age: 24, history: "", personality: "無口", origin } });
    return G.S;
  };
  const top = (G) => G.actions()[0];
  const NARR = /[0-9０-９]|！|!/;

  // ---------------------------------------------------------------- 表
  {
    const G = loadEngine();
    const D = G.data;
    const TH = D.F2_THREADS || {};
    if (Object.keys(TH).length < 4) F("因縁が四つ無い");
    if (!G.f2o || G.f2o === G.f2) F("G.f2o が無いか、図鑑の G.f2 と同じ入れ物（名前がぶつかる）");
    for (const g of Object.keys(D.GOALS)) if (g !== "custom" && !TH[g]) F(`目的 ${g} の因縁が無い`);
    for (const [home, wild] of Object.entries(D.F2_WILD)) {
      const d = (D.LOCS[home].links || {})[wild];
      if (!(d <= 2)) F(`${home} から三段目の野 ${wild} まで二日より遠い（${d}）`);
      const n = (D.LOCS[home].links || {})[D.F2_NEXT[home]];
      if (!(n <= 3)) F(`${home} から五段目の町 ${D.F2_NEXT[home]} まで三日より遠い（${n}）`);
      if (D.LOCS[wild].type === "dungeon") F(`三段目の野 ${wild} が迷宮`);
    }
    for (const [id, th] of Object.entries(TH)) {
      // 導入の一節は目的の行き先・手順を言わない（U5 と同じ言葉）
      [th.pro.home, th.pro.away, th.arrive].forEach((t) => { if (/竜の墓場|鬼ヶ島|ヴォルグリム|白夜|エンバルダ|灰の荒野|騎士|領主|王位|絶界/.test(t)) F(`${id}: 導入・着いた文に行き先・手順のヒント：${t}`); });
      if (th.steps.length !== 5) F(`${id}: 段が五つでない`);
      [th.pro.home, th.pro.away, th.arrive, ...th.steps.flatMap((s) => [s.label, s.hint, s.glimpse || ""])].forEach((t) => { if (NARR.test(t)) F(`${id}: 文に数字か「！」：${t}`); });
      th.steps.forEach((s, i) => {
        const e = D.EVENTS.find((x) => x.id === s.ev);
        if (!e) { F(`${id} ${i + 1} 段目: 出来事 ${s.ev} が無い`); return; }
        if (e.w !== 0) F(`${s.ev}: たまたま起きる（w: 0 でない）`);
        if (!e.who) F(`${s.ev}: 人物の絵（who）が無い`);
        const outs = [];
        e.choices.forEach((c) => { [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win].forEach((o) => o && outs.push(o)); });
        [e.text, ...e.choices.map((c) => c.label), ...outs.map((o) => o.text || "")].forEach((t) => { if (NARR.test(t)) F(`${s.ev}: 文に数字か「！」：${t}`); });
        // 判定も条件も費用も要らずに、この段を進めるか残す選択肢（戦いは勝てば進む）
        const free = e.choices.find((c) => !c.stat && !c.cond && !c.cost && ((c.ok && c.ok.f2o != null) || (c.fight && c.win && c.win.f2o != null)));
        if (!free) F(`${s.ev}: 判定なしで進められる選択肢が無い`);
        e.choices.forEach((c, j) => {
          const ends = [c.ok, c.ng, c.win].filter(Boolean).map((o) => (o.fight ? o.win : o));
          if (ends.some((o) => !o || o.f2o == null)) F(`${s.ev} の ${j + 1} 番目: 段の行き先（f2）の無い結果がある`);
          if (c.fight && !(c.win && c.win.f2o > i + 1)) F(`${s.ev} の ${j + 1} 番目: 戦いに勝っても進まない`);
        });
        if (i === 0 && !e.choices.some((c) => { const o = c.ok || {}; return !c.stat && !c.cond && (o.gold > 0 || o.item || o.fame > 0); }) && !e.choices.some((c) => c.stat && ((c.ok || {}).gold > 0 || (c.ok || {}).fame > 0))) F(`${s.ev}: 最初の段で報酬が出ない`);
      });
    }
  }

  // ---------------------------------------------------------------- 始まり：どの目的・職業でも
  {
    const G = loadEngine();
    const D = G.data;
    const seen = new Set();
    let n = 0;
    for (const cls of Object.keys(D.CLASSES)) {
      for (const goal of Object.keys(D.GOALS)) {
        const home = D.CLASSES[cls].start;
        for (const origin of [home, "village"]) {
          n++;
          const S = start(G, cls, goal, 11 + n, origin, "テスト" + n);
          if (!S.f2o || S.f2o.step !== 1 || S.f2o.home !== home) { F(`${cls}/${goal}: 因縁を持たない`); continue; }
          seen.add(S.f2o.th);
          const th = D.F2_THREADS[S.f2o.th];
          if (goal !== "custom" && S.f2o.th !== goal) F(`${cls}/${goal}: 目的と違う因縁 ${S.f2o.th}`);
          if (!S.log.some((x) => x.text === th.arrive)) F(`${cls}/${goal}: 着いた文に因縁が無い`);
          const t = top(G);
          if (!t || t.title !== th.title || t.list[0].id !== "f2o:1") F(`${cls}/${goal}: 因縁が行動の欄のいちばん上に無い`);
          if (!G.actions().some((g) => g.title === "旅立つ")) F(`${cls}/${goal}: 因縁のせいで旅立てない`);
          // 導入
          const pages = G.cre.prologue({ cls, goal, goalText: D.GOALS[goal].text || "何か", profile: { name: "テスト" + n, age: 24, origin } });
          const last = pages[pages.length - 1].join("");
          const want = origin === home ? th.pro.home : th.pro.away;
          if (!last.includes(want)) F(`${cls}/${goal}/${origin}: 導入の最後の頁に因縁の一節が無い`);
          if (G.q7.list(S).some((x) => x.src === "f2o")) F(`${cls}/${goal}: 始めたばかりで因縁が依頼の一覧に載る`);
        }
      }
    }
    if (seen.size < 4) F(`「自分で決める」を含めて、因縁が ${seen.size} 種類しか出ない`);
  }

  // ---------------------------------------------------------------- 通しで遊ぶ（判定はすべて成功・戦いのある道も）
  let chains = 0;
  for (const goal of ["majin", "king", "rich", "sword"]) {
    for (const cls of ["merc", "thief", "mage", "priest", "samurai"]) {
      for (const fightWay of [false, true]) {
        const G = loadEngine();
        const D = G.data;
        const S = start(G, cls, goal, 7 + cls.length, "village");
        S.inv.jerky = 2; S.gold = 100; S.hp = S.maxHp = 400;
        const gold0 = S.gold, fame0 = S.fame || 0;
        const th = D.F2_THREADS[goal];
        let fought = 0, guard = 0, firstPay = null;
        while (S.f2o && !S.f2o.done && guard++ < 12) {
          const step = S.f2o.step;
          const to = G.f2o.locOf(S.f2o, step);
          if (step === 3 && to !== D.F2_WILD[S.f2o.home]) F(`${goal}/${cls}: 三段目が近くの野でない（${to}）`);
          if (step === 5 && to !== D.F2_NEXT[S.f2o.home]) F(`${goal}/${cls}: 五段目が隣の町でない（${to}）`);
          if ([1, 2, 4].includes(step) && to !== S.f2o.home) F(`${goal}/${cls}: ${step} 段目が出発地でない`);
          if (step >= 2) {
            const q = G.q7.list(S).find((x) => x.src === "f2o");
            if (!q) F(`${goal}/${cls}: ${step} 段目なのに依頼の一覧に因縁が無い`);
            else {
              if (!q.desc.some((d) => d.includes(D.LOCS[to].name))) F(`${goal}/${cls}: 依頼の一覧に行き先 ${D.LOCS[to].name} が出ない`);
              if (/名声|成功率|[0-9０-９]/.test([q.title, q.kind, q.client, ...q.desc].join(""))) F(`${goal}/${cls}: 依頼の一覧に数が出る`);
            }
          }
          if (S.loc !== to) {
            // ほかの場所では出ない
            if (G.actions().some((g) => g.list.some((a) => a.id === "f2o:" + step))) F(`${goal}/${cls}: ${step} 段目が別の場所（${S.loc}）に出る`);
            S.loc = to; S.visited[to] = true; S.depth = 0;
          }
          S.mode = "explore"; S.event = null; S.combat = null;
          const t = top(G);
          if (!t || !t.list.some((a) => a.id === "f2o:" + step)) { F(`${goal}/${cls}: ${step} 段目が ${to} の行動の欄に出ない`); break; }
          G.rand = () => 0.01;
          G.act("f2o:" + step);
          if (S.mode !== "event" || S.event !== th.steps[step - 1].ev) { F(`${goal}/${cls}: ${step} 段目の出来事が始まらない`); break; }
          const list = G.eventChoices();
          const e = D.EVENTS.find((x) => x.id === S.event);
          const pick = (fightWay && list.find(({ c }) => c.fight)) || list.find(({ c }) => c.ok && c.ok.f2o > step && !c.cost) || list.find(({ c }) => c.ok && c.ok.f2o > step) || list[0];
          if (step === 1) {
            // 断っても損をしない（因縁は向こうから来る）
            const d = e.choices.find((c) => !c.stat && !c.cond && !c.cost && !c.fight && c.ok && !c.ok.gold && !c.ok.item);
            if (!d || (d.ok.hp || 0) < 0) F(`${goal}: 一段目に損をしない断り方が無い`);
          }
          const g1 = S.gold;
          G.act("ev:" + pick.i);
          if (S.mode === "combat") {
            fought++;
            for (let k = 0; k < 40 && S.mode === "combat"; k++) G.act("cb:attack");
            if (S.mode === "combat") { F(`${goal}/${cls}: ${step} 段目の戦いが終わらない`); break; }
          }
          if (S.over) { F(`${goal}/${cls}: ${step} 段目で死んだ`); break; }
          if (step === 1) firstPay = S.gold > g1 || (S.fame || 0) > fame0 || Object.keys(S.inv).length > 0;
          if (!S.f2o.done && S.f2o.step === step) { F(`${goal}/${cls}: ${step} 段目が進まない（${pick.c.label}）`); break; }
          chains++;
        }
        if (!S.f2o || !S.f2o.done) F(`${goal}/${cls}${fightWay ? "（戦う道）" : ""}: 因縁が一区切りしない`);
        if (fightWay && !fought) F(`${goal}/${cls}: 戦う道で一度も戦わない`);
        if (!firstPay) F(`${goal}/${cls}: 一段目で何ももらえない`);
        if (S.gold <= gold0) F(`${goal}/${cls}${fightWay ? "（戦う道）" : ""}: 一区切りしても銭が増えない`);
        if (G.q7.list(S).some((x) => x.src === "f2o")) F(`${goal}/${cls}: 一区切りしたのに依頼の一覧に残る`);
        if (!G.q7.finished(S).some((x) => x.src === "f2o" && x.title === th.title)) F(`${goal}/${cls}: 済んだ一覧に因縁が無い`);
        if (G.actions().some((g) => g.list.some((a) => /^f2o:/.test(a.id)))) F(`${goal}/${cls}: 一区切りしたのに行動の欄に残る`);
      }
    }
  }

  // ---------------------------------------------------------------- 今はやめておく・逃げても残る
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, "merc", "majin", 5, "village");
    S.f2o.step = 3; S.loc = D.F2_WILD[S.f2o.home]; S.mode = "explore";
    G.act("f2o:3");
    const e = D.EVENTS.find((x) => x.id === S.event);
    G.act("ev:" + e.choices.findIndex((c) => /やめて/.test(c.label)));
    if (S.f2o.step !== 3 || !top(G).list.some((a) => a.id === "f2o:3")) F("「今はやめておく」で段が消えた");
    G.act("f2o:3");
    G.act("ev:" + e.choices.findIndex((c) => c.fight));
    if (S.mode !== "combat") F("三段目で戦いが始まらない");
    S.mode = "explore"; S.combat = null; S.event = null;
    if (S.f2o.step !== 3 || !top(G).list.some((a) => a.id === "f2o:3")) F("戦いから逃げたら段が消えた");
  }

  // ---------------------------------------------------------------- 依頼の一覧に R3 の続きが載る
  {
    const G = loadEngine();
    const S = start(G, "priest", "rich", 3, "village");
    S.r3.follow.l_bread = 1;
    const q = G.q7.list(S).find((x) => x.key === "r3:l_bread");
    if (!q || !q.desc.some((d) => d.includes(G.data.LOCS.plains.name))) F("R3 の続き（パンの包み）が依頼の一覧に行き先つきで載らない");
  }

  // ---------------------------------------------------------------- 町をぶらついて何も起きないときの気配
  {
    const G = loadEngine();
    const S = start(G, "merc", "majin", 21, "village");
    S.f2o.step = 2;
    const g = G.data.F2_THREADS.majin.steps[1].glimpse;
    const days = new Set();
    let empty = 0, said = 0;
    for (let i = 0; i < 40 && empty < 4; i++) {
      G.rand = seeded(100 + i);
      S.mode = "explore"; S.event = null; S.combat = null; S.hp = S.maxHp;
      const n = S.log.length;
      G.act("walk");
      if (S.mode === "explore" && !S.event) {
        empty++;
        days.add(S.f2o.gday === S.day ? S.day : -1);
        if (S.log.slice(n).some((x) => x.text === g)) said++;
      }
    }
    if (!empty) F("町をぶらついて何も起きない回が無い（試しの前提）");
    else if (days.has(-1) || said !== days.size) F(`町をぶらついて何も起きなかった ${empty} 回（${days.size} 日）のうち、因縁の気配が ${said} 回（一日一回のはず）`);
  }

  // ---------------------------------------------------------------- 古いセーブ
  {
    const G = loadEngine();
    const S = start(G, "thief", "sword", 9, "village");
    delete S.f2o;
    try {
      G.actions(); G.act("walk"); G.q7.list(S); G.q7.finished(S);
      G.apply({ text: "試し", f2o: 2 });
      if (S.f2o) F("古いセーブで因縁ができる");
    } catch (err) { F("古いセーブ（S.f2o 無し）で落ちる：" + err.message); }
  }

  if (!bad) ok(`F2 序盤の引き（因縁 ${Object.keys(loadEngine().data.F2_THREADS).length}・通しで ${chains} 段）`);
};
