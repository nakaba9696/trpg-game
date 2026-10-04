// S2：能力値を「小さな数（点）」で見せる。エルミナージュ・ウィザードリィ風の作成（種族と生まれと職業の素の値＋振ったボーナス点）。
// 考え方は docs/s2_stats.md。決まりは src/engine/u5_creation.js（G.cre）と src/engine/core.js（G.pt）。
//
// 点と成功率：1 点 ＝ 成功率の基準 4％（D.S2.PCT）。セーブ（G.S.stats）には今までどおり成功率の尺度（0〜99）で持つ。
//   画面に出す点 ＝ 割合 ÷ 4 の切り捨て。端数（0〜3）は「経験」で、4 たまると 1 点伸びる。
//   だから古いセーブは書き換えなくても点で見える（二度換算することが無い）。
// 作成の表（このファイル）は点で書く：職業の素の値（5〜12）、種族・年齢・生まれの補正（±1〜3）、才能限界の補正。
// 名前の頭の zs2 は u5_origins.js（年齢・生まれ）と r1_races.js（種族）より後に読ませるため。レーン C（S2）
(function (G) {
  const D = (G.data = G.data || {});

  D.S2 = {
    PCT: 4,        // 1 点が成功率の何％か
    MAX: 24,       // 点の上限（才能限界もここまで。24 点 ＝ 96％。判定は 95％で止まる）
    CAP_ADD: [8, 3, 3], // 才能限界 ＝ 素の値 ＋ 8 ＋ 1d3 ＋ 1d3（＋10〜14、平均 12。24 点まで）
    // ボーナス点の振り方。[割合, 最小, 最大, 名前]。上から順に引く（大当たり 1.5％・当たり 10％・ふつう 残り）
    BONUS: [
      [0.015, 25, 30, "大当たり"],
      [0.10, 15, 20, "当たり"],
      [1, 5, 10, "ふつう"],
    ],
    BONUS_EXTRA: 0.3,  // 大当たりのうち、さらに 1〜5 点上乗せされる割合（31〜35 点）
  };

  // 職業の素の値（点）。職業の向き不向きは、この値と才能限界（素の値＋10〜14）で出る。
  // 決め方：今までの平均（base＋3D6−3）÷4 から 2 点引き、4 点より下げない。ボーナス点（平均 9 点ほど）を均等に配ると、今までの平均より少し低い
  const PT = {
    merc: { 筋力: 11, 体力: 12, 敏捷: 10, 知力: 6, 魔力: 4, 魅力: 7 },
    thief: { 筋力: 7, 体力: 7, 敏捷: 11, 知力: 10, 魔力: 4, 魅力: 9 },
    mage: { 筋力: 5, 体力: 11, 敏捷: 10, 知力: 12, 魔力: 14, 魅力: 6 },
    priest: { 筋力: 7, 体力: 11, 敏捷: 8, 知力: 9, 魔力: 11, 魅力: 9 },
    samurai: { 筋力: 11, 体力: 9, 敏捷: 11, 知力: 7, 魔力: 4, 魅力: 7 },
  };

  Object.entries(PT).forEach(([c, pt]) => { if (D.CLASSES[c]) D.CLASSES[c].pt = pt; });
  // ほかの子が足した職業（pt が無い）は、今までの base（成功率の尺度）から出す
  Object.values(D.CLASSES).forEach((c) => {
    if (!c.pt) c.pt = Object.fromEntries(D.STATS.map((k) => [k, Math.max(4, Math.round(((c.base[k] || 0) + 7.5) / 4) - 2)]));
  });

  // 補正を点に書き直す（年齢と生まれは表で、種族と元の獣は 3％を 1 点として丸め、0 になった項目は消す）
  const toPt = (m) => {
    const o = {};
    Object.entries(m || {}).forEach(([k, v]) => { const n = Math.sign(v) * Math.round(Math.abs(v) / 3); if (n) o[k] = n; });
    return o;
  };
  if (!D.S2.converted) {
    D.S2.converted = true;
    const AGE = {
      young: { mod: { 体力: 1, 敏捷: 1, 知力: -1, 魅力: -1 }, cap: 1 },
      prime: { mod: {}, cap: 0 },
      old: { mod: { 筋力: -1, 体力: -1, 敏捷: -1, 知力: 2, 魔力: 1, 魅力: 1 }, cap: -1 },
    };
    Object.entries(AGE).forEach(([k, a]) => { if (D.AGES && D.AGES[k]) Object.assign(D.AGES[k], a); });
    const ORIGIN = {
      karna: { 魅力: 1, 知力: 1 }, nerva: { 敏捷: 1, 体力: 1 }, leavel: { 魅力: 1, 魔力: 1 }, garmund: { 体力: 1, 筋力: 1 },
      zephara: { 魔力: 1, 知力: 1 }, fort: { 筋力: 1, 体力: 1 }, yakumo: { 敏捷: 1, 筋力: 1 }, village: { 体力: 1, 知力: 1 },
    };
    Object.entries(D.ORIGINS || {}).forEach(([id, o]) => { o.mod = ORIGIN[id] || toPt(o.mod); });
    [D.RACES, D.BEASTS].forEach((T) => Object.values(T || {}).forEach((r) => { r.mod = toPt(r.mod); }));
  }
})(globalThis.G = globalThis.G || {});
