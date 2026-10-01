// D9 #143：シートとの食い違いの残りを直した（docs/lore/sheet_audit.md）。
// - 「内側の十三」をシートの使徒リストの七十二に重ねた（id・フラグはそのまま。名前と人柄だけ。src/data/world.js の D.MAJIN）
// - 帝国の皇帝グレイオルは健在。皇子たちの後継争いは、四騎士の派閥争いと皇女カティアの婿取りに置きかえた
// セーブに残る項目のうち、皇子だったころの文字が残るもの（M4 の S.world.heir・W2 の騎士の後ろ盾 S.w2_patron）を読み替える。
// S.world.emp の段階（sick→worse→dead→civil→new）は名前のまま、意味だけ読み替える（src/engine/world_m4.js の頭の説明）。
// 年表・日誌に残った古い文は、そのときの記録なのでそのままにする。DOM には触らない
(function (G) {
  const PATRON = { first: "四騎士ダリオ", third: "四騎士エルナ", fifth: "四騎士ヴァルグ" };

  G.fixD9 = (S) => {
    if (!S) return S;
    const W = S.world;
    const M = G.data && G.data.M4;
    if (W && W.heir && /皇子|^皇女$/.test(W.heir)) W.heir = (M && M.OLD_HEIRS && M.OLD_HEIRS[W.heir]) || (M && M.HEIRS && M.HEIRS[0]) || "";
    if (W && Array.isArray(W.hist)) W.hist.forEach((h) => { if (h.heir && /皇子|^皇女$/.test(h.heir)) h.heir = W.heir || (M && M.HEIRS[0]) || ""; });
    const P = S.w2_patron;
    if (P && P.realm === "garmund" && PATRON[P.id] && /皇子/.test(`${P.name || ""}${P.short || ""}`)) {
      P.short = PATRON[P.id];
      P.name = PATRON[P.id] + "に仕える";
    }
    return S;
  };

  // 古いセーブを読み込んだときに呼ばれる（src/main.js が G.fixOldNames を呼ぶ）。何度呼んでもよい
  const base = G.fixOldNames;
  G.fixOldNames = (S) => {
    if (base) base(S);
    return G.fixD9(S);
  };
})(globalThis.G = globalThis.G || {});
