// I3：武器の型を増やす（剣・刀・短剣・斧・槌・槍・弓・杖・鞭・投げ物・拳具。国・種族・使徒の素材の品も）。
// 欄は items.js と同じ（dmg・stat・hit・vital・magic）。I3 で足した欄（engine/zzz_gear_i3.js が読む）：
//   first = 先手（戦いの始めに、この割合で一太刀浴びせる）、bonus = { 行動の種類: 補正 }（指輪と同じ。fire・ice・bolt・curse・heal など）、
//   stats = { 能力値: 補正 }、drain = 与えた傷のうち戻る割合
//   i3 = { k 型の名, h 片手 1・両手 2, noun 材質を付けるときの名, mat 付けられる材質の種類（metal / wood / leather …。無ければ付けない）,
//          lv 出回りはじめる深さ（0〜5）, from 品ぞろえに出る町（無ければ各地）, gen 組み合わせの品の土台にするか }
// 入手先（町の品ぞろえ・宝・落とし物）は engine/zzz_gear_i3.js が i3.from と lv から決める。レーン I（I3）
(function (G) {
  const D = G.data;
  const W = (name, o, desc) => Object.assign({ name, type: "weapon", hit: 0, desc }, o);

  Object.assign(D.ITEMS, {
    // ---------------------------------------------------------------- 剣
    i3w_shortsword: W("小剣", { dmg: [1, 6, 0], stat: "筋力", hit: 5, price: 30, i3: { k: "剣", h: 1, noun: "小剣", mat: "metal", lv: 0, gen: true } }, "どこの町の鍛冶屋でも、最初に打たされる剣。短くて扱いやすい。"),
    i3w_broadsword: W("幅広の剣", { dmg: [1, 8, 1], stat: "筋力", price: 70, i3: { k: "剣", h: 1, noun: "幅広の剣", mat: "metal", lv: 0, gen: true } }, "刃が手のひらほどもある。傭兵は、これで薪も割る。"),
    i3w_bastard: W("片手半剣", { dmg: [1, 8, 2], stat: "筋力", price: 120, i3: { k: "剣", h: 2, noun: "片手半剣", mat: "metal", lv: 1, gen: true } }, "片手でも両手でも握れる長さ。握りの革が二か所だけすり減っている。"),
    i3w_greatsword: W("大剣", { dmg: [2, 6, 2], stat: "筋力", hit: -10, price: 220, i3: { k: "剣", h: 2, noun: "大剣", mat: "metal", lv: 2, gen: true } }, "背負うと鞘の先が地面を擦る。振り上げるまでが長い。振り下ろすのは一瞬。"),
    i3w_falchion: W("段平", { dmg: [1, 8, 2], stat: "筋力", hit: -5, vital: 5, price: 85, i3: { k: "剣", h: 1, noun: "段平", mat: "metal", lv: 1, gen: true } }, "先の重い片刃。叩き斬るための刃で、肉屋の包丁に似ている。"),
    i3w_executioner: W("首斬り剣", { dmg: [2, 6, 3], stat: "筋力", hit: -15, vital: 10, price: 300, i3: { k: "剣", h: 2, lv: 3, from: ["leavel", "garmund"] } }, "切っ先が無い。突く必要のない剣だからだ。刑場の払い下げで、柄に祈りの言葉が彫ってある。"),
    i3w_sabre: W("曲刀", { dmg: [1, 6, 2], stat: "敏捷", hit: 10, price: 130, i3: { k: "剣", h: 1, noun: "曲刀", mat: "metal", lv: 1, gen: true, from: ["nerva", "zephara", "karna"] } }, "反りの深い片刃。馬の上から振るために作られた。徒歩でも悪くない。"),
    i3w_estoc: W("刺突剣", { dmg: [1, 6, 1], stat: "敏捷", hit: 5, vital: 15, price: 150, i3: { k: "剣", h: 1, noun: "刺突剣", mat: "metal", lv: 2, gen: true } }, "刃のない、細く硬い剣。鎖帷子の目に通すためにある。"),
    i3w_knightsword: W("王国騎士の剣", { dmg: [1, 8, 3], stat: "筋力", hit: 5, stats: { 魅力: 3 }, price: 280, i3: { k: "剣", h: 1, lv: 2, from: ["leavel", "w1_holy"] } }, "鍔に王家の獅子。騎士が身を持ち崩すと、まず質に入るのがこれだ。"),
    i3w_imperial: W("帝国の軍刀", { dmg: [1, 8, 2], stat: "筋力", hit: 5, price: 160, i3: { k: "剣", h: 1, lv: 1, from: ["garmund", "fort"] } }, "帝国の兵に一本ずつ渡される。刀身の根元に、持ち主の番号が打刻してある。削った跡がある。"),
    i3w_corsair: W("海賊の舶刀", { dmg: [1, 6, 3], stat: "敏捷", hit: 5, price: 140, i3: { k: "剣", h: 1, lv: 1, from: ["nerva", "yakumo"] } }, "短く、幅広く、潮に錆びにくい。船の上では長い刃は邪魔になる。"),
    i3w_gladius: W("闘士の剣", { dmg: [1, 6, 2], stat: "筋力", hit: 10, price: 100, i3: { k: "剣", h: 1, lv: 1, from: ["w2_zalgros"] } }, "ザルグロスの闘技場で使う短い剣。柄に、勝った試合の数だけ釘が打ってある。七本。"),
    i3w_holyblade: W("聖堂騎士の剣", { dmg: [1, 8, 2], stat: "筋力", hit: 5, magic: 5, bonus: { heal: 5 }, price: 320, i3: { k: "剣", h: 1, lv: 2, from: ["w1_holy"] } }, "聖都の騎士が誓いの日に受け取る剣。抜くたびに、指で三つの印を切る癖がつく。"),
    i3w_elfblade: W("葉刃", { dmg: [1, 6, 3], stat: "敏捷", hit: 15, vital: 5, price: 420, i3: { k: "剣", h: 1, lv: 3, from: ["zephara"] } }, "エルフの剣。木の葉の形をしていて、驚くほど軽い。三百年前の型だと店の主は言う。"),

    // ---------------------------------------------------------------- 刀（島の都シェルアーク）
    i3w_wakizashi: W("脇差", { dmg: [1, 6, 1], stat: "筋力", hit: 10, vital: 5, price: 60, i3: { k: "刀", h: 1, noun: "脇差", mat: "metal", lv: 0, gen: true, from: ["yakumo", "w1_oboro"] } }, "島の侍が腰に差す短い刀。座敷に上がるときも外さない。"),
    i3w_tachi: W("太刀", { dmg: [1, 8, 3], stat: "筋力", price: 220, i3: { k: "刀", h: 2, noun: "太刀", mat: "metal", lv: 2, gen: true, from: ["yakumo"] } }, "長く反った刀。刃を下にして吊るす。島では、これを佩いて歩けるのは家の長だけだった。"),
    i3w_nodachi: W("野太刀", { dmg: [2, 6, 3], stat: "筋力", hit: -10, price: 380, i3: { k: "刀", h: 2, noun: "野太刀", mat: "metal", lv: 3, gen: true, from: ["yakumo"] } }, "背丈ほどもある刀。抜くには、従者が鞘を引いてやる。"),
    i3w_kodachi: W("小太刀", { dmg: [1, 4, 2], stat: "敏捷", hit: 15, vital: 10, price: 90, i3: { k: "刀", h: 1, noun: "小太刀", mat: "metal", lv: 1, gen: true, from: ["w1_oboro", "yakumo"] } }, "朧島の者が好む、取り回しのよい短い刀。袖の中に隠せる。"),

    // ---------------------------------------------------------------- 短剣
    i3w_knife: W("剥ぎ取りナイフ", { dmg: [1, 4, 0], stat: "敏捷", hit: 10, vital: 5, price: 8, i3: { k: "短剣", h: 1, noun: "ナイフ", mat: "metal", lv: 0, gen: true } }, "狩人が獲物の皮を剥ぐのに使う。脂の匂いが抜けない。"),
    i3w_stiletto: W("鎧通し", { dmg: [1, 4, 1], stat: "敏捷", hit: 5, vital: 20, price: 70, i3: { k: "短剣", h: 1, noun: "鎧通し", mat: "metal", lv: 1, gen: true } }, "錐のように細い短剣。倒れた騎士の兜の隙間に差し込むためにある。"),
    i3w_kris: W("波刃の短剣", { dmg: [1, 4, 2], stat: "敏捷", hit: 5, vital: 10, price: 100, i3: { k: "短剣", h: 1, noun: "波刃の短剣", mat: "metal", lv: 1, gen: true, from: ["nerva", "w1_oboro"] } }, "刃が蛇のようにうねっている。南の海の向こうの細工だと船乗りは言う。"),

    // ---------------------------------------------------------------- 斧
    i3w_handaxe: W("手斧", { dmg: [1, 6, 1], stat: "筋力", price: 25, i3: { k: "斧", h: 1, noun: "手斧", mat: "metal", lv: 0, gen: true } }, "木こりの斧。柄に、子どもの背比べのような刻み目がある。"),
    i3w_battleaxe: W("戦斧", { dmg: [1, 8, 3], stat: "筋力", hit: -5, price: 140, i3: { k: "斧", h: 1, noun: "戦斧", mat: "metal", lv: 1, gen: true } }, "木を切るための形ではない。刃の裏に、盾を引っかける鉤がある。"),
    i3w_bearded: W("髭斧", { dmg: [1, 8, 2], stat: "筋力", hit: -5, vital: 5, price: 90, i3: { k: "斧", h: 1, noun: "髭斧", mat: "metal", lv: 1, gen: true, from: ["garmund", "fort"] } }, "刃の下が長く垂れている。帝国の北の村では、婚礼の日に新郎が担いで歩く。"),
    i3w_greataxe: W("両刃の大斧", { dmg: [2, 6, 4], stat: "筋力", hit: -15, price: 420, i3: { k: "斧", h: 2, noun: "両刃の大斧", mat: "metal", lv: 3, gen: true, from: ["w2_dranherz", "fort"] } }, "左右に刃がある。振り抜いた勢いのまま、もう一度振り下ろせる。理屈の上では。"),
    i3w_throwaxe: W("投げ斧", { dmg: [1, 6, 2], stat: "筋力", hit: -5, first: 20, price: 60, i3: { k: "投げ物", h: 1, noun: "投げ斧", mat: "metal", lv: 1, gen: true } }, "手のひらに収まる小さな斧。間合いの外から一本、寄られたらもう一本。"),

    // ---------------------------------------------------------------- 槌・棍
    i3w_club: W("棍棒", { dmg: [1, 6, 0], stat: "筋力", price: 5, i3: { k: "槌", h: 1, noun: "棍棒", mat: "wood", lv: 0, gen: true } }, "太い枝の先に、節がひとつ。誰でも作れて、誰でも振れる。"),
    i3w_warhammer: W("戦鎚", { dmg: [1, 8, 2], stat: "筋力", hit: -5, price: 110, i3: { k: "槌", h: 1, noun: "戦鎚", mat: "metal", lv: 1, gen: true } }, "鎧の上から骨を折るための槌。反対側は嘴のように尖っている。"),
    i3w_morningstar: W("星球", { dmg: [1, 10, 1], stat: "筋力", hit: -10, price: 100, i3: { k: "槌", h: 1, noun: "星球", mat: "metal", lv: 1, gen: true } }, "棘だらけの鉄の球を棒の先に付けた。夜明けの星に似ているから、と名付けた奴は詩人だったのだろう。"),
    i3w_maul: W("大槌", { dmg: [2, 8, 1], stat: "筋力", hit: -15, price: 280, i3: { k: "槌", h: 2, noun: "大槌", mat: "metal", lv: 2, gen: true, from: ["w2_dranherz", "garmund"] } }, "鍛冶の親方が、弟子をしごくときに担がせる槌。それが一番の鍛錬になる。"),
    i3w_pick: W("坑夫のつるはし", { dmg: [1, 8, 1], stat: "筋力", hit: -5, vital: 10, price: 75, i3: { k: "槌", h: 2, lv: 0, from: ["garmund", "fort", "w2_dranherz"] } }, "帝国の鉱山から流れてきた。尖った先に、岩ではないものの欠けた跡がある。"),
    i3w_flail: W("殻竿", { dmg: [1, 6, 1], stat: "筋力", hit: -5, price: 15, i3: { k: "槌", h: 2, lv: 0, from: ["w2_granbel"] } }, "麦を打つ農具。穂を打つのも、押し込み強盗の頭を打つのも、たいして違わない。"),
    i3w_censer: W("吊り香炉", { dmg: [1, 6, 1], stat: "筋力", hit: -5, magic: 8, bonus: { heal: 10 }, price: 150, i3: { k: "槌", h: 1, lv: 1, from: ["w1_holy", "leavel"] } }, "鎖の先の真鍮の香炉。振るたびに乳香の煙が尾を引く。司祭は、これで二度だけ人を殴った。"),

    // ---------------------------------------------------------------- 槍
    i3w_spear: W("槍", { dmg: [1, 8, 1], stat: "筋力", first: 15, price: 45, i3: { k: "槍", h: 2, noun: "槍", mat: "metal", lv: 0, gen: true } }, "棒の先に刃。村の自警団が持つのはたいていこれで、敵が近づく前に一突きできる。"),
    i3w_pike: W("長槍", { dmg: [1, 10, 2], stat: "筋力", hit: -5, first: 25, price: 150, i3: { k: "槍", h: 2, noun: "長槍", mat: "metal", lv: 1, gen: true } }, "家の軒より長い。並んで構えれば騎馬も止まる。一人だと、曲がり角で困る。"),
    i3w_halberd: W("斧槍", { dmg: [2, 6, 2], stat: "筋力", hit: -10, first: 15, price: 260, i3: { k: "槍", h: 2, noun: "斧槍", mat: "metal", lv: 2, gen: true, from: ["leavel", "garmund"] } }, "槍の先に斧と鉤。城の衛兵が持っていると立派に見える。実際、立派に人を殺す。"),
    i3w_trident: W("三叉の銛", { dmg: [1, 8, 2], stat: "筋力", first: 10, price: 110, i3: { k: "槍", h: 2, noun: "銛", mat: "metal", lv: 1, gen: true, from: ["nerva", "yakumo"] } }, "港の漁師の銛。大きな魚と、ときどき大きな魚でないものを突く。"),
    i3w_naginata: W("薙刀", { dmg: [1, 10, 2], stat: "筋力", first: 15, price: 200, i3: { k: "槍", h: 2, noun: "薙刀", mat: "metal", lv: 2, gen: true, from: ["yakumo", "w1_oboro"] } }, "長い柄に反った刃。島では、武家の娘が嫁入り道具に持っていく。"),
    i3w_boarspear: W("猪槍", { dmg: [1, 8, 2], stat: "筋力", first: 20, vital: 5, price: 130, i3: { k: "槍", h: 2, lv: 1, from: ["w2_nagris"] } }, "穂先の下に横木がある。刺さった猪が、柄を伝って登ってこないように。"),

    // ---------------------------------------------------------------- 弓・投げ物
    i3w_shortbow: W("短弓", { dmg: [1, 6, 0], stat: "敏捷", hit: 5, first: 30, price: 40, i3: { k: "弓", h: 2, noun: "短弓", mat: "wood", lv: 0, gen: true } }, "狩人の弓。寄られる前に一本、寄られたら弓で殴る。"),
    i3w_longbow: W("長弓", { dmg: [1, 8, 1], stat: "敏捷", first: 40, price: 120, i3: { k: "弓", h: 2, noun: "長弓", mat: "wood", lv: 1, gen: true, from: ["leavel", "w2_nagris"] } }, "背丈ほどの弓。引くには、腕より背中の力が要る。"),
    i3w_crossbow: W("弩", { dmg: [1, 10, 1], stat: "敏捷", hit: 10, first: 30, price: 180, i3: { k: "弓", h: 2, noun: "弩", mat: "wood", lv: 2, gen: true, from: ["garmund", "fort", "w2_dranherz"] } }, "帝国の工房の弩。巻き上げに手間がかかる。一本目は、間違いなく速い。"),
    i3w_elfbow: W("森の民の弓", { dmg: [1, 8, 2], stat: "敏捷", hit: 10, first: 40, price: 340, i3: { k: "弓", h: 2, lv: 3, from: ["zephara"] } }, "エルフの弓。弦は何かの髪で撚ってある。誰の髪かは聞かないほうがいい。"),
    i3w_sling: W("投石紐", { dmg: [1, 4, 1], stat: "敏捷", first: 20, price: 6, i3: { k: "投げ物", h: 1, lv: 0, from: ["w2_granbel", "karna"] } }, "羊飼いの子が鴉を追うのに使う。石はどこにでも落ちている。"),
    i3w_throwknife: W("投げナイフの帯", { dmg: [1, 4, 1], stat: "敏捷", hit: 10, first: 25, vital: 5, price: 50, i3: { k: "投げ物", h: 1, lv: 1, from: ["w2_zalgros", "karna", "nerva"] } }, "薄いナイフが十二本、革の帯に差してある。拾い忘れると、十一本になる。"),
    i3w_javelin: W("投げ槍の束", { dmg: [1, 6, 2], stat: "筋力", first: 30, price: 55, i3: { k: "投げ物", h: 1, lv: 1, from: ["w2_nagris", "fort"] } }, "短い槍が三本。投げて、拾って、また投げる。拾えないときは、走る。"),

    // ---------------------------------------------------------------- 杖
    i3w_wand: W("短杖", { dmg: [1, 3, 0], stat: "筋力", magic: 12, price: 60, i3: { k: "杖", h: 1, noun: "短杖", mat: "wood", lv: 0, gen: true, from: ["zephara", "karna"] } }, "指揮棒ほどの杖。学院の一年生が、最初の月に三本は折る。"),
    i3w_quarterstaff: W("六尺棒", { dmg: [1, 6, 1], stat: "筋力", hit: 5, magic: 5, price: 20, i3: { k: "杖", h: 2, noun: "棒", mat: "wood", lv: 0, gen: true } }, "旅人の杖を少し長くしたもの。坂を登るのにも、野良犬を払うのにも使える。"),
    i3w_crystalstaff: W("水晶の杖", { dmg: [1, 4, 1], stat: "筋力", hit: -5, magic: 18, bonus: { fire: 5 }, price: 380, i3: { k: "杖", h: 2, lv: 3, from: ["zephara"] } }, "先端に濁った水晶。覗き込むと、中で小さな火が瞬いている。学院の卒業の品だったらしい。"),
    i3w_bonestaff: W("骨の杖", { dmg: [1, 6, 0], stat: "筋力", hit: -5, magic: 12, bonus: { curse: 10 }, price: 120, i3: { k: "杖", h: 1, lv: 2 } }, "何かの背骨を繋いだ杖。かたかたと鳴る。夜は、鳴る間隔が少し違う。"),

    // ---------------------------------------------------------------- 鞭
    i3w_whip: W("革の鞭", { dmg: [1, 4, 1], stat: "敏捷", hit: 10, first: 20, price: 35, i3: { k: "鞭", h: 1, noun: "鞭", mat: "leather", lv: 0, gen: true } }, "牛追いの鞭。鳴らすと、牛より先に人が振り向く。"),
    i3w_chainwhip: W("鎖鞭", { dmg: [1, 6, 2], stat: "敏捷", hit: 5, first: 15, price: 140, i3: { k: "鞭", h: 1, noun: "鎖鞭", mat: "metal", lv: 2, gen: true, from: ["w2_zalgros", "garmund"] } }, "細い鎖を編んだ鞭。闘技場の余興で使う。余興でないときにも使う。"),

    // ---------------------------------------------------------------- 拳具
    i3w_cestus: W("鉄拳", { dmg: [1, 4, 2], stat: "筋力", hit: 10, price: 40, i3: { k: "拳具", h: 1, noun: "拳当て", mat: "metal", lv: 0, gen: true } }, "指に嵌める鉄の輪。酒場の喧嘩が、これ一つで喧嘩でなくなる。"),
    i3w_claws: W("鉤爪", { dmg: [1, 4, 2], stat: "敏捷", hit: 10, vital: 10, price: 90, i3: { k: "拳具", h: 1, noun: "鉤爪", mat: "metal", lv: 1, gen: true, from: ["w2_nagris", "zephara"] } }, "獣人の戦士が、自分の爪の代わりに嵌める。自分の爪を見せたくない者もいる。"),
    i3w_bearpaw: W("熊手の籠手", { dmg: [1, 6, 3], stat: "筋力", hit: 5, price: 220, i3: { k: "拳具", h: 1, lv: 2, from: ["w2_nagris", "zephara"] } }, "熊の獣人の古い籠手。人の手には大きすぎるので、中に布を詰めてある。"),

    // ---------------------------------------------------------------- 農具・暮らしの刃
    i3w_sickle: W("草刈り鎌", { dmg: [1, 4, 1], stat: "筋力", hit: 5, vital: 5, price: 12, i3: { k: "鎌", h: 1, lv: 0, from: ["w2_granbel"] } }, "麦の都の鎌。刈り入れの季節だけ、町じゅうの鍛冶屋がこれしか打たなくなる。"),
    i3w_cleaver: W("骨切り包丁", { dmg: [1, 6, 1], stat: "筋力", vital: 5, price: 22, i3: { k: "短剣", h: 1, lv: 0, from: ["karna", "w2_granbel", "nerva"] } }, "肉屋の包丁。柄の脂は拭いても取れない。"),

    // ---------------------------------------------------------------- 使徒領の素材（落とし物と、深いところの宝）
    i3w_kinfang: W("眷属の牙剣", { dmg: [1, 10, 3], stat: "筋力", hit: 5, vital: 5, price: 600, i3: { k: "剣", h: 1, lv: 4 } }, "眷属の牙を削り出した剣。刃がまだ、ときどき湿る。"),
    i3w_ashblade: W("灰の黒刃", { dmg: [2, 4, 4], stat: "筋力", hit: 5, price: 650, i3: { k: "剣", h: 1, lv: 5 } }, "灰の荒野で拾われる黒い刃。誰が打ったのかは分からない。どこにも継ぎ目がない。"),
    i3w_bonegreat: W("竜骨の大剣", { dmg: [2, 6, 5], stat: "筋力", hit: -5, price: 1100, i3: { k: "剣", h: 2, lv: 5 } }, "竜の墓場の肋骨を一本、そのまま研いだ。重さの割に軽い。持ち主より長生きする。"),
  });
})(globalThis.G = globalThis.G || {});
