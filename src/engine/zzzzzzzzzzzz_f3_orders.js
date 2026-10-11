// F3：戦闘で仲間に指示を出す（持ち主「仲間も指示させて」）。DOM には触らない。文は data/f3_orders.js
//   作戦（S.f3tactic。宿で仲間ごとに c.f5tac も）：仲間の構え。戦いをまたいで覚える。F5 で 6 つに作り直した（持ち主「仲間への作戦は……を参考にして」）
//     押し切れ   … 奥の手を惜しまず、あなたの狙う敵を一斉に攻める（歯が立たない相手には牽制）。手当ては 25% を切った味方だけ
//     機を見て   … 既定。今までの「任せる」と同じ（combat.js のふだんの手番と同じ乱数の使い方）。強敵（ボス・使徒）には奥の手を一つ残して使う
//     盾となれ   … 大技・必殺・詠唱の気配があれば前に出て庇う。手当ては 70% を切ったら。ほかはあなたの狙いを攻め、構えているので受ける傷が 1 割 5 分減る
//     生き延びろ … 手当ての得意な者は 85% を切ったら治し、深手が二人以上なら皆への癒し。ほかは深手の味方に薬を使い、自分が深手なら下がる
//     力を残せ   … 奥の手を使わない。深手の味方には薬を使う。あとはふだん通り
//     命を待て   … あなたの指示した手だけをする。指示の無い手番は構えて待つ（受ける傷が半分）
//   奥の手（c.f5ki 回。休むと戻る）：剣などの者は渾身の一撃、術師は大きな術、回復役は皆への癒し。指示「奥の手」でも使う
//   古いセーブの作戦（任せる・全力・守り重視・回復優先）は、機を見て・押し切れ・盾となれ・生き延びろ に読み替える
//   指示（S.combat.f3ord[仲間の id]）：その手番だけ、一人に出す。作戦より先に効き、手番の終わりに消える
//     作戦どおり・狙いを攻める（術師は「術を撃つ」）・手当て（回復役）・薬を使う（持ち物に薬があれば）・庇う・牽制・下がる（受ける傷が半分）
//     仲間が持っている手だけ出す。今の指示・作戦には「●」。指示や作戦を変えても手番は進まない（U6 の狙いと同じ）
//   渋る：無茶な指示（庇う・深手での攻め、誇り高い者に「下がる」）は、好感度（c.bond）が低いほど・性格（臆病・高慢など）によって、
//     渋って自分の判断で動くことがある。数は出さず一言だけ（D.F3_BALK）。好感度が十分なら渋らない
// combat.js のつなぎ目：G.cbAllyOrder（仲間の手番の頭）・G.cbAllyHurt（仲間の受ける傷）・G.cbAllyHeal・G.cbAllyStrike。庇う・牽制は F2（G.f2party）を使う
// セーブに足すもの：S.f3tactic・S.combat.f3ord・S.combat.f3back・c.f5tac・c.f5ki・S.combat.f5balk・S.f3pick（宿で選んでいる途中）。古いセーブに無くても動く（機を見て）。乱数は G.rand / G.d だけ。レーン B（F3・F5）
(function (G) {
  const D = G.data;
  const F3 = (G.f3 = G.f3 || {});
  F3.LOW_HP = 0.35;  // これより深手で「攻めろ」は無茶
  F3.BACK = 0.5;     // 下がった仲間が受ける傷の倍率
  F3.SHIELD = 0.85;  // 盾となれで構えている仲間が受ける傷の倍率
  F3.KI_MAX = 2;     // 奥の手を、休むまでに使える回数
  F3.LIVE_LOW = 0.35; // 生き延びろ・力を残せで薬を使う、深手の目安

  const S = () => G.S;
  const C = () => (G.S && G.S.combat) || null;
  const short = (c) => (G.m2Short ? G.m2Short(c) : c.name);
  // 指示の組の見出しに使う呼び名（呼び名が重なる仲間がいれば、元の名前で見分ける）
  F3.label = (c, s) => {
    const list = ((s || G.S) || {}).companions || [];
    if (!list.some((x) => x !== c && short(x) === short(c))) return short(c);
    if (!list.some((x) => x !== c && x.name === c.name)) return c.name;
    return `${short(c)}${"①②③④⑤"[list.indexOf(c)] || list.indexOf(c) + 1}`; // 名前まで同じなら、並びの番号を添える
  };
  const tacKey = (t) => (D.F3_TACTICS[t] ? t : D.F3_TACTIC_OLD[t] || null);
  // 一行の作戦（古いセーブの作戦は読み替える）と、その仲間の作戦（宿で決めた仲間ごとの作戦があればそれ）
  F3.tactic = (s) => tacKey(((s || G.S) || {}).f3tactic) || "adapt";
  F3.tacticOf = (c, s) => tacKey(c && c.f5tac) || F3.tactic(s);
  // 奥の手の残り（古いセーブ・新しい仲間は満タン）と種類
  F3.ki = (c) => (typeof c.f5ki === "number" ? Math.max(0, c.f5ki) : F3.KI_MAX);
  F3.artOf = (c) => (c.heal ? "mend" : c.fire ? "spell" : "blow");
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
    if (o === "art") return F3.ki(c) > 0;
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
  const big = (f) => { const e = f && G.foeData(f); return !!(e && (e.boss || e.apostle || e.majin)); };
  const ratioOf = (who) => (who === "you" ? G.S.hp / Math.max(1, G.S.maxHp) : G.b5Fix(who).hp / Math.max(1, G.b5Max(who)));
  const party = () => ["you", ...(G.b5Standing ? G.b5Standing(G.S) : [])];
  const hurtCount = (r) => party().filter((w) => ratioOf(w) < r).length;

  // 奥の手：渾身の一撃・大きな術（当たりやすく深い）、皆への癒し。使えたら true（回数を一つ減らす）
  F3.art = (c, foes) => {
    if (F3.ki(c) <= 0) return false;
    const k = F3.artOf(c);
    const A = D.F3_ART[k];
    if (k === "mend") {
      if (!hurtCount(0.9)) return false;
      c.f5ki = F3.ki(c) - 1;
      G.log("nar", `${c.name}の奥の手「${A.name}」！`, {});
      party().forEach((w) => {
        const n = G.d(6) + 4;
        if (w === "you") { G.heal(n); G.note(`あなたの HP +${n}`); } else G.b5Heal(w, n, `${c.name}の${A.name}`);
      });
      return true;
    }
    const t = target(foes);
    const e = G.foeData(t);
    if (outclassed(c, e)) return false; // 歯が立たない相手には大技も届かない（牽制へ）
    c.f5ki = F3.ki(c) - 1;
    G.log("nar", `${c.name}の奥の手「${A.name}」！`, {});
    // 一撃は combat.js の仲間の一撃をそのまま使い、腕前と傷だけを上乗せした写しで振る（倒れたときの後始末も同じ）
    const strong = Object.create(c);
    strong.power = (c.power || 0) + 15;
    strong.dmg = (c.dmg || 0) * 2 + 4;
    G.cbAllyStrike(strong, t, e);
    return true;
  };
  // 押し切れ：狙いを攻める。歯が立たないなら牽制
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
  // 深手の味方に薬を使う（生き延びろ・力を残せ）。使えたら true
  function potion(c, low) {
    const need = G.b5Neediest && G.b5Neediest();
    if (!need || !(need.ratio < low) || !potionOf()) return false;
    return byOrder(c, G.alive(), "potion");
  }
  // 作戦で動く（false：ふだんの手番へ）。機を見て（今までの任せる）は、強敵に奥の手を使うときのほかは false
  function byTactic(c, foes, tac) {
    const C0 = C();
    if (tac === "wait") {
      (C0.f3back || (C0.f3back = [])).push(c.name);
      return true; // 指示を待って構える（記録には出さない。札に「命を待て」と出る）
    }
    if (tac === "adapt") {
      if (F3.ki(c) > 1 && !c.heal && big(target(foes))) return F3.art(c, foes);
      return false;
    }
    if (tac === "press") {
      if (c.heal && G.cbAllyHeal(c, F3.HEAL_AT.press)) return true;
      if (c.heal && hurtCount(0.5) && F3.art(c, foes)) return true;
      if (!c.heal && F3.art(c, foes)) return true;
      return press(c, foes);
    }
    if (tac === "shield") {
      if (c.heal && G.cbAllyHeal(c, F3.HEAL_AT.shield)) return true;
      const th = G.f2party && G.f2party.threat();
      if (th && G.f2party.cover(c, th)) return true;
      // F9：深手なら攻めずに防御（作戦の自動の手も防御を使う）
      if (ratioOf(c) < 0.4) { (C0.f3back || (C0.f3back = [])).push(c.name); G.note(`${c.name}は守りを固めて、次の機をうかがっている。`); return true; }
      return press(c, foes);
    }
    if (tac === "live") {
      if (c.heal && hurtCount(0.5) >= 2 && F3.art(c, foes)) return true;
      if (c.heal && G.cbAllyHeal(c, F3.HEAL_AT.live)) return true;
      if (potion(c, F3.LIVE_LOW)) return true;
      if (ratioOf(c) < 0.4) { (C0.f3back || (C0.f3back = [])).push(c.name); G.note(`${c.name}は傷をかばって防御を固めた。`); return true; }
      return false;
    }
    if (tac === "spare") return potion(c, F3.LIVE_LOW);
    return false;
  }
  F3.HEAL_AT = { press: 0.25, shield: 0.7, live: 0.85 };
  function byOrder(c, foes, o) {
    const c0 = C();
    if (o === "attack" || o === "magic") {
      const t = target(foes);
      G.cbAllyStrike(c, t, G.foeData(t));
      return true;
    }
    if (o === "art") return F3.art(c, foes) || byOrder(c, foes, c.fire ? "magic" : "attack");
    if (o === "heal") return G.cbAllyHeal(c, 1.01) || byTactic(c, foes, F3.tacticOf(c));
    if (o === "potion") {
      const id = potionOf();
      const need = G.b5Neediest && G.b5Neediest();
      if (!id || !need || !(need.ratio < 1) || !G.take(id)) return byTactic(c, foes, F3.tacticOf(c));
      const it = D.ITEMS[id];
      if (need.who === "you") { G.heal(it.hp); G.note(`${c.name}があなたに${it.name}を使った。HP +${it.hp > 100 ? "全快" : it.hp}`); }
      else G.b5Heal(need.who, it.hp, `${c.name}の${it.name}`);
      return true;
    }
    if (o === "cover") return G.f2party.cover(c, G.f2party.threat()) || byTactic(c, foes, F3.tacticOf(c));
    if (o === "feint") {
      const t = target(foes);
      if (!G.f2party.feint(c, t, G.foeData(t))) G.note(`${c.name}の牽制は、${t.name}に見切られた。`);
      return true;
    }
    if (o === "back") {
      (c0.f3back || (c0.f3back = [])).push(c.name);
      G.note(`${c.name}は防御を固めている。`);
      return true;
    }
    return byTactic(c, foes, F3.tacticOf(c));
  }
  // 作戦を渋る（好感度が低く、その作戦を嫌う性格）：その戦いの間は「機を見て」で動く。一言は一度だけ
  F3.tacBalks = (c, tac) => {
    const B = D.F3_TAC_BALK[tac];
    if (!B || !B.includes(c.trait)) return 0;
    const bond = typeof c.bond === "number" ? c.bond : 50;
    return bond >= 50 ? 0 : bond >= 30 ? 0.3 : 0.6;
  };
  function tacticNow(c) {
    const c0 = C();
    const tac = F3.tacticOf(c);
    const seen = c0.f5balk || (c0.f5balk = {});
    const key = c.id || c.name;
    if (seen[key] === undefined) {
      const p = F3.tacBalks(c, tac);
      seen[key] = p > 0 && G.rand() < p ? tac : "";
      if (seen[key]) {
        const L = (D.F3_TAC_BALK_LINE[tac] || ["{n}は自分の判断で動いた。"]);
        G.say(G.pick(L).split("{n}").join(short(c)));
      }
    }
    return seen[key] === tac ? "adapt" : tac;
  }

  G.cbAllyOrder = (c, foes) => {
    const c0 = C();
    if (!c0) return false;
    const o = F3.orderOf(c);
    if (o === "auto") return byTactic(c, foes, tacticNow(c));
    const p = F3.balkChance(c, o);
    if (p > 0 && G.rand() < p) { G.say(balkLine(c)); return false; } // 渋って、自分の判断で（ふだんの手番）
    return byOrder(c, foes, o);
  };
  G.cbAllyHurt = (c, dmg) => {
    const c0 = C();
    if (c0 && c0.f3back && c0.f3back.includes(c.name)) return Math.floor(dmg * F3.BACK);
    if (c0 && F3.orderOf(c) === "auto" && F3.tacticOf(c) === "shield" && !(c0.f5balk && c0.f5balk[c.id || c.name] === "shield")) return Math.max(1, Math.round(dmg * F3.SHIELD));
    return dmg;
  };
  // 奥の手は休むと戻る（宿・野営）
  const sleep0 = G.sleep;
  G.sleep = (...a) => {
    const r = sleep0(...a);
    ((G.S && G.S.companions) || []).forEach((c) => { c.f5ki = F3.KI_MAX; });
    return r;
  };

  // ---------------------------------------------------------------- 選択肢（手番は進まない）
  const tacSub = (k) => D.F3_TACTICS[k].sub;
  const baseActions = G.combatActions;
  G.combatActions = () => {
    const groups = baseActions();
    const s = G.S;
    const c0 = C();
    if (!c0 || s.over || !(s.companions || []).length || !G.alive().length) return groups;
    const tac = F3.tactic(s);
    groups.push({ title: `作戦（${D.F3_TACTICS[tac].name}）`, list: D.F3_TACTIC_KEYS.map((k) => ({
      id: "f3:tac:" + k, label: (k === tac ? "● " : "") + D.F3_TACTICS[k].name, sub: k === tac ? `いまの作戦：${tacSub(k)}` : tacSub(k), kw: ["作戦", D.F3_TACTICS[k].name],
    })) });
    (G.b5Standing ? G.b5Standing(s) : s.companions).forEach((c) => {
      if (!c.id) return;
      const cur = F3.orderOf(c);
      const mine = F3.tacticOf(c, s);
      const now = cur === "auto" ? `作戦：${D.F3_TACTICS[mine].name}` : D.F3_ORDERS[cur].name;
      groups.push({ title: `${F3.label(c, s)}（${now}）`, list: F3.ordersFor(c).map((o) => ({
        id: `f3:ord:${c.id}:${o}`, label: (o === cur ? "● " : "") + (o === "art" ? `奥の手「${D.F3_ART[F3.artOf(c)].name}」（${F3.ki(c)}）` : D.F3_ORDERS[o].name),
        sub: o === cur ? `この手番の指示：${D.F3_ORDERS[o].sub}` : o === "art" ? D.F3_ART[F3.artOf(c)].sub : D.F3_ORDERS[o].sub, kw: ["指示", F3.label(c, s), D.F3_ORDERS[o].name],
      })) });
    });
    return groups;
  };

  // 宿で、一行の作戦と仲間ごとの作戦を前もって決める（F5）。選ぶ相手を押すと、作戦の一覧に替わる（S.f3pick）
  F3.innGroups = (s) => {
    const list = (s.companions || []).filter((c) => c.id);
    if (!list.length) return [];
    const pick = s.f3pick;
    const who = pick && pick !== "all" ? list.find((c) => c.id === pick) : null;
    if (pick === "all" || who) {
      const cur = who ? (D.F3_TACTICS[who.f5tac] ? who.f5tac : "") : F3.tactic(s);
      const opts = D.F3_TACTIC_KEYS.map((k) => ({ id: `f3:set:${pick}:${k}`, label: (k === cur ? "● " : "") + D.F3_TACTICS[k].name, sub: tacSub(k), kw: ["作戦", D.F3_TACTICS[k].name] }));
      if (who) opts.push({ id: `f3:set:${pick}:same`, label: (!cur ? "● " : "") + "一行と同じ", sub: `一行の作戦（${D.F3_TACTICS[F3.tactic(s)].name}）に従う`, kw: ["作戦"] });
      opts.push({ id: "f3:pick:none", label: "やめる", sub: `${who ? F3.label(who, s) : "一行"}の作戦は今のまま`, kw: ["やめる"] });
      opts.forEach((o) => { if (o.id !== "f3:pick:none") o.sub = `${who ? F3.label(who, s) : "一行"}の作戦に：${o.sub}`; });
      return [{ title: "一行の作戦", list: opts }]; // 見出しは変えない（開いている分類の札が替わらないように）
    }
    const rows = [{ id: "f3:pick:all", label: `一行の作戦：${D.F3_TACTICS[F3.tactic(s)].name}`, sub: "仲間ぜんたいの戦い方。戦闘中も「その他」から変えられる", kw: ["作戦"] }];
    list.forEach((c) => rows.push({ id: `f3:pick:${c.id}`, label: `${F3.label(c, s)}：${D.F3_TACTICS[c.f5tac] ? D.F3_TACTICS[c.f5tac].name : "一行と同じ"}`, sub: `奥の手「${D.F3_ART[F3.artOf(c)].name}」あと ${F3.ki(c)} 回`, kw: ["作戦", F3.label(c, s)] }));
    return [{ title: "一行の作戦", list: rows }];
  };
  const baseAll = G.actions;
  G.actions = (...a) => {
    const groups = baseAll(...a);
    const s = G.S;
    const atInn = !!(s && !s.over && !s.combat && s.mode === "fac" && s.fac === "inn");
    if (s && s.f3pick && !atInn) delete s.f3pick;
    return atInn ? groups.concat(F3.innGroups(s)) : groups;
  };

  // f3: の手は、作戦・指示を覚えるだけ（手番も記録も進めない）。宿の f3:pick・f3:set も時間を進めない
  const baseAct = G.act;
  G.act = (id) => {
    const s = G.S;
    if (!/^f3:/.test(String(id))) return baseAct(id);
    if (!s || s.over) return;
    const a = G.actions().flatMap((g) => g.list).find((x) => x.id === id);
    if (!a || a.disabled) return;
    const [, kind, x, y] = String(id).split(":");
    // 宿で前もって決める（F5）
    if (kind === "pick") { if (x === "none") delete s.f3pick; else s.f3pick = x; return; }
    if (kind === "set") {
      if (x === "all" && D.F3_TACTICS[y]) s.f3tactic = y;
      else { const c = (s.companions || []).find((q) => q.id === x); if (c) { if (y === "same") delete c.f5tac; else if (D.F3_TACTICS[y]) c.f5tac = y; } }
      delete s.f3pick;
      return;
    }
    if (!s.combat) return;
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
