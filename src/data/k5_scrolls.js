// K5：技の巻物（持ち主「確定取得でいい。入手を難しくすればいい」「初級や簡単なものは店売りでもいいよ」「上級は中級より入手しにくいが、中級と同じ」）
// 巻物は読めば必ず覚える（K1 の K.readScroll）。そのぶん、手に入る場所を絞る。強い技ほど手に入れにくい。
//   段（D.K5.tier(id)）：1 初級・2 中級（気力 2 以上の戦技・稽古代 70G 以上・能力値の目安 14 以上・強敵向きのスキル・古い字の巻物）・
//                         3 上級（教官の上の技・気力 3 以上・能力値の目安 16 以上）。D.K5.TIER に書けば上書き
//   店：段 1（初級）の巻物は、K1・K2 の町の店にそのまま並ぶ（町ごとに品ぞろえが違う）。段 2・3 は店に無い
//   段 2（中級）・段 3（上級）の入手は三つ（持ち主「条件を満たせば誰かからもらえたり、依頼でもらえたり、敵からドロップしたり」）。上級は条件が重く、見込みが低い
//     人から：師（D.K1_TEACHERS）が、名か依頼の数が D.K5.GIVE に届いた者に一本ずつ譲る（D.K5_GIVERS）。打ち解けた仲間が野営の夜にくれる（D.K5.BOND）
//     依頼の礼：ギルドの依頼を報告したとき。危うい場所の依頼ほど上の段（D.K5.QUEST）
//     落とし物：D.K1_DROPS を段 3 以上の敵（と主）だけに絞り、見込みも下げる。上級の巻物は段 5 以上の敵か主だけが落とす
//   出来事：店先の目利き（K1_FAC・商人の型）からは巻物を出さない。古紙売り・朽ちた道場・行き倒れの荷・古書庫は、たいてい外れで、出ても初級
// レーン C（K5）
(function (G) {
  const D = G.data;
  if (!D.SKILLS || !D.K1_SCROLL) return;

  D.K5 = {
    TIER: {},                                  // 段の上書き { 技 id: 1|2|3 }
    STRONG: ["k2_steadymind", "k2_coldhead", "k2_vitaleye", "k2_badluck", "k2_heavyarmor", "k2_glare"],  // 段 2 のスキル（強敵向き）
    DROP_TIER: 3,                              // 巻物を落とす敵の段（これより下の敵は落とさない）
    DROP_CAP: { 1: 0.03, 2: 0.02, 3: 0.015 },  // 落とす見込みの上限（技の段ごと）
    // 師が譲る条件（段ごと。師の条件 K.teacherOk も要る）。名声か、こなした依頼の数
    GIVE: { 2: { fame: 150, quests: 8 }, 3: { fame: 300, quests: 12, both: true } },
    // 打ち解けた仲間が、野営の夜に巻物を一本くれる（一人一度）。上級は好感度も名声も高いときだけ
    BOND: { need: 80, chance: 0.08, top: { bond: 95, fame: 300 } },
    // ギルドの依頼の礼（依頼の場所の危険度ごと。上から順に見る）。danger 以上の依頼で、p の見込みで段 tier の巻物
    QUEST: [{ danger: 5, tier: 3, p: 0.05 }, { danger: 3, tier: 2, p: 0.1 }, { danger: 0, tier: 1, p: 0.08 }],
    EVENT_TIER: 1,                             // 出来事で手に入る巻物の段の上限
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
  // 持ち主「初級や簡単なものは店売りでもいいよ」：段 1 の巻物は、K1・K2 の町の店にそのまま並べる（町ごとに品ぞろえが違う。条件も高値も無い）。
  // 段 2 以上は町の店から外す
  Object.keys(D.K1_SHOP || {}).forEach((loc) => {
    D.K1_SHOP[loc] = D.K1_SHOP[loc].filter((id) => D.K5.tier(id) === 1);
    if (!D.K1_SHOP[loc].length) delete D.K1_SHOP[loc];
  });
  // 師が譲る巻物（師: { 段: [技] }）。D.K1_TEACHERS の施設にいる師だけ
  D.K5_GIVERS = {
    veteran: { 2: ["k1_twinfang", "k1_helmsplit", "k1_furyform", "k2_heavyarmor", "k2_steadymind"], 3: ["k1_cleave", "k2_deepbreath"] },
    fence: { 2: ["k1_drawcut", "k1_bodyblow", "k2_badluck", "k2_glare", "k2_vitaleye"], 3: ["k1_twinstorm", "k2_twohands"] },
    hunter: { 2: ["k1_spearwall", "k1_sweepspear", "k2_vitaleye"], 3: ["k1_twoarrows"] },
    sister: { 2: ["k1_firstaid", "k2_coldhead", "k2_steadymind"], 3: ["k2_deepbreath"] },
    guardmaster: { 2: ["k1_shieldbash", "k1_crossguard", "k1_guardform", "k2_heavyarmor"], 3: ["k1_flurry", "k1_cleave"] },
    bard: { 2: ["k1_letters", "k2_glare"], 3: [] },
  };

  // ---------------------------------------------------------------- 落とし物
  // 段の低い敵からは落とさない。見込みは半分にして、技の段ごとの上限で抑える。上級は段 5 以上の敵か主だけ
  const drops = {};
  Object.entries(D.K1_DROPS || {}).forEach(([eid, list]) => {
    const e = D.ENEMIES[eid];
    if (!e || (e.tier || 1) < D.K5.DROP_TIER) return;
    const keep = list
      .filter(([id]) => D.K5.tier(id) < 3 || e.boss || (e.tier || 1) >= 5)
      .map(([id, p]) => [id, Math.max(0.01, Math.min(D.K5.DROP_CAP[D.K5.tier(id)], Math.round(p * 500) / 1000))]);
    if (keep.length) drops[eid] = keep;
  });
  // 上級の巻物：迷宮の主や名のある強敵が、まれに抱えている
  Object.assign(drops, {
    bonedragon: [["k1_cleave", 0.1]], w4_gatekeeper: [["k2_deepbreath", 0.1]], w1_gregor: [["k1_flurry", 0.1]], w2_ironwarden: [["k1_twoarrows", 0.1]],
    general: [["k1_flurry", 0.015], ["k1_cleave", 0.015]], e4k_squire: [["k2_twohands", 0.015]],
  });
  // 中級で落とす敵が残らなかった技
  [["e4_hillorc", "k1_helmsplit", 0.02], ["e4_hillorc", "k1_furyform", 0.015], ["deserter", "k1_sweepspear", 0.02]].forEach(([eid, id, p]) => {
    if (D.ENEMIES[eid]) (drops[eid] = drops[eid] || []).push([id, p]);
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
