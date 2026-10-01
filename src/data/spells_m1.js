// M1：魔法の種類（氷・雷・呪い・加護）と、覚え方（学院・魔導書）。レーン B＋C が管理
// 炎と癒しは誰でも使える（base）。ほかは覚えた者だけが使える（S.spells）。
//   mp = 消費 MP、diff = 判定の難しさ（魔力）、bonus = gearBonus の種類
//   debt = 大失敗したときに返す「借り」の重さ（G.payDebt）。大きな術ほど重い
//   school = 学院で教わるときの { gold, diff（知力）, days }。無ければ学院では教えない
// 人間の魔法は借り物（docs/lore/strata.md 5）。プレイヤーに見せる文では説明せず、匂わせるだけにする
(function (G) {
  const D = G.data;

  D.SPELLS = {
    fire: { name: "炎の魔法", mp: 3, base: true },
    heal: { name: "癒しの奇跡", mp: 3, base: true },
    ice: {
      name: "氷の魔法", mp: 3, diff: 0, bonus: "ice", debt: 1, hint: "当たれば敵が凍りつき、次の攻撃を止める",
      school: { gold: 120, diff: "普通", days: 3 }, kw: ["氷", "凍", "冷"],
    },
    bolt: {
      name: "雷の魔法", mp: 5, diff: -10, bonus: "bolt", debt: 2, hint: "敵すべてを打つ",
      school: { gold: 300, diff: "難しい", days: 5 }, kw: ["雷", "稲妻", "電"],
    },
    curse: {
      name: "呪いの言葉", mp: 4, diff: 0, bonus: "curse", debt: 2, hint: "敵を三手番のあいだ弱らせ、少しずつ蝕む",
      kw: ["呪", "蝕"],
    },
    ward: {
      name: "加護の祈り", mp: 3, diff: "易しい", bonus: "ward", debt: 1, hint: "三手番のあいだ、受けるダメージを減らす",
      school: { gold: 100, diff: "易しい", days: 2 }, kw: ["加護", "守りの", "結界"],
    },
  };

  // 職業ごとに、はじめから覚えている術
  D.SPELL_START = { mage: ["ice"], priest: ["ward"] };

  // 学院はエルメシアにある
  if (D.LOCS.zephara && !D.LOCS.zephara.fac.includes("academy")) D.LOCS.zephara.fac.push("academy");

  // 学院の講師の口癖（匂わせ。説明はしない）
  D.ACADEMY_LINES = [
    "老講師は板書を消しながら言った。「術は借りたものだ。借りたら、返す。それだけ覚えておきなさい」",
    "講師は、誰から借りているのかという質問には答えなかった。代わりに、天井の染みをしばらく見上げていた。",
    "隣の席の学生が小声で言った。「うまくいかない日は、向こうの機嫌が悪いんだってさ」",
    "講義の終わりに、講師は書庫の奥の扉に向かって、小さく会釈をした。",
  ];
})(globalThis.G = globalThis.G || {});
