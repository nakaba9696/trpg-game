// S2：能力値を「小さな数（点）」で見せる。古いダンジョン RPG 風の作成（ダイスで振る初期値＋職業・種族・生まれの補正＋ボーナス点）。
// 考え方は docs/s2_stats.md。決まりは src/engine/u5_creation.js（G.cre）と src/engine/core.js（G.pt）。
//
// 点と成功率：S5 から、セーブ（G.S.stats）も点そのもの（D.S2.PCT = 1）。成功率は相手・難しさの点との差で決まる（src/data/s5_scale.js）。
//   古いセーブ（成功率の尺度 0〜99）は読み込むときに ÷4 して点にする（G.s5Upgrade）。
// 作成の表（このファイル）は点で書く：初期値のダイス（3D6、まれに +1D6）、職業・種族・年齢の補正（±1〜3）。
// 能力値そのものに上限は無い（持ち主の決定）。ボーナス点は 5 点＋トロフィーの格の点 10 点ごとに 1（u5_creation.js・zz_u10_trophy_bonus.js）。
// 名前の頭の zs2 は u5_origins.js（年齢）と r1_races.js（種族）より後に読ませるため。レーン C（S2）
(function (G) {
  const D = (G.data = G.data || {});

  D.S2 = {
    PCT: 1,             // セーブの値 ÷ PCT ＝ 点（S5 から 1。セーブも点で持つ）
    MIN: 3,             // 初期値の下限（補正を足しても、ここより下げない）
    LUCKY: 0,           // 3D6 がこの数以上なら必ず 1D6 が乗る（0 なら使わない。15 だと能力値ごとに約 4％・1 人あたり約 23％）
    EXTRA: 0.11,        // 初期値の 3D6 に、もう 1D6 が乗る割合（能力値ごと。20 以上が出るのはほぼこれ。1 人のうちどれか 1 つが 20 以上になるのが約 5％。U25 で生まれの補正を無くしたので 0.08 から上げて約 5％を保つ）
  };

  // 職業の補正（点）。初期値の 3D6 に足す。職業の向き不向きはこれで出る。
  // 決め方：S2 の最初の版の職業の素の値（傭兵 筋力 11 など）から 10 を引いて半分にし、丸めた
  const MOD = {
    merc: { 筋力: 1, 体力: 2, 敏捷: 0, 知力: -2, 魔力: -3, 魅力: -1 },
    thief: { 筋力: -1, 体力: -1, 敏捷: 1, 知力: 0, 魔力: -3, 魅力: 0 },
    mage: { 筋力: -2, 体力: 1, 敏捷: 0, 知力: 1, 魔力: 2, 魅力: -2 },
    priest: { 筋力: -1, 体力: 1, 敏捷: -1, 知力: 0, 魔力: 1, 魅力: 0 },
    samurai: { 筋力: 1, 体力: 0, 敏捷: 0, 知力: -1, 魔力: -3, 魅力: -1 },
  };

  Object.entries(MOD).forEach(([c, m]) => { if (D.CLASSES[c]) D.CLASSES[c].mod2 = m; });
  // ほかの子が足した職業（mod2 が無い）は、今までの base（成功率の尺度）から出す
  Object.values(D.CLASSES).forEach((c) => {
    if (!c.mod2) c.mod2 = Object.fromEntries(D.STATS.map((k) => [k, Math.round((Math.round(((c.base[k] || 0) + 7.5) / 4) - 12) / 2)]));
  });

  // 補正を点に書き直す（年齢は表で、種族と元の獣は 3％を 1 点として丸め、0 になった項目は消す）
  const toPt = (m) => {
    const o = {};
    Object.entries(m || {}).forEach(([k, v]) => { const n = Math.sign(v) * Math.round(Math.abs(v) / 3); if (n) o[k] = n; });
    return o;
  };
  if (!D.S2.converted) {
    D.S2.converted = true;
    const AGE = {
      young: { mod: { 体力: 1, 敏捷: 1, 知力: -1, 魅力: -1 }, cap: 0 },
      prime: { mod: {}, cap: 0 },
      old: { mod: { 筋力: -1, 体力: -1, 敏捷: -1, 知力: 2, 魔力: 1, 魅力: 1 }, cap: 0 },
    };
    Object.entries(AGE).forEach(([k, a]) => { if (D.AGES && D.AGES[k]) Object.assign(D.AGES[k], a); });
    [D.RACES, D.BEASTS].forEach((T) => Object.values(T || {}).forEach((r) => { r.mod = toPt(r.mod); }));
  }
})(globalThis.G = globalThis.G || {});
