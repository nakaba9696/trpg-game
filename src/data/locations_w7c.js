// 町を国・地方ごとに 6〜8 まで増やす（W7 の続き。その 2：シェルアーク・境の地（人類の最前線・人と魔の境））。欄の意味は locations.js と同じ
// シェルアークは島々の自治（島ごとに顔役）。境の地は黒鉄の砦のまわりの兵と鐘と見張りの土地、人と魔の境は断界山脈の中の、人がしがみつく最後の村。
// 人と魔の境の二つの村は、黒鉄の砦の兵がときどき見回る（nation：人類の最前線。衛兵と評判はそちら）。使徒領には町を置かない（人の住まない土地。docs/lore/world.md 1.）。marks は locations_w7b.js の頭の説明と同じ
// 島の形は data/w7_map.js（D.W5_MAP.islands に足す）。レーン W（W7）
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.LOCS, {
    // ---------------------------------------------------------------- シェルアーク
    w7_saltisle: {
      name: "塩の島ソルネ", region: "シェルアーク", type: "town", danger: 0, scene: "w7_saltpans", x: 14, y: 90.5, marks: ["port", "craft"],
      desc: "島の都の東の浜に、四角く区切った塩田が鏡のように並んでいる。塩を掻く男たちは、日焼けで顔の見分けがつかない。この島の顔役は、塩の目方をごまかした者を、自分の掻いた塩田に一晩立たせる。",
      fac: ["inn", "tavern", "shop"],
      shop: ["q4_saltfish", "jerky", "i3a_oilcoat", "riceball", "ale"],
      links: {},
    },
    w7_netisle: {
      name: "網の島カラヴ", region: "シェルアーク", type: "town", danger: 0, scene: "w7_netisle", x: 8, y: 98, marks: ["port"],
      desc: "島の都の南の小さな島。家より網のほうが多い。浜から浜へ渡した綱に、繕いかけの網が何十枚も干してあって、風が吹くと島じゅうが帆のように鳴る。子どもは歩くより先に結び目を覚える。",
      fac: ["inn", "tavern", "shop"],
      shop: ["q4_saltfish", "i3w_trident", "i3r_sailorring", "riceball", "jerky"],
      links: {},
    },
    w7_bellisle: {
      name: "霧鐘の島ミストラ", region: "シェルアーク", type: "town", danger: 0, scene: "w7_bellisle", x: 1, y: 87, marks: ["port", "holy"],
      desc: "外海に向いた岩の島。崖の上に霧の日に鳴らす大きな鐘がある。鐘守の家の壁には、霧の中で鐘を頼りに帰ってきた船の名が、帰ってこなかった船の名と並べて刻んである。並べ方に決まりは無いらしい。",
      fac: ["inn", "shop", "church"],
      shop: ["i3r_omamori", "holywater", "riceball", "i3a_oilcoat", "potion"],
      links: {},
    },
    w7_pearlisle: {
      name: "真珠採りの島ヨナ", region: "シェルアーク", type: "town", danger: 0, scene: "w7_pearls", x: 13.5, y: 99.5, marks: ["port", "market"],
      desc: "島の都の南の、浅い入り江を抱えた島。女たちが息を止めて潜り、男たちが舟の上で殻を開ける。開ける前の殻に値をつける賭けが、島の一番の楽しみだ。外れた殻は浜の小屋の屋根に葺かれる。",
      fac: ["inn", "tavern", "shop", "alley"],
      shop: ["gem", "i3r_necklace", "i3w_kris", "q4_silk", "riceball"],
      links: {},
    },

    // ---------------------------------------------------------------- 人類の最前線
    w7_ironwell: {
      name: "井戸の砦町ケルン", region: "人類の最前線", type: "town", danger: 0, scene: "w7_wellfort", x: 59, y: 17, marks: ["border", "market"],
      desc: "黒鉄の砦へ送る水と粥と矢を、ここで用意する。町の真ん中の深い井戸のまわりに、兵站の倉と、兵の家族の長屋が並んでいる。井戸の縄は毎朝、新しい結び目が一つ増えている。誰が結んでいるのかは誰も聞かない。",
      fac: ["inn", "tavern", "shop", "guild"],
      shop: ["potion", "jerky", "i3w_spear", "i3w_crossbow", "chain", "w2_frostfire"],
      links: {},
    },
    w7_widows: {
      name: "鐘待ちの村リーネ", region: "人類の最前線", type: "town", danger: 0, scene: "w7_widows", x: 57, y: 35, marks: ["border", "farm"],
      desc: "砦に出た兵の妻と子が、畑を耕しながら待つ村。北の見張り塔の鐘が鳴るたびに、鍬が一斉に止まる。鐘の数を数え終えると、また一斉に動き出す。村の墓地は畑より少し広い。",
      fac: ["inn", "shop", "church"],
      shop: ["w2_whitebread", "herb", "potion", "i3r_widowring", "jerky"],
      links: {},
    },
    w7_frostgate: {
      name: "北の烽火台ヴェルト", region: "人類の最前線", type: "town", danger: 0, scene: "w7_beacon", x: 67, y: 8, marks: ["border", "port"],
      desc: "北の海を背に、烽火台が三つ並んだ見張りの町。夜は火を、昼は煙を上げて、海の向こうと山の向こうの両方を見張っている。薪を割る音が一日じゅう絶えない。烽火の番の兵は、交代のたびに、海と山のどちらが静かだったかを言い合う。",
      fac: ["inn", "tavern", "shop", "train"],
      shop: ["axe", "i3a_blackiron", "i3w_longbow", "w2_frostfire", "potion"],
      links: {},
    },

    // ---------------------------------------------------------------- 人と魔の境
    w7_lastvillage: {
      name: "最後の村ハルト", region: "人と魔の境", nation: "人類の最前線", type: "town", danger: 1, scene: "w7_lastvillage", x: 76, y: 9, marks: ["border", "mine"],
      desc: "断界山脈の北の肩に、石を積んだ家が十いくつ。地図では、ここが人の住む東の端になっている。村の者は山の石を掘って砦に売り、山の向こうの物には手を触れない。戸口には、どの家にも、山に背を向けた小さな像が置いてある。",
      fac: ["inn", "shop"],
      shop: ["i3w_pick", "jerky", "potion", "i3a_bearhide", "holywater"],
      links: {},
    },
    w7_hermitage: {
      name: "峠の庵ザレム", region: "人と魔の境", nation: "人類の最前線", type: "town", danger: 1, scene: "w7_hermitage", x: 75, y: 38, marks: ["border", "holy"],
      desc: "山脈の南の峠の、崩れかけた庵のまわりに、山を越えられなかった者たちが住みついてできた集落。庵の奥に古い祭壇があって、そこに供えた物は、翌朝には少しずつ減っている。住人は減ることを喜んでいる。",
      fac: ["inn", "shop", "church"],
      shop: ["holywater", "herb", "potion", "i3r_bonebeads", "jerky"],
      links: {},
    },
  });

  const L = D.LOCS;
  const link = (a, b, days) => { if (L[a] && L[b]) { L[a].links[b] = days; L[b].links[a] = days; } };
  const sail = (a, b, days, cost) => { if (L[a] && L[b]) { (L[a].sea = L[a].sea || {})[b] = { days, cost }; (L[b].sea = L[b].sea || {})[a] = { days, cost }; } };
  link("w7_saltisle", "yakumo", 1);
  link("w7_saltisle", "w3_seacave", 1);
  sail("w7_netisle", "yakumo", 1, 10);
  sail("w7_netisle", "w3_driftisle", 1, 10);
  sail("w7_bellisle", "yakumo", 1, 10);
  sail("w7_bellisle", "w1_oboro", 1, 10);
  sail("w7_pearlisle", "yakumo", 1, 10);
  sail("w7_pearlisle", "w7_netisle", 1, 10);
  link("w7_ironwell", "fort", 1);
  link("w7_ironwell", "w4_oldrail", 2);
  link("w7_widows", "w7_eldenholm", 1);
  link("w7_widows", "fort", 2);
  link("w7_frostgate", "w4_watch", 1);
  link("w7_frostgate", "w7_ironwell", 2);
  link("w7_lastvillage", "graveyard", 2);
  link("w7_lastvillage", "w4_watch", 2);
  link("w7_hermitage", "mountains", 2);
  link("w7_hermitage", "fort", 3);

  D.CLIMATE = Object.assign(D.CLIMATE || {}, {
    w7_saltisle: { rain: 0.15, fog: 0.2 },
    w7_netisle: { rain: 0.3, fog: 0.35 },
    w7_bellisle: { rain: 0.35, fog: 0.6 },
    w7_pearlisle: { rain: 0.25, fog: 0.25 },
    w7_ironwell: { rain: 0.25, fog: 0.2, cold: 1 },
    w7_widows: { rain: 0.25, fog: 0.2, cold: 1 },
    w7_frostgate: { rain: 0.35, fog: 0.3, cold: 2 },
    w7_lastvillage: { rain: 0.3, fog: 0.35, cold: 2 },
    w7_hermitage: { rain: 0.2, fog: 0.45, cold: 1 },
  });
})(globalThis.G = globalThis.G || {});
