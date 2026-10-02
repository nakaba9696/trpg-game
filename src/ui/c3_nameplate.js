// C3：話す人の札を「小さく役職・大きく名前」の二段にする（札の中身は G.whoTag・G.compTag。src/engine/zzz_c3_names.js）。
// 使う所：出来事の人の小さな額（ui.js の #who .whoName）・大きな立ち絵（v5_stand.js の .standName）・PC の立ち絵（v9_pc.js の .v9name）。
// 名の無い人は役職だけを一段で。見た目は src/ui/c3_nameplate.css。レーン U（C3）
(function (G) {
  G.c3Plate = (el, tag) => {
    if (!el) return el;
    tag = tag || {};
    const name = tag.name || "", role = tag.role || "";
    const sig = name + "|" + role;
    if (el.dataset && el.dataset.c3 === sig) return el;
    if (el.dataset) el.dataset.c3 = sig;
    el.textContent = "";
    el.classList.add("c3plate");
    el.classList.toggle("c3two", !!(name && role));
    if (name && role) {
      const r = document.createElement("small");
      r.className = "c3role";
      r.textContent = role;
      el.append(r);
    }
    const n = document.createElement("span");
    n.className = "c3name";
    n.textContent = name || role;
    el.append(n);
    el.title = tag.label || name || role;
    return el;
  };
})(globalThis.G = globalThis.G || {});
