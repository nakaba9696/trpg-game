// 用語説明の帳面（U3）。手引きの世界観の項目は、物語の中で知ったときにはじめて一行ずつ書き足される。
// 項目と開くきっかけは src/data/lore_u3.js（D.LORE・D.LORE_ON）。開いた行は S.lore = { 項目 id: [行の key, ...] }（冒険ごと）。
// 一度見た行は G.P.loreSeen にも残す（冒険をまたぐ記録。画面に出すかは持ち主の判断待ち）。
// 古いセーブで S.lore が無ければ、覚えていること（memo）から静かに開き直す。
// core.js・combat.js・explore.js は書き換えず、関数を包む。レーン U（U3）が管理
(function (G) {
  const D = G.data;

  const list = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  // 開いた行（古いセーブなら memo から作り直す）
  G.loreOf = (S) => {
    if (!S) return {};
    if (!S.lore) {
      S.lore = {};
      (S.memos || []).forEach((t) => G.loreFromText(t, true));
    }
    return S.lore;
  };

  // "<項目>:<行>" を開く。新しく開いたら true
  G.openLore = (trig, quiet) => {
    const S = G.S;
    if (!S || !trig) return false;
    const [id, key0] = String(trig).split(":");
    const e = D.LORE[id];
    if (!e || !e.lines.length) return false;
    const key = key0 || e.lines[0][0];
    if (!e.lines.some((l) => l[0] === key)) return false;
    const lore = G.loreOf(S);
    const got = (lore[id] = lore[id] || []);
    if (got.includes(key)) return false;
    got.push(key);
    if (G.P) {
      const seen = (G.P.loreSeen = G.P.loreSeen || {});
      seen[id] = seen[id] || [];
      if (!seen[id].includes(key)) seen[id].push(key);
    }
    if (!quiet) G.note(`手引きに書き足された：${e.title}`);
    return true;
  };
  G.openLores = (x, quiet) => list(x).forEach((t) => G.openLore(t, quiet));

  // 文の中の hint の言葉から開く（酒場の噂・出来事の memo）
  G.loreFromText = (t, quiet) => {
    if (!t) return;
    const s = String(t);
    Object.entries(D.LORE).forEach(([id, e]) => e.lines.forEach(([key, , opt]) => {
      if (((opt && opt.hint) || []).some((w) => s.includes(w))) G.openLore(`${id}:${key}`, quiet);
    }));
  };

  // 手引きに載せる節（開いた行だけ。見出しは最初の行だけに付ける）
  G.loreSections = (S) => {
    const lore = G.loreOf(S);
    const secs = {};
    Object.entries(D.LORE).forEach(([id, e]) => {
      const keys = lore[id] || [];
      const rows = e.lines.filter((l) => keys.includes(l[0])).sort((a, b) => keys.indexOf(a[0]) - keys.indexOf(b[0]));
      if (!rows.length) return;
      (secs[e.sec] = secs[e.sec] || []).push(...rows.map((l, i) => [i ? "" : e.title, l[1]]));
    });
    const order = D.LORE_SECS || [];
    return Object.keys(secs).sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((k) => [k, secs[k]]);
  };

  const ON = () => D.LORE_ON || {};

  const baseMemo = G.memo;
  G.memo = (t) => { baseMemo(t); G.loreFromText(t); };

  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    if (o && o.lore) G.openLores(o.lore);
  };

  const baseStartEvent = G.startEvent;
  G.startEvent = (ev) => {
    const ok = baseStartEvent(ev);
    if (!ok) return ok;
    const e = D.EVENTS.find((x) => x.id === G.S.event);
    if (e) { G.openLores(e.lore); G.openLores((ON().event || {})[e.id]); }
    return ok;
  };

  const baseStartCombat = G.startCombat;
  G.startCombat = (ids, opt) => {
    baseStartCombat(ids, opt);
    const foe = ON().foe || {};
    list(ids).forEach((id) => {
      const en = D.ENEMIES[id];
      G.openLores(foe[id]);
      if (en && en.majin) G.openLores(foe["@majin"]);
    });
  };

  const baseGive = G.give;
  G.give = (id, n) => {
    const r = baseGive(id, n);
    if (r && G.S) G.openLores((ON().item || {})[id]);
    return r;
  };

  const baseExploreAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    baseExploreAct(head, arg, a);
    if (head === "fac") G.openLores((ON().fac || {})[arg]);
  };

  const baseEndTurn = G.endTurn;
  G.endTurn = () => {
    baseEndTurn();
    const S = G.S;
    if (!S) return;
    const on = ON();
    G.openLores((on.loc || {})[S.loc]);
    Object.entries(on.flag || {}).forEach(([f, t]) => { if (S.flags[f]) G.openLores(t); });
    if (on.crit && (S.counters.crits || S.counters.fumbles)) G.openLores(on.crit);
  };

  const baseNewGame = G.newGame;
  G.newGame = (opt) => {
    const S = baseNewGame(opt);
    S.lore = {};
    G.openLores((ON().goal || {})[S.goal.id], true);
    return S;
  };
})(globalThis.G = globalThis.G || {});
