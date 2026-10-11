// U27：行動ごとの「得たもの・失ったもの」の枠（記録の k: "gain"。中身はエンジンの engine/zzzzzzzzzzzzzzz_u27_gains.js）
//   本文の下に、はっきりした枠でまとめる。得たものは目立つ色（緑）・失ったものは赤、印（金・品・名…）と ▲▼ で増減がひと目で分かる
//   ui.js の記録の描き方の入口（ui.logEl）に足すだけ。ログの窓・本文のコピーは記録の文（「得たもの：…」）をそのまま使う
// 見た目は ui/zu27_gains.css。レーン U（U27）
(function (G) {
  if (typeof document === "undefined" || !G.ui) return;
  const ui = G.ui;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  // 種類ごとの印（字一つ）
  const MARK = { gold: "金", item: "品", fame: "名", title: "位", rep: "評", inf: "悪", hp: "体", mp: "魔", sanity: "心", stat: "能", learn: "覚", reroll: "賽", comp: "仲" };
  const prev = ui.logEl;
  ui.logEl = (e) => {
    if (prev) { const el = prev(e); if (el) return el; }
    if (!e || e.k !== "gain" || !Array.isArray(e.gains) || !e.gains.length) return null;
    const box = h("div", "l-gain");
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", e.text || "得たもの");
    const up = e.gains.some((g) => g.tone === "good"), down = e.gains.some((g) => g.tone === "bad");
    box.append(h("span", "u27head", up && down ? "得たもの・失ったもの" : down ? "失ったもの" : "得たもの"));
    const list = h("span", "u27list");
    e.gains.forEach((g) => {
      const chip = h("span", "u27chip u27-" + (g.tone || "info") + " u27k-" + (g.kind || "x"));
      chip.append(h("i", "u27mark", MARK[g.kind] || "◆"));
      const arrow = g.tone === "good" ? "▲" : g.tone === "bad" ? "▼" : "";
      if (arrow) chip.append(h("span", "u27arrow", arrow));
      chip.append(h("span", "u27text", g.text));
      list.append(chip);
    });
    box.append(list);
    return box;
  };
})(globalThis.G = globalThis.G || {});
