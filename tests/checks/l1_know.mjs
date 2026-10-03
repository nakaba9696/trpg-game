// L1：覚え書きと記録（死んで覚えるのはプレイヤー）。engine/zzz_know_l1.js・data/know_l1*.js
// - 覚え書きの数（魔物・罠は 30 以上）と表の整合。魔物の書きつけの弱点がデータと食い違わない。罠は出来事として表に入る
// - 死ぬと、死に際に覚えたことが一つ以上と、最期の様子（何で死んだか・そのとき何が起きていたか）が墓碑に残る
// - 出来事でどれを選んで何が起きたか（成功・失敗・死んだ）、戦って試した手、店の品と値段が、冒険をまたいで残る。図鑑の魔物の頁に出る
// - 覚えていても仕組みの上では得をしない（成功率・選択肢・敵の強さが同じ）
// - 周回でぶれない：罠は毎回同じ階で、同じ前触れ・同じ並びの選択肢
// - 図鑑の数（G.knowCount）と、古いセーブ（S.kn が無い）・古い profile（G.P.know などが無い）で動く
export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  const D0 = G0.data;
  let n = 0;
  const F = (m) => { n++; fail("l1: " + m); };

  // ---------------------------------------------------------------- 表
  const c0 = G0.knowCount();
  for (const k of ["foe", "trap"]) if (!(c0.kinds[k].all >= 30)) F(`${k} の覚え書きが ${c0.kinds[k].all} 件（30 件以上にする）`);
  if (!(c0.kinds.apostle.all >= 10)) F("使徒の覚え書きが少ない");
  const TRUE = { magic: (e) => e.mres < e.def || e.mres <= 0, blade: (e) => e.def <= e.mres || e.def <= 5, talk: (e) => e.will < 999 && e.will <= 60, flee: (e) => e.agi <= 35, habit: () => true };
  for (const [id, k] of Object.entries(D0.KNOW)) {
    if (!k.text || typeof k.text !== "string") F(`${id}: text が無い`);
    if (k.kind === "foe") {
      const e = D0.ENEMIES[k.foe];
      if (!e) F(`${id}: 敵 ${k.foe} が無い`);
      else if (!TRUE[k.aim]) F(`${id}: aim ${k.aim} が無い`);
      else if (!TRUE[k.aim](e)) F(`${id}: 書きつけの弱点（${k.aim}）が敵のデータと食い違う（守り ${e.def}・魔法の守り ${e.mres}・意志 ${e.will}・素早さ ${e.agi}）`);
    } else if (k.kind === "trap") {
      const L = D0.LOCS[k.loc];
      if (!L || L.type !== "dungeon" || !(k.floor >= 1 && k.floor < L.floors)) F(`${id}: 迷宮 ${k.loc} の地下${k.floor}階が無い`);
      for (const f of ["sign", "safe", "wrong", "spring", "dodge", "avoid"]) if (!k[f]) F(`${id}: ${f} が無い`);
      if (/覚えて|前の冒険|前にそう/.test(k.avoid || "")) F(`${id}: avoid がキャラの記憶で避けている（覚えるのはプレイヤー）`);
      const ev = D0.EVENTS.find((e) => e.id === G0.l1.trapEventId(id));
      if (!ev || ev.w !== 0 || ev.choices.length !== 3) F(`${id}: 罠の出来事が無い`);
    } else if (k.kind === "apostle") { if (!(D0.E3 && D0.E3.LIST[k.ap])) F(`${id}: 使徒 ${k.ap} が無い`); }
    else F(`${id}: 種類 ${k.kind} が無い`);
  }
  const traps = Object.keys(D0.KNOW).filter((id) => D0.KNOW[id].kind === "trap");
  if (new Set(traps.map((id) => D0.KNOW[id].loc + ":" + D0.KNOW[id].floor)).size !== traps.length) F("同じ階に罠が二つある");

  const start = (G, seed, cls) => {
    const D = G.data;
    G.rand = seeded(seed);
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 45; caps[k] = 70; });
    G.newGame({ cls: cls || Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "覚え", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const acts = (G) => G.actions().flatMap((g) => g.list);

  // ---------------------------------------------------------------- 死ぬと残る（覚え書き・最期の様子）
  {
    const G = loadEngine();
    G.P = { trophies: {}, graves: [] }; // 古い profile
    start(G, 11);
    G.S.maxHp = G.S.hp = 5;
    G.S.clungUsed = true;
    G.startCombat(["slime"], {});
    G.combatAct("attack");
    G.hurt(99, "テストで倒れた");
    const g = G.P.graves[0];
    if (G.S.over !== "dead") F("死ななかった");
    if (!G.knowHas("foe_slime")) F(`死に際に、その場の敵（酸のスライム）を覚えない：${Object.keys(G.P.know || {}).join(",")}`);
    if (!(g && g.know && g.know.some((x) => x.death))) F("墓碑に死に際に覚えたことが無い");
    const last = G.lastOfRun(g);
    if (!last || last.cause !== "テストで倒れた" || !last.foes.length || !last.foes[0].name.includes("スライム") || !last.lines.length) F(`墓碑に最期の様子が無い：${JSON.stringify(last)}`);
    if (!((G.P.kfoe.slime || {}).slew >= 1)) F("あなたを倒した敵の記録が無い");
    if (!((G.P.kfoe.slime || {}).a.attack || [])[0]) F("試した手の記録が無い");
    if (!G.codexFoeStats("slime").some(([k]) => k === "試した手")) F("図鑑の魔物の頁に試した手が出ない");
    if (!G.codexFoeStats("slime").some(([k, v]) => k === "覚え書き" && v === G.data.KNOW.foe_slime.text)) F("図鑑の魔物の頁に覚え書きが出ない");
    // 何も関係ない死に方でも、一つは残す
    start(G, 12);
    const n0 = Object.keys(G.P.know).length;
    G.die("テストの寿命");
    if (Object.keys(G.P.know).length !== n0 + 1) F("関係ない死に方で、覚え書きが一つ残らない");
    if (!G.P.graves[0].know.some((x) => x.death)) F("関係ない死に方の墓碑に、死に際に覚えたことが無い");
  }

  // ---------------------------------------------------------------- 出来事の記録・店の記録・得をしないこと
  {
    const G = loadEngine();
    const D = G.data;
    G.P = { trophies: {}, graves: [] };
    start(G, 21);
    const trapEv = D.EVENTS.find((e) => e.id === "trap");
    G.S.stats.知力 = 5; G.S.maxHp = G.S.hp = 999;
    for (let i = 0; i < 12; i++) { G.startEvent(trapEv); G.act("ev:0"); }
    const r = (G.P.kev.trap || {})[0];
    if (!r || r.n !== 12 || r.ok + r.ng !== 12 || !r.ng) F(`出来事の結果が記録されない：${JSON.stringify(r)}`);
    // 選んで死ぬと「死んだ」の印
    G.S.hp = 1; G.S.clungUsed = true;
    const deadly = D.EVENTS.find((e) => e.choices.some((c) => !c.stat && !c.fight && !c.cost && !c.cond && c.ok && c.ok.hp <= -5) && !e.cond && !e.once);
    if (deadly) {
      const i = deadly.choices.findIndex((c) => !c.stat && !c.fight && !c.cost && !c.cond && c.ok && c.ok.hp <= -5);
      G.startEvent(deadly);
      G.act("ev:" + i);
      if (G.S.over !== "dead") F(`${deadly.id} を選んでも死なない`);
      else if (!((G.P.kev[deadly.id] || {})[i] || {}).dead) F("選んで死んだ出来事に印が付かない");
      else if (!(G.lastOfRun(G.P.graves[0]).event || {}).title) F("最期の様子に直前の出来事が無い");
    }
    // 店
    start(G, 22);
    const town = Object.keys(D.LOCS).find((l) => (D.LOCS[l].fac || []).includes("shop"));
    G.S.loc = town;
    G.exploreAct("fac", "shop");
    if (!Object.keys(((G.P.kshop || {})[town] || {}).items || {}).length) F("店の品と値段が記録されない");
    // 覚えていても得をしない：成功率・選択肢・敵の強さが同じ
    G.P.know = {};
    start(G, 23);
    G.startCombat(["mimic"], {});
    const p0 = [G.cb.attack(), G.cb.fire(), JSON.stringify(G.foeData(G.S.combat.foes[0]))];
    G.P.know = Object.fromEntries(Object.keys(D.KNOW).map((id) => [id, { how: "seen" }]));
    const p1 = [G.cb.attack(), G.cb.fire(), JSON.stringify(G.foeData(G.S.combat.foes[0]))];
    if (JSON.stringify(p0) !== JSON.stringify(p1)) F("覚え書きで戦闘の成功率か敵の強さが変わる");
    G.S.combat = null; G.S.mode = "explore";
    G.startEvent(trapEv);
    const nAll = acts(G).length;
    G.P.know = {};
    if (acts(G).length !== nAll) F("覚え書きで出来事の選択肢が変わる");
  }

  // ---------------------------------------------------------------- 周回でぶれない：罠
  {
    const id = traps[0];
    const T = D0.KNOW[id];
    const meet = (seed) => {
      const G = loadEngine();
      G.P = { trophies: {}, graves: [] };
      start(G, seed);
      G.S.loc = T.loc; G.S.maxHp = G.S.hp = 999;
      for (let i = 0; i < 40; i++) {
        G.S.mode = "explore"; G.S.combat = null; G.S.event = null; G.S.depth = T.floor - 1;
        G.exploreAct("deeper");
        if (G.S.event === G.l1.trapEventId(id)) return { text: G.data.EVENTS.find((e) => e.id === G.S.event).text, labels: acts(G).map((a) => a.label).join("/") };
      }
      return null;
    };
    const a = meet(101), b = meet(202);
    if (!a || !b) F(`罠の階 ${id} で罠が起きない`);
    else if (a.text !== b.text || a.labels !== b.labels) F(`罠の前触れか選択肢の並びが周回でぶれる：${a.labels} / ${b.labels}`);
    const G = loadEngine();
    G.P = { trophies: {}, graves: [] };
    const safeIdx = traps.map((t) => G.data.EVENTS.find((e) => e.id === G.l1.trapEventId(t)).choices.findIndex((c) => c.label === D0.KNOW[t].safe));
    if (new Set(safeIdx).size < 2) F("罠の正しい手が、いつも同じ位置にある");
    // 罠の結果が覚え書きに残る
    start(G, 33);
    G.S.maxHp = G.S.hp = 999;
    G.startEvent(G.l1.trapEventId(id));
    const wrong = acts(G).find((x) => x.label === T.wrong);
    G.act(wrong.id);
    if (G.S.hp >= 999) F("罠の誘う手でダメージを受けない");
    if (!G.knowHas(id)) F("罠にかかっても覚え書きが残らない");
  }

  // ---------------------------------------------------------------- 図鑑の数・古いセーブ
  {
    const G = loadEngine();
    G.P = { trophies: {}, graves: [] };
    const c = G.knowCount();
    if (c.known !== 0 || c.all !== Object.keys(G.data.KNOW).length || c.events.known !== 0 || !(c.events.all > 100) || c.shops.known !== 0) F(`図鑑の数が変：${JSON.stringify(c)}`);
    G.P.know = { foe_goblin: { how: "seen" }, nope: { how: "seen" } };
    G.P.kev = { trap: { 0: { n: 1, ok: 1 } } };
    const c2 = G.knowCount();
    if (c2.known !== 1 || c2.kinds.foe.known !== 1 || c2.events.known !== 1) F("図鑑の埋まった数が変");
    if (G.knowList("foe").length !== 1) F("図鑑の一覧が変");
    start(G, 31);
    delete G.S.kn;
    G.S = JSON.parse(JSON.stringify(G.S));
    G.P = { trophies: {}, graves: [] };
    try {
      for (let i = 0; i < 400 && !G.S.over; i++) {
        const list = acts(G).filter((x) => !x.disabled);
        if (!list.length) break;
        G.act(list[Math.floor(G.rand() * list.length)].id);
      }
    } catch (e) { F("古いセーブで例外：" + e.message); }
  }

  if (!n) ok(`l1 覚え書きと記録（${Object.entries(c0.kinds).map(([k, v]) => `${k} ${v.all}`).join("・")}・出来事 ${c0.events.all}・店 ${c0.shops.all}）`);
};
