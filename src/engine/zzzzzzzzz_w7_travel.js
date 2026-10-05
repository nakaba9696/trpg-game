// W7：旅の行き先の選び方（持ち主の声「冒険で行き先を選ぶときに世界地図を出してほしい」）。DOM には触らない。画面は ui/w7_travelmap.js
// - G.w7.travelChoices(S)：今いる所から出られる旅の選択肢（陸路・船）。地図に描く線（W5.roadPts）と、砦が塞ぐ道か（G.w7g）
// - 旅の選択肢の小さな文に、行き先の地方（今いる地方と違うとき）を足す。日数と種類は explore.js が書く
// G.exploreActions を一番外から包む（z の数と名前の順で、関所 w7_gate より後）。レーン W（W7）
(function (G) {
  const D = G.data;
  const W7 = (G.w7 = G.w7 || {});
  W7.travelChoices = (S) => {
    S = S === undefined ? G.S : S;
    const L = S && D.LOCS[S.loc];
    if (!L || S.over || S.travel || S.mode !== "explore" || (L.type === "dungeon" && S.depth > 0)) return [];
    const gated = (to) => !!(G.w7g && G.w7g.gated(S.loc, to));
    const pts = (to, kind) => (G.w5 && G.w5.roadPts ? G.w5.roadPts(S.loc, to, kind) : [[L.x, L.y], [D.LOCS[to].x, D.LOCS[to].y]]);
    const land = Object.entries(L.links || {}).filter(([to]) => D.LOCS[to]).map(([to, days]) => ({ id: "travel:" + to, to, kind: "land", days, cost: 0, gate: gated(to), pts: pts(to, "land") }));
    const sea = Object.entries(L.sea || {}).filter(([to]) => D.LOCS[to]).map(([to, s]) => ({ id: "sail:" + to, to, kind: "sea", days: s.days, cost: s.cost, gate: false, pts: pts(to, "sea") }));
    return [...land, ...sea];
  };
  const actions0 = G.exploreActions;
  G.exploreActions = () => {
    const S = G.S;
    const groups = actions0();
    const L = S && D.LOCS[S.loc];
    if (!L || S.travel) return groups;
    for (const g of groups) for (const a of g.list || []) {
      const m = /^(travel|sail):(.+)$/.exec(a.id || "");
      const T = m && D.LOCS[m[2]];
      if (T && T.region && T.region !== L.region && !String(a.sub || "").includes(T.region)) a.sub = [a.sub, T.region].filter(Boolean).join("・");
    }
    return groups;
  };
})(globalThis.G = globalThis.G || {});
