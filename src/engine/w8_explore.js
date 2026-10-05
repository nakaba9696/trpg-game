// W8：荒野と迷宮を進むときの出来事。持ち主の声「探索パート、今ひたすら進んで野営するか敵を倒すしかない。何かしらのイベントは欲しい。人と出会う、脇道にダンジョンを見つける、強敵と出会う等」
// explore.js は書き換えず、G.exploreAct・G.exploreActions・G.apply・G.randomEvent を包む。
//   1. 荒野で「あたりを探索する」、迷宮で「奥へ進む」（主や中ボスのいない階）を押すと、W8.CHANCE の割合で W8 の出来事が起きる
//      （人と出会う・地形の難所・天候の急変・宝の痕跡・古戦場・脇道を見つける・強敵の前触れ）。起きなければ今までどおり
//   2. 出来事は D.EVENTS に where: ["w8"]・w: 0（ふつうの抽選に出さない）と、条件 w8 を付けて置く（src/data/events_w8_*.js）
//      w8: { w 重み, land [土地]（"wild" はどの荒野でも、"dungeon" はどの迷宮でも）, loc [場所], kind 種類, dmin / dmax 危険度,
//            deep true 迷宮の深いほう（半分より下）/ false 浅いほう, weather [天候], comp 仲間がいるとき, flag / noflag 印,
//            needSide true その土地でまだ見つけていない脇道があるときだけ（w8side "@land" を使う出来事） }
//      土地：forest 森・plain 丘と野・snow 雪原・swamp 沼・mount 山・ruin 廃墟の谷・isle 島と海辺・realm 使徒領・dungeon 迷宮
//      種類：people 人・terrain 難所・weather 天候・trace 痕跡・side 脇道・omen 強敵の前触れ・meet 強敵（前触れのあとだけ）・night 野営の夜・room 脇道の部屋
//   3. 脇道（D.W8_SIDES）：出来事の結果 w8side で見つかり、その場所の選択肢に残る。入ると数部屋の短い探索（部屋の出来事か戦い）、最後の部屋に小さな主。
//      主を倒すと、そこは安全に休める場所として残る
//   4. 強敵（D.W8_FOES）：その土地の名のある強敵（E4 の強い個体）。前触れの出来事（w8_omen_*）が先に起き、S.w8.omen[場所] が付いてから
//      でないと出会い（w8_meet_*）は起きない。避けても損しすぎない。倒すと良い物・名声・図鑑
//   5. 野営すると、襲われなかった夜に W8.NIGHT の割合で野営の夜の出来事（kind night）
//   6. 同じ出来事が続かないように、最近の出来事（W8 とふつうの出来事）を S.w8.recent に覚えて外す
// 結果（G.apply）に足せるもの：w8side "脇道の id" か "@land"（見つける。"@land" はその土地でまだ見つけていない脇道）・w8enter true（そのまま入る）・
//   w8calm true（前触れを消す。強敵は去る）・firstStrike true（fight と一緒に。不意を突いて戦う）
// セーブに足すもの：S.w8 = { side: {場所: [{ id, depth }]}, cleared: {"場所:脇道": 日}, run: { id, loc, room, seen }, omen: {場所: 敵}, recent: [], rest: {"場所:脇道": 日}, n: 回数 }
//   古いセーブに無くても動く（W8.st が作る）
// 乱数は G.rand / G.pick だけ。レーン W＋V（W8）
(function (G) {
  const D = G.data;
  const W8 = (G.w8 = G.w8 || {});
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  W8.CHANCE = { wild: 0.3, dungeon: 0.25 };  // 進むたびに W8 の出来事が起きる割合
  W8.NIGHT = 0.3;                            // 襲われなかった野営の夜に、夜の出来事が起きる割合
  W8.RECENT = 8;                             // 同じ出来事を外す数
  W8.ROOM_FIGHT = 0.4;                       // 脇道の部屋が戦いになる割合

  // 場所の土地。無い場所（あとで足された荒野）は、L.w8land か地方から決める
  W8.LAND = {
    forest: "forest", w4_silent: "forest", plains: "plain", w3_bells: "plain", frost: "snow", swamp: "swamp",
    mountains: "mount", w4_watch: "mount", w2_echo: "ruin", w2_shadow: "ruin", w3_abbey: "ruin", w3_driftisle: "isle",
    wasteland: "realm", w4_canopy: "realm",
  };
  const BY_REGION = { シェルアーク: "isle", ノルディア帝国: "snow", 使徒領: "realm", 人と魔の境: "mount", 人類の最前線: "mount", エルメシア共和国: "swamp", 光天教会領: "ruin" };
  W8.landOf = (id) => {
    const L = D.LOCS[id];
    if (!L) return "plain";
    if (L.type === "dungeon") return "dungeon";
    return L.w8land || W8.LAND[id] || BY_REGION[L.region] || "plain";
  };

  W8.st = (S) => {
    S = S || G.S;
    const w = (S.w8 = S.w8 || {});
    w.side = w.side || {};
    w.cleared = w.cleared || {};
    w.omen = w.omen || {};
    w.recent = w.recent || [];
    w.rest = w.rest || {};
    w.n = w.n || 0;
    if (w.run === undefined) w.run = null;
    return w;
  };
  const remember = (S, id) => {
    const w = W8.st(S);
    w.recent = w.recent.filter((x) => x !== id);
    w.recent.push(id);
    if (w.recent.length > W8.RECENT) w.recent.shift();
  };

  // ---------------------------------------------------------------- 出来事を選ぶ
  W8.ctx = (S, extra) => {
    const L = D.LOCS[S.loc] || {};
    const sky = (G.skyAt && G.skyAt(S.loc)) || {};
    return Object.assign({ loc: S.loc, land: W8.landOf(S.loc), type: L.type, danger: L.danger || 0,
      deep: L.type === "dungeon" && (S.depth || 0) > (L.floors || 1) / 2, weather: sky.weather || "" }, extra || {});
  };
  W8.fits = (e, S, c) => {
    const r = e.w8;
    if (!r || !(r.w > 0)) return false;
    if ((r.kind === "night") !== (c.kind === "night")) return false;
    if ((r.kind === "room") !== (c.kind === "room")) return false;
    if (c.kind && r.kind !== c.kind) return false;
    if (r.land) {
      const lands = as(r.land);
      const hit = lands.includes(c.land) || (lands.includes("wild") && c.type === "wild") || (lands.includes("dungeon") && c.type === "dungeon");
      if (!hit && !(r.loc && as(r.loc).includes(c.loc))) return false;
    } else if (r.loc && !as(r.loc).includes(c.loc)) return false;
    if (r.kind === "room" && r.side && !as(r.side).includes(c.sideKind)) return false;
    if (r.dmin != null && c.danger < r.dmin) return false;
    if (r.dmax != null && c.danger > r.dmax) return false;
    if (r.deep != null && c.type === "dungeon" && !!r.deep !== c.deep) return false;
    if (r.weather && !as(r.weather).includes(c.weather)) return false;
    if (r.comp && !(S.companions || []).length) return false;
    if (r.flag && !as(r.flag).every((f) => S.flags[f])) return false;
    if (r.noflag && as(r.noflag).some((f) => S.flags[f])) return false;
    // 脇道を見つける出来事は、まだ見つけていない脇道のときだけ
    if (r.kind === "side" && r.find && W8.known(S, r.find)) return false;
    if (r.needSide && !W8.sideFor(S)) return false;
    // 強敵：前触れはまだ倒していない土地の強敵、出会いは前触れのあとだけ
    if (r.kind === "omen" && (!W8.foeHere(S, r.foe) || W8.st(S).omen[S.loc])) return false;
    if (r.kind === "meet" && (W8.st(S).omen[S.loc] !== r.foe || S.flags["w8foe:" + r.foe])) return false;
    if (e.once && S.flags["ev:" + e.id]) return false;
    if (e.cond && !e.cond(S)) return false;
    if (c.seen && c.seen.includes(e.id)) return false;
    if (W8.st(S).recent.includes(e.id)) return false;
    return true;
  };
  // 最近の出来事で選べるものが尽きたら、すぐ前の二つだけを外す（夜の出来事のように数の少ない種類のため）
  W8.pool = (S, extra) => {
    const c = W8.ctx(S, extra);
    const pool = D.EVENTS.filter((e) => e.w8 && W8.fits(e, S, c));
    if (pool.length) return pool;
    const st = W8.st(S), recent = st.recent;
    st.recent = recent.slice(-2);
    try { return D.EVENTS.filter((e) => e.w8 && W8.fits(e, S, c)); } finally { st.recent = recent; }
  };
  W8.pick = (S, extra) => {
    const pool = W8.pool(S, extra);
    if (!pool.length) return null;
    // 前触れのある強敵は、出会いを起こしやすく（前触れから間を空けすぎない）
    const weight = (e) => e.w8.w * (e.w8.kind === "meet" ? 3 : 1);
    let r = G.rand() * pool.reduce((a, e) => a + weight(e), 0);
    for (const e of pool) { r -= weight(e); if (r <= 0) return e; }
    return pool[pool.length - 1];
  };
  W8.start = (e) => {
    const S = G.S;
    remember(S, e.id);
    const st = W8.st(S);
    st.n++;
    if (e.w8.kind === "omen") st.omen[S.loc] = e.w8.foe;   // 前触れを見たら、この場所でその強敵に出会えるようになる
    return G.startEvent(e);
  };

  // ---------------------------------------------------------------- 強敵
  // D.W8_FOES[敵] = { loc: [場所] ... }。その場所にいて、まだ倒していない強敵
  W8.foeHere = (S, foe) => {
    const f = (D.W8_FOES || {})[foe];
    return !!f && as(f.loc).includes(S.loc) && !S.flags["w8foe:" + foe] && !!D.ENEMIES[foe];
  };

  // ---------------------------------------------------------------- 脇道
  // 脇道は場所ごと（同じ形の脇道が、別の場所にもある）。片付けた・休んだは「場所:脇道」で覚える
  W8.known = (S, id) => (W8.st(S).side[S.loc] || []).some((x) => x.id === id);
  const key = (S, id) => S.loc + ":" + id;
  // この土地で、まだ見つけていない脇道（見つける出来事の land から）。w8side "@land" はこれになる
  W8.sideFor = (S) => {
    const land = W8.landOf(S.loc), type = (D.LOCS[S.loc] || {}).type;
    const e = D.EVENTS.find((x) => x.w8 && x.w8.kind === "side" && x.w8.find && D.W8_SIDES[x.w8.find] && !W8.known(S, x.w8.find)
      && (as(x.w8.land).includes(land) || (as(x.w8.land).includes("dungeon") && type === "dungeon")));
    return e ? e.w8.find : null;
  };
  W8.sidesHere = (S) => (W8.st(S).side[S.loc] || []).filter((x) => D.W8_SIDES[x.id] && (D.LOCS[S.loc].type !== "dungeon" || (x.depth || 0) === (S.depth || 0)));
  W8.discover = (S, id) => {
    const sd = D.W8_SIDES[id];
    if (!sd || W8.known(S, id)) return false;
    const w = W8.st(S);
    (w.side[S.loc] = w.side[S.loc] || []).push({ id, depth: D.LOCS[S.loc].type === "dungeon" ? S.depth || 0 : 0 });
    G.note(`脇道を見つけた：${sd.name}（この場所からいつでも入れる）`);
    return true;
  };
  W8.enter = (S, id) => {
    const sd = D.W8_SIDES[id];
    if (!sd) return;
    W8.st(S).run = { id, loc: S.loc, room: 0, seen: [] };
    G.log("title", sd.name);
    G.say(sd.enter);
  };
  const runOf = (S) => {
    const w = W8.st(S);
    if (w.run && (w.run.loc !== S.loc || !D.W8_SIDES[w.run.id])) w.run = null;
    return w.run;
  };
  // 脇道の主：決めてあればそれ、無ければその場所の出現表でいちばん強いもの（主は除く）
  W8.sideBoss = (S, sd) => {
    const L = D.LOCS[S.loc];
    if (sd.boss && D.ENEMIES[sd.boss]) return sd.boss;
    const pool = (L.pool || ["goblin"]).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss);
    return pool.slice().sort((a, b) => D.ENEMIES[b].hp - D.ENEMIES[a].hp)[0] || "goblin";
  };
  const roomFoe = (L) => {
    const pool = (L.pool || ["goblin"]).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss);
    return [G.pick(pool)];
  };
  function sideStep() {
    const S = G.S;
    const run = runOf(S);
    if (!run) return;
    const sd = D.W8_SIDES[run.id];
    const L = G.loc();
    G.log("you", run.room ? "奥へ進む" : "中へ入る");
    G.pass(1);
    run.room++;
    if (run.room >= sd.rooms) {
      const boss = W8.sideBoss(S, sd);
      G.say(sd.last || `いちばん奥に、${D.ENEMIES[boss].name}がいた。`);
      const rw = sd.reward || {};
      G.startCombat([boss], { win: { text: sd.clear, item: rw.item, gold: rw.gold, fame: rw.fame, chron: `${L.name}の脇道「${sd.name}」の奥で${D.ENEMIES[boss].name}を倒す`, w8clear: run.id } });
      return;
    }
    const e = G.rand() < W8.ROOM_FIGHT ? null : W8.pick(S, { kind: "room", sideKind: sd.kind, seen: run.seen });
    if (e) { run.seen.push(e.id); W8.start(e); return; }
    G.say(G.pick(sd.rooms_text || ["暗がりで、何かが身を起こした。"]));
    G.startCombat(roomFoe(L), {});
  }
  function sideLeave() {
    const S = G.S;
    const run = runOf(S);
    if (!run) return;
    const sd = D.W8_SIDES[run.id];
    G.log("you", "脇道を出る");
    G.pass(1);
    W8.st(S).run = null;
    G.say(sd.out || "来た道を引き返し、外の明るさの中に出た。");
  }
  function sideRest(id) {
    const S = G.S;
    const sd = D.W8_SIDES[id];
    G.log("you", `${sd.name}で休む`);
    W8.st(S).rest[key(S, id)] = S.day;
    G.sleep();
    S.clungUsed = false;
    G.heal(Math.ceil(S.maxHp * 0.6));
    S.mp = S.maxMp;
    G.say(sd.rest || "主のいなくなった奥で、火を焚いて眠った。入口のほうから、風の音だけが聞こえていた。");
    G.note("HP が回復し、MP が全快した。");
  }

  // ---------------------------------------------------------------- 選択肢
  const actions0 = G.exploreActions;
  G.exploreActions = () => {
    const S = G.S;
    const run = S && runOf(S);
    if (run) {
      const sd = D.W8_SIDES[run.id];
      const last = run.room + 1 >= sd.rooms;
      return [{ title: `${sd.name}${run.room ? `（${run.room}部屋目）` : ""}`, list: [
        { id: "w8go", label: run.room ? (last ? "いちばん奥へ" : "奥へ進む") : "中へ入る", sub: last ? "奥に何かがいる" : "", kw: ["奥", "進", "入"] },
        { id: "w8out", label: "脇道を出る", sub: "", kw: ["出る", "戻", "引き返"] },
      ] }];
    }
    const groups = actions0();
    if (!S) return groups;
    const L = G.loc();
    if (L.type === "town") return groups;
    const here = W8.sidesHere(S);
    if (here.length) {
      const st = W8.st(S);
      const list = [];
      here.forEach(({ id }) => {
        const sd = D.W8_SIDES[id];
        if (st.cleared[key(S, id)]) list.push({ id: "w8rest:" + id, label: `${sd.name}で休む`, sub: "主はもういない・襲われない", disabled: st.rest[key(S, id)] === S.day, kw: ["休", "寝", sd.name] });
        else list.push({ id: "w8side:" + id, label: `${sd.name}に入る`, sub: `脇道・${sd.rooms}部屋ほど`, kw: ["脇道", "入", sd.name] });
      });
      groups.splice(1, 0, { title: "脇道", list });
    }
    return groups;
  };

  // ---------------------------------------------------------------- 手番
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "w8go") return sideStep();
    if (head === "w8out") return sideLeave();
    if (head === "w8side") { G.log("you", `${(D.W8_SIDES[arg] || {}).name}に入る`); G.pass(1); W8.enter(S, arg); return; }
    if (head === "w8rest") return sideRest(arg);
    const L = G.loc();
    if (head === "explore" && L.type === "wild" && G.rand() < W8.CHANCE.wild) {
      const e = W8.pick(S);
      if (e) { G.log("you", "あたりを探索する"); G.pass(1); W8.start(e); return; }
    }
    if (head === "deeper" && L.type === "dungeon" && S.depth > 0 && canStep(S, L) && G.rand() < W8.CHANCE.dungeon) {
      const e = W8.pick(S, { deep: S.depth + 1 > (L.floors || 1) / 2 });
      if (e) { stepDown(S, L); W8.start(e); return; }
    }
    const r = act0(head, arg, a);
    if (head === "camp" && !S.over && S.mode === "explore" && !S.combat && G.rand() < W8.NIGHT) {
      const e = W8.pick(S, { kind: "night" });
      if (e) W8.start(e);
    }
    return r;
  };
  // 主・中ボス・主の巣（E2）のある階には W8 の出来事を置かない
  function canStep(S, L) {
    const next = S.depth + 1;
    if (next >= L.floors) return false;
    if (L.midboss && L.midboss[next] && !S.flags[`mid:${S.loc}:${next}`]) return false;
    return true;
  }
  // explore.js の deeper() の頭と同じこと（階を下りる・潜る依頼・見出し・語り・正気）
  function stepDown(S, L) {
    G.log("you", "奥へ進む");
    G.pass(1);
    S.depth++;
    S.quests.forEach((q) => { if (q.type === "delve" && !q.done && q.loc === S.loc && S.depth >= q.need) { q.done = true; G.note(`依頼「${q.title}」を達成した。ギルドに報告しよう。`); } });
    G.log("title", `${L.name} 地下${S.depth}階`);
    if (G.voiceLine) { const t = G.voiceLine("descend", null, ""); if (t) G.say(t); }
    if (G.addSanity && D.M5 && D.M5.TOLL) G.addSanity(D.M5.TOLL.deeper, true);
  }

  // 着いたら脇道の中にはいない
  const arrive0 = G.arrive;
  G.arrive = (dest) => {
    if (G.S && G.S.w8) G.S.w8.run = null;
    return arrive0(dest);
  };

  // ---------------------------------------------------------------- 結果
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (!o || !S || S.over) return apply0(o);
    const w8 = o.w8side || o.w8enter || o.w8calm || o.w8clear || (o.fight && o.firstStrike);
    if (!w8) return apply0(o);
    const rest = Object.assign({}, o);
    const strike = o.fight && o.firstStrike;
    if (strike) delete rest.fight;
    apply0(rest);
    if (S.over) return;
    const st = W8.st(S);
    const sid = o.w8side === "@land" ? W8.sideFor(S) : o.w8side;
    if (sid) W8.discover(S, sid);
    if (o.w8calm) delete st.omen[S.loc];
    if (o.w8clear) { st.cleared[key(S, o.w8clear)] = S.day; st.run = null; G.note("脇道の奥は静かになった。ここでなら、安心して休める。"); }
    if (o.w8enter && sid && S.mode === "explore") W8.enter(S, sid);
    if (strike && S.mode !== "combat") G.startCombat(G.resolveFoes(o.fight), { win: o.win, firstStrike: true });
  };
  // ---------------------------------------------------------------- 同じ出来事が続かない（荒野・迷宮のふつうの出来事も）
  const random0 = G.randomEvent;
  G.randomEvent = () => {
    const S = G.S;
    const L = S && G.loc();
    if (!S || !L || L.type === "town") return random0();
    const st = W8.st(S);
    // 最近の出来事を外した表で引く（zz_f4_roster.js と同じく、引くあいだだけ D.EVENTS を差し替える）。何も無ければ元の表で
    const all = D.EVENTS;
    let e = null;
    D.EVENTS = all.filter((x) => !st.recent.includes(x.id));
    try { e = random0(); } finally { D.EVENTS = all; }
    if (!e) e = random0();
    if (e) remember(S, e.id);
    return e;
  };
})(globalThis.G = globalThis.G || {});
