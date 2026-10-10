// R13（2026-10-11 のプレイレビュー）：初回の遊び方の一行（.tip）が、立ち絵の名札（.c3plate・.v9name）に重なって隠していた。レーン U
// R11（zzzzzz_zr11_ui.js）は案内を右の窓のすぐ上（スマホの縦はログの窓のすぐ上）に浮かべ、名札に掛かると測ったときだけ名札を上へずらしていた。
// 立ち絵は出入りのフェードの途中で測られたり、案内より後に現れたりするので、ずらしが効かずに重なることがあった。
// 名札はいつも立ち絵の足元（下の窓のすぐ上）にあるので、測らずに、案内のほうを足元から離れた所へ置く：
// - PC：右上の道具の帯のすぐ下（見た目は zzzzzzzzzz_r13_tip.css）。名札はずらさない
// - スマホの縦：舞台の上には置かず、コマンドの窓の頭に戻す（戦闘のときと同じ。.r13intip）
// - スマホの横：今までどおり左の舞台の上のほう（名札は舞台の下）
(function (G) {
  const ui = G.ui;
  if (typeof document === "undefined" || !ui || !ui.render) return;
  const body = document.body;
  const has = (c) => body.classList.contains(c);
  function placeTip() {
    body.classList.remove("r11tipon");
    const tip = document.querySelector(".r11tip");
    const panel = document.getElementById("panel");
    if (!tip || !panel) return;
    if (has("u31m") && !document.documentElement.classList.contains("u31land")) {
      tip.classList.remove("r11tip");
      tip.classList.add("r13intip");
      panel.prepend(tip);
    }
  }
  const base = ui.render;
  ui.render = (...a) => {
    const r = base(...a);
    try { placeTip(); } catch (e) { /* 案内を動かせなくても描画は止めない */ }
    return r;
  };
})(globalThis.G);
