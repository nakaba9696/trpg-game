// I3：防具の型を増やす（布・革・鎖・板金・ローブ・獣皮。国・種族・使徒の素材の品も）。
// 欄は items.js と同じ（def・agi・magic）。重いほど身のこなしと術の通りが落ちる（agi・magic が負になる）。
// I3 で足した欄：stats・bonus（指輪と同じ）、i3 = { k 型の名, noun, mat, lv, from, gen }（items_i3_weapons.js の頭を見る）。レーン I（I3）
(function (G) {
  const D = G.data;
  const A = (name, o, desc) => Object.assign({ name, type: "armor", agi: 0, desc }, o);

  Object.assign(D.ITEMS, {
    // ---------------------------------------------------------------- 布
    i3a_tunic: A("厚手の上着", { def: 0, agi: 5, price: 6, i3: { k: "布", noun: "上着", mat: "cloth", lv: 0, gen: true } }, "鎧とは呼べない。ただ、枝に引っかけても破れない。"),
    i3a_gambeson: A("綿入れの鎧下", { def: 1, price: 20, i3: { k: "布", noun: "鎧下", mat: "cloth", lv: 0, gen: true } }, "布を何枚も重ねて縫った胴着。鎧の下に着るものだが、これだけで戦う者も多い。夏は地獄。"),
    i3a_travelcloak: A("旅の外套", { def: 1, agi: 5, price: 45, i3: { k: "布", noun: "外套", mat: "cloth", lv: 0, gen: true } }, "雨も夜露も、たいていの小石も弾く。前の持ち主の名が、襟の裏に縫い取ってある。"),
    i3a_monkrobe: A("修道衣", { def: 0, magic: 5, bonus: { heal: 5 }, price: 40, i3: { k: "ローブ", noun: "修道衣", mat: "cloth", lv: 0, gen: true, from: ["w1_holy", "leavel", "w2_amyrein"] } }, "教会の下働きが着る粗い衣。腰の縄の結び目の数で、勤めた年が分かる。"),
    i3a_silkrobe: A("絹の術衣", { def: 1, agi: 5, magic: 12, price: 420, i3: { k: "ローブ", lv: 3, from: ["zephara"] } }, "学院の師が着る衣。袖口に、術の失敗で焦げた跡がいくつもある。"),
    i3a_vestment: A("祭服", { def: 1, magic: 8, bonus: { heal: 10 }, price: 300, i3: { k: "ローブ", lv: 2, from: ["w1_holy"] } }, "聖都の司祭の白い衣。三柱の神を表す三本の金糸。洗濯女は、この金糸のせいで指を切る。"),
    i3a_scholarcoat: A("学院の外套", { def: 0, magic: 8, stats: { 知力: 3 }, price: 120, i3: { k: "ローブ", noun: "学衣", mat: "cloth", lv: 1, gen: true, from: ["zephara"] } }, "学院の生徒の外套。肘のところに、机に突っ伏した跡がある。"),
    i3a_dancer: A("踊り子の衣装", { def: 0, agi: 10, bonus: { talk: 10 }, price: 120, i3: { k: "布", lv: 1, from: ["nerva", "w2_zalgros", "karna"] } }, "鈴のついた薄い衣。鎧の代わりにはならない。視線の代わりにはなる。"),
    i3a_kosode: A("島の小袖", { def: 0, agi: 5, bonus: { talk: 5 }, price: 60, i3: { k: "布", lv: 0, from: ["yakumo", "w1_oboro"] } }, "島の都シェルアークの普段着。袖の柄で、どこの家の者か分かる。"),
    i3a_yukata: A("湯上がりの浴衣", { def: 0, agi: 5, stats: { 体力: 2 }, price: 25, i3: { k: "布", lv: 0, from: ["w2_amyrein"] } }, "湯の町アミュレインの宿で貸してくれる浴衣。返し忘れて持ってきてしまった。"),

    // ---------------------------------------------------------------- 革
    i3a_hardleather: A("硬革の鎧", { def: 2, agi: -5, price: 70, i3: { k: "革", noun: "硬革鎧", mat: "leather", lv: 0, gen: true } }, "煮て固めた革を重ねた鎧。乾くと板のようになる。濡れると匂う。"),
    i3a_studded: A("鋲打ちの革鎧", { def: 2, price: 150, i3: { k: "革", noun: "鋲打ち鎧", mat: "leather", lv: 1, gen: true } }, "革に鉄の鋲をびっしり打った。歩くと、じゃらじゃらうるさい。"),
    i3a_nightleather: A("夜歩きの革服", { def: 1, agi: 5, bonus: { steal: 5 }, price: 130, i3: { k: "革", noun: "夜歩きの服", mat: "leather", lv: 1, gen: true, from: ["karna", "w1_holy", "garmund", "w2_zalgros"] } }, "黒く染めた柔らかい革。音がしない。裏路地の店でしか売っていないことになっている。"),
    i3a_hunterleather: A("狩人の革鎧", { def: 1, agi: 5, price: 90, i3: { k: "革", noun: "狩り装束", mat: "leather", lv: 0, gen: true, from: ["w2_nagris", "karna"] } }, "肩と胸だけを覆う革。腕は自由に動く。袖には獣の毛がついたまま。"),
    i3a_brigandine: A("板札仕込みの胴着", { def: 3, agi: -5, price: 240, i3: { k: "革", noun: "板札の胴着", mat: "leather", lv: 2, gen: true } }, "革の裏に小さな鉄板を何十枚も鋲留めしてある。表から見るとただの胴着。傭兵は見栄より命を取る。"),
    i3a_gladiator: A("闘士の革帯", { def: 2, agi: 5, stats: { 魅力: 3 }, price: 160, i3: { k: "革", lv: 1, from: ["w2_zalgros"] } }, "胸と肩だけを守る。客に筋肉を見せるためだ。客は守ってくれない。"),
    i3a_oilcoat: A("船乗りの油引き外套", { def: 1, agi: 0, stats: { 体力: 3 }, price: 60, i3: { k: "革", lv: 0, from: ["nerva", "yakumo"] } }, "魚の油を何度も引いた外套。雨を通さない。匂いも、なかなか抜けない。"),

    // ---------------------------------------------------------------- 鎖
    i3a_chainshirt: A("鎖の肌着", { def: 2, magic: -5, price: 160, i3: { k: "鎖", noun: "鎖の肌着", mat: "metal", lv: 1, gen: true } }, "短い鎖帷子。服の下に着られる。術を使う者は、鉄が肌に触れると気が散ると言う。"),
    i3a_scale: A("小札鎧", { def: 3, agi: -10, price: 200, i3: { k: "鎖", noun: "小札鎧", mat: "metal", lv: 1, gen: true } }, "魚の鱗のように小さな板を重ねた鎧。一枚ずつ紐で綴る。綴り直すのに三日かかる。"),
    i3a_hauberk: A("長鎖帷子", { def: 3, agi: -5, magic: -5, price: 300, i3: { k: "鎖", noun: "長鎖帷子", mat: "metal", lv: 2, gen: true } }, "膝まで届く鎖帷子。重さは肩に掛かるので、帯できつく締める。脱ぐときは人の手を借りる。"),

    // ---------------------------------------------------------------- 板金
    i3a_breastplate: A("胸甲", { def: 3, agi: -5, magic: -5, price: 260, i3: { k: "板金", noun: "胸甲", mat: "metal", lv: 1, gen: true } }, "胸と背中だけの鉄板。前に打たれた矢の凹みを、鍛冶屋が叩いて直した跡がある。"),
    i3a_halfplate: A("半板金鎧", { def: 4, agi: -10, magic: -5, price: 420, i3: { k: "板金", noun: "半板金鎧", mat: "metal", lv: 2, gen: true } }, "腕と脚は革、胴は鉄。走れないことはない。長くは走れない。"),
    i3a_fullplate: A("全身甲冑", { def: 5, agi: -20, magic: -10, price: 900, i3: { k: "板金", noun: "全身甲冑", mat: "metal", lv: 3, gen: true, from: ["w2_dranherz", "leavel", "garmund"] } }, "頭から爪先まで鉄。中の人は、自分がどこを向いているのか、ときどき分からなくなる。"),
    i3a_knightplate: A("王国騎士の甲冑", { def: 5, agi: -15, magic: -5, stats: { 魅力: 3 }, price: 1100, i3: { k: "板金", lv: 4, from: ["leavel"] } }, "胸に獅子を打ち出した甲冑。王都の鍛冶組合が一年に十領しか打たない。十一領目は無い。"),
    i3a_blackiron: A("帝国の黒鉄鎧", { def: 4, agi: -10, price: 600, i3: { k: "板金", lv: 3, from: ["garmund", "fort"] } }, "帝国の重装兵の鎧。黒いのは塗りではない。北の鉱山の鉄が、もともと黒いのだ。"),
    i3a_yoroi: A("当世具足", { def: 4, agi: -10, price: 650, i3: { k: "板金", lv: 3, from: ["yakumo"] } }, "島の侍の鎧。漆で塗り固めてあり、潮風に強い。兜の前立ては、家ごとに違う。"),

    // ---------------------------------------------------------------- 獣皮
    i3a_wolfpelt: A("狼の毛皮", { def: 1, agi: 5, price: 40, i3: { k: "獣皮", noun: "毛皮", mat: "hide", lv: 0, gen: true, from: ["w2_nagris", "fort"] } }, "頭を付けたまま肩に掛ける。狼の目の代わりに、黒い石が嵌めてある。"),
    i3a_bearhide: A("熊の皮衣", { def: 2, agi: -5, stats: { 体力: 5 }, price: 180, i3: { k: "獣皮", noun: "皮衣", mat: "hide", lv: 1, gen: true, from: ["w2_nagris", "garmund"] } }, "冬の山の猟師が着る。中は、熊の腹の中みたいに温かい。たぶん。"),
    i3a_beastvest: A("獣人の胸当て", { def: 2, agi: 5, stats: { 筋力: 3 }, price: 200, i3: { k: "獣皮", lv: 2, from: ["zephara", "w2_nagris"] } }, "共和国の獣人の戦士が着る胸当て。尻尾の穴が開いている。人間が着ると、そこから風が入る。"),
    i3a_wyvernleather: A("翼竜革の鎧", { def: 3, agi: 0, price: 520, i3: { k: "獣皮", lv: 3 } }, "翼竜の翼膜をなめして重ねた。薄いのに刃を通さない。陽に透かすと血管の跡が見える。"),
    i3a_leafmail: A("森の民の葉鎧", { def: 3, agi: 5, magic: 5, price: 900, i3: { k: "獣皮", lv: 4, from: ["zephara"] } }, "木の葉の形の小さな板を綴った鎧。触ると冷たく、少し湿っている。枯れない。"),

    // ---------------------------------------------------------------- 使徒領の素材
    i3a_kinhide: A("眷属の皮鎧", { def: 4, agi: 0, magic: 5, price: 1000, i3: { k: "獣皮", lv: 5 } }, "眷属の皮で作った鎧。なめしても、ときどき鳥肌が立つ。着ている者の肌ではない。"),
    i3a_ashmantle: A("灰色の重ね衣", { def: 3, agi: 5, magic: 10, price: 900, i3: { k: "ローブ", lv: 5 } }, "灰の荒野で拾った衣を重ねたもの。何枚重ねても、重さが増えない。"),
    i3a_bonemail: A("竜骨の鎧", { def: 6, agi: -15, magic: -10, price: 1800, i3: { k: "板金", lv: 5 } }, "竜の墓場の骨を削り、鉄の鋲で留めた鎧。夜、骨が鳴る。眠れない者は着ないほうがいい。"),
  });
})(globalThis.G = globalThis.G || {});
