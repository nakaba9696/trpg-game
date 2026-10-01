// U7：手引きの国・種族・教会・遺跡の品・格・術・魔物の項目（src/data/lore_u7.js）を、物語で出てきたときに開く。
// lore.js が見るきっかけ（loc・fac・foe・item・event）に加えて、ここで見るもの：
//   手番の終わり：今いる場所の地方（LORE_ON.region）・会った C2 の人物の国（LORE_ON.nation）と種族・連れている仲間と自分の種族（LORE_ON.race）・職業（LORE_ON.cls）・はじめての旅
//   戦闘：人でない敵にはじめて会った（凶暴な魔物）・格の高い敵（格）・使徒（格の注意書き）・術を使う敵（術）
//   術を使った（炎の魔法・M1 の術）・遺跡の品（D.ITEMS の relic: true）を得た
// 古いセーブ（S.u7lore が無く、手番が進んでいる）は、訪れた場所・会った人・覚えていること（memo）から静かに開き直す。
// core.js・combat.js・explore.js・lore.js は書き換えず、包む。レーン U（U7）が管理
(function (G) {
  const D = G.data;
  if (!G.openLores || !D.LORE || !D.LORE.u7_veld) return;

  const ON = () => D.LORE_ON || {};
  const HUMAN = new Set(["bandit", "banditboss", "guard", "deserter", "ninja", "warlock", "blackknight", "royalguard", "m2_traitor", "m3_hunter", "c2_nora", "c2_angelica", "c2_zork", "m5_feverfolk", "m5_nightwatch"]);

  // 今の状態から開けるきっかけ（手番の終わりと、古いセーブの開き直しで使う）
  const fromState = (S, quiet) => {
    const on = ON();
    const L = D.LOCS[S.loc];
    if (L) G.openLores((on.region || {})[L.region], quiet);
    if (S.counters && S.counters.travels) G.openLores("u7_veld", quiet);
    G.openLores((on.cls || {})[S.cls], quiet);
    const race = (r) => (G.r1Of ? G.r1Of(r) : r || {}).race;
    G.openLores((on.race || {})[race(S.profile)], quiet);
    (S.companions || []).forEach((c) => G.openLores((on.race || {})[c.race], quiet));
    const met = (S.c2 && S.c2.met) || {};
    Object.keys(met).forEach((id) => {
      const p = (D.C2_PEOPLE || {})[id];
      if (!p) return;
      G.openLores((on.nation || {})[p.nation], quiet);
      G.openLores((on.race || {})[p.race], quiet);
    });
    const lore = S.lore || {};
    if ((lore.u7_races || []).includes("beast") && lore.beast) G.openLores("u7_races:curse", quiet);
  };

  // 古いセーブ：訪れた場所・覚えていること・倒した数から、静かに開き直す
  const baseLoreOf = G.loreOf;
  G.loreOf = (S) => {
    const lore = baseLoreOf(S);
    if (S && !S.u7lore && S.turn > 0 && S === G.S) {
      S.u7lore = 1;
      const on = ON();
      Object.keys(S.visited || {}).forEach((id) => {
        const L = D.LOCS[id];
        if (!L) return;
        G.openLores((on.loc || {})[id], true);
        G.openLores((on.region || {})[L.region], true);
      });
      (S.memos || []).forEach((t) => {
        const s = String(t);
        Object.entries(D.LORE).forEach(([id, e]) => {
          if (!id.startsWith("u7_")) return;
          e.lines.forEach(([key, , opt]) => { if (((opt && opt.hint) || []).some((w) => s.includes(w))) G.openLore(`${id}:${key}`, true); });
        });
      });
      if (S.counters && S.counters.kills) G.openLore("u7_fierce", true);
      if (S.counters && S.counters.bosses) G.openLore("u7_rank", true);
      Object.keys(S.inv || {}).forEach((id) => { const it = D.ITEMS[id]; if (it && it.relic) G.openLore("u7_relic", true); });
      fromState(S, true);
    }
    return lore;
  };

  const baseNewGame = G.newGame;
  G.newGame = (opt) => {
    const S = baseNewGame(opt);
    S.u7lore = 1; // 新しい冒険は、はじめから載る節だけ
    return S;
  };

  const baseEndTurn = G.endTurn;
  G.endTurn = () => {
    baseEndTurn();
    if (G.S && !G.S.over) fromState(G.S);
  };

  const baseStartCombat = G.startCombat;
  G.startCombat = (ids, opt) => {
    baseStartCombat(ids, opt);
    if (!G.S) return;
    [].concat(ids || []).forEach((id) => {
      const e = D.ENEMIES[id];
      if (!e) return;
      if (!HUMAN.has(id) && !String(id).startsWith("c2_")) G.openLore("u7_fierce");
      if (e.boss || (e.tier || 0) >= 4) G.openLore("u7_rank");
      if (e.majin) G.openLore("u7_rank:notice");
      if (e.magic) G.openLore("u7_jutsu");
    });
  };

  const baseCombatAct = G.combatAct;
  G.combatAct = (arg) => {
    const r = baseCombatAct(arg);
    if (G.S && (arg === "fire" || (D.SPELLS && D.SPELLS[arg] && !D.SPELLS[arg].base))) G.openLore("u7_jutsu");
    return r;
  };

  const baseGive = G.give;
  G.give = (id, n) => {
    const r = baseGive(id, n);
    const it = D.ITEMS[id];
    if (r && G.S && it && it.relic) G.openLores(["u7_relic", "u7_relic:market"]);
    return r;
  };
})(globalThis.G = globalThis.G || {});
