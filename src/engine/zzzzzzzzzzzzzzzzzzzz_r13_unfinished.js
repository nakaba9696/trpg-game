// R13（R10 の中 20）：終盤（七年目から）に「やり残したこと」を見せ、八年目から倒していない使徒を動き出させる。文と数は src/data/r13_unfinished.js（D.R13_TODO）。
// 新しい出来事は足さない。すでにある仕組みを数え直して、プレイヤーが自分で選べる目標にする：
// - G.r13.todo(S)：やり残したことの一覧 [{ k, text, to 行き先の場所 id か "", why 短い理由 }]
//     使徒（E3。会った・挑んだ・長編を始めた・居城を知っている・動き出した者は場所つき。知らない者は数だけ）／仲間の頼みごと（C9。途中の段と、まだ聞いていない頼み）／
//     降り切っていない迷宮（R11 の S.r11m.deep）／足を踏み入れていない地方（近い二つ）／取り残したトロフィーの手がかり（G.P.trophies に無い金・銀）
// - 宿屋（七年目から）：「やり残したことを数える」（本文に一覧）と「〇〇へ向かう」（宿を出て、道順の最初の一歩の旅に出る）
// - 依頼の一覧（Q7。手帳の代わり）：七年目から「やり残したこと」の一件
// - 八年目から：倒していない使徒（友好の者は除く）が一体ずつ動き出す。町にいるときに「世の大事」として知らせ、年表と手帳（噂）に残す。
//   動き出した使徒を討つと、名声と年表の一行・トロフィー「決着」。十年の引退の「その後」に、決着か、やり残したことを一行足す
// セーブに足すもの：S.r13 = { stir: { 使徒 id: { day, told } }, next 次に動き出す日, settled 討った数, done: { 使徒 id: 1 } }。古いセーブで無くても動く。
// 乱数は使わない（G.rand の並びを変えない。エピローグの一行も決まった選び方）。DOM には触らない。レーン C＋V
(function (G) {
  const D = G.data;
  const T = D.R13_TODO;
  if (!T || !G.r11 || !G.r11.yearNo) return;
  const X = (G.r13 = G.r13 || {});
  const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : ""));
  const lines = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const locName = (id) => (id && D.LOCS[id] ? D.LOCS[id].name : "");
  const st = (S) => { const r = (S.r13 = S.r13 || {}); r.stir = r.stir || {}; r.done = r.done || {}; return r; };
  X.state = st;
  const year = (S) => G.r11.yearNo(S);
  X.open = (S) => !!(S && S.profile && !S.over && year(S) >= T.FROM_YEAR);

  // ---------------------------------------------------------------- 道のり（陸路と船の日数。U4 の G.routeTo と同じ辺）
  const edges = (id) => {
    const L = D.LOCS[id] || {};
    const out = { ...(L.links || {}) };
    Object.entries(L.sea || {}).forEach(([to, s]) => { if (out[to] == null || s.days < out[to]) out[to] = s.days; });
    return out;
  };
  X.route = (from, to) => {
    const path = G.routeTo ? G.routeTo(from, to) : null;
    if (!path || path.length < 2) return null;
    const days = path.slice(1).reduce((a, id, i) => a + (edges(path[i])[id] || 0), 0);
    return { path, days, next: path[1] };
  };

  // ---------------------------------------------------------------- 使徒
  const RANK = { B: 0, A: 1, S: 2 };
  const lairOf = (a) => { const e = Object.entries(D.LOCS).find(([, L]) => L.boss === a.foe); return e ? e[0] : ""; };
  X.apostle = (a) => {
    const lair = lairOf(a);
    const where = lair || lines(a.meet && a.meet.where).find((w) => D.LOCS[w]) || "";
    const label = lair ? `${locName(lair)}の主` : (a.meet && a.meet.title) || "名も知らぬ使徒";
    return { id: a.id, lair, to: where, label, place: locName(where) || "どこかの町" };
  };
  const loreHas = (S, trig) => {
    if (!trig || !G.loreOf) return false;
    const [id, key] = String(trig).split(":");
    const got = G.loreOf(S)[id];
    return !!(got && (key ? got.includes(key) : got.length));
  };
  X.slain = (S, a) => !!(S.flags && S.flags[a.flag]);
  X.known = (S, a) => {
    const r = st(S), lair = lairOf(a);
    return !!(r.stir[a.id] || (S.e7 && S.e7[a.id]) || (a.meet && loreHas(S, a.meet.lore)) || (G.e3Tries && G.e3Tries(a.id) > 0) || (lair && S.visited && S.visited[lair]));
  };
  const apostles = () => (G.e3List ? G.e3List() : []);

  // ---------------------------------------------------------------- やり残したことの一覧
  X.todo = (S) => {
    S = S || G.S;
    if (!S || !S.profile) return [];
    const r = st(S);
    const out = [];
    // 使徒：動き出した者 → 知っている者 → 知らない者の数
    let unknown = 0;
    const alive = apostles().filter((a) => !X.slain(S, a));
    alive.sort((a, b) => (r.stir[b.id] ? 1 : 0) - (r.stir[a.id] ? 1 : 0));
    alive.forEach((a) => {
      if (!X.known(S, a)) { unknown++; return; }
      const p = X.apostle(a);
      out.push({ k: "apostle", id: a.id, text: fill(r.stir[a.id] ? T.APOSTLE_STIR : T.APOSTLE, p), to: p.to, why: r.stir[a.id] ? `${p.label}が動き出した` : `${p.label}がいる`, stir: !!r.stir[a.id] });
    });
    // 仲間の頼みごと（一行にいる人だけ）
    const Q9 = D.Q9 || {}, C9 = G.q9;
    (S.companions || []).forEach((c) => {
      const q = c && c.c2 && Q9[c.c2];
      if (!q || !C9 || !C9.of) return;
      const s9 = C9.of(c.c2, S);
      if (s9.end || (s9.n || 0) >= q.steps.length) return;
      const who = (G.m2Short ? G.m2Short(c) : c.name) || c.name;
      const i = C9.open(c.c2, S);
      if (i >= 0) {
        const step = q.steps[i] || {};
        const at = lines(step.at).find((l) => D.LOCS[l]) || "";
        out.push({ k: "mate", text: fill(T.MATE_OPEN, { who, title: q.title, place: lines(step.at).map(locName).filter(Boolean).join("か") || "行き先は話のとおり" }), to: at, why: `${who}の頼み` });
      } else out.push({ k: "mate", text: fill(T.MATE_WAIT, { who }), to: "", why: "" });
    });
    // 降り切っていない迷宮（入ったことのある所）
    const deep = (S.r11m && S.r11m.deep) || {};
    Object.entries(D.LOCS).forEach(([id, L]) => {
      if (L.type !== "dungeon" || !L.floors || !(S.visited && S.visited[id])) return;
      const flag = (L.reward && L.reward.flag) || "boss:" + id;
      if (S.flags && S.flags[flag]) return;
      out.push({ k: "depth", text: fill(T.DEPTH, { place: L.name, d: deep[id] || 0, n: L.floors }), to: id, why: `${L.name}の最奥` });
    });
    if (unknown) out.push({ k: "apostle", text: T.APOSTLE_UNKNOWN, to: "", why: "" });
    // 足を踏み入れていない地方（いちばん近い所を行き先に）
    const regions = {};
    Object.entries(D.LOCS).forEach(([id, L]) => { if (L.region) (regions[L.region] = regions[L.region] || []).push(id); });
    const far = [];
    Object.entries(regions).forEach(([reg, ids]) => {
      if (ids.some((id) => S.visited && S.visited[id])) return;
      let best = null;
      ids.forEach((id) => { const w = X.route(S.loc, id); if (w && (!best || w.days < best.days)) best = { id, days: w.days }; });
      if (best) far.push({ reg, ...best });
    });
    far.sort((x, y) => x.days - y.days).slice(0, T.REGION_MAX).forEach((x) => out.push({ k: "region", text: fill(T.REGION, { region: x.reg, place: locName(x.id) }), to: x.id, why: `${x.reg}を見に` }));
    // 取り残したトロフィーの手がかり（金・銀。並びは日ごとに少しずつ替わる）
    const got = (G.P && G.P.trophies) || {};
    const left = (D.TROPHIES || []).filter((t) => t && t.test && !got[t.key] && (t.tier === "金" || t.tier === "銀") && t.key !== T.TROPHY_KEY);
    for (let i = 0; i < Math.min(T.TROPHY_MAX, left.length); i++) {
      const t = left[(Math.floor((S.day || 0) / 7) * T.TROPHY_MAX + i) % left.length];
      out.push({ k: "trophy", text: fill(T.TROPHY, t), to: "", why: "" });
    }
    return out;
  };

  // 宿に並べる行き先（今いる所と、道の無い所は除く。重ならないように）
  X.goals = (S) => {
    S = S || G.S;
    const seen = new Set();
    const out = [];
    X.todo(S).forEach((t) => {
      if (!t.to || t.to === S.loc || seen.has(t.to) || out.length >= T.GO_MAX) return;
      const w = X.route(S.loc, t.to);
      if (!w) return;
      seen.add(t.to);
      out.push(Object.assign({}, t, { days: w.days, next: w.next }));
    });
    return out;
  };

  // ---------------------------------------------------------------- 宿屋の欄
  const fa0 = G.facActions;
  G.facActions = () => {
    const g = fa0();
    const S = G.S;
    if (!S || S.fac !== "inn" || !X.open(S)) return g;
    const list = [{ id: "r13list", label: T.COUNT, sub: fill(T.COUNT_SUB, { left: G.r11.leftText(S) }), kw: ["やり残", "数え"] }];
    X.goals(S).forEach((t) => list.push({ id: "r13go:" + t.to, label: fill(T.GO, { place: locName(t.to) }), sub: `${t.why}・${t.days}日`, kw: [locName(t.to), "向かう"] }));
    const at = Math.max(0, g.length - 1);   // 「出る」の前に
    g.splice(at, 0, { title: T.GROUP, list });
    return g;
  };

  const ex0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "r13list" && S) {
      G.log("you", T.COUNT);
      const list = X.todo(S).slice(0, T.LIST_MAX);
      G.say(fill(T.HEAD, { left: G.r11.leftText(S) }));
      if (!list.length) G.say(T.NONE);
      list.forEach((t) => G.note("・" + t.text));
      return;
    }
    if (head === "r13go" && S) {
      const to = arg;
      const goal = X.goals(S).find((t) => t.to === to) || { why: "" };
      const w = X.route(S.loc, to);
      G.log("you", fill(T.GO, { place: locName(to) }));
      if (!w) { G.note(fill(T.GO_NONE, { place: locName(to) })); return; }
      S.mode = "explore"; S.fac = null;
      G.say(fill(T.GO_SAY, { place: locName(to), why: goal.why ? `──${goal.why}。` : "" }));
      if (w.path.length > 2) G.note(fill(T.GO_FAR, { place: locName(to), days: w.days }));
      const act = G.actions().flatMap((x) => x.list).find((x) => (x.id === "travel:" + w.next || x.id === "sail:" + w.next) && !x.disabled);
      if (act) { const [h2, ...rest] = act.id.split(":"); return ex0(h2, rest.join(":"), act); }
      return;
    }
    return ex0(head, arg, a);
  };

  // ---------------------------------------------------------------- 依頼の一覧（手帳）
  if (G.q7 && G.q7.list) {
    const list0 = G.q7.list;
    G.q7.list = (S) => {
      S = S || G.S;
      const out = list0(S);
      if (!X.open(S)) return out;
      const todo = X.todo(S).slice(0, T.LIST_MAX);
      if (!todo.length) return out;
      out.push({ key: "r13:todo", src: "r13", kind: T.GROUP, title: T.QTITLE, client: "", from: "", state: "active", stateLabel: G.q7.STATE.active,
        desc: [fill(T.HEAD, { left: G.r11.leftText(S) })].concat(todo.map((t) => t.text)), progress: "", reward: "", deadline: null, report: null });
      return out;
    };
  }
  // 一覧に載ったときの一行（U17）は「引き受けた」ではなく、宿で数えられることを知らせる
  if (G.q17 && G.q17.line) {
    const line0 = G.q17.line;
    G.q17.line = (x) => (x && x.key === "r13:todo" && x.how === "new" ? T.NEW : line0(x));
  }

  // ---------------------------------------------------------------- 八年目から：使徒が動き出す
  X.stirCandidates = (S) => {
    const r = st(S);
    return apostles()
      .filter((a) => !X.slain(S, a) && !r.stir[a.id] && a.calm !== "友好" && X.apostle(a).to)
      .sort((a, b) => (X.known(S, b) ? 1 : 0) - (X.known(S, a) ? 1 : 0) || (RANK[a.rank] ?? 1) - (RANK[b.rank] ?? 1));
  };
  X.tick = (S) => {
    S = S || G.S;
    if (!S || S.over || !S.profile) return;
    const r = st(S);
    // 討った：決着
    Object.keys(r.stir).forEach((id) => {
      const a = apostles().find((x) => x.id === id);
      if (!a || r.done[id] || !X.slain(S, a)) return;
      r.done[id] = 1;
      r.settled = (r.settled || 0) + 1;
      const p = X.apostle(a);
      G.note(fill(T.SETTLE, p));
      G.chron(fill(T.SETTLE_CHRON, p), "trophy");
      if (G.addFame) G.addFame(T.SETTLE_FAME);
    });
    if (year(S) < T.STIR_YEAR) return;
    const start = G.r11.state(S).start + (T.STIR_YEAR - 1) * G.YEAR_DAYS;
    if (r.next == null) r.next = start + T.STIR_FIRST;
    if (S.day >= r.next && Object.keys(r.stir).length < T.STIR_MAX) {
      const a = X.stirCandidates(S)[0];
      if (a) r.stir[a.id] = { day: S.day, told: 0 };
      r.next = S.day + T.STIR_GAP;
    }
    // 知らせ：町にいて、出来事・戦い・旅の途中でないとき
    const L = D.LOCS[S.loc] || {};
    if (L.type !== "town" || S.event || S.combat || S.travel || S.mode === "combat") return;
    const id = Object.keys(r.stir).find((k) => !r.stir[k].told);
    if (!id) return;
    const a = apostles().find((x) => x.id === id);
    r.stir[id].told = S.day;
    if (!a || X.slain(S, a)) return;
    const p = X.apostle(a);
    const n = Object.keys(r.stir).indexOf(id);
    G.log("title", T.STIR_HEAD);
    G.say(fill(T.STIR[n % T.STIR.length], p));
    G.memo(fill(T.STIR_MEMO, p));
    G.chron(fill(T.STIR_CHRON, p), "world");
  };
  const end0 = G.endTurn;
  G.endTurn = (...a) => {
    const r = end0(...a);
    try { X.tick(G.S); } catch (e) { /* 知らせが出せなくても手番は止めない */ }
    return r;
  };

  // ---------------------------------------------------------------- 十年の「その後」に一行
  X.epilogueLine = (S) => {
    const r = st(S);
    const name = (S.profile && S.profile.name) || "あなた";
    const left = Object.keys(r.stir).map((id) => apostles().find((x) => x.id === id)).filter((a) => a && !X.slain(S, a));
    if (left.length) return fill(T.EPI_LEFT, Object.assign({ name }, X.apostle(left[0])));
    if (r.settled) {
      const a = apostles().find((x) => r.done[x.id]);
      return fill(T.EPI_SETTLED, Object.assign({ name }, X.apostle(a)));
    }
    const t = X.todo(S).find((x) => x.k === "apostle" || x.k === "mate" || x.k === "depth");
    return t ? fill(T.EPI_TODO, { name, thing: t.text }) : "";
  };
  const compose0 = G.m6Compose;
  if (compose0) G.m6Compose = (S) => {
    const out = compose0(S);
    const id = S && S.ending ? S.ending.id || S.ending : "";
    if (!out || id !== "decade" || !Array.isArray(out.after) || !out.after.length) return out;
    try {
      const t = X.epilogueLine(S);
      if (t) out.after.splice(out.after.length - 1, 0, t);
    } catch (e) { /* 一行が作れなくても「その後」はそのまま */ }
    return out;
  };
})(globalThis.G = globalThis.G || {});
