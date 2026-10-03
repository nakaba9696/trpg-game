// 仲間どうしの間柄（K7）：キャラクターシートの仲間の札に「間柄：ゼリナと相棒・ディルとぎこちない」を小さく一行足す（ふつうの相手は出さない）。
// 値と段は src/engine/zzzzzz_banter2.js（G.tkRelLabel）。ui.js は書き換えず、G.ui.render を包む。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render || !G.tkRelLabel) return;
  const base = G.ui.render;
  G.ui.render = (...a) => {
    const r = base(...a);
    try { addRel(); } catch (e) { /* 出なくても、画面は止めない */ }
    return r;
  };
  function addRel() {
    const S = G.S;
    if (!S || S.over) return;
    document.querySelectorAll("#sheet .comps .comp").forEach((el, i) => {
      const c = S.companions[i];
      const text = c && G.tkRelLabel(c, S);
      const box = el.querySelector(":scope > div");
      if (!text || !box || box.querySelector(".tkRel")) return;
      const s = document.createElement("span");
      s.className = "fine tkRel";
      s.textContent = text;
      box.append(s);
    });
  }
})(globalThis.G = globalThis.G || {});
