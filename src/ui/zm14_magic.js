// M14：術の才と覚えた術を画面に出す。
//   作成画面の「能力値」の段に「術の才」の箱（振るたびに変わる。数は出さず言葉で）。確認のシートの一行は engine/m14_magic.js の cre.sheetRows
//   ステータスの「能力」のタブに「術」の欄（才・得意と苦手・属性ごとの覚えた術）。K1 の戦技の欄と同じ作り（ui.render のあとに書き足す）
// 中身はエンジンの G.m14。レーン U（M14）
(function (G) {
  const D = G.data;
  const M = G.m14;
  if (!M) return;
  // 行動の分類（U13）：師に教わる・暮らしの術は「この地で」
  if (G.u13 && G.u13.BY_PREFIX) Object.assign(G.u13.BY_PREFIX, { m14m: "here", m14ga: "here" });
  if (typeof document === "undefined") return;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const elName = (k) => (D.M14_ELEMS[k] || {}).name || k;
  const AFF = D.M14_TALENT.aff;

  // 属性ごとの向き（得意・ふつう・苦手）を一行ずつ
  function affRows(t) {
    const box = el("div", "m14aff");
    D.M14_ELEM_KEYS.forEach((k) => {
      const a = t.lv ? (t.good.includes(k) ? "good" : t.bad.includes(k) ? "bad" : "mid") : "none";
      const row = el("span", "m14el m14" + a);
      row.append(el("b", "", elName(k)), el("span", "", a === "none" ? "―" : AFF[a].replace(/（.*/, "")));
      row.title = a === "none" ? "術の才が無い" : `${D.M14_ELEMS[k].hint}。${AFF[a]}`;
      box.append(row);
    });
    return box;
  }

  // ---------------------------------------------------------------- 作成画面
  if (G.setup) {
    G.setup.statsExtra = (root, draft) => {
      if (!draft.m14) return;
      const t = M.ofDraft(draft);
      const w = M.words(t);
      const box = el("section", "box m14cre");
      const bh = el("div", "boxhead");
      bh.append(el("b", "", "術の才"), el("span", "m14lv m14lv" + t.lv, w.lv), el("span", "fine", "能力値と一緒に振り直される。種族と職業で変わる"));
      box.append(bh, el("p", "m14say", w.say), affRows(t));
      if (t.lv) box.append(el("p", "fine", "得意な属性は上級まで届き、覚えやすく、成功しやすい。ふつうの属性は中級まで。苦手な属性は初級止まりで、覚えにくい。"));
      root.append(box);
    };
  }

  // ---------------------------------------------------------------- ステータスの「術」の欄
  const ui = G.ui;
  if (!ui || !ui.render) return;
  let open = true;
  function paint(S) {
    const pane = document.getElementById("spane-self");
    if (!pane || pane.querySelector(".m14sheet")) return;
    const t = M.talent(S);
    const w = M.words(t);
    const known = M.known(S).filter((id) => !D.SPELLS[id].generic);
    const d = el("details", "ssec m14sheet");
    d.open = open;
    d.addEventListener("toggle", () => { open = d.open; });
    d.append(el("summary", "lab", `術（${known.length}）・${w.lv}`));
    const list = el("div", "k1list");
    list.append(el("p", "k1hint", w.say), affRows(t));
    if (!known.length) list.append(el("p", "k1hint", t.lv ? "まだ術を覚えていない。初級は学院か魔導書、中級は師に、上級は伝承の書や強敵との戦いの中で。" : "術は覚えられない。巻物なら、一度きり使える。"));
    known.forEach((id) => {
      const sp = D.SPELLS[id];
      const row = el("div", "k1row");
      row.append(el("span", "nm", sp.name), el("span", "k1lv", `${elName(sp.el)}・${D.M14_TIERS[sp.tier || 1]}`), el("span", "k1meta", `MP${sp.mp}`), el("span", "k1fx", sp.hint || ""));
      list.append(row);
    });
    const gen = M.known(S).filter((id) => D.SPELLS[id].generic);
    if (gen.length) {
      const row = el("div", "k1row");
      row.append(el("span", "nm", "暮らしの術"), el("span", "k1lv", ""), el("span", "k1meta", ""), el("span", "k1fx", gen.map((id) => D.SPELLS[id].name).join("・")));
      list.append(row);
    }
    d.append(list);
    const after = pane.querySelector(".k1skills.k1skills2") || pane.querySelector(".f3marks") || ((pane.querySelector(".statlist") || {}).closest ? pane.querySelector(".statlist").closest("details") : null);
    if (after && after.parentNode === pane) after.after(d); else pane.append(d);
  }
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { if (G.S && !G.S.over) paint(G.S); } catch (e) { /* 術の欄が描けなくても遊びは止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
