// R11：R10 のプレイレビューのルールの直し（画面の側）。エンジンは src/engine/zzzzzzzzzzzzzzzzzzz_r11_rules.js
//   低 20：戦闘中に失敗した判定の横へ、押せない「振り直す」を出さない（戦闘中は振り直せないことは手引きに書いてある）
//   中 7：今の武器で使えない稽古・教わる技のボタンを薄くする（.r11off）
//   低 29：「薬草を使う（自分に）」（b5self:）は仲間の分類に
(function (G) {
  // 低 20：エンジンの印（G.rerollBlocked）は残し、画面のボタンだけ出さない
  if (G.rerollBlockedTarget) G.rerollBlockedTarget = () => false;
  if (G.u13 && G.u13.BY_PREFIX) G.u13.BY_PREFIX.b5self = "party";
  const ui = G.ui;
  if (!ui || !ui.render || typeof document === "undefined" || !G.k1) return;
  const SK = (G.data && G.data.SKILLS) || {};
  function dim() {
    const S = G.S;
    if (!S || S.over || S.mode !== "fac") return;
    document.querySelectorAll('button[data-act^="k1train:"], button[data-act^="k1teach:"]').forEach((b) => {
      const id = b.dataset.act.split(":").pop();
      if (SK[id] && SK[id].style && !G.k1.styleOk(id, S)) b.classList.add("r11off");
    });
  }
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { dim(); } catch (e) { /* 薄くできなくても遊びは止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
