// U24：図鑑を見やすく・探しやすく。持ち主の声「図鑑はスクロールしてもいいから、まずデータを見やすく。データへのアクセス性とデータの閲覧性をあげて」
//   ・探す：アイテム・魔物・人物・用語のタブの上に、名前で探す欄・絞り込み（種類／地方／格 S〜D／分かった弱点／倒した・まだ）・並べ替え（いつもの順・名前順・格順・見つけた順）・「！だけ」
//     絞り込みや並べ替えをすると、区分の見出しを外して一つの一覧に並べる（いつもの順なら区分ごと）
//   ・一覧のマス：魔物は格（S〜D 級）と倒した数の札
//   ・説明：名前のすぐ下に要点の札（格・地方・倒した数・新しく載った）。性能の表は、弱点・効き目・落とす物などを色で分けて一目で分かる形に。文章は行間を広く、途中で切らずに全部
//   ・スマホ：一覧で選ぶと説明に切り替わり、「一覧へ戻る」で一覧へ（今の位置のまま）
// 図鑑の中身は f2_codex.js（とタブを足す q5・zk・zi3・f4）が描く。ここは描いたあとの一覧と説明に手を足すだけ（「！」の印や選んだ印の class には触らない）。
// 見た目は ui/zu24_codex_read.css。名前の zu24 で、図鑑に手を足すファイルより後に読まれる。レーン U（U24）
(function (G) {
  const U = (G.u24 = G.u24 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // 項目：{ id, name, known, fresh, group, gi（区分の順）, i（区分の中の順）, grade, kills, at, weak:[種類] }
  // opts：{ q 名前, group, grade, weak, killed（"yes"|"no"|""）, fresh, sort（""|"name"|"grade"|"at"） }
  U.match = (e, o) => {
    o = o || {};
    const q = String(o.q || "").trim().toLowerCase();
    if (q && !(e.known && String(e.name || "").toLowerCase().includes(q))) return false;
    if (o.group && e.group !== o.group) return false;
    if (o.grade && e.grade !== o.grade) return false;
    if (o.weak && !(e.weak || []).includes(o.weak)) return false;
    if (o.killed === "yes" && !(e.kills > 0)) return false;
    if (o.killed === "no" && !(e.known && !(e.kills > 0))) return false;
    if (o.fresh && !e.fresh) return false;
    return true;
  };
  U.GRADES = ["S", "A", "B", "C", "D"];
  const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ja");
  const base = (a, b) => (a.gi - b.gi) || (a.i - b.i);
  U.sort = (list, sort) => {
    const out = (list || []).slice();
    const unknownLast = (a, b) => (b.known ? 1 : 0) - (a.known ? 1 : 0);
    if (sort === "name") out.sort((a, b) => unknownLast(a, b) || byName(a, b) || base(a, b));
    else if (sort === "grade") out.sort((a, b) => unknownLast(a, b) || ((U.GRADES.indexOf(a.grade) + 1 || 9) - (U.GRADES.indexOf(b.grade) + 1 || 9)) || base(a, b));
    else if (sort === "at") out.sort((a, b) => unknownLast(a, b) || ((b.at || 0) - (a.at || 0)) || base(a, b));
    else out.sort(base);
    return out;
  };
  // 絞り込みも並べ替えもしていない（区分ごとの、いつもの形で見せる）か
  U.plain = (o) => !o || (!String(o.q || "").trim() && !o.group && !o.grade && !o.weak && !o.killed && !o.fresh && !o.sort);
  U.view = (entries, o) => U.sort((entries || []).filter((e) => U.match(e, o)), o && o.sort);
  // 区分の見出し「レオネスト王国　29／52」から名前だけ
  U.groupName = (text) => String(text || "").replace(/！/g, "").replace(/[\s　]+\d+\s*[／/]\s*\d+\s*$/, "").trim();

  if (typeof document === "undefined" || typeof window === "undefined") return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const dlg = $("#dlgCodex");
  if (!dlg) return;
  const body = $(".dbody", dlg), list = $(".f2list", dlg), detail = $(".f2detail", dlg), panes = $(".f2panes", dlg), view = $(".f2view", dlg);
  if (!body || !list || !detail || !panes) return;
  const D = G.data;
  const TABS = ["item", "foe", "person", "lore"];
  const curTab = () => { const t = $('.tabs [role=tab][aria-selected="true"]', dlg); return t ? t.dataset.tab : ""; };
  const narrow = () => window.matchMedia && window.matchMedia("(max-width: 760px)").matches;

  // ---------------------------------------------------------------- 探す・絞る・並べる の帯
  const opts = {}; // タブ → 選んでいる条件（窓を閉じても、この冒険のあいだは覚える）
  const bar = h("div", "u24bar");
  bar.setAttribute("role", "search");
  const q = h("input", "u24q");
  q.type = "search";
  q.autocomplete = "off";
  const sel = (label) => { const s = h("select", "u24sel"); s.setAttribute("aria-label", label); return s; };
  const fGroup = sel("区分で絞る"), fGrade = sel("格で絞る"), fWeak = sel("分かった弱点で絞る"), fKill = sel("倒したかで絞る"), fSort = sel("並べ替え");
  const fresh = h("button", "btn small u24fresh", "！だけ");
  fresh.type = "button";
  fresh.title = "新しく載った項目だけを出す";
  const count = h("span", "fine u24count");
  const clear = h("button", "btn small u24clear", "条件を消す");
  clear.type = "button";
  bar.append(q, fGroup, fGrade, fWeak, fKill, fSort, fresh, clear, count);
  if (view) view.after(bar); else body.insertBefore(bar, panes);
  const oldFind = $(".f2find", dlg); // 用語の名前の欄（f2）は、この帯の欄に替える
  const fill = (s, rows, v) => {
    s.textContent = "";
    rows.forEach(([val, label]) => { const o = h("option", "", label); o.value = val; s.append(o); });
    s.value = rows.some(([val]) => val === v) ? v : "";
  };

  // 一覧のマスから項目を読む（描かれた順が「いつもの順」）
  function entries(tab) {
    const out = [];
    const c = G.codex ? G.codex() : {};
    $$("section.f2group:not(.u24flat)", list).forEach((sec, gi) => {
      const hd = $(":scope > h3", sec);
      const group = U.groupName(hd ? hd.textContent : "");
      $$(".f2grid > .f2cell", sec).forEach((cell, i) => {
        const id = cell.dataset.id || "";
        const known = !cell.classList.contains("unknown");
        const e = { id, cell, sec, name: known ? ($(".f2name", cell) || cell).textContent : "", known, fresh: cell.classList.contains("fresh"), group, gi, i, grade: "", kills: 0, at: 0, weak: [] };
        if (tab === "foe" && id) {
          e.grade = G.gradeOf ? G.gradeOf(id) || "" : "";
          const r = (c.foes || {})[id];
          if (r) { e.kills = r.kills || 0; e.at = r.at || 0; }
          if (known && G.e12 && G.e12.known) e.weak = G.e12.known(id).filter((x) => x.known && x.m > 1).map((x) => x.type);
        } else if (tab === "item" && id) { const r = (c.items || {})[id]; if (r) e.at = r.at || 0; }
        else if (tab === "person" && id) { const r = (c.people || {})[id]; if (r) e.at = r.at || 0; }
        out.push(e);
      });
    });
    return out;
  }

  let busy = false;
  let listMo = null; // 一覧の見張り（自分で並べ直した分の知らせは捨てる）
  let baseAll = null, baseTab = ""; // 描かれたときのマス（区分といつもの順）。一覧が描き直されたら読み直す
  // 一つの一覧にまとめたマスを、元の区分へ元の順で戻す（まだ見ぬものの札は区分の最後）
  function restore() {
    const was = busy;
    busy = true;
    try {
      const flat = $$(".u24flat", list);
      if (baseAll) {
        const bySec = new Map();
        baseAll.forEach((e) => { if (!bySec.has(e.sec)) bySec.set(e.sec, []); bySec.get(e.sec).push(e); });
        bySec.forEach((es, sec) => {
          const grid = $(".f2grid", sec);
          if (!grid) return;
          const cells = es.sort((a, b) => a.i - b.i).map((e) => e.cell);
          if (flat.length || cells.some((c) => c.parentElement !== grid)) grid.append(...cells, ...$$(":scope > .f2rest", grid));
        });
      }
      flat.forEach((x) => x.remove());
      $$(".u24hide", list).forEach((x) => x.classList.remove("u24hide"));
    } finally { busy = was; if (listMo) listMo.takeRecords(); }
  }
  function apply() {
    const tab = curTab();
    const on = TABS.includes(tab);
    bar.hidden = !on;
    if (oldFind) oldFind.hidden = true;
    if (!on) return;
    const o = (opts[tab] = opts[tab] || {});
    if (!baseAll || baseTab !== tab) { restore(); baseAll = entries(tab); baseTab = tab; }
    const all = baseAll;
    q.placeholder = { item: "アイテムを名前で探す", foe: "魔物を名前で探す", person: "人を名前で探す", lore: "用語を名前で探す" }[tab];
    q.setAttribute("aria-label", q.placeholder);
    if (document.activeElement !== q) q.value = o.q || "";
    const groups = [...new Set(all.map((e) => e.group))].filter(Boolean);
    fill(fGroup, [["", { item: "すべての種類", foe: "すべての地方", person: "すべての人", lore: "すべての節" }[tab]], ...groups.map((g) => [g, g])], o.group || "");
    fGrade.hidden = fWeak.hidden = fKill.hidden = tab !== "foe";
    if (tab === "foe") {
      fill(fGrade, [["", "すべての格"], ...U.GRADES.map((g) => [g, `${g} 級`])], o.grade || "");
      const types = (G.e12 && G.e12.TYPE) || {};
      const seenWeak = [...new Set(all.flatMap((e) => e.weak))];
      fill(fWeak, [["", "弱点：すべて"], ...Object.keys(types).filter((t) => seenWeak.includes(t)).map((t) => [t, `弱点：${types[t].name}`])], o.weak || "");
      fWeak.disabled = !seenWeak.length;
      fWeak.title = seenWeak.length ? "" : "倒したり当てたりして分かった弱点で絞れる";
      fill(fKill, [["", "倒した・まだ"], ["yes", "倒した"], ["no", "出会ったが、まだ倒していない"]], o.killed || "");
    }
    fill(fSort, [["", "いつもの順"], ["name", "名前順"], ...(tab === "foe" ? [["grade", "格の高い順"]] : []), ...(tab === "lore" ? [] : [["at", "見つけた順（新しい順）"]])], o.sort || "");
    fresh.setAttribute("aria-pressed", String(!!o.fresh));
    clear.hidden = U.plain(o);

    // 並べ直し（自分の書き換えでは見張りを止める）
    busy = true;
    try {
      restore();
      decorate(tab, all);
      if (U.plain(o)) {
        count.textContent = "";
        return;
      }
      const shown = U.view(all, o);
      // 一つの一覧にまとめる（区分の見出しは外す）。まだ見ぬものの札も外す
      const flat = h("section", "f2group u24flat");
      flat.append(h("h3", "", `見つかった ${shown.length} 件`));
      const grid = h("div", "f2grid" + (tab === "lore" ? " f2words" : ""));
      shown.forEach((e) => grid.append(e.cell));
      flat.append(grid);
      if (!shown.length) flat.append(h("p", "fine u24none", "条件に合うものがない。条件を緩めるか「条件を消す」。"));
      $$("section.f2group:not(.u24flat)", list).forEach((s) => s.classList.add("u24hide"));
      list.prepend(flat);
      count.textContent = `${shown.length} 件`;
    } finally { busy = false; if (listMo) listMo.takeRecords(); }
  }
  // 魔物のマス：格（S〜D 級）と倒した数の札（f2 の「格1・2体」の段の数を、格付けの言葉に）
  function decorate(tab, all) {
    if (tab !== "foe") return;
    all.forEach((e) => {
      if (!e.known || !e.grade) return;
      const t = $(".f2tier", e.cell);
      const txt = `${e.grade} 級${e.kills ? `・${e.kills}体` : ""}`;
      if (t && t.textContent !== txt) t.textContent = txt;
      e.cell.dataset.grade = e.grade;
    });
  }
  const set = (k, v) => { const tab = curTab(); (opts[tab] = opts[tab] || {})[k] = v; apply(); };
  let qt = 0;
  q.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(() => set("q", q.value), 120); });
  fGroup.onchange = () => set("group", fGroup.value);
  fGrade.onchange = () => set("grade", fGrade.value);
  fWeak.onchange = () => set("weak", fWeak.value);
  fKill.onchange = () => set("killed", fKill.value);
  fSort.onchange = () => set("sort", fSort.value);
  fresh.onclick = () => { const tab = curTab(); set("fresh", !((opts[tab] || {}).fresh)); };
  clear.onclick = () => { opts[curTab()] = {}; q.value = ""; apply(); };
  U.opts = opts;
  U.apply = () => apply();

  // 一覧が描き直されたら（タブを替えた・見せ方を替えた・項目を開いて印が消えた…）当て直す
  listMo = new MutationObserver(() => { restore(); baseAll = null; apply(); });
  listMo.observe(list, { childList: true });
  // タブを替えたとき（覚え書き・依頼のタブは一覧を描き直さないことがあるので、タブの印でも）
  new MutationObserver(() => { if (!busy) apply(); }).observe($(".tabs", dlg), { attributes: true, subtree: true, attributeFilter: ["aria-selected"] });

  // ---------------------------------------------------------------- 説明：要点の札と、読みやすい性能の表
  const TONE = { "よく効く": "good", "弱点": "good", "効きにくい": "bad", "効かない": "bad", "特技": "warn", "落とす物": "loot", "格": "grade" };
  let dbusy = false;
  let detMo = null;
  function readDetail() {
    if (dbusy) return;
    dbusy = true;
    try {
      const tab = curTab();
      // 性能の表：行ごとに色の印（弱点は緑・効きにくいは赤…）
      $$("dl.f2kv dt", detail).forEach((dt) => {
        const tone = TONE[dt.textContent.trim()];
        const dd = dt.nextElementSibling;
        if (!tone || !dd || dd.dataset.u24 || /^(なし|？|—)$/.test(dd.textContent.trim())) return;
        dd.dataset.u24 = tone;
        dt.dataset.u24 = tone;
      });
      // 要点の札（魔物）：名前のすぐ下に
      $$(".u24sum", detail).forEach((x) => x.remove());
      if (tab === "foe") {
        const on = $(".f2cell.on", list);
        const id = on && on.dataset.id;
        const title = $(":scope > .f2title", detail);
        if (id && title && G.f2 && G.f2.foe) {
          const e = G.f2.foe(id);
          const r = G.codexFoe ? G.codexFoe(id) : null;
          if (e && r) {
            const sum = h("div", "u24sum");
            const chip = (text, cls) => sum.append(h("span", "u24chip" + (cls ? " " + cls : ""), text));
            const g = G.gradeOf ? G.gradeOf(id) : "";
            if (g) chip(`${g} 級`, "u24g u24g-" + g);
            if (G.codexFoeRegion) chip(G.codexFoeRegion(id));
            chip(r.kills ? `倒した ${r.kills} 体` : "まだ倒していない", r.kills ? "u24ok" : "u24muted");
            if (G.e12 && G.e12.known) {
              const k = G.e12.known(id);
              const left = k.filter((x) => !x.known).length;
              if (k.length) chip(left ? `効き目 ${k.length - left}／${k.length} 判明` : "効き目 すべて判明", left ? "u24muted" : "u24ok");
            }
            title.after(sum);
          }
        }
      }
    } finally { dbusy = false; if (detMo) detMo.takeRecords(); }
  }
  detMo = new MutationObserver(() => readDetail());
  detMo.observe(detail, { childList: true });

  // ---------------------------------------------------------------- スマホ：一覧 → 説明の切り替え
  list.addEventListener("click", (ev) => {
    const c = ev.target.closest && ev.target.closest("button.f2cell");
    if (!c || !narrow()) return;
    panes.classList.add("u24det");
    requestAnimationFrame(() => { const top = detail.getBoundingClientRect().top; if (top < 0 || top > window.innerHeight * 0.5) detail.scrollIntoView({ block: "start" }); });
  });
  // 「一覧へ戻る」（f2 が説明の頭に置く）を押したら、一覧を出してから元のマスへ
  detail.addEventListener("click", (ev) => { if (ev.target.closest && ev.target.closest(".f2back")) panes.classList.remove("u24det"); }, true);
  // タブを替えたら一覧に戻す
  $(".tabs", dlg).addEventListener("click", () => panes.classList.remove("u24det"));
  dlg.addEventListener("close", () => panes.classList.remove("u24det"));
})(globalThis.G = globalThis.G || {});
