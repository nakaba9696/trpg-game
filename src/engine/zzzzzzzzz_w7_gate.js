// 使徒領への関所と警告（W7g。出来事は data/events_w7g.js）。
// 人の土地から D.LAWLESS の地方（人と魔の境・使徒領）へ入る陸路は、旅の選択肢には見えるが、押すと砦で止められる（w7g_gate）。
// 通る手を満たすと、入る直前に警告（w7g_warn）。「それでも進む」（結果の w7gGo）でふつうの旅に出る。
// 旅の選択肢には控えめな印（「砦が道を塞ぐ」／「人の住まない土地」）。地図は engine/zz_w5_map.js の roads の gate（ui/w5_map.js が色を変える）。
// 外へ出る道（LAWLESS → 人の土地）と、LAWLESS の中の道は止めない（古いセーブで中にいても戻れる）。
// G.exploreActions・G.exploreAct・G.apply を一番外から包む（z の数で W6 などより後に読まれる）。乱数は使わない。レーン W（W7g）
(function (G) {
  const D = G.data;
  const W = (G.w7g = G.w7g || {});
  W.FAME = 80;
  const lawless = (id) => !!(D.LOCS[id] && (D.LAWLESS || []).includes(D.LOCS[id].region));
  W.gated = (from, to) => !!(D.LOCS[from] && D.LOCS[to] && !lawless(from) && lawless(to));
  W.passed = (S) => !!(S && S.flags && S.flags.w7g_pass);

  const actions0 = G.exploreActions;
  G.exploreActions = () => {
    const S = G.S;
    const groups = actions0();
    if (!S || S.travel) return groups;
    for (const g of groups) for (const a of g.list || []) {
      const m = /^travel:(.+)$/.exec(a.id || "");
      if (m && W.gated(S.loc, m[1])) a.sub = [a.sub, W.passed(S) ? "人の住まない土地" : "砦が道を塞ぐ"].filter(Boolean).join("・");
    }
    return groups;
  };

  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "travel" && S && W.gated(S.loc, arg)) {
      if (S.w7gGo === arg) { S.w7gGo = null; return act0(head, arg, a); }
      S.w7gTo = arg;
      G.startEvent("w7g_gate");
      return;
    }
    return act0(head, arg, a);
  };

  const apply0 = G.apply;
  G.apply = (o) => {
    const r = apply0(o);
    const S = G.S;
    if (o && o.w7gGo && S && S.w7gTo && !S.over && S.mode === "explore" && W.gated(S.loc, S.w7gTo)) {
      const to = S.w7gTo;
      S.w7gTo = null;
      S.w7gGo = to;
      G.exploreAct("travel", to);
    }
    return r;
  };
})(globalThis.G = globalThis.G || {});
