// I2（装備の枠）：頭・足・盾（左手）の品。どれも type は "armor"（防具）で、slot で枠を決める（items_i2s.js）。
// 欄は防具と同じ（def・agi・magic・stats・bonus・first）。重い物ほど身のこなしと術の通りが落ちる。
// 胴の鎧より控えめにする（頭と足は守りより身のこなしや能力値。盾は両手の武器と引き換えの守り）。
// i3 = { k 型の名, noun, mat, lv, from, gen }（I3 の組み合わせの品の土台になる。材質・銘・鍛冶・町の日替わりの品・宝はそのまま効く）。
// 町の店の品ぞろえ・落とし物に混ぜるのは engine/zzzzzzzzz_i2s_slots.js。レーン I（I2）
(function (G) {
  const D = G.data;
  const P = (slot) => (name, o, desc) => Object.assign({ name, type: "armor", slot, def: 0, agi: 0, desc }, o);
  const H = P("head"), F = P("feet"), S = P("off");

  Object.assign(D.ITEMS, {
    // ---------------------------------------------------------------- 頭
    i2s_hood: H("頭巾", { agi: 5, price: 8, i3: { k: "頭巾", noun: "頭巾", mat: "cloth", lv: 0, gen: true } }, "頭からかぶる布。雨も視線も少し遮る。"),
    i2s_furcap: H("毛皮の帽子", { stats: { 体力: 3 }, price: 35, i3: { k: "帽子", noun: "帽子", mat: "hide", lv: 0, gen: true, from: ["w2_nagris", "w7_frostgate", "w7_lastvillage"] } }, "耳まで覆う毛皮の帽子。北の兵はこれを脱がずに寝る。"),
    i2s_leathercap: H("革の兜", { def: 1, agi: -5, price: 60, i3: { k: "兜", noun: "革兜", mat: "leather", lv: 1, gen: true } }, "煮固めた革を椀を伏せた形に縫ったもの。かぶると少し汗の匂いがする。"),
    i2s_ironhelm: H("鉄兜", { def: 1, agi: -5, price: 90, i3: { k: "兜", noun: "兜", mat: "metal", lv: 1, gen: true } }, "鉄の椀に鼻当てを一本足しただけの兜。ありふれていてありがたい。"),
    i2s_hachigane: H("鉢金", { def: 1, first: 5, price: 110, i3: { k: "鉢巻", noun: "鉢金", mat: "metal", lv: 1, gen: true, from: ["yakumo", "w1_oboro"] } }, "額に鉄板を縫いつけた鉢巻。締めると目の奥がすっと冷える。"),
    i2s_circlet: H("額当て", { magic: 5, stats: { 知力: 3 }, price: 150, i3: { k: "額当て", noun: "額当て", mat: "metal", lv: 1, gen: true, from: ["zephara", "w7_melvi", "w3_frosleia"] } }, "細い金属の輪。学院の者は、考えごとをするときにこれを指で回す。"),
    i2s_wizardhat: H("尖り帽子", { magic: 10, agi: -5, price: 240, i3: { k: "帽子", noun: "尖り帽子", mat: "cloth", lv: 2, gen: true, from: ["zephara", "w4_tulier"] } }, "先の折れた、つばの広い帽子。被った者が偉くなるのではない。偉い者が被ったからこうなった。"),
    i2s_greathelm: H("大兜", { def: 2, agi: -10, magic: -5, price: 320, i3: { k: "兜", noun: "大兜", mat: "metal", lv: 2, gen: true, from: ["garmund", "w7_brenark", "w2_dranherz"] } }, "頭をすっぽり覆う鉄の桶。覗き穴から見える世界は細長い。"),
    i2s_kabuto: H("筋兜", { def: 2, agi: -5, stats: { 魅力: 3 }, price: 420, i3: { k: "兜", noun: "筋兜", mat: "metal", lv: 3, gen: true, from: ["yakumo"] } }, "細い鉄板を何枚も鋲で留めた島の兜。前立ての飾りは持ち主が自分で選ぶ。"),

    // ---------------------------------------------------------------- 足
    i2s_sandals: F("草鞋", { agi: 5, price: 6, i3: { k: "履物", noun: "草鞋", mat: "cloth", lv: 0, gen: true, from: ["yakumo", "w1_oboro"] } }, "藁で編んだ履物。すぐに擦り切れるがすぐに編める。"),
    i2s_shoes: F("旅の靴", { agi: 5, stats: { 体力: 2 }, price: 35, i3: { k: "靴", noun: "靴", mat: "leather", lv: 0, gen: true } }, "底を二重に縫った革靴。街道を歩く者は剣より先に靴を選ぶ。"),
    i2s_leatherboots: F("革の長靴", { def: 1, price: 70, i3: { k: "長靴", noun: "長靴", mat: "leather", lv: 1, gen: true } }, "膝まである硬い革の長靴。蛇の牙も泥もたいていは通さない。"),
    i2s_softboots: F("忍び足の靴", { agi: 10, bonus: { steal: 5 }, price: 140, i3: { k: "靴", noun: "忍び靴", mat: "leather", lv: 1, gen: true, from: ["karna", "w2_zalgros", "w7_grishaim", "w4_valmiria"] } }, "底に毛皮を張った柔らかな靴。石畳の上でも猫ほどの音しかしない。"),
    i2s_greaves: F("鉄の脛当て", { def: 1, agi: -5, price: 120, i3: { k: "脛当て", noun: "脛当て", mat: "metal", lv: 1, gen: true } }, "脛を守る鉄の板。蹴られても痛くないが蹴っても痛い。"),
    i2s_sabaton: F("板金の脚甲", { def: 2, agi: -10, price: 360, i3: { k: "脚甲", noun: "脚甲", mat: "metal", lv: 3, gen: true, from: ["leavel", "garmund", "w2_dranherz"] } }, "爪先まで鉄で覆う脚甲。階段を下りる音で誰が来たか分かる。"),
    i2s_elfboots: F("森の民の靴", { agi: 15, first: 10, price: 420, i3: { k: "靴", noun: "森の靴", mat: "leather", lv: 3, gen: true, from: ["w7_revandel", "w3_lignoa", "w7_eldenholm"] } }, "樹皮のように薄い革の靴。落ち葉の上を歩いても葉が鳴らない。"),

    // ---------------------------------------------------------------- 盾（左手）
    i2s_buckler: S("小盾", { def: 1, price: 40, i3: { k: "盾", noun: "小盾", mat: "metal", lv: 0, gen: true } }, "拳ほどの丸い鉄の盾。受けるというより、払うためのもの。"),
    i2s_woodshield: S("木の盾", { def: 1, agi: -5, stats: { 体力: 2 }, price: 25, i3: { k: "盾", noun: "盾", mat: "leather", lv: 0, gen: true } }, "板を革で張り合わせた丸い盾。割れたらまた板を打てばいい。"),
    i2s_roundshield: S("丸盾", { def: 2, agi: -10, price: 120, i3: { k: "盾", noun: "丸盾", mat: "metal", lv: 1, gen: true } }, "鉄の縁をはめた丸い盾。真ん中の瘤で、相手の顔を殴ることもできる。"),
    i2s_kiteshield: S("凧形の盾", { def: 2, agi: -5, price: 220, i3: { k: "盾", noun: "凧形盾", mat: "metal", lv: 2, gen: true, from: ["leavel", "w7_glatz", "w2_dranherz"] } }, "上が丸く、下が尖った長い盾。馬の上からでも脚まで隠れる。"),
    i2s_holyshield: S("聖印の盾", { def: 2, magic: 5, bonus: { heal: 5 }, price: 340, i3: { k: "盾", noun: "聖盾", mat: "metal", lv: 2, gen: true, from: ["w1_holy", "w7_lumie", "w7_orbe"] } }, "光天の印を打ち出した盾。祈りの言葉を裏に刻んである。"),
    i2s_towershield: S("大盾", { def: 3, agi: -20, magic: -5, price: 380, i3: { k: "盾", noun: "大盾", mat: "metal", lv: 3, gen: true, from: ["garmund", "w7_brenark", "w7_ironwell"] } }, "人の背丈ほどもある鉄の盾。構えると壁になる。走ると壁ごと転ぶ。"),
  });

  // フレーバーの説明（I2 の D.I2_FLAVOR。40〜200 字・二文以上）：desc のあとに一文
  const MORE = {
    i2s_hood: "旅人は町に入る前に頭巾を下ろす。下ろさない者は、顔を覚えられたくない者だ。",
    i2s_furcap: "毛の向きを逆に撫でると、獣の匂いが少し戻ってくる。",
    i2s_leathercap: "前の持ち主の頭の形に、少し歪んでいる。",
    i2s_ironhelm: "内側の詰め物は、たいてい誰かの古い外套を裂いたものだ。",
    i2s_hachigane: "島の若者は、初めての戦の朝に母親から渡される。",
    i2s_circlet: "輪の内側に、小さな字で誰かの名前が彫られている。読めるのは外したときだけだ。",
    i2s_wizardhat: "学院の古い者たちは、帽子の折れ方で互いの流派を見分けるという。",
    i2s_greathelm: "叫んでも、中で声がこもって自分にしか聞こえない。",
    i2s_kabuto: "古い兜ほど、鋲の頭が丸く擦り減っている。",
    i2s_sandals: "島の者は、鼻緒が切れると縁起が悪いと言って、新しいのを編みはじめる。",
    i2s_shoes: "靴屋の親方は、客の歩き方を一度見ただけで、どこが先に擦り減るか言い当てる。",
    i2s_leatherboots: "脱ぐときには、誰かに踵を引いてもらうのが一番早い。",
    i2s_softboots: "裏路地の靴屋は、注文した者の名前を帳面に書かない。",
    i2s_greaves: "傭兵は、脛当ての傷の数で酒場の話を一つずつ増やしていく。",
    i2s_sabaton: "騎士の従者は、毎晩これを磨くのが最初の仕事になる。",
    i2s_elfboots: "森の民は、この靴で人の町を歩くのを嫌がる。石畳が足の裏に痛いのだそうだ。",
    i2s_buckler: "剣の稽古で最初に覚えるのは、盾で顔を殴られない方法だ。",
    i2s_woodshield: "村の自警団の壁には、たいてい同じ形の盾が並んでいる。",
    i2s_roundshield: "縁の傷を数えれば、持ち主が何度生き延びたか分かる。",
    i2s_kiteshield: "盾の面に描かれた紋は、何度も塗り直されて、下の紋がうっすら透けている。",
    i2s_holyshield: "巡礼の騎士は、夜になるとこの盾を枕元に立てて眠る。",
    i2s_towershield: "砦の兵は二人一組でこれを運ぶ。一人で持てる者は、砦に一人か二人しかいない。",
  };
  const fl = (D.I2_FLAVOR = D.I2_FLAVOR || {});
  Object.keys(MORE).forEach((id) => { if (D.ITEMS[id] && !fl[id]) fl[id] = D.ITEMS[id].desc + MORE[id]; });
})(globalThis.G = globalThis.G || {});
