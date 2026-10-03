// L1：覚え書きと記録の画面。図鑑に「覚え書き」の頁（覚えたことの一覧・出来事でどれを選んで何が起きたか・店の品と値段。
// まだ埋まっていない数は「？？？」で）、年表と墓碑に「最期の様子」（何で死んだか・そのとき何が起きていたか）と「次に活かせること」、覚えたときの通知。
// 中身はエンジン（engine/zzz_know_l1.js）が引く。ここは描くだけ。名前の頭の zk は、f2_codex.js（図鑑の窓）・ending_m6.js（年表）より後に読ませるため。
// 既存の画面のファイルは書き換えない（タブと区画はここで足す）。見た目は ui/zk_know_l1.css。レーン C＋F（L1）
(function (G) {
  if (typeof document === "undefined") return;
  const L1 = G.l1 || {};
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---------------------------------------------------------------- 図鑑の頁
  const dlg = $("#dlgCodex");
  if (dlg) {
    const tabs = dlg.querySelector(".tabs");
    const body = dlg.querySelector(".dbody");
    const pane = h("div", "l1pane");
    pane.hidden = true;
    body.append(pane);
    const btn = h("button", "btn", "覚え書き");
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.dataset.tab = "know";
    btn.setAttribute("aria-selected", "false");
    tabs.append(btn);
    const others = () => [...body.children].filter((x) => x !== pane && x !== tabs);
    const showKnow = () => {
      tabs.querySelectorAll("[role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      others().forEach((x) => { x.dataset.l1hid = x.hidden ? "1" : ""; x.hidden = true; });
      pane.hidden = false;
      draw();
    };
    const hideKnow = () => {
      if (pane.hidden) return;
      pane.hidden = true;
      others().forEach((x) => { x.hidden = x.dataset.l1hid === "1"; });
      btn.setAttribute("aria-selected", "false");
    };
    btn.onclick = showKnow;
    // 図鑑のほかのタブを押したら、覚え書きの頁を閉じる（f2_codex.js の show が aria-selected を付け直す）
    tabs.addEventListener("click", (ev) => { const b = ev.target.closest("[role=tab]"); if (b && b !== btn) hideKnow(); }, true);
    tabs.addEventListener("keydown", (ev) => { if ((ev.key === "ArrowRight" || ev.key === "ArrowLeft") && !pane.hidden) hideKnow(); }, true);
    dlg.addEventListener("close", hideKnow);

    function draw() {
      pane.textContent = "";
      const D = G.data;
      const c = G.knowCount();
      pane.append(h("p", "fine l1sum", `覚え書き ${c.known} / ${c.all}・出会った出来事 ${c.events.known} / ${c.events.all}・のぞいた店 ${c.shops.known} / ${c.shops.all}。死んでも、引退しても残る。次の冒険で考える材料にする。`));
      (L1.KINDS || []).forEach(({ key, name }) => {
        const k = c.kinds[key];
        if (!k || !k.all) return;
        const sec = h("section", "l1group");
        sec.append(h("h3", "", `${name}　${k.known} / ${k.all}`));
        const ul = h("ul", "l1list");
        G.knowList(key).forEach((e) => {
          const li = h("li", "");
          li.append(h("p", "l1text", e.text));
          const r = e.rec || {};
          li.append(h("p", "fine", `${(L1.HOW || {})[r.how] || ""}覚えた${r.by ? "・" + r.by : ""}${r.date ? "・" + r.date : ""}`));
          ul.append(li);
        });
        const rest = k.all - k.known;
        if (rest) { const li = h("li", "l1unknown"); li.append(h("p", "", `？？？ … まだ ${rest} つ`)); ul.append(li); }
        sec.append(ul);
        pane.append(sec);
      });
      // 出来事：選んだ選択肢と、何が起きたか（成功・失敗・戦い・死んだ）
      const kev = (G.P && G.P.kev) || {};
      const evs = (D.EVENTS || []).filter((e) => kev[e.id]);
      const sec = h("section", "l1group");
      sec.append(h("h3", "", `出来事でどれを選んだか　${c.events.known} / ${c.events.all}`));
      sec.append(h("p", "fine", "✓ うまくいった　✗ しくじった　⚔ 戦いになった　☠ そのあと死んだ　・ まだ選んでいない"));
      const ul = h("ul", "l1list l1ev");
      evs.forEach((e) => {
        const li = h("li", "");
        li.append(h("p", "l1evt", e.title || e.id));
        const ol = h("ul", "l1ch");
        e.choices.forEach((ch, i) => {
          const r = kev[e.id][i];
          const marks = r ? [r.ok ? `✓${r.ok}` : "", r.ng ? `✗${r.ng}` : "", r.fight ? `⚔${r.fight}` : "", r.dead ? `☠${r.dead}` : ""].filter(Boolean).join(" ") : "・";
          const row = h("li", r ? (r.dead ? "dead" : "seen") : "");
          row.append(h("span", "l1mark", marks), h("span", "", String(ch.label || "").replace(/\{.*?\}/g, "…")));
          ol.append(row);
        });
        li.append(ol);
        ul.append(li);
      });
      const restE = c.events.all - c.events.known;
      if (restE > 0) { const li = h("li", "l1unknown"); li.append(h("p", "", `？？？ … まだ ${restE} の出来事`)); ul.append(li); }
      sec.append(ul);
      pane.append(sec);
      // 店の品と値段
      const ks = (G.P && G.P.kshop) || {};
      const ss = h("section", "l1group");
      ss.append(h("h3", "", `店の品と値段　${c.shops.known} / ${c.shops.all}`));
      const su = h("ul", "l1list");
      Object.entries(ks).forEach(([loc, r]) => {
        const L = (D.LOCS || {})[loc];
        if (!L) return;
        const li = h("li", "");
        li.append(h("p", "l1evt", L.name));
        li.append(h("p", "l1text", Object.entries(r.items || {}).map(([id, p]) => `${(G.itemInfo(id) || {}).name || id} ${p}G`).join("・")));
        if (r.date) li.append(h("p", "fine", `${r.date}に見た`));
        su.append(li);
      });
      const restS = c.shops.all - c.shops.known;
      if (restS > 0) { const li = h("li", "l1unknown"); li.append(h("p", "", `？？？ … まだ ${restS} の店`)); su.append(li); }
      ss.append(su);
      pane.append(ss);
    }
  }

  // ---------------------------------------------------------------- 年表と墓碑：次に活かせること
  const ui = G.ui;
  if (ui && ui.openChronicle) {
    const baseChron = ui.openChronicle;
    ui.openChronicle = (run, fromEnd) => {
      baseChron(run, fromEnd);
      const ep = $("#epitaph");
      let box = $("#l1Next");
      if (box) box.remove();
      const list = G.knowOfRun ? G.knowOfRun(run) : [];
      if (!(run.over || run.end) || !ep) return;
      box = h("section", "l1next");
      box.id = "l1Next";
      const last = G.lastOfRun ? G.lastOfRun(run) : null;
      if (last) {
        box.append(h("h3", "", "最期の様子"));
        const dl = h("dl", "l1last");
        const row = (k, v) => { if (v) dl.append(h("dt", "", k), h("dd", "", v)); };
        row("何で死んだか", last.cause);
        row("場所", `${last.where}${last.depth ? `・地下${last.depth}階` : ""}`);
        if (last.event) row("直前の出来事", `${last.event.title}（「${String(last.event.choice).replace(/\{.*?\}/g, "…")}」を選んだ）`);
        if ((last.foes || []).length) row("戦っていた相手", last.foes.map((f) => `${f.name}（残り ${f.hp}/${f.max}）`).join("・") + (last.round ? `・${last.round}手目` : ""));
        row("そのときの体", `HP ${last.hp}/${last.maxHp}${(last.conds || []).length ? "・" + last.conds.join("・") : ""}`);
        box.append(dl);
        if ((last.lines || []).length) {
          const ol = h("ol", "l1lines");
          last.lines.forEach((t) => ol.append(h("li", "", t)));
          box.append(h("p", "fine", "倒れる前に起きていたこと"), ol);
        }
      }
      box.append(h("h3", "", "次に活かせること"));
      if (!list.length) box.append(h("p", "fine", "この冒険で、新しく覚えたことはなかった。"));
      const ul = h("ul", "");
      list.forEach((x) => {
        const li = h("li", x.death ? "death" : "");
        if (x.death) li.append(h("b", "", "死に際に："));
        li.append(h("span", "", x.text));
        ul.append(li);
      });
      if (list.length) box.append(ul);
      ep.after(box);
    };
  }

  // ---------------------------------------------------------------- 覚えたときの通知（U8 の左下の箱。無ければふつうの通知）
  let noteT = 0;
  G.onKnow = (id) => {
    const k = (G.data.KNOW || {})[id];
    if (!k) return;
    const box = $("#u8note");
    if (!box) { if (G.ui && G.ui.toast) G.ui.toast("覚え書き：", k.title); return; }
    const line = h("div", "u8line l1line-note");
    line.append(h("span", "u8star", "✎"), h("span", "", "覚え書き："), h("b", "", k.title));
    box.append(line);
    while (box.children.length > 4) box.firstChild.remove();
    box.hidden = false;
    clearTimeout(noteT);
    noteT = setTimeout(() => { box.querySelectorAll(".l1line-note").forEach((x) => x.remove()); if (!box.children.length) box.hidden = true; }, 4200);
  };
})(globalThis.G = globalThis.G || {});
