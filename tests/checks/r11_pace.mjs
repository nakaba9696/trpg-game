// R11：時間の進みに合わせた仕組み（src/engine/zzzzzzzzzzzzzzzzzzz_r11_pace.js・src/ui/zzzzzzzzz_r11_pace.js）
// - ギルドの依頼の期限：野・迷宮の依頼は「仕事の日数 × R11.WORK ＋ 行き帰り」で、現場に十分いられる。町の依頼は今まで通り
// - 期限が近い依頼は、依頼の窓で「期限が近い」、旅立つの札の印に「急ぎ」
// - 討伐の依頼の場所の戦いで、依頼の魔物が出やすい
// - 旅の出来事の数が日数に比例する（7 日で 1〜2 件、19 日で 4〜5 件）。上限は R11.TRIP_MAX
// - 世の大事が 60〜90 日に一件始まる。古いセーブの先の日付は縮める
// - 季節の催しの噂に、続きがありそうな場所と季節が付き、旅立つの札に印が出る。済んだら印が外れる。古いセーブの噂にも付く
export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail(m); };
  const start = (G, seed, loc) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 55]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    if (loc) { G.S.loc = loc; G.S.visited[loc] = true; }
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };

  // ---------------------------------------------------------------- 依頼の期限
  {
    const G = loadEngine();
    const D = G.data, R11 = G.r11, Q5 = G.q5;
    if (!R11 || !Q5) { F("G.r11 か G.q5 が無い"); return; }
    const S = start(G, 1101, "karna");
    S.fame = 200;
    const real = Q5.distFrom("karna", true);
    let field = 0, town = 0, minStay = 1e9;
    for (let i = 0; i < 60; i++) {
      S.day = 1 + i;
      Q5.board(S).list.forEach((q) => {
        const t = Q5.type(q.kind);
        const L = D.LOCS[q.loc];
        const trip = (real[q.loc] || 0) * 2;
        if (L.type === "town") {
          town++;
          if (q.dur !== Math.max(3, t.days + trip)) F(`町の依頼 ${q.kind} の期限が変わった（${q.dur}日・仕事 ${t.days}・行き帰り ${trip}）`);
        } else {
          field++;
          const stay = q.dur - trip;
          minStay = Math.min(minStay, stay);
          if (stay < t.days * R11.WORK) F(`${q.kind}（${L.name}）：現場にいられるのが ${stay} 日（${t.days * R11.WORK} 日より短い）`);
        }
      });
    }
    if (field < 20 || town < 10) F(`測った依頼が少ない（野・迷宮 ${field}・町 ${town}）`);
    if (minStay < 18) F(`現場にいられる日数がいちばん短いもので ${minStay} 日`);
    // 受けたときの期限
    G.act("fac:guild");
    const b = S.board && S.board.list[0];
    if (b) {
      G.act("guild:take:" + b.id);
      const q = S.quests.find((x) => x.id === b.id);
      if (!q || q.deadline !== S.day + q.dur) F("受けたときに期限が決まらない");
      if (q) {
        // 期限が近いと「急ぎ」・依頼の窓で「期限が近い」
        q.deadline = S.day + 2;
        const w = G.questWays(S).find((x) => x.q === q);
        if (!w || !/急ぎ/.test(w.why)) F(`期限が近いのに旅の印に「急ぎ」が無い（${w && w.why}）`);
        const e = G.q7.list(S).find((x) => x.key === "g:" + q.id);
        if (!e || e.state !== "soon") F(`あと 2 日の依頼が「期限が近い」にならない（${e && e.state}）`);
        q.deadline = S.day + 10;
        const w2 = G.questWays(S).find((x) => x.q === q);
        if (w2 && /急ぎ/.test(w2.why)) F("期限まで 10 日あるのに「急ぎ」");
      }
    } else F("掲示板に依頼が無い");
    if (!bad) ok(`依頼の期限（野・迷宮 ${field} 件はどれも現場に ${minStay} 日以上いられる・町 ${town} 件は今まで通り・期限が近いと「急ぎ」）`);
  }

  // ---------------------------------------------------------------- 討伐の相手
  {
    const before = bad;
    const count = (hunt) => {
      const G = loadEngine();
      const D = G.data;
      const S = start(G, 1202, "plains");
      const L = D.LOCS.plains;
      const pool = (L.pool || []).filter((id) => D.ENEMIES[id] && !D.ENEMIES[id].boss);
      const target = pool[pool.length - 1];
      G.r11.HUNT = hunt;
      S.quests = [{ id: "q5_test", q5: 1, kind: "hunt", type: "hunt", loc: "plains", target, need: 99, progress: 0, title: "テスト", desc: "", reward: 1, fame: 1, dur: 999, deadline: 9999, client: { name: "テスト" }, v: { place: L.name }, from: "karna", nation: "", foe: target, mids: 0 }];
      S.q5 = { cur: null, talk: [], res: {}, log: [], jobDay: 0 };
      let fights = 0, met = 0;
      for (let i = 0; i < 400; i++) {
        S.mode = "explore"; S.combat = null; S.event = null; S.travel = null; S.hp = S.maxHp; S.over = null;
        if (S.q5) S.q5.cur = null;
        G.exploreAct("explore", "", {});
        if (S.combat) { fights++; if (S.combat.foes.some((f) => f.id === target)) met++; }
      }
      return { fights, met, rate: fights ? met / fights : 0 };
    };
    const off = count(0), on = count(0.4);
    if (on.fights < 40) F(`丘の探索で戦いが少ない（${on.fights}）`);
    if (!(on.rate > off.rate + 0.15)) F(`討伐の相手が出やすくならない（${(off.rate * 100).toFixed(0)}% → ${(on.rate * 100).toFixed(0)}%）`);
    if (bad === before) ok(`討伐の依頼の場所の戦いで、依頼の魔物が出る割合 ${(off.rate * 100).toFixed(0)}% → ${(on.rate * 100).toFixed(0)}%`);
  }

  // ---------------------------------------------------------------- 旅の出来事の数
  {
    const before = bad;
    const G = loadEngine();
    const D = G.data, W6 = G.w6, R11 = G.r11;
    const S = start(G, 1303, "karna");
    const isW6 = (id) => { const e = D.EVENTS.find((x) => x.id === id); return !!(e && e.w6); };
    const journey = (to) => {
      let n = 0, last = null, guard = 0;
      G.act("travel:" + to);
      while (!S.over && guard++ < 300 && (S.travel || S.combat || (S.mode === "event" && isW6(S.event)))) {
        if (S.mode === "event") {
          if (S.event !== last && isW6(S.event)) n++;
          last = S.event;
          const list = G.actions()[0].list.filter((a) => !a.disabled);
          if (!list.length) { F(`${S.event}: 選べる選択肢が無い`); break; }
          G.act(list[0].id);
          continue;
        }
        if (S.mode === "combat") { const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "cb:attack") || G.actions()[0].list[0]; G.act(a.id); continue; }
        G.act("w6go");
      }
      return n;
    };
    const trial = (from, to, times) => {
      let sum = 0, max = 0;
      for (let i = 0; i < times; i++) {
        S.loc = from; S.mode = "explore"; S.event = null; S.combat = null; S.travel = null; S.w6 = null; S.flags = {}; S.hp = S.maxHp; S.sanity = 100; S.gold = 500; S.companions = [];
        const n = journey(to);
        sum += n; max = Math.max(max, n);
      }
      return { avg: sum / times, max, days: D.LOCS[from].links[to] };
    };
    const near = trial("karna", "forest", 80);
    const far = trial("karna", "zephara", 80);
    if (!(near.avg >= 1 && near.avg <= 2.5)) F(`${near.days} 日の旅の出来事が平均 ${near.avg.toFixed(2)} 件（1〜2.5 件）`);
    if (!(far.avg >= near.avg * 1.6)) F(`${far.days} 日の旅の出来事が平均 ${far.avg.toFixed(2)} 件（${near.days} 日の ${near.avg.toFixed(2)} 件の 1.6 倍より少ない）`);
    [near, far].forEach((t) => { if (t.max > R11.TRIP_MAX) F(`一つの旅で ${t.max} 件（上限 ${R11.TRIP_MAX}）`); });
    if (!(R11.tripExpect(19, 0, false) >= 4.5 && R11.tripExpect(7, 0, false) <= 2)) F("旅の出来事の期待値が日数 ÷ 4 になっていない");
    if (W6.MAX !== R11.TRIP_MAX) F(`W6.MAX が ${W6.MAX}`);
    if (bad === before) ok(`旅の出来事（${near.days} 日で平均 ${near.avg.toFixed(2)} 件・${far.days} 日で ${far.avg.toFixed(2)} 件・最多 ${Math.max(near.max, far.max)} 件）`);
  }

  // ---------------------------------------------------------------- 世の大事の間隔
  {
    const before = bad;
    const run = (gap, on) => {
      const G = loadEngine();
      const S = start(G, 1404, "karna");
      if (gap) G.m12.GAP = gap;
      if (on) G.m12.MAX_ON = on;
      for (let d = 0; d < 720; d++) { S.day++; G.m12.tick(); }
      return S.m12.list.length;
    };
    const oldN = run([60, 150], 2), newN = run(null);
    if (newN < 8) F(`二年で始まった世の大事が ${newN} 件（8 件以上）`);
    if (!(newN > oldN)) F(`世の大事が増えていない（前の間隔 ${oldN} 件・今 ${newN} 件）`);
    // 古いセーブ：次の大事が 150 日先なら、90 日先に縮める
    const G = loadEngine();
    const S = start(G, 1405, "karna");
    G.m12.tick();
    S.m12.next = S.day + 150;
    G.endTurn();
    if (S.m12.next > S.day + 90) F(`古いセーブの次の大事が ${S.m12.next - S.day} 日先のまま`);
    if (bad === before) ok(`世の大事（二年で ${oldN} 件 → ${newN} 件。古いセーブの先の日付は 90 日までに縮む）`);
  }

  // ---------------------------------------------------------------- 季節の催しの噂
  {
    const before = bad;
    const G = loadEngine();
    const D = G.data, U = G.q17, R11 = G.r11;
    const S = start(G, 1505, "karna");
    const set = D.V13.LEADS.find((x) => x.id === "oath");
    if (!set) { F("V13 の誓い祭の組が無い"); return; }
    const far = set.leads.find((l) => l.ch === "far");
    G.memo("噂：" + far.text);
    const find = () => U.rumors(S).find((x) => x.text === far.text.replace(/^「(.*)」$/, "$1"));
    let r = find();
    if (!r) F("誓い祭の噂が噂の欄に入らない");
    else {
      const place = G.placeName ? G.placeName(set.loc) : D.LOCS[set.loc].name;
      if (r.loc !== set.loc || !r.hint.includes(place) || !r.hint.includes("春")) F(`誓い祭の噂の手がかりに場所と季節が無い（${r.hint}）`);
      const marks = G.travelMarks(S);
      const m = Object.values(marks).find((t) => /季節の催し：誓い祭/.test(t));
      if (!m) F(`旅立つの札に誓い祭の印が無い（${JSON.stringify(marks)}）`);
      // 仲間の名の入る話（{n}）も拾う
      const comp = set.leads.find((l) => l.ch === "comp");
      const said = comp.text.replace(/\{n\}/g, "ガラハ");
      G.memo("噂：" + said);
      const rc = U.rumors(S).find((x) => x.text === said);
      if (!rc || rc.loc !== set.loc) F("仲間の名の入った誓い祭の噂に場所が付かない");
      // 済んだら印を外す
      S.flags["ev:" + set.ev] = true;
      r = find();
      if (!r || r.loc || !/済んだ/.test(r.hint)) F(`済んだ誓い祭の噂がまだ場所を指している（${r && r.hint}）`);
      if (Object.values(G.travelMarks(S)).some((t) => /誓い祭/.test(t))) F("済んだ誓い祭の印が旅立つの札に残る");
      delete S.flags["ev:" + set.ev];
    }
    // 古いセーブ：fest・r11 の無い噂の箱にも付く
    const set2 = D.V13.LEADS.find((x) => x.id === "kfire");
    const old = set2.leads.find((l) => l.ch === "far");
    S.q17r.list.push({ t: old.text.replace(/^「(.*)」$/, "$1"), day: 1, loc: "", key: "", n: 0 });
    const ro = U.rumors(S).find((x) => x.text === old.text.replace(/^「(.*)」$/, "$1"));
    if (!ro || ro.loc !== set2.loc || !ro.hint.includes(set2.season)) F(`古いセーブの季節の噂に場所が付かない（${ro && ro.hint}）`);
    // 季節の噂でない話には付けない
    G.memo("噂：北の峠で、雪の中に大きな足跡を見たという。");
    const plain = U.rumors(S).find((x) => /大きな足跡/.test(x.text));
    if (!plain || plain.fest) F("季節の催しでない噂に催しが付いた");
    // どの季節の組の話も、どれかの組に当たる（文の書き方が変わって外れないように）
    let miss = 0;
    D.V13.LEADS.filter((x) => x.kind === "season").forEach((s) => s.leads.forEach((l) => {
      const t = l.text.replace(/\{n\}/g, "ノラ").replace(/^「(.*)」$/, "$1");
      const got = R11.festOf(t);
      if (!got || got.id !== s.id) { miss++; F(`季節の噂の文が組 ${s.id} に当たらない「${t.slice(0, 30)}」`); }
    }));
    if (bad === before) ok("季節の催しの噂に場所と季節（噂の欄・旅立つの札）。済んだら外れる。古いセーブの噂にも付く");
  }
};
