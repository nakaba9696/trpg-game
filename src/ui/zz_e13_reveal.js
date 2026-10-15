// E13：門を破って正体を現した使徒は、戦いでは魔物の姿の絵（monsters/<id>）だけで描く（src/engine/zz_e3y_e13_immortal.js が f.e13 を付ける）
// 魔物の姿の絵が無い使徒（今は e3_mirza・e3_zalve・e3_aurelia）は、人の姿の立ち絵に戻さず、絵を出さない（CLAUDE.md：画像が無いときは描かない）
// 名前の zz_e13 で v6_monsters.js の後に読まれ、G.v6ArtKey を包む。レーン E（敵）
(function (G) {
  const k0 = G.v6ArtKey;
  if (!k0) return;
  const shown = (id) => { const C = G.S && G.S.combat; return !!(C && C.foes && C.foes.some((f) => f.id === id && f.e13)); };
  G.v6ArtKey = (id) => {
    const k = k0(id);
    return k && k.startsWith("portraits/") && shown(id) ? null : k;
  };
})(globalThis.G = globalThis.G || {});
