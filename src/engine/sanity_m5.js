// 正気・獣の病・代償つきの品（M5）。文と表は src/data/sanity_m5.js、設定は docs/lore/curses.md 3.・4.
// 状態（どれも古いセーブには無い。無ければ 正気 100・獣 0 として扱う）：
//   S.sanity 0〜100 … 知りすぎる・術の借り（S.magicDebt）・魔人を見る・呪われた品で減る。宿・酒場・懺悔・まぬけな魔物で戻る
//   S.beast  0〜5   … 獣の病。疫医ベルナ（plague のある敵・出来事）からだけうつり（M9 #103、src/engine/m9_plague.js）、日が経つと進む。1〜2段なら教会で祓える
//   S.m5 = { day, clock, seen: {魔人 id: true}, low, trueName, forgot }
//   S.fate  "mad" | "beast" … 正気 0・獣 5 で冒険が終わったとき（M6 #55 の「選べない終わり方」が拾う）
// 終わり方は死と同じく S.over = "dead" にし、年表に kind "fate" の行、墓碑に fate を残す。
// core.js・combat.js・explore.js は書き換えず、関数を包む。レーン C（M5）が管理
(function (G) {
  const D = G.data;
  const M = D.M5;
  const T = M.TOLL;

  // ---------------------------------------------------------------- 値と段
  G.sanityOf = (S) => (S && typeof S.sanity === "number" ? S.sanity : 100);
  G.beastOf = (S) => (S && S.beast) || 0;
  G.sanityStage = (v) => (v >= 70 ? 0 : v >= 40 ? 1 : v >= 15 ? 2 : v > 0 ? 3 : 4);
  const st = (S) => (S.m5 = S.m5 || {});
  const holding = (id) => G.count(id) > 0 || G.S.weapon === id || G.S.armor === id || G.S.ring === id;

  // 正気を n 増減する（負で減る）。段が変わったら、数字ではなく症状の文を出す
  // cap：戻るときの上限（宿と酒場は M.REST_CAP まで）
  G.addSanity = (n, quiet, cap) => {
    const S = G.S;
    if (!S || S.over || !n) return;
    const a = G.sanityOf(S);
    const b = n > 0 ? Math.max(a, Math.min(a + n, cap || 100)) : Math.max(0, a + n);
    if (a === b) return;
    S.sanity = b;
    const x = st(S);
    x.low = Math.min(x.low ?? 100, b);
    const sa = G.sanityStage(a), sb = G.sanityStage(b);
    if (sb === 4) return G.m5End("mad");
    if (sb > sa) {
      G.say(G.pick(M.SANITY_DOWN[sb]));
      G.chron(M.SANITY_CHRON[sb], "sanity");
      notice(M.SANITY_NOTICE[sb]);
      openLore(M.SANITY_LORE[sb]);
    } else if (sb < sa && !quiet) G.say(G.pick(M.SANITY_UP));
  };

  // 病がうつる（もうかかっていれば一段進む）
  G.infect = () => {
    const S = G.S;
    if (!S || S.over) return;
    if (G.beastOf(S) > 0) return G.beastUp(1);
    st(S).clock = 0;
    G.beastUp(1);
  };
  G.beastUp = (n) => {
    const S = G.S;
    if (!S || S.over || !n) return;
    const a = G.beastOf(S);
    const b = Math.min(5, a + n);
    if (b === a) return;
    S.beast = b;
    st(S).clock = 0;
    if (b >= 5) return G.m5End("beast");
    G.say(M.BEAST_UP[b]);
    G.chron(M.BEAST_CHRON[b], "beast");
    notice(M.BEAST_NOTICE[b]);
    openLore(M.BEAST_LORE[b]);
  };
  // 仲間（M2）が異変に気づく。仲間がいなければ何もしない
  function notice(lines) {
    const S = G.S;
    if (!lines || !S || S.over || !(S.companions || []).length) return;
    const c = G.pick(S.companions);
    const n = G.m2Short ? G.m2Short(c) : c.name;
    G.say((Array.isArray(lines) ? G.pick(lines) : lines).replace(/\{n\}/g, n));
  }
  const openLore = (t) => { if (t && G.openLore) G.openLore(t); };
  G.beastCure = () => {
    const S = G.S;
    if (!S || !G.beastOf(S) || G.beastOf(S) > 2) return false;
    S.beast = 0;
    st(S).clock = 0;
    G.say(M.BEAST_CURE);
    G.chron("獣の病が祓われる", "beast");
    return true;
  };

  // 選べない終わり方。死と同じ扱いで冒険を終え、年表と墓碑に何が起きたかを残す
  G.m5End = (kind) => {
    const S = G.S;
    if (!S || S.over) return;
    const E = kind === "beast" ? M.END_BEAST : M.END_MAD;
    S.fate = kind;
    if (kind === "mad") S.sanity = 0;
    if (kind === "beast") {
      S.beast = 5;
      // 次の冒険で出会うことがある（冒険をまたいで残る）
      G.P.beasts = [{ name: S.profile.name, cls: S.clsName, date: G.date() }, ...(G.P.beasts || [])].slice(0, 5);
    }
    G.say(G.pick(E.text));
    const cause = G.pick(E.cause);
    G.chron(cause, "fate");
    G.die(cause);
  };

  // ---------------------------------------------------------------- 墓碑に終わり方を残す
  const baseFinish = G.finishRun;
  G.finishRun = () => {
    const S = G.S;
    const cb = G.onFinish;
    G.onFinish = null;
    try { baseFinish(); } finally { G.onFinish = cb; }
    const g = G.P.graves[0];
    if (g && g.id === S.id) { g.fate = S.fate || ""; g.sanity = G.sanityOf(S); g.beast = G.beastOf(S); }
    if (G.onFinish) G.onFinish();
  };

  // ---------------------------------------------------------------- 判定と能力値
  G.m5StatMod = (k) => {
    const S = G.S;
    const sg = G.sanityStage(G.sanityOf(S));
    const b = G.beastOf(S);
    let v = 0;
    if (k === "魅力") v -= sg >= 2 ? 10 : sg >= 1 ? 5 : 0;
    if (k === "知力" && sg >= 2) v += 5; // 見えないはずのものが見える
    if (k === "筋力") v += b >= 4 ? 10 : b >= 2 ? 5 : 0;
    if (k === "魅力" && b >= 2) v -= 5;
    if (k === "知力" && b >= 4) v -= 10;
    return v;
  };
  const baseStatEff = G.statEff;
  G.statEff = (k) => baseStatEff(k) + (G.S ? G.m5StatMod(k) : 0);

  // 狂気の縁より下では、判定が揺れる。大失敗は小さく心を削る
  const baseCheck = G.check;
  G.check = (stat, diff, reason, extra) => {
    const S = G.S;
    let e = extra || 0;
    if (S && G.sanityStage(G.sanityOf(S)) >= 2) e += G.d(21) - 11;
    const r = baseCheck(stat, diff, reason, e);
    if (r.fumble) G.addSanity(T.fumble, true);
    return r;
  };

  // ---------------------------------------------------------------- 記録が歪む
  const baseLog = G.log;
  G.log = (k, text, extra) => {
    const S = G.S;
    if (k === "nar" && text && S && !S.over) {
      const sg = G.sanityStage(G.sanityOf(S));
      if (sg >= 2 && G.rand() < (sg >= 3 ? 0.45 : 0.2)) text = warp(text);
    }
    return baseLog(k, text, extra);
  };
  function warp(t) {
    const faces = M.WARP_FACE.filter(([a]) => t.includes(a));
    if (faces.length && G.rand() < 0.6) { const [a, b] = G.pick(faces); return t.replace(a, b); }
    return t.replace(/。?$/, "。") + G.pick(M.WARP_TAIL);
  }

  // ---------------------------------------------------------------- 手番ごと・日ごと
  const baseEndTurn = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && !S.over) {
      daily(S);
      const sg = G.sanityStage(G.sanityOf(S));
      if (!S.over && sg >= 1 && S.mode !== "over" && G.rand() < [0, 0.06, 0.1, 0.16][sg]) G.log("sys", G.pick(M.PHANTOM));
    }
    baseEndTurn();
  };
  function daily(S) {
    const x = st(S);
    if (x.day == null) { x.day = S.day; return; }
    while (x.day < S.day && !S.over) { x.day++; oneDay(S, x); }
  }
  function oneDay(S, x) {
    // 持っているだけで進む代償
    const items = new Set([...Object.keys(S.inv), S.weapon, S.armor, S.ring].filter(Boolean));
    items.forEach((id) => {
      const t = D.ITEMS[id] && D.ITEMS[id].toll && D.ITEMS[id].toll.day;
      if (!t || S.over) return;
      if (t.sanity) G.addSanity(-t.sanity);
      if (t.name) forgetName(S, x);
      // 病をうつしはしない。かかっている者の病を早めるだけ（M9）
      if (t.beast && G.beastOf(S)) x.clock = (x.clock || 0) + t.beast;
    });
    if (S.over || !G.beastOf(S)) return;
    x.clock = (x.clock || 0) + 1;
    if (x.clock >= M.DAYS_PER_STAGE) G.beastUp(1);
  }
  // 忘れ名の冠：一日に一文字ずつ、名前を忘れる。全部忘れると名も知れぬ者になる
  function forgetName(S, x) {
    const name = S.profile.name;
    if (name === "名も知れぬ者") return;
    x.trueName = x.trueName || name;
    const chars = [...name];
    const idx = chars.map((c, i) => (c === "・" ? -1 : i)).filter((i) => i >= 0);
    if (idx.length <= 1) {
      S.profile.name = "名も知れぬ者";
      G.say("朝、宿帳に名前を書こうとして、手が止まった。何も思い出せない。宿の主人は気の毒そうに「名も知れぬ者」と書いた。");
      G.chron("自分の名前を思い出せなくなる", "sanity");
      return;
    }
    chars[G.pick(idx)] = "・";
    S.profile.name = chars.join("");
    G.say("朝、自分の名前の、どこかの一文字が思い出せなかった。");
  }

  // 瀕死で踏みとどまると、何かを見てしまう
  const baseHurt = G.hurt;
  G.hurt = (n, cause) => {
    const S = G.S;
    const c = S ? S.counters.clung : 0;
    baseHurt(n, cause);
    if (S && !S.over && S.counters.clung > c) { G.say("暗くなった視界の向こうで、誰かがこちらをのぞきこんでいた。"); G.addSanity(T.clung); }
  };

  // 新しい冒険は、はじめから項目を持つ
  const baseNewGame = G.newGame;
  G.newGame = (opt) => {
    const S = baseNewGame(opt);
    S.sanity = 100;
    S.beast = 0;
    S.m5 = { day: S.day, low: 100 };
    return S;
  };

  // ---------------------------------------------------------------- 術の借り（M1）と、知ること
  const basePayDebt = G.payDebt;
  G.payDebt = (n) => { basePayDebt(n); G.addSanity(T.debt * (n || 1)); };
  const baseLearn = G.learnSpell;
  G.learnSpell = (id) => {
    const ok = baseLearn(id);
    if (ok) G.addSanity(T.learn, true);
    return ok;
  };

  // ---------------------------------------------------------------- 出来事
  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    if (!o || !G.S || G.S.over) return;
    if (o.sanity) G.addSanity(o.sanity);
    if (o.beast === "infect") G.infect();
    else if (o.beast === "cure") G.beastCure();
    else if (typeof o.beast === "number") G.beastUp(o.beast);
  };
  const baseStartEvent = G.startEvent;
  G.startEvent = (ev) => {
    const ok = baseStartEvent(ev);
    const S = G.S;
    const t = ok && T.event[S.event];
    if (t) {
      if (t.sanity) G.addSanity(t.sanity);
      if (t.beastIfSick && G.beastOf(S)) G.beastUp(t.beastIfSick);
      if (S.over) { S.event = null; }
    }
    return ok;
  };
  const baseChoose = G.chooseEvent;
  G.chooseEvent = (i) => {
    const id = G.S.event;
    baseChoose(i);
    const t = T.choice[`${id}:${i}`];
    if (!t || G.S.over) return;
    if (t.sanity) G.addSanity(t.sanity);
    if (t.beast === "infect") G.infect();
  };
  // 前の冒険で獣になった者（いなければ null）
  G.m5OldBeast = () => {
    const S = G.S;
    const list = ((G.P && G.P.beasts) || []).filter((b) => !S || b.name !== S.profile.name);
    return list.length ? list[0] : null;
  };

  // ---------------------------------------------------------------- 戦闘
  const baseStartCombat = G.startCombat;
  G.startCombat = (ids, opt) => {
    baseStartCombat(ids, opt);
    const S = G.S;
    const C = S.combat;
    if (!C) return;
    const old = G.m5OldBeast();
    if (old) C.foes.forEach((f) => { if (f.id === "m5_oldbeast") f.name = `首に「${old.name}」の布を巻いた獣`; });
    const x = st(S);
    x.seen = x.seen || {};
    // 恐ろしいものを、はじめて見たとき（魔人・ボス・不死の群れ）
    ids.forEach((id) => {
      const e = D.ENEMIES[id];
      if (!e || x.seen[id]) return;
      const n = e.majin ? T.majin : e.boss ? T.boss : e.undead ? T.undead : 0;
      if (n) { x.seen[id] = true; G.addSanity(n); }
    });
    if (ids.some((id) => M.FOOLS.includes(id))) G.addSanity(T.fool, true);
    const r = G.ring();
    if (r && r.toll && r.toll.fight) {
      G.note(G.pick(["貝殻が囁く。「そいつは、右の脇が甘い」", "貝殻が囁く。「逃げろ」……と思ったら、歌の歌詞だった。", "貝殻が、音程の外れた歌をうたいはじめた。"]));
      G.addSanity(-r.toll.fight.sanity, true);
    }
  };

  const baseCombatAct = G.combatAct;
  G.combatAct = (arg) => {
    const S = G.S;
    const C = S.combat;
    if (!C) return baseCombatAct(arg);
    const kind = arg.split(":")[0];
    const w = G.weapon();
    const r = G.ring();
    const hp0 = S.hp;
    const foeHp = () => C.foes.reduce((a, f) => a + Math.max(0, f.hp), 0);
    const before = foeHp();
    // 病を持つ者（疫医ベルナ。M9）。一度の戦いでうつる・進むのは一段まで
    const carriers = C.m9 ? [] : C.foes.filter((f) => f.hp > 0 && D.ENEMIES[f.id].plague).map((f) => D.ENEMIES[f.id].plague);
    let usedMorning = false;
    if (kind === "item") { const it = D.ITEMS[arg.split(":")[1]]; usedMorning = !!(it && it.sanity && S.inv[arg.split(":")[1]]); }
    baseCombatAct(arg);
    if (S.over) return;
    const dealt = before - foeHp();
    // 代償つきの武器：当たるたびに
    if ((kind === "attack" || kind === "vital") && dealt > 0 && w.toll && w.toll.hit) {
      const t = w.toll.hit;
      if (G.rand() < (t.chance || 1)) {
        if (t.sanity) { if (G.rand() < 0.3) G.note("どこかで、誰かがすすり泣いた。"); G.addSanity(-t.sanity, true); }
        if (t.maxHp && S.maxHp > 8) { S.maxHp -= t.maxHp; S.hp = Math.min(S.hp, S.maxHp); G.note("鉤が肉を削ぐたび、自分の腕も少し細くなる気がする。（最大 HP -1）"); }
      }
    }
    // 血吸いの指輪：与えた傷の一部が戻る
    if (r && r.drain && dealt > 0 && S.hp < S.maxHp) {
      const n = Math.max(1, Math.floor(dealt * r.drain));
      G.heal(n);
      G.note(`指輪の石が温かくなった。HP +${n}`);
      if (G.rand() < 0.1) G.note("指輪が、小さくげっぷをした。");
    }
    // 病を持つ者に傷を負わされる
    if (S.hp < hp0 && carriers.length && G.rand() < Math.max(...carriers)) { C.m9 = true; G.m9Infect("fight"); }
    if (usedMorning) G.addSanity(D.ITEMS[arg.split(":")[1]].sanity);
  };

  // 瓶詰めの朝（戦闘の外）
  const baseUse = G.useItem;
  G.useItem = (id) => {
    const it = D.ITEMS[id];
    const ok = baseUse(id);
    if (ok && it && it.sanity) { G.say("栓を抜くと、ほんの一瞬、朝の匂いがした。"); G.addSanity(it.sanity); }
    return ok;
  };

  // ---------------------------------------------------------------- 町の施設
  const baseFac = G.facActions;
  G.facActions = () => {
    const groups = baseFac();
    const S = G.S;
    if (S.fac === "church" && groups[0]) {
      const cost = M.CONFESS_COST;
      groups[0].list.push({ id: "m5:confess", label: "懺悔する", sub: `${cost}G・1日1回`, disabled: S.gold < cost || (st(S).confessed === S.day), kw: ["懺悔", "告白"] });
      if (G.beastOf(S) >= 1 && G.beastOf(S) <= 2) groups[0].list.push({ id: "m5:purge", label: "体の熱を祓ってもらう", sub: `${M.PURGE_COST}G`, disabled: S.gold < M.PURGE_COST, kw: ["祓", "熱"] });
    }
    return groups;
  };

  const baseExploreAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "m5") return facility(arg);
    // 毛と牙が隠せなくなると、教会と王城には入れない
    if (head === "fac" && (arg === "church" || arg === "castle") && G.beastOf(S) >= 3) {
      G.log("you", arg === "church" ? "教会に入る" : "王城へ向かう");
      G.say(arg === "church" ? "扉の前で、堂守があなたの手元を見て顔色を変えた。「……お引き取りを」扉は目の前で閉まった。" : "門番が槍を交差させた。「その手を見せろ。……いや、見せなくていい。帰れ」");
      G.pass(1);
      return;
    }
    const sleptBefore = S.day;
    baseExploreAct(head, arg, a);
    if (S.over) return;
    if (head === "deeper") G.addSanity(T.deeper, true);
    if (head === "inn" && arg === "rest" && S.day > sleptBefore) G.addSanity(T.inn, false, M.REST_CAP);
    if (head === "tavern" && arg === "drink") G.addSanity(T.tavern, true, M.REST_CAP);
  };
  function facility(arg) {
    const S = G.S;
    if (arg === "confess") {
      S.gold -= M.CONFESS_COST;
      st(S).confessed = S.day;
      G.log("you", "懺悔する");
      G.say(G.pick([
        "格子の向こうの司祭は、あなたの話を最後まで黙って聞いた。聞き終えると、帳面に何か短く書きつけた。「行きなさい」",
        "話しているうちに、自分でも何を懺悔しているのか分からなくなった。司祭は「よくあることです」と言い、帳面をめくった。",
      ]));
      G.pass(1);
      G.addSanity(M.TOLL.confess);
      if (D.LORE && G.openLore) G.openLore("unseen:confess");
    } else if (arg === "purge") {
      S.gold -= M.PURGE_COST;
      G.log("you", "体の熱を祓ってもらう");
      G.say("司祭は黙ってあなたの袖をまくり、爪を見て、値段を言い直した。聖水に浸した布で腕を縛られ、一晩、鐘の音を聞かされた。");
      G.passDays(1);
      G.beastCure();
      if (D.LORE && G.openLore) G.openLore("beast:self");
    }
  }

  // ---------------------------------------------------------------- 崩れかけ：選んだ行動が勝手に入れ替わる
  const baseAct = G.act;
  G.act = (id) => {
    const S = G.S;
    if (S && !S.over && S.mode !== "combat" && G.sanityStage(G.sanityOf(S)) >= 3 && G.rand() < 0.12) {
      const group = G.actions().find((g) => g.list.some((x) => x.id === id));
      const others = group ? group.list.filter((x) => x.id !== id && !x.disabled) : [];
      if (others.length) { G.log("sys", M.SWAP); id = G.pick(others).id; }
    }
    return baseAct(id);
  };

  // ---------------------------------------------------------------- 画面に出す行（src/ui/ui.js の人物の表）
  // 正気は一度でも減ったら出す。獣の病は数字を出さず、体に起きていることだけ
  G.m5Rows = (S) => {
    const rows = [];
    if (!S) return rows;
    if (typeof S.sanity === "number" && S.sanity < 100) rows.push(["正気", `${S.sanity}・${M.SANITY_WORD[G.sanityStage(S.sanity)]}`]);
    const b = G.beastOf(S);
    if (b >= 1 && b <= 4) rows.push(["体", M.BEAST_WORD[b]]);
    return rows;
  };
})(globalThis.G = globalThis.G || {});
