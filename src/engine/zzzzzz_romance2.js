// 一人ひとりの恋の筋（R2）：恋の相手（docs/romance.md の romance: true の人）それぞれに、段を踏んで進む恋の続き物を足す。DOM には触らない。
// 気になる → 意識する → 二人きりの約束 → すれ違い・試練 → 告白 → 恋仲 → 求婚 → 結婚 → 暮らし → この先（10 段）。段は「話す」の話題として出る。
// 各段で返し方を選ぶ。選び方で、深まる（段が進む）・保留になる（hold：日をおいて同じ段がまた出る）・こじれる（sour：段は進むが、仲直りの話題を
// 済ませるまで次の段が出ない）。好感度は返しの aff で動く。
// 難しい道（エルフ・獣人・魔物の子分）は、段の好感度の線が高く（hard.add）、告白・求婚などの段に重い条件（hard.need）がある。条件は噂と会話で察せる。
// 18 歳未満の主人公には恋の筋を出さず、信頼の筋（trust の 3 段。兄姉・師のような情）を出す。18 歳未満・子どもの姿の相手には筋が無い（zzz_love_age.js）。
// 恋仲の相手と別の仲間の掛け合い（からかう・心配する・張り合う）は、K7 の型の掛け合いに足す（D.R2_PARTS）。手書きの掛け合いは id を bt_r2_ で始める。
// 結婚のあとは、暮らし・この先（冒険を続けるか、剣を置くか）・人生の物語（M6）の一行。
// zzzzz_talk.js（G.tk）・zzzzzz_banter2.js・m10_love.js・zzzz_romance.js は書き換えず、包む。名前の頭の zzzzzz_r は、zzzzzz_banter2.js より後に読ませるため。
//
// データ：D.R2.ARCS[人の id]（src/data/romance_<id>.js）。書き方は docs/romance.md の「恋の筋（R2）」。
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.r2State が埋める）
//   S.r2 = { p: { 人の id: { st 済んだ段（0〜10）, day 最後に段が進んだ日, sour こじれ（0 なら無し）, cool この日までは次が出ない, tr 信頼の筋の段, tday,
//            fut この先（"road" 旅を続ける / "retire" 剣を置く）, jeal { 相手の id: 日 }, holds, sours } } }
//   恋仲・約束・連れ合いになっている古いセーブは、告白の段（5）まで済んだことにする。
// 乱数は会話と同じ G.tk.roll だけ（G.rand の並びを変えない）。レーン C
(function (G) {
  const D = G.data;
  const TK = G.tk;
  if (!TK || !TK.topic || !TK.can) return;
  const R2 = () => (D.R2 && D.R2.ARCS) || {};
  const PARTNER = ["love", "vow", "wed"];
  const COLD_AT = -20;
  const lines = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const comps = (S) => (S && S.companions) || [];
  const cOf = (id, S) => comps(S || G.S).find((c) => c.c2 === id) || null;
  const short = (c) => (G.m2Short ? G.m2Short(c) : (c && c.name) || "");
  const st10 = (c) => (G.m10St ? G.m10St(c) : (c && c.m10 && c.m10.st) || "");
  const pickL = (list, salt) => list[Math.floor(TK.roll(salt) * list.length) % list.length];

  // ---------------------------------------------------------------- 段の名と、出る条件（好感度は F3 の −100〜+100）
  G.R2 = {
    NAMES: ["", "気になる", "意識する", "二人きりの約束", "すれ違い", "告白", "恋仲", "求婚", "結婚", "暮らし", "この先"],
    // min 好感度・m10 恋の間柄の条件・days 前の段から空ける日数（7 は恋仲になってからの日数）
    GATE: [null, { min: 15 }, { min: 25 }, { min: 35 }, { min: 42 }, { min: 50, m10: "free" }, { min: 50, m10: "partner" },
      { min: 62, m10: "love", days: 5 }, { min: 30, m10: "wed" }, { min: 30, m10: "wed", days: 4 }, { min: 30, m10: "wed", days: 6 }],
    GAP: 1, // 段と段のあいだに空ける日数（同じ日に二段は進まない）
    SOUR_DAYS: 5, // こじれたあと、仲直りの話題が出るまでの日数
    TRUST: [null, { min: 15 }, { min: 35 }, { min: 55 }], // 信頼の筋（18 歳未満の主人公）
    BOOST: 0.45, // 恋の掛け合い（手書き bt_r2_・型）が出せるとき、それを先に選ぶ割合
  };
  const N_STEPS = 10;

  // ---------------------------------------------------------------- 状態
  G.r2State = (S) => {
    S = S || G.S;
    if (!S.r2 || typeof S.r2 !== "object") S.r2 = {};
    S.r2.p = S.r2.p || {};
    return S.r2;
  };
  G.r2Of = (id, S) => {
    const m = G.r2State(S);
    if (!m.p[id]) m.p[id] = { st: 0, day: -99, sour: 0, cool: 0, tr: 0, tday: -99, fut: "", jeal: {}, holds: 0, sours: 0 };
    const p = m.p[id];
    p.jeal = p.jeal || {};
    return p;
  };
  G.r2Has = (c) => !!(c && c.c2 && R2()[c.c2]);
  G.r2St = (id, S) => { S = S || G.S; const p = S && S.r2 && S.r2.p && S.r2.p[id]; return (p && p.st) || 0; };
  G.r2Name = (n) => G.R2.NAMES[n] || "";
  const heard = (S) => G.tkState(S).heard;
  // 段を戻す（その先の話題を、もう一度聞けるようにする）
  const rewind = (id, p, to, S) => {
    p.st = to;
    const h = heard(S);
    for (let n = to + 1; n <= N_STEPS; n++) delete h[`r2_${id}_${n}`];
  };
  // 恋の間柄（M10）と、筋の段を合わせる（古いセーブ・M10 の出来事で先に恋仲になったとき・別れたとき）
  G.r2Sync = (c, S) => {
    S = S || G.S;
    if (!G.r2Has(c) || !S) return null;
    const id = c.c2;
    const p = G.r2Of(id, S);
    const s = st10(c);
    const floor = s === "love" ? 5 : s === "vow" || s === "wed" ? 7 : 0;
    if (p.st < floor) { p.st = floor; p.sour = 0; p.day = Math.min(p.day, S.day - G.R2.GAP); }
    if (!PARTNER.includes(s) && p.st >= 5) { rewind(id, p, 4, S); p.sour = 1; p.cool = S.day + 10; }
    return p;
  };

  // ---------------------------------------------------------------- 主人公（性別・種族・年齢で文が変わる）
  G.r2Hero = (S) => {
    S = S || G.S;
    const pr = (S && S.profile) || {};
    const r = G.r1Of ? G.r1Of(S) : { race: "human", beast: "" };
    const age = parseInt(pr.age, 10) || 25;
    return { sex: pr.sex === "女" ? "女" : "男", race: r.race, beast: r.beast, age, band: age < 25 ? "young" : age < 45 ? "mid" : "old", name: pr.name || "あなた" };
  };
  // 文の中の {hs:男の文|女の文}・{hr:elf=…|beast=…|*=…}・{ha:young=…|mid=…|old=…}（どれも * が既定）
  G.r2Vary = (s, h) => {
    if (typeof s !== "string" || s.indexOf("{h") < 0) return s;
    return s.replace(/\{(hs|hr|ha):((?:[^{}]|\{[a-z0-9_]+\})*)\}/g, (all, k, body) => {
      const parts = body.split("|");
      if (k === "hs") return h.sex === "女" ? (parts[1] !== undefined ? parts[1] : parts[0]) : parts[0];
      const want = k === "hr" ? h.race : h.band;
      const kv = parts.map((x) => { const i = x.indexOf("="); return i < 0 ? ["*", x] : [x.slice(0, i), x.slice(i + 1)]; });
      const hit = kv.find(([a]) => a === want) || kv.find(([a]) => a === "*");
      return hit ? hit[1] : "";
    });
  };
  const resolve = (v, h, S, c) => {
    if (typeof v === "function") v = v(h, S, c);
    if (Array.isArray(v)) return v.map((x) => resolve(x, h, S, c));
    return G.r2Vary(v, h);
  };

  // ---------------------------------------------------------------- 話題を組み立てる（id：r2_<人>_<段>・r2_<人>_mend・r2_<人>_jeal・r2_<人>_t<段>）
  const rivalOf = (id, S) => {
    // 一党にいて、筋が三段目まで進んでいる別の恋の相手。いなければ、恋仲になっている別の仲間
    const cs = comps(S).filter((x) => x.c2 && x.c2 !== id && R2()[x.c2]);
    return cs.find((x) => PARTNER.includes(st10(x))) || cs.find((x) => G.r2St(x.c2, S) >= 3) || null;
  };
  const build = (id, key) => {
    const A = R2()[id];
    if (!A) return null;
    let src = null, meta = null, kind = "love";
    if (/^\d+$/.test(key)) { const n = Number(key); src = (A.steps || [])[n - 1]; meta = { who: id, type: "step", n }; }
    else if (key === "mend") { src = A.mend; meta = { who: id, type: "mend" }; }
    else if (key === "jeal") { src = A.jeal; meta = { who: id, type: "jeal" }; }
    else if (/^t\d$/.test(key)) { const n = Number(key.slice(1)); src = (A.trust || [])[n - 1]; meta = { who: id, type: "trust", n }; kind = "bond"; }
    if (!src) return null;
    const S = G.S;
    const c = cOf(id, S);
    const h = G.r2Hero(S);
    const add = (A.hard && A.hard.add) || 0;
    const gate = meta.type === "step" ? G.R2.GATE[meta.n] : meta.type === "trust" ? G.R2.TRUST[meta.n] : { min: 30 };
    const tp = {
      who: id, id: `r2_${id}_${key}`, kind, love: kind === "love", r2: meta,
      min: (src.min !== undefined ? src.min : gate ? gate.min : 20) + (kind === "love" ? add : 0),
      title: resolve(src.title, h, S, c), text: resolve(src.text, h, S, c), mood: src.mood,
      replies: (src.replies || []).map((r) => Object.assign({}, r, { label: resolve(r.label, h, S, c), text: resolve(r.text, h, S, c) })),
    };
    if (meta.type === "mend") tp.again = true;
    if (meta.type === "jeal" && S) { const rv = rivalOf(id, S); if (rv) tp.mate = rv.c2; }
    return tp;
  };
  G.r2Topic = (tid) => {
    const m = /^r2_([a-z0-9]+)_(\d+|mend|jeal|t\d)$/.exec(String(tid));
    return m ? build(m[1], m[2]) : null;
  };
  const topic0 = TK.topic;
  TK.topic = (id) => (typeof id === "string" && id.startsWith("r2_") ? G.r2Topic(id) : topic0(id));

  // ---------------------------------------------------------------- 段が出るか
  const heroMinor = (S) => !!(G.loveHeroMinor && G.loveHeroMinor(S));
  G.r2Gate = (tp, c, S) => {
    S = S || G.S;
    const meta = tp && tp.r2;
    if (!meta || !c || c.c2 !== meta.who) return false;
    const A = R2()[meta.who];
    const p = G.r2Sync(c, S);
    if (!A || !p) return false;
    if (S.day < (p.cool || 0)) return false;
    if (meta.type === "trust") return heroMinor(S) && p.tr === meta.n - 1 && S.day - (p.tday ?? -99) >= G.R2.GAP;
    if (meta.type === "mend") return p.sour > 0;
    if (meta.type === "jeal") return p.st >= 3 && !p.sour && !!tp.mate && !p.jeal[tp.mate];
    // 段
    const n = meta.n;
    if (p.sour || p.st !== n - 1 || S.day - (p.day ?? -99) < G.R2.GAP) return false;
    const g = G.R2.GATE[n] || {};
    const s = st10(c);
    const x = c.m10 || {};
    if (g.m10 === "free") { const pt = G.m10Partner && G.m10Partner(S); if ((pt && pt !== c) || (x.cool && x.cool > S.day)) return false; }
    if (g.m10 === "partner" && !PARTNER.includes(s)) return false;
    if (g.m10 === "love" && (s !== "love" || x.miss || S.day - (x.since ?? S.day) < (g.days || 0))) return false;
    if (g.m10 === "wed" && s !== "wed") return false;
    if (g.days && g.m10 !== "love" && S.day - (p.day ?? -99) < g.days) return false;
    const need = A.hard && A.hard.need && A.hard.need[n];
    if (need && !need.test(S, c)) return false;
    return true;
  };
  const can0 = TK.can;
  TK.can = (tp, c, S, opt) => {
    if (!can0(tp, c, S, opt)) return false;
    return tp && tp.r2 ? G.r2Gate(tp, c, S || G.S) : true;
  };
  // その人の、今出せる筋の話題（段・仲直り・やきもち・信頼）
  G.r2Topics = (c, S, opt) => {
    S = S || G.S;
    if (!G.r2Has(c) || !S) return [];
    const id = c.c2;
    const p = G.r2Sync(c, S);
    const keys = [];
    if (p.sour) keys.push("mend");
    else if (p.st < N_STEPS) keys.push(String(p.st + 1));
    keys.push("jeal");
    if (p.tr < 3) keys.push("t" + (p.tr + 1));
    return keys.map((k) => build(id, k)).filter((tp) => tp && TK.can(tp, c, S, opt));
  };
  const topics0 = G.tkTopics;
  G.tkTopics = (c, S, opt) => topics0(c, S, opt).concat(G.r2Topics(c, S, opt));
  // 話題の一覧には、筋の話題を必ず一つ入れる（好感度が冷えているときは入れない）
  const pick0 = TK.pickMenu;
  TK.pickMenu = (c, S) => {
    const out = pick0(c, S);
    S = S || G.S;
    if (!G.r2Has(c) || TK.aff(c) <= COLD_AT) return out;
    const arc = G.r2Topics(c, S);
    if (!arc.length || out.some((t) => t.r2)) return out;
    out.unshift(arc[0]);
    return out.slice(0, 5);
  };

  // ---------------------------------------------------------------- 返したあと（段を進める・こじれる・恋の間柄を動かす）
  // 返しに書ける鍵：hold 日数（段を進めず、日をおいてまた出す）・sour true（こじれる）・sourDays・m10 "love" / "vow"（告白・求婚）・
  //   fut "road" / "retire"（この先）・mend true（仲直りの話題で、仲直りになる返し）・rel 数（やきもちの話題で、相手との間柄の動き）・
  //   rivalSour true（やきもちの話題で、相手の筋がこじれる）・aff2（相手の好感度。今の仕組みのまま）
  const say = (t) => G.note && G.note(t);
  G.r2After = (tp, r, c, S) => {
    const meta = tp.r2;
    const id = meta.who;
    const A = R2()[id] || {};
    const p = G.r2Of(id, S);
    const n10 = short(c);
    if (meta.type === "trust") { p.tr = meta.n; p.tday = S.day; if (meta.n === 3) say(`${n10}との信頼が、深まった。`); return; }
    if (meta.type === "mend") {
      if (r.mend) { p.sour = 0; p.day = S.day; say(`${n10}との仲が、元に戻った。`); }
      else { p.sour++; p.cool = S.day + (r.sourDays || 4); say(`${n10}との仲は、まだこじれたままだ。`); }
      return;
    }
    if (meta.type === "jeal") {
      if (tp.mate) {
        p.jeal[tp.mate] = S.day;
        if (r.rel && TK.relAdd) TK.relAdd(id, tp.mate, r.rel, S);
        if (r.rivalSour) { const q = G.r2Of(tp.mate, S); if (q.st >= 1 && q.st < 5) { q.sour = (q.sour || 0) + 1; q.sours++; q.cool = S.day + G.R2.SOUR_DAYS; } }
      }
      return;
    }
    const n = meta.n;
    if (r.hold) { p.cool = S.day + r.hold; p.holds++; delete heard(S)[tp.id]; say(`${n10}とのことは、少し先送りになった。`); return; }
    // 告白と求婚：恋の間柄が動かなければ、先送り
    if (r.m10 === "love" && !PARTNER.includes(st10(c)) && G.m10Do) {
      const pt = G.m10Partner && G.m10Partner(S);
      if (!pt || pt === c) G.m10Do("love", c, { confess: true });
    }
    if (r.m10 === "vow" && st10(c) === "love" && G.m10Do) G.m10Do("vow", c);
    if ((n === 5 && !PARTNER.includes(st10(c))) || (n === 7 && !["vow", "wed"].includes(st10(c)))) {
      p.cool = S.day + (r.hold || 6); p.holds++; delete heard(S)[tp.id];
      say(`${n10}とのことは、少し先送りになった。`);
      return;
    }
    p.st = n;
    p.day = S.day;
    if (r.fut) p.fut = r.fut;
    if (r.sour) {
      p.sour = 1; p.sours++; p.cool = S.day + (r.sourDays || G.R2.SOUR_DAYS);
      say(`${n10}との間が、こじれた。（${G.r2Name(n)}）`);
    } else say(`${n10}との恋の段：${G.r2Name(n)}`);
    if (n === N_STEPS && G.award) G.award("r2_full");
    if (n === 8 && A.chron && G.chron) G.chron(String(A.chron).replace(/\{who\}/g, c.name), "comp");
  };
  const reply0 = TK.reply;
  TK.reply = (i) => {
    const S = G.S;
    const k = S && S.tk && S.tk.cur;
    const tp = k && k.topic ? TK.topic(k.topic) : null;
    const c = k ? comps(S).find((x) => x.id === k.cid) : null;
    const r = tp && tp.r2 ? (tp.replies || [])[i] || {} : null;
    const out = reply0(i);
    if (tp && tp.r2 && c && !S.over) G.r2After(tp, r, c, S);
    return out;
  };

  // ---------------------------------------------------------------- M10 の告白・求婚は、筋の段に合わせる（筋のある人だけ）
  // 想いを打ち明ける・向こうから打ち明けられるのは「すれ違い」（4）のあと。求婚は「恋仲」（6）のあと。
  const MP = G.m10P;
  if (MP) {
    const confess0 = MP.confess, propose0 = MP.propose;
    MP.confess = (c, S) => confess0(c, S) && (!G.r2Has(c) || G.r2St(c.c2, S) >= 4);
    MP.propose = (c, S) => propose0(c, S) && (!G.r2Has(c) || G.r2St(c.c2, S) >= 6);
  }
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S || S.travel) return groups;
    let g = groups.find((x) => x.title === "想い");
    if (g) {
      g.list = g.list.filter((a) => {
        const m = /^(m10tell|m10ask):(.+)$/.exec(a.id);
        if (!m) return true;
        const c = S.companions.find((x) => x.id === m[2]);
        return !G.r2Has(c) || G.r2St(c.c2, S) >= (m[1] === "m10tell" ? 4 : 6);
      });
      if (!g.list.length) { groups.splice(groups.indexOf(g), 1); g = null; }
    }
    // この先で「剣を置く」と決めた連れ合いがいれば、その人と暮らすために冒険を終えられる
    const sp = G.m10Spouse && G.m10Spouse(S);
    if (sp && G.r2Has(sp) && G.r2Of(sp.c2, S).fut === "retire" && G.r2St(sp.c2, S) >= N_STEPS) {
      if (!g) { g = { title: "想い", list: [] }; groups.push(g); }
      g.list.push({ id: "r2retire:" + sp.id, label: `${short(sp)}と暮らすため、剣を置く`, sub: "冒険を終える（物語の終わり）", kw: ["引退", "剣を置", "暮らす"] });
    }
    return groups;
  };
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head === "r2retire") {
      const S = G.S;
      const c = S.companions.find((x) => x.id === arg);
      if (!c) return;
      const A = R2()[c.c2] || {};
      G.log("you", `${short(c)}と暮らすため、剣を置く`);
      const t = lines(resolve(A.retireSay, G.r2Hero(S), S, c));
      if (t.length) G.say(TK.fill(pickL(t, "r2retire")));
      G.chron(`${c.name}と暮らすため、剣を置く`, "comp");
      G.retire();
      return;
    }
    return exploreAct0(head, arg, a);
  };

  // ---------------------------------------------------------------- 恋仲の相手と、ほかの仲間の掛け合い（K7 の型に足す）
  // D.R2_PARTS[id]：ltease 恋仲の相手をからかう・lworry 心配する（48 人全員）／lteased からかわれて返す・lworried 心配されて返す・
  //   jeal 張り合う・jealR 張り合われて返す（恋の相手の 20 人）。{o} は相手の呼び名、{you} は主人公の名前
  const RP = (id) => (D.R2_PARTS || {})[id] || null;
  const isPartner = (id, S) => { const c = cOf(id, S); return !!c && PARTNER.includes(st10(c)); };
  G.R2.TYPES = [
    { k: "r2tease", title: "冷やかし", d: 2, ok: (a, b, S) => isPartner(b, S) && G.r2St(b, S) >= 6 && !isPartner(a, S) && TK.rel(a, b, S) >= -10, ln: [["a", "ltease"], ["b", "lteased"]] },
    { k: "r2worry", title: "心配", d: 2, ok: (a, b, S) => isPartner(b, S) && G.r2St(b, S) >= 5 && !isPartner(a, S) && TK.rel(a, b, S) >= 20, ln: [["a", "lworry"], ["b", "lworried"]] },
    { k: "r2rival", title: "張り合い", d: -3, ok: (a, b, S) => !!R2()[a] && !!R2()[b] && G.r2St(a, S) >= 3 && !isPartner(a, S) && (isPartner(b, S) || G.r2St(b, S) >= 3), ln: [["a", "jeal"], ["b", "jealR"]] },
  ];
  const partLine = (who, key, a, b, salt) => {
    const list = lines((RP(who === "a" ? a : b) || {})[key]);
    if (!list.length) return null;
    return String(pickL(list, salt + key)).replace(/\{o\}/g, who === "a" ? "{b}" : "{a}");
  };
  G.r2Build = (tp, a, b, id) => {
    const out = [];
    for (const [who, key] of tp.ln) { const s = partLine(who, key, a, b, id); if (!s) return null; out.push([who, s]); }
    return out;
  };
  G.r2Typed = (a, b, S) => {
    S = S || G.S;
    if (heroMinor(S) || !RP(a) || !RP(b)) return [];
    const st = G.tkState(S);
    const out = [];
    for (const tp of G.R2.TYPES) {
      const id = `ty:${tp.k}:${a}|${b}`;
      if (st.bant[id] || !tp.ok(a, b, S)) continue;
      const ln = G.r2Build(tp, a, b, id);
      if (ln) out.push({ id, a, b, title: tp.title, lines: ln, typed: tp.k, relAdd: tp.d });
    }
    return out;
  };
  if (TK.typed) {
    const typed0 = TK.typed;
    TK.typed = (a, b, S, where) => typed0(a, b, S, where).concat(G.r2Typed(a, b, S));
  }
  // 恋の掛け合いが出せるときは、先にそれを（手書きの bt_r2_ が先）
  if (TK.pick) {
    const pickB0 = TK.pick;
    TK.pick = (S, where) => {
      S = S || G.S;
      const ids = comps(S).map((c) => c.c2).filter((x) => x && (D.C2_PEOPLE || {})[x]);
      const hw = TK.banters(S, where).filter((b) => /^bt_r2_/.test(b.id));
      let ty = [];
      if (!hw.length) for (const a of ids) for (const b of ids) if (a !== b) ty = ty.concat(G.r2Typed(a, b, S));
      if ((hw.length || ty.length) && TK.roll("r2pick") < G.R2.BOOST) return hw.length ? pickL(hw, "r2hw") : pickL(ty, "r2ty");
      return pickB0(S, where);
    };
  }

  // ---------------------------------------------------------------- 人生の物語（M6）：恋仲・連れ合いが筋のある人なら、その人ならではの一行
  if (G.m6Compose) {
    const compose0 = G.m6Compose;
    G.m6Compose = (S) => {
      const r = compose0(S);
      if (!r || !r.life || !r.life.length || !S || !S.r2) return r;
      try {
        const p = G.m10Partner && G.m10Partner(S);
        if (!p || !G.r2Has(p)) return r;
        const A = R2()[p.c2];
        const q = G.r2Of(p.c2, S);
        if (q.st < 6 || !A.story) return r;
        const key = st10(p) === "wed" ? (q.fut === "retire" && A.story.retire ? "retire" : "wed") : "love";
        const L = lines(resolve(A.story[key] || A.story.love, G.r2Hero(S), S, p));
        if (!L.length) return r;
        const name = (S.profile && S.profile.name) || S.name || "その人";
        const t = String(L[Math.floor(TK.roll("r2story") * L.length) % L.length]).replace(/\{name\}/g, name).replace(/\{sp\}/g, short(p));
        r.life[Math.max(0, r.life.length - 2)] += t;
      } catch (e) { /* 一行なしでも物語は出る */ }
      return r;
    };
  }
})(globalThis.G = globalThis.G || {});
