// スマホで記録が長いとき、行動ボタンが画面の下に隠れる。そのときだけ「行動へ」の小さなボタンを出す（U6）
// 押すと行動の欄まで送る。行動ボタンが見えていれば出さない。レーン U が管理
(function (G) {
  const ui = G.ui;
  if (!ui || typeof document === "undefined") return;
  const $ = (s) => document.querySelector(s);
  const narrow = () => window.matchMedia("(max-width: 880px)").matches;
  const b = document.createElement("button");
  b.type = "button";
  b.id = "toActs";
  b.className = "btn small";
  b.textContent = "行動へ ↓";
  b.hidden = true;
  document.body.append(b);
  const first = () => $("#panel .tip, #panel .danger, #panel .foes, #panel .act, #panel .fin");
  const update = () => {
    const play = $("#play");
    const f = first();
    if (!narrow() || !play || play.hidden || !f || document.body.classList.contains("log-open")) { b.hidden = true; return; }
    const form = $("#act");
    const bottom = form ? form.getBoundingClientRect().top : window.innerHeight;
    b.hidden = f.getBoundingClientRect().top < bottom - 40;
  };
  b.onclick = () => {
    const f = first();
    const bar = $("#mbar");
    if (f) window.scrollTo({ top: window.scrollY + f.getBoundingClientRect().top - (bar ? bar.getBoundingClientRect().height : 0) - 8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const base = ui.render;
  ui.render = (ups) => { base(ups); requestAnimationFrame(update); };
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  const lt = $("#logToggle");
  if (lt) lt.addEventListener("click", () => requestAnimationFrame(update));
})(globalThis.G = globalThis.G || {});
