// M14：魔法の作り直し（属性 × 段階・術の才・得意と苦手・覚え方の関門・新しい術の戦闘）。データは src/data/spells_m14.js・items_m14.js・m14_masters.js。
// combat.js・academy_m1.js・core.js の魔法の関数は書き換えず包む。あとから読まれる仕組みに上書きされる関数（G.armor など）は
// src/engine/zzzzzzzzzzzzzz_m14_late.js で包む。DOM に触らない。乱数は G.rand（作成画面の才の振り方だけは引数 rnd）。レーン B＋C（M14）
//
// G.m14：
//   talent(S)        術の才 { lv, good, bad }（S.magic。古いセーブは「人並み・職業の属性が得意」）
//   aff(el, S)       その属性の向き "good" | "mid" | "bad"。maxTier(el, S) その属性で届く段（才なしは 0）
//   canLearn(id, S)  覚えられないわけ（覚えられるなら ""）。learnBonus(id, S) 覚える判定の補正（％）
//   words(t)         才を言葉で（作成画面・シート）。rollDraft / ofDraft 作成画面の才
(function (G) {
  const D = G.data;
  const M = (G.m14 = G.m14 || {});
  const SP = D.SPELLS;
  const T = D.M14_TALENT;
  const ELS = D.M14_ELEM_KEYS;
  const elName = (el) => (D.M14_ELEMS[el] || {}).name || el;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

  // ---------------------------------------------------------------- 術の才
  M.LEGACY = ["fire", "heal"];   // 古いセーブで誰でも使えていた術
  M.defaultTalent = (cls) => { const good = (T.defaultGood[cls] || [T.clsEl[cls] || "fire"]).slice(); return { lv: good.length, good, bad: [] }; };
  const clean = (m) => ({
    lv: Math.max(0, Math.min(3, Math.floor(Number(m.lv) || 0))),
    good: (m.good || []).filter((e) => ELS.includes(e)),
    bad: (m.bad || []).filter((e) => ELS.includes(e) && !(m.good || []).includes(e)),
  });
  M.talent = (S) => {
    S = S || G.S;
    if (!S) return { lv: 0, good: [], bad: [] };
    if (S.magic && typeof S.magic.lv === "number") return clean(S.magic);
    return Object.assign(M.defaultTalent(S.cls), { old: true });
  };
  M.has = (S) => M.talent(S).lv > 0;
  M.aff = (el, S) => { const t = M.talent(S); return t.good.includes(el) ? "good" : t.bad.includes(el) ? "bad" : "mid"; };
  M.maxTier = (el, S) => (M.has(S) ? { good: 3, mid: 2, bad: 1 }[M.aff(el, S)] : 0);

  // 属性ごとの術（段の順）
  M.ofEl = (el, tier) => Object.keys(SP).filter((id) => SP[id].el === el && (tier == null || (SP[id].tier || 1) === tier));
  M.firstOf = (el) => M.ofEl(el, 1)[0] || null;
  M.knowsTier = (el, tier, S) => M.ofEl(el, tier).some((id) => G.knows(id, S));
  // その段で、今覚えられる術があるか（出来事の選択肢の条件）
  M.canAny = (tier, S) => Object.keys(SP).some((id) => (SP[id].tier || 1) === tier && !SP[id].generic && !M.canLearn(id, S));

  // 覚えている（古いセーブは炎と癒しも）
  G.knows = (id, S) => {
    S = S || G.S;
    const sp = SP[id];
    if (!sp || !S) return false;
    if (sp.base) return true;
    if ((S.spells || []).includes(id)) return true;
    return !S.magic && M.LEGACY.includes(id);
  };
  M.known = (S) => { S = S || G.S; return Object.keys(SP).filter((id) => G.knows(id, S)); };

  // 覚えられないわけ
  M.canLearn = (id, S) => {
    S = S || G.S;
    const sp = SP[id];
    if (!sp || !S) return "その術は無い";
    if (G.knows(id, S)) return "もう覚えている";
    if (!M.has(S)) return "術の才が無い";
    if (sp.generic) return "";
    const tier = sp.tier || 1, el = sp.el, max = M.maxTier(el, S);
    if (tier > max) return max <= 1 ? `${elName(el)}は苦手で、初級より上には届かない` : `${elName(el)}が得意でなければ、上級には届かない`;
    if (tier > 1 && !M.knowsTier(el, tier - 1, S)) return `先に${elName(el)}の${D.M14_TIERS[tier - 1]}を覚える`;
    return "";
  };
  M.learnBonus = (id, S) => { const sp = SP[id]; return !sp || sp.generic ? 0 : D.M14_LEARN[M.aff(sp.el, S)] || 0; };
  M.castBonus = (el, S) => { const t = M.talent(S); return (D.M14_CAST[M.aff(el, S)] || 0) + (D.M14_CAST.lv[t.lv] || 0); };

  // 覚える（関門つき）。M.grant は関門を通さない（はじめから覚えている術）
  const learn0 = G.learnSpell;
  G.learnSpell = (id) => (M.canLearn(id) ? false : learn0(id));
  M.grant = (id, S) => { S = S || G.S; if (SP[id] && !(S.spells || []).includes(id)) S.spells = [...(S.spells || []), id]; };

  // 唱える判定の補正：得意・苦手と才（G.gearBonus の術の種類に足す。出来事の「術で火を点ける」などにも効く）
  const BONUS_EL = { fire: "fire", ice: "ice", bolt: "bolt", wind: "wind", earth: "earth", heal: "light", ward: "light", light: "light", curse: "dark", dark: "dark" };
  M.BONUS_EL = BONUS_EL;
  const gear0 = G.gearBonus;
  G.gearBonus = (kind) => gear0(kind) + (G.S && BONUS_EL[kind] && M.has() ? M.castBonus(BONUS_EL[kind]) : 0);

  // ---------------------------------------------------------------- 才を言葉で
  M.words = (t) => {
    t = t || M.talent();
    const names = (a) => a.map(elName).join("・");
    return {
      lv: T.names[t.lv], say: T.say[t.lv],
      good: t.lv ? names(t.good) : "", bad: t.lv ? names(t.bad) : "",
      line: t.lv ? `${T.names[t.lv]}。得意：${names(t.good)}${t.bad.length ? `／苦手：${names(t.bad)}` : ""}` : `${T.names[0]}。術は覚えられない`,
    };
  };

  // ---------------------------------------------------------------- 作成画面：才を振る（ダイスは下書きに覚え、種族・生まれ・職業は見るたびに足す）
  M.rollDraft = (dr, rnd) => {
    dr.m14 = { d: [1, 2, 3].reduce((a) => a + 1 + Math.floor(rnd() * 6), 0), r: Array.from({ length: 8 }, () => rnd()) };
    return dr.m14;
  };
  M.from = (o) => {
    const x = o.m14 || { d: 10, r: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] };
    const score = x.d + (T.race[o.race] || 0) + (T.origin[o.origin] || 0) + (T.cls[o.cls] || 0);
    let lv = score <= T.cut[0] ? 0 : score <= T.cut[1] ? 1 : score <= T.cut[2] ? 2 : 3;
    lv = Math.max(lv, T.need[o.cls] || 0);
    if (!lv) return { lv: 0, good: [], bad: [] };
    const w = {};
    ELS.forEach((el) => { w[el] = 1 + (T.clsEl[o.cls] === el ? 3 : 0) + (((T.raceEl[o.race] || {})[el]) || 0) + (((T.originEl[o.origin] || {})[el]) || 0); });
    let i = 0;
    const pickW = (pool, wt) => {
      const sum = pool.reduce((a, el) => a + wt(el), 0);
      let r = (x.r[i++ % x.r.length]) * sum;
      for (const el of pool) { r -= wt(el); if (r < 0) return el; }
      return pool[pool.length - 1];
    };
    const good = T.lockEl[o.cls] ? [T.clsEl[o.cls]] : [];
    while (good.length < lv) good.push(pickW(ELS.filter((el) => !good.includes(el)), (el) => w[el]));
    const bad = [];
    while (bad.length < (T.bad[lv] || 0)) bad.push(pickW(ELS.filter((el) => !good.includes(el) && !bad.includes(el)), (el) => 1 / w[el]));
    return { lv, good, bad };
  };
  M.ofDraft = (dr) => M.from({ m14: dr.m14, cls: dr.cls, race: (dr.profile || {}).race || "human", origin: dr.origin });

  // ---------------------------------------------------------------- 新しい冒険
  const newGame0 = G.newGame;
  G.newGame = (opt) => {
    const S = newGame0(opt);
    if (!S) return S;
    const m = opt && opt.magic && typeof opt.magic.lv === "number" ? clean(opt.magic) : M.defaultTalent(S.cls);
    if (T.need[S.cls] && m.lv < T.need[S.cls]) m.lv = T.need[S.cls];
    if (T.lockEl[S.cls] && !m.good.includes(T.clsEl[S.cls])) { m.good = [T.clsEl[S.cls], ...m.good].slice(0, Math.max(1, m.lv)); m.bad = m.bad.filter((e) => !m.good.includes(e)); }
    S.magic = m;
    if (!m.lv) S.spells = [];
    else if (!(D.SPELL_START || {})[S.cls] && m.good[0]) { const f = M.firstOf(m.good[0]); if (f) M.grant(f, S); }   // 器のある者は、得意な属性の初級を一つ知っている
    S.spellStart = (S.spells || []).slice();
    return S;
  };

  // ---------------------------------------------------------------- 学院（講義の関門と、得意・苦手の補正）
  G.lectureChance = (id) => G.chance("知力", SP[id].school.diff, M.learnBonus(id));
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    if (!S || S.fac !== "academy") return g;
    g.forEach((grp) => grp.list.forEach((a) => {
      const m = /^academy:(.+)$/.exec(a.id || "");
      if (!m || !SP[m[1]]) return;
      const why = M.canLearn(m[1]);
      if (why && why !== "もう覚えている") { a.disabled = true; a.sub = why; }
      else if (!why) a.sub = `${D.M14_TIERS[SP[m[1]].tier || 1]}・${a.sub}`;
    }));
    return g;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head !== "academy") return facAct0(head, arg, a);
    const S = G.S;
    const sp = SP[arg];
    if (!sp || !sp.school || M.canLearn(arg) || S.gold < sp.school.gold) return;
    S.gold -= sp.school.gold;
    G.log("you", `${sp.name}の講義を受ける`);
    G.note(`所持金 -${sp.school.gold}G`);
    G.passDays(sp.school.days);
    G.say(G.pick(D.ACADEMY_LINES));
    const r = G.check("知力", sp.school.diff, `${sp.name}の講義`, M.learnBonus(arg));
    if (r.ok) G.learnSpell(arg);
    else G.say(M.aff(sp.el) === "bad" ? "理屈は分かった。手のひらの上で、何かが嫌そうに身をよじった。" : "理屈は分かった。だが、手のひらの上には何も起きない。向こうが、まだあなたを知らないのだ。");
  };

  // ---------------------------------------------------------------- 魔導書（関門と補正）
  G.tomeChance = (id) => G.chance("知力", (D.ITEMS[id] && D.ITEMS[id].learn) || "普通", M.learnBonus(D.ITEMS[id] && D.ITEMS[id].teach));
  G.readTome = (id) => {
    const S = G.S;
    const it = D.ITEMS[id];
    if (!S || S.over || S.mode === "combat" || !it || it.type !== "tome" || !S.inv[id] || G.knows(it.teach)) return false;
    const why = M.canLearn(it.teach);
    if (why) { G.log("you", `${it.name}を開く`); G.say(M.has() ? `頁の文字は読める。だが、何も起きない。（${why}）` : "頁の文字は読める。だが、読んでも何も起きない。あなたの中に、それを受ける器が無い。"); return false; }
    G.log("you", `${it.name}を読み解く`);
    G.pass(1);
    const r = G.check("知力", it.learn || "普通", "魔導書を読み解く", M.learnBonus(it.teach));
    if (r.ok) { G.say(it.m14lore ? "最後の頁を閉じたとき、指先の向こうで重い扉が一枚、内側から開いた。" : "文字の並びが、ふいに意味を持った。誰かが耳元で、読み方を教えてくれたような気がした。"); G.learnSpell(it.teach); }
    else if (r.fumble) { G.say("読み違えた一行が、指に絡みついて離れない。"); G.payDebt(it.m14lore ? 3 : 1); }
    else G.say("頁の上で文字が泳ぐ。今日は読めそうにない。");
    return true;
  };
  const exploreActions0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = exploreActions0();
    const S = G.S;
    groups.forEach((g) => g.list.forEach((a) => {
      const m = /^tome:(.+)$/.exec(a.id || "");
      if (!m || !D.ITEMS[m[1]]) return;
      const sp = SP[D.ITEMS[m[1]].teach];
      const why = M.canLearn(D.ITEMS[m[1]].teach);
      if (why) { a.disabled = true; a.sub = `${sp ? sp.name : ""}・${why}`; }
      else if (sp) a.sub = `知力 ${G.tomeChance(m[1])}%・${sp.name}（${elName(sp.el)}の${D.M14_TIERS[sp.tier || 1]}）`;
    }));
    // 師（中級）：その町にいる師に教わる
    const ms = (D.M14_MASTERS || []).filter((x) => x.loc === S.loc);
    if (S.mode === "explore" && !S.travel && ms.length && M.has()) {
      ms.forEach((x) => {
        const list = M.masterSpells(x).map((id) => {
          const why = M.canLearn(id);
          const sp = SP[id];
          return { id: `m14m:${x.id}:${id}`, label: `${sp.name}を教わる`, sub: why || `${x.gold}G・${x.days}日・魔力 ${M.masterChance(id)}%・${sp.hint}`, disabled: !!why || S.gold < x.gold, kw: ["師", "教わ", sp.name] };
        });
        if (list.length) groups.push({ title: `${x.name}に師事する（${D.M14_TIERS[2]}）`, list });
      });
    }
    return groups;
  };

  // ---------------------------------------------------------------- 師に教わる（中級）
  M.masterSpells = (x) => x.els.flatMap((el) => M.ofEl(el, 2)).filter((id) => !G.knows(id));
  M.masterChance = (id) => G.chance("魔力", "普通", M.learnBonus(id));
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "m14m") return exploreAct0(head, arg, a);
    const S = G.S;
    const [mid, id] = String(arg).split(":");
    const x = (D.M14_MASTERS || []).find((m) => m.id === mid);
    const sp = SP[id];
    if (!x || !sp || x.loc !== S.loc || !x.els.includes(sp.el) || M.canLearn(id) || S.gold < x.gold) return;
    S.gold -= x.gold;
    G.log("you", `${x.name}に${sp.name}を教わる`);
    G.note(`所持金 -${x.gold}G`);
    G.passDays(x.days);
    G.say(G.pick(x.lines));
    const r = G.check("魔力", "普通", `${sp.name}の手ほどき`, M.learnBonus(id));
    if (r.ok) G.learnSpell(id);
    else if (r.fumble) { G.say(x.fail || "師は首を振った。「借り方が乱暴だ。向こうが覚えたぞ、お前の名を」"); G.payDebt(1); }
    else G.say(x.fail || "師は黙って首を振った。今日のところは、何も通らなかった。");
  };

  // ---------------------------------------------------------------- 出来事の結果：m14learn（"mid" 中級・"top" 上級を一つ覚える）・m14lore（伝承の書を一冊）
  M.pickLearn = (tier, S) => {
    S = S || G.S;
    const ids = Object.keys(SP).filter((id) => (SP[id].tier || 1) === tier && !SP[id].generic && !M.canLearn(id, S));
    const good = ids.filter((id) => M.aff(SP[id].el, S) === "good");
    const pool = good.length ? good : ids;
    return pool.length ? pool[Math.floor(G.rand() * pool.length)] : null;
  };
  M.loreFor = (S) => {
    S = S || G.S;
    const books = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].m14lore && !(S.inv || {})[id]);
    const good = books.filter((id) => M.talent(S).good.includes(SP[D.ITEMS[id].teach].el));
    const pool = good.length ? good : books;
    return pool.length ? pool[Math.floor(G.rand() * pool.length)] : null;
  };
  const apply0 = G.apply;
  G.apply = (o) => {
    const r = apply0(o);
    const S = G.S;
    if (!o || !S || S.over) return r;
    if (o.m14learn) {
      const id = M.pickLearn(o.m14learn === "top" ? 3 : o.m14learn === "low" ? 1 : 2);
      if (id) G.learnSpell(id);
      else G.say("教わったことは分かった。だが、それを受ける場所が、あなたの中にはもう無かった。");
    }
    if (o.m14lore) { const b = M.loreFor(); if (b && G.give(b)) G.note(`${D.ITEMS[b].name}を手に入れた。`); }
    return r;
  };

  // ---------------------------------------------------------------- 戦闘：成功率
  // 術の相手の点：vs（敵の点。null は敵と比べない術）から術の難しさを引く。難しさが言葉（易しい…）なら、その点を普通との差で
  M.spellVs = (sp, vs) => {
    const base = (D.DIFF && D.DIFF.普通) || 13;
    if (typeof sp.diff === "string" && D.DIFF[sp.diff] !== undefined) return { vs: (vs == null ? base : vs) + (D.DIFF[sp.diff] - base) };
    return { vs: (vs == null ? G.s5Target(0) : vs) - G.s5Mod(sp.diff || 0) };
  };
  const maxMres = () => Math.max(...G.alive().map((f) => G.foeVs.mres(G.foeData(f))));
  M.vsOf = (id) => {
    const fx = SP[id].fx || {};
    if (fx.t === "buff" || fx.t === "heal") return null;
    if (fx.t === "all") return maxMres();
    return G.foeVs.mres(G.foeData(G.target()));
  };
  M.chance = (id) => { const sp = SP[id]; return G.chance("魔力", M.spellVs(sp, M.vsOf(id)), G.gearBonus(sp.bonus) + G.magicBonus()); };
  Object.keys(SP).filter((id) => SP[id].fx).forEach((id) => { G.cb[id] = () => M.chance(id); });
  // 加護（M1）は難しさが言葉なので、combat.js の式では測れない。ここで測り直す
  G.cb.ward = () => M.chance("ward");

  // ---------------------------------------------------------------- 戦闘：行動の一覧（魔法の組を作り直す）
  const ORDER = (id) => ELS.indexOf(SP[id].el) * 10 + (SP[id].tier || 1);
  const combatActions0 = G.combatActions;
  G.combatActions = () => {
    const groups = combatActions0();
    const S = G.S;
    const gi = groups.findIndex((g) => g.title === "魔法");
    if (gi < 0) return groups;
    const ids = M.known().filter((id) => !SP[id].generic).sort((a, b) => ORDER(a) - ORDER(b) || Object.keys(SP).indexOf(a) - Object.keys(SP).indexOf(b));
    const list = ids.map((id) => {
      const sp = SP[id];
      const pct = G.cb[id] ? G.cb[id]() : M.chance(id);
      return { id: "cb:" + id, label: sp.name, sub: `魔力 ${pct}%・MP${sp.mp}・${elName(sp.el)}${D.M14_TIERS[sp.tier || 1]}`, disabled: S.mp < sp.mp, kw: sp.kw || [sp.name] };
    });
    if (list.length) groups[gi].list = list;
    else groups.splice(gi, 1);
    return groups;
  };

  // ---------------------------------------------------------------- 戦闘：新しい術を唱える
  const pow = (k, n) => (G.s5PowOf ? G.s5PowOf(k, n) : 0);
  const walled = (f) => !!(G.foeData(f).majin && !G.weapon().pierce);
  const SAY = {
    fire: { ok: "炎が渦を巻いて敵を包んだ。", miss: "炎は形になる前に消えた。", fumble: "炎が逆巻いて、あなたの袖を焼いた。", die: "自分の炎に焼かれた" },
    ice: { ok: "白い霜が敵の足元から這い上がった。", miss: "吐く息が白くなっただけだった。", fumble: "冷気が逆流し、指先が凍りついた。", die: "自分の氷で凍え死んだ" },
    bolt: { ok: "空が裂け、稲妻が次々と落ちた。", miss: "遠くで雷が鳴っただけだった。", fumble: "稲妻は、呼んだ者の頭に落ちた。", die: "自分の雷に打たれた" },
    wind: { ok: "足もとから風が巻き上がった。", miss: "髪が少し揺れただけだった。", fumble: "風が逆巻いて、あなたを地面に叩きつけた。", die: "自分の風に叩きつけられた" },
    earth: { ok: "地面が低く唸った。", miss: "足もとの砂が少し動いただけだった。", fumble: "足もとが崩れて、あなたは膝まで埋まった。", die: "自分の呼んだ土に呑まれた" },
    light: { ok: "白い光があたりを満たした。", miss: "光は灯りかけて消えた。", fumble: "光が目の奥で弾け、しばらく何も見えなかった。", die: "自分の光に焼かれた" },
    dark: { ok: "影が這い寄って、敵の影に重なった。", miss: "影は足もとから動かなかった。", fumble: "影があなたの足首をつかんで、なかなか離さなかった。", die: "自分の影に喰われた" },
  };
  M.SAY = SAY;
  const dmgOf = (fx, crit) => { const n = G.dice(fx.d || [1, 6, 0]) + pow("魔力", fx.pw || 10); return crit ? Math.floor(n * 1.5) : n; };
  function strike(f, sp, fx, crit) {
    let n = dmgOf(fx, crit);
    const e = G.foeData(f);
    if (fx.undead && e.undead && !walled(f)) { n *= fx.undead; G.note(`不浄の肉が、光に焼かれて縮んだ。`); }
    const before = f.hp;
    G.cbDamage(f, n, sp.el);
    const dealt = Math.max(0, before - f.hp);
    if (f.hp > 0 && !walled(f)) {
      if (fx.burn) { f.m14burn = Math.max(f.m14burn || 0, fx.burn + (crit ? 1 : 0)); G.note(`${f.name}に火が移った。`); }
      if (fx.freeze) { f.frozen = Math.max(f.frozen || 0, e.boss ? 1 : fx.freeze + (crit ? 1 : 0)); f.stunText = ""; G.note(`${f.name}は凍りついて動けない。`); }
      if (fx.stun && !e.boss && G.rand() < (fx.stunP == null ? 1 : fx.stunP)) { f.frozen = Math.max(f.frozen || 0, fx.stun); f.stunText = sp.el === "wind" ? "吹き飛ばされて、まだ" : "痺れて"; G.note(sp.el === "wind" ? `${f.name}は吹き飛ばされた。` : `${f.name}は痺れて動けない。`); }
      if (fx.snare) { f.m14snare = Math.max(f.m14snare || 0, fx.snare); G.note(`${f.name}の足を石が噛んだ。`); }
      if (fx.hex) { f.hex = Math.max(f.hex || 0, fx.hex + (crit ? 2 : 0)); G.note(`${f.name}は呪われた（${f.hex}手番）`); }
    }
    return dealt;
  }
  function healSelf(n, why) { const S = G.S; const a = S.hp; G.heal(n); if (S.hp > a) G.note(`${why || ""}HP +${S.hp - a}`); }
  // o.scroll：術の巻物（MP も才も要らない。易しい判定でほどける。大成功でも上の段は覚えない）
  function cast(id, t, o) {
    o = o || {};
    const S = G.S;
    const C = S.combat;
    const sp = SP[id];
    const fx = sp.fx || {};
    const say = SAY[sp.el] || SAY.fire;
    if (!o.scroll && S.mp < sp.mp) return;
    if (!o.scroll) S.mp -= sp.mp;
    C.m14used = C.m14used || {};
    if (!o.scroll) C.m14used[sp.el] = Math.max(C.m14used[sp.el] || 0, sp.tier || 1);
    const one = fx.t === "hit" || fx.t === "drain" || fx.t === "twice";
    G.log("you", o.scroll ? `${one ? t.name + "に向けて" : ""}術の巻物の封を切る（${sp.name}）` : `${one ? t.name + "に" : ""}${elName(sp.el)}の術「${sp.name}」を唱える`);
    const r = o.scroll ? G.check("魔力", M.spellVs({ diff: "易しい" }, M.vsOf(id)), sp.name, G.magicBonus()) : G.check("魔力", M.spellVs(sp, M.vsOf(id)), sp.name, G.gearBonus(sp.bonus) + G.magicBonus());
    if (r.ok) {
      G.say(say.ok);
      if (r.crit) G.log("nar", "術が、思っていたより深く通った。", { fx: "crit" });
      let dealt = 0;
      if (fx.t === "hit" || fx.t === "drain") dealt += strike(t, sp, fx, r.crit);
      else if (fx.t === "twice") { for (let i = 0; i < 2; i++) { const al = G.alive(); if (!al.length) break; dealt += strike(al.includes(t) ? t : G.pick(al), sp, fx, r.crit); } }
      else if (fx.t === "all") G.alive().slice().forEach((f) => { dealt += strike(f, sp, fx, r.crit); });
      if (fx.snareAll) G.alive().forEach((f) => { if (!walled(f)) f.m14snare = Math.max(f.m14snare || 0, fx.snareAll); });
      if (fx.wind) { C.m14wind = Math.max(C.m14wind || 0, fx.wind + (r.crit ? 2 : 0)); G.note(`追い風（${C.m14wind}手番・敵の攻撃が当たりにくい）`); }
      if (fx.stone) { C.m14stone = Math.max(C.m14stone || 0, fx.stone + (r.crit ? 2 : 0)); G.note(`石の肌（${C.m14stone}手番・受けるダメージが減る）`); }
      if (fx.t === "heal") {
        const n = dmgOf(fx, r.crit);
        healSelf(n);
        if (fx.party && G.b5Heal) (S.companions || []).forEach((c) => G.b5Heal(c, n));
        if (fx.cure && S.conds.includes("毒")) { S.conds = S.conds.filter((c) => c !== "毒"); G.note("毒が抜けた。"); }
      }
      if (fx.selfHeal) healSelf(G.dice(fx.selfHeal));
      if (fx.self && dealt > 0) healSelf(Math.ceil(dealt * fx.self), "吸った命で ");
      if (r.crit && !o.scroll) M.onCrit(id);
    } else G.say(r.fumble ? say.fumble : say.miss);
    if (r.fumble) { G.hurt(2 * (sp.tier || 1), say.die); G.payDebt(sp.debt || 1); }
  }
  M.cast = cast;
  Object.keys(SP).filter((id) => SP[id].fx).forEach((id) => { G.cbActs[id] = (t) => cast(id, t); });

  // K2 の「術の手癖」（攻める術に +5%）：新しい攻める術の名も数える
  const hand = D.SKILLS && D.SKILLS.k2_spellhand;
  if (hand && hand.fx && hand.fx.check) {
    const atk = Object.keys(SP).filter((id) => !["heal", "ward"].includes(id) && !(SP[id].fx && ["buff", "heal"].includes(SP[id].fx.t))).map((id) => SP[id].name);
    hand.fx.check.re = new RegExp(`^(${atk.join("|")})$`);
    hand.hint = "攻める術に +5%";
  }

  // ---------------------------------------------------------------- 上級を覚える：中級の大成功・強敵
  M.onCrit = (id) => {
    const sp = SP[id];
    if ((sp.tier || 1) !== 2 || M.aff(sp.el) !== "good" || M.knowsTier(sp.el, 3) || G.rand() >= 0.25) return;
    const top = M.ofEl(sp.el, 3).find((x) => !M.canLearn(x));
    if (!top) return;
    G.log("nar", "術が通りきったその一瞬、向こう側の、もう一枚奥の扉が見えた。手を伸ばすと、開いた。");
    G.learnSpell(top);
  };
  M.onBossWin = (C) => {
    const used = C.m14used || {};
    const els = Object.keys(used).filter((el) => used[el] >= 2 && M.aff(el) === "good" && !M.knowsTier(el, 3));
    if (!els.length || G.rand() >= 0.4) return;
    const top = M.ofEl(els[0], 3).find((x) => !M.canLearn(x));
    if (!top) return;
    G.log("nar", "倒れた強敵の上で、あなたの術の残り火が消えずに揺れている。それは、もっと大きな火の名を、あなたに教えた。");
    G.learnSpell(top);
  };

  // ---------------------------------------------------------------- 戦闘：手番の終わり（燃え続ける・追い風・石の肌・足止め）と、強敵に勝ったとき
  const combatAct0 = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const C = S && S.combat;
    const boss = !!(C && C.boss);
    const fum0 = S ? S.counters.fumbles : 0;
    const r = combatAct0(arg);
    if (!S || S.over) return r;
    // 炎の初級（combat.js）の大失敗にも借りを
    if (String(arg).split(":")[0] === "fire" && S.counters.fumbles > fum0) G.payDebt(SP.fire.debt || 1);
    if (C && S.combat === C && S.mode === "combat") {
      G.alive().forEach((f) => {
        if (f.m14burn > 0) { f.m14burn--; G.note(`炎が${f.name}を焼き続ける。`); G.cbDamage(f, G.d(4) + pow("魔力", 20), "burn"); }
        if (f.m14snare > 0) f.m14snare--;
      });
      if (C.m14wind > 0 && --C.m14wind === 0) G.note("追い風がやんだ。");
      if (C.m14stone > 0 && --C.m14stone === 0) G.note("肌の石が、ぽろぽろと剥がれ落ちた。");
      if (!G.alive().length && G._endCombat) G._endCombat("win");
    }
    if (C && boss && S.combat !== C && !S.over && C.foes.every((f) => f.hp <= 0)) M.onBossWin(C);
    return r;
  };

  // ---------------------------------------------------------------- 仲間の術の才
  // c.magic があればそれ。無ければ：術を撃つ仲間（c.fire）は抜きん出た才、癒し手（c.heal）は光が得意な人並み、ほかは名前で決まる（多くは才なし）
  M.allyTalent = (c) => {
    if (!c) return { lv: 0, good: [], bad: [] };
    if (c.magic && typeof c.magic.lv === "number") return clean(c.magic);
    const h = hash(String(c.id || c.name || ""));
    const atk = ["fire", "ice", "bolt", "wind", "earth", "dark"];
    if (c.fire) { const a = atk[h % atk.length]; let b = atk[(h >>> 4) % atk.length]; if (b === a) b = atk[(atk.indexOf(a) + 1) % atk.length]; return { lv: 2, good: [a, b], bad: [] }; }
    if (c.heal) return { lv: 1, good: ["light"], bad: [] };
    if (h % 100 < 12) return { lv: 1, good: [ELS[(h >>> 8) % ELS.length]], bad: [] };
    return { lv: 0, good: [], bad: [] };
  };
  // 仲間の術の名（戦闘の記録。術を撃つ仲間は、得意な属性の術で）
  G.m14AllyMagic = (c) => `${elName(M.allyTalent(c).good[0] || "fire")}の術`;
  G.m14CompLabel = (c) => { const t = M.allyTalent(c); return `術の才：${t.lv ? `${T.names[t.lv]}（${t.good.map(elName).join("・")}）` : T.names[0]}`; };

  // ---------------------------------------------------------------- 伝承の書：迷宮の主・使徒の落とし物（属性ごとに、主を順に割り当てる）
  const lore = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].m14lore);
  Object.keys(D.ENEMIES).filter((id) => D.ENEMIES[id].boss).forEach((id, i) => {
    const e = D.ENEMIES[id];
    const b = lore[i % lore.length];
    if (!(e.loot || []).some(([x]) => x === b)) e.loot = [...(e.loot || []), [b, 0.12]];
  });
})(globalThis.G = globalThis.G || {});
