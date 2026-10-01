// 使徒二体と、その眷属と居城の魔物（E2）。欄の意味は enemies.js と enemies_2.js と同じ。
// 使徒は majin（絶界）なので、魔剣ヴォルグリムか聖刀白夜でしか傷つかない。
// 名前と説明は戦うと見える。正体や世界の仕組みは書かない（docs/lore/voice.md）。
// 居城の迷宮は locations_e2.js、関われる出来事は events_e2.js。レーン E（敵）が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ENEMIES, {
    // ---------------------------------------------------------------- 暴食のゴルモア（大厨房）
    e2_gormoa: {
      name: "暴食の使徒ゴルモア", tier: 6, boss: true, majin: true, hp: 240, dmg: [3, 8, 4], hit: 70, def: 20, agi: 20, will: 999, mres: 30,
      gold: [400, 900], loot: [["gem", 1], ["elixir", 1]], shape: "giant", eye: "#ffb000",
      desc: "丘のように太ったもの。口が三つある。剣は、体に届く前に何かに弾かれる。",
      look: { body: "biped", build: "giant", size: 1.18, skin: "#d8987a", skin2: "#f0c8a8", head: "ogre", eyes: "googly", eyeN: 3, mouth: "tongue", horns: "nubs", arms: "hands", weapon: "club", outfit: "loin", cloth: "#efe8da", pattern: "spots", extra: ["drool", "blush", "beard"], hair: "#6a3a2a", mood: "silly" },
      lines: {
        open: ["「おお、今日の食材は自分で歩いてくるのか！ 活きがいい！」三つの口が同時に笑った。", "「待て待て、斬りかかる前に聞かせろ。お前、何味だ？」"],
        turn: ["文句を言う口が「筋が多い」と言った。食べる口は、それでもよだれを垂らしている。", "それは戦いの最中に、懐から骨付き肉を出してかじった。", "「甘い？ 甘いのか？ いや、分かっている。分かっているとも」使徒は目をそらした。", "味わう口が、あなたの汗をなめた。「……塩が足りん」"],
      },
    },
    e2_marmit: {
      name: "料理長マルミット", tier: 5, boss: true, hp: 110, dmg: [2, 8, 4], hit: 75, def: 15, agi: 55, will: 999, mres: 15,
      gold: [120, 260], loot: [["apostleheart", 1], ["potion", 1]], shape: "humanoid", eye: "#e8e8e8",
      desc: "白い前掛けの料理人。肉切り包丁の柄に、王冠の焼き印がある。人を見ると、まず部位を数える。",
      look: { body: "biped", build: "lanky", skin: "#e8c4a8", head: "human", hair: "#e8e4dc", eyes: "dot", mouth: "smirk", weapon: "axe", outfit: "robe", cloth: "#f2eee4", extra: ["stubble", "blood", "pouch"] },
      lines: {
        open: ["「厨房に土足で入るな。……いや、いい。どうせ洗う」料理長は肉切り包丁を研ぎ始めた。", "「肩ロース、ばら、すね。お前はすね肉が多いな。煮込み向きだ」"],
        turn: ["「刃筋が汚い。料理人なら三日で破門だ」", "料理長は斬り合いの合間に、鍋の火加減を見に行った。", "「毒見役？ あれは味見の仕方が下品だった。それだけだ」"],
      },
    },
    e2_cookgob: {
      name: "見習い料理ゴブリン", tier: 4, hp: 34, dmg: [2, 6, 1], hit: 60, def: 10, agi: 45, will: 35, mres: 0, gold: [10, 40], loot: [["jerky", 0.6], ["ale", 0.4]], shape: "small", eye: "#ffe08a",
      desc: "厨房で皮むきをしているゴブリン。次の献立に載らないよう、必死で働いている。",
      look: { body: "biped", build: "small", skin: "#9ab04a", head: "plain", ears: "pointy", eyes: "googly", mouth: "o", weapon: "dagger", outfit: "rags", cloth: "#e8e0d0", extra: ["cap", "sweat", "nose"], mood: "silly" },
      fleeAt: 0.4,
      lines: {
        open: ["「し、食材が逃げてる！ 捕まえたら、おれ、見習い卒業！」", "ゴブリンはおたまを構えた。持ち方が逆だ。"],
        turn: ["「料理長に怒られる……料理長に怒られる……」", "見習いは玉ねぎを投げてきた。目にしみる。", "「ほんとは皿洗いのほうが好きなんだ」ゴブリンは泣きながら斬りかかってくる。"],
        flee: "「きょ、今日は休みますって言っといて！」見習いは鍋をかぶって逃げていった。",
      },
    },
    e2_meatling: {
      name: "逃げた食材", tier: 5, hp: 56, dmg: [2, 8, 2], hit: 60, def: 5, agi: 35, will: 999, mres: 10, gold: [0, 20], loot: [["jerky", 1], ["fang", 0.4]], shape: "blob", eye: "#ff8a6a",
      desc: "下ごしらえの途中で逃げ出した、何かの肉の塊。元が何だったのかは、もう誰にも分からない。ときどき人の言葉で「熱い」と言う。",
      look: { body: "blob", skin: "#c8605a", skin2: "#f0b0a0", eyes: "hollow", eyeN: 3, mouth: "jaw", pattern: "scars", extra: ["bone", "bubbles"], mood: "fierce" },
      lines: {
        turn: ["肉の塊が、かすれた声で「熱い」と言った。", "塊の中から、指輪をはめた指が一本のぞいている。", "塊には、香草がきれいに刷り込まれている。"],
      },
    },

    // ---------------------------------------------------------------- 腐爛のモルドゥ（腐れ庭園）
    e2_mordu: {
      name: "腐爛の使徒モルドゥ", tier: 6, boss: true, majin: true, magic: true, hp: 200, dmg: [2, 10, 4], hit: 75, def: 15, agi: 30, will: 999, mres: 40,
      gold: [300, 700], loot: [["gem", 1], ["relic", 1]], shape: "humanoid", eye: "#c8ff6a",
      desc: "泥と苔に覆われた背の高い庭師。帽子の下は、しおれた花でいっぱい。歩くたびに甘い匂いがする。その匂いは、鎧の隙間から入り込む。",
      look: { body: "biped", build: "lanky", size: 1.12, skin: "#5a6a3a", skin2: "#9aa86a", head: "plain", hair: "#3a4a22", eyes: "glow", eyeN: 1, mouth: "smirk", arms: "claws", weapon: "spear", outfit: "robe", cloth: "#3e4a2c", pattern: "spots", extra: ["wildhair", "smoke", "drool"], mood: "fierce" },
      lines: {
        open: ["「ああ、お客様。足元にお気をつけて。そこは先週植えた方です」", "「いい肥やし……いえ、いいお顔色だ。少しお話ししていきませんか」"],
        turn: ["庭師は戦いながら、足元の花の枯れた葉を丁寧に摘んだ。", "「急がないで。病はね、ゆっくり育てるのが一番きれいなんです」", "甘い匂いが濃くなった。息を吸うたびに、肺の奥がかゆい。", "「本を集めるお友だちがね、この花を栞にしたいと言うんですよ。困ったものです」"],
      },
    },
    e2_berna: {
      name: "疫医ベルナ", tier: 4, boss: true, magic: true, hp: 65, dmg: [2, 6, 2], hit: 65, def: 15, agi: 50, will: 999, mres: 25,
      gold: [120, 240], loot: [["apostleheart", 1], ["elixir", 1]], shape: "humanoid", eye: "#e8e0a0",
      desc: "嘴のような仮面をかぶった医者。仮面の奥の声は、若い女のもの。薬はよく効き、ひどく高い。",
      look: { body: "biped", build: "normal", skin: "#d8d0c0", head: "hood", eyes: "glow", mouth: "none", weapon: "bottle", outfit: "robe", cloth: "#1e1a1c", extra: ["cape", "pouch", "nose"] },
      lines: {
        open: ["「診察の予約は？ ない？ では料金は倍です」嘴の仮面の奥で、目が細くなった。", "「健康な検体が歩いてくるとは。今日はついている」"],
        turn: ["医者は戦いながら、あなたの咳の回数を帳面に書き留めている。", "「その傷、三日で腐りますよ。薬、要ります？」", "「先生はお優しい方です。だから私が値段をつけるんです」"],
      },
    },
    e2_planted: {
      name: "植えられた人", tier: 3, hp: 26, dmg: [1, 8, 1], hit: 50, def: 5, agi: 10, will: 999, mres: 10, gold: [0, 15], loot: [["herb", 0.6]], shape: "humanoid", eye: "#b0ff9a",
      desc: "花壇に、腰まで植えられた人。頭から咲いた花が、まだ本人の声で助けを呼ぶ。近づく者を、土に引き込もうと腕を伸ばす。",
      look: { body: "biped", build: "normal", skin: "#8a9a6a", head: "human", hair: "#4a3a22", eyes: "hollow", mouth: "o", arms: "forward", outfit: "rags", cloth: "#5a5040", pattern: "spots", extra: ["sweat", "drool"], mood: "fierce" },
      lines: {
        open: ["「たすけて……ちがう、にげて……ちがう、こっちへ……」声がまとまらない。"],
        turn: ["頭の花が、ゆっくりとあなたのほうを向いた。", "「水を……水を……」根が、あなたの足首を探っている。", "胸の名札には、エルメシアの町の名前が書いてある。"],
      },
    },
    e2_rotbloom: {
      name: "腐れ花", tier: 3, magic: true, hp: 22, dmg: [2, 4, 1], hit: 55, def: 5, agi: 25, will: 999, mres: -10, gold: [0, 10], loot: [["herb", 0.4], ["manawater", 0.2]], shape: "blob", eye: "#ff6ab4",
      desc: "人の背丈ほどの花。甘い花粉で眠らせたものを、根元に寝かせておく。花粉は鎧の隙間から入り込む。",
      look: { body: "blob", skin: "#b04a7a", skin2: "#ffb0d0", eyes: "slit", eyeN: 1, mouth: "fangs", horns: "antler", pattern: "spots", extra: ["drool", "bubbles"], mood: "fierce" },
      lines: {
        turn: ["花がふくらみ、甘い花粉を吐いた。まぶたが重い。", "根元の土から、誰かの靴が突き出ている。"],
      },
    },
  });
})(globalThis.G = globalThis.G || {});
