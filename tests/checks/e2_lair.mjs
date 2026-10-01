// E2：使徒の居城（src/engine/e2_lair.js）
// - 最奥に着くと、剣が無ければ戦わずに謁見になり、挑む選択肢は出ない。toEntrance で入口に戻る
// - 剣があれば挑めて、勝てば主の旗が立つ
// - 用語説明の行が書き足され、出来事で開く。主を倒すと M4 のその襲来が起きなくなる
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const lairs = Object.entries(D.LOCS).filter(([, L]) => L.lair);
  if (!lairs.length) fail("居城の迷宮が無い");
  const start = (id) => {
    const L = D.LOCS[id];
    G.rand = seeded(11);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.maxHp = G.S.hp = 999;
    G.arrive(id);
    G.S.depth = L.floors - 1;
    G.exploreAct("deeper");
  };
  for (const [id, L] of lairs) {
    const ev = D.EVENTS.find((e) => e.id === L.lair.event);
    if (!ev) { fail(`${id}: 謁見の出来事 ${L.lair.event} が無い`); continue; }
    if (!D.ENEMIES[L.boss].majin) fail(`${id}: 居城の主 ${L.boss} が使徒でない`);
    if (ev.w) fail(`${id}: 謁見の出来事はたまたま起きてはいけない（w: 0）`);
    const fight = ev.choices.filter((c) => c.fight === L.boss);
    if (fight.length !== 1 || !fight[0].cond || fight[0].win?.flag !== L.reward.flag) fail(`${id}: 挑む選択肢は剣の条件つきで1つ、勝てば ${L.reward.flag}`);
    if (!ev.choices.some((c) => !c.cond && !c.stat && !c.fight)) fail(`${id}: 判定なしで関われる選択肢が無い`);
    // 剣が無ければ、戦わずに謁見になり、挑む選択肢は出ない
    start(id);
    if (G.S.mode !== "event" || G.S.event !== ev.id) fail(`${id}: 最奥で謁見が始まらない（mode=${G.S.mode}）`);
    if (G.eventChoices().some(({ c }) => c.fight === L.boss)) fail(`${id}: 剣が無いのに挑めてしまう`);
    if (ev.lore && !G.loreOf(G.S)[String(ev.lore).split(":")[0]]) fail(`${id}: 謁見で用語 ${ev.lore} が開かない`);
    // 入口へ放り出される選択肢を選ぶと、深さが 0 に戻る
    const out = G.eventChoices().find(({ c }) => !c.stat && c.ok?.toEntrance);
    if (!out) fail(`${id}: 判定なしで入口に戻る選択肢が無い`);
    else { G.chooseEvent(out.i); if (G.S.depth !== 0) fail(`${id}: toEntrance で入口に戻らない`); }
    // 剣があれば挑めて、勝てば主の旗が立つ
    start(id);
    G.give("volgrim"); G.equip("volgrim");
    const fc = G.eventChoices().find(({ c }) => c.fight === L.boss);
    if (!fc) fail(`${id}: 剣があるのに挑めない`);
    else {
      G.chooseEvent(fc.i);
      if (G.S.mode !== "combat") fail(`${id}: 挑んでも戦闘にならない`);
      G.S.combat.foes.forEach((f) => { f.hp = 1; });
      for (let i = 0; i < 30 && G.S.combat; i++) G.combatAct("attack");
      if (!G.S.flags[L.reward.flag]) fail(`${id}: 主を倒しても ${L.reward.flag} が立たない`);
    }
  }
  // 用語説明の行が書き足されている（出来事の lore が指す行が全部ある）
  const lines = (id) => (D.LORE[id] ? D.LORE[id].lines.map((l) => l[0]) : []);
  const trig = [];
  D.EVENTS.filter((e) => e.id.startsWith("e2_")).forEach((e) => {
    trig.push(e.lore);
    e.choices.forEach((c) => [c.ok, c.ng, c.win].forEach((o) => o && trig.push(o.lore)));
  });
  trig.flat().filter(Boolean).forEach((t) => { const [id, k] = String(t).split(":"); if (!lines(id).includes(k || lines(id)[0])) fail(`E2 の用語 ${t} が D.LORE に無い`); });
  // 主を倒すと、その主の襲来は起きなくなる
  const R = D.M4 && D.M4.RAIDERS;
  if (R) {
    start("e2_kitchen");
    const W = { war: false, towns: {} };
    const before = [R.hunger.w(W, 400), R.rot.w(W, 400)];
    G.S.flags.e2_gormoa = true;
    G.S.flags.e2_mordu = true;
    if (!(before[0] > 0 && before[1] > 0) || R.hunger.w(W, 400) !== 0 || R.rot.w(W, 400) !== 0) fail("主を倒しても M4 の飢え・疫病の襲来が止まらない");
  }
  ok(`使徒の居城（${lairs.length} か所・剣が無ければ謁見・剣があれば挑める・用語 ${trig.flat().filter(Boolean).length}・倒せば襲来が止む）`);
};
