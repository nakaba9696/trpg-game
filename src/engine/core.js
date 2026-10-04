// ゲームの中核：状態、判定と成長、時間、出来事の結果、トロフィー、年表、死と引退。
// 画面（DOM）には触らない。画面は G.S を読んで描く。レーン C（コア）が管理
(function (G) {
  const D = G.data;

  // ---------------------------------------------------------------- 乱数と小道具
  G.rand = Math.random;
  G.d = (n) => 1 + Math.floor(G.rand() * n);
  G.dice = (spec) => { let t = spec[2] || 0; for (let i = 0; i < spec[0]; i++) t += G.d(spec[1]); return t; };
  G.pick = (a) => a[Math.floor(G.rand() * a.length)];
  G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.sign = (n) => (n >= 0 ? "+" : "") + n;

  G.S = null;                              // 今の冒険
  G.P = { trophies: {}, graves: [] };      // 冒険をまたいで残るもの（トロフィーと墓碑）
  G.onTrophy = null;                       // 画面への通知
  G.onFinish = null;

  // ---------------------------------------------------------------- 暦と時間
  G.PHASES = ["朝", "昼", "夕", "夜"];
  G.SEASONS = ["春", "夏", "秋", "冬"];
  G.dateOf = (day) => {
    const y = 1127 + Math.floor((day - 1) / 360);
    const r = (day - 1) % 360;
    return `${y}年 ${G.SEASONS[Math.floor(r / 90)]} ${(r % 90) + 1}日`;
  };
  G.date = () => G.dateOf(G.S.day);
  G.pass = (n) => { const S = G.S; S.phase += n; while (S.phase >= 4) { S.phase -= 4; S.day++; } };
  G.passDays = (n) => { G.S.day += n; G.S.phase = 2; };
  G.sleep = () => { G.S.day++; G.S.phase = 0; };

  // ---------------------------------------------------------------- 参照
  G.loc = (id) => D.LOCS[id || G.S.loc];
  G.itemInfo = (id) => D.ITEMS[id] || (String(id).startsWith("x:") ? { name: String(id).slice(2), type: "loot", price: 0 } : null);
  G.fameRank = (f) => { let r = D.FAME_RANKS[0][1]; D.FAME_RANKS.forEach(([n, name]) => { if (f >= n) r = name; }); return r; };
  G.maxHpOf = (st) => 10 + Math.floor(st.体力 / 3);
  G.maxMpOf = (st) => Math.floor(st.魔力 / 5);
  G.totalGrowth = (S) => D.STATS.reduce((a, k) => a + Math.max(0, S.stats[k] - S.startStats[k]), 0);

  // ---------------------------------------------------------------- 記録
  G.log = (k, text, extra) => {
    const S = G.S;
    S.log.push(Object.assign({ k, text }, extra || {}));
    if (S.log.length > 240) S.log.splice(0, S.log.length - 240);
  };
  G.say = (t) => G.log("nar", t);
  G.note = (t) => G.log("sys", t);
  G.chron = (text, kind) => { G.S.chronicle.push({ date: G.date(), kind: kind || "event", text }); };
  G.memo = (t) => { const S = G.S; if (!S.memos.includes(t)) S.memos.push(t); if (S.memos.length > 30) S.memos.shift(); };

  // ---------------------------------------------------------------- 持ち物
  G.count = (id) => G.S.inv[id] || 0;
  G.has = (id) => G.count(id) > 0 || G.S.weapon === id || G.S.armor === id || G.S.ring === id;
  G.give = (id, n) => {
    n = n || 1;
    const it = G.itemInfo(id);
    if (!it) return false;
    G.S.inv[id] = (G.S.inv[id] || 0) + n;
    return true;
  };
  G.take = (id, n) => {
    n = n || 1;
    const S = G.S;
    if (!S.inv[id]) return false;
    S.inv[id] -= n;
    if (S.inv[id] <= 0) delete S.inv[id];
    return true;
  };
  G.weapon = () => D.ITEMS[G.S.weapon] || D.ITEMS.fists;
  G.armor = () => D.ITEMS[G.S.armor] || null;
  G.ring = () => D.ITEMS[G.S.ring] || null; // 装飾品（古いセーブには S.ring が無い）
  G.gearBonus = (kind) => {
    let b = 0;
    Object.keys(G.S.inv).forEach((id) => { const it = D.ITEMS[id]; if (it && it.type === "gear" && it.bonus && it.bonus[kind]) b += it.bonus[kind]; });
    const r = G.ring();
    if (r && r.bonus && r.bonus[kind]) b += r.bonus[kind];
    return b;
  };
  G.magicBonus = () => (G.weapon().magic || 0) + ((G.armor() && G.armor().magic) || 0) + ((G.ring() && G.ring().magic) || 0);
  // 装飾品の効き目を短い文にする（画面と店の説明用）
  G.ringEffect = (it) => {
    const KIND = { fire: "炎の魔法", heal: "癒し", steal: "盗み", trap: "罠", talk: "話術" };
    const out = Object.entries(it.stats || {}).map(([k, n]) => G.statModText(k, n));
    Object.entries(it.bonus || {}).forEach(([k, n]) => out.push((KIND[k] || k) + G.sign(n)));
    if (it.magic) out.push("魔法" + G.sign(it.magic));
    return out.join("・") + (it.cursed ? "・呪い" : "");
  };
  G.equip = (id) => {
    const S = G.S;
    const it = D.ITEMS[id];
    if (!it || !S.inv[id]) return false;
    if (it.type === "weapon") {
      if (S.weapon && S.weapon !== "fists") G.give(S.weapon);
      G.take(id);
      S.weapon = id;
    } else if (it.type === "armor") {
      if (S.armor) G.give(S.armor);
      G.take(id);
      S.armor = id;
    } else if (it.type === "ring") {
      if (G.ring() && !G.unequip("ring")) return false;
      G.take(id);
      S.ring = id;
    } else return false;
    G.note(`${it.name}を装備した。`);
    return true;
  };

  // 装備を外して持ち物に戻す（今は装飾品だけ）。呪われた物は指の皮ごと持っていかれる
  G.unequip = (slot) => {
    const S = G.S;
    if (slot !== "ring" || !S.ring) return false;
    const it = G.ring();
    if (it && it.cursed) {
      const n = Math.min(3, S.hp - 1);
      if (n > 0) S.hp -= n;
      G.say(`${it.name}は、はがすようにしか外れなかった。指の皮がめくれた。`);
      if (n > 0) G.note(`HP -${n}`);
    }
    G.give(S.ring);
    S.ring = "";
    G.note(`${it ? it.name : "装飾品"}を外した。`);
    return true;
  };

  // 戦闘の外で消耗品を使う（画面の持ち物欄から呼ぶ）
  G.useItem = (id) => {
    const S = G.S;
    const it = D.ITEMS[id];
    if (it && it.type === "tome") return G.readTome(id);
    if (!S || S.over || S.mode === "combat" || !it || it.type !== "use" || !(it.hp || it.mp) || !G.take(id)) return false;
    G.log("you", `${it.name}を使う`);
    if (it.hp) { G.heal(it.hp); G.note(it.hp > 100 ? "HP が全快した。" : `HP +${it.hp}`); }
    if (it.mp) { S.mp = Math.min(S.maxMp, S.mp + it.mp); G.note(it.mp > 100 ? "MP が全快した。" : `MP +${it.mp}`); }
    return true;
  };

  // ---------------------------------------------------------------- 能力値・判定・成長
  // S2：画面に出す能力値は点（割合 ÷ 4 の切り捨て）。S.stats・S.caps・判定は成功率の尺度（0〜99）のまま。
  // 端数（0〜3）は経験で、4 たまると 1 点伸びる。古いセーブもそのまま点で見える。docs/s2_stats.md
  G.PT = () => (D.S2 && D.S2.PCT) || 4;
  G.pt = (v) => Math.floor(Math.max(0, v || 0) / G.PT());
  G.ptExp = (v) => Math.max(0, v || 0) % G.PT();
  G.ptStats = (st) => Object.fromEntries(D.STATS.map((k) => [k, G.pt((st || {})[k])]));
  // 装備などの能力値の補正（判定に足す％）の書き方
  G.statModText = (k, n) => `${k}${G.sign(n)}%`;
  G.statEff = (k) => {
    const S = G.S;
    let v = S.stats[k];
    if (k === "敏捷" && G.armor()) v += G.armor().agi || 0;
    if (G.ring() && G.ring().stats) v += G.ring().stats[k] || 0;
    if (S.conds.includes("毒") && (k === "筋力" || k === "体力")) v -= 10;
    if (S.conds.includes("呪い")) v -= 5;
    return v;
  };
  G.diffMod = (diff) => (typeof diff === "number" ? diff : D.DIFF[diff] || 0);
  G.chance = (stat, diff, extra) => G.clamp(G.statEff(stat) + G.diffMod(diff) + (extra || 0), 5, 95);

  // 100面ダイスで判定。結果はログに残り、成功すると能力値が伸びることがある
  G.check = (stat, diff, reason, extra) => {
    const S = G.S;
    const chance = G.chance(stat, diff, extra);
    const roll = G.d(100);
    const crit = roll <= Math.max(1, Math.floor(chance / 10));
    const fumble = roll >= 96;
    const ok = crit || (!fumble && roll <= chance);
    const label = crit ? "大成功" : fumble ? "大失敗" : ok ? "成功" : "失敗";
    S.counters.checks++;
    if (crit) S.counters.crits++;
    if (fumble) S.counters.fumbles++;
    const r = { stat, diff: typeof diff === "string" ? diff : "", reason: reason || "判定", chance, roll, ok, crit, fumble, label };
    const cur = S.stats[stat];
    let g = 0;
    if (ok && G.d(100) > cur) g = G.d(4);
    else if (!ok && !fumble && G.rand() < 0.2) g = 1;
    if (g) { const [a, b] = G.grow(stat, g); if (b > a) r.growth = [a, b]; }   // 点が上がったときだけ見せる
    G.log("dice", "", r);
    return r;
  };

  // n は成功率の尺度で足す。返すのは [前の点, 後の点, 実際に増えた割合]
  G.grow = (k, n) => {
    const S = G.S;
    const a = S.stats[k];
    const b = Math.min(S.caps[k], a + n);
    if (b > a) {
      S.stats[k] = b;
      if (k === "体力") { const m = G.maxHpOf(S.stats); S.hp += m - S.maxHp; S.maxHp = m; }
      if (k === "魔力") { const m = G.maxMpOf(S.stats); S.mp += m - S.maxMp; S.maxMp = m; }
    }
    return [G.pt(a), G.pt(Math.max(a, b)), Math.max(0, b - a)];
  };

  // ---------------------------------------------------------------- HP と死
  G.heal = (n) => { const S = G.S; S.hp = Math.min(S.maxHp, S.hp + n); };
  G.hurt = (n, cause) => {
    const S = G.S;
    if (S.over) return;
    S.hp = Math.max(0, S.hp - n);
    if (S.hp > 0) return;
    if (!S.clungUsed) {
      S.clungUsed = true;
      G.say("視界が暗くなる。──だが、まだ終われない。");
      const r = G.check("体力", "難しい", "瀕死で踏みとどまる");
      if (r.ok) { S.hp = 1; S.counters.clung++; G.say("歯を食いしばり、あなたは立ち上がった。"); return; }
    }
    G.die(cause || "力尽きた");
  };
  G.die = (cause) => {
    const S = G.S;
    if (S.over) return;
    S.over = "dead";
    S.deathCause = cause;
    S.hp = 0;
    S.mode = "over";
    S.combat = null;
    G.say(`${S.profile.name}は倒れた。${cause}。`);
    G.chron(`${G.loc().name}にて死亡。${cause}`, "death");
    G.finishRun();
  };
  G.retire = () => {
    const S = G.S;
    if (S.over) return;
    S.over = "end";
    S.mode = "over";
    G.say(`${S.profile.name}は剣を置いた。冒険は、ここで終わる。`);
    G.chron(G.goalDone(S) ? "宿願を果たし、冒険から身を引く" : "冒険から身を引く", "end");
    G.finishRun();
  };
  G.finishRun = () => {
    const S = G.S;
    G.checkTrophies();
    G.P.graves = [{
      id: S.id, name: S.profile.name, cls: S.clsName, goal: S.goal.text, end: S.over, cause: S.deathCause,
      date: G.date(), location: G.loc().name, turns: S.turn, fame: S.fame, title: S.title,
      stats: { ...S.stats }, chronicle: S.chronicle.slice(-100), at: Date.now(),
    }, ...G.P.graves.filter((g) => g.id !== S.id)].slice(0, 40);
    if (G.onFinish) G.onFinish();
  };

  // ---------------------------------------------------------------- 目的・トロフィー
  G.goalDone = (S) => {
    switch (S.goal.id) {
      case "majin": return !!S.flags.graw;
      case "king": return S.title === "国王";
      case "rich": return S.gold >= 10000;
      case "sword": return ["volgrim", "byakuya"].some((k) => S.inv[k] || S.weapon === k);
      default: return false;
    }
  };
  G.award = (key, custom) => {
    const S = G.S;
    const t = custom || D.TROPHIES.find((x) => x.key === key);
    if (!t || G.P.trophies[key]) return false;
    G.P.trophies[key] = { name: t.name, tier: t.tier, desc: t.desc, by: S ? `${S.clsName} ${S.profile.name}` : "", date: S ? G.date() : "", at: Date.now() };
    if (S) {
      G.log("trophy", `トロフィー『${t.name}』を獲得（${t.desc}）`);
      G.chron(`トロフィー『${t.name}』を獲得`, "trophy");
    }
    if (G.onTrophy) G.onTrophy(t);
    return true;
  };
  G.checkTrophies = () => {
    const S = G.S;
    D.TROPHIES.forEach((t) => { if (t.test && !G.P.trophies[t.key]) { try { if (t.test(S)) G.award(t.key); } catch (e) { /* 条件の書き損じは無視 */ } } });
  };

  // ---------------------------------------------------------------- 名声と称号
  G.addFame = (n) => {
    const S = G.S;
    const before = G.fameRank(S.fame);
    S.fame = Math.max(0, S.fame + n);
    const after = G.fameRank(S.fame);
    if (after !== before && n > 0) { G.note(`名声が高まった。今やあなたは「${after}」だ。`); G.chron(`「${after}」と呼ばれるようになる`, "event"); }
    const nation = n > 0 && G.nationOf();
    if (nation) G.repOf(nation).rep += n;   // 名声は大陸じゅうの名の通り方、評判はその国で稼いだ分
  };

  // ---------------------------------------------------------------- 国ごとの評判と悪名（M3）
  // S.repute = { 国: { rep: 評判, inf: 悪名, wanted: 賞金首か } }。S.sin = 罪の匂い（国をまたいで残る。殺しと裏切りで増える）
  // 国は場所の nation か region。D.LAWLESS の地域（使徒領など）には衛兵がいない。
  // 悪名が手配の線（30＋評判/10、最大 +20）を超えるとその国で賞金首。10 日ごとに悪名が 1 ずつ薄れ、線より 10 下がると手配が解ける。
  // 罪の種類と重さは D.CRIMES、既存の出来事の悪行は D.DEEDS（src/data/events_m3.js）。古いセーブでは項目が無くても動く
  G.nationOf = (id) => {
    const L = D.LOCS[id || G.S.loc];
    const n = L && (L.nation || L.region);
    return n && !(D.LAWLESS || []).includes(n) ? n : null;
  };
  G.repOf = (n) => { const S = G.S; S.repute = S.repute || {}; S.m3day = S.m3day || S.day; return S.repute[n] || (S.repute[n] = { rep: 0, inf: 0, wanted: false }); };
  G.bountyLine = (n) => 30 + Math.min(20, Math.floor(G.repOf(n).rep / 10));
  G.bounty = (n) => G.repOf(n).inf * 10;
  G.wanted = (n) => { const S = G.S; n = n === undefined ? G.nationOf() : n; return !!(n && S.repute && S.repute[n] && S.repute[n].wanted); };
  G.wantedIn = () => Object.keys(G.S.repute || {}).filter((n) => G.S.repute[n].wanted);
  G.infamyHere = () => { const n = G.nationOf(); return n && G.S.repute && G.S.repute[n] ? G.S.repute[n].inf : 0; };
  G.updateWanted = (n) => {
    const S = G.S;
    const r = G.repOf(n);
    const line = G.bountyLine(n);
    if (!r.wanted && r.inf >= line) {
      r.wanted = true;
      G.chron(`${n}で賞金首になる。懸賞金${G.bounty(n)}G`, "event");
      if (S.title && S.title !== "国王" && S.titleAt === n) {
        G.note(`${n}は、あなたの${S.title}の位を取り上げた。`);
        G.chron(`${n}から${S.title}の位を剥奪される`, "event");
        S.title = ""; S.titleAt = "";
      }
    } else if (r.wanted && r.inf < line - 10) {
      r.wanted = false;
      G.chron(`${n}での手配が解かれる`, "event");
    }
  };
  G.addInfamy = (v, n) => {
    n = n === undefined ? G.nationOf() : n;
    if (!n || !v) return;
    const r = G.repOf(n);
    r.inf = G.clamp(r.inf + v, 0, 999);
    G.note(`${n}での悪名 ${G.sign(v)}`);
    G.updateWanted(n);
  };
  G.crime = (kind, n) => {
    const S = G.S;
    const c = (D.CRIMES || {})[kind];
    if (!c) return;
    if (c.sin) S.sin = (S.sin || 0) + c.sin;
    G.addInfamy(c.inf, n);
  };
  G.reputeTick = () => {
    const S = G.S;
    if (!S.repute) return;
    S.m3day = S.m3day || S.day;
    while (S.day - S.m3day >= 10) {
      S.m3day += 10;
      Object.keys(S.repute).forEach((n) => { const r = S.repute[n]; if (r.inf > 0) { r.inf--; G.updateWanted(n); } });
    }
  };
  // 画面の見出しに添える一言（手配中の国と懸賞金、なければ今いる国の悪名）
  G.reputeLabel = () => {
    const S = G.S;
    if (!S) return "";
    const w = G.wantedIn();
    if (w.length) return `・${w.includes(G.nationOf()) ? "この国で" : w.join("・") + "で"}手配中（懸賞金 ${G.bounty(w.includes(G.nationOf()) ? G.nationOf() : w[0])}G）`;
    const inf = G.infamyHere();
    return inf ? `・悪名 ${inf}` : "";
  };

  // ---------------------------------------------------------------- 仲間
  G.genCompanion = () => {
    const P = D.PROFILE;
    const sex = G.rand() < 0.5 ? "男" : "女";
    const name = G.pick(P.names.west[sex]);
    const cls = G.pick(["傭兵", "弓使い", "僧侶", "魔法使い", "ならず者", "剣士", "槍兵"]);
    const S = G.S;
    return {
      name: `${cls}の${name}`, cls, power: G.clamp(30 + G.d(20) + Math.floor(S.fame / 10), 30, 85), dmg: G.d(3) - 1,
      desc: G.pick(P.personality), heal: cls === "僧侶", fire: cls === "魔法使い",
    };
  };
  G.addCompanion = (c) => {
    const S = G.S;
    if (S.companions.length >= 3) { G.note("これ以上、仲間は連れていけない。"); return false; }
    const comp = c === "random" ? G.genCompanion() : { ...c };
    S.companions.push(comp);
    G.note(`${comp.name}が仲間になった。（${comp.desc}）`);
    G.chron(`${comp.name}が仲間に加わる`, "event");
    return true;
  };

  // ---------------------------------------------------------------- 魔法の習得（M1）
  // 炎と癒しは誰でも使える。ほかの術（D.SPELLS）は、学院か魔導書で覚えて S.spells に持つ（古いセーブには無い）
  G.knows = (id) => { const sp = D.SPELLS && D.SPELLS[id]; return !!sp && (!!sp.base || (G.S.spells || []).includes(id)); };
  G.learnSpell = (id) => {
    const S = G.S;
    const sp = D.SPELLS && D.SPELLS[id];
    if (!sp || G.knows(id)) return false;
    S.spells = [...(S.spells || []), id];
    G.note(`${sp.name}を覚えた。（${sp.hint}）`);
    G.chron(`${sp.name}を覚える`);
    return true;
  };
  // 借りた力の代償。術を大失敗したときに払う。今は借り（S.magicDebt）が積もるだけ。正気（M5）はここに繋ぐ
  G.payDebt = (n) => {
    const S = G.S;
    S.magicDebt = (S.magicDebt || 0) + n;
    G.note("どこか遠くで、帳面に何かが書き足された気がする。");
  };
  // 魔導書を読み解く（知力）。覚えても本は残る
  G.tomeChance = (id) => G.chance("知力", (D.ITEMS[id] && D.ITEMS[id].learn) || "普通");
  G.readTome = (id) => {
    const S = G.S;
    const it = D.ITEMS[id];
    if (!S || S.over || S.mode === "combat" || !it || it.type !== "tome" || !S.inv[id] || G.knows(it.teach)) return false;
    G.log("you", `${it.name}を読み解く`);
    G.pass(1);
    const r = G.check("知力", it.learn || "普通", "魔導書を読み解く");
    if (r.ok) { G.say("文字の並びが、ふいに意味を持った。誰かが耳元で、読み方を教えてくれたような気がした。"); G.learnSpell(it.teach); }
    else if (r.fumble) { G.say("読み違えた一行が、指に絡みついて離れない。"); G.payDebt(1); }
    else G.say("頁の上で文字が泳ぐ。今日は読めそうにない。");
    return true;
  };

  // ---------------------------------------------------------------- 出来事の結果を当てはめる
  G.apply = (o) => {
    const S = G.S;
    if (!o || S.over) return;
    if (o.text) G.say(o.text);
    if (o.gold) {
      const g = Math.max(-S.gold, o.gold);
      S.gold += g;
      if (g) G.note(`所持金 ${G.sign(g)}G`);
    }
    if (o.heal === "full") { S.hp = S.maxHp; S.mp = S.maxMp; G.note("HP と MP が全快した。"); }
    if (o.mp) { S.mp = G.clamp(S.mp + o.mp, 0, S.maxMp); G.note(`MP ${G.sign(o.mp)}`); }
    if (o.fame) { G.addFame(o.fame); G.note(`名声 ${G.sign(o.fame)}`); }
    if (o.item) {
      const items = typeof o.item === "string" ? { [o.item]: 1 } : o.item;
      Object.entries(items).forEach(([id, n]) => { if (G.give(id, n)) G.note(`${G.itemInfo(id).name}${n > 1 ? " ×" + n : ""}を手に入れた。`); });
    }
    if (o.remove && G.take(o.remove)) G.note(`${G.itemInfo(o.remove).name}を失った。`);
    if (o.grow) {
      Object.entries(o.grow).forEach(([k, n]) => {
        if (!D.STATS.includes(k)) return;
        const [a, b, got] = G.grow(k, n);
        if (b > a) G.log("grow", `${k}が伸びた ${a}→${b}`);
        else if (got) G.note(`${k}が少し鍛えられた。`);
      });
    }
    if (o.cond && !S.conds.includes(o.cond)) { S.conds.push(o.cond); G.note(`状態：${o.cond}`); }
    if (o.cure) S.conds = S.conds.filter((c) => c !== "毒" && c !== "呪い");
    if (o.days) G.passDays(o.days);
    if (o.companion) G.addCompanion(o.companion);
    if (o.flag) S.flags[o.flag] = true;
    if (o.memo) G.memo(o.memo);
    if (o.chron) G.chron(o.chron);
    if (o.trophy) G.award(o.trophy);
    if (o.crime) G.crime(o.crime);
    if (o.infamy) G.addInfamy(o.infamy);
    if (o.sin) S.sin = Math.max(0, (S.sin || 0) + o.sin);
    if (o.title === "国王" && G.nationOf()) { const r = G.repOf(G.nationOf()); r.inf = 0; r.wanted = false; }
    if (o.dropCompanion && S.companions.length) { const c = S.companions.pop(); G.note(`${c.name}は、もういない。`); }
    if (o.hp) { if (o.hp > 0) { G.heal(o.hp); G.note(`HP +${o.hp}`); } else { G.note(`HP ${o.hp}`); G.hurt(-o.hp, "傷がもとで力尽きた"); } }
    if (S.over) return;
    if (o.fight) { G.startCombat(G.resolveFoes(o.fight), { win: o.win }); return; }
    if (o.next) G.startEvent(o.next);
  };

  G.resolveFoes = (spec) => {
    const list = Array.isArray(spec) ? spec : [spec];
    return list.map((id) => (id === "@pool" ? G.pick(G.loc().pool || ["goblin"]) : id)).filter((id) => D.ENEMIES[id]);
  };

  // ---------------------------------------------------------------- 出来事
  G.eventTags = () => {
    const L = G.loc();
    const t = ["any", L.type, G.S.loc];
    if (L.capital) t.push("capital");
    if (L.sea) t.push("port");
    if (["frost", "garmund"].includes(G.S.loc)) t.push("snow");
    if (["wasteland", "majincastle"].includes(G.S.loc)) t.push("realm");
    return t;
  };
  G.randomEvent = () => {
    const S = G.S;
    const tags = G.eventTags();
    const pool = D.EVENTS.filter((e) => e.w > 0 && e.where.some((w) => tags.includes(w)) && !(e.once && S.flags["ev:" + e.id]) && (!e.cond || e.cond(S)));
    if (!pool.length) return null;
    let total = pool.reduce((a, e) => a + e.w, 0);
    let r = G.rand() * total;
    for (const e of pool) { r -= e.w; if (r <= 0) return e; }
    return pool[pool.length - 1];
  };
  G.startEvent = (ev) => {
    const S = G.S;
    const e = typeof ev === "string" ? D.EVENTS.find((x) => x.id === ev) : ev;
    if (!e) return false;
    if (e.once) S.flags["ev:" + e.id] = true;
    S.mode = "event";
    S.event = e.id;
    G.log("title", e.title);
    G.say(e.text);
    return true;
  };
  G.eventChoices = () => {
    const S = G.S;
    const e = D.EVENTS.find((x) => x.id === S.event);
    if (!e) return [];
    return e.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.cond || c.cond(S));
  };
  G.chooseEvent = (i) => {
    const S = G.S;
    const e = D.EVENTS.find((x) => x.id === S.event);
    const c = e && e.choices[i];
    if (!c) return;
    if (c.cost) { if (S.gold < c.cost) { G.note("金が足りない。"); return; } S.gold -= c.cost; G.note(`所持金 -${c.cost}G`); }
    G.log("you", c.label);
    S.mode = "explore";
    S.event = null;
    if (c.fight) { G.startCombat(G.resolveFoes(c.fight), { win: c.win || (c.ok && c.ok.win), firstStrike: c.firstStrike }); return; }
    if (c.next && !c.stat) { G.startEvent(c.next); return; }
    let o = c.ok;
    if (c.stat) {
      const r = G.check(c.stat, c.diff || "普通", c.label, c.bonus ? G.gearBonus(c.bonus) : 0);
      o = r.ok ? c.ok : c.ng;
    }
    G.apply(o);
    const deed = (D.DEEDS || {})[e.id + ":" + i];   // 既存の出来事の悪行（書き換えずに悪名を付ける）
    if (deed && o && !S.over && (deed.on === "any" || (o === c.ng ? "ng" : "ok") === (deed.on || "ok"))) G.crime(deed.crime);
  };

  // ---------------------------------------------------------------- 新しい冒険
  G.newGame = (opt) => {
    const c = D.CLASSES[opt.cls];
    const stats = { ...opt.stats };
    const S = {
      v: 1, id: "r" + Date.now().toString(36) + Math.floor(G.rand() * 1e6).toString(36),
      profile: { ...opt.profile }, cls: opt.cls, clsName: c.name,
      goal: { id: opt.goal, text: opt.goalText || D.GOALS[opt.goal].text },
      stats, caps: { ...opt.caps }, startStats: { ...stats },
      maxHp: G.maxHpOf(stats), hp: G.maxHpOf(stats), maxMp: G.maxMpOf(stats), mp: G.maxMpOf(stats),
      gold: c.gold, fame: 0, title: "", inv: { ...c.items }, weapon: c.weapon, armor: c.armor, ring: "",
      companions: [], loc: c.start, visited: {}, day: 1, phase: 0, turn: 0,
      mode: "explore", fac: null, event: null, combat: null, depth: 0, travel: null,
      quests: [], board: null, recruits: null, flags: {}, conds: [], memos: [], chronicle: [], log: [],
      counters: { kills: 0, bosses: 0, quests: 0, checks: 0, crits: 0, fumbles: 0, clung: 0, travels: 0 },
      clungUsed: false, over: "", deathCause: "", startedAt: Date.now(),
    };
    G.S = S;
    S.spells = [...((D.SPELL_START && D.SPELL_START[opt.cls]) || [])]; // 覚えている術（M1）
    S.visited[S.loc] = true;
    const L = G.loc();
    G.chron(`${L.name}にて、${c.name}${S.profile.name}の冒険が始まる。目的は「${S.goal.text}」`, "start");
    G.log("title", L.name);
    G.say(L.desc);
    G.say(`${S.profile.name}、${S.profile.age}歳。${S.profile.history}。今日から、ここで生きていく。`);
    return S;
  };

  // ---------------------------------------------------------------- 手番
  G.actions = () => {
    const S = G.S;
    if (!S || S.over) return [];
    if (S.mode === "combat") return G.combatActions();
    if (S.mode === "event") {
      return [{ title: "どうする？", list: G.eventChoices().map(({ c, i }) => {
        const sub = [];
        if (c.stat) sub.push(`${c.stat}・${c.diff || "普通"} ${G.chance(c.stat, c.diff || "普通", c.bonus ? G.gearBonus(c.bonus) : 0)}%`);
        if (c.cost) sub.push(`${c.cost}G`);
        if (c.fight) sub.push("戦闘");
        return { id: "ev:" + i, label: c.label, sub: sub.join("・"), disabled: !!(c.cost && S.gold < c.cost) };
      }) }];
    }
    if (S.mode === "fac") return G.facActions();
    return G.exploreActions();
  };

  G.act = (id) => {
    const S = G.S;
    if (!S || S.over) return;
    const a = G.actions().flatMap((g) => g.list).find((x) => x.id === id);
    if (!a || a.disabled) return;
    const [head, ...rest] = id.split(":");
    const arg = rest.join(":");
    if (head === "ev") G.chooseEvent(Number(arg));
    else if (head === "cb") G.combatAct(arg);
    else G.exploreAct(head, arg, a);
    G.endTurn();
  };

  G.endTurn = () => {
    const S = G.S;
    S.turn++;
    G.reputeTick();
    if (!S.over && G.goalDone(S) && !S.flags.goalAnnounced) {
      S.flags.goalAnnounced = true;
      G.log("title", "宿願成就");
      G.say(`「${S.goal.text}」──あなたは、ついにそれを成し遂げた。`);
      G.chron(`宿願を果たす：${S.goal.text}`, "trophy");
    }
    G.checkTrophies();
  };
})(globalThis.G = globalThis.G || {});
