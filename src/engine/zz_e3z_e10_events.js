// E10：使徒を弱らせる出来事（表は src/data/zz_e10_events.js の D.E10）
// - 出来事の表がある使徒は、弱り方の割合 frac を「弱点の品・条件の割合 × KEY_W ＋ 起こした出来事の割合 × (1 − KEY_W)」にする
//   （表の無い使徒は今までどおり、弱点の品・条件だけで決まる）。frac から先の弱り方は E3 と同じ（D.E3.WEAK の倍率）
// - 挑んだとき、起こした出来事の一行（on）が出る
// - 図鑑：倒した使徒の「弱る条件」に、出来事の短い言葉も並ぶ
// - G.e10Done(使徒, S) 起こした出来事の key の一覧／G.e10Fill(S) すべて起こしたことにする（テスト用）
// 名前の zz_e3z で zz_e3_apostles.js の後・zz_e8_power.js（keyHp）の前に読まれる。セーブには印（S.flags）だけ。レーン E（敵）
(function (G) {
  const D = G.data;
  const E10 = D.E10;
  if (!E10 || !D.E3 || !G.e3Mods) return;
  const LIST = E10.LIST;
  const evOf = (id) => LIST[id] || null;
  const met = (x, id, S) => { try { return x.test ? !!x.test(S) : !!(S.flags && S.flags[`e10:${id}:${x.key}`]); } catch (e) { return false; } };

  G.e10Of = evOf;
  G.e10Done = (id, S) => { S = S || G.S; const L = evOf(id); return L && S ? L.filter((x) => met(x, id, S)).map((x) => x.key) : []; };
  G.e10Fill = (S) => { S = S || G.S; Object.entries(LIST).forEach(([id, L]) => L.forEach((x) => { S.flags[`e10:${id}:${x.key}`] = true; })); };

  // 弱り方の割合
  const mods0 = G.e3Mods;
  G.e3Mods = (id, S) => {
    const m = mods0(id, S);
    const L = evOf(id);
    const a = D.E3.LIST[id];
    S = S || G.S;
    if (!L || !L.length || !a || !S) return m;
    const ev = G.e10Done(id, S).length / L.length;
    const frac = E10.KEY_W * m.frac + (1 - E10.KEY_W) * ev;
    const W = D.E3.WEAK[a.rank];
    const mul = (v) => 1 - frac * (1 - v);
    return Object.assign({}, m, { frac, keyFrac: m.frac, e10: ev, hp: mul(W.hp), dmg: mul(W.dmg), hit: Math.round(frac * W.hit), def: Math.round(frac * W.def), agi: Math.round(frac * W.agi) });
  };

  // 挑んだときの一行
  const start0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    start0(ids, opt);
    const S = G.S;
    if (!S || !S.combat || !G.e3Of) return;
    S.combat.foes.forEach((f) => {
      const a = G.e3Of(f.id);
      const L = a && evOf(a.id);
      if (L) L.filter((x) => met(x, a.id, S) && x.on).forEach((x) => G.say(x.on));
    });
  };

  // 図鑑：倒した使徒の「弱る条件」に、出来事の短い言葉も並べる
  const codex0 = G.e3Codex;
  if (codex0) G.e3Codex = (foeId) => {
    const c = codex0(foeId);
    const L = c && evOf(c.apostle);
    return c && c.keys && L ? Object.assign({}, c, { keys: [...c.keys, ...L.map((x) => x.label)], events: L.map((x) => x.label) }) : c;
  };
})(globalThis.G = globalThis.G || {});
