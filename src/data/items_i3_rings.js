// I3：装飾品の型を増やす（指輪・首飾り・腕輪・護符・耳飾り）。どれも装飾品の枠（S.ring）に一つだけ。
// 欄は items_2.js の装飾品と同じ（stats・bonus・magic・cursed・drain）。I3 で足した欄：first（先手）、i3（items_i3_weapons.js の頭を見る）。
// bonus の種類は指輪の決まりどおり fire・heal・steal・trap・talk だけ。レーン I（I3）
(function (G) {
  const D = G.data;
  const R = (name, o, desc) => Object.assign({ name, type: "ring", desc }, o);

  Object.assign(D.ITEMS, {
    // ---------------------------------------------------------------- 土台（材質と銘を付ける）
    i3r_ring: R("指輪", { stats: { 体力: 2 }, price: 20, i3: { k: "指輪", noun: "指輪", mat: "gem", lv: 0, gen: true } }, "体力+2。飾りのない輪。誰かの指の形に少し歪んでいる。"),
    i3r_necklace: R("首飾り", { stats: { 魅力: 2 }, price: 25, i3: { k: "首飾り", noun: "首飾り", mat: "gem", lv: 0, gen: true } }, "魅力+2。細い鎖の先に小さな飾り。留め金が固い。"),
    i3r_bracelet: R("腕輪", { stats: { 筋力: 2 }, price: 25, i3: { k: "腕輪", noun: "腕輪", mat: "gem", lv: 0, gen: true } }, "筋力+2。手首に嵌める輪。重さで腕を振るのに少し勢いがつく。"),
    i3r_charm: R("護符", { bonus: { trap: 5 }, price: 20, i3: { k: "護符", noun: "護符", mat: "gem", lv: 0, gen: true } }, "罠+5。紐を通した小さな飾り板。何かの印が刻んである。誰も意味を知らない。"),
    i3r_earring: R("耳飾り", { stats: { 敏捷: 2 }, price: 25, i3: { k: "耳飾り", noun: "耳飾り", mat: "gem", lv: 0, gen: true } }, "敏捷+2。片耳だけの飾り。もう片方はたいてい失くしている。"),

    // ---------------------------------------------------------------- 町と国の品
    i3r_merchantseal: R("商人の印章指輪", { bonus: { talk: 10 }, price: 110, i3: { k: "指輪", lv: 1, from: ["karna", "nerva"] } }, "話術+10。自由都市の商人が封蝋に押す印章。指に嵌めていると、相手の口が少し軽くなる。"),
    i3r_holyamulet: R("光天の首飾り", { bonus: { heal: 10 }, magic: 5, price: 140, i3: { k: "首飾り", lv: 1, from: ["w1_holy", "leavel"] } }, "癒し+10・魔法+5。三つの環を重ねた教会の首飾り。巡礼が聖都の門前で買う。"),
    i3r_academypin: R("学院の徽章", { stats: { 知力: 5 }, price: 120, i3: { k: "護符", lv: 1, from: ["zephara"] } }, "知力+5。学院の生徒の胸の徽章。卒業できなかった者のものが、古道具屋に流れてくる。"),
    i3r_sailorring: R("船乗りの耳輪", { stats: { 敏捷: 5 }, price: 80, i3: { k: "耳飾り", lv: 0, from: ["nerva", "yakumo"] } }, "敏捷+5。金の輪。溺れて浜に上がったとき、葬式代になるように付けるのだそうだ。"),
    i3r_omamori: R("島のお守り", { stats: { 体力: 3, 魅力: 3 }, price: 70, i3: { k: "護符", lv: 0, from: ["yakumo", "w1_oboro"] } }, "体力+3・魅力+3。錦の小袋。中を見ると効き目が無くなる、と売り子は言った。"),
    i3r_leafneck: R("葉の首飾り", { stats: { 魔力: 5, 敏捷: 3 }, price: 260, i3: { k: "首飾り", lv: 2, from: ["zephara"] } }, "魔力+5・敏捷+3。枯れない葉を一枚、銀の枠に収めた。エルフの母親が町へ出る子に持たせる。"),
    i3r_bonebeads: R("骨の数珠", { stats: { 体力: 5, 筋力: 3, 魅力: -3 }, price: 150, i3: { k: "腕輪", lv: 1, from: ["w2_nagris", "zephara"] } }, "体力+5・筋力+3・魅力-3。獣人の狩人が、仕留めた獣の骨を一つずつ足していく数珠。"),
    i3r_dogtag: R("帝国兵の認識票", { stats: { 体力: 5 }, price: 60, i3: { k: "首飾り", lv: 0, from: ["garmund", "fort"] } }, "体力+5。名前と隊の番号を打った鉄の札。持ち主はまだ生きているかもしれない。"),
    i3r_dicepend: R("賽の首飾り", { stats: { 知力: 3 }, bonus: { steal: 5 }, price: 70, i3: { k: "首飾り", lv: 0, from: ["w2_zalgros", "karna"] } }, "知力+3・盗み+5。骨の賽を一つ下げた。振るとたいてい六が出る。たいてい。"),
    i3r_bathstone: R("湯の石", { stats: { 体力: 3, 魔力: 3 }, price: 90, i3: { k: "護符", lv: 0, from: ["w2_amyrein"] } }, "体力+3・魔力+3。湯の底で丸くなった石。握るといつまでもほんのり温かい。"),
    i3r_strawcharm: R("麦わらの護符", { stats: { 体力: 2, 魅力: 2 }, price: 15, i3: { k: "護符", lv: 0, from: ["w2_granbel"] } }, "体力+2・魅力+2。収穫の祭りで子どもが編む人形。旅に出る者の鞄に黙って入れておく。"),
    i3r_forgering: R("火床の指輪", { stats: { 筋力: 3 }, bonus: { fire: 10 }, price: 200, i3: { k: "指輪", lv: 2, from: ["w2_dranherz"] } }, "筋力+3・炎の魔法+10。鍛冶の都の親方が、火床の灰の中から拾い上げた指輪。熱が抜けない。"),
    i3r_lockring: R("鍵開けの指輪", { bonus: { trap: 15, steal: 5 }, price: 160, i3: { k: "指輪", lv: 1, from: ["karna", "garmund", "w1_holy"] } }, "罠+15・盗み+5。台座の裏に細い針金が一本仕込んである。"),
    i3r_mirrorpend: R("小鏡の首飾り", { magic: 8, bonus: { talk: 5 }, price: 200, i3: { k: "首飾り", lv: 2, from: ["nerva", "zephara"] } }, "魔法+8・話術+5。親指の爪ほどの丸い鏡。覗き込むと自分の顔が少し遅れて動く。"),
    i3r_hunterwhistle: R("狩人の骨笛", { stats: { 敏捷: 3 }, first: 15, price: 90, i3: { k: "首飾り", lv: 1, from: ["w2_nagris"] } }, "敏捷+3・先手+15。首から下げた骨の笛。吹くと獣より先に人が振り向く。"),
    i3r_widowring: R("寡婦の指輪", { stats: { 魅力: 8, 体力: -3 }, price: 50, i3: { k: "指輪", lv: 1, from: ["leavel", "w1_holy"] } }, "魅力+8・体力-3。黒い石の指輪。三度嫁いで、三度喪服を着た女の持ち物だったと質屋は言う。"),

    // ---------------------------------------------------------------- 使徒領の素材（落とし物と、深いところの宝）
    i3r_ashbead: R("灰の玉", { stats: { 魔力: 8, 魅力: -5 }, price: 400, i3: { k: "首飾り", lv: 4 } }, "魔力+8・魅力-5。灰を固めたような玉。握ると指が黒くなる。洗ってもしばらく落ちない。"),
    i3r_kineye: R("眷属の眼の首飾り", { stats: { 知力: 8, 敏捷: 5 }, cursed: true, price: 500, i3: { k: "首飾り", lv: 4 } }, "知力+8・敏捷+5・呪い。乾いた眼球を銀で包んだ。こちらを見ている。外そうとすると見る目が変わる。"),
    i3r_dragontooth: R("竜の牙の護符", { stats: { 筋力: 8, 体力: 5 }, price: 900, i3: { k: "護符", lv: 5 } }, "筋力+8・体力+5。竜の牙の先を削った護符。小さいのに首が重い。"),
  });
})(globalThis.G = globalThis.G || {});
