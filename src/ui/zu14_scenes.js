// U14：場面ごとに画面の見た目をはっきり変える。持ち主の声「戦闘、探索、街の画面と語りで画面があまり変化がないので変えたい」
// 「急に街に着いて、上の方に小さく語りが入ってるので分かりにくい」
//   ・場面の種類（G.u14.kindOf）を <body data-u14="…"> に付け、枠・色・背景の色味を CSS（ui/zu14_scenes.css）で変える
//       town 街（明るめの枠・町の看板）／wild 荒野（暗め・危険度）／dungeon 迷宮（さらに暗く・深さ）／combat 戦闘（赤み）／story 語り（出来事・会話・旅の道中。本の頁）
//   ・文章の窓の頭に看板（#u14sign）：場所の名前と、場面ごとの印（施設・危険度・迷宮の階・旅の行き先・出来事）
//   ・場面の種類が変わったら、短い切り替え（頁をめくる・枠の色が移る）。BGM（S4）は同じ描き直しで替わる
//   ・町に着いたら（engine/zzzzzzzz_u14_arrive.js の S.u14arr）、画面の中央に町の名前を大きく（数秒・押せば消える）。そのあと語りの頭から読めるように送る
//   ・ログ：場面の区切り（場所の見出し）に日付を添え、今の場面より前の行は淡くする。着いたときの語りは本文として大きめに
// 演出は CSS の transition・opacity・transform だけ（毎コマ描くものは足さない）。prefers-reduced-motion では動かさない。
// ui.js は書き換えず、G.ui.render を包む（名前の zu で、v9_pc.js・zu11・zu12 より後に読まれる）。エンジンは読むだけ。レーン U（U14）
(function (G) {
  const U14 = (G.u14 = G.u14 || {});

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  U14.KINDS = ["town", "wild", "dungeon", "combat", "story", "over"];
  U14.kindOf = (S) => {
    if (!S) return null;
    if (S.over) return "over";
    if (S.combat) return "combat";
    if (S.mode === "event" || S.travel || (S.tk && S.tk.cur)) return "story";
    const L = ((G.data || {}).LOCS || {})[S.loc] || {};
    if (L.type === "town") return "town";
    if (L.type === "dungeon") return "dungeon";
    return "wild";
  };
  // 看板の中身：{ name 大きく, tag 種類の札, marks [小さな印] }
  U14.signOf = (S) => {
    const kind = U14.kindOf(S);
    if (!kind || kind === "over") return null;
    const D = G.data || {};
    const L = (D.LOCS || {})[S.loc] || {};
    const fac = S.mode === "fac" && S.fac && G.FAC_NAMES ? G.FAC_NAMES[S.fac] : "";
    const danger = (n) => "危険 " + "◆".repeat(Math.max(0, Math.min(5, n || 0))) + "◇".repeat(Math.max(0, 5 - Math.min(5, n || 0)));
    const T = S.travel && D.LOCS ? D.LOCS[S.travel] : null;
    if (kind === "combat") {
      const n = (S.combat.foes || []).filter((f) => f.hp > 0).length;
      return { kind, tag: "戦闘", name: T ? `${T.name}への道中` : L.name || "", marks: [`敵 ${n}`] };
    }
    if (kind === "story") {
      if (T) {
        const w = S.w6 || {};
        return { kind, tag: w.sea ? "船旅" : "旅の途中", name: `${T.name}へ`, marks: [w.days ? (G.u14.days ? G.u14.days(w.days) : w.days + "日") + "の道のり" : ""].filter(Boolean) };
      }
      const e = S.mode === "event" && S.event && D.EVENTS ? D.EVENTS.find((x) => x.id === S.event) : null;
      const talk = !e && S.tk && S.tk.cur;
      return { kind, tag: talk ? "会話" : "出来事", name: L.name ? L.name + (fac ? `・${fac}` : "") : "", marks: [] };
    }
    if (kind === "town") return { kind, tag: fac || "町", name: L.name || "", marks: [L.region || ""].filter(Boolean) };
    if (kind === "dungeon") {
      const deep = S.depth > 0 ? `地下${S.depth}階${L.floors ? " / " + L.floors : ""}` : "入口";
      return { kind, tag: "迷宮", name: L.name || "", marks: [deep, danger(L.danger)] };
    }
    return { kind, tag: "荒野", name: L.name || "", marks: [danger(L.danger)] };
  };
  // 町に着いたばかりか（見出しを出すか）。arr は S.u14arr
  U14.arrived = (S) => {
    const a = S && S.u14arr;
    // 着いた手番（G.act の終わりで手番が一つ進むので、描くときは一つ先）
    return !!(a && a.town && a.loc === S.loc && S.turn - a.turn <= 1 && S.turn >= a.turn && !S.combat && !S.over && S.mode !== "event");
  };
  // 見出しの下の一行
  U14.cardLine = (a) => {
    if (!a) return "";
    const parts = [];
    if (a.sea) parts.push(`${U14.days ? U14.days(a.days || 1) : a.days + "日"}の船旅を終えて`);
    else if (a.days) parts.push(`${U14.days ? U14.days(a.days) : a.days + "日"}の道のりを越えて`);
    if (a.first) parts.push("はじめて訪れる町");
    return parts;
  };

  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.render) return;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;

  // ---------------------------------------------------------------- 部品
  // 色味の幕（背景の舞台の上・画面の部品の下）。種類ごとの層を重ねておき、不透明度だけを移す
  const tint = h("div");
  tint.id = "u14tint";
  tint.setAttribute("aria-hidden", "true");
  U14.KINDS.forEach((k) => tint.append(h("i", "u14t-" + k)));
  const backdrop = $("#backdrop");
  if (backdrop) backdrop.append(tint); else { tint.classList.add("solo"); body.prepend(tint); }
  // 看板
  const sign = h("div");
  sign.id = "u14sign";
  const sTag = h("span", "u14tag"), sName = h("b", "u14name"), sMarks = h("span", "u14marks");
  sign.append(sTag, sName, sMarks);
  const tome = $(".tome");
  if (tome) tome.prepend(sign);
  // 町の見出し
  const card = h("div");
  card.id = "u14card";
  card.hidden = true;
  card.setAttribute("role", "status");
  const cRegion = h("span", "u14region"), cName = h("b", "u14town"), cLine = h("span", "u14line");
  card.append(cRegion, cName, cLine);
  body.append(card);

  // ---------------------------------------------------------------- 看板と種類
  let lastKind = null, lastRun = null, swapT = 0;
  function paintSign(S) {
    const s = U14.signOf(S);
    sign.hidden = !s;
    if (!s) return;
    sign.dataset.kind = s.kind;
    sTag.textContent = s.tag;
    sName.textContent = s.name;
    sMarks.textContent = "";
    s.marks.forEach((m) => sMarks.append(h("span", "", m)));
  }
  function setKind(S) {
    const kind = U14.kindOf(S);
    const play = $("#play");
    const on = !!(kind && play && !play.hidden);
    if (!on) { delete body.dataset.u14; body.classList.remove("u14arrived"); return; }
    const was = lastKind;
    body.dataset.u14 = kind;
    // 同じ冒険の中で種類が変わったときだけ、切り替えの演出
    if (was && was !== kind && lastRun === S.id && !calm()) {
      body.classList.remove("u14swap");
      body.dataset.u14from = was;
      clearTimeout(swapT);
      requestAnimationFrame(() => {
        body.classList.add("u14swap");
        swapT = setTimeout(() => { body.classList.remove("u14swap"); delete body.dataset.u14from; }, 900);
      });
    }
    lastKind = kind;
  }

  // ---------------------------------------------------------------- 町の見出し
  let cardT = 0, cardKey = "";
  function hideCard() {
    if (card.hidden) return;
    clearTimeout(cardT);
    card.classList.remove("on");
    card.classList.add("out");
    setTimeout(() => { card.hidden = true; card.classList.remove("out"); }, calm() ? 0 : 520);
    toArrival();
  }
  U14.hideCard = hideCard;
  function showCard(S) {
    const a = S.u14arr;
    const L = ((G.data || {}).LOCS || {})[S.loc] || {};
    cRegion.textContent = L.region || "";
    cName.textContent = L.name || "";
    cName.style.setProperty("--n", String(Math.max(4, [...(L.name || "")].length)));
    cLine.textContent = "";
    U14.cardLine(a).forEach((t) => cLine.append(h("span", "", t)));
    cLine.hidden = !cLine.children.length;
    card.hidden = false;
    card.classList.remove("out");
    if (calm()) card.classList.add("on");
    else requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("on")));
    clearTimeout(cardT);
    cardT = setTimeout(hideCard, calm() ? 2200 : 2800);
  }
  card.addEventListener("click", hideCard);
  // 見出しが出ている間のキーは、見出しを消すだけ（Enter で選択肢を押してしまわない）
  document.addEventListener("keydown", (ev) => {
    if (card.hidden || ev.isComposing) return;
    ev.preventDefault();
    ev.stopPropagation();
    hideCard();
  }, true);
  // 着いたときの語りの頭（場所の見出し）が見えるように送る
  function toArrival() {
    const log = $("#log");
    const t = log && log.querySelector(".u14place.u14now");
    if (!t) return;
    requestAnimationFrame(() => {
      if (log.scrollHeight > log.clientHeight + 4) log.scrollTop = Math.max(0, t.offsetTop - log.offsetTop - 6);
      // スマホ：文章の窓が画面の上に隠れていれば、窓の頭まで戻す
      const tm = $(".tome");
      if (tm && !body.classList.contains("v9pc")) {
        // 上に貼り付く帯（名前・HP）の下に、看板が見えるところまで
        const m = $("#mbar");
        const under = (m ? m.getBoundingClientRect().bottom : 0) + 26;
        const r = tm.getBoundingClientRect();
        if (r.top < under || r.top > window.innerHeight * 0.6) window.scrollBy({ top: r.top - under, behavior: calm() ? "auto" : "smooth" });
      }
    });
  }

  // ---------------------------------------------------------------- ログ：区切りと、前の場面を淡く
  function markLog(S) {
    const log = $("#log");
    if (!log) return;
    const kids = Array.from(log.children);
    const shown = S.log.slice(-kids.length);
    const same = shown.length === kids.length;
    let lastTitle = -1;
    kids.forEach((el, i) => { if (el.classList.contains("l-title")) lastTitle = i; });
    // 今の場面の頭：最後の見出し。見出しが無ければ全部が今の場面
    let lead = false;
    kids.forEach((el, i) => {
      el.classList.toggle("u14past", lastTitle > 0 && i < lastTitle);
      const e = same ? shown[i] : null;
      const place = !!(e && e.k === "title" && e.u14);
      el.classList.toggle("u14place", place);
      el.classList.toggle("u14now", place && i === lastTitle);
      if (place && el.dataset.date !== e.u14) el.dataset.date = e.u14;
      // 着いたときの語り（今の場所の見出しから、あなたの次の行動まで）は本文として大きめに
      if (place && i === lastTitle) lead = true;
      else if (el.classList.contains("l-you") || el.classList.contains("l-title")) lead = false;
      el.classList.toggle("u14lead", lead && i > lastTitle && el.classList.contains("l-nar"));
    });
  }

  // ---------------------------------------------------------------- 描くたびに
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      const S = G.S;
      if (!S) return r;
      const sameRun = lastRun === S.id;
      setKind(S);
      body.classList.toggle("u14arrived", U14.arrived(S));
      paintSign(S);
      markLog(S);
      const key = S.u14arr ? [S.id, S.u14arr.loc, S.u14arr.turn, S.u14arr.day].join("|") : "";
      if (U14.arrived(S) && key !== cardKey) {
        const fresh = sameRun && cardKey !== "";
        cardKey = key;
        if (fresh) showCard(S); else toArrival();
      } else if (!cardKey) cardKey = key || "-";
      if (!U14.arrived(S) && !card.hidden) hideCard();
      lastRun = S.id;
    } catch (e) { /* 書き足しに失敗しても画面は止めない */ }
    return r;
  };
  // 冒険の画面を閉じたら（タイトルへ）、種類の印を外す
  const play = $("#play");
  if (play) new MutationObserver(() => { if (play.hidden) { delete body.dataset.u14; lastKind = null; if (!card.hidden) { card.hidden = true; clearTimeout(cardT); } } }).observe(play, { attributes: true, attributeFilter: ["hidden"] });
})(globalThis.G = globalThis.G || {});
