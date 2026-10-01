// U3：語りの決まり（docs/lore/voice.md）と、通行人のひとこと・聞いた話の帳面
// - プレイヤーに見える文に「見世物・観客・客席・舞台・台本・言霊」が無い（GM だけの裏設定 LORE_GM・MAJIN.secret は除く）
// - 手引きの世界観の項目（用語説明）は、はじめは見えず、きっかけで一行ずつ開く。古いセーブでも動く
// - 最初の町をぶらつけば、10 手番のうちに通行人のひとことに出会う
const BANNED = /見世物|観客|客席|舞台|台本|言霊/;

export default ({ fail, loadEngine, seeded }) => {
  const newGame = (G, seed) => {
    const D = G.data;
    G.rand = seeded(seed);
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };

  // ---- 見える文に禁じた言葉が無い
  {
    const G = loadEngine();
    const D = G.data;
    const texts = [];
    const add = (where, t) => { if (typeof t === "string") texts.push([where, t]); };
    const outcome = (w, o) => { if (!o) return; ["text", "memo", "chron", "cond"].forEach((k) => add(w, o[k])); outcome(w + ".win", o.win); };
    add("WORLD.intro", D.WORLD.intro);
    add("RULES_TEXT", D.RULES_TEXT);
    D.WORLD.all.forEach(([h, rows]) => { add("手引き", h); rows.forEach(([k, v]) => { add("手引き " + k, k); add("手引き " + k, v); }); });
    D.EVENTS.forEach((e) => {
      add(e.id, e.title); add(e.id, e.text);
      e.choices.forEach((c, i) => { add(`${e.id}[${i}]`, c.label); outcome(`${e.id}[${i}].ok`, c.ok); outcome(`${e.id}[${i}].ng`, c.ng); outcome(`${e.id}[${i}]`, { win: c.win }); });
    });
    (D.RUMORS || []).forEach((r, i) => add("噂" + i, r));
    (D.AMBIENT || []).forEach((a) => add(a.id, a.text));
    Object.entries(D.ITEMS).forEach(([id, it]) => { add(id, it.name); add(id, it.desc); });
    Object.entries(D.ENEMIES).forEach(([id, e]) => { add(id, e.name); add(id, e.desc); Object.values(e.lines || {}).flat().forEach((l) => add(id + ".lines", l)); });
    Object.entries(D.LOCS).forEach(([id, L]) => { add(id, L.name); add(id, L.desc); if (L.reward) { add(id, L.reward.text); add(id, L.reward.chron); } });
    (D.TROPHIES || []).forEach((t) => { add("trophy " + t.key, t.name); add("trophy " + t.key, t.desc); });
    Object.values(D.MAJIN || {}).forEach((m) => add("MAJIN " + m.name, m.rumor));
    Object.entries(D.LORE || {}).forEach(([id, e]) => { add("用語 " + id, e.title); e.lines.forEach(([k, t]) => add(`用語 ${id}:${k}`, t)); });
    for (const [w, t] of texts) if (BANNED.test(t)) fail(`見える文に「${t.match(BANNED)[0]}」：${w}「${t.slice(0, 40)}…」`);
  }

  // ---- 用語説明のきっかけが、ある項目・行を指している
  {
    const G = loadEngine();
    const D = G.data;
    const valid = (t) => { const [id, key] = String(t).split(":"); const e = D.LORE[id]; return !!e && (!key || e.lines.some((l) => l[0] === key)); };
    const all = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
    const evIds = new Set(D.EVENTS.map((e) => e.id));
    for (const [id, e] of Object.entries(D.LORE)) {
      if (!D.LORE_SECS.includes(e.sec)) fail(`用語 ${id}: 節「${e.sec}」が LORE_SECS に無い`);
      const keys = e.lines.map((l) => l[0]);
      if (new Set(keys).size !== keys.length) fail(`用語 ${id}: 行の key が重複`);
    }
    const on = D.LORE_ON;
    for (const [k, t] of Object.entries(on.event)) { if (!evIds.has(k)) fail(`LORE_ON.event: 出来事 ${k} が無い`); all(t).forEach((x) => valid(x) || fail(`LORE_ON.event.${k}: ${x} が無い`)); }
    for (const k of Object.keys(on.loc)) if (!D.LOCS[k]) fail(`LORE_ON.loc: 場所 ${k} が無い`);
    for (const k of Object.keys(on.item)) if (!D.ITEMS[k]) fail(`LORE_ON.item: アイテム ${k} が無い`);
    for (const k of Object.keys(on.goal)) if (!D.GOALS[k]) fail(`LORE_ON.goal: 目的 ${k} が無い`);
    for (const g of ["fac", "loc", "foe", "item", "flag", "goal"]) for (const [k, t] of Object.entries(on[g] || {})) all(t).forEach((x) => valid(x) || fail(`LORE_ON.${g}.${k}: ${x} が無い`));
    all(on.crit).forEach((x) => valid(x) || fail(`LORE_ON.crit: ${x} が無い`));
    const outcome = (w, o) => { if (!o) return; all(o.lore).forEach((x) => valid(x) || fail(`${w}: lore ${x} が無い`)); outcome(w + ".win", o.win); };
    D.EVENTS.forEach((e) => { all(e.lore).forEach((x) => valid(x) || fail(`${e.id}: lore ${x} が無い`)); e.choices.forEach((c, i) => { outcome(`${e.id}[${i}].ok`, c.ok); outcome(`${e.id}[${i}].ng`, c.ng); outcome(`${e.id}[${i}]`, { win: c.win }); }); });
    const ids = new Set();
    for (const a of D.AMBIENT || []) {
      if (!/^u3_/.test(a.id)) fail(`通行人 ${a.id}: id が u3_ で始まらない`);
      if (ids.has(a.id)) fail(`通行人 ${a.id}: id が重複`);
      ids.add(a.id);
      if (!Array.isArray(a.where) || !a.where.length) fail(`通行人 ${a.id}: where が無い`);
      if (!a.text) fail(`通行人 ${a.id}: 台詞が無い`);
      all(a.lore).forEach((x) => valid(x) || fail(`通行人 ${a.id}: lore ${x} が無い`));
    }
  }

  // ---- 用語説明の帳面
  {
    const G = loadEngine();
    const D = G.data;
    G.P = { trophies: {}, graves: [] };
    const S = newGame(G, 3); // 目的は D.GOALS の最初
    const secs = () => D.WORLD.sections.map(([t]) => t);
    const rows = () => D.WORLD.sections.flatMap(([, r]) => r.map(([k]) => k));
    const loreSecs = D.LORE_SECS.filter((t) => secs().includes(t));
    const goal0 = Object.keys(D.GOALS)[0];
    const startOpen = [].concat(D.LORE_ON.goal[goal0] || []).length;
    if (!secs().includes("大陸と国") || !secs().includes("人と暮らし")) fail("はじめの手引きに、大陸と国・人と暮らしが無い");
    const first = [D.WORLD.intro, ...D.WORLD.all.flatMap(([, r]) => r.flatMap(([k, v]) => [k, v]))].join("\n");
    const secret = first.match(/十三|七十二|ヴォルグリム|白夜|魔王の座|使徒|絶界|ロゥム|古言|世界樹/);
    if (secret) fail(`はじめの手引きに、物語で知るはずの「${secret[0]}」がある`);
    if (Object.values(S.lore).flat().length !== startOpen) fail(`はじめから用語説明が開いている：${JSON.stringify(S.lore)}`);
    if (!startOpen && loreSecs.length) fail("はじめから世界観の節が見える");
    if (rows().includes("赤い月")) fail("はじめから「赤い月」が見える");
    G.memo("噂：うちの婆さまは、赤い月の晩になると窓に布を掛けるんだ");
    if (!rows().includes("赤い月")) fail("噂（memo）で「赤い月」が開かない");
    if (!S.log.some((e) => /手引きに書き足された：赤い月/.test(e.text))) fail("開いたときに「手引きに書き足された」と出ない");
    S.memos = [];
    if (!rows().includes("赤い月")) fail("覚えていることが消えると、用語説明も消える");
    G.startEvent("redmoon");
    if (!S.lore.redmoon.includes("night") || !S.lore.redmoon.includes("first") || !S.lore.clap) fail(`赤い月の夜で、行が書き足されない：${JSON.stringify(S.lore)}`);
    const n = D.WORLD.sections.find(([t]) => t === "言い伝え")[1].filter(([k]) => k === "赤い月").length;
    if (n !== 1) fail("同じ項目の二行目にも見出しが付く");
    if (!(G.P.loreSeen && G.P.loreSeen.redmoon && G.P.loreSeen.redmoon.includes("night"))) fail("一度見た行が G.P.loreSeen に残らない");
    const before = S.log.length;
    G.openLore("redmoon:night");
    if (S.log.length !== before) fail("開いた行を二度書き足す");
    delete S.lore; // 古いセーブ
    S.memos = ["占い師：赤い月の晩は窓に布を掛けろ。竜の骨の中で誰かがしゃべっている"];
    if (!rows().includes("赤い月") || !rows().includes("しゃべる剣と白い刀")) fail("古いセーブ（S.lore なし）で、覚えていることから用語説明が開かない");
    const m = D.WORLD.all.length;
    D.WORLD.sections.push(["テストの節", [["テスト", "テスト"]]]);
    if (D.WORLD.all.length !== m + 1 || !rows().includes("テスト")) fail("D.WORLD.sections.push が元の表に足されない");
    const G2 = loadEngine();
    const S2 = newGame(G2, 4);
    S2.flags = {}; G2.startCombat(["graw"], {});
    if (!(S2.lore.zekkai || []).includes("first") || !S2.lore.majin) fail("使徒に会っても「使徒」「絶界」が開かない");
  }

  // ---- 最初の町で、10 手番のうちに通行人に出会う
  for (const seed of [1, 2, 3, 4, 5]) {
    const G = loadEngine();
    const D = G.data;
    const S = newGame(G, seed);
    S.gold = 0; // 金目当ての出来事を減らす
    let met = false;
    for (let t = 0; t < 10 && !met && !S.over; t++) {
      if (S.mode === "event") { const cs = G.eventChoices(); G.act("ev:" + cs[cs.length - 1].i); continue; } // 最後の選択肢（たいてい立ち去る）
      if (S.mode === "combat") { S.combat = null; S.mode = "explore"; continue; }
      if (S.mode === "fac") { G.act("back"); continue; }
      const before = S.counters.ambient || 0;
      G.act("walk");
      if ((S.counters.ambient || 0) > before) met = true;
    }
    if (!met) fail(`最初の町（${D.LOCS[S.loc].name}）で 10 手番のうちに通行人に出会わない（seed ${seed}）`);
  }
};
