// I2：アイテムのフレーバーの説明を画面に出す（説明の文は src/data/i2_flavor.js、効果は G.itemEffect）。
//   ・持ち物の窓：品の名前にマウスを乗せると札（名前・効果・説明）。押す（選ぶ）と、行の下に説明が開く（スマホでも読める）
//   ・装備の行（武器・防具・装飾品）：マウスを乗せると札
//   ・商店・戦闘の道具など、行動のボタンが品を指しているとき：マウスを乗せる・キーで選ぶと札
//   ・記録の文（宝箱で手に入れた・買った・拾った）：品の名前に点線。マウスを乗せると札
// ui.js は書き換えず、描いたあとに印（data-i2item）を付けて包む。見た目は src/ui/zi2_flavor.css。レーン I（I2）
(function (G) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.render) return;
  const D = G.data;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // ---------------------------------------------------------------- 札
  const card = h("div");
  card.id = "i2card";
  card.setAttribute("role", "tooltip");
  card.hidden = true;
  document.body.append(card);
  const fill = (box, id) => {
    const it = G.itemInfo(id);
    if (!it) return false;
    const eff = G.itemEffect ? G.itemEffect(it) : "";
    const fl = G.itemFlavor ? G.itemFlavor(id) : "";
    box.textContent = "";
    box.append(h("b", "i2name", it.name));
    if (eff) box.append(h("span", "i2eff", eff));
    if (fl) box.append(h("p", "i2fl", fl));
    return !!(eff || fl);
  };
  let shownFor = null;
  function show(el) {
    const id = el.dataset.i2item;
    if (!id || !fill(card, id)) return hide();
    shownFor = el;
    card.hidden = false;
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
    const w = card.offsetWidth, hh = card.offsetHeight;
    let x, y;
    if (el.closest("#sheet") && r.left - w - 12 > 8) {
      // ステータスの窓（右に重なる）の中なら、左に出す
      x = r.left - w - 12;
      y = Math.max(8, Math.min(vh - hh - 8, r.top + r.height / 2 - hh / 2));
    } else {
      x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
      y = r.top - hh - 8 < 8 ? Math.min(vh - hh - 8, r.bottom + 8) : r.top - hh - 8;
    }
    card.style.left = Math.round(x) + "px";
    card.style.top = Math.round(y) + "px";
  }
  function hide() { card.hidden = true; shownFor = null; }
  const target = (ev) => ev.target && ev.target.closest && ev.target.closest("[data-i2item]");
  document.addEventListener("mouseover", (ev) => { const t = target(ev); if (t && t !== shownFor) show(t); });
  document.addEventListener("mouseout", (ev) => { const t = target(ev); if (t && !t.contains(ev.relatedTarget)) hide(); });
  document.addEventListener("focusin", (ev) => { const t = target(ev); if (t && t.matches(":focus-visible")) show(t); });
  document.addEventListener("focusout", (ev) => { if (target(ev)) hide(); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") hide(); });
  window.addEventListener("scroll", hide, true);

  // ---------------------------------------------------------------- 持ち物の窓・装備の行
  const open = new Set(); // 説明を開いている品（描き直しても開いたまま）
  function markSheet() {
    const S = G.S;
    if (!S) return;
    const sec = $$("#sheet details.ssec").find((d) => /^持ち物/.test(($("summary", d) || {}).textContent || ""));
    const ids = Object.keys(S.inv || {});
    if (sec && ids.length) {
      const lis = $$("ul.inv > li", sec);
      if (lis.length === ids.length) lis.forEach((li, i) => {
        const id = ids[i];
        const it = G.itemInfo(id);
        const nm = li.querySelector(":scope > span");
        if (!it || !nm || !G.itemFlavor(id)) return;
        li.removeAttribute("title"); // ブラウザの小さな吹き出しと重ねない
        li.classList.add("i2row");
        nm.dataset.i2item = id;
        nm.classList.add("i2pick");
        nm.tabIndex = 0;
        nm.setAttribute("role", "button");
        nm.setAttribute("aria-expanded", open.has(id) ? "true" : "false");
        const toggle = () => { if (open.has(id)) open.delete(id); else open.add(id); hide(); markOpen(li, id, nm); };
        nm.onclick = toggle;
        nm.onkeydown = (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(); } };
        markOpen(li, id, nm);
      });
    }
    // 装備の行
    const S2 = { 武器: S.weapon, 防具: S.armor, 装飾品: S.ring };
    $$("#sheet dl.kv > dt").forEach((dt) => {
      const id = S2[dt.textContent];
      const dd = dt.nextElementSibling;
      if (id && dd && D.ITEMS[id] && G.itemFlavor(id)) dd.dataset.i2item = id;
    });
  }
  function markOpen(li, id, nm) {
    let p = li.querySelector(":scope > .i2more");
    if (!open.has(id)) { if (p) p.remove(); nm.setAttribute("aria-expanded", "false"); return; }
    if (!p) { p = h("div", "i2more"); li.append(p); }
    fill(p, id);
    nm.setAttribute("aria-expanded", "true");
  }

  // ---------------------------------------------------------------- 行動のボタン（商店で買う・売る、戦闘で使う など）
  let lastActs = [];
  const baseActions = G.actions;
  if (baseActions) G.actions = (...a) => { const r = baseActions(...a); lastActs = r || []; return r; };
  const itemOf = (a) => {
    const segs = String(a.id || "").split(":");
    for (let i = segs.length - 1; i >= 0; i--) {
      const id = segs[i];
      const it = D.ITEMS[id];
      if (it && String(a.label || "").includes(it.name)) return id;
    }
    return null;
  };
  function markActs() {
    const byLabel = new Map();
    lastActs.forEach((g) => (g.list || []).forEach((a) => { const id = itemOf(a); if (id && G.itemFlavor(id)) byLabel.set(a.label, id); }));
    if (!byLabel.size) return;
    $$("#panel .act").forEach((b) => {
      const lb = b.querySelector("b");
      const id = lb && byLabel.get(lb.textContent);
      if (id) { b.dataset.i2item = id; b.removeAttribute("title"); }
    });
  }

  // ---------------------------------------------------------------- 記録の文：手に入れた・買った・拾った品
  const GOT = /手に入れ|買った|拾っ|受け取っ|見つけ|もらっ|入っていた/;
  function markLog() {
    const S = G.S;
    if (!S) return;
    const held = new Set([...Object.keys(S.inv || {}), S.weapon, S.armor, S.ring].filter((id) => id && D.ITEMS[id] && G.itemFlavor(id)));
    if (!held.size) return;
    const names = [...held].map((id) => [D.ITEMS[id].name, id]).filter(([n]) => n.length >= 2).sort((a, b) => b[0].length - a[0].length);
    $$("#log > p").forEach((p) => {
      if (p.dataset.i2 || !GOT.test(p.textContent)) return;
      p.dataset.i2 = "1";
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const used = new Set();
      nodes.forEach((node) => {
        if (node.parentElement && node.parentElement.closest(".v9term, [data-i2item]")) return;
        for (const [name, id] of names) {
          if (used.has(id)) continue;
          const at = node.data.indexOf(name);
          if (at < 0) continue;
          used.add(id);
          const rest = node.splitText(at);
          rest.splitText(name.length);
          const s = h("span", "i2name", name);
          s.dataset.i2item = id;
          rest.replaceWith(s);
          return; // 一つの文の切れ端で一つだけ（残りは次の描き直しでは触らない）
        }
      });
    });
  }

  // ---------------------------------------------------------------- 描くたびに
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    if (shownFor && !document.contains(shownFor)) hide();
    try { markSheet(); markActs(); markLog(); } catch (e) { /* 説明が出なくても遊べる */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
