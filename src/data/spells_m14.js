// M14：魔法の作り直し。属性 × 段階（初級・中級・上級）と、術の才（覚えられる人と覚えられない人）・得意と苦手な属性。
// spells_m1.js の D.SPELLS（炎・癒し・氷・雷・呪い・加護）はそのまま初級として残し（id は変えない。古いセーブの S.spells が読める）、中級・上級を足す。
// 名前の spells_m14 は spells_m1.js のあとに読むため。仕組みは src/engine/m14_magic.js、画面は src/ui/zm14_magic.js。レーン B＋C（M14）
//
// D.SPELLS の欄（M1 の欄に足したもの）：
//   el = 属性（D.M14_ELEMS の鍵）、tier = 段（1 初級・2 中級・3 上級）、fx = 効き目の中身（m14_magic.js が読む。M1 の 6 つは combat.js が動かす）
//   school = 学院の講義（初級だけ）。debt = 大失敗の借り（上の段ほど重い）
// 術の才（S.magic = { lv, good: [属性], bad: [属性] }）：
//   lv 0 才なし（術を覚えられない）／1 人並み／2 抜きん出た才／3 百年に一人。得意な属性は lv の数だけ（高い者ほど多い）
//   得意 … 上級まで届く・覚えやすい・成功しやすい。ふつう … 中級まで。苦手 … 初級止まり・覚えにくい・しくじりやすい
//   古いセーブ（S.magic が無い）は「人並み・職業の属性が得意」として扱い、炎と癒しも使える（今まで誰でも使えたので）
// 人間の魔法は借り物（docs/lore/strata.md 5）。プレイヤーに見せる文では説明せず、匂わせるだけにする
(function (G) {
  const D = G.data;

  D.M14_ELEMS = {
    fire: { name: "炎", hint: "一体を焼く大きな火力。燃え続ける" },
    ice: { name: "氷", hint: "凍らせて止める" },
    bolt: { name: "雷", hint: "敵すべてを打つ" },
    wind: { name: "風", hint: "身を軽くして躱す。吹き飛ばす" },
    earth: { name: "土", hint: "石の肌で守る。足を止める" },
    light: { name: "光", hint: "癒し・加護・不死を浄める" },
    dark: { name: "闇", hint: "弱らせる。命を吸う" },
  };
  D.M14_ELEM_KEYS = Object.keys(D.M14_ELEMS);
  D.M14_TIERS = { 1: "初級", 2: "中級", 3: "上級" };

  const S = D.SPELLS;
  // ---------------------------------------------------------------- M1 の 6 つを初級に（炎と癒しは「誰でも」ではなくなる）
  Object.assign(S.fire, { base: false, el: "fire", tier: 1, diff: 0, bonus: "fire", debt: 1, hint: "一体を炎で包む", kw: ["魔法", "炎", "火", "燃"],
    school: { gold: 80, diff: "易しい", days: 2 } });
  Object.assign(S.heal, { base: false, el: "light", tier: 1, diff: "易しい", bonus: "heal", debt: 1, hint: "傷をふさぐ（仲間にも）", kw: ["回復", "癒", "治"],
    school: { gold: 80, diff: "易しい", days: 2 } });
  Object.assign(S.ice, { el: "ice", tier: 1 });
  Object.assign(S.bolt, { el: "bolt", tier: 1 });
  Object.assign(S.curse, { el: "dark", tier: 1 });
  Object.assign(S.ward, { el: "light", tier: 1 });

  // ---------------------------------------------------------------- 足す術
  // fx.t：hit 一体を打つ／all 敵すべて／twice 二度打つ／buff 自分にかける／heal 癒す／drain 打って吸う
  //   d = ダメージのダイス、pw = 魔力をこの数で割って足す、burn 燃え続ける手番、freeze 凍らせる手番、stun 痺れ・吹き飛ばす手番（ボスには効かない）、
  //   snare 足を止める手番（当てやすくなる）、wind 追い風の手番（敵の攻撃が当たりにくい）、stone 石の肌の手番（受けるダメージが減る）、
  //   hex 呪いの手番、undead 不死への倍率、self 自分を癒す割合、party 仲間も癒す、cure 毒を消す
  Object.assign(S, {
    // 炎
    fire2: { name: "炎の槍", el: "fire", tier: 2, mp: 6, diff: -5, bonus: "fire", debt: 2, hint: "一体を深く焼き、二手番燃やし続ける", kw: ["炎の槍", "槍"],
      fx: { t: "hit", d: [3, 6, 0], pw: 7, burn: 2 } },
    fire3: { name: "劫火", el: "fire", tier: 3, mp: 10, diff: -10, bonus: "fire", debt: 4, hint: "一体を灰にする火柱。三手番燃やし続ける", kw: ["劫火", "火柱"],
      fx: { t: "hit", d: [5, 6, 2], pw: 5, burn: 3 } },
    // 氷
    ice2: { name: "氷の枷", el: "ice", tier: 2, mp: 6, diff: -5, bonus: "ice", debt: 2, hint: "一体を深く凍らせ、二手番止める", kw: ["氷の枷", "枷"],
      fx: { t: "hit", d: [2, 6, 0], pw: 8, freeze: 2 } },
    ice3: { name: "凍てつく檻", el: "ice", tier: 3, mp: 10, diff: -10, bonus: "ice", debt: 4, hint: "敵すべてを凍らせ、一手番止める", kw: ["凍てつく檻", "檻"],
      fx: { t: "all", d: [2, 6, 0], pw: 10, freeze: 1 } },
    // 雷
    bolt2: { name: "雷鳴", el: "bolt", tier: 2, mp: 8, diff: -12, bonus: "bolt", debt: 3, hint: "敵すべてを打ち、ときに痺れさせる", kw: ["雷鳴"],
      fx: { t: "all", d: [3, 4, 0], pw: 10, stun: 1, stunP: 0.3 } },
    bolt3: { name: "天の怒り", el: "bolt", tier: 3, mp: 13, diff: -15, bonus: "bolt", debt: 5, hint: "敵すべてに雷を降らせる", kw: ["天の怒り", "落雷"],
      fx: { t: "all", d: [4, 6, 0], pw: 8, stun: 1, stunP: 0.2 } },
    // 風
    wind1: { name: "追い風", el: "wind", tier: 1, mp: 3, diff: "易しい", bonus: "wind", debt: 1, hint: "三手番、身が軽くなり敵の攻撃が当たりにくい", kw: ["追い風", "風"],
      fx: { t: "buff", wind: 3 }, school: { gold: 100, diff: "普通", days: 2 } },
    wind2: { name: "風の刃", el: "wind", tier: 2, mp: 5, diff: -5, bonus: "wind", debt: 2, hint: "見えない刃で二度切り、追い風に乗る", kw: ["風の刃", "刃"],
      fx: { t: "twice", d: [1, 6, 1], pw: 12, wind: 2 } },
    wind3: { name: "嵐", el: "wind", tier: 3, mp: 10, diff: -10, bonus: "wind", debt: 4, hint: "敵すべてを打って吹き飛ばし、一手番動けなくする", kw: ["嵐", "竜巻"],
      fx: { t: "all", d: [2, 6, 0], pw: 10, stun: 1, stunP: 1, wind: 2 } },
    // 土
    earth1: { name: "石の肌", el: "earth", tier: 1, mp: 3, diff: "易しい", bonus: "earth", debt: 1, hint: "四手番、肌が石になり受けるダメージが減る", kw: ["石の肌", "土", "石"],
      fx: { t: "buff", stone: 4 }, school: { gold: 100, diff: "普通", days: 2 } },
    earth2: { name: "石つぶて", el: "earth", tier: 2, mp: 5, diff: -5, bonus: "earth", debt: 2, hint: "一体を打ち、三手番足を止める（当てやすくなる）", kw: ["石つぶて", "礫"],
      fx: { t: "hit", d: [2, 6, 0], pw: 9, snare: 3 } },
    earth3: { name: "大地の顎", el: "earth", tier: 3, mp: 10, diff: -10, bonus: "earth", debt: 4, hint: "一体を地面に噛ませ、敵すべての足を止め、石の肌をまとう", kw: ["大地の顎", "顎"],
      fx: { t: "hit", d: [4, 6, 0], pw: 6, snareAll: 3, stone: 3 } },
    // 光
    light2: { name: "癒しの雨", el: "light", tier: 2, mp: 6, diff: 0, bonus: "heal", debt: 2, hint: "自分と仲間すべての傷をふさぎ、毒を消す", kw: ["癒しの雨", "雨"],
      fx: { t: "heal", d: [2, 6, 2], pw: 10, party: true, cure: true } },
    light3: { name: "浄めの光", el: "light", tier: 3, mp: 10, diff: -8, bonus: "light", debt: 3, hint: "敵すべてを焼く白い光。不死には三倍。自分の傷も癒す", kw: ["浄め", "浄化", "白い光"],
      fx: { t: "all", d: [2, 6, 0], pw: 8, undead: 3, selfHeal: [2, 6, 0] } },
    // 闇
    dark2: { name: "命を吸う", el: "dark", tier: 2, mp: 6, diff: -5, bonus: "dark", debt: 3, hint: "一体の命を吸い、与えた分の半分を自分の傷に", kw: ["吸う", "命を"],
      fx: { t: "drain", d: [2, 6, 0], pw: 9, self: 0.5 } },
    dark3: { name: "闇の帳", el: "dark", tier: 3, mp: 11, diff: -12, bonus: "dark", debt: 5, hint: "敵すべてを呪い、命を吸う", kw: ["闇の帳", "帳"],
      fx: { t: "all", d: [2, 4, 0], pw: 12, hex: 3, self: 0.5 } },
  });

  // 属性の id は E12（敵の属性の耐性と弱点）と共有：fire・ice・bolt・wind・earth・light・dark。E12 の読み方に合わせて elem にも置く
  Object.values(S).forEach((sp) => { if (sp.el) sp.elem = sp.el; });

  // 職業ごとに、はじめから覚えている術（M1 の表を書き換える。魔法使い・破戒神官は術の才を持って生まれた者だけがなる）
  D.SPELL_START = { mage: ["fire", "ice"], priest: ["heal", "ward"] };

  // ---------------------------------------------------------------- 術の才
  D.M14_TALENT = {
    names: ["才なし", "人並み", "抜きん出た才", "百年に一人"],
    // 作成画面の言葉（数を出さない）
    say: [
      "術の器を持たずに生まれた。術は覚えられない（巻物なら一度きり使える）",
      "術の器はある。得意な属性が一つ",
      "術の器が大きい。得意な属性が二つ",
      "百年に一人の器。得意な属性が三つ",
    ],
    aff: { good: "得意（上級まで届く）", mid: "ふつう（中級まで）", bad: "苦手（初級止まり・覚えにくい）" },
    // 才の振り方：3D6 ＋ 種族・生まれ・職業。8 以下 才なし／9〜13 人並み／14〜16 抜きん出た才／17 以上 百年に一人
    cut: [8, 13, 16],
    race: { elf: 3, beast: -2 },
    origin: { zephara: 2, leavel: 1, yakumo: 1, fort: -1 },
    cls: { mage: 2, priest: 1 },
    need: { mage: 1, priest: 1 },   // この職業は少なくともこの才（才なしではなれない）
    // 得意・苦手の重み（どの属性になりやすいか）。職業の属性は、魔法使い・破戒神官では必ず得意
    clsEl: { merc: "earth", thief: "dark", mage: "fire", priest: "light", samurai: "wind" },
    lockEl: { mage: true, priest: true },
    // 作成画面を通らずに始めた冒険（古いセーブ・テスト）の才：職業ごとの得意な属性
    defaultGood: { merc: ["earth"], thief: ["dark"], mage: ["fire", "ice"], priest: ["light", "earth"], samurai: ["wind"] },
    raceEl: { elf: { wind: 2, light: 1 }, beast: { earth: 2, wind: 1 } },
    originEl: { zephara: { bolt: 1, ice: 1 }, leavel: { light: 1 }, garmund: { ice: 2 }, fort: { earth: 1 }, yakumo: { wind: 1, bolt: 1 }, nerva: { dark: 1 }, karna: { fire: 1 }, village: { earth: 1 } },
    bad: [0, 2, 1, 1],   // 苦手な属性の数（才ごと）
  };

  // 覚えるときの判定の補正（％）。得意は覚えやすく、苦手は覚えにくい
  D.M14_LEARN = { good: 10, mid: 0, bad: -15 };
  // 唱えるときの補正（％）。得意は成功しやすい。才が高いほど少し上がる
  D.M14_CAST = { good: 10, mid: 0, bad: -10, lv: [0, 0, 5, 10] };

  // 学院の講師の口癖（M1 に足す）
  (D.ACADEMY_LINES || []).push(
    "講師は新入りの手のひらをしばらく眺めて、「器はある」とだけ言った。器の無い者には、何も言わない。",
    "黒板の隅に、属性の名が七つ書いてある。誰かが八つ目を書き足して、消した跡がある。",
  );
})(globalThis.G = globalThis.G || {});
