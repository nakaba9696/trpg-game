// U17：行動の分類（U13 の「街で」「冒険」…の札）に、依頼・噂の続きに関係ある選択肢が中にあれば「◆」を付ける
// （旅立つボタンの印は「冒険」の札を開かないと見えないため）。印の中身はエンジンの G.actMarks（engine/zzzzzzzzzzz_u17_marks.js）。
// u13_menu.js は書き換えず、G.ui.render を包む（名前順で u13_menu.js より後）。見た目は ui/u17_quest_new.css。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render || !G.actMarks || !G.u13 || !G.u13.plan) return;
  const ui = G.ui;
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      const S = G.S;
      const tabs = document.querySelectorAll("#panel .u13tab[data-u13]");
      if (!S || !tabs.length) return r;
      const groups = G.actions();
      const plan = G.u13.plan(groups, S);
      if (!plan || !plan.tabs) return r;
      const marks = G.actMarks(S, groups);
      tabs.forEach((b) => {
        b.querySelectorAll(".u17tabmark").forEach((x) => x.remove());
        const t = plan.tabs.find((x) => x.key === b.dataset.u13);
        const hit = t ? t.ids.filter((id) => marks[id]) : [];
        if (!hit.length) return;
        const m = document.createElement("i");
        m.className = "u17tabmark";
        m.textContent = "◆";
        m.title = "依頼・噂の続きに関係ある選択肢がある：" + hit.map((id) => marks[id]).join("／");
        m.setAttribute("aria-label", "依頼に関係ある選択肢がある");
        b.append(m);
      });
    } catch { /* 印が付かなくても画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
