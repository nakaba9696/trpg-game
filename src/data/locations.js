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
      name: "自由都市ブランデール", region: "自由都市連合", type: "town", danger: 0, scene: "town", x: 44, y: 55,
      desc: "石畳に金貨の音が跳ねる町。呼び込みの声は、どれも値段から始まる。両替商の看板には三つの国の金貨の刻印が並び、冒険者ギルドの本部の前では、今朝も登録の列が角を曲がっている。商人と傭兵と詐欺師の見分けは、財布を出したあとでしかつかない。",
      fac: ["inn", "tavern", "shop", "guild", "church", "train", "alley"],
      shop: ["dagger", "longsword", "axe", "rapier", "leather", "chain", "holywater", "lute"],
      links: { nerva: 2, forest: 1, plains: 2, swamp: 2, zephara: 4 },
    },
    nerva: {
      name: "港町ヴァレンツァ", region: "自由都市連合", type: "town", danger: 0, scene: "port", x: 22, y: 70,
      desc: "潮と魚の脂の匂い。霧の向こうで霧笛が鳴り、シェルアークの島々へ渡る船の帆が濡れて重く垂れている。昼間から酒を飲んでいるのが海賊なのか密輸屋なのか、聞く者はいない。桟橋では、耳の尖った船乗りと獣の耳の荷揚げ人足が、同じ樽に腰かけて同じ魚を焼いている。",
      fac: ["inn", "tavern", "shop", "guild", "alley"],
      shop: ["dagger", "longsword", "leather", "katana"],
      links: { karna: 2, ruins: 2 }, sea: { yakumo: { days: 5, cost: 40 } },
    },
    forest: {
      name: "迷いの森", region: "自由都市連合", type: "wild", danger: 1, scene: "forest", x: 55, y: 68,
      desc: "昼でも薄暗い。枝が頭の上で組み合わさり、足もとの苔が足音を吸う。奥のほうから、調子の外れた歌と、樽を転がす音が聞こえてくる。ゴブリンの臭いには、慣れるまでが長い。",
      pool: ["goblin", "wolf", "barrelgob", "dogu"], links: { karna: 1, ruins: 2 },
    },
    ruins: {
      name: "エル・ナフ遺構", region: "自由都市連合", type: "dungeon", danger: 2, scene: "ruins", x: 40, y: 84,
      desc: "崩れた柱が、草の中に白い肋骨のように並んでいる。神々の時代のものだと言われる遺跡だ。入口の石段は、数えるたびに段の数が違う。近ごろ奥に「あれ」とは違う何かが住みついたと、発掘人たちは嫌がって、日が傾く前に引き上げていく。",
      pool: ["goblin", "orc", "spider", "slime", "zombie", "mimic"], floors: 4, boss: "kain",
      reward: { flag: "kain", fame: 40, chron: "エル・ナフ遺構の最奥で、眷属カインを討ち取る", text: "カインの体が崩れ、遺跡の奥に古い壁画が現れた。三柱の神と、それを見下ろす巨大な目が描かれている。" },
      links: { forest: 2, nerva: 2 },
    },
    plains: {
      name: "白銀の丘陵", region: "レオネスト王国", type: "wild", danger: 1, scene: "plains", x: 28, y: 44,
      desc: "なだらかな丘に、白い穂草が風で波打っている。見通しはいい。それは、向こうからも同じだ。丘の陰では、盗賊と野犬が昼寝をしながら旅人を待っている。",
      pool: ["wolf", "bandit", "goblin", "dogu", "banditboss"], links: { karna: 2, leavel: 2, frost: 3 },
    },
    leavel: {
      name: "王都レオネスト", region: "レオネスト王国", type: "town", danger: 0, scene: "castle", capital: true, x: 14, y: 36,
      desc: "白い城壁が朝日を照り返している。大通りは花で飾られ、角を一本曲がれば借金取りが歩いている。貴族の屋敷の窓は、昼でも厚い布で閉ざされたままだ。灰銀の髪の国王ヴァレオンはよく城を空けて化け物を狩りに出るので、門番は王の馬の蹄の音を聞き分けられる。",
      fac: ["inn", "tavern", "shop", "guild", "church", "train", "castle"],
      shop: ["longsword", "rapier", "chain", "plate", "holywater", "mithril"],
      links: { plains: 2 },
    },
    frost: {
      name: "凍てつく街道", region: "ノルディア帝国", type: "wild", danger: 2, scene: "snow", x: 40, y: 24,
      desc: "吹雪が横から叩きつけてくる。道標の代わりに、凍えて座りこんだままの旅人がところどころにいる。顔に雪が積もっていて、誰だったのかはもう分からない。遠くで、狼とも人ともつかない遠吠えがする。帝国の脱走兵も、このあたりに隠れているという。",
      pool: ["wolf", "werewolf", "bandit", "deserter"], links: { plains: 3, garmund: 2, fort: 3 },
    },
    garmund: {
      name: "帝都ノルディア", region: "ノルディア帝国", type: "town", danger: 0, scene: "snowcity", capital: true, x: 28, y: 9,
      desc: "黒い石で築かれた軍都。煙突の煙はまっすぐに上がり、軍靴の音はどこまでも揃っている。どの戸口にも、皇帝さまのご快癒を祈る札が貼ってある。辻の張り紙は「〇〇皇子を讃えよ」の上に別の皇子の名が貼り重ねられ、壁から指一本ぶん浮いている。",
      fac: ["inn", "tavern", "shop", "guild", "train", "alley", "castle"],
      shop: ["axe", "chain", "plate", "longsword", "potion"],
      links: { frost: 2 },
    },
    fort: {
      name: "黒鉄の砦", region: "人類の最前線", type: "town", danger: 0, scene: "fort", x: 62, y: 26,
      desc: "断界山脈を越えるただ一本の道を、黒い壁が塞いでいる。夜ごとに鐘が鳴り、朝ごとに墓地が少し広くなる。兵の大半は帝国の訛りで話し、王国の兵と共和国の術師は、夜の見張りの順番でいつも揉めている。城壁の上では、誰もが空ばかり見ている。",
      fac: ["inn", "shop", "guild", "train"],
      shop: ["axe", "chain", "plate", "potion", "holywater"],
      links: { frost: 3, zephara: 3, mountains: 2 },
    },
    zephara: {
      name: "首都エルメシア", region: "エルメシア共和国", type: "town", danger: 0, scene: "magic", x: 70, y: 50,
      desc: "水晶の塔が空に浮かび、日が傾くと、塔の影が町の上をゆっくり横切っていく。朝の鐘が鳴ると、エルフと獣人と、ほんのわずかな人間が、塔の下の議場への階段を上っていく。門の外の靴屋は、塔の石畳ですり減った靴ばかり直している。東の空には、いつも雲に届く大樹の影が見える。",
      fac: ["inn", "tavern", "shop", "guild", "train", "alley"],
      shop: ["staff", "robe", "grimoire", "manawater", "elixir"],
      links: { karna: 4, fort: 3, swamp: 2 },
    },
    swamp: {
      name: "毒沼の湿地", region: "エルメシア共和国", type: "wild", danger: 2, scene: "swamp", x: 60, y: 76,
      desc: "鼻の奥に刺さる、甘い腐臭。エルメシアの塔から出た滓が流れ込む沼で、濁った水面の下を、溶けかけた何かが寝返りを打つ。沼の渡し守は、何か話しかけては、誰の話だったかを忘れる。",
      pool: ["slime", "spider", "zombie", "orc"], links: { karna: 2, zephara: 2 },
    },
    mountains: {
      name: "断界山脈", region: "人と魔の境", type: "wild", danger: 4, scene: "mountain", x: 78, y: 30,
      desc: "息が白い。峰々が空を突き、雲は足もとを流れていく。ここから東は、人の地図に描かれていない。頭の上を翼竜の影が横切り、尾根の道を、黒い鎧の騎士がひとりきりで歩いていることがある。",
      pool: ["ogre", "wyvern", "chimera", "blackknight"], links: { fort: 2, graveyard: 2, wasteland: 3 },
    },
    graveyard: {
      name: "竜の墓場", region: "人と魔の境", type: "dungeon", danger: 4, scene: "bones", x: 88, y: 12,
      desc: "竜たちが死にに来る谷。家ほどもある肋骨が白く並び、風がそのあいだを抜けるたびに、低い笛のような音がする。骨の山の奥で、何かがしゃべっている声がするという。風の音だと言う者もいる。",
      pool: ["zombie", "wyvern", "chimera", "warlock"], floors: 5, boss: "bonedragon",
      reward: { flag: "bonedragon", item: "volgrim", fame: 60, trophy: "volgrim", chron: "竜の墓場で屍竜ネクロザを倒し、魔剣ヴォルグリムを手に入れる", text: "崩れ落ちた竜の腹から、黒い剣が転がり出た。拾い上げた瞬間、剣がしゃべった。「……ようやく来たか。遅えよ。俺はヴォルグリム。使徒の首を刎ねたいなら、黙って俺を振れ」" },
      links: { mountains: 2 },
    },
    wasteland: {
      name: "使徒領・灰の荒野", region: "使徒領", type: "wild", danger: 5, scene: "realm", x: 90, y: 50,
      desc: "空が赤い。灰が雪のように降りつづき、歩いた跡はすぐに埋まる。遠くを魔物の群れが行き交っている。ときおり使徒が気まぐれに姿を見せるというが、見た者の話は、いつも途中で終わる。",
      pool: ["general", "kin", "chimera", "ogre", "oni"], links: { mountains: 3, majincastle: 3 },
    },
    majincastle: {
      name: "鏖殺の使徒の居城", region: "使徒領", type: "dungeon", danger: 6, scene: "majin", x: 91, y: 80,
      desc: "骨と鉄で組まれた城。門は開いたままで、番兵もいない。奥の広間から、刃を研ぐ音だけが規則正しく聞こえてくる。主の使徒グラウは、強者が訪ねてくるのを待っている。",
      pool: ["general", "kin", "blackknight"], floors: 4, midboss: { 3: "rize" }, boss: "graw",
      reward: { flag: "graw", fame: 200, trophy: "majin", chron: "鏖殺の使徒グラウを討ち果たす。人の手で使徒が倒れたのは、百年ぶりのことだった", text: "巨人の体が膝をつき、笑った。「……よい戦いだった。次の千年も、こう、あれば……」使徒グラウは灰になって崩れた。空のどこかで、誰かが拍手をした気がした。" },
      links: { wasteland: 3 },
    },
    yakumo: {
      name: "島の都シェルアーク", region: "シェルアーク", type: "town", danger: 0, scene: "yakumo", x: 8, y: 90,
      desc: "島から島へ渡し板が架かった、海の上の都。干した魚と樽の匂い、王都とはまるで違う訛り。王国の旗は港の端に一本だけで、桟橋ごとに顔役がいて、荷の値も揉め事の始末も自分たちで決める。沖の鬼ヶ島からは、夜ごと太鼓の音が聞こえる。",
      fac: ["inn", "tavern", "shop", "train", "guild"],
      shop: ["katana", "domaru", "riceball", "smoke", "potion"],
      links: { onigashima: 2 }, sea: { nerva: { days: 5, cost: 40 } },
    },
    onigashima: {
      name: "鬼ヶ島の洞窟", region: "シェルアーク", type: "dungeon", danger: 3, scene: "onigashima", x: 20, y: 96,
      desc: "鬼の住む島の洞窟。岩肌は湿って生温かく、奥から酒と脂の匂いが流れてくる。笑い声が、腹の底に響く。いちばん奥で、鬼の頭目ゴズが宴を開いている。",
      pool: ["oni", "ninja", "zombie", "ogre"], floors: 4, boss: "shuten",
      reward: { flag: "shuten", item: "byakuya", fame: 50, trophy: "byakuya", chron: "鬼ヶ島で鬼の頭目ゴズを討ち、聖刀白夜を取り戻す", text: "ゴズが倒れた宝物庫の奥に、白く光る刀が突き立っていた。抜くと、刀身が月のように澄んだ光を放った。聖刀白夜。" },
      links: { yakumo: 2 },
    },
  };
})(globalThis.G = globalThis.G || {});
