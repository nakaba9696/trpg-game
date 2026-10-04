// S5：品の説明（desc）の頭に書いた能力値の補正（「筋力+5。」など。データでは％の数）を、画面の効果と同じ点の数に書き直す（G.statModText と同じ丸め）。
// 補正そのもの（it.stats）は％のまま（判定で 3 で割って点にする。src/engine/core.js の G.s5Mod）。名前の頭の zzzz は品のデータの後に読ませるため。レーン C（S5）
(function (G) {
  const D = (G.data = G.data || {});
  const MOD = (D.S5 && D.S5.MOD) || 3;
  const pt = (n) => Math.sign(n) * Math.max(1, Math.round(Math.abs(n) / MOD));
  const sign = (n) => (n >= 0 ? "+" : "") + n;
  Object.values(D.ITEMS || {}).forEach((it) => {
    if (!it || !it.stats || typeof it.desc !== "string" || it.s5desc) return;
    it.desc = it.desc.replace(/(筋力|体力|敏捷|知力|魔力|魅力)([+-])(\d+)/g, (m, k, s, d) => {
      const v = (s === "-" ? -1 : 1) * Number(d);
      return it.stats[k] === v ? k + sign(pt(v)) : m;
    });
    it.s5desc = true;
  });
})(globalThis.G = globalThis.G || {});
