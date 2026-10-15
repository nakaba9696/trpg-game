// E13：使徒の不死＝門（表は src/data/zz_e13_immortal.js の D.E13。設計は docs/lore/immortal.md）
// - 門を持つ使徒との戦い（G.startCombat）は、始める前に門を見る。破るまでは戦いにならない
//   条件（stages[i].keys のどれか・pierce・e10）がそろっていなければ「不死の場面」。そろっていれば一段ごとに判定（G.check）
//   手がかりを知っていれば一段易しい（GAM-32：読み逃しを罰にしない）。easy の条件でさらに一段、auto の条件なら判定なし
// - 破れなかったら：最大 HP の 2 割を失って退く（死なない：HP は 1 より下がらない）。挑んだ回数（G.P.e3tries）は増える
// - 破れたら：破れた一行・正体を現す一行（reveal）を出して、元の戦いへ。強さは今の格のまま（frac の計算は変えない）
//   その戦いの使徒には f.e13 が付き、刃が届く（黒鎧の絶界も、門を破ったら弾かない：決定 1）
// - 長編（E7）は opt.gate で渡す："skip"（一度目の対面など、物語の戦い）・"open"（長編の備えで守りが破れている）
// - G.e13Gate(id, S) 門の様子 { gate, stages: [{ met, chance }] }（テスト・図鑑用。判定はしない）
// - 出来事の結果 e13said：懺悔の谷の石碑で罪を言った（S.e13.said に今の罪の匂いを覚える。古いセーブで無くても 0）
// 名前の zz_e3y_e13 で zz_e3_apostles.js・E11 の後、zz_e3z_e10_events.js・zz_e8_unslay.js の前に読まれる（討てない使徒は E8 が先に止める）。レーン E（敵）
(function (G) {
  const D = G.data;
  const E13 = D.E13;
  if (!E13 || !D.E3 || !G.e3Of) return;
  const LIST = D.E3.LIST;
  const GATE = E13.GATE;

  // 条件は E3 の G.e3Keys で読む（条件の正は一つ。E10 などが包んでいても同じ答え）
  const keyMet = (id, kid, S) => G.e3Keys(id, S).some((k) => k.id === kid && k.met);
  const pierce = () => !!(G.weapon && G.weapon() && G.weapon().pierce);
  const e10Met = (id, keys, S) => !!(keys && G.e10Done && G.e10Done(id, S).some((k) => keys.includes(k)));
  const stageMet = (id, st, S) => st.keys.some((k) => keyMet(id, k, S)) || (st.pierce && pierce()) || e10Met(id, st.e10, S);
  // 手がかりを知っている：その使徒の手引きの行を開いた・会う出来事の覚え書きがある
  G.e13Known = (id, S) => {
    S = S || G.S;
    const g = GATE[id];
    if (!g || !S) return false;
    const lore = S.lore || {};
    if ((g.lore || [id]).some((k) => (lore[k] || []).length)) return true;
    const memo = LIST[id].meet && LIST[id].meet.peek && LIST[id].meet.peek.memo;
    return !!(memo && (S.memos || []).includes(memo));
  };
  const diffOf = (id, st, S) => {
    let d = E13.DIFF[LIST[id].rank] || "普通";
    if (G.e13Known(id, S)) d = E13.EASIER[d];
    if ((st.easy || []).some((k) => keyMet(id, k, S))) d = E13.EASIER[d];
    return d;
  };
  G.e13Gate = (id, S) => {
    S = S || G.S;
    const g = GATE[id];
    if (!g || !S) return null;
    return { gate: g, stages: g.stages.map((st) => {
      const met = stageMet(id, st, S);
      const auto = (st.auto || []).some((k) => keyMet(id, k, S));
      return { met, auto, diff: diffOf(id, st, S), chance: !met ? 0 : auto ? 100 : G.chance(st.stat, diffOf(id, st, S)) };
    }) };
  };

  const addTry = (id) => { const P = (G.P = G.P || { trophies: {}, graves: [] }); P.e3tries = P.e3tries || {}; P.e3tries[id] = (P.e3tries[id] || 0) + 1; };
  function repel(a, g, slip) {
    const S = G.S;
    G.say(g.scene);
    if (slip) G.say(E13.SLIP);
    const n = Math.max(1, Math.round((S.maxHp || S.hp) * E13.HURT));
    const lost = Math.max(0, Math.min(n, S.hp - 1));
    S.hp -= lost;
    G.note(`${E13.BACK}（HP −${lost}）`);
    addTry(a.id);
    if (G.onProfile) G.onProfile();
  }
  // 門を試す。破れたら true
  function tryGate(a, opt) {
    const S = G.S;
    const g = GATE[a.id];
    const open = opt && opt.gate === "open";
    for (const st of g.stages) {
      if (!open) {
        if (!stageMet(a.id, st, S)) { repel(a, g, false); return false; }
        if (!(st.auto || []).some((k) => keyMet(a.id, k, S))) {
          const r = G.check(st.stat, diffOf(a.id, st, S), `${g.type}を破る`);
          if (!r.ok) { repel(a, g, true); return false; }
        }
      }
      G.say(st.broken);
    }
    if (g.reveal) G.say(g.reveal);
    return true;
  }

  // 戦いの間、門を破った使徒には刃が届く（E3 の open。黒鎧の絶界もここで開く）
  let opening = null;
  const open0 = G.e3Open;
  G.e3Open = (id, S) => opening === id || open0(id, S);
  const broke = (f) => !!(f && f.e13);
  const fd0 = G.foeData;
  G.foeData = (f) => { const e = fd0(f); return e && broke(f) && e.majin ? Object.assign({}, e, { majin: false }) : e; };

  const start0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    const S = G.S;
    const a = (ids || []).map((id) => G.e3Of(id)).find((x) => x && GATE[x.id] && !x.noslay);
    if (!a || !S || (opt && opt.gate === "skip")) return start0(ids, opt);
    if (!tryGate(a, opt)) return;
    opening = a.id;
    try { start0(ids, opt); } finally { opening = null; }
    const C = G.S && G.S.combat;
    if (C && C.foes) C.foes.forEach((f) => { if (f.id === a.foe) { f.e13 = true; if (f.e3) f.e3.open = true; } });
  };

  // 懺悔の谷の石碑で罪を言った
  const apply0 = G.apply;
  G.apply = (o) => {
    const r = apply0(o);
    const S = G.S;
    if (o && o.e13said && S) { S.e13 = S.e13 || {}; S.e13.said = S.sin || 0; }
    return r;
  };
})(globalThis.G = globalThis.G || {});
