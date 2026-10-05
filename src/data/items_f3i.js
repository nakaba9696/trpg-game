// F3：癖のある品と、珍しい掘り出し物。強いが条件や代償がある品・組み合わせで化ける品・持っているだけで値打ちのある珍品。
// 仕組みは src/engine/zzzzzzzz_f3i_finds.js（core.js・combat.js は書き換えず、装備の引き方を包む）。
// quirk：[{ when, on, off }] … when が満ちているあいだ on を、満ちていないあいだ off を足す（どちらも省ける）。
//   when："night"（夕と夜）・"day"（朝と昼）・"wet"（雨・雪・霧）・"dry"（晴れ）・"alone"（仲間なし）・"party"（仲間あり）・
//         "poor"（所持金が少ない）・"rich"（所持金が多い）・"hurt"（HP が三分の一以下）・"sinful"・"pure"（C10 の罪と善行）・
//         "stat:筋力" と need（その能力値の今の点が need に届いている。F3 の節目とつながる）・"pair:<品の id>"（その品も持っている・身に着けている）
//   on / off の欄：dmg（攻撃の加算）・hit・vital・first・magic・drain・def・agi・stats { 能力値 }・bonus { 行動の種類 }（I3 と同じ書き方）
// hint：品の札に出す、癖の手がかり（世界の言葉で。数は書かない）。f3find：掘り出し物の印（店の「今日の品」にごくまれに並ぶ。図鑑の文）
// 説明文は由来の断片（docs/lore/voice.md）。レーン I（F3）。id は f3i_
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ITEMS, {
    // ---------------------------------------------------------------- 癖のある武器
    f3i_moonedge: {
      name: "月夜の刃", type: "weapon", dmg: [1, 6, 2], stat: "敏捷", hit: 5, vital: 5, price: 420, f3find: true,
      quirk: [{ when: "night", on: { dmg: 3, vital: 15 }, off: { hit: -10 } }],
      hint: "日が落ちると冴え、昼の光の下では鈍る",
      desc: "月の出ている夜にしか研げない砥石で研がれた刃。研ぎ師は、満月の晩に死んだ。昼に抜くと、刃がどこにあるのか分かりにくい。",
    },
    f3i_brokeblade: {
      name: "文無しの剣", type: "weapon", dmg: [1, 8, 1], stat: "筋力", hit: 0, price: 160, f3find: true,
      quirk: [{ when: "poor", on: { dmg: 4, hit: 10 } }, { when: "rich", on: { hit: -15 } }],
      hint: "懐が寒いほど鋭く、重い財布を嫌う",
      desc: "賭場で有り金をすった剣士が、最後に残した剣。柄に、借金の証文が一枚巻きつけてある。剥がそうとすると、刃が鳴る。",
    },
    f3i_rainstaff: {
      name: "雨乞いの杖", type: "weapon", dmg: [1, 4, 0], stat: "筋力", hit: -5, magic: 5, price: 380, f3find: true,
      quirk: [{ when: "wet", on: { magic: 20, bonus: { ice: 15, bolt: 15 } } }, { when: "dry", on: { magic: -5 } }],
      hint: "空が泣く日に、術が通る",
      desc: "日照りの村で、雨乞いの祈祷師が握っていた杖。雨は降った。七日七晩、止まなかった。木目が、いつも少し湿っている。",
    },
    f3i_giantmaul: {
      name: "巨人の槌", type: "weapon", dmg: [2, 10, 4], stat: "筋力", hit: -25, price: 520, f3find: true,
      quirk: [{ when: "stat:筋力", need: 30, on: { hit: 25, first: -10 } }],
      hint: "並の腕では振り回されるだけ。剛力の者なら",
      desc: "山の向こうで拾われた槌。人の手で振るうために作られた物ではない。柄に残った指の跡は、あなたの手の倍ある。",
    },
    f3i_windbow: {
      name: "風切りの短弓", type: "weapon", dmg: [1, 8, 2], stat: "敏捷", hit: -10, price: 360, f3find: true,
      quirk: [{ when: "stat:敏捷", need: 30, on: { hit: 20, first: 40 } }],
      hint: "弦が硬い。疾風の手でなければ引き絞れない",
      desc: "草原の騎手が使っていた短弓。弦は馬の尾の毛を千本撚ったもの。引くと、指の皮が先に音を上げる。",
    },
    // ---------------------------------------------------------------- 癖のある防具
    f3i_brinkmail: {
      name: "瀬戸際の鎖", type: "armor", def: 1, agi: 0, price: 340, f3find: true,
      quirk: [{ when: "hurt", on: { def: 4 } }],
      hint: "追い詰められるほど、固く締まる",
      desc: "処刑台から逃げ延びた男の鎖帷子。首の鎖を延ばして編み足したという。危ないときほど、肌に食いこむ。",
    },
    f3i_saintmail: {
      name: "聖女の帷子", type: "armor", def: 2, agi: 0, magic: 5, price: 450, f3find: true,
      quirk: [{ when: "pure", on: { def: 2, bonus: { heal: 15 } } }, { when: "sinful", on: { def: -2, magic: -5 } }],
      hint: "清い者を守り、汚れた手を拒む",
      desc: "巡礼の聖女が、最後の旅に着ていた白い帷子。血の染みは、何度洗っても落ちない。落とさないほうがいい、と司祭は言った。",
    },
    // ---------------------------------------------------------------- 癖のある装飾品
    f3i_lonefang: {
      name: "はぐれ狼の牙", type: "ring", stats: { 敏捷: 3 }, price: 300, f3find: true,
      quirk: [{ when: "alone", on: { stats: { 筋力: 6, 敏捷: 6 }, first: 20 } }, { when: "party", on: { stats: { 魅力: -9 } } }],
      hint: "群れを離れた者に力を貸し、群れる者を嫌う",
      desc: "群れを追われた狼の牙を、革紐で吊るした首飾り。誰かと並んで歩くと、胸もとで小さく唸る。",
    },
    f3i_singlove: {
      name: "罪人の手袋", type: "ring", bonus: { steal: 15, trap: 10 }, price: 260, f3find: true,
      quirk: [{ when: "sinful", on: { stats: { 敏捷: 9 }, bonus: { steal: 15 } } }, { when: "pure", on: { bonus: { steal: -15, trap: -10 } } }],
      hint: "汚れた手によく馴染む",
      desc: "牢で死んだ名うての盗人の手袋。指先だけ、革が擦り切れて薄い。清い手には、なぜか大きすぎる。",
    },
    f3i_sagecirclet: {
      name: "賢者の額冠", type: "ring", stats: { 知力: 3 }, price: 480, f3find: true,
      quirk: [{ when: "stat:知力", need: 45, on: { magic: 15, bonus: { fire: 10, heal: 10 } } }],
      hint: "千里眼の者が着けると、額の石が目を開く",
      desc: "学院の初代学長の額冠と伝わる。額の石は閉じた目の形をしている。開いたところを見た者は、学院にも数えるほどしかいない。",
    },
    // ---------------------------------------------------------------- 組み合わせで化ける品
    f3i_twinblade: {
      name: "鞘を失くした刀", type: "weapon", dmg: [1, 8, 3], stat: "筋力", hit: -10, price: 400, f3find: true,
      quirk: [{ when: "pair:f3i_twinsheath", on: { hit: 20, dmg: 2, first: 30 } }],
      hint: "落ち着きがない。帰る場所を探している",
      desc: "島の刀鍛冶が、対の鞘と一緒に打った刀。鞘は戦の最中に失われた。刀は、それからずっと手の中で落ち着かない。",
    },
    f3i_twinsheath: {
      name: "刀の無い鞘", type: "gear", price: 120, f3find: true,
      hint: "中身を待っている",
      desc: "黒漆の鞘。中身は無い。どの刀を入れても、少しだけ合わない。鯉口に、島の鍛冶の印が小さく彫ってある。",
    },
    f3i_flintgauntlet: {
      name: "火打ちの籠手", type: "ring", bonus: { fire: 5 }, price: 220, f3find: true,
      quirk: [{ when: "pair:grimoire", on: { magic: 10, bonus: { fire: 20 } } }],
      hint: "火の章を読む者の手で、火花が散る",
      desc: "指の節に火打ち石を嵌めた籠手。拳を握ると、ちいさな火花が散る。それだけの品だと、店主は言った。",
    },
    // ---------------------------------------------------------------- 珍品（売り物。持っていると、蒐集家が欲しがる）
    f3i_mermaidtear: { name: "人魚の涙", type: "loot", price: 400, f3find: true, curio: true, desc: "海の色をした、雫の形の石。耳に当てると、遠くで誰かが泣いている。泣き止むことはない。" },
    f3i_starseed: { name: "星の落とし子", type: "loot", price: 500, f3find: true, curio: true, desc: "夜空から落ちてきたという、黒い小石。手のひらに載せると、ほんの少し上へ引っ張られる。" },
    f3i_kingcoin: { name: "滅んだ王国の金貨", type: "loot", price: 350, f3find: true, curio: true, desc: "見たことのない王の横顔。裏の字は誰にも読めない。かじると、金ではない味がする。歯形は、なぜか翌朝には消えている。" },
    f3i_dragonegg: { name: "化石になった卵", type: "loot", price: 600, f3find: true, curio: true, desc: "抱えるほどの石の卵。耳を当てると、ごく稀に、中で何かが寝返りを打つ。翼竜は、この卵のそばでだけ鳴かない。" },
  });

  // 敵の落とし物に、ごく稀に混ぜる（どの敵が何を持っているかは、噂で分かる）
  const drop = (foe, id, p) => { const e = D.ENEMIES && D.ENEMIES[foe]; if (e) e.loot = [...(e.loot || []), [id, p]]; };
  drop("werewolf", "f3i_lonefang", 0.05);
  drop("banditboss", "f3i_brokeblade", 0.08);
  drop("ninja", "f3i_moonedge", 0.06);
  drop("warlock", "f3i_singlove", 0.06);
  drop("ogre", "f3i_giantmaul", 0.05);
  drop("blackknight", "f3i_brinkmail", 0.06);
  drop("mimic", "f3i_kingcoin", 0.15);
  drop("spider", "f3i_starseed", 0.02);
  drop("wyvern", "f3i_dragonegg", 0.03);
  drop("e4_shellwitch", "f3i_mermaidtear", 0.08);
  drop("w3_drowned", "f3i_mermaidtear", 0.04);

  // 店の「今日の品」にごくまれに並ぶ掘り出し物（珍品は並ばない。どの町かは日と人物で決まる）
  D.F3I = D.F3I || {};
  D.F3I.MARKET = ["f3i_moonedge", "f3i_rainstaff", "f3i_windbow", "f3i_saintmail", "f3i_sagecirclet", "f3i_twinsheath", "f3i_flintgauntlet", "f3i_brinkmail", "f3i_giantmaul"];
  D.F3I.MARKET_ODDS = 0.18;    // 一つの町の一日に、掘り出し物が並ぶ見込み
  D.F3I.MARKET_MARKUP = 1.3;   // 掘り出し物は少し高い

  // 図鑑の入手先（コードの中で渡している物）。I2 の説明は、由来の文をそのまま使う
  D.F2_ITEM_WHERE = D.F2_ITEM_WHERE || {};
  const where = (id, t) => { D.F2_ITEM_WHERE[id] = [].concat(D.F2_ITEM_WHERE[id] || [], t); };
  D.F3I.MARKET.forEach((id) => where(id, "商店の掘り出し物（ごくまれに）"));
  D.I2_FLAVOR = D.I2_FLAVOR || {};
  Object.keys(D.ITEMS).filter((id) => id.startsWith("f3i_")).forEach((id) => { if (!D.I2_FLAVOR[id]) D.I2_FLAVOR[id] = D.ITEMS[id].desc; });

  // 噂（どこで何が出るか）
  D.RUMORS = D.RUMORS || [];
  D.RUMORS.push(
    "人狼の群れからはぐれた一匹は、牙に妙な紐を巻いてるんだと。群れに戻れないわけだよ。",
    "山賊の頭ってのは、たいてい賭場で身を持ち崩した奴さ。剣だけは手放さねえ。",
    "はぐれ忍の刃は夜になると見えなくなるらしい。昼に斬られた奴は、だいたい生きて帰ってくる。",
    "呪術師の手袋をはめた盗人は、牢の鍵も素手で開けたってさ。",
    "宝箱に化ける魔物の腹からは、見たこともない王様の金貨が出るって話だ。",
    "シェルアーク諸島の島の刀鍛冶が打った対の刀と鞘、片方ずつ大陸に流れてるらしいぜ。揃えた奴はいないけどな。",
    "店の隅に、値打ちの分からない品がまぎれてることがある。古物屋の目は、案外節穴だ。",
    "翼竜の巣の奥に、石になった卵がある。蒐集家が目の色を変えて欲しがる代物だ。",
    "珍しい物を集めてる変わり者が、町から町を渡り歩いてる。人魚の涙なんか持ってったら、家が一軒建つぞ。",
  );

  // ---------------------------------------------------------------- 掘り出し物の出来事
  const has = (S, id) => !!((S.inv && S.inv[id] > 0) || (G.i2s ? G.i2s.wears(S, id) : S.weapon === id || S.armor === id || S.ring === id));
  const CURIOS = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].curio);
  const curios = (S) => CURIOS.filter((id) => S.inv && S.inv[id] > 0);
  D.F3I.CURIOS = CURIOS;
  D.F3I.TRADE = ["f3i_moonedge", "f3i_rainstaff", "f3i_windbow", "f3i_saintmail", "f3i_sagecirclet", "f3i_flintgauntlet", "f3i_lonefang", "f3i_singlove", "f3i_brokeblade", "f3i_brinkmail"];
  D.F3I.TRADE.forEach((id) => { D.F2_ITEM_WHERE[id] = [].concat(D.F2_ITEM_WHERE[id] || [], "珍品の蒐集家と取り替える"); });
  D.EVENTS.push(
    {
      id: "f3i_shrine", where: ["yakumo", "w1_oboro"], w: 2, once: true, title: "鞘を祀る祠", who: "elder",
      text: "島の外れの小さな祠に、抜き身の刀が一本、横たえて祀ってある。番をしている老人が言う。「鞘を失くした刀は、人を斬りたがる。鞘が見つかるまで、ここで寝かせておくのさ」",
      choices: [
        { label: "鞘を持っていると言って、刀を譲り受ける", cond: (S) => has(S, "f3i_twinsheath"), ok: { text: "黒漆の鞘を見せると、老人は目を見開き、刀を両手で差し出した。刀を鞘に納めると、かちりと、長い長い息のような音がした。", item: "f3i_twinblade", chron: "島の祠で、対の刀を鞘に納める" } },
        { label: "刀を買い取る（300G）", cost: 300, ok: { text: "老人は渋い顔で銀貨を数えた。「鞘が無けりゃ、そいつは暴れるぞ。覚悟しな」刀は、手の中で落ち着かなかった。", item: "f3i_twinblade", memo: "島の祠の刀は、対の鞘を探している" } },
        { label: "手を合わせて立ち去る", ok: { text: "刀は、あなたが去るまでじっとこちらを見ていた気がした。", memo: "島の祠の刀は、対の鞘を探している" } },
      ],
    },
    {
      id: "f3i_collector", where: ["town"], w: 2, title: "珍品の蒐集家", cond: (S) => curios(S).length > 0, who: "merchant",
      text: "宿の前で、派手な帽子の男が呼び止めた。「失礼。あなたの荷から、珍しい物の匂いがする」男は、あなたの荷袋を見つめたまま、ごくりと喉を鳴らした。",
      choices: [
        ...CURIOS.map((id) => ({ label: `${D.ITEMS[id].name}を金に換える`, cond: (S) => has(S, id),
          ok: { text: `男は${D.ITEMS[id].name}を手のひらに載せ、しばらく黙ってから、財布を丸ごと差し出した。「足りなければ、言ってくれ」`, remove: id, gold: Math.round(D.ITEMS[id].price * 1.6) } })),
        { label: "珍品を一つ、男の持ち物と取り替える", ok: { text: "男は鞄の底から、布にくるんだ品を出した。「これと、あなたの珍しい物を」", f3iTrade: true } },
        { label: "売り物ではないと断る", ok: { text: "男は帽子を胸に当てて、残念そうに引き下がった。「気が変わったら、また会いましょう。わたしは、どの町にもいるので」" } },
      ],
    },
  );
})(globalThis.G = globalThis.G || {});
