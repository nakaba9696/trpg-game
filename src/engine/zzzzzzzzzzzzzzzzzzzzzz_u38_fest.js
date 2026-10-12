// U38：季節の催しは、その季節にその町で「町をぶらつく」を押せば、最初の一回で必ず起きる（噂を聞いていなくても）。
// 持ち主の声「（麦の都グランベールで春にずっとぶらついても）何も起きない」。V13 の season の組（src/data/v13_leads.js）の全部で同じ。
// 催しの出来事の cond（季節）・once は変えない。済んだ（once の印が付いた）催しは起きない。季節外は今まで通りの抽選だけ。
// 町をぶらつくの札の印は、噂を聞いた催しなら R11 が「季節の催し：〜（春のうち）」と出す（押せば起きる）。噂を聞いていない催しは、印を出さず（噂の文に町の名を書かない V13 の決まりのまま）、起きたときに初めて分かる。
// 乱数は使わない。セーブに足すものは無い。DOM なし
(function (G) {
  const D = G.data;
  const U = (G.u38 = G.u38 || {});
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  // 毎年ある（once でない）催しの、この季節に起きた印。S.u38 = { 出来事の id: 季節の始まりの日 }。古いセーブで無くても動く
  U.seasonStart = (S, set) => {
    const V = G.v13;
    const starts = V && V.seasonStarts ? V.seasonStarts(set.season, S.day) : [];
    const cur = starts.filter((d) => d <= S.day).pop();
    return cur == null ? Math.floor((S.day - 1) / (G.YEAR_DAYS || 360)) : cur;
  };
  U.doneNow = (S, set, e) => !!(S.u38 && S.u38[e.id] != null && S.u38[e.id] === U.seasonStart(S, set));
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const r = start0(ev);
    const S = G.S;
    const id = typeof ev === "string" ? ev : ev && ev.id;
    const set = id && as(D.V13 && D.V13.LEADS).find((x) => x.kind === "season" && x.ev === id);
    if (r && set && S) { S.u38 = S.u38 || {}; S.u38[id] = U.seasonStart(S, set); }
    return r;
  };

  // 今いる場所で、今起きる季節の催しの出来事（無ければ null）
  U.pending = (S) => {
    S = S || G.S;
    if (!S || S.over || S.combat || S.event || S.mode !== "explore" || S.travel || S.depth) return null;
    const L = D.LOCS[S.loc];
    if (!L || L.type !== "town") return null;
    const sets = as(D.V13 && D.V13.LEADS).filter((x) => x.kind === "season");
    for (const set of sets) {
      const e = (D.EVENTS || []).find((x) => x.id === set.ev);
      if (!e || !as(e.where).includes(S.loc)) continue;
      if (e.once && S.flags && S.flags["ev:" + e.id]) continue;
      if (!e.once && U.doneNow(S, set, e)) continue; // 毎年ある催しは、この季節のぶんが済んだら出ない
      let on = false;
      try { on = !e.cond || !!e.cond(S); } catch { on = false; }
      if (on) return e;
    }
    return null;
  };
  G.festPending = () => U.pending(G.S);
})(globalThis.G = globalThis.G || {});
