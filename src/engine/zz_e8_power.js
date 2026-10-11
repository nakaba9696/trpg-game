// E8：討伐できる使徒の強さの目標（持ち主の決定。docs/VISION.md の「格ごとの勝率の目安」）
//   測り方：やりこんだ主人公（能力値の点 55・ミスリルの剣か絶界を破る剣・王国騎士の甲冑・回復薬 5）が一人で挑む
//   S 級 … 正面（剣だけ・条件なし）は 0%。条件をすべてそろえても 1〜2 割
//   A 級 … 正面はほぼ 0%。弱点と出来事（国の軍・大きな出来事・味方の使徒・隠れた弱点など）をすべてそろえて約 3 割
//   B 級 … 正面はほぼ勝てない（1 割まで）。備え・弱点（条件）をそろえて一人で約 5 割。仲間がいれば上がってよい
// しくみ：格ごとの「条件をすべてそろえたときの倍率」（D.E3.WEAK）をここで置き換え、使徒ごとの強さを TUNE で整える
//   （D.E3.FOES・D.ENEMIES の戦闘データを読み込み時に一度だけ書き換える。セーブには何も足さない）
// 確かめるのは tests/checks/e8_power.mjs。名前の zz_e8_p で zz_e3_apostles.js・zz_e8_arank.js より後に読まれる。レーン E（敵）
(function (G) {
  const D = G.data;
  if (!D.E3 || !D.E3.LIST || !D.E3.WEAK) return;
  const P = (D.E8_POWER = {
    // 条件をすべてそろえたときの倍率（hp・dmg は掛け算、hit・def・agi は足し算）
    WEAK: {
      S: { hp: 0.2, dmg: 0.42, hit: -30, def: -25, agi: -50 },
      A: { hp: 0.5, dmg: 0.6, hit: -18, def: -12, agi: -25 },
      B: { hp: 0.6, dmg: 0.75, hit: -8, def: -6, agi: -10 }, // dmg は 0.75 を割らない（ダイスの数 2 が四捨五入で 1 になり、一撃が半分になる）
    },
    // 使徒ごとの調整（ソロの測り方で目標に寄せた値。tests/checks/e8_power.mjs）
    //   hp：正面の HP（そのものの値。B 級は正面ではほぼ勝てない強さに上げた）／dmg：攻撃の上乗せの倍率
    //   keyHp：条件をそろえた割合に応じて HP に掛ける倍率（すべてそろえたとき keyHp 倍。正面の強さは変えない）
    TUNE: {
      gormore: { hp: 994, dmg: 2 }, levian: { hp: 355, dmg: 2 }, mirza: { hp: 460, dmg: 2 }, aurelia: { hp: 281, dmg: 2 },
      notari: { hp: 302, dmg: 2 }, tetsukui: { hp: 431, dmg: 2 }, togaoi: { hp: 329, dmg: 2 }, sanno: { hp: 365, dmg: 2 },
      // A 級は E10-3 で約 3 割に下げた（B 級より勝ちにくく。持ち主「A級のほうがB級より勝率高いのおかしい」）
      graw: { keyHp: 1.305 }, mordu: { keyHp: 0.984 }, zalve: { keyHp: 0.971 }, chezar: { keyHp: 1.122 }, azlag: { keyHp: 0.919 }, lugu: { keyHp: 1.119 },
      kurobane: { keyHp: 0.57 }, tojizuki: { keyHp: 0.469 },
    },
  });
  Object.entries(P.WEAK).forEach(([r, w]) => { D.E3.WEAK[r] = w; });
  Object.entries(P.TUNE).forEach(([id, t]) => {
    const a = D.E3.LIST[id];
    const e = a && (D.ENEMIES[a.foe] || D.E3.FOES[a.foe]);
    if (!e || e.e8power) return;
    e.e8power = true;
    const hp0 = e.hp;
    if (t.hp) e.hp = t.hp;
    // E7 の長編の正面の決戦（D.E7.SAGAS[id].final）は、裏道の E3 の戦いより強いことが前提（tests/checks/e7_saga.mjs）。
    // E3 の HP を変えた倍率だけ、決戦の HP（と下限・条件ごとに減る量）も同じに掛けて、両者の比を保つ。e7 のファイルは書き換えない
    const sg = D.E7 && D.E7.SAGAS && D.E7.SAGAS[id];
    if (sg && sg.final && t.hp && hp0) {
      const k = e.hp / hp0;
      ["hp", "minHp", "keyHp"].forEach((f) => { if (sg.final[f]) sg.final[f] = Math.round(sg.final[f] * k); });
      // 備え（preps）と弱み（weak）が引く HP も同じ倍率に（引く量が決まった数なので、HP だけ上げると備えの効きが薄まる）
      [...Object.values(sg.preps || {}).map((p) => p.weak), ...(sg.weak || [])].forEach((w) => { if (w && w.hp) w.hp = Math.round(w.hp * k); });
    }
    if (t.dmg && e.dmg) e.dmg = [e.dmg[0], e.dmg[1], Math.round((e.dmg[2] || 0) * t.dmg)];
  });
  // 条件をそろえた割合に応じて、HP をさらに keyHp 倍まで下げる（そろえていなければ変わらない）
  const mods0 = G.e3Mods;
  if (mods0) G.e3Mods = (id, S) => {
    const m = mods0(id, S);
    const t = P.TUNE[id];
    return t && t.keyHp && m.frac > 0 ? Object.assign({}, m, { hp: m.hp * Math.pow(t.keyHp, m.frac) }) : m;
  };
  // E7 の長編（G.e7.grade）が格を読む口
  G.apostleGrade = G.apostleGrade || ((id) => { const a = D.E3.LIST[id]; return a ? a.rank : null; });
})(globalThis.G = globalThis.G || {});
