// E12：戦技の物理の種類と属性（仕組みは engine/zzzzzzzzzzzzzz_e12_resist.js）。
// 持ち主「戦技にも同様に属性をつけてください」。k1_skills.js は書き換えず、ここで D.SKILLS に足す
// （名前の頭の zz は k1_skills.js・k2_passives.js より後に読ませるため）。
//   E12.SKILL_TYPES[技] = "<物理> [<属性>]"。攻撃する戦技（fx.t が hit・parry・counter）はすべて物理の種類を一つ持つ。
//   技の当て方が武器より先（兜割りは剣でも打撃、影刺しは突きと闇）。物理と属性を両方持つ技は、敵の効き目を両方で見て掛ける（engine の E12.hitMany）
//   説明（hint）の頭に「斬・火」のように出る（戦闘の札と技の一覧）
// 属性の技を三つ足した（焔走り・雷突き・地鳴らし）。鍛錬と師で覚える（巻物は無い）。レーン E＋B
(function (G) {
  const D = (G.data = G.data || {});
  const E12 = (D.E12 = D.E12 || {});

  Object.assign(D.SKILLS, {
    k1_emberedge: {
      kind: "combat", name: "焔走り", style: ["剣", "刀", "斧"], stat: "武器", need: { 筋力: 12, 魔力: 8 }, ki: 2,
      hint: "刃に火を走らせて斬る（1.1倍）", fx: { t: "hit", mul: 1.1 },
      learn: { train: { gold: 120, days: 3 }, teach: ["kensei"] },
      say: "刃で地を擦り、走った火の粉ごと斬り上げる。", kw: ["焔", "火"],
    },
    k1_thunderthrust: {
      kind: "combat", name: "雷突き", style: ["槍", "剣", "短剣"], stat: "武器", need: { 敏捷: 12, 魔力: 8 }, ki: 2,
      hint: "切っ先に雷を呼んで突く（1.1倍・当たりやすい）", fx: { t: "hit", mul: 1.1, hit: 5 },
      learn: { train: { gold: 120, days: 3 }, teach: ["veteran"] },
      say: "切っ先を天に掲げ、落ちてきた光ごと突き下ろす。", kw: ["雷"],
    },
    k1_quake: {
      kind: "combat", name: "地鳴らし", style: ["槌", "両手"], stat: "武器", need: { 筋力: 16 }, ki: 3,
      hint: "地を打って敵すべてを揺さぶる（一体ずつは浅い）", fx: { t: "hit", all: true, mul: 0.6, hit: -5 },
      learn: { train: { gold: 120, days: 3 }, teach: ["veteran"] },
      say: "得物を地に叩きつける。足もとが波打った。", kw: ["地鳴", "揺"],
    },
  });

  E12.SKILL_TYPES = {
    k1_twinfang: "slash", k1_helmsplit: "blunt", k1_drawcut: "slash wind", k1_flurry: "slash", k1_parry: "slash",
    k1_sweepspear: "blunt", k1_spearwall: "pierce", k1_pierce: "pierce", k1_aim: "pierce", k1_twoarrows: "pierce", k1_pin: "pierce",
    k1_shieldbash: "blunt", k1_twinstorm: "slash wind", k1_crossguard: "slash", k1_bodyblow: "blunt", k1_cleave: "slash",
    k1_shadowstab: "pierce dark", k1_venom: "pierce",
    k1_emberedge: "slash fire", k1_thunderthrust: "pierce bolt", k1_quake: "blunt earth",
  };
})(globalThis.G = globalThis.G || {});
