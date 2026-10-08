// K5：技の巻物の入手（データは src/data/k5_scrolls.js）。巻物は読めば必ず覚える（K1 の K.readScroll）
//   1. 巻物の段（D.K5.tier）：1 初級・2 中級・3 上級。初級は町の店に並ぶ（データで K1_SHOP を初級に絞る）
//   2. 中級・上級の入手は三つ。上級は中級と同じ道で、条件が重く見込みが低い
//      人から：師（D.K5_GIVERS）が、師の条件と D.K5.GIVE（名声か依頼の数）に届いた者に、段ごとに一本譲る（S.k5.gift）。
//              打ち解けた仲間（D.K5.BOND）が、野営の夜に一本くれる（一人一度）
//      依頼の礼：ギルドの依頼を報告したとき、依頼の場所の危険度で段と見込みが決まる（D.K5.QUEST。K3 の礼はこれに置き換える）
//      落とし物：強い敵だけ（データ）
//   3. 出来事の巻物（K1 の結果 k1scroll）は初級まで。結果 k5miss { p, text }：p の見込みで、巻物の代わりに外れの一文になる
//   4. 図鑑の入手場所に、師・仲間・依頼の礼を足す
// セーブに足すもの：S.k5 = { gift: {"t:師:段" か 仲間: 1} }（古いセーブに無くても動く）。DOM には触らない。乱数は G.rand / G.pick。レーン C（K5）
(function (G) {
  const D = G.data;
  const K = G.k1;
  if (!K || !D.K5 || !D.SKILLS) return;
  const SK = D.SKILLS;
  const X = (G.k5 = G.k5 || {});
  const P = D.K5;
  if (D.K3) D.K3.QUEST = 0;   // 依頼の礼は下の G.facAct で

  X.state = (S) => { S = S || G.S; S.k5 = S.k5 || {}; S.k5.gift = S.k5.gift || {}; return S.k5; };
  X.tier = (id) => P.tier(id);
  X.itemTier = (item) => { const it = D.ITEMS[item]; return it && it.type === "k1scroll" ? P.tier(it.skill) : 0; };
  X.scrolls = () => Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].type === "k1scroll" && SK[D.ITEMS[id].skill]).sort();

  // ---------------------------------------------------------------- 巻物を一つ
  // kind："combat"|"field"|"old"|"any"。cap 段の上限（無ければ D.K5.EVENT_TIER）。only を渡すとその段だけ。まだ覚えていない技を先に
  K.randomScroll = (kind, cap, only) => {
    cap = cap || P.EVENT_TIER;
    const all = X.scrolls().filter((id) => {
      const it = D.ITEMS[id];
      const s = SK[it.skill];
      if (kind === "old") return !!it.old;
      if (kind === "combat") return s.kind === "combat" || s.kind === "both";
      if (kind === "field") return s.kind === "field" || s.kind === "passive";
      return true;
    });
    let fit = only ? all.filter((id) => X.itemTier(id) === only) : all.filter((id) => X.itemTier(id) <= cap);
    // その種類に上限までの段が無ければ、いちばん低い段から（古い字の巻物は中級しか無い）
    if (!fit.length && !only && all.length) { const low = Math.min(...all.map((id) => X.itemTier(id))); fit = all.filter((id) => X.itemTier(id) === low); }
    const fresh = fit.filter((id) => !K.knows(D.ITEMS[id].skill));
    const pool = fresh.length ? fresh : fit;
    return pool.length ? G.pick(pool) : null;
  };
  X.give = (id, text) => {
    if (!id || !G.give(id)) return null;
    if (text) G.say(text);
    G.note(`${D.ITEMS[id].name}を手に入れた。`);
    return id;
  };

  // ---------------------------------------------------------------- 人から：師が譲る
  X.giveOk = (tid, tier, S) => {
    S = S || G.S;
    const n = P.GIVE[tier];
    const T = D.K1_TEACHERS[tid];
    if (!n || !T || !T.fac || !K.teacherOk(tid, S)) return false;
    const f = (S.fame || 0) >= n.fame, q = ((S.counters && S.counters.quests) || 0) >= n.quests;
    return n.both ? f && q : f || q;
  };
  X.giverList = (tid, tier, S) => (((D.K5_GIVERS[tid] || {})[tier]) || []).filter((id) => SK[id] && D.ITEMS[D.K1_SCROLL(id)] && !K.knows(id, S));
  // その施設で今譲ってもらえるもの [{ tid, tier }]（条件に届かない者には出さない）
  X.offers = (S) => {
    S = S || G.S;
    const st = X.state(S);
    const out = [];
    Object.keys(D.K5_GIVERS).forEach((tid) => {
      const T = D.K1_TEACHERS[tid];
      if (!T || T.fac !== S.fac) return;
      [2, 3].forEach((tier) => { if (!st.gift[`t:${tid}:${tier}`] && X.giveOk(tid, tier, S) && X.giverList(tid, tier, S).length) out.push({ tid, tier }); });
    });
    return out;
  };
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    if (!S || S.over || S.mode !== "fac") return g;
    const list = X.offers(S).map(({ tid, tier }) => ({ id: `k5gift:${tid}:${tier}`, label: `${D.K1_TEACHERS[tid].name}に、${tier >= 3 ? "秘伝の" : ""}巻物を譲ってもらう`, sub: `${tier >= 3 ? "上級" : "中級"}の技・一度きり`, kw: ["巻物", "譲", D.K1_TEACHERS[tid].name] }));
    if (!list.length) return g;
    g.splice(Math.max(0, g.length - 1), 0, { title: "譲ってもらう", list });
    return g;
  };
  const LINE = {
    2: "「書き写したのが一本余っている。持っていけ。体で覚えるのは、あんたの仕事だ」",
    3: "「これは人に見せるために書いたものではない。だが今のあんたになら預けてもいい」",
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (head === "k5gift") {
      const [tid, t] = String(arg).split(":");
      const tier = +t;
      const T = D.K1_TEACHERS[tid];
      const st = X.state(S);
      if (!T || T.fac !== S.fac || st.gift[`t:${tid}:${tier}`] || !X.giveOk(tid, tier, S)) return;
      const list = X.giverList(tid, tier, S);
      if (!list.length) return;
      st.gift[`t:${tid}:${tier}`] = 1;
      G.log("you", `${T.name}に巻物を譲ってもらう`);
      G.say(`${T.name}は奥から油紙の包みを出してきた。${LINE[tier] || LINE[2]}`);
      X.give(D.K1_SCROLL(G.pick(list)));
      return;
    }
    // 依頼の礼：危うい場所の依頼ほど上の段
    const isReport = head === "guild" && String(arg || "").startsWith("report");
    const q = isReport && S ? (S.quests || []).find((x) => x.id === String(arg).split(":")[1] && x.done) : null;
    const q0 = S && S.counters ? S.counters.quests : 0;
    const r = facAct0(head, arg, a);
    if (!q || !S || S.over || G.S !== S || !(S.counters.quests > q0)) return r;
    const danger = (D.LOCS[q.loc] || {}).type === "town" ? 0 : (D.LOCS[q.loc] || {}).danger || 0;
    const row = P.QUEST.find((x) => danger >= x.danger);
    if (row && G.rand() < row.p) {
      const id = K.randomScroll("any", row.tier, row.tier);
      X.give(id, row.tier >= 2 ? "依頼主は報酬の袋の横に、封をした筒を一本置いた。「あそこから生きて戻る人なら、これを使えるでしょう」" : "依頼主は報酬の袋に、紐で縛った巻物を一本添えた。「使い道が分かる人に渡したかったんです」");
    }
    return r;
  };

  // ---------------------------------------------------------------- 人から：打ち解けた仲間の贈り物
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const r = exploreAct0(head, arg, a);
    if (head !== "camp" || !S || S.over || G.S !== S || S.mode !== "explore" || S.combat) return r;
    const st = X.state(S);
    const c = (S.companions || []).find((x) => (x.bond || 0) >= P.BOND.need && !st.gift[x.id || x.name]);
    if (c && G.rand() < P.BOND.chance) {
      const top = (c.bond || 0) >= P.BOND.top.bond && (S.fame || 0) >= P.BOND.top.fame;
      const id = K.randomScroll("any", top ? 3 : 2, top ? 3 : 2);
      const nm = G.m2Short ? G.m2Short(c) : c.name;
      if (X.give(id, `焚き火の向こうから、${nm}が紐で縛った巻物を放ってよこした。「長いこと持ち歩いてたけど、あんたのほうが使える」`)) st.gift[c.id || c.name] = 1;
    }
    return r;
  };

  // ---------------------------------------------------------------- 出来事の結果：外れ（k5miss）
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (o && o.k1scroll && o.k5miss && S && !S.over && G.rand() < o.k5miss.p) {
      const t = o.k5miss.text;
      o = { text: Array.isArray(t) ? G.pick(t) : t, ...(o.sin ? { sin: o.sin } : {}) };
    }
    return apply0(o);
  };

  // ---------------------------------------------------------------- 図鑑の入手場所
  const where0 = G.codexItemWhere;
  if (where0) {
    G.codexItemWhere = (id, max) => {
      const out = where0(id, max);
      const it = D.ITEMS[id];
      if (!it || it.type !== "k1scroll") return out;
      const m = max || 3;
      const add = (t) => { if (t && !out.includes(t) && out.length < m) out.push(t); };
      const tier = X.itemTier(id);
      if (tier >= 2) {
        const who = Object.keys(D.K5_GIVERS).filter((tid) => ((D.K5_GIVERS[tid][tier]) || []).includes(it.skill) && D.K1_TEACHERS[tid]).map((tid) => D.K1_TEACHERS[tid].name);
        if (who.length) add(`${who.slice(0, 2).join("・")}が譲る（名の知れた者に）`);
        add(tier >= 3 ? "危うい依頼の礼" : "手ごわい依頼の礼");
        add("打ち解けた仲間の贈り物");
      } else add("ギルドの依頼の礼");
      return out;
    };
  }
})(globalThis.G = globalThis.G || {});
