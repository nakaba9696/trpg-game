// K1：スキル（技）。データは src/data/k1_skills.js（技・師・巻物）と src/data/k1_field.js（戦闘の外の選択肢・出来事）。
// 持ち主「魔法以外にスキルも実装してほしい。スキルは鍛錬したり、人から教えてもらったり、巻物を拾ったりなどで覚えることができる」
//
// 覚え方：
//   鍛錬 … 町の訓練場（「技の稽古」。金と日数。町・職業・F3 の節目で鍛えられる技が変わる）と、荒野の野営（「野営の稽古」。日数だけ・難しい）。
//          しくじっても積み重ね（S.k1.prog）が残り、次は当たりやすい
//   師   … 町の施設にいる人（D.K1_TEACHERS の fac。名声・罪・善行・依頼の数・位・評判が条件）、出来事で出会う人（ev）、打ち解けた仲間（comp）
//   巻物 … 技の巻物（type "k1scroll"）。店の掘り出し物・敵の落とし物・出来事。読むと覚えて崩れる。能力値が目安に届かないと読めない。古い字の巻物は古文字読みか知力が要る
//   出来事の結果に skill（覚える）・k1scroll（巻物を一つ）・k1use（覚えた技の熟練）を書ける（G.apply を包む）
// 気力（S.k1.ki）：戦闘の技に使う。眠ると全快。戦闘の中では、身を守る・読み勝つ（F1 の読み勝ちが増える）と一つ戻る。勝つと一つ戻る
// 熟練（S.k1.use）：使うたびに数え、D.K1_LV で段が上がる（判定 +5％ずつ。極みは気力が一つ軽い）
// 戦闘：「技」の組（cb:k1:<技>）。武器の型が合わない・気力が足りない技は、理由を添えて薄く出す。
//   F1 の読み合いとつながる：割り込み（cut）・気配を潰す（pin）・崩す（brk・stun）・受け流し（F1 の躱すと同じ口で、斬り返す）・構えて返す（counter）・
//   誘い（狙いに大技の気配を出させる）・見切り（◎が付く）。知っている敵の気配に合う技にも ◎ を付ける
// 戦闘の外：出来事の選択肢（型 D.K1_TPL・手書き D.K1_ADD。印は k1、添え書きは技の名）・施設の「身につけた技で」（D.K1_FAC）・
//   手当て・追跡・薬草摘み（探索の行動）・野営術（野営の回復）
// 武器の型は K.styles() ひとつで決める（右手の武器の型・両手持ち。I2 の左手の枠から二刀と盾）
// セーブに足す項目（古いセーブで無くても動く）：S.skills（覚えた技の id）・S.k1 = { ki, use, prog, day }。戦闘中の C.k1*・敵の k1bleed / k1lure
// 名前の頭の z の数は、F1（zzzzzzzzzz_f1_duel.js）より後に読ませるため。DOM には触らない。乱数は G.rand / G.d / G.dice / G.pick。レーン C＋B（K1）
(function (G) {
  const D = G.data;
  if (!D.SKILLS) return;
  const K = (G.k1 = G.k1 || {});
  const SK = D.SKILLS;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const pow = (k, n) => (G.s5PowOf ? G.s5PowOf(k, n) : 0);

  // ---------------------------------------------------------------- 店と落とし物（場所と敵のデータがそろったあとで）
  Object.entries(D.K1_SHOP || {}).forEach(([loc, ids]) => {
    const L = D.LOCS[loc];
    if (!L) return;
    L.shop = L.shop || [];
    ids.forEach((id) => { const it = D.K1_SCROLL(id); if (D.ITEMS[it] && !L.shop.includes(it)) L.shop.push(it); });
  });
  Object.entries(D.K1_DROPS || {}).forEach(([eid, list]) => {
    const e = D.ENEMIES[eid];
    if (!e) return;
    e.loot = [...(e.loot || []), ...list.map(([id, p]) => [D.K1_SCROLL(id), p]).filter(([it]) => D.ITEMS[it])];
  });

  // ---------------------------------------------------------------- 状態
  K.kiMax = (S) => { S = S || G.S; return Math.min(8, 3 + Math.floor((((S && S.stats) || {}).体力 || 0) / 15)); };
  K.state = (S) => {
    S = S || G.S;
    if (!S.k1) S.k1 = { ki: K.kiMax(S), use: {}, prog: {}, day: {} };
    const x = S.k1;
    x.use = x.use || {}; x.prog = x.prog || {}; x.day = x.day || {};
    if (!Number.isFinite(x.ki)) x.ki = K.kiMax(S);
    x.ki = G.clamp(x.ki, 0, K.kiMax(S));
    if (!Array.isArray(S.skills)) S.skills = [];
    return x;
  };
  K.list = (S) => { S = S || G.S; return ((S && S.skills) || []).filter((id) => SK[id]); };
  K.knows = (id, S) => K.list(S).includes(id);
  K.ki = (S) => K.state(S).ki;
  K.gainKi = (n, S) => { S = S || G.S; const x = K.state(S); x.ki = G.clamp(x.ki + n, 0, K.kiMax(S)); };

  // 熟練
  K.uses = (id, S) => (K.state(S).use[id] || 0);
  K.lv = (id, S) => { const n = K.uses(id, S); let lv = 0; D.K1_LV.forEach((m, i) => { if (n >= m) lv = i; }); return lv; };
  K.lvName = (id, S) => D.K1_LV_NAMES[K.lv(id, S)];
  K.extra = (id, S) => 5 * K.lv(id, S);
  K.cost = (id, S) => Math.max(0, (SK[id].ki || 0) - (K.lv(id, S) >= 3 ? 1 : 0));
  K.use = (id, n) => {
    const S = G.S;
    if (!S || !K.knows(id)) return;
    const x = K.state(S);
    const a = K.lv(id);
    x.use[id] = (x.use[id] || 0) + (n || 1);
    const b = K.lv(id);
    if (b > a) G.log("grow", `技「${SK[id].name}」が${D.K1_LV_NAMES[b]}の域に達した。`, { k1: id, lv: b });
  };

  // 覚える
  K.needMiss = (id, S) => {
    S = S || G.S;
    const n = SK[id].need || {};
    return Object.keys(n).filter((k) => ((S.stats || {})[k] || 0) < n[k]);
  };
  K.learn = (id, how) => {
    const S = G.S;
    if (!S || !SK[id] || K.knows(id)) return false;
    K.state(S);
    S.skills.push(id);
    delete S.k1.prog[id];
    const s = SK[id];
    G.log("grow", `技「${s.name}」を覚えた──${s.hint}`, { k1: id, learn: how || "" });
    if (G.chron) G.chron(`技「${s.name}」を覚える`);
    return true;
  };
  // 新しい冒険：職業ごとにはじめから覚えている技
  const newGame0 = G.newGame;
  G.newGame = (opt) => {
    const S = newGame0(opt);
    if (S) {
      S.skills = [...((D.SKILL_START || {})[S.cls] || [])].filter((id) => SK[id]);
      S.k1 = null;
      K.state(S);
    }
    return S;
  };
  // 眠ると気力が戻る（宿・野営）
  const sleep0 = G.sleep;
  G.sleep = () => { const r = sleep0(); if (G.S) K.state(G.S).ki = K.kiMax(G.S); return r; };

  // ---------------------------------------------------------------- 武器の型（ここだけ見れば型が決まる）
  K.WEAPON_KIND = { fists: "拳", dagger: "短剣", longsword: "剣", mace: "槌", axe: "斧", katana: "刀", staff: "杖", rapier: "剣", mithril: "剣", oniclub: "槌", volgrim: "剣", byakuya: "刀" };
  K.I3_KIND = { 拳具: "拳", 鎌: "剣", 鎖: "鞭" };
  const BY_NAME = [[/弓/, "弓"], [/槍|矛|薙刀|鉾|銛/, "槍"], [/短剣|ナイフ|鎧通し|匕首|鉤/, "短剣"], [/刀/, "刀"], [/斧|鉈/, "斧"],
    [/槌|棍|金棒|フレイル|鎚|メイス|錫杖|匙/, "槌"], [/杖|指揮棒/, "杖"], [/鞭/, "鞭"], [/籠手|拳|素手/, "拳"], [/礫|投げ|手裏剣|筒/, "投げ物"], [/剣|刃|鎌/, "剣"]];
  K.kindOf = (it, id) => {
    if (!it) return "拳";
    if (it.i3 && it.i3.k) return K.I3_KIND[it.i3.k] || it.i3.k;
    if (id && K.WEAPON_KIND[id]) return K.WEAPON_KIND[id];
    const hit = BY_NAME.find(([re]) => re.test(it.name || ""));
    return hit ? hit[1] : "剣";
  };
  K.styles = (S) => {
    S = S || G.S;
    const out = new Set();
    if (!S) return out;
    const w = S === G.S ? G.weapon() : D.ITEMS[S.weapon] || D.ITEMS.fists;
    out.add(K.kindOf(w, S.weapon));
    if (w && (w.hands === 2 || (w.i3 && w.i3.h === 2))) out.add("両手");
    // 左手（I2 の装備の枠 S.off）：武器なら二刀（右手にも武器があるとき）、防具なら盾。両手持ちで塞がっていれば何も無い
    const X = G.i2s;
    const off = X && X.item ? X.item("off", S) : null;
    if (off && off.type === "weapon" && S.weapon && S.weapon !== "fists") out.add("二刀");
    if (off && off.type === "armor") out.add("盾");
    if (w && w.dual) out.add("二刀");
    return out;
  };
  K.styleOk = (id, S) => { const st = SK[id].style; if (!st) return true; const have = K.styles(S); return st.some((k) => have.has(k)); };

  // ---------------------------------------------------------------- 戦闘
  const C = () => (G.S && G.S.combat) || null;
  const raw = (f) => D.ENEMIES[f.id] || {};
  const isBig = (f) => !!(raw(f).boss || f.e3 || raw(f).majin);
  const walled = (f) => { const e = G.foeData(f); return !!(e && e.majin && !G.weapon().pierce); };
  const f1stats = () => { const c = C(); return c ? c.f1 || (c.f1 = { reads: 0, breaks: 0, best: 0, gwin: 0, glose: 0 }) : {}; };
  K.statOf = (id) => { const s = SK[id].stat; return s === "武器" ? G.weapon().stat || "筋力" : s; };
  const baseDmg = (stat) => G.dice(G.weapon().dmg) + (stat === "筋力" ? pow("筋力", 15) : pow(stat === "敏捷" ? "敏捷" : stat, 20));
  const threat = () => {
    const list = G.alive();
    return list.find((f) => f.f1i && ["ult", "heavy", "chant"].includes(f.f1i.k)) || list.find((f) => f.f1i && f.f1i.k === "quick") || G.target();
  };
  // 成功率（画面と判定で同じ数）。判定の無い技は null
  K.chance = (id) => {
    const s = SK[id];
    const t = G.target();
    if (!t || !s.fx) return null;
    const ex = K.extra(id);
    const stat = K.statOf(id);
    switch (s.fx.t) {
      case "hit": return G.chance(stat, { vs: G.foeVs.eva(G.foeData(t), stat) }, (G.weapon().hit || 0) + (s.fx.hit || 0) + ex);
      case "parry": return G.chance(stat, { vs: G.foeVs.acc(G.foeData(threat())) }, 10 + ex);
      case "heal": return G.chance(stat, "易しい", ex);
      case "feint": return G.chance(stat, { vs: G.foeVs.will(G.foeData(t)) }, ex);
      default: return null;
    }
  };
  // 使えない理由（使えるなら ""）
  K.why = (id, S) => {
    S = S || G.S;
    const s = SK[id];
    if (!K.knows(id, S)) return "覚えていない";
    if (!K.styleOk(id, S)) return `${s.style.join("か")}を持っていれば`;
    const c = S.combat;
    if (c && c.e4disarm && (s.style || s.stat === "武器")) return "武器を落としている";
    if (K.ki(S) < K.cost(id, S)) return "気力が足りない";
    if (s.fx && s.fx.t === "stance" && c && c.k1stance && c.k1stance.n > 0) return "もう型に入っている";
    if (s.fx && s.fx.t === "read" && c && c.k1read) return "もう見切っている";
    if (s.fx && s.fx.t === "heal" && S.hp >= S.maxHp) return "傷が無い";
    return "";
  };
  function breakFoe(f, text) {
    if (!f || f.hp <= 0 || f.f1stun) return;
    f.f1stun = 1;
    f.f1open = true;
    f1stats().breaks++;
    G.log("nar", text, { tell: f.name, brk: 1 });
  }
  const read = () => { f1stats().reads++; };

  function strike(id, t) {
    const s = SK[id];
    const fx = s.fx;
    const c = C();
    const stat = K.statOf(id);
    const w = G.weapon();
    const times = fx.times || 1;
    let order = fx.all ? G.alive().slice() : null;
    let n = fx.all ? order.length : times;
    for (let i = 0; i < n && !G.S.over; i++) {
      let tg = fx.all ? order[i] : fx.spread ? G.alive()[i % Math.max(1, G.alive().length)] : t;
      if (!tg || tg.hp <= 0) tg = G.alive()[0];
      if (!tg) break;
      const r = G.check(stat, { vs: G.foeVs.eva(G.foeData(tg), stat) }, s.name, (w.hit || 0) + (fx.hit || 0) + K.extra(id));
      if (!r.ok) {
        G.say(fx.all ? `${tg.name}には届かなかった。` : "技は空を切った。");
        if (r.fumble) c.exposed = true;
        continue;
      }
      if (walled(tg)) { G.cbDamage(tg, 1, "blade"); continue; }
      const k = tg.f1i && tg.f1i.k;
      // 溜め・詠唱を潰す
      if (fx.cut && (k === "heavy" || k === "chant") && !tg.f1i.cut) {
        tg.f1i.cut = true;
        read();
        G.log("nar", `${k === "chant" ? "唱え終わる" : "振り下ろす"}前に斬り込み、${tg.name}の技を潰した！`, { tell: tg.name, brk: 1 });
      }
      // 仕掛けを潰す（必殺は止まらない）
      if (fx.pin && k && k !== "ult") { tg.f1i = null; read(); G.log("nar", `${tg.name}は足もとの一射にたたらを踏み、仕掛けを崩した。`, { tell: tg.name }); }
      // 待ちの構えを避ける・崩す
      const brace = k === "brace" && !tg.f1stun && (fx.nobrace || (fx.brk || []).includes("brace"));
      const saved = brace ? tg.f1i : null;
      if (brace) tg.f1i = null;
      let dmg = baseDmg(stat) * (fx.mul || 1);
      if (fx.open && (tg.f1stun || tg.f1open || (tg.f1i && tg.f1i.k))) { dmg = baseDmg(stat) * fx.open; G.note(`${tg.name}の死角に入った。`); }
      if (r.crit) { dmg *= 1.5; G.log("nar", "会心の一撃！", { fx: "crit" }); }
      if (c.k1focus) { dmg *= 1.5; c.k1focus = false; }
      G.cbDamage(tg, Math.max(1, Math.round(dmg)), "blade");
      if (brace) {
        if ((fx.brk || []).includes("brace")) { read(); breakFoe(tg, `待ち構えていた${tg.name}の構えごと、叩き崩した！`); }
        else { tg.f1i = saved; G.note(`構えの隙間を、穂先が抜けた。`); }
      } else if (fx.brk && k && fx.brk.includes(k) && k !== "ult" && tg.hp > 0) { read(); tg.f1i = null; breakFoe(tg, `仕掛けようとした${tg.name}の体勢を、正面から崩した！`); }
      if (fx.stun && tg.hp > 0) {
        if (isBig(tg)) G.note(`${tg.name}は、びくともしない。`);
        else breakFoe(tg, `${tg.name}の息が詰まり、膝が落ちた！`);
      }
      if (fx.bleed && tg.hp > 0) { tg.k1bleed = fx.bleed; G.note(`${tg.name}の傷口が、黒ずみはじめた。`); }
    }
  }

  G.cbActs.k1 = (t, id) => {
    const S = G.S;
    const c = C();
    const s = SK[id];
    if (!s || !c || !s.fx) return;
    const why = K.why(id, S);
    if (why) { G.say(`${s.name}は使えない（${why}）。`); return; }
    const x = K.state(S);
    x.ki -= K.cost(id, S);
    K.use(id);
    G.log("you", `技「${s.name}」${s.say ? "──" + s.say.replace(/\{t\}/g, t.name) : ""}`);
    const fx = s.fx;
    if (fx.t === "hit") return strike(id, t);
    if (fx.t === "parry") {
      const f = threat();
      const r = G.check(K.statOf(id), { vs: G.foeVs.acc(G.foeData(f)) }, s.name, 10 + K.extra(id));
      if (r.ok) { c.f1dodge = true; c.k1parry = { mul: fx.mul || 1 }; G.say(`${f.name}の得物の筋が、はっきりと見えた。`); }
      else G.say("受けの形が、わずかに遅れた。");
      return;
    }
    if (fx.t === "counter") { c.guard = true; c.k1counter = { mul: fx.mul || 1, hit: {} }; G.say("穂先の向こうで、相手が踏み込みをためらった。"); return; }
    if (fx.t === "wall") { c.guard = true; c.k1wall = fx.def || 0; G.say("盾の裏で、体じゅうの力を一つにまとめた。"); return; }
    if (fx.t === "stance") { c.k1stance = { k: fx.k, n: fx.n || 3 }; G.note(`${s.name}（${c.k1stance.n}手番）`); return; }
    if (fx.t === "read") { c.k1read = true; G.say("相手の肩が動く。次に来る手が読めた。"); return; }
    if (fx.t === "focus") { K.gainKi(1, S); c.k1focus = true; G.say("体の芯に、熱が一つ灯った。"); return; }
    if (fx.t === "heal") {
      const r = G.check(K.statOf(id), "易しい", s.name, K.extra(id));
      if (r.ok) { const n = G.dice(fx.dice || [1, 6, 2]) + pow("知力", 20); G.heal(n); G.note(`HP +${n}`); }
      else G.say("手が震えて、うまく縛れなかった。");
      return;
    }
    if (fx.t === "feint") {
      if (isBig(t)) { G.say(`${t.name}は、誘いには乗ってこなかった。`); return; }
      const r = G.check(K.statOf(id), { vs: G.foeVs.will(G.foeData(t)) }, s.name, K.extra(id));
      if (r.ok) { t.k1lure = true; G.say(`${t.name}の目が、開いた胸に吸い寄せられた。`); }
      else { c.exposed = true; G.say("見せた隙が、本物の隙になった。"); }
    }
  };

  // 受け流し・構えて返す：敵の一撃のあと（F1 のつなぎ目を包む）
  const struck0 = G.cbStruck;
  G.cbStruck = (f, e, mv, who, dmg, how) => {
    if (struck0) struck0(f, e, mv, who, dmg, how);
    const c = C();
    if (!c || who || f.hp <= 0) return;
    if (how === "dodged" && c.k1parry) {
      const big = mv && ["heavy", "ult", "chant"].includes(mv.f1);
      const n = Math.max(1, Math.round(baseDmg(G.weapon().stat || "筋力") * c.k1parry.mul * (big ? 1.5 : 1)));
      c.k1parry = null;
      G.say(`受け流した勢いのまま、${f.name}に斬り返す！`);
      G.cbDamage(f, n, "blade");
      return;
    }
    if (c.k1counter && !c.k1counter.hit[f.name]) {
      c.k1counter.hit[f.name] = 1;
      const n = Math.max(1, Math.round(baseDmg(G.weapon().stat || "筋力") * c.k1counter.mul));
      G.say(`踏み込んできた${f.name}を、穂先が迎えた！`);
      G.cbDamage(f, n, "blade");
    }
  };
  // 毒：敵が動く前に蝕む
  const move0 = G.cbMove;
  G.cbMove = (f, e) => {
    if (f.k1bleed > 0 && f.hp > 0) {
      f.k1bleed--;
      G.note(`毒が${f.name}を蝕む。`);
      G.cbDamage(f, G.d(3) + 1 + pow("知力", 25), "curse");
      if (f.hp <= 0) return { skip: true };
    }
    return move0 ? move0(f, e) : null;
  };
  // 型：守りの型は当たりにくく、攻めの型は当たりやすい
  const hitChance0 = G.foeHitChance;
  G.foeHitChance = (e, extra) => {
    const c = C();
    const st = c && c.k1stance && c.k1stance.n > 0 ? c.k1stance.k : null;
    return hitChance0(e, (extra || 0) + (st === "guard" ? -15 : st === "fury" ? 10 : 0));
  };
  const dmgMod0 = G.cbDmgMod;
  G.cbDmgMod = (f, n, how) => {
    const c = C();
    if (c && how === "blade" && n > 0 && c.k1stance && c.k1stance.n > 0 && c.k1stance.k === "fury") n = Math.ceil(n * 1.3);
    return dmgMod0 ? dmgMod0(f, n, how) : n;
  };
  // 鉄壁：この手番だけ鎧が硬い
  const armor0 = G.armor;
  G.armor = () => {
    const a = armor0();
    const c = C();
    if (!c || !c.k1wall) return a;
    return Object.assign({ name: "鉄壁", type: "armor", def: 0 }, a || {}, { def: ((a && a.def) || 0) + c.k1wall });
  };
  // 見切り：この戦いでは、知らない敵の気配にも ◎
  if (G.f1 && G.f1.known) {
    const known0 = G.f1.known;
    G.f1.known = (id) => { const c = C(); return !!(c && c.k1read) || known0(id); };
  }
  // 気配に合う技（◎）
  const ANSWER = {
    heavy: ["k1_parry", "k1_crossguard", "k1_drawcut", "k1_pin", "k1_shieldbash", "k1_spearwall", "k1_ironwall", "k1_shadowstab"],
    quick: ["k1_spearwall", "k1_ironwall", "k1_pin", "k1_shieldbash"],
    brace: ["k1_helmsplit", "k1_pierce", "k1_pin", "k1_shieldbash", "k1_shadowstab"],
    chant: ["k1_drawcut", "k1_pin", "k1_shieldbash", "k1_shadowstab"],
    ult: ["k1_parry", "k1_crossguard", "k1_ironwall"],
  };
  K.ANSWER = ANSWER;

  const actions0 = G.combatActions;
  G.combatActions = () => {
    const groups = actions0();
    const S = G.S;
    const c = C();
    const t = G.target();
    if (!c || !t || S.over) return groups;
    const ids = K.list(S).filter((id) => SK[id].kind !== "field" && SK[id].fx);
    if (!ids.length) return groups;
    const want = new Set();
    G.alive().forEach((f) => { if (f.f1i && G.f1 && G.f1.known(f.id)) (ANSWER[f.f1i.k] || []).forEach((id) => want.add(id)); });
    const list = ids.map((id) => {
      const s = SK[id];
      const why = K.why(id, S);
      const ch = why ? null : K.chance(id);
      const cost = K.cost(id, S);
      const sub = why ? why : [ch != null ? `${K.statOf(id)} ${ch}%` : "", cost ? `気力${cost}` : "気力いらず", s.hint].filter(Boolean).join("・");
      return { id: "cb:k1:" + id, label: s.name, sub: !why && want.has(id) ? `◎読み・${sub}` : sub, disabled: !!why, kw: s.kw || [s.name] };
    });
    const at = groups.findIndex((g) => g.title === "賭け");
    const grp = { title: `技（気力 ${K.ki(S)}/${K.kiMax(S)}）`, list };
    groups.splice(at >= 0 ? at + 1 : Math.min(1, groups.length), 0, grp);
    return groups;
  };

  const act0 = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const c = S && S.combat;
    if (!c || S.over) return act0(arg);
    K.state(S);
    const kind = String(arg).split(":")[0];
    const reads = (c.f1 && c.f1.reads) || 0;
    act0(arg);
    if (S.over) return;
    const won = S.combat !== c && !c.foes.some((f) => f.hp > 0);
    // 気力が戻る：身を守った・読み勝った・勝った
    if (kind === "guard" || ((c.f1 && c.f1.reads) || 0) > reads || won) K.gainKi(1, S);
    c.k1parry = null;
    c.k1counter = null;
    c.k1wall = 0;
    // 型は、敵の番を一つ越えるごとに一つ減る（型に入った手番から数える）
    if (c.k1stance && --c.k1stance.n <= 0) { c.k1stance = null; if (S.combat === c) G.note("型が解けた。"); }
    // 誘い：次の手番、狙いが大技の気配を見せる
    if (S.combat === c) G.alive().forEach((f) => {
      if (!f.k1lure) return;
      f.k1lure = false;
      if (f.f1stun) return;
      f.f1i = { k: "heavy" };
      G.log("nar", G.f1 && G.f1.tellText ? G.f1.tellText(f, "heavy") : `${f.name}が大きく振りかぶった。`, { tell: f.name, f1: "heavy" });
    });
  };

  // ---------------------------------------------------------------- 巻物
  K.scrollWhy = (itemId, S) => {
    S = S || G.S;
    const it = D.ITEMS[itemId];
    if (!it || it.type !== "k1scroll" || !SK[it.skill]) return "読めない";
    if (K.knows(it.skill, S)) return "もう覚えている";
    const miss = K.needMiss(it.skill, S);
    if (miss.length) return `${miss.join("と")}が足りない`;
    if (it.old && !K.knows("k1_letters", S) && ((S.stats || {}).知力 || 0) < 20) return "古い字が読めない";
    return "";
  };
  K.scrollChance = (itemId) => G.chance("知力", D.ITEMS[itemId] && D.ITEMS[itemId].old ? "普通" : "易しい", K.knows("k1_letters") ? 10 : 0);
  K.readScroll = (itemId) => {
    const S = G.S;
    const it = D.ITEMS[itemId];
    if (!S || S.over || S.mode === "combat" || !it || it.type !== "k1scroll" || !S.inv[itemId] || K.scrollWhy(itemId, S)) return false;
    G.log("you", `${it.name}を読む`);
    G.pass(1);
    const r = G.check("知力", it.old ? "普通" : "易しい", "巻物を読む", K.knows("k1_letters") ? 10 : 0);
    if (r.ok) {
      G.say("墨の線をなぞるうちに、体のほうが先に分かった。読み終えると、巻物は乾いた音を立てて崩れた。");
      G.take(itemId);
      K.learn(it.skill, "scroll");
    } else G.say("書いてあることは分かる。だが、体がまだついてこない。巻物を巻き直して、懐にしまった。");
    return true;
  };
  const useItem0 = G.useItem;
  G.useItem = (id) => { const it = D.ITEMS[id]; if (it && it.type === "k1scroll") return K.readScroll(id); return useItem0(id); };
  // 巻物を一つ（kind："combat"|"field"|"old"|"any"）。まだ覚えていない技を先に
  K.randomScroll = (kind) => {
    const all = Object.keys(D.ITEMS).filter((id) => {
      const it = D.ITEMS[id];
      if (!it || it.type !== "k1scroll") return false;
      const s = SK[it.skill];
      if (kind === "old") return !!it.old;
      if (kind === "combat") return s.kind !== "field";
      if (kind === "field") return s.kind === "field";
      return true;
    }).sort();
    const fresh = all.filter((id) => !K.knows(D.ITEMS[id].skill));
    const pool = fresh.length ? fresh : all;
    return pool.length ? G.pick(pool) : null;
  };

  // 出来事の結果：skill・k1scroll・k1use
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    const r = apply0(o);
    if (!o || !S || S.over || G.S !== S) return r;
    if (o.skill && SK[o.skill]) K.learn(o.skill, "teach");
    if (o.k1scroll) { const id = K.randomScroll(o.k1scroll); if (id && G.give(id)) G.note(`${D.ITEMS[id].name}を手に入れた。`); }
    if (o.k1use) {
      const list = K.list(S).filter((id) => SK[id].kind !== "field");
      if (list.length) { const id = G.pick(list); K.use(id, o.k1use); G.note(`技「${SK[id].name}」の型が、体に馴染んだ。`); }
    }
    return r;
  };

  // ---------------------------------------------------------------- 師
  K.teacher = (tid) => D.K1_TEACHERS[tid] || null;
  K.taughtBy = (tid) => Object.keys(SK).filter((id) => ((SK[id].learn || {}).teach || []).includes(tid));
  K.fee = (id, tid) => { const T = K.teacher(tid); return Math.round((((SK[id].learn || {}).train || {}).gold || 60) * ((T && T.fee) || 0)); };
  K.compOf = (tid, S) => {
    const T = K.teacher(tid);
    if (!T || !T.comp || !G.c10 || !G.c10.comp) return null;
    const c = G.c10.comp(S || G.S, T.comp);
    return c && (c.bond == null || c.bond >= D.K1_BOND) ? c : null;
  };
  K.teacherOk = (tid, S) => { S = S || G.S; const T = K.teacher(tid); if (!T) return false; if (T.comp) return !!K.compOf(tid, S); return !!(T.cond && T.cond(S)); };
  // 教わる（金・日数を払って、必ず覚える。能力値が目安に届かないと教えてくれない）
  K.teach = (tid, id) => {
    const S = G.S;
    const T = K.teacher(tid);
    if (!S || !T || !SK[id] || K.knows(id) || K.needMiss(id).length || !K.taughtBy(tid).includes(id) || !K.teacherOk(tid)) return false;
    const fee = K.fee(id, tid);
    if (S.gold < fee) return false;
    if (fee) { S.gold -= fee; G.note(`所持金 -${fee}G`); }
    const c = K.compOf(tid);
    G.log("you", c ? `${G.m2Short ? G.m2Short(c) : c.name}に「${SK[id].name}」を習う` : `${T.name}に「${SK[id].name}」を教わる`);
    if (c) G.say(`${G.m2Short ? G.m2Short(c) : c.name}は、面倒くさそうな顔をしながらも、手本を何度も見せてくれた。`);
    else if (T.line) G.say(T.line);
    G.passDays(T.days || 1);
    K.learn(id, "teach");
    if (c && G.m2Bond) G.m2Bond(c, 2, true);
    return true;
  };

  // ---------------------------------------------------------------- 鍛錬（訓練場・野営）
  K.trainWhy = (id, S) => {
    S = S || G.S;
    const s = SK[id];
    const tr = (s.learn || {}).train;
    if (!tr) return "ここでは鍛えられない";
    if (tr.towns && !tr.towns.includes(S.loc)) return "この町では教えていない";
    if (tr.cls && !tr.cls.includes(S.cls)) return "この職業では鍛えられない";
    const miss = K.needMiss(id, S);
    if (miss.length) return `${miss.join("と")}が足りない`;
    if (tr.mark && G.f3m && !G.f3m.has(S, tr.mark[0], tr.mark[1])) { const m = G.f3m.mark(tr.mark[0], tr.mark[1]); return m ? `節目「${m.name}」に届けば` : "まだ早い"; }
    if (S.gold < tr.gold) return "金が足りない";
    return "";
  };
  K.trainChance = (id, camp) => G.chance(K.statOf(id) === "武器" ? "筋力" : K.statOf(id), camp ? "難しい" : (SK[id].learn.train || {}).diff || "普通", 15 * (K.state().prog[id] || 0));
  function drill(id, camp) {
    const S = G.S;
    const s = SK[id];
    const r = G.check(K.statOf(id), camp ? "難しい" : (s.learn.train || {}).diff || "普通", `${s.name}の稽古`, 15 * (K.state(S).prog[id] || 0));
    if (r.ok) K.learn(id, camp ? "camp" : "train");
    else {
      S.k1.prog[id] = (S.k1.prog[id] || 0) + 1;
      G.say(camp ? "焚き火の明かりの中で、同じ動きを何度もなぞった。形にはならない。それでも、手は昨日より迷わなかった。" : "教官は首を振った。「まだ形だけだ。また来い」──積み重ねは残った。次は、その先まで行ける。");
    }
  }
  // 荒野の稽古は、物音と火で魔物を呼ぶことがある（野営と同じくらい）
  K.CAMP_RISK = 0.12;
  function campRisk() {
    const S = G.S;
    const L = G.loc();
    if (S.over || S.mode !== "explore" || !(L.pool || []).length) return;
    if (G.rand() < K.CAMP_RISK + 0.04 * (L.danger || 0)) {
      G.say("稽古の物音を聞きつけて、暗がりから何かが近づいてきた。");
      G.startCombat([G.pick(L.pool)].filter((id) => D.ENEMIES[id]), {});
    }
  }
  K.campList = (S) => { S = S || G.S; return Object.keys(SK).filter((id) => SK[id].learn.camp && !K.knows(id, S) && !K.needMiss(id, S).length); };
  K.canCamp = (S) => { S = S || G.S; const L = D.LOCS[S.loc]; return !!(L && L.type === "wild" && S.mode === "explore" && !S.combat); };

  // ---------------------------------------------------------------- 探索の行動
  K.dayUsed = (k, S) => { S = S || G.S; return K.state(S).day[k] === S.day; };
  const markDay = (k) => { K.state().day[k] = G.S.day; };
  K.fieldChance = (id, diff) => G.chance(SK[id].stat, diff || "普通", K.extra(id));
  const explore0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = explore0();
    const S = G.S;
    if (!S || S.over || S.mode !== "explore") return groups;
    K.state(S);
    const L = G.loc();
    // 巻物
    const scrolls = Object.keys(S.inv).filter((id) => { const it = D.ITEMS[id]; return it && it.type === "k1scroll" && !K.knows(it.skill); });
    if (scrolls.length) {
      groups.push({ title: "技の巻物", list: scrolls.map((id) => {
        const why = K.scrollWhy(id, S);
        const s = SK[D.ITEMS[id].skill];
        return { id: "k1scroll:" + id, label: `${D.ITEMS[id].name}を読む`, sub: why || `知力 ${K.scrollChance(id)}%・${s.hint}`, disabled: !!why, kw: ["巻物", "読", s.name] };
      }) });
    }
    // 戦闘の外の技
    const list = [];
    if (K.knows("k1_firstaid") && S.hp < S.maxHp) list.push({ id: "k1aid:", label: "傷の手当てをする", sub: K.dayUsed("aid") ? "今日はもうした" : `${SK.k1_firstaid.stat} ${K.fieldChance("k1_firstaid", "易しい")}%・HP を少し戻す`, disabled: K.dayUsed("aid"), kw: ["手当", "包帯"] });
    if (L && L.type === "wild") {
      if (K.knows("k1_track")) list.push({ id: "k1track:", label: "足跡を追う", sub: K.dayUsed("track:" + S.loc) ? "今日はもう追った" : `${SK.k1_track.stat} ${K.fieldChance("k1_track")}%・獲物か隠れ家を探す`, disabled: K.dayUsed("track:" + S.loc), kw: ["足跡", "追跡"] });
      if (K.knows("k1_herb")) list.push({ id: "k1herb:", label: "薬草を摘む", sub: K.dayUsed("herb") ? "今日はもう摘んだ" : `${SK.k1_herb.stat} ${K.fieldChance("k1_herb", "易しい")}%`, disabled: K.dayUsed("herb"), kw: ["薬草", "摘"] });
    }
    if (list.length) groups.push({ title: "身につけた技で", list });
    // 野営の稽古（荒野で。一日かかる）
    if (K.canCamp(S)) {
      const learnable = K.campList(S).slice(0, 4).map((id) => ({ id: "k1camp:" + id, label: `焚き火のそばで「${SK[id].name}」を磨く`, sub: `一日・${K.statOf(id) === "武器" ? "筋力" : K.statOf(id)} ${K.trainChance(id, true)}%・${SK[id].hint}`, kw: ["稽古", "磨", SK[id].name] }));
      const drillable = K.list(S).filter((id) => SK[id].kind !== "field" && K.lv(id) < 3);
      if (drillable.length) learnable.push({ id: "k1camp:drill", label: "覚えた技の型を、繰り返しなぞる", sub: "一日・熟練が上がる", kw: ["型", "稽古"] });
      if (learnable.length) groups.push({ title: "野営の稽古", list: learnable });
    }
    // 打ち解けた仲間に習う
    const comp = [];
    Object.keys(D.K1_TEACHERS).filter((tid) => D.K1_TEACHERS[tid].comp && K.teacherOk(tid, S)).forEach((tid) => {
      const c = K.compOf(tid, S);
      K.taughtBy(tid).filter((id) => !K.knows(id, S)).forEach((id) => {
        if (comp.some((a) => a.id.endsWith(":" + id))) return;
        const miss = K.needMiss(id, S);
        comp.push({ id: `k1comp:${tid}:${id}`, label: `${G.m2Short ? G.m2Short(c) : c.name}に「${SK[id].name}」を習う`, sub: miss.length ? `${miss.join("と")}が足りない` : K.dayUsed("comp") ? "今日はもう習った" : `${D.K1_TEACHERS[tid].days}日・${SK[id].hint}`, disabled: !!miss.length || K.dayUsed("comp"), kw: ["習", SK[id].name] });
      });
    });
    if (comp.length) groups.push({ title: "仲間に習う", list: comp.slice(0, 4) });
    return groups;
  };

  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "k1scroll") { K.readScroll(arg); return; }
    if (head === "k1aid") {
      if (!K.knows("k1_firstaid") || K.dayUsed("aid")) return;
      markDay("aid");
      K.use("k1_firstaid");
      G.log("you", "傷の手当てをする");
      G.pass(1);
      const r = G.check(SK.k1_firstaid.stat, "易しい", "応急手当", K.extra("k1_firstaid"));
      if (r.ok) { const n = G.dice([2, 6, 2]) + pow("知力", 15); G.heal(n); G.say("傷を洗い、きつく縛り直す。痛みが、鈍いものに変わった。"); G.note(`HP +${n}`); }
      else G.say("布が足りず、手当ては中途半端に終わった。");
      return;
    }
    if (head === "k1track") {
      if (!K.knows("k1_track") || K.dayUsed("track:" + S.loc)) return;
      markDay("track:" + S.loc);
      K.use("k1_track");
      G.log("you", "足跡を追う");
      G.pass(1);
      const r = G.check(SK.k1_track.stat, "普通", "追跡", K.extra("k1_track"));
      if (!r.ok) { G.say("足跡は岩場で消えた。半日歩いて、何も見つからなかった。"); return; }
      const L = G.loc();
      if (G.rand() < 0.5 && (L.pool || []).length) {
        G.say("足跡の主は、まだ近くにいた。風下から回り込み、相手より先に見つけた。");
        G.startCombat([G.pick(L.pool)].filter((id) => D.ENEMIES[id]), { firstStrike: true });
      } else {
        const g = 10 + G.d(20) + ((L.danger || 1) * 5);
        G.say("足跡は、岩陰の隠れ家に続いていた。主は留守で、隅に埋めた包みが残っていた。");
        S.gold += g; G.note(`所持金 +${g}G`);
      }
      return;
    }
    if (head === "k1herb") {
      if (!K.knows("k1_herb") || K.dayUsed("herb")) return;
      markDay("herb");
      K.use("k1_herb");
      G.log("you", "薬草を摘む");
      G.pass(1);
      const r = G.check(SK.k1_herb.stat, "易しい", "薬草摘み", K.extra("k1_herb"));
      if (r.ok && G.give("herb")) { G.say("日当たりのいい斜面に、葉の厚い草が群れていた。効くものだけを選んで摘んだ。"); G.note(`${D.ITEMS.herb.name}を手に入れた。`); }
      else G.say("似た草ばかりで、効くものは見つからなかった。");
      return;
    }
    if (head === "k1camp") {
      if (!K.canCamp(S)) return;
      if (arg === "drill") {
        const list = K.list(S).filter((id) => SK[id].kind !== "field" && K.lv(id) < 3);
        if (!list.length) return;
        G.log("you", "焚き火のそばで、覚えた技の型をなぞる");
        G.passDays(1);
        list.slice(0, 3).forEach((id) => K.use(id, 2));
        G.say("同じ動きを、何度も何度も繰り返す。最後のほうは、考える前に体が動いていた。");
        campRisk();
        return;
      }
      if (!SK[arg] || !K.campList(S).includes(arg)) return;
      G.log("you", `焚き火のそばで「${SK[arg].name}」を磨く`);
      G.passDays(1);
      drill(arg, true);
      campRisk();
      return;
    }
    if (head === "k1comp") {
      const [tid, id] = String(arg).split(/:(?=k1_)/);
      if (K.dayUsed("comp")) return;
      if (K.teach(tid, id)) markDay("comp");
      return;
    }
    // 野営術：野営でよく休める
    if (head === "camp" && K.knows("k1_camp") && S && S.mode === "explore") {
      exploreAct0(head, arg, a);
      if (S.over || G.S !== S) return;
      K.use("k1_camp");
      const n = Math.ceil(S.maxHp * 0.2);
      G.heal(n);
      G.note(`野営の心得で、よく休めた。HP +${n}`);
      return;
    }
    exploreAct0(head, arg, a);
  };

  // ---------------------------------------------------------------- 町の施設：訓練場の「技の稽古」・師の「教わる」・「身につけた技で」
  K.trainList = (S) => { S = S || G.S; return Object.keys(SK).filter((id) => SK[id].learn.train && !K.knows(id, S) && (!SK[id].learn.train.towns || SK[id].learn.train.towns.includes(S.loc))); };
  K.facList = (S) => { S = S || G.S; return ((D.K1_FAC || {})[S.fac] || []).map((f, i) => ({ f, i })).filter(({ f }) => K.knows(f.sk, S)); };
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    if (!S || S.over || S.mode !== "fac") return g;
    K.state(S);
    const add = [];
    if (S.fac === "train") {
      const list = K.trainList(S).map((id) => {
        const tr = SK[id].learn.train;
        const why = K.trainWhy(id, S);
        const st = K.statOf(id) === "武器" ? "筋力" : K.statOf(id);
        return { id: "k1train:" + id, label: `「${SK[id].name}」を稽古する`, sub: why || `${tr.gold}G・${tr.days}日・${st} ${K.trainChance(id)}%・${SK[id].hint}`, disabled: !!why, kw: ["技", "稽古", SK[id].name] };
      });
      if (list.length) add.push({ title: "技の稽古（訓練場）", list });
    }
    Object.keys(D.K1_TEACHERS).forEach((tid) => {
      const T = D.K1_TEACHERS[tid];
      if (T.fac !== S.fac) return;
      const ids = K.taughtBy(tid).filter((id) => !K.knows(id, S));
      if (!ids.length) return;
      if (!K.teacherOk(tid, S)) { add.push({ title: `教わる（${T.name}）`, list: [{ id: "k1lock:" + tid, label: `${T.name}に教えを乞う`, sub: T.lock || "", disabled: true, locked: true }] }); return; }
      add.push({ title: `教わる（${T.name}）`, list: ids.map((id) => {
        const miss = K.needMiss(id, S);
        const fee = K.fee(id, tid);
        return { id: `k1teach:${tid}:${id}`, label: `「${SK[id].name}」を教わる`, sub: miss.length ? `${miss.join("と")}が足りない` : `${fee ? fee + "G・" : ""}${T.days}日・${SK[id].hint}`, disabled: !!miss.length || S.gold < fee, kw: ["教", SK[id].name] };
      }) });
    });
    const fl = K.facList(S);
    if (fl.length) {
      const used = K.dayUsed("fac:" + S.fac);
      add.push({ title: "身につけた技で", list: fl.map(({ f, i }) => {
        const sub = [SK[f.sk].name];
        if (f.diff) sub.push(`${SK[f.sk].stat} ${K.fieldChance(f.sk, f.diff)}%`);
        if (used) sub.push("今日はもうした");
        return { id: `k1f:${S.fac}:${i}`, label: f.label, sub: sub.join("・"), k1: f.sk, disabled: used };
      }) });
    }
    if (!add.length) return g;
    g.splice(Math.max(0, g.length - 1), 0, ...add);   // 「出る」の前に置く
    return g;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    if (head === "k1train") {
      const id = arg;
      if (!SK[id] || S.fac !== "train" || K.knows(id) || K.trainWhy(id, S)) return;
      const tr = SK[id].learn.train;
      S.gold -= tr.gold;
      G.log("you", `「${SK[id].name}」を稽古する`);
      G.note(`所持金 -${tr.gold}G`);
      G.passDays(tr.days || 1);
      drill(id, false);
      return;
    }
    if (head === "k1teach") {
      const [tid, id] = String(arg).split(/:(?=k1_)/);
      const T = K.teacher(tid);
      if (!T || T.fac !== S.fac) return;
      K.teach(tid, id);
      return;
    }
    if (head === "k1f") {
      const [fac, n] = String(arg).split(":");
      const f = ((D.K1_FAC || {})[fac] || [])[+n];
      if (!f || fac !== S.fac || !K.knows(f.sk) || K.dayUsed("fac:" + fac)) return;
      markDay("fac:" + fac);
      K.use(f.sk);
      G.log("you", f.label);
      let o = f.ok;
      if (f.diff) o = G.check(SK[f.sk].stat, f.diff, f.label, K.extra(f.sk)).ok ? f.ok : f.ng;
      if (o && o.gold < 0 && S.gold < -o.gold) o = Object.assign({}, o, { gold: -S.gold });
      G.apply(o);
      if (!S.over) G.pass(1);
      return;
    }
    facAct0(head, arg, a);
  };

  // ---------------------------------------------------------------- 出来事の選択肢（印は k1。C10・F3 とは別に数える）
  // 熟練の上乗せは、選択肢の bonus に "k1:<技>" と書いて、G.gearBonus で読む
  const gear0 = G.gearBonus;
  G.gearBonus = (kind) => { const m = /^k1:(.+)$/.exec(kind || ""); return m ? (SK[m[1]] && G.S ? K.extra(m[1]) : 0) : gear0(kind); };
  K.make = (spec) => {
    const s = SK[spec.sk];
    if (!s) throw new Error(`K1：知らない技 ${spec.sk}`);
    const c = { label: spec.label, ok: spec.ok, cond: (S) => K.knows(spec.sk, S) && (!spec.also || spec.also(S)) };
    Object.defineProperty(c, "k1", { value: spec.sk, enumerable: false });
    c.k1tag = s.name;
    if (spec.ng) c.ng = spec.ng;
    if (spec.diff) { c.stat = s.stat; c.diff = spec.diff; c.bonus = "k1:" + spec.sk; }
    if (spec.cost) c.cost = spec.cost;
    return c;
  };
  K.added = {};
  const SKIP_ID = /^(m6_|e3_|rr|m7_|m10_|m11_|m2_|c\d+_|q\d+_|kn_|r2_|v2_gigi|w6w_mate|epi|i3_|c1_|w6|k1_)/;
  const catsOf = (e) => {
    const t = `${e.title || ""}　${e.text || ""}`;
    const own = Object.keys(D.K1_CATS || {}).filter((k) => { const c = D.K1_CATS[k]; return c.re.test(t) && !(c.not && c.not.test(t)); });
    return [...((G.c10 && G.c10.catsOf && G.c10.catsOf(e)) || []), ...own];
  };
  K.catsOf = catsOf;
  // 師の出来事の「教わる」（一つの出来事で三つまで。まだ覚えていない、目安に届いている技から）
  K.evTeach = (tid, S) => K.taughtBy(tid).filter((id) => !K.knows(id, S) && !K.needMiss(id, S).length).slice(0, 3);
  K.apply = () => {
    (D.EVENTS || []).forEach((e) => {
      if (!e || !Array.isArray(e.choices) || e._k1) return;
      e._k1 = true;
      const push = (spec) => { const v = (x) => (Array.isArray(x) ? x[hash(e.id + spec.label) % x.length] : x); e.choices.push(K.make({ ...spec, ok: v(spec.ok), ng: v(spec.ng) })); K.added[e.id] = (K.added[e.id] || 0) + 1; };
      // K1 の出来事：技の要る選択肢（sk）に条件を付け、師の「教わる」を足す
      if (/^k1_/.test(e.id)) {
        e.choices.forEach((c) => { if (c.sk && !c.cond) { const sk = c.sk; c.cond = (S) => K.knows(sk, S); c.k1tag = SK[sk].name; Object.defineProperty(c, "k1", { value: sk, enumerable: false }); } });
        Object.keys(D.K1_TEACHERS).filter((tid) => D.K1_TEACHERS[tid].ev === e.id).forEach((tid) => {
          const T = D.K1_TEACHERS[tid];
          const add = K.taughtBy(tid).map((id) => {
            const c = { label: `「${SK[id].name}」を教わる`, cost: K.fee(id, tid), ok: { text: T.line, days: T.days, skill: id },
              cond: (S) => !!T.cond(S) && K.evTeach(tid, S).includes(id) };
            c.k1tag = T.name;
            Object.defineProperty(c, "k1", { value: id, enumerable: false });
            Object.defineProperty(c, "k1teach", { value: tid, enumerable: false });
            return c;
          });
          e.choices.splice(Math.max(0, e.choices.length - 1), 0, ...add);   // 「立ち去る」などの前に
        });
        return;
      }
      if ((D.K1_ADD || {})[e.id]) { D.K1_ADD[e.id].forEach(push); return; }
      if (e.once || e.noC10 || SKIP_ID.test(e.id) || (D.C10_NOTPL || []).includes(e.id) || /\{[a-z]+\}/.test(e.text || "") || e.choices.some((c) => c.next)) return;
      const cats = catsOf(e);
      if (!cats.length) return;
      const pool = (D.K1_TPL || []).filter((t) => cats.includes(t.cat)).sort((a, b) => hash(e.id + a.label) - hash(e.id + b.label));
      if (pool.length) push(pool[0]);
    });
  };
  K.apply();
  let seenN = (D.EVENTS || []).length;
  const choices0 = G.eventChoices;
  G.eventChoices = () => { const n = (D.EVENTS || []).length; if (n !== seenN) { seenN = n; K.apply(); } return choices0(); };
  // 選んだら熟練を数える
  const choose0 = G.chooseEvent;
  G.chooseEvent = (i) => {
    const S = G.S;
    const e = S && D.EVENTS.find((x) => x.id === S.event);
    const c = e && e.choices[i];
    const r = choose0(i);
    if (c && c.k1 && !c.k1teach && G.S === S && !S.over) K.use(c.k1);
    return r;
  };
  // 画面：技の選択肢に技の名を添え、ほかにうっすら見える選択肢が無ければ、まだ覚えていない技の選択肢を一つだけうっすら見せる（C10 の「見せない設定」にも従う）
  K.showLocked = true;
  const actions0e = G.actions;
  G.actions = () => {
    const g = actions0e();
    const S = G.S;
    if (!S || S.mode !== "event") return g;
    const e = D.EVENTS.find((x) => x.id === S.event);
    if (!e || !e._k1) return g;
    let grp0 = null;
    let locked = 0;
    let shown = 0;
    g.forEach((grp) => (grp.list || []).forEach((a) => {
      shown++;
      if (a.locked) locked++;
      const m = /^ev:(\d+)$/.exec(a.id || "");
      if (!m) return;
      if (!grp0) grp0 = grp;
      const c = e.choices[+m[1]];
      if (c && c.k1tag && !a.k1) { a.k1 = c.k1; a.sub = a.sub ? `${c.k1tag}・${a.sub}` : c.k1tag; }
    }));
    if (!grp0 || !K.showLocked || (G.c10 && G.c10.showLocked === false) || locked || shown >= ((G.c10 && G.c10.CROWDED) || 6)) return g;
    const i = e.choices.findIndex((c) => c.k1 && !c.k1teach && SK[c.k1] && !K.knows(c.k1, S) && !(c.cond && c.cond(S)));
    if (i >= 0) grp0.list.push({ id: "k1lock:" + i, label: e.choices[i].label, sub: `${SK[e.choices[i].k1].name}の心得があれば`, disabled: true, locked: true, k1: e.choices[i].k1 });
    return g;
  };

  // ---------------------------------------------------------------- 遊び方の一行（U4。画面の分類 U13 は src/ui/zk1_skills.js）
  if (G.PLAY_TIPS && G.playTip) {
    G.PLAY_TIPS.k1 = "技：戦闘の「技」の組は気力を使う。気力は眠ると戻り、身を守る・読み勝つ・勝つと一つ戻る。技は訓練場・師・巻物で覚え、使うほど熟練が上がる。";
    const tip0 = G.playTip;
    G.playTip = (S, P) => {
      const seen = (P && P.tips) || {};
      if (S && !S.over && S.mode === "combat" && seen.combat && !seen.k1 && K.list(S).some((id) => SK[id].kind !== "field")) return { key: "k1", text: G.PLAY_TIPS.k1 };
      return tip0(S, P);
    };
  }
  if (G.l1 && G.l1.ACTS) G.l1.ACTS.k1 = "技";

  // ---------------------------------------------------------------- 画面のシート用の一覧
  K.view = (S) => {
    S = S || G.S;
    if (!S) return [];
    K.state(S);
    return K.list(S).map((id) => {
      const s = SK[id];
      const lv = K.lv(id, S);
      const next = D.K1_LV[lv + 1];
      return { id, name: s.name, kind: s.kind, hint: s.hint, ki: K.cost(id, S), lv, lvName: D.K1_LV_NAMES[lv], left: next != null ? next - K.uses(id, S) : 0, style: s.style || null, usable: !s.style || K.styleOk(id, S) };
    });
  };
})(globalThis.G = globalThis.G || {});
