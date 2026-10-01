// D8 #136：世界観をスプレッドシート中心に整理した（docs/lore/sheet_audit.md）。場所・敵・アイテムの id は変えていない。
// 地方の名前を鍵にしてセーブに残る項目（国ごとの評判 S.repute・騎士の位の国 S.titleAt）は、d5_names.js の G.fixOldNames で新しい名前へ移す。
// 八雲 → シェルアーク（シートの南西の島嶼の都）、魔物界 → 使徒領（シートの「使徒領」）。DOM には触らない
(function (G) {
  G.OLD_NATION_NAMES = Object.assign(G.OLD_NATION_NAMES || {}, {
    八雲: "シェルアーク",
    魔物界: "使徒領",
  });
})(globalThis.G = globalThis.G || {});
