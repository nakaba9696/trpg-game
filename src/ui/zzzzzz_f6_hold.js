// F6：戦闘の手番の結果が、ダイスより先に漏れないようにする（持ち主「選択肢選んだ瞬間 BGM が変わるから、ダイスの結果みなくてもわかる。……ダイス振る前から結果わかるようにしないで」）。
// 戦闘の中で手を選んでから、その手番を順に見せ終えるまで（u13.afterReveal）、知らせを預かって、見せ終えてから出す：
//   通知（ui.toast：トロフィー獲得・熟練など）・「図鑑に追加」（G.onCodex）・図鑑の入口の「！」（G.onCodexChange）・「覚え書き」（G.onKnow）・「用語集に追加」（G.gloss.announce）
// 曲（sound_bgm.js）と効果音（u13_battle.js）、画面（終わった戦い。zzzzzzz_f5_finish.js）は、それぞれの所で順に合わせる。
// 名前の z の数で、u13_battle.js より後（描き終えて、順に見せるかが決まってから出す）、終わった戦いの包み（zzzzzzz_f5_finish.js）より内に読む。エンジンは読むだけ。レーン U（F6）
(function (G) {
  const ui = G.ui;
  if (typeof document === "undefined" || !ui || !ui.render) return;
  const F6 = (G.f6 = G.f6 || {});
  let holding = false, queue = [], safety = 0;
  F6.holding = () => holding;
  const flush = () => {
    holding = false;
    clearTimeout(safety);
    const q = queue; queue = [];
    q.forEach((fn) => { try { fn(); } catch (e) { /* 一つの知らせに失敗しても、ほかは出す */ } });
  };
  // 預かれるように包む（預かっていなければ、そのまま出す）
  const hold = (fn) => (fn ? (...a) => { if (holding) { queue.push(() => fn(...a)); return undefined; } return fn(...a); } : fn);
  const wrapAll = () => {
    if (ui.toast && !ui.toast._f6) { ui.toast = hold(ui.toast); ui.toast._f6 = true; }
    for (const k of ["onCodex", "onCodexChange", "onKnow"]) if (G[k] && !G[k]._f6) { G[k] = hold(G[k]); G[k]._f6 = true; }
    if (G.gloss && G.gloss.announce && !G.gloss.announce._f6) { G.gloss.announce = hold(G.gloss.announce); G.gloss.announce._f6 = true; }
  };
  wrapAll();
  // 戦闘の中で手を選んだら預かり始める（main.js の G.onTrophy などはあとで決まるので、手のたびに包み直す）
  const act0 = G.act;
  G.act = (...a) => {
    wrapAll();
    if (G.S && G.S.combat && !G.S.over) {
      holding = true;
      clearTimeout(safety);
      safety = setTimeout(flush, 30000); // 万一、描き直しが来なくても、いつかは出す
    }
    return act0(...a);
  };
  // 描き終えたら：順に見せているなら見せ終えてから、そうでなければすぐ出す
  const render0 = ui.render;
  ui.render = (...a) => {
    const r = render0(...a);
    if (holding) {
      const u = G.u13;
      if (u && u.afterReveal && u.revealing && u.revealing()) u.afterReveal(flush);
      else flush();
    }
    return r;
  };
})(globalThis.G = globalThis.G || {});
