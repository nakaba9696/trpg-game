// R6：商店の並び。持ち主の声「薬草・回復薬が 22 品の末尾にあり、買えない巻物の後ろに隠れている」
// explore.js の品揃え（場所の shop・D.SHOP_BASE・今日の品）は変えず、G.actions() の「買う」の並びだけを替える：
//   1. すぐ使う物（薬草・回復薬、ほかの傷や魔力を戻す物、煙玉・聖水などの道具）
//   2. 武器 → 3. 防具（胴・盾・頭・足）→ 4. 装飾品 → 5. 巻物・魔導書・楽器・交易の品などそのほか
//   同じ組の中は値段の安い順。買えない物（お金が足りない・条件が足りない）は、組の順を保ったまま後ろへ（画面では薄く出る）
// 乱数なし・DOM なし。セーブに足すものは無い
(function (G) {
  const D = G.data;
  const R6 = (G.r6 = G.r6 || {});
  R6.SHOP_LEAD = ["herb", "potion"]; // いちばん前に置く品（この順で）
  const ARMOR = ["body", "off", "head", "feet"];

  const idOf = (a) => String(a.id || "").replace(/^shop:buy:/, "");
  const itemOf = (id) => (G.itemInfo ? G.itemInfo(id) : null) || D.ITEMS[id] || null;
  // 組（小さいほど前）
  R6.shopRank = (id) => {
    const it = itemOf(id);
    if (!it) return 9;
    const lead = R6.SHOP_LEAD.indexOf(id);
    if (lead >= 0) return lead / 10;
    if (it.type === "use") return it.hp || it.mp || it.cure ? 1 : 2;
    if (it.type === "weapon") return 3;
    if (it.type === "armor") return 4 + Math.max(0, ARMOR.indexOf(it.slot || "body")) / 10;
    if (it.type === "ring") return 5;
    return 6;
  };
  const priceOf = (a) => { const it = itemOf(idOf(a)); return (it && it.price) || 0; };
  R6.sortShop = (list) => list
    .map((a, i) => ({ a, i }))
    .sort((x, y) => (!!x.a.disabled - !!y.a.disabled) || (R6.shopRank(idOf(x.a)) - R6.shopRank(idOf(y.a))) || (priceOf(x.a) - priceOf(y.a)) || (x.i - y.i))
    .map((x) => x.a);

  const actions0 = G.actions;
  G.actions = () => {
    const groups = actions0();
    const S = G.S;
    if (!S || S.mode !== "fac" || S.fac !== "shop") return groups;
    return groups.map((g) => {
      const list = g.list || [];
      if (!list.length || !list.every((a) => String(a.id || "").startsWith("shop:buy:"))) return g;
      return Object.assign({}, g, { list: R6.sortShop(list) });
    });
  };
})(globalThis.G = globalThis.G || {});
