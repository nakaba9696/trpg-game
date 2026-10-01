// M6：物語の終わり方。基本は死ぬまで。節目（D.M6.MILESTONES）に着くと「ここで物語を終える／旅を続ける」を選べる。
// 死んでも終えても、年表とは別に「人生の物語」（語り手の目線・4〜8 段落）を、年表と状態から表で組み立てる（Claude は呼ばない）。
// 終えたときは、続けて「その後」のダイジェスト（数年後・十年後・晩年・最期・残ったもの）。最期の一行は墓碑と年表に残る。
// core.js は書き換えず、G.endTurn・G.apply・G.retire・G.finishRun を包む。文の表は src/data/epilogue_m6.js。
// 状態：S.m6 = { reached: { 節目: 日 }, offered: { 節目: true } }・S.ending = { id, day, loc }・S.story。古いセーブでは無くても動く。
// M2（S.m2.gone）・M4（年表の kind "world"）・M5（S.fate "mad" / "beast"、年表の kind "sanity" / "beast" / "fate"）は、あれば使う。
// レーン C（コア）が管理
(function (G) {
  const D = G.data;
  const M6 = () => D.M6;
  const msById = (id) => M6().MILESTONES.find((m) => m.id === id);

  const st = (S) => {
    S.m6 = S.m6 || {};
    S.m6.reached = S.m6.reached || {};
    S.m6.offered = S.m6.offered || {};
    return S.m6;
  };
  const test = (m, S) => { try { return !!m.test(S); } catch (e) { return false; } };

  // ---------------------------------------------------------------- 節目
  // 着いた節目の一覧（前に着いたものも残る。続けたあとでも終えられる）
  G.m6Reached = (S) => {
    S = S || G.S;
    const r = (S.m6 && S.m6.reached) || {};
    return M6().MILESTONES.filter((m) => r[m.id] !== undefined || (!m.special && test(m, S)));
  };
  // 今終えるなら、どの節目で終えるか（目的の節目を先に、次に rank の大きい順）
  G.m6Best = (S) => {
    S = S || G.S;
    const list = G.m6Reached(S);
    const goal = S.goal && S.goal.id;
    list.sort((a, b) => ((b.goal === goal) - (a.goal === goal)) || b.rank - a.rank);
    return list[0] || null;
  };
  G.m6CanEnd = () => { const S = G.S; return !!S && !S.over && S.mode !== "combat" && !!G.m6Best(S); };

  // 手番の終わりに、新しく着いた節目を探す。着いたら場面の文を記録に出し、S.m6.pending に置く。
  // 画面（src/ui/ending_m6.js）は pending のあいだ「ここで物語を終える／旅を続ける」を出す。行動の一覧（G.actions）には足さない
  // （ランダムプレイや他の子のテストが勝手に物語を終えないように）。探索中に一度見せたあと、次の手番で消える（＝旅を続けた）
  const m6Check = () => {
    const S = G.S;
    if (!S || S.over) return;
    const s = st(S);
    if (s.pending && s.pendingSeen) { s.pending = null; s.pendingSeen = false; }
    M6().MILESTONES.forEach((m) => { if (!m.special && s.reached[m.id] === undefined && test(m, S)) s.reached[m.id] = S.day; });
    const fresh = G.m6Reached(S).filter((m) => !m.special && !s.offered[m.id]);
    if (fresh.length) {
      const goal = S.goal && S.goal.id;
      fresh.sort((a, b) => ((b.goal === goal) - (a.goal === goal)) || b.rank - a.rank);
      // 一度にいくつ着いても、見せるのは一番大きな節目だけ（残りも見せたことにする）
      fresh.forEach((m) => { s.offered[m.id] = true; });
      const m = fresh[0];
      s.pending = m.id;
      s.pendingSeen = false;
      G.log("title", "節目：" + m.title);
      G.say(m.text);
      G.note(M6().ASK);
      G.chron(`節目に着く：${m.title}`, "milestone");
    }
    if (s.pending && S.mode === "explore") s.pendingSeen = true;
  };
  // 節目で「旅を続ける」を選んだ
  G.m6GoOn = () => {
    const S = G.S;
    if (!S || !S.m6 || !S.m6.pending) return;
    const m = msById(S.m6.pending);
    S.m6.pending = null;
    S.m6.pendingSeen = false;
    G.say(G.pick(M6().GO_ON));
    if (m) G.note("節目に着いた身なので、人物の表の「物語を終える」から、いつでも終えられる。");
  };

  const baseEndTurn = G.endTurn;
  G.endTurn = () => { baseEndTurn(); m6Check(); };

  // 出来事の結果 { m6end: 節目 } で物語を終える（節目の出来事・光の壁）
  // { m6reach: 節目 } は、出来事の中で「旅を続ける」を選んだ節目。着いたことにし、もう尋ねない（光の壁から戻ったとき）
  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    if (o && o.m6reach && G.S && !G.S.over) { const s = st(G.S); s.reached[o.m6reach] = s.reached[o.m6reach] ?? G.S.day; s.offered[o.m6reach] = true; }
    if (o && o.m6end && G.S && !G.S.over) G.endStory(o.m6end);
  };

  // ---------------------------------------------------------------- 物語を終える
  const fillSimple = (t, v) => String(t).replace(/\{(\w+)\}/g, (a, k) => (v[k] !== undefined ? v[k] : ""));
  G.endStory = (id) => {
    const S = G.S;
    if (!S || S.over) return false;
    const m = msById(id) || M6().PLAIN;
    st(S).reached[m.id] = st(S).reached[m.id] ?? S.day;
    S.over = "end";
    S.mode = "over";
    S.event = null;
    S.combat = null;
    S.fac = null;
    S.ending = { id: m.id, day: S.day, loc: S.loc };
    const comp = (S.companions || []).find((c) => (c.bond || 0) >= 90) || (S.companions || [])[0];
    G.log("title", "物語の終わり");
    G.say(fillSimple(m.line, { name: S.profile.name, comp: comp ? comp.name : "連れ" }));
    G.chron(m.end, "end");
    G.award(m.id === "wall" ? "m6_wall" : "m6_end");
    G.finishRun();
    return true;
  };
  // 古い「引退する」も、着いた節目で終える（どこにも着いていなければ、ただ身を引く）
  G.retire = () => { const S = G.S; if (!S || S.over) return; const m = G.m6Best(S); G.endStory(m ? m.id : "plain"); };

  // ---------------------------------------------------------------- 人生の中身（冒険中の S でも、墓碑でも）
  const yearOf = (day) => 1127 + Math.floor(((day || 1) - 1) / 360);
  const lifeOf = (S) => {
    const run = !!S.profile;
    const p = S.profile || { name: S.name };
    const chron = S.chronicle || [];
    const flags = S.flags || {};
    const cnt = S.counters || {};
    const repute = S.repute || {};
    const wantedIn = Object.keys(repute).filter((n) => repute[n] && repute[n].wanted);
    const gone = (S.m2 && S.m2.gone) || [];
    const comps = S.companions || [];
    const cls = D.CLASSES[S.cls];
    const L0 = run ? D.LOCS[S.loc] : null;
    const startLoc = cls && D.LOCS[cls.start];
    // M2 の別れ方：death 死んだ / slain 刃を向けてきて討った / betray 裏切って去った / leave 去った
    const goneKind = (g) => {
      const h = String(g.how || "");
      if (h === "slain") return "slain";
      if (/death|dead|die|死|看取/.test(h)) return "death";
      if (/betray|steal|thief|sell|stab|裏切|持ち逃|売/.test(h)) return "betray";
      return "left";
    };
    const ageN = parseInt(p.age, 10);
    const days = run ? S.day : Math.max(1, Math.round((S.turns || 0) / 3));
    const world = chron.filter((c) => c.kind === "world");
    const spells = S.spells || [];
    const learned = spells.filter((id) => !((D.SPELL_START && D.SPELL_START[S.cls]) || []).includes(id)).length;
    const alive = comps.find((c) => (c.bond || 0) >= 90) || comps[0];
    // 語り手になれる仲間は、生きて別れた者だけ（死んだ者・裏切った者は語れない）
    const kept = gone.find((g) => g.how === "leave");
    const joinedChron = chron.filter((c) => /仲間に加わる/.test(c.text || "")).length;
    const L = {
      run, name: p.name || "名も知れぬ者", sex: p.sex, ageN: Number.isFinite(ageN) ? ageN : null,
      cls: S.clsName || S.cls || "冒険者", history: p.history || "",
      goal: (S.goal && S.goal.text !== undefined ? S.goal.text : S.goal) || "", goalId: S.goal && S.goal.id,
      over: S.over || S.end || "", cause: S.deathCause || S.cause || "力尽きた", fate: S.fate || "",
      place: (L0 && L0.name) || S.location || "どこか", placeType: L0 ? L0.type : "", inTown: !!(L0 && L0.type === "town"),
      start: (startLoc && startLoc.name) || "どこかの町", days, year: yearOf(run ? S.day : 1),
      fame: S.fame || 0, title: S.title || "", gold: S.gold || 0, flags,
      bosses: cnt.bosses || 0, quests: cnt.quests || 0, kills: cnt.kills || 0, clung: cnt.clung || 0, fumbles: cnt.fumbles || 0,
      visited: Object.keys(S.visited || {}).length, sin: S.sin || 0, wanted: wantedIn.length > 0, where: wantedIn[0] || "",
      debt: S.magicDebt || 0, learned,
      sword: ["volgrim", "byakuya"].some((k) => (S.inv && S.inv[k]) || S.weapon === k),
      comp: alive ? alive.name : kept ? kept.name : "", anyComp: (alive || gone[0] || {}).name || "", joined: Math.max(comps.length + gone.length, joinedChron),
      goneBy: (kind) => { const g = gone.find((x) => goneKind(x) === kind); return g ? { comp: g.name } : false; },
      marks: chron.filter((c) => ["sanity", "beast", "fate"].includes(c.kind)),
      world: world.length ? { text: G.pick(world).text } : false,
      trophy: (key) => { const t = (D.TROPHIES || []).find((x) => x.key === key); return !!t && chron.some((c) => c.kind === "trophy" && (c.text || "").includes(t.name)); },
      stats: S.stats || {},
    };
    L.ending = S.ending ? (S.ending.id || S.ending) : L.over === "end" ? "plain" : "";
    return L;
  };
  G.m6LifeOf = lifeOf;

  // ---------------------------------------------------------------- 組み立て
  const pickW = (list, wOf) => {
    const ws = list.map((x) => Math.max(0, wOf(x)));
    let r = G.rand() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0 && ws[i] > 0) return list[i]; }
    return list[list.length - 1];
  };
  const chooseNarrator = (L) => {
    const N = M6().NARRATORS;
    const keys = Object.keys(N).filter((k) => { try { return N[k].when(L); } catch (e) { return false; } });
    const k = pickW(keys, (x) => N[x].w);
    return Object.assign({ key: k }, N[k]);
  };

  G.m6Compose = (S) => {
    const T = M6();
    const L = lifeOf(S);
    const N = chooseNarrator(L);
    const ageText = (n) => (n ? `${n}歳` : "いくつだったか分からない年");
    const V = {
      name: L.name, cls: L.cls, age: ageText(L.ageN), goal: L.goal || "自由に生きる", history: L.history, start: L.start,
      place: L.place, cause: L.cause, days: String(L.days), comp: L.comp || "連れ", where: L.where || "ある国", title: L.title,
      year: String(L.year), n: "",
    };
    const fill = (t, extra) => {
      const v = Object.assign({}, V, extra || {});
      return String(t).replace(/\{(\w+)\}/g, (a, k) => {
        if (k === "hear") return fill(G.pick(N.hear));
        const x = v[k];
        return x === undefined ? "" : String(x).includes("{") ? fill(x, extra) : x;
      });
    };
    const line = (arr, extra) => fill(G.pick(arr), extra);

    // 1. 生まれと旅立ち
    const life = [];
    life.push([
      line(N.open),
      line(L.history ? T.BIRTH : T.BIRTH_NONE),
      L.ageN ? line(T.DEPART) : fill(`{start}から歩き出した。目当ては「{goal}」。`),
    ].join(""));

    // 2. 印象的な出来事（人生の長さで数を決める。短い人生は短く、長い人生は選んで長くしすぎない）
    let want = L.days <= 10 ? 1 : L.days <= 40 ? 2 : L.days <= 150 ? 3 : 4;
    if (L.over === "end") want = Math.max(2, want);
    const nOf = { quests: L.quests, bosses: L.bosses, kills: L.kills, wander: L.visited };
    const cands = [];
    T.HIGHLIGHTS.forEach((h) => {
      if (h.key === "quiet") return;
      let r;
      try { r = h.test(L); } catch (e) { r = false; }
      if (!r) return;
      cands.push({ h, ctx: Object.assign({ n: String(nOf[h.key] ?? "") }, typeof r === "object" ? r : {}), s: h.score + G.rand() * 3 });
    });
    cands.sort((a, b) => b.s - a.s);
    const groups = new Set();
    const chosen = [];
    for (const c of cands) {
      if (chosen.length >= want) break;
      if (c.h.group && groups.has(c.h.group)) continue;
      if (c.h.group) groups.add(c.h.group);
      chosen.push(c);
    }
    const quiet = T.HIGHLIGHTS.find((h) => h.key === "quiet");
    if (!chosen.length) chosen.push({ h: quiet, ctx: {} });
    chosen.forEach((c) => {
      const by = c.h.by && c.h.by[N.key];
      life.push(line(by && G.rand() < 0.7 ? by : c.h.lines, c.ctx));
    });
    // 長い人生には、分からないことの段落を一つ挟むことがある（余白）
    if (want >= 3 && life.length >= 3 && G.rand() < 0.5) life.splice(2 + Math.floor(G.rand() * (life.length - 1)), 0, line(N.gap) + line(T.GAPS));
    while (life.length < (L.over === "end" ? 3 : 2)) life.push(line(N.gap) + line(T.GAPS));

    // 3. 最期（死）／旅をやめた所（終えた）
    let epitaph = "";
    let afterDeath = null;
    if (L.over === "end") {
      const m = msById(L.ending) || T.PLAIN;
      life.push(L.ending === "wall" ? line(T.WALL_END) : line(T.ENDED, { end: m.end }));
    } else {
      const fate = L.fate === "mad" || L.fate === "beast" ? L.fate : "";
      const kind = fate || (L.placeType === "dungeon" ? "dungeon" : L.inTown ? "town" : "wild");
      let p = line(T.DEATH[kind]);
      if (!fate && L.days <= 10) p = line(T.DEATH.short) + p;
      life.push(p);
      epitaph = fill(T.EPITAPH[fate || "dead"]);
    }

    // 4. 残されたもの（死んだとき）＋語り終え。終えたときはダイジェストのあとに語り終える
    const R = T.REMAINS;
    const remainsLine = () => {
      const pool = [];
      if (L.comp && N.key !== "comp") pool.push(R.comp);
      if (L.fame >= 150) pool.push(R.fame);
      if (L.wanted) pool.push(R.wanted);
      if (L.sword) pool.push(R.sword);
      pool.push(R.rumor, L.fame < 20 ? R.quiet : R.gone);
      return line(G.pick(pool));
    };
    let after = null;
    if (L.over === "end") {
      const r = composeAfter(L, V, fill, line, N);
      after = r.paras;
      epitaph = r.epitaph;
      afterDeath = r.death;
    } else {
      life.push(remainsLine() + line(N.close));
    }
    return { narrator: N.who, narratorKey: N.key, life, after, epitaph, death: afterDeath };
  };

  // その後のダイジェスト。数年後・十年後・晩年・最期・残ったもの（光の壁は、分からないことだけ）
  const composeAfter = (L, V, fill, line, N) => {
    const T = M6();
    const A = T.AFTER;
    const m = msById(L.ending) || T.PLAIN;
    const type = m.after || "quiet";
    const topStat = Object.keys(L.stats || {}).sort((a, b) => (L.stats[b] || 0) - (L.stats[a] || 0))[0] || "体力";
    if (type === "wall") {
      const paras = A.wall.map((t) => fill(t));
      paras[paras.length - 1] += line(N.close);
      return { paras, epitaph: fill(T.EPITAPH.wall), death: { key: "wall" } };
    }
    const a0 = (L.ageN || 25) + Math.floor(L.days / 360);
    let extra = 12 + G.d(33);
    if (a0 + extra > 96) extra = Math.max(3, 96 - a0);
    const deathAge = a0 + extra;
    const deathYear = L.year + extra;
    const paras = [];
    let soon = line(A.soon[type] && A.soon[type].length ? A.soon[type] : A.soon.quiet);
    const mark = A.mark.find((x) => { try { return x.test(L); } catch (e) { return false; } });
    if (mark && G.rand() < 0.75) soon += line(mark.lines);
    paras.push(soon);
    if (extra >= 10) paras.push(line(A.decade));
    paras.push(line(A.late[topStat] || A.late.体力));
    const fixed = A.fixedDeath[type];
    const d = fixed || pickW(A.deaths, (x) => x.w(L));
    const dv = { age: `${deathAge}歳`, year: String(deathYear) };
    paras.push(line(d.lines, dv));
    paras.push(line(A.remains, { place: L.place }) + line(N.close));
    return { paras, epitaph: fill(d.epitaph, dv), death: { key: d.key, trophy: d.trophy, age: deathAge, year: deathYear } };
  };

  // 墓碑から物語を読む（M6 より前の墓碑は、その場で組み立てる。同じ墓碑なら毎回同じ文になるよう、名前から決めた乱数で）
  G.m6StoryOf = (g) => {
    if (!g) return null;
    if (g.story) return g.story;
    if (!(g.end || g.over)) return null;
    let s = 0;
    const key = String(g.id || g.name || "");
    for (let i = 0; i < key.length; i++) s = (s * 31 + key.charCodeAt(i)) >>> 0;
    const r = G.rand;
    G.rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    try { return G.m6Compose(g); } catch (e) { return null; } finally { G.rand = r; }
  };

  // ---------------------------------------------------------------- 死と終わりに、物語を書いて墓碑に添える
  const baseFinish = G.finishRun;
  G.finishRun = () => {
    const S = G.S;
    let story = null;
    try { story = G.m6Compose(S); } catch (e) { story = null; }
    if (story) {
      S.story = story;
      if (S.over === "end" && story.epitaph) S.chronicle.push({ date: "その後", kind: "epilogue", text: story.epitaph });
      if (story.death && story.death.trophy) G.award(story.death.trophy);
      if (S.over === "dead" && S.day <= 10) G.award("m6_brief");
    }
    const cb = G.onFinish;
    G.onFinish = () => {
      G.onFinish = cb;
      const g = G.P.graves[0];
      if (g && g.id === S.id && story) Object.assign(g, { story, epitaph: story.epitaph, ending: S.ending ? S.ending.id : "", fate: S.fate || g.fate || "" });
      if (cb) cb();
    };
    try { baseFinish(); } finally { G.onFinish = cb; }
  };
})(globalThis.G = globalThis.G || {});
