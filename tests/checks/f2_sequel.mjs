// F2b：因縁の続き（src/data/f2_sequel.js。返り方は F4 の G.echo）
// - 因縁の終わり方ごとに覚えが残る（手を差し出した・笑った・突き出した・逃がした・懐に入れた・預けた・売った・持ち続けた）
// - 日がたって別の場所に行くと、その覚えの出来事が起きる。ロデリクは王城のある都で。持ち続けた鍔は迷宮で。売った人には鍔は鳴らない
// - シグルン（縁を結んでいれば）とロデリク（手を差し出していれば）は仲間になる。二人とも大人の人間で、恋の相手になりうる。同じ人は二人にならない。三人までの決まりを守る
// - 返ってくる出来事のどの選択肢を選んでも壊れない。文に数字や「！」が無い
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("F2b: " + m); };
  const NARR = /[0-9０-９]|！|!/;
  const start = (G, cls, goal, seed) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls, stats: Object.fromEntries(D.STATS.map((k) => [k, 50])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), goal, profile: { name: "テスト", sex: "女", age: 26, history: "", personality: "無口", origin: "village" } });
    G.S.hp = G.S.maxHp = 400;
    return G.S;
  };
  // 因縁を、決めた選択肢（段ごとの名の正規表現）で最後まで進める
  const play = (G, picks) => {
    const S = G.S, D = G.data;
    G.rand = () => 0.01;
    for (let g = 0; g < 8 && S.f2o && !S.f2o.done; g++) {
      const step = S.f2o.step;
      const to = G.f2o.locOf(S.f2o, step);
      S.loc = to; S.visited[to] = true; S.depth = 0; S.mode = "explore"; S.event = null; S.combat = null;
      G.act("f2o:" + step);
      const list = G.eventChoices();
      const re = picks[step];
      const p = (re && list.find(({ c }) => re.test(c.label))) || list.find(({ c }) => c.ok && c.ok.f2o > step && !c.cost && !c.fight) || list[0];
      G.act("ev:" + p.i);
      for (let k = 0; k < 40 && S.mode === "combat"; k++) G.act("cb:attack");
    }
    if (!S.f2o.done) F(`因縁が終わらない（${S.f2o.th}）`);
  };
  const ripeAt = (G, key, loc) => {
    const S = G.S;
    S.day += 30; S.loc = loc; S.mode = "explore"; S.event = null; S.combat = null;
    return G.echo.ready(S).find((e) => e.echo === key);
  };

  const G0 = loadEngine();
  const D0 = G0.data;
  const backs = D0.EVENTS.filter((e) => /^f2r_/.test(e.id));
  const keys = Object.keys(D0.ECHO_KEYS).filter((k) => /^f2_/.test(k));
  if (keys.length < 8) F(`覚えの鍵が少ない（${keys.length}）`);
  for (const k of keys) if (!backs.some((e) => e.echo === k)) F(`覚えの鍵 ${k} の返ってくる出来事が無い`);
  for (const e of backs) {
    const outs = e.choices.flatMap((c) => [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win]).filter(Boolean);
    [e.text, e.recall, ...e.choices.map((c) => c.label), ...outs.map((o) => o.text || "")].forEach((t) => { if (NARR.test(t || "")) F(`${e.id}: 文に数字か「！」：${t}`); });
    if (!e.choices.some((c) => !c.stat && !c.cond && !c.cost)) F(`${e.id}: 判定も条件も要らない選択肢が無い`);
  }
  for (const [id, m] of Object.entries(D0.F2_MATES)) {
    if (!(m.age >= 18) || (m.race || "human") !== "human" || (m.who && m.who.kind === "child")) F(`仲間 ${id} が大人の人間でない`);
    if (G0.loveMinor && G0.loveMinor(m)) F(`仲間 ${id} が恋の相手にならない側に入っている`);
    if (!D0.M2_TRAITS[m.trait]) F(`仲間 ${id} の性格（M2）が決まっていない`);
  }

  // ---------------------------------------------------------------- 終わり方ごとの覚えと、返ってくる場所
  const cases = [
    { goal: "majin", picks: { 4: /一緒に/, 5: /なぜ/ }, key: "f2_sigrun", at: "zephara", mate: "sigrun", join: /二人で/ },
    { goal: "king", picks: { 4: /手を差し出す/ }, key: "f2_rod_friend", at: "garmund", mate: "roderick", join: /一緒に来ない/, capital: true },
    { goal: "king", picks: { 4: /黙って見る/ }, key: "f2_rod_rival", at: "garmund", capital: true },
    { goal: "king", picks: { 4: /笑って/ }, key: "f2_rod_foe", at: "garmund", capital: true, fight: true },
    { goal: "rich", picks: { 4: /全部/, 5: /衛兵/ }, key: "f2_pergo_jailed", at: "zephara" },
    { goal: "rich", picks: { 4: /空だった/, 5: /秘訣/ }, key: "f2_rich_kept", at: "zephara", also: "f2_pergo_free" },
    { goal: "sword", picks: { 5: /預ける/ }, key: "f2_tsuba_left", at: "zephara" },
    { goal: "sword", picks: { 5: /礼を言って/ }, key: "f2_tsuba_kept", at: "ruins" },
    { goal: "sword", picks: { 2: /売る/, 5: /礼を言って/ }, key: "f2_tsuba_sold", at: "zephara", sold: true },
  ];
  let n = 0;
  for (const cs of cases) {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, "merc", cs.goal, 31 + n++);
    play(G, cs.picks);
    if (!G.echo.did(S, cs.key)) { F(`${cs.goal}: 終わり方（${Object.values(cs.picks).join("・")}）で覚え ${cs.key} が残らない`); continue; }
    if (cs.also && !G.echo.did(S, cs.also)) F(`${cs.goal}: 覚え ${cs.also} が残らない`);
    if (cs.capital) {
      S.day += 30; S.loc = "zephara"; S.mode = "explore";
      if (G.echo.ready(S).some((e) => e.echo === cs.key)) F(`${cs.key}: 王城の無い町で起きる`);
    }
    const e = ripeAt(G, cs.key, cs.at);
    if (!e) { F(`${cs.key}: ${cs.at} で日がたっても返ってこない`); continue; }
    if (cs.sold) {
      if (G.echo.ready(S).some((x) => x.echo === "f2_tsuba_kept")) F("鍔を売ったのに、持ち続けた鍔の出来事が起きうる");
      S.loc = "ruins"; S.depth = 1;
      if (G.echo.ready(S).some((x) => x.echo === "f2_tsuba_kept")) F("鍔を売ったのに、迷宮で鍔が鳴る");
      S.loc = cs.at; S.depth = 0;
    }
    // どの選択肢を選んでも壊れない
    for (let i = 0; i < e.choices.length; i++) {
      const G2 = loadEngine();
      const S2 = start(G2, "merc", cs.goal, 31 + n);
      play(G2, cs.picks);
      ripeAt(G2, cs.key, cs.at);
      S2.gold = 200;
      G2.rand = () => 0.01;
      try {
        G2.startEvent(e.id);
        const l = G2.eventChoices().find((x) => x.i === i);
        if (!l) continue;   // 条件で出ない選択肢
        const comps = S2.companions.length;
        G2.act("ev:" + i);
        for (let k = 0; k < 40 && S2.mode === "combat"; k++) G2.act("cb:attack");
        if (S2.over) F(`${e.id} の ${i + 1} 番目で死んだ`);
        if (cs.mate && cs.join.test(e.choices[i].label)) {
          const c = S2.companions.find((x) => x.f2o === cs.mate);
          if (S2.companions.length !== comps + 1 || !c) F(`${e.id}: 「${e.choices[i].label}」で ${cs.mate} が仲間にならない`);
          else if (G2.loveMinor(c) || (c.race || "human") !== "human") F(`${cs.mate}: 仲間になった姿が恋の決まりに合わない`);
          // 二人目にはならない
          G2.startEvent(e.id);
          if (G2.eventChoices().some((x) => cs.join.test(x.c.label))) F(`${cs.mate}: もう仲間なのに、また誘える`);
          S2.mode = "explore"; S2.event = null;
        }
      } catch (err) { F(`${e.id} の ${i + 1} 番目で落ちる：${err.message}`); }
    }
    if (cs.fight && !e.choices.some((c) => c.fight)) F(`${cs.key}: 仕返しの出来事に戦いが無い`);
  }
  // 縁を結んでいなければ、シグルンは仲間にならない（地図を写しただけ）
  {
    const G = loadEngine();
    const S = start(G, "merc", "majin", 77);
    play(G, { 4: /地図を写/ });
    ripeAt(G, "f2_sigrun", "zephara");
    G.startEvent("f2r_sigrun");
    if (G.eventChoices().some((x) => /二人で/.test(x.c.label))) F("縁を結んでいないのに、シグルンを誘える");
    // 仲間が三人いれば誘えない
    S.flags.f2_sigrun_ask = true;
    S.companions = [{ name: "一", power: 40 }, { name: "二", power: 40 }, { name: "三", power: 40 }];
    S.mode = "explore"; S.event = null;
    G.startEvent("f2r_sigrun");
    if (G.eventChoices().some((x) => /二人で/.test(x.c.label))) F("仲間が三人いるのに、シグルンを誘える");
  }

  if (!bad) ok(`F2b 因縁の続き（覚えの鍵 ${keys.length}・返ってくる出来事 ${backs.length}・仲間 ${Object.keys(D0.F2_MATES).length}）`);
};
