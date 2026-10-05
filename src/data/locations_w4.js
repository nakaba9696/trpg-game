// 新しい町と野外・迷宮（W4）。欄の意味は locations.js と同じ。docs/lore/life.md 11. の「まだ無い町」と docs/lore/igyo.md から選んだ
// ノルディア帝国：鉱山の都カースヴェルグ（町）、市の都ヴァルミリア（町）、古い鉄の道（迷宮。カースヴェルグの廃坑）
// エルメシア共和国：水の都トゥリエル（町）、沈黙の森（野外。年表 781 の森）
// 人類の最前線：鐘の見張り塔（野外。黒鉄の砦の外の塔の列）
// 人と魔の境：断界の古関（迷宮。山脈の中の、古い国の関所の跡）
// 使徒領：天蓋の原（野外。灰の荒野の北の、大きな影の落ちる塩の原）
// 背景の絵は src/ui/scene.js（OUT）と src/ui/scene_v2_w4.js。出来事は events_w4*.js、用語説明は lore_w4.js、敵は enemies_w4.js
// 今ある場所への道はこのファイルの末尾で足す（両方向に書く決まり）。locations.js は書き換えない
// レーン W（ワールド）が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.LOCS, {
    // ---------------------------------------------------------------- ノルディア帝国
    w4_kaesverg: {
      name: "鉱山の都カースヴェルグ", region: "ノルディア帝国", type: "town", danger: 0, scene: "w4_mine", x: 40, y: 15,
      desc: "山の腹に穴が並び、穴の数だけ煙が上がっている。町の真ん中を、古い鉄の道が二本の線になって走り、錆びた台車が坂の途中で止まったまま雪をかぶっている。鉱夫たちは「掘りすぎるな」と言い交わしながら、今日も掘りに降りていく。",
      fac: ["inn", "tavern", "shop", "guild", "alley"],
      shop: ["axe", "chain", "w2_kilnpie", "w2_frostfire", "potion", "leather"],
      links: {},
    },
    w4_valmiria: {
      name: "市の都ヴァルミリア", region: "ノルディア帝国", type: "town", danger: 0, scene: "w4_market", x: 18, y: 27,
      desc: "四つの街道が雪の広場で交わり、そこに帝国でいちばん大きな市が立つ。天幕の色は部族ごとに違い、広場の真ん中の石の柱から先では、剣を抜いてはいけない決まりだ。宿の主は、どの部族の客をどの部屋に入れるかで、毎晩帳場で頭を抱えている。",
      fac: ["inn", "tavern", "shop", "guild", "train", "alley"],
      shop: ["longsword", "dagger", "leather", "chain", "w2_frostfire", "jerky", "lute", "smoke"],
      links: {},
    },
    w4_oldrail: {
      name: "古い鉄の道", region: "ノルディア帝国", type: "dungeon", danger: 3, scene: "w4_rail", x: 48, y: 19,
      desc: "鉱山の都カースヴェルグの北の廃坑。古い時代の鉄の道が、山の腹の奥へ二本の線を引いている。帝国の機械の部隊が何かを追ってここを掘り直し、何かを討って、それから坑道ごと閉じた。閉じた板には、内側から叩いた跡がある。",
      pool: ["w4_borer", "w4_hungryrock", "e1_sweeper", "spider", "zombie"], floors: 4, boss: "w4_borermother",
      reward: { flag: "w4_borermother", item: "relic", fame: 45, chron: "古い鉄の道の奥で、地喰いの古殻を止める。坑道に、六十年ぶりに静けさが戻る", text: "殻が裂けて、中身が鉄の道の上に崩れ落ちた。最後まで、線路の鉄を噛んでいた。古殻の腹の下から、錆びない金具の箱が出てきた。帝国の機械の部隊の印。蓋の裏に、小刀で刻んだ字。「九五八年　子が残った　誰か来るまで閉じる」" },
      links: {},
    },

    // ---------------------------------------------------------------- エルメシア共和国
    w4_tulier: {
      name: "水の都トゥリエル", region: "エルメシア共和国", type: "town", danger: 0, scene: "w4_water", x: 83, y: 55,
      desc: "湖の上に板の道を渡し、その上に家と議場と星見の塔を建てた町。舟で通う詩人と癒し手と星読みが、朝から晩まで何かを書きつけている。湖面に映る東の大樹の影は、町のどこから見ても同じ大きさに見える。",
      fac: ["inn", "tavern", "shop", "church", "train"],
      shop: ["staff", "robe", "manawater", "herb", "lute", "w2_honeycake", "holywater"],
      links: {},
    },
    w4_silent: {
      name: "沈黙の森", region: "エルメシア共和国", type: "wild", danger: 2, scene: "w4_silent", x: 84, y: 74,
      desc: "鳥がいるのに、鳴かない。足もとの枯れ枝を踏んでも、音がしない。木の幹のあちこちに、古い結界の札が貼られたまま白く褪せていて、そのうち何枚かは、新しい。",
      pool: ["w4_hushed", "spider", "werewolf", "e2_rotbloom"],
      links: {},
    },

    // ---------------------------------------------------------------- 人類の最前線・人と魔の境
    w4_watch: {
      name: "鐘の見張り塔", region: "人類の最前線", type: "wild", danger: 3, scene: "w4_watch", x: 70, y: 15,
      desc: "黒鉄の砦の外へ、石の塔が一里おきに北東へ並んでいる。どの塔の上にも鐘があり、見張りが一人、空を見ている。鐘が一つ鳴れば次の塔が鳴らし、それが砦まで届く。途中の塔のいくつかは、もう鳴らない。",
      pool: ["deserter", "werewolf", "wyvern", "ogre"],
      links: {},
    },
    w4_pass: {
      name: "断界の古関", region: "人と魔の境", type: "dungeon", danger: 4, scene: "w4_pass", x: 85, y: 23,
      desc: "断界山脈の中腹、岩の裂け目をまるごと塞ぐ古い関所。今の人が積んだ石ではない。門の上の碑文は誰にも読めないが、門をくぐる者の背丈を測るための刻み目だけは、今でもはっきり分かる。いちばん上の刻み目は、人の背丈の三倍の高さにある。",
      pool: ["blackknight", "chimera", "e1_bonepicker", "ogre", "warlock"], floors: 5, boss: "w4_gatekeeper",
      reward: { flag: "w4_gatekeeper", item: "relic", fame: 55, chron: "断界の古関の最奥で、関守の石人を崩す。門の向こうの階段は、上へ続いていた", text: "石人の膝が割れ、胸の板が床に落ちた。板の裏に、読めない字が一行と、背丈の刻み目が一本。刻み目は、あなたの背丈とちょうど同じ高さだった。奥の門の向こうには、上へ続く階段があった。段は、人の足には少し高すぎた。" },
      links: {},
    },

    // ---------------------------------------------------------------- 使徒領
    w4_canopy: {
      name: "使徒領・天蓋の原", region: "使徒領", type: "wild", danger: 5, scene: "w4_canopy", x: 97, y: 36,
      desc: "灰の荒野の北は、白い塩の原になる。空がそのまま地面に映り、歩いていると上と下が分からなくなる。ときどき、原の上を、町ほどもある丸い影が音もなく滑っていく。影の下にあった物は、影が過ぎたあと、どこにも無い。",
      pool: ["general", "kin", "e1_herald", "w4_saltwalker", "chimera"],
      links: {},
    },
  });

  // 道（両方向に書く決まり）
  const L = D.LOCS;
  const link = (a, b, days) => { if (L[a] && L[b]) { L[a].links[b] = days; L[b].links[a] = days; } };
  link("w4_kaesverg", "frost", 2);
  link("w4_kaesverg", "garmund", 2);
  link("w4_kaesverg", "w4_oldrail", 1);
  link("w4_valmiria", "w2_zalgros", 2);
  link("w4_valmiria", "garmund", 3);
  link("w4_valmiria", "w2_dranherz", 3);
  link("w4_valmiria", "w3_lignoa", 2);    // 王国の北西の森と湖の都（W3）。国境の街道
  link("w4_tulier", "zephara", 2);
  link("w4_tulier", "w2_amyrein", 2);
  link("w4_tulier", "w2_nagris", 2);
  link("w4_silent", "w4_tulier", 2);
  link("w4_watch", "fort", 1);
  link("w4_watch", "mountains", 2);
  link("w4_pass", "mountains", 2);
  link("w4_pass", "w4_canopy", 3);
  link("w4_canopy", "wasteland", 2);

  // 天候（engine/weather.js の D.CLIMATE）
  D.CLIMATE = Object.assign(D.CLIMATE || {}, {
    w4_kaesverg: { rain: 0.2, fog: 0.3, cold: 2 },   // 坑の煙で霞む
    w4_valmiria: { rain: 0.3, fog: 0.15, cold: 1 },
    w4_oldrail: { rain: 0.15, fog: 0.3, cold: 2 },
    w4_tulier: { rain: 0.25, fog: 0.45 },            // 湖の朝霧
    w4_silent: { rain: 0.2, fog: 0.4 },
    w4_watch: { rain: 0.3, fog: 0.25, cold: 2 },
    w4_pass: { rain: 0.25, fog: 0.4, cold: 2 },
    w4_canopy: { rain: 0.05, fog: 0.2 },
  });
})(globalThis.G = globalThis.G || {});
