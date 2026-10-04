// U11：所持金をいつでもひと目で分かるようにする。レーン U（画面）
// - 上の帯（スマホ・PC とも。PC では左上の札）の所持金を、金貨の印・「所持金」の札・桁区切り（1,234 G）で HP・MP と同じくらいの大きさに
// - 金が増えた・減ったとき、帯に「+120 G」「−50 G」を一瞬出し、数字を少し光らせる（prefers-reduced-motion では動かさない。u11_gold.css）
// - 店・宿・酒場・訓練場・依頼など金の出入りがある画面では、行動の上にも今の所持金を出す
// - ステータスの表の「所持金」も桁区切りに
// 決まり（G.u11.fmt・delta・needsPurse）は DOM に触らない。テストは tests/checks/u11_gold.mjs
(function (G) {
  const u11 = (G.u11 = {});
  const MINUS = "−"; // U+2212（ハイフンより読みやすい）

  // 桁区切り。1234 → "1,234"。数でなければ 0
  u11.fmt = (n) => {
    n = Math.floor(Number(n) || 0);
    const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (n < 0 ? MINUS : "") + s;
  };
  u11.gold = (n) => `${u11.fmt(n)} G`;

  // 増減の表示。変わらない・前が分からないときは null
  u11.delta = (prev, now) => {
    if (prev == null || now == null) return null;
    const d = Math.floor(now) - Math.floor(prev);
    if (!d) return null;
    return { d, up: d > 0, text: `${d > 0 ? "+" : MINUS}${u11.fmt(Math.abs(d))} G` };
  };

  // 金を払う施設（G.FAC_NAMES の鍵）
  u11.MONEY_FAC = ["inn", "tavern", "shop", "guild", "church", "train", "alley", "castle"];
  const PRICE = /\d+\s*G(?![a-zA-Z])/;
  // 行動の上に所持金を出すか。金を払う施設にいるか、値段の付いた行動がある（戦闘中は出さない）
  u11.needsPurse = (S, groups) => {
    if (!S || S.over || S.combat) return false;
    if (S.mode === "fac" && u11.MONEY_FAC.includes(S.fac)) return true;
    return (groups || []).some((g) => (g.list || []).some((a) => PRICE.test(`${a.label || ""} ${a.sub || ""}`)));
  };
  // 値段の付いた行動のうち、今の所持金で払えないものの数（行動の上の札に添える）
  u11.shortCount = (S, groups) => {
    let n = 0;
    (groups || []).forEach((g) => (g.list || []).forEach((a) => {
      if (!a.disabled) return;
      const m = `${a.label || ""} ${a.sub || ""}`.match(/(\d+)\s*G(?![a-zA-Z])/g);
      if (m && m.some((x) => S.gold < parseInt(x, 10))) n++;
    }));
    return n;
  };

  // ---------------------------------------------------------------- 画面（DOM があるときだけ）
  const ui = G.ui;
  if (!ui || !ui.render || typeof document === "undefined") return;
  const $ = (q) => document.querySelector(q);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const still = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  let prev = null; // { run, gold }
  let flashT = 0;
  let showing = null; // 出している最中の増減（その間に描き直しても消さない）

  function paintBar(S, dl) {
    const box = $("#mGold");
    if (!box) return;
    box.className = "u11gold";
    box.textContent = "";
    box.setAttribute("aria-label", `所持金 ${u11.gold(S.gold)}`);
    box.title = "所持金";
    box.append(el("i", "u11coin"), el("span", "u11lab", "所持金"), el("b", "u11n num", u11.fmt(S.gold)), el("span", "u11u", "G"));
    const fresh = !!dl;
    dl = dl || showing;
    if (!dl) return;
    box.classList.add(dl.up ? "u11up" : "u11down");
    const dEl = el("span", "u11d " + (dl.up ? "up" : "down") + (fresh ? "" : " kept"), dl.text);
    box.append(dEl);
    // 札の右に出す。右に場所が無ければ（スマホで札が行の終わりにあるとき）札の上に（u11_gold.css の .above）。
    // 測るのと光らせ直すのは次のコマの頭で（描き直しの途中で配置の計算を走らせない。描かれる前なので見た目は同じ。T）
    const flash = fresh && !still();
    if (flash) box.classList.remove("u11flash");
    requestAnimationFrame(() => {
      if (!dEl.isConnected) return;
      try {
        const bar = box.closest("#mbar") || document.body;
        if (dEl.getBoundingClientRect().right > Math.min(bar.getBoundingClientRect().right, document.documentElement.clientWidth) - 4) dEl.classList.add("above");
      } catch (e) { /* 測れなくても出す */ }
      if (flash) { void box.offsetWidth; box.classList.add("u11flash"); }
    });
    if (!fresh) return;
    showing = dl;
    clearTimeout(flashT);
    flashT = setTimeout(() => {
      showing = null;
      box.classList.remove("u11flash", "u11up", "u11down");
      const d = box.querySelector(".u11d");
      if (d) d.remove();
    }, still() ? 2200 : 1700);
  }

  function paintPurse(S) {
    const panel = $("#panel");
    if (!panel) return;
    const groups = S.over ? [] : G.actions();
    if (!u11.needsPurse(S, groups)) return;
    const row = el("div", "u11purse");
    row.append(el("i", "u11coin"), el("span", "u11lab", "所持金"), el("b", "u11n num", u11.fmt(S.gold)), el("span", "u11u", "G"));
    const short = u11.shortCount(S, groups);
    if (short) row.append(el("span", "u11short", `足りない物 ${short}`));
    panel.prepend(row);
  }

  function paintSheet(S) {
    document.querySelectorAll("#sheet dl.kv dt").forEach((dt) => {
      if (dt.textContent !== "所持金") return;
      const dd = dt.nextElementSibling;
      if (dd) { dd.textContent = u11.gold(S.gold); dd.classList.add("u11sheet", "num"); }
    });
  }

  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try {
      const S = G.S;
      if (S) {
        const same = prev && prev.run === S.id;
        const dl = same ? u11.delta(prev.gold, S.gold) : null;
        prev = { run: S.id, gold: S.gold };
        paintBar(S, dl);
        paintPurse(S);
        paintSheet(S);
      }
    } catch (e) { /* 所持金の飾りに失敗しても、画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
