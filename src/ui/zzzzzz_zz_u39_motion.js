// U39：画面の「動き」（持ち主の依頼。時間とイージングの数は、モーションの辞典を手がかりに自分で決めた。コードは写していない）
//   1. 判定のさいころ：転がって止まる。止まり方は成否で替える（大成功は大きく弾む・成功は軽く弾む・失敗は沈む・大失敗は深く沈んで傾く）
//      戦闘の判定（F1・U13 の f1roll → f1land）は、転がるのは今まで通りで、止まる所だけここで替える
//   2. ダメージ：揺れ（fx.js の .scene.shake / .quake）に合わせて、状態の窓（#mbar。PC は左上の窓、スマホは上の帯）も小さく揺らす。
//      ダメージの数（.dmgpop）は跳ねて消える。HP が戻ったとき・戦闘の外で減ったときは、HP の欄に「+n」「-n」を跳ねさせる
//   3. 得たもの（U27 の .l-gain の札・戦いのあとの .u13result の行）：一枚ずつ時間差で出る
//   4. 旅の区切り（U37 の印の行 .l-u37）：前の文が上へ流れて消え、次の文がふわっと出る
//   5. 窓（dialog）とメニュー（システム・「…」の一覧・スマホのステータス）：少し縮んだ所から開き、閉じるときも短く
//   6. 立ち絵（#stand・PC の .v9fig）：出てくるときに軽く弾み、表情（V8 の重ねた顔）が替わるときはふわっと揺れる
// 決まり：一つの動きは 120〜400ms。動きは WAAPI（Element.animate）だけで、次の操作（押す・キー）で全部を終わりの形に飛ばす（待たせない）。
// 「動きを減らす」（設定の窓の「画面」。G.P.u39still。セーブの外。無ければ切）か prefers-reduced-motion なら動かさない。
// 減らすときは、ほかのファイルの動き（matchMedia("(prefers-reduced-motion: reduce)") を見ているもの）も止まるように、その問い合わせに「はい」と答える。
// CSS の動きは html.u39still で止める（ui/zzzzzz_zz_u39_motion.css）。
// 名前の zzzzzz_zz_ は、U37（zzzzzz_zu37_beats）より後・とどめの見せ方 F5（zzzzzzz_f5_finish。描き直しの包みのいちばん外）より前に読むため。
// ui.js ほか既存のファイルは書き換えず、ui.render・ui.setSheetOpen・HTMLDialogElement の show/showModal/close を包み、DOM の変化を見て動かす。
// 乱数は使わない（さいころの転がる間の目は、出目から作る決まった並び）。レーン U（U39）
(function (G) {
  const u39 = (G.u39 = {});

  // ---------------------------------------------------------------- DOM なしで決まること（テストからも呼ぶ）
  // 時間（ミリ秒）。どれも 120〜400
  u39.MS = {
    tumble: 260,    // さいころが転がる
    land: { crit: 360, ok: 260, ng: 280, fumble: 380 }, // 止まる
    verdict: 240,   // 成否の字が出る
    chip: 240,      // 得たものの札一枚
    chipStep: 70,   // 札と札の間
    chipMax: 360,   // 時間差の上限（札が多くても待たせない）
    beatOut: 260,   // 区切りで前の文が流れて消える
    beatIn: 340,    // 次の文がふわっと出る
    beatGap: 120,   // 流れ始めてから次が出始めるまで
    popUp: 320,     // 数が跳ねる
    popHold: 360,   // 跳ねたあと見せておく間
    popOut: 240,    // 数が消える
    shake: 280, quake: 360, // 窓が揺れる
    open: 220, close: 140,  // 窓・メニューが開く・閉じる
    fig: 320, mood: 260,    // 立ち絵が出る・表情が替わる
  };
  // イージング（cubic-bezier）
  u39.EASE = {
    out: "cubic-bezier(.22, 1, .36, 1)",       // すっと止まる（出てくるもの）
    in: "cubic-bezier(.4, 0, 1, 1)",           // 加速して去る（消えるもの）
    back: "cubic-bezier(.34, 1.56, .64, 1)",   // 少し行き過ぎて戻る（弾む）
    sink: "cubic-bezier(.55, .06, .68, .19)",  // 重く落ちる
    shake: "cubic-bezier(.36, .07, .19, .97)",
  };

  // 動きを減らすか。P は G.P（無い・古い記録でも切）、sys は端末の prefers-reduced-motion
  u39.chosen = (P) => !!(P && P.u39still);
  u39.still = (P, sys) => u39.chosen(P) || !!sys;

  // 判定の止まり方の種類（判定の記録 e か、描いた要素の verdict のクラスと字から）
  u39.kindOf = (e) => {
    if (!e) return "ok";
    if (e.fumble || e.label === "大失敗") return "fumble";
    if (e.crit || e.label === "大成功") return "crit";
    return e.ok ? "ok" : "ng";
  };
  // 止まり方：さいころ・成否の字・枠の動き（キーフレーム）。終わりの形はいつも元の形（fill なしで外れても跳ばない）
  u39.land = (kind) => {
    const ms = u39.MS.land[kind] || u39.MS.land.ok;
    if (kind === "crit") return {
      ms, ease: "linear",
      die: [{ scale: "1.55", translate: "0 -8px" }, { scale: ".88", translate: "0 1px", offset: .45 }, { scale: "1.1", translate: "0 -2px", offset: .72 }, { scale: "1", translate: "0 0" }],
      verdict: [{ opacity: 0, scale: "1.8" }, { opacity: 1, scale: ".92", offset: .6 }, { opacity: 1, scale: "1" }],
      box: [{ boxShadow: "0 0 0 0 rgba(224, 180, 70, 0)" }, { boxShadow: "0 0 0 3px rgba(224, 180, 70, .85), 0 0 18px rgba(224, 180, 70, .6)", offset: .35 }, { boxShadow: "0 0 0 0 rgba(224, 180, 70, 0)" }],
    };
    if (kind === "fumble") return {
      ms, ease: "linear",
      die: [{ translate: "0 -10px", rotate: "-20deg" }, { translate: "0 6px", rotate: "14deg", offset: .5 }, { translate: "0 4px", rotate: "9deg", offset: .8 }, { translate: "0 0", rotate: "0deg" }],
      verdict: [{ opacity: 0, translate: "0 -8px" }, { opacity: 1, translate: "0 3px", offset: .7 }, { opacity: 1, translate: "0 0" }],
      box: [{ translate: "0 0", filter: "brightness(1)" }, { translate: "0 3px", filter: "brightness(.8)", offset: .5 }, { translate: "0 0", filter: "brightness(1)" }],
    };
    if (kind === "ng") return {
      ms, ease: u39.EASE.sink,
      die: [{ translate: "0 -6px", opacity: .9 }, { translate: "0 3px", opacity: .75, offset: .7 }, { translate: "0 0", opacity: 1 }],
      verdict: [{ opacity: 0, translate: "0 -5px" }, { opacity: 1, translate: "0 0" }],
      box: null,
    };
    return {
      ms, ease: u39.EASE.back,
      die: [{ scale: "1.25", translate: "0 -6px" }, { scale: "1", translate: "0 0" }],
      verdict: [{ opacity: 0, scale: "1.3" }, { opacity: 1, scale: "1" }],
      box: null,
    };
  };
  // 転がる間に見せる目（出目から決まる並び。乱数は使わない）
  u39.faces = (roll, n) => {
    let s = ((roll | 0) * 2654435761) >>> 0;
    const out = [];
    for (let i = 0; i < (n || 5); i++) { s = (Math.imul(s ^ (s >>> 13), 1274126177) + 0x9e3779b9) >>> 0; out.push(s % 100); }
    return out;
  };
  // 得たものの札の時間差（i 枚目が出始めるまで）
  u39.delay = (i) => Math.min(Math.max(0, i | 0) * u39.MS.chipStep, u39.MS.chipMax);
  // 札 n 枚が出そろうまで
  u39.total = (n) => (n > 0 ? u39.delay(n - 1) + u39.MS.chip : 0);
  // HP の増減で跳ねさせる数（戦闘中に減ったのは fx.js が出すので出さない）。無ければ null
  u39.hpPop = (prev, S) => {
    if (!prev || !S || prev.id !== S.id || typeof S.hp !== "number" || typeof prev.hp !== "number") return null;
    const d = S.hp - prev.hp;
    if (!d) return null;
    if (d < 0 && (S.combat || prev.combat)) return null;
    return { n: d, text: (d > 0 ? "+" : "−") + Math.abs(d), tone: d > 0 ? "heal" : "hurt" };
  };

  if (typeof document === "undefined" || typeof window === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const root = document.documentElement;

  // ---------------------------------------------------------------- 動きを減らす
  const mm0 = typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : null;
  const sysStill = () => { try { return !!(mm0 && mm0("(prefers-reduced-motion: reduce)").matches); } catch { return false; } };
  const still = () => u39.still(G.P, sysStill());
  u39.isStill = still;
  const apply = () => root.classList.toggle("u39still", u39.chosen(G.P));
  // 「動きを減らす」を選んでいれば、ほかのファイルの「動きを減らす設定か」の問い合わせにも「はい」と答える
  if (mm0) {
    window.matchMedia = (q) => {
      const r = mm0(q);
      if (!u39.chosen(G.P) || !/prefers-reduced-motion\s*:\s*reduce/.test(String(q))) return r;
      return {
        matches: true, media: r.media, onchange: null,
        addEventListener: (...a) => r.addEventListener(...a), removeEventListener: (...a) => r.removeEventListener(...a),
        addListener: (f) => r.addListener && r.addListener(f), removeListener: (f) => r.removeListener && r.removeListener(f),
        dispatchEvent: (ev) => r.dispatchEvent(ev),
      };
    };
  }
  function registerSetting() {
    if (typeof ui.addSetting !== "function") return false;
    try {
      ui.addSetting({
        id: "u39still", section: "画面", label: "動きを減らす", kind: "toggle",
        get: () => u39.chosen(G.P),
        set: (v) => { if (!G.P) return; G.P.u39still = !!v; apply(); if (v) finishAll(); if (G.main && G.main.saveProfile) G.main.saveProfile(); },
        hint: "さいころ・ダメージの揺れ・窓の開け閉め・立ち絵の出入りなどの動きをやめる（端末の「視差効果を減らす」を選んでいても止まる）",
      });
    } catch {}
    return true;
  }
  if (!registerSetting()) setTimeout(registerSetting, 0);

  // ---------------------------------------------------------------- 動かす・飛ばす
  const live = new Set();
  function anim(el, kf, opts) {
    if (!el || !el.animate || still()) return null;
    let a;
    try { a = el.animate(kf, opts); } catch { return null; }
    live.add(a);
    const done = () => live.delete(a);
    a.finished.then(done, done);
    return a;
  }
  // 動いているものを全部終わりの形に（次の操作で待たせない）
  const closing = new Set(); // 閉じている途中の窓の「閉じ終える」
  let skipAt = -1;
  function finishAll() {
    skipAt = performance.now();
    Array.from(closing).forEach((f) => f());
    Array.from(live).forEach((a) => { try { a.finish(); } catch { try { a.cancel(); } catch {} } });
    live.clear();
  }
  u39.finishAll = finishAll;
  u39.running = () => live.size;
  u39.live = () => Array.from(live); // 動いているもの（撮るときに途中で止めるため。tools/shots_u39.mjs）
  // 押す・キーを押す・触れるのが先（その操作で開く窓や行の動きは、そのあとに始まる）
  ["pointerdown", "keydown"].forEach((t) => document.addEventListener(t, () => { if (live.size) finishAll(); }, true));

  const shown = (el) => !!(el && el.isConnected && el.getClientRects().length);

  // ---------------------------------------------------------------- 1. さいころ
  function verdictKind(box) {
    const v = box.querySelector(".verdict");
    if (!v) return "ok";
    return u39.kindOf({ label: v.textContent, crit: v.classList.contains("crit"), ok: v.classList.contains("ok") });
  }
  function landDice(box) {
    const kind = verdictKind(box);
    const L = u39.land(kind);
    box.querySelectorAll(".die").forEach((d, i) => anim(d, L.die, { duration: L.ms - i * 30, easing: L.ease }));
    const v = box.querySelector(".verdict");
    if (v) anim(v, L.verdict, { duration: u39.MS.verdict, easing: kind === "ng" || kind === "fumble" ? u39.EASE.out : "linear" });
    if (L.box) anim(box, L.box, { duration: L.ms, easing: u39.EASE.out });
  }
  function rollDice(box) {
    const dice = Array.from(box.querySelectorAll(".die"));
    if (!dice.length || still()) return;
    const T = u39.MS.tumble;
    const real = dice.map((d) => d.textContent);
    const roll = parseInt(real.join(""), 10) || 0;
    const seq = u39.faces(roll, 5);
    // 出目と成否は止まるまで伏せる（字は場所を取ったまま見えなくする）
    const after = Array.from(box.children).filter((c, i) => i >= 3 && !c.matches("button"));
    after.forEach((c) => anim(c, [{ opacity: 0 }, { opacity: 0 }], { duration: T, fill: "backwards" }));
    let k = 0;
    const tick = setInterval(() => {
      const f = seq[k++ % seq.length];
      dice[0].textContent = String(Math.floor(f / 10));
      if (dice[1]) dice[1].textContent = String(f % 10);
    }, 50);
    const restore = () => { clearInterval(tick); dice.forEach((d, i) => { d.textContent = real[i]; }); };
    const spins = dice.map((d, i) => anim(d, [
      { translate: "0 -12px", rotate: (i ? 240 : -220) + "deg" },
      { translate: "0 2px", rotate: (i ? -18 : 16) + "deg", offset: .72 },
      { translate: "0 0", rotate: "0deg" },
    ], { duration: T - i * 30, easing: u39.EASE.out }));
    const a = spins[0];
    if (!a) return restore();
    let landed = false;
    // 次の操作で飛ばしたときは、止まる動きも出さない
    const end = () => { if (landed) return; landed = true; restore(); if (box.isConnected && performance.now() - skipAt > 40) landDice(box); };
    a.finished.then(end, () => restore());
  }

  // ---------------------------------------------------------------- 3. 得たもの（一枚ずつ）
  function stagger(items, from) {
    items.forEach((el, i) => anim(el, [
      { opacity: 0, translate: "0 8px", scale: ".86" },
      { opacity: 1, translate: "0 -1px", scale: "1.04", offset: .7 },
      { opacity: 1, translate: "0 0", scale: "1" },
    ], { duration: u39.MS.chip, delay: (from || 0) + u39.delay(i), easing: u39.EASE.out, fill: "backwards" }));
  }

  // ---------------------------------------------------------------- 2. 数が跳ねて消える
  function bounce(el) {
    const up = anim(el, [
      { opacity: 0, translate: "0 8px", scale: ".7" },
      { opacity: 1, translate: "0 -14px", scale: "1.2", offset: .55 },
      { opacity: 1, translate: "0 -8px", scale: "1" },
    ], { duration: u39.MS.popUp, easing: u39.EASE.out, fill: "both" });
    if (!up) return null;
    anim(el, [{ opacity: 1, translate: "0 -8px" }, { opacity: 0, translate: "0 -20px" }],
      { duration: u39.MS.popOut, delay: u39.MS.popUp + u39.MS.popHold, easing: u39.EASE.in, fill: "forwards" });
    return up;
  }
  function popAt(host, text, tone) {
    if (still() || !host) return;
    const r = host.getBoundingClientRect();
    if (!r.width && !r.height) return;
    const s = document.createElement("span");
    s.className = "u39pop u39-" + tone;
    s.textContent = text;
    s.setAttribute("aria-hidden", "true");
    s.style.left = Math.round(r.right - 8) + "px";
    s.style.top = Math.round(r.top + r.height / 2 - 14) + "px";
    document.body.append(s);
    const a = bounce(s);
    const gone = () => s.remove();
    setTimeout(gone, u39.MS.popUp + u39.MS.popHold + u39.MS.popOut + 60);
    if (a) a.finished.catch(gone);
  }
  const hpHost = () => {
    const pools = Array.from(document.querySelectorAll(".pool")).filter((p) => (p.firstElementChild || {}).textContent === "HP" && shown(p));
    const m = $("#mHp");
    return pools[0] || (shown(m) ? m : shown($("#mbar")) ? $("#mbar") : null);
  };
  function shakeWindows(heavy) {
    const el = $("#mbar"); // 状態の窓（PC は左上の窓、スマホは上の帯）
    if (!shown(el)) return;
    const d = heavy ? 6 : 3;
    anim(el, [
      { translate: "0 0" }, { translate: `${-d}px 1px` }, { translate: `${d}px -1px` },
      { translate: `${-d * 0.6}px 0` }, { translate: `${d * 0.3}px 0` }, { translate: "0 0" },
    ], { duration: heavy ? u39.MS.quake : u39.MS.shake, easing: u39.EASE.shake });
  }

  // ---------------------------------------------------------------- 5. 窓とメニュー
  const OPEN_KF = [{ opacity: 0, scale: ".94", translate: "0 6px" }, { opacity: 1, scale: "1", translate: "0 0" }];
  const CLOSE_KF = [{ opacity: 1, scale: "1" }, { opacity: 0, scale: ".96" }];
  function openAnim(el) {
    anim(el, OPEN_KF, { duration: u39.MS.open, easing: u39.EASE.out });
    if (el.tagName === "DIALOG") anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: u39.MS.open, easing: u39.EASE.out, pseudoElement: "::backdrop" });
  }
  const DP = typeof HTMLDialogElement !== "undefined" ? HTMLDialogElement.prototype : null;
  if (DP && !DP.u39) {
    DP.u39 = true;
    const show0 = DP.show, modal0 = DP.showModal, close0 = DP.close;
    const settle = (dl) => { if (dl.u39done) dl.u39done(); };
    DP.showModal = function (...a) { settle(this); const was = this.open; const r = modal0.apply(this, a); if (!was && this.open) openAnim(this); return r; };
    DP.show = function (...a) { settle(this); const was = this.open; const r = show0.apply(this, a); if (!was && this.open) openAnim(this); return r; };
    DP.close = function (...a) {
      if (this.u39done) return this.u39done();
      if (!this.open || still()) return close0.apply(this, a);
      const dl = this;
      const out = anim(dl, CLOSE_KF, { duration: u39.MS.close, easing: u39.EASE.in, fill: "forwards" });
      if (!out) return close0.apply(dl, a);
      const fade = anim(dl, [{ opacity: 1 }, { opacity: 0 }], { duration: u39.MS.close, easing: u39.EASE.in, fill: "forwards", pseudoElement: "::backdrop" });
      // 閉じ終える（動きが終わったとき・次の操作・すぐ開き直すとき。何度呼んでも一度だけ）
      const done = () => {
        if (dl.u39done !== done) return;
        dl.u39done = null;
        closing.delete(done);
        if (dl.open) close0.apply(dl, a);
        [out, fade].forEach((x) => { if (x) { live.delete(x); try { x.cancel(); } catch {} } });
      };
      dl.u39done = done;
      closing.add(done);
      out.finished.then(done, done);
    };
    // Esc で閉じるときも同じ動きで（cancel を止めて close を呼ぶ）
    document.addEventListener("cancel", (ev) => {
      const dl = ev.target;
      if (!dl || dl.tagName !== "DIALOG" || still() || ev.defaultPrevented) return;
      ev.preventDefault();
      dl.close();
    }, true);
  }
  // スマホのステータス（下から開くシート）
  if (typeof ui.setSheetOpen === "function") {
    const sheet0 = ui.setSheetOpen;
    ui.setSheetOpen = (on, ...rest) => {
      const was = document.body.classList.contains("sheet-open");
      const r = sheet0(on, ...rest);
      if (on && !was && window.matchMedia("(max-width: 880px)").matches) anim($("#sheet"), OPEN_KF, { duration: u39.MS.open, easing: u39.EASE.out });
      return r;
    };
  }

  // ---------------------------------------------------------------- 6. 立ち絵
  function figIn(el) {
    anim(el, [
      { scale: ".95", translate: "0 10px" },
      { scale: "1.02", translate: "0 -3px", offset: .65 },
      { scale: "1", translate: "0 0" },
    ], { duration: u39.MS.fig, easing: u39.EASE.out });
  }
  function moodIn(el) {
    anim(el, [{ scale: "1", translate: "0 0" }, { scale: "1.015", translate: "0 -4px", offset: .4 }, { scale: "1", translate: "0 0" }],
      { duration: u39.MS.mood, easing: u39.EASE.out });
  }

  // ---------------------------------------------------------------- DOM の変化を見る
  const seen = new WeakSet();     // 動かした行・札・数
  const figSeen = new WeakSet();  // 出てきた立ち絵
  const faceSeen = new WeakSet(); // 見た顔（表情の canvas）
  const openNow = new Set();      // 開いているメニュー
  let first = true;
  let asked = false;
  function scan() {
    asked = false;
    const log = $("#log");
    if (first) {
      // 読み込んだときに見えていたものは動かさない
      first = false;
      document.querySelectorAll("#log > *, .u13result, .dmgpop, .v9fig, #stand .standFig").forEach((el) => seen.add(el));
      document.querySelectorAll(".v9fig, #stand .standFig").forEach((el) => figSeen.add(el));
      document.querySelectorAll(".v9fig canvas, #stand .standFig canvas").forEach((el) => faceSeen.add(el));
      return;
    }
    if (log) Array.from(log.children).forEach((el) => {
      if (seen.has(el)) return;
      if (el.classList.contains("check")) {
        if (el.classList.contains("f1roll")) return; // 戦闘で転がっている最中（止まったら f1land）
        if (el.classList.contains("f1land")) { seen.add(el); landDice(el); return; }
        if (!el.classList.contains("new") || !shown(el)) return;
        seen.add(el);
        rollDice(el);
        return;
      }
      if (!el.classList.contains("new") || !shown(el)) return;
      seen.add(el);
      if (el.classList.contains("l-gain")) stagger(Array.from(el.querySelectorAll(".u27chip")), 60);
    });
    // 戦いのあと（得た物・成長・仲間…の行を順に）
    document.querySelectorAll("#panel .u13result").forEach((box) => {
      if (seen.has(box) || !shown(box)) return;
      seen.add(box);
      if (box.classList.contains("fast")) return;
      const rows = Array.from(box.querySelectorAll(".u13rrows > dd"));
      stagger(rows, 80);
    });
    // ダメージの数（fx.js）
    document.querySelectorAll(".dmgpop").forEach((el) => { if (!seen.has(el)) { seen.add(el); bounce(el); } });
    // メニュー（システム・「…」）
    document.querySelectorAll(".q7sysbox.open, .q7more.open").forEach((el) => { if (!openNow.has(el)) { openNow.add(el); anim(el, OPEN_KF, { duration: u39.MS.open - 40, easing: u39.EASE.out }); } });
    openNow.forEach((el) => { if (!el.classList.contains("open")) openNow.delete(el); });
    // 立ち絵の出入りと表情
    document.querySelectorAll(".v9fig.on, #stand .standFig.on").forEach((el) => {
      const faces = Array.from(el.querySelectorAll("canvas"));
      if (!figSeen.has(el)) { figSeen.add(el); faces.forEach((c) => faceSeen.add(c)); figIn(el); return; }
      const fresh = faces.filter((c) => !faceSeen.has(c));
      if (fresh.length) { fresh.forEach((c) => faceSeen.add(c)); moodIn(el); }
    });
  }
  const ask = () => { if (!asked) { asked = true; requestAnimationFrame(scan); } };
  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      // 揺れ（fx.js が .scene に shake / quake を付け直した瞬間）
      if (r.type === "attributes" && r.target.classList && r.target.classList.contains("scene")) {
        const old = String(r.oldValue || "");
        const c = r.target.classList;
        if (c.contains("quake") && !/\bquake\b/.test(old)) shakeWindows(true);
        else if (c.contains("shake") && !/\bshake\b/.test(old)) shakeWindows(false);
      }
    }
    ask();
  });
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });

  // ---------------------------------------------------------------- 描き直しのたびに（区切り・HP）
  const HIDE = ["u19gone", "v9old", "u14later"];
  let hpPrev = null;
  const base = ui.render;
  ui.render = (...args) => {
    const log = $("#log");
    // 区切りが来たときに流すため、描き直す前に見えていた行を、記録（S.log の一件）で覚える
    // （用語が増えると行の要素が作り直されるので、要素ではなく記録で。配置は測らない）
    let before = [];
    if (log && G.S && Array.isArray(G.S.log) && !still()) {
      const kids = Array.from(log.children), off = G.S.log.length - kids.length;
      kids.forEach((el, i) => { if (!HIDE.some((c) => el.classList.contains(c)) && G.S.log[off + i]) before.push(G.S.log[off + i]); });
      before = before.slice(-14);
    }
    const r = base(...args);
    try { if (log && before.length) beat(log, before); } catch {}
    try {
      const S = G.S;
      const p = u39.hpPop(hpPrev, S);
      if (p) popAt(hpHost(), p.text, p.tone);
      hpPrev = S ? { id: S.id, hp: S.hp, combat: !!S.combat } : null;
    } catch {}
    try { apply(); } catch {}
    return r;
  };

  // ---------------------------------------------------------------- 4. 旅の区切り
  function beat(log, before) {
    const mark = log.querySelector(":scope > .l-u37.new");
    if (!mark || seen.has(mark)) return;
    const kids = Array.from(log.children), off = G.S.log.length - kids.length;
    const leaving = before.map((e) => kids[G.S.log.indexOf(e) - off]).filter((el) => el && HIDE.some((c) => el.classList.contains(c)));
    const fresh = Array.from(log.children).filter((el) => el.classList.contains("new") && !HIDE.some((c) => el.classList.contains(c)));
    if (!leaving.length) return;
    // 隠された行をいったん戻して、上へ流しながら畳む。終わったら（次の操作で飛ばしても）隠し直す
    leaving.forEach((el) => {
      const had = HIDE.filter((c) => el.classList.contains(c));
      had.forEach((c) => el.classList.remove(c));
      seen.add(el);
      const hgt = el.offsetHeight;
      const cs = getComputedStyle(el);
      const a = anim(el, [
        { opacity: 1, translate: "0 0", height: hgt + "px", marginTop: cs.marginTop, marginBottom: cs.marginBottom, overflow: "hidden" },
        { opacity: 0, translate: "0 -14px", height: "0px", marginTop: "0px", marginBottom: "0px", overflow: "hidden" },
      ], { duration: u39.MS.beatOut, easing: u39.EASE.in, fill: "forwards" });
      const back = () => { had.forEach((c) => el.classList.add(c)); if (a) { try { a.cancel(); } catch {} } };
      if (!a) return back();
      a.finished.then(back, back);
    });
    // 次の文（印の行から）がふわっと
    fresh.forEach((el, i) => anim(el, [
      { opacity: 0, translate: "0 10px", filter: "blur(2px)" },
      { opacity: 1, translate: "0 0", filter: "blur(0px)" },
    ], { duration: u39.MS.beatIn, delay: u39.MS.beatGap + Math.min(i * 40, 200), easing: u39.EASE.out, fill: "backwards" }));
    requestAnimationFrame(() => { log.scrollTop = 0; });
  }

  apply();
})(globalThis.G = globalThis.G || {});
