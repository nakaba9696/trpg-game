// R11：十年の区切り（持ち主の決定）。冒険を始めてから十年たつと、主人公は冒険者を引退し、そのあとの人生が語られてエンディング。
// - 九年目の始め・十年目の始め・残り三か月で「冒険者でいられる時間が残り少ない」知らせ（D.R11.NOTICES）。突然は終わらない
// - 十年に着いたら（戦いと出来事の途中なら、終わるのを待って）節目「十年」（D.R11.MILESTONE）で G.endStory。
//   年表・墓碑・トロフィー・セーブは、今の引退（ending_m6.js の「物語を終える」）と同じ扱い。十年を歩き切ったトロフィー r11_decade
// - 「その後」は、その主人公の状態（目的・位・名声と評判・善悪・職業・仲間・結婚や家・討った使徒・持ち物・年表の大きな出来事）で
//   変わる文を、表（src/data/r11_decade.js）の組み合わせで作る（Claude は呼ばない）。年齢は始めたときの歳＋10 で語る
// 状態：S.r11 = { start 始めた日, age0 始めたときの歳, told: { 知らせ id: 日 } }。古いセーブに無ければ、始めた日は 1 日目
//   （始まりは必ず 1 日目。core.js の newGame）。すでに九年を過ぎた古いセーブは、読み込んだ日から一年は続けられる
// 冒険の年（何年目・あと何年）は、人物の表の行（G.r11Rows）と G.r11.left で画面に出す。レーン C（コア）
(function (G) {
  const D = G.data;
  const R = D.R11;
  if (!R || !D.M6) return;
  const X = (G.r11 = G.r11 || {});
  X.years = () => R.YEARS;                 // テスト・測定で差し替えられるように関数で
  const Y = () => G.YEAR_DAYS;

  const st = (S) => {
    const r = (S.r11 = S.r11 || {});
    if (typeof r.start !== "number") {
      r.start = 1;
      // 古いセーブ：もう九年を過ぎていたら、読み込んだ日から一年は続けられるように
      if (S.day > r.start + (X.years() - 1) * Y()) r.start = S.day - (X.years() - 1) * Y();
    }
    if (typeof r.age0 !== "number") { const n = parseInt(S.profile && S.profile.age, 10); r.age0 = Number.isFinite(n) ? n : null; }
    r.told = r.told || {};
    return r;
  };
  X.state = st;
  X.endDay = (S) => st(S).start + X.years() * Y();               // この日に着いたら引退
  X.left = (S) => Math.max(0, X.endDay(S) - S.day);              // 残りの日数
  X.yearNo = (S) => Math.floor((S.day - st(S).start) / Y()) + 1; // 何年目か
  X.retireAge = (S) => { const a = st(S).age0; return a == null ? null : a + X.years(); };

  // 残りの言い方（画面と文で同じ）
  X.leftText = (S) => {
    const d = X.left(S);
    if (d >= Y()) return `あと${Math.floor(d / Y())}年ほど`;
    if (d >= G.MONTH_DAYS) return `あと${Math.floor(d / G.MONTH_DAYS)}か月ほど`;
    return d > 0 ? `あと${d}日` : "今日まで";
  };

  // ---------------------------------------------------------------- 新しい冒険・古いセーブ
  const newGame0 = G.newGame;
  G.newGame = (opt) => {
    const S = newGame0(opt);
    S.r11 = null;
    st(S);
    S.r11.start = S.day;
    return S;
  };
  const fix0 = G.fixOldNames;
  G.fixOldNames = (S) => {
    const r = fix0 ? fix0(S) : S;
    try { if (S && S.profile && !S.over) st(S); } catch (e) { /* 読めない形は、そのまま */ }
    return r;
  };

  // ---------------------------------------------------------------- 手番の終わり：知らせと引退
  const busy = (S) => S.mode === "combat" || S.mode === "event" || !!S.combat || !!S.event || !!(S.tk && S.tk.cur);
  X.tick = () => {
    const S = G.S;
    if (!S || S.over || !S.profile) return;
    const r = st(S);
    const since = S.day - r.start;
    if (since >= X.years() * Y()) {
      if (busy(S)) return;            // 戦いと出来事が終わるのを待つ
      X.retire(S);
      return;
    }
    // 知らせは、着いた中でいちばん新しいものだけ出す（長い船旅で二つまたいでも、一度に一つ）
    const due = R.NOTICES.filter((n) => since >= n.at(Y()) && !r.told[n.id]);
    if (!due.length || busy(S)) return;
    due.forEach((n) => { r.told[n.id] = S.day; });
    const n = due[due.length - 1];
    G.log("title", n.title);
    G.say(G.pick(n.say));
    G.note(n.note);
    G.chron(`${n.title}を迎える（冒険者でいられるのは${X.leftText(S)}）`, "milestone");
  };
  X.retire = (S) => {
    st(S).done = S.day;
    G.log("title", R.END_TITLE);
    G.say(G.pick(R.END_SAY));
    S.mode = "explore"; S.fac = null;
    if (S.m6) S.m6.pending = null;
    G.award("r11_decade");   // 墓碑を書く前に（トロフィーの記録が冒険の記録と一緒に残るように）
    G.endStory("decade");
  };
  const endTurn0 = G.endTurn;
  G.endTurn = () => { endTurn0(); X.tick(); };

  // ---------------------------------------------------------------- その後の語り
  const pickIf = (arr, L) => (arr || []).filter((x) => typeof x === "string" || (() => { try { return !!x.if(L); } catch (e) { return false; } })()).map((x) => (typeof x === "string" ? x : x.t));
  const firstOf = (list, L) => list.find((x) => { try { return x.if(L); } catch (e) { return false; } });
  const apName = (id) => {
    const a = D.E3 && D.E3.LIST && D.E3.LIST[id];
    const e = D.ENEMIES[(a && a.foe) || id];
    return (e && e.name) || (a && a.name) || "";
  };
  // L（ending_m6.js の lifeOf）に、十年の語りに使う欄を足す
  X.facts = (S, L) => {
    const r = S.r11 || {};
    const m10 = S.m10 || {};
    const sp = (G.m10Spouse && G.m10Spouse(S)) || (m10.atHome && ((m10.atHome.m10 || {}).st === "wed") ? m10.atHome : null);
    const short = (c) => (c ? (G.m2Short ? G.m2Short(c) : String(c.name).replace(/^.*の/, "")) : "");
    const gone = ((S.m2 && S.m2.gone) || []).filter((g) => /death|dead|die|死|看取/.test(String(g.how || "")));
    const comps = (S.companions || []).filter((c) => c !== sp);
    const done = new Set([...((S.e3 && S.e3.done) || []), ...(G.majinSlain ? G.majinSlain(S) : [])]);
    const aps = [...done].map(apName).filter(Boolean);
    const seenMajin = Object.keys((S.m5 && S.m5.seen) || {}).some((id) => D.ENEMIES[id] && D.ENEMIES[id].majin);
    const repute = S.repute || {};
    const best = Object.keys(repute).filter((n) => repute[n] && !repute[n].wanted && (repute[n].rep || 0) >= 30).sort((a, b) => (repute[b].rep || 0) - (repute[a].rep || 0))[0] || "";
    const C10 = G.c10 || {};
    const pure = C10.pure ? C10.pure(S) : (S.virtue || 0) >= 4 && (S.sin || 0) < 4;
    const sinful = C10.sinful ? C10.sinful(S) : (S.sin || 0) >= 8;
    // 持ち物：伝説の武具 → 代償つきの品 → 使徒の落とし物 → 使い込んだ武器
    const owned = new Set([...Object.keys(S.inv || {}).filter((k) => S.inv[k] > 0), ...(G.i2s ? G.i2s.worn(S) : [S.weapon, S.armor, S.ring])].filter(Boolean));
    const nm = (id) => (D.ITEMS[id] && D.ITEMS[id].name) || "";
    let item = null;
    const sword = ["volgrim", "byakuya"].find((k) => owned.has(k));
    const cursed = [...owned].find((k) => D.ITEMS[k] && (D.ITEMS[k].toll || D.ITEMS[k].cursed));
    const relic = [...owned].find((k) => /^e3_d_/.test(k));
    const w = D.ITEMS[S.weapon];
    if (sword) item = { kind: "sword", name: nm(sword) };
    else if (cursed) item = { kind: "cursed", name: nm(cursed) };
    else if (relic) item = { kind: "relic", name: nm(relic) };
    else if (w && S.weapon !== "fists" && w.name) item = { kind: "weapon", name: w.name };
    // 年表の大きな出来事（十年の知らせ・引退そのものは除く）
    // 重い順（D.R11.CHRON_KINDS）に探し、いちばん重い種類の中から一つ。ただのトロフィーの行は使わない
    const chronAll = (S.chronicle || []).filter((c) => R.CHRON_KINDS.includes(c.kind) && c.text && !/を迎える（冒険者でいられる|十年の旅を終え|節目に着く：十年|^トロフィー/.test(c.text));
    const kind = R.CHRON_KINDS.find((k) => chronAll.some((c) => c.kind === k));
    const chron = chronAll.filter((c) => c.kind === kind);
    return {
      retireAge: r.age0 == null ? null : r.age0 + X.years(),
      home: m10.home ? (m10.home.name || "") : "",
      sp: short(sp), child: (m10.child || 0) > 0 && !!sp,
      comp: short(comps.find((c) => (c.bond || 0) >= 30) || comps[0]),
      lost: gone.length ? short(gone[gone.length - 1]) : "",
      aps, seenMajin, nation: best, pure, sinful, item,
      goalDone: !!(S.goal && G.goalDone && (() => { try { return G.goalDone(S); } catch (e) { return false; } })()),
      big: chron.length ? (({ date, text }) => ({ date, text: String(text).replace(/^節目に着く：/, "") }))(chron[Math.floor(G.rand() * chron.length)]) : null,
    };
  };

  X.after = (S, L, fill, line, N) => {
    const T = D.M6;
    const A = T.AFTER;
    const F = X.facts(S, L);
    const Lx = Object.assign({}, L, { home: F.home });
    const age = F.retireAge;
    const ageText = age ? `${age}歳` : "いくつだったか分からない年";
    const V = { age: ageText, town: F.home || "家のある町", sp: F.sp || "連れ合い", comp: F.comp || L.comp || "連れ", lost: F.lost,
      nation: F.nation || "ある国", n: String(F.aps.length), ap: F.aps[F.aps.length - 1] || "使徒", item: F.item ? F.item.name : "",
      joined: String(L.joined || 0) };
    const say = (arr, extra) => fill(G.pick(arr), Object.assign({}, V, extra || {}));
    const paras = [];
    // 1. 引退の場面と目的
    const ret = firstOf(R.RETIRE, Lx) || R.RETIRE[R.RETIRE.length - 1];
    const goalKey = L.goalId === "none" || !L.goal ? "none" : F.goalDone ? "done" : "undone";
    paras.push(say(ret.lines) + say(R.GOAL[goalKey]));
    // 2. その後の暮らし（職業）と善悪
    const trade = R.TRADE[S.cls] || R.TRADE.other;
    const align = F.pure ? R.ALIGN.pure : F.sinful ? R.ALIGN.sinful : R.ALIGN.plain;
    paras.push(say(trade) + (align.length ? say(align) : ""));
    // 3. 名と評判（よい国・手配された国）と持ち物
    const fame = firstOf(R.FAME, L) || R.FAME[R.FAME.length - 1];
    let p3 = say(fame.lines);
    if (F.nation) p3 += say(R.NATION);
    if (L.wanted) p3 += say(R.WANTED);
    if (F.item) p3 += say(R.ITEM[F.item.kind]);
    paras.push(p3);
    // 4. 人と使徒
    const P = R.PEOPLE;
    let p4 = F.sp ? say(P.spouse) + (F.child ? say(P.child) : "") : F.comp ? say(P.comp) : (L.joined || 0) > 0 ? say(P.alone) : say(P.none);
    if (F.lost) p4 += say(P.lost);
    const ap = F.aps.length >= 2 ? R.APOSTLE.many : F.aps.length === 1 ? R.APOSTLE.one : F.seenMajin ? R.APOSTLE.met : R.APOSTLE.none;
    if (ap.length) p4 += say(ap);
    paras.push(p4);
    // 5. 年表の大きな出来事と晩年（いちばん高い能力値）
    const topStat = Object.keys(L.stats || {}).sort((a, b) => (L.stats[b] || 0) - (L.stats[a] || 0))[0] || "体力";
    paras.push((F.big ? say(R.CHRON, { text: F.big.text, date: F.big.date }) : "") + line(A.late[topStat] || A.late.体力));
    // 6. 最期（ending_m6.js と同じ表。歳は引退した歳から数える）
    const a0 = age || 35;
    let extra = 12 + G.d(33);
    if (a0 + extra > 96) extra = Math.max(3, 96 - a0);
    const deathAge = a0 + extra;
    const deathYear = G.calYear(S.day) + extra;
    const fixed = L.title === "国王" ? A.fixedDeath.king : null;
    const ws = A.deaths.map((x) => Math.max(0, x.w(L)));
    let pick = G.rand() * ws.reduce((a, b) => a + b, 0);
    const d = fixed || A.deaths.find((x, i) => (pick -= ws[i]) <= 0 && ws[i] > 0) || A.deaths[0];
    const dv = { age: `${deathAge}歳`, year: String(deathYear) };
    paras.push(line(d.lines, dv));
    // 7. 残ったもの
    paras.push(line(A.remains, { place: L.place }) + line(N.close));
    return { paras, epitaph: fill(d.epitaph, Object.assign({}, V, dv)), death: { key: d.key, trophy: d.trophy, age: deathAge, year: deathYear, retireAge: age } };
  };

  // ending_m6.js の組み立てを包む：十年で終えたときだけ、「その後」を十年の表で作り直す（生まれと旅立ち・印象的な出来事はそのまま）
  const compose0 = G.m6Compose;
  G.m6Compose = (S) => {
    const out = compose0(S);
    const id = S && S.ending ? S.ending.id || S.ending : "";
    if (!out || id !== "decade" || !S.profile) return out;
    const L = G.m6LifeOf(S);
    const V = { name: L.name, cls: L.cls, goal: L.goal || "", start: L.start, place: L.place, comp: L.comp || "連れ", where: L.where || "ある国", title: L.title, year: String(L.year) };
    const fill = (t, extra) => String(t).replace(/\{(\w+)\}/g, (a, k) => { const v = Object.assign({}, V, extra || {}); return v[k] === undefined ? "" : String(v[k]); });
    const line = (arr, extra) => fill(G.pick(pickIf(arr, L)), extra);
    const N = Object.assign({}, D.M6.NARRATORS[out.narratorKey] || D.M6.NARRATORS.haka);
    const r = X.after(S, L, fill, line, N);
    return Object.assign(out, { after: r.paras, epitaph: r.epitaph, death: r.death });
  };

  // ---------------------------------------------------------------- 人物の表の行（画面 src/ui/zzzzzz_r11_mind.js が正気の行のあとに足す）
  G.r11Rows = (S) => (S && S.profile && !S.over ? [[R.ROW_YEAR, `${X.yearNo(S)}年目・引退まで${X.leftText(S)}`]] : []);
})(globalThis.G = globalThis.G || {});
