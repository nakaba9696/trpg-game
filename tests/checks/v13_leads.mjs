// V13：時限の出来事への導線（src/data/v13_leads.js・src/engine/zzzzzzzzzzzz_v13_leads.js）
// - 表の整合：場所の条件がある時限の出来事（季節の催し・舞台の町でしか関われない世の大事）に、導線が二つ以上、別々の道で。覚え書きの文がある
//   季節の催しは、出来事の where にその場所があり、出来事がその季節にだけ起きる。世の大事は、使徒の侵攻（世界中に知れ渡るもの）を除いて全部に導線がある
//   文に数字が無い・舞台の町の名をそのまま書かない・差し込みは決まったものだけ
// - どの導線も、出る所（遠くの町・近くの町・ギルド・旅人・道中・仲間）があり、時期より前に出る（季節の催しは季節が始まる前の日、世の大事は前触れの段階）
//   時期を過ぎると出ない。一度きりの催しは、済んだら出ない
// - 聞くと本文と噂に一行、図鑑のその場所（かその大事の用語）の「聞いた話」に覚え書きが残る。同じ話は二度出ない
// - 乱数を使わない。酒場・ギルド・町に着いたときに出る。古いセーブ（S.v13 が無い）でも動く
const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const FILLS = { t: "m12", site: "m12", n: "comp" };

export default ({ fail, loadEngine, seeded }) => {
  const start = (G, seed, loc) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    if (loc) { G.S.loc = loc; G.S.visited[loc] = true; }
    G.S.gold = 9999;
    return G.S;
  };

  // ---------------------------------------------------------------- 表の整合
  const G0 = loadEngine();
  const D0 = G0.data;
  const T = D0.V13;
  if (!T || !Array.isArray(T.LEADS) || !G0.v13) { fail("V13 の表か仕組みが無い"); return; }
  const V0 = G0.v13;
  const ids = new Set();
  const nameParts = (id) => {
    const n = (D0.LOCS[id] || {}).name || "";
    const kata = n.match(/[ァ-ヶー・]{3,}/g) || [];
    return [n, ...kata].filter((x) => x.length >= 2);
  };
  const seasonOk = (e, season) => {
    // 出来事の cond が、その季節にだけ真になる（ほかの季節の日では偽）
    const S = { day: 1, phase: 3, flags: {}, loc: as(e.where)[0] };
    const on = {};
    for (let d = 1; d <= 720; d += 5) { S.day = d; let r = false; try { r = !e.cond || !!e.cond(S); } catch { r = false; } if (r) on[G0.seasonOf(d)] = 1; }
    return Object.keys(on).length === 1 && on[season];
  };
  for (const set of T.LEADS) {
    const F = (m) => fail(`${set.id}: ${m}`);
    if (!set.id || ids.has(set.id)) F("id が無いか重なっている");
    ids.add(set.id);
    if (!set.note || /[0-9０-９]/.test(set.note)) F("覚え書き（note）が無いか、数字がある");
    const leads = as(set.leads);
    if (leads.length < 2) F(`導線が ${leads.length}（二つ以上にする）`);
    if (new Set(leads.map((l) => l.ch)).size < 2) F("導線がみな同じ道（別々の道から二つ以上）");
    let names = [];
    if (set.kind === "season") {
      const e = D0.EVENTS.find((x) => x.id === set.ev);
      if (!e) { F(`出来事 ${set.ev} が無い`); continue; }
      if (!as(e.where).includes(set.loc) || !D0.LOCS[set.loc]) F(`覚え書きの場所 ${set.loc} が出来事の where に無い`);
      if (!seasonOk(e, set.season)) F(`出来事 ${set.ev} が ${set.season} にだけ起きる出来事でない`);
      names = as(e.where).flatMap(nameParts);
    } else if (set.kind === "m12") {
      const K = D0.M12.KINDS[set.m12];
      if (!K) { F(`世の大事 ${set.m12} が無い`); continue; }
      if (set.m12 === "apostle") F("使徒の侵攻（世界中に知れ渡る大事）は対象外");
      if (!(V0.m12Period(K) >= 1)) F("関われる段階が前触れより後に無い");
      names = [...as(K.targets), ...Object.keys(T.TOWN_HINT || {}), ...Object.keys(T.SITE_HINT || {})].flatMap(nameParts);
    } else F(`種類 ${set.kind} が無い`);
    for (const l of leads) {
      if (!V0.CH[l.ch]) F(`道 ${l.ch} が無い`);
      if (!l.text || /[0-9０-９]/.test(l.text)) F(`${l.ch}: 文が無いか、数字がある`);
      if (/[！!]|……/.test(l.text || "")) F(`${l.ch}: 「！」か「……」がある`);
      (String(l.text || "").match(/\{\w+\}/g) || []).forEach((m) => {
        const k = m.slice(1, -1);
        if (!FILLS[k]) F(`${l.ch}: 差し込み ${m} が無い`);
        else if (FILLS[k] === "m12" && set.kind !== "m12") F(`${l.ch}: ${m} は世の大事でだけ使える`);
        else if (FILLS[k] === "comp" && l.ch !== "comp") F(`${l.ch}: {n} は仲間の一言でだけ使える`);
      });
      const hit = names.find((n) => (l.text || "").includes(n));
      if (hit) F(`${l.ch}: 舞台の町の名「${hit}」をそのまま書いている`);
    }
  }
  Object.entries(T.TOWN_HINT || {}).concat(Object.entries(T.SITE_HINT || {})).forEach(([id, h]) => {
    if (!D0.LOCS[id]) fail(`V13 の言い換え ${id} の場所が無い`);
    const hit = nameParts(id).find((n) => h.includes(n));
    if (hit) fail(`V13 の言い換え ${id}「${h}」に名「${hit}」がある`);
  });
  // 世の大事のうち、使徒の侵攻のほかは全部に導線がある。舞台になる町には言い換えがある
  for (const [k, K] of Object.entries(D0.M12.KINDS)) {
    if (k === "apostle") continue;
    if (!T.LEADS.some((s) => s.kind === "m12" && s.m12 === k)) fail(`V13: 世の大事 ${k} に導線が無い`);
    as(K.targets).forEach((t) => { if (!(T.TOWN_HINT || {})[t]) fail(`V13: ${k} の舞台 ${t} に言い換えが無い`); });
  }

  // ---------------------------------------------------------------- どの導線も、時期より前に出る
  const towns = Object.keys(D0.LOCS).filter((id) => D0.LOCS[id].type === "town");
  const allLocs = Object.keys(D0.LOCS);
  // その導線が出る場所（ch ごと）
  const placeFor = (V, a, ch) => {
    const pool = ch === "road" || ch === "comp" ? allLocs : towns;
    const want = ch === "far" ? "far" : ch === "near" || ch === "road" ? "near" : null;
    return pool.find((id) => { const d = V.distance(a, id); return d !== "here" && (!want || d === want) && (ch !== "trav" || D0.LOCS[id].type === "town"); });
  };
  const tryLead = (G, a, i, lead, label) => {
    const S = G.S;
    const V = G.v13;
    const loc = placeFor(V, a, lead.ch);
    if (!loc) { fail(`${label}: 道「${V.CH[lead.ch]}」の導線が出る場所が無い`); return false; }
    S.loc = loc;
    S.companions = lead.ch === "comp" ? [{ name: "ロタ", id: "v13test" }] : [];
    const c = V.candidates(S, [lead.ch]).find((x) => x.a.set.id === a.set.id && x.i === i);
    if (!c) { fail(`${label}: 道「${V.CH[lead.ch]}」の導線が、時期の前に出ない（${loc}）`); return false; }
    return c;
  };

  for (const set of T.LEADS) {
    const label = `V13 ${set.id}`;
    if (set.kind === "season") {
      const G = loadEngine();
      const S = start(G, 13, "leavel");
      const V = G.v13;
      // 季節が始まる前の日に
      const st0 = V.seasonStarts(set.season, 400).find((d) => d > 100);
      S.day = st0 - 1;
      if (G.seasonOf(S.day) === set.season) fail(`${label}: 試す日が季節の前になっていない`);
      const a = V.active(S).find((x) => x.set.id === set.id);
      if (!a) { fail(`${label}: 季節の前の日に導線の時期になっていない`); continue; }
      let n = 0;
      set.leads.forEach((lead, i) => { if (tryLead(G, a, i, lead, label)) n++; });
      if (n < 2) fail(`${label}: 時期の前に出る導線が ${n}`);
      // 聞く：本文・噂・図鑑の覚え書き。同じ話は二度出ない
      S.companions = [];
      const c = V.candidates(S, [set.leads[0].ch]).find((x) => x.a.set.id === set.id) || tryLead(G, a, 0, set.leads[0], label);
      if (c) {
        const before = S.log.length;
        const text = V.tell(S, c);
        if (!S.log.slice(before).some((l) => l.text === text)) fail(`${label}: 本文に出ない`);
        if (/\{\w+\}/.test(text)) fail(`${label}: 差し込みが残っている「${text}」`);
        if (!(G.v12.store()["loc:" + set.loc] || []).some((x) => x.t === set.note)) fail(`${label}: 図鑑のその場所に覚え書きが残らない`);
        if (V.candidates(S, [c.lead.ch]).some((x) => x.a.set.id === set.id && x.i === c.i)) fail(`${label}: 同じ話がもう一度出る`);
      }
      // 季節の半ばを過ぎると出ない
      const w = V.seasonWindow(set, st0);
      S.day = w.to;
      if (V.active(S).some((x) => x.set.id === set.id)) fail(`${label}: 季節の半ばを過ぎても導線が出る`);
      // 一度きりの催しは、済んだら出ない
      const e = D0.EVENTS.find((x) => x.id === set.ev);
      if (e.once) { S.day = st0 - 1; S.flags["ev:" + e.id] = true; if (V.active(S).some((x) => x.set.id === set.id)) fail(`${label}: 済んだ一度きりの催しの導線が出る`); }
    } else {
      const G = loadEngine();
      const S = start(G, 17, "leavel");
      const V = G.v13;
      const ev = G.m12.begin(set.m12, S);
      if (!ev) { fail(`${label}: 大事が始められない`); continue; }
      if (ev.st !== 0) fail(`${label}: 前触れから始まっていない`);
      const a = V.active(S).find((x) => x.set.id === set.id);
      if (!a) { fail(`${label}: 前触れの段階で導線の時期になっていない`); continue; }
      let n = 0;
      set.leads.forEach((lead, i) => { if (tryLead(G, a, i, lead, label)) n++; });
      if (n < 2) fail(`${label}: 前触れの段階で出る導線が ${n}`);
      const c = tryLead(G, a, 0, set.leads[0], label);
      if (c) {
        const text = V.tell(S, c);
        if (/\{\w+\}/.test(text)) fail(`${label}: 差し込みが残っている「${text}」`);
        const lore = D0.M12.KINDS[set.m12].lore;
        if (!(G.v12.store()["lore:" + lore] || []).some((x) => x.t === set.note)) fail(`${label}: 図鑑の用語に覚え書きが残らない`);
      }
      // 関われる段階まで進むと出ない
      const P = V.m12Period(D0.M12.KINDS[set.m12]);
      while (ev.st < P) G.m12.step(ev, S);
      if (V.active(S).some((x) => x.set.id === set.id)) fail(`${label}: 関われる段階になっても導線が出る`);
    }
  }

  // ---------------------------------------------------------------- 酒場・ギルド・町に着いたとき（乱数を使わない）・古いセーブ
  {
    const G = loadEngine();
    const S = start(G, 21, "leavel");
    const V = G.v13;
    const oath = T.LEADS.find((s) => s.id === "oath");
    S.day = V.seasonStarts("春", 400).find((d) => d > 100) - 3;
    delete S.v13; // 古いセーブ
    const far = towns.find((id) => { const a = V.active(S).find((x) => x.set.id === "oath"); return a && V.distance(a, id) === "far"; });
    S.loc = far;
    S.mode = "explore";
    let calls = 0;
    const r0 = G.rand;
    G.rand = () => { calls++; return r0(); };
    const list = V.candidates(S, ["far", "near"]);
    const before = S.log.length;
    const said = V.offer(S, ["far", "near"]);
    G.rand = r0;
    if (calls) fail(`V13: 導線を選ぶのに乱数を ${calls} 回使った`);
    if (!list.length || !said || !S.log.slice(before).some((l) => l.text === said)) fail("V13: 酒場で導線が出ない");
    if (!(S.memos || []).some((m) => m.endsWith(said))) fail("V13: 導線がこの冒険の噂に残らない");
    // 酒場の「噂を聞く」に足される
    const n0 = Object.keys(V.state(S).heard).length;
    G.facAct("tavern", "rumor");
    if (!(Object.keys(V.state(S).heard).length > n0)) fail("V13: 酒場の噂を聞いても導線が足されない");
    // 町に着いたときの話は、何日かに一度まで
    S.companions = [{ name: "ロタ", id: "v13test" }];
    S.v13.day = S.day;
    const n1 = Object.keys(S.v13.heard).length;
    G.arrive(S.loc);
    if (Object.keys(S.v13.heard).length !== n1) fail("V13: 着いたときの話が日を置かずに続けて出る");
    if (!oath) fail("V13: 誓い祭の導線が無い");
  }
};
