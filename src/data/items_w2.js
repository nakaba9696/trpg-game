// W2 の町の食べ物と、酸の谷の品・主。欄の意味は items.js・enemies.js と同じ
// 食べ物は docs/lore/life.md 2. の土地ごとの食べ物から（聖王国の白パンと腸詰め、帝国の石窯包みと凍り火、共和国の蜜菓子）
// レーン W（ワールド）が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ITEMS, {
    w2_whitebread: { name: "白パン", type: "use", hp: 7, price: 6, desc: "誓いの日にだけ焼く白いパン。グランベールでは、麦の穫れすぎた年だけ、ふだんの日にも売る。" },
    w2_sausage: { name: "腸詰め", type: "use", hp: 9, price: 8, desc: "祭りの日のごちそう。旅人に売るのは、祭りの残り。" },
    w2_kilnpie: { name: "鉱夫の石窯包み", type: "use", hp: 14, price: 12, desc: "肉と芋を生地で包んで焼いた、帝国の鉱夫の弁当。冷めると石のように硬い。温かいうちは、石より少し柔らかい。" },
    w2_frostfire: { name: "凍り火", type: "use", hp: 3, mp: 6, price: 10, desc: "帝国の強い蒸留酒。一口で喉が燃え、二口で足が凍る。飲まない奴も、これしか飲まない奴も、信用されない。" },
    w2_honeycake: { name: "蜜菓子", type: "use", hp: 6, mp: 3, price: 9, desc: "木の実を蜂蜜で固めた共和国の菓子。エルフの店のものは甘さが三百年前のまま。" },
    w2_acidcore: { name: "脈打つ緑の石", type: "loot", price: 650, desc: "酸の谷の底から掬った、握りこぶしほどの石。温かく、ときどき脈を打つ。帝国の工房も共和国の学者も、目の色を変えて買いたがる。" },
  });

  Object.assign(D.ENEMIES, {
    w2_ironwarden: {
      name: "溶けかけた機械兵", tier: 4, boss: true, hp: 105, dmg: [2, 8, 3], hit: 65, def: 30, agi: 15, will: 999, mres: 20, gold: [20, 80], loot: [["relic", 0.5], ["gem", 0.3]], shape: "giant", eye: "#9fff6a",
      desc: "酸の谷を囲んで焼いた、帝国の古い鉄の巨人。半分溶けたまま、今も谷の見張りを続けている。中に人は乗っていない。",
      look: { body: "biped", build: "giant", skin: "#6a6258", skin2: "#9fbf5a", head: "helm", eyes: "glow", mouth: "none", weapon: "club", outfit: "armor", cloth: "#4a4a42", pattern: "cracks", extra: ["pauldron", "smoke"], mood: "fierce" },
      lines: {
        open: ["膝をついていた鉄の巨人の一体が、軋みながら立ち上がった。胸の中で、歯車が一つずつ噛み合っていく。「……コウタイ、カ」"],
        turn: ["機械兵の片腕が酸に溶けて落ちた。機械兵は、落ちた腕を拾って、元の場所に当てた。つかない。もう一度当てた。", "機械兵の胸から、ひび割れた号令の声がした。「……持チ場ヲ、離レルナ」誰に言っているのかは分からない。"],
      },
    },
  });
})(globalThis.G = globalThis.G || {});
