// U22：図鑑の窓を PC の一画面に収める。持ち主の声「魔物図鑑の項目増えましたが PC 版ではスクロールのないように」
//   ・窓は画面の高さいっぱいの決まった大きさにし、ページも窓も動かさない
//   ・一覧は、区分（地方・種類・節）の札で一つずつ見せ、その中は「前へ／次へ」のページ送り（入るだけ並べる。数は窓の大きさで決まる）
//   ・右の詳しい説明も、入りきらなければページ送り（「続き」）。弱点・耐性などの行が増えても収まる
//   ・最初に見せる区分：押した・選んだ項目のある区分 → このタブで前に見ていた区分 → 新しく載った（！）項目のある区分 → 最初の区分
// 図鑑の中身は f2_codex.js・q5・zi3・zk_know_l1・f4 が描く。ここは描いたあとの一覧（.f2list・覚え書きの頁）と説明（.f2detail）を、
// 見せる・隠すだけ（印「！」や選んだ印の class には触らない）。スマホ・狭い窓（幅 760 以下・高さ 500 未満）では何もしない（今の縦に流れる形）。
// 見た目は ui/zu22_codex_pc.css。名前の zu22 で、図鑑に手を足すファイル（f2・q5・zi3・zk）より後に読まれる。レーン U（U22）
(function (G) {
  const U = (G.u22 = G.u22 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // ページの分け方：items は上から順の [{ top, h }]（同じ行の物は同じ top）。avail は入る高さ。返すのは各ページの頭の番号
  // 行の途中では切らない。一つで入りきらない物も、一ページに一つは載せる
  U.pages = (items, avail) => {
    const out = [];
    let start = null;
    (items || []).forEach((it, i) => {
      if (start === null) { start = it.top; out.push(i); return; }
      if (it.top > start && it.top + it.h - start > avail) { start = it.top; out.push(i); }
    });
    return out.length ? out : [0];
  };
  // 何ページ目か（i 番目の物が入っているページ）
  U.pageOf = (starts, i) => { let p = 0; (starts || [0]).forEach((s, k) => { if (s <= i) p = k; }); return p; };
  // 最初に見せる区分の番号。groups は [{ key, picked, fresh }]（picked：押した・選んだ項目がある）、remembered はこのタブで前に見た区分の key
  U.pickGroup = (groups, remembered) => {
    if (!groups || !groups.length) return -1;
    let i = groups.findIndex((g) => g.picked);
    if (i < 0 && remembered != null) i = groups.findIndex((g) => g.key === remembered);
    if (i < 0) i = groups.findIndex((g) => g.fresh);
    return i < 0 ? 0 : i;
  };
  // 区分の札の名前：見出しの「レオネスト王国　29／52」を、名前と数に分ける
  U.splitHead = (text) => {
    const t = String(text || "").replace(/！/g, "").trim();
    const m = t.match(/^(.*?)[\s　]+(\d+\s*[／/]\s*\d+|\d+)$/);
    return m ? { name: m[1].trim(), count: m[2].replace(/\s/g, "") } : { name: t, count: "" };
  };

  if (typeof document === "undefined" || typeof window === "undefined") return;
  const $ = (s, r) => (r || document).querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const dlg = $("#dlgCodex");
  if (!dlg) return;
  const pc = () => window.matchMedia && window.matchMedia("(min-width: 761px) and (min-height: 500px)").matches;
  U.pc = pc;

  // ---------------------------------------------------------------- 一覧：区分の札とページ送り
  const memory = {}; // タブ → 見ていた区分の key
  const curTab = () => { const t = $('.tabs [role=tab][aria-selected="true"]', dlg); return t ? t.dataset.tab || t.textContent : ""; };
  // 区分：一覧の中の section（入れ子は外側だけ）。中身：格子のマス、または一覧の行
  const groupsOf = (box) => [...box.querySelectorAll("section")].filter((s) => !s.parentElement.closest("section") && !s.classList.contains("u22skip"));
  const itemsOf = (sec) => {
    const grid = sec.querySelector(".f2grid");
    if (grid) return [...grid.children];
    const lists = [...sec.querySelectorAll(":scope > ul, :scope > ol")];
    if (lists.length) return lists.flatMap((u) => [...u.children]);
    return [...sec.children].filter((c) => !/^H[1-6]$/.test(c.tagName));
  };

  function paginate(box, st) {
    clear(box);
    if (!pc() || box.hidden || !box.isConnected || !dlg.open) return;
    const groups = groupsOf(box);
    if (!groups.length) return;
    box.classList.add("u22paged");
    const tab = curTab() + "|" + (box.dataset.u22 || "");
    const active = document.activeElement;
    const info = groups.map((g, i) => {
      const hd = g.querySelector(":scope > h3, :scope > h4");
      const sp = U.splitHead(hd ? hd.textContent : "");
      return { key: sp.name || "g" + i, name: sp.name || `その${i + 1}`, count: sp.count, fresh: !!g.querySelector(".fresh, .f2bang"),
        picked: !!(g.querySelector(".f2cell.on") || (active && g.contains(active))) };
    });
    let gi = U.pickGroup(info, memory[tab]);
    // 札の列
    const bar = h("div", "u22bar");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "区分");
    const chips = info.map((g, i) => {
      const b = h("button", "u22chip");
      b.type = "button";
      b.append(h("span", "u22cname", g.name));
      if (g.count) b.append(h("span", "u22cn num", g.count));
      if (g.fresh) { const x = h("span", "u22bang", "！"); x.setAttribute("aria-label", "新しく載った項目がある"); b.append(x); }
      b.onclick = () => { memory[tab] = g.key; showGroup(i, 0); b.focus(); };
      bar.append(b);
      return b;
    });
    // ページ送り
    const foot = h("div", "u22pager");
    const prev = h("button", "btn small u22prev", "‹ 前へ");
    const next = h("button", "btn small u22next", "次へ ›");
    const where = h("span", "u22where num");
    prev.type = next.type = "button";
    foot.append(prev, where, next);
    quiet(box, () => { box.prepend(bar); box.append(foot); });
    let starts = [0], page = 0, items = [];
    function showGroup(i, p, focusAt) {
      gi = i;
      memory[tab] = info[i].key;
      chips.forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-pressed", String(k === i)); });
      quiet(box, () => {
        groups.forEach((g, k) => g.classList.toggle("u22off", k !== i));
        items = itemsOf(groups[i]);
        items.forEach((x) => x.classList.remove("u22hide"));
        foot.hidden = false;
      });
      // 全部を並べた形で測り、入るだけでページに分ける
      const g = groups[i];
      const first = items[0];
      if (!first) { foot.hidden = true; return; }
      const avail = Math.max(60, foot.getBoundingClientRect().top - 6 - first.getBoundingClientRect().top);
      const base = first.getBoundingClientRect().top;
      starts = U.pages(items.map((x) => { const r = x.getBoundingClientRect(); return { top: Math.round(r.top - base), h: Math.round(r.height) }; }), avail);
      if (p === "pick") {
        const k = items.findIndex((x) => x.classList.contains("on") || x.contains(document.activeElement) || x === document.activeElement);
        const f = items.findIndex((x) => x.classList.contains("fresh"));
        p = U.pageOf(starts, k >= 0 ? k : Math.max(0, f));
      }
      setPage(Math.max(0, Math.min(starts.length - 1, p || 0)), focusAt);
      g.scrollTop = 0;
    }
    function setPage(p, focusAt) {
      page = p;
      const a = starts[p], b = p + 1 < starts.length ? starts[p + 1] : items.length;
      quiet(box, () => {
        items.forEach((x, k) => x.classList.toggle("u22hide", k < a || k >= b));
        foot.hidden = starts.length < 2;
      });
      where.textContent = `${p + 1} / ${starts.length}`;
      prev.disabled = p === 0;
      next.disabled = p === starts.length - 1;
      if (focusAt === "first" || focusAt === "last") {
        const vis = items.slice(a, b).filter((x) => x.matches("button, [tabindex]"));
        const t = focusAt === "first" ? vis[0] : vis[vis.length - 1];
        if (t) t.focus();
      }
    }
    prev.onclick = () => setPage(page - 1);
    next.onclick = () => setPage(page + 1);
    box.u22 = {
      turn: (d, focusAt) => {
        if (page + d >= 0 && page + d < starts.length) { setPage(page + d, focusAt); return true; }
        return false;
      },
      items: () => items,
    };
    showGroup(gi, "pick");
  }
  function clear(box) {
    box.u22 = null;
    quiet(box, () => {
      box.classList.remove("u22paged");
      box.querySelectorAll(":scope > .u22bar, :scope > .u22pager").forEach((x) => x.remove());
      box.querySelectorAll(".u22off").forEach((x) => x.classList.remove("u22off"));
      box.querySelectorAll(".u22hide").forEach((x) => x.classList.remove("u22hide"));
    });
  }

  // ---------------------------------------------------------------- 説明：入りきらなければ「続き」
  function paginateDetail(det) {
    clearDetail(det);
    if (!pc() || !dlg.open || !det.children.length) return;
    if (det.scrollHeight <= det.clientHeight + 1) return;
    const kids = [...det.children];
    const foot = h("div", "u22pager u22dpager");
    const prev = h("button", "btn small", "‹ 前");
    const next = h("button", "btn small", "続き ›");
    const where = h("span", "u22where num");
    prev.type = next.type = "button";
    foot.append(prev, where, next);
    quiet(det, () => { det.append(foot); det.classList.add("u22dpaged"); });
    const base = kids[0].getBoundingClientRect().top;
    // 説明の欄の下の端（内側の余白を除く）から、めくる帯の分を引いた高さ（帯は中身のあとに付くので、帯の位置では測らない）
    const cs = getComputedStyle(det);
    const bottom = det.getBoundingClientRect().top + det.clientTop + det.clientHeight - parseFloat(cs.paddingBottom || 0);
    const fs = getComputedStyle(foot);
    const avail = Math.max(80, bottom - foot.offsetHeight - parseFloat(fs.marginTop || 0) - 8 - base);
    // 説明の段は高さがまちまちなので、段ごとに測る（入れ子の中では切らない）
    const starts = U.pages(kids.map((x) => { const r = x.getBoundingClientRect(); return { top: Math.round(r.top - base), h: Math.round(r.height) }; }), avail);
    // 一つの段だけで入りきらない（とても長い表など）ときは、めくらずに説明の中だけ流す（最後の手）
    const kh = kids.map((x) => x.getBoundingClientRect().height);
    if (kh.some((v) => v > avail + 1)) { clearDetail(det); quiet(det, () => det.classList.add("u22tall")); return; }
    if (starts.length < 2) { clearDetail(det); return; }
    let page = 0;
    const set = (p) => {
      page = p;
      const a = starts[p], b = p + 1 < starts.length ? starts[p + 1] : kids.length;
      quiet(det, () => kids.forEach((x, k) => x.classList.toggle("u22hide", k < a || k >= b)));
      where.textContent = `${p + 1} / ${starts.length}`;
      prev.disabled = p === 0;
      next.disabled = p === starts.length - 1;
    };
    prev.onclick = () => set(page - 1);
    next.onclick = () => set(page + 1);
    set(0);
  }
  function clearDetail(det) {
    quiet(det, () => {
      det.classList.remove("u22dpaged", "u22tall");
      det.querySelectorAll(":scope > .u22dpager").forEach((x) => x.remove());
      det.querySelectorAll(":scope > .u22hide").forEach((x) => x.classList.remove("u22hide"));
    });
  }

  // ---------------------------------------------------------------- 描き直しを見張る（自分の書き換えでは動かない）
  const watched = new Map(); // 要素 → { mo, run }
  function quiet(el, fn) {
    const w = watched.get(el);
    if (w) w.mo.disconnect();
    try { fn(); } finally { if (w) w.mo.observe(el, { childList: true }); }
  }
  function watch(el, run) {
    if (!el || watched.has(el)) return;
    let ask = false;
    const go = () => { ask = false; try { run(el); } catch (e) { /* 並べ替えられなくても、図鑑は止めない */ } };
    const mo = new MutationObserver(() => { if (ask) return; ask = true; requestAnimationFrame(go); });
    watched.set(el, { mo, run: go });
    mo.observe(el, { childList: true });
  }
  const boxes = () => [$(".f2list", dlg), $(".l1pane", dlg)].filter(Boolean);
  const det = () => $(".f2detail", dlg);
  function hook() {
    const l = $(".f2list", dlg), k = $(".l1pane", dlg);
    if (k) k.dataset.u22 = "know";
    watch(l, paginate);
    watch(k, paginate);
    watch(det(), paginateDetail);
  }
  hook();
  setTimeout(hook, 0); // 依頼・覚え書きのタブは少し後で足される
  // 覚え書きの頁は、出し入れ（hidden）でも並べ直す
  const kp = $(".l1pane", dlg);
  if (kp) new MutationObserver(() => requestAnimationFrame(() => { try { paginate(kp); } catch {} })).observe(kp, { attributes: true, attributeFilter: ["hidden"] });
  const all = () => requestAnimationFrame(() => { boxes().forEach((b) => { try { paginate(b); } catch {} }); const d = det(); if (d) try { paginateDetail(d); } catch {} });
  // 窓を開いたとき（showModal の前に描かれた一覧は、窓が開いてから測り直す）・大きさが変わったとき
  new MutationObserver(() => { if (dlg.open) all(); }).observe(dlg, { attributes: true, attributeFilter: ["open"] });
  let rt = 0;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (dlg.open) all(); }, 150); });
  U.refresh = all;

  // ---------------------------------------------------------------- キー：ページの端で矢印を押すと、隣のページへ。PageUp／PageDown でもめくる
  dlg.addEventListener("keydown", (ev) => {
    const box = boxes().find((b) => b.u22 && b.contains(ev.target));
    if (!box || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === "PageDown" || ev.key === "PageUp") {
      if (box.u22.turn(ev.key === "PageDown" ? 1 : -1, "first")) ev.preventDefault();
      return;
    }
    if (!/^Arrow(Left|Right|Up|Down)$/.test(ev.key)) return;
    const vis = box.u22.items().filter((x) => !x.classList.contains("u22hide") && x.matches("button, [tabindex]"));
    const i = vis.indexOf(ev.target);
    if (i < 0) return;
    const fwd = ev.key === "ArrowRight" || ev.key === "ArrowDown";
    // 端の行・端の一つだけ（ほかは f2_codex.js の矢印の動きのまま）
    const r = ev.target.getBoundingClientRect();
    const edge = fwd
      ? (ev.key === "ArrowRight" ? i === vis.length - 1 : !vis.some((x) => x.getBoundingClientRect().top > r.top + 4))
      : (ev.key === "ArrowLeft" ? i === 0 : !vis.some((x) => x.getBoundingClientRect().top < r.top - 4));
    if (!edge) return;
    if (box.u22.turn(fwd ? 1 : -1, fwd ? "first" : "last")) { ev.preventDefault(); ev.stopPropagation(); }
  }, true);
})(globalThis.G = globalThis.G || {});
