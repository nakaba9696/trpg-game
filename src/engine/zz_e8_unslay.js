// E8：倒せない使徒（表は src/data/e8_unslay.js の D.E8.UNSLAY）
// - 表の使徒は D.E3.LIST で noslay になる。G.e3Slayable(id) で引ける
// - 出来事の結果 e3fight（会う出来事の「挑む」など）は、戦いを始めずに、その使徒の一行を出す。ほかの結果（文・名声など）はそのまま
// - 直接の戦い（G.startCombat）に倒せない使徒が混ざっても、戦いを始めない（同じ一行）
// - 「五体倒した」などの数は、討伐できる使徒だけで数える（zz_e3_apostles.js）。古い記録は消さない
// 名前の zz_e8 で zz_e3_apostles.js より後に読まれ、その G.apply・G.startCombat を包む。レーン E（敵）
(function (G) {
  const D = G.data;
  const U = D.E8 && D.E8.UNSLAY;
  if (!U || !D.E3 || !D.E3.LIST) return;
  Object.keys(U).forEach((id) => { if (D.E3.LIST[id]) D.E3.LIST[id].noslay = true; });
  G.e3Slayable = (id) => { const a = D.E3.LIST[id] || (G.e3Of && G.e3Of(id)); return !!a && !a.noslay; };

  const apply0 = G.apply;
  G.apply = (o) => {
    const a = o && o.e3fight && D.E3.LIST[o.e3fight];
    if (!a || !a.noslay) return apply0(o);
    const rest = Object.assign({}, o);
    delete rest.e3fight;
    const r = apply0(rest);
    if (G.S && !G.S.over) G.say(U[a.id]);
    return r;
  };
  const start0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    const a = (ids || []).map((id) => (G.e3Of ? G.e3Of(id) : null)).find((x) => x && x.noslay);
    if (a) { if (G.S) G.say(U[a.id]); return; }
    return start0(ids, opt);
  };
})(globalThis.G = globalThis.G || {});
