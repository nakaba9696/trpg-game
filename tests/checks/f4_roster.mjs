// F4：居場所×時期の予定・図鑑の「会える場所と時期」「仲間にする方法」・訪ねる・狙う印・上の帯の日付（src/data/f4_roster.js・engine/zz_f4_roster.js・ui/f4_roster.js）
// - 居場所はほぼ固定：seed を変えても、季節の真ん中ではいつも同じ場所。揺れは数日だけ。季節が変わると居場所が変わる人がいる
// - 予定どおりの時期・場所で、その人の出会いの出来事が起きうる。違う時期・場所では起きない。出来事の中身は seed で変わる
// - 知っていれば狙える：図鑑で知っている人は、居る時期・場所で「訪ねる」から出会いの出来事に入れ、仲間にできる
// - 狙う印で出会いの出来事が出やすくなる。噂で居場所が図鑑（profile）に季節ごとに残る
// - 仲間にすると、方法と会った場所＋時期が profile に残り、新しい冒険でも見える。会っただけだとぼかし。joinHint で上書き
// - 出来事の結果で予定が変わる（f4move）・会えなくなる（f4away）。古いセーブ・古い profile で動く。日付が状態から引ける。50 人規模でも速い
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("F4: " + m); };
  const start = (G, seed) => {
    const D = G.data;
    G.rand = seeded(seed);
    return G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 50])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), profile: { name: "試し", age: 20, sex: "男", history: "旅の者" }, goal: Object.keys(D.GOALS)[0] });
  };
  const MID = { 春: 45, 夏: 135, 秋: 225, 冬: 315 };
  const joiners = (D) => Object.keys(D.C2_PEOPLE).filter((id) => D.C2_PEOPLE[id].join);

  // ---------------------------------------------------------------- 予定と居場所
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const before = n;
    const ids = joiners(D);
    for (const id of ids) {
      const sc = F4.schedule(id, null);
      if (!sc) { F(`${id}: 予定が無い（C2・C4 の仲間には付ける）`); continue; }
      for (const e of sc) if (!D.LOCS[e.loc]) F(`${id}: 予定の場所 ${e.loc} が無い`);
      // 季節ごとに、出会いの出来事か誘える町のどちらかで会える（会えない季節ばかりにしない）
      const meet = Object.keys(MID).filter((s) => {
        const S = { day: MID[s], flags: {}, f4: {} };
        const w = F4.whereOn(id, S, MID[s]);
        return w && w.loc;
      });
      if (meet.length < 2) F(`${id}: 居る季節が少なすぎる（${meet}）`);
      if (!F4.routes(id).some((r) => sc.some((e) => F4.eventsNow({ day: MID[F4.seasonsOf(e)[0]], flags: {}, f4: {} }).some((x) => x.id === r[0].e.id && x.where.includes(e.loc))))) F(`${id}: 予定のどの時期・場所でも、出会いの出来事が起きない`);
    }
    // seed を変えても、季節の真ん中の居場所は同じ。揺れは数日
    const base = {};
    for (let s = 1; s <= 30; s++) {
      const S = start(G, s);
      for (const id of ids) {
        if (Math.abs(S.f4.shift[id] || 0) > 6) F(`seed ${s}: ${id} の揺れが大きい（${S.f4.shift[id]}日）`);
        for (const [season, d] of Object.entries(MID)) {
          const w = F4.whereOn(id, S, d);
          const k = id + season;
          const v = w ? w.loc || "away" : "";
          if (!(k in base)) base[k] = v; else if (base[k] !== v) F(`seed ${s}: ${id} の${season}の居場所が seed で変わる（${base[k]} → ${v}）`);
        }
      }
    }
    // 季節が変わると居場所が変わる人がいる
    const movers = ids.filter((id) => new Set(Object.keys(MID).map((s) => base[id + s])).size > 1);
    if (movers.length < 3) F(`季節で居場所が変わる人が少ない（${movers}）`);
    if (n === before) ok(`F4 予定（${ids.length} 人すべて・季節で動く人 ${movers.length}・seed を変えても居場所は同じ）`);
  }

  // ---------------------------------------------------------------- 予定どおりの時期・場所で会える／違うと会えない・出来事は seed で変わる
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const before = n;
    for (const id of joiners(D)) {
      const sc = F4.schedule(id, null);
      const S = start(G, 11);
      S.f4.shift = {};
      let found = false;
      for (const e of sc) {
        for (const s of F4.seasonsOf(e)) {
          S.day = MID[s] + 360 * 2;
          S.loc = e.loc;
          if (F4.entriesHere(id, S).length) found = true;
          // 別の場所（その人の予定に無い町）では、その人の出会いの出来事は起きない
          const other = Object.keys(D.LOCS).find((l) => D.LOCS[l].type === D.LOCS[e.loc].type && !sc.some((x) => x.loc === l));
          if (other) { S.loc = other; if (F4.entriesHere(id, S).length) F(`${id}: 予定に無い ${other} で${s}に出会いの出来事が起きる`); }
        }
      }
      if (!found) F(`${id}: 予定どおりの時期・場所で出会いの出来事が起きない`);
    }
    // 季節が変わると居場所が変わる：ノラは冬は森にいない（データにいれば）
    if (F4.schedule("nora", null)) {
      const S = start(G, 2);
      S.f4.shift = {};
      S.loc = "forest"; S.day = MID.夏;
      if (!F4.entriesHere("nora", S).length) F("夏の森でノラに会えない");
      S.day = MID.冬;
      if (F4.entriesHere("nora", S).length) F("冬の森でノラに会える（冬は町に下りるはず）");
    }
    // 出来事は seed で変わる：同じ町・同じ日に起きる出来事の並びが seed ごとに違う
    const seqs = new Set();
    for (let s = 1; s <= 8; s++) {
      const S = start(G, 40 + s);
      S.loc = "karna"; S.day = 30;
      const seq = [];
      for (let k = 0; k < 6; k++) { const e = G.randomEvent(); seq.push(e ? e.id : "-"); }
      seqs.add(seq.join(","));
    }
    if (seqs.size < 5) F(`同じ町で起きる出来事が seed で変わらない（8 回で ${seqs.size} 通り）`);
    if (n === before) ok(`F4 予定どおりの時期・場所で会える・違えば会えない・出来事は seed で変わる（8 回で ${seqs.size} 通り）`);
  }

  // ---------------------------------------------------------------- 知っていれば狙える（訪ねる）・狙う印・噂
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const before = n;
    let joined = 0, tried = 0;
    for (const id of joiners(D)) {
      const sc = F4.schedule(id, null);
      for (let s = 1; s <= 3; s++) {
        G.P = { trophies: {}, graves: [], codex: { items: {}, foes: {}, people: { [id]: { at: 1, ev: 1, rels: {} } } } };
        const S = start(G, 200 + s);
        S.f4.shift = {};
        S.gold = 999;
        S.stats = Object.fromEntries(D.STATS.map((k) => [k, 95]));
        // 条件（連れている人）をそろえる：流れの入口の条件を満たす仲間を先に入れる
        // 予定のうち、出会いの出来事が起きる時期・場所へ
        let spot = null;
        for (const e of sc) for (const ss of F4.seasonsOf(e)) { S.day = MID[ss] + 360; S.loc = e.loc; if (!spot && F4.entriesHere(id, S).length) spot = [S.day, e.loc]; }
        if (!spot) { for (const need of ["rui", "dil"]) if (D.C2_PEOPLE[need] && need !== id) { G.c2Join(need); } for (const e of sc) for (const ss of F4.seasonsOf(e)) { S.day = MID[ss] + 360; S.loc = e.loc; if (!spot && F4.entriesHere(id, S).length) spot = [S.day, e.loc]; } }
        if (!spot) { F(`${id}: 知っていても、訪ねられる時期・場所が無い`); break; }
        [S.day, S.loc] = spot;
        S.mode = "explore"; S.travel = null; S.depth = 0;
        tried++;
        const a = G.actions().flatMap((g) => g.list).find((x) => x.id === "f4seek:" + id);
        if (!a) { F(`${id}: 居る時期・場所で「訪ねる」が出ない`); break; }
        G.act(a.id);
        // 流れを辿る：仲間になる選択肢を優先、無ければ先へ進む選択肢
        for (let k = 0; k < 12 && !G.c2Has(id) && S.mode === "event"; k++) {
          const acts = G.actions().flatMap((g) => g.list).filter((x) => x.id.startsWith("ev:") && !x.disabled);
          const ev = D.EVENTS.find((x) => x.id === S.event);
          const pickJoin = acts.find((x) => { const c = ev.choices[+x.id.slice(3)]; return JSON.stringify([c.ok, c.ng, c.win]).includes(`"c2join"`) && JSON.stringify([c.ok, c.ng, c.win]).includes(`"${id}"`); });
          const pickNext = acts.find((x) => { const c = ev.choices[+x.id.slice(3)]; return c.next || c.fight || (c.ok && c.ok.next) || (c.win && c.win.next); });
          G.act((pickJoin || pickNext || acts[0]).id);
          if (S.mode === "combat") { S.hp = 999; S.maxHp = 999; for (let t = 0; t < 60 && S.mode === "combat"; t++) { S.combat.foes.forEach((f) => (f.hp = Math.min(f.hp, 1))); const c = G.actions().flatMap((g) => g.list).find((x) => !x.disabled); if (!c) break; G.act(c.id); } }
        }
        if (G.c2Has(id)) joined++;
        break;
      }
    }
    if (joined < tried * 0.8) F(`知っていて訪ねても、仲間にできない人が多い（${joined}／${tried}）`);
    // 狙う印：出会いの出来事が出やすくなる
    const id = "ilse" in D.C2_PEOPLE ? "ilse" : joiners(D)[0];
    const count = (want) => {
      let hit = 0;
      for (let s = 1; s <= 150; s++) {
        G.P = { trophies: {}, graves: [], codex: { items: {}, foes: {}, people: { [id]: { at: 1, ev: 1, rels: {} } } } };
        if (want) F4.setWant(id, true);
        const S = start(G, 600 + s);
        const e0 = F4.schedule(id, null)[0];
        S.loc = e0.loc; S.day = MID[F4.seasonsOf(e0)[0]] + 360;
        const e = G.randomEvent();
        if (e && F4.entryOf(e, id)) hit++;
      }
      return hit;
    };
    const a = count(false), b = count(true);
    if (!(b > a * 1.5)) F(`狙っても出会いの出来事が出やすくならない（${a} → ${b}／150）`);
    // 噂：居場所が季節ごとに profile に残る
    G.P = { trophies: {}, graves: [] };
    const S = start(G, 9);
    for (let k = 0; k < 30; k++) F4.rumor(S);
    const know = G.P.f4.know || {};
    if (Object.keys(know).length < 3) F("噂で居場所が図鑑に残らない");
    for (const [pid, k] of Object.entries(know)) for (const key of Object.keys(k)) {
      const [loc, s] = key.split("|");
      const w = F4.whereOn(pid, { day: MID[s], flags: {}, f4: {} }, MID[s]);
      if (!w || w.loc !== loc) F(`噂が予定と食い違う：${pid} ${key}`);
    }
    if (!Object.values(F4.knownSeasons(Object.keys(know)[0])).some(Boolean)) F("噂で聞いた季節が図鑑の表に出ない");
    if (n === before) ok(`F4 知っていれば狙える（訪ねて仲間に ${joined}／${tried}）・狙う印（${a} → ${b}／150）・噂が図鑑に残る（${Object.keys(know).length} 人）`);
  }

  // ---------------------------------------------------------------- 仲間にする方法（図鑑）
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const before = n;
    for (const id of joiners(D)) {
      const how = G.f4How(id);
      if (!how || !how.ways.length || !how.ways[0].length) { F(`${id}: 仲間にする方法が組み立てられない`); continue; }
      if (!F4.routes(id).length) F(`${id}: 加わる出来事の流れが見つからない`);
      if (!how.vague || /undefined|null|\{[a-z]/.test(how.vague + how.ways.flat().join("") + how.sched.map((x) => x.when + x.place + x.note).join(""))) F(`${id}: 方法の文が変 ${how.vague}`);
      const last = how.ways[0][how.ways[0].length - 1];
      if (how.vague.includes(last)) F(`${id}: ぼかした一行に方法がそのまま出ている`);
    }
    if (D.C2_PEOPLE.rui && !G.f4How("rui").ways.flat().join("").includes("ディル")) F("ルイの方法に、連れている人の条件が出ていない");
    const any = joiners(D)[0];
    D.C2_PEOPLE[any].joinHint = { full: "試しの方法", vague: "試しのぼかし" };
    const hh = G.f4How(any);
    if (hh.ways[0][0] !== "試しの方法" || hh.vague !== "試しのぼかし") F("joinHint で上書きできない");
    delete D.C2_PEOPLE[any].joinHint;
    if (n === before) ok("F4 仲間にする方法をデータから組み立てる（全員・joinHint で上書き）");
  }

  // ---------------------------------------------------------------- 仲間にすると profile に残り、新しい冒険でも見える。予定の書き換え・会えなくなる。古いセーブ。日付
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const before = n;
    G.P = { trophies: {}, graves: [] };
    const id = "nora" in D.C2_PEOPLE ? "nora" : joiners(D)[0];
    const S = start(G, 3);
    S.f4.shift = {};
    const route = F4.routes(id)[0];
    const e0 = F4.schedule(id, null).find((e) => F4.eventsNow({ day: MID[F4.seasonsOf(e)[0]], flags: {}, f4: {} }).some((x) => x.id === route[0].e.id && x.where.includes(e.loc)));
    S.loc = e0.loc; S.day = MID[F4.seasonsOf(e0)[0]];
    G.startEvent(route[0].e.id);
    const rec0 = G.codexPerson(id);
    if (!rec0) F("出会っても図鑑に載らない");
    else {
      if (!Object.keys(rec0.seen || {}).includes(`${S.loc}|${F4.seasonOf(S.day)}`)) F("会った場所と時期が図鑑に残らない");
      if (rec0.joined) F("会っただけで仲間になった扱い");
    }
    G.c2Join(id);
    if (!G.c2Has(id) || !G.codexPerson(id).joined) F("仲間にしても図鑑に残らない");
    const saved = JSON.parse(JSON.stringify(G.P));
    const G2 = loadEngine();
    G2.P = saved;
    start(G2, 99);
    const rec = G2.codexPerson(id);
    if (!rec || !rec.joined || !G2.f4.metPlaces(id).some((t) => t.includes(F4.seasonOf(S.day) + "の"))) F("新しい冒険で、仲間にした記録と「季節の場所」が見えない");
    if (!Object.values(G2.f4.knownSeasons(id)).some((v) => v && v.how === "met")) F("会った季節が図鑑の表に出ない");
    const m = G2.codexMerge({ people: {} }, saved.codex);
    if (!m.people[id] || !m.people[id].seen || !m.people[id].joined) F("図鑑をまとめると会った場所と時期が消える");
    // 出来事の結果で予定が変わる・会えなくなる
    const S4 = start(G2, 4);
    const other = joiners(D).find((x) => x !== id);
    G2.apply({ f4move: { id: other, schedule: [{ from: "春", to: "冬", loc: "fort", note: "砦に逃げた" }] } });
    if (G2.f4.whereOn(other, S4, 10).loc !== "fort") F("f4move で予定が書き換わらない");
    G2.apply({ f4away: other });
    if (!G2.f4.whereOn(other, S4, 10).away) F("f4away で会えなくならない");
    if (G2.f4.eventsNow(S4).some((e) => G2.f4.entryOf(e, other))) F("会えなくなった人の出会いの出来事が起きうる");
    // 古いセーブと古い profile
    const G3 = loadEngine();
    G3.P = { trophies: {}, graves: [] };
    const S3 = start(G3, 5);
    delete S3.f4;
    G3.randomEvent();
    if (!G3.f4.whereOn(id, S3, 45)) F("古いセーブ（S.f4 が無い）で予定が引けない");
    if (!G3.f4How(id) || G3.f4Count().joined !== 0) F("古い profile で数が変");
    // 日付：状態から引ける
    S3.day = 1 + 360 + 90 + 8;
    const t = G3.f4Today(S3);
    if (!t || t.season !== "夏" || t.d !== 9 || t.text !== G3.dateOf(S3.day)) F(`日付が状態から引けない ${JSON.stringify(t)}`);
    if (n === before) ok("F4 仲間にした方法と会った場所＋時期が profile に残る・予定の書き換えと会えなくなる・古いセーブ・日付");
  }

  // ---------------------------------------------------------------- 50 人規模でも速い
  {
    const G = loadEngine();
    const D = G.data;
    const F4 = G.f4;
    const towns = Object.keys(D.LOCS).filter((l) => D.LOCS[l].type === "town");
    const base = D.C2_PEOPLE[joiners(D)[0]];
    for (let i = 0; i < 40; i++) {
      const id = "f4t" + i;
      const home = towns[i % towns.length];
      D.C2_PEOPLE[id] = Object.assign({}, base, { name: "試し" + i, schedule: i % 2 ? [{ from: "春", to: "夏", loc: home }, { from: "秋", to: "冬", loc: towns[(i + 3) % towns.length] }] : undefined, join: Object.assign({}, base.join, { home: [home] }) });
      D.EVENTS.push({ id: "f4t_ev" + i, where: [home], w: 2, once: true, c2: id, title: "試し", choices: [{ label: "誘う", ok: { text: "来た。", c2join: id } }] });
    }
    const t0 = Date.now();
    for (let s = 1; s <= 40; s++) {
      const S = start(G, 500 + s);
      for (let k = 0; k < 20; k++) { S.day += 7; S.loc = towns[k % towns.length]; G.randomEvent(); G.actions(); }
    }
    for (let i = 0; i < 40; i++) G.f4How("f4t" + i);
    const ms = Date.now() - t0;
    if (ms > 5000) F(`50 人規模で遅い（40 回の冒険×20 手番と方法 40 人で ${ms}ms）`);
    else ok(`F4 50 人規模（仲間になる人 ${joiners(D).length}・${ms}ms）`);
  }
};
