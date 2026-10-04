// F2：図鑑の窓（アイテム／魔物／人物／用語／噂をタブで切り替え。一覧の格子 → 押すと詳しい説明）。上の道具の列に「図鑑」ボタンを足す。
// 用語のタブは「世界の手引き」（U11。手引きの別の窓は無くした）。ほかのタブと同じく、節ごとの一覧（知らない用語は「？？？」）→ 選んだ用語の行だけ詳しく。
//   一覧の上に名前で探す欄。はじめから載る行（出発の町・冒険者ギルド・金貨。D.WORLD.start）も「w:見出し」の項目として並べる。
//   何も選んでいないときは、手引きのはじめの文と判定のしくみ。本文の強調（U8）からは G.ui.openWorld(見出し) で、その用語を選んだ状態で開く。
// 新しく載った項目（G.codexFresh）は、入口のボタン（[data-codex-open]）・タブ・見出し・格子に赤い「！」。項目を詳しく開くと消える。
// 記録と性能・入手場所・説明はエンジン（engine/zz_f2_codex.js）が引く。ここは描くだけ。
// 新しく埋まった項目は、格子に印・ボタンに印・画面の左下に「図鑑に追加：〇〇」（U8 の「用語集に追加」と同じ箱に縦に並べるので重ならない）。
// V12：項目について聞いた噂は、魔物・人物・用語の詳しい説明の下に「聞いた話」。場所の話・まだ載っていない相手の話は「噂」のタブ。
// 説明の文は F2.paintText の一か所で描く（アイテムは I2 の G.i2.paintFlavor を通す。U8 の G.gloss.mark で用語を強調。過去の冒険の行は強調しない）。
// index.html・ui.js・v9_pc は書き換えない（窓とボタンはここで作る）。見た目は ui/f2_codex.css。レーン F（F2）
(function (G) {
  if (typeof document === "undefined") return;
  const D = G.data;
  const F2 = (G.f2 = G.f2 || {});
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---------------------------------------------------------------- 説明の文を描く入口（一か所）
  // kind：item（I2 の G.i2.paintFlavor を通す）/ foe / person / lore（今の冒険で知った行）/ lorePast（過去の冒険で知った行）
  // U8 の用語の強調（G.gloss.mark。今の冒険で開いた言葉だけ）を通す。過去の冒険の行は、今の主人公が知らないので通さない
  F2.paintText = (el, text, kind, id) => {
    if (kind === "item" && G.i2 && typeof G.i2.paintFlavor === "function") { try { G.i2.paintFlavor(el, text, id); } catch { el.textContent = text; } }
    else el.textContent = text;
    if (kind !== "lorePast" && G.S && G.gloss && typeof G.gloss.mark === "function") { try { G.gloss.mark(el); } catch {} }
  };

  // ---------------------------------------------------------------- 窓とボタン
  const dlg = h("dialog");
  dlg.id = "dlgCodex";
  dlg.setAttribute("aria-labelledby", "codexTitle");
  const head = h("div", "dhead");
  const title = h("h2", "", "図鑑");
  title.id = "codexTitle";
  const close = h("button", "btn", "閉じる");
  close.type = "button";
  close.onclick = () => dlg.close();
  head.append(title, close);
  const body = h("div", "dbody f2");
  const tabs = h("div", "tabs");
  tabs.setAttribute("role", "tablist");
  const tab = (key, label) => { const b = h("button", "btn", label); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.tab = key; b.onclick = () => show(key); return b; };
  const TABS = [tab("item", "アイテム"), tab("foe", "魔物"), tab("person", "人物"), tab("lore", "用語"), tab("heard", "噂")];
  tabs.append(...TABS);
  const sum = h("p", "fine f2sum");
  const panes = h("div", "f2panes");
  // 用語：名前で探す欄（用語のタブだけ）
  const find = h("div", "f2find");
  const findIn = h("input", "f2findin");
  findIn.type = "search";
  findIn.placeholder = "用語を名前で探す";
  findIn.setAttribute("aria-label", "用語を名前で探す");
  findIn.autocomplete = "off";
  const findNote = h("span", "fine f2findnote");
  find.append(findIn, findNote);
  find.hidden = true;
  const list = h("div", "f2list");
  const detail = h("div", "f2detail");
  detail.setAttribute("aria-live", "polite");
  panes.append(list, detail);
  body.append(tabs, sum, find, panes);
  dlg.append(head, body);
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  document.body.append(dlg);

  const btn = h("button", "btn", "図鑑");
  btn.id = "openCodex";
  btn.type = "button";
  btn.dataset.codexOpen = "";
  btn.onclick = () => F2.open();
  const tro = $("#openTrophy");
  if (tro) tro.after(btn); else { const t = $(".top .tools"); if (t) t.append(btn); }

  // 新しい印の数え方：種類ごと（タブ）と全体（入口）
  const TAB_KIND = { item: "item", foe: "foe", person: "person", lore: "lore", heard: "heard" };
  const freshOf = (kind) => (G.codexFresh ? G.codexFresh(kind) : []);
  const bang = (n) => { const b = h("span", "f2bang", "！"); b.setAttribute("aria-label", `新しく載った ${n}`); b.title = `新しく載った項目 ${n}`; return b; };
  const markTabs = () => TABS.forEach((b) => {
    const n = freshOf(TAB_KIND[b.dataset.tab]).length;
    b.classList.toggle("fresh", !!n);
    b.querySelectorAll(".f2bang").forEach((x) => x.remove());
    if (n) b.append(bang(n));
  });
  const markBtn = () => {
    const n = freshOf().length;
    document.querySelectorAll("[data-codex-open]").forEach((b) => {
      b.classList.toggle("fresh", !!n);
      if (n) b.setAttribute("aria-description", `新しく載った項目が ${n} ある`); else b.removeAttribute("aria-description");
    });
    if (dlg.open) markTabs();
  };
  F2.markBtn = markBtn;

  // ---------------------------------------------------------------- 保存と通知
  let saveT = 0;
  G.onCodexChange = () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => { if (G.main && G.main.saveProfile) G.main.saveProfile(); }, 400);
    markBtn();
  };
  // 「図鑑に追加：〇〇」は U8 の「用語集に追加」と同じ箱（左下の #u8note）に並べる。箱が無ければふつうの通知
  let noteT = 0;
  const announce = (nm) => {
    const box = $("#u8note");
    if (!box) { if (G.ui && G.ui.toast) G.ui.toast("図鑑に追加：", nm); return; }
    const line = h("div", "u8line f2line-note");
    line.append(h("span", "u8star", "◆"), h("span", "", "図鑑に追加："), h("b", "", nm));
    box.append(line);
    while (box.children.length > 4) box.firstChild.remove();
    box.hidden = false;
    clearTimeout(noteT);
    noteT = setTimeout(() => { box.querySelectorAll(".f2line-note").forEach((x) => x.remove()); if (!box.children.length) box.hidden = true; }, 4200);
  };
  G.onCodex = (kind, id) => {
    const nm = kind === "item" ? (D.ITEMS[id] || {}).name : kind === "person" ? F2.personName(id) : (F2.foe(id) || {}).name;
    if (nm) announce(nm);
  };

  // ---------------------------------------------------------------- 絵
  const GLYPH = { weapon: "剣", armor: "鎧", ring: "環", use: "薬", loot: "材", relic: "遺", other: "品" };
  // 魔物を小さな canvas に描く。会っていなければ影だけ
  const paintFoe = (cv, id, shadow) => {
    const e = F2.foe(id);
    const w = cv.width, hh = cv.height;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, w, hh);
    if (!e || !G.paintMonster) return;
    try {
      ctx.save();
      G.paintMonster(ctx, w / 2, hh * 0.95, hh * 0.86, { id, shape: e.shape, eye: e.eye, boss: !!e.boss });
      ctx.restore();
      if (shadow) {
        ctx.save();
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#222";
        ctx.globalAlpha = 0.55;
        ctx.fillRect(0, 0, w, hh);
        ctx.restore();
      }
    } catch {}
  };
  // 一覧の小さな絵（T）：背景を消す処理（A13）がまだの絵は、見えているものから 1 枚ずつ（G.a13.queue）片づけて、済んだら描く。
  // 一度に全部を処理すると、魔物が二百近いと何秒も固まるため。済んでいる絵はすぐ描く
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => es.forEach((e) => {
    const cv = e.target;
    cv.f2seen = e.isIntersecting;
    if (e.isIntersecting && cv.f2enqueue) cv.f2enqueue();
  })) : null;
  const lazy = (cv, pending, build, paint) => {
    if (!pending || !G.a13 || !G.a13.queue) return paint();
    let queued = false, done = false;
    // 並んでいるあいだに窓を閉じた・見えなくなったら飛ばす（また見えたら並び直す）
    const alive = () => { const ok = cv.isConnected && (!io || cv.f2seen); if (!ok) queued = false; return ok; };
    const run = () => { done = true; if (io) io.unobserve(cv); build(() => { if (cv.isConnected) paint(); }); }; // build(済んだら) は裏（Worker）で消すこともある
    cv.f2enqueue = () => { if (queued || done) return; queued = true; G.a13.queue(run, alive); };
    const loaded = () => { if (io) io.observe(cv); else cv.f2enqueue(); };
    if (pending.complete && (pending.naturalWidth || pending.width)) loaded();
    else { pending.addEventListener("load", loaded, { once: true }); pending.addEventListener("error", paint, { once: true }); }
  };
  const foeCanvas = (id, size, shadow, small) => {
    const cv = h("canvas", "f2pic");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    cv.style.width = cv.style.height = size + "px";
    cv.setAttribute("aria-hidden", "true");
    const pending = small && G.v6Pending ? G.v6Pending(id) : null;
    if (pending) { lazy(cv, pending, (then) => { if (G.v6BuildLater) G.v6BuildLater(id, then); else { G.v6Build(id); then(); } }, () => paintFoe(cv, id, shadow)); return cv; }
    paintFoe(cv, id, shadow);
    if (small && G.v6Pending) return cv; // 一覧：絵は済んでいる（か無い）ので、描き直さない（T）
    // V6 の画像は読み込みに少しかかる。読めたころにもう一度描く
    setTimeout(() => paintFoe(cv, id, shadow), 600);
    setTimeout(() => paintFoe(cv, id, shadow), 1800);
    return cv;
  };

  // ---------------------------------------------------------------- 一覧
  let cur = "item";
  const cells = () => [...list.querySelectorAll(".f2cell")];
  const cell = (label, known, fresh, onPick) => {
    const b = h(known ? "button" : "div", "f2cell" + (known ? "" : " unknown") + (fresh ? " fresh" : ""));
    if (known) { b.type = "button"; b.onclick = () => { cells().forEach((x) => x.classList.remove("on")); b.classList.add("on"); onPick(b); }; }
    else { b.tabIndex = 0; b.setAttribute("aria-label", "まだ見ていない"); b.onclick = () => showUnknown(); }
    if (label) b.append(h("span", "f2name", label));
    return b;
  };
  const group = (name, n, all, nFresh) => {
    const g = h("section", "f2group");
    const t = h("h3", "", `${name}　${n}／${all}`);
    if (nFresh) t.append(bang(nFresh));
    g.append(t);
    const grid = h("div", "f2grid");
    g.append(grid);
    list.append(g);
    return grid;
  };

  function drawItems() {
    const c = G.codex();
    const ids = F2.itemIds();
    const n = ids.filter((id) => c.items[id]).length;
    sum.textContent = `見つけた物 ${n}／${ids.length}`;
    F2.ITEM_KINDS.forEach(([k, name]) => {
      const mine = ids.filter((id) => F2.kindOf(D.ITEMS[id]) === k);
      if (!mine.length) return;
      const grid = group(name, mine.filter((id) => c.items[id]).length, mine.length, mine.filter((id) => G.codexIsFresh("item", id)).length);
      mine.forEach((id) => {
        const it = D.ITEMS[id];
        const known = !!c.items[id];
        const b = cell(known ? it.name : "？？？", known, G.codexIsFresh("item", id), () => showItem(id));
        b.prepend(h("span", "f2glyph", known ? GLYPH[k] : "？"));
        b.dataset.id = id;
        grid.append(b);
      });
    });
  }
  function drawFoes() {
    const c = G.codex();
    const ids = F2.foeIds();
    const cnt = G.codexCount();
    sum.textContent = `出会った魔物 ${cnt.foes}／${cnt.foesAll}　倒した種類 ${cnt.kills}`;
    F2.regions().forEach((r) => {
      const mine = ids.filter((id) => G.codexFoeRegion(id) === r).sort((a, b) => (F2.foe(a).tier || 0) - (F2.foe(b).tier || 0) || !!F2.foe(a).boss - !!F2.foe(b).boss);
      if (!mine.length) return;
      const grid = group(r, mine.filter((id) => c.foes[id]).length, mine.length, mine.filter((id) => G.codexIsFresh("foe", id)).length);
      mine.forEach((id) => {
        const e = F2.foe(id);
        const rec = c.foes[id];
        const b = cell(rec ? e.name : "？？？", !!rec, G.codexIsFresh("foe", id), () => showFoe(id));
        b.prepend(foeCanvas(id, 56, !rec, true));
        if (rec) b.append(h("span", "f2tier", `格${e.tier}${rec.kills ? `・${rec.kills}体` : ""}`));
        b.dataset.id = id;
        grid.append(b);
      });
    });
  }

  // 人物の絵（生成画像があればそれ。G.drawPortrait は V4 が包む）。会っていなければ影だけ
  const whoOf = (id) => {
    const p = (D.C2_PEOPLE || {})[id];
    if (p && p.who) return p.who;
    const q = (D.F2_PEOPLE || {})[id] || {};
    const e = (q.events || []).map((x) => (D.EVENTS || []).find((y) => y.id === x)).find((y) => y && y.who);
    const base = e && typeof e.who === "object" ? e.who : { kind: (e && e.who) || "villager" };
    return Object.assign({}, base, { seed: "v4:" + id, name: F2.personName(id) });
  };
  const personCanvas = (id, w, hh, shadow, small) => {
    const cv = h("canvas", "f2pic face");
    cv.width = w * 2; cv.height = hh * 2;
    cv.style.width = w + "px"; cv.style.height = hh + "px";
    cv.setAttribute("aria-hidden", "true");
    const paint = () => {
      if (!G.drawPortrait || !cv.isConnected) return;
      try {
        G.drawPortrait(cv, whoOf(id));
        if (shadow) {
          const ctx = cv.getContext("2d");
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalCompositeOperation = "source-in";
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#222";
          ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.restore();
        }
      } catch {}
    };
    // 一覧：背景を消す処理（A13）がまだなら、見えているものから 1 枚ずつ。済んでいれば一度だけ描く（T）
    const key = small && G.v4PortraitKey && G.a13 && G.a13.has ? G.v4PortraitKey(whoOf(id)) : null;
    if (key) {
      const img = G.v4Image(key);
      if (img && !G.a13.has(key)) {
        lazy(cv, img, (then) => {
          const w = G.v4Where(key);
          if (!G.v4Ready(key)) return then();
          if (G.a13.prepare) G.a13.prepare(key, img, w && w.rect, undefined, () => then()); else { G.a13.cutout(key, img, w && w.rect); then(); }
        }, paint);
        return cv;
      }
      if (img && G.v4Ready(key)) { requestAnimationFrame(paint); return cv; }
    }
    requestAnimationFrame(paint);
    setTimeout(paint, 900);
    return cv;
  };
  function drawPeople() {
    const c = G.codex();
    const ids = F2.peopleIds();
    const cnt = G.codexCount();
    sum.textContent = `出会った人 ${cnt.people}／${cnt.peopleAll}`;
    if (F2.peopleSum) F2.peopleSum(sum); // F4：仲間にした人の数
    F2.PEOPLE_GROUPS.forEach((gname) => {
      const mine = ids.filter((id) => F2.personGroup(id) === gname);
      if (!mine.length) return;
      const grid = group(gname, mine.filter((id) => c.people[id]).length, mine.length, mine.filter((id) => G.codexIsFresh("person", id)).length);
      mine.forEach((id) => {
        const rec = c.people[id];
        const b = cell(rec ? F2.personName(id) : "？？？", !!rec, G.codexIsFresh("person", id), () => showPerson(id));
        // 肖像は背景まで塗られているので、会っていない人は影ではなく「？」の札にする
        b.prepend(rec ? personCanvas(id, 48, 60, false, true) : h("span", "f2glyph f2who", "？"));
        if (rec && rec.joined) b.append(h("span", "f2tier", "仲間"));
        if (F2.personCell) F2.personCell(b, id); // F4：狙う印
        b.dataset.id = id;
        grid.append(b);
      });
    });
  }
  // 用語の項目：D.LORE（物語で一行ずつ開く）と、はじめから載る行（D.WORLD.start・出発の町。id は "w:見出し"、いつも知っている）
  F2.loreEntries = () => {
    const known = G.codexLore();
    const out = [];
    const start = (D.WORLD && D.WORLD.start) || [];
    const add = (sec, row) => { if (row && row[0] && row[1] && !out.some((x) => x.id === "w:" + row[0])) out.push({ id: "w:" + row[0], title: row[0], sec, lines: [["0", row[1], "now"]], known: true }); };
    // 出発の町（data/world.js の homeRow と同じ決め方）
    const S = G.S, homeId = S && D.CLASSES && D.CLASSES[S.cls] ? D.CLASSES[S.cls].start : S && S.loc, L = homeId && D.LOCS && D.LOCS[homeId];
    if (L && !Object.values(D.LORE || {}).some((e) => e.title === L.name)) add((start[0] || ["大陸と国"])[0], [L.name, (D.WORLD.home || {})[homeId] || `冒険を始めた場所。${L.region}にある。`]);
    start.forEach(([sec, rows]) => (rows || []).forEach((r) => add(sec, r)));
    Object.entries(D.LORE || {}).forEach(([id, e]) => {
      const k = known[id];
      out.push({ id, title: e.title, sec: e.sec, lines: e.lines.filter(([key]) => k && k[key]).map(([key, text]) => [key, text, k[key]]), rest: e.lines.filter(([key]) => !(k && k[key])).length, known: !!k });
    });
    return out;
  };
  F2.loreMatch = (e, q) => !q || (e.known && e.title.toLowerCase().includes(q.toLowerCase()));
  let loreQ = "";
  function drawLore() {
    const cnt = G.codexCount();
    sum.textContent = `知った用語 ${cnt.lore}／${cnt.loreAll}（淡い行は、かつての冒険で知ったこと）`;
    const all = F2.loreEntries();
    const secs = [...(D.LORE_SECS || [])];
    all.forEach((e) => { if (!secs.includes(e.sec)) secs.push(e.sec); });
    let shown = 0;
    secs.forEach((sec) => {
      const mine = all.filter((e) => e.sec === sec);
      const hit = mine.filter((e) => F2.loreMatch(e, loreQ));
      if (!hit.length) return;
      const grid = group(sec, mine.filter((e) => e.known).length, mine.length, mine.filter((e) => G.codexIsFresh("lore", e.id)).length);
      grid.classList.add("f2words");
      hit.forEach((e) => {
        const now = e.lines.some((l) => l[2] === "now");
        const b = cell(e.known ? e.title : "？？？", e.known, G.codexIsFresh("lore", e.id), () => showLore(e.id));
        if (e.known && !now) b.classList.add("past");
        b.dataset.id = e.id;
        if (e.known) b.dataset.title = e.title;
        grid.append(b);
        shown++;
      });
    });
    findNote.textContent = loreQ ? (shown ? `「${loreQ}」を含む用語 ${shown}` : `「${loreQ}」を含む用語は、まだ知らない`) : "";
  }
  findIn.addEventListener("input", () => {
    loreQ = findIn.value.trim();
    list.textContent = "";
    drawLore();
  });
  // 何も選んでいないとき：手引きのはじめの文と、判定のしくみ
  function loreIntro() {
    detail.textContent = "";
    if (D.WORLD && D.WORLD.intro) detail.append(h("h3", "f2title", "この大陸のこと"), h("p", "f2line", D.WORLD.intro));
    if (D.RULES_TEXT) detail.append(h("h4", "f2sub", "判定のしくみ"), h("p", "f2line f2rules", D.RULES_TEXT));
    detail.append(h("p", "fine", "一覧から用語を選ぶと、知っている行が出る。物語の中で強調された言葉を押しても開く。"));
  }

  // ---------------------------------------------------------------- 詳しい説明
  const kv = (rows) => {
    const dl = h("dl", "kv f2kv");
    rows.forEach(([k, v]) => dl.append(h("dt", "", k), h("dd", "", v)));
    return dl;
  };
  const where = (title, lines) => {
    const s = h("div", "f2where");
    s.append(h("h4", "", title));
    const ul = h("ul");
    (lines.length ? lines : ["分からない"]).forEach((t) => ul.append(h("li", "", t)));
    s.append(ul);
    return s;
  };
  const flavor = (text, kind, id) => { const p = h("p", "f2flavor"); F2.paintText(p, text, kind, id); return p; };
  // V12：聞いた話（覚え書きを項目ごとに振り分けたもの。engine/zzzz_v12_heard.js）。新しいものから
  const heardList = (items, title) => {
    const s = h("div", "f2where f2heard");
    s.append(h("h4", "", title || "聞いた話"));
    const ul = h("ul");
    [...items].reverse().forEach((x) => {
      const li = h("li", "");
      const p = h("span", "");
      F2.paintText(p, x.t, "lore", "");
      li.append(p);
      if (x.date) li.append(h("small", "f2ago", x.date));
      ul.append(li);
    });
    s.append(ul);
    return s;
  };
  const heardOf = (kind, id) => {
    const V = G.v12;
    if (!V) return null;
    V.seenKey(kind + ":" + id);
    const items = V.list(kind + ":" + id);
    return items.length ? heardList(items) : null;
  };
  const seen = (kind, id) => {
    if (!G.codexSeen(kind, id)) return;
    const b = list.querySelector(`.f2cell[data-id="${CSS.escape(id)}"]`);
    if (!b) return;
    b.classList.remove("fresh");
    // 見出しの「！」も数え直す
    const g = b.closest(".f2group"), t = g && g.querySelector("h3");
    if (!t) return;
    t.querySelectorAll(".f2bang").forEach((x) => x.remove());
    const n = g.querySelectorAll(".f2cell.fresh").length;
    if (n) t.append(bang(n));
  };
  const narrow = () => window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  const reveal = () => { if (narrow()) detail.scrollIntoView({ block: "start", behavior: "smooth" }); };

  function showUnknown() {
    detail.textContent = "";
    detail.append(h("p", "fine", { item: "まだ見つけていない。", foe: "まだ出会っていない。", person: "まだ会っていない。" }[cur] || "まだ知らない。"));
    reveal();
  }
  function showItem(id) {
    const it = D.ITEMS[id];
    const rec = G.codex().items[id];
    if (!it || !rec) return showUnknown();
    detail.textContent = "";
    const kind = F2.ITEM_KINDS.find(([k]) => k === F2.kindOf(it));
    detail.append(h("h3", "f2title", it.name), h("p", "fine", kind ? kind[1] : ""));
    detail.append(kv(G.codexItemStats(id)));
    detail.append(where("主な入手場所", G.codexItemWhere(id)));
    const t = G.codexItemText(id);
    if (t) detail.append(flavor(t, "item", id));
    detail.append(h("p", "fine f2first", `初めて手に入れた：${[rec.by, rec.date].filter(Boolean).join("・") || "—"}`));
    seen("item", id);
    reveal();
  }
  function showFoe(id) {
    const e = F2.foe(id);
    const rec = G.codexFoe(id);
    if (!e || !rec) return showUnknown();
    detail.textContent = "";
    const apostle = F2.isApostle(e) && !F2.killed(id);
    detail.append(foeCanvas(id, 160, false));
    detail.append(h("h3", "f2title", e.name));
    if (apostle) {
      detail.append(h("p", "fine", "使徒。格が違う。"));
      detail.append(flavor(G.codexFoeText(id), "foe", id));
      detail.append(h("p", "fine f2first", `初めて出会った：${[rec.by, rec.date].filter(Boolean).join("・") || "—"}`));
    } else {
      detail.append(h("p", "fine", `${G.codexFoeRegion(id)}・格${e.tier}${e.boss ? "・主" : ""}`));
      detail.append(kv(G.codexFoeStats(id)));
      if (!rec.kills) detail.append(h("p", "fine", "倒せば、もっと分かる。"));
      detail.append(where("主な出現場所", G.codexFoeWhere(id)));
      detail.append(flavor(G.codexFoeText(id), "foe", id));
      const first = [`初めて出会った：${[rec.by, rec.date].filter(Boolean).join("・") || "—"}`];
      if (rec.kills) first.push(`倒した数：${rec.kills}体（初めて倒した：${[rec.kby, rec.kdate].filter(Boolean).join("・") || "—"}）`);
      first.forEach((t) => detail.append(h("p", "fine f2first", t)));
    }
    const hf = heardOf("foe", id);
    if (hf) detail.append(hf);
    seen("foe", id);
    reveal();
  }

  // 好感度（F3。今の冒険の −100〜+100）：数・言葉・0 が真ん中の細い棒。今の冒険で会っていなければ「—」
  const affinity = (id) => {
    const a = G.affOf ? G.affOf(id) : null;
    const box = h("div", "f3aff" + (a == null ? " none" : a < 0 ? " neg" : a > 0 ? " pos" : ""));
    const top = h("div", "f3affhead");
    top.append(h("span", "f3afflabel", "好感度"), h("span", "f3affval", a == null ? "—" : `${G.sign(a)}・${G.affWord(a)}`));
    const bar = h("div", "f3affbar");
    bar.setAttribute("role", "meter");
    bar.setAttribute("aria-label", "好感度");
    bar.setAttribute("aria-valuemin", "-100");
    bar.setAttribute("aria-valuemax", "100");
    if (a != null) {
      bar.setAttribute("aria-valuenow", String(a));
      const fill = h("span", "f3afffill");
      fill.style.left = `${50 + Math.min(0, a) / 2}%`;
      fill.style.width = `${Math.abs(a) / 2}%`;
      bar.append(fill);
    }
    box.append(top, bar);
    if (a == null) box.append(h("p", "fine f3affnote", "今の冒険では、まだ会っていない。"));
    return box;
  };
  function showPerson(id) {
    const q = (D.F2_PEOPLE || {})[id];
    const rec = G.codexPerson(id);
    if (!q || !rec) { if (q && F2.personUnknown && F2.personUnknown(detail, id)) return reveal(); return showUnknown(); } // F4：噂だけ聞いた人
    detail.textContent = "";
    const cv = personCanvas(id, 150, 188, false);
    detail.append(cv);
    detail.append(h("p", "fine c3role", F2.personRole ? F2.personRole(id) : q.title || ""), h("h3", "f2title", F2.personName(id)));
    const rels = Object.keys(rec.rels || {});
    detail.append(affinity(id));
    detail.append(kv([["仲間", G.S && (G.S.companions || []).some((c) => c.c2 === id) ? "いま連れている" : rec.joined ? "なったことがある" : "まだ"], ["間柄", rels.filter((r) => r !== "仲間").join("・") || "—"]].filter(([, v]) => v)));
    detail.append(where("主に会える場所", G.codexPersonWhere(id)));
    if (F2.personMore) F2.personMore(detail, id); // F4：会ったことのある場所・仲間にする方法・狙う
    G.codexPersonLines(id).forEach((t) => detail.append(flavor(t, "person", id)));
    if ((q.lines || []).length > G.codexPersonLines(id).length) detail.append(h("p", "fine", "深く関われば、もっと分かる。"));
    const hp = heardOf("person", id);
    if (hp) detail.append(hp);
    detail.append(h("p", "fine f2first", `初めて会った：${[rec.by, rec.date].filter(Boolean).join("・") || "—"}`));
    seen("person", id);
    reveal();
  }
  function showLore(id) {
    const e = F2.loreEntries().find((x) => x.id === id);
    if (!e || !e.known) return showUnknown();
    detail.textContent = "";
    detail.append(h("h3", "f2title", e.title), h("p", "fine", e.sec));
    e.lines.forEach(([, text, st]) => {
      const p = h("p", "f2line" + (st === "past" ? " past" : ""));
      F2.paintText(p, text, st === "now" ? "lore" : "lorePast", id);
      if (st === "past") p.append(h("small", "f2ago", "かつての冒険で"));
      detail.append(p);
    });
    if (e.rest) detail.append(h("p", "fine", `まだ知らない行が ${e.rest} つある。`));
    const hl = heardOf("lore", id);
    if (hl) detail.append(hl);
    seen("lore", id);
    reveal();
  }
  // V12：噂のタブ。場所ごとの話・まだ図鑑に載っていない相手の話（魔物・人物・用語の話は、その項目の「聞いた話」）
  function drawHeard() {
    const V = G.v12;
    const boxes = V ? V.boxes() : [];
    sum.textContent = boxes.length ? "魔物・人・用語の話は、それぞれの項目の「聞いた話」にある。" : "土地や、まだ会っていない相手の噂を聞くと、ここに残る。魔物・人・用語の話は、それぞれの項目の「聞いた話」に。";
    const groups = [["土地の話", (b) => b.id.startsWith("loc:")], ["まだ図鑑に無い相手の話", (b) => b.id.startsWith("un:")]];
    groups.forEach(([name, test]) => {
      const mine = boxes.filter(test);
      if (!mine.length) return;
      const grid = group(name, mine.length, mine.length, mine.filter((b) => V.boxFresh(b)).length);
      grid.classList.add("f2words");
      mine.forEach((b) => {
        const c = cell(b.name, true, V.boxFresh(b), () => showHeard(b.id));
        c.dataset.id = b.id;
        grid.append(c);
      });
    });
  }
  function showHeard(bid) {
    const V = G.v12;
    const b = V && V.boxes().find((x) => x.id === bid);
    if (!b) return showUnknown();
    detail.textContent = "";
    detail.append(h("h3", "f2title", b.name), heardList(b.items, `聞いた話（${b.items.length}）`));
    if (V.boxSeen(b)) {
      const el = list.querySelector(`.f2cell[data-id="${CSS.escape(bid)}"]`);
      if (el) el.classList.remove("fresh");
      markTabs();
    }
    reveal();
  }

  // ---------------------------------------------------------------- 切り替えと開く
  function show(key) {
    cur = key;
    TABS.forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === key));
    list.textContent = "";
    detail.textContent = "";
    find.hidden = key !== "lore";
    detail.append(h("p", "fine", "一覧から選ぶと、詳しい説明が出る。"));
    if (key === "lore") loreIntro();
    // U9：？の人の見つけ方（まだ会っていない人は押せないので、ここに書く）
    if (key === "person") detail.append(h("p", "fine", "？の人には、まだ会っていない。"));
    ({ item: drawItems, foe: drawFoes, person: drawPeople, lore: drawLore, heard: drawHeard })[key]();
    markTabs();
  }
  F2.open = (key) => {
    if (G.S && G.codexSeed) G.codexSeed(G.S);
    if (G.S && G.v12) G.v12.seed(G.S);
    if (F2.syncSlain) F2.syncSlain();
    // 何も指定が無ければ、新しい印のあるタブから
    if (!key) key = freshOf(cur).length ? cur : (TABS.map((b) => b.dataset.tab).find((k) => freshOf(k).length) || cur);
    show(key);
    if (!dlg.open) dlg.showModal();
    markBtn();
    const first = list.querySelector(".f2cell.fresh") || list.querySelector("button.f2cell") || list.querySelector(".f2cell");
    if (first) first.focus();
  };
  // 世界の手引き（用語のタブ）を開く。title（見出し）か id を渡せば、その用語を選んだ状態で（U8 の本文の強調から）
  F2.openLore = (title) => {
    if (loreQ) { loreQ = ""; findIn.value = ""; }
    F2.open("lore");
    if (!title) return;
    const b = cells().find((x) => x.dataset.title === title || x.dataset.id === title);
    if (!b) return;
    b.click();
    b.scrollIntoView({ block: "nearest" });
    b.focus({ preventScroll: true });
  };
  if (G.ui) G.ui.openWorld = F2.openLore;
  dlg.addEventListener("close", markBtn);

  // 格子の中を矢印キーで辿る（上下は見た目の列に合わせる）
  list.addEventListener("keydown", (ev) => {
    const all = cells();
    const i = all.indexOf(document.activeElement);
    if (i < 0) return;
    let j = -1;
    if (ev.key === "ArrowRight") j = i + 1;
    else if (ev.key === "ArrowLeft") j = i - 1;
    else if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      const r = all[i].getBoundingClientRect();
      const down = ev.key === "ArrowDown";
      let best = -1, bd = Infinity;
      all.forEach((el, k) => {
        const q = el.getBoundingClientRect();
        if (down ? q.top <= r.top + 4 : q.top >= r.top - 4) return;
        const d = Math.abs(q.top - r.top) * 4 + Math.abs(q.left - r.left);
        if (d < bd) { bd = d; best = k; }
      });
      j = best;
    } else if (ev.key === "Enter" && !all[i].matches("button")) { all[i].click(); ev.preventDefault(); return; }
    else return;
    if (j >= 0 && j < all.length) { all[j].focus(); all[j].scrollIntoView({ block: "nearest" }); ev.preventDefault(); }
  });
  // タブも左右キーで
  tabs.addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const i = TABS.findIndex((b) => b.dataset.tab === cur);
    const b = TABS[(i + (ev.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    show(b.dataset.tab);
    b.focus();
    ev.preventDefault();
  });

  setTimeout(markBtn, 0);
})(globalThis.G = globalThis.G || {});
