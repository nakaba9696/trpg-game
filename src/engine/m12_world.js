// M12：世の大事。冒険の暦の中で、ときどき大陸のどこかで大きな出来事が始まり、段階を踏んで進み、決着する。
// 持ち主の声「世界的にも何か大きなイベントが起きるようにしてほしい。そのイベントに参加するかは自由ですが」
// 表は src/data/m12_events*.js（D.M12.KINDS・D.M12.TOWN_ST）。出来事は D.EVENTS の m12_*。
//
// 段階：0 前触れ → 1 始まり → 2 激化 → 3 決着のあと（余波）→ 済み。あなたが関わらなくても、日数で進む。
// 決着（結末）は、その大事の outcomes から重みで選ぶ。あなたの働き（ev.part）と、どちらに付いたか（ev.side）で重みが少し動く。
// 結末は世界に残る（S.m12.fx）：町の様子（焼けた・居座られた・飢え など。施設が閉まる・値が上がる）、閉ざされた道、値上がり、
//   それに町に残る傷あと（S.m12.scars。ずっと残る一行）。国の評判（あなたの働きぶん）。
//
// 状態は S.m12（古いセーブで無ければ、その日から始める）：
//   { v, day 最後に進めた日, next 次の大事が始まる日, n, list [大事], fx [残るもの], scars [{ id, line, kind }] }
//   大事：{ id, kind, st 段階, since, until, v { t: 舞台の町 ほか }, part あなたの働き, side { a, b }, joined, out 結末, heard { 段階: 聞き方 }, done { 段階: { 行動 } }, end 決着の日 }
//   fx：{ type: "town"|"price"|"road", id?, st?, nations?, rate?, a?, b?, until, kind, ev }
// 伝わるのは：酒場の噂・町をぶらついたときの張り紙と通行人・着いた町の様子・旅の出来事・関われる行動（「世の大事」の欄）。
// 聞いたとき年表（kind "world"）に残し、用語（D.LORE の m12_*）と図鑑の「聞いた話」（G.heard）に一行足す。
// 関わり方：出来事の結果に m12（働き。数）と m12side（"a"|"b"）。どの大事のことかは出来事の id（m12_<種類>_…）で決まる（データの側で m12k を付ける）。
// core.js・explore.js は書き換えず、G.endTurn・G.arrive・G.exploreActions・G.exploreAct・G.facActions・G.facAct・G.eventTags・G.apply・G.finishRun を包む。
// 乱数は G.rand だけ。レーン C＋V＋W（M12）
(function (G) {
  const D = G.data;
  const M = (D.M12 = D.M12 || {});
  const X = (G.m12 = G.m12 || {});
  const K = () => M.KINDS || {};

  X.FIRST = [30, 60];       // はじめの大事が始まる日（はじめのひと月は、身近なことだけ）
  X.GAP = [60, 150];        // 一つ始まってから、次が始まるまでの日数（C16：旅が 1〜3 週間になったので広げた）
  X.PACE = 2;               // 段階・名残りの日数（表の days）にかける倍率（C16：旅ひとつで段階が過ぎてしまわないように）
  X.MAX_ON = 2;             // 同時に進む大事の数の上限
  X.AFTER = [30, 60];       // 決着のあと、話が残る日数
  X.SAME = 540;             // 同じ種類の大事を、これだけの日数のうちには繰り返さない（C16：一年半）
  X.KEEP = 24;              // 済んだ大事を覚えておく数
  X.HERE_GAP = 6;           // 前触れからこれだけの日数がたつまで、居合わせる出来事は起こさない
  const STAGE = ["omen", "start", "peak", "after"];
  X.STAGE = STAGE;

  const rng = (a, b) => a + Math.floor(G.rand() * (b - a + 1));
  const span = (a, b) => Math.round(rng(a, b) * (X.PACE || 1));   // 表の日数（段階・名残り）に倍率をかける
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const exists = (id) => !!(id && D.LOCS[id]);
  const townsOf = (ids) => as(ids).filter((id) => exists(id) && D.LOCS[id].type === "town");
  const lore = (x) => { if (x && G.openLores) G.openLores(x); };

  // ---------------------------------------------------------------- 状態
  X.state = (S) => {
    S = S || G.S;
    if (!S) return null;
    if (!S.m12) S.m12 = { v: 1, day: S.day, next: 0, n: 0, list: [], fx: [], scars: [] };
    const W = S.m12;
    W.list = W.list || []; W.fx = W.fx || []; W.scars = W.scars || [];
    return W;
  };
  X.active = (S) => { const W = (S || G.S || {}).m12; return W ? W.list.filter((e) => e.st < 4) : []; };
  X.find = (kind, S) => X.active(S).find((e) => e.kind === kind) || null;
  // その種類の大事が今どの段階か（無ければ -1）
  X.stage = (kind, S) => { const e = X.find(kind, S); return e ? e.st : -1; };
  G.m12Stage = X.stage;

  // 文の差し込み：{t} 舞台になる町（の名）・{a} {b} 二つの側の名・{who} その大事の人物・{x} ほか v の値
  X.fill = (t, ev) => String(t == null ? "" : t).replace(/\{(\w+)\}/g, (_, k) => {
    const v = ev && ev.v ? ev.v[k] : null;
    const Kd = ev && K()[ev.kind];
    if (v == null && (k === "a" || k === "b") && Kd && Kd.sides) return Kd.sides[k];
    if (v == null) return "";
    return exists(v) ? D.LOCS[v].name : String(v);
  });
  const pickW = (list, wt) => {
    const tot = list.reduce((a, x) => a + Math.max(0, wt(x)), 0);
    if (!(tot > 0)) return null;
    let r = G.rand() * tot;
    for (const x of list) { r -= Math.max(0, wt(x)); if (r <= 0) return x; }
    return list[list.length - 1];
  };

  // その大事が感じられる場所（段階ごと。"@t" は舞台の町）
  X.places = (ev, st) => {
    const Kd = K()[ev.kind];
    if (!Kd) return [];
    const sd = Kd.stages[Math.min(st == null ? ev.st : st, Kd.stages.length - 1)] || {};
    const raw = sd.at || Kd.at || [];
    return [...new Set(as(raw).flatMap((x) => (x === "@t" ? [ev.v.t] : String(x).startsWith("@") ? as(ev.v[x.slice(1)]) : [x])).filter(exists))];
  };
  X.here = (ev, loc) => X.places(ev).includes(loc || G.S.loc);
  // その国の大事か（前触れの噂は、近くにしか届かない）
  const near = (ev, loc) => {
    if (X.here(ev, loc)) return true;
    const Kd = K()[ev.kind] || {};
    const n = G.nationOf ? G.nationOf(loc) : null;
    const L = D.LOCS[loc] || {};
    if (as(Kd.nations).includes(n) || as(Kd.nations).includes(L.region)) return true;
    return X.places(ev).some((p) => (D.LOCS[p] && D.LOCS[p].links && D.LOCS[p].links[loc]) || (L.links && L.links[p]));
  };

  // ---------------------------------------------------------------- 始まる・進む・決着
  function start(W, day, S, only) {
    const on = X.active(S);
    if (on.length >= X.MAX_ON && !only) return null;
    const recent = (k) => W.list.some((e) => e.kind === k && day - e.since < X.SAME);
    const cand = only ? [[only, K()[only]]] : Object.entries(K()).filter(([k, Kd]) => !on.some((e) => e.kind === k) && !recent(k) && !(Kd.once && W.list.some((e) => e.kind === k))
      && (!Kd.cond || Kd.cond(S, W)));
    const pick = pickW(cand, ([, Kd]) => Kd.w || 1);
    if (!pick) return null;
    const [kind, Kd] = pick;
    const ev = { id: "m12e" + ++W.n, kind, st: 0, since: day, until: day + span(...Kd.stages[0].days), v: {}, part: 0, side: { a: 0, b: 0 }, joined: false, out: "", heard: {}, done: {}, end: 0 };
    // 舞台になる町（今いる町は、はじめのうちは避ける）
    const ts = as(Kd.targets).filter(exists);
    const tsAway = ts.filter((id) => id !== S.loc);
    if (ts.length) ev.v.t = G.pick(tsAway.length ? tsAway : ts);
    if (Kd.setup) Kd.setup(ev, S, G);
    W.list.push(ev);
    flags(S);
    return ev;
  }

  function decide(ev, S) {
    const Kd = K()[ev.kind];
    const entries = Object.entries(Kd.outcomes);
    const part = Math.min(6, ev.part || 0);
    const pick = pickW(entries, ([, o]) => {
      let w = (o.base == null ? 1 : o.base) + (o.per || 0) * part;
      if (o.side && ev.side) w += 0.25 * Math.min(3, ev.side[o.side] || 0) - 0.15 * Math.min(3, ev.side[o.side === "a" ? "b" : "a"] || 0);
      return Math.max(0.04, w);
    });
    return pick ? pick[0] : entries[0][0];
  }

  // 結末を世界に残す
  function settle(W, ev, day, S) {
    const Kd = K()[ev.kind];
    ev.out = decide(ev, S);
    ev.end = day;
    const O = Kd.outcomes[ev.out] || {};
    as(O.fx).forEach((f) => {
      const ids = f.id === "@t" ? [ev.v.t] : String(f.id || "").startsWith("@") ? as(ev.v[f.id.slice(1)]) : as(f.id);
      const until = day + span(...(f.days || [40, 80]));
      if (f.type === "town") ids.filter(exists).forEach((id) => { W.fx = W.fx.filter((x) => !(x.type === "town" && x.id === id)); W.fx.push({ type: "town", id, st: f.st, until, kind: ev.kind, ev: ev.id, seen: false }); });
      else if (f.type === "price") W.fx.push({ type: "price", nations: as(f.nations), ids: ids.filter(exists), rate: f.rate, until, kind: ev.kind, ev: ev.id });
      else if (f.type === "road") W.fx.push({ type: "road", a: f.a === "@t" ? ev.v.t : f.a, b: f.b === "@t" ? ev.v.t : f.b, why: f.why || "", until, kind: ev.kind, ev: ev.id });
    });
    if (O.scar) as(O.scar).forEach((sc) => {
      const id = sc.id === "@t" ? ev.v.t : sc.id;
      const line = X.fill(sc.line, ev);
      if (exists(id) && !W.scars.some((x) => x.id === id && x.line === line)) W.scars.push({ id, line, kind: ev.kind, ev: ev.id });
    });
    if (W.scars.length > 40) W.scars.splice(0, W.scars.length - 40);
    // あなたの働きは、その国の評判に（数は見せない）。負けた側に付いていたら、悪名
    if (ev.part > 0 && Kd.nation && G.repOf) G.repOf(Kd.nation).rep += Math.min(30, ev.part * 4);
    if (Kd.sideNation && G.repOf) ["a", "b"].forEach((k) => { if (ev.side[k] > 0 && Kd.sideNation[k]) G.repOf(Kd.sideNation[k]).rep += Math.min(20, ev.side[k] * 5); });
    if (O.side && ev.side) {
      const other = O.side === "a" ? "b" : "a";
      const n = (Kd.sideNation && Kd.sideNation[O.side]) || Kd.nation;
      if ((ev.side[other] || 0) > (ev.side[O.side] || 0)) { ev.lost = true; if (n && G.repOf) { const r = G.repOf(n); r.inf = G.clamp((r.inf || 0) + 6, 0, 999); } }
    }
    if (O.after) O.after(ev, S, G);
  }

  function advance(W, ev, day, S) {
    const Kd = K()[ev.kind];
    if (!Kd) { ev.st = 4; return; }
    while (ev.st < 4 && day >= ev.until) {
      const at = ev.until;
      ev.st++;
      if (ev.st === 3) { settle(W, ev, at, S); ev.until = at + span(...X.AFTER); }
      else if (ev.st < 3) {
        ev.until = at + span(...Kd.stages[ev.st].days);
        ev.since2 = at;
        // 激化の日に、あなたが舞台の町にいたら（前触れから日がたっていれば）居合わせる
        ev.hereDue = !!(Kd.here && ev.st === Kd.here.st && at - ev.since >= X.HERE_GAP && X.places(ev).includes(S.loc));
      }
    }
    flags(S);
  }

  // 旅の出来事（W6）が読める印：m12_<種類>（進んでいる間）・m12_<種類>_<段階>
  function flags(S) {
    if (!S || !S.flags) return;
    Object.keys(S.flags).forEach((f) => { if (/^m12_/.test(f)) delete S.flags[f]; });
    X.active(S).forEach((e) => { if (e.st < 3) { S.flags["m12_" + e.kind] = true; S.flags[`m12_${e.kind}_${STAGE[e.st]}`] = true; } });
  }

  function daily(W, day, S) {
    if (!W.next) W.next = day + rng(...X.FIRST);
    if (day >= W.next) { start(W, day, S); W.next = day + rng(...X.GAP); }
    X.active(S).forEach((ev) => advance(W, ev, day, S));
    // 済んだ大事は、少しだけ覚えておく
    const old = W.list.filter((e) => e.st >= 4);
    if (old.length > X.KEEP) { const drop = new Set(old.slice(0, old.length - X.KEEP).map((e) => e.id)); W.list = W.list.filter((e) => !drop.has(e.id)); }
    W.fx = W.fx.filter((f) => day < f.until);
  }

  // テストと確かめ用：その種類の大事を今日から始める（同じ種類が進んでいれば、それを返す）
  X.begin = (kind, S) => {
    S = S || G.S;
    const W = X.state(S);
    if (!K()[kind]) return null;
    return X.find(kind, S) || start(W, S.day, S, kind);
  };
  // テストと確かめ用：次の段階へ進める（日数は動かさない）
  X.step = (ev, S) => { S = S || G.S; ev.until = X.state(S).day; advance(X.state(S), ev, ev.until, S); return ev; };

  X.tick = () => {
    const S = G.S;
    if (!S || S.over) return;
    const W = X.state(S);
    const upto = Math.min(S.day, W.day + 2000);   // 古いセーブで何年も飛んでも固まらないように
    while (W.day < upto) { W.day++; daily(W, W.day, S); }
    W.day = Math.max(W.day, S.day);
    // 居合わせる
    if (S.mode === "explore" || S.mode === "fac") {
      const ev = X.active(S).find((e) => e.hereDue);
      if (ev) {
        ev.hereDue = false;
        const Kd = K()[ev.kind];
        if (X.here(ev, S.loc) && D.LOCS[S.loc].type === Kd.here.type && G.startEvent(Kd.here.ev)) hear(ev, ev.st, "here");
      }
    }
  };
  G.m12Tick = X.tick;

  // ---------------------------------------------------------------- 聞く
  // 段階の話を聞いた。はじめてなら年表に残し、用語と図鑑の「聞いた話」に足す
  function hear(ev, st, how, said) {
    if (!ev || ev.heard[st]) return false;
    const Kd = K()[ev.kind];
    ev.heard[st] = how;
    const sd = st >= 3 ? Kd.outcomes[ev.out] || {} : Kd.stages[st] || {};
    const text = (how === "here" && sd.chronHere) || (how === "seen" && sd.chronSeen) || sd.chron;
    if (text) {
      const line = X.fill(text, ev);
      if (!G.S.chronicle.slice(-8).some((c) => c.text === line)) G.chron(line, "world");
    }
    if (Kd.lore) lore(`${Kd.lore}:${st >= 3 ? ev.out : STAGE[st]}`);
    if (said && G.heard) G.heard(said, { lore: Kd.lore });
    return true;
  }
  X.hear = hear;

  // 今いる場所で聞ける話：[{ ev, st }]（新しい段階から。まだ聞いていない話を先に）
  function news(S, fresh) {
    const out = [];
    X.active(S).forEach((ev) => {
      const top = Math.min(ev.st, 3);
      for (let st = top; st >= 0; st--) {
        if (st === 0 && !near(ev, S.loc)) continue;
        if (fresh && ev.heard[st]) continue;
        out.push({ ev, st });
        if (fresh) break;   // まだ聞いていない段階のうち、いちばん新しいものだけ
      }
    });
    return out;
  }
  const sdOf = (ev, st) => (st >= 3 ? K()[ev.kind].outcomes[ev.out] || {} : K()[ev.kind].stages[st] || {});

  // 酒場の噂
  function rumor(S) {
    const fresh = news(S, true).filter(({ ev, st }) => as(sdOf(ev, st).rumor).length);
    const any = news(S, false).filter(({ ev, st }) => as(sdOf(ev, st).rumor).length);
    const n = fresh.length && G.rand() < 0.7 ? G.pick(fresh) : any.length && G.rand() < 0.2 ? G.pick(any) : null;
    if (!n) return false;
    const text = X.fill(G.pick(as(sdOf(n.ev, n.st).rumor)), n.ev);
    S.gold -= 2;
    G.log("you", "噂を聞く");
    G.say(`${G.pick(M.SPEAKERS || ["隣の卓の男"])}「${text}」`);
    G.memo("噂：" + text);
    hear(n.ev, n.st, "rumor", "噂：" + text);
    G.pass(1);
    return true;
  }
  X.rumor = rumor;

  // 町をぶらついたときの一行（張り紙・通行人・町の様子・傷あと）
  function walkLine(S) {
    const lines = [];
    // 張り紙（始まってからの話）
    const notes = news(S, true).filter(({ ev, st }) => st >= 1 && as(sdOf(ev, st).notice).length);
    if (notes.length && G.rand() < 0.5) {
      const n = G.pick(notes);
      const t = X.fill(G.pick(as(sdOf(n.ev, n.st).notice)), n.ev);
      G.say(t);
      hear(n.ev, n.st, "notice", "張り紙：" + t);
      return true;
    }
    // 通行人（前触れ・その場所で感じられる段階）
    X.active(S).forEach((ev) => {
      const st = Math.min(ev.st, 3);
      if (st === 0 ? near(ev, S.loc) : X.here(ev, S.loc)) as(sdOf(ev, st).lines).forEach((l) => lines.push([ev, st, l]));
    });
    const fx = townFx(S.loc, S);
    if (fx) as((M.TOWN_ST[fx.st] || {}).lines).forEach((l) => lines.push([X.byId(fx.ev, S), -1, l]));
    (S.m12.scars || []).filter((s) => s.id === S.loc).forEach((s) => lines.push([null, -1, s.line]));
    if (!lines.length) return false;
    const [ev, st, l] = G.pick(lines);
    G.say(X.fill(l, ev || { v: { t: S.loc } }));
    if (ev && st >= 0) hear(ev, st, X.here(ev, S.loc) ? "seen" : "rumor");
    return true;
  }
  X.walkLine = walkLine;
  X.byId = (id, S) => ((S || G.S).m12.list || []).find((e) => e.id === id) || null;

  // 着いたとき（その場所で起きていることを、はじめて見たとき）
  function arrival(S) {
    X.active(S).forEach((ev) => {
      const st = Math.min(ev.st, 3);
      if (!X.here(ev, S.loc) || ev.heard[st] === "seen" || ev.heard[st] === "here") return;
      const sd = sdOf(ev, st);
      if (!as(sd.seen).length) return;
      G.say(X.fill(G.pick(as(sd.seen)), ev));
      ev.heard[st] = "";   // 噂で聞いていても、見たことは年表に残す
      hear(ev, st, "seen");
    });
    const fx = townFx(S.loc, S);
    if (fx && !fx.seen) {
      fx.seen = true;
      const T = M.TOWN_ST[fx.st] || {};
      if (as(T.seen).length) G.say(X.fill(G.pick(as(T.seen)), X.byId(fx.ev, S) || { v: { t: S.loc } }));
      const ev = X.byId(fx.ev, S);
      if (ev && ev.st >= 3 && !ev.heard[3]) hear(ev, 3, "seen");
    }
  }

  // ---------------------------------------------------------------- 世界に残ったもの
  const townFx = (id, S) => (((S || G.S).m12 || {}).fx || []).find((f) => f.type === "town" && f.id === id) || null;
  X.townFx = townFx;
  // 進んでいる段階が、その町にかける様子（舞台の町だけ）
  const stageTown = (id, S) => {
    for (const ev of X.active(S)) {
      if (ev.st >= 3) continue;
      const sd = K()[ev.kind].stages[ev.st] || {};
      if (sd.st && (sd.stAt ? X.places(ev).includes(id) : ev.v.t === id)) return { st: sd.st, ev: ev.id };
    }
    return null;
  };
  X.townState = (id, S) => { S = S || G.S; if (!S || !S.m12) return null; const f = townFx(id, S) || stageTown(id, S); return f ? f.st : null; };
  X.off = (id, S) => {
    S = S || G.S;
    const st = X.townState(id, S);
    const off = Object.assign({}, st ? (M.TOWN_ST[st] || {}).off || {} : {});
    delete off["fac:inn"]; delete off["fac:church"]; delete off["fac:castle"];   // 宿・教会・王への道は閉じない
    return off;
  };
  X.markup = (id, S) => {
    S = S || G.S;
    if (!S || !S.m12) return 0;
    const st = X.townState(id, S);
    let m = st ? (M.TOWN_ST[st] || {}).markup || 0 : 0;
    const n = G.nationOf ? G.nationOf(id) : null;
    const add = (f) => { if (as(f.ids).includes(id) || as(f.nations).includes(n)) m = Math.max(m, f.rate || 0); };
    S.m12.fx.filter((f) => f.type === "price").forEach(add);
    X.active(S).forEach((ev) => { if (ev.st < 3) { const sd = K()[ev.kind].stages[ev.st] || {}; if (sd.price) add({ nations: K()[ev.kind].nations, ids: X.places(ev), rate: sd.price }); } });
    return m;
  };
  // 閉ざされた道（どちら向きでも）。理由の一言か ""
  X.closed = (a, b, S) => {
    S = S || G.S;
    if (!S || !S.m12) return "";
    const hit = (x, y) => (x === a && y === b) || (x === b && y === a);
    const f = S.m12.fx.find((r) => r.type === "road" && hit(r.a, r.b));
    if (f) return f.why || "道が閉ざされている";
    for (const ev of X.active(S)) {
      if (ev.st >= 3) continue;
      const sd = K()[ev.kind].stages[ev.st] || {};
      const r = as(sd.road).find(([x, y]) => hit(x === "@t" ? ev.v.t : x, y === "@t" ? ev.v.t : y));
      if (r) return r[2] || "道が閉ざされている";
    }
    return "";
  };

  // ---------------------------------------------------------------- 関われる行動（「世の大事」の欄）
  X.acts = (S) => {
    S = S || G.S;
    const out = [];
    const L = D.LOCS[S.loc] || {};
    X.active(S).forEach((ev) => {
      const Kd = K()[ev.kind];
      (Kd.acts || []).forEach((a, i) => {
        if (!as(a.st).includes(ev.st)) return;
        const where = a.at || "@here";
        const ok = where === "@here" ? X.here(ev, S.loc) : where === "town" ? L.type === "town" : where === "@near" ? near(ev, S.loc) && L.type === "town" : as(where).flatMap((w) => (w === "@t" ? [ev.v.t] : [w])).includes(S.loc);
        if (!ok || (a.type && L.type !== a.type)) return;
        if (a.cond && !a.cond(S, ev)) return;
        // 一つの段階で一度だけ
        const done = (ev.done[ev.st] || {})[i];
        out.push({ id: `m12:${ev.id}:${i}`, label: X.fill(a.label, ev), sub: done ? "もう関わった" : X.fill(a.sub || "", ev), disabled: !!done, kw: ["世の大事", ...as(a.kw)], ev, a, i });
      });
    });
    return out;
  };
  function doAct(S, evId, i) {
    const ev = X.byId(evId, S);
    if (!ev) return;
    const a = (K()[ev.kind].acts || [])[+i];
    const it = X.acts(S).find((x) => x.ev === ev && x.i === +i);
    if (!a || !it || it.disabled) return;
    (ev.done[ev.st] = ev.done[ev.st] || {})[i] = true;
    G.log("you", it.label);
    G.pass(1);
    hear(ev, Math.min(ev.st, 3), "seen");
    G.startEvent(a.ev);
  }

  // 出来事の結果の m12（働き）・m12side（どちらに付いたか）
  X.credit = (kind, n, side, S) => {
    S = S || G.S;
    const ev = X.find(kind, S);
    if (!ev || ev.st >= 3) return false;
    ev.part = (ev.part || 0) + (n || 0);
    if (side) ev.side[side] = (ev.side[side] || 0) + 1;
    if (!ev.joined && (n > 0 || side)) {
      ev.joined = true;
      const Kd = K()[ev.kind];
      if (Kd.joinChron) G.chron(X.fill(Kd.joinChron.replace("{side}", side ? `{${side}}` : ""), ev), "event");
    }
    return true;
  };

  // ---------------------------------------------------------------- 墓碑・人生の物語が読む
  X.history = (S) => {
    S = S || G.S;
    const W = S && S.m12;
    if (!W) return [];
    return W.list.map((ev) => {
      const Kd = K()[ev.kind] || {};
      const O = (Kd.outcomes || {})[ev.out] || {};
      return { kind: ev.kind, name: Kd.name || ev.kind, since: G.dateOf(ev.since), st: ev.st, out: ev.out, outText: ev.out ? X.fill(O.chron || "", ev) : "", part: ev.part || 0, joined: !!ev.joined, heard: Object.keys(ev.heard).length > 0 };
    });
  };

  // ---------------------------------------------------------------- 包む
  const endTurn0 = G.endTurn;
  G.endTurn = () => { X.tick(); endTurn0(); };

  const arrive0 = G.arrive;
  G.arrive = (dest) => {
    const r = arrive0(dest);
    const S = G.S;
    if (S && !S.over && S.m12 && S.loc === dest) arrival(S);
    return r;
  };

  const ST_LABEL = (st) => (M.TOWN_ST[st] || {}).heard || "";
  const exploreActions0 = G.exploreActions;
  G.exploreActions = () => {
    const S = G.S;
    const groups = exploreActions0();
    if (!S || !S.m12) return groups;
    const town = (D.LOCS[S.loc] || {}).type === "town";
    const off = town ? X.off(S.loc, S) : {};
    const moves = [];
    groups.forEach((g) => g.list.forEach((a) => {
      if (off[a.id] && !a.disabled) { a.disabled = true; a.sub = off[a.id]; }
      const m = /^(travel|sail):(.+)$/.exec(a.id || "");
      if (!m) return;
      moves.push(a);
      const to = m[2];
      const fx = townFx(to, S);
      const ev = fx && X.byId(fx.ev, S);
      if (fx && ev && Object.keys(ev.heard).length && ST_LABEL(fx.st) && !String(a.sub || "").includes(ST_LABEL(fx.st))) a.sub = (a.sub ? a.sub + "・" : "") + ST_LABEL(fx.st);
    }));
    // 閉ざされた道。ほかに行ける道が無いときは閉じない（閉じ込めない）
    const shut = moves.filter((a) => a.id.startsWith("travel:") && !a.disabled && X.closed(S.loc, a.id.slice(7), S));
    if (shut.length && moves.some((a) => !a.disabled && !shut.includes(a))) shut.forEach((a) => { a.disabled = true; a.sub = X.closed(S.loc, a.id.slice(7), S); });
    const list = X.acts(S).map(({ id, label, sub, disabled, kw }) => ({ id, label, sub, disabled, kw }));
    if (list.length) {
      const at = Math.max(0, groups.length - 1);
      groups.splice(at, 0, { title: "世の大事", list });
    }
    return groups;
  };

  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "m12") { const [evId, i] = String(arg).split(":"); doAct(S, evId, i); return; }
    exploreAct0(head, arg, a);
    if (head === "walk" && S.m12 && S.mode === "explore" && !S.over) {
      const heavy = X.active(S).some((ev) => X.here(ev, S.loc)) || townFx(S.loc, S);
      const any = X.active(S).some((ev) => near(ev, S.loc)) || (S.m12.scars || []).some((s) => s.id === S.loc);
      if ((heavy || any) && G.rand() < (heavy ? 0.5 : 0.25)) walkLine(S);
    }
  };

  const facActions0 = G.facActions;
  G.facActions = () => {
    const S = G.S;
    if (S && S.m12 && S.mode === "fac" && S.fac === "guild") board(S);   // 掲示板を作り直す仕組み（Q5）のあとでも貼られるように、見るときに貼る
    const groups = facActions0();
    if (!S || !S.m12) return groups;
    const off = X.off(S.loc, S);
    const mk = S.fac === "shop" ? X.markup(S.loc, S) : 0;
    groups.forEach((g) => g.list.forEach((a) => {
      if (off[a.id] && !a.disabled) { a.disabled = true; a.sub = off[a.id]; }
      if (mk && String(a.id).startsWith("shop:buy:")) {
        const it = D.ITEMS[a.id.slice(9)];
        if (!it) return;
        const m4 = G.m4Markup ? G.m4Markup(S.loc, S) : 0;
        if (mk <= m4) return;   // 戦の値上がり（M4）のほうが大きければ、そちら
        const price = it.price + Math.ceil(it.price * mk);
        a.sub = String(a.sub || "").replace(/^\d+G/, `${price}G`);
        a.disabled = a.disabled || S.gold < price;
      }
    }));
    return groups;
  };

  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (S && S.m12) {
      if (head === "tavern" && arg === "rumor" && G.rand() < 0.6 && rumor(S)) return;
      if (head === "shop" && String(arg).startsWith("buy:")) {
        const it = D.ITEMS[arg.slice(4)];
        const mk = X.markup(S.loc, S);
        const m4 = G.m4Markup ? G.m4Markup(S.loc, S) : 0;
        const extra = it && mk > m4 ? Math.ceil(it.price * mk) - Math.ceil(it.price * m4) : 0;
        if (extra > 0) {
          if (S.gold < it.price + Math.ceil(it.price * mk)) return;
          S.gold -= extra;
          facAct0(head, arg, a);
          G.note(`品が足りず、値が上がっていた。（さらに -${extra}G）`);
          return;
        }
      }
      // ギルドの依頼（m12 の印つき）を報告したら、その大事への働きになる
      if (head === "guild" && String(arg).startsWith("report:")) {
        const q = S.quests.find((x) => x.id === arg.slice(7) && x.done);
        if (q && q.m12) X.credit(q.m12, q.m12n || 1, q.m12side, S);
      }
    }
    facAct0(head, arg, a);
  };
  // 掲示板に貼る依頼（D.M12.KINDS の board：{ st: [段階], at, make(ev, S) → 依頼 }）
  function board(S) {
    if (!S.board || (S.board.loc && S.board.loc !== S.loc) || S.board.m12) return;
    S.board.m12 = true;
    const L = D.LOCS[S.loc] || {};
    X.active(S).forEach((ev) => {
      const B = K()[ev.kind].board;
      if (!B || !as(B.st).includes(ev.st) || S.board.list.some((q) => q.m12 === ev.kind)) return;
      if (B.at === "@here" ? !X.here(ev, S.loc) : B.at === "@near" ? !near(ev, S.loc) : false) return;
      const q = B.make(ev, S, G);
      if (!q || (q.loc && !exists(q.loc)) || q.loc === S.loc) return;
      q.id = "m12q" + S.day + "_" + ev.id;
      q.m12 = ev.kind;
      q.title = X.fill(q.title, ev); q.desc = X.fill(q.desc, ev);
      if (q.type === "hunt" && !(D.ENEMIES[q.target] && D.LOCS[q.loc])) return;
      S.board.list.push(q);
      if (L.type === "town") hear(ev, Math.min(ev.st, 3), "notice");
    });
  }

  // 出来事の場所のタグ：m12_<種類>（舞台の場所で）・m12_<種類>_<段階>・m12_<町の様子>
  const tags0 = G.eventTags;
  G.eventTags = () => {
    const tags = tags0();
    const S = G.S;
    if (!S || !S.m12) return tags;
    X.active(S).forEach((ev) => {
      if (!X.here(ev, S.loc)) return;
      tags.push("m12_" + ev.kind, `m12_${ev.kind}_${STAGE[Math.min(ev.st, 3)]}`);
    });
    const st = X.townState(S.loc, S);
    if (st) tags.push("m12_" + st);
    return tags;
  };

  // 結果の m12（働き）。どの大事かは m12k（データの側で出来事の id から付ける）
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (o && S && !S.over && o.m12k && (o.m12 || o.m12side)) X.credit(o.m12k, o.m12 || 0, o.m12side, S);
    return apply0(o);
  };

  // 墓碑に、その冒険で起きた世の大事と、あなたの関わりを残す
  const finish0 = G.finishRun;
  G.finishRun = () => {
    const S = G.S;
    const cb = G.onFinish;
    G.onFinish = null;
    try { finish0(); } finally { G.onFinish = cb; }
    const g = G.P && G.P.graves && G.P.graves[0];
    if (g && S && g.id === S.id && S.m12) g.m12 = X.history(S).filter((h) => h.heard || h.joined).map((h) => ({ name: h.name, since: h.since, out: h.outText, joined: h.joined }));
    if (G.onFinish) G.onFinish();
  };

  // 地図の印（画面は ui/w5_map.js が読む）：聞いたことのある大事の舞台と、残った町の様子
  X.mapMarks = (S) => {
    S = S || G.S;
    if (!S || !S.m12) return [];
    const out = [];
    X.active(S).forEach((ev) => {
      if (!Object.keys(ev.heard).length || ev.st >= 3) return;
      const Kd = K()[ev.kind];
      const at = ev.v.t || X.places(ev)[0];
      if (exists(at)) out.push({ id: at, glyph: Kd.glyph || "◆", text: `${Kd.name}（${(Kd.stageNames || ["前触れ", "始まり", "激しくなる"])[ev.st]}）` });
    });
    S.m12.fx.filter((f) => f.type === "town").forEach((f) => {
      const ev = X.byId(f.ev, S);
      if (!ev || !Object.keys(ev.heard).length || out.some((m) => m.id === f.id)) return;
      const T = M.TOWN_ST[f.st] || {};
      out.push({ id: f.id, glyph: T.glyph || "・", text: T.heard || "" });
    });
    return out;
  };
})(globalThis.G = globalThis.G || {});
