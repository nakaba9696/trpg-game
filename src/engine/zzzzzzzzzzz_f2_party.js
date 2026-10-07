// F2：歯が立たない相手（使徒・強いボスなど）と戦うときの仲間の援護。持ち主の方針「仲間がいれば勝率は上がってよい」。
// 前は、仲間の当たる見込みが下限（5%）近くまで落ちる相手にも斬りかかり続け、ほとんど何もできなかった（使徒一体あたり、戦い全体で数点）。
// 当たる見込みが F2.OUTCLASSED 以下の相手には、斬りかからずに援護する（combat.js のつなぎ目 G.cbAllyAssist・G.cbCover）：
//   庇う：敵が大技・必殺・詠唱の気配を見せている（F1 の f1i）とき、あなたの前に出る。その手番にあなたが受ける最初の一撃のうち、
//         庇う仲間一人につき 25%（多くても 50%）を、庇った仲間が代わりに受ける（仲間の防具は効かない。倒れることもある）
//   牽制：そのほかのとき。仲間の腕前で見込みを振り（当たる見込み＋F2.FEINT、多くても 70%。使徒には、弱点・条件をそろえた割合を掛ける）、決まれば敵の構えが揺らぐ（F1 の f1open：
//         次のあなたの刃・術が深く入る）。すでに揺らいでいる・絶界に阻まれているときは、気を引くだけ
// 回復役の仲間（c.heal）の治療は今まで通り先に行う。当たる見込みが十分ある相手には、今まで通り斬りかかる。
// セーブに足すもの：S.combat.f2cover（その手番に庇う仲間の名前。手番の終わりに消える）。古いセーブに無くても動く。乱数は G.d だけ。レーン B（F2）
(function (G) {
  const F2 = (G.f2party = G.f2party || {});
  F2.OUTCLASSED = 20; // 仲間の当たる見込み（％）がこれ以下なら、援護に回る
  F2.FEINT = 40;      // 牽制の見込みの上乗せ（％）
  F2.FEINT_MAX = 70;
  F2.COVER = 0.25;    // 庇う一人あたりの割合
  F2.COVER_MAX = 0.5;
  const BIG = ["heavy", "ult", "chant"];

  const C = () => (G.S && G.S.combat) || null;
  const walled = (e) => !!(e && e.majin && !G.weapon().pierce);
  // あなたに向かってくる大きな気配があるか
  const threat = () => G.alive().find((f) => f.f1i && BIG.includes(f.f1i.k) && !f.f1stun) || null;

  G.cbAllyAssist = (c, f, e) => {
    const S = G.S;
    const c0 = C();
    if (!c0 || !e) return false;
    const chance = walled(e) ? 0 : G.allyHitChance(c, e);
    if (chance > F2.OUTCLASSED) return false;
    const t = threat();
    const cover = c0.f2cover || (c0.f2cover = []);
    if (t && cover.length * F2.COVER < F2.COVER_MAX) {
      cover.push(c.name);
      G.note(`${c.name}があなたの前に出て、${t.name}の${t.f1i.k === "chant" ? "術" : "一撃"}に備えた。`);
      return true;
    }
    // 使徒は、弱点・条件をそろえた割合（E3 の frac）の分だけ隙が見える（備えなしの一行で A 級を崩せないように。E8 の格の決まり）
    const seen = f.e3 ? Math.max(0, Math.min(1, f.e3.frac || 0)) : 1;
    if (!walled(e) && !f.f1open && !f.f1stun && seen > 0 && G.d(100) <= Math.min(F2.FEINT_MAX, chance + F2.FEINT) * seen) {
      f.f1open = true;
      G.log("sys", `${c.name}の牽制で、${f.name}の構えが揺らいだ。次の一撃が深く入る。`, { tell: f.name, brk: 1 });
      return true;
    }
    G.note(`${c.name}は${f.name}のまわりを動き回り、気を引いている。`);
    return true;
  };

  // あなたへの一撃：庇う仲間がいれば、その分を代わりに受ける（その手番の最初の一撃だけ）
  G.cbCover = (f, e, dmg) => {
    const c0 = C();
    const S = G.S;
    if (!c0 || !c0.f2cover || !c0.f2cover.length || dmg < 2) return dmg;
    const who = c0.f2cover.map((n) => S.companions.find((c) => c.name === n)).filter((c) => c && !G.b5Down(c));
    c0.f2cover = [];
    if (!who.length) return dmg;
    const part = Math.min(F2.COVER_MAX, F2.COVER * who.length);
    let left = Math.floor(dmg * part);
    if (left < 1) return dmg;
    const taken = left;
    who.forEach((c, i) => {
      const n = i === who.length - 1 ? left : Math.ceil(taken / who.length);
      if (n <= 0) return;
      left -= n;
      c.hp = Math.max(0, c.hp - n);
      G.log("nar", `${c.name}があなたを庇い、${n} のダメージ（残り ${c.hp}/${G.b5Max(c)}）`, { fx: "ally", who: c.name, n });
      if (c.hp <= 0) G.b5Fall(c, f);
    });
    return dmg - taken;
  };

  // 庇う構えは、その手番の終わりに解く
  const baseAct = G.combatAct;
  G.combatAct = (arg) => {
    const r = baseAct(arg);
    const c0 = C();
    if (c0) c0.f2cover = [];
    return r;
  };
})(globalThis.G = globalThis.G || {});
