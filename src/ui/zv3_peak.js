// V3：山場の見せ方。持ち主「今のゲームはメリハリがないので、つねに淡々と進んでいます」。
// エンジン（engine/zzzzzzzzzz_v3_prose.js）が山場の記録に付けた印（e.peak）を読んで、記録の行に印の class を付ける：
//   ・山場の出来事の見出しは大きめに（v3peak）
//   ・新しく増えた山場の段落は、間を置いて一段ずつ出す（v3stage と animation-delay）。prefers-reduced-motion では動かさない（CSS）
// ui.js は書き換えず、G.ui.render を包む（名前の zv で U14 の印付けより後に読まれる）。エンジンは読むだけ。レーン U＋V（V3）
(function (G) {
  const ui = G.ui;
  if (!ui || !ui.render) return;
  const STEP = 0.75;   // 一段ごとの間（秒）
  const MAX = 8;       // これより後ろの段落は、間を延ばさない（選択肢を待たせすぎない）
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      const S = G.S;
      const log = document.getElementById("log");
      if (!S || !log) return r;
      const kids = Array.from(log.children);
      const shown = S.log.slice(-kids.length);
      if (shown.length !== kids.length) return r;
      let n = 0;
      kids.forEach((el, i) => {
        const e = shown[i];
        const peak = !!(e && e.peak);
        el.classList.toggle("v3peak", peak);
        const stage = peak && e.k === "nar" && el.classList.contains("new");
        el.classList.toggle("v3stage", stage);
        if (stage) { el.style.animationDelay = `${(Math.min(n, MAX) * STEP).toFixed(2)}s`; n++; }
        else if (el.style.animationDelay) el.style.animationDelay = "";
      });
    } catch (x) { /* 見せ方が付けられなくても、画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
