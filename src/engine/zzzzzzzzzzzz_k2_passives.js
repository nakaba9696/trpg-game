// K2：パッシブスキル（持っているだけで常に効く）。表は src/data/k2_passives.js（K1 の D.SKILLS に kind "passive" で足してある）。
// 覚え方・巻物・師・稽古・画面の一覧は K1（zzzzzzzzzzz_k1_skills.js）の口をそのまま使う。ここで足すのは効き目と「失敗から覚える」だけ。
//   判定の補正：G.check を包み、判定の理由（選択肢の文・「逃走」など）が fx.check.re に合えば補正を足す。画面の成功率も同じだけ上げて見せる
//              （出来事・施設の選択肢、戦闘の逃げる・威圧・急所）。状況の補正（夜・町・荒野）は G.chance を包む（画面と判定が同じ数になる）
//   G.gearBonus を包んで fx.bonus（盗み・罠・話術・術の種類、K1 の戦技の判定）
//   減り方：G.addSanity（正気の減りを軽くするだけ。正気の段の仕組みは M13 に任せて触らない）・G.beastUp（獣の病）・毒（行動のあとで振り払う）
//   装備：G.armor（鎧の重さ）・G.weapon（二刀）。気力の最大（G.k1.kiMax）・眠ったときの回復（G.sleep）
//   経験から覚える：fx.check.re に合う判定で大成功した（コツをつかむ。大失敗では覚えない）・正気が大きく削れた・毒を受けた・獣の病が進んだ・瀕死になった とき、
//     低い見込みで身につく。同じ種類で重ねるほど見込みが上がる（D.K2_CRIT・D.K2_SUFFER）。覚えたわけの一文（learn.crit.why / learn.suffer.why）と、目立つ一行（K1 の learn）
// セーブに足す項目（古いセーブで無くても動く）：S.k1.k2 = { crit: { スキル: 大成功の数 }, suf: { 種類: 目に遭った数 } }
// 名前の頭の z の数は、K1（11 個）より後に読ませるため。DOM には触らない。乱数は G.rand。レーン C（K2）
(function (G) {
  const D = G.data;
  const K = G.k1;
  if (!K || !D.SKILLS) return;
  const SK = D.SKILLS;
  const K2 = (G.k2 = G.k2 || {});

  K2.ids = Object.keys(SK).filter((id) => SK[id].kind === "passive");
  K2.list = (S) => K.list(S).filter((id) => SK[id].kind === "passive");
  const owned = (S) => K2.list(S || G.S).map((id) => [id, SK[id].fx || {}]);
  K2.state = (S) => { const x = K.state(S || G.S); x.k2 = x.k2 || {}; x.k2.crit = x.k2.crit || {}; x.k2.suf = x.k2.suf || {}; return x.k2; };

  // ---------------------------------------------------------------- 判定の補正
  // 理由に合う補正の合計と、効いたスキルの名
  K2.checkBonus = (reason, S) => {
    S = S || G.S;
    let n = 0;
    const names = [];
    if (!S || !reason) return { n, names };
    owned(S).forEach(([id, fx]) => { if (fx.check && fx.check.re.test(String(reason))) { n += fx.check.n || 0; names.push(SK[id].name); } });
    return { n, names };
  };
  const where = (S) => { const L = D.LOCS[S.loc] || {}; return { night: S.phase === 3, town: L.type === "town", wild: L.type === "wild" }; };
  K2.chanceBonus = (stat, S) => {
    S = S || G.S;
    if (!S || !S.stats) return 0;
    const w = where(S);
    return owned(S).reduce((a, [, fx]) => (fx.chance && w[fx.chance.when] && (!fx.chance.stats || fx.chance.stats.includes(stat)) ? a + (fx.chance.n || 0) : a), 0);
  };
  const chance0 = G.chance;
  G.chance = (stat, diff, extra) => chance0(stat, diff, (extra || 0) + (G.S ? K2.chanceBonus(stat) : 0));
  const gear0 = G.gearBonus;
  G.gearBonus = (kind) => {
    const b = gear0(kind);
    if (!G.S) return b;
    return b + owned(G.S).reduce((a, [, fx]) => (fx.bonus && fx.bonus.kinds.includes(kind) ? a + (fx.bonus.n || 0) : a), 0);
  };
  const check0 = G.check;
  G.check = (stat, diff, reason, extra) => {
    const S = G.S;
    const add = S ? K2.checkBonus(reason, S).n : 0;
    const r = check0(stat, diff, reason, (extra || 0) + add);
    if (S && !S.over && G.S === S) {
      if (r && r.crit) learnFrom(String(reason || ""));   // 大成功でコツをつかむ（大失敗では覚えない）
      if (/瀕死で踏みとどまる/.test(String(reason || ""))) K2.suffer("brink");
    }
    return r;
  };
  // 画面に見せる成功率を、理由の補正の分だけ上げる（G.s5p の逆から点の差を出して足す）
  K2.bump = (pct, n) => {
    if (!n) return pct;
    const S5 = D.S5 || { SCALE: 7.5, BIAS: 1 };
    const p = G.clamp(pct, 1, 99) / 100;
    const delta = -S5.SCALE * Math.log(1 / p - 1) - S5.BIAS;
    return G.clamp(Math.round(G.s5p(delta + G.s5Mod(n))), 5, 95);
  };
  const tagSub = (a, label) => {
    const b = K2.checkBonus(label);
    if (!b.n || !a.sub || !/\d+%/.test(a.sub)) return;
    a.sub = a.sub.replace(/(\d+)%/, (m, x) => `${K2.bump(+x, b.n)}%`) + `・${b.names.join("・")}`;
  };
  const actions0 = G.actions;
  G.actions = () => {
    const g = actions0();
    const S = G.S;
    if (!S || S.over || !K2.list(S).length || S.mode === "combat") return g;
    g.forEach((grp) => (grp.list || []).forEach((a) => { if (!a.disabled && !a.locked) tagSub(a, a.label); }));
    return g;
  };
  // 戦闘の逃げる・威圧・急所（理由が決まっている判定）
  [["flee", "逃走"], ["talk", "威圧"], ["vital", "急所狙い"]].forEach(([k, reason]) => {
    const f0 = G.cb && G.cb[k];
    if (f0) G.cb[k] = () => { const v = f0(); return G.S ? K2.bump(v, K2.checkBonus(reason).n) : v; };
  });

  // ---------------------------------------------------------------- 減り方
  const san0 = G.addSanity;
  if (san0) G.addSanity = (n, quiet, cap) => {
    const S = G.S;
    if (S && !S.over && n < 0) {
      const m = owned(S).reduce((a, [, fx]) => (fx.sanity ? a * fx.sanity : a), 1);
      if (m < 1) n = -Math.max(1, Math.round(-n * m));
      const r = san0(n, quiet, cap);
      if (G.S === S && !S.over && n <= -5) K2.suffer("sanity");   // 大きく削られたときだけ数える
      return r;
    }
    return san0(n, quiet, cap);
  };
  const beast0 = G.beastUp;
  if (beast0) G.beastUp = (n) => {
    const S = G.S;
    if (S && !S.over && n > 0 && G.beastOf(S) > 0) {
      const p = owned(S).reduce((a, [, fx]) => Math.max(a, fx.beast || 0), 0);
      if (p && G.rand() < p) { G.say("骨の奥の疼きを、奥歯で噛み殺した。今夜は、まだ人のままだ。"); return; }
    }
    const r = beast0(n);
    if (S && G.S === S && !S.over && n > 0) K2.suffer("beast");
    return r;
  };
  // 毒：行動のあとで、新しく毒に冒されていたら
  const act0 = G.act;
  G.act = (id) => {
    const S = G.S;
    const had = !!(S && (S.conds || []).includes("毒"));
    const r = act0(id);
    if (S && G.S === S && !S.over && !had && (S.conds || []).includes("毒")) {
      const p = owned(S).reduce((a, [, fx]) => Math.max(a, fx.poison || 0), 0);
      if (p && G.rand() < p) { S.conds = S.conds.filter((c) => c !== "毒"); G.say("胃の底が熱くなり、体が毒を追い出した。吐き気だけが残った。"); }
      else K2.suffer("poison");
    }
    return r;
  };

  // ---------------------------------------------------------------- 装備・気力・眠り
  const armor0 = G.armor;
  const armorMemo = new WeakMap();
  G.armor = () => {
    const a = armor0();
    const S = G.S;
    if (!a || !S || !(a.agi < 0)) return a;
    const m = owned(S).reduce((x, [, fx]) => (fx.armorAgi ? x * fx.armorAgi : x), 1);
    if (m >= 1) return a;
    let c = armorMemo.get(a);
    if (!c || c.m !== m) { c = { m, v: Object.assign({}, a, { agi: Math.round(a.agi * m) }) }; armorMemo.set(a, c); }
    return c.v;
  };
  const weapon0 = G.weapon;
  const weaponMemo = new WeakMap();
  G.weapon = () => {
    const w = weapon0();
    const S = G.S;
    if (!w || !w.dual || !S) return w;
    const d = owned(S).find(([, fx]) => fx.dual);
    if (!d) return w;
    let c = weaponMemo.get(w);
    if (!c) { c = Object.assign({}, w, { dmg: [w.dmg[0], w.dmg[1], w.dmg[2] + (d[1].dual.dmg || 0)], hit: (w.hit || 0) + (d[1].dual.hit || 0) }); weaponMemo.set(w, c); }
    return c;
  };
  const kiMax0 = K.kiMax;
  K.kiMax = (S) => { S = S || G.S; return Math.min(9, kiMax0(S) + owned(S).reduce((a, [, fx]) => a + (fx.kiMax || 0), 0)); };
  const sleep0 = G.sleep;
  G.sleep = () => {
    const r = sleep0();
    const S = G.S;
    if (S && !S.over) {
      const f = owned(S).reduce((a, [, fx]) => a + (fx.rest || 0), 0);
      if (f && S.hp < S.maxHp) { const n = Math.max(1, Math.ceil(S.maxHp * f)); G.heal(n); G.note(`よく眠れた。HP +${n}`); }
    }
    return r;
  };

  // ---------------------------------------------------------------- 経験から覚える
  function tryLearn(id, cnt, P, why, how) {
    const p = Math.min(P.max, P.base + P.step * Math.max(0, cnt - 1));
    if (G.rand() >= p) return false;
    if (why) G.say(why);
    K.learn(id, how);
    return true;
  }
  // 判定の大成功：理由に合うスキル（まだ持っていないもの）から、大成功を重ねたものを先に
  function learnFrom(reason) {
    const S = G.S;
    const cands = K2.ids.filter((id) => !K.knows(id, S) && SK[id].learn.crit && SK[id].fx.check && SK[id].fx.check.re.test(reason));
    if (!cands.length) return;
    const st = K2.state(S);
    cands.forEach((id) => { st.crit[id] = (st.crit[id] || 0) + 1; });
    const id = cands.slice().sort((a, b) => st.crit[b] - st.crit[a])[0];
    tryLearn(id, st.crit[id], D.K2_CRIT, SK[id].learn.crit.why, "crit");
  }
  K2.learnFrom = learnFrom;
  // ひどい目に遭った（sanity・poison・beast・brink）
  K2.suffer = (kind) => {
    const S = G.S;
    if (!S || S.over) return;
    const cands = K2.ids.filter((id) => !K.knows(id, S) && SK[id].learn.suffer && SK[id].learn.suffer.kind === kind);
    if (!cands.length) return;
    const st = K2.state(S);
    st.suf[kind] = (st.suf[kind] || 0) + 1;
    const id = cands[0];
    tryLearn(id, st.suf[kind], D.K2_SUFFER, SK[id].learn.suffer.why, "suffer");
  };
})(globalThis.G = globalThis.G || {});
