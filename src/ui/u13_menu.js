// U13：町などの行動の選択肢を、いくつかの分類（街で・冒険・仲間・その他）にまとめ、分類を選ぶと中身が出る（持ち主「メニュー画面、スクロールが多い。ある程度項目をまとめてほしい」）
// エンジンは触らない。ui.js が描いた #panel の .agroup を、G.actions() の並び（中身の無い組は描かれない）と突き合わせ、開いている分類の組だけを残す。
// どの組をどの分類にするかは、組の行動の id の頭（travel: / sail: / m2talk: …）で決める（u13.BY_PREFIX）。知らない頭は「その他」に入り、消えない。
// 店（施設）で組が多いときは、組そのもの（買う・今日の品・売る…）を分類にする。出来事の選択肢はまとめない。
// 戦闘：手は 5 つの見出し（攻撃・戦技・魔法・その他・道具。F4）。見出しを押すと中身が開く（一度に一つ。持ち主「戦闘画面も同様。スクロールではなくクリックだけで」）。
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

  // 戦闘でいつも出しておく手。この手を含む組はいつも出す。ほかの組（魔法・口と頭・道具…）は押すと開く
  u13.COMBAT_MAIN = ["cb:attack", "cb:vital", "cb:guard", "cb:flee"];
  // 答えを待つ問い（〇〇を誰に使う？）。戦闘でも上に出したまま
  const asking = (g) => /誰に使う？$/.test(g.title || "") || (g.list || []).some((a) => a.id === "b5:cancel");

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
    if (!S || S.over) return null;
    const gs = (groups || []).filter((g) => g && g.list && g.list.length);
    if (S.combat || S.mode === "combat") return combatPlan(gs);
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

  // 同じ品・術の「〇〇を仲間に」（b5:pick:…）を、元の行（cb:…）にまとめる。元の行を押すと、使う相手（自分・仲間）を選ぶ。
  //   pick の id は "b5:pick:" + 元の id の "cb:" を除いたもの（cb:item:herb ↔ b5:pick:item:herb、cb:heal ↔ b5:pick:heal）。
  //   相手を選んだら、b5:pick:<ref> のあとに cb:<ref>:<仲間の id> を続けて行う（選ぶ間は手番が進まない。B5）
  u13.pickOf = (id) => (/^cb:/.test(id || "") ? "b5:pick:" + id.slice(3) : null);
  u13.pairPicks = (list) => {
    const ids = new Set((list || []).map((a) => a.id));
    const pairs = {};
    (list || []).forEach((a) => { const p = u13.pickOf(a.id); if (p && ids.has(p)) pairs[a.id] = p; });
    return pairs; // 元の行の id → まとめた pick の id
  };
  u13.targetOf = (pick, cid) => "cb:" + String(pick).slice("b5:pick:".length) + ":" + cid;

  // 戦闘：いつも出す組（main）と、押すと開く組（drawers）。開く組が無ければまとめない
  // F4：戦闘の手は 5 つの見出し（攻撃・戦技・魔法・その他・道具。エンジンが組に cat を付ける。engine/zzzzzzzzzzzzzz_f4_menu.js）。
  //   見出しを押すと中身が開く（一度に一つ）。同じ見出しの組が続くとき（その他の下の作戦・仲間への指示）は、小見出しとして一つにまとめて出す
  u13.F4_ORDER = ["attack", "tech", "magic", "misc", "item"];
  u13.F4_NAME = { attack: "攻撃", tech: "戦技", magic: "魔法", misc: "その他", item: "道具" };
  function combatPlan(gs) {
    const top = [], cats = {};
    gs.forEach((g, i) => {
      if (asking(g)) { top.push(i); return; }
      const c = g.cat || (g.list.some((a) => u13.COMBAT_MAIN.includes(a.id)) ? "attack" : "misc");
      (cats[c] || (cats[c] = [])).push(i);
    });
    const tabs = u13.F4_ORDER.filter((c) => cats[c]).map((c) => {
      const list = cats[c].flatMap((i) => gs[i].list);
      const merged = new Set(cats[c].flatMap((i) => Object.values(u13.pairPicks(gs[i].list))));
      const shown = list.filter((a) => !merged.has(a.id));
      return { key: "d:" + u13.F4_NAME[c], label: u13.F4_NAME[c], cat: c, groups: cats[c], ids: list.map((a) => a.id), count: shown.length, usable: shown.filter((a) => !a.disabled).length };
    });
    if (!tabs.length) return null;
    return { kind: "combat", main: [], top, drawers: tabs, tabs, bottom: [], place: "combat" };
  }

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

  // まとめた組の数（描いた組の数と合わなければ、まとめずにそのまま描く）。戦闘は見出しごとに組が二つ以上あることがある（F4）
  u13.groupCount = (plan) => (plan.kind === "combat" ? plan.main.length + plan.top.length + plan.drawers.reduce((n, d) => n + d.groups.length, 0)
    : plan.tabs.reduce((n, t) => n + t.groups.length, 0) + plan.top.length + plan.bottom.length);

  // ---------------------------------------------------------------- 画面
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // 戦闘の開いている見出し。手番が進んでも同じ見出しのまま（続けて同じ術・道具を選びやすく）。戦闘が替わったら「攻撃」に戻る
  let drawer = null, drawerFight = null;
  function paintCombat(S, plan, panel, els) {
    if (S.combat !== drawerFight) { drawer = null; drawerFight = S.combat; who = null; }
    const open = plan.drawers.find((d) => d.key === drawer) || plan.drawers.find((d) => d.usable) || plan.drawers[0];
    drawer = open.key;
    const bar = h("div", "u13tabs u13drawers");
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", "戦闘の手");
    plan.drawers.forEach((d) => {
      const on = d === open;
      const b = h("button", "u13tab u13drawer" + (on ? " on" : "") + (d.usable ? "" : " dim"));
      b.type = "button";
      b.dataset.u13 = d.key;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(on));
      b.disabled = !d.usable && !on;
      b.append(h("span", "u13lab", d.label), h("span", "u13n num", String(d.count)));
      b.onclick = () => { if (on) return; drawer = d.key; who = null; ui.render(); const f = document.querySelector(`#panel .u13drawer[data-u13="${CSS.escape(d.key)}"]`); if (f) f.focus(); };
      bar.append(b);
    });
    const keep = new Set([...plan.top, ...open.groups]);
    els.forEach((el, i) => { if (!keep.has(i)) el.remove(); });
    // 開いた見出しの組を一つに：先頭の組が見出し、続く組（作戦・仲間ごとの指示）は小見出し
    const head = els[open.groups[0]];
    head.classList.add("u13main");
    head.dataset.f4 = open.cat;
    const list = head.querySelector(".alist");
    open.groups.slice(1).forEach((i) => {
      const el = els[i];
      const t = el.querySelector("h3");
      const sub = h("div", "u13sub u13chips"); // 小見出しの手は、短い札を横に並べる（説明は札に乗せたときに出る）
      sub.append(h("h4", "u13subt", t ? t.textContent : ""));
      const al = el.querySelector(".alist");
      if (al) {
        al.querySelectorAll(":scope > .act").forEach((b) => { const d = b.querySelector(":scope > span"); if (d && !b.title) b.title = d.textContent; });
        sub.append(al);
      }
      head.append(sub);
      el.remove();
    });
    const many = head.querySelectorAll(".act").length > 8;
    head.classList.toggle("u13many", many);
    if (list) mergePicks(S, head, G.actions().filter((g) => g.list.length)[open.groups[0]]);
    // 前の手番と同じ手を、すぐ選べるように
    const again = G.f4 && G.f4.lastAction ? G.f4.lastAction(S) : null;
    if (again) {
      const b = h("button", "btn small u13again");
      b.type = "button";
      b.title = "前の手番と同じ手をもう一度";
      b.append(h("span", "", "↻ 前と同じ："), h("b", "", again.label));
      b.onclick = () => { G.act(again.id); ui.after(); };
      bar.prepend(b);
    }
    head.after(bar);
    panel.classList.add("u13on", "u13fight");
    // 戦闘が始まったら、スマホでは見出しの道具を画面の外へ送り、絵・記録・手が一画面に入るようにする
    if (S.combat !== fightOf) {
      fightOf = S.combat;
      if (window.matchMedia("(max-width: 880px)").matches) requestAnimationFrame(() => {
        const sc = document.querySelector(".scene"), bar2 = document.getElementById("mbar");
        if (sc) window.scrollTo({ top: Math.max(0, window.scrollY + sc.getBoundingClientRect().top - (bar2 ? bar2.getBoundingClientRect().height : 0)) });
      });
    }
  }
  // 見出しを外から開く（F3：一行の札から仲間への指示）
  u13.openCombat = (cat) => { drawer = "d:" + (u13.F4_NAME[cat] || cat); who = null; ui.render(); };
  let fightOf = null;

  // 開いた一覧の中で、「〇〇」と「〇〇を仲間に」を一行にまとめる。まとめた行を押すと、使う相手を選ぶ小さな一覧（who）に替わる
  let who = null; // 相手を選んでいる行の id
  function mergePicks(S, pop, g) {
    if (!g) return;
    const pairs = u13.pairPicks(g.list);
    if (!Object.keys(pairs).length) { who = null; return; }
    const btns = Array.from(pop.querySelectorAll(".alist > .act"));
    if (btns.length !== g.list.length) return; // 描いた行と数が合わなければ、まとめない
    const picks = new Set(Object.values(pairs));
    g.list.forEach((a, i) => {
      if (picks.has(a.id)) { btns[i].remove(); return; }
      const p = pairs[a.id];
      if (!p) return;
      const pick = g.list.find((x) => x.id === p);
      btns[i].classList.add("u13hasWho");
      if (btns[i].querySelector("b")) btns[i].querySelector("b").append(h("span", "u13whoMark", " ▸"));
      btns[i].onclick = () => { if (btns[i].disabled) return; who = a.id; ui.render(); };
      if (who === a.id) showWho(S, pop, a, pick);
    });
    if (who && !pairs[who]) who = null;
  }
  function showWho(S, pop, a, pick) {
    const box = h("div", "u13who");
    box.append(h("p", "u13whoQ", `${a.label.replace(/（\d+）$/, "")}を誰に使う？`));
    const list = h("div", "alist u13whoList");
    const opt = (label, sub, disabled, fn) => {
      const b = h("button", "act u13whoOpt");
      b.type = "button";
      b.disabled = !!disabled;
      b.append(h("b", "", label));
      if (sub) b.append(h("span", "", sub));
      b.onclick = () => { if (!b.disabled) fn(); };
      list.append(b);
    };
    const go = (ids) => { who = null; ids.forEach((id) => G.act(id)); ui.after(); };
    opt("あなた", `HP ${S.hp}/${S.maxHp}`, a.disabled, () => go([a.id]));
    (S.companions || []).forEach((c) => {
      const max = G.b5Max ? G.b5Max(c) : c.maxHp || c.hp;
      opt(c.name, `HP ${Math.max(0, c.hp)}/${max}`, pick.disabled || c.hp >= max, () => go([pick.id, u13.targetOf(pick.id, c.id)]));
    });
    opt("やめる", "選び直す", false, () => { who = null; ui.render(); });
    box.append(list);
    // 相手を選んでいる間は、一覧の中身をこの小さな一覧に替える
    const al = pop.querySelector(".alist");
    if (al) al.hidden = true;
    pop.append(box);
  }
  // 数字キーの 10 番目は 0（1〜9 は v9_pc.js）。番号の札も付ける
  const playing = () => { const p = document.getElementById("play"); return p && !p.hidden; };
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "0" || ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || !playing() || document.querySelector("dialog[open]")) return;
    const t = ev.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    const b = document.querySelectorAll("#panel .act")[9];
    if (b && !b.disabled) { ev.preventDefault(); b.click(); }
  });
  function keyTen() {
    const b = document.querySelectorAll("#panel .act")[9];
    if (!b || b.querySelector(".v9key") || !document.body.classList.contains("v9pc")) return;
    const k = h("kbd", "v9key", "0");
    k.setAttribute("aria-hidden", "true");
    b.prepend(k);
    b.setAttribute("aria-keyshortcuts", "0");
  }
  // Esc で戦闘の一覧を閉じる
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || !drawer || document.querySelector("dialog[open]")) return;
    if (who) who = null; else drawer = null;
    ui.render();
  });

  function paint() {
    const S = G.S;
    const panel = document.getElementById("panel");
    if (!S || !panel) return;
    panel.classList.remove("u13on", "u13fight");
    document.body.classList.toggle("u13combat", !!(S.combat && !S.over));
    if (u13.holding && u13.holding()) return; // 戦闘の結果の場面を出している間は、まとめない（u13_battle.js）
    const plan = u13.plan(G.actions(), S);
    if (!plan) return;
    const els = Array.from(panel.querySelectorAll(":scope > .agroup"));
    if (els.length !== u13.groupCount(plan)) return; // 描いた組と数が合わなければ、まとめずにそのまま
    if (plan.kind === "combat") { paintCombat(S, plan, panel, els); return; }
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
    requestAnimationFrame(() => { try { keyTen(); } catch {} }); // 番号は v9_pc.js が振ったあとに
    return r;
  };
})(globalThis.G = globalThis.G || {});
