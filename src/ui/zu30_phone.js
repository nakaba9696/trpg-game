// U30（R8 中 15）：スマホの戦闘で、魔物の絵が本文の枠の上に頭だけ出ていたのを、枠の上の帯（.scene）に収める
//   背景の絵（#backdrop の canvas）は画面に貼り付いたままなので、帯が今どこに見えているか（上の札 #mbar の下〜本文の枠の上）を、絵の高さに対する割合で渡す（G.foeBand。scene.js・scene_v2.js が読む）
//   画面を動かして帯の位置が変わったら、描き直す。PC（v9pc）は V9 の舞台に描くので、ここでは何もしない。レーン U
(function (G) {
  if (typeof document === "undefined" || typeof window === "undefined" || !G.ui) return;
  const U = (G.u30 = G.u30 || {});
  const $ = (s) => document.querySelector(s);
  const body = document.body;
  let last = null;
  U.band = () => {
    if (body.classList.contains("v9pc") || !G.S || !G.S.combat) return null;
    const sc = $(".scene");
    const cvs = Array.from(document.querySelectorAll("#backdrop canvas.bgPic")).map((c) => c.getBoundingClientRect()).filter((r) => r.height > 0);
    if (!sc || !cvs.length) return null;
    const c = cvs.sort((a, b) => b.height - a.height)[0];
    const r = sc.getBoundingClientRect();
    const bar = $("#mbar");
    const top = Math.max(r.top, bar ? bar.getBoundingClientRect().bottom : 0) + 4;
    const base = r.bottom - 4;
    if (base - top < 40) return null;
    const b = { top: (top - c.top) / c.height, base: (base - c.top) / c.height };
    if (b.top < 0 || b.base > 1) return null;
    return b;
  };
  G.foeBand = () => { last = U.band(); return last; };
  // 帯が動いたら描き直す（画面を動かし終えたときに一度）
  let t = 0;
  window.addEventListener("scroll", () => {
    if (!G.S || !G.S.combat || body.classList.contains("v9pc")) return;
    clearTimeout(t);
    t = setTimeout(() => {
      const now = U.band();
      const moved = !last !== !now || (last && now && (Math.abs(last.top - now.top) > 0.02 || Math.abs(last.base - now.base) > 0.02));
      // 同じ絵は舞台（v1_stage.js）が描き直さないので、今の絵をその場で描き直させる
      if (moved && G.stage && G.stage.show && G.stage.current && G.stage.current()) G.stage.show(G.stage.current(), true);
    }, 160);
  }, { passive: true });
})(globalThis.G = globalThis.G || {});
