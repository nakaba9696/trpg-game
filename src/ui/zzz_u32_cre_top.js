// U32：作成画面の「能力値」の段で、振り直したときに合計と術の才がスクロールなしで見えるようにする。
//   術の才の要約（段の言葉＋得意な属性）を合計の行に足し、合計の行は一覧の上（振り直すボタンのすぐ下）にも置く。
//   詳しい箱（zm14_magic.js の .m14cre）は今の位置のまま。
(function (G) {
  if (typeof document === "undefined" || !G.setup || !G.m14) return;
  const D = G.data;
  const orig = G.setup.statsExtra;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  G.setup.statsExtra = (root, draft, ...rest) => {
    try {
      const box = root.querySelector(".creStats") && root.querySelector(".creStats").parentNode;
      const sum = box && box.querySelector(".statSum");
      if (sum && draft.m14) {
        const t = G.m14.ofDraft(draft);
        const w = G.m14.words(t);
        const good = t.lv ? t.good.map((k) => (D.M14_ELEMS[k] || {}).name || k) : [];
        const tal = el("div", "u32tal");
        tal.append(el("span", "", "術の才"), el("span", "m14lv m14lv" + t.lv, w.lv),
          el("span", "fine", t.lv ? "得意：" + (good.join("・") || "なし") : "術は覚えられない"));
        sum.classList.add("u32sum");
        const wrap = el("div", "u32top");
        wrap.append(sum.cloneNode(true), tal);
        box.querySelector(".creStats").before(wrap);
        sum.remove();   // 下の合計は上へ移した（二重に出さない）
      }
    } catch (e) { /* 要約が描けなくても作成は止めない */ }
    return orig ? orig(root, draft, ...rest) : undefined;
  };
})(globalThis.G = globalThis.G || {});
