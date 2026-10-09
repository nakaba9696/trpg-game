// U21：PC の一画面にすべて収め、スクロールせずに遊べるようにする（持ち主の声「UI が結局スクロールが必要」）。
// U29 で持ち主の配置図に合わせて作り直した：
//   ・左上「メニュー系 2」：今の状態（名前・HP と MP・所持金・仲間の札、いる所・日付と時刻・状態の札）。#mbar に場所の一行（#u29where）を足す
//   ・右上「メニュー系」：図鑑・地図・依頼・ステータス・ログ・トロフィー・システム・設定のボタン（上の帯の道具を細い窓に）
//   ・真ん中：何も置かない。背景の絵は画面いっぱい、魔物と立ち絵がその真ん中に大きく立つ
//   ・下の左「ログ」：本文の欄（U14 の看板・U19 の頁・U28 の順に見せる流れ・U27 の得たもの）
//   ・下の右「コマンド・選択肢」：#panel をここへ移す。町・探索の行動の組（U13／U23 の組のボタン）、出来事の選択肢、戦闘の手（F1・U13）。長いときはこの窓の中だけ流れる
//   下の二つの窓は同じ高さ（画面の 3 分の 1 ほど）で左右に並ぶ。戦闘・会話・町・迷宮のどの場面でも同じ形
// 組は U13（ui/u13_menu.js）のまとめ方（町は U23 の 施設・特色の場所…）。最初に開く組は U26 が決める。選択肢の中身（印・成功率・1〜9 のキー）は触らない。
// スマホ・狭い窓は U31（ui/zzzzz_u31_mobile.js）が同じ四つの窓を縦長・横長の形に並べ直す（body.u31m。u21.layout・u21.placeCast を包む）。ui.js は書き換えず、G.ui.render と G.v9.layout・G.v9.placeCast・G.u13.plan を包む
// （名前の zzzzz で、v9_pc・u13・u14・u19 より後に読まれる）。見た目は ui/zzzzz_u21_side.css。エンジンは読むだけ。レーン U（U21・U23・U29）
(function (G) {
  const u21 = (G.u21 = G.u21 || {});
  const v9 = G.v9;
  if (!v9 || !v9.layout) return;

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // 右の列で組にまとめるのは、選択肢がこれ以上のとき（スマホ・下の帯は U13 の数のまま）
  u21.MIN_ITEMS = 7;
  u21.FAC_MIN_ITEMS = 9;

  // 配置。V9 の layout と同じ形（tome・cast・stage・fs・m…）に、右の列（side）と本文の欄の低いとき（tome.min）を足す。
  // 本文の欄は画面の下に寄せ、高さは中身に合わせて tome.min〜tome.h（CSS の min-height・max-height）。戦闘は V9 のまま
  const v9Layout = v9.layout;
  u21.v9Layout = v9Layout;
  // U23：立ち絵が小さくなった（持ち主「UI変えてもらったら立ち絵が小さくなった」）。本文の欄を 1 行 32 字ほどに、右の列を少し細くし、
  // 本文の欄と右の列のあいだを立ち絵の場所にする。話している人は画面の高さの 9 割ほどで、足元まで見える（欄の後ろに沈めない）
  u21.FIG = 0.9; // 立ち絵の高さ（見出しの帯より下の高さに対して）
  u21.CORE = 0.42; // 立ち絵の幅のうち、ぼかさずに見える真ん中の割合（高さに対して。v9_pc.css の .v9fig.img の覆い：幅 0.8×高さの 52%）
  // U29：持ち主の配置図「左上にメニュー系 2・右上にメニュー系・真ん中は魔物や立ち絵・下の左にログ・下の右にコマンドと選択肢」。
  // 背景の絵は画面いっぱい。下の二つの窓（本文の欄＝ログ、右の窓＝コマンド・選択肢）は同じ高さで左右に並べる。戦闘・会話・町・迷宮のどれでも同じ形
  u21.PANE = 0.34; // 下の窓の高さ（画面の高さに対して）
  u21.PANE_COMBAT = 0.38; // 戦闘は手と仲間の札が多いので少し高く
  u21.PANE_MIN = 230;
  u21.PANE_MAX = 400;
  u21.GAP = 12; // 下の二つの窓のあいだ
  u21.layout = (vw, vh, combat) => {
    const base = v9Layout(vw, vh, false);
    const { head, fs } = base;
    vw = base.vw; vh = base.vh;
    const m = Math.round(Math.max(10, Math.min(24, vw * 0.012)));
    const ph = Math.round(Math.max(u21.PANE_MIN, Math.min(u21.PANE_MAX + (combat ? 40 : 0), vh * (combat ? u21.PANE_COMBAT : u21.PANE))));
    const y = vh - m - ph;
    const lw = Math.round((vw - m * 2 - u21.GAP) / 2);
    const tome = { x: m, y, w: lw, h: ph, min: ph };
    const side = { x: m + lw + u21.GAP, y, w: vw - m - (m + lw + u21.GAP), h: ph };
    const chars = Math.max(20, Math.min(48, Math.floor((lw - v9.PAD * 2 - 10) / fs)));
    // 真ん中の舞台：立ち絵は画面の真ん中に立ち、足元は下の窓の後ろへ沈む。戦闘の魔物も真ん中に大きく
    const cast = combat ? { x: 0, y: head + 64, w: Math.round(vw * 0.22), h: y + 40 - head - 64 } : { x: 0, y: head, w: vw, h: vh - head };
    const stand = { x0: Math.round(vw * 0.3), x1: Math.round(vw * 0.7) };
    const stage = combat ? { x: m, y: head, w: vw - m * 2, h: y + 40 - head } : null;
    return Object.assign({}, base, { m, chars, tome, cast, side, stand, stage, combat: !!combat, side21: true });
  };
  // 立ち絵の置き場所（V9 の placeCast と同じ形）。本文の欄と右の列のあいだの真ん中に、話している人を大きく。
  // 高さは、見えている真ん中（CORE）がそのあいだに入る大きさまで。後ろの人は少し小さく暗く、左右にずらす（欄の後ろに隠れてもよい）
  const v9Place = v9.placeCast;
  u21.v9Place = v9Place;
  u21.placeCast = (L, list) => {
    const n = (list || []).length;
    if (!L || !L.side21 || !L.stand || !n || L.combat) return v9Place ? v9Place(L, list) : [];
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
  v9.layout = (vw, vh, combat) => u21.layout(vw, vh, combat);

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
      if (cats.length < 2 || u21.OWN.includes(g && g.title) || (u13 && u13.pinned && u13.pinned(g))) { out.push(g); return; }
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
  // R8 中 8：長編の入口（使徒を追う）・絆の褒美（絆）・想いを伝える（想い）は、「持ち物・その他」に混ぜず、その名前の組として出す
  //   町でも町の外でも（PC の右の列だけ）。組は「旅立つ」「冒険」「持ち物・その他」「その他」の前に
  u21.OWN = ["使徒を追う", "絆", "想い"];
  u21.ownTabs = (plan, groups) => {
    if (!plan || !plan.tabs || plan.kind === "combat") return plan;
    const own = [];
    const tabs = plan.tabs.map((t) => {
      const keep = t.groups.filter((i) => !(groups[i] && u21.OWN.includes(groups[i].title)));
      if (keep.length === t.groups.length) return t;
      t.groups.filter((i) => !keep.includes(i)).forEach((i) => {
        const title = groups[i].title;
        let o = own.find((x) => x.label === title);
        if (!o) { o = { key: "o:" + title, label: title, groups: [], ids: [] }; own.push(o); }
        o.groups.push(i);
        groups[i].list.forEach((a) => o.ids.push(a.id));
      });
      const ids = keep.flatMap((i) => groups[i].list.map((a) => a.id));
      return Object.assign({}, t, { groups: keep, ids });
    }).filter((t) => t.groups.length);
    if (!own.length) return plan;
    own.sort((a, b) => u21.OWN.indexOf(a.label) - u21.OWN.indexOf(b.label));
    let at = tabs.findIndex((t) => ["t:travel", "t:misc", "adv", "misc"].includes(t.key));
    if (at < 0) at = tabs.length;
    tabs.splice(at, 0, ...own);
    return Object.assign({}, plan, { tabs });
  };
  // 初めの手がかり（f2o・r3。スマホでは組の上に出したまま）は、PC の右下の窓では「手がかり」の組に（上に出したままだと、窓が低いので組の札が窓の外に押し出される）
  //   答えを待つ問い（b5use「〇〇を誰に使う？」）は上に出したまま。手がかりの組は最初に置き、序章の手がかり（f2o）があれば着いたときに開く（ui/zzzzzz_u26_review.js）
  u21.HINT_PREFIX = ["f2o", "r3"];
  u21.hintTabs = (plan, groups) => {
    if (!plan || !plan.tabs || plan.kind === "combat" || !(plan.top || []).length) return plan;
    const isHint = (i) => groups[i] && (groups[i].list || []).some((a) => u21.HINT_PREFIX.includes(String(a.id || "").split(":")[0])) && !(groups[i].list || []).some((a) => /^b5use/.test(String(a.id || "")));
    const hint = plan.top.filter(isHint);
    if (!hint.length) return plan;
    const ids = hint.flatMap((i) => groups[i].list.map((a) => a.id));
    const tab = { key: "o:hint", label: hint.length === 1 ? String(groups[hint[0]].title || "手がかり").replace(/（.*$/, "") : "手がかり", groups: hint, ids };
    return Object.assign({}, plan, { tabs: [tab, ...plan.tabs], top: plan.top.filter((i) => !hint.includes(i)) });
  };
  if (u13 && u21.plan) {
    const planOwn = u21.plan;
    u21.plan = (groups, S) => {
      const gs = (groups || []).filter((g) => g && g.list && g.list.length);
      return u21.hintTabs(u21.ownTabs(planOwn(groups, S), gs), gs);
    };
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
    const pc = v9.isPC(vwNow(), window.innerHeight);
    const mobile = !pc && !!(v9.mobileOn && v9.mobileOn(vwNow(), window.innerHeight)); // U31：スマホは縦長・横長の形（ui/zzzzz_u31_mobile.js）
    const want = !!(playing() && (pc || mobile) && G.S); // U29：戦闘でも同じ形（右下の窓にコマンド）
    body.classList.toggle("u31m", want && mobile);
    u21.active = want;
    body.classList.toggle("u21pc", want);
    if (!panel || !tome) return want;
    if (want && panel.parentNode !== side) side.append(panel);
    if (!want && panel.parentNode !== tome) tome.append(panel);
    if (want) {
      const L = u21.layout(vwNow(), window.innerHeight, !!G.S.combat);
      const r = document.documentElement.style;
      const px = (k, v) => r.setProperty(k, Math.round(v) + "px");
      px("--u21-sx", L.side.x); px("--u21-sy", L.side.y); px("--u21-sw", L.side.w); px("--u21-sh", L.side.h);
      px("--u21-tmin", L.tome.min); px("--u21-m", L.m);
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
    // U29：下の右の窓は低いので、組の札は上に一列（小さな札）にまとめ、開いた組の中身をその下に（中身だけ流れる）
    const box = h("div", "u21open");
    box.id = "u21open";
    after.forEach((g, k) => { if (order[k].open) box.append(g); });
    // R8 表 4c：「施設」は名前の短い選択肢が 7 つほど並ぶので、二列に（低い窓でも全部見える。ui/u29_two.css）
    box.classList.toggle("u29two", key === "t:fac");
    bar.classList.add("u21tabs");
    bar.after(box);
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "行動の組");
    tabs.forEach((t) => {
      t.removeAttribute("role");
      t.removeAttribute("aria-selected");
      const on = t.dataset.u13 === key;
      t.setAttribute("aria-expanded", String(on));
      if (on) t.setAttribute("aria-controls", "u21open");
      if (!t.querySelector(".u21caret")) t.append(h("span", "u21caret", on ? "▾" : "▸"));
    });
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

  // U29：左上の札（メニュー系 2）に、いる所・日付と時刻・今の状態の一行
  const where = h("div", "u29where");
  where.id = "u29where";
  const wPlace = h("b", "u29wplace"), wDate = h("span", "u29wdate num"), wState = h("span", "u29wstate");
  where.append(wPlace, wDate, wState);
  function paintWhere(S) {
    const mbar = $("#mbar");
    if (!mbar) return;
    if (where.parentNode !== mbar) { const name = mbar.querySelector(".mname"); if (name) name.after(where); else mbar.prepend(where); }
    const U28 = G.u28 || {};
    const L = ((G.data || {}).LOCS || {})[S.loc] || {};
    // 旅の途中は、出発した町ではなく「〇〇への道中」（R8 低 26）
    const T = S.travel && ((G.data || {}).LOCS || {})[S.travel];
    wPlace.textContent = T ? `${T.name}への道中` : U28.placeOf ? U28.placeOf(S) : L.name || "";
    const d = $("#sceneDate");
    wDate.textContent = (d && d.textContent) || (G.date ? G.date() : "");
    const st = U28.stateOf ? U28.stateOf(S) : "";
    wState.textContent = st;
    wState.hidden = !st;
    where.dataset.state = st;
  }
  u21.paintWhere = paintWhere;

  const base = ui.render;
  ui.render = (...a) => {
    place();
    const r = base(...a);
    try {
      place();
      const S = G.S;
      if (S && u21.active) {
        accordion(S);
        paintWhere(S);
        // 出来事の組の見出し「どうする？」は、窓の縁の札（u28）と同じなので出さない
        document.querySelectorAll("#panel > .agroup > h3").forEach((t) => { if (t.textContent.trim() === "どうする？" && $("#panel > .u28head")) t.hidden = true; });
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
