// Q4：目的の道筋の直し（仕組み）。表は src/data/q4_paths.js
// 1. 使徒を討つ：討った使徒（迷宮の主が使徒の場所の reward.flag）が一体でもいれば、目的を果たしたことにする。
//    エンバルダでない使徒のときの節目（majin_other）と、人生の物語の出来事を足す
// 2. 交易：町の店に「交易」の欄。土地の品を箱で仕入れ、よその町で売る。荷車で積める箱が増える。荷を積んで町に着くと、ときどき荷を抜かれる
// 3. 獣の病がはじめてうつった手番の終わりに、教会のことを口にする人がいる
// 状態：S.q4 = { sold: { "町|品|週": 売った箱 }, profit: 交易の利ざやの合計, cost: { 品: 積んでいる箱の仕入れ値の合計 }, marks: {} }。古いセーブには無い
// core.js・explore.js などは書き換えず、関数を包む。レーン Q（Q4）が管理
(function (G) {
  const D = G.data;
  const Q4 = D.Q4;

  // ---------------------------------------------------------------- 1. 使徒を討つ
  // 使徒が主の迷宮の、討ったときに立つ旗（データから拾う。使徒の居城を足せば、そのまま数える）
  G.majinFlags = () => Object.values(D.LOCS).filter((L) => L.boss && D.ENEMIES[L.boss] && D.ENEMIES[L.boss].majin && L.reward && L.reward.flag).map((L) => L.reward.flag);
  G.majinSlain = (S) => { S = S || G.S; const f = (S && S.flags) || {}; return G.majinFlags().filter((k) => f[k]); };

  const goalDone0 = G.goalDone;
  G.goalDone = (S) => (S && S.goal && S.goal.id === "majin" ? G.majinSlain(S).length > 0 : goalDone0(S));

  if (D.M6) {
    const MS = D.M6.MILESTONES;
    if (!MS.some((m) => m.id === Q4.MAJIN_MILESTONE.id)) {
      const i = MS.findIndex((m) => m.id === "majin");
      const m = Object.assign({}, Q4.MAJIN_MILESTONE, { test: (S) => !S.flags.graw && G.majinSlain(S).length > 0 });
      MS.splice(i + 1, 0, m);
    }
    const H = D.M6.HIGHLIGHTS;
    if (!H.some((h) => h.key === Q4.MAJIN_HIGHLIGHT.key)) {
      H.push(Object.assign({}, Q4.MAJIN_HIGHLIGHT, { test: (L) => !L.flags.graw && G.majinFlags().some((k) => L.flags[k]) }));
    }
  }

  // ---------------------------------------------------------------- 2. 交易
  const st = (S) => {
    S.q4 = S.q4 || {};
    S.q4.sold = S.q4.sold || {};
    S.q4.cost = S.q4.cost || {};
    S.q4.marks = S.q4.marks || {};
    S.q4.profit = S.q4.profit || 0;
    return S.q4;
  };
  const isGood = (id) => !!Q4.GOODS[id];
  const load = (S) => Object.keys(Q4.GOODS).reduce((a, id) => a + ((S.inv && S.inv[id]) || 0), 0);
  const cap = (S) => ((S.inv && S.inv[Q4.CART.id]) ? Q4.LOAD_CART : Q4.LOAD);
  const week = (S) => Math.floor(((S.day || 1) - 1) / 7);

  // 町と町の日数（陸路と船。いちばん近い道）
  const distCache = {};
  const days = (a, b) => {
    const key = a + "|" + b;
    if (distCache[key] !== undefined) return distCache[key];
    const dist = { [a]: 0 };
    const todo = [a];
    while (todo.length) {
      todo.sort((x, y) => dist[y] - dist[x]);
      const u = todo.pop();
      const L = D.LOCS[u];
      // 値の上がり方は道のり（近い・遠い。C16 が日数に直す前の L.legs）で測る
      const next = [...Object.entries(L.legs || L.links || {}), ...Object.entries(L.sea || {}).map(([k, s]) => [k, s.legs || s.days])];
      for (const [v, d] of next) {
        if (!D.LOCS[v]) continue;
        const nd = dist[u] + d;
        if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; todo.push(v); }
      }
    }
    return (distCache[key] = dist[b] === undefined ? 30 : dist[b]);
  };
  // 決まった揺れ（乱数を使わない。同じ週・同じ町・同じ品なら同じ値）
  const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0; return h; };
  const swing = (loc, id, w) => 0.85 + (hash(`${loc}|${id}|${w}`) % 1000) / 1000 * 0.3;

  G.q4BuyPrice = (id, loc) => {
    const g = Q4.GOODS[id];
    const S = G.S;
    return Math.max(1, Math.round(g.price * (0.95 + (hash(`${loc}|${id}|${week(S)}|buy`) % 100) / 1000)));
  };
  G.q4SellPrice = (id, loc) => {
    const S = G.S;
    const g = Q4.GOODS[id];
    const q = st(S);
    const w = week(S);
    let p;
    if (loc === g.from) p = g.price * 0.8;
    else p = g.price * Math.min(2, 1 + 0.12 * days(g.from, loc)) * ((g.want && g.want[loc]) || 1) * swing(loc, id, w);
    const n = q.sold[`${loc}|${id}|${w}`] || 0;
    p *= Math.max(0.7, 1 - 0.02 * n);
    return Math.max(1, Math.round(p));
  };

  const hasShop = (L) => L && L.type === "town" && (L.fac || []).includes("shop");
  const facActions0 = G.facActions;
  G.facActions = () => {
    const groups = facActions0();
    const S = G.S;
    if (S.fac !== "shop") return groups;
    const L = G.loc();
    // 荷は「売る」の一覧から外す（交易の欄で売る）
    groups.forEach((g) => { if (g.title === "売る") g.list = g.list.filter((a) => !isGood(a.id.replace(/^shop:sell:/, ""))); });
    const i = groups.findIndex((g) => g.title === "売る");
    if (i >= 0 && !groups[i].list.length) groups.splice(i, 1);
    const list = [];
    const n = load(S), c = cap(S);
    Object.entries(Q4.GOODS).forEach(([id, g]) => {
      if (g.from !== S.loc) return;
      const p = G.q4BuyPrice(id, S.loc);
      list.push({ id: "q4:buy:" + id, label: `${g.name}を一箱仕入れる`, sub: `${p}G・荷 ${n}/${c}箱`, disabled: S.gold < p || n >= c, kw: ["仕入", "交易", g.name] });
    });
    Object.keys(Q4.GOODS).forEach((id) => {
      const k = (S.inv && S.inv[id]) || 0;
      if (!k) return;
      const p = G.q4SellPrice(id, S.loc);
      const avg = Math.round((st(S).cost[id] || 0) / k);
      list.push({ id: "q4:sell:" + id, label: `${Q4.GOODS[id].name}を一箱売る（${k}）`, sub: `${p}G${avg ? `・仕入れ ${avg}G` : ""}`, kw: ["売", "交易", Q4.GOODS[id].name] });
    });
    if (Q4.CART.sold.includes(S.loc) && !(S.inv && S.inv[Q4.CART.id])) {
      list.push({ id: "q4:cart", label: `${Q4.CART.name}を買う`, sub: `${Q4.CART.price}G・積める箱 ${Q4.LOAD}→${Q4.LOAD_CART}`, disabled: S.gold < Q4.CART.price, kw: ["荷車", "買"] });
    }
    if (list.length && hasShop(L)) groups.splice(groups.length - 1, 0, { title: "交易（箱で仕入れ、よその町で売る）", list });
    return groups;
  };

  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "q4") return exploreAct0(head, arg, a);
    const S = G.S;
    const q = st(S);
    const [kind, id] = arg.split(":");
    if (kind === "buy") {
      const g = Q4.GOODS[id];
      const p = G.q4BuyPrice(id, S.loc);
      if (!g || g.from !== S.loc || S.gold < p || load(S) >= cap(S)) return;
      S.gold -= p;
      G.give(id);
      q.cost[id] = (q.cost[id] || 0) + p;
      G.log("you", `${g.name}を一箱仕入れる`);
      if (!q.bought) { q.bought = true; G.say(Q4.TEXT.buyFirst); G.chron(`${G.loc().name}で、はじめて荷を仕入れる`, "event"); if (G.openLore) G.openLore("koueki:first"); }
      G.note(`${g.name}を積んだ。（-${p}G・荷 ${load(S)}/${cap(S)}箱）`);
    } else if (kind === "sell") {
      const g = Q4.GOODS[id];
      const k = (S.inv && S.inv[id]) || 0;
      if (!g || !k) return;
      const p = G.q4SellPrice(id, S.loc);
      const avg = (q.cost[id] || 0) / k;
      G.take(id);
      q.cost[id] = Math.max(0, (q.cost[id] || 0) - avg);
      S.gold += p;
      const key = `${S.loc}|${id}|${week(S)}`;
      q.sold[key] = (q.sold[key] || 0) + 1;
      // 古い週の売り数は捨てる（セーブが太らないように）
      Object.keys(q.sold).forEach((x) => { if (Number(x.split("|")[2]) < week(S) - 1) delete q.sold[x]; });
      q.profit += Math.round(p - avg);
      G.log("you", `${g.name}を一箱売る`);
      G.say(G.pick(Q4.TEXT.sell));
      G.note(`+${p}G（仕入れ ${Math.round(avg)}G）`);
      if (G.openLore) {
        if ((g.want || {})[S.loc] && p > avg * 1.3) G.openLore("koueki:want");
        if (q.sold[key] >= 3) G.openLore("koueki:glut");
      }
      Q4.PROFIT_MARKS.forEach(([n, text]) => { if (q.profit >= n && !q.marks[n]) { q.marks[n] = true; G.chron(text, "event"); if (n >= 5000) S.flags.q4_trader = true; } });
    } else if (kind === "cart") {
      if (!Q4.CART.sold.includes(S.loc) || S.gold < Q4.CART.price || (S.inv && S.inv[Q4.CART.id])) return;
      S.gold -= Q4.CART.price;
      G.give(Q4.CART.id);
      G.log("you", `${Q4.CART.name}を買う`);
      G.say(Q4.TEXT.cart);
    }
  };

  // 荷を積んで町に着くと、ときどき荷を抜かれる
  const arrive0 = G.arrive;
  G.arrive = (dest) => {
    arrive0(dest);
    const S = G.S;
    if (!S || S.over || D.LOCS[dest].type !== "town" || !load(S) || G.rand() >= Q4.ROB) return;
    const have = Object.keys(Q4.GOODS).filter((id) => S.inv[id]);
    const id = G.pick(have);
    const n = Math.min(S.inv[id], 1 + Math.floor(G.rand() * 2));
    const q = st(S);
    q.cost[id] = Math.max(0, (q.cost[id] || 0) * (1 - n / S.inv[id]));
    G.take(id, n);
    G.say(Q4.TEXT.rob);
    G.note(`${Q4.GOODS[id].name}を ${n} 箱なくした。`);
    if (G.openLore) G.openLore("koueki:rob");
  };

  // 人生の物語：交易でひと財産を築いた
  if (D.M6 && !D.M6.HIGHLIGHTS.some((h) => h.key === "q4_trader")) {
    D.M6.HIGHLIGHTS.push({ key: "q4_trader", score: 7, test: (L) => L.flags.q4_trader,
      lines: ["{name}は、剣より荷車で名を上げた{hear}車輪のひとつが決まった所で鳴る荷車だった、というところまで、話はやけに細かい。"] });
  }

  // ---------------------------------------------------------------- 3. 獣の病の手がかり
  // 手番の終わりに、病がはじめてうつったかを見る（sanity_m5.js より先に読まれても動くように）
  const endTurn0 = G.endTurn;
  G.endTurn = () => {
    endTurn0();
    const S = G.S;
    if (!S || S.over || !(S.beast >= 1) || (S.q4 && S.q4.beastHint)) return;
    st(S).beastHint = true;
    const H = Q4.BEAST_HINT;
    if (G.loc().type === "town") G.say(G.pick(H.town));
    else if ((S.companions || []).length) {
      const c = G.pick(S.companions);
      G.say(G.pick(H.wild).replace(/\{n\}/g, G.m2Short ? G.m2Short(c) : c.name));
    } else G.say(H.alone);
  };
})(globalThis.G = globalThis.G || {});
