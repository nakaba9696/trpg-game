// E8：戦闘が始まった瞬間の見出し（S4・U14 の幕）に、相手の格を添える（「灰の地竜　B 級」。並ぶときはいちばん上の格）
// G.s4enc.cardOf を包むだけ（名前の zs4_g で zs4_encounter.js より後に読まれる）。レーン E（敵）
(function (G) {
  const ENC = G.s4enc;
  if (!ENC || !ENC.cardOf) return;
  const base = ENC.cardOf;
  ENC.cardOf = (S) => {
    const c = base(S);
    if (!c || !G.gradeTop || !S.combat) return c;
    const g = G.gradeTop(S.combat.foes.map((f) => f.id));
    return g ? Object.assign({}, c, { grade: g, names: `${c.names}　${G.gradeName(g)}` }) : c;
  };
})(globalThis.G = globalThis.G || {});
