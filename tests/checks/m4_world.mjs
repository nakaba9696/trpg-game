// M4：世界の出来事（src/engine/world_m4.js・src/data/world_events_m4.js・src/data/events_m4.js）
// - 表の整合（襲来ごとに居合わせる出来事がある・用語のきっかけがある・見える文に禁じた言葉が無い）
// - 長く進めると、皇帝が死に・新しい皇帝が立ち・戦が始まって終わり・1130年に協定の結び直しがあり・町が襲われる
// - 焼けた町では施設が閉まり、着くと様子が分かって年表に残る。戦の町では値が上がる。酒場で噂が届く。居合わせると出来事が起きる
// - 古いセーブ（S.world が無い）でも動く
// - ランダムプレイで何回起きたかを NOTE に出す
const BANNED = /見世物|観客|客席|舞台|台本|言霊/;

export default ({ fail, ok, loadEngine, seeded }) => {
  const start = (G, seed, cls) => {
    const D = G.data;
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: cls || Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const acts = (G) => G.actions().flatMap((g) => g.list);

  // ---------------------------------------------------------------- 表の整合
  {
    const G = loadEngine();
    const D = G.data;
    const M = D.M4;
    const evIds = new Set(D.EVENTS.map((e) => e.id));
    const valid = (t) => { const [id, key] = String(t).split(":"); const e = D.LORE[id]; return !!e && (!key || e.lines.some((l) => l[0] === key)); };
    const all = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
    const texts = [];
    const put = (w, t) => all(t).forEach((s) => { if (typeof s === "string") texts.push([w, s]); });
    for (const [k, R] of Object.entries(M.RAIDERS)) {
      if (typeof R.w !== "function" || typeof R.town !== "function") fail(`襲来 ${k}: w か town が関数でない`);
      if (!R.news) {
        if (!["burned", "fallen", "famine", "plague", "dance"].includes(R.st)) fail(`襲来 ${k}: 町の様子 ${R.st} が変`);
        if (!(R.days && R.days[0] > 0 && R.days[1] >= R.days[0])) fail(`襲来 ${k}: 日数が変`);
        if (!evIds.has("m4_here_" + k)) fail(`襲来 ${k}: 居合わせたときの出来事 m4_here_${k} が無い`);
        for (const f of ["seen", "lines", "rebuild", "rumor"]) if (!(R[f] || []).length) fail(`襲来 ${k}: ${f} が無い`);
        if (!R.chronHere || !R.chronSeen) fail(`襲来 ${k}: 年表の文が無い`);
      }
      if (!R.chron) fail(`襲来 ${k}: 聞いたときの年表の文が無い`);
      [...all(R.lore), ...all(R.loreHeard)].forEach((x) => valid(x) || fail(`襲来 ${k}: 用語 ${x} が無い`));
      ["seen", "lines", "rebuild", "rumor", "notice", "chron", "chronSeen", "chronHere"].forEach((f) => put("襲来 " + k, R[f]));
      Object.values(R.off || {}).forEach((t) => put("襲来 " + k, t));
    }
    for (const [k, N] of Object.entries(M.NEWS)) {
      if (!(N.rumor || []).length || !N.chron) fail(`知らせ ${k}: 噂か年表の文が無い`);
      all(N.lore).forEach((x) => valid(x) || fail(`知らせ ${k}: 用語 ${x} が無い`));
      ["rumor", "notice", "seen", "chron", "chronSeen"].forEach((f) => put("知らせ " + k, N[f]));
    }
    ["SPEAKERS", "WAR_LINES", "FREE_LINES", "FORT_LINES", "AFTER_LINES", "MOURN_LINES", "CIVIL_LINES", "HEIR_LINES", "HEIRS"].forEach((f) => { if (!(M[f] || []).length) fail(`${f} が空`); put(f, M[f]); });
    for (const [id, e] of Object.entries(D.LORE)) if (id.startsWith("m4_")) { put("用語 " + id, e.title); e.lines.forEach(([, t]) => put("用語 " + id, t)); }
    const m4ev = D.EVENTS.filter((e) => e.id.startsWith("m4_"));
    for (const e of m4ev) {
      put(e.id, [e.title, e.text]);
      all(e.lore).forEach((x) => valid(x) || fail(`${e.id}: 用語 ${x} が無い`));
      if (!e.where.every((w) => w.startsWith("m4_"))) fail(`${e.id}: 世界の様子に関係のない場所で起きる`);
      e.choices.forEach((c, i) => {
        put(`${e.id}[${i}]`, c.label);
        for (const o of [c.ok, c.ng, c.win]) if (o) { put(`${e.id}[${i}]`, [o.text, o.memo, o.chron]); all(o.lore).forEach((x) => valid(x) || fail(`${e.id}[${i}]: 用語 ${x} が無い`)); }
      });
    }
    for (const [w, t] of texts) {
      if (BANNED.test(t)) fail(`見える文に「${t.match(BANNED)[0]}」：${w}`);
      const bad = (t.match(/\{(\w+)\}/g) || []).filter((x) => !["{town}", "{heir}", "{foe}"].includes(x));
      if (bad.length) fail(`${w}: 置き換えられない ${bad.join(" ")}`);
    }
    for (const id of Object.keys(M.NATION)) if (!D.LOCS[id]) fail(`M4.NATION: 場所 ${id} が無い`);
    for (const ids of Object.values(M.FRONT)) for (const id of ids) if (!D.LOCS[id]) fail(`M4.FRONT: 場所 ${id} が無い`);
    if (!D.LORE_SECS.includes("世の中のこと")) fail("用語の節「世の中のこと」が無い");
  }

  // ---------------------------------------------------------------- 長く進める
  {
    const G = loadEngine();
    const S = start(G, 41);
    const kinds = {};
    let raidDays = [];
    for (let i = 0; i < 400 && S.day < 1200; i++) {
      S.day += 3;
      G.endTurn();
      if (S.mode === "event") { S.mode = "explore"; S.event = null; }
    }
    const W = S.world;
    if (!W) fail("S.world ができない");
    else {
      W.hist.forEach((h) => { kinds[h.kind] = (kinds[h.kind] || 0) + 1; if (h.kind === "raid") raidDays.push(h.day); });
      if (!kinds.emp_worse) fail("皇帝の病が重くならない");
      if (!kinds.emp_dead) fail("三年たっても皇帝が死なない");
      if (!kinds.heir || !W.heir) fail("新しい皇帝が立たない");
      if (!kinds.war) fail("戦が始まらない");
      if (!kinds.truce && !W.war) fail("戦が終わらない");
      if (!W.treaty || !(kinds.treaty_ok || kinds.treaty_broken)) fail("1130年の協定の結び直しが無い");
      const tr = W.hist.find((h) => h.kind.startsWith("treaty"));
      if (tr && !/1130年/.test(G.dateOf(tr.day))) fail(`協定の結び直しが1130年でない（${G.dateOf(tr.day)}）`);
      if (raidDays.length < 15) fail(`三年で町が襲われたのが ${raidDays.length} 回だけ`);
      if (raidDays[0] < 15) fail(`最初の襲来が早すぎる（${raidDays[0]}日目）`);
      if (new Set(W.hist.map((h) => h.id)).size !== W.hist.length) fail("世界の年表の id が重複");
      for (const [id, t] of Object.entries(W.towns)) {
        if (G.data.LOCS[id]?.type !== "town") fail(`町でない ${id} が襲われている`);
        if (t.st === "fallen" && G.data.M4.SPARE.includes(id)) fail(`${id} は滅びないはず`);
      }
      const hist = G.m4History();
      if (hist.length !== W.hist.length || hist.some((h) => !h.text || !h.date)) fail("G.m4History が年表を返さない");
      JSON.parse(JSON.stringify(S)); // セーブできる形
    }
  }

  // ---------------------------------------------------------------- 焼けた町・着いたとき・戦の値上がり・噂・居合わせる
  {
    const G = loadEngine();
    const D = G.data;
    const S = start(G, 42);
    const W = G.m4World(S);
    W.nextRaid = 99999;
    // 焼けた町
    const h = { id: "m4h900", day: S.day, kind: "raid", loc: "nerva", by: "sky", heard: "" };
    W.hist.push(h);
    W.towns.nerva = { st: "burned", by: "sky", since: S.day, until: S.day + 50, seen: false, h: h.id };
    S.loc = "karna";
    const tr = acts(G).find((a) => a.id === "travel:nerva");
    if (!tr || /焼けた/.test(tr.sub)) fail("聞いていないのに旅立つ先に焼けたと出る");
    const chron0 = S.chronicle.length;
    G.arrive("nerva");
    if (!h.heard || !W.towns.nerva.seen) fail("焼けた町に着いても様子が分からない");
    if (!S.chronicle.slice(chron0).some((c) => c.kind === "world" && /ネルヴァ/.test(c.text))) fail("焼けた町に着いたことが年表に残らない");
    if (!acts(G).find((a) => a.id === "fac:inn")?.disabled) fail("焼けた町の宿が開いている");
    const walk = acts(G).find((a) => a.id === "walk");
    if (!walk || walk.label !== "焼け跡を歩く" || !G.parse(walk.label)) fail("焼けた町で「焼け跡を歩く」にならない");
    const log0 = S.log.length;
    for (let i = 0; i < 5; i++) { G.act("walk"); if (S.mode === "event") { S.mode = "explore"; S.event = null; } }
    if (S.log.length <= log0) fail("焼け跡を歩いても何も起きない");
    // 立ち直る
    S.day = W.towns.nerva.until + 1;
    G.endTurn();
    if (W.towns.nerva?.st !== "rebuild" || acts(G).find((a) => a.id === "fac:inn")?.disabled) fail("焼けた町が立ち直らない");
    W.nextRaid = 99999; // 筋の日取りはここで決まる。これ以上は襲わせない
    Object.keys(W.towns).forEach((k) => { if (k !== "nerva") delete W.towns[k]; });
    S.day += 60;
    G.endTurn();
    if (W.towns.nerva) fail("立ち直った町の様子が消えない");

    // 戦：値が上がる・訓練場が閉まる
    W.war = { foe: "kingdom", since: S.day, until: S.day + 100 };
    S.loc = "leavel"; S.mode = "explore"; S.gold = 1000;
    if (!acts(G).find((a) => a.id === "fac:train")?.disabled) fail("戦の最中に王都の訓練場が開いている");
    G.act("fac:shop");
    const id = D.LOCS.leavel.shop[0];
    const it = D.ITEMS[id];
    const buy = acts(G).find((a) => a.id === "shop:buy:" + id);
    const want = it.price + Math.ceil(it.price * 0.3);
    if (!buy || !buy.sub.startsWith(want + "G")) fail(`戦の最中の値段が出ない（${buy && buy.sub}）`);
    const g0 = S.gold;
    G.act("shop:buy:" + id);
    if (g0 - S.gold !== want || !S.inv[id]) fail(`戦の最中に買った値段が違う（${g0 - S.gold}G・${want}G のはず）`);
    G.act("back");
    if (!G.eventTags().includes("m4_war_home")) fail("戦の最中の町に m4_war_home の印が無い");
    S.loc = "yakumo";
    if (G.m4Markup("yakumo") || G.eventTags().includes("m4_war")) fail("戦と関係のない八雲まで値が上がる");
    W.war = null;

    // 噂：届いた話を酒場で聞く
    S.loc = "karna";
    const hw = { id: "m4h901", day: S.day - 20, kind: "emp_dead", loc: "garmund", heard: "" };
    W.hist.push(hw);
    G.act("fac:tavern");
    for (let i = 0; i < 12 && !hw.heard; i++) { S.gold = 100; G.act("tavern:rumor"); }
    if (hw.heard !== "rumor") fail("酒場で世の中の噂を聞けない");
    if (!S.chronicle.some((c) => c.kind === "world" && /皇帝/.test(c.text))) fail("聞いた噂が年表に残らない");
    const far = { id: "m4h902", day: S.day, kind: "raid", loc: "w1_oboro", by: "dance", heard: "" };
    W.hist.push(far);
    for (let i = 0; i < 12; i++) { S.gold = 100; G.act("tavern:rumor"); }
    if (far.heard) fail("遠くの町の出来事が、その日のうちに噂で届いた");
    G.act("back");

    // 居合わせる
    W.towns.karna = { st: "plague", by: "rot", since: S.day, until: S.day + 30, seen: false, h: "m4h903" };
    W.hist.push({ id: "m4h903", day: S.day, kind: "raid", loc: "karna", by: "rot", heard: "" });
    W.here = "m4h903";
    G.m4Tick();
    if (S.mode !== "event" || S.event !== "m4_here_rot") fail(`その町が襲われても居合わせない（${S.mode} ${S.event}）`);
    if (!W.towns.karna.seen || !S.chronicle.some((c) => /居合わせる/.test(c.text))) fail("居合わせたことが年表に残らない");
    G.act("ev:2");
    if (S.mode !== "explore" && !S.over && S.mode !== "combat") fail("居合わせた出来事のあとで動けない");
    if (!acts(G).find((a) => a.id === "fac:inn")?.disabled) fail("疫病の町で宿が開いている");
  }

  // ---------------------------------------------------------------- 古いセーブ
  {
    const G = loadEngine();
    const S = start(G, 43);
    S.day = 500;
    delete S.world;
    G.act(acts(G).find((a) => !a.disabled && a.id === "walk").id);
    if (!S.world || S.world.day !== S.day) fail("古いセーブで世界がその日から始まらない");
    if (S.world.hist.some((h) => h.day < 500)) fail("古いセーブで、過ぎた日の出来事をさかのぼって起こした");
    S.day += 400;
    G.endTurn();
    if (!S.world.hist.length) fail("古いセーブで世界が動かない");
    delete S.world;
    if (G.m4Town("karna") !== null || Object.keys(G.m4Off("karna")).length || G.m4Markup("karna")) fail("S.world が無いと様子の問い合わせが壊れる");
  }

  // ---------------------------------------------------------------- ランダムプレイで何回起きたか（tests/run.mjs と同じ遊び方）
  {
    const G = loadEngine();
    const D = G.data;
    const GAMES = Number(process.env.GAMES || 150);
    const STEPS = Number(process.env.STEPS || 500);
    const kinds = {}, heard = {}, here = {};
    let withEvent = 0, long = 0, longWith = 0, m4ev = 0, maxDay = 0;
    const start0 = G.startEvent;
    G.startEvent = (ev) => { const r = start0(ev); if (r && String(G.S.event).startsWith("m4_")) m4ev++; return r; };
    for (let g = 0; g < GAMES; g++) {
      G.rand = seeded(1000 + g);
      G.P = { trophies: {}, graves: [] };
      const cls = Object.keys(D.CLASSES)[g % 5];
      const stats = {}, caps = {};
      D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; caps[k] = stats[k] + 30; });
      G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[g % 4], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
      if (g % 3 === 0) { G.S.gold = 5000; G.S.fame = 700; }
      if (g % 4 === 0) {
        D.STATS.forEach((k) => { G.S.stats[k] = 80; G.S.caps[k] = 95; });
        G.S.maxHp = G.maxHpOf(G.S.stats); G.S.hp = G.S.maxHp; G.S.maxMp = G.maxMpOf(G.S.stats); G.S.mp = G.S.maxMp;
        G.give("volgrim"); G.equip("volgrim");
      }
      try {
        for (let step = 0; step < STEPS && !G.S.over; step++) {
          const list = acts(G).filter((a) => !a.disabled);
          if (!list.length) { fail(`game ${g}: できる行動が無い（${G.S.mode} ${G.S.loc}）`); break; }
          G.act(list[Math.floor(G.rand() * list.length)].id);
        }
      } catch (e) { fail(`game ${g}: 例外 ${e.stack || e}`); continue; }
      const W = G.S.world;
      const hist = (W && W.hist) || [];
      hist.forEach((h) => {
        const k = h.kind === "raid" ? "raid:" + h.by : h.kind;
        kinds[k] = (kinds[k] || 0) + 1;
        if (h.heard) heard[h.heard] = (heard[h.heard] || 0) + 1;
        if (h.heard === "here") here[h.by] = (here[h.by] || 0) + 1;
      });
      if (hist.length) withEvent++;
      maxDay = Math.max(maxDay, G.S.day);
      if (G.S.day >= 60) { long++; if (hist.length) longWith++; }
    }
    G.startEvent = start0;
    const fmtc = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join("・") || "なし";
    console.log(`NOTE M4 ランダムプレイ ${GAMES} 回（最長 ${maxDay} 日）で世界が動いた冒険 ${withEvent}・60日以上続いた冒険 ${long} のうち ${longWith}`);
    console.log(`NOTE M4 起きたこと: ${fmtc(kinds)}`);
    console.log(`NOTE M4 プレイヤーに伝わった: ${fmtc(heard)}（居合わせた ${fmtc(here)}）・M4 の出来事 ${m4ev} 回`);
    if (long && longWith < long) fail(`60日以上続いたのに世界が何も動かなかった冒険がある（${long - longWith}）`);
    if (!Object.keys(kinds).some((k) => k.startsWith("raid:") && k !== "raid:skirmish")) fail("ランダムプレイで町が一度も襲われない");
    if (!(heard.seen || heard.rumor || heard.notice || heard.here)) fail("ランダムプレイで世界の出来事がプレイヤーに一度も伝わらない");
  }
  ok("M4：世界の出来事（表の整合・三年の筋・焼けた町・戦の値上がり・噂・居合わせる・古いセーブ・ランダムプレイ）");
};
