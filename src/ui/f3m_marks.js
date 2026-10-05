// F3：ステータスの「能力」のタブに、能力値の節目（届いた名と、次の節目まであと何点で何ができるようになるか）を足す。
// 中身はエンジンの G.f3m.view。ui.render のあとに書き足す（ほかの欄の形は変えない）。レーン U（F3）
(function (G) {
  const ui = G.ui;
  if (!ui || !ui.render || typeof document === "undefined" || !G.f3m) return;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let open = true;

  function paint(S) {
    const pane = document.getElementById("spane-self");
    if (!pane || pane.querySelector(".f3marks")) return;
    const rows = G.f3m.view(S);
    if (!rows.length) return;
    const d = el("details", "ssec f3marks");
    d.open = open;
    d.addEventListener("toggle", () => { open = d.open; });
    const n = rows.reduce((a, r) => a + r.got.length, 0);
    d.append(el("summary", "lab", n ? `節目（${n}）` : "節目"));
    const list = el("div", "f3list");
    rows.forEach((r) => {
      const row = el("div", "f3row");
      row.append(el("span", "nm", r.stat));
      const got = el("span", "got");
      if (r.got.length) r.got.forEach((m) => { const b = el("b", "f3name", m.name); b.title = m.gain; got.append(b); });
      else got.append(el("span", "none", "—"));
      row.append(got);
      if (r.next) {
        const nx = el("span", "next", `あと ${r.next.left} で「${r.next.name}」`);
        nx.title = r.next.gain;
        row.append(nx);
      } else row.append(el("span", "next done", "極めた"));
      list.append(row);
    });
    // いちばん近い節目で、何ができるようになるか
    const near = rows.filter((r) => r.next).sort((a, b) => a.next.left - b.next.left)[0];
    if (near) list.append(el("p", "f3hint", `次の節目：${near.stat}「${near.next.name}」──${near.next.gain}。`));
    d.append(list);
    const stats = pane.querySelector(".statlist");
    const sec = stats && stats.closest("details");
    if (sec && sec.parentNode === pane) sec.after(d); else pane.append(d);
  }

  // 節目に届いた手番：「能力値が伸びた！」の札（U13 の #u13grow）に一行足す。札が出ていなければ小さな通知で
  let seen = null; // { run, keys }
  function announce(S) {
    const marks = (S.f3m && S.f3m.marks) || {};
    const keys = Object.keys(marks).filter((k) => marks[k]);
    if (!seen || seen.run !== S.id) { seen = { run: S.id, keys: new Set(keys) }; return; }
    const fresh = keys.filter((k) => !seen.keys.has(k));
    fresh.forEach((k) => seen.keys.add(k));
    if (!fresh.length) return;
    setTimeout(() => {
      const box = document.getElementById("u13grow");
      fresh.forEach((k) => {
        const [st, t] = k.split(":");
        const m = G.f3m.mark(st, +t);
        if (!m) return;
        if (box && !box.hidden) {
          const line = el("div", "f3pop", `節目「${m.name}」──${m.gain}`);
          const hint = box.querySelector(".u13ghint");
          if (hint) hint.before(line); else box.append(line);
        } else if (ui.toast) ui.toast(`節目「${m.name}」`, m.gain);
      });
    }, 0);
  }

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { if (G.S && !G.S.over) { paint(G.S); announce(G.S); } } catch (e) { /* 節目の欄が描けなくても遊びは止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
