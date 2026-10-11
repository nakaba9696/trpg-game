// R11：能力値は 99 で止まる（持ち主の決定。VISION の「99 まで」にそろえる。中 17）。
// - 成長（G.grow）：99 に着いたら、それ以上は経験もたまらない
// - 装備・祝福・状態の補正（G.statEff）：足しても 99 を超えない（下げる補正はそのまま効く）
// - 古いセーブで 99 を超えている値は、読み込むとき（G.fixOldNames）に 99 に。手番の終わりにも念のため止める
// core.js・ほかの包みは書き換えず、いちばん外から包む。レーン C（コア）
(function (G) {
  const D = G.data;
  const MAX = (G.STAT_MAX = 99);

  const clampStats = (S) => {
    if (!S || !S.stats) return false;
    let hit = false;
    (D.STATS || Object.keys(S.stats)).forEach((k) => {
      if (typeof S.stats[k] === "number" && S.stats[k] > MAX) { S.stats[k] = MAX; hit = true; if (S.s5exp) S.s5exp[k] = 0; }
    });
    if (hit && G.maxHpOf && G.maxMpOf) {
      const hp = G.maxHpOf(S.stats), mp = G.maxMpOf(S.stats);
      S.maxHp = hp; S.hp = Math.min(S.hp, hp);
      S.maxMp = mp; S.mp = Math.min(S.mp, mp);
    }
    return hit;
  };
  G.clampStats = clampStats;

  const grow0 = G.grow;
  G.grow = (k, n) => {
    const S = G.S;
    const a = S && S.stats ? S.stats[k] : 0;
    if (typeof a === "number" && a >= MAX) {
      if (a > MAX) clampStats(S);
      if (S.s5exp) S.s5exp[k] = 0;
      return [MAX, MAX, 0];
    }
    const r = grow0(k, n);
    if (S && S.stats && S.stats[k] > MAX) {
      clampStats(S);
      return [r[0], MAX, r[2]];
    }
    if (S && S.stats && S.stats[k] === MAX && S.s5exp) S.s5exp[k] = 0;
    return r;
  };

  const eff0 = G.statEff;
  G.statEff = (k) => Math.min(MAX, eff0(k));

  // 99 に着いた能力は、次の点までの進みを出さない
  const prog0 = G.s5Progress;
  if (prog0) G.s5Progress = (k, S) => { S = S || G.S; return S && S.stats && S.stats[k] >= MAX ? 0 : prog0(k, S); };

  const fix0 = G.fixOldNames;
  G.fixOldNames = (S) => {
    const r = fix0 ? fix0(S) : S;
    try { clampStats(S); } catch (e) { /* 読めない形は、そのまま */ }
    return r;
  };
  const endTurn0 = G.endTurn;
  G.endTurn = () => { endTurn0(); clampStats(G.S); };
})(globalThis.G = globalThis.G || {});
