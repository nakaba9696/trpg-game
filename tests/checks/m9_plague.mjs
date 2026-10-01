// M9：獣の病は疫医ベルナだけが持つ病（src/data/m9_plague.js・src/engine/m9_plague.js・src/engine/sanity_m5.js）
// 「ふつうの敵・出来事・品からはうつらない」「ベルナからはうつる」「古いセーブ（もうかかっている）も進む・祓える」を確かめる
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const M = D.M9;
  let bad = 0;
  const f = (m) => { bad++; fail("M9: " + m); };

  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 70; });
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  const withRand = (v, fn) => { const r = G.rand; G.rand = () => v; try { return fn(); } finally { G.rand = r; } };
  // その敵に、確実に何度も傷を負わされる戦い
  const takeHits = (id, rounds) => {
    const S = G.S;
    G.startCombat([id], {});
    const e = D.ENEMIES[id], hit = e.hit; e.hit = 999;
    try { for (let k = 0; k < (rounds || 6) && S.combat; k++) G.combatAct("guard"); } finally { e.hit = hit; }
    S.combat = null; S.mode = "explore";
  };
  const choose = (id, label, roll) => {
    const S = G.S;
    S.mode = "explore"; S.event = null;
    G.startEvent(id);
    const i = D.EVENTS.find((e) => e.id === id).choices.findIndex((c) => c.label.startsWith(label));
    if (i < 0) { f(`${id}: 選択肢「${label}」が無い`); return; }
    withRand(roll, () => G.act(`ev:${i}`));
    S.event = null; S.mode = "explore";
  };

  // ---------------------------------------------------------------- データ：病を持つのはベルナだけ
  if (!(M && M.CARRIERS.length === 1 && D.ENEMIES[M.CARRIERS[0]])) f("病を持つ者の表が無い");
  for (const [id, e] of Object.entries(D.ENEMIES)) {
    if (e.bite) f(`敵 ${id} に bite が残っている（病はうつさない）`);
    if (e.plague && !M.CARRIERS.includes(id)) f(`敵 ${id} が病を持っている（持つのは ${M.CARRIERS.join("・")} だけ）`);
  }
  const spreads = (o) => !!o && (o.beast === "infect" || typeof o.beast === "number" || !!o.plague || spreads(o.win));
  for (const e of D.EVENTS) e.choices.forEach((c, i) => {
    if (![c.ok, c.ng, { win: c.win }].some(spreads)) return;
    // 段を進めるだけ（もうかかっている者にしか起きない）の出来事は除く
    const onlySick = e.cond && !e.cond({ beast: 0, sanity: 100, flags: {}, inv: {}, day: 99, phase: 9, gold: 9999, conds: [], companions: [] });
    if (!M.EVENTS.includes(e.id) && !onlySick) f(`出来事 ${e.id}[${i}] から病がうつる（うつしてよいのは ${M.EVENTS.join("・")}）`);
  });
  for (const [k, t] of Object.entries(D.M5.TOLL.choice)) if (t.beast) f(`代償の表 ${k} で病がうつる`);
  for (const id of M.EVENTS) if (!D.EVENTS.some((e) => e.id === id)) f(`出来事 ${id} が無い`);
  if (!D.EVENTS.find((e) => e.id === "e2_berna_clinic").choices.some((c) => c.ok && c.ok.plague)) f("ベルナの天幕で病がうつる選択肢が無い");
  // 見せない言葉・病の仕組みを説明しない
  const BANNED = /見世物|観客|客席|舞台|台本|赤牙病|疫医|使徒|モルドゥ/;
  const mine = JSON.stringify([M.INFECT, D.EVENTS.filter((e) => e.id.startsWith("m9_")), D.Q4 && D.Q4.BEAST_HINT, (D.LORE.beast || { lines: [] }).lines], (k, v) => (typeof v === "function" ? undefined : v));
  if (BANNED.test(mine)) f(`プレイヤーに見える文に書かない言葉がある：${mine.match(BANNED)[0]}`);

  // ---------------------------------------------------------------- ふつうの敵からはうつらない
  let S = start(901);
  const biters = ["werewolf", "w1_beastpriest", "m5_feverfolk", "m5_remnant", "m5_nightwatch", "m5_oldbeast", "wolf"].filter((id) => D.ENEMIES[id]);
  for (let i = 0; i < 10; i++) biters.forEach((id) => takeHits(id));
  if (G.beastOf(S) > 0) f("ふつうの敵に傷を負わされて病がうつった");
  // 血吸いの指輪は、持っているだけではうつさない（かかっている者の病を早めるだけ）
  G.give("m5_bloodring"); G.equip("m5_bloodring");
  for (let d = 0; d < 120 && !S.over; d++) { G.passDays(1); G.endTurn(); }
  if (G.beastOf(S) > 0) f("血吸いの指輪を持っているだけで病がうつった");
  // 赤い酒・聖都の聖餐の杯・地下墓地の泉
  for (const [id, label] of [["m5_bloodwine", "ひと息に飲む"], ["w1_beastnight", "路地に落ちた聖餐の杯"], ["w1_bloodfont", "泉の血を飲む"]]) {
    if (!D.EVENTS.some((e) => e.id === id)) continue;
    choose(id, label, 0.01);
  }
  if (G.beastOf(S) > 0) f("血を飲む出来事で病がうつった");
  // 病の者（檻の男）に触れても、うつらない
  choose("m9_cage", "錠をねじ切る", 0.01);
  if (G.beastOf(S) > 0) f("檻の男に触れて病がうつった");

  // ---------------------------------------------------------------- ベルナからはうつる（一度の戦いで一段まで）
  S = start(902);
  let fights = 0;
  while (!G.beastOf(S) && fights < 40) { takeHits("e2_berna", 8); fights++; }
  if (G.beastOf(S) !== 1) f(`ベルナと戦ってもうつらないか、一度の戦いで二段以上進む（${G.beastOf(S)}）`);
  if (!(S.m9 && S.m9.from === "fight")) f("どこでうつったかが残らない");
  if (G.loreOf && !(G.loreOf(S).beast || []).includes("needle")) f("うつっても用語説明（針の跡）が開かない");
  takeHits("e2_berna", 8); takeHits("e2_berna", 8); takeHits("e2_berna", 8);
  if (G.beastOf(S) > 4) f("ベルナとの三度の戦いで、三段より多く進んだ");
  // 天幕で志願すると、針を刺される。薬は 1〜2 段を治す
  S = start(903);
  choose("e2_berna_clinic", "町の分の薬", 0.5);
  if (G.beastOf(S) !== 1) f("ベルナの天幕で志願しても病がうつらない");
  S.gold = 500;
  choose("e2_berna_clinic", "薬を買う", 0.5);
  if (G.beastOf(S) !== 0) f("ベルナの薬で 1 段の病が治らない");
  // 縄張りの針に触れる
  S = start(904);
  choose("m9_needles", "札を読む", 0.99);
  if (G.beastOf(S) !== 1) f("腐れ庭園の針に刺されても病がうつらない");
  S = start(905);
  choose("m9_needles", "札を読む", 0.01);
  if (G.beastOf(S) !== 0) f("針に触れずに札を読んだのに病がうつった");

  // ---------------------------------------------------------------- 古いセーブ：もうかかっている（S.m9・S.q4 が無い）
  S = start(906);
  S.beast = 2; delete S.m9; delete S.q4; S.m5.clock = 0;
  for (let d = 0; d < D.M5.DAYS_PER_STAGE; d++) { G.passDays(1); G.endTurn(); }
  if (G.beastOf(S) !== 3) f(`古いセーブの病が日が経っても進まない（${G.beastOf(S)}）`);
  S.beast = 1; S.gold = 500; S.loc = "karna"; S.mode = "explore"; S.fac = null;
  G.act("fac:church");
  if (!G.actions().flatMap((g) => g.list).some((a) => a.id === "m5:purge")) f("古いセーブで教会に祓いが出ない");
  G.act("m5:purge");
  if (G.beastOf(S) !== 0) f("古いセーブで祓えない");

  // ---------------------------------------------------------------- ランダムプレイで、ベルナに会わずにうつる回が無い
  let sick = 0;
  for (let g = 0; g < 60; g++) {
    S = start(3000 + g);
    const c = D.CLASSES[S.cls];
    D.STATS.forEach((k) => { S.stats[k] = c.base[k] + 5; S.caps[k] = S.stats[k] + 30; });
    S.maxHp = S.hp = G.maxHpOf(S.stats);
    try {
      for (let step = 0; step < 400 && !S.over; step++) {
        const a = G.actions().flatMap((x) => x.list).filter((x) => !x.disabled);
        if (!a.length) break;
        G.act(a[Math.floor(G.rand() * a.length)].id);
        if (G.beastOf(S) > 0 && !S.m9) { f(`game ${g}: ベルナに会わずに病がうつった（手番 ${S.turn}）`); break; }
      }
    } catch (e) { f(`game ${g}: 例外 ${e.stack || e}`); }
    if (S.m9) sick++;
  }
  console.log(`NOTE M9 ランダムプレイ 60 回：ベルナからうつった ${sick}`);

  if (!bad) ok(`M9 獣の病はベルナだけ（ふつうの敵 ${biters.length} 種・血の出来事・指輪・檻の男ではうつらない／戦い・天幕・針でうつる・一度の戦いで一段まで／古いセーブも進む・祓える）`);
};
