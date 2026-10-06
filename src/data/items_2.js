// I1：武器・防具・装飾品を15種。入手先（商店・敵の落とし物・出来事）もここで足す。
// ring（装飾品）: 指にはめて効く。1つだけ付けられる（S.ring）
//   stats = { 能力値: 補正 }（判定に効く）、bonus = { 行動の種類: 補正 }（gear と同じ）、magic = 魔法の成功率
//   cursed = 外すと指の皮ごと持っていかれる（HP が減る）
// レーン I（アイテム）が管理
(function (G) {
  const D = G.data;

  Object.assign(D.ITEMS, {
    // ---------------------------------------------------------------- 武器
    i1_spoon: { name: "使徒の匙", type: "weapon", dmg: [1, 8, 1], stat: "筋力", hit: 0, price: 80, desc: "使徒が食後に放り投げた匙。人の手には長剣ほどもある。まだ少しスープの匂いがする。" },
    i1_chickenflail: { name: "鳴き鶏のフレイル", type: "weapon", dmg: [2, 4, 0], stat: "筋力", hit: -5, price: 45, desc: "鎖の先に鉄の鶏。当たるたびにコケッと鳴る。作った鍛冶屋は本気だった。" },
    i1_umbrella: { name: "仕込み番傘", type: "weapon", dmg: [1, 6, 2], stat: "敏捷", hit: 5, vital: 10, price: 160, desc: "開けば雨よけ、抜けば刃。島の都シェルアークの粋人が好む。" },
    i1_scythe: { name: "見習い死神の大鎌", type: "weapon", dmg: [2, 6, 1], stat: "筋力", hit: -10, vital: 5, price: 260, desc: "刃に『実習用』と彫ってある。持ち主はどこかで叱られているだろう。" },
    i1_baton: { name: "気まぐれ神の指揮棒", type: "weapon", dmg: [1, 4, 0], stat: "筋力", hit: -5, magic: 15, price: 300, desc: "神さまの持ち物だった、と露店の男は言い張る。振ると、どこかで誰かが拍子を取る気がする。魔法がよく通る。" },

    // ---------------------------------------------------------------- 防具
    i1_potlid: { name: "鍋ぶたの胸当て", type: "armor", def: 1, agi: 5, price: 35, desc: "鍋ぶたを紐で胸に括りつけたもの。軽い。見た目は気にするな。" },
    i1_mirrorplate: { name: "見栄っ張りの鏡鎧", type: "armor", def: 2, agi: -5, price: 180, desc: "磨き上げた鏡の鎧。持ち主だった騎士は、自分に見とれて崖から落ちた。" },
    i1_onihaori: { name: "鬼皮の羽織", type: "armor", def: 3, agi: -5, price: 280, desc: "鬼の皮をなめした羽織。刃が滑る。少し獣くさい。" },
    i1_majincoat: { name: "使徒の脱ぎ捨てた外套", type: "armor", def: 3, agi: 0, magic: 5, price: 600, desc: "暑かったらしい。使徒にとっては肌着、人間にとっては鎧。" },

    // ---------------------------------------------------------------- 装飾品
    i1_fangring: { name: "牙の指輪", type: "ring", stats: { 筋力: 5 }, price: 120, desc: "筋力+5。獣の牙を削った指輪。握る拳に力がこもる。" },
    i1_foxring: { name: "狐火の指輪", type: "ring", bonus: { fire: 10 }, magic: 5, price: 150, desc: "炎の魔法+10・魔法+5。石の奥で青い火が揺れている。" },
    i1_slipring: { name: "すり抜けの指輪", type: "ring", stats: { 敏捷: 5 }, bonus: { steal: 10 }, price: 180, desc: "敏捷+5・盗み+10。指がつるりと細くなる。人の財布にもつるりと入る。" },
    i1_frogring: { name: "蛙王の求婚指輪", type: "ring", bonus: { talk: 15 }, price: 100, desc: "話術+15。沼の王が求婚に使った指輪。少しぬるぬるする。" },
    i1_eyering: { name: "覗き目の指輪", type: "ring", stats: { 知力: 10, 魅力: -10 }, cursed: true, price: 60, desc: "知力+10・魅力-10。台座の目玉がきょろきょろ動く。呪われている。" },
    i1_apostlering: { name: "使徒の指輪（大きすぎる）", type: "ring", stats: { 体力: 5, 魔力: 5 }, price: 400, desc: "体力+5・魔力+5。使徒の小指用。人間は親指にはめるしかない。" },
  });

  // ---------------------------------------------------------------- 商店
  const stock = {
    karna: ["i1_chickenflail", "i1_potlid"],
    nerva: ["i1_frogring"],
    leavel: ["i1_mirrorplate"],
    garmund: ["i1_mirrorplate"],
    fort: ["i1_fangring"],
    zephara: ["i1_baton", "i1_foxring"],
    yakumo: ["i1_umbrella"],
  };
  Object.entries(stock).forEach(([loc, ids]) => { const L = D.LOCS[loc]; if (L) L.shop = [...(L.shop || []), ...ids]; });

  // ---------------------------------------------------------------- 敵の落とし物
  const drops = {
    bandit: [["i1_potlid", 0.05]],
    oni: [["i1_onihaori", 0.08]],
    warlock: [["i1_scythe", 0.1]],
    ninja: [["i1_slipring", 0.1]],
    kin: [["i1_apostlering", 0.1]],
  };
  Object.entries(drops).forEach(([id, loot]) => { const e = D.ENEMIES[id]; if (e) e.loot = [...(e.loot || []), ...loot]; });

  // ---------------------------------------------------------------- 出来事
  D.EVENTS.push(
    {
      id: "i1_spoon", where: ["wild"], w: 2, once: true, title: "空から降ってきた匙",
      text: "頭上を、城ほどもある影が横切った。遠くで欠伸のような音がして、何かが回りながら落ちてくる。地面に突き刺さったのは、あなたの背丈ほどもある銀の匙だった。",
      choices: [
        { label: "引き抜く", stat: "筋力", diff: "普通", ok: { text: "渾身の力で引き抜いた。重いが、振れないことはない。柄に歯形がついている。", item: "i1_spoon" }, ng: { text: "びくともしない。踏ん張った拍子に腰を痛めた。影の主は、あなたの存在にすら気づいていない。", hp: -3 } },
        { label: "見なかったことにする", ok: { text: "使徒の食器に関わって、ろくなことがあるはずがない。あなたは足早に立ち去った。" } },
      ],
    },
    {
      id: "i1_eyering", where: ["dungeon"], w: 2, once: true, title: "目の合う指輪",
      text: "白骨の指に、指輪がはまったままになっている。台座の目玉が、ぎょろりとあなたを見た。……まばたきをした。",
      choices: [
        { label: "指輪を抜き取る", ok: { text: "骨の指ごと外れた。目玉は嬉しそうにあなたを見上げている。嫌な予感しかしない。", item: "i1_eyering", memo: "骸骨から目玉の指輪を取った。呪われているかもしれない" } },
        { label: "目玉を睨み返す", stat: "知力", diff: "難しい", ok: { text: "目玉が先に目を逸らした。勝った。……何に勝ったのかは分からないが、頭が冴えた気がする。", grow: { 知力: 2 } }, ng: { text: "睨み合ううちに目が回った。気づけば床に倒れていて、目玉は笑うように細まっていた。", hp: -2 } },
        { label: "そっと立ち去る", ok: { text: "目玉の視線が背中に張りついたまま、あなたは通路を曲がった。" } },
      ],
    },
    {
      id: "i1_majincoat", where: ["realm", "dungeon"], w: 1, once: true, cond: (S) => S.fame >= 50, title: "脱ぎ捨てられた外套",
      text: "岩に、黒い外套が引っかけてある。持ち主は近くの丘で、何かの群れを相手に暴れているらしい。「暑い、暑い」と文句を言う声が、雷のように響いてくる。",
      choices: [
        { label: "外套を盗む", stat: "敏捷", diff: "難しい", bonus: "steal", ok: { text: "外套を抱えて全力で逃げた。背後で「あれ、どこ置いたっけ」という声がしたが、追ってはこなかった。", item: "i1_majincoat", chron: "使徒の外套をくすねる" }, ng: { text: "持ち主がふいにこちらを向いた。目が合う前に、あなたは吹き飛ばされていた。……ただの寝返りの風圧だった。", hp: -8 } },
        { label: "裾を切り取るだけにする", stat: "敏捷", diff: "普通", ok: { text: "端切れですら、上等な布の何倍もの値がつくだろう。", gold: 120 }, ng: { text: "刃が通らない。布の方が硬い。", hp: -2 } },
        { label: "関わらない", ok: { text: "人間が使徒の服に触れて、無事で済んだ話は聞かない。" } },
      ],
    },
    {
      id: "i1_frog", where: ["swamp"], w: 2, once: true, title: "蛙王の求婚",
      text: "王冠をかぶった大きな蛙が、あなたの前にひざまずいた。差し出した水かきの上に、金の指輪が光っている。「ゲコ。婚姻を申し込む。沼の半分をやろう」",
      choices: [
        { label: "指輪だけ受け取って丁重に断る", stat: "魅力", diff: "普通", bonus: "talk", ok: { text: "「……友情の証、か。よかろう」蛙王は涙ぐみながら指輪を置いていった。", item: "i1_frogring" }, ng: { text: "「弄んだな！」蛙王の家来が一斉に飛びかかってきた。", fight: ["@pool"] } },
        { label: "求婚を受ける", ok: { text: "場が静まり返った。蛙王は三日三晩宴を開き、四日目の朝、「やはり種族の壁は厚い」と言って指輪と引き出物を持たせてくれた。", item: "i1_frogring", gold: 30, days: 3, memo: "沼の蛙王と三日だけ夫婦だった" } },
        { label: "逃げる", ok: { text: "背後で「ゲコォォ」と悲痛な声が響いた。" } },
      ],
    },
  );
})(globalThis.G = globalThis.G || {});
