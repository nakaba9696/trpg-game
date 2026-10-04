// W6：旅の途中の出来事のあいだも、場所の名を「〇〇への道中」にする（U9 は戦いのときだけ。S.travel は行き先。着けば元に戻る）
// ui.js は書き換えず、G.ui.render を包む。レーン W＋V（W6）
(function (G) {
  const ui = G.ui;
  if (!ui || !ui.render || typeof document === "undefined") return;
  const render0 = ui.render;
  ui.render = (...a) => {
    const r = render0(...a);
    const S = G.S, t = document.getElementById("sceneTitle");
    const T = S && S.travel && !S.over && G.data.LOCS[S.travel];
    if (t && T) t.textContent = `${T.name}への道中`;
    return r;
  };
})(globalThis.G = globalThis.G || {});
