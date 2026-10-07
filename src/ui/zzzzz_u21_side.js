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
  // U23：立ち絵が小さくなった（持ち主「UI変えてもらったら立ち絵が小さくなった」）。本文の欄を 1 行 32 字ほどに、右の列を少し細くし、
  // 本文の欄と右の列のあいだを立ち絵の場所にする。話している人は画面の高さの 9 割ほどで、足元まで見える（欄の後ろに沈めない）
  u21.CHARS = 32; // 本文の 1 行の字数（広い画面でもこれまで）
  u21.FIG = 0.9; // 立ち絵の高さ（見出しの帯より下の高さに対して）
  u21.TMIN = 0.3; // 本文の欄の低いときの高さ（見出しの帯より下の高さに対して）
  u21.TMIN_PX = 180;
  u21.CORE = 0.42; // 立ち絵の幅のうち、ぼかさずに見える真ん中の割合（高さに対して。v9_pc.css の .v9fig.img の覆い：幅 0.8×高さの 52%）
  u21.layout = (vw, vh) => {
    const base = v9Layout(vw, vh, false);
    const { head, m, fs } = base;
    vw = base.vw; vh = base.vh;
    const gap = Math.round(Math.max(14, m * 0.8));
    const sw = Math.round(Math.max(340, Math.min(480, vw * 0.29)));
    const side = { x: vw - m - sw, y: head + 8, w: sw, h: vh - head - 8 - m };
    const leftW = side.x - gap - m;
    const width = (c) => c * fs + v9.PAD * 2 + 10;
    let chars = u21.CHARS;
    while (chars > 28 && width(chars) > leftW) chars--;
    const tw = Math.min(leftW, width(chars));
    const avail = vh - m - head;
    const tmax = Math.max(200, avail - u21.TOP_GAP);
    // 本文の欄の低いとき（中身が短いとき）の高さ。U23：低くして、背景の絵を見せる（持ち主「立ち絵や背景は見えるように」）
    const tmin = Math.round(Math.min(tmax, Math.max(u21.TMIN_PX, Math.min(400, avail * u21.TMIN))));
    const tome = { x: m, y: vh - m - tmax, w: tw, h: tmax, min: tmin };
    // 立ち絵の場所：左の広い所（見出しの帯の下から画面の下まで）。人は本文の欄と右の列のあいだ（stand）に立つ
    const cast = { x: 0, y: head, w: Math.max(0, side.x - 4), h: vh - head };
    const stand = { x0: tome.x + tome.w, x1: side.x };
    return Object.assign({}, base, { chars, tome, cast, side, stand, stage: null, side21: true });
  };
  // 立ち絵の置き場所（V9 の placeCast と同じ形）。本文の欄と右の列のあいだの真ん中に、話している人を大きく。
  // 高さは、見えている真ん中（CORE）がそのあいだに入る大きさまで。後ろの人は少し小さく暗く、左右にずらす（欄の後ろに隠れてもよい）
  const v9Place = v9.placeCast;
  u21.v9Place = v9Place;
  u21.placeCast = (L, list) => {
    const n = (list || []).length;
    if (!L || !L.side21 || !L.stand || !n) return v9Place ? v9Place(L, list) : [];
    const C = L.cast;
    const room = Math.max(0, L.stand.x1 - L.stand.x0);
    // 右の列を入れる前（V9）の大きさより小さくはしない（狭い画面では、人の端が本文の欄の後ろに隠れてもよい）
    const was = v9Place ? (v9Place(v9Layout(L.vw, L.vh, false), [{ role: "speaker" }])[0] || {}).h || 0 : 0;
    const H = Math.round(Math.min(C.h, Math.max(was, C.h * 0.6, Math.min(C.h * u21.FIG, room / u21.CORE))));
    const mid = Math.round((L.stand.x0 + L.stand.x1) / 2 - C.x);
    const off = Math.round(H * 0.3);
    const speaker = list[0] && list[0].role === "speaker";
    if (speaker) {
      const xs = [mid, mid - off, mid + off];
      return list.map((c, i) => ({ x: xs[i], h: i ? Math.round(H * 0.82) : H, front: i === 0, dim: i ? 0.45 : 0, z: i ? 1 : 3 }));
    }
    const xs = n === 1 ? [mid] : n === 2 ? [mid - off / 2, mid + off / 2] : [mid, mid - off, mid + off];
    return list.map((c, i) => ({ x: Math.round(xs[i]), h: Math.round(H * (n === 3 && i ? 0.86 : 0.94)), front: false, dim: 0.22, z: n === 3 && !i ? 2 : 1 }));
  };
  if (v9Place) v9.placeCast = (L, list) => (L && L.side21 ? u21.placeCast(L, list) : v9Place(L, list));
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

  // ---------------------------------------------------------------- U23：町の選択肢を、もっと細かい組に（持ち主「街など、選択がいっぱいある場合はまとめてほしい」）
  // PC の右の列だけ。組は 施設・特色の場所・人に会う・依頼・噂・旅立つ・持ち物・その他。よく使う組ほど上に。スマホ（U13 の「街で／冒険／仲間／その他」）は今のまま
  // 町の組（「首都エルメシア」のように、施設と町ならではの場所と「町をぶらつく」が一つの組に入っている）は、選択肢ごとに組を分ける（画面の中だけ。エンジンの G.actions は変えない）
  u21.TOWN_CATS = [
    { key: "fac", label: "施設" },
    { key: "spot", label: "特色の場所" },
    { key: "people", label: "人に会う" },
    { key: "quest", label: "依頼・噂" },
    { key: "travel", label: "旅立つ" },
    { key: "misc", label: "持ち物・その他" },
  ];
  u21.TOWN_MIN_ITEMS = 5; // 町では、選択肢がこれ以上で分類が 2 つ以上なら組にまとめる
  // どこの町にもある施設（ほかの fac:… はその町ならではの場所）
  u21.CORE_FAC = ["inn", "tavern", "shop", "guild", "church", "train", "alley", "castle", "academy", "forge"];
  const TOWN_BY = {
    walk: "spot", a11sight: "spot", explore: "spot", k1track: "spot", k1herb: "spot",
    m2talk: "people", c2inv: "people", f4seek: "people", k1comp: "people", b5: "people",
    q5go: "quest", m12: "quest", f2o: "quest", r3: "quest",
    travel: "travel", sail: "travel",
  };
  u21.townCat = (a) => {
    const id = String((a && a.id) || "");
    const p = id.split(":")[0];
    if (p === "fac") return u21.CORE_FAC.includes(id.split(":")[1]) ? "fac" : "spot";
    return TOWN_BY[p] || "misc";
  };
  u21.isTown = (S) => !!(S && S.mode === "explore" && !S.combat && !S.over && G.loc && (G.loc() || {}).type === "town");
  // 組を、選択肢の分類ごとに分ける（分類が一つの組はそのまま）。分けた二つ目からの見出しは分類の名前
  u21.splitTown = (groups) => {
    const out = [];
    (groups || []).forEach((g) => {
      const list = (g && g.list) || [];
      const cats = [...new Set(list.map(u21.townCat))];
      if (cats.length < 2 || (u13 && u13.pinned && u13.pinned(g))) { out.push(g); return; }
      cats.forEach((c, i) => {
        const part = list.filter((a) => u21.townCat(a) === c);
        out.push(Object.assign({}, g, { title: i === 0 ? g.title : (u21.TOWN_CATS.find((x) => x.key === c) || {}).label || g.title, list: part }));
      });
    });
    return out;
  };
  // 町の組の分け方（U13 の plan と同じ形）。groups は splitTown のあと
  u21.townPlan = (groups, S) => {
    if (!u21.isTown(S)) return null;
    const gs = (groups || []).filter((g) => g && g.list && g.list.length);
    const tabs = u21.TOWN_CATS.map((c) => ({ key: "t:" + c.key, label: c.label, groups: [], ids: [] }));
    const top = [];
    gs.forEach((g, i) => {
      if (u13 && u13.pinned && u13.pinned(g)) { top.push(i); return; }
      const n = {};
      g.list.forEach((a) => { const c = u21.townCat(a); n[c] = (n[c] || 0) + 1; });
      const c = Object.keys(n).sort((a, b) => n[b] - n[a] || u21.TOWN_CATS.findIndex((x) => x.key === a) - u21.TOWN_CATS.findIndex((x) => x.key === b))[0];
      const t = tabs.find((x) => x.key === "t:" + c);
      t.groups.push(i);
      g.list.forEach((a) => t.ids.push(a.id));
    });
    const used = tabs.filter((t) => t.groups.length);
    const items = gs.reduce((k, g) => k + g.list.length, 0);
    if (used.length < 2 || items < u21.TOWN_MIN_ITEMS) return null;
    return { tabs: used, top, bottom: [], place: "town21" };
  };
  if (u13 && u21.plan) {
    const planPC = u21.plan;
    u21.plan = (groups, S) => (u21.isTown(S) ? u21.townPlan(groups, S) : planPC(groups, S));
  }
  // 画面が G.actions を読むとき（右の列を出している町だけ）、町の組を分けて渡す
  if (typeof G.actions === "function") {
    const actions0 = G.actions;
    u21.actions0 = actions0;
    G.actions = (...a) => { const gs = actions0(...a); return u21.active && u21.isTown(G.S) ? u21.splitTown(gs) : gs; };
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
