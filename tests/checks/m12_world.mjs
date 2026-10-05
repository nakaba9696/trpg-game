// M12：世の大事（src/engine/m12_world.js・src/data/m12_events*.js）
// - 表の整合：10 種以上・段階が三つ（日数・噂・年表）・結末が二つ以上（年表・噂）・用語の行・関われる行動の出来事・居合わせる出来事・町の様子・場所がある
//   見える文に禁じた言葉と「！」が無い・差し込みは決まったものだけ
// - 暦が進むと、大事が始まり、前触れ → 始まり → 激化 → 決着と進み、結末が世界に残る（町の様子・値上がり・閉ざされた道・傷あと）。関わらなくても進む
// - 関わると：「世の大事」の欄に行動が出て、出来事が起き、働きが積もって年表に残る。状態（罪の匂い・位など）で選択肢が増える。ギルドに依頼が貼られる
// - 働きで結末の重みが動く（砦の戦：働きが多いほど持ちこたえやすい）
// - 酒場の噂・張り紙で聞くと、年表（world）と用語に残る。地図の印が出る。墓碑に残る
// - 古いセーブ（S.m12 が無い）でも動く
const BANNED = /見世物|観客|客席|舞台|台本|言霊|魔王|！|!/;
const FILLS = new Set(["{t}", "{a}", "{b}", "{who}", "{pa}", "{pb}", "{site}", "{side}"]);

export default ({ fail, ok, loadEngine, seeded }) => {
  const start = (G, seed, loc) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    if (loc) { G.S.loc = loc; G.S.visited[loc] = true; }
    return G.S;
  };
  const acts = (G) => G.actions().flatMap((g) => g.list);
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  // ---------------------------------------------------------------- 表の整合
  {
    const G = loadEngine();
    const D = G.data;
    const M = D.M12;
    const before = [];
    const F = (m) => { before.push(m); fail(m); };
    const kinds = Object.entries(M.KINDS);
    if (kinds.length < 10) F(`世の大事の種類が ${kinds.length}（10 種以上にする）`);
    const evIds = new Set(D.EVENTS.map((e) => e.id));
    const texts = [];
    const put = (w, t) => as(t).forEach((s) => { if (typeof s === "string") texts.push([w, s]); });
    for (const [k, K] of kinds) {
      if (!K.name || !K.glyph) F(`${k}: 呼び名か地図の印が無い`);
      put(k, K.name);
      if ((K.stages || []).length !== 3) F(`${k}: 段階が三つでない`);
      const lore = D.LORE["m12_" + k];
      if (!lore || lore.sec !== "世の中のこと") F(`${k}: 用語 m12_${k} が無いか、節が違う`);
      const keys = new Set(((lore && lore.lines) || []).map((l) => l[0]));
      (lore ? lore.lines : []).forEach(([, t]) => put(`用語 ${k}`, t));
      (K.stages || []).forEach((st, i) => {
        if (!(st.days && st.days[0] > 0 && st.days[1] >= st.days[0])) F(`${k}[${i}]: 日数が変`);
        if (!as(st.rumor).length || !st.chron) F(`${k}[${i}]: 噂か年表の文が無い`);
        if (i >= 1 && !as(st.notice).length) F(`${k}[${i}]: 始まってからの段階に張り紙が無い`);
        if (st.st && !M.TOWN_ST[st.st]) F(`${k}[${i}]: 町の様子 ${st.st} が無い`);
        if (!keys.has(["omen", "start", "peak"][i])) F(`${k}[${i}]: 用語の行が無い`);
        ["rumor", "notice", "lines", "seen", "chron", "chronSeen", "chronHere"].forEach((f) => put(`${k}[${i}]`, st[f]));
        as(st.road).forEach(([a, b, why]) => { if (!D.LOCS[a] || !D.LOCS[b] || !(D.LOCS[a].links || {})[b]) F(`${k}[${i}]: 閉ざす道 ${a}-${b} が無い`); put(k, why); });
      });
      const outs = Object.entries(K.outcomes || {});
      if (outs.length < 2) F(`${k}: 結末が二つ以上ない`);
      for (const [o, O] of outs) {
        if (!O.chron || !as(O.rumor).length) F(`${k}.${o}: 年表か噂の文が無い`);
        if (!keys.has(o)) F(`${k}.${o}: 用語の行が無い`);
        ["chron", "rumor", "notice", "seen", "lines"].forEach((f) => put(`${k}.${o}`, O[f]));
        as(O.fx).forEach((f) => {
          if (f.type === "town" && !M.TOWN_ST[f.st]) F(`${k}.${o}: 町の様子 ${f.st} が無い`);
          if (f.type === "road" && (!D.LOCS[f.a] || !D.LOCS[f.b])) F(`${k}.${o}: 閉ざす道の場所が無い`);
          if (f.id && !String(f.id).startsWith("@") && !D.LOCS[f.id]) F(`${k}.${o}: 場所 ${f.id} が無い`);
          put(k, f.why);
        });
        as(O.scar).forEach((s) => { if (!String(s.id).startsWith("@") && !D.LOCS[s.id]) F(`${k}.${o}: 傷あとの場所 ${s.id} が無い`); put(`${k}.${o}`, s.line); });
      }
      if (K.side) F(`${k}: side は結末に書く`);
      (K.acts || []).forEach((a, i) => { if (!evIds.has(a.ev)) F(`${k}.acts[${i}]: 出来事 ${a.ev} が無い`); put(`${k}.acts`, [a.label]); });
      if (K.here && !evIds.has(K.here.ev)) F(`${k}: 居合わせる出来事 ${K.here.ev} が無い`);
      if (!(K.acts || []).length) F(`${k}: 関われる行動が無い`);
      if (K.targets && !as(K.targets).some((id) => D.LOCS[id])) F(`${k}: 舞台の町の候補がどれも無い`);
      as(K.at).forEach((id) => { if (!String(id).startsWith("@") && !D.LOCS[id]) F(`${k}: 場所 ${id} が無い`); });
      if (K.joinChron) put(k, K.joinChron);
    }
    for (const [st, T] of Object.entries(M.TOWN_ST)) {
      if (!as(T.seen).length || !as(T.lines).length) F(`町の様子 ${st}: 着いたときかぶらついたときの文が無い`);
      ["seen", "lines", "heard"].forEach((f) => put("町の様子 " + st, T[f]));
      Object.values(T.off || {}).forEach((t) => put("町の様子 " + st, t));
    }
    const m12ev = D.EVENTS.filter((e) => e.id.startsWith("m12_"));
    for (const e of m12ev) {
      put(e.id, [e.title, e.text]);
      e.choices.forEach((c, i) => {
        put(`${e.id}[${i}]`, c.label);
        for (const o of [c.ok, c.ng, c.win, c.win && c.win.win]) if (o) { put(`${e.id}[${i}]`, [o.text, o.memo, o.chron, o.heard]); if ((o.m12 != null || o.m12side) && !o.m12k) F(`${e.id}[${i}]: 働きに m12k が付いていない`); }
      });
    }
    for (const [id, specs] of Object.entries(D.C10_ADD)) if (id.startsWith("m12_")) {
      if (!evIds.has(id)) F(`C10_ADD ${id}: 出来事が無い`);
      specs.forEach((sp) => { put(`C10 ${id}`, [sp.label, sp.ok && sp.ok.text, sp.ng && sp.ng.text, sp.win && sp.win.text]); [sp.ok, sp.ng, sp.win].forEach((o) => { if (o && (o.m12 != null || o.m12side) && !o.m12k) F(`C10 ${id}: 働きに m12k が付いていない`); }); });
    }
    for (const [w, t] of texts) {
      if (BANNED.test(t)) F(`見える文に「${t.match(BANNED)[0]}」：${w}「${t.slice(0, 30)}…」`);
      const bad = (t.match(/\{(\w+)\}/g) || []).filter((x) => !FILLS.has(x) && x !== "{n}");
      if (bad.length) F(`${w}: 置き換えられない ${bad.join(" ")}`);
    }
    const nEv = m12ev.length, nC10 = Object.keys(D.C10_ADD).filter((id) => id.startsWith("m12_")).reduce((a, id) => a + D.C10_ADD[id].length, 0);
    if (!before.length) ok(`m12: 表の整合（${kinds.length} 種・出来事 ${nEv}・状態で増える選択肢 ${nC10}・町の様子 ${Object.keys(M.TOWN_ST).length}）`);
  }

  // ---------------------------------------------------------------- 暦が進むと、始まって、段階を経て、決着する（関わらなくても）
  {
    const G = loadEngine();
    const S = start(G, 1201);
    const seen = new Set(), outs = {};
    let stagesOk = true, fx = 0, scars = 0, first = 0, overlap = 0;
    const trail = {};
    for (let i = 0; i < 700 && S.day < 2200; i++) {
      S.day += 3;
      G.endTurn();
      if (S.mode !== "explore") { S.mode = "explore"; S.event = null; S.combat = null; }
      const W = S.m12;
      if (!first && W.list.length) first = S.day;
      if (G.m12.active(S).filter((e) => e.st < 3).length >= 2) overlap++;
      W.list.forEach((e) => {
        seen.add(e.kind);
        const t = (trail[e.id] = trail[e.id] || []);
        if (t[t.length - 1] !== e.st) t.push(e.st);
        if (e.out) outs[e.kind + "." + e.out] = 1;
      });
      fx = Math.max(fx, W.fx.length);
      scars = Math.max(scars, W.scars.length);
    }
    Object.entries(trail).forEach(([id, t]) => { for (let i = 1; i < t.length; i++) if (t[i] < t[i - 1]) stagesOk = false; });
    const done = Object.values(trail).filter((t) => t.includes(4)).length;
    if (!first || first < 20 || first > 90) fail(`m12: はじめの大事の始まる日が ${first}（20〜90 日に）`);
    else if (seen.size < 8) fail(`m12: 長く進めても、起きた大事の種類が ${seen.size}（8 種以上は見たい）`);
    else if (!done) fail("m12: 決着まで進んだ大事が無い");
    else if (!stagesOk) fail("m12: 段階が戻った大事がある");
    else if (!fx || !scars) fail(`m12: 結末が世界に残らない（残るもの ${fx}・傷あと ${scars}）`);
    else ok(`m12: 関わらなくても進む（はじめは ${first} 日目・${seen.size} 種・決着 ${done}・結末の種類 ${Object.keys(outs).length}・重なった日 ${overlap}）`);
    // 始まって決着するまでの日数（前触れから決着まで、数十日）
    const W = S.m12;
    const lens = W.list.filter((e) => e.end).map((e) => e.end - e.since);
    if (lens.some((n) => n < 15 || n > 80)) fail(`m12: 前触れから決着までの日数が変：${lens.join(",")}`);
  }

  // ---------------------------------------------------------------- 結末が世界に残る：町の様子で施設が閉まる・値が上がる・道が閉ざされる
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, 77, "frost");
    const X = G.m12;
    const ev = X.begin("apostle");
    ev.v.t = "fort";
    X.step(ev);
    if (X.townState("fort", S) !== "siege") fail(`m12: 砦の戦の始まりで、砦が攻められていない（${X.townState("fort", S)}）`);
    // 決着を「破られた」に固定する
    X.step(ev);
    D.M12.KINDS.apostle.outcomes.broken.base = 1000;
    X.step(ev);
    D.M12.KINDS.apostle.outcomes.broken.base = 0.3;
    if (ev.st !== 3 || ev.out !== "broken") fail(`m12: 砦の戦が決着しない（${ev.st} ${ev.out}）`);
    const off = X.off("fort", S);
    if (!off["fac:tavern"] || off["fac:inn"] || off["fac:church"]) fail(`m12: 居座られた砦で閉まる施設が変：${JSON.stringify(off)}`);
    if (!(X.markup("fort", S) > 0)) fail("m12: 居座られた砦で値が上がらない");
    if (!X.closed("fort", "mountains", S)) fail("m12: 砦と山の道が閉ざされない");
    // 着いて見る（年表に残る）
    S.loc = "mountains";
    G.arrive("fort");
    const chron = S.chronicle.filter((c) => c.kind === "world");
    if (!chron.some((c) => /居座/.test(c.text))) fail(`m12: 居座られた砦に着いても年表に残らない：${chron.map((c) => c.text).join("／")}`);
    // 行き先の欄：閉ざされた道は押せない（ほかに道があるとき）
    G.arrive("fort");
    const tr = acts(G).find((a) => a.id === "travel:mountains");
    if (tr && !tr.disabled) fail("m12: 閉ざされた道の行き先が押せる");
    // 施設が閉まっている
    const tav = acts(G).find((a) => a.id === "fac:tavern");
    if (tav && !tav.disabled) fail("m12: 居座られた砦の酒場が開いている");
    // 町に傷あと・余波が残る
    if (!S.m12.scars.length && !S.m12.fx.length) fail("m12: 結末が何も残らない");
    // 地図の印
    const mk = X.mapMarks(S);
    if (!mk.some((m) => m.id === "fort")) fail("m12: 地図に砦の印が無い");
    // 時が過ぎると、町の様子は消える
    for (let i = 0; i < 80; i++) { S.day += 3; G.endTurn(); if (S.mode !== "explore") { S.mode = "explore"; S.event = null; S.combat = null; } }
    if (X.townFx("fort", S) && X.townFx("fort", S).until <= S.day) fail("m12: 期限の過ぎた町の様子が残っている");
    if (ev.st !== 4) fail(`m12: 決着のあとの余波が終わらない（段階 ${ev.st}）`);
    ok("m12: 結末が世界に残る（施設が閉まる・値上がり・閉ざされた道・年表・地図の印）");
  }

  // ---------------------------------------------------------------- 関わる：行動の欄・出来事・働き・状態で増える選択肢・ギルドの依頼
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, 5, "fort");
    const X = G.m12;
    S.gold = 500;
    const ev = X.begin("apostle");
    X.step(ev);   // 始まり（砦が攻められる）
    const a = acts(G).find((x) => /^m12:/.test(x.id) && /志願/.test(x.label));
    if (!a) fail(`m12: 砦の戦の始まりに、志願の行動が出ない：${acts(G).map((x) => x.label).join("・")}`);
    else {
      G.act(a.id);
      if (S.mode !== "event" || S.event !== "m12_apostle_vol") fail(`m12: 志願の行動で出来事が始まらない（${S.mode} ${S.event}）`);
      // 判定なしで働きになる選択肢がないので、矢を運ぶ（体力）を選ぶ。成否どちらでも働きになる
      const i = G.eventChoices().find(({ c }) => /矢を運ぶ/.test(c.label)).i;
      G.act("ev:" + i);
      if (!(ev.part > 0) || !ev.joined) fail(`m12: 志願しても働きにならない（${ev.part}）`);
      if (!S.chronicle.some((c) => c.kind === "event" && /砦の戦に加わる/.test(c.text))) fail("m12: 関わったことが年表に残らない");
      const again = acts(G).find((x) => x.id === a.id);
      if (!again || !again.disabled) fail("m12: 同じ段階で、同じ行動がもう一度できる");
    }
    // 状態で増える選択肢（位があれば、一隊を預かる）
    S.mode = "explore"; S.event = null;
    G.startEvent("m12_apostle_vol");
    const n0 = G.eventChoices().length;
    S.title = "騎士";
    const n1 = G.eventChoices().length;
    if (!(n1 > n0) || !G.eventChoices().some(({ c }) => c.c10 === "titled")) fail(`m12: 位があっても選択肢が増えない（${n0}→${n1}）`);
    S.title = ""; S.sin = 20;
    G.startEvent("m12_apostle_flee");
    if (!G.eventChoices().some(({ c }) => c.c10 === "sinful" && /漁る/.test(c.label))) fail("m12: 罪の匂いが濃くても、火事場泥棒の選択肢が出ない");
    S.sin = 0; S.mode = "explore"; S.event = null;
    // ギルドの依頼（近くの町の掲示板）
    S.loc = "zephara"; S.visited.zephara = true; S.board = null;
    G.act("fac:guild");
    G.actions();   // 画面が欄を描くとき（掲示板を見るとき）に貼られる
    const q = (S.board && S.board.list || []).find((x) => x.m12 === "apostle");
    if (!q) fail(`m12: 近くの町のギルドに、世の大事の依頼が貼られない：${(S.board && S.board.list || []).map((x) => x.title).join("・")}`);
    else {
      const p0 = ev.part;
      G.act("guild:take:" + q.id);
      const mine = S.quests.find((x) => x.m12 === "apostle");
      if (!mine) fail("m12: 世の大事の依頼が受けられない");
      else {
        G.act("leave");
        S.mode = "explore"; S.fac = null;
        G.arrive("fort");
        if (!mine.done) fail("m12: 砦に着いても荷運びが済まない");
        S.loc = "zephara"; S.mode = "explore";
        G.act("fac:guild");
        G.act("guild:report:" + mine.id);
        if (!(ev.part > p0)) fail("m12: 世の大事の依頼を報告しても働きにならない");
      }
    }
    ok(`m12: 関わると行動と選択肢が出て、働きが積もる（働き ${ev.part}）`);
  }

  // ---------------------------------------------------------------- 働きで結末の重みが動く・どちらかに付く
  {
    const G = loadEngine();
    const D = G.data;
    start(G, 9, "leavel");
    const X = G.m12;
    const runs = (part) => {
      let held = 0;
      for (let i = 0; i < 300; i++) {
        const S = G.S;
        S.m12 = null;
        const ev = X.begin("apostle");
        ev.part = part;
        X.step(ev); X.step(ev); X.step(ev);
        if (ev.out !== "broken") held++;
      }
      return held / 300;
    };
    const a = runs(0), b = runs(6);
    if (!(b > a + 0.1)) fail(`m12: 働きが結末を動かさない（働きなし ${a.toFixed(2)}・働き多め ${b.toFixed(2)}）`);
    // 摂政の争い：付いた側が勝ちやすい
    let won = 0;
    for (let i = 0; i < 300; i++) {
      G.S.m12 = null;
      const ev = X.begin("succession");
      ev.side.b = 3;
      X.step(ev); X.step(ev); X.step(ev);
      if (ev.out === "b") won++;
    }
    if (!(won / 300 > 0.5)) fail(`m12: 付いた側の勝つ割合が ${(won / 300).toFixed(2)}`);
    ok(`m12: 働きで結末が動く（砦が持つ割合 ${a.toFixed(2)}→${b.toFixed(2)}・付いた側が勝つ割合 ${(won / 300).toFixed(2)}）`);
  }

  // ---------------------------------------------------------------- 聞く：酒場の噂・張り紙・用語・図鑑・墓碑
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, 31, "leavel");
    const X = G.m12;
    S.gold = 999;
    const ev = X.begin("dragon");
    ev.v.t = "w2_granbel";
    X.step(ev);
    let heard = false;
    for (let i = 0; i < 40 && !heard; i++) {
      S.mode = "fac"; S.fac = "tavern";
      G.facAct("tavern", "rumor");
      heard = Object.keys(ev.heard).length > 0;
    }
    if (!heard) fail("m12: 酒場で何度聞いても、竜の噂が届かない");
    else {
      const lines = Object.values(D.M12.KINDS.dragon.stages).map((x) => G.m12.fill(x.chron, ev));
      if (!S.chronicle.some((c) => c.kind === "world" && lines.includes(c.text))) fail("m12: 竜の噂を聞いても年表に残らない");
      if (!(S.lore && Object.keys(S.lore).some((k) => k.startsWith("m12_dragon")))) fail(`m12: 竜の噂を聞いても用語が開かない：${JSON.stringify(S.lore || {}).slice(0, 120)}`);
    }
    if (!X.mapMarks(S).some((m) => m.id === "w2_granbel")) fail("m12: 竜の噂を聞いても、地図に印が出ない");
    // 墓碑
    G.die ? G.die("テスト") : (S.over = "dead", G.finishRun());
    const g = G.P.graves[0];
    if (!g || !Array.isArray(g.m12) || !g.m12.some((x) => x.name === D.M12.KINDS.dragon.name)) fail(`m12: 墓碑に世の大事が残らない：${JSON.stringify(g && g.m12)}`);
    else ok("m12: 噂で聞くと年表・用語・地図に残り、墓碑に生きた時代の大事が残る");
  }

  // ---------------------------------------------------------------- 居合わせる（前触れがあってから）
  {
    const G = loadEngine();
    const S = start(G, 13, "fort");
    const X = G.m12;
    const ev = X.begin("apostle");
    ev.since -= 10;   // 前触れから日がたっている
    X.step(ev);   // 始まり
    S.mode = "explore";
    X.step(ev);   // 激化。砦にいる
    G.endTurn();
    if (S.event !== "m12_apostle_here") fail(`m12: 砦の戦が激しくなった日に砦にいても、居合わせる出来事が起きない（${S.mode} ${S.event}）`);
    else ok("m12: 激しくなった日に舞台にいると、居合わせる");
  }

  // ---------------------------------------------------------------- 古いセーブ
  {
    const G = loadEngine();
    const S = start(G, 3);
    S.day = 400;
    delete S.m12;
    let threw = null;
    try {
      for (let i = 0; i < 60; i++) { S.day += 2; G.endTurn(); G.actions(); if (S.mode !== "explore") { S.mode = "explore"; S.event = null; S.combat = null; } }
    } catch (e) { threw = e; }
    if (threw) fail("m12: 古いセーブで例外：" + threw.message);
    else if (!S.m12 || S.m12.day !== S.day) fail("m12: 古いセーブで状態が作られない");
    else if (!S.m12.list.length) fail("m12: 古いセーブで、世の大事が始まらない");
    else ok("m12: 古いセーブ（S.m12 が無い）でも動く");
  }
};
