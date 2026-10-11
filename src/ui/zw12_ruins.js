// W12：図鑑の頁「古い文明」。遺跡ごとに断片（碑文・壁画・遺物）を並べ、まだ見ていないものは「？？？」。選ぶと読めた行を出す。
// 中身はエンジン（engine/w12_ruins.js）と G.P.w12（冒険をまたいで残る）。ここは描くだけ。前の冒険で見つけたものは薄く「前の冒険で」。
// 全部そろったことがあれば、頁のいちばん下に分かったこと（D.W12_SECRET）。
// 既存の画面のファイルは書き換えない（タブと区画はここで足す。zk_know_l1.js と同じやり方）。名前の頭の zw は f2_codex.js より後に読ませるため。
// 見た目は ui/zw12_ruins.css。レーン W＋F（W12）
(function (G) {
  if (typeof document === "undefined") return;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const dlg = $("#dlgCodex");
  const W12 = G.w12;
  if (!dlg || !W12) return;
  const D = G.data;
  const tabs = dlg.querySelector(".tabs");
  const body = dlg.querySelector(".dbody");
  const pane = h("div", "w12pane");
  pane.hidden = true;
  body.append(pane);
  const btn = h("button", "btn", "古い文明");
  btn.type = "button";
  btn.setAttribute("role", "tab");
  btn.dataset.tab = "w12";
  btn.setAttribute("aria-selected", "false");
  tabs.append(btn);
  const others = () => [...body.children].filter((x) => x !== pane && x !== tabs);
  const showMe = () => {
    tabs.querySelectorAll("[role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
    others().forEach((x) => { if (x.dataset.w12hid == null) { x.dataset.w12hid = x.hidden ? "1" : ""; x.hidden = true; } });
    pane.hidden = false;
    draw();
  };
  const hideMe = () => {
    if (pane.hidden) return;
    pane.hidden = true;
    others().forEach((x) => { if (x.dataset.w12hid != null) { x.hidden = x.dataset.w12hid === "1"; delete x.dataset.w12hid; } });
    btn.setAttribute("aria-selected", "false");
  };
  btn.onclick = showMe;
  tabs.addEventListener("click", (ev) => { const b = ev.target.closest("[role=tab]"); if (b && b !== btn) hideMe(); }, true);
  tabs.addEventListener("keydown", (ev) => { if ((ev.key === "ArrowRight" || ev.key === "ArrowLeft") && !pane.hidden) hideMe(); }, true);
  dlg.addEventListener("close", hideMe);

  let sel = null;
  function draw() {
    pane.textContent = "";
    const S = G.S;
    const P = W12.prof();
    const all = W12.all();
    const mine = S ? W12.st(S).got : {};
    const ever = all.filter((f) => P.got[f.id]).length;
    pane.append(h("p", "fine w12sum", `古い文明の断片 ${ever} / ${all.length}${S ? `（この冒険で ${W12.count(S)}）` : ""}。遺跡の迷宮の中で、碑文を読み、仕掛けを解き、遺物を調べると書き留められる。死んでも、引退しても残る。`));
    const wrap = h("div", "f2panes");
    const list = h("div", "f2list");
    const detail = h("div", "f2detail");
    detail.setAttribute("aria-live", "polite");
    wrap.append(list, detail);
    pane.append(wrap);
    Object.entries(D.W12_RUINS || {}).forEach(([loc, R]) => {
      const fr = R.frags.map((f) => ({ ...f, loc }));
      const g = h("section", "f2group");
      g.append(h("h3", "", `${R.name}　${fr.filter((f) => P.got[f.id]).length} / ${fr.length}`));
      g.append(h("p", "fine w12nature", R.nature));
      const grid = h("div", "f2grid f2words");
      fr.forEach((f) => {
        const rec = P.got[f.id];
        if (!rec) { grid.append(h("div", "f2cell unknown", "？？？")); return; }
        const c = h("button", "f2cell" + (mine[f.id] ? "" : " past") + (sel === f.id ? " on" : ""));
        c.type = "button";
        c.append(h("span", "f2name", f.name));
        c.onclick = () => { sel = f.id; list.querySelectorAll(".f2cell.on").forEach((x) => x.classList.remove("on")); c.classList.add("on"); show(detail, f); };
        grid.append(c);
      });
      g.append(grid);
      list.append(g);
    });
    const f = sel && W12.frag(sel);
    if (f && P.got[f.id]) show(detail, f);
    else detail.append(h("p", "fine", "一覧から選ぶと、書き留めたことが出る。"));
    if (P.done && D.W12_SECRET) {
      const sec = h("section", "w12secret");
      sec.append(h("h3", "", "断片をつなぐと"));
      D.W12_SECRET.text.slice(0, -1).forEach((t) => sec.append(h("p", "", t)));
      pane.append(sec);
    }
  }
  function show(detail, f) {
    const S = G.S;
    const rec = W12.prof().got[f.id];
    const n = Math.max(rec.n || 0, (S && W12.st(S).got[f.id]) || 0);
    detail.textContent = "";
    detail.append(h("h3", "f2title", f.name));
    detail.append(h("p", "fine", `${(D.W12_RUINS[f.loc] || {}).name || ""}・${W12.KIND[f.kind]}${S && W12.st(S).got[f.id] ? "" : "・前の冒険で"}${rec.by ? "・" + rec.by : ""}${rec.date ? "・" + rec.date : ""}`));
    f.lines.slice(0, n).forEach((t) => { const p = h("p", "w12line"); if (G.f2 && G.f2.paintText) G.f2.paintText(p, t, "lore"); else p.textContent = t; detail.append(p); });
    if (n < f.lines.length) detail.append(h("p", "fine", "（続きの古い字は読めなかった）"));
  }
})(globalThis.G = globalThis.G || {});
