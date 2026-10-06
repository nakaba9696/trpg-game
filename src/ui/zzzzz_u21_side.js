// U21：PC の一画面にすべて収め、スクロールせずに遊べるようにする。持ち主の声「UI が結局スクロールが必要。こんな感じで改善できない？」
// 持ち主の画面案（ブランチ mock-u21 の docs/mock/u21_owner_layout.png）に寄せた配置：
//   ・上の帯：場所と日付・メニューのボタン（今のまま。V9）
//   ・左上：背景の絵の上に小さな札（名前と職業・HP と MP・所持金。V9 のまま）と立ち絵
//   ・左下：本文の欄（場所の看板・選んだこと・結果の文。U14・U19 のまま）。高さは中身に合わせ、下に寄せる
//   ・右の列：行動の組のボタン（「街で 8」「冒険 6」…）。押すと、その組の選択肢がボタンのすぐ下に開く（開いた組の中だけ流れる）
// 組は U13（ui/u13_menu.js）のまとめ方をそのまま使う（町・荒野・迷宮は「街で／冒険／仲間／その他」、店は「買う・売る…」）。
// PC では右の列が縦に長いので、まとめる数を少し下げる（u21.MIN_ITEMS）。最初に開く組は、その種類の場所で直前に開いた組（U13 が覚えている）。
// 出来事・会話・旅の道中は、選択肢をまとめずにそのまま右の列に出す。戦闘は今の下の帯の配置（V9・U13）のまま。
// 選択肢の中身（状態で現れる選択肢・依頼の印・成功率と一言・薄く見せる選択肢・1〜9 のキー）は触らない。#panel を右の列へ移すだけ。
// スマホ・狭い窓（V9 の PC でないとき）は何もしない。ui.js は書き換えず、G.ui.render と G.v9.layout・G.u13.plan を包む
// （名前の zzzzz で、v9_pc・u13・u14・u19 より後に読まれる）。見た目は ui/zzzzz_u21_side.css。エンジンは読むだけ。レーン U（U21）
(function (G) {
  const u21 = (G.u21 = G.u21 || {});
  const v9 = G.v9;
  if (!v9 || !v9.layout) return;

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // 右の列で組にまとめるのは、選択肢がこれ以上のとき（スマホ・下の帯は U13 の数のまま）
  u21.MIN_ITEMS = 7;
  u21.FAC_MIN_ITEMS = 9;
  u21.TOP_GAP = 124; // 本文の欄の上端は、左上の札の下まで（見出しの帯からの距離）

  // 配置。V9 の layout と同じ形（tome・cast・stage・fs・m…）に、右の列（side）と本文の欄の低いとき（tome.min）を足す。
  // 本文の欄は画面の下に寄せ、高さは中身に合わせて tome.min〜tome.h（CSS の min-height・max-height）。戦闘は V9 のまま
  const v9Layout = v9.layout;
  u21.v9Layout = v9Layout;
  u21.layout = (vw, vh) => {
    const base = v9Layout(vw, vh, false);
    const { head, m, fs } = base;
    vw = base.vw; vh = base.vh;
    const gap = Math.round(Math.max(14, m * 0.8));
    const sw = Math.round(Math.max(360, Math.min(500, vw * 0.33)));
    const side = { x: vw - m - sw, y: head + 8, w: sw, h: vh - head - 8 - m };
    const leftW = side.x - gap - m;
    const width = (c) => c * fs + v9.PAD * 2 + 10;
    let chars = 40;
    while (chars > 28 && width(chars) > leftW) chars--;
    const tw = Math.min(leftW, width(chars));
    const avail = vh - m - head;
    const tmax = Math.max(200, avail - u21.TOP_GAP);
    const tmin = Math.round(Math.min(tmax, Math.max(240, Math.min(520, avail * 0.5))));
    const tome = { x: m, y: vh - m - tmax, w: tw, h: tmax, min: tmin };
    // 立ち絵は左の広い所に。足元は本文の欄の後ろへ沈める（顔と肩が欄の上に見える）
    const low = vh - m - tmin;
    const cast = { x: 0, y: head, w: Math.max(0, side.x - gap), h: Math.round(low + tmin * 0.35 - head) };
    return Object.assign({}, base, { chars, tome, cast, side, stage: null, side21: true });
  };
  v9.layout = (vw, vh, combat) => (combat ? v9Layout(vw, vh, true) : u21.layout(vw, vh));

  // 右の列のまとめ方：U13 と同じ組で、まとめる数だけ下げる
  const u13 = G.u13;
  u21.active = false; // 右の列を出しているか（画面が決める。テストでは false のまま）
  if (u13 && u13.plan) {
    const basePlan = u13.plan;
    u21.u13Plan = basePlan;
    u21.plan = (groups, S) => {
      const a = u13.MIN_ITEMS, b = u13.FAC_MIN_ITEMS;
      u13.MIN_ITEMS = u21.MIN_ITEMS; u13.FAC_MIN_ITEMS = u21.FAC_MIN_ITEMS;
      try { return basePlan(groups, S); } finally { u13.MIN_ITEMS = a; u13.FAC_MIN_ITEMS = b; }
    };
    u13.plan = (groups, S) => (u21.active && !(S && S.combat) ? u21.plan(groups, S) : basePlan(groups, S));
  }

  // U13 が描いたあと、分類の札の後ろに並ぶ組（開いた組と、下に出したままの組）を、元の並び順に。open は開いた組か
  u21.afterOrder = (plan, key) => {
    const open = (plan.tabs || []).find((t) => t.key === key);
    if (!open) return [];
    const idx = [...open.groups, ...(plan.bottom || [])].sort((x, y) => x - y);
    return idx.map((i) => ({ i, open: open.groups.includes(i) }));
  };

  if (typeof document === "undefined" || typeof window === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const body = document.body;

  // ---------------------------------------------------------------- 右の列
  const side = h("aside", "u21side");
  side.id = "u21side";
  side.setAttribute("aria-label", "行動");
  const play = $("#play");
  if (play) play.append(side);
  const tomeEl = () => $(".tome");

  const vwNow = () => document.documentElement.clientWidth || window.innerWidth;
  const playing = () => !!(play && !play.hidden && G.S);
  function place() {
    const panel = $("#panel"), tome = tomeEl();
    const want = !!(playing() && v9.isPC(vwNow(), window.innerHeight) && G.S && !G.S.combat);
    u21.active = want;
    body.classList.toggle("u21pc", want);
    if (!panel || !tome) return want;
    if (want && panel.parentNode !== side) side.append(panel);
    if (!want && panel.parentNode !== tome) tome.append(panel);
    if (want) {
      const L = u21.layout(vwNow(), window.innerHeight);
      const r = document.documentElement.style;
      const px = (k, v) => r.setProperty(k, Math.round(v) + "px");
      px("--u21-sx", L.side.x); px("--u21-sy", L.side.y); px("--u21-sw", L.side.w); px("--u21-sh", L.side.h);
      px("--u21-tmin", L.tome.min);
    }
    return want;
  }
  u21.place = place;

  // 開いた組を、その札のすぐ下に（札 → 開いた組 → 残りの札）。開いた組の中だけ流れる
  function accordion(S) {
    const panel = $("#panel");
    if (!panel || !u21.active || !panel.classList.contains("u13on") || panel.classList.contains("u13fight")) return;
    const bar = panel.querySelector(":scope > .u13tabs");
    if (!bar || !u13) return;
    const plan = u13.plan(G.actions(), S);
    if (!plan || !plan.tabs) return;
    const key = u13.openKey(plan);
    const order = u21.afterOrder(plan, key);
    const after = [];
    for (let el = bar.nextElementSibling; el; el = el.nextElementSibling) if (el.classList.contains("agroup")) after.push(el);
    if (after.length !== order.length) return; // 描いた組と数が合わなければ、U13 の並べ方のまま
    const tabs = Array.from(bar.querySelectorAll(".u13tab"));
    const at = tabs.findIndex((t) => t.dataset.u13 === key);
    if (at < 0) return;
    const box = h("div", "u21open");
    box.id = "u21open";
    after.forEach((g, k) => { if (order[k].open) box.append(g); });
    const rest = h("div", "u13tabs u21rest");
    tabs.slice(at + 1).forEach((t) => rest.append(t));
    bar.classList.add("u21tabs");
    bar.after(box);
    box.after(rest);
    // 札は押すと開く見出し（タブではなく、開いた・閉じたの見出し）
    [bar, rest].forEach((b) => { b.setAttribute("role", "group"); b.setAttribute("aria-label", "行動の組"); });
    tabs.forEach((t) => {
      t.removeAttribute("role");
      t.removeAttribute("aria-selected");
      const on = t.dataset.u13 === key;
      t.setAttribute("aria-expanded", String(on));
      if (on) t.setAttribute("aria-controls", "u21open");
      if (!t.querySelector(".u21caret")) t.append(h("span", "u21caret", on ? "▾" : "▸"));
    });
    if (!rest.children.length) rest.remove();
    panel.classList.add("u21acc");
  }

  // ↑↓ で組の札を移る
  side.addEventListener("keydown", (ev) => {
    if ((ev.key !== "ArrowUp" && ev.key !== "ArrowDown") || !ev.target.closest || !ev.target.closest(".u13tab")) return;
    const tabs = Array.from(side.querySelectorAll(".u13tab"));
    const i = tabs.indexOf(ev.target.closest(".u13tab"));
    if (i < 0) return;
    ev.preventDefault();
    tabs[(i + (ev.key === "ArrowDown" ? 1 : tabs.length - 1)) % tabs.length].focus();
  });

  const base = ui.render;
  ui.render = (...a) => {
    place();
    const r = base(...a);
    try {
      place();
      const S = G.S;
      if (S && u21.active) {
        accordion(S);
        const box = $("#u21open");
        if (box) box.scrollTop = 0;
        const p = $("#panel");
        if (p) p.scrollTop = 0;
      }
    } catch (e) { /* 並べ替えに失敗しても、画面は止めない */ }
    return r;
  };

  // 画面の大きさが変わったとき（V9 の描き直しより少し後）
  let timer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { const was = u21.active; if (place() !== was && G.S && playing()) ui.render(); }, 160);
  });
  if (play) new MutationObserver(() => place()).observe(play, { attributes: true, attributeFilter: ["hidden"] });
})(globalThis.G = globalThis.G || {});
