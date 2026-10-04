// キャラクター作成（U5）：年齢・生まれの表と、始まりの導入の文。
// 導入は世界を説明しない（#1 の持ち主の方針）。主人公の暮らしの一場面と、名前・仕事・悩みのある人と、説明のつかない物（断片）だけ。
// 神々・魔王・使徒の正体や数や名前、古い国の滅びは書かない。信仰は暮らしの小物（お守り・鈴・供え物）として置くだけ。レーン C（キャラクター）が管理
(function (G) {
  const D = (G.data = G.data || {});

  // 年齢。mod は能力値の補正（点に書き直すのは src/data/zs2_points.js）。cap は使わない（能力値ごとの上限は無い。S2）
  D.AGES = {
    young: {
      name: "若者", range: [16, 22],
      blurb: "体は軽い。世間のことは、まだよく知らない。",
      mod: { 体力: 3, 敏捷: 3, 知力: -3, 魅力: -3 }, cap: 5,
    },
    prime: {
      name: "壮年", range: [23, 39],
      blurb: "いちばん脂の乗った年頃。得も損もない。",
      mod: {}, cap: 0,
    },
    old: {
      name: "老境", range: [40, 62],
      blurb: "体は衰えたが、知恵と面の皮は厚い。",
      mod: { 筋力: -4, 体力: -4, 敏捷: -3, 知力: 5, 魔力: 3, 魅力: 3 }, cap: -5,
    },
  };

  // 生まれ。culture は名前の響き、blurb は作成画面の一行、mod は能力値の補正
  D.ORIGINS = {
    karna: {
      name: "自由都市ブランデール", short: "ブランデール", culture: "west",
      blurb: "冒険者ギルドの本部がある商人の町。話はまず値段から始まる。",
      mod: { 魅力: 2, 知力: 1 },
    },
    nerva: {
      name: "港町ヴァレンツァ", short: "ヴァレンツァ", culture: "west",
      blurb: "霧と潮と密輸の港。人も、人でない者も、船で来て船で去る。",
      mod: { 敏捷: 2, 体力: 1 },
    },
    leavel: {
      name: "王都レオネスト", short: "レオネスト", culture: "west",
      blurb: "白い城壁の王都。大通りは花で飾られ、裏通りは借金取りが歩く。",
      mod: { 魅力: 2, 魔力: 1 },
    },
    garmund: {
      name: "帝都ノルディア", short: "ノルディア", culture: "west",
      blurb: "北の雪の帝都。言葉は短く、冬は長い。",
      mod: { 体力: 2, 筋力: 1 },
    },
    zephara: {
      name: "首都エルメシア", short: "エルメシア", culture: "west",
      blurb: "水晶塔の都。塔の上の人たちの顔は、門の外からはよく見えない。",
      mod: { 魔力: 2, 知力: 1 },
    },
    fort: {
      name: "黒鉄の砦", short: "砦", culture: "west",
      blurb: "山脈を越える道を塞ぐ砦。兵舎と鍛冶場と、やけに広い墓地がある。",
      mod: { 筋力: 2, 体力: 1 },
    },
    yakumo: {
      name: "シェルアークの島", short: "島", culture: "yakumo",
      blurb: "南西の海の島々の都。本土の言葉には訛りが出る。",
      mod: { 敏捷: 1, 筋力: 1, 魅力: 1 },
    },
    village: {
      name: "辺境の村", short: "辺境", culture: "west",
      blurb: "地図に名前の載らない村。何でも自分でやるしかない。",
      mod: { 体力: 1, 敏捷: 1, 知力: 1 },
    },
  };

  // 職業ごとの、はじめの生まれ（職業を選ぶと、生まれがこれに寄る）
  D.CLASS_ORIGIN = { merc: "karna", thief: "nerva", mage: "zephara", priest: "leavel", samurai: "yakumo" };

  // ---------------------------------------------------------------- 導入の文
  // 状況の概要だけの短い 1 頁（持ち主の決定）：あなたは誰か・今どこにいるか・何を目指しているか。情景・思い出・行き先の手がかりは書かない。
  // {name}・{age}・{cls}・{origin}・{place}・{text} を入れる。生まれの分からない古い人物は whoNoOrigin、生まれた町から出るときは arriveHome
  D.PROLOGUE = {
    who: "あなたは{name}。{age}歳の{cls}で、{origin}の生まれだ。",
    whoNoOrigin: "あなたは{name}。{age}歳の{cls}だ。",
    arrive: "いま、{place}に着いたところだ。",
    arriveHome: "いま、生まれ育った{place}で、旅立ちの朝を迎えた。",
    goal: "目指すのは、{text}こと。",
    custom: "胸にある誓いは、ひとつだけ。「{text}」",
  };
})(globalThis.G = globalThis.G || {});
