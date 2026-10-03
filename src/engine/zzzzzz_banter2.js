// 仲間どうしの会話の二回目（K7）：連れている顔ぶれで起きる掛け合い・三人の場面・仲間どうしの間柄・書いていない組の「型の掛け合い」・
// 戦い・出来事・場所への仲間どうしの反応。DOM には触らない。書き方は docs/talk.md の「仲間どうし（K7）」。
// zzzzz_talk.js（G.tk）を書き換えず、包む。名前の頭の zzzzzz は、それより後に読ませるため。
//
// データ
//   D.TALK_BANTER（今まで通り）に足せる鍵：c 三人目・rel 二人（a と b）の間柄の条件・relAdd 起きたときの間柄の動き・on 反応（win・boss・near・death・arrive）・
//     after "id#a"（その掛け合いで a の肩を持ったときだけ）・side の aff の三つ目（c の増減）と rel（その選択での間柄の動き）
//   D.TALK_PARTS[id]：型の掛け合いの部品（人ごと。口調を守る）。src/data/talk_parts_*.js
//   D.TALK_REL0["a|b"]：間柄の始まりの値（id を名前順に並べて | でつなぐ）。src/data/talk_rel_*.js
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.tkState が埋める）
//   S.tk.rel { "a|b": −100〜+100 } 仲間どうしの間柄（書いてなければ D.TALK_REL0 か 0）
//   S.tk.k7 = { day 数えている日, n その日の掛け合いの数, turn 最後の掛け合いの手番, rd { "a|b": 一緒に戦って間柄が動いた日 }, pn { "a|b": その組の掛け合いの数 }, pend [この手番の出来事] }
// 乱数は G.tk.roll だけ（G.rand の並びを変えない）。
// レーン C（会話の仕組み）
(function (G) {
  const D = G.data;
  const TK = G.tk;
  if (!TK || !TK.banter) return;
  const lines = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const comps = (S) => (S && S.companions) || [];
  const named = (S) => comps(S).filter((c) => c.c2 && (D.C2_PEOPLE || {})[c.c2]);
  const cOf = (id, S) => comps(S || G.S).find((c) => c.c2 === id) || null;
  const short = (c) => (G.m2Short ? G.m2Short(c) : (c && c.name) || "");
  const person = (id) => (D.C2_PEOPLE || {})[id] || {};
  const nameOf = (id, S) => { const c = cOf(id, S); return c ? short(c) : person(id).short || person(id).name || id; };
  const pickL = (list, salt) => list[Math.floor(TK.roll(salt) * list.length) % list.length];

  // ---------------------------------------------------------------- 起きやすさ（遊んで決めた数。うるさくなりすぎないように）
  TK.K7 = {
    road: 0.45, // 旅で場所を移った手番
    night: 0.5, // 野営・宿の夜（夜の会話が無かった夜）
    town: 0.08, // 町のふだんの手番
    here: 0.04, // それ以外のふだんの手番
    rx: { apostle: 0.8, boss: 0.7, death: 0.8, near: 0.5, arrive: 0.35, win: 0.15 }, // 反応（この手番に起きた出来事）
    cap: 2, cap3: 3, // 一日の上限（仲間が三人いれば 3）
    gap: 2, // 掛け合いのあと、次まで空ける手番
    hand: 0.7, // 手書きの掛け合いが残っている組があれば、そちらを選ぶ割合（残りは書いていない組の型の掛け合い）
    trio: 0.4, // 三人の場面が出せるとき、それを選ぶ割合
  };

  // ---------------------------------------------------------------- 状態
  const state0 = G.tkState;
  G.tkState = (S) => {
    const t = state0(S);
    if (!t.rel || typeof t.rel !== "object") t.rel = {};
    if (!t.k7 || typeof t.k7 !== "object") t.k7 = {};
    const k = t.k7;
    if (k.day === undefined) k.day = -1;
    k.n = k.n || 0;
    if (k.turn === undefined) k.turn = -99;
    k.rd = k.rd || {};
    k.pn = k.pn || {};
    k.pend = k.pend || [];
    return t;
  };

  // ---------------------------------------------------------------- 間柄
  TK.relKey = (a, b) => [a, b].sort().join("|");
  TK.REL_TIERS = [["険悪", -100], ["ぎこちない", -39], ["ふつう", -10], ["気安い", 20], ["相棒", 50]]; // 段の名と、その段の下の端
  TK.relTier = (v) => { let n = TK.REL_TIERS[0][0]; for (const [name, lo] of TK.REL_TIERS) if (v >= lo) n = name; return n; };
  TK.rel = (a, b, S) => {
    S = S || G.S;
    const k = TK.relKey(a, b);
    const v = S && S.tk && S.tk.rel ? S.tk.rel[k] : undefined;
    if (typeof v === "number") return v;
    const z = (D.TALK_REL0 || {})[k];
    return typeof z === "number" ? z : 0;
  };
  TK.relAdd = (a, b, n, S) => {
    S = S || G.S;
    if (!S || !a || !b || a === b || !n) return;
    const t = G.tkState(S);
    t.rel[TK.relKey(a, b)] = Math.max(-100, Math.min(100, TK.rel(a, b, S) + n));
  };
  // 条件：数なら「これ以上」、[下, 上] なら範囲、段の名か、その配列
  TK.relOk = (cond, v) => {
    if (cond === undefined || cond === null) return true;
    if (typeof cond === "number") return v >= cond;
    if (typeof cond === "string") return TK.relTier(v) === cond;
    if (Array.isArray(cond) && typeof cond[0] === "number") return v >= cond[0] && v <= (cond[1] === undefined ? 100 : cond[1]);
    if (Array.isArray(cond)) return cond.includes(TK.relTier(v));
    return true;
  };
  // その人と、ほかの仲間との間柄（今の一党の名のある仲間。シートの札に出す）
  G.tkRelOf = (id, S) => {
    S = S || G.S;
    if (!S) return [];
    return named(S).filter((c) => c.c2 !== id).map((c) => {
      const v = TK.rel(id, c.c2, S);
      return { id: c.c2, name: short(c), v, tier: TK.relTier(v) };
    }).sort((x, y) => y.v - x.v);
  };
  G.tkRelLabel = (c, S) => {
    if (!c || !c.c2) return "";
    const list = G.tkRelOf(c.c2, S).filter((x) => x.tier !== "ふつう");
    return list.length ? "間柄：" + list.map((x) => `${x.name}と${x.tier}`).join("・") : "";
  };

  // ---------------------------------------------------------------- 一緒に戦う・死線をくぐる・仲間を亡くす（間柄が動く。反応の種にもなる）
  const FIGHT = { win: 1, boss: 3, apostle: 3, near: 2 };
  const record0 = TK.record;
  TK.record = (k, name, S) => {
    const r = record0(k, name, S);
    S = S || G.S;
    if (!r || !S) return r;
    const t = G.tkState(S);
    const ids = r.with.map((id) => (comps(S).find((c) => c.id === id) || {}).c2).filter((x) => x && (D.C2_PEOPLE || {})[x]);
    const each = (f) => { for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) f(ids[i], ids[j]); };
    if (FIGHT[k]) each((a, b) => {
      const key = TK.relKey(a, b);
      if (k === "win") { if (t.k7.rd[key] === S.day) return; t.k7.rd[key] = S.day; } // 一緒に戦った日は、一日に一度だけ数える
      TK.relAdd(a, b, FIGHT[k], S);
    });
    if (k === "death") each((a, b) => TK.relAdd(a, b, 3, S));
    if (TK.K7.rx[k] && ids.length >= 2) t.k7.pend.push({ k, name: r.name || "", with: ids });
    return r;
  };

  // ---------------------------------------------------------------- 掛け合いを選べるか（今までの形も、そのまま通る）
  const afterOk = (st, after) => {
    const [id, s] = String(after).split("#");
    if (!st.bant[id]) return false;
    return !s || st.bant[id + "#"] === s;
  };
  const list = (S, where, opt) => {
    S = S || G.S;
    opt = opt || {};
    const st = G.tkState(S);
    const tags = (G.eventTags ? G.eventTags() : ["any"]).concat(where ? [where] : []);
    const ids = named(S).map((c) => c.c2);
    return (D.TALK_BANTER || []).filter((b) => {
      if (!ids.includes(b.a) || !ids.includes(b.b) || (b.c && !ids.includes(b.c)) || st.bant[b.id]) return false;
      if (b.on ? opt.on !== b.on : !!opt.on) return false;
      if (b.where && !lines(b.where).some((w) => tags.includes(w))) return false;
      if (b.min !== undefined && [b.a, b.b, b.c].filter(Boolean).some((x) => TK.aff(cOf(x, S)) < b.min)) return false;
      if (b.after && !afterOk(st, b.after)) return false;
      if (b.rel !== undefined && !TK.relOk(b.rel, TK.rel(b.a, b.b, S))) return false;
      if (b.when && !b.when(S)) return false;
      return true;
    });
  };
  // 手番の終わり・夜の掛け合いは、この仕組みが決める（zzzzz_talk.js の決め方は、ここで黙らせる）。直接呼べば、今まで通り一覧が返る
  let quiet = 0;
  TK.banters = (S, where, opt) => (quiet ? [] : list(S, where, opt));

  // ---------------------------------------------------------------- 型の掛け合い（書いていない組にも何か起きる）
  const parts = (id) => (D.TALK_PARTS || {})[id] || null;
  const adult = (id) => { const p = person(id); return (p.age || 0) >= 18 && !p.childLook; };
  const gen = (id) => (parts(id) || {}).gen || ((person(id).age || 30) < 18 ? "kid" : (person(id).age || 30) <= 25 ? "young" : (person(id).age || 30) >= 55 ? "old" : "mid");
  const youngish = (id) => ["kid", "young"].includes(gen(id));
  const kinOf = (id) => { const r = person(id).race; return r === "elf" || r === "beast" ? r : null; };
  const lifeOf = (id) => (person(id).join && person(id).join.life) || {};
  // 型：k 名前・title 見出し・where 起きる所・ok 起きる条件・ln 行（[話し手, 部品の鍵] か [話し手, 関数]）・d 間柄の動き
  TK.TYPES = [
    { k: "food", title: "腹の虫", ln: [["a", "food"], ["b", "foodR"]] },
    { k: "home", title: "故郷の話", ln: [["a", "home"], ["b", "homeR"]] },
    { k: "habit", title: "癖", ok: (a, b) => !!lifeOf(b).habit, ln: [["", (a, b) => `{b}が、${lifeOf(b).habit}。`], ["a", "habitAsk"], ["b", "habitR"]] },
    { k: "keep", title: "大事なもの", ok: (a, b) => !!lifeOf(b).keep, ln: [["", (a, b) => `{b}が、${lifeOf(b).keep}を手に取って眺めている。`], ["a", "keepAsk"], ["b", "keepR"]] },
    { k: "drink", title: "一杯", where: ["town", "inn", "camp"], d: 2, ok: (a, b, S) => !!(parts(a) || {}).drink && adult(a) && adult(b) && TK.rel(a, b, S) >= -10, ln: [["a", "drinkAsk"], ["b", (a, b) => ((parts(b) || {}).drink ? "drinkYes" : "drinkNo")]] },
    { k: "elder", title: "年の差", ok: (a, b) => youngish(a) && gen(b) === "old", ln: [["a", "toElder"], ["b", "elderR"]] },
    { k: "young", title: "年の差", ok: (a, b) => gen(a) === "old" && youngish(b), ln: [["a", "toYoung"], ["b", "youngR"]] },
    { k: "kin", title: "同じ血", ok: (a, b) => !!kinOf(a) && kinOf(a) === kinOf(b), ln: [["a", "kin"], ["b", "kinR"]] },
    { k: "tease", title: "軽口", d: 2, ok: (a, b, S) => TK.rel(a, b, S) >= 20, ln: [["a", "tease"], ["b", "teaseR"]] },
    { k: "cold", title: "棘", d: 0, ok: (a, b, S) => TK.rel(a, b, S) <= -11, ln: [["a", "cold"], ["b", "coldR"]] },
    { k: "night", title: "火の番", where: ["camp", "inn"], ln: [["a", "night"], ["b", "nightR"]] },
  ];
  // 反応の型（この手番に起きた出来事。{foe} 相手・{dead} 亡くした仲間・{place} 着いた所）
  TK.RX = {
    win: { title: "勝ったあと", ln: [["a", "win"], ["b", "winR"]] },
    boss: { title: "大物のあと", ln: [["a", "boss"], ["b", "bossR"]] },
    apostle: { title: "大物のあと", ln: [["a", "boss"], ["b", "bossR"]] },
    near: { title: "手当て", ln: [["a", "hurt"], ["b", "hurtR"]] },
    death: { title: "弔い", ln: [["a", "grief"], ["b", "griefR"]] },
    arrive: { title: "着いた先", ln: [["a", "arrive"], ["b", "arriveR"]] },
  };
  // 部品の鍵（docs/talk.md・tests/checks/k7_banter.mjs が見る）
  TK.PART_KEYS = ["food", "foodR", "home", "homeR", "habitAsk", "habitR", "keepAsk", "keepR", "drinkAsk", "drinkYes", "drinkNo", "toElder", "elderR", "toYoung", "youngR",
    "kin", "kinR", "tease", "teaseR", "cold", "coldR", "night", "nightR", "win", "winR", "boss", "bossR", "hurt", "hurtR", "grief", "griefR", "arrive", "arriveR"];
  // 部品の文：{o} は相手（a の行なら b、b の行なら a）。{foe} は出来事の相手
  const partLine = (who, key, a, b, salt, vars) => {
    const p = parts(who === "a" ? a : b);
    const list = p ? lines(p[key]) : [];
    if (!list.length) return null;
    let s = String(pickL(list, salt + key));
    s = s.replace(/\{o\}/g, who === "a" ? "{b}" : "{a}");
    if (vars && vars.foe) s = s.replace(/\{foe\}/g, vars.foe);
    if (vars && vars.dead) s = s.replace(/\{dead\}/g, vars.dead);
    return s;
  };
  const build = (tp, a, b, id, vars) => {
    const out = [];
    for (const [who, src] of tp.ln) {
      if (who === "") { out.push(["", typeof src === "function" ? src(a, b) : src]); continue; }
      const key = typeof src === "function" ? src(a, b) : src;
      const s = partLine(who, key, a, b, id, vars);
      if (!s) return null;
      out.push([who, s]);
    }
    return out;
  };
  TK.k7build = build; // 確認用（tests/checks/k7_banter.mjs が全部の組を回す）
  // その組（順番つき）で今できる型の掛け合い
  TK.typed = (a, b, S, where) => {
    S = S || G.S;
    const st = G.tkState(S);
    if (!parts(a) || !parts(b)) return [];
    const tags = (G.eventTags ? G.eventTags() : ["any"]).concat(where ? [where] : []);
    const out = [];
    for (const tp of TK.TYPES) {
      const id = `ty:${tp.k}:${a}|${b}`;
      if (st.bant[id]) continue;
      if (tp.where && !tp.where.some((w) => tags.includes(w))) continue;
      if (tp.ok && !tp.ok(a, b, S)) continue;
      const ln = build(tp, a, b, id);
      if (ln) out.push({ id, a, b, title: tp.title, lines: ln, typed: tp.k, relAdd: tp.d !== undefined ? tp.d : 1 });
    }
    return out;
  };
  // 反応の掛け合い（くり返し起きる。id に出来事の番号を付けて、覚えない）
  TK.react = (k, a, b, name, S) => {
    const tp = TK.RX[k];
    if (!tp || !parts(a) || !parts(b)) return null;
    const id = `rx:${k}:${a}|${b}:${(S || G.S).tk.seq || 0}`;
    const ln = build(tp, a, b, id, k === "death" ? { dead: name || "あいつ" } : { foe: name || "あいつ" });
    return ln ? { id, a, b, title: tp.title, lines: ln, typed: k, rx: true, relAdd: 1 } : null;
  };

  // ---------------------------------------------------------------- 掛け合いを起こす（行に c・間柄の動き）
  const bfill0 = TK.bfill;
  TK.bfill = (b, text, S) => bfill0(b, b && b.c ? String(text || "").replace(/\{c\}/g, nameOf(b.c, S)) : text, S);
  const line0 = TK.banterLine;
  TK.banterLine = (b, ln, S) => {
    const [who, text] = Array.isArray(ln) ? ln : ["", ln];
    if (who === "c" && b.c) { const c = cOf(b.c, S); const t = TK.bfill(b, text, S); return c ? `${short(c)}「${t}」` : t; }
    return line0(b, ln, S);
  };
  const pairsOf = (b) => (b.c ? [[b.a, b.b], [b.a, b.c], [b.b, b.c]] : [[b.a, b.b]]);
  const banter0 = TK.banter;
  TK.banter = (b) => {
    const S = G.S;
    const st = G.tkState(S);
    const r = banter0(b);
    if (b.rx) delete st.bant[b.id];
    const d = b.relAdd !== undefined ? b.relAdd : 2;
    pairsOf(b).forEach(([x, y]) => {
      TK.relAdd(x, y, d, S);
      const key = TK.relKey(x, y);
      st.k7.pn[key] = (st.k7.pn[key] || 0) + 1;
    });
    return r;
  };
  const side0 = TK.side;
  TK.side = (s) => {
    const S = G.S;
    const k = S && S.tk && S.tk.cur;
    const b = k && (D.TALK_BANTER || []).find((x) => x.id === k.banter);
    const r = side0(s);
    if (b && b.side) {
      const o = b.side[s] || {};
      if (b.c && o.aff && o.aff[2]) TK.addAff(cOf(b.c, S), o.aff[2]);
      // 肩を持つと、持たれなかったほうが少しむくれる。どちらにも付かなければ、少し和む
      TK.relAdd(b.a, b.b, o.rel !== undefined ? o.rel : s === "none" ? 1 : -1, S);
    }
    return r;
  };

  // ---------------------------------------------------------------- 顔ぶれで選ぶ
  const pairList = (S) => {
    const ids = named(S).map((c) => c.c2);
    const out = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) out.push([ids[i], ids[j]]);
    return out;
  };
  // 掛け合いの少ない組から（同じ数なら乱数で）
  const byFew = (S, pairs, salt) => {
    const pn = G.tkState(S).k7.pn;
    return pairs.map((p, i) => [p, pn[TK.relKey(p[0], p[1])] || 0, TK.roll(salt + i)]).sort((x, y) => x[1] - y[1] || x[2] - y[2]).map((x) => x[0]);
  };
  TK.pick = (S, where) => {
    S = S || G.S;
    const pairs = pairList(S);
    if (!pairs.length) return null;
    const H = list(S, where);
    const trios = H.filter((b) => b.c);
    if (trios.length && TK.roll("k7trio") < TK.K7.trio) return pickL(trios, "k7trioW");
    const hand = (p) => H.filter((b) => !b.c && TK.relKey(b.a, b.b) === TK.relKey(p[0], p[1]));
    const handPairs = byFew(S, pairs.filter((p) => hand(p).length), "k7hp");
    // 手書きの掛け合いが残っている組では、そちらを優先する（型の掛け合いは、書いていない組・書き尽くした組だけ）
    const typedPairs = byFew(S, pairs.filter((p) => !hand(p).length), "k7tp");
    const typedOf = (p) => TK.typed(p[0], p[1], S, where).concat(TK.typed(p[1], p[0], S, where));
    if (handPairs.length && (TK.roll("k7hand") < TK.K7.hand || !typedPairs.some((p) => typedOf(p).length))) return pickL(hand(handPairs[0]), "k7hw");
    for (const p of typedPairs) { const l = typedOf(p); if (l.length) return pickL(l, "k7tw"); }
    if (trios.length) return pickL(trios, "k7trioW");
    return null;
  };
  // 反応：その出来事に居合わせた組から。手書きの反応（on）があれば、そちらを先に
  TK.pickReact = (S, ev) => {
    S = S || G.S;
    const hw = list(S, null, { on: ev.k === "apostle" ? "boss" : ev.k }).filter((b) => ev.with.includes(b.a) && ev.with.includes(b.b));
    if (hw.length) return pickL(hw, "k7rxh");
    const here = named(S).map((c) => c.c2);
    const ids = ev.with.filter((x) => here.includes(x));
    const pairs = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);
    if (!pairs.length) return null;
    const p = byFew(S, pairs, "k7rxp")[0];
    const [a, b] = TK.roll("k7rxo") < 0.5 ? p : [p[1], p[0]];
    return TK.react(ev.k, a, b, ev.name, S);
  };

  // ---------------------------------------------------------------- いつ起きるか
  const capOf = (S) => (named(S).length >= 3 ? TK.K7.cap3 : TK.K7.cap);
  TK.k7Room = (S) => {
    S = S || G.S;
    const k = G.tkState(S).k7;
    if (k.day !== S.day) { k.day = S.day; k.n = 0; }
    return k.n < capOf(S);
  };
  const fire = (S, b) => {
    if (!b) return false;
    const k = G.tkState(S).k7;
    k.n++;
    k.turn = S.turn;
    TK.banter(b);
    return true;
  };
  const RX_ORDER = ["apostle", "boss", "death", "near", "arrive", "win"];
  const end0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (!S || S.over) return end0();
    const t = G.tkState(S);
    const moved = t.lastLoc !== undefined && t.lastLoc !== S.loc;
    const turn0 = S.turn;
    t.k7.pend = [];
    quiet++;
    let r;
    try { r = end0(); } finally { quiet--; }
    const pend = t.k7.pend;
    t.k7.pend = [];
    if (S.over || S.combat || S.travel || S.mode !== "explore" || t.cur || t.talkTurn === turn0) return r;
    if (S.turn - t.k7.turn < TK.K7.gap || !TK.k7Room(S) || named(S).length < 2) return r;
    // 1. この手番に起きた出来事への反応
    const ev = RX_ORDER.map((k) => pend.find((x) => x.k === k)).find(Boolean);
    if (ev && TK.roll("k7rx") < TK.K7.rx[ev.k] && fire(S, TK.pickReact(S, ev))) return r;
    // 2. 旅のあと・ふだんの手番
    const tags = G.eventTags ? G.eventTags() : [];
    const p = moved ? TK.K7.road : tags.includes("town") ? TK.K7.town : TK.K7.here;
    if (TK.roll(moved ? "k7road" : "k7here") < p) fire(S, TK.pick(S, moved ? "road" : null));
    return r;
  };
  // 野営・宿の夜（夜の会話が無かった夜）
  const night = (where) => {
    const S = G.S;
    if (!S || S.over || S.combat || (S.mode !== "explore" && S.mode !== "fac")) return;
    const t = G.tkState(S);
    if (t.night === S.day || t.cur || named(S).length < 2 || !TK.k7Room(S)) return;
    if (TK.roll("k7night") < TK.K7.night) fire(S, TK.pick(S, where));
  };
  const explore0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    const day = S && S.day;
    quiet++;
    let r;
    try { r = explore0(head, arg, a); } finally { quiet--; }
    if (head === "camp" && S && S.day !== day) night("camp");
    return r;
  };
  const fac0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    const day = S && S.day;
    quiet++;
    let r;
    try { r = fac0(head, arg, a); } finally { quiet--; }
    if (head === "inn" && arg === "rest" && S && S.day !== day) night("inn");
    return r;
  };
})(globalThis.G = globalThis.G || {});
