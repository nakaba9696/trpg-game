// U13：町などの行動の選択肢を、いくつかの分類（街で・冒険・仲間・その他）にまとめ、分類を選ぶと中身が出る（持ち主「メニュー画面、スクロールが多い。ある程度項目をまとめてほしい」）
// エンジンは触らない。ui.js が描いた #panel の .agroup を、G.actions() の並び（中身の無い組は描かれない）と突き合わせ、開いている分類の組だけを残す。
// どの組をどの分類にするかは、組の行動の id の頭（travel: / sail: / m2talk: …）で決める（u13.BY_PREFIX）。知らない頭は「その他」に入り、消えない。
// 店（施設）で組が多いときは、組そのもの（買う・今日の品・売る…）を分類にする。戦闘・出来事の選択肢はまとめない。
// 開いていた分類は、同じ種類の場所（町・荒野・迷宮・同じ施設）に来たときも覚えておく（記録には残さない）。見せ方は u13_menu.css。レーン U
(function (G) {
  const u13 = (G.u13 = G.u13 || {});

  // ---------------------------------------------------------------- 分類の表（DOM なしで使える。テストもこれを読む）
  // here の名前は場所の種類で替える
  u13.CATS = [
    { key: "here", label: { town: "街で", wild: "この地で", dungeon: "迷宮で" } },
    { key: "adv", label: "冒険" },
    { key: "party", label: "仲間" },
    { key: "misc", label: "その他" },
  ];
  u13.BY_PREFIX = {
    // 街で・この地で：施設・町を歩く・探索・野営・迷宮を進む／出る
    fac: "here", walk: "here", explore: "here", camp: "here", deeper: "here", leave: "here",
    // 冒険：旅立つ・船・依頼
    travel: "adv", sail: "adv", q5go: "adv",
    // 仲間：会話・手当て・顔なじみを誘う・図鑑で知っている人を訪ねる
    m2talk: "party", b5: "party", c2inv: "party", f4seek: "party",
    // その他：賽の目・魔導書（表に無い頭もここ）
    rr: "misc", tome: "misc",
  };
  // 開いたまま上に出しておく組（いま答えを待っている問い。「〇〇を誰に使う？」）
  u13.PIN_PREFIX = ["b5use"];
  // まとめるのは、分類が 2 つ以上あって、選択肢がこれより多いとき
  u13.MIN_ITEMS = 9;
  // 店（施設）で組を分類にするのは、題のある組が 3 つ以上あって、選択肢がこれより多いとき
  u13.FAC_MIN_ITEMS = 13;

  const prefix = (a) => String((a && a.id) || "").split(":")[0];
  // 組の分類：組の行動の id の頭でいちばん多いもの。表に無ければ「その他」
  u13.catOf = (g) => {
    const n = {};
    (g.list || []).forEach((a) => { const c = u13.BY_PREFIX[prefix(a)] || "misc"; n[c] = (n[c] || 0) + 1; });
    return Object.keys(n).sort((a, b) => n[b] - n[a] || u13.CATS.findIndex((c) => c.key === a) - u13.CATS.findIndex((c) => c.key === b))[0] || "misc";
  };
  u13.pinned = (g) => (g.list || []).some((a) => u13.PIN_PREFIX.includes(prefix(a)));
  const shortTitle = (t) => String(t || "").replace(/（.*$/, "").trim();
  const items = (gs) => gs.reduce((n, g) => n + g.list.length, 0);

  // どうまとめるか。まとめないときは null。
  //   tabs：[{ key, label, groups: [組の番号], ids: [行動の id] }]・top：上に出したままの組・bottom：下に出したままの組・place：開いた分類を覚える場所の種類
  // 組の番号は、中身のある組だけを数えた番号（ui.js が描く .agroup の並びと同じ）
  u13.plan = (groups, S) => {
    if (!S || S.over || S.combat) return null;
    const gs = (groups || []).filter((g) => g && g.list && g.list.length);
    if (S.mode === "explore") {
      const type = (G.loc && G.loc() && G.loc().type) || "town";
      const tabs = u13.CATS.map((c) => ({ key: c.key, label: typeof c.label === "string" ? c.label : c.label[type] || c.label.town, groups: [], ids: [] }));
      const top = [];
      gs.forEach((g, i) => {
        if (u13.pinned(g)) { top.push(i); return; }
        const t = tabs.find((x) => x.key === u13.catOf(g));
        t.groups.push(i);
        g.list.forEach((a) => t.ids.push(a.id));
      });
      const used = tabs.filter((t) => t.groups.length);
      if (used.length < 2 || items(gs) < u13.MIN_ITEMS) return null;
      return { tabs: used, top, bottom: [], place: "explore:" + type };
    }
    if (S.mode === "fac") {
      const titled = gs.map((g, i) => [g, i]).filter(([g]) => g.title);
      if (titled.length < 3 || items(gs) < u13.FAC_MIN_ITEMS) return null;
      const tabs = titled.map(([g, i]) => ({ key: "g:" + shortTitle(g.title), label: shortTitle(g.title), groups: [i], ids: g.list.map((a) => a.id) }));
      const bottom = gs.map((g, i) => [g, i]).filter(([g]) => !g.title).map(([, i]) => i);
      return { tabs, top: [], bottom, place: "fac:" + (S.fac || "") };
    }
    return null;
  };

  // 開いている分類：覚えているものがあればそれ、無ければ最初の分類
  const openBy = {};
  u13.openKey = (plan) => {
    const want = openBy[plan.place];
    return plan.tabs.some((t) => t.key === want) ? want : plan.tabs[0].key;
  };
  u13.setOpen = (plan, key) => { openBy[plan.place] = key; };

  // 新しく出た項目：その場所（町・施設）で、開いた分類として一度も見ていない行動の id。
  // その場所を初めて描いたときに見えている物は、新しいとはしない（町に着くたびに全部に印が付かないように）
  const seenAt = {};
  u13.fresh = (plan, key, where) => {
    const at = where || plan.place;
    let seen = seenAt[at];
    if (!seen) { seen = seenAt[at] = new Set(); plan.tabs.forEach((t) => t.ids.forEach((id) => seen.add(id))); }
    const open = plan.tabs.find((t) => t.key === key);
    if (open) open.ids.forEach((id) => seen.add(id));
    return Object.fromEntries(plan.tabs.map((t) => [t.key, t.key !== key && t.ids.some((id) => !seen.has(id))]));
  };

  // ---------------------------------------------------------------- 画面
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function paint() {
    const S = G.S;
    const panel = document.getElementById("panel");
    if (!S || !panel) return;
    panel.classList.remove("u13on");
    const plan = u13.plan(G.actions(), S);
    if (!plan) return;
    const els = Array.from(panel.querySelectorAll(":scope > .agroup"));
    const count = plan.tabs.reduce((n, t) => n + t.groups.length, 0) + plan.top.length + plan.bottom.length;
    if (els.length !== count) return; // 描いた組と数が合わなければ、まとめずにそのまま
    const key = u13.openKey(plan);
    const marks = u13.fresh(plan, key, `${S.loc}|${plan.place}`);
    const open = plan.tabs.find((t) => t.key === key);

    const bar = h("div", "u13tabs");
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", "行動の分類");
    plan.tabs.forEach((t) => {
      const b = h("button", "u13tab" + (t.key === key ? " on" : "") + (marks[t.key] ? " new" : ""));
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(t.key === key));
      b.dataset.u13 = t.key;
      b.append(h("span", "u13lab", t.label), h("span", "u13n num", String(t.ids.length)));
      if (marks[t.key]) { b.append(h("i", "u13dot")); b.title = "新しい項目がある"; }
      b.onclick = () => { if (t.key === key) return; u13.setOpen(plan, t.key); ui.render(); const f = document.querySelector(`#panel .u13tab[data-u13="${CSS.escape(t.key)}"]`); if (f) f.focus(); };
      bar.append(b);
    });
    // ←→ で分類を移る
    bar.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      const tabs = Array.from(bar.querySelectorAll(".u13tab"));
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      ev.preventDefault();
      tabs[(i + (ev.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].click();
    });

    // 開いていない分類の組は外す（1〜9 のキーは、残った組の選択肢だけに付く。v9_pc.js が後で番号を振る）
    const keep = new Set([...open.groups, ...plan.top, ...plan.bottom]);
    els.forEach((el, i) => { if (!keep.has(i)) el.remove(); });
    // 店の組を分類にしたときは、組の見出しは札と同じなので隠す
    if (S.mode === "fac") open.groups.forEach((i) => { const t = els[i].querySelector("h3"); if (t) t.hidden = true; });
    els[open.groups[0]].before(bar);
    plan.top.forEach((i) => bar.before(els[i]));
    panel.classList.add("u13on");
  }

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { paint(); } catch (e) { /* まとめられなくても、画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
