// F1：戦闘の読み合い・賭けの技・山場。名前の頭の z の数で、ほかの戦闘の包み（E4・L1・F2・U6 など）より後に読ませる。
// combat.js のつなぎ目（G.cbActs・G.cbDmgMod・G.cbMove・G.cbStruck・C.f1dodge）に中身を入れ、G.combatAct・G.combatActions・G.startCombat を包む。DOM には触らない。
//
// 読み合い：敵は手番の終わりに、次の手番にすることの気配を見せる（f.f1i = { k }。文は data/f1_tells.js）。気配のとおりに動く（はったりは無い）。
//   heavy 大技の溜め：次の一撃はおよそ 1.8 倍（当たりにくい）。身を守っても避けにくさは変わらないが、受け止めれば 1/4 になって敵が崩れる。躱すと丸ごと外れて崩れる。割り込めば技を潰す
//   quick 連撃      ：弱い一撃（0.55 倍）を 2 回。身を守ると 1/4 ずつ
//   brace 待ちの構え：殴ってこない。刃で踏み込むと浅くなり（半分）、返しの一撃を受ける。術は深く入る（1.3 倍）
//   chant 詠唱・息吹：鎧を素通りする重い一撃（1.5 倍）。割り込めば潰せる。躱せる
//   ult   本気の必殺：強敵・使徒が HP 半分を切ったあと。およそ 2 倍。潰せない。受けるか躱すか
//   崩れた敵（f.f1stun）は次の手番は動けず、次に受ける一撃が深く入る（f.f1open。1.5 倍、強敵は 1.3 倍）
// 知っている敵（図鑑で倒したことがある・覚え書きがある）は、気配のあとに一言（D.F1_HINT）が添い、合う手に「◎」が付く。成功率は変わらない（L1 と同じ考え）
// 賭けの技：捨て身（当たりにくいが 2.5 倍、外すと無防備）・身を削る（HP を払って当てやすく 1.8 倍。HP が半分あるうち）・目つぶし（狙いが気配を見せているとき、道具をひとつ投げ捨てて、気配を潰して崩す）
// 雑魚戦を長引かせない：ボスでない敵は、こちらの一撃で HP が 2 割を切るなら、そのまま倒れる（とどめ）
// 手応え（勝った戦いの読み勝ち・崩しなどの一行）は、持ち主「意味あるようにみえて意味不明なので表示ごとやめて」でやめた（F5。古いセーブの S.f1last は読まない）
// セーブに足すもの：S.combat.f1（数え）・敵の f1i / f1stun / f1open / f1rage / f1struck。古いセーブに無くても動く
// 乱数は G.rand / G.d / G.dice / G.pick だけ。レーン B（F1）
(function (G) {
  const D = G.data;
  const F1 = (G.f1 = G.f1 || {});

  const BLADE = ["attack", "vital", "f1cut", "f1all", "f1blood"];
  F1.P = { tell: 0.35, tellBoss: 0.4, tellRage: 0.45, ult: 0.35, maxTellers: 2, finish: 0.2 };
  F1.BIG_MUL = { heavy: 1.5, ult: 1.8, chant: 1.3 }; // 強敵・使徒は元の一撃が重いので、倍率は控えめ
  F1.MOVE = {
    heavy: { mul: 1.8, hit: -15, through: true, guardDiv: 4, name: "大技", you: true },
    quick: { times: 2, mul: 0.55, guardDiv: 4, name: "連撃" },
    chant: { mul: 1.5, pierce: true, name: "術", you: true },
    ult: { mul: 2, hit: -5, through: true, guardDiv: 3.5, name: "必殺", you: true },
  };

  const C = () => (G.S && G.S.combat) || null;
  const stats = () => { const c = C(); return c ? c.f1 || (c.f1 = { reads: 0, breaks: 0, best: 0, gwin: 0, glose: 0 }) : {}; };
  const raw = (f) => D.ENEMIES[f.id] || {};
  const isApostle = (f) => !!(f.e3 || raw(f).majin);
  const isBig = (f) => !!(raw(f).boss || isApostle(f));
  const walled = (f) => { const e = G.foeData(f); return !!(e && e.majin && !G.weapon().pierce); };
  const fill = (t, f) => String(t).split("{n}").join(f.name);

  // ---------------------------------------------------------------- 知っている敵
  F1.known = (id) => {
    const c = G.P && G.P.codex && G.P.codex.foes && G.P.codex.foes[id];
    if (c && c.kills > 0) return true;
    if (G.knowHas && G.l1) {
      if (G.knowHas(G.l1.foeKnowId(id))) return true;
      if ((G.l1.factIds(id) || []).some((k) => G.knowHas(k))) return true;
    }
    return false;
  };

  // ---------------------------------------------------------------- 気配の重み（データから。癖 D.F1_STYLE で足す）
  F1.weights = (id) => {
    const e = D.ENEMIES[id] || (D.E3 && D.E3.FOES && D.E3.FOES[id]) || {};
    const sh = e.shape || "humanoid";
    const w = { heavy: 1, quick: 0, brace: 0, chant: 0 };
    if ((e.agi || 0) >= 45 || sh === "swarm" || sh === "winged") w.quick = 1;
    if ((e.def || 0) >= 15 || sh === "blob") w.brace = 0.7;
    else if (sh === "humanoid") w.brace = 0.4;
    if (e.magic || sh === "dragon" || (e.mres || 0) >= 25) w.chant = 1;
    if (sh === "giant" || sh === "dragon") w.heavy = 1.5;
    if (sh === "swarm") w.heavy = 0.5;
    const st = (D.F1_STYLE || {})[id];
    if (st && st.w) Object.entries(st.w).forEach(([k, v]) => { w[k] = v === 0 ? 0 : (w[k] || 0) + v; });
    return w;
  };
  F1.styles = (id) => Object.entries(F1.weights(id)).filter(([, v]) => v > 0).map(([k]) => k);

  F1.tellText = (f, k) => {
    const st = (D.F1_STYLE || {})[f.id];
    if (st && st.tell && st.tell[k]) return fill(st.tell[k], f);
    const T = (D.F1_TELLS || {})[k] || {};
    const list = T[raw(f).shape] || T.any || ["{n}が何かを仕掛けてくる。"];
    return fill(G.pick(list), f);
  };

  function tell(f) {
    const k = f.f1i && f.f1i.k;
    if (!k) return;
    let text = F1.tellText(f, k);
    if (F1.known(f.id) && (D.F1_HINT || {})[k]) text += D.F1_HINT[k];
    G.log("nar", text, { tell: f.name, f1: k });
  }

  // 次の手番の気配を決める（崩れている敵は無し）
  function choose(f) {
    f.f1i = null;
    if (f.hp <= 0 || f.f1stun) return;
    const big = isBig(f);
    if (f.f1rage && !f.f1ultCd && G.rand() < F1.P.ult) { f.f1i = { k: "ult" }; f.f1ultCd = 2; return; }
    if (f.f1ultCd) f.f1ultCd--;
    const p = f.f1rage ? F1.P.tellRage : big ? F1.P.tellBoss : F1.P.tell;
    if (G.rand() >= p) return;
    const w = F1.weights(f.id);
    if (f.f1last === "brace") w.brace = 0; // 構えを続けない
    if (big) w.brace = (w.brace || 0) / 3; // 強敵は待たずに攻めてくる（山場は大技と必殺で作る）
    const keys = Object.keys(w).filter((k) => w[k] > 0);
    const sum = keys.reduce((a, k) => a + w[k], 0);
    if (!sum) return;
    let r = G.rand() * sum;
    for (const k of keys) { r -= w[k]; if (r < 0) { f.f1i = { k }; break; } }
    if (!f.f1i) f.f1i = { k: keys[keys.length - 1] };
  }
  function rally() {
    const list = G.alive();
    list.forEach((f) => { f.f1last = f.f1i ? f.f1i.k : null; f.f1struck = false; f.f1read = false; choose(f); });
    // 群れで全員が気配を見せると読めないので、多くても 2 体まで（強敵を先に残す）
    const tellers = list.filter((f) => f.f1i && f.f1i.k !== "ult").sort((a, b) => (isBig(b) ? 1 : 0) - (isBig(a) ? 1 : 0));
    tellers.slice(F1.P.maxTellers).forEach((f) => { f.f1i = null; });
    list.forEach(tell);
  }

  // 本気（強敵・使徒の HP が半分を切った）
  function rage() {
    G.alive().forEach((f) => {
      if (!isBig(f) || f.f1rage || f.hp > f.max / 2) return;
      f.f1rage = true;
      const R = D.F1_RAGE || {};
      const list = R[f.id] || (isApostle(f) ? R.apostle : null) || R.any || ["{n}が本気になった。"];
      G.log("nar", fill(G.pick(list), f), { tell: f.name, rage: 1 });
    });
  }

  // ---------------------------------------------------------------- つなぎ目
  // 敵がこの手番にすること
  G.cbMove = (f) => {
    if (f.f1stun) { f.f1stun = 0; f.f1i = null; return { skip: true, text: `${f.name}は崩れた体勢を立て直している。` }; }
    const i = f.f1i;
    if (!i) return null;
    if (i.k === "brace") {
      if (f.f1struck) return { you: true, mul: 1, name: "返しの一撃", text: `構えていた${f.name}が、踏み込んだあなたに返しの一撃を見舞う！`, f1: "brace" };
      return { skip: true, text: `${f.name}は構えたまま、こちらの出方をうかがっている。` };
    }
    if (i.cut) return { skip: true, text: `${f.name}の溜めた力は、行き場を失って霧散した。` };
    const m = F1.MOVE[i.k];
    if (!m) return null;
    return Object.assign({}, m, isBig(f) && F1.BIG_MUL[i.k] ? { mul: F1.BIG_MUL[i.k] } : {}, { f1: i.k, text: i.k === "ult" ? `${f.name}の全力の一撃が来る！` : i.k === "heavy" ? `${f.name}の${m.name}が来る！` : "" });
  };

  // 敵の一撃のあと：身を守って大技を受け止めた・躱した → 崩れる。読み勝ち
  G.cbStruck = (f, e, mv, who, dmg, how) => {
    if (!mv || !mv.f1 || who) return;
    const c = C();
    if (!c) return;
    const s = stats();
    const big = ["heavy", "ult", "chant"].includes(mv.f1);
    if (how === "dodged") {
      if (big) { s.reads++; breakFoe(f, `大きく空振りした${f.name}の体が、泳いだ。`); }
      return;
    }
    if (c.guard && dmg && (mv.f1 === "heavy" || mv.f1 === "ult")) {
      s.reads++;
      breakFoe(f, `${mv.name}を正面から受け止めた。${f.name}の体勢が崩れた！`);
    } else if (c.guard && mv.f1 === "quick" && !mv.counted) {
      mv.counted = true;
      s.reads++;
      G.note(`守りを固めて、${f.name}の連撃をしのいだ。`);
    }
  };
  function breakFoe(f, text) {
    if (f.hp <= 0 || f.f1stun) return;
    f.f1stun = 1;
    f.f1open = true;
    stats().breaks++;
    G.log("nar", text, { tell: f.name, brk: 1 });
  }

  // こちらの一撃のダメージ
  G.cbDmgMod = (f, n, how) => {
    const c = C();
    if (!c || !n) return n;
    const s = stats();
    const blade = how === "blade";
    const spell = ["fire", "ice", "bolt"].includes(how);
    if (how === "curse") return n; // 呪いの蝕みは手番の外
    if (f.f1i && f.f1i.k === "brace" && !f.f1stun) {
      if (blade) { n = Math.max(1, Math.floor(n / 2)); f.f1struck = true; G.note(`構えに阻まれ、刃が浅い。`); }
      else if (spell) { n = Math.ceil(n * 1.3); if (!f.f1read) { f.f1read = true; s.reads++; } G.note(`構えた${f.name}は、術には無防備だった。`); }
    }
    if (f.f1open && (blade || spell)) { n = Math.ceil(n * (isBig(f) ? 1.3 : 1.5)); f.f1open = false; G.note(`崩れたところへ、深く入った。`); }
    // とどめ（雑魚戦を長引かせない）
    if (!isBig(f) && (blade || spell || how === "holy") && f.hp - n > 0 && f.hp - n <= Math.max(2, Math.floor(f.max * F1.P.finish))) {
      n = f.hp;
      G.note("勢いのまま、とどめを刺した。");
    }
    if (n > (s.best || 0)) s.best = n;
    return n;
  };

  // ---------------------------------------------------------------- こちらの手
  const w = () => G.weapon();
  const pow = (k, n) => (G.s5PowOf ? G.s5PowOf(k, n) : 0);
  const baseDmg = () => G.dice(w().dmg) + (w().stat === "筋力" ? pow("筋力", 15) : pow("敏捷", 20));
  const eva = (t) => G.foeVs.eva(G.foeData(t));
  // 成功率（画面と判定で同じ数）
  F1.BONUS = { cut: 15, all: -20, blood: 20, throw: 30, throwBig: -20 };
  F1.bloodCost = (S) => Math.max(2, Math.ceil((S || G.S).maxHp * 0.12));
  F1.throwItem = (S) => {
    S = S || G.S;
    const list = Object.keys(S.inv || {}).filter((id) => { const it = D.ITEMS[id]; return it && it.type === "use" && !it.escape && !it.holy && S.inv[id] > 0; });
    list.sort((a, b) => (D.ITEMS[a].price || 0) - (D.ITEMS[b].price || 0));
    return list[0] || null;
  };
  // 躱すときに見る相手：あなたに向かってくる気配の敵を先に
  const threat = () => {
    const list = G.alive();
    return list.find((f) => f.f1i && ["ult", "heavy", "chant"].includes(f.f1i.k)) || list.find((f) => f.f1i && f.f1i.k === "quick") || G.target();
  };
  const dodgeBonus = (f) => { const k = f && f.f1i && f.f1i.k; return k === "heavy" || k === "chant" ? 15 : k === "quick" ? -15 : 0; };
  F1.chance = {
    cut: () => { const t = G.target(); return G.chance(w().stat, { vs: eva(t) }, (w().hit || 0) + F1.BONUS.cut); },
    all: () => { const t = G.target(); return G.chance(w().stat, { vs: eva(t) }, (w().hit || 0) + F1.BONUS.all); },
    blood: () => { const t = G.target(); return G.chance(w().stat, { vs: eva(t) }, (w().hit || 0) + F1.BONUS.blood); },
    throw: () => { const t = G.target(); return G.chance("敏捷", { vs: eva(t) }, F1.BONUS.throw + (isBig(t) ? F1.BONUS.throwBig : 0)); },
    dodge: () => { const f = threat(); return G.chance("敏捷", { vs: G.foeVs.acc(G.foeData(f)) }, dodgeBonus(f)); },
  };

  G.cbActs.f1cut = (t) => {
    const c = C();
    G.log("you", `${t.name}の出鼻をくじきにいく`);
    const r = G.check(w().stat, { vs: eva(t) }, "割り込み", (w().hit || 0) + F1.BONUS.cut);
    if (!r.ok) { G.say("割り込みは間に合わなかった。"); return; }
    const k = t.f1i && t.f1i.k;
    if (walled(t)) { G.cbDamage(t, 1, "blade"); return; } // 絶界に弾かれる（文は combat.js）
    if (k === "heavy" || k === "chant") {
      t.f1i.cut = true;
      stats().reads++;
      G.log("nar", `${k === "chant" ? "唱え終わる" : "振り下ろす"}前に割り込み、${t.name}の技を潰した！`, { tell: t.name, brk: 1 });
    } else if (k === "ult") G.say(`割り込んだが、${t.name}の気迫に押し返された。この技は止まらない。`);
    G.cbDamage(t, Math.max(1, Math.ceil(baseDmg() / 2)), "blade");
    if (c && r.fumble) c.exposed = true;
  };
  G.cbActs.f1dodge = () => {
    const c = C();
    const f = threat();
    G.log("you", "相手の動きに目を据え、躱す構えを取る");
    const r = G.check("敏捷", { vs: G.foeVs.acc(G.foeData(f)) }, "見切り", dodgeBonus(f));
    if (r.ok) { c.f1dodge = true; G.say(`${f.name}の肩の動きに、目が吸いついた。`); }
    else { c.exposed = true; G.say("読みが外れ、体が泳いだ。"); }
  };
  G.cbActs.f1all = (t) => {
    const c = C();
    const s = stats();
    G.log("you", `すべてを賭けて、${t.name}に捨て身で斬り込む`);
    const r = G.check(w().stat, { vs: eva(t) }, "捨て身の一撃", (w().hit || 0) + F1.BONUS.all);
    if (r.ok) {
      s.gwin++;
      const dmg = Math.ceil(baseDmg() * (r.crit ? 3.5 : 2.5));
      G.log("nar", r.crit ? "渾身の一撃が、深々と突き刺さった！" : "体ごと叩きつけた一撃が、まともに入った！", { fx: "crit" });
      G.cbDamage(t, dmg, "blade");
    } else {
      s.glose++;
      c.exposed = true;
      G.say(r.fumble ? "大きく空を切り、たたらを踏んだ。背中ががら空きだ。" : "捨て身の一撃は空を切った。無防備な体をさらしている。");
    }
  };
  G.cbActs.f1blood = (t) => {
    const S = G.S;
    const s = stats();
    const cost = Math.min(F1.bloodCost(S), S.hp - 1);
    G.log("you", `己の身を削って、${t.name}に打ち込む`);
    S.hp -= cost;
    G.log("nar", `傷口が開くのも構わず踏み込んだ。${cost} のダメージ。`, { fx: "hurt", n: cost, heavy: false });
    const r = G.check(w().stat, { vs: eva(t) }, "身を削る一撃", (w().hit || 0) + F1.BONUS.blood);
    if (r.ok) { s.gwin++; G.cbDamage(t, Math.ceil(baseDmg() * (r.crit ? 2.5 : 1.8)), "blade"); }
    else { s.glose++; G.say("血を払った一撃も、届かなかった。"); }
  };
  G.cbActs.f1throw = (t) => {
    const S = G.S;
    const s = stats();
    const id = F1.throwItem(S);
    if (!id || !G.take(id)) { G.say("投げつける物が無い。"); return; }
    G.log("you", `${D.ITEMS[id].name}を${t.name}の顔めがけて投げつける`);
    const r = G.check("敏捷", { vs: eva(t) }, "目つぶし", F1.BONUS.throw + (isBig(t) ? F1.BONUS.throwBig : 0));
    if (r.ok && !walled(t)) {
      s.gwin++;
      t.f1i = null;
      breakFoe(t, `中身が${t.name}の目に飛び散った。のけぞって、構えが崩れた！`);
    } else { s.glose++; G.say(walled(t) ? "瓶は見えない壁に当たって砕けた。" : "瓶は肩をかすめて、地面で割れた。"); }
  };

  // ---------------------------------------------------------------- 選択肢
  const baseActions = G.combatActions;
  G.combatActions = () => {
    const groups = baseActions();
    const S = G.S;
    const c = C();
    const t = G.target();
    if (!c || !t || S.over) return groups;
    const find = (id) => groups.find((g) => g.list.some((a) => a.id === id));
    const insertAfter = (id, item) => { const g = find(id); if (!g) return false; g.list.splice(g.list.findIndex((a) => a.id === id) + 1, 0, item); return true; };
    const disarmed = !!c.e4disarm;
    // F9：攻撃は「〇〇で攻撃」の一つだけ（割り込む・捨て身・身を削るは外した。持ち主「割り込むも面倒なので無くていい」）。躱すは防御に溶かした。
    //   手の中身（G.cbActs.f1cut など）は、古いセーブ・直に呼ぶ流れのために残す
    void insertAfter; void disarmed;
    const item = F1.throwItem(S);
    const bet = { title: "賭け", list: [
      { id: "cb:f1throw", label: item ? `${D.ITEMS[item].name}を投げて目つぶし` : "目つぶし", sub: !item ? "投げる物が無い" : !t.f1i ? "狙いが何か仕掛けてくるときに" : `${D.ITEMS[item].name}を失う・敏捷 ${F1.chance.throw()}%・気配を潰して崩す`, disabled: !item || !t.f1i || walled(t), kw: ["目つぶし", "投げ"] },
    ] };
    const at = groups.indexOf(find("cb:attack"));
    groups.splice(at >= 0 ? at + 1 : groups.length, 0, bet);
    // 知っている敵の気配に合う手に「◎」
    const want = new Set();
    G.alive().forEach((f) => { if (f.f1i && F1.known(f.id)) ((D.F1_ANSWER || {})[f.f1i.k] || []).forEach((id) => want.add(id)); });
    if (want.size) groups.forEach((g) => g.list.forEach((a) => { if (want.has(a.id) && !a.disabled) a.sub = `◎読み・${a.sub || ""}`; }));
    return groups;
  };

  // ---------------------------------------------------------------- 手番
  const baseStart = G.startCombat;
  G.startCombat = (ids, opt) => {
    const r = baseStart(ids, opt);
    const c = C();
    if (c && !G.S.over && !c.f1) {
      stats();
      G.alive().forEach((f) => { f.f1i = null; });
      // 強敵は初めから気配を見せる。雑魚は普段どおり
      G.alive().forEach((f) => { if (isBig(f)) { const ws = F1.weights(f.id); f.f1i = { k: ws.heavy ? "heavy" : F1.styles(f.id)[0] || "heavy" }; tell(f); } });
    }
    return r;
  };

  const baseAct = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const c = S && S.combat;
    if (!c || S.over) return baseAct(arg);
    arg = String(arg);
    const kind = arg.split(":")[0];
    if (c.e4disarm && BLADE.includes(kind) && kind !== "attack" && kind !== "vital") arg = "attack"; // 武器を落としていたら、まず拾う（E4）
    stats();
    baseAct(arg);
    if (S.over) return;
    if (S.combat === c && S.mode === "combat" && G.alive().length) {
      c.f1dodge = false;
      rage();
      rally();
      return;
    }
  };

  // ---------------------------------------------------------------- 遊び方の一行（U4）：気配が初めて見えたとき
  if (G.PLAY_TIPS && G.playTip) {
    G.PLAY_TIPS.f1 = "読み合い：左に線の付いた太字の行は、敵が次にしそうなことの気配。気配に合う手（防御・術・戦技）を選ぶと、結果が大きく変わる。倒したことのある敵なら、合う手に◎が付く。";
    const baseTip = G.playTip;
    G.playTip = (S, P) => {
      const seen = (P && P.tips) || {};
      if (S && !S.over && S.mode === "combat" && seen.combat && !seen.f1 && G.alive().some((f) => f.f1i)) return { key: "f1", text: G.PLAY_TIPS.f1 };
      return baseTip(S, P);
    };
  }

  // ---------------------------------------------------------------- 図鑑と覚え書き
  // 覚え書きの手の名前（f1cut などは古い記録のために残す。F9：防御）
  if (G.l1 && G.l1.ACTS) Object.assign(G.l1.ACTS, { f1cut: "割り込み", f1dodge: "躱す", f1all: "捨て身", f1blood: "身を削る", f1throw: "目つぶし", guard: "防御" });
  if (G.codexFoeStats) {
    const baseStats = G.codexFoeStats;
    G.codexFoeStats = (id) => {
      const rows = baseStats(id);
      if (!rows || !rows.length) return rows;
      const killed = !!(G.codexFoe && (G.codexFoe(id) || {}).kills);
      const e = D.ENEMIES[id] || (D.E3 && D.E3.FOES && D.E3.FOES[id]) || {};
      const list = F1.styles(id).map((k) => D.F1_NAME[k]);
      if (e.boss || e.majin) list.push(D.F1_NAME.ult);
      rows.push(["気配", killed ? list.join("・") || "なし" : "？"]);
      return rows;
    };
  }
})(globalThis.G = globalThis.G || {});
