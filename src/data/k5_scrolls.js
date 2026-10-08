// K5：技の巻物を手に入れにくくする（持ち主「確定取得でいい。入手を難しくすればいい」）
// 巻物は読めば必ず覚える（K1 の K.readScroll）。そのぶん、手に入る場所を絞る。強い技ほど手に入れにくい。
//   段（D.K5.tier(id)）：1 ふつうの技・2 中ほどの技（気力 2 以上の戦技・稽古代 70G 以上・能力値の目安 14 以上・強敵向きのスキル・古い字の巻物）・
//                         3 奥義（教官の上の技・気力 3 以上・能力値の目安 16 以上）。D.K5.TIER に書けば上書き
//   店：K1 の「町の店の掘り出し物」（L.shop）はやめる。D.K5_SHOP の町の店だけが、奥の棚に高値で一本ずつ置く（段 1・2。一冒険で一本きり）。
//       名声か、その国での評判が D.K5.SHOP_NEED に届いた者にだけ見せる
//   落とし物：D.K1_DROPS を、段 3 以上の敵（と主）だけに絞り、見込みも下げる。奥義の巻物は段 5 以上の敵か主だけが落とす
//   出来事：店先の目利き（K1_FAC・商人の型）からは巻物を出さない。古紙売り・朽ちた道場・行き倒れの荷は、たいてい外れ
//   ほかの入手先（エンジン）：迷宮の深い層の宝・脇道の奥の主を倒したあと・打ち解けた仲間からの贈り物・ギルドの依頼の礼（見込みを下げる）
// レーン C（K5）
(function (G) {
  const D = G.data;
  if (!D.SKILLS || !D.K1_SCROLL) return;

  D.K5 = {
    TIER: {},                                  // 段の上書き { 技 id: 1|2|3 }
    STRONG: ["k2_steadymind", "k2_coldhead", "k2_vitaleye", "k2_badluck", "k2_heavyarmor", "k2_glare"],  // 段 2 のスキル（強敵向き）
    PRICE: { 1: 3, 2: 5 },                     // 店の値（巻物の値の何倍か）
    SHOP_NEED: { 1: { fame: 60, rep: 30 }, 2: { fame: 150, rep: 60 } },   // 店の奥の棚を見せる名声（またはその国での評判）
    DROP_TIER: 3,                              // 巻物を落とす敵の段（これより下の敵は落とさない）
    DROP_CAP: { 1: 0.03, 2: 0.02, 3: 0.015 },  // 落とす見込みの上限（技の段ごと）
    DEEP: { depth: 3, chance: 0.15 },          // 迷宮の深い層（地下 3 階から）で宝を見つけたとき、巻物が混じる見込み
    SIDE: 0.3,                                 // 脇道の奥の主を倒したあと
    BOND: { need: 80, chance: 0.08 },          // 打ち解けた仲間が、野営の夜に巻物を一本くれる（一人一度）
    QUEST: 0.08,                               // ギルドの依頼の礼に巻物が添えられる見込み（K3 の 0.2 から下げる）
    EVENT_TIER: 1,                             // 出来事・依頼の礼で手に入る巻物の段の上限（名の知れた者は 2）
  };
  D.K5.tier = (id) => {
    const s = D.SKILLS[id];
    if (!s) return 1;
    if (D.K5.TIER[id]) return D.K5.TIER[id];
    const tr = s.learn.train || {};
    const need = Math.max(0, ...Object.values(s.need || {}));
    const art = s.kind === "combat" || s.kind === "both";
    if (tr.mark || (tr.gold || 0) >= 100 || (s.ki || 0) >= 3 || need >= 16) return 3;
    if (s.learn.old || need >= 14 || D.K5.STRONG.includes(id) || (art && ((s.ki || 0) >= 2 || (tr.gold || 0) >= 70))) return 2;
    return 1;
  };

  // ---------------------------------------------------------------- 店
  // K1・K2 の「どの町の店にも並ぶ掘り出し物」はやめる
  D.K1_SHOP = {};
  // 奥の棚（町: 技の一覧）。段 3 の技は置かない（エンジンが外す）
  D.K5_SHOP = {
    zephara: ["k1_read", "k2_reader", "k2_coldhead"],
    w2_zalgros: ["k1_twinfang", "k1_parry", "k1_furyform"],
    w7_melvi: ["k1_letters", "k1_firstaid", "k2_pious"],
    yakumo: ["k1_drawcut", "k1_focus"],
    karna: ["k1_haggle", "k1_appraise", "k2_haggler"],
  };

  // ---------------------------------------------------------------- 落とし物
  // 段の低い敵からは落とさない。見込みは半分にして、技の段ごとの上限で抑える。奥義は段 5 以上の敵か主だけ
  const drops = {};
  Object.entries(D.K1_DROPS || {}).forEach(([eid, list]) => {
    const e = D.ENEMIES[eid];
    if (!e || (e.tier || 1) < D.K5.DROP_TIER) return;
    const keep = list
      .filter(([id]) => D.K5.tier(id) < 3 || e.boss || (e.tier || 1) >= 5)
      .map(([id, p]) => [id, Math.max(0.01, Math.min(D.K5.DROP_CAP[D.K5.tier(id)], Math.round(p * 500) / 1000))]);
    if (keep.length) drops[eid] = keep;
  });
  // 奥義の巻物：迷宮の主や名のある強敵が、まれに抱えている
  Object.assign(drops, {
    bonedragon: [["k1_cleave", 0.1]], w4_gatekeeper: [["k2_deepbreath", 0.1]], w1_gregor: [["k1_flurry", 0.1]], w2_ironwarden: [["k1_twoarrows", 0.1]],
    general: [["k1_flurry", 0.015], ["k1_cleave", 0.015]], e4k_squire: [["k2_twohands", 0.015]],
  });
  D.K1_DROPS = drops;

  // ---------------------------------------------------------------- 出来事
  // 店先の目利きは、巻物ではなく掘り出し物の小金
  ((D.K1_FAC || {}).shop || []).forEach((f) => {
    if (f.ok && f.ok.k1scroll) f.ok = { text: "埃をかぶった筒の中に、古い細工の留め金が一つ。主は値打ちを知らなかった。あなたは知っていた。", gold: 15 };
  });
  ((D.K1_TPL || {}).merchant || []).forEach((f) => {
    if (Array.isArray(f.ok)) f.ok.forEach((o, i) => { if (o.k1scroll) f.ok[i] = { text: "目利きの目で品を見ると、商人の顔色が変わった。「分かる人にはこっちを出すよ」奥から出てきたのは、銀の縁取りの古い小箱だった。", gold: 20 }; });
  });
  // 古紙売り・朽ちた道場・行き倒れの荷・古書庫は、たいてい外れ（結果に k5miss を付ける。エンジンが p の見込みで外れの一文に差し替える）
  const miss = {
    k1_paperstall: ["広げてみると誰かの家計の帳面だった。卵が幾つで塩が幾ら。几帳面な人だったらしい。", "中身は下手な恋文の書き損じだった。老婆が笑う。「だから安いと言ったろう」"],
    k1_dojoruin: ["剥がしたそばから紙は粉になって崩れた。手のひらに黄色い粉が残っただけだ。", "どの紙も雨染みで墨が流れていた。読めるのは題の一字だけだ。"],
    k1_pilgrim: ["荷の中身は、着替えと干し飯と、家族に宛てた書きかけの手紙だった。あなたは手紙を荷に戻し、紐を結び直した。"],
    k1_archive: ["写すそばから字が分からなくなる。日が傾くまで粘ったが、手もとに残ったのは模様の束だった。"],
  };
  D.K5.MISS = { k1_paperstall: 0.75, k1_dojoruin: 0.7, k1_pilgrim: 0.6, k1_archive: 0.5 };
  (D.EVENTS || []).forEach((e) => {
    if (!miss[e.id]) return;
    e.w = Math.min(e.w || 1, 1);
    (e.choices || []).forEach((c) => { if (c.ok && c.ok.k1scroll) c.ok.k5miss = { p: D.K5.MISS[e.id], text: miss[e.id] }; });
  });
})(globalThis.G = globalThis.G || {});
