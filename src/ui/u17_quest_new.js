// U17：依頼が増えた・進んだときの印（持ち主の声「依頼が追加されたらビックリマークをつけて」）
// - 右上の「依頼」（#q7Quests）に、図鑑と同じ赤い「！」（class "u17fresh"）。一覧を開いたら消える（G.q17.seen）
// - 一覧の中で、新しく増えた依頼に「新」、中身が進んだ依頼に「進展」。一覧を閉じたら消える（G.q17.clear）
// - 記録の色付きの一行（k: "quest"）は ui.js の LOG_CLS が l-quest にする
// 状態はエンジン（src/engine/zzzzzzzzzzz_u17_quest_new.js の S.q17）。ここは描くだけ。q7_quests.js は書き換えず、G.ui.render・G.ui.openQuests を包む。見た目は ui/u17_quest_new.css。レーン U
(function (G) {
  const U = G.q17;
  if (typeof document === "undefined" || !U || !G.ui || !G.ui.render || !G.ui.openQuests) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const LABEL = { new: "新", up: "進展" };

  // 一覧の行に「新」「進展」（q7_quests.js が描き直すたびに付け直す）
  function decorate() {
    const S = G.S;
    const dlg = $("#dlgQuests");
    if (!S || !dlg) return;
    dlg.querySelectorAll("details.q7q[data-quest]").forEach((d) => {
      const how = U.freshOf(S, d.dataset.quest);
      const top = d.querySelector(".q7qtop");
      let tag = d.querySelector(".u17tag");
      if (!how) { if (tag) tag.remove(); return; }
      if (!tag && top) { tag = h("span", "u17tag"); const name = top.querySelector(".q7qname"); if (name) name.after(tag); else top.prepend(tag); }
      if (tag) { tag.textContent = LABEL[how] || LABEL.new; tag.classList.toggle("up", how === "up"); }
      d.classList.toggle("u17fresh", true);
    });
  }
  // 右上の「依頼」の赤い「！」
  function mark() {
    const b = $("#q7Quests");
    if (!b) return;
    const on = !!(G.S && U.bang(G.S));
    b.classList.toggle("u17fresh", on);
    const lab = (b.getAttribute("aria-label") || "").replace(/（新しい知らせあり）$/, "");
    if (lab) b.setAttribute("aria-label", on ? lab + "（新しい知らせあり）" : lab);
  }

  const open0 = ui.openQuests;
  ui.openQuests = (...a) => {
    const r = open0(...a);
    try { decorate(); if (G.S) U.seen(G.S); mark(); } catch {}
    return r;
  };
  const dlg = $("#dlgQuests");
  if (dlg) dlg.addEventListener("close", () => { try { if (G.S) U.clear(G.S); mark(); if (G.main && G.main.save && G.S && !G.S.over) G.main.save(); } catch {} });

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { mark(); if (dlg && dlg.open) decorate(); } catch {}
    return r;
  };
})(globalThis.G = globalThis.G || {});
