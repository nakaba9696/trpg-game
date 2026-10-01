// C1：持ち主の決定（#39・#50・#51）
// - 二振りの剣に代償は無い：魔人を斬っても、代償の状態が増えない
// - 銃は遺物のレア物：店の品揃えに出ない。手に入る所は限られる。撃つと弾が減り、弾が無ければ撃てず、絶界には効かない
// - 光の壁：触れたあと「ここで物語を終える／旅を続ける」を選べる。続けたあと、別の節目でも終えられる
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let failures = 0;
  const fail = (m) => { failures++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const start = (seed, goal) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 60]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[seed % 5], stats, caps, goal: goal || "sword",
      profile: { name: "テスト", sex: "女", age: "22", history: "", personality: "無口" } });
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  const majinId = Object.keys(D.ENEMIES).find((id) => D.ENEMIES[id].majin && !D.ENEMIES[id].boss) || Object.keys(D.ENEMIES).find((id) => D.ENEMIES[id].majin);

  // ---- #39 二振りの剣に代償なし
  {
    for (const k of ["volgrim", "byakuya"]) {
      const it = D.ITEMS[k];
      if (it.toll || it.curse || it.cursed) fail(`${it.name}に代償の印がある`);
      const S = start(11 + k.length);
      G.give(k); G.equip(k);
      if (S.weapon !== k) { fail(`${it.name}を装備できない`); continue; }
      const keys0 = new Set(Object.keys(S));
      const comp0 = JSON.stringify((S.companions || []).map((c) => c.bond));
      const chron0 = S.chronicle.length;
      for (let i = 0; i < 6 && !S.over; i++) {
        G.startCombat([majinId], {});
        for (let r = 0; r < 40 && S.mode === "combat" && !S.over; r++) { S.hp = S.maxHp; G.act("cb:attack"); }
        S.mode = "explore"; S.combat = null;
      }
      const added = Object.keys(S).filter((x) => !keys0.has(x) && /hunger|white|volgrim|byakuya|edge|bleach/i.test(x));
      if (added.length) fail(`${it.name}で魔人を斬ると代償の状態が増える：${added.join("・")}`);
      if (JSON.stringify((S.companions || []).map((c) => c.bond)) !== comp0) fail(`${it.name}で斬ると仲間の好感度が変わる`);
      if (S.chronicle.slice(chron0).some((c) => /―{2,}|黒塗り/.test(c.text || ""))) fail(`${it.name}で斬ると年表が黒塗りになる`);
    }
  }

  // ---- #50 銃は遺物のレア物
  const guns = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].gun);
  {
    if (guns.length < 1) fail("銃が無い");
    const ammo = guns.map((id) => D.ITEMS[id].gun.ammo);
    for (const id of [...guns, ...ammo]) {
      if (!D.ITEMS[id]) { fail(`弾 ${id} が無い`); continue; }
      if (D.SHOP_BASE.includes(id)) fail(`${D.ITEMS[id].name}が店の決まった品揃えにある`);
      for (const [lid, L] of Object.entries(D.LOCS)) if ((L.shop || []).includes(id)) fail(`${D.ITEMS[id].name}が ${L.name} の店にある`);
    }
    // 手に入る所：出来事の結果と敵の落とし物を数える（限られていること）
    const from = new Set();
    const scan = (o, where) => { if (!o) return; const items = typeof o.item === "string" ? [o.item] : Object.keys(o.item || {}); for (const it of items) if (guns.includes(it)) from.add(where); scan(o.win, where); };
    for (const e of D.EVENTS) for (const c of e.choices || []) { scan(c.ok, e.id); scan(c.ng, e.id); }
    for (const [lid, L] of Object.entries(D.LOCS)) if (L.reward && guns.includes(L.reward.item)) from.add(lid);
    for (const [eid, e] of Object.entries(D.ENEMIES)) for (const [it] of e.loot || []) if (guns.includes(it)) from.add(eid);
    for (const id of guns) if (![...from].length) fail(`${D.ITEMS[id].name}の手に入る所が無い`);
    if (from.size > 6) fail(`銃の手に入る所が多すぎる（${from.size}：${[...from].join("・")}）`);
    for (const id of guns) {
      const ev = D.EVENTS.filter((e) => (e.choices || []).some((c) => [c.ok, c.ng].some((o) => o && o.item && (o.item === id || o.item[id]))));
      if (ev.some((e) => e.w > 3)) fail(`${D.ITEMS[id].name}の出来事が起きやすすぎる`);
      if (!/[。]/.test(D.ITEMS[id].desc || "")) fail(`${D.ITEMS[id].name}に説明文が無い`);
    }
    // 町の店の画面に出ない
    {
      const S = start(31);
      const town = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && (D.LOCS[id].fac || []).includes("shop"));
      S.loc = town; S.gold = 99999; S.mode = "explore";
      G.exploreAct("fac", "shop", {});
      const ids = G.actions().flatMap((g) => g.list).map((a) => a.id);
      if (ids.some((x) => guns.some((g) => x === "shop:buy:" + g))) fail("銃が店で買える");
    }
    // 撃つ
    {
      const S = start(41);
      const id = guns[0];
      const ammo = D.ITEMS[id].gun.ammo;
      S.loc = Object.keys(D.LOCS).find((l) => D.LOCS[l].type === "wild") || S.loc;
      G.startCombat(["goblin"], {});
      let list = G.actions().flatMap((g) => g.list);
      if (list.some((a) => a.id.startsWith("cb:c1shot:"))) fail("銃を持っていないのに撃てる");
      G.give(id); G.give(ammo, 2);
      list = G.actions().flatMap((g) => g.list);
      const shot = list.find((a) => a.id === "cb:c1shot:" + id);
      if (!shot || shot.disabled) fail("銃と弾があるのに撃てない");
      else {
        const kills = S.counters.kills;
        G.act(shot.id);
        if (G.count(ammo) !== 1) fail(`撃っても弾が減らない（${G.count(ammo)}）`);
        if (S.mode === "combat" && G.alive().length) { G.act(shot.id); }
        if (G.count(ammo) !== 0 && S.mode === "combat") fail("二発目で弾が無くならない");
        if (S.mode === "combat") {
          const again = G.actions().flatMap((g) => g.list).find((a) => a.id === shot.id);
          if (again && !again.disabled) fail("弾が無いのに撃てる");
        } else if (S.counters.kills <= kills && !S.over) fail("撃って戦闘が終わったのに倒した数が増えない");
      }
      // 絶界には効かない（何度撃っても魔人は傷つかない）
      S.combat = null; S.mode = "explore";
      G.give(ammo, 30);
      G.startCombat([majinId], {});
      const foe = S.combat.foes[0];
      const hp0 = foe.hp;
      for (let i = 0; i < 10 && S.mode === "combat" && !S.over; i++) { S.hp = S.maxHp; G.act("cb:c1shot:" + id); }
      if (foe.hp !== hp0) fail(`銃で魔人に傷が入る（${hp0}→${foe.hp}）`);
    }
  }

  // ---- #51 光の壁のあとも旅を続けられる
  {
    const S = start(51);
    S.loc = "nerva";
    G.startEvent("m6_wall");
    G.chooseEvent(0);
    if (S.event !== "m6_wall_touch") fail("光の壁：触れたあと尋ねられない");
    const labels = G.actions().flatMap((g) => g.list).map((a) => a.label);
    if (!labels.includes("ここで物語を終える") || !labels.includes("旅を続ける")) fail(`光の壁：「ここで物語を終える／旅を続ける」が無い（${labels.join("・")}）`);
    const day = S.day;
    G.chooseEvent(1);
    if (S.over) fail("光の壁：旅を続けたのに終わる");
    if (!(S.day > day)) fail("光の壁：戻る船旅の日が過ぎない");
    if (!S.flags.m6_wall_touched) fail("光の壁：触れて戻った印が無い");
    if (S.mode === "event") S.mode = "explore";
    G.endTurn();
    if (S.over) fail("光の壁：続けたあとの手番で終わる");
    if (S.m6 && S.m6.pending === "wall_back") fail("光の壁：続けたのに、すぐまた尋ねられる");
    const best = G.m6Best(S);
    if (!best || best.id === "wall") fail(`光の壁：戻ったあと、光の壁のまま終わる（${best && best.id}）`);
    // 一年たって、別の節目で終える
    S.day = 400; G.endTurn();
    if (!(S.m6.reached.year !== undefined)) fail("光の壁：続けたあと、別の節目（一年）に着かない");
    G.retire();
    if (S.over !== "end" || !S.ending || S.ending.id === "wall") fail(`光の壁：続けたあと、別の節目で終えられない（${S.over}・${S.ending && S.ending.id}）`);
    if (!S.story || !S.story.epitaph) fail("光の壁：続けたあとに終えても、人生の物語が無い");
    if (S.chronicle.some((c) => /見世物|観客|客席|舞台|台本/.test(c.text || ""))) fail("光の壁：見せない言葉が年表にある");
  }

  if (!failures) ok(`C1：剣に代償なし・銃 ${guns.length} 種は店に無い遺物・光の壁のあとも旅を続けられる`);
};
