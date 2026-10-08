// M14：汎用の術（暮らし・探索）と術の巻物
// - 汎用の術は段が無く、才があれば属性を問わず覚えられる（学院・教会・裏路地）。才なしは覚えられない
// - 錠の出来事には開錠の術と盗賊の「鍵開け」の両方の道がある。どちらか持っていれば開く。術は MP を払い、大失敗で借りを返す
// - 灯り（迷宮の判定が楽に）・物探し（一日に一度）・毒抜き
// - 術の巻物は才が要らず、MP も使わず、一度きり
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const M = G.m14;
  let n = 0;
  const F = (m) => { n++; fail(m); };
  if (!M || !M.GEN) { fail("汎用の術の仕組みが無い"); return; }
  const SP = D.SPELLS;

  // データ：どの汎用の術も、教わる施設がある町がある
  for (const id of M.GEN) {
    const sp = SP[id];
    if (!(sp.mp > 0) || !sp.hint) F(`汎用の術 ${id} の MP か説明が無い`);
    if (!(sp.teach || []).some((fac) => D.M14_GTEACH[fac] && Object.values(D.LOCS).some((L) => (L.fac || []).includes(fac)))) F(`汎用の術 ${id} を教わる所が無い`);
    if (!sp.cat && !sp.act) F(`汎用の術 ${id} の使い道が無い`);
  }
  for (const it of Object.values(D.ITEMS)) if (it.m14scroll && !(SP[it.m14scroll] && SP[it.m14scroll].fx)) F(`巻物 ${it.name} の術が無い`);

  const start = (cls, magic, seed) => {
    G.rand = seeded(seed || 1);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 60; });
    G.newGame({ cls, stats, caps: stats, goal: "majin", profile: { name: "テスト", sex: "男", age: 20 }, magic });
    return G.S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const always = (fn, v) => { const r = G.rand; G.rand = () => (v == null ? 0.01 : v); try { return fn(); } finally { G.rand = r; } };

  // 才なしは教われない
  let S = start("merc", { lv: 0, good: [], bad: [] });
  S.loc = "karna"; S.gold = 9999;
  G.act("fac:alley");
  if (acts().some((a) => /^m14g:/.test(a.id))) F("才なしに裏路地で術を教える");
  G.facAct("m14g", "g_unlock");
  if (G.knows("g_unlock")) F("才なしが開錠の術を覚えた");
  G.act("back");

  // 才があれば属性を問わず覚えられる（苦手な属性しか無い者でも）
  S = start("merc", { lv: 1, good: ["earth"], bad: ["fire", "dark"] }, 2);
  S.loc = "karna"; S.gold = 9999; S.stats.知力 = 99;
  G.act("fac:alley");
  const lec = acts().find((a) => a.id === "m14g:g_unlock");
  if (!lec || lec.disabled) F("裏路地で開錠の術を教わる行動が出ない");
  for (let i = 0; i < 10 && !G.knows("g_unlock"); i++) G.act("m14g:g_unlock");
  if (!G.knows("g_unlock")) F("裏路地で開錠の術を覚えない");
  G.act("back");
  G.act("fac:church");
  for (let i = 0; i < 10 && !G.knows("g_water"); i++) G.act("m14g:g_water");
  if (!G.knows("g_water")) F("教会で水を清める術を覚えない");
  G.act("back");

  // 野営では覚えない
  {
    const T = start("mage", null, 3);
    T.loc = "plains"; T.maxHp = T.hp = 999;
    const n0 = T.spells.slice();
    for (let i = 0; i < 20 && !T.over; i++) {
      T.mode = "explore"; T.event = null; T.combat = null; T.fac = null;
      const c = acts().find((a) => /camp/.test(a.id) && !a.disabled);
      if (!c) break;
      G.act(c.id);
    }
    if (M.GEN.some((id) => G.knows(id)) || JSON.stringify(T.spells) !== JSON.stringify(n0)) F("野営で術を覚えた");
  }

  // 錠の出来事：開錠の術と鍵開けの両方の道
  const lockEv = D.EVENTS.find((e) => e.choices.some((c) => c.m14g === "g_unlock"));
  if (!lockEv) F("開錠の術の選択肢がある出来事が無い");
  else {
    const iSpell = lockEv.choices.findIndex((c) => c.m14g === "g_unlock");
    const iPick = lockEv.choices.findIndex((c) => c.k1 === "k1_lockpick");
    if (iPick < 0) F(`錠の出来事 ${lockEv.id} に鍵開けの道が無い`);
    const shown = () => G.actions().flatMap((g) => g.list).filter((a) => !a.locked && !a.disabled).map((a) => a.id);
    const enter = () => { G.S.mode = "event"; G.S.event = lockEv.id; G.S.eventData = null; };
    // 術だけ持つ者
    S = start("mage", null, 4);
    M.grant("g_unlock"); S.mp = S.maxMp = 30; S.stats.魔力 = 99;
    enter();
    if (!shown().includes("ev:" + iSpell)) F("開錠の術を覚えた者に術の選択肢が出ない");
    if (iPick >= 0 && shown().includes("ev:" + iPick)) F("鍵開けを持たない者に鍵開けの選択肢が出る");
    const sub = G.actions().flatMap((g) => g.list).find((a) => a.id === "ev:" + iSpell);
    if (!sub || !/開錠の術・MP3/.test(sub.sub)) F(`術の選択肢に術の名と MP が添わない（${sub && sub.sub}）`);
    const g0 = S.gold, mp0 = S.mp;
    always(() => G.act("ev:" + iSpell));
    if (!(S.gold > g0) || S.mp !== mp0 - SP.g_unlock.mp) F("開錠の術で開かないか、MP を払わない");
    // 大失敗で借り
    enter();
    const d0 = S.magicDebt || 0;
    always(() => G.act("ev:" + iSpell), 0.99);
    if (!((S.magicDebt || 0) > d0)) F("開錠の術の大失敗で借りを返さない");
    // MP が足りなければ出ない
    enter(); S.mp = 0;
    if (shown().includes("ev:" + iSpell)) F("MP が無いのに開錠の術が出る");
    // 鍵開けだけ持つ者（盗賊・才なし）
    S = start("thief", { lv: 0, good: [], bad: [] }, 5);
    enter();
    if (shown().includes("ev:" + iSpell)) F("開錠の術を知らない者に術の選択肢が出る");
    if (iPick >= 0 && !shown().includes("ev:" + iPick)) F("鍵開けを持つ盗賊に鍵開けの選択肢が出ない");
    // どちらも無い者
    S = start("merc", { lv: 0, good: [], bad: [] }, 6);
    enter();
    if (shown().includes("ev:" + iSpell) || (iPick >= 0 && shown().includes("ev:" + iPick))) F("術もスキルも無いのに錠を開ける選択肢が出る");
    S.mode = "explore"; S.event = null;
  }

  // 灯り・物探し・毒抜き
  S = start("mage", null, 7);
  ["g_light", "g_seek", "g_water"].forEach((id) => M.grant(id));
  S.mp = S.maxMp = 50; S.stats.魔力 = 99;
  const dun = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "dungeon");
  S.loc = dun; S.depth = 1; S.stats.知力 = 12;   // 成功率が 95％の天井に張りつかないように
  const c0 = G.chance("知力", "普通");
  const la = acts().find((a) => a.id === "m14ga:light");
  if (!la || la.disabled) F("迷宮で灯りの術が出ない");
  for (let i = 0; i < 6 && !M.lit(); i++) { S.mode = "explore"; S.event = null; S.combat = null; always(() => G.act("m14ga:light")); }
  if (!M.lit() || !(G.chance("知力", "普通") > c0)) F("灯りで判定が楽にならない");
  S.depth = 2;
  if (M.lit()) F("下の階まで灯りが続く");
  S.loc = "plains"; S.depth = 0; S.mode = "explore"; S.event = null; S.combat = null;
  const gold0 = S.gold, herb0 = S.inv.herb || 0;
  always(() => G.act("m14ga:seek"), 0.5);
  if (!(S.gold > gold0 || (S.inv.herb || 0) > herb0)) F("物探しの術で何も見つからない");
  S.mode = "explore"; S.event = null; S.combat = null;
  if (!acts().find((a) => a.id === "m14ga:seek")?.disabled) F("物探しの術が一日に何度も使える");
  S.conds = ["毒"];
  always(() => G.act("m14ga:purify"));
  if (S.conds.includes("毒")) F("水を清める術で毒が抜けない");

  // 術の巻物：才なしでも使える。MP を使わない。一度きり
  S = start("merc", { lv: 0, good: [], bad: [] }, 8);
  S.maxHp = S.hp = 999; S.mp = 0;
  G.give("m14_scroll_fire");
  G.startCombat(["ogre"], {});
  const sa = acts().find((a) => a.id === "cb:m14scroll:m14_scroll_fire");
  if (!sa || sa.disabled) F("戦闘の道具に術の巻物が出ない");
  const foe = G.S.combat.foes[0];
  always(() => G.act("cb:m14scroll:m14_scroll_fire"));
  if (!(foe.hp < foe.max)) F("才なしが術の巻物を使っても効かない");
  if (S.inv.m14_scroll_fire) F("術の巻物が減らない");
  if (S.mp !== 0) F("術の巻物で MP が動いた");
  if (G.knows("fire2")) F("巻物で術を覚えた");

  if (!n) ok(`汎用の術（${M.GEN.length} 種・出来事 ${Object.keys(M.added).length} 件に術の道・錠は術と鍵開けの両方・灯り・物探し・毒抜き・巻物）`);
};
