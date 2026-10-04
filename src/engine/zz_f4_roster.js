// F4：仲間になる人の「いつ・どこに居るか」（予定）・図鑑に「会える場所と時期」「仲間にする方法」・知っている人を訪ねる・次の冒険で狙う。DOM には触らない（画面は ui/f4_roster.js）。
// 名前の頭の zz_f4 は、zz_c2_people.js（G.c2Join・顔なじみを誘う）と zz_f2_codex.js（図鑑）より後に読ませて包むため。
// 仕組みはデータの形（D.C2_PEOPLE の join・schedule と、出来事の c2・c2join・next）だけを見る。特定の人には依存しないので、後から足された人にもそのまま効く。
//
// 居場所はほぼ固定：予定（データの schedule か D.F4_SCHEDULE。書き方は data/f4_roster.js と docs/f4_schedule.md）の時期に、その場所へ行けば会える
//   その人が主（出来事の c2 の最初）の出会いの出来事（w > 0・その人の元の居場所で起きるもの）は、今の時期の居場所で起きる。居場所の種類（町・野・迷宮）が違う時期は起きない
//   冒険ごとの揺れは、予定が数日前後する（S.f4.shift）だけ。出来事の中身（どの出会い方・脇の出来事・噂）は、いつもどおり乱数で変わる
//   図鑑で知っている人（かつての冒険で会った・噂で居場所を聞いた）がいま居る所では、「〇〇を訪ねる」で出会いの出来事を起こせる（知っていれば狙える）
//   「狙う」印の人は、出会いの出来事の重みが 3 倍（居る所・時期は変わらない）
// セーブ（G.S）に足すもの：S.f4 = { shift { id: 日 }, sched { id: 予定 } 出来事で書き換えた予定, away { id: 出来事 } 会えなくなった, want 狙っていた人, heard { id: 1 }, ask 貼り紙を見た日 }
//   古いセーブ（S.f4 が無い）は、揺れなしで予定どおり
// profile（G.P、冒険をまたぐ）に足すもの：
//   G.P.f4 = { want { id: 1 } 狙う人（三人まで）, know { id: { "場所|季節": "heard" } } 噂で聞いた居場所 }
//   G.P.codex.people[id].seen { "場所|季節": 1 } 会った場所と時期 / places { 場所: 1 } / via 仲間になった出来事 / lost 会えなくなった出来事の題
// レーン F＋C（F4）
(function (G) {
  const D = G.data;
  const F4 = (G.f4 = G.f4 || {});
  const P = () => D.C2_PEOPLE || {};
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const WANT_W = 3;   // 狙った人の出会いの出来事の重み
  const WANT_MAX = 3; // 狙える人数
  const SHIFT = 6;    // 予定が前後する日数（冒険ごと）

  // ---------------------------------------------------------------- 暦
  const SEASONS = () => G.SEASONS || ["春", "夏", "秋", "冬"];
  F4.doy = (day) => ((((day - 1) % 360) + 360) % 360) + 1; // 年の中の日 1〜360
  F4.seasonOf = (day) => SEASONS()[Math.floor((F4.doy(day) - 1) / 90)];
  // 今日（画面の上の帯が読む）：{ y 年, season 季節, si 季節の番号, d 季節の中の日, text「1127年 春 9日」, phase 時間帯 }
  G.f4Today = (S) => {
    S = S || G.S;
    if (!S) return null;
    const text = G.dateOf ? G.dateOf(S.day) : `${S.day}日目`;
    const m = /^(\d+)年/.exec(text);
    const si = Math.floor((F4.doy(S.day) - 1) / 90);
    return { y: m ? Number(m[1]) : 0, season: SEASONS()[si], si, d: ((F4.doy(S.day) - 1) % 90) + 1, text, phase: (G.PHASES || [])[S.phase] || "" };
  };
  const edge = (x, end) => {
    const si = SEASONS().indexOf(x);
    if (si >= 0) return end ? (si + 1) * 90 : si * 90 + 1;
    return Math.max(1, Math.min(360, Number(x) || 1));
  };
  const inRange = (doy, from, to) => (from <= to ? doy >= from && doy <= to : doy >= from || doy <= to);
  // 予定の一行が含む季節
  F4.seasonsOf = (e) => SEASONS().filter((s, i) => inRange(i * 90 + 45, edge(e.from), edge(e.to, true)));
  // 予定の一行の時期の言い方（「秋」「春から夏」「一年じゅう」）
  F4.whenText = (e) => {
    const ss = F4.seasonsOf(e);
    if (ss.length >= 4) return "一年じゅう";
    if (ss.length <= 1) return ss[0] || F4.seasonOf(edge(e.from));
    const a = SEASONS().includes(e.from) ? e.from : F4.seasonOf(edge(e.from)), b = SEASONS().includes(e.to) ? e.to : F4.seasonOf(edge(e.to, true));
    return `${a}から${b}`;
  };

  // ---------------------------------------------------------------- 人の見分けと予定
  F4.joinable = (id) => !!(P()[id] && P()[id].join);
  F4.schedule = (id, S) => {
    S = S === undefined ? G.S : S;
    const own = S && S.f4 && S.f4.sched && S.f4.sched[id];
    if (own) return own;
    const p = P()[id];
    if (!p) return null;
    const s = p.schedule || (p.join && p.join.schedule) || (D.F4_SCHEDULE || {})[id];
    return s && s.length ? s.filter((e) => D.LOCS[e.loc]) : null;
  };
  // day の日にどこに居るか：{ loc, note, e } / { away: true }（予定の無い時期・会えなくなった）/ null（予定が無い人）
  F4.whereOn = (id, S, day) => {
    S = S || G.S;
    if (S && S.f4 && S.f4.away && S.f4.away[id]) return { away: true };
    const sc = F4.schedule(id, S);
    if (!sc) return null;
    const shift = (S && S.f4 && S.f4.shift && S.f4.shift[id]) || 0;
    const doy = F4.doy((day == null ? (S ? S.day : 1) : day) - shift);
    const e = sc.find((x) => inRange(doy, edge(x.from), edge(x.to, true)));
    return e ? { loc: e.loc, note: e.note || "", e } : { away: true };
  };
  F4.whereNow = (id, S) => F4.whereOn(id, S);
  // 今の冒険で「誘う」町：今の居場所が町ならそこ、予定の無い時期は無し、予定が無い人や野に居る時期は誘える町（join.home）
  F4.home = (id, S) => {
    const p = P()[id];
    const base = as(p && p.join && p.join.home);
    const w = F4.whereNow(id, S);
    if (w && w.loc && D.LOCS[w.loc].type === "town") return [w.loc];
    if (w && w.away) return [];
    return base;
  };

  // ---------------------------------------------------------------- 出来事の索引（一度だけ作る。出来事が足されたら作り直す）
  let IX = null;
  const branches = (c) => {
    // 選択肢から先へ進む枝：[{ to, how "pick"|"ok"|"ng"|"win" }]・仲間になる枝：[{ ids, how }]・会えなくなる枝：[{ ids }]
    const nx = [], jn = [], dead = [];
    const look = (o, how) => {
      if (!o) return;
      if (o.next) nx.push({ to: o.next, how });
      if (o.c2join) jn.push({ ids: as(o.c2join), how });
      if (o.c2dead) dead.push({ ids: as(o.c2dead) });
      if (o.f4away) dead.push({ ids: as(o.f4away) });
      if (o.win) look(o.win, "win");
    };
    if (c.next) nx.push({ to: c.next, how: c.fight ? "win" : "pick" });
    look(c.ok, c.fight ? "win" : "ok");
    look(c.ng, "ng");
    look(c.win, "win");
    return { nx, jn, dead };
  };
  F4.index = () => {
    if (IX && IX.n === D.EVENTS.length) return IX;
    const byId = {}, prev = {}, joins = {}, lost = {}, prim = new Map();
    D.EVENTS.forEach((e) => {
      byId[e.id] = e;
      const p0 = as(e.c2)[0];
      prim.set(e, P()[p0] ? p0 : null);
      (e.choices || []).forEach((c, i) => {
        const { nx, jn, dead } = branches(c);
        nx.forEach(({ to, how }) => (prev[to] = prev[to] || []).push({ from: e.id, i, how }));
        jn.forEach(({ ids, how }) => ids.forEach((id) => (joins[id] = joins[id] || []).push({ ev: e.id, i, how })));
        dead.forEach(({ ids }) => ids.forEach((id) => { const l = (lost[id] = lost[id] || []); if (!l.includes(e.title)) l.push(e.title); }));
      });
    });
    IX = { n: D.EVENTS.length, byId, prev, joins, lost, prim, routes: {}, base: {}, entry: new Map() };
    return IX;
  };
  // 加わる出来事までの流れ：[{ e, i（選んだ選択肢）, how（どの枝で進むか） }]（入口は w > 0 の出来事）。入口ごとにいちばん短い流れ
  F4.routes = (id) => {
    const ix = F4.index();
    if (ix.routes[id]) return ix.routes[id];
    const out = [];
    const seen = new Set();
    (ix.joins[id] || []).forEach((j) => {
      const key = j.ev + ":" + j.i;
      if (seen.has(key)) return;
      seen.add(key);
      const q = [[{ e: ix.byId[j.ev], i: j.i, how: j.how }]];
      const vis = new Set([j.ev]);
      let found = null;
      while (q.length && !found) {
        const path = q.shift();
        const head = path[0].e;
        if (head.w > 0 || !(ix.prev[head.id] || []).length || path.length > 7) { found = path; break; }
        (ix.prev[head.id] || []).forEach((p) => {
          if (vis.has(p.from)) return;
          vis.add(p.from);
          q.push([{ e: ix.byId[p.from], i: p.i, how: p.how }, ...path]);
        });
      }
      if (found) out.push(found);
    });
    const byEntry = {};
    out.sort((a, b) => a.length - b.length).forEach((r) => { if (!byEntry[r[0].e.id]) byEntry[r[0].e.id] = r; });
    ix.routes[id] = Object.values(byEntry);
    return ix.routes[id];
  };
  // その人の「元の居場所」（誘える町と、加わる流れの入口の where）
  F4.basePlaces = (id) => {
    const ix = F4.index();
    if (ix.base[id]) return ix.base[id];
    const p = P()[id];
    const s = new Set(as(p && p.join && p.join.home));
    F4.routes(id).forEach((r) => as(r[0].e.where).forEach((w) => s.add(w)));
    ix.base[id] = s;
    return s;
  };
  // 加わる流れの入口になる出来事 → その流れで仲間になる人（ディルとカイデルの出来事なら両方）
  const owners = () => {
    const ix = F4.index();
    if (ix.owners) return ix.owners;
    ix.owners = new Map();
    Object.keys(P()).filter(F4.joinable).forEach((id) => F4.routes(id).forEach((r) => {
      const e = r[0].e;
      if (!(e.w > 0)) return;
      const l = ix.owners.get(e) || [];
      if (!l.includes(id)) l.push(id);
      ix.owners.set(e, l);
    }));
    return ix.owners;
  };
  // 出来事の持ち主（その人の予定に合わせて起きる人）：主が仲間になる人ならその人、でなければ流れで仲間になる最初の人
  F4.ownerOf = (e) => {
    const p = F4.index().prim.get(e);
    return p && F4.joinable(p) ? p : (owners().get(e) || [])[0] || null;
  };
  // その人の出会いの出来事か（主がその人で w > 0・話す出来事でない・元の居場所で起きる／加わる流れの入口）
  F4.isEntry = (e) => {
    const ix = F4.index();
    if (ix.entry.has(e)) return ix.entry.get(e);
    const id = ix.prim.get(e);
    const r = !!((id && F4.joinable(id) && e.w > 0 && !e.c2talk && as(e.where).some((w) => F4.basePlaces(id).has(w))) || owners().has(e));
    ix.entry.set(e, r);
    return r;
  };
  F4.entryOf = (e, id) => F4.isEntry(e) && (F4.index().prim.get(e) === id || (owners().get(e) || []).includes(id));
  const typeOf = (w) => (D.LOCS[w] ? D.LOCS[w].type : ["town", "wild", "dungeon"].includes(w) ? w : w === "capital" || w === "port" ? "town" : "");
  // 出会いの出来事は、その居場所で起きるか（同じ場所か、同じ種類の場所）
  const fits = (e, loc) => as(e.where).includes(loc) || as(e.where).some((w) => typeOf(w) && typeOf(w) === D.LOCS[loc].type);

  // ---------------------------------------------------------------- 出来事を予定に合わせる
  const adjusted = (S) => {
    const ix = F4.index();
    const out = [];
    const back = new Map();
    const want = (S.f4 && S.f4.want) || [];
    D.EVENTS.forEach((e) => {
      if (!F4.isEntry(e)) { out.push(e); return; }
      const id = F4.ownerOf(e);
      const w = F4.whereNow(id, S);
      if (w && w.away) return;
      let c = e;
      if (w && w.loc) {
        if (!fits(e, w.loc)) return;
        if (!(e.where.length === 1 && e.where[0] === w.loc)) c = Object.assign({}, e, { where: [w.loc] });
      }
      if (want.some((x) => F4.entryOf(e, x))) c = Object.assign({}, c, { w: c.w * WANT_W });
      if (c !== e) back.set(c, e);
      out.push(c);
    });
    return { out, back };
  };
  // 「訪ねる」の一覧を作る間だけ、予定合わせの結果を使い回す（人ごとに同じものを作り直していて遅かった。中身は同じ）
  let nowMemo = null;
  F4.eventsNow = (S) => {
    S = S || G.S;
    if (nowMemo && nowMemo.S === S) return nowMemo.out || (nowMemo.out = adjusted(S).out);
    return adjusted(S).out;
  };
  const baseRandom = G.randomEvent;
  G.randomEvent = () => {
    const S = G.S;
    if (!S) return baseRandom();
    const all = D.EVENTS;
    const { out, back } = adjusted(S);
    D.EVENTS = out;
    let r;
    try { r = baseRandom(); } finally { D.EVENTS = all; }
    return (r && back.get(r)) || r;
  };
  // 予定合わせの結果を、出会いの出来事の持ち主ごとに分ける（並びはそのまま）。「訪ねる」の一覧を作る間は使い回す
  // （人ごとに全部の出来事を見直していて、ランダムプレイの時間の 2 割ほどを使っていた。Q6。中身は同じ）
  const byOwner = (S) => {
    if (nowMemo && nowMemo.S === S && nowMemo.byOwner) return nowMemo.byOwner;
    const ix = F4.index();
    const m = new Map();
    for (const e of F4.eventsNow(S)) {
      const o = ix.byId[e.id] || e;
      if (!F4.isEntry(o)) continue;
      for (const id of new Set([ix.prim.get(o), ...(owners().get(o) || [])])) {
        if (!id) continue;
        if (!m.has(id)) m.set(id, []);
        m.get(id).push(e);
      }
    }
    if (nowMemo && nowMemo.S === S) nowMemo.byOwner = m;
    return m;
  };
  // いま、ここで起きうるその人の出会いの出来事
  F4.entriesHere = (id, S) => {
    S = S || G.S;
    if (!S) return [];
    const tags = G.eventTags();
    return (byOwner(S).get(id) || []).filter((e) => e.where.some((w) => tags.includes(w)) && !(e.once && S.flags["ev:" + e.id]) && (!e.cond || e.cond(S)));
  };

  // 会えなくなった人を仲間に加える選択肢は出さない（ほかに選択肢があるときだけ）
  const baseChoices = G.eventChoices;
  G.eventChoices = () => {
    const list = baseChoices();
    const S = G.S;
    if (!S || !S.f4 || !S.f4.away) return list;
    const keep = list.filter(({ c }) => !branches(c).jn.some(({ ids }) => ids.some((id) => S.f4.away[id])));
    return keep.length ? keep : list;
  };
  const baseJoin = G.c2Join;
  let curEvent = null;
  if (baseJoin) G.c2Join = (id) => {
    const S = G.S;
    if (S && S.f4 && S.f4.away && S.f4.away[id]) return false;
    const r = baseJoin(id);
    if (r && S) {
      const rec = G.codexPerson && G.codexPerson(id);
      if (rec) { if (curEvent && !rec.via) rec.via = curEvent; F4.seenAt(id, S); }
    }
    return r;
  };
  const baseChoose = G.chooseEvent;
  G.chooseEvent = (i) => {
    curEvent = G.S && G.S.event;
    try { return baseChoose(i); } finally { curEvent = null; }
  };
  // 出来事の結果：予定を書き換える（f4move）・会えなくなる（f4away。c2dead も図鑑に残す）
  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    const S = G.S;
    if (!o || !S) return;
    const f = (S.f4 = S.f4 || {});
    as(o.f4move).forEach((m) => { if (m && P()[m.id] && m.schedule) (f.sched = f.sched || {})[m.id] = m.schedule; });
    const ev = curEvent && F4.index().byId[curEvent];
    [...as(o.f4away), ...as(o.c2dead)].forEach((id) => {
      if (!P()[id]) return;
      if (as(o.f4away).includes(id)) (f.away = f.away || {})[id] = curEvent || 1;
      const rec = G.codexPerson && G.codexPerson(id);
      if (rec && ev && !rec.lost) { rec.lost = ev.title; changed(); }
    });
  };

  // ---------------------------------------------------------------- 町と場所で：顔なじみを誘う（今の居場所に合わせる）・知っている人を訪ねる
  const knows = (id) => !!((G.codexPerson && G.codexPerson(id)) || Object.keys(prof().know[id] || {}).length);
  F4.knows = knows;
  const baseActs = G.exploreActions;
  G.exploreActions = () => {
    const groups = baseActs();
    const S = G.S;
    if (!S || S.travel || S.mode !== "explore" || !G.c2State) return groups;
    const L = G.loc();
    const m = G.c2State(S);
    if (L.type === "town") {
      const here = Object.keys(P()).filter((id) => m.met[id] && F4.joinable(id) && F4.home(id, S).includes(S.loc) && G.c2CanJoin(id, S));
      const g = groups.find((x) => x.title === "顔なじみ");
      const others = g ? g.list.filter((a) => !a.id.startsWith("c2inv:")) : [];
      const list = [...others, ...here.map((id) => ({ id: "c2inv:" + id, label: `${P()[id].name}を誘う`, sub: P()[id].join.cls, kw: ["誘", P()[id].name] }))];
      if (g) { if (list.length) g.list = list; else groups.splice(groups.indexOf(g), 1); }
      else if (list.length) groups.push({ title: "顔なじみ", list });
    }
    // 訪ねる：図鑑で知っている人が、いまここに居て、出会いの出来事を起こせるとき（今の冒険でまだ会っていない人）
    if (!(L.type === "dungeon" && S.depth > 0)) {
      nowMemo = { S, out: null };
      let seek;
      try { seek = Object.keys(P()).filter((id) => F4.joinable(id) && knows(id) && !m.met[id] && !(m.gone || {})[id] && F4.entriesHere(id, S).length); } finally { nowMemo = null; }
      if (seek.length) groups.push({ title: "訪ねる（図鑑で知っている人）", list: seek.map((id) => ({
        id: "f4seek:" + id, label: `${F4.nameKnown(id)}を訪ねる`, sub: (F4.whereNow(id, S) || {}).note || "ここにいるはず", kw: ["訪", "探", F4.nameKnown(id)],
      })) });
    }
    return groups;
  };
  const baseAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "f4seek") return baseAct(head, arg, a);
    const list = F4.entriesHere(arg);
    if (!list.length) return;
    G.log("you", `${F4.nameKnown(arg)}を訪ねる`);
    G.pass(1);
    const e = G.pick(list);
    G.startEvent(F4.index().byId[e.id] || e);
  };

  // ---------------------------------------------------------------- 噂（酒場）と尋ね人の貼り紙（ギルド）
  F4.titleOf = (id) => {
    const q = (D.F2_PEOPLE || {})[id], p = P()[id] || {};
    return (q && q.title) || (p.join && p.join.cls) || p.name || id;
  };
  // 名前：かつての冒険か今の冒険で会った人は名前、知らない人は肩書き
  F4.nameKnown = (id) => {
    const met = (G.codexPerson && G.codexPerson(id)) || (G.S && G.c2Met && G.c2Met(id, G.S));
    const p = P()[id] || {};
    return met ? p.short || p.name || id : F4.titleOf(id);
  };
  const whoText = (p) => ({ elf: "エルフの", beast: "獣人の" }[p.race] || "") + (p.age < 14 ? "子" : p.sex === "男" ? "男" : "女");
  const placeName = (l) => (D.LOCS[l] ? D.LOCS[l].name : l);
  F4.placeName = placeName;
  F4.fill = (t, id, e) => String(t)
    .replace(/\{name\}/g, F4.nameKnown(id)).replace(/\{title\}/g, F4.titleOf(id)).replace(/\{who\}/g, whoText(P()[id] || {}))
    .replace(/\{place\}/g, e ? placeName(e.loc) : "どこか").replace(/\{when\}/g, e ? F4.whenText(e) : "いま").replace(/\{note\}/g, (e && e.note) || "");
  const prof = () => {
    if (!G.P) G.P = { trophies: {}, graves: [] };
    const f = G.P.f4 || (G.P.f4 = {});
    f.want = f.want || {};
    f.know = f.know || {};
    return f;
  };
  F4.profile = prof;
  const changed = () => { if (G.onCodexChange) try { G.onCodexChange(); } catch {} };
  // 噂で聞いた居場所を profile に残す（季節ごと）
  F4.learn = (id, e, how) => {
    const k = prof().know[id] || (prof().know[id] = {});
    F4.seasonsOf(e).forEach((s) => { const key = e.loc + "|" + s; if (!k[key]) k[key] = how || "heard"; });
    changed();
  };
  // 噂を一つ：予定のある人のうち、今の冒険でまだ仲間になっていない人（狙った人を先に・まだ聞いていない時期を先に）
  F4.rumor = (S) => {
    S = S || G.S;
    if (!S) return null;
    const f = (S.f4 = S.f4 || {});
    f.heard = f.heard || {};
    const R = D.F4_RUMORS || {};
    const want = f.want || [];
    const m = G.c2State ? G.c2State(S) : { joined: {}, gone: {} };
    const pool = Object.keys(P()).filter((id) => F4.joinable(id) && !m.joined[id] && F4.schedule(id, S));
    if (!pool.length) return null;
    const ws = pool.filter((id) => want.includes(id));
    const id = ws.length && G.rand() < 0.7 ? G.pick(ws) : G.pick(pool);
    f.heard[id] = 1;
    if ((f.away || {})[id] || (m.gone || {})[id]) return { id, text: F4.fill(G.pick(R.gone || ["{name}の噂は聞かない。"]), id, null), gone: true };
    const sc = F4.schedule(id, S);
    const k = prof().know[id] || {};
    const fresh = sc.filter((e) => F4.seasonsOf(e).some((s) => !k[e.loc + "|" + s]));
    const e = G.pick(fresh.length ? fresh : sc);
    const year = F4.seasonsOf(e).length >= 4;
    const t = G.pick(year ? R.always || ["{name}なら、いつも{place}にいる。"] : want.includes(id) && (R.want || []).length ? R.want : R.when || ["{name}なら、{when}は{place}にいる。"]);
    const text = F4.fill(t, id, e); // 名前は聞く前の知り方で
    F4.learn(id, e, "heard");
    return { id, text, e };
  };
  const baseFacActions = G.facActions;
  G.facActions = () => {
    const groups = baseFacActions();
    const S = G.S;
    if (!S || S.fac !== "guild") return groups;
    const g = groups.find((x) => x.title && x.title.startsWith("冒険者ギルド"));
    const a = { id: "guild:f4ask", label: "尋ね人の貼り紙を見る", sub: "1日1回・誰がいつどこにいるか、少しだけ", disabled: !!(S.f4 && S.f4.ask === S.day), kw: ["尋ね人", "貼り紙", "人探し"] };
    if (g) { g.list = g.list.filter((x) => x.id !== "guild:none"); g.list.push(a); } else groups.unshift({ title: "冒険者ギルド", list: [a] });
    return groups;
  };
  const baseFacAct = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (S && head === "guild" && arg === "f4ask") {
      (S.f4 = S.f4 || {}).ask = S.day;
      G.log("you", "尋ね人の貼り紙を見る");
      G.pass(1);
      const r = F4.rumor(S);
      if (r) { G.say(`貼り紙の隅に、走り書きが足されている。「${r.text}」`); G.memo("貼り紙：" + r.text, { person: r.id }); }
      else G.say(G.pick((D.F4_RUMORS || {}).none || ["目ぼしい貼り紙はなかった。"]));
      return;
    }
    if (S && head === "tavern" && arg === "rumor" && S.gold >= 2 && G.rand() < (((S.f4 || {}).want || []).length ? 0.45 : 0.3)) {
      const r = F4.rumor(S);
      if (r) {
        S.gold -= 2;
        G.log("you", "噂を聞く");
        G.say(`酔った傭兵が声をひそめた。「${r.text}」`);
        G.memo("噂：" + r.text, { person: r.id });
        G.pass(1);
        return;
      }
    }
    return baseFacAct(head, arg, a);
  };

  // ---------------------------------------------------------------- 新しい冒険：予定の揺れと、狙う人
  const baseNew = G.newGame;
  G.newGame = (opt) => {
    const S = baseNew(opt);
    const shift = {};
    Object.keys(P()).filter((id) => F4.joinable(id) && F4.schedule(id, null)).forEach((id) => { shift[id] = Math.round((G.rand() * 2 - 1) * SHIFT); });
    S.f4 = { shift, want: Object.keys(prof().want).filter((id) => prof().want[id] && F4.joinable(id)), heard: {} };
    return S;
  };

  // ---------------------------------------------------------------- 図鑑：会った場所と時期・狙う印
  F4.seenAt = (id, S) => {
    S = S || G.S;
    const rec = G.codexPerson && G.codexPerson(id);
    if (!rec || !S || !D.LOCS[S.loc]) return;
    const key = S.loc + "|" + F4.seasonOf(S.day);
    const s = rec.seen || (rec.seen = {});
    const p = rec.places || (rec.places = {});
    if (!s[key] || !p[S.loc]) { s[key] = 1; p[S.loc] = 1; changed(); }
  };
  const baseStart = G.startEvent;
  G.startEvent = (ev) => {
    const ok = baseStart(ev);
    const S = G.S;
    if (ok && S && S.event && G.f2 && G.f2.peopleInEvent) G.f2.peopleInEvent(S.event).forEach((id) => F4.seenAt(id, S));
    return ok;
  };
  // 会える場所と時期（季節ごと）：{ 春: { loc, how "met"|"heard" } | null, ... }。知らない季節は null
  F4.knownSeasons = (id) => {
    const rec = (G.codexPerson && G.codexPerson(id)) || {};
    const out = {};
    SEASONS().forEach((s) => (out[s] = null));
    const put = (key, how) => { const [loc, s] = key.split("|"); if (D.LOCS[loc] && s in out && (!out[s] || how === "met")) out[s] = { loc, how }; };
    Object.keys(prof().know[id] || {}).forEach((k) => put(k, "heard"));
    Object.keys(rec.seen || {}).forEach((k) => put(k, "met"));
    return out;
  };
  // 「秋の王都レオネスト」のような言い方の一覧（会った場所と時期）
  F4.metPlaces = (id) => {
    const rec = G.codexPerson && G.codexPerson(id);
    if (!rec) return [];
    const seen = Object.keys(rec.seen || {}).map((k) => k.split("|")).filter(([l]) => D.LOCS[l]);
    const out = SEASONS().flatMap((s) => seen.filter(([, x]) => x === s).map(([l]) => `${s}の${placeName(l)}`));
    Object.keys(rec.places || {}).forEach((l) => { if (D.LOCS[l] && !seen.some(([x]) => x === l)) out.push(placeName(l)); });
    return out;
  };
  F4.wanted = (id) => !!prof().want[id];
  F4.canWant = (id) => F4.joinable(id) && knows(id);
  F4.wantCount = () => Object.keys(prof().want).filter((id) => prof().want[id]).length;
  F4.setWant = (id, on) => {
    const w = prof().want;
    if (on) {
      if (!F4.canWant(id) || F4.wantCount() >= WANT_MAX) return false;
      w[id] = 1;
    } else delete w[id];
    if (G.S && G.S.f4) G.S.f4.want = Object.keys(w).filter((x) => w[x]); // 今の冒険にも効かせる
    changed();
    return true;
  };
  F4.WANT_MAX = WANT_MAX;

  // ---------------------------------------------------------------- 仲間にする方法を組み立てる
  const WHERE_WORD = { town: "どこかの町", wild: "野", dungeon: "迷宮", any: "各地", capital: "都", port: "港町", snow: "雪の土地", realm: "使徒の土地" };
  const whereText = (w) => {
    const names = [];
    as(w).forEach((x) => { const n = D.LOCS[x] ? D.LOCS[x].name : WHERE_WORD[x]; if (n && !names.includes(n)) names.push(n); });
    return names.slice(0, 3).join("・") || "どこか";
  };
  // 出会いの出来事が起きる所：予定がある人は、その出来事が起きる時期と場所（「秋から冬の凍てつく街道」）
  const entryWhere = (id, e) => {
    const sc = F4.schedule(id, null);
    if (!sc) return whereText(e.where);
    const ok = sc.filter((x) => fits(e, x.loc));
    if (!ok.length) return whereText(e.where);
    if (ok.length === sc.length && new Set(ok.map((x) => x.loc)).size === 1 && F4.seasonsOf(ok[0]).length >= 4) return placeName(ok[0].loc);
    return ok.map((x) => `${F4.whenText(x)}の${placeName(x.loc)}`).join("・");
  };
  const nameOf = (id) => { const p = P()[id]; return (p && (p.short || p.name)) || ((D.F2_PEOPLE || {})[id] || {}).name || id; };
  // 条件の関数を試しに呼んで、何が要るかを調べる（誰を連れているか・誰と知り合っているか・好感度・何日目から）。状態は書き換えない
  const probe = (fn, self) => {
    if (typeof fn !== "function") return null;
    const selfs = as(self);
    const keep = { S: G.S, c2Has: G.c2Has, c2Met: G.c2Met, c2Gone: G.c2Gone, affOf: G.affOf, c2In: G.c2In };
    const run = (has, day) => {
      const rec = { has: new Set(), met: new Set(), aff: new Set() };
      const S = { day, flags: {}, counters: new Proxy({}, { get: () => 1 }), companions: [], c2: { met: {}, joined: {}, gone: {} }, aff: {}, fame: 999, gold: 9999, stats: new Proxy({}, { get: () => 99 }), loc: "", inv: {} };
      G.S = S;
      G.c2Has = (x) => { rec.has.add(x); return has; };
      G.c2In = (x) => { rec.has.add(x); return has ? {} : null; };
      G.c2Met = (x) => { if (selfs.includes(x)) return false; rec.met.add(x); return true; };
      G.c2Gone = () => false;
      G.affOf = (x) => { rec.aff.add(x); return 100; };
      let ok;
      try { ok = !!fn(S); } catch { ok = null; }
      return { ok, rec };
    };
    try {
      const t = run(true, 999), f = run(false, 999);
      const out = { need: [], not: [], met: [...t.rec.met, ...f.rec.met], aff: t.rec.aff.size > 0, day: 0 };
      if (t.ok && f.ok === false) out.need = [...t.rec.has];
      if (f.ok && t.ok === false) out.not = [...f.rec.has];
      if (t.ok || f.ok) for (const d of [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50]) { if (run(!!t.ok, d).ok) { out.day = d === 2 ? 0 : d; break; } }
      out.met = [...new Set(out.met)].filter((x) => !selfs.includes(x));
      if (t.ok === false && f.ok === false) out.flag = true; // 旗（出来事の流れ）が要る
      return out;
    } finally { Object.assign(G, { c2Has: keep.c2Has, c2Met: keep.c2Met, c2Gone: keep.c2Gone, affOf: keep.affOf, c2In: keep.c2In }); G.S = keep.S; }
  };
  const condWords = (pr) => {
    if (!pr) return [];
    const w = [];
    if (pr.day) w.push(`旅に出て${pr.day}日目ごろから`);
    pr.need.forEach((x) => w.push(`${nameOf(x)}を連れていると`));
    pr.not.forEach((x) => w.push(`${nameOf(x)}を連れていないとき`));
    pr.met.forEach((x) => w.push(`${nameOf(x)}と知り合ってから`));
    if (pr.aff) w.push("好感度しだい");
    if (pr.flag) w.push("何かの出来事のあとで");
    return w;
  };
  const stepNeeds = (c, how) => {
    const w = [];
    if (c.cost) w.push(`${c.cost}G`);
    if (c.stat) {
      const { nx, jn } = branches(c);
      const both = [...nx, ...jn].some((b) => b.how === "ng") && [...nx, ...jn].some((b) => b.how === "ok");
      w.push(both ? `${c.stat}の判定（${c.diff || "普通"}・しくじっても進む）` : how === "ng" ? `${c.stat}の判定（${c.diff || "普通"}）にしくじる` : `${c.stat}の判定（${c.diff || "普通"}）に成功`);
    }
    if (how === "win" || c.fight) w.push("戦って勝つ");
    if (c.cond) w.push(...condWords(probe(c.cond)));
    return w;
  };
  const quote = (t) => (/^「.*」$/.test(t) ? t : t.includes("「") ? `『${t}』` : `「${t}」`);
  F4.routeLines = (id, r) => {
    const lines = [];
    const e0 = r[0].e;
    const cw = condWords(probe(e0.cond, [id, ...as(e0.c2)]));
    lines.push(`${entryWhere(id, e0)}で出来事「${e0.title}」${cw.length ? `（${cw.join("・")}）` : ""}`);
    r.forEach((st, k) => {
      const c = (st.e.choices || [])[st.i];
      if (!c) return;
      const need = stepNeeds(c, st.how);
      if (k === r.length - 1) lines.push(`${quote(c.label)}を選ぶと仲間になる${need.length ? `（${need.join("・")}）` : ""}`);
      else lines.push(`${quote(c.label)}${need.length ? `（${need.join("・")}）` : ""}`);
    });
    return lines;
  };
  // 図鑑の「仲間にする方法」：{ ways [[行...]] 確かな道すじ, after 誘い直し, lost 会えなくなる出来事, vague ぼかした一行, sched [{ when, place, note, seasons }] 予定 }
  G.f4How = (id) => {
    const p = P()[id];
    if (!p || !p.join) return null;
    const hint = p.joinHint || (p.join && p.join.joinHint);
    const routes = F4.routes(id).slice(0, 2);
    const full = typeof hint === "string" ? [hint] : hint && hint.full ? as(hint.full) : [];
    const ways = full.length ? [full] : routes.map((r) => F4.routeLines(id, r));
    if (!ways.length) ways.push(["決まった出来事で加わるらしい。"]);
    const after = "一度加われば、離れてもその時期に居る町で誘い直せる（連れていけるのは三人まで。去った人・死んだ人は戻らない）";
    const lost = (F4.index().lost[id] || []).map((t) => `出来事「${t}」の後は会えなくなることがある`);
    const sched = (F4.schedule(id, null) || []).map((e) => ({ when: F4.whenText(e), place: placeName(e.loc), note: e.note || "", seasons: F4.seasonsOf(e) }));
    let vague = hint && hint.vague;
    if (!vague) {
      const r = routes[0];
      const cs = r ? r.map((st) => (st.e.choices || [])[st.i]).filter(Boolean) : [];
      const pr = r ? [probe(r[0].e.cond, [id, ...as(r[0].e.c2)]), ...cs.map((c) => probe(c.cond, id))].filter(Boolean) : [];
      const must = (c) => c.stat && !branches(c).nx.concat(branches(c).jn).some((b) => b.how === "ng");
      vague =
        pr.some((x) => x.need.length) ? "誰かを連れていくと、話が早いらしい。" :
        r && r.some((st) => st.how === "win" || ((st.e.choices || [])[st.i] || {}).fight) ? "腕を見せると、心を開くらしい。" :
        cs.find(must) ? `${cs.find(must).stat}が物を言うらしい。` :
        cs.some((c) => c.cost) ? "いくらか金が要るらしい。" :
        r && r.length > 1 ? "何か困りごとを抱えているらしい。付き合えば道が開けそうだ。" : "声をかければ、話を聞いてくれそうだ。";
    }
    return { ways, after, lost, vague, sched };
  };

  // ---------------------------------------------------------------- 数（手引き・図鑑）
  G.f4Count = () => {
    const c = (G.codex && G.codex().people) || {};
    const ids = Object.keys(P()).filter(F4.joinable);
    const pids = Object.keys(D.F2_PEOPLE || {});
    return {
      people: pids.filter((id) => c[id]).length, peopleAll: pids.length,
      joinable: ids.length, joinMet: ids.filter((id) => c[id]).length, joined: ids.filter((id) => c[id] && c[id].joined).length,
      want: F4.wantCount(),
    };
  };

  // 図鑑をまとめるとき（main.js が codexMerge を呼ぶ）、会った場所・時期と加わった出来事も残す
  if (G.codexMerge) {
    const baseMerge = G.codexMerge;
    G.codexMerge = (a, b) => {
      const out = baseMerge(a, b);
      [a, b].forEach((c) => Object.entries((c && c.people) || {}).forEach(([id, e]) => {
        const o = out.people[id];
        if (!o) return;
        if (e.places) o.places = Object.assign({}, o.places || {}, e.places);
        if (e.seen) o.seen = Object.assign({}, o.seen || {}, e.seen);
        if (e.via && !o.via) o.via = e.via;
        if (e.lost && !o.lost) o.lost = e.lost;
      }));
      return out;
    };
  }
})(globalThis.G = globalThis.G || {});
