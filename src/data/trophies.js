// トロフィー。冒険をまたいで残る。test(S) が真になった手番の終わりに獲得する。
// test の無いものは、出来事や報酬（trophy: キー）から直接渡される。
// tier: 金 / 銀 / 銅。レーン T（トロフィー）が管理
(function (G) {
  const D = (G.data = G.data || {});

  D.TROPHIES = [
    { key: "first_step", name: "旅立ち", tier: "銅", desc: "初めての冒険を始めた", test: (S) => !!S },
    { key: "first_win", name: "初陣", tier: "銅", desc: "初めて敵を倒した", test: (S) => S.counters.kills >= 1 },
    { key: "crit", name: "天運", tier: "銅", desc: "判定で大成功を出した", test: (S) => S.counters.crits >= 1 },
    { key: "fumble", name: "天に見放された", tier: "銅", desc: "判定で大失敗を出した", test: (S) => S.counters.fumbles >= 1 },
    { key: "death", name: "死は終わりではない", tier: "銅", desc: "冒険者が死んだ", test: (S) => S.over === "dead" },
    { key: "close_call", name: "しぶとい奴", tier: "銅", desc: "瀕死から踏みとどまった", test: (S) => S.counters.clung >= 1 },
    { key: "party", name: "一党の頭目", tier: "銀", desc: "仲間が3人そろった", test: (S) => S.companions.length >= 3 },
    { key: "quests10", name: "ギルドの顔", tier: "銀", desc: "依頼を10件こなした", test: (S) => S.counters.quests >= 10 },
    { key: "grow15", name: "鍛錬の日々", tier: "銅", desc: "一度の冒険で能力値を合計15伸ばした", test: (S) => G.totalGrowth(S) >= 15 },
    { key: "stat70", name: "一流", tier: "銀", desc: "どれかの能力値が40に届いた", test: (S) => G.data.STATS.some((k) => G.pt(S.stats[k]) >= 40) },
    { key: "stat85", name: "才能開花", tier: "金", desc: "どれかの能力値が60に届いた", test: (S) => G.data.STATS.some((k) => G.pt(S.stats[k]) >= 60) },
    { key: "rich1", name: "金貨の山", tier: "銀", desc: "所持金が1000Gに届いた", test: (S) => S.gold >= 1000 },
    { key: "rich2", name: "大陸一の富豪", tier: "金", desc: "所持金が10000Gに届いた", test: (S) => S.gold >= 10000 },
    { key: "fame150", name: "名の知れた冒険者", tier: "銀", desc: "名声が150に届いた", test: (S) => S.fame >= 150 },
    { key: "fame600", name: "生ける伝説", tier: "金", desc: "名声が600に届いた", test: (S) => S.fame >= 600 },
    { key: "day100", name: "百日の旅", tier: "銀", desc: "百日を生き延びた", test: (S) => S.day >= 100 && S.over !== "dead" },
    { key: "explorer", name: "大陸踏破", tier: "金", desc: "すべての場所を訪れた", test: (S) => Object.keys(G.data.LOCS).every((k) => S.visited[k]) },
    { key: "kain", name: "眷属殺し", tier: "銀", desc: "眷属カインを討った", test: (S) => !!S.flags.kain },
    { key: "shuten", name: "鬼退治", tier: "銀", desc: "鬼の頭目ゴズを討った", test: (S) => !!S.flags.shuten },
    { key: "dragon", name: "竜殺し", tier: "金", desc: "屍竜ネクロザを討った", test: (S) => !!S.flags.bonedragon },
    { key: "volgrim", name: "魔剣の主", tier: "金", desc: "魔剣ヴォルグリムを手にした" },
    { key: "byakuya", name: "聖刀の主", tier: "金", desc: "聖刀白夜を手にした" },
    { key: "majin", name: "使徒殺し", tier: "金", desc: "使徒を討ち果たした" },
    { key: "knight", name: "叙任", tier: "銀", desc: "騎士の位を得た", test: (S) => ["騎士", "領主", "国王"].includes(S.title) },
    { key: "lord", name: "領主", tier: "金", desc: "領地を持つ身になった", test: (S) => ["領主", "国王"].includes(S.title) },
    { key: "king", name: "王", tier: "金", desc: "一国の王になった", test: (S) => S.title === "国王" },
    { key: "mirza", name: "微笑の使徒との邂逅", tier: "銀", desc: "微笑の使徒カルマトスに出会い、生き延びた" },
    { key: "god", name: "赤い月の拍手", tier: "銀", desc: "赤い月の夜、空の高いところで誰かが手を打った" },
    { key: "goal", name: "宿願成就", tier: "金", desc: "冒険の目的を果たした", test: (S) => G.goalDone(S) },
    { key: "retire", name: "物語の結末", tier: "金", desc: "目的を果たして引退した", test: (S) => S.over === "end" && G.goalDone(S) },
  ];
})(globalThis.G = globalThis.G || {});
