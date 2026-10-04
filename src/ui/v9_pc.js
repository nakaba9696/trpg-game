// V9：PC 向けの画面（1280×800・1920×1080 を主に）。横長の画面を、背景の絵を全面に敷いた一枚の舞台として使う。
//   ・上：場所と日付（見出しの帯の中）。左上：控えめなステータス（名前・HP・MP・所持金。押すとステータスの窓）
//   ・左：立ち絵。話している人が前に出て明るく、ほかの仲間は後ろに少し暗く並ぶ（最大 3 人）。出入りはフェードと少しのスライド
//   ・右〜中央：文章の窓（1 行 35〜40 字）。窓には今の手番の文章だけを出し、前の文章は「記録」の窓で読む。その下に選択肢
//   ・戦闘：魔物の一枚絵を中央〜右に大きく、味方を左に小さく、文章と行動は下の帯に
//   ・操作：選択肢は 1〜9 のキー、Enter で次へ（文章の続き → 一つしかない選択肢）、Esc で開いている窓を閉じる。手引きの用語にマウスを乗せると短い説明
//   ・演出：場面が変わると暗転してフェード。出来事の大事な場面（大成功・大失敗・トロフィー・人との出会い）で少し光る・揺れる
// 幅が足りない画面（スマホ・小さな窓）では何もしない（今の縦に積む画面のまま）。凝った見せ方は PC だけ。
// 立ち絵は V5（G.stand.whoOf・sig・big・nameOf）で人を決め、G.drawPortrait（V4 の画像・V8 の表情の差し替えが包む入口）で描く。
// 魔物は V6 の G.paintMonster で描く（並べ方は scene.js・fx.js と同じ）。見た目は ui/v9_pc.css。レーン U（画面）が管理
(function (G) {
  const v9 = (G.v9 = {});
  v9.HEAD = 52; // 見出しの帯の高さ（v9_pc.css の --v9-head と合わせる）
  v9.FADE = 480; // 立ち絵の出入り（ミリ秒。v9_pc.css の .v9fig と合わせる）
  v9.PAD = 28; // 文章の窓の左右の内側の余白（v9_pc.css の .tome と合わせる）

  // ---------------------------------------------------------------- 決まり（DOM なし。テストからも呼べる）
  // PC の配置にするか。幅 1000 以上・高さ 560 以上
  v9.isPC = (vw, vh) => (vw || 0) >= 1000 && (vh || 0) >= 560;

  // 画面の大きさから、各部の場所を決める。数字はすべて px
  //   tome：文章の窓、cast：立ち絵の場所、stage：戦闘で魔物を描く場所（戦闘のときだけ）、fs：文章の字の大きさ、chars：1 行の字数
  v9.layout = (vw, vh, combat) => {
    vw = Math.max(320, Math.round(vw || 0));
    vh = Math.max(320, Math.round(vh || 0));
    const head = v9.HEAD;
    const m = Math.round(Math.max(16, Math.min(40, vw * 0.022))); // 画面の縁からの余白
    const fs = Math.max(16, Math.min(19, Math.round(Math.min(vw / 106, vh / 58))));
    const width = (c) => c * fs + v9.PAD * 2 + 10; // 10 はスクロールの帯
    let chars = 38;
    while (chars > 35 && width(chars) > vw * 0.56) chars--;
    const tw = width(chars);
    // 文章の窓は右寄り。広い画面では少し中央へ寄せる
    const right = Math.round(Math.max(m, Math.min(160, (vw - tw) * 0.1)));
    const out = { vw, vh, head, m, fs, chars, combat: !!combat };
    out.tome = { x: vw - right - tw, y: head + 10, w: tw, h: vh - head - 10 - m };
    out.cast = { x: 0, y: head, w: Math.max(0, out.tome.x - 12), h: vh - head };
    out.stage = null;
    if (combat) {
      const ph = Math.round(Math.max(260, Math.min(420, vh * 0.4)));
      out.tome = { x: m, y: vh - m - ph, w: vw - m * 2, h: ph };
      const sx = Math.round(vw * 0.25);
      // 魔物の足元は下の帯の後ろへ少し沈める（その分、大きく描ける）
      out.stage = { x: sx, y: head, w: vw - m - sx, h: out.tome.y + 48 - head };
      out.cast = { x: 0, y: head + 64, w: sx, h: out.tome.y - head - 64 };
    }
    return out;
  };

  // 立ち絵に並べる人：話している人（戦闘では出さない）と仲間。最大 3 人。同じ人は一度だけ
  // 主人公は出さない（A10。持ち主の決定）。生成画像の無い人（G.portraitArt が null）も並べない（canvas の絵はやめた）
  v9.MAX_CAST = 3;
  v9.castOf = (S) => {
    if (!S) return [];
    const out = [], seen = new Set();
    const st = G.stand || {};
    const add = (who, role, tag) => {
      if (!who || out.length >= v9.MAX_CAST || who.kind === "hero") return;
      if (G.portraitArt && !G.portraitArt(who)) return;
      const key = (st.sig && st.sig(who)) || JSON.stringify([who.seed || "", who.kind || "", who.name || ""]);
      if (seen.has(key)) return;
      seen.add(key);
      tag = tag || (G.whoTag ? G.whoTag(who, S) : null); // C3：名前＋役職の札
      out.push({ who, role, key, big: !!(st.big && st.big(who)), name: tag ? tag.label : st.nameOf ? st.nameOf(who) : who.name || "", tag });
    };
    if (!S.combat && st.whoOf) add(st.whoOf(S), "speaker");
    (S.companions || []).forEach((c) => add(G.companionWho ? G.companionWho(c) : null, "ally", G.compTag ? G.compTag(c) : null));
    return out;
  };

  // 立ち絵の置き場所。x は真ん中、h は高さ（幅は 4:5）、front は前に出ている人、dim は暗さ（0〜1）
  v9.placeCast = (L, list) => {
    const C = L.cast, n = list.length;
    if (!n || C.w <= 0) return [];
    const maxH = (k) => Math.min(C.h * k, (C.w * 0.95) / 0.8);
    if (L.combat) {
      // 戦闘：仲間を並べる（前の一人を大きく、ほかは後ろに小さく）
      const H = Math.min(C.h * 0.92, (C.w * 0.82) / 0.8);
      const xs = n === 1 ? [0.52] : n === 2 ? [0.6, 0.3] : [0.56, 0.24, 0.84];
      return list.map((c, i) => ({ x: Math.round(C.w * xs[i]), h: Math.round(i ? H * 0.8 : H), front: i === 0, dim: i ? 0.35 : 0, z: i ? 1 : 3 }));
    }
    const speaker = list[0] && list[0].role === "speaker";
    if (speaker) {
      const H = maxH(0.8);
      const xs = [0.56, 0.22, 0.86];
      return list.map((c, i) => ({ x: Math.round(C.w * xs[i]), h: Math.round(i ? H * 0.8 : H), front: i === 0, dim: i ? 0.45 : 0, z: i ? 1 : 3 }));
    }
    // 話している人がいない：仲間だけが少し暗く並ぶ
    const H = maxH(0.8);
    const xs = n === 1 ? [0.5] : n === 2 ? [0.34, 0.7] : [0.5, 0.2, 0.8];
    return list.map((c, i) => ({ x: Math.round(C.w * xs[i]), h: Math.round(n === 3 && i ? H * 0.9 : H), front: false, dim: 0.22, z: n === 3 && !i ? 2 : 1 }));
  };

  // 戦闘の魔物の並べ方（scene.js・scene_v2.js・fx.js と同じ）
  v9.foeSpot = (i, n, boss, w, h) => ({ x: w * (n === 1 ? 0.5 : 0.22 + (0.56 * i) / Math.max(1, n - 1)), base: h * 0.97, s: h * (boss ? 0.78 : 0.58) * (n > 2 ? 0.85 : 1) });

  // 選択肢のキー：1〜9 → 0〜8。それ以外は null
  v9.keyIndex = (key) => (/^[1-9]$/.test(String(key)) ? Number(key) - 1 : null);

  // 手引きの用語：[[語, 短い説明]]。2 字以上、長い語から（「レオネスト王国」を「レオネスト」より先に当てる）
  v9.tipText = (v) => {
    const s = String(v || "").replace(/\s+/g, "");
    const m = s.match(/^.*?[。！？]/);
    const t = m ? m[0] : s;
    return t.length > 64 ? t.slice(0, 62) + "…" : t;
  };
  v9.terms = (sections) => {
    const map = new Map();
    (sections || []).forEach(([, rows]) => (rows || []).forEach((r) => {
      if (!r || typeof r[0] !== "string" || r[0].length < 2 || !r[1] || map.has(r[0])) return;
      map.set(r[0], v9.tipText(r[1]));
    }));
    return [...map.entries()].sort((a, b) => b[0].length - a[0].length);
  };
  // 文を、用語とそれ以外に切り分ける。同じ語は一つの文で一度だけ
  v9.splitTerms = (text, terms) => {
    text = String(text || "");
    if (!terms || !terms.length || !text) return [text];
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(terms.map(([k]) => esc(k)).join("|"), "g");
    const tip = new Map(terms);
    const used = new Set(), out = [];
    let at = 0, m;
    while ((m = re.exec(text))) {
      if (used.has(m[0])) continue;
      used.add(m[0]);
      if (m.index > at) out.push(text.slice(at, m.index));
      out.push({ term: m[0], tip: tip.get(m[0]) });
      at = m.index + m[0].length;
    }
    if (at < text.length) out.push(text.slice(at));
    return out;
  };

  // 場面の印（変わったら暗転する）：場所・施設・迷宮の階・戦闘
  v9.sceneSig = (S) => (S ? [S.loc, S.mode === "fac" ? S.fac || "" : "", S.depth || 0, S.combat ? "combat" : ""].join("|") : "");

  // 出来事の大事な場面の演出（戦闘の中は fx.js に任せる）。fresh は今回増えた記録、wasEvent は前の出来事の id
  //   glow：大成功・トロフィー（少し光る） shake：大失敗（少し揺れる） meet：人との出会い（ほのかに明るむ） dark：死（暗く沈む）
  v9.moment = (fresh, S, wasEvent) => {
    if (!S) return null;
    if (S.over === "dead" && (fresh || []).length) return "dark";
    if (S.combat) return null;
    let m = null;
    for (const e of fresh || []) {
      if (!e) continue;
      if (e.k === "dice" && e.fumble) m = "shake";
      else if ((e.k === "dice" && e.crit) || e.k === "trophy") { if (m !== "shake") m = "glow"; }
    }
    if (!m && S.mode === "event" && S.event && S.event !== wasEvent && G.stand && G.stand.whoOf && G.stand.whoOf(S)) m = "meet";
    return m;
  };

  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui;
  if (!ui || !ui.render) return;

  // ---------------------------------------------------------------- 小道具
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 画面の幅（読むと配置の計算が走るので、同じコマのあいだは覚えておく。大きさが変わればすぐ読み直す。T）
  let vwMemo = 0;
  const vw = () => {
    if (vwMemo) return vwMemo;
    vwMemo = document.documentElement.clientWidth || window.innerWidth;
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => { vwMemo = 0; }); else vwMemo = 0;
    return vwMemo;
  };
  window.addEventListener("resize", () => { vwMemo = 0; }, true);
  const vh = () => window.innerHeight;
  const playing = () => { const p = $("#play"); return !!(p && !p.hidden && G.S); };
  const on = () => v9.isPC(vw(), vh()) && playing();
  v9.on = on;

  // ---------------------------------------------------------------- 部品を足す
  const body = document.body;
  const play = $("#play");
  // 見出しの帯の中の場所と日付
  const place = h("div", "v9place");
  place.id = "v9place";
  const placeName = h("b"), placeDate = h("span", "num");
  place.append(placeName, placeDate);
  const top = $(".top");
  if (top) { const logo = top.querySelector(".logo"); if (logo) logo.after(place); else top.prepend(place); }
  // 立ち絵の層と、戦闘の魔物の層、暗転の幕
  const cast = h("div");
  cast.id = "v9cast";
  cast.setAttribute("aria-hidden", "true");
  if (play) play.prepend(cast);
  const veil = h("div");
  veil.id = "v9veil";
  veil.setAttribute("aria-hidden", "true");
  body.append(veil);
  const tipEl = h("div");
  tipEl.id = "v9tip";
  tipEl.setAttribute("role", "tooltip");
  tipEl.hidden = true;
  body.append(tipEl);
  // ログの窓（画面の名前は「ログ」。「記録」だとセーブと紛らわしい）
  const dlgLog = h("dialog");
  dlgLog.id = "dlgLog";
  const dh = h("div", "dhead");
  const closeLog = h("button", "btn", "閉じる");
  closeLog.type = "button";
  closeLog.onclick = () => dlgLog.close();
  dh.append(h("h2", "", "ログ"), closeLog);
  const logAll = h("div", "dbody v9logAll");
  dlgLog.append(dh, logAll);
  dlgLog.addEventListener("click", (ev) => { if (ev.target === dlgLog) dlgLog.close(); });
  body.append(dlgLog);
  const openLog = h("button", "btn", "ログ");
  openLog.id = "openLog";
  openLog.type = "button";
  openLog.title = "これまでの文章を読む";
  openLog.hidden = true;
  const tools = $(".top .tools");
  if (tools) { const w = $("#openTrophy"); if (w) w.before(openLog); else tools.append(openLog); }
  openLog.onclick = () => v9.openLog();
  v9.openLog = () => {
    logAll.textContent = "";
    const src = $("#log");
    if (src) Array.from(src.children).forEach((el) => {
      const c = el.cloneNode(true);
      c.classList.remove("v9old", "new");
      c.style.animationDelay = "";
      c.querySelectorAll("button").forEach((b) => b.remove());
      logAll.append(c);
    });
    if (!logAll.children.length) logAll.append(h("p", "fine", "まだ何も記されていない。"));
    dlgLog.showModal();
    logAll.scrollTop = logAll.scrollHeight;
  };

  // ---------------------------------------------------------------- 配置
  let L = null;
  function applyLayout() {
    const pc = on();
    const combat = pc && !!(G.S && G.S.combat);
    body.classList.toggle("v9pc", pc);
    body.classList.toggle("v9combat", combat);
    openLog.hidden = !playing();
    if (!pc) { L = null; return null; }
    L = v9.layout(vw(), vh(), combat);
    const r = document.documentElement.style;
    const px = (k, v) => r.setProperty(k, Math.round(v) + "px");
    px("--v9-fs", L.fs); px("--v9-m", L.m);
    px("--v9-tx", L.tome.x); px("--v9-ty", L.tome.y); px("--v9-tw", L.tome.w); px("--v9-th", L.tome.h);
    px("--v9-cx", L.cast.x); px("--v9-cy", L.cast.y); px("--v9-cw", L.cast.w); px("--v9-ch", L.cast.h);
    if (L.stage) { px("--v9-sx", L.stage.x); px("--v9-sy", L.stage.y); px("--v9-sw", L.stage.w); px("--v9-sh", L.stage.h); }
    return L;
  }

  // ---------------------------------------------------------------- 立ち絵
  let figs = []; // { key, el, cv, sig }
  function figEl(c) {
    const el = h("div", "v9fig " + (c.big ? "img" : "card"));
    const cv = h("canvas", "v9face");
    cv.width = 512; cv.height = 640;
    const nm = h("span", "v9name", c.name || "");
    el.append(cv, nm);
    return { key: c.key, el, cv, nm, sig: "" };
  }
  function leave(f) {
    f.el.classList.remove("on");
    f.el.classList.add("out");
    setTimeout(() => f.el.remove(), calm() ? 0 : v9.FADE + 60);
  }
  function renderCast() {
    const S = G.S;
    const list = L ? v9.castOf(S) : [];
    const spots = L ? v9.placeCast(L, list) : [];
    const keep = [];
    list.forEach((c, i) => {
      let f = figs.find((x) => x.key === c.key);
      const fresh = !f;
      if (fresh) { f = figEl(c); cast.append(f.el); }
      const p = spots[i];
      const el = f.el;
      el.classList.toggle("front", p.front);
      el.classList.toggle("speaker", c.role === "speaker");
      el.classList.toggle("hero", c.role === "hero");
      el.style.setProperty("--x", p.x + "px");
      el.style.setProperty("--h", p.h + "px");
      el.style.setProperty("--dim", String(p.dim));
      el.style.zIndex = String(p.z);
      if (c.tag && G.c3Plate) G.c3Plate(f.nm, c.tag);
      else f.nm.textContent = c.name || "";
      // 描き直すのは、人か出来事（表情）が変わったとき。人が同じなら、出入りはせずにその場で描き直す
      const sig = JSON.stringify(c.who) + "|" + (S.mode === "event" ? S.event : S.mode) + "|" + p.h + "|" + (c.role === "speaker" && G.moodOf ? G.moodOf(S) || "" : ""); // 話している人は表情（V8）も
      if (sig !== f.sig) { f.sig = sig; if (G.drawPortrait) G.drawPortrait(f.cv, c.who); }
      if (fresh) {
        if (calm()) el.classList.add("on");
        else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
      }
      keep.push(f);
    });
    figs.filter((f) => !keep.includes(f)).forEach(leave);
    figs = keep;
  }

  // ---------------------------------------------------------------- 戦闘の魔物（背景から外して、魔物の場所に大きく描く）
  let foesNow = [];
  let foeCv = null;
  let foeInk = false; // 魔物の層に何か描いてあるか（空のままなら、測り直しも消し直しもしない。T）
  function drawFoes() {
    const scene = $(".scene");
    if (!scene) return;
    if (!foeCv || foeCv.parentNode !== scene) {
      foeCv = h("canvas");
      foeCv.id = "v9foes";
      foeCv.setAttribute("aria-hidden", "true");
      const fx = scene.querySelector("canvas.fxLayer");
      if (fx) fx.before(foeCv); else scene.append(foeCv);
      foeInk = true;
    }
    const want = body.classList.contains("v9combat") && !!G.paintMonster && foesNow.length > 0;
    if (!want && !foeInk) return;
    foeInk = want;
    const r = foeCv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
    if (foeCv.width !== w * dpr || foeCv.height !== hh * dpr) { foeCv.width = w * dpr; foeCv.height = hh * dpr; }
    const ctx = foeCv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    if (!body.classList.contains("v9combat") || !G.paintMonster) return;
    const n = foesNow.length;
    foesNow.forEach((f, i) => { const p = v9.foeSpot(i, n, !!f.boss, w, hh); G.paintMonster(ctx, p.x, p.base, p.s, f); });
  }
  const paintPrev = G.paintScene;
  if (paintPrev) G.paintScene = (canvas, opt) => {
    if (canvas && canvas.id === "scene") {
      opt = opt || {};
      applyLayout();
      if (on()) {
        foesNow = opt.foes || [];
        // 背景は画面いっぱい（V1 の full）。戦闘なら背景を寄り（focus）にして、魔物は前の層に描く
        opt = Object.assign({}, opt, { full: true }, foesNow.length ? { foes: [], focus: true } : {});
      } else foesNow = [];
      const r = paintPrev(canvas, opt);
      drawFoes();
      return r;
    }
    return paintPrev(canvas, opt);
  };
  // 魔物の絵（V6 の画像）が読み終わったら描き直す
  window.addEventListener("load", () => { if (foesNow.length) drawFoes(); });

  // ---------------------------------------------------------------- 文章の窓：今の手番の文章だけ。用語に短い説明
  let termsSig = "", terms = [];
  function markLog() {
    const log = $("#log");
    if (!log) return;
    const kids = Array.from(log.children);
    let last = -1;
    kids.forEach((el, i) => { if (el.classList.contains("l-you")) last = i; });
    kids.forEach((el, i) => el.classList.toggle("v9old", i < last));
    // 増えた文章は少しずつ浮かび上がる
    let k = 0;
    kids.forEach((el) => { if (el.classList.contains("new") && !el.classList.contains("v9old")) el.style.animationDelay = Math.min(1200, k++ * 110) + "ms"; });
    // 用語（U8 の強調 ui/u8_glossary.js があれば、そちらに任せる）
    if (G.gloss && G.gloss.mark) return;
    const D = G.data || {};
    const secs = D.WORLD ? D.WORLD.sections : [];
    const sig = JSON.stringify(secs.map(([t, rows]) => [t, rows.length]));
    if (sig !== termsSig) { termsSig = sig; terms = v9.terms(secs); }
    if (!terms.length) return;
    kids.forEach((el) => {
      if (el.classList.contains("v9old") || !el.matches("p.l-nar, p.l-sys") || el.querySelector(".v9term")) return;
      const parts = v9.splitTerms(el.textContent, terms);
      if (parts.length < 2) return;
      el.textContent = "";
      parts.forEach((p) => {
        if (typeof p === "string") { el.append(p); return; }
        const s = h("span", "v9term", p.term);
        s.dataset.tip = p.tip;
        el.append(s);
      });
    });
    log.scrollTop = log.scrollTop; // 位置はそのまま
  }
  // 用語の説明（マウスを乗せている間だけ）
  function showTip(t) {
    tipEl.textContent = "";
    tipEl.append(h("b", "", t.textContent), h("span", "", t.dataset.tip || ""));
    tipEl.hidden = false;
    const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
    const x = Math.max(8, Math.min(vw() - w - 8, r.left + r.width / 2 - w / 2));
    const y = r.top - hh - 8 < 8 ? r.bottom + 8 : r.top - hh - 8;
    tipEl.style.left = x + "px";
    tipEl.style.top = y + "px";
  }
  const hideTip = () => { tipEl.hidden = true; };
  document.addEventListener("mouseover", (ev) => { const t = ev.target.closest && ev.target.closest(".v9term"); if (t) showTip(t); });
  document.addEventListener("mouseout", (ev) => { const t = ev.target.closest && ev.target.closest(".v9term"); if (t && !t.contains(ev.relatedTarget)) hideTip(); });
  window.addEventListener("scroll", hideTip, true);

  // ---------------------------------------------------------------- 選択肢の番号
  const acts = () => Array.from(document.querySelectorAll("#panel .act"));
  function numberActs() {
    acts().forEach((b, i) => {
      if (i >= 9 || b.querySelector(".v9key")) return;
      const k = h("kbd", "v9key", String(i + 1));
      k.setAttribute("aria-hidden", "true");
      b.prepend(k);
      b.setAttribute("aria-keyshortcuts", String(i + 1));
    });
  }

  // ---------------------------------------------------------------- 演出：暗転・光・揺れ
  let lastScene = null, lastEvent = null, lastEntry = null, lastRun = null;
  function pulse(cls, ms) {
    body.classList.remove(cls);
    void body.offsetWidth;
    body.classList.add(cls);
    setTimeout(() => body.classList.remove(cls), ms);
  }
  function stageFx() {
    const S = G.S;
    if (!S) return;
    const sig = v9.sceneSig(S);
    const sameRun = lastRun === S.id;
    // 今回増えた記録（ui.js と同じく、数ではなく最後の記録で見る。記録は古い方から消えるため）
    const at = lastEntry ? S.log.lastIndexOf(lastEntry) : -1;
    const fresh = sameRun && at >= 0 ? S.log.slice(at + 1) : [];
    if (sameRun && on() && !calm()) {
      if (lastScene !== null && sig !== lastScene) pulse("v9dim", 900);
      const m = v9.moment(fresh, S, lastEvent);
      if (m) pulse("v9" + m, m === "dark" ? 2400 : 900);
    }
    lastScene = sig;
    lastEvent = S.mode === "event" ? S.event : null;
    lastEntry = S.log[S.log.length - 1] || null;
    lastRun = S.id;
  }

  // ---------------------------------------------------------------- 描くたびに
  function placeText() {
    const t = $("#sceneTitle"), d = $("#sceneDate");
    placeName.textContent = t ? t.textContent : "";
    placeDate.textContent = d ? d.textContent : "";
  }
  const base = ui.render;
  ui.render = (...a) => {
    applyLayout();
    const r = base(...a);
    applyLayout();
    placeText();
    numberActs();
    markLog();
    renderCast();
    drawFoes();
    if (foesNow.length) setTimeout(drawFoes, 600); // 魔物の画像（V6）の読み込みが間に合わなかったときのため
    stageFx();
    return r;
  };
  v9.update = () => { applyLayout(); renderCast(); drawFoes(); };

  // 画面の大きさが変わったとき・冒険の画面を出し入れしたとき
  let timer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { const was = body.classList.contains("v9pc"); v9.update(); if (G.S && playing() && was !== on()) ui.render(); }, 120);
  });
  if (play) new MutationObserver(() => { applyLayout(); if (!on()) { figs.forEach(leave); figs = []; } }).observe(play, { attributes: true, attributeFilter: ["hidden"] });

  // ---------------------------------------------------------------- キー
  const typing = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  document.addEventListener("keydown", (ev) => {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || ev.isComposing) return;
    if (ev.key === "Escape") { hideTip(); return; } // 窓（dialog）は Esc で閉じる。ステータスの窓は ui.js が閉じる
    if (!playing() || document.querySelector("dialog[open]") || body.classList.contains("sheet-open") || typing(ev.target)) return;
    const i = v9.keyIndex(ev.key);
    if (i !== null) {
      const b = acts()[i];
      if (b && !b.disabled) { ev.preventDefault(); b.click(); }
      return;
    }
    if (ev.key !== "Enter" || (ev.target && ev.target.closest && ev.target.closest("button, a, summary, [role=button]"))) return;
    // Enter：ボスの前口上を閉じる → 文章の続きを送る → 選択肢が一つならそれを選ぶ → 最初の選択肢へ
    const banner = $(".bossBanner:not(.out)");
    if (banner) { ev.preventDefault(); banner.click(); return; }
    const log = $("#log");
    if (on() && log && log.scrollTop + log.clientHeight < log.scrollHeight - 4) {
      ev.preventDefault();
      log.scrollBy({ top: log.clientHeight * 0.8, behavior: calm() ? "auto" : "smooth" });
      return;
    }
    const tip = $("#panel .tip .btn");
    if (tip) { ev.preventDefault(); tip.click(); return; }
    const live = acts().filter((b) => !b.disabled);
    if (live.length === 1) { ev.preventDefault(); live[0].click(); return; }
    if (live.length) { ev.preventDefault(); live[0].focus(); }
  });
})(globalThis.G = globalThis.G || {});
