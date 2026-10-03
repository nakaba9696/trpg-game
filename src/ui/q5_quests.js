// Q5：依頼の画面。キャラクターシートの「受けている依頼」に種類・期限・依頼人を添え、図鑑に「依頼」のタブ（冒険をまたいだ依頼の記録）を足す。
// 中身はエンジン（engine/zzz_q5_quests.js の G.q5.brief・G.P.q5）が持つ。ui.js・f2_codex.js は書き換えない（描いたあとに書き足す）。
// 見た目は ui/q5_quests.css。レーン F（Q5）
(function (G) {
  if (typeof document === "undefined") return;
  const D = G.data;
  const Q5 = G.q5;
  if (!Q5 || !G.ui) return;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---------------------------------------------------------------- シートの「受けている依頼」
  const markSheet = () => {
    const S = G.S;
    if (!S || !S.quests || !S.quests.length) return;
    const sec = [...document.querySelectorAll("#sheet details.ssec")].find((d) => /^受けている依頼/.test((d.querySelector("summary") || {}).textContent || ""));
    if (!sec) return;
    const lis = sec.querySelectorAll("ul > li");
    S.quests.forEach((q, i) => {
      const li = lis[i];
      if (!li || !q.q5 || li.querySelector(".q5brief")) return;
      const left = Q5.daysLeft(q, S);
      const b = h("span", "q5brief fine" + (!q.done && left != null && left <= 2 ? " soon" : ""), Q5.brief(q, S));
      li.append(b);
    });
  };
  const render0 = G.ui.render;
  G.ui.render = (...a) => { const r = render0(...a); try { markSheet(); } catch (e) { /* 書き足しに失敗しても画面は止めない */ } return r; };

  // ---------------------------------------------------------------- 図鑑の「依頼」タブ
  const RES_ORDER = ["ok", "expose", "trap", "ally", "betray", "fail", "lost", "late"];
  const setup = () => {
    const dlg = $("#dlgCodex");
    if (!dlg || dlg.querySelector("[data-tab='q5']")) return;
    const tabs = dlg.querySelector(".tabs");
    const list = dlg.querySelector(".f2list");
    const detail = dlg.querySelector(".f2detail");
    const sum = dlg.querySelector(".f2sum");
    if (!tabs || !list || !detail || !sum) return;
    const tab = h("button", "btn", "依頼");
    tab.type = "button";
    tab.setAttribute("role", "tab");
    tab.dataset.tab = "q5";
    tabs.append(tab);
    // ほかのタブを押したら、こちらの印を消す（中身は f2 が描き直す）
    tabs.querySelectorAll("button").forEach((b) => { if (b !== tab) b.addEventListener("click", () => tab.setAttribute("aria-selected", "false")); });
    const rec = () => (G.P && G.P.q5) || { kinds: {}, log: [] };
    const total = (k) => Object.values(k || {}).reduce((a, n) => a + n, 0);
    const showKind = (t) => {
      const k = (rec().kinds || {})[t.key] || {};
      detail.textContent = "";
      detail.append(h("h3", "f2title", t.name), h("p", "fine", `受けて終えた依頼 ${total(k)} 件`));
      const dl = h("dl", "kv f2kv");
      RES_ORDER.forEach((r) => { if (k[r]) dl.append(h("dt", "", Q5.RES[r]), h("dd", "", `${k[r]} 件`)); });
      detail.append(dl);
      const mine = (rec().log || []).filter((x) => x.kind === t.key).slice(0, 6);
      if (mine.length) {
        const ul = h("ul", "q5log");
        mine.forEach((x) => ul.append(h("li", "", `${x.date}　${x.title}（${Q5.RES[x.r] || x.r}）${x.by ? "──" + x.by : ""}`)));
        detail.append(h("h4", "", "覚えている依頼"), ul);
      }
    };
    const draw = () => {
      tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b === tab)));
      list.textContent = "";
      detail.textContent = "";
      const R = rec();
      const kinds = R.kinds || {};
      const seen = D.Q5.TYPES.filter((t) => total(kinds[t.key]));
      const all = Object.values(kinds).reduce((a, k) => a + total(k), 0);
      const bad = Object.values(kinds).reduce((a, k) => a + (k.betray || 0), 0);
      sum.textContent = `受けた依頼の型 ${seen.length}／${D.Q5.TYPES.length}・終えた依頼 ${all} 件${bad ? `（うち裏切り ${bad}）` : ""}（冒険をまたいで残る）`;
      const g = h("section", "f2group");
      g.append(h("h3", "", `依頼の型　${seen.length}／${D.Q5.TYPES.length}`));
      const grid = h("div", "f2grid f2words");
      D.Q5.TYPES.forEach((t) => {
        const n = total(kinds[t.key]);
        const b = h(n ? "button" : "div", "f2cell" + (n ? "" : " unknown"));
        b.append(h("span", "f2name", n ? t.name : "？？？"));
        if (n) { b.type = "button"; b.append(h("span", "f2tier", `${n} 件`)); b.onclick = () => { grid.querySelectorAll(".f2cell").forEach((x) => x.classList.remove("on")); b.classList.add("on"); showKind(t); }; }
        grid.append(b);
      });
      g.append(grid);
      list.append(g);
      const log = (R.log || []).slice(0, 12);
      if (log.length) {
        const s2 = h("section", "f2group");
        s2.append(h("h3", "", "近ごろの依頼"));
        const ul = h("ul", "q5log");
        log.forEach((x) => ul.append(h("li", "q5r-" + x.r, `${x.date}　${x.title}──${Q5.RES[x.r] || x.r}（依頼人 ${x.client}${x.by ? "・" + x.by : ""}）`)));
        s2.append(ul);
        list.append(s2);
      }
      detail.append(h("p", "fine", all ? "型を選ぶと、その型の依頼の記録が出る。" : "まだ依頼の記録が無い。冒険者ギルドで依頼を受けると、ここに残る。"));
    };
    tab.onclick = draw;
  };
  setTimeout(setup, 0);
})(globalThis.G = globalThis.G || {});
