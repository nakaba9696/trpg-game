// 新しい場所の敵（W3）。欄の意味は enemies.js と enemies_2.js と同じ
// 鐘撞きの丘・港の商都の裏通りの用心棒、沈黙の修道院の修道士、数の合わない島と潮鳴りの洞の浜の者、火山と灰の観測所の者
// ボス：灰の書記（灰の観測所）・潮呑み（潮鳴りの洞）。前口上は boss_lines の形で下に、図鑑の説明は lore_w3.js に
// 説明文は匂わせにとどめる（docs/lore/voice.md）
// レーン E（敵）・W（場所）が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ENEMIES, {
    // 段 2
    w3_smuggler: {
      name: "港の用心棒", tier: 2, hp: 22, dmg: [1, 6, 2], hit: 60, def: 10, agi: 45, will: 50, mres: 0, gold: [10, 35], loot: [["ale", 0.4], ["q4_saltfish", 0.1]], shape: "humanoid", eye: "#d9d9d9", bribe: 30,
      desc: "密輸の荷を見張る、首の太い男。腰の鈴は、裏通りの戸口に下がっているのと同じ形。",
      look: { body: "biped", build: "brute", skin: "#c89a78", head: "bandana", eyes: "dot", mouth: "grin", arms: "hands", weapon: "club", outfit: "garb", cloth: "#3a4a5a", extra: ["stubble", "pouch"], mood: "fierce" },
      fleeAt: 0.35,
      lines: {
        open: ["樽の陰から首の太い男が立ち上がった。腰の鈴が一つ鳴った。「荷を見たな。見てない、って顔をしろ」"],
        turn: ["用心棒は棍棒を肩に担ぎなおし、荷の数を目で数えた。一つ足りない顔をした。", "「俺だって、こんな仕事、好きでやってるわけじゃ……いや、好きだ」"],
        flee: "用心棒は鈴を握りしめて鳴らないようにし、樽の向こうへ消えた。",
      },
    },
    w3_hermit: {
      name: "舟殻ヤドカリ", tier: 2, hp: 20, dmg: [1, 6, 1], hit: 55, def: 30, agi: 20, will: 999, mres: 0, gold: [0, 12], loot: [["gem", 0.08], ["q4_saltfish", 0.15]], shape: "beast", eye: "#ffcf6e",
      desc: "小舟を一艘、殻の代わりに背負った大ヤドカリ。舟の名札はたいてい島の誰かの名前。",
      look: { body: "bug", skin: "#c8603a", skin2: "#f0b080", eyes: "googly", mouth: "none", pattern: "spots", extra: ["bubbles"], mood: "silly" },
      fleeAt: 0.4,
      lines: {
        open: ["浜に伏せてあった小舟が立ち上がった。下から赤い脚が八本出てきた。"],
        turn: ["ヤドカリは舟の縁から鋏を出し、また引っ込めた。中は狭いらしい。", "背中の舟の名札がぱたんと揺れた。「ウメ丸」と書いてある。"],
        flee: "ヤドカリは舟を背負ったまま、横歩きで波に入っていった。舟が沖へ漕ぎ出していくように見えた。",
      },
    },
    w3_cinder: {
      name: "火の粉小僧", tier: 2, hp: 16, dmg: [2, 4, 1], hit: 60, def: 5, agi: 60, will: 30, mres: 20, magic: true, gold: [0, 10], loot: [["gem", 0.05]], shape: "small", eye: "#ffb03a",
      desc: "火山の斜面で、灰の中から跳ねて出てくる小さな火の塊。人の家の竈に入りたがる。",
      look: { body: "blob", skin: "#e8602a", skin2: "#ffd060", eyes: "googly", mouth: "grin", pattern: "none", extra: ["smoke", "float"], mood: "silly" },
      fleeAt: 0.5,
      lines: {
        open: ["灰の上で何かが跳ねた。火の粉の塊がこちらを見て笑った。"],
        turn: ["小僧はあなたの外套の裾に飛び移ろうとして、雨粒に当たって泣いた。", "小僧は灰を蹴り上げ、自分の目に入れた。"],
        flee: "火の粉小僧は灰の割れ目に飛び込んだ。しばらく、地面の下で笑い声がしていた。",
      },
    },

    // 段 3
    w3_drowned: {
      name: "溺れ船乗り", tier: 3, hp: 28, dmg: [1, 8, 1], hit: 55, def: 5, agi: 25, will: 999, mres: 10, undead: true, gold: [5, 25], loot: [["relic", 0.04], ["q4_silk", 0.06]], shape: "humanoid", eye: "#7dffd0",
      desc: "海から上がってきた船乗り。濡れた縄をまだ腰に巻いている。陸の上でも櫂を漕ぐ手つきをやめない。",
      look: { body: "biped", build: "lanky", skin: "#7a9a90", head: "kerchief", eyes: "hollow", mouth: "o", arms: "forward", outfit: "rags", cloth: "#4a5a6a", pattern: "ribs", extra: ["drool"] },
      lines: {
        open: ["波打ち際から濡れた男が上がってきた。陸に着いても腕は櫂を漕いでいる。「……帆を……上げ……」"],
        turn: ["溺れ船乗りが、あなたの肩越しに沖を指さした。誰もいない。", "船乗りの口から、海水と、小さな蟹が一匹出てきた。"],
      },
    },
    w3_silentmonk: {
      name: "口縫いの修道士", tier: 3, hp: 30, dmg: [2, 4, 2], hit: 60, def: 10, agi: 35, will: 80, mres: 25, gold: [5, 30], loot: [["holywater", 0.2], ["q4_candles", 0.15]], shape: "humanoid", eye: "#fff1c9",
      desc: "唇を太い糸で縫い合わせた修道士。話しかけると手で静かにするよう示す。それでも話すと襲ってくる。",
      look: { body: "biped", build: "lanky", skin: "#d8c8b0", head: "hood", eyes: "dot", mouth: "none", arms: "hands", weapon: "staff", outfit: "robe", cloth: "#5a5048", extra: ["runes"] },
      lines: {
        open: ["回廊の柱の陰から灰色の僧衣が現れた。唇が糸で縫ってある。指を一本、その唇に当てた。"],
        turn: ["修道士は打たれても声を上げない。縫い目が一つ、ぷつりと切れた。", "修道士は指で、あなたの口を指し、それから首を横に振った。"],
      },
    },
    w3_ashmoth: {
      name: "灰喰い蛾", tier: 3, hp: 24, dmg: [1, 6, 2], hit: 60, def: 5, agi: 60, will: 999, mres: 10, gold: [0, 15], loot: [["silk", 0.3]], shape: "winged", eye: "#c8c0b0",
      desc: "灰の観測所の書庫に棲む、両手を広げたほどの蛾。紙と灰を食う。羽ばたくと古い字が粉になって舞う。",
      look: { body: "bug", skin: "#9a948a", skin2: "#d8d0c0", eyes: "glow", mouth: "none", wings: "moth", pattern: "spots", extra: ["float"] },
      lines: {
        open: ["天井から灰が降ってきた。灰ではなかった。翼を広げた蛾だった。"],
        turn: ["蛾の羽から粉が舞った。粉の一つ一つが小さな字の形をしている。", "蛾は棚の帳面に止まり、一頁、ぺろりと食べた。"],
      },
    },

    // ボス
    w3_ashscribe: {
      name: "灰の書記", tier: 4, boss: true, hp: 100, dmg: [2, 6, 3], hit: 65, def: 15, agi: 30, will: 999, mres: 30, magic: true, gold: [30, 90], loot: [["relic", 0.4], ["m1_tome_ward", 0.15]], shape: "humanoid", eye: "#ffb03a",
      desc: "観測所の一番下の部屋で、机に向かって書き続けている者。灰をかぶったまま、何十年も同じ帳面に同じ字を書いている。",
      look: { body: "biped", build: "lanky", skin: "#8a847a", head: "hood", eyes: "glow", mouth: "none", arms: "forward", weapon: "staff", outfit: "robe", cloth: "#6a645a", pattern: "cracks", extra: ["smoke", "runes"], mood: "fierce" },
      lines: {
        open: ["机の前の灰の塊が、ペンを持ったまま振り向いた。灰がざらざらと崩れて、中から乾いた顔が出てきた。「……記録の、邪魔だ」"],
        turn: ["書記は戦いながら、空いた手で帳面に一行書き足した。", "書記の体から灰が崩れ落ち、その下からまた灰が出てきた。", "「今日、山は……」書記は窓の外を見ようとした。窓は灰で埋まっている。"],
      },
    },
    w3_tidemaw: {
      name: "潮呑み", tier: 4, boss: true, hp: 90, dmg: [2, 6, 2], hit: 60, def: 20, agi: 20, will: 999, mres: 10, gold: [20, 70], loot: [["gem", 0.5], ["q4_silk", 0.2]], shape: "blob", eye: "#7dffd0",
      desc: "潮鳴りの洞の奥に溜まった、大きな口だけの何か。満ち潮のたびに洞の水を呑み、引き潮のたびに吐く。呑んだ物はたいてい返さない。",
      look: { body: "blob", skin: "#3a6a7a", skin2: "#9ad8d0", eyes: "googly", eyeN: 1, mouth: "fangs", pattern: "spots", extra: ["bubbles", "drool"], mood: "fierce" },
      lines: {
        open: ["洞の奥の水溜まりが持ち上がった。水ではなかった。口だった。腹が鳴る音が洞じゅうに響いた。"],
        turn: ["潮呑みが息を吸った。足もとの水が、口のほうへ引っぱられていく。", "潮呑みが古い錨を一本吐き出した。ついでに草履も。"],
      },
    },
  });

  // ボスの前口上（B1。boss_lines.js と同じ形。あとから読まれても消えないよう Object.assign）
  G.data.BOSS_LINES = Object.assign(G.data.BOSS_LINES || {}, {
    w3_ashscribe: { lines: [
      "「今日、山は鳴らなかった。……今日も」",
      "ペン先が灰の上をこする音。書記は顔を上げない。",
    ] },
    w3_tidemaw: { lines: [
      "洞の奥で腹が鳴った。",
      "水面に、呑まれた舟の名札がいくつも浮かび上がった。",
    ] },
  });
})(globalThis.G = globalThis.G || {});
