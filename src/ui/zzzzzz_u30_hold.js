// U30（R8 中 17）：使徒戦などの山場の幕（暗転と大きな一行。ui/zu14_scenes.js の #u14cut）が出ている間は、知らせを出さずに預かり、幕が消えてから出す
//   預かる知らせ：通知（ui.toast：トロフィー獲得など）・「図鑑に追加」（G.onCodex）・図鑑の入口の「！」（G.onCodexChange）・「覚え書き」（G.onKnow）・「用語集に追加」（G.gloss.announce）
//   行動（G.act）の間はいったん預かり、描き終えて幕が出ていなければすぐ出す。幕が出ていれば、幕が消えたとき（body.u14cutting が外れたとき）に出す
// 戦闘の手番の結果より先に知らせを出さない包み（zzzzzz_f6_hold.js）とは別に、外側で包む（名前で f6 より後、終わった戦いの包み zzzzzzz_f5_finish.js より内）。レーン U
(function (G) {
  const ui = G.ui;
  if (typeof document === "undefined" || !ui || !ui.render) return;
  const U = (G.u30 = G.u30 || {});
  const body = document.body;
  let holding = false, drawn = false, queue = [], safety = 0;
  const cutting = () => body.classList.contains("u14cutting");
  const flush = () => {
    holding = false;
    clearTimeout(safety);
    const q = queue; queue = [];
    q.forEach((fn) => { try { fn(); } catch (e) { /* 一つの知らせに失敗しても、ほかは出す */ } });
  };
  U.holding = () => holding;
  // 預かれるように包む。f6 の包みと互いに包み直し続けないよう、印（_f6）を引き継ぐ
  const hold = (fn) => {
    const w = (...a) => { if (holding) { queue.push(() => fn(...a)); return undefined; } return fn(...a); };
    w._u30 = true;
    if (fn._f6) w._f6 = true;
    return w;
  };
  const wrapAll = () => {
    if (ui.toast && !ui.toast._u30) ui.toast = hold(ui.toast);
    for (const k of ["onCodex", "onCodexChange", "onKnow"]) if (G[k] && !G[k]._u30) G[k] = hold(G[k]);
    if (G.gloss && G.gloss.announce && !G.gloss.announce._u30) G.gloss.announce = hold(G.gloss.announce);
  };
  wrapAll();
  const act0 = G.act;
  G.act = (...a) => {
    wrapAll();
    holding = true;
    drawn = false;
    clearTimeout(safety);
    safety = setTimeout(flush, 15000); // 万一、描き直しや幕の終わりが来なくても、いつかは出す
    return act0(...a);
  };
  const render0 = ui.render;
  ui.render = (...a) => {
    const r = render0(...a);
    drawn = true;
    if (holding && !cutting()) flush();
    return r;
  };
  // 幕が消えたら出す
  new MutationObserver(() => { if (holding && drawn && !cutting()) flush(); }).observe(body, { attributes: true, attributeFilter: ["class"] });
})(globalThis.G = globalThis.G || {});
