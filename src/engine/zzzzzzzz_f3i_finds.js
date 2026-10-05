// F3：癖のある品（条件で効き目が変わる・組み合わせで化ける）と、掘り出し物（店にごくまれに並ぶ）・珍品の取り替え。データは src/data/items_f3i.js。
// 癖（it.quirk）は、装備の引き方（G.weapon・G.armor・G.ring）を包んで、条件が満ちているあいだだけ効き目を足した写しを返す
// （戦闘・判定は今までどおり G.weapon() などを読むだけなので、combat.js は書き換えない）。能力値と行動の補正（stats・bonus）は
// G.statEff・G.gearBonus に足す。持っているだけの品（type "gear"）の癖も同じく足す。
// 癖が効きはじめた・切れたときは記録に一行（装備しているものだけ）。
// セーブに足す項目（古いセーブで無くても動く）：S.f3i = { on { 品の id: 効いているか } }
// 名前の頭の zzzzzzzz は I3（zzz_gear_i3.js）と F3 の節目のあとに読ませるため。DOM には触らない。レーン I（F3）
(function (G) {
  const D = G.data;
  const F = D.F3I;
  const API = (G.f3i = G.f3i || {});
  if (!F) return;
  const RAW = D.ITEMS;

  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const held = (S, id) => !!((S.inv && S.inv[id] > 0) || S.weapon === id || S.armor === id || S.ring === id);

  // ---------------------------------------------------------------- 条件
  API.POOR = 50;
  API.RICH = 500;
  let inStat = false;
  API.when = (w, S, need) => {
    S = S || G.S;
    if (!S) return false;
    const C = G.c10;
    switch (w) {
      case "night": return (S.phase || 0) >= 2;
      case "day": return (S.phase || 0) < 2;
      case "wet": return ["雨", "雪", "霧"].includes(S.weather);
      case "dry": return S.weather === "晴";
      case "alone": return !(S.companions || []).length;
      case "party": return (S.companions || []).length > 0;
      case "poor": return (S.gold || 0) < API.POOR;
      case "rich": return (S.gold || 0) >= API.RICH;
      case "hurt": return S.maxHp > 0 && S.hp <= S.maxHp / 3;
      case "sinful": return !!(C && C.sinful(S));
      case "pure": return !!(C && C.pure(S));
      default: break;
    }
    let m = /^stat:(.+)$/.exec(w || "");
    if (m) {
      // 能力値の今の点（装備の補正込み）。防具の癖が敏捷を見るときに輪にならないよう、入れ子では素の点
      if (inStat || S !== G.S) return ((S.stats || {})[m[1]] || 0) >= (need || 0);
      inStat = true;
      try { return Math.floor(baseStatEff(m[1]) + 1e-9) >= (need || 0); } finally { inStat = false; }
    }
    m = /^pair:(.+)$/.exec(w || "");
    if (m) return held(S, m[1]);
    return false;
  };
  // 品の、今効いている足し分（{ fx の欄 }）。条件が一つも無い品は null
  API.fx = (it, S) => {
    if (!it || !Array.isArray(it.quirk)) return null;
    const out = {};
    it.quirk.forEach((q) => { const fx = API.when(q.when, S, q.need) ? q.on : q.off; if (fx) add(out, fx); });
    return out;
  };
  // 効いている癖があるか（on の側が効いている）
  API.active = (it, S) => !!(it && Array.isArray(it.quirk) && it.quirk.some((q) => q.on && API.when(q.when, S, q.need)));
  function add(o, fx) {
    ["dmg", "hit", "vital", "first", "magic", "def", "agi"].forEach((k) => { if (fx[k]) o[k] = (o[k] || 0) + fx[k]; });
    if (fx.drain) o.drain = (o.drain || 0) + fx.drain;
    ["stats", "bonus"].forEach((g) => Object.entries(fx[g] || {}).forEach(([k, n]) => { o[g] = o[g] || {}; o[g][k] = (o[g][k] || 0) + n; }));
  }

  // ---------------------------------------------------------------- 装備の引き方を包む（効いている分を足した写し）
  const memo = new Map();
  const withFx = (it) => {
    if (!it || !it.quirk) return it;
    const fx = API.fx(it, G.S);
    const key = JSON.stringify(fx);
    const mk = memo.get(it);
    if (mk && mk.key === key) return mk.it;
    const c = Object.assign({}, it);
    if (c.dmg && fx.dmg) c.dmg = [c.dmg[0], c.dmg[1], c.dmg[2] + fx.dmg];
    ["hit", "vital", "first", "magic", "def", "agi"].forEach((k) => { if (fx[k]) c[k] = (c[k] || 0) + fx[k]; });
    if (fx.drain) c.drain = Math.round(((c.drain || 0) + fx.drain) * 100) / 100;
    memo.set(it, { key, it: c });
    return c;
  };
  ["weapon", "armor", "ring"].forEach((slot) => {
    const base = G[slot];
    G[slot] = () => withFx(base());
  });
  // 能力値と行動の補正（stats・bonus）は、身に着けている品と、持っているだけの品（gear）の癖から。
  // 判定のたびに呼ばれるので、癖のある品を何も持っていなければすぐ返す（持ち物を毎回すべて見ない）
  const GEAR_Q = Object.keys(RAW).filter((id) => RAW[id].type === "gear" && RAW[id].quirk);
  const quirkItems = (S) => {
    let out = null;
    for (const id of [S.weapon, S.armor, S.ring]) { const it = id && RAW[id]; if (it && it.quirk) (out = out || []).push(it); }
    for (const id of GEAR_Q) if (S.inv && S.inv[id] > 0) (out = out || []).push(RAW[id]);
    return out;
  };
  const NONE = {};
  const sumFx = (S) => { const l = quirkItems(S); if (!l) return NONE; const o = {}; l.forEach((it) => { const fx = API.fx(it, S); if (fx) add(o, fx); }); return o; };
  const baseStatEff = G.statEff;
  G.statEff = (k) => {
    const v = baseStatEff(k);
    const S = G.S;
    if (!S) return v;
    const n = ((sumFx(S).stats || {})[k]) || 0;
    return n ? v + G.s5Mod(n) : v;
  };
  const baseGearBonus = G.gearBonus;
  G.gearBonus = (kind) => {
    const b = baseGearBonus(kind);
    const S = G.S;
    return S ? b + (((sumFx(S).bonus || {})[kind]) || 0) : b;
  };

  // ---------------------------------------------------------------- 癖が効きはじめた・切れた（身に着けている品だけ。手番の終わりに）
  API.LINES = { on: "{name}が、手の中で目を覚ました。", off: "{name}が、ふっと静かになった。" };
  const endTurn0 = G.endTurn;
  G.endTurn = () => {
    endTurn0();
    const S = G.S;
    if (!S || S.over) return;
    const x = (S.f3i = S.f3i || { on: {} });
    x.on = x.on || {};
    [S.weapon, S.armor, S.ring].forEach((id) => {
      const it = id && RAW[id];
      if (!it || !it.quirk) return;
      const now = API.active(it, S);
      if (id in x.on && x.on[id] !== now) G.note((now ? API.LINES.on : API.LINES.off).replace("{name}", it.name) + (it.hint ? `（${it.hint}）` : ""));
      x.on[id] = now;
    });
  };

  // ---------------------------------------------------------------- 札の文：癖の手がかり
  const baseItemEffect = G.itemEffect;
  if (baseItemEffect) G.itemEffect = (it) => { const s = baseItemEffect(it); return it && it.quirk && it.hint ? [s, `癖：${it.hint}`].filter(Boolean).join("・") : s; };

  // ---------------------------------------------------------------- 掘り出し物（店の「今日の品」に、ごくまれに）
  API.marketFind = (loc, day, S) => {
    S = S || G.S;
    const L = D.LOCS[loc];
    if (!S || !L || L.type !== "town" || !(L.fac || []).includes("shop")) return null;
    const seed = hash(`${(S.profile && S.profile.name) || ""}|${S.cls}|${loc}|${day}|f3i`);
    if ((seed % 1000) / 1000 >= F.MARKET_ODDS) return null;
    // 品は日と町と人物だけで決まる（持っている品なら、その日は並ばない）
    const pool = F.MARKET.filter((id) => RAW[id]);
    const id = pool.length ? pool[(seed >>> 10) % pool.length] : null;
    return id && !held(S, id) ? id : null;
  };
  API.price = (id) => Math.round((RAW[id] ? RAW[id].price : 0) * F.MARKET_MARKUP);
  if (G.i3 && G.i3.stock) {
    const stock0 = G.i3.stock;
    G.i3.stock = (loc, day) => {
      const S = G.S;
      const list = stock0(loc, day);
      const id = API.marketFind(loc || S.loc, day || S.day, S);
      const b = S && S.i3 && S.i3.bought;
      const gone = b && b.key === G.i3.stockKey(loc || S.loc, day || S.day) ? b.ids : [];
      return id && !gone.includes(id) && !list.includes(id) ? list.concat(id) : list;
    };
  }
  // 掘り出し物の札（値段は少し高い。「掘り出し物」と添える）と、買うとき
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    if (S.fac !== "shop") return g;
    const id = API.marketFind(S.loc, S.day, S);
    if (!id) return g;
    g.forEach((grp) => (grp.list || []).forEach((a) => {
      if (a.id !== "shop:buy:" + id) return;
      const p = API.price(id);
      a.label = `掘り出し物：${RAW[id].name}`;
      const eff = G.i3 && G.i3.effectText ? G.i3.effectText(RAW[id]) : "";
      a.sub = [`${p}G`, eff, RAW[id].hint ? "癖：" + RAW[id].hint : ""].filter(Boolean).join("・");
      a.disabled = S.gold < p;
    }));
    return g;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (head === "shop" && /^buy:/.test(arg)) {
      const id = arg.slice(4);
      if (id === API.marketFind(S.loc, S.day, S)) {
        const extra = API.price(id) - RAW[id].price;
        if (S.gold < API.price(id)) return;
        const r = facAct0(head, arg, a);
        if (extra > 0) { S.gold -= extra; G.note(`掘り出し物の上乗せ（-${extra}G）`); }
        G.say("店主は、あなたが選んだ品を見て、一瞬だけ惜しそうな顔をした。");
        return r;
      }
    }
    return facAct0(head, arg, a);
  };

  // ---------------------------------------------------------------- 蒐集家との取り替え（出来事の結果 f3iTrade）
  const apply0 = G.apply;
  G.apply = (o) => {
    const r = apply0(o);
    const S = G.S;
    if (!o || !o.f3iTrade || !S || S.over) return r;
    const cur = (F.CURIOS || []).find((id) => S.inv && S.inv[id] > 0);
    const pool = (F.TRADE || []).filter((id) => RAW[id] && !held(S, id));
    if (!cur || !pool.length) { G.say("……と言いかけて、男は首を振った。今日は、釣り合う品の持ち合わせが無いらしい。"); return r; }
    const got = G.pick(pool);
    G.take(cur);
    G.give(got);
    G.say(`布の中身は、${RAW[got].name}だった。男は${RAW[cur].name}を光にかざし、うっとりと眺めていた。`);
    G.note(`${RAW[cur].name}を渡し、${RAW[got].name}を手に入れた。`);
    G.chron(`蒐集家と、${RAW[cur].name}を${RAW[got].name}に取り替える`);
    return r;
  };
})(globalThis.G = globalThis.G || {});
