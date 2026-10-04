// 恋の筋（R2）の共通の表：トロフィー。一人ひとりの筋は src/data/romance_<id>.js、仕組みは src/engine/zzzzzz_romance2.js。レーン C
(function (G) {
  const D = (G.data = G.data || {});
  D.R2 = D.R2 || {};
  D.R2.ARCS = D.R2.ARCS || {};
  D.R2_PARTS = D.R2_PARTS || {};
  (D.TROPHIES = D.TROPHIES || []).push(
    { key: "r2_full", name: "二人の頁", tier: "金", desc: "恋の相手と、出会いから結婚のその先まで、恋の筋を最後まで歩いた" },
  );
})(globalThis.G = globalThis.G || {});
