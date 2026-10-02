// 仲間との会話：キャラクターシートの仲間の札に「話す」を付ける（押すと、行動の「〇〇と話す」と同じ）。
// 会話そのもの（話題の一覧・話・返し方・掛け合い）は出来事の画面で描く（src/engine/zzzzz_talk.js の殻の出来事）。立ち絵の表情は V8 が S.mood を読む。
// ui.js は書き換えず、G.ui.render を包む。レーン U（仲間との会話）
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { addButtons(); } catch (e) { /* ボタンが付かなくても、画面は止めない */ }
    return r;
  };
  function addButtons() {
    const S = G.S;
    if (!S || S.over) return;
    const cards = document.querySelectorAll("#sheet .comps .comp");
    if (!cards.length) return;
    const acts = G.actions().flatMap((g) => g.list);
    cards.forEach((el, i) => {
      const c = S.companions[i];
      const a = c && acts.find((x) => x.id === "m2talk:" + c.id);
      if (!a) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn small tkTalk";
      b.textContent = "話す";
      b.disabled = !!a.disabled;
      b.title = a.disabled ? "今日はもう話した" : `${a.label}（${a.sub || ""}）`;
      b.onclick = () => { ui.setSheetOpen(false); G.act(a.id); ui.after(); };
      el.append(b);
    });
  }
})(globalThis.G = globalThis.G || {});
