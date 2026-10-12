// W9：野の稼ぎと危うさ・ギルドのいつもの仕事・格の外れたものの通過・冒険者の書き込み帳。
// explore.js・w8_explore.js は書き換えず、G.exploreAct・G.facActions・G.facAct・G.apply・G.combatAct・G.sleep・G.arrive・G.learn を包む。
// 名前の z の数（17）で、W8・R6（野の行動の印）より外、C16（野の行動は一日）より内に入る（C16 が日数を合わせてくれる）。
//   1. 浅い所は荒らされている（能動的）：野と迷宮を段に分ける（W9F.tier）。shallow 町に近い野（危険度 D.W9F.SHALLOW_DMAX まで・町へ道がある）と
//      町に近い迷宮の地下 1 階／deep 危険度 DEEP_DMIN 以上・使徒領・迷宮の半分より下／mid それ以外。
//      探索で拾う金・出会った魔物の落とす金に D.W9F.YIELD の倍率をかける（夜はさらに NIGHT_YIELD）。浅い所では、ときどきほかの冒険者と鉢合わせる（kind rival）。
//      野で寝ずに歩き回ると（着いた日の夕と、起きてから DUSK_DAYS 日目）日が傾き、「引き返す・野営する・夜も歩き続ける」を選ぶ（kind dusk）。
//      夜（時間帯 夜）に野を歩き回ると、夜の出来事（kind night）と闇からの襲撃が足される。夜は寝る（野営・宿・朝まで待つ）まで続く。
//   2. ギルドのいつもの仕事（能動的）：ギルドの中に、いつでも何度でも受けられる安い仕事（D.W9F_JOBS）。易しい判定を一回（成長は判定の決まりのまま）、
//      手間賃は安く、しくじっても半分は出る。傷つくことはない。まれに小さな出来事。
//   3. 格の外れたものが通る（受動的）：D.W9F_PASS の場所の野でだけ、まれに（PASS.CHANCE、同じ場所では PASS.GAP 日あける）通過の出来事（kind pass）。
//      前触れの文のあとに「避ける・隠れる・様子を見る・挑む」。無関心な使徒には挑む代わりに近づく（戦う選択肢は出さない）。
//   4. 冒険者の書き込み帳（能動的）：ギルドの帳面・酒場の落書き。町ごと施設ごとに一日一つ新しい書き込みを読める。
//      本当の書きつけ（覚え書き D.KNOW の文。近くの魔物・罠から）を読むと覚え書きが開く（how "note"）。嘘は、データの弱点と食い違うものだけを作り、
//      G.P.w9f.lies に覚える。その魔物の覚え書きが開くか倒すと、嘘だったと分かる（覚えたときと、次に帳面を読んだとき）。自慢話は何も開かない。
// 出来事は src/data/w9_field_events.js、数と文は src/data/w9_field.js（D.W9F。数はすべて仮）。
// 結果（G.apply）に足せるもの：w9fBack・w9fCamp・w9fNight・w9fWait・w9fLeave（遠回り。半日かかる）・w9fPeek（敵の id。図鑑に載せ、覚え書きを一つ）
// セーブに足すもの：S.w9f = { dusk "場所:日", woke 起きた日, fall 手番の終わりに夕にする, pass { 場所: 日 }, read { "町:施設": 日 }, jobs 回数, recent [] }。古いセーブに無くても動く（W9F.st が作る）
// profile に足すもの：G.P.w9f = { lies: { "敵:弱点": { foe, aim, text, found } } }（無くても動く）。乱数は G.rand / G.d / G.pick だけ。DOM なし。レーン W＋V＋F（W9）
(function (G) {
  const D = G.data;
  const T = D.W9F;
  if (!T) return;
  const W = (G.w9f = G.w9f || {});
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const LOCS = () => D.LOCS;

  W.st = (S) => {
    S = S || G.S;
    const w = (S.w9f = S.w9f || {});
    w.pass = w.pass || {};
    w.read = w.read || {};
    w.recent = w.recent || [];
    if (w.woke == null) w.woke = S.day;
    return w;
  };

  // ---------------------------------------------------------------- 段（浅い・中ほど・奥）
  W.townLinks = (id) => Object.entries((LOCS()[id] || {}).links || {}).filter(([k]) => (LOCS()[k] || {}).type === "town");
  W.tierOf = (id, depth) => {
    const L = LOCS()[id] || {};
    if (L.type === "dungeon") {
      const d = depth || 0;
      if (d > (L.floors || 1) / 2) return "deep";
      return d <= 1 && W.townLinks(id).length ? "shallow" : "mid";
    }
    if (L.type !== "wild") return "mid";
    if ((L.danger || 0) >= T.DEEP_DMIN || L.region === "使徒領") return "deep";
    return (L.danger || 0) <= T.SHALLOW_DMAX && W.townLinks(id).length ? "shallow" : "mid";
  };
  W.tier = (S) => { S = S || G.S; return W.tierOf(S.loc, S.depth); };
  W.night = (S) => { S = S || G.S; return (LOCS()[S.loc] || {}).type === "wild" && S.phase === 3; };
  W.mul = (S) => { S = S || G.S; return (T.YIELD[W.tier(S)] || 1) * (W.night(S) ? T.NIGHT_YIELD : 1); };
  // 野からいちばん近い町（引き返す先）
  W.nearTown = (S) => {
    S = S || G.S;
    if ((LOCS()[S.loc] || {}).type !== "wild") return null;
    const t = W.townLinks(S.loc).sort((a, b) => a[1] - b[1])[0];
    return t ? t[0] : null;
  };

  // ---------------------------------------------------------------- 出来事を選ぶ
  const landOf = (id) => (G.w8 && G.w8.landOf ? G.w8.landOf(id) : "plain");
  W.fits = (e, S, kind) => {
    const r = e.w9f;
    if (!r || r.kind !== kind || !(r.w > 0)) return false;
    const L = LOCS()[S.loc] || {};
    const land = landOf(S.loc);
    const lands = as(r.land);
    const byLand = lands.includes(land) || (lands.includes("wild") && L.type === "wild") || (lands.includes("dungeon") && L.type === "dungeon");
    const byLoc = as(r.loc).includes(S.loc);
    if (!byLand && !byLoc) return false;
    if (e.once && S.flags["ev:" + e.id]) return false;
    if (e.cond && !e.cond(S)) return false;
    return true;
  };
  W.pool = (S, kind) => {
    const all = D.EVENTS.filter((e) => e.w9f && W.fits(e, S, kind));
    const fresh = all.filter((e) => !W.st(S).recent.includes(e.id));
    return fresh.length ? fresh : all;
  };
  W.pick = (S, kind) => {
    const pool = W.pool(S, kind);
    if (!pool.length) return null;
    let r = G.rand() * pool.reduce((a, e) => a + e.w9f.w, 0);
    for (const e of pool) { r -= e.w9f.w; if (r <= 0) return e; }
    return pool[pool.length - 1];
  };
  W.start = (e) => {
    const st = W.st(G.S);
    st.recent = st.recent.filter((x) => x !== e.id);
    st.recent.push(e.id);
    if (st.recent.length > 4) st.recent.shift();
    return G.startEvent(e);
  };
  // 野・迷宮の行動の頭（C16 が残りの時間を足して一日にする）
  const begin = (label) => { G.log("you", label); G.pass(1); };

  // ---------------------------------------------------------------- 夕暮れ
  W.duskDue = (S) => {
    if ((LOCS()[S.loc] || {}).type !== "wild" || S.phase === 3) return false;
    const st = W.st(S);
    if (st.dusk === S.loc + ":" + S.day) return false;
    return S.phase === 2 || S.day - st.woke >= T.DUSK_DAYS;
  };
  W.dusk = (S) => {
    const e = W.pick(S, "dusk");
    if (!e) return false;
    const st = W.st(S);
    st.dusk = S.loc + ":" + S.day;
    // 寝ずに歩き回って日が傾いた：時間帯を夕にするのは手番の終わり（C16 が野の行動の時間を合わせ終えてから。ここで変えると一日進んだと見なされる）
    if (S.phase !== 2) { st.fall = true; G.say(G.pick(D.W9F_TEXT.fall)); }
    return W.start(e);
  };
  const endTurn0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && S.w9f && S.w9f.fall) {
      S.w9f.fall = false;
      const e = S.mode === "event" && D.EVENTS.find((x) => x.id === S.event);
      if (e && e.w9f && e.w9f.kind === "dusk") S.phase = 2;
    }
    return endTurn0();
  };

  // ---------------------------------------------------------------- 格の外れたものが通る
  W.passHere = (S) => {
    const st = W.st(S);
    const last = st.pass[S.loc];
    if (last != null && S.day - last < T.PASS.GAP) return [];
    return Object.entries(D.W9F_PASS || {}).filter(([id, p]) => as(p.loc).includes(S.loc)
      && (p.kind !== "beast" || (D.ENEMIES[p.foe] && !S.flags["w8foe:" + p.foe]))
      && D.EVENTS.some((e) => e.id === id)).map(([id]) => id);
  };

  // ---------------------------------------------------------------- 夜の闇からの襲撃（その土地の出現表から。R6 の駆け出しの守りは野の行動と同じに効く）
  W.ambush = (S) => {
    const L = LOCS()[S.loc] || {};
    const pool = (L.pool || ["wolf"]).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss);
    const ids = [G.pick(pool)];
    if (G.rand() < 0.5) ids.push(G.pick(pool));
    G.say(G.pick(D.W9F_TEXT.ambush));
    const go = () => G.startCombat(ids, {});
    G.r6 && G.r6.wild ? G.r6.wild(go) : go();
    if (S.mode === "combat" && S.combat) S.combat.w9fMul = W.mul(S);
  };

  // ---------------------------------------------------------------- 実入りの倍率
  // 「〇G を手に入れた。」の行を書き直して、金も合わせる（行が見つからなければ、何もしない）
  const scaleGain = (S, g0, mul) => {
    const got = S.gold - g0;
    if (!(got > 0) || mul === 1) return 0;
    const want = Math.max(1, Math.round(got * mul));
    if (want === got) return 0;
    for (let i = S.log.length - 1; i >= 0 && i >= S.log.length - 12; i--) {
      const x = S.log[i];
      if (x.k === "sys" && x.text === `${got}G を手に入れた。`) {
        x.text = `${want}G を手に入れた。`;
        S.gold = g0 + want;
        return want - got;
      }
    }
    return 0;
  };
  W.thin = (S, g0) => {
    if (!S || S.over || G.S !== S) return;
    const mul = W.mul(S);
    if (mul === 1) return;
    if (S.mode === "combat" && S.combat && !S.combat.win) { S.combat.w9fMul = mul; return; }
    if (S.mode === "explore" && scaleGain(S, g0, mul) < 0 && W.tier(S) === "shallow") G.say(G.pick(D.W9F_TEXT.thin));
  };
  const cact0 = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const mul = S && S.combat && S.combat.w9fMul;
    const g0 = S ? S.gold : 0;
    const r = cact0(arg);
    if (mul && G.S === S && !S.combat && !S.over) scaleGain(S, g0, mul);
    return r;
  };

  // ---------------------------------------------------------------- 野・迷宮の行動
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (!S || S.over || S.mode !== "explore") return act0(head, arg, a);
    const L = G.loc();
    const st = W.st(S);
    if (head === "explore" && L.type === "wild") {
      if (W.duskDue(S) && W.dusk(S)) return;
      const pass = W.passHere(S);
      if (pass.length && G.rand() < T.PASS.CHANCE) {
        begin("あたりを探索する");
        st.pass[S.loc] = S.day;
        const id = G.pick(pass);
        return W.start(D.EVENTS.find((e) => e.id === id));
      }
      if (S.phase === 3) {
        const r = G.rand();
        if (r < T.NIGHT.EVENT) { const e = W.pick(S, "night"); if (e) { begin("夜の野を歩き回る"); return W.start(e); } }
        else if (r < T.NIGHT.EVENT + T.NIGHT.AMBUSH) { begin("夜の野を歩き回る"); return W.ambush(S); }
      } else if (W.tier(S) === "shallow" && G.rand() < T.RIVAL.wild) {
        const e = W.pick(S, "rival");
        if (e) { begin("あたりを探索する"); return W.start(e); }
      }
    }
    if (head === "deeper" && L.type === "dungeon" && S.depth === 1 && W.tier(S) === "shallow" && G.rand() < T.RIVAL.dungeon) {
      const e = W.pick(S, "rival");
      if (e) { begin("地下1階を歩き回る"); return W.start(e); }
    }
    const g0 = S.gold;
    const r = act0(head, arg, a);
    if ((head === "explore" && L.type === "wild") || (head === "deeper" && L.type === "dungeon")) W.thin(S, g0);
    return r;
  };

  // ---------------------------------------------------------------- 結果
  const KEYS = ["w9fBack", "w9fCamp", "w9fNight", "w9fWait", "w9fLeave", "w9fPeek"];
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (!o || !S || S.over || !KEYS.some((k) => o[k])) return apply0(o);
    const rest = Object.assign({}, o);
    KEYS.forEach((k) => delete rest[k]);
    apply0(rest);
    if (S.over || G.S !== S) return;
    if (S.w9f) S.w9f.fall = false;
    if (o.w9fPeek) W.peek(o.w9fPeek);
    if (o.w9fLeave) G.pass(2);
    if (o.w9fWait) { G.sleep(); G.note("夜が明けた。"); }
    if (o.w9fNight && S.mode === "explore") { S.phase = 3; G.say(G.pick(D.W9F_TEXT.night)); }
    if (o.w9fCamp && S.mode === "explore") G.exploreAct("camp");
    if (o.w9fBack && S.mode === "explore") { const t = W.nearTown(S); if (t) G.exploreAct("travel", t); }
  };
  // 通ったものをよく見た：図鑑に載せ、まだ知らない覚え書きを一つ（データの順）
  W.peek = (foe) => {
    if (G.codexMeet) G.codexMeet(foe);
    if (!G.learn || !G.l1) return;
    const ids = G.l1.ids().filter((id) => D.KNOW[id].foe === foe && (D.KNOW[id].kind === "fact" || D.KNOW[id].kind === "foe"))
      .sort((a, b) => (D.KNOW[a].n || 0) - (D.KNOW[b].n || 0));
    const id = ids.find((x) => !G.knowHas(x));
    if (id) G.learn(id, "seen");
  };

  // ---------------------------------------------------------------- 寝た・着いた（夕暮れの数え始め）
  const sleep0 = G.sleep;
  G.sleep = () => { const r = sleep0(); if (G.S) W.st(G.S).woke = G.S.day; return r; };
  const arrive0 = G.arrive;
  G.arrive = (dest) => { const r = arrive0(dest); if (G.S) W.st(G.S).woke = G.S.day; return r; };

  // ---------------------------------------------------------------- ギルドのいつもの仕事・書き込み帳（施設の中）
  const facActions0 = G.facActions;
  G.facActions = () => {
    const groups = facActions0();
    const S = G.S;
    if (!S || S.mode !== "fac" || !["guild", "tavern"].includes(S.fac)) return groups;
    const st = W.st(S);
    const fresh = st.read[S.loc + ":" + S.fac] !== S.day;
    const note = { id: "w9fnote", label: S.fac === "guild" ? "書き込み帳を読む" : "壁の落書きを読む", sub: fresh ? "冒険者の書き残し・本当とは限らない" : "今日の新しい書き込みは読んだ", kw: ["書き込み", "帳面", "落書き", "読"] };
    const add = [];
    if (S.fac === "guild") {
      const [p0, p1] = T.JOB.PAY;
      add.push({ title: "いつもの仕事（何度でも受けられる・安いが安全）", list: [
        ...D.W9F_JOBS.map((j) => ({ id: "w9fjob:" + j.id, label: j.label, sub: `${j.sub}・${j.stat} ${G.chance(j.stat, T.JOB.DIFF)}%・手間賃 ${p0 + 1}〜${p0 + p1}G・半日`, kw: [j.label, "仕事", "手間賃"] })),
        note,
      ] });
    } else add.push({ title: "壁", list: [note] });
    const back = groups.findIndex((g) => g.list.some((x) => x.id === "back"));
    groups.splice(back < 0 ? groups.length : back, 0, ...add);
    return groups;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head === "w9fjob") return W.job(arg);
    if (head === "w9fnote") return W.read();
    return facAct0(head, arg, a);
  };

  W.job = (id) => {
    const S = G.S;
    const j = D.W9F_JOBS.find((x) => x.id === id);
    if (!j) return;
    G.log("you", `いつもの仕事：${j.label}`);
    G.pass(T.JOB.PHASES);
    G.say(j.text);
    const r = G.check(j.stat, T.JOB.DIFF, j.label);
    let pay = T.JOB.PAY[0] + G.d(T.JOB.PAY[1]);
    if (!r.ok) pay = Math.max(1, Math.floor(pay * T.JOB.FAIL_PAY));
    G.say(G.pick(r.ok ? j.ok : j.ng));
    S.gold += pay;
    G.note(`手間賃 +${pay}G`);
    const st = W.st(S);
    st.jobs = (st.jobs || 0) + 1;
    if (j.mini && j.mini.length && G.rand() < T.JOB.MINI) G.apply(G.pick(j.mini));
  };

  // ---------------------------------------------------------------- 書き込み帳
  const N = () => D.W9F_NOTE;
  const prof = () => { if (!G.P) G.P = { trophies: {}, graves: [] }; return G.P; };
  W.lies = () => { const p = prof(); p.w9f = p.w9f || {}; p.w9f.lies = p.w9f.lies || {}; return p.w9f.lies; };
  const saved = () => { if (G.onProfile) try { G.onProfile(); } catch {} };
  // 書きつけが言う弱点が、敵のデータに合うか（tests/checks/l1_know.mjs と同じ決まり）。嘘はこれに合わないものだけ
  W.TRUE = { magic: (e) => e.mres < e.def || e.mres <= 0, blade: (e) => e.def <= e.mres || e.def <= 5, talk: (e) => e.will < 999 && e.will <= 60, flee: (e) => e.agi <= 35 };
  W.AIMS = ["blade", "magic", "talk", "flee"];
  W.lieAims = (foe) => { const e = D.ENEMIES[foe]; return e ? W.AIMS.filter((a) => typeof e.def === "number" && !W.TRUE[a](e) && (N().lie[a] || []).length) : []; };
  // 近くの野と迷宮（町から道のある所と、その先の一つ）。無ければ同じ地方、それも無ければどこでも
  W.near = (S) => {
    const out = new Set();
    const step = (id) => Object.keys((LOCS()[id] || {}).links || {}).filter((k) => (LOCS()[k] || {}).type !== "town");
    step(S.loc).forEach((k) => { out.add(k); step(k).forEach((x) => out.add(x)); });
    if (!out.size) Object.entries(LOCS()).forEach(([k, L]) => { if (L.type !== "town" && L.region === (G.loc() || {}).region) out.add(k); });
    if (!out.size) Object.entries(LOCS()).forEach(([k, L]) => { if (L.type !== "town") out.add(k); });
    return [...out];
  };
  W.nearFoes = (S) => [...new Set(W.near(S).flatMap((k) => (LOCS()[k].pool || []).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss)))];
  W.truthHere = (S) => {
    if (!G.l1 || !G.knowHas) return null;
    const all = G.l1.ids().filter((id) => !G.knowHas(id));
    const foes = new Set(W.nearFoes(S));
    const locs = new Set(W.near(S));
    const near = all.filter((id) => { const k = D.KNOW[id]; return ((k.kind === "foe" || k.kind === "fact") && foes.has(k.foe)) || (k.kind === "trap" && locs.has(k.loc)); });
    // 魔物について分かることは、その魔物のいちばん若いものだけ（データの順に開く）
    const first = (ids) => ids.filter((id) => { const k = D.KNOW[id]; return k.kind !== "fact" || !ids.some((x) => D.KNOW[x].kind === "fact" && D.KNOW[x].foe === k.foe && (D.KNOW[x].n || 0) < (k.n || 0)); });
    const list = first(near.length ? near : all.filter((id) => ["foe", "fact", "trap"].includes(D.KNOW[id].kind)));
    return list.length ? G.pick(list) : null;
  };
  W.lieHere = (S) => {
    const L = W.lies();
    const cands = W.nearFoes(S).flatMap((f) => W.lieAims(f).map((a) => [f, a])).filter(([f, a]) => !L[f + ":" + a]);
    if (!cands.length) return null;
    const [foe, aim] = G.pick(cands);
    const text = G.pick(N().lie[aim]).replace(/\{f\}/g, D.ENEMIES[foe].name) + G.pick(N().sign);
    return { key: foe + ":" + aim, foe, aim, text };
  };
  // その魔物について、もう嘘と分かるか（覚え書きが開いている・倒したことがある）
  W.foeKnown = (foe) => (G.knowHas && (G.knowHas("foe_" + foe) || (G.l1 ? G.l1.ids("fact") : []).some((id) => D.KNOW[id].foe === foe && G.knowHas(id))))
    || !!(((prof().kfoe || {})[foe] || {}).slew);
  W.debunk = (onRead) => {
    const L = W.lies();
    const out = Object.entries(L).filter(([, x]) => !x.found && W.foeKnown(x.foe));
    out.forEach(([, x]) => {
      x.found = true;
      const name = (D.ENEMIES[x.foe] || {}).name || x.foe;
      if (onRead) G.say(`前に読んだ${name}の書き込み${x.text.replace(/――.*$/, "")}。${G.pick(N().debunk)}`);
      G.note(`書き込みで読んだ${name}の話は、嘘だった。`);
    });
    if (out.length) saved();
    return out.length;
  };
  W.read = () => {
    const S = G.S;
    const f = S.fac;
    const st = W.st(S);
    G.log("you", f === "guild" ? "書き込み帳を読む" : "壁の落書きを読む");
    G.pass(1);
    G.say(N().open[f] || N().open.tavern);
    W.debunk(true);
    const key = S.loc + ":" + f;
    if (st.read[key] === S.day) { G.say(N().none); return; }
    st.read[key] = S.day;
    const r = G.rand();
    if (r < T.NOTE.TRUE) {
      const id = W.truthHere(S);
      if (id) { G.say(`${G.pick(N().hand)}「${D.KNOW[id].text}」`); G.learn(id, "note"); return; }
    }
    if (r < T.NOTE.TRUE + T.NOTE.LIE) {
      const lie = W.lieHere(S);
      if (lie) {
        G.say(`${G.pick(N().hand)}${lie.text}`);
        W.lies()[lie.key] = { foe: lie.foe, aim: lie.aim, text: lie.text, found: false };
        saved();
        return;
      }
    }
    const places = W.near(S).map((k) => LOCS()[k].name);
    G.say(`${G.pick(N().hand)}${G.pick(N().boast).replace(/\{p\}/g, G.pick(places))}`);
  };
  // 覚え書きが開いたら、その魔物についての嘘が分かる
  if (G.l1) G.l1.HOW.note = "書き込みで";
  const learn0 = G.learn;
  if (learn0) G.learn = (id, how, quiet) => {
    const r = learn0(id, how, quiet);
    if (r && G.S && D.KNOW[id] && D.KNOW[id].foe) W.debunk(false);
    return r;
  };
})(globalThis.G = globalThis.G || {});
