// I3：組み合わせの品の部品（材質・前の銘・後ろの銘・稀さ）と、名のある伝説の品（一点もの）。
// 組み合わせの品 = 型（items_i3_*.js の i3.gen の品）＋材質＋銘。作り方と効き目は engine/zzz_gear_i3.js。
// 効き目の欄：w 武器・a 防具・r 装飾品に足すもの（dmg 攻撃の加算・hit 命中・vital 急所・magic 魔法・first 先手・drain 吸う・
//   def 防御・agi 敏捷・stats { 能力値 }・bonus { 行動の種類 }）。装飾品の bonus は fire・heal・steal・trap・talk だけ。
// lv：出回りはじめる深さ（0〜5。町の品ぞろえは町ごとの深さ、宝と落とし物は危険度と階で決まる）、w：出やすさ、p：値段の倍率
// line：説明の文（{noun} は型の名に置き換わる）。文はプレイヤーに見える。docs/lore/voice.md に合わせ、効き目の理由は書かない。レーン I（I3）
(function (G) {
  const D = G.data;
  const I3 = (D.I3 = D.I3 || {});

  I3.RARITY = ["並", "上", "逸品", "伝説"];

  // ---------------------------------------------------------------- 材質（型の i3.mat で付けられる種類が決まる）
  I3.MATS = {
    metal: {
      bronze: { name: "青銅", lv: 0, w: 4, p: 0.6, w_: { dmg: -1 }, a: { agi: -5 }, r: {}, line: "青銅。柔らかく、すぐに刃が丸くなる。そのぶん安い。" },
      iron: { name: "鉄", lv: 0, w: 10, p: 1, w_: {}, a: {}, r: {}, line: "ありふれた鉄。打った者の腕は、まあまあだ。" },
      steel: { name: "鋼", lv: 1, w: 7, p: 1.6, w_: { dmg: 1 }, a: { agi: 5 }, r: {}, line: "よく鍛えた鋼。叩くと澄んだ音がする。" },
      silver: { name: "銀", lv: 1, w: 3, p: 2, w_: { magic: 5, bonus: { heal: 5 } }, a: { magic: 5 }, r: {}, line: "銀。教会の燭台を鋳つぶしたものだ、という噂がついて回る。" },
      blackiron: { name: "黒鉄", lv: 1, w: 4, p: 1.5, w_: { dmg: 1, hit: -5 }, a: { def: 1, agi: -10 }, r: {}, line: "帝国の北の鉱山の黒い鉄。重く、硬く、冷たい。" },
      arcane: { name: "魔鋼", lv: 3, w: 3, p: 3, w_: { dmg: 1, magic: 10 }, a: { def: 1, magic: 5 }, r: {}, line: "共和国の工房の魔鋼。青みがかって、触れると指先がぴりつく。" },
      mithril: { name: "ミスリル", lv: 4, w: 2, p: 4.5, w_: { dmg: 2, hit: 5 }, a: { def: 1, agi: 5 }, r: {}, line: "ミスリル。羽のように軽く、鋼より硬い。打てる鍛冶は、大陸に何人もいない。" },
      dragonbone: { name: "竜骨", lv: 5, w: 1, p: 6, w_: { dmg: 3, hit: -5 }, a: { def: 2, agi: -5 }, r: {}, line: "竜の骨を芯にした。陽の下に置くと、ほんの少し温かくなる。" },
      kinbone: { name: "眷属の骨", lv: 5, w: 1, p: 5, w_: { dmg: 3, drain: 0.1 }, a: { def: 2, magic: 5 }, r: {}, line: "眷属の骨を削り出した。持つ手の脈と、ときどき拍子がずれる。" },
    },
    wood: {
      oak: { name: "樫", lv: 0, w: 10, p: 1, w_: {}, line: "樫の木。重く、しなりが少ない。" },
      ash: { name: "とねりこ", lv: 0, w: 6, p: 1.3, w_: { hit: 5 }, line: "とねりこの木。よくしなり、手に吸いつく。" },
      yew: { name: "いちい", lv: 1, w: 5, p: 1.6, w_: { dmg: 1 }, line: "いちいの木。赤い芯と白い皮が、一本の中で背中合わせになっている。" },
      ebony: { name: "黒檀", lv: 2, w: 3, p: 2.5, w_: { dmg: 1, magic: 5 }, line: "黒檀。水に沈むほど重い。磨くと、顔が映る。" },
      silverleaf: { name: "銀葉樹", lv: 3, w: 2, p: 4, w_: { hit: 5, magic: 10 }, line: "エルフの森の銀葉樹。切り出してから何年経っても、木目から若葉の匂いがする。" },
      dragonbone: { name: "竜骨", lv: 5, w: 1, p: 6, w_: { dmg: 3, hit: -5 }, line: "竜の骨を芯にした。陽の下に置くと、ほんの少し温かくなる。" },
    },
    cloth: {
      hemp: { name: "麻", lv: 0, w: 10, p: 0.8, a: {}, line: "麻。ごわごわしていて、洗うほど柔らかくなる。" },
      wool: { name: "羊毛", lv: 0, w: 7, p: 1.2, a: { stats: { 体力: 2 } }, line: "厚い羊毛。冬の街道で、これに命を救われた者は多い。" },
      silk: { name: "絹", lv: 2, w: 3, p: 2.5, a: { agi: 5, magic: 5 }, line: "絹。肌に触れているのを忘れるほど軽い。" },
      spider: { name: "大蜘蛛の糸", lv: 3, w: 2, p: 3.5, a: { def: 1, agi: 5 }, line: "大蜘蛛の糸を織った。刃を当てると、刃のほうが滑る。" },
      ash: { name: "灰の布", lv: 5, w: 1, p: 5, a: { magic: 10, def: 1 }, line: "灰の荒野の布。どこで織られたのか、誰も知らない。煤の匂いがしない。" },
    },
    leather: {
      cow: { name: "牛革", lv: 0, w: 10, p: 1, a: {}, w_: {}, line: "牛の革。丈夫で、どこでも手に入る。" },
      deer: { name: "鹿革", lv: 0, w: 6, p: 1.4, a: { agi: 5 }, w_: { hit: 5 }, line: "鹿の革。柔らかく、動きを邪魔しない。" },
      boar: { name: "猪革", lv: 1, w: 5, p: 1.4, a: { stats: { 体力: 3 } }, w_: { dmg: 1 }, line: "猪の革。分厚く、毛穴が粗い。" },
      wyvern: { name: "翼竜革", lv: 3, w: 2, p: 3, a: { def: 1 }, w_: { dmg: 1, first: 10 }, line: "翼竜の革。薄く硬く、陽に透かすと血管の跡が見える。" },
      dragon: { name: "竜革", lv: 5, w: 1, p: 6, a: { def: 1, agi: 5 }, w_: { dmg: 2, first: 10 }, line: "竜の革。なめすのに一年かかる。なめした職人は、その一年で白髪になった。" },
    },
    hide: {
      wolf: { name: "狼", lv: 0, w: 10, p: 1, a: { agi: 5 }, line: "狼の毛皮。灰色の毛が、風の向きに逆立つ。" },
      bear: { name: "熊", lv: 1, w: 6, p: 1.5, a: { stats: { 体力: 3 } }, line: "熊の毛皮。重い。重さの分だけ、温かい。" },
      wyvern: { name: "翼竜", lv: 3, w: 2, p: 3, a: { def: 1 }, line: "翼竜の皮。鱗の名残が、指でなぞるとざらつく。" },
      kin: { name: "眷属", lv: 5, w: 1, p: 5, a: { def: 1, magic: 5 }, line: "眷属の皮。まだ、ときどき鳥肌が立つ。" },
    },
    gem: {
      copper: { name: "銅", lv: 0, w: 10, p: 0.7, r: {}, line: "銅。すぐに緑青が浮く。指が緑になる。" },
      silver: { name: "銀", lv: 0, w: 7, p: 1.3, r: { stats: { 魔力: 2 } }, line: "銀。磨けば光る。磨かなければ、黒くなる。" },
      gold: { name: "金", lv: 1, w: 4, p: 2.5, r: { stats: { 魅力: 3 } }, line: "金。重い。見せびらかすと、狙われる。" },
      amber: { name: "琥珀", lv: 1, w: 4, p: 1.8, r: { stats: { 体力: 3 } }, line: "琥珀。中に小さな羽虫が閉じ込められている。まだ逃げようとしている格好のまま。" },
      obsidian: { name: "黒曜石", lv: 2, w: 3, p: 2, r: { stats: { 筋力: 3 } }, line: "黒曜石。割れ口が刃物のように鋭い。" },
      moonstone: { name: "月長石", lv: 2, w: 3, p: 2.5, r: { magic: 5 }, line: "月長石。傾けると、奥で青白い光が泳ぐ。満月の晩は、少しうるさい。" },
      dragoneye: { name: "竜の瞳石", lv: 5, w: 1, p: 6, r: { stats: { 筋力: 3, 魔力: 3 } }, line: "竜の瞳石。縦に細い筋が一本。見ているうちに、筋が少し太くなる。" },
    },
  };

  // ---------------------------------------------------------------- 前の銘（形容。名の頭に付く）
  // curse：呪われた品（外すと傷を負う・持っていると心が削れる）。rank：稀さに数える重み（0 は数えない）
  I3.PRE = {
    sharp: { name: "鋭い", lv: 0, w: 8, p: 1.4, rank: 1, w_: { dmg: 1, vital: 5 }, line: "刃は、落とした髪の毛が二つに分かれるほど研いである。" },
    heavy: { name: "重い", lv: 0, w: 6, p: 1.3, rank: 1, w_: { dmg: 2, hit: -10 }, a: { def: 1, agi: -10 }, line: "持ち上げると、思ったより腕が沈む。" },
    light: { name: "軽い", lv: 0, w: 6, p: 1.3, rank: 1, w_: { hit: 5, first: 10 }, a: { agi: 5 }, line: "驚くほど軽い。作った者が、どこかで手を抜いたのではないかと疑うほどに。" },
    sturdy: { name: "頑丈な", lv: 1, w: 5, p: 1.4, rank: 1, a: { def: 1 }, r: { stats: { 体力: 3 } }, line: "どこを叩いても、びくともしない。" },
    fine: { name: "見事な", lv: 2, w: 3, p: 1.8, rank: 1, w_: { dmg: 1, hit: 5 }, a: { def: 1, agi: 5 }, r: { magic: 3, stats: { 魅力: 3 } }, line: "仕上げが見事だ。どこの工房のものか、刻印を探したが見つからない。" },
    swift: { name: "疾い", lv: 1, w: 4, p: 1.5, rank: 1, w_: { first: 25 }, r: { first: 15 }, line: "構えた瞬間に、もう手が前に出ている。" },
    burning: { name: "燃える", lv: 2, w: 3, p: 1.8, rank: 1, w_: { dmg: 1, bonus: { fire: 10 } }, a: { bonus: { fire: 5 } }, r: { bonus: { fire: 10 } }, line: "触れると、ほんのり熱い。冬の夜は、抱いて寝られる。" },
    frozen: { name: "凍える", lv: 2, w: 3, p: 1.8, rank: 1, w_: { dmg: 1, bonus: { ice: 10 } }, a: { bonus: { ice: 5 } }, line: "いつも表面に薄く霜が降りている。夏でも、溶けない。" },
    thirsty: { name: "渇いた", lv: 3, w: 2, p: 2.2, rank: 1, w_: { drain: 0.15 }, r: { drain: 0.1 }, line: "血を浴びると、すぐに乾く。乾いたあとは、少しだけ満足げに見える。" },
    blessed: { name: "祝福された", lv: 1, w: 3, p: 1.6, rank: 1, w_: { magic: 3, bonus: { heal: 10 } }, a: { bonus: { heal: 10 } }, r: { bonus: { heal: 10 } }, line: "どこかの司祭が三つの印を切って祝福したらしい。祈りの言葉が、小さく刻まれている。" },
    whisper: { name: "囁く", lv: 2, w: 3, p: 1.8, rank: 1, w_: { magic: 10 }, a: { magic: 8 }, r: { magic: 8 }, line: "耳を近づけると、何か言っている。言葉は分からない。術の文句に似ている。" },
    crude: { name: "粗末な", lv: 0, w: 5, p: 0.5, rank: 0, w_: { dmg: -1 }, a: { agi: -5 }, r: { stats: { 魅力: -2 } }, line: "作りが粗い。打った者は、たぶん見習いだ。" },
    cursed: { name: "呪われた", lv: 1, w: 2, p: 0.6, rank: 1, curse: true, w_: { dmg: 4, stats: { 魅力: -10 } }, a: { def: 2, stats: { 魅力: -10 } }, r: { stats: { 筋力: 8, 魔力: 8, 魅力: -10 } }, line: "手にした途端、肌に吸いついた。持っていると、夜ごと、知らない誰かの夢を見る。" },
  };

  // ---------------------------------------------------------------- 後ろの銘（「〜の」。名の頭に付く）
  I3.SUF = {
    hunter: { name: "狩人の", lv: 0, w: 6, p: 1.4, rank: 1, w_: { first: 15, vital: 5 }, a: { agi: 5 }, r: { bonus: { trap: 10 } }, line: "柄か裏地に、獣の数を数えた刻み目がある。" },
    traveler: { name: "旅人の", lv: 0, w: 6, p: 1.3, rank: 1, w_: { stats: { 体力: 3 } }, a: { stats: { 体力: 3, 敏捷: 3 } }, r: { stats: { 体力: 3, 敏捷: 3 } }, line: "あちこちの町の土が、少しずつこびりついている。" },
    knight: { name: "騎士の", lv: 1, w: 4, p: 1.5, rank: 1, w_: { hit: 5, stats: { 魅力: 3 } }, a: { def: 1, stats: { 魅力: 3 } }, r: { stats: { 魅力: 5 } }, line: "紋章を削り取った跡がある。家を出たのか、家が無くなったのか。" },
    thief: { name: "盗賊の", lv: 0, w: 5, p: 1.4, rank: 1, w_: { vital: 10 }, a: { bonus: { steal: 10 } }, r: { bonus: { steal: 10 } }, line: "持ち主が三度変わった。三度とも、黙って変わった。" },
    scholar: { name: "学者の", lv: 1, w: 4, p: 1.5, rank: 1, w_: { magic: 5, stats: { 知力: 3 } }, a: { stats: { 知力: 5 } }, r: { stats: { 知力: 5 } }, line: "細かい字の書き込みがある。数式のようにも、買い物の覚え書きのようにも見える。" },
    giant: { name: "巨人の", lv: 2, w: 3, p: 1.6, rank: 1, w_: { dmg: 1, stats: { 筋力: 3 } }, a: { stats: { 筋力: 5 } }, r: { stats: { 筋力: 5 } }, line: "人の手には少し大きい。前の持ち主は、扉をくぐるとき屈んでいたのだろう。" },
    cat: { name: "猫の", lv: 0, w: 5, p: 1.4, rank: 1, w_: { stats: { 敏捷: 5 } }, a: { stats: { 敏捷: 5 } }, r: { stats: { 敏捷: 5 } }, line: "どこかに、小さな爪の跡がある。" },
    bear: { name: "熊の", lv: 1, w: 4, p: 1.5, rank: 1, w_: { stats: { 体力: 5 } }, a: { stats: { 体力: 5 } }, r: { stats: { 体力: 5 } }, line: "獣の脂の匂いが、いくら洗っても抜けない。" },
    fox: { name: "狐の", lv: 0, w: 4, p: 1.4, rank: 1, w_: { bonus: { talk: 5 }, stats: { 魅力: 3 } }, a: { bonus: { talk: 10 } }, r: { bonus: { talk: 10 } }, line: "見る角度で、色が少し違って見える。" },
    saint: { name: "聖者の", lv: 2, w: 3, p: 1.6, rank: 1, w_: { bonus: { heal: 10 } }, a: { bonus: { heal: 10 }, magic: 3 }, r: { bonus: { heal: 10 } }, line: "巡礼の札が一枚、紐で結わえてある。行き先の字は擦り切れている。" },
    witch: { name: "魔女の", lv: 2, w: 3, p: 1.6, rank: 1, w_: { magic: 8, bonus: { curse: 10 } }, a: { magic: 8 }, r: { stats: { 魔力: 5 } }, line: "乾いた薬草の束が、どこかに挟まっていた。捨てても、翌朝また挟まっている。" },
    storm: { name: "嵐の", lv: 3, w: 2, p: 1.8, rank: 1, w_: { dmg: 1, bonus: { bolt: 10 } }, a: { bonus: { bolt: 5 } }, r: { stats: { 敏捷: 3, 魔力: 3 } }, line: "雷の鳴る日は、指先がぴりぴりする。" },
    smith: { name: "名工の", lv: 3, w: 2, p: 2, rank: 1, w_: { dmg: 1, hit: 5 }, a: { def: 1 }, r: { magic: 5 }, line: "根元に、小さな槌の印。鍛冶の都では、この印を見ると親方たちが黙る。" },
    night: { name: "夜の", lv: 1, w: 4, p: 1.4, rank: 1, w_: { vital: 5, first: 10 }, a: { agi: 5, bonus: { steal: 5 } }, r: { stats: { 敏捷: 3 }, bonus: { steal: 5 } }, line: "暗いところに置くと、輪郭がぼやけて見えなくなる。" },
    grave: { name: "墓守の", lv: 2, w: 3, p: 1.5, rank: 1, w_: { bonus: { heal: 5, curse: 5 }, vital: 5 }, a: { magic: 5, bonus: { heal: 5 } }, r: { bonus: { heal: 5 }, stats: { 知力: 3 } }, line: "土の匂いがする。湿った、夜明け前の土の匂いだ。" },
  };

  // ---------------------------------------------------------------- 正体の分からない品・錆びた品の文
  I3.UNKNOWN_LINE = "まだ何の品か分からない。鍛冶屋か商店で見てもらうか、身に着けてみれば分かる。";
  I3.RUST_LINE = "ひどく錆びている。鍛冶屋に磨かせれば、元の姿に戻るだろう。";
  I3.WORN_LINE = "ひどく傷んでいる。鍛冶屋に繕わせれば、元の姿に戻るだろう。"; // 金属でない品（木・布・革・毛皮）
  I3.CURSE_FOUND = ["{name}は、手に吸いついて離れない。呪われている。", "{name}を身に着けた途端、耳の奥で誰かが笑った。呪われている。", "{name}は、外そうとすると指に食い込んだ。呪われている。"];

  // ---------------------------------------------------------------- 名のある伝説の品（一点もの。一つの冒険で一度だけ手に入る）
  // legend：伝説の品の印。from：入手先の手がかり（図鑑の文。apostle＝使徒の骸、deep＝深い迷宮の宝、ev:〜＝出来事）
  Object.assign(D.ITEMS, {
    i3l_dawnspear: { name: "暁を縫う槍", type: "weapon", dmg: [1, 10, 4], stat: "筋力", hit: 5, first: 40, price: 900, legend: true, from: "ev", desc: "穂先が、夜明け前の空の色をしている。突くと、その先の闇に細い縫い目ができる。すぐ閉じる。" },
    i3l_fatheraxe: { name: "戻らぬ父の斧", type: "weapon", dmg: [1, 10, 5], stat: "筋力", hit: -5, stats: { 体力: 5 }, price: 800, legend: true, from: "ev", desc: "砦に行ったまま戻らなかった男の斧。柄に、子の名前が三つ彫ってある。四つ目を彫る途中で止まっている。" },
    i3l_saltbite: { name: "塩噛み", type: "weapon", dmg: [1, 8, 4], stat: "敏捷", hit: 10, vital: 10, price: 850, legend: true, from: "ev", desc: "沈んだ船から上がった曲刀。刃に、白く塩が噛みついている。拭っても、翌朝にはまた噛みついている。" },
    i3l_lastbell: { name: "最後の鐘", type: "weapon", dmg: [2, 6, 2], stat: "筋力", magic: 15, bonus: { heal: 15 }, price: 950, legend: true, from: "deep", desc: "滅んだ町の鐘楼から外された鐘の舌。振ると、遠くで誰かが一度だけ鐘を鳴らす。誰も鳴らしていない。" },
    i3l_nameless: { name: "名無しの剣", type: "weapon", dmg: [1, 10, 5], stat: "筋力", hit: 10, vital: 5, price: 1200, legend: true, from: "deep", desc: "銘が削られた剣。削った跡の下に、もう一度削った跡がある。その下にも。" },
    i3l_greywing: { name: "灰翼の弓", type: "weapon", dmg: [1, 10, 4], stat: "敏捷", hit: 10, first: 50, price: 1100, legend: true, from: "apostle", desc: "使徒の骸のそばに落ちていた弓。弦を引くと、灰色の羽根が一枚舞う。どこから来たのかは分からない。" },
    i3l_heartgauntlet: { name: "脈打つ籠手", type: "weapon", dmg: [1, 8, 5], stat: "筋力", hit: 10, drain: 0.2, price: 1000, legend: true, from: "apostle", desc: "使徒の骸から剥がれた籠手。嵌めると、自分のものではない脈が手首を打つ。" },
    i3l_thousandstitch: { name: "千針の外套", type: "armor", def: 3, agi: 10, magic: 5, price: 900, legend: true, from: "ev", desc: "千人の女が一針ずつ縫った外套。戦に出る男のために。男は帰らなかった。外套は帰ってきた。" },
    i3l_ashshell: { name: "灰殻の鎧", type: "armor", def: 6, agi: -5, magic: 5, price: 1600, legend: true, from: "apostle", desc: "使徒の骸の殻を削って作った鎧。叩くと、中が空洞のような音がする。中には、あなたがいる。" },
    i3l_moonring: { name: "月を呑んだ指輪", type: "ring", stats: { 魔力: 10, 知力: 5 }, magic: 10, price: 1200, legend: true, from: "deep", desc: "魔力+10・知力+5・魔法+10。石の中に、欠けた月がひとつ沈んでいる。満ちたり欠けたりする。空の月とは、合っていない。" },
    i3l_wolfking: { name: "群れ長の首輪", type: "ring", stats: { 筋力: 6, 敏捷: 6 }, first: 20, price: 1000, legend: true, from: "apostle", desc: "筋力+6・敏捷+6・先手+20。大きな獣の首に巻かれていた革の輪。人の首には、三重に巻ける。" },
  });

  // 伝説の品の出る先
  I3.LEGEND_DEEP = ["i3l_lastbell", "i3l_nameless", "i3l_moonring"];
  I3.LEGEND_APOSTLE = ["i3l_greywing", "i3l_heartgauntlet", "i3l_ashshell", "i3l_wolfking", "i3l_nameless"];

  // ---------------------------------------------------------------- 伝説の品の出来事
  D.EVENTS.push(
    {
      id: "i3_dawnspear", where: ["plains", "mountains", "frost"], w: 1, once: true, cond: (S) => S.fame >= 40, title: "夜明けの墓標", who: { kind: "elder", sex: "女", age: 71, look: { head: "kerchief", mouth: "flat" } },
      text: "丘の上に、槍が一本突き立っている。墓標の代わりらしい。根元に、枯れた花と、新しい花が混じって供えてある。東の空が白みはじめると、穂先だけが先に明るくなった。",
      choices: [
        { label: "槍を抜く", stat: "筋力", diff: "難しい", ok: { text: "槍は、待っていたかのように抜けた。穂先の色は、空の色と同じだった。抜いた穴に、あなたは持っていた花を挿した。", item: "i3l_dawnspear", chron: "丘の墓標の槍を抜く", memo: "丘の上の墓標から、夜明けの色の槍を抜いた" }, ng: { text: "びくともしない。肩を痛めた。花を供えに来たらしい老婆が、丘の下からじっとこちらを見ていた。", hp: -2 } },
        { label: "花を供えて立ち去る", ok: { text: "あなたは野の花を一輪、根元に置いた。背中で、穂先が少しだけ明るくなった気がした。", grow: { 魅力: 1 } } },
      ],
    },
    {
      id: "i3_fatheraxe", where: ["fort"], w: 2, once: true, title: "預かりものの斧", who: "guard",
      text: "砦の物置の隅に、名札の付いた斧が立てかけてある。番兵が言う。「持ち主が戻ったら返すことになってる。もう十年になる。家族に返そうにも、誰も取りに来ねえ」",
      choices: [
        { label: "家族を探して届けると申し出る", stat: "魅力", diff: "普通", bonus: "talk", ok: { text: "番兵は肩をすくめて斧を渡した。「届けられなかったら、使ってやってくれ。斧も、そのほうがいい」名札の村は、地図のどこにも無かった。", item: "i3l_fatheraxe", memo: "黒鉄の砦で、戻らぬ男の斧を預かった。届け先の村は、もう無い" }, ng: { text: "「よそ者に渡せるかよ」番兵は斧の前に立ちはだかった。" } },
        { label: "そっとしておく", ok: { text: "斧の名札が、すきま風に揺れていた。" } },
      ],
    },
    {
      id: "i3_saltbite", where: ["nerva", "yakumo"], w: 1, once: true, title: "網に掛かった刀", who: { kind: "sailor", sex: "男", age: 58, look: { head: "cap", mouth: "flat", marks: ["beard"] } },
      text: "浜で漁師たちが騒いでいる。網に、錆びた曲刀が掛かったのだ。刃には白く塩が噛みついていて、誰も素手で触りたがらない。「沈んだ船のもんだ。縁起でもねえ」",
      choices: [
        { label: "買い取る（80G）", cost: 80, ok: { text: "漁師たちはほっとした顔で銀貨を受け取った。刀は、手に取ると思ったより軽かった。塩が、指に噛みつく。痛くはない。", item: "i3l_saltbite", memo: "港で、沈んだ船の曲刀を買い取った" } },
        { label: "海に返してやれと言う", ok: { text: "年寄りの漁師が頷き、刀を沖へ放った。水音のあと、しばらく海鳥が鳴きやんだ。" } },
      ],
    },
    {
      id: "i3_thousandstitch", where: ["w2_granbel", "leavel", "karna"], w: 1, once: true, cond: (S) => S.fame >= 30, title: "千人針の外套", who: { kind: "elder", sex: "女", age: 76, look: { head: "kerchief", brows: "worried" } },
      text: "教会の前で、老いた女たちが一枚の外套を囲んでいる。ひとりが、あなたの剣を見て言った。「あんた、戦に出る人かね。……これを着ておくれ。着る人が、もういないんだよ」",
      choices: [
        { label: "受け取る", ok: { text: "外套は、針の跡でびっしりだった。千人分の結び目。女たちは、あなたが袖を通すのを、黙って見ていた。", item: "i3l_thousandstitch", chron: "千人針の外套を託される" } },
        { label: "「着る人を、待っていてやってくれ」と断る", ok: { text: "女たちは顔を見合わせ、外套を畳み直した。ひとりが、指で小さく三つの印を切った。", grow: { 魅力: 1 } } },
      ],
    },
  );
})(globalThis.G = globalThis.G || {});
