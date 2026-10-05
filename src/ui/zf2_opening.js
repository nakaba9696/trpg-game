// F2：序盤の引き。因縁（f2:）と R3 の「気になること」（r3:）の組を、町の分類（街で・冒険・その他）の上に出したままにする。
// 初めての人が最初に開く「街で」の陰に隠れないように（U13 の PIN_PREFIX に足すだけ。並べ方は src/ui/u13_menu.js）。レーン U（F2）
(function (G) {
  const u13 = G.u13;
  if (!u13 || !Array.isArray(u13.PIN_PREFIX)) return;
  ["f2o", "r3"].forEach((p) => { if (!u13.PIN_PREFIX.includes(p)) u13.PIN_PREFIX.push(p); });
})(globalThis.G = globalThis.G || {});
