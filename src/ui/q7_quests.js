// Q7：受けている依頼の一覧の窓。中身はエンジン（src/engine/q7_quests.js の G.q7.list・G.q7.finished）、ここは描くだけ。
// 入口：帯の下の段（U11 の [ステータス][図鑑][地図]）に「依頼」、キーの近道 Q（同じキーで閉じる）。ステータスの中には置かない（Q7 のステータスの整理）。
// 帯の段は zu11_quick.js（このファイルより後に読まれる）が作るので、はじめて描くときに足す。ui.js は書き換えず G.ui.render を包む。
// 見た目は ui/q7_quests.css。レーン U
(function (G) {
  const Q7 = G.q7;
  if (typeof document === "undefined" || !Q7 || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const button = (label, cls, fn) => { const b = h("button", "btn" + (cls ? " " + cls : ""), label); b.type = "button"; b.onclick = fn; return b; };

  // ---------------------------------------------------------------- 窓
  const dlg = h("dialog", "q7qdlg");
  dlg.id = "dlgQuests";
  dlg.setAttribute("aria-labelledby", "q7qTitle");
  const head = h("div", "dhead");
  const title = h("h2", "", "受けている依頼");
  title.id = "q7qTitle";
  head.append(title, button("閉じる", "", () => dlg.close()));
  const body = h("div", "dbody");
  dlg.append(head, body);
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  document.body.append(dlg);

  const openKeys = new Set(); // 開いている依頼（描き直しても開いたまま）
  function row(e) {
    const d = h("details", `q7q q7q-${e.state} q7q-${e.src}`);
    d.dataset.quest = e.key;
    d.open = openKeys.has(e.key);
    d.addEventListener("toggle", () => { if (d.open) openKeys.add(e.key); else openKeys.delete(e.key); });
    const s = h("summary", "q7qsum");
    const top = h("span", "q7qtop");
    top.append(h("b", "q7qname", e.title), h("span", `q7qstate s-${e.state}`, e.stateLabel));
    const sub = h("span", "q7qsub fine", [e.kind, `依頼主 ${e.client}`, e.from ? `${e.from}で受けた` : "", e.progress].filter(Boolean).join("・"));
    s.append(top, sub);
    if (e.report) s.append(h("span", "q7qreport", `報告：${e.report.where}${e.report.near ? `。近いのは${e.report.near}` : ""}`));
    d.append(s);
    const box = h("div", "q7qbody");
    e.desc.forEach((t) => box.append(h("p", "", t)));
    const dl = h("dl", "kv q7qkv");
    const kv = (k, v) => { if (v) dl.append(h("dt", "", k), h("dd", "", v)); };
    kv("報酬", e.reward);
    if (e.deadline) kv("期限", `${e.deadline.date}まで（${e.deadline.left > 0 ? `あと${e.deadline.left}日` : e.deadline.left === 0 ? "今日まで" : "過ぎている"}）`);
    kv("進み具合", e.progress);
    if (dl.childNodes.length) box.append(dl);
    d.append(box);
    return d;
  }

  function paint() {
    body.textContent = "";
    const S = G.S;
    const list = Q7.list(S);
    const done = Q7.finished(S);
    const ready = list.filter((e) => e.state === "ready").length;
    title.textContent = `受けている依頼（${list.length}）`;
    if (!list.length) body.append(h("p", "q7qnone", "受けている依頼は無い。町の冒険者ギルドの掲示板で受けられる。仲間と話していると、頼みごとをされることもある。"));
    else {
      if (ready) body.append(h("p", "q7qlead", `報告を待っている依頼が ${ready} 件ある。どの町の冒険者ギルドでも報告できる。`));
      const ul = h("div", "q7qlist");
      list.forEach((e) => ul.append(row(e)));
      body.append(ul);
    }
    if (done.length) {
      const d = h("details", "q7qdone");
      d.append(h("summary", "", `済んだ依頼（${done.length}）`));
      const ol = h("ul", "q7qdonelist");
      done.forEach((x) => {
        const li = h("li", x.failed ? "failed" : "");
        li.append(h("span", "q7qdname", x.title), h("span", "fine", [x.date, x.result].filter(Boolean).join("・")));
        ol.append(li);
      });
      d.append(ol);
      body.append(d);
    }
  }

  ui.openQuests = () => {
    if (!G.S) return;
    paint();
    if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); } }
    const f = body.querySelector("summary") || head.querySelector("button");
    if (f) f.focus({ preventScroll: true });
  };

  // ---------------------------------------------------------------- 入口：帯の段
  const qbtn = h("button", "btn u11qb q7qbtn");
  qbtn.id = "q7Quests";
  qbtn.type = "button";
  qbtn.title = "受けている依頼（Q）";
  const qlabel = h("span", "u11ql", "依頼");
  const qmark = h("span", "q7qmark");
  qmark.hidden = true;
  const kbd = h("kbd", "u11key", "Q");
  kbd.setAttribute("aria-hidden", "true");
  qbtn.append(qlabel, qmark, kbd);
  qbtn.onclick = () => ui.openQuests();

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      const S = G.S;
      if (!qbtn.isConnected) {
        const rowEl = $("#mbar .u11quick");
        const map = rowEl && rowEl.querySelector("#u11Map");
        if (map) map.after(qbtn); else if (rowEl) rowEl.append(qbtn); else { const t = $(".top .tools"); if (t) t.append(qbtn); } // 帯の段が無ければ右上（zz_q7_topbar.js が並べ直す）
      }
      const n = S ? Q7.list(S).length : 0;
      const ready = S ? Q7.readyCount(S) : 0;
      qmark.hidden = !ready;
      qmark.textContent = ready ? "！" : "";
      qbtn.setAttribute("aria-label", `依頼 ${n}件${ready ? `（報告待ち ${ready}件）` : ""}`);
      if (dlg.open) paint();
    } catch { /* 入口が付かなくても画面は止めない */ }
    return r;
  };

  // ---------------------------------------------------------------- キーの近道 Q
  document.addEventListener("keydown", (ev) => {
    const t = ev.target;
    const typing = !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));
    const open = document.querySelector("dialog[open]");
    const play = $("#play");
    const a = Q7.keyAction(ev, typing, open ? open.id || "?" : null, !!(G.S && play && !play.hidden));
    if (!a) return;
    ev.preventDefault();
    if (a === "close") dlg.close();
    else ui.openQuests();
  });
})(globalThis.G = globalThis.G || {});
