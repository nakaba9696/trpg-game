// U30（R8 低 18）：行動のあとの「所持金 +3G」「HP -1」のような仕組みの一行は、その行動に「得たもの」の枠（U27）があれば本文に出さない（枠と二重にしない）
//   消すのは、枠と同じ種類（金・HP・MP・名声…）の、数だけの一行（G.note の「所持金 +3G」「HP -1」「名声 +2」など）。「船賃 -5G」のように訳のある行は残す
//   行動の区切りは、選んだ行（▶）・場所の見出し・前の枠。ログの窓（全部の記録）は今のまま。画面だけ（記録は変えない）。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.ui || !G.ui.render) return;
  const ui = G.ui;
  const U = (G.u30 = G.u30 || {});
  // 一行 → 枠の種類（u27 の kind）。当てはまらなければ null
  U.dupKind = (text) => {
    const t = String(text || "").trim();
    const m = /^(所持金|HP|MP|名声|正気)\s*[+\-−＋－]\s*\d+G?$/.exec(t);
    if (!m) return null;
    return { 所持金: "gold", HP: "hp", MP: "mp", 名声: "fame", 正気: "sanity" }[m[1]];
  };
  const mark = () => {
    const log = document.getElementById("log");
    if (!log) return;
    log.querySelectorAll(":scope > .l-gain").forEach((box) => {
      const kinds = new Set(Array.from(box.querySelectorAll(".u27chip")).map((c) => (Array.from(c.classList).find((x) => x.startsWith("u27k-")) || "").slice(5)));
      for (let el = box.previousElementSibling; el; el = el.previousElementSibling) {
        if (el.classList.contains("l-you") || el.classList.contains("l-title") || el.classList.contains("l-gain")) break;
        if (!el.classList.contains("l-sys")) continue;
        const k = U.dupKind(el.textContent);
        if (k && kinds.has(k)) el.classList.add("u30dup");
      }
    });
  };
  U.markDup = mark;
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { mark(); } catch (e) { /* 消せなくても、画面は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
