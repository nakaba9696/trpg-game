// E11 のあと（持ち主の決定 B）：絶界を持たない使徒の固有の守りの効き目（表は src/data/zz_e11b_guard.js の D.E11.FX）
// - 強さ＝ 1 − frac（その戦いの f.e3.frac。弱点の品・条件と弱らせる出来事をそろえるほど弱まり、すべてそろえると 0）
// - G.e11Guard(f) その敵の守り { kind, n, mul, k（強さ 0〜1） } か null（テスト・図鑑用）
// - 挑んだとき、守りが効いていれば on の一行と強さ、消えていれば broken の一行を出す
// - evade・hard・keen・late は G.foeData の上乗せ、regen は手番の終わり、slow は最初の n 手番の無防備（C.exposed）
// 名前の zz_e3y_e11b で zz_e3_apostles.js・zz_e3y_e11_wall.js の後に読まれる。セーブには何も足さない（強さは毎回 f.e3 から決まる）。レーン E（敵）
(function (G) {
  const D = G.data;
  const FX = D.E11 && D.E11.FX;
  if (!FX || !G.e3Of || !G.foeData) return;
  const apOf = (f) => (f && f.id ? G.e3Of(f.id) : null);
  G.e11Guard = (f) => {
    const a = apOf(f);
    const x = a && FX[a.id];
    if (!x || (G.hasWall && G.hasWall(a.id))) return null;
    const frac = f.e3 && typeof f.e3.frac === "number" ? f.e3.frac : 0;
    const k = Math.max(0, Math.min(1, 1 - frac));
    return Object.assign({}, x, { k });
  };

  // 敵の数値への上乗せ
  const fd0 = G.foeData;
  G.foeData = (f) => {
    const e = fd0(f);
    const g = e && G.e11Guard(f);
    if (!g || g.k <= 0) return e;
    const add = Math.round(g.n * g.k);
    if (g.kind === "evade") return Object.assign({}, e, { agi: e.agi + add });
    if (g.kind === "hard") return Object.assign({}, e, { def: e.def + add });
    if (g.kind === "keen") return Object.assign({}, e, { hit: e.hit + add });
    if (g.kind === "late") {
      const C = G.S && G.S.combat;
      if (!C || (C.round || 0) < g.n || !e.dmg) return e;
      const mul = 1 + (g.mul - 1) * g.k;
      return Object.assign({}, e, { dmg: [e.dmg[0], e.dmg[1], Math.round((e.dmg[2] || 0) * mul + e.dmg[0] * e.dmg[1] * (mul - 1) / 2)] });
    }
    return e;
  };

  // 挑んだとき
  const start0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    start0(ids, opt);
    const S = G.S;
    const C = S && S.combat;
    if (!C || !C.foes) return;
    const seen = new Set();
    C.foes.forEach((f) => {
      const g = G.e11Guard(f);
      const a = apOf(f);
      if (!g || seen.has(a.id)) return;
      seen.add(a.id);
      if (g.k <= 0) { G.note(g.broken); return; }
      G.note(`${g.on}（守りの強さ ${Math.round(g.k * 100)}%）`);
      if (g.kind === "slow") C.e11slow = Math.max(C.e11slow || 0, Math.round(g.n * g.k));
    });
    if (C.e11slow > 0) C.exposed = true;
  };

  // 手番の終わり：再生・後手
  const act0 = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const C = S && S.combat;
    const r0 = C ? C.round || 0 : 0;
    const out = act0(arg);
    if (!C || S.combat !== C || S.over || (C.round || 0) === r0) return out;
    G.alive().forEach((f) => {
      const g = G.e11Guard(f);
      if (!g || g.kind !== "regen" || g.k <= 0 || f.hp >= f.max) return;
      const n = Math.min(f.max - f.hp, Math.max(1, Math.round(f.max * g.n * g.k)));
      f.hp += n;
      G.log("sys", `${f.name}の傷が塞がる（HP +${n}・残り ${f.hp}/${f.max}）`, { fx: "regen", foe: f.name, n });
    });
    if (C.e11slow > 0) {
      C.e11slow--;
      if (C.e11slow > 0) C.exposed = true;
    }
    return out;
  };
})(globalThis.G = globalThis.G || {});
