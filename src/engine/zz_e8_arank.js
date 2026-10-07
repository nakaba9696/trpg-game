// E8：A 級の使徒の強さの下限（持ち主の決定「A 級は基本的に国を挙げないと倒せない。パーティだけの正面からでは勝てない」）
// - A 級の使徒の戦闘データを、格の基準（D.E3_BASE.A。HP・攻撃・命中・防御）より弱くならないように引き上げる
//   （黒鎧・苔衣は、目的「使徒を討つ」の居城の主として、討伐の格に近い強さで作られていた）
// - 段（tier。当てやすさの点）・素早さ・魔法への強さ・台詞・絵はそのまま（使徒ごとの持ち味。段は S5 の目盛りの基準〔tests/checks/s5_scale.mjs〕）
// - 勝ち筋は今までどおり条件（D.E3.LIST の keys。国の軍・大きな出来事・味方の使徒・隠れた弱点など）をそろえたとき。
//   そろえると D.E3.WEAK.A の倍率まで弱る（tests/checks/e8_grades.mjs が、剣だけでは勝てず・条件をそろえれば勝てることを確かめる）
// 名前の zz_e8 で zz_e3_apostles.js より後に読まれる。セーブには何も足さない。レーン E（敵）
(function (G) {
  const D = G.data;
  const B = D.E3_BASE && D.E3_BASE.A;
  if (!B || !D.E3 || !D.E3.LIST) return;
  const OLD = { 国難: "A" };
  const LOW_TIER = { hp: 2.2, dmg: 6 }; // 段が A の基準より低い使徒の、HP の倍率と一撃の上乗せ
  D.E8_ARANK = { LOW_TIER };
  Object.values(D.E3.LIST).forEach((a) => {
    if ((OLD[a.rank] || a.rank) !== "A") return;
    const e = D.ENEMIES[a.foe] || D.E3.FOES[a.foe];
    if (!e) return;
    // 段が基準より低い（当てやすい）ぶんは、HP と攻撃の重さで埋める（LOW_TIER）
    const low = (e.tier || 0) < B.tier;
    const L = low ? LOW_TIER : { hp: 1, dmg: 0 };
    e.hp = Math.max(e.hp || 0, Math.round(B.hp * L.hp));
    e.hit = Math.max(e.hit || 0, B.hit);
    e.def = Math.max(e.def || 0, B.def);
    const d = e.dmg || [1, 6, 0];
    e.dmg = [Math.max(d[0], B.dmg[0]), Math.max(d[1], B.dmg[1]), Math.max(d[2] || 0, B.dmg[2] + L.dmg)];
  });
})(globalThis.G = globalThis.G || {});
