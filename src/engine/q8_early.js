// Q8：序盤の釣り合い（data/q8_early.js の D.Q8）。combat.js・explore.js は書き換えず、包む：
//   1. 出会い（G.startCombat）：危険度 2 までの場所（町どうしの旅を含む）の行きずりの出会い（探索・野営・旅。出来事の戦いは除く）で、
//      駆け出しのうちは、場所の危険度より強い段の敵を同じ場所の弱い敵に替え、危険度 1 までなら二体組みも減らす。
//      駆け出しを過ぎたら、場所より強い段の敵は連れなしの一体で出る。勝ったときの結果つきの戦い（ボス・出来事の名指し）は触らない
//   2. 見積もり：戦いの始めに「手ごわい」などの言葉で危険を伝える。探索・旅の選択肢の横にも、今のあなたにとっての手ごたえを足す
//   3. 戦いの中で HP が少なくなったら一度だけ知らせる
// 数は出さない（言葉だけ）。乱数は G.rand だけ。セーブに項目は足さない（戦いの間だけ S.combat.q8low を使う）。レーン Q
(function (G) {
  const D = G.data;
  const Q = () => D.Q8;
  const E = (id) => D.ENEMIES[id];
  const avg = (d) => (d ? d[0] * (d[1] + 1) / 2 + d[2] : 0);
  const DEFAULT_POOL = ["bandit", "wolf", "goblin"]; // explore.js の旅の出会いの既定と同じ

  const novice = (S) => ((S.counters && S.counters.kills) || 0) < Q().novice;
  const dangerOf = (id) => ((D.LOCS[id] || {}).danger || 0);
  const dangerNow = (S) => Math.max(dangerOf(S.loc), S.travel ? dangerOf(S.travel) : 0);
  // 今の出会いが引かれる表（場所・旅の行き先の pool と e4pool。どちらにも無ければ旅の既定）
  function poolsNow(S) {
    const locs = [S.loc, S.travel].filter(Boolean).map((l) => D.LOCS[l]).filter((L) => L && (L.pool || []).length);
    if (!locs.length) return [DEFAULT_POOL];
    return locs.map((L) => [...L.pool, ...(L.e4pool || [])]);
  }
  const isRandom = (ids, S) => {
    const pools = poolsNow(S);
    return ids.length > 0 && ids.every((id) => E(id) && !E(id).boss && pools.some((p) => p.includes(id)));
  };

  // ---------------------------------------------------------------- 1. 出会い
  G.q8Shape = (ids) => {
    const S = G.S;
    const dg = dangerNow(S);
    if (dg > Q().upto) return ids;
    const top = Math.max(1, dg);
    let out = ids.slice();
    if (novice(S)) {
      const pools = poolsNow(S);
      const weak = [...new Set(pools.flat())].filter((id) => E(id) && !E(id).boss && (E(id).tier || 1) <= top);
      out = out.map((id) => ((E(id).tier || 1) > top && weak.length ? G.pick(weak) : id));
      if (dg <= 1 && out.length > 1 && G.rand() >= Q().novicePair / 0.4) out = out.slice(0, 1);
    } else {
      const strong = out.find((id) => (E(id).tier || 1) > top);
      if (strong) out = [strong];
    }
    return out;
  };

  // 探索・野営・迷宮・旅（G.exploreAct）の中で、出現表から引かれた出会いだけを軽くする。
  // 出来事の中で始まる戦い（「戦う」を選んだ・しくじった）は、書かれたとおりの敵にする（選択肢の横の見積もりで前もって分かる）
  let inExplore = 0;
  const baseAct = G.exploreAct;
  G.exploreAct = (...a) => { inExplore++; try { return baseAct(...a); } finally { inExplore--; } };
  G.q8Encounter = (ids, opt) => { inExplore++; try { G.startCombat(ids, opt || {}); } finally { inExplore--; } }; // 探索の中の出会いとして始める（テスト用）
  const baseStart = G.startCombat;
  G.startCombat = (ids, opt) => {
    const S = G.S;
    const o = opt || {};
    const list = S && inExplore && S.mode !== "fac" && Array.isArray(ids) && !o.win && isRandom(ids, S) ? G.q8Shape(ids) : ids;
    baseStart(list, opt);
    if (G.S && G.S.combat && !G.S.over) {
      const t = G.q8Threat(G.S.combat.foes.map((f) => f.id));
      if (t) G.say(t.say);
    }
  };

  // ---------------------------------------------------------------- 2. 見積もり
  // 自分の 1 手番の見込みダメージ（武器と、MP があれば炎）と、敵の 1 手番の見込みダメージから、
  // 敵を弱い順に倒し切るまでに受ける傷を見積もり、今の HP と比べる
  G.q8Cost = (ids, mpCap) => {
    const S = G.S;
    const w = G.weapon();
    const armor = G.armor();
    let mp = mpCap == null ? S.mp : Math.min(S.mp, mpCap);
    const foes = ids.map((id) => E(id)).filter(Boolean).sort((a, b) => a.hp - b.hp);
    const dpr = foes.map((e) => (G.clamp(e.hit - Math.floor(G.statEff("敏捷") / 5), 5, 95) / 100) * Math.max(1, avg(e.dmg) - (e.magic ? 0 : armor ? armor.def : 0)));
    let taken = 0, rounds = 0;
    for (let i = 0; i < foes.length; i++) {
      const e = foes[i];
      if (e.majin && !w.pierce) return Infinity;
      const bonus = w.stat === "筋力" ? Math.floor(S.stats.筋力 / 15) : Math.floor(S.stats.敏捷 / 20);
      const melee = (G.chance(w.stat, 0, (w.hit || 0) - e.def) / 100) * (avg(w.dmg) + bonus);
      const fire = (G.chance("魔力", 0, G.gearBonus("fire") + G.magicBonus() - e.mres) / 100) * (7 + Math.floor(S.stats.魔力 / 8));
      const comp = (S.companions || []).reduce((a, c) => a + (G.clamp(c.power - (c.fire ? e.mres : e.def), 5, 95) / 100) * ((c.fire ? 7 : 3.5) + (c.dmg || 0)), 0);
      let hp = e.hp;
      while (hp > 0 && rounds < 60) {
        let dmg = melee;
        if (fire > melee && mp >= 3) { dmg = fire; mp -= 3; }
        hp -= Math.max(0.3, dmg + comp);
        rounds++;
        for (let j = i; j < foes.length; j++) if (j > i || hp > 0) taken += dpr[j];
      }
    }
    return rounds >= 60 ? Infinity : taken;
  };
  const wordOf = (cost) => {
    const S = G.S;
    const r = cost / Math.max(1, S.hp);
    return Q().threat.find((t) => r < t.r) || Q().threat[Q().threat.length - 1];
  };
  G.q8Threat = (ids) => {
    if (!G.S || !ids || !ids.length) return null;
    return wordOf(G.q8Cost(ids));
  };
  // 場所の手ごたえ：出会う敵の表のうち、強いほうから 4 分の 1 あたりの敵（駆け出しのうちの入れ替えも見込む）。
  // そこでは続けて戦うので、MP は最大の半分しか残っていないものとして見る（tests/bot.mjs の areaRisk と同じ考え）
  G.q8Area = (lid) => {
    const S = G.S;
    const L = D.LOCS[lid];
    if (!S || !L || !(L.pool || []).length) return null;
    const dg = L.danger || 0;
    let pool = L.pool.filter((id) => E(id) && !E(id).boss);
    if (dg <= Q().upto && novice(S)) pool = pool.filter((id) => (E(id).tier || 1) <= Math.max(1, dg));
    if (!pool.length) return null;
    const costs = pool.map((id) => G.q8Cost([id], Math.floor(S.maxMp / 2))).sort((a, b) => a - b);
    const c = costs[Math.floor(costs.length * 0.75)] ?? costs[costs.length - 1];
    return wordOf(c * (dg <= 1 && novice(S) ? 1.15 : 1.4)); // 二体組みで出ることがある
  };

  const baseExplore = G.exploreActions;
  G.exploreActions = () => {
    const groups = baseExplore();
    const S = G.S;
    if (!S || S.mode !== "explore") return groups;
    for (const g of groups) for (const a of g.list) {
      let lid = null;
      if (a.id === "explore" || (a.id === "deeper" && !/主/.test(a.sub || ""))) lid = S.loc;
      else if (a.id.startsWith("travel:") && D.LOCS[a.id.slice(7)] && D.LOCS[a.id.slice(7)].type !== "town") lid = a.id.slice(7);
      if (!lid) continue;
      const t = G.q8Area(lid);
      if (t) a.sub = (a.sub ? a.sub + "・" : "") + t.word;
    }
    return groups;
  };

  // 出来事の選択肢：戦いになるもの（選べば戦い・しくじれば戦い）に手ごたえを足す。「その場の敵」は場所の手ごたえで見る。
  // 使徒に挑む選択肢（e3fight）は、どれも命がけ（倒す条件を満たしていなければ、まず勝てない）
  const fightOf = (o) => (o && (o.e3fight ? "e3" : o.fight)) || null;
  const fightWord = (spec) => {
    if (spec === "e3") return Q().threat[Q().threat.length - 1];
    const ids = (Array.isArray(spec) ? spec : [spec]).filter((id) => id !== "@pool" && E(id));
    if (ids.length) return G.q8Threat(ids);
    return G.q8Area(G.S.loc);
  };
  const baseActions = G.actions;
  G.actions = () => {
    const groups = baseActions();
    const S = G.S;
    if (!S || S.mode !== "event") return groups;
    const ev = D.EVENTS.find((x) => x.id === S.event);
    if (!ev) return groups;
    for (const g of groups) for (const a of g.list) {
      const m = /^ev:(\d+)$/.exec(a.id);
      const c = m && ev.choices[Number(m[1])];
      if (!c) continue;
      const sure = c.fight || (!c.stat && fightOf(c.ok));
      const onFail = !sure && c.stat && fightOf(c.ng);
      const t = sure ? fightWord(sure) : onFail ? fightWord(onFail) : null;
      if (!t) continue;
      a.sub = (a.sub ? a.sub + "・" : "") + (sure ? (/戦闘/.test(a.sub || "") ? "" : "戦い・") : "しくじれば戦い・") + t.word;
    }
    return groups;
  };

  // ---------------------------------------------------------------- 3. HP が少ないときの知らせ
  const baseHurt = G.hurt;
  G.hurt = (n, cause) => {
    baseHurt(n, cause);
    const S = G.S;
    const C = S && S.combat;
    if (!C || S.over || S.hp <= 0 || C.q8low || S.hp >= S.maxHp * Q().lowHp) return;
    C.q8low = true;
    G.note(Q().lowHpSay);
  };
})(globalThis.G = globalThis.G || {});
