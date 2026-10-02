// U7：世界の手引き（用語集）は、物語で出てきたものだけ載せる。
// はじめから載るのは src/data/world.js の D.WORLD.start（出発の町・冒険者ギルド・金貨と暦）と判定のしくみだけ。
// それまで最初から載っていた国・教会・種族・遺跡の品・格・術・魔物の項目は、ここで D.LORE に移し、物語で出てきたときに一行ずつ開く。
// 書くのは、そのとき主人公が知り得ること（〔知〕〔噂〕）だけ。〔進〕〔秘〕は書かない（docs/lore/voice.md）。
// 書き方は src/data/lore_u3.js の頭の説明と同じ。節の名は world.js の節と同じにして、手引きでは同じ見出しの下に並べる（world.js の getter）。
// D.LORE_ON に足すきっかけ：loc・fac・foe・item・event（lore.js が見る）と、region（場所の地方）・nation（会った人物の国）・cls（職業）・race（会った人・自分の種族）
// （region 以下は src/engine/lore_u7.js が見る）。名前は lore_u3.js・lore_w2.js より後に読まれるようにしてある。レーン U（U7）が管理
(function (G) {
  const D = (G.data = G.data || {});
  if (!D.LORE || !D.LORE_ON || !D.LORE_SECS) return;

  // world.js の節の名。手引きでは、はじめから載る節と同じ見出しの下に並ぶ
  ["魔物", "人と暮らし", "大陸と国"].forEach((s) => { if (!D.LORE_SECS.includes(s)) D.LORE_SECS.unshift(s); });

  Object.assign(D.LORE, {
    // ---------------------------------------------------------------- 大陸と国
    u7_veld: { sec: "大陸と国", title: "ノクターラ", lines: [
      ["first", "南北に歩いて一月ほどの大陸。西が人の世界で、東の断界山脈より向こうは化け物の棲む土地だという。", { hint: ["使徒領", "化け物の棲む土地"] }],
      ["fort", "黒鉄の砦が、断界山脈を越えるただ一本の道を塞いでいる。", { hint: ["黒鉄の砦"] }],
    ] },
    u7_leonest: { sec: "大陸と国", title: "レオネスト王国", lines: [
      ["first", "西の豊かな平野の王国。名を上げた者は、騎士に取り立てられることがある。", { hint: ["騎士に取り立て"] }],
      ["king", "王の名はヴァレオン。よく城を空けて、化け物狩りに出歩いているらしい。", { hint: ["ヴァレオン"] }],
      ["ouji", "王の七人の子のうち上の六人が、六つの都をそれぞれ治めている。この国では、娘も「王子」と呼ばれる。"],
    ] },
    u7_nordia: { sec: "大陸と国", title: "ノルディア帝国", lines: [
      ["first", "北の雪と鉱山の軍事帝国。黒鉄の砦の兵の多くは、この国から来る。"],
      ["emperor", "皇帝は自ら戦場に立ち、使徒が降りてくれば北の防衛線へ出る。四騎士がそれぞれの陣を率い、一人娘の皇女がいる。", { hint: ["皇帝が自分で", "自ら北の", "皇女"] }],
    ] },
    u7_elmesia: { sec: "大陸と国", title: "エルメシア共和国", lines: [
      ["first", "人間・エルフ・獣人などの種族の代表が、合議で治める国。よそからは「魔法国」と呼ばれる。", { hint: ["魔法国"] }],
      ["seat", "精霊と契約した者だけが議席を持ち、契約のない者は門の外で暮らす。"],
    ] },
    u7_free: { sec: "大陸と国", title: "自由都市連合", lines: [
      ["first", "王国の中にありながら、王子さまから自治を許された商人と傭兵の町の寄り合い。いちばん大きいのはブランデール。王子さまへの上納金さえ払えば、口出しはされない。"],
      ["nerva", "港町ヴァレンツァは外海への自由港。金さえあれば、たいていの物は手に入る。"],
    ] },
    u7_yakumo: { sec: "大陸と国", title: "シェルアーク", lines: [
      ["first", "南西の海の島々の都。王国の第七王子の領地ということになっているが、島の者は王都より海を見て暮らしている。港町ヴァレンツァからの船で行ける。", { hint: ["シェルアーク"] }],
      ["land", "島ごとに顔役がいて、たいていのことは自分たちで決める。沖には、鬼の棲む岩の島もあるという。", { hint: ["鬼ヶ島", "鬼の島"] }],
    ] },
    u7_pact: { sec: "大陸と国", title: "三国の協定", lines: [
      ["first", "王国・帝国・共和国の三国は、不可侵の協定を十年ごとに結び直してきた。次の結び直しは1130年。", { hint: ["協定"] }],
      ["doubt", "どの国も結び直さない理由を探している、と砦の兵は言う。"],
    ] },

    // ---------------------------------------------------------------- 人と暮らし
    u7_races: { sec: "人と暮らし", title: "人と種族", lines: [
      ["elf", "エルフは長命で、森の奥で人とあまり交わらずに暮らしてきた。このごろは人の町でも見かける。共和国に多い。", { hint: ["エルフ"] }],
      ["beast", "獣人は人の町にすっかり馴染んでいて、人より力が強い。元になった獣で、体も気性もまるで違う。", { hint: ["獣人"] }],
      ["curse", "獣人は、獣憑きと一緒にされるのを何より嫌う。"],
    ] },
    u7_church: { sec: "人と暮らし", title: "光天教会", lines: [
      ["first", "どの町にもある教会。祭りも葬式も、教会が仕切る。"],
      ["three", "三柱の神さま――光と法と約束のソラスさま、幸運と笑いのネフィリアさま、死者の名を帳面に書き留めてくださるハルガさま――を祀る。"],
      ["verm", "その上に、世界を作った父なる神ヴェルムさまがいて、今は眠っておられる、と司祭は言う。", { hint: ["ヴェルム"] }],
    ] },
    u7_relic: { sec: "人と暮らし", title: "遺跡の品", lines: [
      ["first", "古い時代の遺跡からは、今では誰も作れない品が掘り出される。光る筒、ひとりでに動く人形、空を行く船のかけら。", { hint: ["遺物", "オーパーツ"] }],
      ["market", "ちゃんと動く物は、まず市には出ない。直せる職人もいない。"],
    ] },
    u7_rank: { sec: "人と暮らし", title: "格", lines: [
      ["first", "ギルドは化け物を三つに分ける。天災（人では勝てない）・国難（国の軍が要る）・討伐（一流の戦士が集まれば倒せる）。"],
      ["notice", "天災は、依頼ではなく注意書きとして貼られる。"],
    ] },
    u7_jutsu: { sec: "人と暮らし", title: "術", lines: [
      ["first", "魔法は悪魔のもので、人は生まれつき使えないという。それでも学院で学べば、少しだけ「術」を借りるように使える者がいる。", { hint: ["魔導書"] }],
      ["nations", "教会は術に眉をひそめ、共和国は認め、帝国は軍で管理している。"],
    ] },

    // ---------------------------------------------------------------- 魔物
    u7_fierce: { sec: "魔物", title: "凶暴な魔物", lines: [
      ["first", "ゴブリン、オーク、人狼、翼竜、動く死体、鬼。街道の外は安全ではない。"],
      ["horde", "断界山脈を越えれば、魔物は群れで来る、と砦の兵は言う。"],
    ] },
    u7_silly: { sec: "魔物", title: "間の抜けた魔物", lines: [
      ["first", "弱くて、妙に憎めない魔物もいる。"],
      ["dogu", "泥人形の「ドグー」には、矢が刺さらない。"],
      ["taru", "酒好きの「樽ゴブリン」は、樽ごと転がってくる。"],
      ["trade", "言葉を話し、人と取引する魔物も少なくない。"],
    ] },
  });

  // ---------------------------------------------------------------- きっかけ（今あるきっかけには足すだけ）
  const on = D.LORE_ON;
  const add = (g, k, t) => {
    const m = (on[g] = on[g] || {});
    m[k] = [].concat(m[k] == null ? [] : m[k], t);
  };

  // その地方の場所に初めて着いた（出発の町も、最初の手番の終わりに開く）
  const region = {
    "自由都市連合": "u7_free", "レオネスト王国": "u7_leonest", "ノルディア帝国": "u7_nordia", "エルメシア共和国": ["u7_elmesia", "u7_races:elf"],
    "シェルアーク": ["u7_yakumo", "u7_yakumo:land"], "人類の最前線": ["u7_veld:fort", "u7_nordia", "u7_pact:doubt", "u7_fierce:horde"],
    "人と魔の境": ["u7_veld", "u7_veld:fort", "u7_fierce:horde"], "使徒領": ["u7_veld", "u7_fierce:horde"], "光天教会領": ["u7_church", "u7_church:verm"],
  };
  Object.entries(region).forEach(([k, t]) => add("region", k, t));

  // 場所（同じ項目は、最初の行から順に並ぶように先に書く）
  [
    ["nerva", ["u7_free", "u7_free:nerva", "u7_yakumo"]],
    ["leavel", ["u7_leonest", "u7_leonest:king", "u7_leonest:ouji", "u7_pact"]],
    ["w2_granbel", ["u7_leonest", "u7_leonest:ouji"]], ["w2_dranherz", ["u7_leonest", "u7_leonest:ouji"]],
    ["garmund", ["u7_nordia", "u7_nordia:emperor", "u7_pact"]], ["w2_zalgros", ["u7_nordia", "u7_nordia:emperor"]],
    ["zephara", ["u7_elmesia", "u7_elmesia:seat", "u7_races:elf", "u7_pact"]],
    ["ruins", "u7_relic"],
  ].forEach(([k, t]) => add("loc", k, t));

  // 施設
  add("fac", "church", ["u7_church", "u7_church:three"]);
  add("fac", "academy", ["u7_jutsu", "u7_jutsu:nations"]);

  // 敵（格の高い敵・術を使う敵は src/engine/lore_u7.js が見る）
  add("foe", "dogu", ["u7_silly", "u7_silly:dogu"]);
  add("foe", "barrelgob", ["u7_silly", "u7_silly:taru"]);
  ["e1_crowngob", "e1_bowshroom", "e1_sweeper", "w1_tanuki"].forEach((k) => add("foe", k, "u7_silly"));
  add("foe", "e1_tollrat", ["u7_silly", "u7_silly:trade"]);
  add("foe", "c2_nora", "u7_races:beast");

  // 遺跡の品（D.ITEMS の relic: true も lore_u7.js が見る）
  add("item", "relic", ["u7_relic", "u7_relic:market"]);

  // 会った人物の国（C2 の人物の nation）・会った人の種族（自分・仲間・C2 の人物）・職業（島の剣士は海を渡ってきた。魔法使いは術を学んだ）
  D.LORE_ON.nation = Object.assign(D.LORE_ON.nation || {}, { "レオネスト": "u7_leonest", "ノルディア": "u7_nordia", "エルメシア": "u7_elmesia" });
  D.LORE_ON.race = Object.assign(D.LORE_ON.race || {}, { elf: "u7_races:elf", beast: "u7_races:beast" });
  D.LORE_ON.cls = Object.assign(D.LORE_ON.cls || {}, { samurai: ["u7_yakumo", "u7_yakumo:land"], mage: "u7_jutsu" });
})(globalThis.G = globalThis.G || {});
