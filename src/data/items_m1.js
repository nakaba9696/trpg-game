// M1：魔導書。読み解くと術を覚える（G.readTome）。読み終えても本は残る（売れる）。
// type "tome"、teach = 覚える術（D.SPELLS の鍵）、learn = 読み解く判定の難しさ（知力）
// レーン B＋C（M1）が管理。入手先（商店・敵の落とし物・出来事）もここで足す
(function (G) {
  const D = G.data;

  Object.assign(D.ITEMS, {
    m1_tome_ice: { name: "魔導書『霜の綴り』", type: "tome", teach: "ice", learn: "普通", price: 200, desc: "頁をめくるたびに指先が冷える。余白に、誰かへの礼の言葉が小さく書いてある。" },
    m1_tome_ward: { name: "祈祷書『白い垣根』", type: "tome", teach: "ward", learn: "易しい", price: 160, desc: "教会が売っている祈祷書。前書きには『主の恵み』とあるがどの主かは書いていない。" },
    m1_tome_bolt: { name: "写本『落雷の手順』", type: "tome", teach: "bolt", learn: "難しい", price: 320, desc: "学院の写本。蔵書印が削り取られている。元の本は、どこか人の手の届かない所にあるらしい。" },
    m1_tome_curse: { name: "黒い頁の束", type: "tome", teach: "curse", learn: "難しい", price: 90, desc: "綴じ紐のない紙の束。読むと読み返されているような気がする。" },
  });

  // ---------------------------------------------------------------- 商店
  const stock = { garmund: ["m1_tome_ice"], leavel: ["m1_tome_ward"] };
  Object.entries(stock).forEach(([loc, ids]) => { const L = D.LOCS[loc]; if (L) L.shop = [...(L.shop || []), ...ids]; });

  // ---------------------------------------------------------------- 敵の落とし物
  const drops = {
    warlock: [["m1_tome_curse", 0.15], ["m1_tome_bolt", 0.05]],
    e1_melted: [["m1_tome_ice", 0.05], ["m1_tome_bolt", 0.03]],
  };
  Object.entries(drops).forEach(([id, loot]) => { const e = D.ENEMIES[id]; if (e) e.loot = [...(e.loot || []), ...loot]; });

  // ---------------------------------------------------------------- 出来事
  D.EVENTS.push(
    {
      id: "m1_blackpage", where: ["dungeon"], w: 2, once: true, title: "壁の隙間の紙",
      text: "崩れた壁の隙間に、黒ずんだ紙が何枚も挟まっている。風もないのに、端がめくれたり戻ったりしている。",
      choices: [
        { label: "紙を抜き取る", ok: { text: "紙は思ったより素直に抜けた。手のひらにほんのり温かい。", item: "m1_tome_curse", memo: "遺跡の壁から黒い紙の束を持ち出した" } },
        { label: "書いてある文字を読んでみる", stat: "知力", diff: "難しい", ok: { text: "古い文字の並びに、ひとつだけ意味の分かる言葉があった。「返せ」。頭の奥が冴えた気がする。", grow: { 知力: 1, 魔力: 1 } }, ng: { text: "文字を追ううちに目が回った。紙の束はいつのまにか一枚減っていた。", hp: -2 } },
        { label: "触らずに通り過ぎる", ok: { text: "背中で紙のめくれる音が少し速くなった。" } },
      ],
    },
    {
      id: "m1_dropout", where: ["town"], w: 1, once: true, cond: (S) => S.loc !== "zephara", title: "学院くずれの露店",
      text: "路地の角で、すり切れた学院の外套を着た男が本を並べている。「写本だよ。本物より安い。本物より……ちょっとだけ危ない」",
      choices: [
        { label: "写本を買う（150G）", cost: 150, ok: { text: "男は代金を数えもせずに懐へ入れ、本を押しつけてきた。「利子はそっち持ちでね」", item: "m1_tome_bolt" } },
        { label: "身の上話を聞く", stat: "魅力", diff: "普通", bonus: "talk", ok: { text: "「借り先を怒らせてさ、術が一つも出なくなった。今はただの本屋だ」男は笑ったが指が震えていた。", memo: "学院くずれの男：術は借りたもので、貸し手を怒らせると出なくなるらしい" }, ng: { text: "「冷やかしなら帰りな」" } },
        { label: "立ち去る", ok: { text: "男はもう次の客を探していた。" } },
      ],
    },
  );
})(globalThis.G = globalThis.G || {});
