// I3：武具の比べ方と稀さの色・図鑑の「材質と銘」。仕組みはエンジン（engine/zzz_gear_i3.js の G.i3）。
//   ・持ち物の窓：武器・防具・装飾品の行に、今の装備と比べた印（▲上・▼下・＝同じくらい・？鑑定前）と変わる数字
//   ・品の名前を稀さで色分け（上・逸品・伝説）。装備の行も
//   ・行動のボタン（商店の「買う」「今日の品」、宿の物置）の比べの印に色
//   ・図鑑のアイテムの欄の下に「材質」「前の銘」「後ろの銘」の格子（見つけた物だけ名前が出る。押すと説明）
// ui.js・f2_codex.js・zi2_flavor.js は書き換えず、描いたあとに印を付けて包む。見た目は src/ui/zi3_gear.css。レーン I（I3）
(function (G) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.render || !G.i3) return;
  const A = G.i3;
  const D = G.data;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const GEAR = ["weapon", "armor", "ring"];
  const rclass = (it) => { const r = A.rarityOf(it); return r ? "i3rar" + r : ""; };
  const dirClass = (c) => (!c ? "" : c.mark === "？" ? "i3unk" : c.dir > 0 ? "i3up" : c.dir < 0 ? "i3down" : "i3eq");

  // ---------------------------------------------------------------- 持ち物と装備の行
  function markSheet() {
    const S = G.S;
    if (!S) return;
    const sec = $$("#sheet details.ssec").find((d) => /^持ち物/.test(($("summary", d) || {}).textContent || ""));
    const ids = Object.keys(S.inv || {});
    if (sec && ids.length) {
      const lis = $$("ul.inv > li", sec);
      if (lis.length === ids.length) lis.forEach((li, i) => {
        const id = ids[i];
        const it = D.ITEMS[id];
        if (!it || !GEAR.includes(it.type)) return;
        const nm = li.querySelector(":scope > span");
        if (nm && rclass(it)) nm.classList.add(rclass(it));
        const c = A.compare(id);
        if (!c || li.querySelector(".i3cmp")) return;
        const m = h("span", "i3cmp " + dirClass(c), A.compareLabel(id));
        m.title = A.compareLabel(id);
        if (nm) nm.after(m); else li.prepend(m);
      });
    }
    const worn = { 武器: S.weapon, 防具: S.armor, 装飾品: S.ring };
    $$("#sheet dl.kv > dt").forEach((dt) => {
      const id = worn[dt.textContent];
      const dd = dt.nextElementSibling;
      const it = id && D.ITEMS[id];
      if (it && dd && rclass(it)) dd.classList.add(rclass(it));
    });
  }

  // ---------------------------------------------------------------- 行動のボタン（比べの印に色）
  function markActs() {
    $$("#panel .act > span").forEach((sp) => {
      const t = sp.textContent || "";
      const i = Math.max(...["▲", "▼", "＝", "？"].map((c) => t.lastIndexOf(c)));
      if (i < 0 || sp.querySelector(".i3cmp")) return;
      sp.textContent = t.slice(0, i);
      sp.append(h("span", "i3cmp " + ({ "▲": "i3up", "▼": "i3down", "＝": "i3eq", "？": "i3unk" })[t[i]], t.slice(i)));
    });
  }

  const baseRender = ui.render;
  ui.render = (...a) => {
    const r = baseRender(...a);
    try { markSheet(); markActs(); } catch {}
    return r;
  };

  // ---------------------------------------------------------------- 図鑑：材質と銘
  function codexPane() {
    const dlg = $("#dlgCodex");
    if (!dlg) return;
    const list = $(".f2list", dlg), detail = $(".f2detail", dlg);
    const tab = $('.tabs [data-tab="item"]', dlg);
    if (!list || !detail || !tab || tab.getAttribute("aria-selected") !== "true" || $(".i3codex", list)) return;
    const t = A.codexTable();
    const wrap = h("div", "i3codex");
    const group = (title, rows) => {
      const g = h("section", "f2group");
      g.append(h("h3", "", `${title}　${rows.filter((r) => r[2]).length}／${rows.length}`));
      const grid = h("div", "f2grid");
      rows.forEach(([key, name, known, line]) => {
        const b = h(known ? "button" : "div", "f2cell" + (known ? "" : " unknown"));
        b.append(h("span", "f2name", known ? name : "？？？"));
        if (known) {
          b.type = "button";
          b.onclick = () => {
            $$(".f2cell", list).forEach((x) => x.classList.remove("on"));
            b.classList.add("on");
            detail.textContent = "";
            detail.append(h("h3", "f2title", name), h("p", "fine", title));
            const p = h("p", "f2flavor");
            if (G.f2 && G.f2.paintText) G.f2.paintText(p, String(line || "").replace(/\{noun\}/g, "品"), "item", key); else p.textContent = line || "";
            detail.append(p);
          };
        } else { b.tabIndex = 0; b.setAttribute("aria-label", "まだ見ていない"); b.onclick = () => { detail.textContent = ""; detail.append(h("p", "fine", "まだ見つけていない。")); }; }
        grid.append(b);
      });
      g.append(grid);
      wrap.append(g);
    };
    t.mats.forEach(([kind, rows]) => group(`材質（${kind}）`, rows));
    group("前の銘", t.pre);
    group("後ろの銘", t.suf);
    list.append(wrap);
  }
  const hook = () => {
    const dlg = $("#dlgCodex");
    if (!dlg) return false;
    const list = $(".f2list", dlg);
    if (!list) return false;
    new MutationObserver(() => { try { codexPane(); } catch {} }).observe(list, { childList: true });
    return true;
  };
  if (!hook()) window.addEventListener("load", hook, { once: true });
})(globalThis.G = globalThis.G || {});
