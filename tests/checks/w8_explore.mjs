// W8：荒野と迷宮を進むときの出来事（src/engine/w8_explore.js・src/data/events_w8_*.js）
// - 表の整合：種類・土地・脇道・強敵の表が正しい。見える文に「！」や禁じた言葉、物語の文に数字が無い
// - どの荒野・迷宮でも、進むと戦闘以外の出来事が 3 割以上起き、W8 の出来事が出る。同じ出来事が続けて出ない
// - 脇道が見つかり、その場所の選択肢に残る（よそへ行って戻っても）。入ると部屋を進み、主を倒すと休める場所になる
// - 強敵は前触れのあとにしか出ない。やり過ごせば戦わずに済み、前触れが消える。倒すと印と名声
// - 野営の夜の出来事が起きる。古いセーブ（S.w8 が無い）でも動く
const BANNED = /見世物|観客|客席|舞台|台本|言霊|魔王|！|!/;
const KINDS = ["people", "terrain", "weather", "trace", "side", "omen", "meet", "night", "room"];
const LANDS = ["forest", "plain", "snow", "swamp", "mount", "ruin", "isle", "realm", "dungeon", "wild"];

export default ({ fail, ok, loadEngine, seeded }) => {
  const F = (m) => fail("W8 " + m);
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const start = (G, seed, loc) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    if (loc) { G.S.loc = loc; G.S.visited[loc] = true; }
    return G.S;
  };
  const acts = (G) => G.actions().flatMap((g) => g.list);
  const reset = (S) => { S.mode = "explore"; S.event = null; S.combat = null; S.hp = S.maxHp = 9999; S.over = ""; };

  // ---------------------------------------------------------------- 表の整合
  {
    const G = loadEngine();
    const D = G.data;
    const W8 = G.w8;
    if (!W8 || !D.W8_SIDES || !D.W8_FOES) { F("仕組み（G.w8・D.W8_SIDES・D.W8_FOES）が無い"); return; }
    const evs = D.EVENTS.filter((e) => e.w8);
    const ids = new Set(D.EVENTS.map((e) => e.id));
    const texts = [];
    const outcome = (w, o) => { if (!o) return; if (o.text) texts.push([w, o.text]); if (o.memo) texts.push([w, o.memo]); if (o.next && !ids.has(o.next)) F(`${w}: next ${o.next} が無い`); if (o.w8side && o.w8side !== "@land" && !D.W8_SIDES[o.w8side]) F(`${w}: 脇道 ${o.w8side} が無い`); outcome(w + ".win", o.win); };
    for (const e of evs) {
      const r = e.w8;
      if (!as(e.where).includes("w8") || e.w !== 0) F(`${e.id}: where に w8・w: 0 が無い（ふつうの抽選に出てしまう）`);
      if (!KINDS.includes(r.kind)) F(`${e.id}: 種類 ${r.kind} が無い`);
      as(r.land).forEach((l) => LANDS.includes(l) || F(`${e.id}: 土地 ${l} が無い`));
      as(r.loc).forEach((l) => D.LOCS[l] || F(`${e.id}: 場所 ${l} が無い`));
      if (!(r.w > 0)) F(`${e.id}: 重みが無い`);
      if (r.kind === "side" && !D.W8_SIDES[r.find]) F(`${e.id}: 見つける脇道 ${r.find} が無い`);
      if ((r.kind === "omen" || r.kind === "meet") && !D.W8_FOES[r.foe]) F(`${e.id}: 強敵 ${r.foe} が無い`);
      if (e.choices.length < 2) F(`${e.id}: 選択肢が ${e.choices.length}`);
      if (!e.choices.some((c) => !c.stat && !c.cond)) F(`${e.id}: 判定なしの選択肢が無い`);
      texts.push([e.id, e.title], [e.id, e.text]);
      e.choices.forEach((c, i) => { texts.push([`${e.id}[${i}]`, c.label]); outcome(`${e.id}[${i}].ok`, c.ok); outcome(`${e.id}[${i}].ng`, c.ng); outcome(`${e.id}[${i}]`, { win: c.win }); if (c.fight) G.resolveFoes || F("resolveFoes が無い"); });
    }
    for (const [id, s] of Object.entries(D.W8_SIDES)) {
      ["name", "enter", "clear", "last"].forEach((k) => (s[k] ? texts.push([id, s[k]]) : F(`脇道 ${id}: ${k} が無い`)));
      if (!(s.rooms >= 2)) F(`脇道 ${id}: 部屋が ${s.rooms}`);
      if (s.boss && !D.ENEMIES[s.boss]) F(`脇道 ${id}: 主 ${s.boss} が無い`);
      Object.keys((s.reward || {}).item || {}).forEach((it) => D.ITEMS[it] || F(`脇道 ${id}: 品 ${it} が無い`));
      if (!evs.some((e) => e.w8.kind === "side" && e.w8.find === id)) F(`脇道 ${id}: 見つける出来事が無い`);
    }
    for (const [id, f] of Object.entries(D.W8_FOES)) {
      if (!D.ENEMIES[id]) F(`強敵 ${id} が敵に無い`);
      else if (D.ENEMIES[id].boss) F(`強敵 ${id} が迷宮の主`);
      as(f.loc).forEach((l) => D.LOCS[l] && D.LOCS[l].type !== "town" || F(`強敵 ${id}: 場所 ${l} が荒野・迷宮でない`));
      Object.keys(f.item || {}).forEach((it) => D.ITEMS[it] || F(`強敵 ${id}: 品 ${it} が無い`));
      if (!ids.has("w8_omen_" + id) || !ids.has("w8_meet_" + id)) F(`強敵 ${id}: 前触れか出会いの出来事が無い`);
    }
    for (const [w, t] of texts) {
      if (BANNED.test(t)) F(`見える文に「${t.match(BANNED)[0]}」：${w}「${t.slice(0, 30)}…」`);
      if (/[0-9０-９]/.test(t)) F(`物語の文に数字：${w}「${t.slice(0, 30)}…」`);
    }
    // 種類ごとの数（荒野の土地ごとに、人・難所・脇道・強敵）
    const wildLands = [...new Set(Object.keys(D.LOCS).filter((id) => D.LOCS[id].type === "wild").map((id) => W8.landOf(id)))];
    for (const land of wildLands) {
      const hit = (e) => as(e.w8.land).includes(land) || as(e.w8.land).includes("wild");
      for (const k of ["people", "terrain", "side"]) if (!evs.some((e) => e.w8.kind === k && hit(e))) F(`土地 ${land} に ${k} の出来事が無い`);
    }
    for (const [id, L] of Object.entries(D.LOCS)) if (L.type === "wild" && !Object.values(D.W8_FOES).some((f) => as(f.loc).includes(id))) F(`荒野 ${id} に強敵がいない`);
    ok(`W8 表：出来事 ${evs.length}・脇道 ${Object.keys(D.W8_SIDES).length}・強敵 ${Object.keys(D.W8_FOES).length}`);
  }

  // ---------------------------------------------------------------- 各荒野・迷宮で進む
  {
    const G = loadEngine();
    const D = G.data;
    const N = 120;
    const low = [];
    let w8total = 0;
    for (const [id, L] of Object.entries(D.LOCS)) {
      if (L.type === "town") continue;
      start(G, 7 + id.length, id);
      const S = G.S;
      let calm = 0, w8 = 0, repeat = 0, prev = null, meetBad = 0;
      for (let i = 0; i < N; i++) {
        reset(S);
        S.loc = id;
        if (L.type === "dungeon") S.depth = 1 + (i % Math.max(1, L.floors - 2));
        G.act(L.type === "wild" ? "explore" : "deeper");
        if (S.mode !== "combat") calm++;
        const e = S.mode === "event" ? D.EVENTS.find((x) => x.id === S.event) : null;
        if (e && e.w8) {
          w8++;
          if (e.w8.kind === "meet" && G.w8.st(S).omen[id] !== e.w8.foe) meetBad++;
        }
        const cur = e ? e.id : null;
        if (cur && cur === prev) repeat++;
        prev = cur;
        // 前触れを見たら、半分はやり過ごし、半分は離れる（出会いが起きるように）
        if (e && e.w8 && e.w8.kind === "omen") { const i2 = e.choices.length - 1; G.chooseEvent(i2); }
      }
      w8total += w8;
      if (calm / N < 0.3) low.push(`${id} ${Math.round((100 * calm) / N)}%`);
      if (!w8) F(`${id}: 進んでも W8 の出来事が一度も起きない`);
      if (repeat) F(`${id}: 同じ出来事が続けて ${repeat} 回`);
      if (meetBad) F(`${id}: 前触れなしに強敵が出た（${meetBad} 回）`);
    }
    if (low.length) F(`戦闘以外が 3 割に届かない：${low.join("・")}`);
    ok(`W8 進む：W8 の出来事 ${w8total} 回（各場所 ${N} 回ずつ）`);
  }

  // ---------------------------------------------------------------- 脇道
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, 3, "forest");
    reset(S);
    G.startEvent("w8f_rootcave");
    const last = G.eventChoices().find(({ c }) => !c.stat && !c.ok.w8enter);
    G.act("ev:" + last.i);
    if (!acts(G).some((a) => a.id === "w8side:w8s_rootcave")) F("見つけた脇道が選択肢に出ない");
    const town = Object.keys(D.LOCS.forest.links).find((x) => D.LOCS[x].type === "town") || Object.keys(D.LOCS.forest.links)[0];
    G.arrive(town);
    if (acts(G).some((a) => a.id === "w8side:w8s_rootcave")) F("よその場所に脇道が出る");
    G.arrive("forest");
    if (!acts(G).some((a) => a.id === "w8side:w8s_rootcave")) F("よそへ行って戻ると、脇道が消えている");
    delete S.w8.recent;
    G.act("w8side:w8s_rootcave");
    if (!G.w8.st(S).run) F("脇道に入れない");
    if (acts(G).some((a) => a.id === "explore" || a.id.startsWith("travel:"))) F("脇道の中で、外の探索や旅ができる");
    let guard = 0, cleared = false;
    while (guard++ < 60 && !S.over) {
      reset(S);
      S.hp = S.maxHp = 9999;
      if (G.w8.st(S).cleared["forest:w8s_rootcave"]) { cleared = true; break; }
      if (!G.w8.st(S).run) { F("脇道の途中で外に出された"); break; }
      G.act("w8go");
      let g2 = 0;
      while (S.mode !== "explore" && g2++ < 80) {
        if (S.mode === "event") { const ch = G.eventChoices(); G.act("ev:" + ch[ch.length - 1].i); }
        else if (S.mode === "combat") { S.combat.foes.forEach((f) => { f.hp = Math.min(f.hp, 1); }); const a = acts(G).find((x) => /^cb:attack/.test(x.id)) || acts(G).find((x) => x.id.startsWith("cb:")); G.act(a.id); }
        else break;
      }
    }
    if (!cleared) F("脇道の主を倒しても、片付いたことにならない");
    else {
      if (G.w8.st(S).run) F("主を倒したあとも脇道の中にいる");
      const rest = acts(G).find((a) => a.id === "w8rest:w8s_rootcave");
      if (!rest || rest.disabled) F("片付けた脇道で休めない");
      else {
        S.hp = 1; S.maxHp = 100;
        const day = S.day;
        G.act("w8rest:w8s_rootcave");
        if (S.hp <= 1 || S.day === day || S.mode === "combat") F("脇道で休んでも回復しないか、襲われる");
      }
    }
    // 迷宮の隠し部屋は、見つけた階でだけ出る
    const S2 = start(G, 5, "ruins");
    reset(S2); S2.depth = 2;
    G.startEvent("w8f_hold");
    G.act("ev:" + G.eventChoices().find(({ c }) => !c.stat).i);
    if (!acts(G).some((a) => a.id === "w8side:w8s_hold")) F("迷宮の隠し部屋が、見つけた階で出ない");
    S2.depth = 1;
    if (acts(G).some((a) => a.id === "w8side:w8s_hold")) F("迷宮の隠し部屋が、別の階でも出る");
    ok("W8 脇道：見つかって残り、部屋を進んで主を倒すと休める");
  }

  // ---------------------------------------------------------------- 強敵
  {
    const G = loadEngine();
    const D = G.data;
    const W8 = G.w8;
    for (const [foe, f] of Object.entries(D.W8_FOES)) {
      const loc = as(f.loc)[0];
      const S = start(G, 11, loc);
      reset(S);
      const meet = D.EVENTS.find((e) => e.id === "w8_meet_" + foe);
      const omen = D.EVENTS.find((e) => e.id === "w8_omen_" + foe);
      const c = W8.ctx(S);
      S.w8 = null; W8.st(S);
      if (W8.fits(meet, S, c)) F(`${foe}: 前触れなしに出会いが起きうる`);
      if (!W8.fits(omen, S, c)) F(`${foe}: ${loc} で前触れが起きない`);
      W8.start(omen);
      if (!W8.fits(meet, S, W8.ctx(S)) && !W8.st(S).recent.includes(meet.id)) F(`${foe}: 前触れのあとも出会いが起きない`);
      // やり過ごす：戦わず、前触れが消える
      reset(S);
      G.startEvent(meet);
      const hp = S.hp;
      const avoid = G.eventChoices().find(({ c: x }) => x.ok && x.ok.w8calm && !x.stat && !x.fight);
      if (!avoid) { F(`${foe}: やり過ごす選択肢が無い`); continue; }
      G.act("ev:" + avoid.i);
      if (S.mode === "combat" || S.hp < hp) F(`${foe}: やり過ごしても戦いか傷になる`);
      if (W8.st(S).omen[loc]) F(`${foe}: やり過ごしても前触れが残る`);
    }
    // 倒すと印と名声、前触れが消える
    const [foe, f] = Object.entries(D.W8_FOES)[0];
    const S = start(G, 13, as(f.loc)[0]);
    reset(S);
    W8.start(D.EVENTS.find((e) => e.id === "w8_omen_" + foe));
    G.startEvent("w8_meet_" + foe);
    const fame = S.fame;
    G.act("ev:" + G.eventChoices().find(({ c }) => c.fight && !c.stat).i);
    let g = 0;
    while (S.mode === "combat" && g++ < 80) { S.hp = 9999; S.combat.foes.forEach((x) => { x.hp = Math.min(x.hp, 1); }); G.act(acts(G).find((x) => x.id.startsWith("cb:attack") || x.id.startsWith("cb:")).id); }
    if (!S.flags["w8foe:" + foe]) F("強敵を倒しても印が付かない");
    if (!(S.fame > fame)) F("強敵を倒しても名声が上がらない");
    if (W8.st(S).omen[S.loc]) F("強敵を倒しても前触れが残る");
    if (W8.foeHere(S, foe)) F("倒した強敵がまた出る");
    ok("W8 強敵：前触れのあとだけ出る・やり過ごせる・倒すと印と名声");
  }

  // ---------------------------------------------------------------- 野営の夜・古いセーブ
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, 17, "plains");
    let night = 0;
    for (let i = 0; i < 80; i++) {
      reset(S);
      G.act("camp");
      const e = S.mode === "event" && D.EVENTS.find((x) => x.id === S.event);
      if (e && e.w8 && e.w8.kind === "night") night++;
    }
    if (night < 5) F(`野営の夜の出来事が少ない（80 回で ${night}）`);
    const S2 = start(G, 19, "swamp");
    delete S2.w8;
    let threw = null;
    try { for (let i = 0; i < 30; i++) { reset(S2); G.act("explore"); G.actions(); } } catch (e) { threw = e; }
    if (threw) F(`古いセーブ（S.w8 なし）で例外：${threw.message}`);
    ok(`W8 野営の夜 ${night} 回／80・古いセーブで動く`);
  }
};
