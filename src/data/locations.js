// 場所と地図。type: town（町）/ wild（野外）/ dungeon（迷宮）
// fac: 町の施設 inn 宿屋 / tavern 酒場 / shop 商店 / guild 冒険者ギルド / church 教会 / train 訓練場 / alley 裏路地 / castle 王城
// links: { 行き先: 日数 } は陸路（両方向に書く）。sea: { 行き先: { days, cost } } は船
// pool: 出る敵、danger: 危険度（敵の強さと、旅の途中で襲われる確率）
// dungeon: floors 階数、boss 最奥の主、midboss { 階: 敵 }、reward ボスを倒したときの報酬
// scene: 背景の絵（ui/scene.js）、x / y: 地図上の位置（0〜100）
// レーン W（ワールド）が管理
(function (G) {
  const D = (G.data = G.data || {});

  D.LOCS = {
    karna: {
      name: "自由都市カルナ", region: "自由都市連合", type: "town", danger: 0, scene: "town", x: 44, y: 55,
      desc: "自由都市連合の首都。商人と傭兵と詐欺師がひしめき、金さえあれば何でも買える。冒険者ギルドの本部がある。",
      fac: ["inn", "tavern", "shop", "guild", "church", "train", "alley"],
      shop: ["dagger", "longsword", "axe", "rapier", "leather", "chain", "holywater", "lute"],
      links: { nerva: 2, forest: 1, plains: 2, swamp: 2, zephara: 4 },
    },
    nerva: {
      name: "港町ネルヴァ", region: "自由都市連合", type: "town", danger: 0, scene: "port", x: 22, y: 70,
      desc: "霧深い港町。八雲への船が出る。海賊と密輸業者が昼間から酒を飲んでいる。",
      fac: ["inn", "tavern", "shop", "guild", "alley"],
      shop: ["dagger", "longsword", "leather", "katana"],
      links: { karna: 2, ruins: 2 }, sea: { yakumo: { days: 5, cost: 40 } },
    },
    forest: {
      name: "迷いの森", region: "自由都市連合", type: "wild", danger: 1, scene: "forest", x: 55, y: 68,
      desc: "昼でも薄暗い森。ゴブリンの巣と、酔っ払った樽ゴブリンの宴会場がある。",
      pool: ["goblin", "wolf", "barrelgob", "dogu"], links: { karna: 1, ruins: 2 },
    },
    ruins: {
      name: "古代遺跡ロゥム", region: "自由都市連合", type: "dungeon", danger: 2, scene: "ruins", x: 40, y: 84,
      desc: "神々の時代の遺跡。近ごろ、使徒が住みついたという噂がある。",
      pool: ["goblin", "orc", "spider", "slime", "zombie", "mimic"], floors: 4, boss: "kain",
      reward: { flag: "kain", fame: 40, chron: "古代遺跡ロゥムの最奥で、使徒カインを討ち取る", text: "カインの体が崩れ、遺跡の奥に古い壁画が現れた。三柱の神と、それを見下ろす巨大な目が描かれている。" },
      links: { forest: 2, nerva: 2 },
    },
    plains: {
      name: "白銀の丘陵", region: "聖王国リーヴェル", type: "wild", danger: 1, scene: "plains", x: 28, y: 44,
      desc: "なだらかな丘が続く街道。盗賊と野犬が旅人を狙う。",
      pool: ["wolf", "bandit", "goblin", "dogu", "banditboss"], links: { karna: 2, leavel: 2, frost: 3 },
    },
    leavel: {
      name: "聖王都リーヴェル", region: "聖王国リーヴェル", type: "town", danger: 0, scene: "castle", capital: true, x: 14, y: 36,
      desc: "白い城壁の王都。若き女王エレオノーラが治める。華やかな大通りの裏で、貴族たちが私腹を肥やしている。",
      fac: ["inn", "tavern", "shop", "guild", "church", "train", "castle"],
      shop: ["longsword", "rapier", "chain", "plate", "holywater", "mithril"],
      links: { plains: 2 },
    },
    frost: {
      name: "凍てつく街道", region: "鉄血帝国ガルムント", type: "wild", danger: 2, scene: "snow", x: 40, y: 24,
      desc: "吹雪の街道。脱走兵と人狼が出る。凍えた旅人の死体が道標代わりだ。",
      pool: ["wolf", "werewolf", "bandit", "deserter"], links: { plains: 3, garmund: 2, fort: 3 },
    },
    garmund: {
      name: "帝都ガルムント", region: "鉄血帝国ガルムント", type: "town", danger: 0, scene: "snowcity", capital: true, x: 28, y: 9,
      desc: "黒い石で築かれた軍都。皇帝は病床にあり、皇子たちが刺客を放ち合っている。",
      fac: ["inn", "tavern", "shop", "guild", "train", "alley", "castle"],
      shop: ["axe", "chain", "plate", "longsword", "potion"],
      links: { frost: 2 },
    },
    fort: {
      name: "黒鉄の砦", region: "人類の最前線", type: "town", danger: 0, scene: "fort", x: 62, y: 26,
      desc: "断界山脈を越える唯一の道を塞ぐ巨大な砦。毎晩のように魔物が押し寄せる。",
      fac: ["inn", "shop", "guild", "train"],
      shop: ["axe", "chain", "plate", "potion", "holywater"],
      links: { frost: 3, zephara: 3, mountains: 2 },
    },
    zephara: {
      name: "魔法都市ゼファラ", region: "魔法国ゼファラ", type: "town", danger: 0, scene: "magic", x: 70, y: 50,
      desc: "空に浮かぶ水晶塔の都。魔法を使えない者は門の外で暮らしている。",
      fac: ["inn", "tavern", "shop", "guild", "train", "alley"],
      shop: ["staff", "robe", "grimoire", "manawater", "elixir"],
      links: { karna: 4, fort: 3, swamp: 2 },
    },
    swamp: {
      name: "毒沼の湿地", region: "魔法国ゼファラ", type: "wild", danger: 2, scene: "swamp", x: 60, y: 76,
      desc: "ゼファラの廃棄物が流れ込んだ沼。溶けかけた何かがうごめいている。",
      pool: ["slime", "spider", "zombie", "orc"], links: { karna: 2, zephara: 2 },
    },
    mountains: {
      name: "断界山脈", region: "人と魔の境", type: "wild", danger: 4, scene: "mountain", x: 78, y: 30,
      desc: "空を突く峰々。人の世界と魔物の世界の境目。翼竜が舞い、黒騎士が徘徊する。",
      pool: ["ogre", "wyvern", "chimera", "blackknight"], links: { fort: 2, graveyard: 2, wasteland: 3 },
    },
    graveyard: {
      name: "竜の墓場", region: "人と魔の境", type: "dungeon", danger: 4, scene: "bones", x: 88, y: 12,
      desc: "竜たちが死にに来る谷。骨の山の奥で、何かがしゃべっている声がするという。",
      pool: ["zombie", "wyvern", "chimera", "warlock"], floors: 5, boss: "bonedragon",
      reward: { flag: "bonedragon", item: "volgrim", fame: 60, trophy: "volgrim", chron: "竜の墓場で屍竜ネクロザを倒し、魔剣ヴォルグリムを手に入れる", text: "崩れ落ちた竜の腹から、黒い剣が転がり出た。拾い上げた瞬間、剣がしゃべった。「……ようやく来たか。遅えよ。俺はヴォルグリム。魔人の首を刎ねたいなら、黙って俺を振れ」" },
      links: { mountains: 2 },
    },
    wasteland: {
      name: "魔物界・灰の荒野", region: "魔物界", type: "wild", danger: 5, scene: "realm", x: 90, y: 50,
      desc: "赤い空の下、灰が降り続く荒野。魔物の軍勢が行き交い、ときおり魔人が気まぐれに姿を見せる。",
      pool: ["general", "kin", "chimera", "ogre", "oni"], links: { mountains: 3, majincastle: 3 },
    },
    majincastle: {
      name: "鏖殺の魔人の居城", region: "魔物界", type: "dungeon", danger: 6, scene: "majin", x: 91, y: 80,
      desc: "骨と鉄で組まれた巨大な城。主の魔人グラウは、強者が訪ねてくるのを待っている。",
      pool: ["general", "kin", "blackknight"], floors: 4, midboss: { 3: "rize" }, boss: "graw",
      reward: { flag: "graw", fame: 200, trophy: "majin", chron: "鏖殺の魔人グラウを討ち果たす。人の手で魔人が倒れたのは、百年ぶりのことだった", text: "巨人の体が膝をつき、笑った。「……よい戦いだった。次の千年も、こう、あれば……」魔人グラウは灰になって崩れた。空のどこかで、誰かが拍手をした気がした。" },
      links: { wasteland: 3 },
    },
    yakumo: {
      name: "八雲・鬼灯の港", region: "八雲", type: "town", danger: 0, scene: "yakumo", x: 8, y: 90,
      desc: "朱い鳥居と提灯の港町。侍と忍が行き交う。沖の鬼ヶ島からは、夜ごと太鼓の音が聞こえる。",
      fac: ["inn", "tavern", "shop", "train", "guild"],
      shop: ["katana", "domaru", "riceball", "smoke", "potion"],
      links: { onigashima: 2 }, sea: { nerva: { days: 5, cost: 40 } },
    },
    onigashima: {
      name: "鬼ヶ島の洞窟", region: "八雲", type: "dungeon", danger: 3, scene: "cave", x: 20, y: 96,
      desc: "鬼の住む島の洞窟。奥で大鬼・酒呑が宴を開いている。",
      pool: ["oni", "ninja", "zombie", "ogre"], floors: 4, boss: "shuten",
      reward: { flag: "shuten", item: "byakuya", fame: 50, trophy: "byakuya", chron: "鬼ヶ島で酒呑を討ち、聖刀白夜を取り戻す", text: "酒呑が倒れた宝物庫の奥に、白く光る刀が突き立っていた。抜くと、刀身が月のように澄んだ光を放った。聖刀白夜。" },
      links: { yakumo: 2 },
    },
  };
})(globalThis.G = globalThis.G || {});
