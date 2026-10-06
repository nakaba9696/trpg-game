// 地域ごとの魔物・獣・賊・亡者（E4）。欄の意味は enemies.js・enemies_2.js と同じ。加えて任意の欄（engine/zzz_e4_foes.js が読む）：
//   rg    出る地域（D.E4.RG の鍵）。その地域の、危険度に合う段（危険度 -1〜危険度）の野と迷宮の出現表（L.e4pool）に、読み込みのあとで入る。
//         W3・W4 の新しい場所も、地域名が合えば自動で入る。also: [場所 id] はそれに加えて必ず入る場所
//   when  出る時（{ night: true } 夜だけ / { day: true } 昼だけ / season: ["冬"] / weather: ["雪", "霧"]）。迷宮の中では見ない
//   pack  [最小, 最大] 群れで出る数（2〜4）
//   acts  特徴のある行動（poison 毒 / sleep 眠り / disarm 武器を落とさせる / steal 盗んで逃げる / pin 仲間を押さえ込む /
//         call 仲間を呼ぶ / fleecall 深手で逃げて仲間を呼ぶ / guard 仲間を庇う / regen 傷がふさがる / enrage 深手で猛る /
//         drain 生気を吸う / corrode 鎧の継ぎ目を緩める / rout 群れが崩れると逃げる）
//   weak  弱点の属性（blade 刃 / fire 炎 / ice 氷 / bolt 雷 / holy 聖水）。当たると 1.5 倍
//   elder 強い個体（「年経た〜」「〜の頭目」）。危険度 2 以上の場所で、まれに（5%・夜 8%）入れ替わって出る。{ id, name, desc, item: [名前, 説明, 値段] }
// 正体・使徒の名前は書かない（docs/lore/voice.md）。レーン E（敵）が管理
(function (G) {
  const D = (G.data = G.data || {});
  const E4 = (D.E4 = D.E4 || {});
  // 地域の鍵 → 場所の region に当てる正規表現（W3・W4 の新しい地域も名前で当てる）
  E4.RG = {
    自由都市: "自由都市", 王国: "王国", 教会領: "教会", 島: "シェルアーク|島々", 帝国: "帝国",
    共和国: "共和国", 境: "人と魔の境|^境", 最前線: "最前線", 使徒領: "使徒領",
  };

  Object.assign(D.ENEMIES, {
    // ================================================================ 自由都市（迷いの森・エル・ナフ遺構）
    e4_mosswisp: {
      name: "苔灯り", tier: 1, hp: 7, dmg: [1, 3, 0], hit: 45, def: 0, agi: 40, will: 999, mres: 10, gold: [0, 6], loot: [["herb", 0.4]], shape: "blob", eye: "#b8ff8a",
      rg: "自由都市", when: { night: true }, acts: ["sleep"], weak: "fire",
      desc: "夜の森を漂う、光る苔の玉。近づいた者に眠りの胞子をかける。眠った者がどうなるかは、苔の厚さを見れば分かる。",
      look: { body: "blob", skin: "#6aa04a", skin2: "#c8f08a", eyes: "dot", mouth: "o", pattern: "spots", extra: ["float", "bubbles"], mood: "silly" },
      lines: { turn: ["苔灯りがふわりと揺れた。甘い匂いがしてまぶたが重くなる。"] },
    },
    e4_satchelrat: {
      name: "鞄ネズミ", tier: 1, hp: 5, dmg: [1, 3, 0], hit: 45, def: 0, agi: 60, will: 25, mres: 0, gold: [1, 6], loot: [["jerky", 0.2]], shape: "small", eye: "#e8c87a",
      rg: "自由都市", pack: [2, 3], acts: ["steal", "rout"],
      desc: "旅人の鞄に潜り込み、中身を一つずつ巣へ運ぶネズミ。群れで来て一番重い物から持っていく。",
      look: { body: "biped", build: "small", size: 0.8, skin: "#8a7a6a", head: "plain", ears: "round", eyes: "dot", mouth: "o", tail: "thin", arms: "stubs", extra: ["nose", "pouch"], mood: "silly" },
      fleeAt: 0.5,
      elder: { id: "e4_satchelrat_x", name: "鞄ネズミの頭目", desc: "盗んだ財布を首から三つ下げた、大きなネズミ。群れはこいつの指図で鞄を選ぶ。", item: ["頭目の財布", "鞄ネズミの頭目が首から下げていた、小さな革の財布。中には、どこかの町の古い通行証が入っている。持ち主の名前はかじられて読めない。", 60] },
      lines: { turn: ["一匹があなたの腰の袋に鼻を突っ込んだ。", "ネズミたちは、あなたの鞄の重さを測るように、じっと見ている。"], flee: "ネズミたちは、ちゅうちゅう鳴きながら散っていった。" },
    },
    e4_thornboar: {
      name: "棘猪", tier: 1, hp: 12, dmg: [1, 6, 0], hit: 50, def: 5, agi: 35, will: 40, mres: 0, gold: [0, 0], loot: [["pelt", 0.4], ["jerky", 0.3]], shape: "beast", eye: "#e8a04a",
      rg: "自由都市", acts: ["enrage"],
      desc: "背中に茨の棘を生やした猪。茨の茂みで寝るうちに、棘が毛に根を張ったらしい。怒ると棘が逆立つ。",
      look: { body: "quad", head: "pig", skin: "#5a4a3a", skin2: "#8a7a5a", eyes: "slit", mouth: "tusks", tail: "thin", pattern: "stripes", extra: ["fur"], mood: "fierce" },
      elder: { id: "e4_thornboar_x", name: "年経た棘猪", desc: "茨が背中で藪になった、大きな猪。猟師の折れた矢が、何本も茨に絡まっている。", item: ["茨の牙", "年経た棘猪の牙。根元に茨の蔓が巻きついていて、乾いても、まだかすかに緑色だ。森の猟師は、これを戸口に吊るして猪除けにする。", 50] },
    },
    e4_relicmole: {
      name: "遺構モグラ", tier: 2, hp: 18, dmg: [1, 6, 1], hit: 55, def: 10, agi: 30, will: 40, mres: 0, gold: [5, 25], loot: [["gem", 0.12]], shape: "beast", eye: "#ffd84a",
      rg: "自由都市", acts: ["steal"], weak: "ice",
      desc: "遺構の床下を掘り進む大モグラ。光る物が好きで、発掘人の道具袋をよく狙う。巣には、古い金貨と新しい財布が並んでいる。",
      look: { body: "quad", head: "plain", skin: "#4a3a3a", skin2: "#8a6a6a", ears: "round", eyes: "dot", eyeN: 2, mouth: "o", arms: "claws", tail: "thin", extra: ["nose"], mood: "silly" },
    },
    e4_lampghost: {
      name: "灯し番の亡霊", tier: 2, hp: 16, dmg: [1, 6, 1], hit: 55, def: 5, agi: 35, will: 999, mres: 20, undead: true, gold: [2, 18], loot: [["manawater", 0.2]], shape: "humanoid", eye: "#ffe08a",
      rg: "自由都市", acts: ["drain"], weak: "holy",
      desc: "遺構の通路で、消えた灯りに火を入れて回る亡霊。火の代わりに人の温もりを使う。",
      look: { body: "biped", build: "lanky", skin: "#a8b0b8", head: "hood", eyes: "glow", mouth: "none", weapon: "staff", outfit: "robe", cloth: "#4a4a5a", extra: ["float", "smoke"], mood: "fierce" },
      lines: { turn: ["亡霊の手があなたの肩に触れた。指先から温かさが抜けていく。", "「……灯りが足りない……」"] },
    },
    e4_rustwatch: {
      name: "錆びた見張り", tier: 2, hp: 22, dmg: [1, 8, 0], hit: 50, def: 20, agi: 15, will: 999, mres: 0, gold: [0, 12], loot: [["relic", 0.04]], shape: "humanoid", eye: "#ff8a4a",
      rg: "自由都市", acts: ["guard"], weak: "bolt",
      desc: "遺構の門を守り続ける鉄の人形。錆びて関節が鳴るが、通る者があれば、まだ槍を下ろす。仲間の人形が打たれると、身を挺して前に出る。",
      look: { body: "biped", build: "stubby", skin: "#8a6a5a", skin2: "#b08a6a", head: "helm", eyes: "goggle", eyeN: 1, mouth: "none", weapon: "spear", pattern: "cracks", extra: ["pauldron"], mood: "fierce" },
      lines: { open: ["ぎし、と首が回った。「……トオル、モノ、ナシ」"] },
    },

    // ================================================================ 王国（白銀の丘陵）
    e4_cropcrow: {
      name: "麦畑の大烏", tier: 1, hp: 6, dmg: [1, 3, 0], hit: 50, def: 0, agi: 60, will: 30, mres: 0, gold: [0, 4], loot: [["jerky", 0.2]], shape: "winged", eye: "#e8e8e8",
      rg: "王国", when: { day: true, season: ["夏", "秋"] }, pack: [2, 3], acts: ["steal", "rout"],
      desc: "実りの季節に丘陵へ降りてくる大烏。案山子を恐れず、旅人の荷を突く。",
      look: { body: "wyrm", skin: "#2a2a30", skin2: "#4a4a5a", eyes: "dot", mouth: "beak", wings: "feather", tail: "fan", mood: "silly" },
      fleeAt: 0.5,
      lines: { turn: ["烏が一羽、あなたの帽子をくわえて飛び上がった。すぐ落とした。"], flee: "烏たちは、あざけるように鳴いて飛び去った。" },
    },
    e4_poacher: {
      name: "密猟者", tier: 1, hp: 10, dmg: [1, 6, 0], hit: 55, def: 5, agi: 45, will: 35, mres: 0, gold: [4, 16], loot: [["pelt", 0.3], ["herb", 0.2]], shape: "humanoid", eye: "#d9d9d9", bribe: 15,
      rg: "王国", acts: ["call"],
      desc: "領主の森で鹿を獲る男。見つかれば首が飛ぶので、見た者の口をふさぎにくる。仲間を口笛で呼ぶ。",
      look: { body: "biped", build: "lanky", skin: "#c89878", head: "human", hair: "#5a4030", eyes: "dot", mouth: "frown", weapon: "bow", outfit: "rags", cloth: "#4a5a3a", extra: ["cap", "stubble", "pouch"] },
      fleeAt: 0.3,
      elder: { id: "e4_poacher_x", name: "密猟者の頭目", desc: "領主の猟番を三人まいたという、白髪まじりの男。弓の弦は鹿の腱で張ってある。", item: ["鹿の腱の弦", "密猟者の頭目が弓に張っていた弦。よく乾いていて指で弾くと低い音がする。領主の森の鹿の腱で作ったものだと、猟番なら見ただけで分かる。", 55] },
      lines: { open: ["「見たな。……見ちまったならしょうがねえ」"], flee: "「覚えてろ、口外したら森で会うぞ」男は藪に消えた。" },
    },
    e4_mudhound: {
      name: "泥浴び犬", tier: 1, hp: 7, dmg: [1, 4, 0], hit: 50, def: 0, agi: 50, will: 30, mres: 0, gold: [0, 0], loot: [["pelt", 0.2]], shape: "beast", eye: "#e8d44d",
      rg: "王国", pack: [2, 3], acts: ["rout"],
      desc: "丘陵の泥沼で転げ回る野良犬の群れ。泥で毛が固まり、刃が滑る。一匹が鳴いて逃げると群れは散る。",
      look: { body: "quad", head: "wolf", skin: "#6a5a4a", skin2: "#8a7a5a", eyes: "slit", mouth: "tongue", tail: "thin", pattern: "spots", mood: "silly" },
      elder: { id: "e4_mudhound_x", name: "泥浴び犬の頭目", desc: "片耳の欠けた、大きな泥まみれの犬。群れはこいつが走った方へ走る。", item: ["泥の首輪", "泥浴び犬の頭目の首にあった、古い革の首輪。泥の下から、どこかの屋敷の紋章が出てくる。昔は誰かの飼い犬だったらしい。", 40] },
    },
    e4_rainslug: {
      name: "雨の大なめくじ", tier: 1, hp: 14, dmg: [1, 3, 0], hit: 40, def: 15, agi: 5, will: 999, mres: 0, gold: [0, 5], loot: [["herb", 0.3]], shape: "blob", eye: "#c8e8ff",
      rg: "王国", when: { weather: ["雨", "霧"] }, acts: ["corrode"], weak: "fire",
      desc: "雨の日にだけ丘へ這い出してくる、牛ほどのなめくじ。粘液は革をふやかし、鎧の継ぎ目を緩める。",
      look: { body: "blob", skin: "#8a8a6a", skin2: "#c8c8a8", eyes: "dot", mouth: "o", extra: ["bubbles", "drool"], mood: "silly" },
    },
    e4_brokenknight: {
      name: "落ちぶれ騎士", tier: 2, hp: 20, dmg: [1, 8, 1], hit: 60, def: 15, agi: 30, will: 50, mres: 0, gold: [8, 30], loot: [["chain", 0.05], ["potion", 0.2]], shape: "humanoid", eye: "#d9d9d9", bribe: 30,
      rg: "王国", also: ["plains"], when: { night: true }, acts: ["disarm"],
      desc: "領地を失い、夜の街道で通行料を取る元騎士。剣の腕だけは本物で、相手の武器を払い落とすのがうまい。",
      look: { body: "biped", build: "normal", skin: "#d8b090", head: "human", hair: "#8a7a6a", eyes: "dot", mouth: "frown", weapon: "sword", outfit: "armor", cloth: "#5a4a3a", pattern: "scars", extra: ["cape", "stubble"] },
      lines: { open: ["「これでも十年前は、王の前で槍を振るったのだ」"], turn: ["「剣を落とすな。騎士の恥だぞ」", "騎士は、刃こぼれした剣を大事そうに構え直した。"] },
    },
    e4_lordhound: {
      name: "領主の猟犬", tier: 1, hp: 8, dmg: [1, 4, 0], hit: 55, def: 5, agi: 60, will: 45, mres: 0, gold: [0, 0], loot: [["pelt", 0.4]], shape: "beast", eye: "#f0c040",
      rg: "王国", pack: [2, 2], acts: ["pin"],
      desc: "領主の狩りから逃げ出した猟犬。獲物の足を押さえる癖が抜けず、二頭で一人を囲む。",
      look: { body: "quad", head: "wolf", skin: "#8a6a4a", skin2: "#e0c8a8", eyes: "slit", mouth: "fangs", tail: "thin", extra: ["scarf"], mood: "fierce" },
    },

    e4_cinderhound: {
      name: "火口の犬", tier: 3, hp: 26, dmg: [1, 8, 2], hit: 60, def: 10, agi: 55, will: 60, mres: 15, gold: [0, 20], loot: [["fang", 0.4], ["gem", 0.06]], shape: "beast", eye: "#ffb03a",
      rg: "王国", acts: ["enrage"], weak: "ice",
      desc: "王国の南の火山の斜面に棲む、炭のような毛の犬。走った跡の草が焦げる。冷やされると毛の火が消えて縮こまる。",
      look: { body: "quad", head: "wolf", skin: "#2a2220", skin2: "#ff8a3a", eyes: "glow", mouth: "fangs", tail: "spike", pattern: "lava", extra: ["smoke"], mood: "fierce" },
    },

    // ================================================================ 教会領（聖都の地下墓地と、その周り）
    e4_penitent: {
      name: "鞭打ちの巡礼", tier: 2, hp: 22, dmg: [1, 6, 1], hit: 55, def: 5, agi: 30, will: 70, mres: 10, gold: [2, 15], loot: [["holywater", 0.15]], shape: "humanoid", eye: "#ff8a6a",
      rg: "教会領", acts: ["regen"],
      desc: "罪を清めるために、自分の背を鞭で打ちながら歩く巡礼。打たれるほど信心が深まると信じていて、傷がふさがるのも早い。",
      look: { body: "biped", build: "lanky", skin: "#d8a888", head: "hood", eyes: "dot", mouth: "frown", weapon: "club", outfit: "robe", cloth: "#6a5a4a", pattern: "scars", extra: ["blood"] },
      lines: { turn: ["「痛みは祈り。祈りは痛み」巡礼は自分の背を一度打った。", "巡礼の傷が見る間にふさがっていく。"] },
    },
    e4_bellbat: {
      name: "鐘楼の蝙蝠", tier: 2, hp: 9, dmg: [1, 4, 1], hit: 55, def: 0, agi: 70, will: 999, mres: 0, gold: [0, 4], loot: [], shape: "winged", eye: "#ff5a5a",
      rg: "教会領", pack: [2, 4], acts: ["sleep", "rout"],
      desc: "鐘楼に棲む蝙蝠の群れ。羽ばたきが鐘の余韻に似ていて、聞くうちに頭がぼんやりしてくる。",
      look: { body: "wyrm", skin: "#3a2a3a", skin2: "#6a4a5a", ears: "pointy", eyes: "glow", mouth: "fangs", wings: "bat", tail: "thin", mood: "fierce" },
    },
    e4_relicthief: {
      name: "聖遺物盗り", tier: 3, hp: 24, dmg: [1, 8, 2], hit: 65, def: 15, agi: 70, will: 45, mres: 5, gold: [15, 50], loot: [["relic", 0.08], ["smoke", 0.3]], shape: "humanoid", eye: "#d9d9d9", bribe: 50,
      rg: "教会領", acts: ["steal"],
      desc: "地下墓地の聖人の骨を盗んで売る男。信者の財布も骨と同じくらい好きだ。",
      look: { body: "biped", build: "lanky", skin: "#c8a080", head: "human", hair: "#2a2a2a", eyes: "slit", mouth: "smirk", weapon: "dagger", outfit: "garb", cloth: "#2a2a3a", extra: ["scarf", "pouch"] },
      fleeAt: 0.35,
      lines: { open: ["「おっとお参りかい。こっちは仕事中でね」"], flee: "「聖人さまは返さねえよ」男は骨の袋を抱えて闇へ消えた。" },
    },
    e4_waxsaint: {
      name: "蝋の聖人像", tier: 3, hp: 34, dmg: [2, 6, 0], hit: 55, def: 20, agi: 10, will: 999, mres: 20, gold: [0, 20], loot: [["gem", 0.1]], shape: "humanoid", eye: "#ffe8a0",
      rg: "教会領", acts: ["guard"], weak: "fire",
      desc: "祈りの蝋燭が千年溶け重なってできた聖人の像。祈りを守るために歩き出し、ほかの者が打たれれば身を挺してかばう。炎に弱い。",
      look: { body: "biped", build: "stubby", skin: "#f0e0c0", skin2: "#fff4d8", head: "plain", eyes: "closed", mouth: "flat", arms: "hands", outfit: "robe", cloth: "#e8d8b0", pattern: "cracks", extra: ["runes", "smoke"], mood: "calm" },
    },
    e4_ossuaryhound: {
      name: "骨堂の番犬", tier: 3, hp: 18, dmg: [1, 6, 1], hit: 55, def: 10, agi: 55, will: 999, mres: 10, undead: true, gold: [0, 10], loot: [["fang", 0.4]], shape: "beast", eye: "#7dffb0",
      rg: "教会領", pack: [2, 2], acts: ["rout"], weak: "holy",
      desc: "墓所に埋められた番犬の骨が、主を待って二頭ずつ歩いている。片割れが崩れると、残った一頭は主を探しに奥へ去る。",
      look: { body: "quad", head: "wolf", bones: true, skin: "#2a2a24", skin2: "#e0dccb", eyes: "hollow", mouth: "jaw", tail: "thin", mood: "fierce" },
    },
    e4_candlewidow: {
      name: "蝋燭売りの寡婦", tier: 3, hp: 28, dmg: [1, 8, 1], hit: 60, def: 5, agi: 40, will: 999, mres: 25, undead: true, magic: true, gold: [5, 30], loot: [["holywater", 0.2]], shape: "humanoid", eye: "#ffb86a",
      rg: "教会領", when: { night: true }, acts: ["drain"], weak: "holy",
      desc: "夜の参道で蝋燭を売る女。買った者の蝋燭は、その者の命の分だけ長く燃える。売れ残ると自分で灯しにくる。",
      look: { body: "biped", build: "lanky", skin: "#c8c0b8", head: "hood", eyes: "hollow", mouth: "smile", weapon: "staff", outfit: "robe", cloth: "#2a2224", extra: ["float", "longhair"], mood: "fierce" },
      lines: { open: ["「蝋燭はいかが。あなたの分はまだ長いわね」"], turn: ["寡婦の蝋燭の火があなたの方へ傾いた。", "「短くなったわね。あと少し」"] },
    },

    // ================================================================ 島（島の都シェルアークと南西の島々）
    e4_tidecrab: {
      name: "磯の大蟹", tier: 2, hp: 20, dmg: [1, 6, 1], hit: 55, def: 25, agi: 25, will: 999, mres: 0, gold: [0, 10], loot: [["gem", 0.06]], shape: "beast", eye: "#ffb03a",
      rg: "島", acts: ["disarm"], weak: "bolt",
      desc: "岩の島の磯に棲む、荷車ほどの蟹。鋏で武器を挟んでひねって取り上げる。甲羅は硬いが雷が通る。",
      look: { body: "bug", skin: "#c8503a", skin2: "#f0a080", eyes: "googly", eyeN: 2, mouth: "o", pattern: "spots", mood: "silly" },
      elder: { id: "e4_tidecrab_x", name: "年経た大蟹", desc: "甲羅に藤壺と難破船の板が貼りついた、家ほどの蟹。鋏の傷は銛の跡だ。", item: ["藤壺の甲羅片", "年経た大蟹の甲羅の欠片。藤壺がびっしり貼りつき、潮の匂いが抜けない。島の漁師は、これを舟の舳先に打ちつけて、嵐除けにする。", 70] },
    },
    e4_reedimp: {
      name: "葦の小鬼", tier: 2, hp: 12, dmg: [1, 4, 1], hit: 55, def: 5, agi: 65, will: 30, mres: 10, gold: [3, 15], loot: [["smoke", 0.15]], shape: "small", eye: "#a8ff6a",
      rg: "島", pack: [2, 3], acts: ["steal", "rout"],
      desc: "島の川辺の葦の中に棲む、皿のような頭の小鬼。旅人の弁当を盗むのが楽しみで、仲間が逃げると一斉に逃げる。",
      look: { body: "biped", build: "small", skin: "#5a9a6a", skin2: "#a8d8a0", head: "plain", ears: "pointy", eyes: "googly", mouth: "beak", arms: "stubs", outfit: "none", pattern: "spots", extra: ["blush", "cap"], mood: "silly" },
      fleeAt: 0.4,
      lines: { turn: ["小鬼たちは、あなたの握り飯の包みを指さして、ひそひそ相談している。"], flee: "小鬼たちは、ぽちゃんと音を立てて川に飛び込んだ。" },
    },
    e4_seafog: {
      name: "沖の黒坊主", tier: 3, hp: 34, dmg: [2, 6, 1], hit: 55, def: 10, agi: 20, will: 999, mres: 20, gold: [0, 20], loot: [["manawater", 0.25]], shape: "giant", eye: "#e8f0ff",
      rg: "島", when: { weather: ["霧", "雨"] }, acts: ["sleep"], weak: "fire",
      desc: "霧の日に浜へ上がってくる、黒くて大きな坊主頭。何もしゃべらず、ただ立っている。見上げていると眠くなる。",
      look: { body: "biped", build: "giant", skin: "#2a2a34", skin2: "#4a4a5a", head: "plain", eyes: "glow", eyeN: 2, mouth: "none", arms: "hands", extra: ["smoke", "float"], mood: "calm" },
    },
    e4_drumbadger: {
      name: "腹鼓の狸", tier: 2, hp: 16, dmg: [1, 4, 1], hit: 50, def: 5, agi: 45, will: 35, mres: 15, gold: [5, 20], loot: [["ale", 0.3]], shape: "beast", eye: "#ffd84a",
      rg: "島", acts: ["sleep"],
      desc: "月夜に腹を叩いて鳴らす、太った狸。その音を聞くとどんな夜でも眠たくなる。起きると財布が軽い。",
      look: { body: "quad", head: "plain", skin: "#7a5a3a", skin2: "#d8c0a0", ears: "round", eyes: "dot", mouth: "grin", tail: "thin", pattern: "stripes", extra: ["blush", "gourd"], mood: "silly" },
      fleeAt: 0.3,
      lines: { turn: ["ぽん、ぽこ、ぽん。腹鼓の音がのどかに響いた。", "狸は腹を叩きすぎて自分で痛がっている。"], flee: "狸は、ぽんと一つ鳴らして、煙のように消えた。" },
    },
    e4_islepirate: {
      name: "島荒らしの海賊", tier: 3, hp: 24, dmg: [1, 8, 2], hit: 60, def: 10, agi: 50, will: 45, mres: 0, gold: [15, 45], loot: [["ale", 0.3], ["gem", 0.08]], shape: "humanoid", eye: "#d9d9d9", bribe: 45,
      rg: "島", pack: [2, 2], acts: ["call"],
      desc: "島々の入り江に船を隠す海賊。一人倒すと指笛で次を呼ぶ。",
      look: { body: "biped", build: "normal", skin: "#b88058", head: "human", hair: "#2a1a10", eyes: "dot", mouth: "grin", weapon: "sword", outfit: "rags", cloth: "#6a2a2a", extra: ["bandana", "eyepatch", "stubble"] },
      elder: { id: "e4_islepirate_x", name: "海賊の頭目", desc: "三つの島から賞金をかけられた、片腕の女頭目。義手の鉤に敵の帆の切れ端を巻いている。", item: ["頭目の鉤爪", "海賊の頭目の義手の先についていた鉄の鉤。よく研がれていて、柄には三つの島の賞金の額が刻んである。どれも桁が一つずつ違う。", 90] },
      lines: { open: ["「お宝の匂いがするねえ。陸の人間は懐に隠すからいけねえ」"] },
    },
    e4_shellwitch: {
      name: "海女の亡霊", tier: 3, hp: 26, dmg: [1, 8, 1], hit: 60, def: 5, agi: 55, will: 999, mres: 20, undead: true, gold: [5, 25], loot: [["gem", 0.12]], shape: "humanoid", eye: "#7ad8ff",
      rg: "島", when: { night: true }, acts: ["drain"], weak: "holy",
      desc: "嵐の夜に戻らなかった海女。今も夜の磯で、拾えなかった真珠を探している。人の手を真珠と間違えてつかむ。",
      look: { body: "biped", build: "lanky", skin: "#a8c8d0", head: "human", hair: "#1a2a3a", eyes: "hollow", mouth: "frown", arms: "forward", outfit: "garb", cloth: "#e8e8e0", extra: ["longhair", "float"], mood: "fierce" },
      lines: { turn: ["「……あと一つ……あと一つで、娘の嫁入り道具が……」"] },
    },

    // ================================================================ 帝国（凍てつく街道・懺悔の谷・影の谷・酸の谷）
    e4_snowwolf: {
      name: "雪狼", tier: 2, hp: 12, dmg: [1, 6, 0], hit: 55, def: 5, agi: 65, will: 50, mres: 0, gold: [0, 0], loot: [["pelt", 0.5]], shape: "beast", eye: "#bfe8ff",
      rg: "帝国", when: { season: ["冬"], weather: ["雪"] }, pack: [2, 3], acts: ["call"],
      desc: "雪の日にだけ街道へ降りてくる白い狼。遠吠えで群れを集める。雪がやむと足跡ごと消える。",
      look: { body: "quad", head: "wolf", skin: "#d8e0e8", skin2: "#ffffff", eyes: "glow", mouth: "fangs", tail: "thin", extra: ["fur"], mood: "fierce" },
      elder: { id: "e4_snowwolf_x", name: "雪狼の頭目", desc: "銀色の毛に古い矢傷が何本も走る、大きな雌の雪狼。群れはこの遠吠えで動く。", item: ["銀の狼皮", "雪狼の頭目の毛皮。銀色で雪の光を吸ったように淡く光る。帝国の将校が外套の襟に欲しがるが、持っている者は少ない。", 100] },
    },
    e4_iciclewraith: {
      name: "氷柱の霊", tier: 3, hp: 22, dmg: [1, 8, 1], hit: 55, def: 10, agi: 50, will: 999, mres: 10, undead: true, gold: [0, 20], loot: [["manawater", 0.2]], shape: "winged", eye: "#bfe8ff",
      rg: "帝国", when: { season: ["冬", "秋"] }, acts: ["drain"], weak: "fire",
      desc: "軒先の氷柱に宿った、凍え死んだ者の気配。触れた者の温もりを吸って、自分の氷を太らせる。",
      look: { body: "blob", skin: "#a8d0e8", skin2: "#e8f8ff", eyes: "hollow", mouth: "o", pattern: "cracks", extra: ["float", "smoke"], mood: "fierce" },
    },
    e4_pressgang: {
      name: "徴兵隊", tier: 2, hp: 16, dmg: [1, 6, 1], hit: 55, def: 15, agi: 35, will: 50, mres: 0, gold: [8, 25], loot: [["potion", 0.15]], shape: "humanoid", eye: "#d9d9d9", bribe: 25,
      rg: "帝国", pack: [2, 2], acts: ["guard"],
      desc: "前線の兵を補うために、街道で旅人を捕まえる帝国の兵。逆らえば殴り、払えば見逃す。互いをかばう訓練だけは受けている。",
      look: { body: "biped", build: "normal", skin: "#d8b090", head: "human", hair: "#4a3a2a", eyes: "dot", mouth: "frown", weapon: "spear", outfit: "armor", cloth: "#3a3a4a", extra: ["helmet"] },
      lines: { open: ["「そこの者、帝国の名において兵役を命ずる。拒めば……分かるな」"] },
    },
    e4_minerghost: {
      name: "坑夫の亡者", tier: 3, hp: 26, dmg: [1, 8, 1], hit: 55, def: 10, agi: 25, will: 999, mres: 10, undead: true, gold: [5, 30], loot: [["gem", 0.12]], shape: "humanoid", eye: "#ffd84a",
      rg: "帝国", acts: ["disarm"], weak: "holy",
      desc: "落盤で埋まった坑道の坑夫。つるはしで、行く手の物を何でも叩き落とす。腰の袋にはまだ鉱石が入っている。",
      look: { body: "biped", build: "stubby", skin: "#8a8a7a", head: "human", hair: "#3a3a3a", eyes: "hollow", mouth: "jaw", weapon: "axe", outfit: "rags", cloth: "#4a4038", pattern: "ribs", extra: ["cap", "pouch"], mood: "fierce" },
    },
    e4_frostbear: {
      name: "霜熊", tier: 3, hp: 30, dmg: [2, 6, 0], hit: 50, def: 10, agi: 30, will: 60, mres: 5, gold: [0, 0], loot: [["pelt", 0.6], ["fang", 0.3]], shape: "beast", eye: "#e8f0ff",
      rg: "帝国", acts: ["enrage"], weak: "fire",
      desc: "毛に霜をまとった大熊。冬眠し損ねた年は気が立っていて、深手を負うと手がつけられなくなる。火を見ると霜が溶けてひるむ。",
      look: { body: "quad", head: "plain", skin: "#c8d0d8", skin2: "#f0f4f8", ears: "round", eyes: "slit", mouth: "fangs", arms: "claws", tail: "none", extra: ["fur"], mood: "fierce" },
      elder: { id: "e4_frostbear_x", name: "年経た霜熊", desc: "背の毛が氷の鎧になった、小屋ほどの熊。猟師の村ではこの熊の名で子どもを叱る。", item: ["氷の熊爪", "年経た霜熊の爪。冷たくて握っていると手がしびれる。帝国の北の村では婚礼の贈り物にする。熊より強い婿だという印だ。", 110] },
    },
    e4_warcrow: {
      name: "戦場鴉", tier: 2, hp: 8, dmg: [1, 4, 1], hit: 55, def: 0, agi: 70, will: 40, mres: 0, gold: [0, 6], loot: [], shape: "winged", eye: "#ff5a5a",
      rg: "帝国", pack: [2, 4], acts: ["pin", "rout"],
      desc: "帝国の戦場を渡り歩く鴉の群れ。弱った者を見分けて群れで取り囲む。",
      look: { body: "wyrm", skin: "#1a1a22", skin2: "#3a3a4a", eyes: "glow", mouth: "beak", wings: "feather", tail: "fan", mood: "fierce" },
    },

    // ================================================================ 共和国（毒沼の湿地・腐れ庭園）
    e4_bogleech: {
      name: "大蛭", tier: 2, hp: 18, dmg: [1, 4, 2], hit: 55, def: 5, agi: 20, will: 999, mres: 0, gold: [0, 5], loot: [["manawater", 0.1]], shape: "blob", eye: "#ff4d4d",
      rg: "共和国", acts: ["drain"], weak: "fire",
      desc: "人の腕ほどもある蛭。吸った血の分だけ太り、太った分だけ動かなくなる。",
      look: { body: "blob", skin: "#3a3a2a", skin2: "#8a6a4a", eyes: "dot", eyeN: 1, mouth: "fangs", pattern: "stripes", extra: ["drool"], mood: "fierce" },
    },
    e4_bogwitch: {
      name: "沼の魔女見習い", tier: 2, hp: 16, dmg: [1, 6, 1], hit: 55, def: 5, agi: 40, will: 45, mres: 30, magic: true, gold: [5, 25], loot: [["manawater", 0.3], ["herb", 0.3]], shape: "humanoid", eye: "#c77dff",
      rg: "共和国", acts: ["sleep"],
      desc: "学院を追われ、沼の小屋で一人で術を学ぶ娘。眠りの術だけは上手い。精霊と契約していないので、使うたびに何かを払っている。",
      look: { body: "biped", build: "small", skin: "#e0c0a8", head: "hood", eyes: "dot", mouth: "smirk", weapon: "staff", outfit: "robe", cloth: "#3a4a2a", extra: ["runes", "pouch"] },
      fleeAt: 0.4,
      lines: { open: ["「ちょうどいい。新しい術を試したかったの」"], turn: ["「おかしいな、本だとここで眠るはずなのに」"], flee: "「次はちゃんと予習してくる！」娘は箒で……走って逃げた。" },
    },
    e4_brokenspirit: {
      name: "契約を破られた精霊", tier: 2, hp: 14, dmg: [1, 6, 2], hit: 60, def: 0, agi: 60, will: 999, mres: 40, magic: true, gold: [0, 15], loot: [["manawater", 0.4]], shape: "winged", eye: "#8affd8",
      rg: "共和国", when: { night: true }, acts: ["drain"], weak: "blade",
      desc: "共和国の術士に契約を破られた小さな精霊。術は効かないが刃にはもろい。人を見ると借りを取り立てにくる。",
      look: { body: "biped", build: "small", size: 0.8, skin: "#8ad8c8", skin2: "#d0fff0", head: "plain", ears: "pointy", eyes: "glow", mouth: "frown", wings: "moth", outfit: "none", extra: ["float", "runes"], mood: "fierce" },
      lines: { turn: ["「返せ。借りたものは返せ」"] },
    },
    e4_mudcroc: {
      name: "泥鰐", tier: 2, hp: 24, dmg: [1, 8, 1], hit: 55, def: 15, agi: 25, will: 60, mres: 0, gold: [0, 10], loot: [["pelt", 0.3], ["fang", 0.4]], shape: "beast", eye: "#e8d44d",
      rg: "共和国", acts: ["disarm"],
      desc: "沼の泥に沈んで待つ鰐。噛みついた物を離さず、剣ごと沼へ引きずり込もうとする。",
      look: { body: "wyrm", skin: "#4a5a3a", skin2: "#8a9a6a", eyes: "slit", mouth: "fangs", wings: "none", tail: "spike", pattern: "spots", mood: "fierce" },
      elder: { id: "e4_mudcroc_x", name: "年経た泥鰐", desc: "背に苔と若木が生えた、舟ほどの鰐。沼の漁師は、これを島だと思って上陸したことがある。", item: ["苔むした鰐の歯", "年経た泥鰐の歯。根元に苔が生えたまま乾いている。沼の村では、これを煎じて飲むと歯が丈夫になると言うが、試した者の歯は、だいたい抜けている。", 70] },
    },
    e4_poisonfrog: {
      name: "毒蛙", tier: 1, hp: 6, dmg: [1, 3, 0], hit: 50, def: 0, agi: 50, will: 999, mres: 0, gold: [0, 3], loot: [["herb", 0.2]], shape: "blob", eye: "#ffe04a",
      rg: "共和国", pack: [2, 4], acts: ["poison"],
      desc: "鮮やかな色の小さな蛙。群れで跳ねてきて皮の毒をなすりつける。色が派手なほど毒が強い。",
      look: { body: "blob", size: 0.7, skin: "#e05a2a", skin2: "#ffd84a", eyes: "googly", mouth: "grin", pattern: "spots", mood: "silly" },
    },
    e4_dustmoth: {
      name: "鱗粉蛾", tier: 1, hp: 8, dmg: [1, 3, 0], hit: 45, def: 0, agi: 55, will: 999, mres: 0, gold: [0, 4], loot: [["silk", 0.3]], shape: "winged", eye: "#ffd8a0",
      rg: "共和国", when: { night: true }, acts: ["sleep"], weak: "fire",
      desc: "灯りに寄ってくる、皿ほどの蛾。羽の鱗粉を吸うとひどく眠くなる。",
      look: { body: "bug", skin: "#a89878", skin2: "#e8d8b8", eyes: "googly", eyeN: 2, mouth: "none", wings: "moth", pattern: "spots", extra: ["float"], mood: "silly" },
    },

    // ================================================================ 境（断界山脈・竜の墓場）
    e4_rockeater: {
      name: "岩喰い鳥", tier: 4, hp: 42, dmg: [2, 6, 2], hit: 60, def: 20, agi: 60, will: 70, mres: 10, gold: [0, 20], loot: [["wyvernscale", 0.3], ["gem", 0.15]], shape: "winged", eye: "#ffb33a",
      rg: "境", acts: ["disarm"], weak: "bolt",
      desc: "山の岩を砕いて食べる大きな鳥。嘴で金物をつまみ上げ、谷へ放る癖がある。",
      look: { body: "wyrm", skin: "#6a5a4a", skin2: "#a89070", horns: "nubs", eyes: "slit", mouth: "beak", wings: "feather", tail: "fan", pattern: "cracks", mood: "fierce" },
      elder: { id: "e4_rockeater_x", name: "年経た岩喰い鳥", desc: "翼を広げると谷が暗くなる、灰色の大鳥。嘴は砦の石壁にも穴を開ける。", item: ["石の砂嚢", "年経た岩喰い鳥の腹にあった、こぶし大の石。表面がつるつるに磨かれていて、どんな宝石より滑らかだ。山の民はこれを婚約の印に贈る。", 140] },
    },
    e4_hillorc: {
      name: "境の山オーク", tier: 3, hp: 24, dmg: [1, 8, 2], hit: 55, def: 10, agi: 30, will: 50, mres: 0, gold: [8, 30], loot: [["fang", 0.4]], shape: "humanoid", eye: "#e05a3a",
      rg: "境", pack: [2, 3], acts: ["call"],
      desc: "山の洞穴に棲みつき、砦への荷を襲うオーク。角笛で仲間を呼ぶ。",
      look: { body: "biped", build: "brute", skin: "#7a8a6a", skin2: "#a8b08a", head: "pig", eyes: "glow", mouth: "tusks", weapon: "axe", outfit: "loin", cloth: "#4a3a2a", extra: ["fur", "pauldron"], mood: "fierce" },
      elder: { id: "e4_hillorc_x", name: "山オークの頭目", desc: "人の騎士の兜を三つ重ねてかぶった大オーク。角笛は人の大腿骨でできている。", item: ["骨の角笛", "山オークの頭目が首から下げていた角笛。人の骨を削って作ってあり、吹くと低く濁った音がする。砦の兵はこの音を聞くと門を閉める。", 120] },
    },
    e4_gravejackal: {
      name: "墓荒らし山犬", tier: 3, hp: 20, dmg: [1, 8, 1], hit: 60, def: 5, agi: 65, will: 45, mres: 0, gold: [0, 15], loot: [["pelt", 0.4], ["relic", 0.03]], shape: "beast", eye: "#ffd84a",
      rg: "境", pack: [2, 3], acts: ["rout", "pin"],
      desc: "竜の墓場で骨をあさる山犬の群れ。生きた獲物は囲んで押さえる。一匹が倒れると残りはすぐに尻尾を巻く。",
      look: { body: "quad", head: "wolf", skin: "#8a6a4a", skin2: "#c8a878", ears: "pointy", eyes: "slit", mouth: "fangs", tail: "thin", pattern: "spots", mood: "fierce" },
    },
    e4_oldlegion: {
      name: "古戦場の亡兵", tier: 4, hp: 44, dmg: [2, 6, 2], hit: 60, def: 20, agi: 25, will: 999, mres: 10, undead: true, gold: [10, 40], loot: [["chain", 0.06], ["relic", 0.05]], shape: "swarm", eye: "#7dffb0",
      rg: "境", acts: ["guard"], weak: "holy",
      desc: "昔の戦で山に倒れた兵たちが、隊列を組んだまま歩いている。誰かが打たれると隣の者が盾を出す。",
      look: { body: "swarm", count: 4, build: "normal", skin: "#8a8a78", head: "skull", eyes: "hollow", mouth: "jaw", weapon: "spear", outfit: "armor", cloth: "#3a3a2a", pattern: "ribs", extra: ["helmet"], mood: "fierce" },
    },
    e4_stonetroll: {
      name: "石肌の巨人", tier: 4, hp: 54, dmg: [2, 8, 1], hit: 50, def: 25, agi: 15, will: 999, mres: 10, gold: [10, 40], loot: [["gem", 0.2]], shape: "giant", eye: "#ffcf7a",
      rg: "境", acts: ["regen"], weak: "bolt",
      desc: "岩のような肌の巨人。割れた肌は見る間に石でふさがる。雷に打たれると石の継ぎ目からほどける。",
      look: { body: "biped", build: "giant", skin: "#8a8a80", skin2: "#b0b0a8", head: "ogre", eyes: "dot", mouth: "tusks", weapon: "club", outfit: "loin", cloth: "#5a4a3a", pattern: "cracks", mood: "fierce" },
      elder: { id: "e4_stonetroll_x", name: "年経た石肌の巨人", desc: "肩に小さな木が生え、鳥が巣をかけている巨人。眠っている間に、山の一部だと思われていた。", item: ["巨人の心石", "年経た石肌の巨人の胸の奥にあった、温かい丸い石。耳を当てると遅い鼓動のような音がする。石工たちはこれを礎石の下に埋めたがる。", 160] },
    },
    e4_cliffharpy: {
      name: "崖の鳥女", tier: 3, hp: 22, dmg: [1, 8, 2], hit: 65, def: 5, agi: 70, will: 40, mres: 10, gold: [5, 25], loot: [["gem", 0.1]], shape: "winged", eye: "#ff8a4a",
      rg: "境", acts: ["steal"],
      desc: "崖の上に巣をかける、腕が翼の女。光り物を盗んで巣を飾る。歌は下手だ。",
      look: { body: "biped", build: "lanky", skin: "#d8b090", head: "human", hair: "#6a3a2a", eyes: "slit", mouth: "grin", arms: "claws", wings: "feather", outfit: "rags", cloth: "#6a5a3a", extra: ["longhair"], mood: "fierce" },
      fleeAt: 0.3,
      lines: { turn: ["鳥女はあなたの耳飾りばかり見ている。", "「キラキラ、ちょうだい」"], flee: "鳥女は、甲高く笑いながら崖の上へ舞い上がった。" },
    },

    // ================================================================ 最前線（黒鉄の砦の外。W4 の場所が来るまでは断界山脈にも）
    e4_ladderGob: {
      name: "梯子担ぎのゴブリン隊", tier: 4, hp: 20, dmg: [1, 8, 1], hit: 55, def: 10, agi: 45, will: 40, mres: 0, gold: [8, 25], loot: [["jerky", 0.3]], shape: "small", eye: "#e8d44d",
      rg: "最前線", also: ["mountains"], pack: [2, 3], acts: ["call", "rout"],
      desc: "攻め梯子を担いで砦へ押し寄せるゴブリンの隊。一人が叫ぶと、梯子の後ろから次が湧いてくる。",
      look: { body: "biped", build: "small", skin: "#6f8a3a", head: "plain", ears: "pointy", eyes: "slit", mouth: "grin", weapon: "spear", outfit: "armor", cloth: "#5a4a3a", extra: ["helmet", "nose"], mood: "fierce" },
      elder: { id: "e4_ladderGob_x", name: "ゴブリン隊の頭目", desc: "人の将校の外套を引きずる、背の高いゴブリン。号令だけは人の将校より上手い。", item: ["盗まれた指揮杖", "ゴブリン隊の頭目が振っていた指揮杖。もとは砦の将校の物で、握りに帝国の紋が彫ってある。返しに行けば、礼の一つも言われるかもしれない。", 130] },
    },
    e4_ashogre: {
      name: "灰被りのオーガ", tier: 4, hp: 50, dmg: [2, 8, 2], hit: 55, def: 10, agi: 20, will: 60, mres: 0, gold: [10, 40], loot: [["fang", 0.5]], shape: "giant", eye: "#ff6a3a",
      rg: "最前線", also: ["mountains"], acts: ["enrage"],
      desc: "焼けた村の灰を浴びて、真っ白になったオーガ。深手を負うと灰を撒き散らして暴れる。",
      look: { body: "biped", build: "giant", skin: "#a8a8a0", skin2: "#d8d8d0", head: "ogre", eyes: "glow", mouth: "tusks", weapon: "club", outfit: "loin", cloth: "#4a4a44", extra: ["smoke", "wildhair"], mood: "fierce" },
    },
    e4_scoutbird: {
      name: "魔物の斥候鳥", tier: 4, hp: 30, dmg: [2, 6, 1], hit: 65, def: 10, agi: 80, will: 60, mres: 10, gold: [0, 15], loot: [["wyvernscale", 0.2]], shape: "winged", eye: "#ff4d4d",
      rg: "最前線", also: ["mountains"], acts: ["fleecall"], call: "e4_ashogre",
      desc: "使徒領の空から人の陣を見張る鳥。深手を負うと逃げ、もっと大きなものを連れて戻ってくる。",
      look: { body: "wyrm", skin: "#4a2a2a", skin2: "#8a4a3a", eyes: "glow", eyeN: 3, mouth: "beak", wings: "feather", tail: "fan", mood: "fierce" },
    },
    e4_deadsentry: {
      name: "砦の亡霊兵", tier: 4, hp: 40, dmg: [2, 6, 2], hit: 60, def: 20, agi: 30, will: 999, mres: 15, undead: true, gold: [5, 30], loot: [["chain", 0.05], ["potion", 0.3]], shape: "humanoid", eye: "#7dffb0",
      rg: "最前線", also: ["mountains"], when: { night: true }, acts: ["guard"], weak: "holy",
      desc: "砦の外で死んだ兵が、交代の鐘を待って夜の見張りを続けている。味方を守る癖が死んでも抜けない。",
      look: { body: "biped", build: "normal", skin: "#8a9a8a", head: "helm", eyes: "hollow", mouth: "none", weapon: "spear", shield: true, outfit: "armor", cloth: "#3a4a3a", pattern: "ribs", extra: ["cape", "float"], mood: "fierce" },
      lines: { open: ["「……交代はまだか……」"], turn: ["亡霊兵は遠くの鐘に耳を澄ませている。"] },
    },
    e4_warbeast: {
      name: "鎖付きの魔獣", tier: 4, hp: 36, dmg: [2, 6, 2], hit: 60, def: 15, agi: 55, will: 999, mres: 5, gold: [0, 10], loot: [["fang", 0.5], ["pelt", 0.4]], shape: "beast", eye: "#ff3a3a",
      rg: "最前線", also: ["mountains"], pack: [2, 2], acts: ["pin"],
      desc: "首に千切れた鎖を引きずる魔獣。誰に飼われていたのかは分からないが、二頭で獲物を挟む動きを教え込まれている。",
      look: { body: "quad", head: "lion", skin: "#4a3a3a", skin2: "#7a5a4a", eyes: "glow", mouth: "fangs", tail: "spike", pattern: "scars", extra: ["scarf"], mood: "fierce" },
    },

    e4_firearrowimp: {
      name: "火矢の小鬼", tier: 3, hp: 16, dmg: [1, 6, 2], hit: 60, def: 5, agi: 60, will: 40, mres: 5, gold: [5, 20], loot: [["smoke", 0.2]], shape: "small", eye: "#ff8a3a",
      rg: "最前線", pack: [2, 2], acts: ["rout"], weak: "ice",
      desc: "見張り塔に火矢を射かける小鬼の二人組。片方が倒れると、残った方は弓を捨てて逃げる。矢の火は冷やせばすぐ消える。",
      look: { body: "biped", build: "small", skin: "#8a6a3a", head: "plain", ears: "pointy", eyes: "slit", mouth: "grin", weapon: "bow", outfit: "rags", cloth: "#5a3a2a", extra: ["smoke", "nose"], mood: "fierce" },
      lines: { turn: ["小鬼の火矢が、あなたの足元の草を焦がした。"] },
    },
    e4_runawaywatch: {
      name: "持ち場を捨てた見張り", tier: 3, hp: 24, dmg: [1, 8, 1], hit: 60, def: 15, agi: 45, will: 40, mres: 0, gold: [10, 35], loot: [["potion", 0.3], ["jerky", 0.3]], shape: "humanoid", eye: "#d9d9d9", bribe: 35,
      rg: "最前線", acts: ["fleecall"], call: "deserter",
      desc: "鐘を鳴らす役を放り出して逃げた見張り。見つかれば首が飛ぶので、見た者を口封じにくる。深手を負うと同じ逃げ仲間を呼びに走る。",
      look: { body: "biped", build: "normal", skin: "#d0a888", head: "human", hair: "#5a4a3a", eyes: "dot", mouth: "frown", weapon: "spear", outfit: "armor", cloth: "#3a3a3a", extra: ["helmet", "stubble"] },
      lines: { open: ["「鐘なんか鳴らしたって、誰も来やしねえんだよ」"], flee: "見張りは塔の陰へ走っていった。仲間を呼ぶ声がする。" },
    },

    // ================================================================ 使徒領（灰の荒野・大厨房・黒鎧の使徒の居城）
    e4_ashwyrm: {
      name: "灰の地竜", tier: 5, hp: 62, dmg: [2, 8, 3], hit: 65, def: 25, agi: 30, will: 999, mres: 15, gold: [10, 50], loot: [["wyvernscale", 0.5], ["gem", 0.2]], shape: "dragon", eye: "#ff6a3a",
      rg: "使徒領", acts: ["corrode"], weak: "ice",
      desc: "翼を持たない、灰色の竜。灰の中を泳ぐように進み、熱い息で鎧の留め金を焼き切る。",
      look: { body: "wyrm", skin: "#5a5048", skin2: "#9a8a78", horns: "long", eyes: "glow", mouth: "fangs", wings: "none", tail: "spike", pattern: "lava", mood: "fierce" },
      elder: { id: "e4_ashwyrm_x", name: "年経た灰の地竜", desc: "背の鱗が溶岩のように赤く光る、丘ほどの地竜。通った後の灰は三日冷めない。", item: ["燃える竜鱗", "年経た灰の地竜の鱗。いつまでも内側が赤く、触ると温かい。鍛冶の都では、これを炉に入れると火が三日もつと言う。", 220] },
    },
    e4_bonecarter: {
      name: "骨車引き", tier: 5, hp: 56, dmg: [2, 8, 3], hit: 65, def: 20, agi: 25, will: 80, mres: 15, gold: [20, 70], loot: [["relic", 0.08], ["potion", 0.3]], shape: "giant", eye: "#e8e0c8",
      rg: "使徒領", acts: ["call"], call: "zombie",
      desc: "骨を山と積んだ荷車を引いて荒野を行く大男。荷台の骨は呼べば起き上がる。",
      look: { body: "biped", build: "brute", skin: "#7a6a5a", head: "hood", eyes: "glow", mouth: "none", weapon: "club", outfit: "rags", cloth: "#3a3028", extra: ["bone", "pouch"], mood: "fierce" },
      lines: { turn: ["骨車引きが車輪を蹴った。荷台の骨がかたかたと鳴った。"] },
    },
    e4_shadewalker: {
      name: "影歩き", tier: 5, hp: 48, dmg: [2, 8, 3], hit: 70, def: 20, agi: 80, will: 70, mres: 20, gold: [20, 60], loot: [["smoke", 0.4], ["gem", 0.15]], shape: "humanoid", eye: "#c77dff",
      rg: "使徒領", acts: ["disarm", "fleecall"], call: "e4_shadewalker",
      desc: "灰の荒野の影から影へ渡り歩く者。刃を絡め取る。深手を負うと影に潜り、仲間を連れて戻る。",
      look: { body: "biped", build: "lanky", skin: "#2a2230", head: "mask", eyes: "glow", mouth: "none", weapon: "dagger", outfit: "garb", cloth: "#1a1420", extra: ["scarf", "smoke"], mood: "fierce" },
    },
    e4_redscorpion: {
      name: "赤砂の蠍", tier: 4, hp: 30, dmg: [2, 6, 1], hit: 60, def: 20, agi: 40, will: 999, mres: 5, gold: [0, 15], loot: [["fang", 0.3]], shape: "beast", eye: "#ff4d4d",
      rg: "使徒領", pack: [2, 3], acts: ["poison"], weak: "ice",
      desc: "荒野の赤い砂に潜む大蠍。尾の毒は刺された所から体を重くする。群れで巣を守る。",
      look: { body: "bug", skin: "#a83a2a", skin2: "#e07a5a", eyes: "glow", eyeN: 4, mouth: "fangs", tail: "spike", pattern: "stripes", mood: "fierce" },
      elder: { id: "e4_redscorpion_x", name: "赤砂の女王蠍", desc: "背に数十の子蠍を乗せた、荷車ほどの蠍。巣の群れはすべてこの腹から出てきた。", item: ["女王の毒針", "赤砂の女王蠍の尾の針。根元に毒の袋がついたまま乾いている。学院の薬学の教授が、喉から手が出るほど欲しがる品だ。", 180] },
    },
    e4_hollowknight: {
      name: "抜け殻の騎士", tier: 5, hp: 58, dmg: [2, 8, 3], hit: 65, def: 25, agi: 30, will: 999, mres: 20, gold: [20, 60], loot: [["plate", 0.04], ["potion", 0.3]], shape: "humanoid", eye: "#ff3a3a",
      rg: "使徒領", acts: ["regen"], weak: "bolt",
      desc: "中身の無い鎧が、騎士の型どおりに剣を振るう。へこみはひとりでに戻る。雷が鳴ると継ぎ目がばらける。",
      look: { body: "biped", build: "brute", skin: "#4a4a54", head: "helm", eyes: "glow", mouth: "none", weapon: "sword", shield: true, outfit: "armor", cloth: "#2a2a30", pattern: "cracks", extra: ["smoke", "plume"], mood: "fierce" },
    },
    e4_vulture: {
      name: "屍食い禿鷲", tier: 4, hp: 26, dmg: [2, 6, 1], hit: 60, def: 5, agi: 70, will: 60, mres: 0, gold: [0, 10], loot: [["fang", 0.3]], shape: "winged", eye: "#ffd84a",
      rg: "使徒領", pack: [2, 3], acts: ["pin", "rout"],
      desc: "荒野で倒れる者を待つ禿鷲。弱った者の連れを先に追い払い、群れで獲物を囲む。",
      look: { body: "wyrm", skin: "#4a3a30", skin2: "#d8a8a0", eyes: "slit", mouth: "beak", wings: "feather", tail: "fan", pattern: "scars", mood: "fierce" },
    },
  });

  // ---------------------------------------------------------------- 強い個体（elder）を敵として足す
  // 段 +1・HP 1.7 倍・ダメージ +2・命中 +8・防御 +5・素早さ +5・金 3 倍。落とし物はその個体だけの素材（必ず）。絵は元の種を大きく、古傷つきで
  E4.ELDER_OF = {}; // 元の id → 強い個体の id
  E4.ITEMS = E4.ITEMS || {};
  Object.entries(D.ENEMIES).forEach(([id, e]) => {
    const x = e.elder;
    if (!x || !/^e4_/.test(id)) return;
    const item = "e4_x_" + id.replace(/^e4_/, "");
    E4.ITEMS[item] = { name: x.item[0], type: "loot", price: x.item[2], desc: x.item[1].split("。")[0] + "。", flavor: x.item[1] };
    const look = Object.assign({}, e.look, { size: ((e.look && e.look.size) || 1) * 1.22 });
    look.extra = [...new Set([...((e.look && e.look.extra) || []), "blood"])];
    if (!e.look || !e.look.pattern || e.look.pattern === "none") look.pattern = "scars";
    look.mood = "fierce";
    D.ENEMIES[x.id] = Object.assign({}, e, {
      name: x.name, desc: x.desc, tier: e.tier + 1, hp: Math.ceil(e.hp * 1.7), dmg: [e.dmg[0], e.dmg[1], e.dmg[2] + 2],
      hit: e.hit + 8, def: e.def + 5, agi: e.agi + 5, will: e.will >= 999 ? 999 : e.will + 15, gold: [e.gold[0] * 3, e.gold[1] * 3],
      loot: [[item, 1], ...(e.loot || [])], look, elderOf: id, acts: [...new Set([...(e.acts || []).filter((a) => a !== "rout"), "enrage"])],
      pack: undefined, fleeAt: undefined, bribe: e.bribe ? e.bribe * 3 : undefined, rg: undefined, also: undefined, elder: undefined,
      lines: { open: [`ほかの${e.name}より、ひと回りもふた回りも大きい。古傷だらけの体が、こちらを値踏みしている。`], turn: (e.lines && e.lines.turn) || [] },
    });
    E4.ELDER_OF[id] = x.id;
  });
  Object.entries(E4.ITEMS).forEach(([id, it]) => { if (D.ITEMS && !D.ITEMS[id]) D.ITEMS[id] = it; });

  // ---------------------------------------------------------------- トロフィー
  if (Array.isArray(D.TROPHIES)) D.TROPHIES.push(
    { key: "e4_elder", name: "年経たものを狩る", tier: "銀", desc: "まれに出る強い個体を倒した" },
    { key: "e4_elder5", name: "古傷の目録", tier: "金", desc: "冒険をまたいで、五種の強い個体を倒したことがある" },
    { key: "e4_core", name: "縄張りを崩す", tier: "銀", desc: "使徒の縄張りの眷属を退けて主を弱らせた" },
  );
})(globalThis.G = globalThis.G || {});
