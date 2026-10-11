// F4：選んだことが、あとで返ってくる（因果）。持ち主の声「選んでも後で響かない」
//   ・出来事の結果を「覚え」として残す（S.echo.marks）。助けた・見捨てた・裏切った・見逃した相手が、何日かあとに別の場所で現れる（恩返し・仕返し）
//     既存の出来事は書き換えず、D.ECHO_TAGS（出来事 id → どの選択肢のどの結果か）で印を付ける。新しい出来事は結果に echo: "<覚えの鍵>" と書く
//   ・返ってくる出来事は、出来事に echo: "<覚えの鍵>" と recall: "あのときの…の一文" を書く。覚えが熟したら（D.ECHO_KEYS の after 日が過ぎ、別の場所にいる）起きる
//     起きた最初に「あのときの…」の一文をログに出す（k: "echo"。画面は ui/echo_f4.js）。{at} は覚えた場所の名、{ago} は「何日か前」のようなぼかした時
//   ・町の様子：その町での行い（S.echo.town）と、国の評判・悪名・名声から、町の空気（慕われる／嫌われる／名が知られている）を決める
//     着いたときの一文・通行人のひとこと（D.AMBIENT の cond）・施設の「あなたなら」（C10 の状態 echo:loved など）・店の値段・町の出来事が変わる
// セーブに足すもの：S.echo = { marks: [{ k, day, loc, n, done }], town: { 場所 id: 数 } }。古いセーブで無くても動く（無ければ覚えは無し）
// 乱数は G.rand だけ（覚えが熟していないときは乱数を使わない）。悪名は罪が見られたときだけ上がる決まりは変えない（ここは悪名を数えるだけ）。DOM には触らない
// 名前の頭の zzzzzzzzz は、ほかの包み（C10・U14 など）より外側にするため。レーン C＋V（F4）
(function (G) {
  const D = G.data;
  const E = (G.echo = G.echo || {});
  E.LOVED = 3;      // この町での行いの数がこれ以上で慕われる
  E.HATED = -3;     // これ以下で嫌われる
  E.FAME = 60;      // 名が知られている（C10 と同じ）
  E.TRUST = 30;     // 国の評判がこれ以上で、名も知られていれば慕われる
  E.INFAMY = 10;    // 国の悪名がこれ以上で嫌われる
  E.CHANCE = 0.6;   // 覚えが熟しているとき、出来事を引く場面で返ってくる見込み
  E.STALE = 120;    // これより古い覚えは、もう返ってこない
  E.PRICE = { loved: -0.1, hated: 0.2 };   // 店の値段

  const keys = () => D.ECHO_KEYS || {};
  E.st = (S) => {
    S = S || G.S;
    const x = S.echo && typeof S.echo === "object" ? S.echo : (S.echo = {});
    if (!Array.isArray(x.marks)) x.marks = [];
    if (!x.town || typeof x.town !== "object") x.town = {};
    return x;
  };
  const peek = (S) => (S && S.echo && Array.isArray(S.echo.marks) ? S.echo : { marks: [], town: {} });
  const locOf = (id) => (D.LOCS || {})[id] || {};
  const isTown = (id) => locOf(id).type === "town";
  E.placeName = (id) => locOf(id).name || "どこか";

  // ---------------------------------------------------------------- 覚える
  E.add = (S, k) => {
    S = S || G.S;
    const K = keys()[k];
    if (!S || !K) return null;
    const x = E.st(S);
    let m = x.marks.find((a) => a.k === k && !a.done);
    if (m) { m.day = S.day; m.loc = S.loc; m.n = (m.n || 1) + 1; }
    else { m = { k, day: S.day, loc: S.loc, n: 1 }; x.marks.push(m); }
    if (x.marks.length > 60) x.marks.splice(0, x.marks.length - 60);
    if (K.tone && isTown(S.loc)) E.townAdd(S, K.tone, S.loc);
    return m;
  };
  E.townAdd = (S, n, loc) => {
    S = S || G.S;
    loc = loc || S.loc;
    if (!n || !isTown(loc)) return;
    const t = E.st(S).town;
    t[loc] = Math.max(-9, Math.min(9, (t[loc] || 0) + n));
  };
  E.mark = (S, k) => peek(S || G.S).marks.slice().reverse().find((a) => a.k === k) || null;
  E.did = (S, k) => !!E.mark(S, k);
  // 返ってくる時が来たか（まだ返っていない・決まった日が過ぎた・覚えた場所とは別の場所）
  E.ripeMark = (S, k) => {
    S = S || G.S;
    const K = keys()[k];
    if (!S || !K) return null;
    return peek(S).marks.find((a) => a.k === k && !a.done && S.day - a.day >= (K.after || 4) && S.day - a.day <= E.STALE && (K.same || a.loc !== S.loc)) || null;
  };
  E.ripe = (S, k) => !!E.ripeMark(S, k);
  // 噂が届いているか（返ってきたかどうかに関係なく、別の場所で、少し日がたってから）
  E.heard = (S, k, days) => {
    S = S || G.S;
    const m = E.mark(S, k);
    return !!(m && m.loc !== S.loc && S.day - m.day >= (days || 2));
  };
  E.ago = (S, m) => {
    const d = (S || G.S).day - m.day;
    return d <= 7 ? "何日か前" : d <= 20 ? "しばらく前" : d <= 45 ? "ひと月ほど前" : "ずいぶん前";
  };
  E.fill = (S, m, t) => String(t || "").replace(/\{at\}/g, E.placeName(m.loc)).replace(/\{ago\}/g, E.ago(S, m));

  // ---------------------------------------------------------------- 町の空気
  E.townScore = (S, loc) => { S = S || G.S; return (peek(S).town || {})[loc || S.loc] || 0; };
  E.mood = (S, loc) => {
    S = S || G.S;
    loc = loc || (S && S.loc);
    if (!S || !isTown(loc)) return "plain";
    const L = locOf(loc);
    const n = L.nation || L.region;
    const r = (n && S.repute && S.repute[n]) || { rep: 0, inf: 0, wanted: false };
    const t = E.townScore(S, loc);
    if (r.wanted || (r.inf || 0) >= E.INFAMY || t <= E.HATED) return "hated";
    if (t >= E.LOVED || ((r.rep || 0) >= E.TRUST && (S.fame || 0) >= E.FAME)) return "loved";
    if ((S.fame || 0) >= E.FAME) return "known";
    return "plain";
  };
  E.loved = (S) => E.mood(S) === "loved";
  E.hated = (S) => E.mood(S) === "hated";
  E.known = (S) => E.mood(S) === "known";

  // ---------------------------------------------------------------- 既存の出来事の結果に印を付ける（データは書き換えない）
  const REG = new WeakMap();
  E.tagged = 0;
  E.tagAll = () => {
    const tags = D.ECHO_TAGS || {};
    (D.EVENTS || []).forEach((e) => {
      const list = tags[e.id];
      if (!list || e._echoTag) return;
      e._echoTag = true;
      list.forEach((t) => {
        e.choices.forEach((c) => {
          if (!c || c.c10 || !t.pick.test(String(c.label || ""))) return;
          const outs = [];
          const on = t.on || "any";
          if (on === "ok" || on === "any") outs.push(c.ok, c.ok && c.ok.win, c.win);
          if (on === "ng" || on === "any") outs.push(c.ng, c.ng && c.ng.win);
          if (on === "win") outs.push(c.win, c.ok && c.ok.win, c.ng && c.ng.win);
          outs.filter((o) => o && typeof o === "object").forEach((o) => { REG.set(o, t.key); E.tagged++; });
        });
      });
    });
  };
  E.tagAll();
  E.keyOf = (o) => (o && (o.echo || REG.get(o))) || null;

  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (o && S && !S.over) {
      const k = E.keyOf(o);
      if (k) E.add(S, k);
      if (o.town) E.townAdd(S, o.town);
    }
    return apply0(o);
  };

  // ---------------------------------------------------------------- 返ってくる出来事
  const evById = (id) => (D.EVENTS || []).find((x) => x.id === id);
  E.events = () => (D.EVENTS || []).filter((e) => e.echo);
  // 今ここで起きられる、返ってくる出来事
  E.ready = (S) => {
    S = S || G.S;
    if (!S || !S.echo) return [];
    const tags = G.eventTags();
    return E.events().filter((e) => e.where.some((w) => tags.includes(w)) && E.ripe(S, e.echo) && (!e.cond || e.cond(S)));
  };
  const random0 = G.randomEvent;
  G.randomEvent = () => {
    const S = G.S;
    const pool = S ? E.ready(S) : [];
    if (pool.length && G.rand() < E.CHANCE) return G.pick(pool);
    const e = random0();
    // 熟していない返りの出来事は、ふつうの出来事としては起きない（w: 0 で書くが、念のため）
    return e && e.echo && !E.ripe(S, e.echo) ? null : e;
  };
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const S = G.S;
    const e = typeof ev === "string" ? evById(ev) : ev;
    const m = e && e.echo && S ? E.ripeMark(S, e.echo) || E.mark(S, e.echo) : null;
    const at = S ? S.log.length : 0;
    const r = start0(ev);
    if (!r || !m || !S) return r;
    if (!m.done) m.done = S.day;
    if (e.recall) {
      const line = { k: "echo", text: E.fill(S, m, e.recall) };
      const ti = S.log.findIndex((l, i) => i >= at && l.k === "title");
      S.log.splice(ti >= 0 ? ti + 1 : at, 0, line);
    }
    if (e.echoChron) G.chron(E.fill(S, m, e.echoChron));
    return r;
  };

  // ---------------------------------------------------------------- 町での善い行い・見られた罪を、その町の空気に
  const choose0 = G.chooseEvent;
  G.chooseEvent = (i) => {
    const S = G.S;
    const v = S ? S.virtue || 0 : 0;
    const loc = S && S.loc;
    const r = choose0(i);
    if (S && G.S === S && (S.virtue || 0) > v) E.townAdd(S, 1, loc);
    return r;
  };
  const inf0 = G.addInfamy;
  if (inf0) {
    G.addInfamy = (v, at) => {
      const S = G.S;
      if (S && v > 0 && isTown(S.loc)) {
        const L = locOf(S.loc);
        if (at === undefined || at === (L.nation || L.region)) E.townAdd(S, -1, S.loc);
      }
      return inf0(v, at);
    };
  }

  // ---------------------------------------------------------------- 着いたとき
  const hash = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) | 0; return Math.abs(x); };
  E.arriveLine = (S) => {
    const mood = E.mood(S);
    const lines = (D.ECHO_ARRIVE || {})[mood];
    if (!lines || !lines.length) return "";
    if (mood === "hated" && G.wanted && G.wanted()) return "";   // 手配中の町は M3 の一言がある
    return lines[hash(S.loc + ":" + S.day) % lines.length];
  };
  const arrive0 = G.arrive;
  if (arrive0) {
    G.arrive = (dest) => {
      const r = arrive0(dest);
      const S = G.S;
      const first = !!(S && S.u14arr && S.u14arr.loc === dest && S.u14arr.first && S.u14arr.turn === S.turn);   // はじめての町は U14 の一言（ECHO_FIRST）で足りる
      if (S && !S.over && !first && S.loc === dest && S.mode === "explore" && isTown(dest)) {
        const t = E.arriveLine(S);
        if (t) G.say(t);
      }
      return r;
    };
  }
  // はじめての町の「誰もあなたの顔を知らない」は、名が知られていれば言わない
  if (G.u14 && G.u14.firstLine) {
    const first0 = G.u14.firstLine;
    G.u14.firstLine = (k) => {
      const S = G.S;
      const mood = S ? E.mood(S) : "plain";
      const lines = (D.ECHO_FIRST || {})[mood];
      return lines && lines.length ? lines[Math.abs(k | 0) % lines.length] : first0(k);
    };
  }

  // ---------------------------------------------------------------- 施設の「あなたなら」（C10 の状態に足す）
  const C = G.c10;
  if (C && C.STATES) {
    C.STATES["echo:loved"] = { tag: "町の顔なじみ", cond: (S) => E.mood(S) === "loved" };
    C.STATES["echo:hated"] = { tag: "町の目", cond: (S) => E.mood(S) === "hated" };
    C.STATES["echo:known"] = { tag: "名声", cond: (S) => E.mood(S) === "known" || E.mood(S) === "loved" };
    if (C.HINT) C.HINT["echo:loved"] = "この町で慕われていれば";
  }

  // ---------------------------------------------------------------- 店の値段（慕われていれば少しまけ、嫌われていれば吹っかけられる）
  E.priceAdj = (S, id) => {
    const it = D.ITEMS[id];
    const rate = E.PRICE[E.mood(S)] || 0;
    return it && rate ? Math.round(it.price * rate) : 0;
  };
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    if (!S || S.fac !== "shop" || !E.PRICE[E.mood(S)]) return g;
    g.forEach((grp) => (grp.list || []).forEach((a) => {
      if (!String(a.id).startsWith("shop:buy:")) return;
      const adj = E.priceAdj(S, a.id.slice(9));
      const m = /^(\d+)G/.exec(String(a.sub || ""));
      if (!adj || !m) return;
      const p = Math.max(1, +m[1] + adj);
      a.sub = String(a.sub).replace(/^\d+G/, `${p}G`);
      a.disabled = a.disabled || S.gold < p;
    }));
    return g;
  };
  // 店に入ったときの一言（値が変わるわけを、町の様子で分かるように）
  E.SHOP_LINE = {
    loved: "店の主があなたに気づいて、値札の端を指で隠し、少し安い値を言った。",
    hated: "店の主はあなたの顔を見ると、黙って値札を書き換えた。",
  };
  const explore0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const r = explore0(head, arg, a);
    const S = G.S;
    if (S && !S.over && head === "fac" && arg === "shop" && S.fac === "shop" && E.SHOP_LINE[E.mood(S)]) G.say(E.SHOP_LINE[E.mood(S)]);
    return r;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (!S || head !== "shop" || !String(arg).startsWith("buy:")) return facAct0(head, arg, a);
    const adj = E.priceAdj(S, String(arg).slice(4));
    const before = S.gold;
    const len = Array.isArray(S.log) ? S.log.length : 0;
    const r = facAct0(head, arg, a);
    if (adj && S.gold < before) {
      const n = adj > 0 ? Math.min(adj, S.gold) : adj;
      S.gold -= n;
      // 「〇〇を買った。（-150G）」の一行に、値の上げ下げと払った額をまとめる（二行にしない。R7b）
      const why = n > 0 ? "店の主は、あなたにだけ値を上げた。" : "顔なじみだからと、少しまけてくれた。";
      const log = Array.isArray(S.log) ? S.log : [];
      let i = log.length - 1;
      while (i >= len && !/を買った。（-\d+G）$/.test(String((log[i] || {}).text || ""))) i--;
      const m = i >= len ? /^(.*を買った。)（-(\d+)G）$/.exec(log[i].text) : null;
      if (m) log[i].text = `${m[1]}${why}（-${+m[2] + n}G）`;
      else if (n > 0) G.note(`${why}（さらに -${n}G）`);
      else if (n < 0) G.note(`${why}（+${-n}G）`);
    }
    return r;
  };
})(globalThis.G = globalThis.G || {});
