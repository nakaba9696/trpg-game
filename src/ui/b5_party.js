// B5：一行の HP を見せる（エンジンは engine/zzzzzzz_b5_party.js）。レーン B＋U
// ui.js は書き換えず、G.ui.render を包んで、描いたあとに足す
// - 戦闘の画面：敵の札の下に、一行（あなた・仲間）の札（名前・HP の棒・数。戦闘不能は暗く）
// - ステータスの仲間の欄（.comps .comp）：顔の横に HP の棒と数・深手
// - スマホの帯（#mbar）：仲間の HP を一行に縮めて（名前 数/最大）。PC は U11 の名前の欄（.u11pc）に細い棒を足す（G.b5Chip。zu11_cast.js から呼ぶ）
// 見た目は ui/b5_party.css
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const short = (c) => (G.m2Short ? G.m2Short(c) : c.name);
  const max = (c) => (G.b5Max ? G.b5Max(c) : c.hp || 1);
  const bar = (v, m, cls) => { const g = h("span", "g b5g"); const i = h("i", cls || "hp"); i.style.width = Math.max(0, Math.min(100, (v / Math.max(1, m)) * 100)) + "%"; g.append(i); return g; };
  const low = (v, m) => v > 0 && v <= m / 4;

  // 戦闘：一行の札
  function partyEl(S) {
    const box = h("div", "b5party");
    box.setAttribute("aria-label", "一行の HP");
    const card = (name, v, m, sub, cls) => {
      const c = h("div", "b5mem" + (v <= 0 ? " down" : low(v, m) ? " low" : "") + (cls ? " " + cls : ""));
      c.append(h("b", "", name), bar(v, m), h("span", "num fine", v <= 0 ? "戦闘不能" : `HP ${v}/${m}${sub || ""}`));
      return c;
    };
    box.append(card("あなた", S.hp, S.maxHp, ` ・MP ${S.mp}/${S.maxMp}`, "you"));
    S.companions.forEach((c) => box.append(card(short(c), c.hp, max(c))));
    return box;
  }
  function paintCombat(S) {
    const panel = $("#panel");
    if (!panel || !S.combat || !S.companions.length) return;
    const foes = panel.querySelector(".foes");
    const el = partyEl(S);
    if (foes) { const hint = foes.nextElementSibling && foes.nextElementSibling.classList.contains("aimHint") ? foes.nextElementSibling : foes; hint.after(el); }
    else panel.prepend(el);
  }

  // ステータスの仲間の欄
  function paintSheet(S) {
    const comps = document.querySelectorAll("#sheet .comps .comp");
    comps.forEach((el, i) => {
      const c = S.companions[i];
      if (!c || el.querySelector(".b5hp")) return;
      const m = max(c);
      const row = h("span", "b5hp num" + (c.hp <= 0 ? " down" : low(c.hp, m) ? " low" : ""));
      row.append(h("span", "", "HP"), bar(c.hp, m), h("span", "n", c.hp <= 0 ? "戦闘不能" : `${c.hp} / ${m}`));
      if (c.wounds > 0) row.append(h("span", "b5w", `深手 ${c.wounds}`));
      row.title = `腕前 ${G.allyPt ? G.allyPt(c) : c.power || "?"}${G.b5 ? "・" + (G.b5.KIND[G.b5.kind(c)].name || "並び：中ほど") : ""}`;
      const t = el.querySelector("b") ? el.querySelector("b").parentNode : el;
      const b = t.querySelector("b");
      if (b && b.nextSibling) b.after(row); else t.append(row);
    });
  }

  // スマホの帯：仲間の HP を一行で
  const band = h("div", "b5band num");
  band.setAttribute("aria-label", "仲間の HP");
  const mbar = $("#mbar");
  if (mbar) { const bars = mbar.querySelector(".mbars"); if (bars) bars.after(band); else mbar.append(band); }
  function paintBand(S) {
    band.textContent = "";
    const comps = (S && !S.over && S.companions) || [];
    band.hidden = !comps.length;
    comps.forEach((c) => {
      const m = max(c);
      const it = h("span", "b5bi" + (c.hp <= 0 ? " down" : low(c.hp, m) ? " low" : ""));
      it.append(h("span", "nm", short(c)), bar(c.hp, m), h("span", "v", c.hp <= 0 ? "倒" : String(c.hp)));
      it.title = `${c.name} HP ${c.hp}/${m}`;
      band.append(it);
    });
  }

  // PC の名前の欄（U11）に細い HP の棒
  G.b5Chip = (chip, c) => {
    if (!chip || !c || typeof c.hp !== "number") return;
    const m = max(c);
    chip.classList.add("b5chip");
    if (c.hp <= 0) chip.classList.add("down"); else if (low(c.hp, m)) chip.classList.add("low");
    chip.append(bar(c.hp, m));
    chip.title = `${chip.title ? chip.title + "・" : ""}HP ${c.hp}/${m}${c.hp <= 0 ? "（戦闘不能）" : ""}`;
  };

  const render0 = ui.render;
  ui.render = (...a) => {
    const r = render0(...a);
    try {
      const S = G.S;
      if (S && G.b5Party) {
        G.b5Party(S);
        if (!S.over) { paintCombat(S); paintSheet(S); }
        paintBand(S);
      }
    } catch (e) { /* 描けなくても画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
