// 新しい場所（W3）：自由都市連合・レオネスト王国・光天教会領・シェルアーク。欄の意味は locations.js と同じ
// 町：港の商都カルメラント（第三王子ファリナの都。北西の港・商いと裏社会）、森と湖の都リグノア（第一王子ライオスの都。国境の守り）、
//     火山の研究者の都フロスレイア（第五王子ネイラスの都。南の火山・遺跡）。名前と役は docs/lore/world.md 2.・life.md 11. のシートのまま
// 野外・名所：鐘撞きの丘（自由都市連合。見張り塔の鐘で知らせ合う丘）、沈黙の修道院（光天教会領。口を縫った修道士の廃院）、
//     数の合わない島（シェルアーク。地図によって数が違う島々。船で渡る）
// 迷宮：灰の観測所（フロスレイアの南、火山の灰に埋もれた古い観測所）、潮鳴りの洞（島の都の磯の海蝕洞）
// 出来事は events_w3*.js、用語説明は lore_w3.js、背景の絵は src/ui/scene.js（古い描き方）と src/ui/scene_v2_w3.js。
// 今ある場所への道はこのファイルの末尾で足す。locations.js は書き換えない
// レーン W（ワールド）が管理
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.LOCS, {
    // ---------------------------------------------------------------- レオネスト王国
    w3_carmeland: {
      name: "港の商都カルメラント", region: "レオネスト王国", type: "town", danger: 0, scene: "w3_harbor", x: 3, y: 40,
      desc: "北西の入り江に、倉庫と帳場がひしめく港の都。荷揚げの声と、両替商の算盤の音が、波の音より大きい。裏通りの戸口には、どれも同じ形の小さな鈴が下がっている。",
      fac: ["inn", "tavern", "shop", "guild", "alley"],
      shop: ["w2_sausage", "ale", "rapier", "dagger", "tools", "i1_umbrella"],
      links: { leavel: 2, w1_holy: 2 },
      sea: { nerva: { days: 3, cost: 25 } },
    },
    w3_lignoa: {
      name: "森と湖の都リグノア", region: "レオネスト王国", type: "town", danger: 0, scene: "w3_lake", x: 21, y: 24,
      desc: "国境の森に抱かれた、湖の上の砦の都。橋は朝と夕方にだけ下りる。木こりと兵と漁師が同じ酒場で飲み、湖の向こうの森で鳥が一斉に飛び立つと、全員が黙って杯を置く。",
      fac: ["inn", "tavern", "shop", "guild", "train", "church"],
      shop: ["longsword", "axe", "chain", "jerky", "herb", "potion"],
      links: { leavel: 2, w2_dranherz: 2 },
    },
    w3_frosleia: {
      name: "火山の都フロスレイア", region: "レオネスト王国", type: "town", danger: 0, scene: "w3_volcano", x: 30, y: 90,
      desc: "黒い灰の斜面に、白い漆喰の家と研究所が段々に貼りついている。屋根という屋根に灰掻きの箒が立てかけてあり、通りの学者たちは歩きながら帳面に何か書いている。山は、今日は静かだ。",
      fac: ["inn", "tavern", "shop", "guild", "church"],
      shop: ["potion", "manawater", "elixir", "staff", "robe", "m1_tome_ward"],
      links: { nerva: 2, ruins: 2 },
    },

    // ---------------------------------------------------------------- 自由都市連合
    w3_bells: {
      name: "鐘撞きの丘", region: "自由都市連合", type: "wild", danger: 1, scene: "w3_bells", x: 34, y: 62,
      desc: "低い丘の頂ごとに、古い見張り塔が一本ずつ立っている。どの塔にも鐘が吊ってあり、どの塔にも、鐘の綱を握ったまま居眠りする番人がいる。風が吹くと、鐘が少しだけ鳴る。",
      pool: ["bandit", "wolf", "e1_tollrat", "w3_smuggler"],
      links: { karna: 1, nerva: 2 },
    },

    // ---------------------------------------------------------------- 光天教会領
    w3_abbey: {
      name: "沈黙の修道院", region: "光天教会領", type: "wild", danger: 2, scene: "w3_abbey", x: 12, y: 72,
      desc: "糸杉の丘の上に、屋根の落ちた修道院が建っている。門の上の石に「語るなかれ」と彫ってある。中庭の井戸の縁に、誰かが今朝置いたらしい、まだ温かいパンが一つ。",
      pool: ["w1_husk", "w3_silentmonk", "zombie", "w1_candlemite"],
      links: { w1_holy: 2, nerva: 2 },
    },

    // ---------------------------------------------------------------- シェルアーク
    w3_driftisle: {
      name: "数の合わない島", region: "シェルアーク", type: "wild", danger: 2, scene: "w3_isles", x: 2, y: 96,
      desc: "島の都の沖に散らばる小島の群れ。漁師の地図には七つ、役人の地図には九つ、子どもの絵には十一ある。小舟で渡るたびに、浜の形が少し違う。",
      pool: ["w3_hermit", "w3_drowned", "spider", "w1_tanuki"],
      links: {},
      sea: { yakumo: { days: 1, cost: 10 } },
    },

    // ---------------------------------------------------------------- 迷宮
    w3_ashvault: {
      name: "灰の観測所", region: "レオネスト王国", type: "dungeon", danger: 3, scene: "w3_ashvault", x: 38, y: 96,
      desc: "火山の中腹で、灰の下から丸い屋根が半分だけ顔を出している。都の学者が「古い観測所」と呼ぶ建物で、入口の扉には、内側から板が打ちつけてある。板の釘は、外向きに曲がっている。",
      pool: ["w3_cinder", "w3_ashmoth", "e1_sweeper", "mimic"], floors: 4, boss: "w3_ashscribe",
      reward: { flag: "w3_ashscribe", item: "relic", fame: 45, chron: "灰の観測所の底で、書き続ける灰の書記を止める", text: "書記の腕が止まった。ペンが床に落ち、灰の中に半分沈んだ。机の上の帳面は、最後の頁まで埋まっていた。どの頁にも、同じ山の、同じ日の、同じ一行。「今日、山は鳴らなかった」机の引き出しの奥に、布にくるんだ古い道具が一つ残っていた。" },
      links: { w3_frosleia: 1 },
    },
    w3_seacave: {
      name: "潮鳴りの洞", region: "シェルアーク", type: "dungeon", danger: 2, scene: "w3_seacave", x: 14, y: 86,
      desc: "島の都の東の磯に、満ち潮で口を閉じる洞がある。引き潮の時刻を、浜の婆さまは指を折って教えてくれる。奥から、ときどき、大きな腹が鳴るような音がする。",
      pool: ["w3_hermit", "w3_drowned", "slime", "e1_lantern"], floors: 3, boss: "w3_tidemaw",
      reward: { flag: "w3_tidemaw", item: "gem", fame: 35, chron: "潮鳴りの洞の奥で、潮呑みを黙らせる", text: "潮呑みが、最後に大きく息を吐いた。洞じゅうの水が引いていき、底の砂に、呑まれた物が並んで残った。錨、片方だけの草履、舟の名札、指輪。名札の名前の半分は、島の都の墓地で見た名前だった。" },
      links: { yakumo: 1 },
    },
  });

  // 今ある場所からの道（両方向に書く決まり）
  const L = D.LOCS;
  const link = (a, b, days) => { if (L[a] && L[b]) { L[a].links[b] = days; L[b].links[a] = days; } };
  const sail = (a, b, days, cost) => { if (L[a] && L[b]) { (L[a].sea = L[a].sea || {})[b] = { days, cost }; (L[b].sea = L[b].sea || {})[a] = { days, cost }; } };
  link("w3_carmeland", "leavel", 2);
  link("w3_carmeland", "w1_holy", 2);
  sail("w3_carmeland", "nerva", 3, 25);
  link("w3_lignoa", "leavel", 2);
  link("w3_lignoa", "w2_dranherz", 2);
  link("w3_frosleia", "nerva", 2);
  link("w3_frosleia", "ruins", 2);
  link("w3_bells", "karna", 1);
  link("w3_bells", "nerva", 2);
  link("w3_abbey", "w1_holy", 2);
  link("w3_abbey", "nerva", 2);
  sail("w3_driftisle", "yakumo", 1, 10);
  link("w3_ashvault", "w3_frosleia", 1);
  link("w3_seacave", "yakumo", 1);

  // 天候（engine/weather.js の D.CLIMATE。あとから読まれる weather.js は Object.assign で残す）
  D.CLIMATE = Object.assign(D.CLIMATE || {}, {
    w3_carmeland: { rain: 0.3, fog: 0.3 },               // 入り江の霧
    w3_lignoa: { rain: 0.3, fog: 0.35, cold: 1 },        // 湖の朝霧
    w3_frosleia: { rain: 0.1, fog: 0.4 },                // 灰で霞む
    w3_bells: { rain: 0.2, fog: 0.15 },
    w3_abbey: { rain: 0.2, fog: 0.3 },
    w3_driftisle: { rain: 0.35, fog: 0.45 },
    w3_ashvault: { rain: 0.05, fog: 0.5 },
    w3_seacave: { rain: 0.3, fog: 0.3 },
  });
})(globalThis.G = globalThis.G || {});
