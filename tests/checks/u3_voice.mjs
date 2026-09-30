// U3：語りの決まり（docs/lore/voice.md）と、通行人のひとこと・聞いた話の帳面
// - プレイヤーに見える文に「見世物・観客・客席・舞台・台本・言霊」が無い（GM だけの裏設定 LORE_GM・MAJIN.secret は除く）
// - 手引きの「旅で聞いた話」は、聞くまで出ず、聞いたら覚えていることが消えても残る
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
    for (const [w, t] of texts) if (BANNED.test(t)) fail(`見える文に「${t.match(BANNED)[0]}」：${w}「${t.slice(0, 40)}…」`);
  }

  // ---- 通行人のひとことの表
  {
    const G = loadEngine();
    const D = G.data;
    const ids = new Set();
    const hints = new Set();
    D.WORLD.all.forEach(([, rows]) => rows.forEach((r) => ((r[2] && r[2].hint) || []).forEach((w) => hints.add(w))));
    for (const a of D.AMBIENT || []) {
      if (!/^u3_/.test(a.id)) fail(`通行人 ${a.id}: id が u3_ で始まらない`);
      if (ids.has(a.id)) fail(`通行人 ${a.id}: id が重複`);
      ids.add(a.id);
      if (!Array.isArray(a.where) || !a.where.length) fail(`通行人 ${a.id}: where が無い`);
      if (!a.text) fail(`通行人 ${a.id}: 台詞が無い`);
      for (const w of a.hear || []) if (!hints.has(w)) fail(`通行人 ${a.id}: 聞く言葉「${w}」が手引きのどの行にも無い`);
    }
  }

  // ---- 聞いた話の帳面
  {
    const G = loadEngine();
    const D = G.data;
    const S = newGame(G, 3);
    const rows = () => D.WORLD.sections.flatMap(([, r]) => r.map(([k]) => k));
    if (rows().includes("赤い月")) fail("聞く前から手引きに「赤い月」がある");
    if (!rows().includes("魔人")) fail("はじめの手引きに「魔人」が無い");
    G.memo("噂：赤い月の晩は窓に布を掛けるものだ");
    if (!rows().includes("赤い月")) fail("赤い月の噂を聞いても手引きに増えない");
    S.memos = [];
    if (!rows().includes("赤い月")) fail("覚えていることが消えると、手引きの聞いた話も消える");
    delete S.heard; // 古いセーブ
    S.memos = ["占い師：赤い月の晩は窓に布を掛けろ"];
    if (!rows().includes("赤い月")) fail("古いセーブ（S.heard なし）で、覚えていることから手引きが増えない");
    const n = D.WORLD.all.length;
    D.WORLD.sections.push(["テストの節", [["テスト", "テスト"]]]);
    if (D.WORLD.all.length !== n + 1 || !rows().includes("テスト")) fail("D.WORLD.sections.push が元の表に足されない");
    if (!D.worldPrompt().includes("口が三つの魔人")) fail("GM への説明に、聞いていない話まで入っていない");
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
