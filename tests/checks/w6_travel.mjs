// W6：旅の途中の出来事（src/engine/w6_travel.js・src/data/events_w6_*.js）
// - 出来事の形：旅の条件 w6 が正しい・ふつうの抽選には出ない（w: 0）・能力値の違う解き方が 2 つ以上と、判定なしの選択肢がある
//   結果は小さい・続き物の印（w6.flag）はどこかの結果で立つ・地の文に「！」が無い・「魔王」が無い
// - 数：120 以上。陸・船・野営（夜）・地方ごとにある
// - 旅をすると出来事が起きる。回数は日数と危険度で増える。0〜2 回
// - 船旅でも起きる。襲撃の戦いのあとも着く
// - どの出来事も、どの選択肢を選んでも壊れずに着く
// - 古いセーブ（S.w6 が無い・旅の途中）でも動く
const MAX = { gold: 80, hpUp: 25, hpDown: -15, days: 2, fame: 3, grow: 1 };
const NARR = (t) => String(t || "").replace(/「[^」]*」/g, "");

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail(m); };
  const G = loadEngine();
  const D = G.data;
  const W6 = G.w6;
  if (!W6 || !W6.start) { F("G.w6 が無い"); return; }
  const evs = D.EVENTS.filter((e) => e.w6);
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  // ---------------------------------------------------------------- 1. 出来事の形
  const flagsSet = new Set();
  const outs = (c) => [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win].filter(Boolean);
  D.EVENTS.forEach((e) => (e.choices || []).forEach((c) => outs(c).forEach((o) => as(o.flag).forEach((f) => flagsSet.add(f)))));
  const ON = ["land", "sea", "any"];
  for (const e of evs) {
    const r = e.w6, w = `旅の出来事 ${e.id}`;
    if (!/^w6/.test(e.id)) F(`${w}: id は w6 で始める`);
    if (e.w !== 0 || !as(e.where).includes("w6")) F(`${w}: where: ["w6"]・w: 0 にする（ふつうの抽選に出さない）`);
    if (!(r.w > 0 && r.w <= 6)) F(`${w}: w6.w は 0 より大きく 6 まで`);
    if (r.on && !ON.includes(r.on)) F(`${w}: w6.on ${r.on}`);
    as(r.reg).forEach((x) => W6.REGIONS.includes(x) || F(`${w}: 地方 ${x} が無い`));
    as(r.tod).forEach((x) => W6.TODS.includes(x) || F(`${w}: 時間帯 ${x} が無い`));
    as(r.season).forEach((x) => G.SEASONS.includes(x) || F(`${w}: 季節 ${x} が無い`));
    as(r.weather).forEach((x) => ["晴", "雨", "霧", "雪"].includes(x) || F(`${w}: 天候 ${x} が無い`));
    as(r.flag).forEach((f) => flagsSet.has(f) || F(`${w}: 印 ${f} を立てる結果が無い（続き物の前の話が無い）`));
    const ch = e.choices || [];
    if (ch.length < 2 || ch.length > 5) F(`${w}: 選択肢は 2〜5`);
    const stats = new Set(ch.filter((c) => c.stat).map((c) => c.stat));
    if (stats.size < 2) F(`${w}: 能力値の違う解き方が 2 つ以上いる（${[...stats].join("・")}）`);
    if (!ch.some((c) => !c.stat && !c.cost && !c.cond)) F(`${w}: 判定なしで、いつでも選べる選択肢がいる`);
    const texts = [e.title, e.text];
    ch.forEach((c, i) => {
      if (c.stat && !(c.ok && c.ng)) F(`${w}[${i}]: 判定の選択肢に ok と ng がいる`);
      if (!c.stat && !c.ok && !c.fight && !c.next) F(`${w}[${i}]: 結果が無い`);
      texts.push(c.label);
      outs(c).forEach((o) => {
        texts.push(o.text);
        as(o.heard).forEach((t) => texts.push(t));
        if (o.gold && o.gold > MAX.gold) F(`${w}[${i}]: 金が多すぎる ${o.gold}`);
        if (o.hp && (o.hp > MAX.hpUp || o.hp < MAX.hpDown)) F(`${w}[${i}]: HP の増減が大きすぎる ${o.hp}`);
        if (o.days && (o.days < 0 || o.days > MAX.days)) F(`${w}[${i}]: 日数のずれが大きすぎる ${o.days}`);
        if (o.fame && Math.abs(o.fame) > MAX.fame) F(`${w}[${i}]: 名声が大きすぎる ${o.fame}`);
        Object.values(o.grow || {}).forEach((n) => n > MAX.grow && F(`${w}[${i}]: 伸びが大きすぎる`));
        if (o.heal === "full") F(`${w}[${i}]: 全快は大きすぎる`);
        if (o.companion || o.dropCompanion || o.title) F(`${w}[${i}]: 旅の出来事で仲間・称号は動かさない`);
        if (o.detour && (o.fight || o.next)) F(`${w}[${i}]: 寄り道と戦い・続きは一緒にしない`);
        if (o.banter && !["camp", "road"].includes(o.banter)) F(`${w}[${i}]: banter は camp か road`);
      });
    });
    texts.forEach((t) => {
      if (/[！!]/.test(NARR(t))) F(`${w}: 地の文に「！」：${String(t).slice(0, 30)}`);
      if (/魔王/.test(t)) F(`${w}: 「魔王」：${String(t).slice(0, 30)}`);
    });
  }

  // ---------------------------------------------------------------- 2. 数
  const land = evs.filter((e) => (e.w6.on || "land") !== "sea"), sea = evs.filter((e) => e.w6.on === "sea" || e.w6.on === "any");
  const night = evs.filter((e) => as(e.w6.tod).includes("夜"));
  const byReg = Object.fromEntries(W6.REGIONS.map((g) => [g, evs.filter((e) => as(e.w6.reg).includes(g)).length]));
  if (evs.length < 120) F(`旅の出来事が ${evs.length}（120 以上ほしい）`);
  if (sea.length < 15) F(`船旅の出来事が ${sea.length}（15 以上）`);
  if (night.length < 10) F(`夜（野営）の出来事が ${night.length}（10 以上）`);
  for (const [g, n] of Object.entries(byReg)) if (n < 3) F(`地方 ${g} の出来事が ${n}（3 以上）`);
  if (!evs.some((e) => e.w6.comp)) F("仲間がいるときの出来事が無い");
  if (!evs.some((e) => e.w6.flag)) F("続き物（前の旅の印で起きる出来事）が無い");
  if (!evs.some((e) => e.w6.season || e.w6.weather)) F("季節・天候で起きる出来事が無い");
  if (!evs.some((e) => e.once)) F("一度きりの出来事が無い");

  // ---------------------------------------------------------------- 3. 旅で出来事が起きる（回数は日数・危険度で増える）
  const fresh = (seed, cls) => {
    const H = loadEngine();
    H.rand = seeded(seed);
    H.P = { trophies: {}, graves: [] };
    const HD = H.data;
    H.newGame({ cls: cls || Object.keys(HD.CLASSES)[0], stats: Object.fromEntries(HD.STATS.map((k) => [k, 60])), caps: Object.fromEntries(HD.STATS.map((k) => [k, 80])), goal: Object.keys(HD.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    H.S.maxHp = H.S.hp = 9999;
    H.hurt = () => {};   // 死なない（出来事と旅の流れだけを見る）
    return H;
  };
  // 一つの旅を最後まで（選択肢は乱数で・戦いは攻撃で）。起きた出来事の数を返す
  const journey = (H, act, pickChoice) => {
    const S = H.S;
    const before = S.loc;
    let events = 0, guard = 0;
    H.act(act);
    const isW6 = (id) => !!(H.data.EVENTS.find((e) => e.id === id) || {}).w6;
    while (!S.over && guard++ < 200 && (S.travel || S.combat || (S.mode === "event" && isW6(S.event)))) {
      if (S.mode === "event") {
        if (isW6(S.event)) events++;
        const list = H.actions()[0].list.filter((a) => !a.disabled);
        if (!list.length) { F(`${S.event}: 選べる選択肢が無い`); break; }
        H.act((pickChoice ? pickChoice(list) : H.pick(list)).id);
        continue;
      }
      if (S.mode === "combat") { const a = H.actions().flatMap((g) => g.list).find((x) => x.id === "cb:attack") || H.actions()[0].list[0]; H.act(a.id); continue; }
      H.act("w6go");
    }
    if (guard >= 200) F(`旅が終わらない（${before}→${act}）`);
    return events;
  };
  {
    const H = fresh(601);
    const S = H.S;
    // 手で場所を置いて、同じ道を何度も往復する
    const trial = (from, to, times) => {
      let sum = 0, max = 0, arrived = 0;
      for (let i = 0; i < times; i++) {
        S.loc = from; S.mode = "explore"; S.event = null; S.combat = null; S.travel = null; S.w6 = null; S.flags = {}; S.hp = S.maxHp; S.sanity = 100; S.gold = 500; S.companions = [];
        const n = journey(H, "travel:" + to);
        if (S.over) { F("旅の途中で死んだ（HP 9999 のはず）"); return { avg: 0, max: 0 }; }
        sum += n; max = Math.max(max, n);
        if (S.loc === to || (D.LOCS[S.loc] && S.loc !== from)) arrived++;
        if (S.travel || S.w6) F(`${from}→${to}: 着いたのに旅の途中のまま`);
      }
      if (arrived < times) F(`${from}→${to}: 着かなかった回がある（${times - arrived}）`);
      return { avg: sum / times, max };
    };
    const short = trial("karna", "forest", 120);      // 1日・危険度 1
    const mid = trial("karna", "nerva", 120);         // 2日・町
    const long = trial("karna", "zephara", 120);      // 4日・町
    const wild = trial("mountains", "wasteland", 120); // 3日・危険度 5
    [short, mid, long, wild].forEach((t) => t.max > W6.MAX && F(`一つの旅で ${t.max} 回（上限 ${W6.MAX}）`));
    if (!(short.avg < mid.avg && mid.avg < long.avg)) F(`日数で回数が増えない（1日 ${short.avg.toFixed(2)}・2日 ${mid.avg.toFixed(2)}・4日 ${long.avg.toFixed(2)}）`);
    if (!(short.avg > 0.15 && short.avg < 0.7)) F(`短い道で起きすぎる・起きなさすぎる（${short.avg.toFixed(2)}）`);
    if (!(long.avg >= 1)) F(`長い道で出来事が少ない（${long.avg.toFixed(2)}）`);
    const exp = (d, g) => W6.expect(d, g, false);
    if (!(exp(3, 5) > exp(3, 0))) F("危険度で回数の期待値が増えない");
    if (!bad) ok(`旅の出来事の回数（平均 1日 ${short.avg.toFixed(2)}・2日 ${mid.avg.toFixed(2)}・4日 ${long.avg.toFixed(2)}・危険な3日 ${wild.avg.toFixed(2)}）`);

    // 船旅
    let seaN = 0;
    for (let i = 0; i < 60; i++) {
      S.loc = "nerva"; S.mode = "explore"; S.event = null; S.combat = null; S.travel = null; S.w6 = null; S.gold = 500; S.hp = S.maxHp; S.sanity = 100;
      seaN += journey(H, "sail:yakumo");
      if (S.loc !== "yakumo" || S.travel) F(`船旅で着かない（${S.loc}）`);
    }
    if (seaN < 30) F(`船旅で出来事があまり起きない（60 回で ${seaN}）`);
  }

  // ---------------------------------------------------------------- 4. どの出来事も、どの選択肢でも壊れない
  {
    const H = fresh(733);
    const S = H.S;
    let runs = 0;
    const check0 = H.check;
    const pal = H.genCompanion();
    for (const e of evs) {
      e.choices.forEach((c, i) => {
        for (const res of [true, false]) {
          if (!c.stat && !res) continue;
          const sea = e.w6.on === "sea";
          const [from, to] = sea ? ["nerva", "yakumo"] : ["karna", "nerva"];
          S.loc = to; S.mode = "explore"; S.combat = null; S.event = null; S.over = ""; S.hp = S.maxHp = 9999; S.sanity = 100; S.gold = 300; S.companions = e.w6.comp || e.m2 ? [pal] : [];
          S.travel = to; S.w6 = { dest: to, from, sea, days: 3, danger: 2, left: 0, raid: false, seen: [e.id], tod: "夜" };
          S.loc = from;
          if (c.cond && !c.cond(S)) return;
          H.startEvent(e);
          if (c.stat) H.check = (...a) => ({ ...check0(...a), ok: res });
          const idx = H.actions()[0].list.findIndex((a) => a.id === "ev:" + i);
          if (idx < 0) { F(`${e.id}[${i}]: 選択肢が出ない`); return; }
          try { H.act("ev:" + i); } catch (err) { F(`${e.id}[${i}]: 例外 ${err.message}`); }
          H.check = check0;
          let guard = 0;
          while (!S.over && guard++ < 60 && (S.mode !== "explore" || S.travel)) {
            if (S.mode === "event") { H.act(H.actions()[0].list.find((a) => !a.disabled).id); continue; }
            if (S.mode === "combat") { const a = H.actions().flatMap((g) => g.list).find((x) => x.id === "cb:attack"); H.act(a ? a.id : H.actions()[0].list[0].id); continue; }
            if (S.travel) { H.act("w6go"); continue; }
            break;
          }
          if (S.over) F(`${e.id}[${i}]: 死んだ（HP 9999 のはず）`);
          else if (S.travel || S.w6 || S.mode !== "explore") F(`${e.id}[${i}]: 着かない（mode ${S.mode}・travel ${S.travel}）`);
          runs++;
        }
      });
    }
    if (!bad) ok(`旅の出来事 ${evs.length}（陸 ${land.length}・船 ${sea.length}・夜 ${night.length}・地方 ${Object.entries(byReg).map(([g, n]) => g + " " + n).join("・")}）。選択肢と結果を ${runs} 通り通した`);
  }

  // ---------------------------------------------------------------- 5. 古いセーブ
  {
    const H = fresh(811);
    const S = H.S;
    // 旅の途中（S.travel だけある・戦いの無い explore）
    S.travel = "nerva"; delete S.w6; delete S.w6recent;
    const list = H.actions().flatMap((g) => g.list);
    if (!list.some((a) => a.id === "w6go")) F("古いセーブの旅の途中で「先へ進む」が出ない");
    H.act("w6go");
    if (S.loc !== "nerva" || S.travel) F(`古いセーブの旅の途中から着かない（${S.loc}・${S.travel}）`);
    // 旅の途中の戦い（after: arrive）
    S.loc = "karna"; S.travel = "forest"; delete S.w6;
    H.startCombat(["goblin"], { after: "arrive" });
    let g = 0;
    while (S.combat && g++ < 50) H.act("cb:attack");
    if (S.loc !== "forest" || S.travel) F(`古いセーブの旅の途中の戦いのあと着かない（${S.loc}）`);
    // 出来事の途中（旅の出来事の最中にセーブした）
    S.loc = "karna"; S.travel = "nerva"; S.w6 = { dest: "nerva", from: "karna", sea: false, days: 2, danger: 0, left: 1, raid: false, seen: [], tod: "昼" };
    H.startEvent(evs[0]);
    const saved = JSON.parse(JSON.stringify(S));
    H.S = saved;
    H.act("ev:" + evs[0].choices.findIndex((c) => !c.stat && !c.cost && !c.cond));
    g = 0;
    while (!saved.over && g++ < 60 && (saved.mode !== "explore" || saved.travel)) {
      if (saved.mode === "event") { H.act(H.actions()[0].list.find((a) => !a.disabled).id); continue; }
      if (saved.mode === "combat") { H.act("cb:attack"); continue; }
      H.act("w6go");
    }
    if (saved.travel || saved.w6) F("読み込んだ旅の途中のセーブから着かない");
    if (!bad) ok("古いセーブ（旅の途中・戦いの途中・出来事の途中）");
  }
};
