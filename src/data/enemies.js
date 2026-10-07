// 敵。tier = 強さの段（場所の danger に合わせて出る）
// hp / dmg [個数, 面, 加算] / hit 命中% / def 防御（こちらの命中が下がる）/ agi 素早さ（逃げにくさ）
// will 交渉・威圧への強さ（999 は話が通じない）/ mres 魔法への耐性 / gold [最小, 最大] / loot [[アイテム, 確率]]
// shape 背景の影の形（humanoid / small / beast / giant / blob / winged / swarm / dragon）
// flags: undead 不死 / majin 絶界 / boss ボス / magic 防具を無視する攻撃 / bribe 金で見逃してもらえる額
// レーン E（敵）が管理
(function (G) {
  const D = (G.data = G.data || {});

  D.ENEMIES = {
    // 段 1
    goblin: { name: "ゴブリン", tier: 1, hp: 8, dmg: [1, 4, 1], hit: 50, def: 0, agi: 30, will: 30, mres: 0, gold: [2, 8], loot: [["fang", 0.3]], shape: "small", eye: "#e8d44d", desc: "汚い短剣を振り回す小鬼。群れると厄介。" },
    wolf: { name: "飢えた野犬", tier: 1, hp: 10, dmg: [1, 6, 0], hit: 55, def: 5, agi: 55, will: 35, mres: 0, gold: [0, 0], loot: [["pelt", 0.3]], shape: "beast", eye: "#e8d44d", desc: "痩せこけた野犬。脅せば逃げる。" },
    barrelgob: { name: "樽ゴブリン", tier: 1, hp: 6, dmg: [1, 3, 0], hit: 40, def: 0, agi: 20, will: 20, mres: 0, gold: [5, 15], loot: [["ale", 0.8]], shape: "small", eye: "#f09a3e", desc: "酒樽をかぶったゴブリン。だいたい酔っている。" },
    dogu: { name: "ドグー", tier: 1, hp: 14, dmg: [1, 3, 0], hit: 35, def: 25, agi: 10, will: 25, mres: 0, gold: [1, 5], loot: [["gem", 0.05]], shape: "blob", eye: "#9fd6ff", desc: "泥でできた丸い人形。硬いがのろい。" },
    bandit: { name: "街道の盗賊", tier: 1, hp: 12, dmg: [1, 6, 1], hit: 55, def: 5, agi: 40, will: 40, mres: 0, gold: [5, 20], loot: [["herb", 0.3]], shape: "humanoid", eye: "#d9d9d9", bribe: 20, desc: "食い詰めた元農民。金を払えば見逃す。" },

    // 段 2
    orc: { name: "オーク", tier: 2, hp: 18, dmg: [1, 8, 1], hit: 55, def: 5, agi: 30, will: 45, mres: 0, gold: [5, 25], loot: [["fang", 0.5]], shape: "humanoid", eye: "#e05a3a", desc: "豚面の大男。力任せに斧を振るう。" },
    werewolf: { name: "人狼", tier: 2, hp: 22, dmg: [2, 4, 1], hit: 60, def: 10, agi: 60, will: 60, mres: 5, gold: [0, 10], loot: [["pelt", 0.6]], shape: "beast", eye: "#f2e14a", desc: "昼は人、夜は獣。" },
    spider: { name: "大蜘蛛", tier: 2, hp: 16, dmg: [1, 6, 2], hit: 60, def: 5, agi: 55, will: 999, mres: 0, gold: [0, 0], loot: [["silk", 0.6]], shape: "swarm", eye: "#ff4d4d", desc: "牛ほどもある蜘蛛。毒の牙を持つ。" },
    slime: { name: "酸のスライム", tier: 2, hp: 22, dmg: [1, 4, 2], hit: 50, def: 25, agi: 10, will: 999, mres: -20, gold: [0, 15], loot: [["gem", 0.08]], shape: "blob", eye: "#b6ff7a", desc: "刃が通りにくいが魔法に弱い。" },
    banditboss: { name: "山賊の頭", tier: 2, hp: 26, dmg: [1, 8, 2], hit: 60, def: 10, agi: 45, will: 55, mres: 0, gold: [20, 60], loot: [["potion", 0.5]], shape: "humanoid", eye: "#d9d9d9", bribe: 60, desc: "片目の大男。手下より話は分かる。" },
    guard: { name: "町の衛兵", tier: 2, hp: 20, dmg: [1, 6, 2], hit: 60, def: 15, agi: 40, will: 50, mres: 0, gold: [5, 20], loot: [], shape: "humanoid", eye: "#d9d9d9", bribe: 40, desc: "職務には忠実。賄賂にも忠実。" },

    // 段 3
    ogre: { name: "オーガ", tier: 3, hp: 36, dmg: [2, 6, 2], hit: 55, def: 10, agi: 25, will: 60, mres: 0, gold: [10, 40], loot: [["fang", 0.6]], shape: "giant", eye: "#e05a3a", desc: "人を丸かじりにする巨人。頭は悪い。" },
    zombie: { name: "屍の群れ", tier: 3, hp: 30, dmg: [1, 8, 1], hit: 50, def: 0, agi: 15, will: 999, mres: 0, undead: true, gold: [0, 20], loot: [["relic", 0.05]], shape: "swarm", eye: "#7dffb0", desc: "呪いで動く死体。痛みを知らない。" },
    wyvern: { name: "翼竜", tier: 3, hp: 32, dmg: [2, 6, 1], hit: 60, def: 15, agi: 65, will: 80, mres: 5, gold: [0, 0], loot: [["wyvernscale", 0.6]], shape: "winged", eye: "#ffb33a", desc: "空から襲いかかる小型の竜。" },
    deserter: { name: "帝国脱走兵", tier: 3, hp: 26, dmg: [1, 10, 1], hit: 60, def: 15, agi: 45, will: 45, mres: 0, gold: [10, 40], loot: [["chain", 0.1], ["potion", 0.3]], shape: "humanoid", eye: "#d9d9d9", bribe: 50, desc: "飢えた元兵士。腕は確か。" },
    ninja: { name: "はぐれ忍", tier: 3, hp: 24, dmg: [1, 8, 3], hit: 70, def: 20, agi: 75, will: 60, mres: 10, gold: [10, 30], loot: [["smoke", 0.5]], shape: "humanoid", eye: "#ff4d4d", desc: "抜け忍。音もなく背後に立つ。" },
    mimic: { name: "ミミック", tier: 3, hp: 28, dmg: [2, 6, 1], hit: 65, def: 20, agi: 30, will: 999, mres: 0, gold: [30, 90], loot: [["gem", 0.4]], shape: "blob", eye: "#ff4d4d", desc: "宝箱のふりをした魔物。" },

    // 段 4
    oni: { name: "鬼", tier: 4, hp: 46, dmg: [2, 8, 2], hit: 65, def: 15, agi: 40, will: 70, mres: 10, gold: [20, 60], loot: [["onihorn", 0.5]], shape: "giant", eye: "#ff3a3a", desc: "沖の岩の島に棲む鬼。酒と人肉を好む。" },
    warlock: { name: "呪術師", tier: 4, hp: 30, dmg: [2, 6, 3], hit: 70, def: 10, agi: 40, will: 70, mres: 30, magic: true, gold: [30, 80], loot: [["manawater", 0.5], ["grimoire", 0.1]], shape: "humanoid", eye: "#c77dff", desc: "禁術に手を染めた魔法使い。呪いは鎧を素通りする。" },
    chimera: { name: "キメラ", tier: 4, hp: 50, dmg: [2, 8, 1], hit: 60, def: 15, agi: 50, will: 999, mres: 10, gold: [0, 30], loot: [["gem", 0.2]], shape: "beast", eye: "#ffb33a", desc: "獅子と山羊と蛇を継ぎ合わせた怪物。" },
    blackknight: { name: "黒騎士", tier: 4, hp: 52, dmg: [1, 12, 3], hit: 70, def: 25, agi: 35, will: 80, mres: 10, gold: [30, 100], loot: [["plate", 0.1], ["potion", 0.4]], shape: "humanoid", eye: "#ff3a3a", desc: "使徒に仕える黒い鎧の騎士。中身を見た者はいない。" },

    // 段 5
    general: { name: "角兜の将", tier: 5, hp: 72, dmg: [2, 10, 3], hit: 70, def: 25, agi: 45, will: 85, mres: 15, gold: [60, 150], loot: [["gem", 0.4], ["elixir", 0.1]], shape: "giant", eye: "#ff3a3a", desc: "魔物の軍勢を率いる将。" },
    kin: { name: "使徒の眷属", tier: 5, hp: 58, dmg: [2, 8, 4], hit: 70, def: 20, agi: 55, will: 90, mres: 25, gold: [40, 120], loot: [["manawater", 0.5]], shape: "winged", eye: "#c77dff", desc: "使徒が生み出した翼ある僕。" },

    // ボス
    kain: { name: "眷属カイン", tier: 4, boss: true, hp: 95, dmg: [2, 8, 4], hit: 75, def: 20, agi: 60, will: 999, mres: 25, magic: true, gold: [150, 250], loot: [["apostleheart", 1]], shape: "humanoid", eye: "#c77dff", desc: "忘れ水の使徒ルアマリスの眷属。人の思い出を書き写した本を、遺跡で読み漁っている。" },
    shuten: { name: "鬼の頭目ゴズ", tier: 4, boss: true, hp: 120, dmg: [2, 10, 4], hit: 70, def: 20, agi: 45, will: 999, mres: 10, gold: [100, 200], loot: [["oniclub", 1], ["onihorn", 1]], shape: "giant", eye: "#ff3a3a", desc: "鬼ヶ島を統べる大鬼。夜明けに鳴る白い鎖を社から盗み、蔵に沈めているという。" },
    bonedragon: { name: "屍竜ネクロザ", tier: 5, boss: true, hp: 150, dmg: [3, 8, 4], hit: 70, def: 25, agi: 30, will: 999, mres: 20, undead: true, gold: [200, 400], loot: [["dragonmail", 1]], shape: "dragon", eye: "#7dffb0", desc: "死してなお墓場を守る竜。その腹に一振りの剣が刺さっている。" },
    rize: { name: "眷属リゼ", tier: 5, boss: true, hp: 120, dmg: [2, 10, 5], hit: 75, def: 25, agi: 70, will: 999, mres: 25, gold: [150, 300], loot: [["apostleheart", 1], ["elixir", 1]], shape: "humanoid", eye: "#ff3a3a", desc: "エンバルダの眷属。主人と同じく戦いに酔う女剣士。" },
    graw: { name: "黒鎧の使徒エンバルダ", tier: 6, boss: true, majin: true, hp: 220, dmg: [2, 10, 6], hit: 80, def: 25, agi: 50, will: 999, mres: 30, gold: [500, 1000], loot: [["gem", 1], ["relic", 1]], shape: "giant", eye: "#ff2020", desc: "黒い鎧に身を包んだ、騎士のような巨きな使徒。背の大剣を抜いた記録は一度もない。そばに立つだけで、一流の戦士でも体がすくむ。絶界に守られ、並の武器では傷ひとつ付かない。" },
    royalguard: { name: "近衛騎士団長", tier: 5, boss: true, hp: 110, dmg: [2, 8, 4], hit: 75, def: 30, agi: 50, will: 999, mres: 20, gold: [0, 0], loot: [], shape: "humanoid", eye: "#d9d9d9", desc: "王位を狙う者の前に立ちはだかる、王国最強の騎士。" },
  };
})(globalThis.G = globalThis.G || {});
