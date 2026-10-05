// U17：噂を「受けている依頼」の窓に（図鑑の「噂」のタブから移した）。依頼になる手前の手がかりとして、依頼の一覧の下に並べる
// - 一つ一つに、続きがありそうな所か会えば分かりそうな相手を添える。依頼になった噂は「依頼になった」として下へ（薄く）
// - 新しい噂には「新」（一覧を閉じたら消える）。右上の「依頼」の赤い「！」は u17_quest_new.js（S.q17.bang）
// 中身はエンジン（engine/zzzzzzzzzzz_u17_rumors.js の G.q17.rumors）。q7_quests.js は書き換えず、G.ui.openQuests・G.ui.render を包む。見た目は ui/u17_quest_new.css。レーン U
(function (G) {
  const U = G.q17;
  if (typeof document === "undefined" || !U || !U.rumors || !G.ui || !G.ui.render || !G.ui.openQuests) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const dlg = $("#dlgQuests");
  if (!dlg) return;
  const body = dlg.querySelector(".dbody");

  function paint() {
    const S = G.S;
    if (!S || !body) return;
    const old = body.querySelector(".u17rum");
    if (old) old.remove();
    const list = U.rumors(S);
    const sec = h("section", "u17rum");
    sec.append(h("h3", "u17rumh", `噂（${list.length}）`));
    if (!list.length) sec.append(h("p", "fine", "まだ噂は聞いていない。酒場で耳を澄ませたり、町をぶらついたりすると入ってくる。"));
    else {
      sec.append(h("p", "fine u17rumlead", "依頼になる手前の話。続きを追えば、依頼や手がかりにつながるかもしれない。"));
      const ul = h("ul", "u17rumlist");
      list.forEach((x) => {
        const li = h("li", "u17r" + (x.quest ? " done" : "") + (x.fresh ? " fresh" : ""));
        const top = h("div", "u17rtop");
        top.append(h("span", "u17rtext", `「${x.text}」`));
        if (x.fresh && !x.quest) top.append(h("span", "u17tag", "新"));
        li.append(top);
        const sub = h("div", "u17rsub fine");
        sub.textContent = x.quest ? `依頼になった：『${x.quest}』` : x.hint;
        if (x.date) sub.append(h("small", "u17rdate", x.date));
        li.append(sub);
        ul.append(li);
      });
      sec.append(ul);
    }
    // 済んだ依頼の欄（q7_quests.js の .q7qdone）より前に置く
    const done = body.querySelector(".q7qdone");
    if (done) body.insertBefore(sec, done); else body.append(sec);
  }

  const open0 = ui.openQuests;
  ui.openQuests = (...a) => {
    const r = open0(...a);
    try { paint(); } catch {}
    return r;
  };
  dlg.addEventListener("close", () => { try { if (G.S) U.rumorClear(G.S); } catch {} });
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { if (dlg.open) paint(); } catch {}
    return r;
  };
})(globalThis.G = globalThis.G || {});
