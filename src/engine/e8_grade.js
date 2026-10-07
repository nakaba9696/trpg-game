// E8：化け物の格（S・A・B・C・D 級。表は src/data/e8_grades.js の D.E8）
// - G.gradeOf(敵 id) … 使徒は D.E3.LIST の rank（S・A・B）、魔物は data の grade か強さから自動で（S は使徒だけ）
// - G.gradeName("B") … 「B 級」。G.gradeRule() … 決め方の表（PR・テスト用）
// - 使徒の rank が古い呼び名（天災・国難・討伐）でも、読み込んだときに S・A・B へ直す（別の作業で足された使徒・古い表）
// - 戦闘を始めるとき、相手の格を一行出す（「格：灰の地竜 B 級」）。使徒と戦うと、用語説明の「格」「使徒」に一行ずつ足す
// セーブ（G.S・G.P）には何も足さない。格は毎回データから決まる。レーン E（敵）が管理
(function (G) {
  const D = G.data;
  const E8 = D.E8;
  if (!E8) return;
  const ORDER = E8.ORDER;
  const OLD = { 天災: "S", 国難: "A", 討伐: "B" };

  // 使徒の rank を S・A・B にそろえる（古い呼び名の表が残っていても動く）
  const fix = () => { if (D.E3 && D.E3.LIST) Object.values(D.E3.LIST).forEach((a) => { if (OLD[a.rank]) a.rank = OLD[a.rank]; }); };
  fix();
  G.gradeFix = fix;

  const foeOf = (id) => D.ENEMIES[id] || (D.E3 && D.E3.FOES && D.E3.FOES[id]) || null;
  const apostleOf = (id) => {
    if (G.e3Of) return G.e3Of(id);
    return D.E3 && D.E3.LIST ? Object.values(D.E3.LIST).find((a) => a.foe === id) || null : null;
  };
  const tierLv = (e) => { const T = (D.S5 && D.S5.TIER_LV) || {}; const t = e.tier || 1; return T[t] != null ? T[t] : 12 + (t - 1) * 8; };

  // 決め方（上から順に。最初に当たったもの）
  const RULES = [
    { grade: null, why: "使徒：表の格（S・A・B）", test: (id) => !!apostleOf(id), pick: (id) => { const r = apostleOf(id).rank; return OLD[r] || r; } },
    { grade: null, why: "データに grade（A〜D。S は付けない）", test: (id, e) => ["A", "B", "C", "D"].includes(e.grade), pick: (id, e) => e.grade },
    { grade: "B", why: "絶界を持つ（使徒）", test: (id, e) => !!e.majin },
    { grade: "B", why: "ボス・迷宮の主", test: (id, e) => !!e.boss },
    { grade: "B", why: "名のある強敵（D.W8_FOES）", test: (id) => !!(D.W8_FOES && D.W8_FOES[id]) },
    { grade: "B", why: `段の点が ${E8.AUTO.bLv} 以上（段 6 以上）か、HP ${E8.AUTO.bHp} 以上`, test: (id, e) => tierLv(e) >= E8.AUTO.bLv || (e.hp || 0) >= E8.AUTO.bHp },
    { grade: "C", why: `段 ${E8.AUTO.cTier}〜5`, test: (id, e) => (e.tier || 1) >= E8.AUTO.cTier },
    { grade: "D", why: "段 1〜2", test: () => true },
  ];
  G.gradeOf = (id) => {
    const e = foeOf(id);
    if (!e) return null;
    const r = RULES.find((x) => x.test(id, e));
    return r.pick ? r.pick(id, e) : r.grade;
  };
  G.gradeName = (g) => (g ? `${g} 級` : "");
  G.gradeRank = (g) => ORDER.indexOf(g); // 小さいほど上
  G.gradeRule = () => RULES.map((r) => [r.grade || "表のまま", r.why]);
  // いちばん上の格（戦う相手が並ぶとき）
  G.gradeTop = (ids) => (ids || []).map((id) => G.gradeOf(id)).filter(Boolean).sort((a, b) => G.gradeRank(a) - G.gradeRank(b))[0] || null;

  // ---------------------------------------------------------------- 戦闘の始まりに一行
  const baseStart = G.startCombat;
  G.startCombat = (ids, opt) => {
    baseStart(ids, opt);
    const S = G.S;
    const C = S && S.combat;
    if (!C || !C.foes) return;
    const seen = new Set();
    const parts = [];
    C.foes.forEach((f) => {
      if (seen.has(f.id)) return;
      seen.add(f.id);
      const g = G.gradeOf(f.id);
      if (g) parts.push(`${(foeOf(f.id) || {}).name || f.name} ${G.gradeName(g)}`);
    });
    if (parts.length) G.note(`格：${parts.join("・")}`);
    if (C.foes.some((f) => apostleOf(f.id)) && G.openLore) { G.openLore("u7_rank:word"); G.openLore("majin:words"); }
  };
})(globalThis.G = globalThis.G || {});
