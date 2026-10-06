// 町を国・地方ごとに 6〜8 まで増やす（W7 の続き。その 1：自由都市連合・光天教会領）。欄の意味は locations.js と同じ
// 持ち主の声「（地方ごとに増やすのを）頼みます」。シートに無い町は、その地方の設定（自由都市＝王子から自治を許された町の寄り合い、
// 教会領＝光天教会の聖都のまわりの巡礼と祈りの土地）から作った。
// marks：町の印（その町が何の町か。R3 の最初のきっかけ・M12 の世の大事の舞台を選ぶときの手がかり）
//   port 港 / river 渡し・川港 / mine 鉱山・掘る町 / holy 聖地・巡礼 / border 国境・前線 / market 市・商い / farm 畑・葡萄 / craft 職人 / ruins 遺跡のそば / mercs 傭兵
// 出来事は events_w7b_*.js、用語説明・着いたときの一文は lore_w7b_*.js。地図と行ける道の決まりは tests/checks/w7_map.mjs・w7b_towns.mjs
// レーン W（W7）
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.LOCS, {
    // ---------------------------------------------------------------- 自由都市連合
    w7_russen: {
      name: "渡しの町リュッセン", region: "自由都市連合", type: "town", danger: 0, scene: "w7_ferry", x: 30, y: 55, marks: ["river", "market"],
      desc: "大きな川の東岸に、渡し舟の桟橋と、通行料を取る小屋が並んでいる。町の決まりは、舟の上では誰も偉くない、というただ一つ。王子の使いも傭兵の頭も、同じ板に膝を寄せて座り、同じ銅貨を払って向こう岸へ渡る。",
      fac: ["inn", "tavern", "shop", "guild"],
      shop: ["dagger", "longsword", "leather", "i3a_oilcoat", "ale", "w2_sausage"],
      links: {},
    },
    w7_glatz: {
      name: "傭兵の町グラッツ", region: "自由都市連合", type: "town", danger: 0, scene: "w7_mercs", x: 50, y: 48, marks: ["mercs", "market"],
      desc: "柵で囲った練兵場のまわりに、宿と酒場と鍛冶屋だけが並ぶ町。広場の大きな板には、雇い主の名と日当と「命の保証なし」の札が隙間なく貼られている。傭兵たちは昼まで寝て、昼から札の前で値切り、夜は誰が明日死ぬかを賭ける。",
      fac: ["inn", "tavern", "shop", "guild", "train", "alley"],
      shop: ["i3w_broadsword", "i3w_halberd", "i3w_crossbow", "i3a_studded", "chain", "potion"],
      links: {},
    },
    w7_durm: {
      name: "発掘人の町ドゥルム", region: "自由都市連合", type: "town", danger: 0, scene: "w7_diggers", x: 49, y: 81, marks: ["ruins", "mine"],
      desc: "エル・ナフ遺構へ通う発掘人たちが、天幕を板に、板を石に建て替えてできた町。どの家の戸口にも、掘り出した何かの欠片が飾ってあって、どれも何なのか誰にも分からない。酒場の壁の黒板には、今週帰ってこない者の名が、白墨で書き足されていく。",
      fac: ["inn", "tavern", "shop", "guild"],
      shop: ["tools", "i3w_pick", "i3w_shortsword", "leather", "potion", "jerky"],
      links: {},
    },
    w7_vinale: {
      name: "葡萄の町ヴィナレ", region: "自由都市連合", type: "town", danger: 0, scene: "w7_vineyard", x: 36, y: 74, marks: ["farm", "market"],
      desc: "南向きのなだらかな斜面いっぱいに、葡萄の棚が段になって続いている。樽を転がす音と搾り場の甘酸っぱい匂い。この町の酒は三つの国に売られ、どの国の王も、自分の国の酒だと思って飲んでいる。",
      fac: ["inn", "tavern", "shop", "church"],
      shop: ["ale", "w2_whitebread", "w2_sausage", "i3w_sickle", "leather", "lute"],
      links: {},
    },

    // ---------------------------------------------------------------- 光天教会領
    w7_orbe: {
      name: "巡礼の宿場オルベ", region: "光天教会領", type: "town", danger: 0, scene: "w7_pilgrim", x: 7, y: 42, marks: ["holy", "market"],
      desc: "王都から聖都へ下る巡礼の道の、最後の宿場。宿の軒には、巡礼が置いていった杖が何百本も束ねて吊るされ、風が吹くと、木の触れ合う音が町じゅうでからからと鳴る。聖都はもう、丘の向こうに尖塔の先が見えている。",
      fac: ["inn", "tavern", "shop", "church"],
      shop: ["holywater", "holysymbol", "i3a_travelcloak", "w2_whitebread", "herb", "jerky"],
      links: {},
    },
    w7_melvi: {
      name: "写本の町メルヴィ", region: "光天教会領", type: "town", danger: 0, scene: "w7_scriptorium", x: 20, y: 62, marks: ["holy", "craft"],
      desc: "川べりの修道院のまわりに、紙漉きと墨屋と製本屋が寄り集まった町。修道院の窓という窓に、写字生の丸めた背中が並んでいる。通りでは誰も大声を出さない。代わりに、紙をめくる音が、雨のように絶えず聞こえる。",
      fac: ["inn", "shop", "church", "guild"],
      shop: ["grimoire", "m1_tome_ward", "i3a_monkrobe", "holywater", "manawater", "i3r_academypin"],
      links: {},
    },
    w7_lumie: {
      name: "蝋燭の町リュミエ", region: "光天教会領", type: "town", danger: 0, scene: "w7_candles", x: 14, y: 66, marks: ["holy", "craft"],
      desc: "大聖堂で灯す蝋燭を、すべてこの町で作っている。蜜蝋の甘い匂いが通りに満ち、どの家の窓辺にも、吊るされて冷えるのを待つ白い蝋燭が、簾のように並んでいる。夜になっても町は少しも暗くならない。",
      fac: ["inn", "tavern", "shop", "church"],
      shop: ["q4_candles", "holywater", "holysymbol", "w2_honeycake", "herb", "i3r_holyamulet"],
      links: {},
    },
    w7_serena: {
      name: "泉の町セレナ", region: "光天教会領", type: "town", danger: 0, scene: "w7_spring", x: 5, y: 64, marks: ["holy"],
      desc: "海を見下ろす崖の上の、小さな泉を囲んだ町。泉の水は冷たく、少し塩の味がする。病を抱えた巡礼が、泉の縁に順番に並んで、黙って手を浸している。泉の底には、祈りと一緒に投げ込まれた銅貨が、青く錆びて沈んでいる。",
      fac: ["inn", "shop", "church"],
      shop: ["herb", "potion", "holywater", "elixir", "i3r_charm"],
      links: {},
    },
    w7_norve: {
      name: "祈りの浜ノルヴェ", region: "光天教会領", type: "town", danger: 0, scene: "w7_prayerbeach", x: 17, y: 75, marks: ["port", "holy"],
      desc: "小舟が浜に引き上げられた、漁師の村。獲れた魚の最初の一尾は、浜の小さな祠に供えられ、それから聖都の厨房へ運ばれていく。網を繕う女たちは、繕い目ごとに短い祈りを口の中で唱える。だから網はいつも少し長くかかる。",
      fac: ["inn", "tavern", "shop"],
      shop: ["q4_saltfish", "i3a_oilcoat", "i3w_trident", "jerky", "ale"],
      links: {},
    },
  });

  const L = D.LOCS;
  const link = (a, b, days) => { if (L[a] && L[b]) { L[a].links[b] = days; L[b].links[a] = days; } };
  link("w7_russen", "w3_bells", 1);
  link("w7_russen", "w2_granbel", 2);
  link("w7_russen", "plains", 2);
  link("w7_glatz", "karna", 1);
  link("w7_glatz", "w2_acid", 2);
  link("w7_durm", "ruins", 1);
  link("w7_durm", "forest", 2);
  link("w7_vinale", "nerva", 2);
  link("w7_vinale", "ruins", 2);
  link("w7_orbe", "w1_holy", 1);
  link("w7_melvi", "w2_granbel", 1);
  link("w7_melvi", "nerva", 2);
  link("w7_lumie", "w3_abbey", 1);
  link("w7_lumie", "w1_holy", 3);
  link("w7_serena", "w1_catacomb", 1);
  link("w7_serena", "w3_abbey", 2);
  link("w7_norve", "w3_abbey", 1);
  link("w7_norve", "nerva", 1);

  D.CLIMATE = Object.assign(D.CLIMATE || {}, {
    w7_russen: { rain: 0.3, fog: 0.4 },
    w7_glatz: { rain: 0.2, fog: 0.1 },
    w7_durm: { rain: 0.15, fog: 0.2 },
    w7_vinale: { rain: 0.15, fog: 0.15 },
    w7_orbe: { rain: 0.2, fog: 0.2 },
    w7_melvi: { rain: 0.35, fog: 0.35 },
    w7_lumie: { rain: 0.25, fog: 0.2 },
    w7_serena: { rain: 0.25, fog: 0.4 },
    w7_norve: { rain: 0.3, fog: 0.35 },
  });
})(globalThis.G = globalThis.G || {});
