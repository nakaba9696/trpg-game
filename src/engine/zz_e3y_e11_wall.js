// E11：絶界は特定の使徒の固有の守り（表は src/data/zz_e11_wall.js の D.E11）
// - 絶界を持たない使徒は、はじめから刃が届く（G.e3Open が true）。その戦いの G.foeData の majin（刃を弾く壁）も立たない
//   （data の majin は「使徒である」印のまま。絵・音・図鑑・格・F1 の大技などは今までどおり使徒として扱う）
// - 絶界を持つ使徒（黒鎧）は今までどおり：絶界を破る伝説の刃か、その使徒の伝承の条件（E3 の zekkai）で刃が届く
// - G.wallOf(f) 刃が弾かれたときの言い方 { what, name }（combat.js・relics_c1.js が読む。無ければ絶界）
// - 挑んだとき、絶界を持たない使徒の固有の守りの一行（D.E11.GUARD）を出す
// 名前の zz_e3y で zz_e3_apostles.js の後・zz_e3z_e10_events.js の前に読まれる。セーブには何も足さない。レーン E（敵）
(function (G) {
  const D = G.data;
  const E11 = D.E11;
  if (!E11 || !D.E3 || !G.e3Open) return;
  const apOf = (fid) => (G.e3Of ? G.e3Of(fid) : null);
  G.hasWall = (apostleId) => E11.WALL.includes(apostleId);

  const open0 = G.e3Open;
  G.e3Open = (id, S) => (D.E3.LIST[id] && !G.hasWall(id) ? true : open0(id, S));

  const DEF = { what: "見えない壁", name: "絶界" };
  G.wallOf = (f) => {
    const a = f && apOf(f.id);
    return (a && E11.WALL_WORD[a.id]) || DEF;
  };

  const start0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    start0(ids, opt);
    const S = G.S;
    if (!S || !S.combat) return;
    const seen = new Set();
    S.combat.foes.forEach((f) => {
      const a = apOf(f.id);
      if (!a || seen.has(a.id) || G.hasWall(a.id)) return;
      seen.add(a.id);
      if (E11.GUARD[a.id]) G.note(E11.GUARD[a.id]);
    });
  };
})(globalThis.G = globalThis.G || {});
