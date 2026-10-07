// F5：戦闘を終えた手番（とどめの一撃・あなたが倒れる一撃）も、順に見せ終えてから結果の場面へ（持ち主「攻撃を選ぶ → ダイス振る → ダメージ → 体力が0になる、ここまで演出があってから戦闘終了画面にいってほしい」）。
// 描く・描き直す（ui.render・ui.repaint）を一番外から包み、順に見せている間だけ、終わった戦いを G.S に入れて描く（中身は ui/u13_battle.js の u13.inGhost）。
// 名前の z の数で、ほかの描く包み（u13_menu・u14 の場面・u21 の右の列など）より外にする。レーン U（F5）
(function (G) {
  const ui = G.ui;
  if (typeof document === "undefined" || !ui || !ui.render) return;
  const u = () => (G.u13 && G.u13.inGhost && G.u13.renderStart ? G.u13 : null);
  const render0 = ui.render;
  ui.render = (...a) => {
    const U = u();
    if (!U) return render0(...a);
    U.renderStart();
    try { return U.inGhost(() => render0(...a)); } finally { U.renderEnd(); }
  };
  const repaint0 = ui.repaint;
  if (repaint0) ui.repaint = (...a) => { const U = u(); return U ? U.inGhost(() => repaint0(...a)) : repaint0(...a); };
})(globalThis.G = globalThis.G || {});
