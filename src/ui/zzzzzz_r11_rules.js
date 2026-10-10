// R11：R10 のプレイレビューのルールの直し（画面の側）。エンジンは src/engine/zzzzzzzzzzzzzzzzzzz_r11_rules.js
//   低 20：戦闘中に失敗した判定の横へ、押せない「振り直す」を出さない（戦闘中は振り直せないことは手引きに書いてある）
//   中 7：今の武器で使えない稽古・教わる技のボタンを薄くする（.r11off）
//   低 30：訓練場の押せない稽古を、理由ごとに一行に詰める（G.r11TrainGroups。最初のボタンに名前を並べ、ほかは隠す）
// 名前の頭の z は六つ：描き直しを包むので、F5 の見せ方の包み（zzzzzzz_f5_finish.js）より内側に
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
    if (S.fac !== "train" || !G.r11TrainGroups) return;
    const btns = [...document.querySelectorAll('button[data-act^="k1train:"]')];
    G.r11TrainGroups(btns.map((b) => ({ id: b.dataset.act, disabled: b.disabled })), S).forEach((grp) => {
      const mine = grp.ids.map((id) => btns.find((b) => b.dataset.act === id)).filter(Boolean);
      if (mine.length < 2) return;
      const head = mine[0];
      const lab = head.querySelector("b, .u13lab");
      if (lab) lab.textContent = grp.label;
      const sub = lab && lab.nextElementSibling;
      if (sub && sub.tagName === "SPAN") sub.textContent = grp.why; // 最初の技の武器の型は、まとめた行には合わない
      head.title = grp.why;
      mine.slice(1).forEach((b) => { b.hidden = true; b.style.display = "none"; });
    });
  }
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { dim(); } catch (e) { /* 薄くできなくても遊びは止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
