// I5：靴（足）。I2 の 7 種に 10 種を足し、足ならではの性格を付ける（欄の決まりは items_i5_armor.js の頭）。
//   素早さ（agi）・先手（first）・逃げ（flee）・地形（land：雪・沼・山・砂と灰・森・迷宮・遺跡）・忍び足（bonus.steal）・罠（bonus.trap）・長旅（march）。
//   山（W10）・迷宮（W11）・遺跡（W12）は、場所に terrain を書くか、名前と場面から拾う（I5.TERRAIN）。
// 設定から：北の烽火台の雪靴／水の都の泥採りの長靴／最後の村の山の民の鋲靴／発掘人の町の革靴／火山の都の灰除けの脚絆／
//   商都の飛脚の靴／巡礼の宿場の草履／帝国の兵の鉄靴／朧島の足袋／使徒領の灰歩きの靴。レーン I（I5）
(function (G) {
  const D = G.data;
  const F = (name, o, desc) => Object.assign({ name, type: "armor", slot: "feet", def: 0, agi: 0, desc }, o);

  Object.assign(D.ITEMS, {
    i5f_snowshoe: F("かんじきの雪靴", { agi: -5, price: 45, stats: { 体力: 2 }, i5: { land: { snow: 20 } }, i3: { k: "靴", noun: "雪靴", mat: "hide", lv: 0, gen: true, from: ["w7_frostgate", "w7_lastvillage", "garmund"] } }, "毛皮の長靴の底に、蔓を輪に編んだかんじきを括りつけた。"),
    i5f_bogboots: F("沼渡りの長靴", { agi: -5, price: 60, i5: { land: { bog: 20 } }, i3: { k: "長靴", noun: "沼靴", mat: "leather", lv: 0, gen: true, from: ["w4_tulier", "w2_amyrein", "zephara"] } }, "腰まである革の長靴。継ぎ目に松脂を詰めてある。"),
    i5f_pilgrim: F("巡礼の草履", { price: 18, i5: { march: 25, nerve: 5 }, i3: { k: "履物", noun: "草履", mat: "cloth", lv: 0, from: ["w7_orbe", "w1_holy", "w7_serena"] } }, "鼻緒に祈りの結び目を三つ作った草履。"),
    i5f_climbers: F("山の民の鋲靴", { def: 1, price: 110, bonus: { trap: 5 }, i5: { land: { mount: 20, snow: 5 } }, i3: { k: "靴", noun: "鋲靴", mat: "leather", lv: 1, gen: true, from: ["w7_lastvillage", "w7_hermitage", "w4_kaesverg"] } }, "厚い革の底に、鉄の鋲を十二本打った靴。"),
    i5f_digboots: F("発掘人の革靴", { def: 1, price: 95, bonus: { trap: 10 }, i5: { land: { ruin: 15, maze: 5 } }, i3: { k: "靴", noun: "発掘靴", mat: "leather", lv: 1, gen: true, from: ["w7_durm"] } }, "爪先に鉄板を入れた、足首まである革靴。"),
    i5f_ashwraps: F("灰除けの脚絆", { agi: 5, price: 130, i5: { land: { sand: 15, mount: 5 } }, i3: { k: "脚絆", noun: "脚絆", mat: "cloth", lv: 2, from: ["w3_frosleia"] } }, "麻の布を脛から足首まで固く巻く。上から灰の布を重ねる。"),
    i5f_courier: F("飛脚の早駆け靴", { agi: 5, price: 160, i5: { flee: 15, march: 20 }, i3: { k: "靴", noun: "早駆け靴", mat: "leather", lv: 1, from: ["karna", "w7_russen", "w3_carmeland"] } }, "踵の無い、底の薄い軽い靴。冒険者ギルドの飛脚が履く。"),
    i5f_ironshod: F("帝国兵の鉄靴", { def: 1, agi: -5, price: 75, i5: { land: { bog: -10 } }, i3: { k: "脚甲", noun: "鉄靴", mat: "metal", lv: 1, gen: true, from: ["garmund", "w7_brenark", "fort"] } }, "爪先と脛に鉄板を打った、兵隊の長靴。"),
    i5f_tabi: F("朧島の足袋", { agi: 5, first: 5, price: 115, bonus: { steal: 10 }, i5: { flee: 5 }, i3: { k: "履物", noun: "足袋", mat: "cloth", lv: 1, from: ["w1_oboro", "yakumo"] } }, "指の股が二つに分かれた、底の柔らかい布の履物。"),
    i5f_ashwalker: F("灰歩きの靴", { agi: 10, first: 10, price: 850, i5: { land: { sand: 20, mount: 10 }, march: 20 }, i3: { k: "靴", lv: 5 } }, "灰の荒野で拾った、持ち主の分からない靴。"),
  });

  Object.assign(D.E12.ARMOR, {
    i5f_snowshoe: "ice-- fire+", i5f_bogboots: "earth--", i5f_pilgrim: "dark- fire+", i5f_climbers: "earth- slash-", i5f_digboots: "pierce- earth-",
    i5f_ashwraps: "fire- earth-", i5f_courier: "wind- pierce+", i5f_ironshod: "blunt- ice+", i5f_tabi: "fire+ wind-", i5f_ashwalker: "fire- dark-",
  });

  // I2 の靴に、足の性格を足す（値はそのまま）
  const MORE = {
    i2s_sandals: { i5: { flee: 5 } },
    i2s_shoes: { i5: { march: 10 } },
    i2s_leatherboots: { i5: { land: { bog: 10 } } },
    i2s_softboots: { i5: { flee: 5 } },
    i2s_greaves: { i5: { land: { mount: 5 } } },
    i2s_sabaton: { i5: { land: { bog: -10 } }, bonus: { steal: -10 } },
    i2s_elfboots: { i5: { land: { wood: 15 } } },
  };
  Object.entries(MORE).forEach(([id, o]) => {
    const it = D.ITEMS[id];
    if (!it) return;
    if (o.i5) it.i5 = Object.assign({}, it.i5 || {}, o.i5);
    if (o.bonus) it.bonus = Object.assign({}, it.bonus || {}, o.bonus);
  });

  const FL = (D.I2_FLAVOR = D.I2_FLAVOR || {});
  Object.assign(FL, {
    i5f_snowshoe: "北の烽火台ヴェルトの兵が、薪を運ぶときに履く雪靴。雪の上では沈まずに歩けるが、石畳ではただの重い靴だ。毛皮の底は焚き火の熱で縮むので、乾かす場所に気をつける。",
    i5f_bogboots: "水の都トゥリエルの泥採りが、湖の底の泥を掬うときに履く長靴。ぬかるみでも足が抜ける。陸に上がると、歩くたびに中で水が鳴る。",
    i5f_pilgrim: "巡礼の宿場オルベで、聖都へ向かう巡礼に配る草履。鼻緒の三つの結び目は、三柱の神に一つずつ。長い道でも足が止まらず、足の止まらない巡礼は追い剥ぎにも狙われにくい。",
    i5f_climbers: "最後の村ハルトの山の民が、断界山脈の石を掘りに行くときに履く靴。鋲が凍った岩にも食い込み、足もとの割れ目にも気づきやすい。村の子どもは、この靴の音で父親の帰りを知る。",
    i5f_digboots: "発掘人の町ドゥルムの靴屋が、遺構に潜る発掘人のために作る革靴。爪先の鉄板が崩れた石から指を守り、底の薄さが床の仕掛けを足に伝える。どの靴にも、古い時代の土がこびりついている。",
    i5f_ashwraps: "火山の都フロスレイアの学者が、灰の斜面を登るときに巻く脚絆。熱い灰も砂も中に入らない。研究所の戸口には、脱いだ脚絆が灰まみれで山になっている。",
    i5f_courier: "商都ブランデールの冒険者ギルドの飛脚が履く靴。踵が無いので音がせず、走り出しが速い。飛脚は追い剥ぎに会うと、荷を抱えたまま逃げる稽古を、最初の月に毎日させられる。",
    i5f_ironshod: "帝国の兵が一足ずつ支給される鉄靴。蹴られても脛は痛くないが、ぬかるみでは鉄の分だけ沈む。冬になると鉄が冷えて、兵は靴の中に藁を詰める。",
    i5f_tabi: "シェルアーク・朧島の忍びが好む足袋。底が柔らかく、板の間を歩いても軋ませない。島では、この足袋を履いた客を宿が嫌がる。払う前に出ていくからだ。",
    i5f_ashwalker: "灰の荒野で拾った靴。灰の上でも岩の上でも足が軽く、どこまで歩いても疲れない。前の持ち主がどこへ行ったのか、靴は何も言わない。",
  });
})(globalThis.G = globalThis.G || {});
