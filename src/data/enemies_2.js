// 地域ごとの敵（E1）。欄の意味は enemies.js と同じ。加えて任意の欄：
//   lines: { open: [出会ったときの台詞], turn: [戦闘中にときどき言う台詞], flee: "逃げるときの台詞" }
//   look: 絵の指定（ui/art_monsters.js の monsterLook の欄）
//   fleeAt: 残り HP がこの割合以下になると逃げ出すことがある（0〜1）。逃げた敵は金も落とし物も残さない
// 台詞と逃げ方は engine/foe_quirks.js が出す。出現表への追記はこのファイルの末尾。
// レーン E（敵）が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ENEMIES, {
    // 段 1
    e1_crowngob: {
      name: "王冠ゴブリン", tier: 1, hp: 9, dmg: [1, 4, 0], hit: 45, def: 0, agi: 35, will: 25, mres: 0, gold: [3, 12], loot: [["jerky", 0.3]], shape: "small", eye: "#ffd700",
      desc: "紙の王冠をかぶったゴブリン。自分をゴブリン王だと言い張っている。家来はいない。",
      look: { body: "biped", build: "small", skin: "#7aa040", head: "plain", ears: "pointy", eyes: "googly", mouth: "grin", weapon: "dagger", outfit: "rags", cloth: "#8a2a4a", extra: ["nose", "cape", "sweat"], mood: "silly" },
      fleeAt: 0.5,
      lines: {
        open: ["「余はゴブリン王ギギである！ ひれ伏せ！ ……ひれ伏さんのか？」", "「そこの人間、余の領地に何の用だ。領地？ この切り株から、あの石までだ」"],
        turn: ["王冠がずれた。王はあわてて直している。", "「余の家来が百匹、そこの茂みに控えておるぞ！」茂みは静かだ。", "「王に刃を向けるとは不敬であるぞ！ 死刑！ ……執行は明日だ！」"],
        flee: "「こ、これは戦略的撤退である！ 覚えておれ！」王冠を落として逃げていった。",
      },
    },
    e1_bowshroom: {
      name: "おじぎ茸", tier: 1, hp: 12, dmg: [1, 4, 0], hit: 40, def: 10, agi: 10, will: 999, mres: -10, gold: [0, 4], loot: [["herb", 0.5]], shape: "blob", eye: "#f5a3c7",
      desc: "人の背丈ほどの茸。攻撃の前に必ず深々とおじぎをする。そのたびに胞子が飛ぶ。",
      look: { body: "blob", skin: "#e0d0c0", skin2: "#f5a3c7", eyes: "dot", mouth: "o", pattern: "spots", extra: ["blush", "bubbles"], mood: "silly" },
      lines: {
        open: ["茸は深々とおじぎをした。礼儀正しい。そして、明らかにこちらを食べる気だ。"],
        turn: ["茸はまたおじぎをした。胞子が舞い、あなたはくしゃみをした。", "茸はおじぎをしすぎて、しばらく起き上がれなくなった。", "あなたが攻撃すると、茸は「失礼」とでも言いたげに、もう一度おじぎをした。"],
      },
    },
    e1_tollrat: {
      name: "関所ネズミの群れ", tier: 1, hp: 10, dmg: [1, 4, 0], hit: 50, def: 5, agi: 50, will: 30, mres: 0, gold: [2, 10], loot: [], shape: "swarm", eye: "#c9a36b", bribe: 5,
      desc: "街道に小石を並べて「関所」を名乗るネズミの群れ。通行料は5G。払えば本当に通してくれる。",
      look: { body: "swarm", count: 5, build: "small", skin: "#8a7a6a", head: "plain", ears: "round", eyes: "dot", mouth: "o", tail: "thin", arms: "stubs", outfit: "none", extra: ["nose", "pouch"], mood: "silly" },
      fleeAt: 0.4,
      lines: {
        open: ["ネズミたちは小石の列の向こうで、一斉に前足を差し出した。通行料らしい。"],
        turn: ["一匹が小さな木札を掲げた。「つうこうりょう 5G」と書いてある。字がうまい。", "ネズミたちは、あなたの財布だけをじっと見ている。"],
        flee: "ネズミたちは小石を抱えて散っていった。明日には別の場所に関所ができているだろう。",
      },
    },

    // 段 2
    e1_frostgrave: {
      name: "凍えた旅人", tier: 2, hp: 20, dmg: [1, 6, 1], hit: 50, def: 5, agi: 15, will: 999, mres: 0, undead: true, gold: [3, 20], loot: [["jerky", 0.3], ["potion", 0.1]], shape: "humanoid", eye: "#bfe8ff",
      desc: "凍てつく街道で死んだ旅人が、まだ次の町を目指して歩いている。行く手に立つ者を、吹きだまりだと思って払いのける。",
      look: { body: "biped", build: "normal", skin: "#a8c0d0", head: "human", hair: "#e0ecf4", eyes: "hollow", mouth: "frown", arms: "forward", outfit: "rags", cloth: "#5a6a7a", pattern: "cracks", extra: ["scarf", "stubble"], mood: "fierce" },
      lines: {
        turn: ["凍えた旅人は「あと二日……あと二日で町だ……」とつぶやいている。何年前からそう言っているのだろう。", "旅人の凍った指から、家族宛ての手紙が落ちた。宛名はもう読めない。"],
      },
    },
    e1_frogprophet: {
      name: "沼の預言蛙", tier: 2, hp: 18, dmg: [1, 6, 1], hit: 50, def: 5, agi: 30, will: 40, mres: 20, gold: [5, 20], loot: [["manawater", 0.2], ["gem", 0.08]], shape: "blob", eye: "#9be36b",
      desc: "人の言葉を話す大蛙。出会う者すべてに死の預言を告げる。当たったことは一度もない。",
      look: { body: "blob", skin: "#5a9a3a", skin2: "#c8e8a0", eyes: "googly", mouth: "grin", pattern: "spots", extra: ["runes", "drool"], mood: "silly" },
      fleeAt: 0.35,
      lines: {
        open: ["「ゲコ。汝は三日のうちに、落ちてきた鍋に頭を打って死ぬ」", "「ゲコ。汝の死に様が見える……海で……いや山で……とにかく、どこかで死ぬ」"],
        turn: ["「今の一撃は預言どおりである」蛙は胸を張ったが、明らかに痛そうだ。", "「見える……汝の死に様が……えー、老衰……？」蛙は首をかしげた。"],
        flee: "「預言しよう。余は今から逃げる」珍しく、預言が当たった。",
      },
    },
    e1_sweeper: {
      name: "掃除人形", tier: 2, hp: 24, dmg: [1, 8, 0], hit: 55, def: 20, agi: 20, will: 999, mres: 0, gold: [0, 10], loot: [["gem", 0.05], ["relic", 0.04]], shape: "humanoid", eye: "#9fd6ff",
      desc: "神々の時代から遺跡を掃除し続けている石の人形。人間を「ほこり」と見なし、掃き出そうとする。掃き出された者で、息のあった者はいない。",
      look: { body: "biped", build: "stubby", skin: "#8a8a90", skin2: "#b0b0b8", head: "helm", eyes: "goggle", eyeN: 1, mouth: "none", arms: "hands", weapon: "staff", outfit: "none", pattern: "cracks", extra: ["runes"], mood: "fierce" },
      lines: {
        open: ["石の人形が箒を振り上げた。「ホコリ、ハッケン。ハイジョ、シマス」"],
        turn: ["掃除人形はあなたを放って、床の染みを一心に磨き始めた。……その染みは、前の冒険者だったものだ。", "「ホコリ、ガ、ウゴク。キョウ、ノ、ホコリ、ハ、シツコイ」"],
      },
    },

    // 段 3
    e1_lantern: {
      name: "提灯お化け", tier: 3, hp: 26, dmg: [2, 4, 2], hit: 60, def: 10, agi: 55, will: 50, mres: 20, magic: true, gold: [5, 30], loot: [["ale", 0.4], ["smoke", 0.2]], shape: "winged", eye: "#ff9a3a",
      desc: "鬼の宴で使い古されて化けた提灯。人を驚かすのが生きがいだが、自分の火で自分の紙をよく焦がす。その火は鎧の隙間から入り込む。",
      look: { body: "blob", skin: "#f0a040", skin2: "#ffe0a0", eyes: "googly", eyeN: 1, mouth: "tongue", pattern: "stripes", extra: ["float", "smoke", "sweat"], mood: "silly" },
      fleeAt: 0.3,
      lines: {
        open: ["「うらめしや〜……あれ、驚いてない？ もう一回やっていい？」"],
        turn: ["提灯お化けは舌を伸ばした拍子に、自分の火で舌を焦がした。", "「鬼の旦那たちに言いつけてやる！ 旦那たちは今、酔い潰れてるけど！」", "「うらめしや〜！」二回目も、あまり怖くない。"],
        flee: "「あちちちち！」提灯お化けは自分の火で燃え上がりながら、洞窟の奥へ逃げていった。",
      },
    },
    e1_melted: {
      name: "溶けかけた見習いたち", tier: 3, hp: 30, dmg: [1, 8, 2], hit: 50, def: 15, agi: 15, will: 999, mres: 30, gold: [5, 40], loot: [["manawater", 0.4], ["grimoire", 0.05]], shape: "blob", eye: "#c77dff",
      desc: "エルメシアの塔から「失敗作」として沼に捨てられた魔法使いの見習いたち。溶け合った体で、まだ呪文の暗唱を続けている。魔法はほとんど効かない。",
      look: { body: "blob", skin: "#7a5a9a", skin2: "#c8a8e0", eyes: "hollow", eyeN: 3, mouth: "jaw", pattern: "scars", extra: ["bubbles", "runes", "bone"], mood: "fierce" },
      lines: {
        turn: ["溶けた口が、三つの声で同じ呪文を唱えている。最後の一節だけ、いつも間違えている。", "「……試験……明日は……試験……」", "肉の中から、見習いの印章がついた指輪がのぞいている。"],
      },
    },

    // 段 4
    e1_sleepgiant: {
      name: "寝返り巨人", tier: 4, hp: 64, dmg: [3, 6, 2], hit: 45, def: 10, agi: 10, will: 999, mres: 10, gold: [10, 60], loot: [["fang", 0.5], ["gem", 0.3]], shape: "giant", eye: "#ffcf7a",
      desc: "断界山脈の谷を寝床にしている巨人。起きているところを見た者はいない。寝返りのたびに、谷の村がひとつ消える。",
      look: { body: "biped", build: "giant", size: 1.1, skin: "#b08a6a", head: "ogre", hair: "#6a5a4a", eyes: "dot", mouth: "o", weapon: "none", outfit: "loin", cloth: "#6a7a4a", extra: ["drool", "beard", "wildhair"], mood: "silly" },
      lines: {
        open: ["巨人は眠っている。あなたが剣を抜いても、目を開けもしない。"],
        turn: ["巨人は寝言を言った。「……むにゃ……ハエが……」", "巨人が寝返りを打った。狙われたのではない。たまたま、そこにいただけだ。", "巨人の鼻息で、あなたは三歩ほど吹き飛ばされた。"],
      },
    },
    e1_bonepicker: {
      name: "骨並べ", tier: 4, hp: 42, dmg: [2, 6, 3], hit: 65, def: 20, agi: 45, will: 60, mres: 15, gold: [20, 70], loot: [["wyvernscale", 0.4], ["relic", 0.1]], shape: "humanoid", eye: "#e8e0c8",
      desc: "竜の墓場で骨を拾い集め、大きさの順に並べることに一生をかけている魔物。あなたの骨の長さが、気になって仕方ないらしい。",
      look: { body: "biped", build: "lanky", skin: "#e8e0c8", head: "skull", eyes: "hollow", mouth: "jaw", weapon: "club", outfit: "rags", cloth: "#4a3a2a", pattern: "ribs", extra: ["pouch", "bone"], mood: "fierce" },
      fleeAt: 0.3,
      lines: {
        open: ["「……その大腿骨、いい長さだな。ちょうど並びの三百十二番が空いているんだ」"],
        turn: ["骨並べは戦いの最中に、足元の骨を拾って列に戻した。", "「動くな。測れないだろう」", "「惜しい、あと指一本ぶん長ければ竜の骨と並べてやれたのに」"],
        flee: "「並びが崩れる！」骨並べは慌てて自分の列を直しに走っていった。",
      },
    },

    // 段 5
    e1_herald: {
      name: "使徒の触れ役", tier: 5, hp: 62, dmg: [2, 8, 4], hit: 70, def: 20, agi: 50, will: 85, mres: 30, gold: [50, 140], loot: [["manawater", 0.4], ["elixir", 0.08]], shape: "winged", eye: "#ff5aa0",
      desc: "使徒たちの布告を人間の国々に触れ回る使い魔。布告の中身はたいてい「来週、どこかの町を滅ぼす」。どこかは、その日の気分で決まる。",
      look: { body: "biped", build: "lanky", skin: "#8a3a6a", skin2: "#c86aa0", head: "plain", horns: "ram", eyes: "glow", mouth: "grin", weapon: "tome", wings: "bat", outfit: "robe", cloth: "#3a1a3a", extra: ["float", "plume"], mood: "fierce" },
      fleeAt: 0.25,
      lines: {
        open: ["「控えよ！ 使徒の布告である！ ……えー、『来週は晴れ』。違う、これは洗濯の予定だ」", "「控えよ！ 本日滅ぼす町は……くじで決める。人間、一本引け」"],
        turn: ["触れ役は巻物を読み上げた。「一つ、人間は……人間は……何だったかな」", "「布告の最中に斬りかかるとは、人間は礼儀を知らん！」", "触れ役は巻物を落とし、拾う間だけ戦いを待ってくれと言った。"],
        flee: "「続きは来週！」触れ役は巻物を抱えて、赤い空へ舞い上がった。",
      },
    },
    e1_ashhound: {
      name: "灰喰い犬", tier: 5, hp: 54, dmg: [2, 8, 3], hit: 70, def: 15, agi: 70, will: 90, mres: 15, gold: [0, 20], loot: [["pelt", 0.6], ["fang", 0.6]], shape: "beast", eye: "#ff6a3a",
      desc: "灰の荒野で、魔物の軍勢が踏み潰した後を片付ける犬。こいつらにとって人間は、残飯の一種でしかない。",
      look: { body: "quad", head: "wolf", skin: "#4a4440", skin2: "#8a7a70", eyes: "glow", mouth: "fangs", tail: "spike", pattern: "lava", mood: "fierce" },
      lines: {
        turn: ["灰喰い犬は、あなたより先に、あなたの荷物の干し肉を嗅いでいる。", "遠くで別の群れが吠えた。食べ残しの取り合いが始まるらしい。"],
      },
    },
  });

  // 出現表への追記（locations.js は書き換えない）
  const ADD = {
    plains: ["e1_crowngob", "e1_tollrat"],
    forest: ["e1_crowngob", "e1_bowshroom"],
    frost: ["e1_frostgrave"],
    swamp: ["e1_frogprophet", "e1_melted"],
    ruins: ["e1_sweeper"],
    onigashima: ["e1_lantern"],
    mountains: ["e1_sleepgiant"],
    graveyard: ["e1_bonepicker"],
    wasteland: ["e1_herald", "e1_ashhound"],
  };
  for (const [loc, ids] of Object.entries(ADD)) {
    const L = D.LOCS && D.LOCS[loc];
    if (!L) continue;
    L.pool = L.pool || [];
    ids.forEach((id) => { if (!L.pool.includes(id)) L.pool.push(id); });
  }
})(globalThis.G = globalThis.G || {});
