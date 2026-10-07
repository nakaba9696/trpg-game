// F3：戦闘で仲間に指示を出す（持ち主「仲間も指示させて」）。DOM には触らない。文は data/f3_orders.js
//   作戦（S.f3tactic）：仲間ぜんたいの構え。戦いをまたいで覚える。既定は「任せる」（今まで通り：combat.js のふだんの手番と同じ乱数の使い方）
//     全力     … あなたの狙う敵を一斉に攻める（歯が立たない相手には牽制）。手当ては 25% を切った味方だけ
//     守り重視 … 大技・必殺・詠唱の気配があれば前に出て庇う。手当ては 70% を切ったら
//     回復優先 … 手当ての得意な者は 85% を切ったら治す。ほかは守り重視と同じ
//   指示（S.combat.f3ord[仲間の id]）：その手番だけ、一人に出す。作戦より先に効き、手番の終わりに消える
//     作戦どおり・狙いを攻める（術師は「術を撃つ」）・手当て（回復役）・薬を使う（持ち物に薬があれば）・庇う・牽制・下がる（受ける傷が半分）
//     仲間が持っている手だけ出す。今の指示・作戦には「●」。指示や作戦を変えても手番は進まない（U6 の狙いと同じ）
//   渋る：無茶な指示（庇う・深手での攻め、誇り高い者に「下がる」）は、好感度（c.bond）が低いほど・性格（臆病・高慢など）によって、
//     渋って自分の判断で動くことがある。数は出さず一言だけ（D.F3_BALK）。好感度が十分なら渋らない
// combat.js のつなぎ目：G.cbAllyOrder（仲間の手番の頭）・G.cbAllyHurt（仲間の受ける傷）・G.cbAllyHeal・G.cbAllyStrike。庇う・牽制は F2（G.f2party）を使う
// セーブに足すもの：S.f3tactic・S.combat.f3ord・S.combat.f3back。古いセーブに無くても動く（任せる）。乱数は G.rand / G.d だけ。レーン B（F3）
(function (G) {
  const D = G.data;
  const F3 = (G.f3 = G.f3 || {});
  F3.HEAL_AT = { all: 0.25, guard: 0.7, heal: 0.85 };
  F3.LOW_HP = 0.35;  // これより深手で「攻めろ」は無茶
  F3.BACK = 0.5;     // 下がった仲間が受ける傷の倍率

  const S = () => G.S;
  const C = () => (G.S && G.S.combat) || null;
  const short = (c) => (G.m2Short ? G.m2Short(c) : c.name);
  // 指示の組の見出しに使う呼び名（呼び名が重なる仲間がいれば、元の名前で見分ける）
  F3.label = (c, s) => {
    const list = ((s || G.S) || {}).companions || [];
    return list.some((x) => x !== c && short(x) === short(c)) ? c.name : short(c);
  };
  F3.tactic = (s) => { const t = ((s || G.S) || {}).f3tactic; return D.F3_TACTICS[t] ? t : "free"; };
  F3.orderOf = (c) => { const c0 = C(); const o = c0 && c0.f3ord && c0.f3ord[c.id]; return D.F3_ORDERS[o] ? o : "auto"; };
  const potionOf = () => {
    const inv = (G.S && G.S.inv) || {};
    const list = Object.keys(inv).filter((id) => { const it = D.ITEMS[id]; return it && it.type === "use" && it.hp && inv[id] > 0; });
    list.sort((a, b) => (D.ITEMS[a].price || 0) - (D.ITEMS[b].price || 0));
    return list[0] || null;
  };
  // 仲間ができる指示
  F3.ordersFor = (c) => D.F3_ORDER_KEYS.filter((o) => {
    if (o === "attack") return !c.fire;
    if (o === "magic") return !!c.fire;
    if (o === "heal") return !!c.heal;
    if (o === "potion") return !!potionOf();
    if (o === "cover" || o === "feint") return !!G.f2party;
    return true;
  });

  // ---------------------------------------------------------------- 渋る
  F3.reckless = (c, o) => o === "cover" || ((o === "attack" || o === "magic") && G.b5Fix(c).hp < G.b5Max(c) * F3.LOW_HP);
  F3.balkChance = (c, o) => {
    const proud = c.trait === "proud" || c.trait === "braggart";
    if (o === "back" && proud) return 0.3;
    if (!F3.reckless(c, o)) return 0;
    const bond = typeof c.bond === "number" ? c.bond : 50;
    let p = bond >= 50 ? 0 : bond >= 30 ? 0.25 : 0.5;
    if (c.trait === "coward") p += 0.25;
    if (c.trait === "loyal") p -= 0.3;
    return Math.max(0, Math.min(0.9, p));
  };
  const balkLine = (c) => {
    const B = D.F3_BALK || {};
    const list = (B[c.trait] && B[c.trait].length ? B[c.trait] : B.any) || ["{n}は言われた通りには動かなかった。"];
    return G.pick(list).split("{n}").join(short(c));
  };

  // ---------------------------------------------------------------- 動く
  const target = (foes) => { const t = G.target && G.target(); return t && t.hp > 0 ? t : foes[0]; };
  const outclassed = (c, e) => !!(e && ((e.majin && !G.weapon().pierce) || (G.f2party && G.allyHitChance(c, e) <= G.f2party.OUTCLASSED)));
  // 全力：狙いを攻める。歯が立たないなら牽制
  function press(c, foes) {
    const t = target(foes);
    const e = G.foeData(t);
    if (outclassed(c, e) && G.f2party) {
      if (!G.f2party.feint(c, t, e)) G.note(`${c.name}は${t.name}の隙をうかがったが、つけ入る所が無い。`);
      return true;
    }
    G.cbAllyStrike(c, t, e);
    return true;
  }
  // 作戦で動く（任せるなら false：ふだんの手番へ）
  function byTactic(c, foes) {
    const tac = F3.tactic();
    if (tac === "free") return false;
    if (c.heal && G.cbAllyHeal(c, F3.HEAL_AT[tac])) return true;
    if (tac === "all") return press(c, foes);
    const th = G.f2party && G.f2party.threat();
    if (th && G.f2party.cover(c, th)) return true;
    return false; // あとはふだん通り（手当て・援護・攻め）
  }
  function byOrder(c, foes, o) {
    const c0 = C();
    if (o === "attack" || o === "magic") {
      const t = target(foes);
      G.cbAllyStrike(c, t, G.foeData(t));
      return true;
    }
    if (o === "heal") return G.cbAllyHeal(c, 1.01) || byTactic(c, foes);
    if (o === "potion") {
      const id = potionOf();
      const need = G.b5Neediest && G.b5Neediest();
      if (!id || !need || !(need.ratio < 1) || !G.take(id)) return byTactic(c, foes);
      const it = D.ITEMS[id];
      if (need.who === "you") { G.heal(it.hp); G.note(`${c.name}があなたに${it.name}を使った。HP +${it.hp > 100 ? "全快" : it.hp}`); }
      else G.b5Heal(need.who, it.hp, `${c.name}の${it.name}`);
      return true;
    }
    if (o === "cover") return G.f2party.cover(c, G.f2party.threat()) || byTactic(c, foes);
    if (o === "feint") {
      const t = target(foes);
      if (!G.f2party.feint(c, t, G.foeData(t))) G.note(`${c.name}の牽制は、${t.name}に見切られた。`);
      return true;
    }
    if (o === "back") {
      (c0.f3back || (c0.f3back = [])).push(c.name);
      G.note(`${c.name}は下がって、身を守っている。`);
      return true;
    }
    return byTactic(c, foes);
  }

  G.cbAllyOrder = (c, foes) => {
    const c0 = C();
    if (!c0) return false;
    const o = F3.orderOf(c);
    if (o === "auto") return byTactic(c, foes);
    const p = F3.balkChance(c, o);
    if (p > 0 && G.rand() < p) { G.say(balkLine(c)); return false; } // 渋って、自分の判断で（ふだんの手番）
    return byOrder(c, foes, o);
  };
  G.cbAllyHurt = (c, dmg) => {
    const c0 = C();
    return c0 && c0.f3back && c0.f3back.includes(c.name) ? Math.floor(dmg * F3.BACK) : dmg;
  };

  // ---------------------------------------------------------------- 選択肢（手番は進まない）
  const baseActions = G.combatActions;
  G.combatActions = () => {
    const groups = baseActions();
    const s = G.S;
    const c0 = C();
    if (!c0 || s.over || !(s.companions || []).length || !G.alive().length) return groups;
    const tac = F3.tactic(s);
    groups.push({ title: `作戦（${D.F3_TACTICS[tac].name}）`, list: Object.entries(D.F3_TACTICS).map(([k, t]) => ({
      id: "f3:tac:" + k, label: (k === tac ? "● " : "") + t.name, sub: k === tac ? `いまの作戦：${t.sub}` : t.sub, kw: ["作戦", t.name],
    })) });
    (G.b5Standing ? G.b5Standing(s) : s.companions).forEach((c) => {
      if (!c.id) return;
      const cur = F3.orderOf(c);
      const now = cur === "auto" ? `作戦：${D.F3_TACTICS[tac].name}` : D.F3_ORDERS[cur].name;
      groups.push({ title: `${F3.label(c, s)}（${now}）`, list: F3.ordersFor(c).map((o) => ({
        id: `f3:ord:${c.id}:${o}`, label: (o === cur ? "● " : "") + D.F3_ORDERS[o].name, sub: o === cur ? `この手番の指示：${D.F3_ORDERS[o].sub}` : D.F3_ORDERS[o].sub, kw: ["指示", F3.label(c, s), D.F3_ORDERS[o].name],
      })) });
    });
    return groups;
  };
  // f3: の手は、作戦・指示を覚えるだけ（手番も記録も進めない）
  const baseAct = G.act;
  G.act = (id) => {
    const s = G.S;
    if (!/^f3:/.test(String(id))) return baseAct(id);
    if (!s || s.over || !s.combat) return;
    const a = G.actions().flatMap((g) => g.list).find((x) => x.id === id);
    if (!a || a.disabled) return;
    const [, kind, x, y] = String(id).split(":");
    if (kind === "tac" && D.F3_TACTICS[x]) s.f3tactic = x;
    else if (kind === "ord" && D.F3_ORDERS[y]) {
      const o = s.combat.f3ord || (s.combat.f3ord = {});
      if (y === "auto") delete o[x]; else o[x] = y;
    }
  };
  // 指示と「下がる」は、その手番の終わりに消える
  const baseCombat = G.combatAct;
  G.combatAct = (arg) => {
    const r = baseCombat(arg);
    const c0 = C();
    if (c0) { c0.f3ord = {}; c0.f3back = []; }
    return r;
  };
})(globalThis.G = globalThis.G || {});
