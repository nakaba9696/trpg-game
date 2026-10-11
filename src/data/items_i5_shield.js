// I5：盾（左手）。I2 の 6 種に 11 種を足し、盾ならではの性格を付ける（欄の決まりは items_i5_armor.js の頭）。
//   受け（block：受け止める見込み）・反撃（counter）・仲間を庇う（cover）・属性の盾（E12b の耐性）。
//   盾は左手の枠なので、両手の武器とは持てない（I2）。身を守ると受けやすくなる（I5.GUARD_BLOCK）。
// 設定から：傭兵の町の小円盾／帝国の兵器廠の方盾／麦の都の自警団の編み枝の盾／狩り場の町の獣皮の盾／火山の都の灰止めの盾／
//   北の港の鯨骨の盾／隠れ里の精霊樹の盾／巡礼騎士の庇い盾／網の島の大亀の甲羅／闘技の都の棘の盾／使徒領の眷属の殻。レーン I（I5）
(function (G) {
  const D = G.data;
  const S = (name, o, desc) => Object.assign({ name, type: "armor", slot: "off", def: 0, agi: 0, desc }, o);

  Object.assign(D.ITEMS, {
    i5s_wicker: S("編み枝の盾", { price: 12, i5: { block: 10 }, i3: { k: "盾", noun: "編み盾", mat: "wood", lv: 0, gen: true, from: ["w2_granbel", "w7_vinale"] } }, "柳の枝を編んで、上から牛の革を一枚かぶせた盾。"),
    i5s_hide: S("獣皮張りの盾", { def: 1, price: 50, i5: { block: 10 }, i3: { k: "盾", noun: "皮盾", mat: "hide", lv: 0, gen: true, from: ["w2_nagris", "w7_eldenholm"] } }, "木の枠に、毛を残したままの獣の皮を張った盾。"),
    i5s_target: S("傭兵の小円盾", { def: 1, price: 90, i5: { block: 10, counter: 30 }, i3: { k: "盾", noun: "小円盾", mat: "metal", lv: 1, gen: true, from: ["w7_glatz", "w7_zaigros"] } }, "鉄の縁に、拳ほどの尖った瘤を付けた小さな盾。"),
    i5s_imperial: S("帝国の方盾", { def: 2, agi: -10, price: 110, i5: { block: 15, cover: 15 }, i3: { k: "盾", noun: "方盾", mat: "metal", lv: 1, gen: true, from: ["garmund", "fort", "w7_ironwell"] } }, "四角い板に鉄の縁をはめた、帝国の歩兵の盾。並べると壁になる。"),
    i5s_shell: S("大亀の甲羅盾", { def: 2, agi: -10, price: 180, i5: { block: 15 }, i3: { k: "盾", lv: 1, from: ["w7_netisle", "w7_pearlisle", "yakumo"] } }, "海の大亀の甲羅に、革の持ち手を二本付けただけの盾。"),
    i5s_spiked: S("闘士の棘盾", { def: 1, agi: -5, price: 220, stats: { 魅力: 2 }, i5: { block: 10, counter: 40 }, i3: { k: "盾", lv: 2, from: ["w2_zalgros"] } }, "表に鉄の棘を七本植えた丸盾。闘技場の客が喜ぶ。"),
    i5s_ashguard: S("灰止めの盾", { def: 1, price: 260, i5: { block: 10 }, i3: { k: "盾", lv: 2, from: ["w3_frosleia"] } }, "灰と粘土を焼き固めた板を、鉄の枠にはめた盾。"),
    i5s_whalebone: S("鯨骨の盾", { def: 1, agi: -5, price: 220, stats: { 体力: 2 }, i5: { block: 10 }, i3: { k: "盾", lv: 2, from: ["w7_eisenvan", "w7_frostgate"] } }, "鯨の肩の骨を削って、裏に海豹の毛皮を張った盾。"),
    i5s_spiritwood: S("精霊樹の盾", { def: 1, magic: 5, price: 300, i5: { block: 10 }, i3: { k: "盾", lv: 2, from: ["w7_revandel", "zephara"] } }, "倒れた古い木の芯から削り出した、継ぎ目の無い盾。"),
    i5s_warden: S("巡礼騎士の庇い盾", { def: 2, agi: -5, price: 320, i5: { block: 10, cover: 35, fit: ["priest"] }, i3: { k: "盾", lv: 2, from: ["w7_orbe", "w1_holy"] } }, "縦に長い盾の縁に、巡礼の杖を掛ける金具が付いている。"),
    i5s_kinshell: S("眷属の殻の盾", { def: 3, agi: -5, price: 1000, i5: { block: 20, counter: 15 }, i3: { k: "盾", lv: 5 } }, "眷属の背の殻を、そのまま剥いで持ち手を付けた盾。"),
  });

  Object.assign(D.E12.ARMOR, {
    i5s_wicker: "pierce- fire++", i5s_hide: "blunt- ice-", i5s_target: "slash- blunt+", i5s_imperial: "pierce- slash- ice+", i5s_shell: "pierce- blunt- bolt+",
    i5s_spiked: "slash- pierce+", i5s_ashguard: "fire-- earth-", i5s_whalebone: "ice-- wind-", i5s_spiritwood: "bolt-- earth- fire+", i5s_warden: "dark- slash-",
    i5s_kinshell: "dark- slash- pierce-",
  });

  // I2 の盾に、受け・反撃・庇いを足す（値はそのまま）
  const MORE = {
    i2s_buckler: { block: 10, counter: 20 },
    i2s_woodshield: { block: 10 },
    i2s_roundshield: { block: 15, counter: 10 },
    i2s_kiteshield: { block: 15, cover: 20 },
    i2s_holyshield: { block: 10, nerve: 15, fit: ["priest"] },
    i2s_towershield: { block: 25, cover: 30 },
  };
  Object.entries(MORE).forEach(([id, o]) => { const it = D.ITEMS[id]; if (it) it.i5 = Object.assign({}, it.i5 || {}, o); });

  const FL = (D.I2_FLAVOR = D.I2_FLAVOR || {});
  Object.assign(FL, {
    i5s_wicker: "麦の都グランベールの自警団が、冬の農閑期に編む盾。軽く、矢くらいなら編み目が噛んで止める。火には藁と同じくらい弱いので、自警団は焚き火から遠い所に立てかける。",
    i5s_hide: "狩り場の町ナグリスの獣人が、狩りの帰りに一枚ずつ張る盾。毛が残っているので殴られても音がしない。雪の夜は、これを敷いて寝る。",
    i5s_target: "傭兵の町グラッツの鍛冶屋が打つ小さな盾。受け止めたらそのまま瘤で顔を殴り返すために作ってある。グラッツの酒場では、鼻の曲がった者はたいていこの盾の世話になっている。",
    i5s_imperial: "帝都ノルディアの兵器廠が、型で何千枚と打つ歩兵の盾。並んだ隣の者の脇まで隠れる幅がある。鉄の縁は冷えに弱く、雪の中で長く持つと指が貼りつく。",
    i5s_shell: "網の島カラヴの漁師が、浜に打ち上がった大亀の甲羅で作る盾。刃も槌も滑らせる。濡れた甲羅は雷をよく通すので、嵐の日の漁師はこれを舟底に伏せておく。",
    i5s_spiked: "闘技の都ザルグロスの闘士が使う、棘を植えた盾。受け止めた拳や刃に、そのまま棘を返す。客は流れた血の量で賭けの払いを決めるので、闘士は棘をよく研ぐ。",
    i5s_ashguard: "火山の都フロスレイアの研究所が、山の火を調べに行く者のために作った盾。焼いた灰の板は炎をほとんど通さず、落ちてくる石にも割れにくい。持つと少しだけ温かい。",
    i5s_whalebone: "北の港アイゼルヴァンの漁師が、冬の海に出るときに舟縁に掛ける盾。鯨の骨は冷たい波も吹雪もよく止める。骨の表に、仕留めた年と船の名が彫ってある。",
    i5s_spiritwood: "隠れ里レヴァンデルの者が、倒れた古い木に断りを入れてから削る盾。木は雷を通さず、土の礫も受け流す。火の前では木は木なので、里の者は焚き火の番をしない。",
    i5s_warden: "巡礼の道を守る騎士が持つ、縦に長い盾。隣を歩く巡礼の前に差し出して、自分の身より先に人を庇う形に作ってある。騎士の誓いの言葉が、裏に小さく彫ってある。",
    i5s_kinshell: "眷属の背の殻を剥いだ盾。刃も穂先も闇も滑り、受け止めた一撃の勢いを殻の縁が返す。殻の内側には、まだ何かの筋が張りついている。",
  });
})(globalThis.G = globalThis.G || {});
