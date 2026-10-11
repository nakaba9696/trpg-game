// I5：兜（頭）。I2 の 9 種に 9 種を足し、どれにも頭ならではの性格を付ける（欄の決まりは items_i5_armor.js の頭）。
//   頭への一撃（大技を和らげる heavy）・恐れ（正気の減りを和らげる nerve）・視界（命中 sight。顔を覆うほど狭い）・重さ（agi）の釣り合い。
// 設定から：帝国の兵器廠の量産の鉄帽／最前線の鐘番の頭巾／鉱山の都の坑夫の灯り帽／王都の騎士の面頬／聖都の司祭の冠／芸の町の役者の帽子／
//   北の部族の角兜／狩り場の町の獣人の耳当て／使徒領の眷属の骨の面。レーン I（I5）
(function (G) {
  const D = G.data;
  const H = (name, o, desc) => Object.assign({ name, type: "armor", slot: "head", def: 0, agi: 0, desc }, o);

  Object.assign(D.ITEMS, {
    i5h_impcap: H("帝国兵の鉄帽", { def: 1, price: 55, i5: { heavy: 0.85 }, i3: { k: "兜", noun: "鉄帽", mat: "metal", lv: 0, gen: true, from: ["garmund", "fort", "w7_ironwell"] } }, "帝国の兵器廠が型で打つ、浅い鉄の椀。縁に兵の番号が打ってある。"),
    i5h_bellhood: H("鐘番の綿頭巾", { price: 28, stats: { 体力: 2 }, i5: { nerve: 15 }, i3: { k: "頭巾", noun: "綿頭巾", mat: "cloth", lv: 0, gen: true, from: ["w7_widows", "w7_frostgate", "w4_kaesverg"] } }, "耳まで覆う綿入りの頭巾。見張り塔の鐘番がかぶる。"),
    i5h_minerhat: H("坑夫の灯り帽", { def: 1, agi: -5, price: 85, bonus: { trap: 10 }, i5: { heavy: 0.9 }, i3: { k: "兜", noun: "灯り帽", mat: "leather", lv: 1, gen: true, from: ["w4_kaesverg", "w7_durm", "w7_lastvillage"] } }, "厚い革の帽子の額に、油皿を据える金具が付いている。"),
    i5h_earmuff: H("獣人の耳当て", { agi: 5, first: 5, price: 120, i5: { sight: 5 }, i3: { k: "帽子", noun: "耳当て", mat: "hide", lv: 1, from: ["w2_nagris", "w7_eldenholm"] } }, "耳の形に穴を開けた毛皮の帽子。耳はふさがない。"),
    i5h_featherhat: H("羽根飾りの帽子", { agi: 5, price: 95, bonus: { talk: 10 }, i3: { k: "帽子", noun: "羽根帽子", mat: "cloth", lv: 1, from: ["w7_salyues", "karna", "nerva"] } }, "つばに大きな鳥の羽根を挿した帽子。役者の持ち物。"),
    i5h_horned: H("北の部族の角兜", { def: 2, agi: -5, price: 240, stats: { 体力: 3 }, i5: { heavy: 0.8, nerve: 10 }, i3: { k: "兜", lv: 2, from: ["w4_valmiria", "w2_zalgros"] } }, "鉄の椀の両脇に、牡牛の角を一本ずつ打ちつけた兜。"),
    i5h_mitre: H("司祭の冠帽", { magic: 5, price: 260, bonus: { heal: 5 }, i5: { nerve: 25, fit: ["priest"] }, i3: { k: "冠", lv: 2, from: ["w1_holy", "w7_lumie"] } }, "白い布を高く立てた冠。聖都の司祭が、勤めの日にだけかぶる。"),
    i5h_visor: H("面頬付きの兜", { def: 2, agi: -10, magic: -5, price: 400, bonus: { steal: -5 }, i5: { heavy: 0.7, sight: -10 }, i3: { k: "兜", noun: "面頬兜", mat: "metal", lv: 3, gen: true, from: ["leavel", "w2_dranherz"] } }, "顔の前に、細い覗き穴を開けた鉄の面を下ろす兜。"),
    i5h_kinmask: H("眷属の骨面", { def: 2, magic: 5, price: 900, i5: { nerve: 40, heavy: 0.85, sight: 5 }, i3: { k: "面", lv: 5 } }, "眷属の頭の骨を削って作った面。目の穴の縁がすり減っている。"),
  });

  // 耐性（E12b）。兜は一つか二つに絞る（頭は胴より小さいので、効き目も控えめ）
  Object.assign(D.E12.ARMOR, {
    i5h_impcap: "blunt- bolt+", i5h_bellhood: "wind- blunt-", i5h_minerhat: "earth- blunt-", i5h_earmuff: "ice- pierce+",
    i5h_featherhat: "wind- fire+", i5h_horned: "blunt- ice-", i5h_mitre: "dark- light-", i5h_visor: "slash- pierce- bolt+", i5h_kinmask: "dark-- light+",
  });

  // I2 の兜に、頭の性格を足す（値はそのまま）
  const MORE = {
    i2s_hood: { bonus: { steal: 5 } },
    i2s_furcap: { i5: { land: { snow: 5 } } },
    i2s_leathercap: { i5: { heavy: 0.9 } },
    i2s_ironhelm: { i5: { heavy: 0.85 } },
    i2s_hachigane: { i5: { sight: 5, fit: ["samurai"] } },
    i2s_circlet: { i5: { nerve: 10 } },
    i2s_wizardhat: { i5: { sight: -5, fit: ["mage"] } },
    i2s_greathelm: { i5: { heavy: 0.75, sight: -10 } },
    i2s_kabuto: { i5: { heavy: 0.8, fit: ["samurai"] } },
  };
  Object.entries(MORE).forEach(([id, o]) => {
    const it = D.ITEMS[id];
    if (!it) return;
    if (o.i5) it.i5 = Object.assign({}, it.i5 || {}, o.i5);
    if (o.bonus) it.bonus = Object.assign({}, it.bonus || {}, o.bonus);
  });

  const FL = (D.I2_FLAVOR = D.I2_FLAVOR || {});
  Object.assign(FL, {
    i5h_impcap: "帝都ノルディアの兵器廠が型で打つ、浅い鉄の椀。兵の番号が縁に打ってあって、前の持ち主の番号は削ってある。重い一撃を頭の上で滑らせる形だが、雷の日は誰もかぶりたがらない。",
    i5h_bellhood: "最前線の見張り塔で、鐘番がかぶる綿入りの頭巾。耳を鐘の音から守るために、鐘番の女房たちが縫う。鐘の鳴る夜を何百と過ごした者は、たいていのことでは竦まない。",
    i5h_minerhat: "鉱山の都カースヴェルグの坑夫の帽子。額の油皿の灯りで、足もとの割れ目と吊り糸がよく見える。落ちてくる石には分厚い革が効く。灯りは揺れるので、少し首が疲れる。",
    i5h_earmuff: "狩り場の町ナグリスの獣人が、人間の客のために作る毛皮の帽子。耳はふさがず、むしろ音を集める形に縫ってある。枝の折れる音で、獲物より先に動ける。",
    i5h_featherhat: "芸の町サリュエスの役者が、見得を切るときにかぶる帽子。客の目は羽根に集まり、口の重い相手もつい話に乗ってくる。焚き火のそばでは、羽根が真っ先に縮れる。",
    i5h_horned: "市の都ヴァルミリアに天幕を張る北の部族が、成人の日に一人ずつ打つ角兜。角は牡牛の物で、角の向きで家が分かる。頭への一撃を角が逸らし、かぶった者は自分の角の分だけ強気になる。",
    i5h_mitre: "聖都エルヴィナの司祭が、勤めの日にだけかぶる白い冠。暗いものの気配に心が揺れにくくなる、と司祭たちは言う。神官くずれがかぶると、ちゃんと似合ってしまうのが困りものだ。",
    i5h_visor: "王都の騎士が槍試合のために作らせた、面頬を下ろす兜。どんな大振りも面の上を滑っていくが、覗き穴から見える世界は指二本ぶんしかない。外すと汗が滝のように流れる。",
    i5h_kinmask: "眷属の頭の骨を削って作った面。かぶると、暗いものの気配がただの物音に聞こえるようになる。光の中では骨が軋む。目の穴の縁が、前の持ち主の睫毛の形にすり減っている。",
  });
})(globalThis.G = globalThis.G || {});
