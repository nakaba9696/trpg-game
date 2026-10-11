// I5：防具の耐性をひと目で。数は出さず、印と色で（◎ とても強い・○ 強い・△ 弱い・× とても弱い。強いは緑、弱いは赤）。
//   ・装備の画面（I2 の 7 枠の下）：身に着けた物すべてを合わせた耐性を、十の種類（斬・打・突・炎・氷・雷・風・土・光・闇）の札で
//   ・装備の枠の品ごとに、その品の耐性の札を一行
//   ・図鑑の防具の「耐性」の行を、同じ札に
// 中身は engine/zzzzzzzzzzzzzzz_i5_armor.js（G.i5.resistRow）。ui.js は書き換えず、描いたあとに足す。見た目は src/ui/zi5_armor.css。レーン I（I5）
(function (G) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const ui = G.ui;
  const I5 = G.i5;
  if (!ui || !ui.render || !I5 || !I5.resistRow) return;
  const D = G.data;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const WORD = { "◎": "とても強い", "○": "強い", "・": "ふつう", "△": "弱い", "×": "とても弱い" };
  const tone = (m) => (m < 1 ? "good" : m > 1 ? "bad" : "");
  const chip = (x, full) => {
    const name = (G.e12 && G.e12.TYPE[x.type] ? G.e12.TYPE[x.type].name : x.short);
    const c = h("span", `i5chip ${tone(x.m)}${full && x.m === 1 ? " flat" : ""}`, `${x.short}${x.mark}`);
    c.title = `${name}に${WORD[x.mark]}`;
    c.setAttribute("aria-label", c.title);
    return c;
  };

  // ---------------------------------------------------------------- 装備の画面
  function paintGear() {
    const S = G.S;
    const doll = S && $("#spane-gear .i2doll");
    if (!doll) return;
    $$(".i5res, .i5chips", doll).forEach((x) => x.remove());
    // 枠ごとの品の耐性
    $$(".i2slot", doll).forEach((cell) => {
      const k = (Array.from(cell.classList).find((c) => c.startsWith("i2s-")) || "").slice(4);
      const id = k && S[k];
      const it = id && D.ITEMS[id];
      if (!it || it.type !== "armor" || cell.classList.contains("blocked")) return;
      const row = I5.resistRow(it).filter((x) => x.m !== 1);
      if (!row.length) return;
      // 効き目の文から、札と同じことを言う言葉（「斬に強い」など）を抜く
      const eff = cell.querySelector(":scope > .i2eff");
      const words = new Set(String(G.e12.armorWords(it) || "").split("・"));
      if (eff) eff.textContent = eff.textContent.split("・").filter((s) => !words.has(s)).join("・");
      const line = h("span", "i5chips");
      row.sort((a, b) => a.m - b.m).forEach((x) => line.append(chip(x)));
      const btn = cell.querySelector(":scope > .btn");
      if (btn) cell.insertBefore(line, btn); else cell.append(line);
    });
    // 合わせた耐性（十の種類すべて）
    const box = h("div", "i5res");
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "身に着けた物を合わせた耐性");
    box.append(h("span", "i5lab", "合わせた耐性"));
    const grid = h("span", "i5grid");
    I5.resistRow().forEach((x) => grid.append(chip(x, true)));
    box.append(grid);
    const sum = $(".i2sum", doll);
    if (sum) sum.after(box); else doll.append(box);
  }
  const baseRender = ui.render;
  ui.render = (...a) => {
    const r = baseRender(...a);
    try { paintGear(); } catch {}
    return r;
  };

  // ---------------------------------------------------------------- 図鑑の「耐性」の行
  const dlg = $("#dlgCodex");
  const detail = dlg && $(".f2detail", dlg);
  if (!detail) return;
  let busy = false;
  const paintCodex = () => {
    if (busy) return;
    busy = true;
    try {
      $$("dl.f2kv dt", detail).forEach((dt) => {
        if (dt.textContent.trim() !== "耐性") return;
        const dd = dt.nextElementSibling;
        if (!dd || dd.querySelector(".i5chip")) return;
        const text = dd.textContent.trim();
        const parts = text.split(/[・／]/).filter(Boolean);
        if (!parts.length) return;
        dd.textContent = "";
        dd.classList.add("i5chips");
        parts.forEach((p) => {
          const mark = p.slice(-1);
          const short = p.slice(0, -1);
          const m = mark === "◎" ? 0.5 : mark === "○" ? 0.75 : mark === "×" ? 1.5 : mark === "△" ? 1.25 : 1;
          const t = ((D.E12 && D.E12.TYPES) || []).find((x) => x.short === short);
          dd.append(chip({ type: t ? t.id : short, short, m, mark }));
        });
        // 同じことを言葉で書いた「守り」の行は、札があれば隠す（札の title に言葉がある）
        const words = $$("dl.f2kv dt", detail).find((x) => x.textContent.trim() === "守り");
        if (words && words.nextElementSibling) { words.classList.add("i5hide"); words.nextElementSibling.classList.add("i5hide"); }
      });
    } finally { busy = false; }
  };
  new MutationObserver(paintCodex).observe(detail, { childList: true, subtree: true });
})(globalThis.G = globalThis.G || {});
