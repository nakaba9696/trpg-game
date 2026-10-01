// 仲間との恋と結婚（M10）。M2（仲間の性格・好感度・会話・裏切り・死別）の上に、恋の気配・告白・すれ違い・嫉妬・別れ・求婚・結婚・
// 家を持つ・連れ合いとの暮らし・連れ合いの死や裏切りを足す。DOM には触らない。core.js・companions_m2.js・ending_m6.js は書き換えず、包んで足す。
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.m10State・G.m10Of が足りない所を埋める）
//   S.m10 = { lover 恋仲の仲間の id, spouse { id, name, cls, sex, day, loc, how } 連れ合い（失っても記録は残る。lost に別れ方）,
//             home { loc, name, day, seen } 家, atHome 家に残った連れ合い（仲間の欄から外した写し）, child 子のほのめかしの数,
//             homeDay 留守の日数を見た日, counts {...}, past [{ name, cls, sex, how, date, loc, wed }] }
//     past.how: part 別れた / death 死んだ / betray 裏切って去った / leave 去った / slain 刃を向けてきて討った / ash 家ごと失った
//   仲間ひとりずつ：c.m10 = { st 間柄（"" / spark 気配 / love 恋仲 / vow 誓った / wed 連れ合い）, since その間柄になった日,
//     cool この日までは先へ進まない, miss すれ違いのまま, ex 前に別れた }・c.sex（無ければ名前から推す）・c.age（無ければ名前から決める）
//
// 出来事のデータ（src/data/events_m10.js）の結果に書けるもの：m10（"spark" "cool" "love" "refuse" "miss" "mend" "jealous" "part" "vow" "wed" "child" "forgive" "ash" "lastletter"）
//   文の中の {sp} 恋人・連れ合いの短い名前・{spw} その人の呼び名（夫／妻）・{nw} 主役の仲間を連れ合いとして呼ぶ名（夫／妻）・{yw} あなたの呼び名
//   {town} 家のある町・{wedloc} 式を挙げた所・{age_you} あなたの歳に合わせた言い回し（M2 の {n} {c} {m} {home} {kin} なども使える）
// レーン C（コア）＋ V（出来事）の M10 が管理
(function (G) {
  const D = G.data;
  const M = () => D.M10;
  const MONSTER = /ゴブ|ゴブリン|オーク|スライム/;
  const PARTNER = ["love", "vow", "wed"];
  const HOUSE = 500; // 家の値段
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (Math.imul(31, h) + ch.codePointAt(0)) | 0; return Math.abs(h); };

  // ---------------------------------------------------------------- 状態
  G.m10State = (S) => {
    S = S || G.S;
    if (!S.m10) S.m10 = {};
    const m = S.m10;
    m.counts = Object.assign({ spark: 0, love: 0, confess: 0, refuse: 0, miss: 0, jealous: 0, part: 0, propose: 0, wed: 0, home: 0, child: 0, widow: 0, betray: 0, leave: 0 }, m.counts || {});
    m.past = m.past || [];
    m.child = m.child || 0;
    return m;
  };
  G.m10Of = (c) => {
    if (!c.m10) c.m10 = { st: "" };
    if (!c.sex) c.sex = G.m10Sex(c);
    if (!c.age) c.age = 19 + (hash(`${c.name}:${c.id || ""}`) % 26);
    return c.m10;
  };
  // 仲間の性別：今の仲間の欄には無いので、名前の表から推す（乱数を使わない）
  const FIXED = { ヨアヒム: "男", ガストン: "男" };
  G.m10Sex = (c) => {
    if (c.sex) return c.sex;
    const n = G.m2Short(c);
    const N = (D.PROFILE && D.PROFILE.names) || {};
    for (const cul of Object.keys(N)) for (const s of ["男", "女"]) if ((N[cul][s] || []).some((x) => x === n || n.endsWith(x))) return s;
    const k = Object.keys(FIXED).find((x) => String(c.name).includes(x));
    return k ? FIXED[k] : hash(c.name) % 2 ? "女" : "男";
  };
  G.m10Word = (sex) => (sex === "女" ? "妻" : "夫");
  // 恋の相手になれる仲間（人の言葉で暮らす者。魔物の子分は惚れても、それは別の話）
  G.m10Can = (c) => !!c && !MONSTER.test(`${c.name} ${c.cls}`);
  // 相性（あなたの性格と仲間の性格）。-1〜2
  G.m10Compat = (c, S) => {
    S = S || G.S;
    const you = G.m2TraitOf({ desc: (S.profile && S.profile.personality) || "", name: (S.profile && S.profile.name) || "" });
    const t = c.trait || G.m2TraitOf(c);
    const C = M().COMPAT;
    let n = 0;
    if (C.good.some(([a, b]) => (a === you && b === t) || (a === t && b === you))) n += 1;
    if (C.bad.some(([a, b]) => (a === you && b === t) || (a === t && b === you))) n -= 1;
    if (you === t && !C.selfish.includes(t)) n += 1;
    if (t === "amorous") n += 1;
    return G.clamp(n, -1, 2);
  };
  G.m10SparkAt = (c) => 62 - 4 * G.m10Compat(c);
  const st = (c) => (c && c.m10 && c.m10.st) || "";
  G.m10St = st;
  G.m10Partner = (S) => {
    S = S || G.S;
    if (!S) return null;
    return (S.companions || []).find((c) => PARTNER.includes(st(c))) || (S.m10 && S.m10.atHome) || null;
  };
  G.m10Spouse = (S) => { const p = G.m10Partner(S); return p && st(p) === "wed" ? p : null; };
  const cool = (c, S) => !!(c.m10 && c.m10.cool && c.m10.cool > S.day);

  // ---------------------------------------------------------------- 出来事の主役にできるか（events_m10.js の pick から呼ぶ）
  G.m10P = {
    // 恋の気配が立つ：まだ何もなく、好感度が相性で決まる線を越えた。恋人・連れ合いがいれば、嫉妬の出来事のほうで扱う
    spark: (c, S) => G.m10Can(c) && !st(c) && !cool(c, S) && c.bond >= G.m10SparkAt(c) && !G.m10Partner(S),
    sparked: (c, S) => st(c) === "spark" && !cool(c, S) && !G.m10Partner(S),
    confess: (c, S) => st(c) === "spark" && !cool(c, S) && c.bond >= 74 && !G.m10Partner(S),
    lover: (c) => st(c) === "love" || st(c) === "vow",
    loverOk: (c) => (st(c) === "love" || st(c) === "vow") && !c.m10.miss && c.bond >= 40,
    missed: (c) => PARTNER.includes(st(c)) && !!c.m10.miss,
    propose: (c, S) => st(c) === "love" && !c.m10.miss && c.bond >= 80 && S.day - (c.m10.since ?? S.day) >= 8 && !cool(c, S),
    wed: (c) => st(c) === "wed",
    wedOk: (c) => st(c) === "wed" && c.bond >= 35,
    wedCold: (c) => st(c) === "wed" && c.bond < 35,
    partner: (c) => PARTNER.includes(st(c)),
    // 恋人がいる身に、別の仲間が想いを寄せる
    rival: (c, S) => G.m10Can(c) && !PARTNER.includes(st(c)) && c.bond >= 70,
  };

  // ---------------------------------------------------------------- 文の差し込み（M2 の G.m2Fill を包む）
  const ageYou = (S) => {
    const a = parseInt(S.profile && S.profile.age, 10);
    return M().AGE_YOU[a >= 50 ? "old" : a >= 32 ? "mid" : "young"];
  };
  const m10Fill = (t) => {
    const S = G.S;
    if (typeof t !== "string" || t.indexOf("{") < 0 || !S) return t;
    return t.replace(/\{(sp|spw|nw|yw|town|wedloc|age_you)\}/g, (all, k) => {
      const m = S.m10 || {};
      const p = G.m10Partner(S) || (m.spouse && m.spouse.lost ? { name: m.spouse.name, sex: m.spouse.sex } : null) || [...(m.past || [])].reverse()[0];
      if (k === "sp") return p ? G.m2Short(p) : "あの人";
      if (k === "spw") return p ? G.m10Word(p.sex || G.m10Sex(p)) : "連れ合い";
      if (k === "nw") { const c = G.m2Focus(); return c ? G.m10Word(G.m10Sex(c)) : "連れ合い"; }
      if (k === "yw") return G.m10Word(S.profile && S.profile.sex);
      if (k === "town") return (m.home && m.home.name) || "家のある町";
      if (k === "wedloc") return (m.spouse && m.spouse.loc) || "旅先";
      if (k === "age_you") return G.pick(ageYou(S));
      return all;
    });
  };
  G.m10Fill = m10Fill;
  const fill0 = G.m2Fill;
  G.m2Fill = (t) => m10Fill(fill0(m10Fill(t)));

  // ---------------------------------------------------------------- 間柄が変わる
  const set = (c, s) => { const x = G.m10Of(c); x.st = s; x.since = G.S.day; };
  const pastRec = (c, how, wed) => ({ name: c.name, cls: c.cls, sex: G.m10Sex(c), how, date: G.date(), loc: G.loc().name, wed: !!wed });
  G.m10Do = (kind, c, o) => {
    const S = G.S;
    const m = G.m10State(S);
    if (!c) return;
    const x = G.m10Of(c);
    switch (kind) {
      case "spark": set(c, "spark"); m.counts.spark++; break;
      case "cool": x.cool = S.day + ((o && o.coolDays) || 6); break;
      case "love":
        set(c, "love");
        x.miss = false;
        m.lover = c.id;
        m.counts.love++;
        if (o && o.confess) m.counts.confess++;
        G.chron(`${c.name}と恋仲になる`, "comp");
        G.award("m10_love");
        break;
      case "refuse": x.st = ""; x.cool = S.day + 30; m.counts.refuse++; break;
      case "miss": x.miss = true; x.cool = S.day + 4; m.counts.miss++; break;
      case "mend": x.miss = false; break;
      case "jealous": m.counts.jealous++; break;
      case "part":
        if (!PARTNER.includes(x.st)) break;
        m.past.push(pastRec(c, "part", x.st === "wed"));
        if (x.st === "wed" && m.spouse) { m.spouse.lost = "part"; delete S.flags.m10_sp; }
        x.st = ""; x.ex = true; x.miss = false; x.cool = S.day + 60;
        m.lover = null;
        m.counts.part++;
        G.chron(`${c.name}と別れる`, "comp");
        break;
      case "vow": set(c, "vow"); m.counts.propose++; G.chron(`${c.name}と、一緒になる約束をする`, "comp"); break;
      case "wed": {
        set(c, "wed");
        x.miss = false;
        m.lover = null;
        const how = (o && o.wedHow) || "church";
        m.spouse = { id: c.id, name: c.name, cls: c.cls, sex: G.m10Sex(c), day: S.day, loc: how === "road" ? `${G.loc().name}の近くの道端` : G.loc().name, how };
        m.counts.wed++;
        S.flags.m10_sp = c.name;
        G.chron(how === "road" ? `${c.name}と、旅の空の下で誓いを立てる` : `${c.name}と、${G.loc().name}で結ばれる`, "comp");
        G.award("m10_wed");
        break;
      }
      case "child":
        m.child++;
        m.counts.child++;
        G.chron(m.child > 1 ? "家の戸口の手形が、また一つ増える" : "家に、小さな靴が一足増える", "comp");
        G.award("m10_child");
        break;
      case "forgive": x.miss = false; c.bond = Math.max(c.bond, 45); break;
    }
  };

  // 家に残った連れ合いを失う（家ごと／最後の手紙）
  const loseAtHome = (how) => {
    const S = G.S;
    const m = G.m10State(S);
    const c = m.atHome;
    if (!c) return;
    m.atHome = null;
    m.past.push(pastRec(c, how, true));
    if (m.spouse) m.spouse.lost = how;
    delete S.flags.m10_sp;
    if (how === "ash") { m.counts.widow++; G.chron(`留守のあいだに、${(m.home && m.home.name) || ""}の家と、連れ合いの${c.name}を失う`, "comp"); m.home = null; }
    else { m.counts.leave++; G.chron(`家に残した連れ合いの${c.name}が、家を出ていく`, "comp"); }
  };

  // M2 の別れ（死・裏切り・去る）で、恋人・連れ合いを失ったとき
  const rm0 = G.m2Remove;
  G.m2Remove = (c, how, cause) => {
    const s = st(c);
    const r = rm0(c, how, cause);
    if (r && PARTNER.includes(s)) {
      const S = G.S;
      const m = G.m10State(S);
      const wed = s === "wed";
      m.past.push(pastRec(c, how, wed));
      if (m.lover === c.id) m.lover = null;
      if (wed && m.spouse) { m.spouse.lost = how; delete S.flags.m10_sp; }
      if (how === "death") m.counts.widow++;
      else if (how === "betray") m.counts.betray++;
      else m.counts.leave++;
      const L = M().LOST[how] || M().LOST.leave;
      G.say(G.pick(wed ? L.wed : L.love));
      if (wed) G.chron(how === "death" ? `連れ合いの${c.name}を亡くす` : how === "betray" ? `連れ合いの${c.name}に裏切られる` : `連れ合いの${c.name}が去る`, "comp");
    }
    return r;
  };

  // ---------------------------------------------------------------- 結果の当てはめ
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (!o || !S || S.over) return apply0(o);
    const c = G.m2Focus();
    const wasPartner = PARTNER.includes(st(c));
    if (o.m10 === "ash") loseAtHome("ash");
    else if (o.m10 === "lastletter") loseAtHome("leave");
    else if (o.m10 === "child") G.m10Do("child", G.m10Partner(S) || c || { name: "", m10: {} }, o);
    else if (o.m10 && c && S.companions.includes(c)) G.m10Do(o.m10, c, o);
    apply0(o);
    // 刃を向けてきた恋人・連れ合いを討った
    if (o.m2 === "slain" && c && wasPartner) {
      const m = G.m10State(S);
      const rec = [...m.past].reverse().find((g) => g.name === c.name);
      if (rec) rec.how = "slain";
      if (m.spouse && m.spouse.id === c.id) m.spouse.lost = "slain";
    }
  };

  // ---------------------------------------------------------------- 行動：想いを打ち明ける・求婚する・式を挙げる・家を持つ・家に帰る
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S || S.travel) return groups;
    const m = G.m10State(S);
    // M2 の「仲間」の組に、間柄を添える
    const cg = groups.find((g) => g.title === "仲間");
    if (cg) cg.list.forEach((a) => {
      const c = S.companions.find((x) => "m2talk:" + x.id === a.id);
      const lab = c && G.m10Label(c);
      if (lab) a.sub += "・" + lab;
    });
    const list = [];
    S.companions.forEach((c) => {
      const x = c.m10 || {};
      const n = G.m2Short(c);
      if (x.st === "spark" && c.bond >= 66 && !cool(c, S) && !G.m10Partner(S))
        list.push({ id: "m10tell:" + c.id, label: `${n}に想いを打ち明ける`, sub: `${G.m10Mood(c)}・魅力 ${G.chance("魅力", 0, G.gearBonus("talk"))}%`, kw: ["想い", "打ち明", "告白", "好き", n] });
      if (G.m10P.propose(c, S))
        list.push({ id: "m10ask:" + c.id, label: `${n}に一緒になろうと言う`, sub: `恋仲になって ${S.day - x.since} 日`, kw: ["求婚", "結婚", "一緒に", n] });
    });
    const L = G.loc();
    const sp = G.m10Spouse(S);
    if (L.type === "town" && sp && !m.home)
      list.push({ id: "m10house", label: "この町に家を持つ", sub: `${HOUSE}G・帰る場所ができる`, disabled: S.gold < HOUSE, kw: ["家を", "家", "買"] });
    if (m.home && m.home.loc === S.loc) {
      list.push({ id: "m10home", label: "家に帰る", sub: `一晩・HP/MP 全快${m.atHome ? `・${G.m2Short(m.atHome)}が待っている` : ""}`, kw: ["家に帰", "帰る", "家"] });
      const inParty = S.companions.find((c) => st(c) === "wed");
      if (inParty) list.push({ id: "m10stay:" + inParty.id, label: `家を${G.m2Short(inParty)}に任せる`, sub: "連れ合いは家に残る（旅には出ない）", kw: ["任せ", "残"] });
      if (m.atHome) list.push({ id: "m10bring", label: `${G.m2Short(m.atHome)}を旅に連れ出す`, sub: S.companions.length >= 3 ? "一党がいっぱい" : "連れ合いがまた一党に加わる", disabled: S.companions.length >= 3, kw: ["連れ出", "連れて"] });
    }
    if (list.length) groups.push({ title: "想い", list });
    return groups;
  };
  // 教会で式を挙げる
  const fac0 = G.facActions;
  G.facActions = () => {
    const groups = fac0();
    const S = G.S;
    if (S.fac !== "church") return groups;
    const c = S.companions.find((x) => st(x) === "vow");
    if (!c) return groups;
    const i = groups.findIndex((g) => g.list.some((a) => a.id === "back"));
    groups.splice(i < 0 ? groups.length : i, 0, { title: "誓い", list: [{ id: "m10wed:" + c.id, label: `${G.m2Short(c)}と式を挙げる`, sub: "司祭に頼む", kw: ["式", "結婚", "誓"] }] });
    return groups;
  };
  const find = (id) => (G.S.companions || []).find((c) => c.id === id);
  const startWith = (c, ev) => { G.m2State(); G.S.m2.force = c.id; return G.startEvent(ev); };
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const m = G.m10State(S);
    switch (head) {
      case "m10tell": { const c = find(arg); if (!c) return; G.log("you", `${G.m2Short(c)}に想いを打ち明ける`); G.pass(1); startWith(c, "m10_tell"); return; }
      case "m10ask": { const c = find(arg); if (!c) return; G.log("you", `${G.m2Short(c)}に一緒になろうと言う`); G.pass(1); startWith(c, "m10_ask"); return; }
      case "m10wed": { const c = find(arg); if (!c) return; G.log("you", `${G.m2Short(c)}と式を挙げる`); S.mode = "explore"; S.fac = null; startWith(c, "m10_wedding"); return; }
      case "m10house": {
        if (S.gold < HOUSE) return;
        S.gold -= HOUSE;
        m.home = { loc: S.loc, name: G.loc().name, day: S.day, seen: S.day };
        m.counts.home++;
        G.log("you", "この町に家を持つ");
        G.say(G.pick(M().HOUSE).replace("{town}", G.loc().name));
        G.note(`所持金 -${HOUSE}G。${G.loc().name}に家ができた。`);
        G.chron(`${G.loc().name}に家を持つ`, "comp");
        G.award("m10_home");
        G.pass(1);
        return;
      }
      case "m10home": G.m10GoHome(); return;
      case "m10stay": {
        const c = find(arg);
        if (!c) return;
        S.companions.splice(S.companions.indexOf(c), 1);
        m.atHome = c;
        m.home.seen = S.day;
        G.log("you", `家を${G.m2Short(c)}に任せる`);
        G.say(G.m2Fill(G.pick(M().STAY)).replace(/\{who\}/g, G.m2Short(c)));
        return;
      }
      case "m10bring": {
        const c = m.atHome;
        if (!c || S.companions.length >= 3) return;
        m.atHome = null;
        S.companions.push(c);
        G.log("you", `${G.m2Short(c)}を旅に連れ出す`);
        G.say(G.pick(M().BRING).replace(/\{who\}/g, G.m2Short(c)));
        return;
      }
    }
    return exploreAct0(head, arg, a);
  };
  // 家に帰る：一晩休み、ときどき家の出来事
  G.m10GoHome = () => {
    const S = G.S;
    const m = G.m10State(S);
    if (!m.home) return;
    G.log("you", "家に帰る");
    G.sleep();
    S.hp = S.maxHp; S.mp = S.maxMp; S.clungUsed = false;
    S.conds = S.conds.filter((c) => c !== "毒");
    const away = S.day - (m.home.seen || S.day);
    m.home.seen = S.day;
    const sp = m.atHome || G.m10Spouse(S);
    if (sp) G.m2Bond(sp, Math.min(8, 2 + Math.floor(away / 5)), !!m.atHome);
    m.homeDay = S.day;
    const tags = ["home", sp ? "spouse" : "alone"];
    const pool = D.EVENTS.filter((e) => e.m10home && e.m10home.some((t) => tags.includes(t)) && (!e.cond || e.cond(S)) && !(e.once && S.flags["ev:" + e.id]));
    if (pool.length && G.rand() < 0.75) {
      G.startEvent(G.pick(pool));
      return;
    }
    G.say(sp ? G.pick(M().HOME_PLAIN).replace(/\{who\}/g, G.m2Short(sp)) : G.pick(M().HOME_EMPTY));
    G.note("HP と MP が全快した。");
  };

  // 出来事の絵：恋人・連れ合いの顔（家に残った連れ合いも）。絵の関数が無い所では出さない
  G.m10Who = () => {
    const p = G.m10Partner();
    if (!p || !G.companionWho) return null;
    return Object.assign({}, G.companionWho(p), { name: p.name });
  };
  // 想いを打ち明ける前の、相手の様子（相性で変わる）
  G.m10Mood = (c) => ["目が合うと逸らす", "目が合う", "よく目が合う", "向こうから目を合わせてくる"][G.m10Compat(c) + 1];
  // 仲間の欄に添える間柄
  G.m10Label = (c) => ({ spark: "", love: "恋仲", vow: "約束した仲", wed: "連れ合い" }[st(c)] || "");
  // シートの行（ui.js から呼ぶ）
  G.m10Rows = (S) => {
    const m = S.m10;
    if (!m) return [];
    const rows = [];
    const p = G.m10Partner(S);
    if (p) rows.push([st(p) === "wed" ? "連れ合い" : "恋仲", `${p.name}${m.atHome ? `（${(m.home && m.home.name) || "家"}で待っている）` : ""}`]);
    if (m.home) rows.push(["家", `${m.home.name}${m.child ? `・${M().CHILD_ROW[Math.min(m.child, M().CHILD_ROW.length) - 1]}` : ""}`]);
    const lost = m.past.filter((g) => g.wed);
    if (!p && lost.length) rows.push(["連れ合いだった人", lost.map((g) => g.name).join("、")]);
    return rows;
  };

  // ---------------------------------------------------------------- 手番の終わり：冷めた恋・留守の家
  const end0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && !S.over && S.mode === "explore" && !S.combat && !S.travel) {
      const m = G.m10State(S);
      const due = (c, ev) => startWith(c, ev);
      // 好感度が落ちた恋人は別れ話を、連れ合いは冷えた食卓を持ち出す（M2 の裏切りの線より上で）
      const cold = S.companions.find((c) => (st(c) === "love" || st(c) === "vow") && c.bond < 40 && c.bond > 15 && !cool(c, S));
      const coldW = S.companions.find((c) => st(c) === "wed" && c.bond < 30 && c.bond > 15 && !cool(c, S));
      // 気配・告白・求婚は、ふだんの出来事に混ざるほか、条件がそろった手番の終わりにも、ときどき向こうから来る
      const ripe = (k) => S.companions.find((c) => G.m10P[k](c, S));
      const prop = ripe("propose"), conf = ripe("confess"), spark = ripe("spark");
      if (cold) due(cold, "m10_part");
      else if (coldW) due(coldW, "m10_cold");
      else if (prop && G.rand() < 0.08) due(prop, "m10_propose");
      else if (conf && G.rand() < 0.08) due(conf, "m10_confess");
      else if (spark && G.rand() < 0.06) due(spark, "m10_spark");
      else if (m.atHome && m.home) {
        // 留守が長いと、家から手紙が来る。ごくまれに、家ごと失う（理不尽な世界）
        const away = S.day - (m.home.seen || S.day);
        if (!m.homeDay) m.homeDay = S.day;
        if (S.day > m.homeDay) {
          const n = Math.min(10, S.day - m.homeDay);
          m.homeDay = S.day;
          if (away > 25 && G.rand() < 0.004 * n) G.startEvent("m10_home_ash");
          else if (away > 60 && G.rand() < 0.02 * n) G.startEvent("m10_last_letter");
          else if (away > 12 && G.rand() < 0.03 * n) G.startEvent("m10_letter");
        }
      }
    }
    return end0();
  };

  // ---------------------------------------------------------------- 物語の終わり（M6）：連れ合いの段落を入れる
  if (G.m6Compose) {
    const compose0 = G.m6Compose;
    G.m6Compose = (S) => {
      const r = compose0(S);
      if (!r || !S || !S.m10) return r;
      try {
        const P = G.m10StoryParas(S, r);
        // 段落の数は M6 の決まり（4〜8、すぐ死んだ人生は 5 まで）に収める。あふれるときは、最期の前の段落に書き足す
        const cap = (S.day || 99) <= 10 ? 5 : 8;
        if (P.life && r.life.length < cap) r.life.splice(Math.max(1, r.life.length - 1), 0, P.life);
        else if (P.life) r.life[Math.max(1, r.life.length - 2)] += P.life;
        if (P.after && r.after) r.after.splice(Math.max(1, r.after.length - 2), 0, P.after); // 最期の段落の前に
      } catch (e) { /* 物語は連れ合いの段落なしでも出る */ }
      return r;
    };
  }
  // 物語の段落を表から組み立てる。名前は語り手の目線（「{name}」は主人公）
  G.m10StoryParas = (S, r) => {
    const T = M().STORY;
    const m = S.m10;
    const name = (S.profile && S.profile.name) || S.name || "その人";
    const p = (S.companions || []).find((c) => PARTNER.includes(st(c))) || m.atHome;
    const short = (n) => G.m2Short({ name: n });
    const sp = m.spouse;
    let key = "", who = "", place = "";
    if (sp && !sp.lost && p) { key = "wed"; who = short(sp.name); place = sp.loc; }
    else if (sp && sp.lost) { key = { death: "widow", ash: "widow", betray: "betrayed", slain: "slain", part: "parted_wed", leave: "left_wed" }[sp.lost] || "left_wed"; who = short(sp.name); place = sp.loc; }
    else if (p) { key = "love"; who = G.m2Short(p); }
    else {
      const last = [...m.past].reverse()[0];
      if (!last) return {};
      key = { death: "love_dead", slain: "slain", betray: "love_betrayed" }[last.how] || "love_parted";
      who = short(last.name);
    }
    const fill = (t) => t.replace(/\{name\}/g, name).replace(/\{sp\}/g, who).replace(/\{wedloc\}/g, place || "どこか").replace(/\{town\}/g, (m.home && m.home.name) || "どこかの町");
    let life = fill(G.pick(T[key]));
    if (m.child && (key === "wed" || key === "widow")) life += fill(G.pick(T.child));
    let after = "";
    if (r && r.after && S.over === "end") after = fill(G.pick(key === "wed" ? T.after_wed : m.child ? T.after_child : T.after_alone));
    return { life, after };
  };

  // 物語を終えるとき、連れ合いがいれば節目の一文に名前を入れる（ending_m6.js の line の {comp} は好感度の高い仲間なので）
  const finish0 = G.finishRun;
  G.finishRun = () => {
    const S = G.S;
    if (S && S.m10) {
      const p = G.m10Spouse(S);
      if (p) S.flags.m10_sp = p.name; else delete S.flags.m10_sp;
    }
    return finish0();
  };
})(globalThis.G = globalThis.G || {});
