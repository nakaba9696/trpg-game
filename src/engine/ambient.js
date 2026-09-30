// 通行人のひとこと（U3）。町をぶらついて何も起きなかったとき、野外を探索して財布を拾ったときなどに、ときどき一行添える。
// 台詞の表は src/data/ambient_u3.js（D.AMBIENT）。explore.js は書き換えず、G.exploreAct を包む。
// 同じ台詞が続かないように、最近出したものを S.ambSeen に覚える（古いセーブで無くても動く）。レーン U（U3）が管理
(function (G) {
  const D = G.data;
  const RECENT = 12;

  // 今の場所で出せる台詞
  G.ambientPool = (S) => {
    const tags = G.eventTags();
    const seen = S.ambSeen || [];
    return (D.AMBIENT || []).filter((a) => a.where.some((w) => tags.includes(w)) && (!a.cond || a.cond(S)) && !seen.includes(a.id));
  };

  // 一行添える。出したら台詞を返す
  G.ambient = () => {
    const S = G.S;
    const pool = G.ambientPool(S);
    if (!pool.length) return null;
    let r = G.rand() * pool.reduce((n, a) => n + (a.w || 1), 0);
    let a = pool[pool.length - 1];
    for (const x of pool) { r -= x.w || 1; if (r <= 0) { a = x; break; } }
    S.ambSeen = (S.ambSeen || []).concat(a.id).slice(-RECENT);
    S.counters.ambient = (S.counters.ambient || 0) + 1;
    G.say(a.text);
    if (a.hear) G.hear(a.hear);
    return a;
  };

  const baseAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const before = S.log.length;
    baseAct(head, arg, a);
    if (S.over || S.mode !== "explore" || S.combat) return;
    const L = G.loc();
    // 町をぶらついて出来事が起きなかった。はじめの数回は必ず、あとは半分くらい
    if (head === "walk") {
      const early = (S.counters.ambient || 0) < 2;
      if (early || G.rand() < 0.5) G.ambient();
      return;
    }
    // 野外を探索して、戦いも出来事も起きなかった
    if (head === "explore" && L.type === "wild" && S.log.length > before && G.rand() < 0.4) G.ambient();
  };
})(globalThis.G = globalThis.G || {});
