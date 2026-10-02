// F4：冒険ごとに顔ぶれが変わる・図鑑に「仲間にする方法」と「会える場所」・次の冒険で「狙う」。DOM には触らない（画面は ui/f4_roster.js）。
// 名前の頭の zz_f4 は、zz_c2_people.js（G.c2Join・G.c2Meet・顔なじみを誘う）と zz_f2_codex.js（図鑑）より後に読ませて包むため。
// 仕組みはデータの形（D.C2_PEOPLE の join と、出来事の c2・c2join・next）だけを見る。特定の人には依存しないので、後から足された人にもそのまま効く。
//
// 冒険の始まり（G.newGame）に、その冒険の顔ぶれを G.rand で決める（seed を固定すれば同じ顔ぶれ）
//   候補：join がある人のうち、always でない人（always：データの always: true か D.F4_ALWAYS）。always の人は毎回居る
//   人数：候補の 36〜50%。地域（誘える町の地方）ごとに割り当て、同じ性別・種族・型に偏らないよう重みを下げながら選ぶ。狙った人は重み 3 倍（必ずではない）
//   居場所：候補（p.places・p.join.places・D.F4_PLACES）があれば一つか二つ。出会いの出来事と「誘う」町がそこに移る。無ければ今の場所のまま
// セーブ（G.S）に足すもの：S.f4 = { pool 候補だった人, cast { id: { at: [場所] | null } } 居る人, want 狙っていた人, heard { id: 1 } 噂で聞いた人, ask 貼り紙を見た日 }
//   古いセーブ（S.f4 が無い）は、今までどおり全員が元の場所に居る
// profile（G.P、冒険をまたぐ）に足すもの：
//   G.P.f4 = { want { id: 1 } 次の冒険で狙う人（三人まで）, heard { id: { loc, at } } 噂で聞いた場所 }
//   G.P.codex.people[id].places { 場所: 1 } 会ったことのある場所 / via 仲間になった出来事の id
// 仲間にする方法（G.f4How）：join と、c2join のある出来事までの next の流れ・判定・戦い・金・条件（cond を試しに呼んで、誰を連れているか・何日目からか）から組み立てる。
//   データに joinHint（文字列か { full, vague }）があれば、それで上書きする
// レーン F＋C（F4）
(function (G) {
  const D = G.data;
  const F4 = (G.f4 = G.f4 || {});
  const P = () => D.C2_PEOPLE || {};
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const WANT_W = 3;   // 狙った人の重み
  const WANT_MAX = 3; // 狙える人数

  // ---------------------------------------------------------------- 人の見分け
  F4.always = (id) => { const p = P()[id]; return !!(p && (p.always || (p.join && p.join.always) || (D.F4_ALWAYS || []).includes(id))); };
  F4.joinable = (id) => !!(P()[id] && P()[id].join);
  F4.candidates = () => Object.keys(P()).filter((id) => F4.joinable(id) && !F4.always(id));
  F4.places = (id) => {
    const p = P()[id];
    if (!p) return [];
    return as(p.places || (p.join && p.join.places) || (D.F4_PLACES || {})[id]).filter((l) => D.LOCS[l]);
  };
  F4.region = (id) => {
    const p = P()[id] || {};
    const home = as(p.join && p.join.home).map((l) => D.LOCS[l]).find(Boolean);
    return (home && home.region) || p.nation || "各地";
  };
  const kindOf = (p) => (p.who && p.who.kind) || (p.join && p.join.cls) || "";

  // ---------------------------------------------------------------- 顔ぶれを決める
  F4.roll = (want) => {
    want = want || {};
    const all = F4.candidates();
    const T = all.length;
    const out = { pool: all.slice(), cast: {}, want: Object.keys(want).filter((id) => want[id] && F4.joinable(id)), heard: {} };
    let target = 0;
    if (T) target = Math.min(T, Math.max(Math.min(T, 2), Math.round(T * (0.36 + G.rand() * 0.14))));
    // 地域ごとの割り当て（端数は乱数で）
    const byR = {};
    all.forEach((id) => (byR[F4.region(id)] = byR[F4.region(id)] || []).push(id));
    const regions = Object.keys(byR);
    const quota = {};
    let given = 0;
    const rem = regions.map((r) => {
      const x = (byR[r].length * target) / (T || 1);
      quota[r] = Math.floor(x);
      given += quota[r];
      return [r, x - quota[r] + G.rand() * 0.5];
    }).sort((a, b) => b[1] - a[1]);
    for (let i = 0; given < target && i < rem.length * 2; i++) {
      const r = rem[i % rem.length][0];
      if (quota[r] < byR[r].length) { quota[r]++; given++; }
    }
    // 偏らないように：選んだ人と同じ性別・種族・型が多いほど重みを下げる
    const picked = [];
    const share = (f, v) => (picked.length ? picked.filter((x) => f(x) === v).length / picked.length : 0);
    const sexOf = (id) => P()[id].sex, raceOf = (id) => P()[id].race, kOf = (id) => kindOf(P()[id]);
    const order = regions.map((r) => [r, G.rand()]).sort((a, b) => a[1] - b[1]).map(([r]) => r);
    // 一人ずつ地域を回る（ある地域だけが先に埋まって、性別の釣り合いが偏らないように）
    let left = true;
    while (left) {
      left = false;
      for (const r of order) {
        const rest = byR[r].filter((id) => !picked.includes(id));
        if (picked.filter((id) => F4.region(id) === r).length >= quota[r] || !rest.length) continue;
        left = true;
        const ws = rest.map((id) => (out.want.includes(id) ? WANT_W : 1) / (1 + 1.6 * share(sexOf, sexOf(id)) + 0.8 * share(raceOf, raceOf(id)) + 0.8 * share(kOf, kOf(id))));
        let x = G.rand() * ws.reduce((a, b) => a + b, 0);
        let k = 0;
        for (; k < rest.length - 1; k++) { x -= ws[k]; if (x <= 0) break; }
        picked.push(rest[k]);
      }
    }
    // 居場所
    const place = (id) => {
      const c = F4.places(id);
      if (!c.length) return null;
      const n = c.length >= 4 ? 2 : 1;
      return c.map((l) => [l, G.rand()]).sort((a, b) => a[1] - b[1]).slice(0, n).map(([l]) => l);
    };
    Object.keys(P()).filter((id) => F4.joinable(id) && F4.always(id)).forEach((id) => { out.cast[id] = { at: place(id) }; });
    picked.forEach((id) => { out.cast[id] = { at: place(id) }; });
    return out;
  };

  // 今の冒険に居るか・どこに居るか（古いセーブ・候補でなかった人・後から足された人は居る）
  F4.present = (id, S) => {
    S = S || G.S;
    if (!S || !S.f4 || !F4.joinable(id) || F4.always(id)) return true;
    if (!(S.f4.pool || []).includes(id)) return true;
    return !!(S.f4.cast || {})[id];
  };
  F4.at = (id, S) => {
    S = S || G.S;
    const c = S && S.f4 && (S.f4.cast || {})[id];
    return c && c.at && c.at.length ? c.at : null;
  };
  // 今の冒険で「誘う」町
  F4.home = (id, S) => {
    const p = P()[id];
    const base = as(p && p.join && p.join.home);
    const at = (F4.at(id, S) || []).filter((l) => D.LOCS[l] && D.LOCS[l].type === "town");
    return at.length ? at : base;
  };
  F4.cast = (S) => {
    S = S || G.S;
    return Object.keys(P()).filter((id) => F4.joinable(id) && F4.present(id, S));
  };

  // ---------------------------------------------------------------- 出来事の索引（一度だけ作る。出来事が足されたら作り直す）
  let IX = null;
  const branches = (c) => {
    // 選択肢から先へ進む枝：[{ to 次の出来事, how "pick"|"ok"|"ng"|"win" }] と、仲間になる枝：[{ ids, how }]
    const nx = [], jn = [];
    const look = (o, how) => {
      if (!o) return;
      if (o.next) nx.push({ to: o.next, how });
      if (o.c2join) jn.push({ ids: as(o.c2join), how });
      if (o.win) look(o.win, "win");
    };
    if (c.next) nx.push({ to: c.next, how: c.fight ? "win" : "pick" });
    look(c.ok, c.fight ? "win" : "ok");
    look(c.ng, "ng");
    look(c.win, "win");
    return { nx, jn };
  };
  F4.index = () => {
    if (IX && IX.n === D.EVENTS.length) return IX;
    const byId = {}, prev = {}, joins = {}, prim = new Map(), mine = {};
    D.EVENTS.forEach((e) => {
      byId[e.id] = e;
      const p0 = as(e.c2)[0];
      prim.set(e, P()[p0] ? p0 : null);
      if (P()[p0]) (mine[p0] = mine[p0] || []).push(e);
      (e.choices || []).forEach((c, i) => {
        const { nx, jn } = branches(c);
        nx.forEach(({ to, how }) => (prev[to] = prev[to] || []).push({ from: e.id, i, how }));
        jn.forEach(({ ids, how }) => ids.forEach((id) => (joins[id] = joins[id] || []).push({ ev: e.id, i, how })));
      });
    });
    IX = { n: D.EVENTS.length, byId, prev, joins, prim, mine, routes: {}, base: {} };
    return IX;
  };
  // 加わる出来事までの流れ：[{ e, i（選んだ選択肢）, how（どの枝で進むか） }]（入口は w > 0 の出来事）。いちばん短い流れを、加わり方ごとに
  F4.routes = (id) => {
    const ix = F4.index();
    if (ix.routes[id]) return ix.routes[id];
    const out = [];
    const seen = new Set();
    (ix.joins[id] || []).forEach((j) => {
      const key = j.ev + ":" + j.i;
      if (seen.has(key)) return;
      seen.add(key);
      // 後ろへ幅優先
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
    // 同じ入口からの流れは、短いものを先に（入口ごとに一つ）
    const byEntry = {};
    out.sort((a, b) => a.length - b.length).forEach((r) => { if (!byEntry[r[0].e.id]) byEntry[r[0].e.id] = r; });
    ix.routes[id] = Object.values(byEntry);
    return ix.routes[id];
  };
  // その人の「元の居場所」（誘える町と、加わる流れの入口の where）。居場所が移ると、ここに重なる出会いの出来事が一緒に移る
  F4.basePlaces = (id) => {
    const ix = F4.index();
    if (ix.base[id]) return ix.base[id];
    const p = P()[id];
    const s = new Set(as(p && p.join && p.join.home));
    F4.routes(id).forEach((r) => as(r[0].e.where).forEach((w) => s.add(w)));
    ix.base[id] = s;
    return s;
  };

  // ---------------------------------------------------------------- 出来事を顔ぶれに合わせる
  // 居ない人が主の出来事は起きない。居場所が移った人の出会いの出来事は、移った先で起きる
  const adjusted = (S) => {
    const ix = F4.index();
    const out = [];
    const back = new Map();
    D.EVENTS.forEach((e) => {
      const id = ix.prim.get(e);
      if (!id || !F4.joinable(id)) { out.push(e); return; }
      if (!F4.present(id, S)) return;
      const at = F4.at(id, S);
      if (at && e.w > 0 && !e.c2talk && as(e.where).some((w) => F4.basePlaces(id).has(w))) {
        const c = Object.assign({}, e, { where: at.slice() });
        back.set(c, e);
        out.push(c);
      } else out.push(e);
    });
    return { out, back };
  };
  F4.eventsNow = (S) => adjusted(S || G.S).out;
  const baseRandom = G.randomEvent;
  G.randomEvent = () => {
    const S = G.S;
    if (!S || !S.f4) return baseRandom();
    const all = D.EVENTS;
    const { out, back } = adjusted(S);
    D.EVENTS = out;
    let e;
    try { e = baseRandom(); } finally { D.EVENTS = all; }
    return (e && back.get(e)) || e;
  };
  // 居ない人を仲間に加える選択肢は出さない（ほかに選択肢があるときだけ）
  const absentJoin = (c, S) => {
    const { jn } = branches(c);
    return jn.some(({ ids }) => ids.some((id) => !F4.present(id, S)));
  };
  const baseChoices = G.eventChoices;
  G.eventChoices = () => {
    const list = baseChoices();
    const S = G.S;
    if (!S || !S.f4) return list;
    const keep = list.filter(({ c }) => !absentJoin(c, S));
    return keep.length ? keep : list;
  };
  // 居ない人は加わらない（念のため。出来事の外から呼ばれたときも）
  const baseJoin = G.c2Join;
  let curEvent = null;
  if (baseJoin) G.c2Join = (id) => {
    const S = G.S;
    if (S && !F4.present(id, S)) return false;
    const r = baseJoin(id);
    if (r && S) {
      const rec = G.codexPerson && G.codexPerson(id);
      if (rec) { if (curEvent && !rec.via) rec.via = curEvent; addPlace(rec, S.loc); }
    }
    return r;
  };
  const baseChoose = G.chooseEvent;
  G.chooseEvent = (i) => {
    curEvent = G.S && G.S.event;
    try { return baseChoose(i); } finally { curEvent = null; }
  };

  // 顔なじみを誘う町を、今の冒険の居場所に合わせる
  const baseActs = G.exploreActions;
  G.exploreActions = () => {
    const groups = baseActs();
    const S = G.S;
    if (!S || !S.f4 || S.travel || G.loc().type !== "town" || !G.c2State) return groups;
    const m = G.c2State(S);
    const here = Object.keys(P()).filter((id) => m.met[id] && F4.joinable(id) && F4.present(id, S) && F4.home(id, S).includes(S.loc) && G.c2CanJoin(id, S));
    let g = groups.find((x) => x.title === "顔なじみ");
    const others = g ? g.list.filter((a) => !a.id.startsWith("c2inv:")) : [];
    const list = [...others, ...here.map((id) => ({ id: "c2inv:" + id, label: `${P()[id].name}を誘う`, sub: P()[id].join.cls, kw: ["誘", P()[id].name] }))];
    if (g) { if (list.length) g.list = list; else groups.splice(groups.indexOf(g), 1); }
    else if (list.length) groups.push({ title: "顔なじみ", list });
    return groups;
  };

  // ---------------------------------------------------------------- 噂（酒場）と尋ね人の貼り紙（ギルド）
  const placeText = (id, S) => {
    const at = F4.at(id, S);
    const locs = at || [...F4.basePlaces(id)].filter((l) => D.LOCS[l]);
    if (locs.length) return locs.map((l) => D.LOCS[l].name).slice(0, 2).join("か");
    const w = [...F4.basePlaces(id)][0];
    return { town: "どこかの町", wild: "どこかの野", dungeon: "どこかの迷宮", forest: "森" }[w] || "どこか";
  };
  const whoText = (p) => {
    const race = { elf: "エルフの", beast: "獣人の" }[p.race] || "";
    const kid = p.age < 14 ? "子" : p.sex === "男" ? "男" : "女";
    return race + kid;
  };
  F4.titleOf = (id) => {
    const q = (D.F2_PEOPLE || {})[id], p = P()[id] || {};
    return (q && q.title) || (p.join && p.join.cls) || p.name || id;
  };
  F4.fill = (t, id, S) => String(t).replace(/\{place\}/g, placeText(id, S)).replace(/\{who\}/g, whoText(P()[id] || {})).replace(/\{title\}/g, F4.titleOf(id));
  const prof = () => {
    if (!G.P) G.P = { trophies: {}, graves: [] };
    const f = G.P.f4 || (G.P.f4 = {});
    f.want = f.want || {};
    f.heard = f.heard || {};
    return f;
  };
  F4.profile = prof;
  const changed = () => { if (G.onCodexChange) try { G.onCodexChange(); } catch {} };
  // 噂を一つ選ぶ。居る・まだ会っていない・まだ聞いていない人（狙った人を先に）。狙った人が居ないときは、ときどき「噂を聞かない」
  F4.rumor = (S) => {
    S = S || G.S;
    if (!S || !S.f4) return null;
    const R = D.F4_RUMORS || {};
    const want = S.f4.want || [];
    const fresh = (id) => !(S.f4.heard || {})[id] && !(G.c2Met && G.c2Met(id, S)) && !(G.c2Has && G.c2In(id, S));
    const gone = want.filter((id) => !F4.present(id, S) && fresh(id));
    if (gone.length && G.rand() < 0.34 && (R.gone || []).length) {
      const id = G.pick(gone);
      S.f4.heard[id] = 1;
      return { id, text: F4.fill(G.pick(R.gone), id, S), gone: true };
    }
    const pool = F4.cast(S).filter(fresh);
    if (!pool.length) return null;
    const ws = pool.filter((id) => want.includes(id));
    const id = ws.length && G.rand() < 0.7 ? G.pick(ws) : G.pick(pool);
    const t = G.pick(want.includes(id) && (R.want || []).length ? R.want : R.seen || ["{place}で、{title}を見たって話だ。"]);
    S.f4.heard[id] = 1;
    const at = F4.at(id, S) || [...F4.basePlaces(id)].filter((l) => D.LOCS[l]);
    prof().heard[id] = { loc: at[0] || "", at: Date.now() };
    changed();
    return { id, text: F4.fill(t, id, S) };
  };
  const baseFacActions = G.facActions;
  G.facActions = () => {
    const groups = baseFacActions();
    const S = G.S;
    if (!S || !S.f4 || S.fac !== "guild") return groups;
    const g = groups.find((x) => x.title && x.title.startsWith("冒険者ギルド"));
    const a = { id: "guild:f4ask", label: "尋ね人の貼り紙を見る", sub: "1日1回・誰がこの世のどこにいるか、少しだけ", disabled: S.f4.ask === S.day, kw: ["尋ね人", "貼り紙", "人探し"] };
    if (g) { g.list = g.list.filter((x) => x.id !== "guild:none"); g.list.push(a); } else groups.unshift({ title: "冒険者ギルド", list: [a] });
    return groups;
  };
  const baseFacAct = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (S && S.f4 && head === "guild" && arg === "f4ask") {
      S.f4.ask = S.day;
      G.log("you", "尋ね人の貼り紙を見る");
      G.pass(1);
      const r = F4.rumor(S);
      if (r) { G.say(`貼り紙の隅に、走り書きが足されている。「${r.text}」`); G.memo("貼り紙：" + r.text); }
      else G.say(G.pick((D.F4_RUMORS || {}).none || ["目ぼしい貼り紙はなかった。"]));
      return;
    }
    if (S && S.f4 && head === "tavern" && arg === "rumor" && S.gold >= 2) {
      const want = (S.f4.want || []).length;
      if (G.rand() < (want ? 0.45 : 0.3)) {
        const r = F4.rumor(S);
        if (r) {
          S.gold -= 2;
          G.log("you", "噂を聞く");
          G.say(`酔った傭兵が声をひそめた。「${r.text}」`);
          G.memo("噂：" + r.text);
          G.pass(1);
          return;
        }
      }
    }
    return baseFacAct(head, arg, a);
  };

  // ---------------------------------------------------------------- 新しい冒険
  const baseNew = G.newGame;
  G.newGame = (opt) => {
    const S = baseNew(opt);
    S.f4 = F4.roll(prof().want);
    return S;
  };

  // ---------------------------------------------------------------- 図鑑：会った場所・狙う印
  const addPlace = (rec, loc) => {
    if (!rec || !loc || !D.LOCS[loc]) return;
    const p = rec.places || (rec.places = {});
    if (!p[loc]) { p[loc] = 1; changed(); }
  };
  const baseStart = G.startEvent;
  G.startEvent = (ev) => {
    const ok = baseStart(ev);
    const S = G.S;
    if (ok && S && S.event && G.f2 && G.f2.peopleInEvent && G.codexPerson) G.f2.peopleInEvent(S.event).forEach((id) => addPlace(G.codexPerson(id), S.loc));
    return ok;
  };
  F4.metPlaces = (id) => {
    const rec = G.codexPerson && G.codexPerson(id);
    return Object.keys((rec && rec.places) || {}).filter((l) => D.LOCS[l]).map((l) => D.LOCS[l].name);
  };
  F4.wanted = (id) => !!prof().want[id];
  F4.canWant = (id) => F4.joinable(id) && !!((G.codexPerson && G.codexPerson(id)) || prof().heard[id]);
  F4.wantCount = () => Object.keys(prof().want).filter((id) => prof().want[id]).length;
  F4.setWant = (id, on) => {
    const w = prof().want;
    if (on) {
      if (!F4.canWant(id) || F4.wantCount() >= WANT_MAX) return false;
      w[id] = 1;
    } else delete w[id];
    changed();
    return true;
  };
  F4.WANT_MAX = WANT_MAX;

  // ---------------------------------------------------------------- 仲間にする方法を組み立てる
  const WHERE_WORD = { town: "どこかの町", wild: "野", dungeon: "迷宮", any: "各地", capital: "都", port: "港町", snow: "雪の土地", realm: "使徒の土地", forest: "森", ruins: "遺跡" };
  const whereText = (w) => {
    const names = [];
    as(w).forEach((x) => { const n = D.LOCS[x] ? D.LOCS[x].name : WHERE_WORD[x]; if (n && !names.includes(n)) names.push(n); });
    return names.slice(0, 3).join("・") || "どこか";
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
      const out = { ok: t.ok !== false || f.ok !== false, need: [], not: [], met: [...t.rec.met, ...f.rec.met], aff: t.rec.aff.size > 0, day: 0, unknown: t.ok === null && f.ok === null };
      if (t.ok && f.ok === false) out.need = [...t.rec.has];
      if (f.ok && t.ok === false) out.not = [...f.rec.has];
      const best = t.ok ? true : false;
      if (t.ok || f.ok) for (const d of [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50]) { if (run(best, d).ok) { out.day = d === 2 ? 0 : d; break; } }
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
  // 選択肢ひとつの要るもの：判定・戦い・金・条件
  const stepNeeds = (c, how, route) => {
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
  // 流れ一つを文に：[入口の一行, 途中の一行..., 加わる一行]
  F4.routeLines = (id, r) => {
    const lines = [];
    const e0 = r[0].e;
    const pr = probe(e0.cond, [id, ...as(e0.c2)]);
    const cw = condWords(pr);
    const moves = F4.places(id).length ? "（冒険によって居場所が変わる）" : "";
    lines.push(`${whereText(e0.where)}で出来事「${e0.title}」${cw.length ? `（${cw.join("・")}）` : ""}${moves}`);
    r.forEach((st, k) => {
      const c = (st.e.choices || [])[st.i];
      if (!c) return;
      const last = k === r.length - 1;
      const need = stepNeeds(c, st.how, r);
      const q = (t) => (/^「.*」$/.test(t) ? t : t.includes("「") ? `『${t}』` : `「${t}」`);
      if (last) lines.push(`${q(c.label)}を選ぶと仲間になる${need.length ? `（${need.join("・")}）` : ""}`);
      else lines.push(`${q(c.label)}${need.length ? `（${need.join("・")}）` : ""}`);
    });
    return lines;
  };
  // 図鑑の「仲間にする方法」。level：full（仲間にしたことがある）/ vague（会っただけ）/ heard（噂だけ）/ none
  G.f4How = (id) => {
    const p = P()[id];
    if (!p || !p.join) return null;
    const hint = p.joinHint || (p.join && p.join.joinHint);
    const routes = F4.routes(id).slice(0, 2);
    const full = typeof hint === "string" ? [hint] : hint && hint.full ? as(hint.full) : [];
    const ways = full.length ? [full] : routes.map((r) => F4.routeLines(id, r));
    if (!ways.length) ways.push(["決まった出来事で加わるらしい。"]);
    const homes = as(p.join.home).map((l) => D.LOCS[l] && D.LOCS[l].name).filter(Boolean);
    const after = homes.length ? `一度加われば、離れても${homes.join("か")}で誘い直せる（連れていけるのは三人まで。去った人・死んだ人は戻らない）` : "";
    // ぼかした一行：会える所と、要るものの手ざわりだけ
    let vague = hint && hint.vague;
    if (!vague) {
      const r = routes[0];
      const at = r ? whereText(r[0].e.where) : homes.join("か") || "どこか";
      const cs = r ? r.map((st) => (st.e.choices || [])[st.i]).filter(Boolean) : [];
      const pr = r ? [probe(r[0].e.cond, [id, ...as(r[0].e.c2)]), ...cs.map((c) => probe(c.cond, id))].filter(Boolean) : [];
      const must = (c) => c.stat && !branches(c).nx.concat(branches(c).jn).some((b) => b.how === "ng");
      const feel =
        pr.some((x) => x.need.length) ? "誰かを連れていくと、話が早いらしい" :
        r && r.some((st) => st.how === "win" || ((st.e.choices || [])[st.i] || {}).fight) ? "腕を見せると、心を開くらしい" :
        cs.find(must) ? `${cs.find(must).stat}が物を言うらしい` :
        cs.some((c) => c.cost) ? "いくらか金が要るらしい" :
        r && r.length > 1 ? "何か困りごとを抱えているらしい。付き合えば道が開けそうだ" : "声をかければ、話を聞いてくれそうだ";
      vague = `${at}で会える。${feel}。`;
    }
    const h = prof().heard[id];
    const heard = h ? `${(D.LOCS[h.loc] || {}).name || "どこか"}のあたりで見かけた、という噂を聞いた。` : "";
    return { ways, after, vague, heard };
  };

  // ---------------------------------------------------------------- 数（手引き・図鑑）
  G.f4Count = () => {
    const c = (G.codex && G.codex().people) || {};
    const ids = Object.keys(P()).filter(F4.joinable);
    const pids = Object.keys(D.F2_PEOPLE || {});
    return {
      people: pids.filter((id) => c[id]).length, peopleAll: pids.length,
      joinable: ids.length, joinMet: ids.filter((id) => c[id]).length, joined: ids.filter((id) => c[id] && c[id].joined).length,
      cast: G.S && G.S.f4 ? F4.cast(G.S).length : ids.length, want: F4.wantCount(),
    };
  };

  // 図鑑をまとめるとき（main.js が codexMerge を呼ぶ）、会った場所と加わった出来事も残す
  if (G.codexMerge) {
    const baseMerge = G.codexMerge;
    G.codexMerge = (a, b) => {
      const out = baseMerge(a, b);
      [a, b].forEach((c) => Object.entries((c && c.people) || {}).forEach(([id, e]) => {
        const o = out.people[id];
        if (!o) return;
        if (e.places) o.places = Object.assign({}, o.places || {}, e.places);
        if (e.via && !o.via) o.via = e.via;
      }));
      return out;
    };
  }
})(globalThis.G = globalThis.G || {});
