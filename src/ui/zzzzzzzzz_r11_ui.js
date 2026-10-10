// R11（R10 のプレイレビューの画面の指摘）：ほかのファイルが描き終えたあとに直す。レーン U
// - 高 2：初回の遊び方の一行（ui.js の .tip）を、右の窓（#u21side）の外へ出して、窓の上（スマホはログの窓の上）に浮かべる。
//   右の窓には backdrop-filter があり、窓の中の position: fixed は窓が基準になるので、left・bottom が窓の位置ぶん二重に足されて画面の外に出ていた
//   （PC は右に、スマホの横長は上に）。スマホの戦闘だけは今までどおりコマンドの窓の頭に置く（u31 の CSS）。
//   立ち絵の名札（.v9name）に掛かるときは、案内が出ている間だけ名札を案内の上へずらす（body.r11tipon と --r11-lift）
// - 低 27：スマホ（と指で触る画面）の遊び方の一行から「数字キーでも選べる」を外す
// - 低 31：戦闘が始まった手番に出たトロフィーの行（迷宮の階に着いた『地下三階』など）は、戦闘の頭の文に挟まず、戦いのあとに回す。
//   戦闘の間は本文で隠し（.r11later）、結果の場面・死の場面の「トロフィー」の項目に足す（u13.afterGroups・u13.result を包む）。戦闘が終わったら本文にも戻す
// - 中 13：スマホの施設の中（S.mode が fac）は body.r11fac。CSS でログの窓を一行ほどに畳み、組の札を一段に並べて、一覧（#u21open）に高さを渡す
(function (G) {
  const ui = G.ui;
  if (typeof document === "undefined" || !ui || !ui.render) return;
  const R = (G.r11 = G.r11 || {});
  const $ = (q) => document.querySelector(q);
  const body = document.body;
  const has = (c) => body.classList.contains(c);
  const touch = () => has("u31m") || !!(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  R.noKeys = (t) => String(t || "").replace(/（数字キーでも選べる）/g, "");

  // ---------------------------------------------------------------- 高 2：遊び方の一行を窓の外へ
  function liftTip() {
    document.querySelectorAll(".r11tip").forEach((x) => x.remove());
    body.classList.remove("r11tipon");
    const tip = $("#panel > .tip");
    if (!tip) return;
    if (touch()) tip.querySelectorAll("span").forEach((x) => { const t = R.noKeys(x.textContent); if (t !== x.textContent) x.textContent = t; });
    const play = $("#play");
    if (!has("u21pc") || (has("u31m") && has("v9combat")) || !play || play.hidden) return;
    tip.classList.add("r11tip");
    play.after(tip);
    // 名札が案内に掛かるなら、案内の上へ（名札は立ち絵の中に置かれているので、どれだけ上げるかを測って渡す）
    requestAnimationFrame(() => {
      if (!tip.isConnected) return;
      const t = tip.getBoundingClientRect();
      let lift = 0;
      document.querySelectorAll(".v9fig .v9name").forEach((n) => {
        const r = n.getBoundingClientRect();
        if (!r.width || getComputedStyle(n).opacity === "0") return;
        if (r.right > t.left && r.left < t.right && r.bottom > t.top && r.top < t.bottom) lift = Math.max(lift, r.bottom - t.top + 8);
      });
      if (lift) { body.style.setProperty("--r11-lift", Math.ceil(lift) + "px"); body.classList.add("r11tipon"); }
    });
    // 「わかった」で消えたら名札を戻す
    new MutationObserver((m, o) => { if (!tip.isConnected) { body.classList.remove("r11tipon"); o.disconnect(); } }).observe(tip.parentNode, { childList: true });
  }
  R.liftTip = liftTip;

  // ---------------------------------------------------------------- 低 31：戦闘の頭のトロフィーは戦いのあとへ
  let fightNow = null;
  let later = new Set(); // 回した行の文（トロフィーは一つの冒険で一度しか取れないので、文で見分ける）
  const trophyRows = () => Array.from(document.querySelectorAll("#log > .l-trophy"));
  const nameOf = (t) => (String(t || "").match(/『[^』]*』/) || [String(t || "")])[0];
  const u13 = G.u13;
  if (u13 && u13.afterGroups && u13.result) {
    const groups0 = u13.afterGroups;
    u13.afterGroups = (entries) => {
      const out = groups0(entries);
      if (later.size) out.trophy = [...[...later].map(nameOf).filter((n) => !out.trophy.includes(n)), ...out.trophy];
      return out;
    };
    const result0 = u13.result;
    u13.result = (...a) => {
      const r = result0(...a);
      if (r && later.size && !r.after) r.after = u13.afterGroups([]);
      return r;
    };
  }
  function deferTrophies(S) {
    const C = S && S.combat;
    if (C && C !== fightNow) {
      fightNow = C;
      later = new Set();
      trophyRows().forEach((el) => { if (el.classList.contains("new")) later.add(el.textContent); });
    }
    if (C) { trophyRows().forEach((el) => { if (later.has(el.textContent)) el.classList.add("r11later"); }); return; }
    if (fightNow) { fightNow = null; later = new Set(); }
    document.querySelectorAll("#log > .r11later").forEach((el) => el.classList.remove("r11later"));
  }
  R.deferTrophies = deferTrophies;

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    const S = G.S;
    try { deferTrophies(S); } catch (e) { /* 回せなくても本文はそのまま */ }
    body.classList.toggle("r11fac", !!(S && S.mode === "fac" && !S.combat && !S.over));
    try { liftTip(); } catch (e) { /* 案内を動かせなくても描画は止めない */ }
    return r;
  };
})(globalThis.G);
