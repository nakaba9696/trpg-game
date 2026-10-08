// K5：技の巻物を手に入れにくくする（データは src/data/k5_scrolls.js）。巻物は読めば必ず覚える（K1 の K.readScroll）
//   1. 巻物の段（D.K5.tier）。出来事・依頼の礼で出る巻物は段 1 まで（名の知れた者は 2 まで）。K.randomScroll(kind, cap) の cap で上限を決める
//   2. 店の奥の棚：D.K5_SHOP の町の店だけ。名声かその国での評判が届いた者にだけ見せ、高値で一本きり（S.k5.sold）
//   3. 迷宮の深い層（D.K5.DEEP）で宝を見つけたとき、まれに巻物が混じる。深いほど・危うい迷宮ほど強い技
//   4. 脇道の奥の主を倒したあと（W8 の w8clear）、見込み D.K5.SIDE で巻物
//   5. 打ち解けた仲間（D.K5.BOND）が、野営の夜に巻物を一本くれる（一人一度。S.k5.gift）
//   6. ギルドの依頼の礼（K3）の見込みを D.K5.QUEST に下げる
//   7. 出来事の結果 k5miss { p, text }：p の見込みで、巻物の代わりに外れの一文になる（古紙売り・朽ちた道場など）
//   8. 図鑑の入手場所に、奥の棚・迷宮の深い層・脇道の奥を足す
// セーブに足すもの：S.k5 = { sold: {巻物: 1}, gift: {仲間: 1} }（古いセーブに無くても動く）。DOM には触らない。乱数は G.rand / G.pick。レーン C（K5）
(function (G) {
  const D = G.data;
  const K = G.k1;
  if (!K || !D.K5 || !D.SKILLS) return;
  const SK = D.SKILLS;
  const X = (G.k5 = G.k5 || {});
  const P = D.K5;
  if (D.K3) D.K3.QUEST = P.QUEST;

  X.state = (S) => { S = S || G.S; S.k5 = S.k5 || {}; S.k5.sold = S.k5.sold || {}; S.k5.gift = S.k5.gift || {}; return S.k5; };
  X.tier = (id) => P.tier(id);
  X.itemTier = (item) => { const it = D.ITEMS[item]; return it && it.type === "k1scroll" ? P.tier(it.skill) : 0; };
  X.scrolls = () => Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].type === "k1scroll" && SK[D.ITEMS[id].skill]).sort();

  // ---------------------------------------------------------------- 巻物を一つ（段の上限つき）
  X.defaultCap = (S) => { S = S || G.S; return P.EVENT_TIER + ((S && (S.fame || 0) >= P.SHOP_NEED[2].fame) ? 1 : 0); };
  K.randomScroll = (kind, cap) => {
    cap = cap || X.defaultCap();
    const all = X.scrolls().filter((id) => {
      const it = D.ITEMS[id];
      const s = SK[it.skill];
      if (kind === "old") return !!it.old;
      if (kind === "combat") return s.kind === "combat" || s.kind === "both";
      if (kind === "field") return s.kind === "field" || s.kind === "passive";
      return true;
    });
    // 上限までの段から。その種類に上限までの段が無ければ、いちばん低い段から
    const low = Math.min(...all.map((id) => X.itemTier(id)));
    const fit = all.filter((id) => X.itemTier(id) <= Math.max(cap, low));
    const fresh = fit.filter((id) => !K.knows(D.ITEMS[id].skill));
    const pool = fresh.length ? fresh : fit;
    return pool.length ? G.pick(pool) : null;
  };
  X.giveScroll = (kind, cap, text) => {
    const id = K.randomScroll(kind, cap);
    if (!id || !G.give(id)) return null;
    if (text) G.say(text);
    G.note(`${D.ITEMS[id].name}を手に入れた。`);
    return id;
  };

  // ---------------------------------------------------------------- 店の奥の棚
  X.shopList = (loc) => (D.K5_SHOP[loc] || []).filter((id) => SK[id] && P.tier(id) < 3 && D.ITEMS[D.K1_SCROLL(id)]);
  X.price = (id) => Math.round(D.ITEMS[D.K1_SCROLL(id)].price * (P.PRICE[P.tier(id)] || 5));
  X.shopOk = (id, S) => {
    S = S || G.S;
    const n = P.SHOP_NEED[P.tier(id)] || P.SHOP_NEED[2];
    const nation = G.nationOf ? G.nationOf(S.loc) : null;
    const rep = nation && S.repute && S.repute[nation] ? S.repute[nation].rep || 0 : 0;
    return (S.fame || 0) >= n.fame || rep >= n.rep;
  };
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    if (!S || S.over || S.mode !== "fac" || S.fac !== "shop") return g;
    const st = X.state(S);
    // 見せるのは、名か評判の届いた品だけ（届かない者には棚があることも分からない）。売れた品と、もう覚えた技は出さない
    const list = X.shopList(S.loc).filter((id) => X.shopOk(id, S) && !st.sold[D.K1_SCROLL(id)] && !K.knows(id, S)).map((id) => {
      const item = D.K1_SCROLL(id);
      const price = X.price(id);
      const why = K.needMiss(id, S);
      return { id: "k5buy:" + item, label: `${D.ITEMS[item].name}を買う`, sub: `${price}G・一本きり・${why.length ? `読むには${why.join("と")}が足りない` : SK[id].hint}`, disabled: S.gold < price, kw: ["巻物", "買", SK[id].name] };
    });
    if (!list.length) return g;
    g.splice(Math.max(0, g.length - 1), 0, { title: "奥の棚（名の知れた客にだけ）", list });
    return g;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (head !== "k5buy") return facAct0(head, arg, a);
    const it = D.ITEMS[arg];
    if (!it || it.type !== "k1scroll" || S.fac !== "shop") return;
    const id = it.skill;
    const st = X.state(S);
    if (!X.shopList(S.loc).includes(id) || !X.shopOk(id, S) || st.sold[arg] || K.knows(id, S)) return;
    const price = X.price(id);
    if (S.gold < price) return;
    S.gold -= price;
    st.sold[arg] = 1;
    G.give(arg);
    G.log("you", `${it.name}を買う`);
    G.say("主は奥の棚の鍵を開け、油紙に包んだ筒を一本だけ出してきた。「同じものはもう入らないよ。書いた人がもういないからね」");
    G.note(`所持金 -${price}G`);
    G.note(`${it.name}を手に入れた。`);
  };

  // ---------------------------------------------------------------- 迷宮の深い層・仲間の贈り物
  X.deepCap = (L, depth) => (depth >= 4 || (L.danger || 0) >= 4 ? 3 : 2);
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const g0 = S.gold;
    const r = exploreAct0(head, arg, a);
    if (!S || S.over || G.S !== S || S.mode !== "explore" || S.combat) return r;
    const L = G.loc();
    if (head === "deeper" && L.type === "dungeon" && S.depth >= P.DEEP.depth && S.depth < L.floors && S.gold > g0 && G.rand() < P.DEEP.chance)
      X.giveScroll("any", X.deepCap(L, S.depth), "金貨を拾い集めた手が、蝋で口を封じた細い筒に触れた。ここまで潜った誰かが、持ち帰れなかったものだ。");
    if (head === "camp") {
      const st = X.state(S);
      const c = (S.companions || []).find((x) => (x.bond || 0) >= P.BOND.need && !st.gift[x.id || x.name]);
      if (c && G.rand() < P.BOND.chance) {
        const nm = G.m2Short ? G.m2Short(c) : c.name;
        if (X.giveScroll("any", 2, `焚き火の向こうから、${nm}が紐で縛った巻物を放ってよこした。「長いこと持ち歩いてたけど、あんたのほうが使える」`)) st.gift[c.id || c.name] = 1;
      }
    }
    return r;
  };

  // ---------------------------------------------------------------- 出来事の結果：外れ（k5miss）・脇道の奥
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (o && o.k1scroll && o.k5miss && S && !S.over && G.rand() < o.k5miss.p) {
      const t = o.k5miss.text;
      o = { text: Array.isArray(t) ? G.pick(t) : t, ...(o.sin ? { sin: o.sin } : {}) };
    }
    const r = apply0(o);
    if (o && o.w8clear && S && !S.over && G.S === S && G.rand() < P.SIDE)
      X.giveScroll("any", (G.loc().danger || 0) >= 4 ? 3 : 2, "主の倒れた奥の壁に、石を積んだ小さな棚があった。いちばん上の段に油紙に包んだ巻物が一本。");
    return r;
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
      const towns = Object.keys(D.K5_SHOP).filter((loc) => X.shopList(loc).includes(it.skill) && D.LOCS[loc]).map((loc) => D.LOCS[loc].name);
      if (towns.length) add(`${towns.join("・")}の商店の奥の棚（名の知れた客にだけ）`);
      add(X.itemTier(id) >= 3 ? "危うい迷宮の深い層の宝" : "迷宮の深い層の宝");
      add("脇道の奥");
      return out;
    };
  }
})(globalThis.G = globalThis.G || {});
