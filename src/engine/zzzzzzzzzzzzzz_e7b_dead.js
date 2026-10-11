// E7b：死んだ名のある人（C2 の「もういない」が dead）の出来事を起こさない。長編（E7）で道中に死んだ人の恋の筋・頼みごと・会話が、死んだあとに出続けないように。
// - 出来事の c2 に死んだ人がいれば、その出来事は起きない（cond を包む。出会う前の出来事はもともと「もういない」人を外しているので、そのまま）
// - 恋の筋（R2・M10）・頼みごと（C9）・掛け合い・話す は、仲間の欄にいる人だけが対象なので、別れ（M2 の m2Remove）で仲間から外れれば止まる
// 乱数は使わない。DOM には触らない。レーン E＋V（E7b）
(function (G) {
  const D = G.data;
  const dead = (S, id) => !!(S && S.c2 && S.c2.gone && S.c2.gone[id] === "dead");
  G.e7bDead = dead;
  const guard = () => (D.EVENTS || []).forEach((e) => {
    if (!e || !e.c2 || e._e7b) return;
    const ids = Array.isArray(e.c2) ? e.c2 : [e.c2];
    const c0 = e.cond;
    e._e7b = true;
    e.cond = (S) => !ids.some((id) => dead(S, id)) && (!c0 || c0(S));
  });
  guard();
  // あとから足される出来事（C9 の頼みごとなど）にも
  const re0 = G.randomEvent;
  G.randomEvent = () => { guard(); return re0(); };
})(globalThis.G = globalThis.G || {});
