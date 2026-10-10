// R13：作成画面の能力値の段に、職業の下支えと、振りが低いときの埋め合わせを一言出す（G.r13.creLines。src/engine/zzz_r13_fairroll.js）。レーン U
(function (G) {
  if (typeof document === "undefined" || !G.setup || !G.r13) return;
  const orig = G.setup.statsExtra;
  G.setup.statsExtra = (root, draft, ...rest) => {
    const r = orig ? orig(root, draft, ...rest) : undefined;
    try {
      const lines = G.r13.creLines(draft);
      const at = root.querySelector(".u32top") || root.querySelector(".statSum") || root.querySelector(".creStats");
      if (lines.length && at) {
        const box = document.createElement("div");
        box.className = "r13roll";
        lines.forEach((l) => { const p = document.createElement("p"); p.className = "fine r13" + l.k; p.textContent = l.text; box.append(p); });
        at.after(box);
      }
    } catch (e) { /* 一言が描けなくても作成は止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
