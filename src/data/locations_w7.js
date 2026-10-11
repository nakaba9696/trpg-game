// 新しい町（W7）と、地図と行ける道を合わせる直し。欄の意味は locations.js と同じ
// 持ち主の声「地図と行ける場所が合ってない。ナグリスから使徒領に行けるように見えて行けない」「街の数はもう少し増やしていい」
// 町は docs/lore/life.md 11.・world.md 2. の「まだ無い町」から、シートの名と備考のまま 8 つ：
//   レオネスト王国：辺境の基地の都ザイグロス（第四王子アルマンの都）
//   ノルディア帝国：砦の都ブレイナーク（帝都の北の守り）・監獄の都グリスハイム・北の港アイゼルヴァン・緑の都エルデンホルム
//   エルメシア共和国：芸の町サリュエス・精霊の隠れ里レヴァンデル・灯台の港ヴォルエラ
// 出来事は events_w7*.js、用語説明・通行人・噂は lore_w7.js、着いたときの一文は engine/zzzzzzzzz_w7_arrive.js、
// 地図の道の曲がり角（ほかの場所の印の上を通らないように）は data/w7_map.js。確かめるのは tests/checks/w7_map.mjs
// 今ある場所への道はこのファイルの末尾で足す（両方向に書く決まり）。locations.js は書き換えない。レーン W（W7）
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.LOCS, {
    // ---------------------------------------------------------------- レオネスト王国
    w7_zaigros: {
      name: "辺境の都ザイグロス", region: "レオネスト王国", type: "town", danger: 0, scene: "w7_frontier", x: 38, y: 36,
      desc: "丘の上の兵舎を、低い石の町がぐるりと囲んでいる。王国の北の辺境で、帝国の雪が見える最初の町だ。広場の掲示板には、兵の名簿と、掘り出された珍しい石の値段が並んで貼ってある。兵の妻たちは、見張り塔の鐘の数で夫の帰りを知る。",
      fac: ["inn", "tavern", "shop", "guild", "train"],
      shop: ["i3w_spear", "i3w_pike", "longsword", "chain", "i3a_brigandine", "potion", "jerky"],
      links: {},
    },

    // ---------------------------------------------------------------- ノルディア帝国
    w7_brenark: {
      name: "砦の都ブレイナーク", region: "ノルディア帝国", type: "town", danger: 0, scene: "w7_clawwall", x: 30, y: 4,
      desc: "帝都の北、凍った海を背に、灰色の城壁が三重に巡っている。外側の壁には、人の背丈より高い所に、大きな爪で掻いた跡が四本、並んで残っている。古い兵たちはその跡を塗り込めず、子どもが悪さをすると、黙ってそこまで連れていく。",
      fac: ["inn", "tavern", "shop", "guild", "train"],
      shop: ["axe", "i3w_imperial", "i3a_blackiron", "chain", "w2_frostfire", "potion"],
      links: {},
    },
    w7_grishaim: {
      name: "監獄の都グリスハイム", region: "ノルディア帝国", type: "town", danger: 0, scene: "w7_prison", x: 18, y: 6,
      desc: "雪の野に、窓の小さな石の塔が何本も立っている。どれも監獄だ。町はその足もとにしがみつくように建ち、住人の半分は看守か、看守の家族か、面会に来て帰りそびれた者だという。塔の上の小さな窓には、夜になると、一つずつ灯りがともる。",
      fac: ["inn", "tavern", "shop", "alley"],
      shop: ["i3w_club", "i3w_knife", "i3a_gambeson", "w2_frostfire", "jerky", "tools"],
      links: {},
    },
    w7_eisenvan: {
      name: "北の港アイゼルヴァン", region: "ノルディア帝国", type: "town", danger: 0, scene: "w7_icehaven", x: 3, y: 13,
      desc: "外海に向いた、帝国の北西の港。桟橋の杭は氷でふくらみ、舫い綱は朝ごとに叩いて氷を落とさなければならない。漁に出られる日より出られない日のほうが多く、港の酒場は、いつも海を眺める男たちで埋まっている。南へ下る船は、天気を三日待って一日で出る。",
      fac: ["inn", "tavern", "shop", "guild"],
      shop: ["i3a_oilcoat", "i3w_trident", "i3r_sailorring", "w2_frostfire", "jerky", "longsword"],
      links: {},
    },
    w7_eldenholm: {
      name: "緑の都エルデンホルム", region: "ノルディア帝国", type: "town", danger: 0, scene: "w7_greenvale", x: 52, y: 28,
      desc: "帝国にはめずらしく、雪の下から草の色がのぞく谷の町。温かい泉のまわりにだけ森が残り、そこで弓兵が訓練をし、薬草摘みが籠を下げて歩く。市の日には、獣人の弓兵と、薬草の匂いのする娘たちが、同じ屋台の前で長いこと立ち話をしている。",
      fac: ["inn", "tavern", "shop", "train", "church"],
      shop: ["i3w_shortbow", "i3w_longbow", "herb", "potion", "i3a_hunterleather", "jerky"],
      links: {},
    },

    // ---------------------------------------------------------------- エルメシア共和国
    w7_salyues: {
      name: "芸の町サリュエス", region: "エルメシア共和国", type: "town", danger: 0, scene: "w7_artstown", x: 57, y: 47,
      desc: "王国から来る街道と、共和国の森の道が交わる所にできた町。広場では毎日どこかで芝居がかかり、壁という壁に絵が描かれ、上から別の絵が描かれている。人間の役者とエルフの楽師と獣人の軽業師が、同じ芝居小屋の板の上で、出番の順番を怒鳴り合っている。",
      fac: ["inn", "tavern", "shop", "guild", "alley"],
      shop: ["lute", "i3a_dancer", "rapier", "i3w_throwknife", "ale", "w2_honeycake"],
      links: {},
    },
    w7_revandel: {
      name: "隠れ里レヴァンデル", region: "エルメシア共和国", type: "town", danger: 0, scene: "w7_mossvillage", x: 77, y: 78,
      desc: "森に溶けるように建てられた家々の里。屋根に苔が生え、戸口に蔓が垂れ、どこまでが家でどこからが木なのか、はじめて来た者には分からない。子どもたちは、名前を覚えるより先に、森の何かと約束を交わすのだという。里の真ん中の大きな切り株には、毎朝、誰かが水を供えている。",
      fac: ["inn", "shop", "church"],
      shop: ["herb", "manawater", "i3r_leafneck", "staff", "w2_honeycake", "i3w_elfbow"],
      links: {},
    },
    w7_volera: {
      name: "灯台の港ヴォルエラ", region: "エルメシア共和国", type: "town", danger: 0, scene: "w7_lighthouse", x: 74, y: 92,
      desc: "穏やかな湾の奥の、白い灯台の港。南の海は凪いでいる日が多く、外から来た船がゆっくり入ってくる。灯台守は夜ごと灯を絶やさず、ときどき、沖から聞こえる歌に、首をかしげて耳を澄ます。桟橋では、見たことのない模様の布と、見たことのない干し魚が売られている。",
      fac: ["inn", "tavern", "shop", "guild"],
      shop: ["q4_saltfish", "i3a_oilcoat", "i3w_corsair", "i3r_sailorring", "potion", "ale"],
      links: {},
    },
  });

  const L = D.LOCS;
  const link = (a, b, days) => { if (L[a] && L[b]) { L[a].links[b] = days; L[b].links[a] = days; } };
  const unlink = (a, b) => { if (L[a] && L[b]) { delete L[a].links[b]; delete L[b].links[a]; } };
  const sail = (a, b, days, cost) => { if (L[a] && L[b]) { (L[a].sea = L[a].sea || {})[b] = { days, cost }; (L[b].sea = L[b].sea || {})[a] = { days, cost }; } };

  // ---------------------------------------------------------------- 地図と行ける道を合わせる直し
  // 市の都ヴァルミリアは森と湖の都リグノアのすぐ隣にあり、王都→リグノアの道と帝都→ヴァルミリアの道が、
  // それぞれもう一方の町の印の上を通っていた（そこで乗り換えられるように見える）。帝都寄りの北へ移す。リグノアの湖は data/w7_map.js で西へ
  if (L.w4_valmiria) Object.assign(L.w4_valmiria, { x: 22, y: 16 });
  // エルヴィナの地下墓地は、聖都→沈黙の修道院の道の上に乗っていた。大聖堂の真下の墓所なので、聖都のすぐ南の海寄りへ
  if (L.w1_catacomb) Object.assign(L.w1_catacomb, { x: 3, y: 57 });
  // 湯の町アミュレイン→狩り場の町ナグリスの道は、首都エルメシア→水の都トゥリエルの道と地図の上で交わり、交わる所で乗り換えられるように見えた。
  // アミュレインからナグリスへは、水の都トゥリエルを通る（2 日＋2 日）
  unlink("w2_amyrein", "w2_nagris");
  // ナグリス（使徒領）と断界山脈→灰の荒野の道は、data/w7_map.js で山脈の尾根に沿って東へ曲げる（ナグリスから使徒領へ行く道は無い。黒鉄の砦と断界山脈を通るしかない）

  // ---------------------------------------------------------------- 新しい町への道
  link("w7_zaigros", "plains", 2);
  link("w7_zaigros", "frost", 2);
  link("w7_zaigros", "w2_acid", 1);
  link("w7_zaigros", "karna", 3);
  link("w7_brenark", "garmund", 1);
  link("w7_brenark", "w2_shadow", 2);
  link("w7_grishaim", "garmund", 2);
  link("w7_grishaim", "w2_zalgros", 2);
  link("w7_eisenvan", "w2_zalgros", 2);
  sail("w7_eisenvan", "w3_carmeland", 2, 20);
  link("w7_eldenholm", "frost", 2);
  link("w7_eldenholm", "fort", 2);
  link("w7_eldenholm", "w2_acid", 2);
  link("w7_salyues", "karna", 3);
  link("w7_salyues", "zephara", 2);
  link("w7_revandel", "w2_amyrein", 2);
  link("w7_revandel", "w4_silent", 1);
  link("w7_volera", "w7_revandel", 2);
  sail("w7_volera", "nerva", 6, 45);

  // 天候（engine/weather.js の D.CLIMATE）
  D.CLIMATE = Object.assign(D.CLIMATE || {}, {
    w7_zaigros: { rain: 0.2, fog: 0.15, cold: 1 },
    w7_brenark: { rain: 0.3, fog: 0.2, cold: 2 },
    w7_grishaim: { rain: 0.3, fog: 0.25, cold: 2 },
    w7_eisenvan: { rain: 0.45, fog: 0.35, cold: 2 },   // 荒天の多い北の海
    w7_eldenholm: { rain: 0.25, fog: 0.35, cold: 1 },  // 泉の湯気
    w7_salyues: { rain: 0.2, fog: 0.1 },
    w7_revandel: { rain: 0.3, fog: 0.4 },
    w7_volera: { rain: 0.15, fog: 0.25 },
  });
})(globalThis.G = globalThis.G || {});
