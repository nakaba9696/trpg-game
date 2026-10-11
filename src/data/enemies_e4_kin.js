// 使徒の眷属（E4）。使徒（data/e3_apostles.js の D.E3.LIST）ごとに、縄張りに出る眷属を 2 種ずつ。
// 欄は enemies_e4_regions.js と同じ（acts・weak・pack・when）。加えて：
//   kinOf  どの使徒の眷属か（D.E3.LIST の id）。where [場所 id] の出現表（L.e4pool）に入る（町に棲む使徒は、隣の野）。出現表から引かれても半分は見送る
//   clue   初めて倒したとき、使徒の弱みの手がかりを一行（{ text, memo }）。答えは書かない
// 縄張りの眷属を二体退けると、その使徒は弱る（条件をもう一つ満たしたのに近い。下の CORE。engine/zzz_e4_foes.js が数えて G.e3Mods を包む）。
// 正体・使徒の名前は地の文に出さない（docs/lore/voice.md）。レーン E（敵）が管理
(function (G) {
  const D = (G.data = G.data || {});
  const E4 = (D.E4 = D.E4 || {});

  Object.assign(D.ENEMIES, {
    // ---------------------------------------------------------------- 黒鎧（居城）
    e4k_squire: {
      name: "黒鎧の従騎士", tier: 5, hp: 56, dmg: [2, 8, 3], hit: 70, def: 25, agi: 40, will: 999, mres: 15, gold: [30, 80], loot: [["potion", 0.4], ["chain", 0.05]], shape: "humanoid", eye: "#ff3a3a",
      kinOf: "graw", where: ["majincastle"], acts: ["guard"], weak: "bolt",
      clue: { text: "従騎士の盾に、刃物で裂いたような古い傷が三本走っていた。剣の傷ではない。もっと薄くて鋭い、羽のような何かだ。", memo: "黒鎧の従騎士の盾に、羽で裂いたような古傷があった" },
      desc: "黒い鎧の主に仕える、小ぶりな黒い鎧。主の前に立つことしか知らない。",
      look: { body: "biped", build: "normal", skin: "#2a2a30", head: "helm", eyes: "glow", mouth: "none", weapon: "sword", shield: true, outfit: "armor", cloth: "#1c1c22", extra: ["cape"], mood: "fierce" },
    },
    e4k_chainhound: {
      name: "鎖の黒犬", tier: 5, hp: 44, dmg: [2, 8, 2], hit: 70, def: 15, agi: 70, will: 999, mres: 10, gold: [0, 20], loot: [["fang", 0.6]], shape: "beast", eye: "#ff2020",
      kinOf: "graw", where: ["majincastle"], pack: [2, 2], acts: ["pin"],
      clue: { text: "黒犬の首輪の鎖は、城の奥の柱につながっていた跡がある。鎖の輪のひとつに、黒い金属の欠片が噛みこんでいた。主の鎧から剥がれたものだろうか。", memo: "黒犬の鎖に、主の鎧の欠片らしきものが噛みこんでいた" },
      desc: "城の廊下を鎖を引きずって歩く、黒い大犬。二頭で一人を挟む。",
      look: { body: "quad", head: "wolf", skin: "#1a1418", skin2: "#4a3a3a", eyes: "glow", mouth: "fangs", tail: "spike", pattern: "lava", extra: ["scarf"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 灼け口（大厨房）
    e4k_taster: {
      name: "毒見の小鬼", tier: 4, hp: 24, dmg: [1, 8, 1], hit: 60, def: 10, agi: 55, will: 30, mres: 0, gold: [10, 30], loot: [["jerky", 0.5]], shape: "small", eye: "#b6ff7a",
      kinOf: "gormore", where: ["e2_kitchen"], pack: [2, 3], acts: ["poison", "rout"],
      clue: { text: "小鬼の懐から菓子の包み紙が出てきた。中身はかじった跡もない。包みの裏に走り書き：「主の卓に甘い物を出すな。主が黙る」", memo: "毒見の小鬼の包み紙：「主の卓に甘い物を出すな」" },
      desc: "大厨房の料理を先に食べさせられる小鬼たち。毒に慣れすぎて体じゅうが毒だ。",
      look: { body: "biped", build: "small", skin: "#8aa04a", head: "plain", ears: "pointy", eyes: "googly", mouth: "tongue", weapon: "dagger", outfit: "rags", cloth: "#e8e0d0", pattern: "spots", extra: ["cap", "drool"], mood: "silly" },
      fleeAt: 0.4,
      lines: { turn: ["「お、お前、味見してもいいか？ ちょっとだけ」"], flee: "小鬼は鍋の陰に転がり込んだ。" },
    },
    e4k_cauldron: {
      name: "歩く大鍋", tier: 5, hp: 60, dmg: [2, 8, 2], hit: 60, def: 25, agi: 15, will: 999, mres: 10, magic: true, gold: [10, 40], loot: [["potion", 0.4], ["jerky", 0.4]], shape: "blob", eye: "#ffb000",
      kinOf: "gormore", where: ["e2_kitchen"], acts: ["corrode"], weak: "ice",
      clue: { text: "大鍋の底に焦げついた蜂蜜の層があった。誰かが一度だけ甘い物を煮て、それきり使われなくなったらしい。鍋の縁に三つの歯形がついている。", memo: "歩く大鍋の底に焦げた蜂蜜。縁に三つの歯形" },
      desc: "煮え立つ中身ごと歩き回る大鍋。煮汁を浴びると鎧の継ぎ目がふやける。冷やすとただの鍋になる。",
      look: { body: "chest", skin: "#3a3a3a", skin2: "#8a6a3a", eyes: "glow", mouth: "fangs", extra: ["smoke", "bubbles"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 苔の庭師（腐れ庭園）
    e4k_mossdog: {
      name: "苔むした番犬", tier: 2, hp: 18, dmg: [1, 6, 1], hit: 55, def: 10, agi: 40, will: 999, mres: 5, gold: [0, 8], loot: [["herb", 0.5]], shape: "beast", eye: "#b8ff8a",
      kinOf: "mordu", where: ["e2_garden", "swamp"], acts: ["call"], weak: "fire",
      clue: { text: "番犬の苔の下から錆びた鈴が出てきた。鈴には小さな鋏の絵が彫ってある。庭の手入れの合図に鳴らしていたのだろうか。", memo: "苔むした番犬の鈴に鋏の絵が彫ってあった" },
      desc: "庭を守るうちに背中に苔が根を張った犬。吠えると庭じゅうの番犬が起きる。",
      look: { body: "quad", head: "wolf", skin: "#4a6a3a", skin2: "#8aa86a", eyes: "glow", mouth: "fangs", tail: "thin", pattern: "spots", extra: ["fur"], mood: "fierce" },
    },
    e4k_pruner: {
      name: "枝打ち人形", tier: 2, hp: 20, dmg: [1, 6, 1], hit: 55, def: 15, agi: 25, will: 999, mres: 0, gold: [0, 12], loot: [["herb", 0.3]], shape: "humanoid", eye: "#8aff8a",
      kinOf: "mordu", where: ["e2_garden"], acts: ["disarm"], weak: "fire",
      clue: { text: "人形の手は鋏の形に削られていた。片方の刃が欠けている。本物の鋏は、どこかの空き家に置き忘れられたままだという。", memo: "枝打ち人形の手は鋏の形。本物の鋏は空き家にあるらしい" },
      desc: "庭師が作った木の人形。伸びすぎた枝を払う。剣も伸びすぎた枝だと思っている。",
      look: { body: "biped", build: "lanky", skin: "#8a6a4a", skin2: "#a8885a", head: "plain", eyes: "goggle", eyeN: 1, mouth: "none", arms: "claws", pattern: "cracks", extra: ["runes"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 忘れ水（遺構の水の書庫）
    e4k_inkling: {
      name: "滲み文字", tier: 2, hp: 14, dmg: [1, 6, 1], hit: 55, def: 0, agi: 50, will: 999, mres: 30, magic: true, gold: [0, 10], loot: [["manawater", 0.3]], shape: "swarm", eye: "#7ad8ff",
      kinOf: "levian", where: ["ruins"], pack: [2, 3], acts: ["sleep"], weak: "blade",
      clue: { text: "滲み文字が散ったあとに、石の床の刻み文字だけが残っていた。水に濡れた紙の字は消えるが、石に刻んだ字は消えない。", memo: "滲み文字は紙の字を食う。石に刻んだ字は残った" },
      desc: "水に溶けた本の文字が、群れになって泳いでいる。読もうとすると頭がぼんやりする。",
      look: { body: "swarm", count: 5, build: "small", skin: "#2a3a5a", head: "plain", eyes: "dot", mouth: "o", outfit: "none", extra: ["runes", "float"], mood: "calm" },
    },
    e4k_drowned: {
      name: "書庫の溺れ人", tier: 2, hp: 20, dmg: [1, 6, 1], hit: 55, def: 5, agi: 25, will: 999, mres: 10, undead: true, gold: [2, 15], loot: [["gem", 0.06]], shape: "humanoid", eye: "#9ec8d8",
      kinOf: "levian", where: ["ruins"], acts: ["drain"], weak: "holy",
      clue: { text: "溺れ人の首に、名前を書いた木札が下がっていた。字はにじんでもう読めない。この人は自分の名前を水に取られたのだ。", memo: "書庫の溺れ人の名札は、にじんで読めなかった" },
      desc: "水の書庫に思い出を預けすぎて、自分が誰か忘れた人。本を抱えて歩き回り、触れた者の温もりを吸う。",
      look: { body: "biped", build: "lanky", skin: "#9ab0b8", head: "human", hair: "#2a4a5a", eyes: "hollow", mouth: "frown", weapon: "tome", outfit: "robe", cloth: "#2a3a4a", extra: ["longhair"], mood: "fierce" },
      lines: { turn: ["「……わたしの名前、知りませんか……」"] },
    },

    // ---------------------------------------------------------------- 日傘の若君（灰の荒野）
    e4k_puppet: {
      name: "糸吊りの踊り手", tier: 4, hp: 34, dmg: [2, 6, 2], hit: 60, def: 10, agi: 60, will: 999, mres: 15, gold: [10, 40], loot: [["potion", 0.3]], shape: "humanoid", eye: "#e8c0ff",
      kinOf: "mirza", where: ["wasteland"], pack: [2, 2], acts: ["pin"],
      clue: { text: "糸を断たれた踊り手が、顔を伏せたまま崩れ落ちた。最後に、こちらの顔を見ようとして、首だけが持ち上がった。糸の主は顔が見たいのだ。", memo: "糸吊りの踊り手は、最後までこちらの顔を見ようとした" },
      desc: "見えない糸に吊られて踊り続ける旅人たち。泣き顔のまま、あなたの連れにまとわりつく。",
      look: { body: "biped", build: "lanky", skin: "#d8c8c0", head: "human", hair: "#6a5a4a", eyes: "closed", mouth: "smile", arms: "forward", outfit: "rags", cloth: "#5a3a5a", extra: ["float", "longhair"], mood: "calm" },
    },
    e4k_smiler: {
      name: "笑い面の侍従", tier: 5, hp: 50, dmg: [2, 8, 3], hit: 70, def: 20, agi: 55, will: 999, mres: 20, gold: [30, 80], loot: [["gem", 0.2]], shape: "humanoid", eye: "#e8c0ff",
      kinOf: "mirza", where: ["wasteland"], acts: ["sleep"],
      clue: { text: "侍従の面を剥がすと、その下にも同じ笑い面があった。三枚目の下には、表情の無い木の面。それだけは、ひびひとつ入っていない。", memo: "笑い面の侍従の、いちばん下の面だけは表情が無かった" },
      desc: "日傘を差しかける侍従。笑い面をつけ、主が退屈しないよう、客を眠らせてから踊らせる。",
      look: { body: "biped", build: "lanky", skin: "#f0e0e8", head: "mask", eyes: "closed", mouth: "smile", weapon: "staff", outfit: "robe", cloth: "#3a1a4a", extra: ["cape"], mood: "calm" },
      lines: { open: ["侍従は深々と頭を下げた。面の口が、少しずつ吊り上がっていく。"] },
    },

    // ---------------------------------------------------------------- 霧の老人（灰の荒野）
    e4k_fogscribe: {
      name: "霧の書記", tier: 5, hp: 46, dmg: [2, 8, 2], hit: 65, def: 15, agi: 45, will: 999, mres: 30, magic: true, gold: [20, 60], loot: [["manawater", 0.4], ["grimoire", 0.05]], shape: "humanoid", eye: "#e8f0ff",
      kinOf: "notari", where: ["wasteland"], acts: ["sleep"], weak: "fire",
      clue: { text: "書記の帳面は、どの頁も先の日付で埋まっていた。一枚だけ、乱暴に破り取られた跡がある。破られた日の出来事は、誰にも書けないらしい。", memo: "霧の書記の帳面に破り取られた頁の跡" },
      desc: "霧の中で、まだ起きていないことを書き留める者。書かれた者は書かれた通りに眠る。",
      look: { body: "biped", build: "lanky", skin: "#c8c8d0", head: "hood", eyes: "glow", mouth: "none", weapon: "tome", outfit: "robe", cloth: "#8a8a9a", extra: ["smoke", "float"], mood: "calm" },
    },
    e4k_fogowl: {
      name: "霧梟", tier: 4, hp: 30, dmg: [2, 6, 1], hit: 65, def: 10, agi: 75, will: 999, mres: 20, gold: [0, 20], loot: [["silk", 0.3]], shape: "winged", eye: "#ffe8a0",
      kinOf: "notari", where: ["wasteland"], acts: ["steal"],
      clue: { text: "霧梟の巣に、紙切れがいくつも敷きつめてあった。どれも禁書の頁らしい。ひとつだけ、梟が持ち帰りそこねた頁がどこかの書庫にある、と巣の主は惜しんでいたという。", memo: "霧梟は禁書の頁を巣に集める。持ち帰りそこねた一枚が書庫にあるらしい" },
      desc: "霧の老人の使い。音もなく舞い降りて懐の物を持ち去る。紙と字のある物が好きだ。",
      look: { body: "wyrm", skin: "#c8c0b0", skin2: "#e8e0d0", eyes: "googly", eyeN: 2, mouth: "beak", wings: "feather", tail: "fan", extra: ["smoke"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 砂塵の両替商（ブランデールの隣の湿地）
    e4k_sandimp: {
      name: "砂の小僧", tier: 2, hp: 12, dmg: [1, 4, 1], hit: 55, def: 5, agi: 65, will: 35, mres: 10, gold: [5, 25], loot: [["gem", 0.06]], shape: "small", eye: "#e8c87a",
      kinOf: "zalve", where: ["swamp"], when: { night: true }, pack: [2, 3], acts: ["steal", "rout"], weak: "fire",
      clue: { text: "砂の小僧は、炎に当たったところだけ固まって、硝子のように光った。焼かれた砂はもう崩れない。", memo: "砂の小僧は、焼かれたところが硝子になって崩れなかった" },
      desc: "夜の街道で財布をすり取る、砂でできた小僧たち。盗んだ金は、町の両替商の店に運ばれるという。",
      look: { body: "biped", build: "small", skin: "#c8a878", skin2: "#e8d0a0", head: "plain", eyes: "dot", mouth: "grin", arms: "stubs", outfit: "rags", cloth: "#8a6a4a", pattern: "cracks", extra: ["smoke", "pouch"], mood: "silly" },
      fleeAt: 0.4,
      lines: { flee: "小僧たちは、さらさらと崩れて、砂の筋になって逃げた。" },
    },
    e4k_hourglass: {
      name: "砂時計の番人", tier: 2, hp: 22, dmg: [1, 6, 1], hit: 55, def: 15, agi: 20, will: 999, mres: 10, gold: [5, 20], loot: [["gem", 0.08]], shape: "humanoid", eye: "#e8c87a",
      kinOf: "zalve", where: ["swamp"], when: { night: true }, acts: ["regen"], weak: "fire",
      clue: { text: "番人の胸の砂時計が割れて砂がこぼれた。こぼれた砂はすぐに番人へ這い戻る。焚き火のそばに落ちた粒だけが、戻らなかった。", memo: "砂時計の番人の砂は這い戻る。火のそばに落ちた粒だけは戻らない" },
      desc: "胸に大きな砂時計を抱えた人形。砕いても砂が戻ってきてふさがる。",
      look: { body: "biped", build: "stubby", skin: "#b89868", skin2: "#e0c898", head: "plain", eyes: "goggle", eyeN: 1, mouth: "none", outfit: "none", pattern: "cracks", extra: ["runes", "smoke"], mood: "calm" },
    },

    // ---------------------------------------------------------------- 生き聖女（聖都の地下墓地）
    e4k_whiteacolyte: {
      name: "白目の侍祭", tier: 3, hp: 26, dmg: [1, 8, 1], hit: 60, def: 10, agi: 40, will: 999, mres: 20, gold: [10, 35], loot: [["holywater", 0.3]], shape: "humanoid", eye: "#ffffff",
      kinOf: "aurelia", where: ["w1_catacomb"], acts: ["sleep", "guard"],
      clue: { text: "侍祭の目は白く濁っていた。聖女さまのお顔を、見すぎたのだという。侍祭の部屋には、目の見えない老人の祈祷布が大事にしまってあった。", memo: "白目の侍祭は聖女を見すぎた。部屋に盲いた老人の祈祷布があった" },
      desc: "聖女の微笑みを毎日見つめ、目が白くなった侍祭。歌うような祈りで、聞く者を眠らせる。",
      look: { body: "biped", build: "lanky", skin: "#e8d8c8", head: "human", hair: "#e8e4dc", eyes: "hollow", mouth: "smile", weapon: "staff", outfit: "robe", cloth: "#f0ece0", extra: ["longhair"], mood: "calm" },
      lines: { turn: ["「お顔をごらんなさい。お顔を……」"] },
    },
    e4k_haloshade: {
      name: "後光の影", tier: 3, hp: 24, dmg: [2, 4, 2], hit: 60, def: 5, agi: 60, will: 999, mres: 25, magic: true, gold: [0, 20], loot: [["manawater", 0.3]], shape: "winged", eye: "#ffd8ff",
      kinOf: "aurelia", where: ["w1_catacomb"], acts: ["drain"], weak: "blade",
      clue: { text: "影の羽には目の模様が並んでいた。羽を断つと目の模様がまばたきをやめた。見られなければ、この羽は何もできないらしい。", memo: "後光の影の羽は目の模様。見なければ何もできないらしい" },
      desc: "聖女の後光から剥がれ落ちた、羽の形の影。目の模様の羽で見つめ、見つめ返した者の力を吸う。",
      look: { body: "biped", build: "small", skin: "#e8d0f0", skin2: "#fff0ff", head: "plain", eyes: "glow", eyeN: 3, mouth: "none", wings: "moth", outfit: "none", extra: ["float", "runes"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 香煙の姫（朧島。隣の鬼ヶ島の洞窟）
    e4k_smokecat: {
      name: "煙の猫", tier: 3, hp: 22, dmg: [1, 8, 1], hit: 60, def: 5, agi: 75, will: 50, mres: 20, gold: [5, 25], loot: [["smoke", 0.4]], shape: "beast", eye: "#ffd24a",
      kinOf: "yoihime", where: ["onigashima"], acts: ["sleep"],
      clue: { text: "煙の猫は、潮風の吹く岩場に来ると、くしゃみをして逃げた。煙は海の匂いに勝てないらしい。", memo: "煙の猫は潮の匂いでくしゃみをして逃げた" },
      desc: "島の香の煙から生まれた猫。尻尾を振ると甘い煙が立ち、吸った者はとろんと眠る。",
      look: { body: "quad", head: "plain", skin: "#8a7a9a", skin2: "#c8c0d8", ears: "pointy", eyes: "slit", mouth: "smirk", tail: "thin", extra: ["smoke", "float"], mood: "fierce" },
    },
    e4k_bouncer: {
      name: "賭場の用心棒", tier: 3, hp: 30, dmg: [1, 10, 1], hit: 60, def: 15, agi: 40, will: 55, mres: 0, gold: [20, 60], loot: [["ale", 0.4], ["gem", 0.08]], shape: "humanoid", eye: "#d9d9d9", bribe: 60,
      kinOf: "yoihime", where: ["onigashima"], acts: ["disarm"],
      clue: { text: "用心棒は、首に潮で煮しめた手拭いを巻いていた。「香の煙で頭がおかしくならねえよう、俺はこいつを手放さねえ」と、倒れながら言った。", memo: "賭場の用心棒は、潮で煮しめた手拭いを首に巻いていた" },
      desc: "朧島の賭場の用心棒。客の刃物を取り上げるのが仕事で、取り上げるのが上手い。",
      look: { body: "biped", build: "brute", skin: "#c89068", head: "human", hair: "#1a1a1a", eyes: "dot", mouth: "frown", weapon: "club", outfit: "garb", cloth: "#4a2a5a", pattern: "scars", extra: ["scarf", "stubble"] },
      lines: { open: ["「刃物は預からせてもらう。賭場の決まりでね」"] },
    },

    // ---------------------------------------------------------------- 百面の賢人（帝都の外の影の谷）
    e4k_maskguard: {
      name: "銀面の衛士", tier: 3, hp: 32, dmg: [1, 8, 2], hit: 60, def: 20, agi: 30, will: 999, mres: 10, gold: [10, 40], loot: [["potion", 0.3]], shape: "humanoid", eye: "#c8d0e8",
      kinOf: "chezar", where: ["w2_shadow"], acts: ["guard"], weak: "bolt",
      clue: { text: "衛士の銀の面は、顎の下の小さな釘一本で留まっていた。釘を抜くと、面がずれて、その下には何も無かった。", memo: "銀面の衛士の面は、顎の下の釘一本で留まっていた" },
      desc: "銀の面をつけた衛士。仲間の前に出て盾になる。面の下を見た者はいない。",
      look: { body: "biped", build: "normal", skin: "#c8ccd4", head: "mask", eyes: "glow", mouth: "none", weapon: "spear", shield: true, outfit: "armor", cloth: "#3a3a4a", extra: ["cape"], mood: "fierce" },
    },
    e4k_nailer: {
      name: "釘打ち人形", tier: 3, hp: 26, dmg: [1, 8, 1], hit: 60, def: 15, agi: 35, will: 999, mres: 5, gold: [5, 25], loot: [["relic", 0.04]], shape: "humanoid", eye: "#e8e8e8",
      kinOf: "chezar", where: ["w2_shadow", "frost"], acts: ["disarm"],
      clue: { text: "人形の腰袋に、銀の釘が一本だけ残っていた。対になる釘を探すように、袋の中でかすかに鳴っている。闘技の都の古い賞品に、同じ釘があると聞いた。", memo: "釘打ち人形の銀の釘は、対の釘を探して鳴る。闘技の都の賞品に同じ物があるらしい" },
      desc: "面を顔に打ちつける役目の木の人形。手の金槌で相手の武器を叩き落とす。",
      look: { body: "biped", build: "stubby", skin: "#a8885a", head: "plain", eyes: "goggle", eyeN: 2, mouth: "none", weapon: "club", outfit: "none", pattern: "cracks", extra: ["pouch"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 逆夢の子（どこかの町。夢は凍てつく街道と湿地に出る）
    e4k_dreamsheep: {
      name: "逆さ羊", tier: 2, hp: 16, dmg: [1, 4, 1], hit: 50, def: 5, agi: 35, will: 999, mres: 30, gold: [0, 10], loot: [["silk", 0.3]], shape: "beast", eye: "#c8b8ff",
      kinOf: "yura", where: ["frost", "swamp"], when: { night: true }, acts: ["sleep"],
      clue: { text: "羊を一匹数えると羊は二匹減った。眠らずに数え終えたとき、羊はみんな消えていた。起きている者には、夢は手を出せないらしい。", memo: "逆さ羊は眠らずに数え終えると消えた" },
      desc: "夜道に現れる、逆さに歩く羊。数えた者を眠らせ、夢の町へ連れていく。",
      look: { body: "quad", head: "plain", skin: "#e8e0f0", skin2: "#ffffff", horns: "ram", eyes: "closed", mouth: "smile", tail: "none", extra: ["fur", "float"], mood: "calm" },
    },
    e4k_sleepwalkers: {
      name: "夢遊びの子ら", tier: 2, hp: 18, dmg: [1, 4, 1], hit: 50, def: 0, agi: 30, will: 999, mres: 20, gold: [0, 6], loot: [], shape: "swarm", eye: "#c8b8ff",
      kinOf: "yura", where: ["frost", "swamp"], when: { night: true }, acts: ["pin"],
      clue: { text: "子らは、子守唄を口ずさみながら歩いていた。終わりの節から逆さに。湯の町の古い乳母が、同じ歌を知っているという。", memo: "夢遊びの子らは子守唄を逆さに歌う。湯の町の乳母が同じ歌を知っているらしい" },
      desc: "目を閉じたまま夜道を歩く子どもたち。手をつないで、あなたの連れを輪の中へ引き込む。",
      look: { body: "swarm", count: 4, build: "small", skin: "#e8d8c8", head: "human", hair: "#5a4a6a", eyes: "closed", mouth: "smile", arms: "forward", outfit: "rags", cloth: "#c8c0e0", extra: ["float"], mood: "calm" },
    },

    // ---------------------------------------------------------------- 剣翼の鳥（断界山脈）
    e4k_bladechick: {
      name: "刃羽の雛", tier: 4, hp: 28, dmg: [2, 6, 2], hit: 65, def: 15, agi: 60, will: 999, mres: 10, gold: [0, 20], loot: [["wyvernscale", 0.3]], shape: "winged", eye: "#c8e0ff",
      kinOf: "azlag", where: ["mountains"], pack: [2, 2], acts: ["call"],
      clue: { text: "雛の巣のそばに、黒い金属の欠片が蹴り出されていた。親鳥はこの匂いをひどく嫌うらしい。雨に濡れた岩の上では、雛たちはよく足を滑らせていた。", memo: "刃羽の雛の巣から、黒い金属の欠片が蹴り出されていた。雛は濡れた岩で足を滑らせる" },
      desc: "刃の羽がまだ柔らかい、大鳥の雛。鳴けば空から親が来る。",
      look: { body: "wyrm", skin: "#a8b8c8", skin2: "#e0e8f0", eyes: "googly", eyeN: 2, mouth: "beak", wings: "feather", tail: "fan", extra: ["blush"], mood: "fierce" },
    },
    e4k_cliffwatch: {
      name: "崖の羽番", tier: 4, hp: 40, dmg: [2, 6, 2], hit: 65, def: 20, agi: 50, will: 999, mres: 10, gold: [10, 30], loot: [["wyvernscale", 0.4]], shape: "humanoid", eye: "#c8e0ff",
      kinOf: "azlag", where: ["mountains"], acts: ["disarm"], weak: "bolt",
      clue: { text: "羽番の鎧は、大鳥の抜けた刃羽を綴じ合わせたものだった。継ぎ目に、黒い鎧の欠片が楔のように打ちこまれて、そこだけ羽が逆立っている。", memo: "崖の羽番の鎧の継ぎ目で、黒い鎧の欠片のところだけ羽が逆立っていた" },
      desc: "大鳥の抜け羽を拾い集めて鎧にした、鳥の顔の番人。羽の刃で相手の剣を払う。",
      look: { body: "biped", build: "lanky", skin: "#8a9aa8", head: "plain", eyes: "slit", mouth: "beak", weapon: "spear", wings: "feather", outfit: "armor", cloth: "#5a6a7a", extra: ["plume"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 海嘯の蛇竜（港の沖。島の洞窟の外の磯と、潮鳴りの洞）
    e4k_bellfish: {
      name: "鐘鳴り魚", tier: 3, hp: 26, dmg: [1, 8, 1], hit: 55, def: 10, agi: 45, will: 999, mres: 15, gold: [0, 20], loot: [["gem", 0.1]], shape: "blob", eye: "#7ad8ff",
      kinOf: "lugu", where: ["onigashima", "w3_seacave"], acts: ["sleep"], weak: "bolt",
      clue: { text: "魚の腹の中で小さな鐘が鳴っていた。沈んだ町の鐘楼のかけらだろうか。鐘の音は、錆びた鎖に耳を当てたときの音とよく似ている。", memo: "鐘鳴り魚の腹で鐘が鳴る。錆びた鎖の音と似ている" },
      desc: "腹の中で鐘が鳴る、大きな魚。浅瀬に跳ね上がって鐘を鳴らし、聞いた者を波の底へ眠らせる。",
      look: { body: "blob", skin: "#3a6a8a", skin2: "#8ac8e0", eyes: "googly", eyeN: 2, mouth: "o", tail: "fin", pattern: "spots", extra: ["bubbles"], mood: "silly" },
    },
    e4k_drownedsailor: {
      name: "舟歌の亡者", tier: 3, hp: 22, dmg: [1, 8, 1], hit: 55, def: 5, agi: 30, will: 999, mres: 10, undead: true, gold: [5, 25], loot: [["ale", 0.3]], shape: "humanoid", eye: "#7ad8ff",
      kinOf: "lugu", where: ["onigashima", "w3_seacave"], pack: [2, 3], acts: ["pin", "rout"], weak: "holy",
      clue: { text: "水夫は死んでも舟歌を口ずさんでいた。歌い返しの節のところで毎回つかえる。返し歌を知っていれば、この人は呑まれなかったのかもしれない。", memo: "沈んだ水夫は舟歌の返しの節でつかえる" },
      desc: "沖の歌に呑まれた船の水夫たち。死んでも舟歌をやめず、濡れた手で生きている者の連れを海へ引こうとする。",
      look: { body: "biped", build: "normal", skin: "#7a9aa0", head: "human", hair: "#2a3a3a", eyes: "hollow", mouth: "jaw", arms: "forward", outfit: "rags", cloth: "#3a4a5a", pattern: "ribs", extra: ["bandana"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 黒翼の使徒ノクターヴ（影の谷）
    e4k_unsaid: {
      name: "言いかけの影", tier: 3, hp: 26, dmg: [1, 8, 1], hit: 60, def: 5, agi: 50, will: 999, mres: 25, magic: true, gold: [0, 20], loot: [["manawater", 0.3]], shape: "humanoid", eye: "#8a8aff",
      kinOf: "kurobane", where: ["w2_shadow"], acts: ["sleep"], weak: "blade",
      clue: { text: "影は崩れる前に何かを言いかけた。続きは壁の影が知っているという。最後まで聞いた者は、空に向かってそれを言えるのだと。", memo: "言いかけの影の続きは、壁の影が知っているらしい" },
      desc: "谷の壁から剥がれた影。昨日の続きを話しかけてくる。聞き入った者は立ったまま眠る。",
      look: { body: "biped", build: "lanky", skin: "#1a1a2a", head: "plain", eyes: "glow", eyeN: 2, mouth: "o", arms: "forward", outfit: "none", extra: ["smoke", "float"], mood: "calm" },
    },
    e4k_blackmite: {
      name: "黒い羽虫", tier: 3, hp: 20, dmg: [1, 6, 2], hit: 60, def: 5, agi: 70, will: 999, mres: 10, gold: [0, 10], loot: [["silk", 0.3]], shape: "swarm", eye: "#ff4d4d",
      kinOf: "kurobane", where: ["w2_shadow"], pack: [2, 3], acts: ["poison", "rout"], weak: "fire",
      clue: { text: "羽虫の羽は、どれも黒い大きな羽の羽毛の一片だった。空の裂け目から、ときどき落ちてくるのだという。落ちてくる真下に立つと、空が一瞬こちらを見る。", memo: "黒い羽虫は、空の裂け目から落ちる羽のかけら" },
      desc: "黒い羽のかけらが虫になって群れている。刺されるとひどく腫れる。",
      look: { body: "bug", skin: "#1a1a22", skin2: "#4a4a5a", eyes: "glow", eyeN: 4, mouth: "fangs", wings: "moth", extra: ["float"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 閉じ月の使徒クロフェン（野。二つ目の月の夜）
    e4k_moonhare: {
      name: "二つ月の兎", tier: 3, hp: 20, dmg: [1, 6, 2], hit: 60, def: 5, agi: 80, will: 999, mres: 20, gold: [0, 15], loot: [["pelt", 0.4]], shape: "beast", eye: "#fff0a0",
      kinOf: "tojizuki", where: ["frost", "w2_echo", "mountains"], when: { night: true }, acts: ["fleecall"],
      clue: { text: "兎は、水たまりに映った月を見て足を止めた。空の月には跳びかかるのに、水の中の月には近づかない。", memo: "二つ月の兎は水に映った月には近づかない" },
      desc: "二つ目の月が昇る夜にだけ跳ね回る白い兎。深手を負うと月へ逃げ、別の兎を連れて戻る。",
      look: { body: "quad", head: "plain", skin: "#f0ece0", skin2: "#ffffff", ears: "pointy", eyes: "glow", mouth: "o", tail: "none", extra: ["float"], mood: "fierce" },
    },
    e4k_moonarcher: {
      name: "月を射る亡者", tier: 4, hp: 36, dmg: [2, 6, 2], hit: 65, def: 10, agi: 45, will: 999, mres: 15, undead: true, gold: [10, 30], loot: [["relic", 0.05]], shape: "humanoid", eye: "#fff0a0",
      kinOf: "tojizuki", where: ["mountains"], when: { night: true }, acts: ["drain"], weak: "holy",
      clue: { text: "亡者の矢筒の矢はどれも先が濡れていた。空の月は射抜けなかった。だから最後の一本だけ、足元の水鏡に映る月を狙ったのだと、矢羽に刻んである。", memo: "月を射る亡者の最後の矢は、水鏡に映る月を狙っていた" },
      desc: "月を射落とそうとして、一生を空に向けて終えた弓取り。今は月を見上げる者を射る。",
      look: { body: "biped", build: "lanky", skin: "#a8a89a", head: "skull", eyes: "hollow", mouth: "jaw", weapon: "bow", outfit: "rags", cloth: "#3a3a4a", pattern: "ribs", extra: ["cape"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 鉄喰いの使徒ザルガドム（鍛冶の都の外の街道）
    e4k_rustgnaw: {
      name: "錆かじり", tier: 2, hp: 12, dmg: [1, 4, 1], hit: 55, def: 10, agi: 55, will: 40, mres: 0, gold: [3, 15], loot: [["fang", 0.3]], shape: "small", eye: "#ff8a3a",
      kinOf: "tetsukui", where: ["frost"], pack: [2, 3], acts: ["disarm", "rout"],
      clue: { text: "錆かじりは、歯形のついた古釘だけは決して噛まなかった。一度噛まれた鉄はもう噛まないらしい。鍛冶の都では、その釘をお守りにするという。", memo: "錆かじりは歯形のついた古釘を噛まない" },
      desc: "鉄をかじる小さな獣の群れ。剣に飛びついて手から落とさせる。",
      look: { body: "quad", head: "plain", size: 0.8, skin: "#8a5a3a", skin2: "#c88a5a", ears: "round", eyes: "googly", mouth: "fangs", tail: "thin", pattern: "spots", mood: "silly" },
    },
    e4k_ironmite: {
      name: "鉄虫", tier: 2, hp: 18, dmg: [1, 6, 1], hit: 55, def: 20, agi: 30, will: 999, mres: 0, gold: [0, 10], loot: [["gem", 0.05]], shape: "beast", eye: "#ffb03a",
      kinOf: "tetsukui", where: ["frost"], acts: ["corrode"], weak: "bolt",
      clue: { text: "鉄虫の殻の中に、細かく噛み砕かれた鉄の粉が詰まっていた。殻の内側に大きな歯形がひとつ。鉄虫の主はもっと大きな口を持っている。", memo: "鉄虫の殻の内側に大きな歯形がひとつ" },
      desc: "鎧の継ぎ目に潜り込んで鉄をかじる虫。かじられた鎧は留め金から緩む。",
      look: { body: "bug", skin: "#5a5a60", skin2: "#9a9aa0", eyes: "glow", eyeN: 2, mouth: "fangs", pattern: "stripes", mood: "fierce" },
    },

    // ---------------------------------------------------------------- 咎追いの使徒ネリオス（懺悔の谷）
    e4k_bellsinner: {
      name: "鈴振りの罪人", tier: 3, hp: 26, dmg: [1, 8, 1], hit: 55, def: 10, agi: 30, will: 999, mres: 10, undead: true, gold: [5, 25], loot: [["holywater", 0.2]], shape: "humanoid", eye: "#ff8a6a",
      kinOf: "togaoi", where: ["w2_echo"], acts: ["pin"], weak: "holy",
      clue: { text: "罪人の鈴は舌が抜けていて鳴らなかった。鳴らない鈴の持ち主は、数えられずに済むのだと、罪人は笑った。煙の中では追う者も鼻が利かないとも。", memo: "鈴振りの罪人：鳴らない鈴の持ち主は数えられない。煙の中では追う者の鼻が利かない" },
      desc: "首に鈴を下げて谷を歩く罪人の亡者。鈴の音で生きた者の連れを縛る。",
      look: { body: "biped", build: "lanky", skin: "#9a8a7a", head: "hood", eyes: "hollow", mouth: "frown", arms: "forward", outfit: "rags", cloth: "#4a3a2a", pattern: "scars", extra: ["bone"], mood: "fierce" },
    },
    e4k_guiltdog: {
      name: "咎の犬", tier: 3, hp: 20, dmg: [1, 6, 2], hit: 55, def: 10, agi: 60, will: 999, mres: 5, gold: [0, 15], loot: [["fang", 0.4]], shape: "beast", eye: "#ff3a3a",
      kinOf: "togaoi", where: ["w2_echo"], acts: ["call"],
      clue: { text: "犬は血の匂いを嗅ぎ分けて吠える。けれど煙玉の煙を浴びると、くしゃみをして、追う相手を見失った。", memo: "咎の犬は煙玉の煙で追う相手を見失った" },
      desc: "人を殺めた者の匂いを追う犬。吠えれば谷じゅうの咎の犬が集まる。",
      look: { body: "quad", head: "wolf", skin: "#3a2a2a", skin2: "#6a4a3a", eyes: "glow", mouth: "fangs", tail: "spike", pattern: "scars", mood: "fierce" },
    },

    // ---------------------------------------------------------------- 芽吹きの使徒リサルナ（麦の都の外の丘陵）
    e4k_scarecrow: {
      name: "動く案山子", tier: 1, hp: 10, dmg: [1, 4, 0], hit: 45, def: 5, agi: 20, will: 999, mres: 0, gold: [0, 6], loot: [["herb", 0.3]], shape: "humanoid", eye: "#e8d44d",
      kinOf: "midori", where: ["plains"], acts: ["guard"], weak: "fire",
      clue: { text: "案山子の胸の藁の中に、麦の種の小袋が縫いこまれていた。去年の種だ。撒く方角が袋に墨で書いてある。", memo: "動く案山子の胸に去年の麦の種の小袋" },
      desc: "麦の都の畑から歩き出した案山子。畑を荒らす者の前に立ちはだかる。",
      look: { body: "biped", build: "lanky", skin: "#c8a868", head: "plain", eyes: "dot", mouth: "grin", arms: "forward", outfit: "rags", cloth: "#6a5a3a", extra: ["cap", "scarf"], mood: "silly" },
    },
    e4k_furrowmole: {
      name: "畝走りの土竜", tier: 1, hp: 9, dmg: [1, 4, 0], hit: 45, def: 5, agi: 40, will: 40, mres: 0, gold: [1, 8], loot: [["herb", 0.3]], shape: "beast", eye: "#e8c87a",
      kinOf: "midori", where: ["plains"], acts: ["steal"], when: { season: ["春", "夏", "秋"] },
      clue: { text: "土竜の巣穴は、どれも麦の都の方角へ向いていた。冬のあいだ、穴はすべてふさがれるという。畑を動かすものも冬は眠るのだろうか。", memo: "畝走りの土竜の巣は麦の都を向く。冬はふさがれるらしい" },
      desc: "麦の畝の下を走り回る大土竜。旅人の荷から種や豆を盗んで、畑に植え直す。",
      look: { body: "quad", head: "plain", skin: "#5a4a3a", skin2: "#a88a6a", ears: "round", eyes: "dot", mouth: "o", arms: "claws", tail: "thin", extra: ["nose"], mood: "silly" },
    },

    // ---------------------------------------------------------------- 酸溜まりの使徒ゼノバス（酸の谷）
    e4k_acidbud: {
      name: "酸の芽", tier: 3, hp: 28, dmg: [1, 8, 1], hit: 55, def: 15, agi: 15, will: 999, mres: 10, gold: [0, 15], loot: [["gem", 0.1]], shape: "blob", eye: "#b6ff7a",
      kinOf: "sanno", where: ["w2_acid"], acts: ["corrode"], weak: "ice",
      clue: { text: "酸の芽は、谷の底のほうへ向かって這っていた。底に何かを探しているらしい。芽の芯には、緑色に光る小石のかけらが溶け残っていた。", memo: "酸の芽の芯に緑に光る小石のかけら" },
      desc: "溜まりから這い出た、酸の塊。鎧に触れると留め金を溶かす。",
      look: { body: "blob", skin: "#7ad84a", skin2: "#d0ff8a", eyes: "dot", eyeN: 3, mouth: "grin", extra: ["bubbles", "drool"], mood: "fierce" },
    },
    e4k_greenwatch: {
      name: "緑の見張り", tier: 3, hp: 32, dmg: [2, 6, 1], hit: 55, def: 20, agi: 20, will: 999, mres: 10, gold: [5, 25], loot: [["relic", 0.04]], shape: "humanoid", eye: "#7aff7a",
      kinOf: "sanno", where: ["w2_acid"], acts: ["guard"], weak: "bolt",
      clue: { text: "見張りの胸に、緑の石をはめていた跡が空いていた。石が無くなってから、見張りは谷の底ばかり見ているのだという。", memo: "緑の見張りの胸に緑の石の跡が空いていた" },
      desc: "谷の底の溜まりを囲む、苔むした石の見張り。仲間の前に立ち、酸の飛沫を浴びても崩れない。",
      look: { body: "biped", build: "stubby", skin: "#5a7a5a", skin2: "#8aaa7a", head: "helm", eyes: "goggle", eyeN: 1, mouth: "none", weapon: "spear", outfit: "none", pattern: "cracks", extra: ["runes"], mood: "fierce" },
    },

    // ---------------------------------------------------------------- 根の王（狩り場の町の外の湿地）
    e4k_rootling: {
      name: "根の子", tier: 2, hp: 18, dmg: [1, 6, 1], hit: 55, def: 10, agi: 25, will: 999, mres: 10, gold: [0, 10], loot: [["herb", 0.5]], shape: "small", eye: "#a8ff6a",
      kinOf: "sekaiju", where: ["swamp"], acts: ["regen"], weak: "fire",
      clue: { text: "根の子は、あなたが嘘をつくと、ぴたりと動きを止めた。耳をすませるように。根は本当のことには返事をしないらしい。", memo: "根の子は、嘘をつくと動きを止めて耳をすませた" },
      desc: "大樹の根から芽吹いた、小さな根の人形。切ってもすぐに根が伸びてつながる。",
      look: { body: "biped", build: "small", skin: "#6a5a3a", skin2: "#a89060", head: "plain", eyes: "dot", mouth: "o", arms: "claws", outfit: "none", pattern: "cracks", extra: ["fur"], mood: "silly" },
    },
    e4k_ember: {
      name: "燠喰い虫", tier: 2, hp: 16, dmg: [1, 6, 1], hit: 55, def: 10, agi: 45, will: 999, mres: 10, gold: [0, 10], loot: [["silk", 0.3]], shape: "beast", eye: "#ff8a3a",
      kinOf: "sekaiju", where: ["swamp"], acts: ["poison"], weak: "ice",
      clue: { text: "燠喰い虫は、根を焼く火の粉を食べて根を守っていた。どんな燠でも食べるが、黒鉄の砦の古い炉の燠だけは、食べきれずに吐き出したという。", memo: "燠喰い虫は火の粉を食べて根を守る。砦の古い炉の燠だけは食べきれない" },
      desc: "根を焼こうとする火を食べる、甲虫の群れの一匹。口から毒の煙を吐く。",
      look: { body: "bug", skin: "#4a3a2a", skin2: "#ff8a3a", eyes: "glow", eyeN: 2, mouth: "fangs", pattern: "lava", extra: ["smoke"], mood: "fierce" },
    },
  });

  // ---------------------------------------------------------------- 縄張りの眷属を退けると、使徒が弱る（残りの条件の 1/4 ぶん）
  // on は満たして挑んだときの一行（使徒ごと）。名前は出さない
  E4.CORE = {
    graw: "城の廊下に、従騎士の足音も鎖の音もしない。黒い鎧は背後を一度だけ振り返った。",
    gormore: "厨房の小鬼たちが、鍋の陰に隠れたまま出てこない。三つの口のひとつが、つまらなそうに舌を鳴らした。",
    mordu: "庭の番犬が吠えない。枝打ちの音もしない。庭師は、伸びすぎた枝を気にして手を止めた。",
    levian: "水の書庫が静かだ。文字が泳いでいない。女は濡れた本の白い頁を、何度もめくり直した。",
    mirza: "糸に吊られた踊り手がいない。若君の日傘が退屈そうに傾いだ。",
    notari: "霧の中に書記の筆音が無い。老人は書かれていない先を見るように、目を細めた。",
    zalve: "夜の街道から砂の小僧の足音が消えた。崩れた袖がなかなか元に戻らない。",
    aurelia: "侍祭の歌が聞こえない。後光が、ほんの少しだけ薄い。",
    yoihime: "煙の猫がいない。用心棒もいない。香の煙がいつもより薄く漂っている。",
    chezar: "銀面の衛士が並んでいない。老将の面が一枚だけ傾いだ。",
    yura: "夜道の羊が数えられない。夢の町の端がほつれている。",
    azlag: "崖の雛の声がしない。大鳥は巣のほうを一度だけ見た。",
    lugu: "沈んだ水夫の舟歌が止んでいる。波の守りがどこか浅い。",
    kurobane: "壁の影が何も言いかけない。空の裂け目が少し狭い。",
    tojizuki: "二つ目の月の下で兎が跳ねていない。月はまぶたを重そうにしている。",
    tetsukui: "錆かじりが一匹もいない。獣は空腹そうに鼻を鳴らした。",
    togaoi: "谷に鈴の音がしない。咎の犬も吠えない。処刑人は、数えるものを探して首を巡らせた。",
    midori: "畑の案山子が倒れたままだ。大きなものの歩みが畝の上で迷った。",
    sanno: "溜まりのまわりに見張りが立っていない。溜まりは落ち着かなく波立っている。",
    sekaiju: "根の子が芽吹いていない。根の脈がどこか遅い。",
  };
  E4.CORE_NEED = 2;
})(globalThis.G = globalThis.G || {});
