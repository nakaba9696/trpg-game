// S5：能力値の目盛り（点。作成で 5〜18 ほど、やりこめば 99 まで）と、成功率の曲線・敵の強さ・場所の難しさの表。
// 決まりは src/engine/core.js（G.chance・G.check・G.grow）と src/engine/combat.js（G.foeLv など）。docs/s2_stats.md。レーン C＋B
(function (G) {
  const D = (G.data = G.data || {});

  D.S5 = {
    // 成功率 ＝ 100 ÷ (1 ＋ e^(−(自分の点 − 相手の点 ＋ BIAS) ÷ SCALE))。差 0 で 53％・+10 で 81％・−10 で 23％・±20 で 94／7％
    SCALE: 7.5,
    BIAS: 1,
    MOD: 3,          // 補正（装備・種族・状態・武器の命中など、データに「％」で書いたもの）3 で 1 点
    // 成長：経験 NEED で 1 点。BASE 点を超えると、SLOPE 点ごとに要る経験が 1 倍ずつ増える（12 点 100・42 点 200・72 点 300・99 点 390）
    NEED: 100,
    SLOPE: 30,
    BASE: 12,
    // 出来事などの難しさ（易しい〜至難）に、場所の危険（danger 0〜6）で足す点。迷宮は深さ 1 階ごとに DEPTH 点
    ZONE: [0, 0, 2, 5, 9, 14, 20],
    DEPTH: 1,
    // 敵の強さ（点）。データに lv が無い敵は段（tier）から。ボスは BOSS 点上乗せ
    TIER_LV: { 1: 12, 2: 13, 3: 15, 4: 20, 5: 28, 6: 42, 7: 52, 8: 58 },
    BOSS: 3,
  };
})(globalThis.G = globalThis.G || {});
