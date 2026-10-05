// F4：選んだことが返ってきたときの「あのときの…」の一文（ログの k: "echo"）に印を付ける。仕組みは engine/zzzzzzzzz_echo_f4.js
// ui.js は書き換えず、G.ui.render を包んで、描いたあとのログの段落に class "l-echo" を足す（並びの合わせ方は ui/q7_lognums.js と同じ）。見た目は ui/echo_f4.css。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      const S = G.S;
      const log = document.querySelector("#log");
      if (S && log && Array.isArray(S.log) && S.log.some((e) => e.k === "echo")) {
        const kids = Array.from(log.children);
        const shown = S.log.slice(-kids.length);
        if (shown.length === kids.length) kids.forEach((el, i) => { if (shown[i] && shown[i].k === "echo" && el.tagName === "P") el.classList.add("l-echo"); });
      }
    } catch { /* 印が付かなくても画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
