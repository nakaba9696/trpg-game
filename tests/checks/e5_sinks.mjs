// E5：余る消耗品の使い道と売り先・終盤の金の大きな出口（src/data/e5_sinks.js・src/engine/zzzzzzzzzzzzzzzzzzzzzzz_e5_sinks.js）
// 施設の「頼む・納める」が出て、品と金がちゃんと減り、名声・評判・善い行い・仲間の腕前と好感度・家に結びつく。古いセーブ（S.e5 が無い）でも動く。
// 入口：敵の落とす確率が D.E5.trim だけ下がり、出来事の結果の品が間引かれ、店で買う分は減らない。釣り合いの数字は tests/checks/t5_economy.mjs
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const E = D.E5;
  if (!E || !G.e5) { fail("e5_sinks：D.E5 か G.e5 が無い"); return; }

  // ---------------------------------------------------------------- データ
  for (const id of Object.keys(E.trim)) if (!D.ITEMS[id]) fail(`e5_sinks：trim に知らない品 ${id}`);
  for (const id of E.camp.food) if (!D.ITEMS[id] || !D.ITEMS[id].hp) fail(`e5_sinks：野営の食べ物 ${id} が無いか、HP が戻らない`);
  if (!D.ITEMS.holywater || !D.ITEMS.potion) fail("e5_sinks：聖水か回復薬が無い");
  // 調合で得をしない（薬草を買って調合すると、回復薬を買うより高い）
  if (D.ITEMS.herb.price * E.brew.herb + E.brew.fee <= D.ITEMS.potion.price) fail("e5_sinks：薬草を買って調合すると、回復薬を買うより安い");
  // 売り先で得をしない（買った値より高く売れない）
  if (E.infirm.price >= D.ITEMS.herb.price) fail("e5_sinks：施療院の買い値が店の売り値以上");
  if (E.academy.mana >= D.ITEMS.manawater.price) fail("e5_sinks：学院の買い値が店の売り値以上");
  if (E.holy.mana * D.ITEMS.manawater.price <= D.ITEMS.holywater.price) fail("e5_sinks：魔力の水を買って聖水にすると、聖水を買うより安い");
  // 敵の落とし物の確率が下がっている（ゴブリンの薬草など、もとの表より低い）
  const loot = (e, id) => ((e.loot || []).find((x) => x[0] === id) || [])[1];
  const anyHerb = Object.values(D.ENEMIES).find((e) => loot(e, "herb"));
  if (!anyHerb || !anyHerb._e5) fail("e5_sinks：敵の落とし物に印（_e5）が付いていない");
  if (Object.values(D.ENEMIES).some((e) => (e.loot || []).some((x) => !(x[1] > 0)))) fail("e5_sinks：落とす確率が 0 以下になった落とし物がある");

  // ---------------------------------------------------------------- 遊んで確かめる
  const town = Object.keys(D.LOCS).find((k) => { const L = D.LOCS[k]; return L.type === "town" && !L.capital && ["church", "shop", "tavern", "inn"].every((f) => (L.fac || []).includes(f)) && G.nationOf(k); });
  if (!town) { fail("e5_sinks：教会・店・酒場・宿のそろった町が無い"); return; }
  G.rand = seeded(5150);
  G.P = { trophies: {}, graves: [] };
  const c0 = Object.keys(D.CLASSES)[0];
  const { stats, caps } = G.cre.quickStats(c0, G.rand);
  G.newGame({ cls: c0, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "測定", sex: "女", age: 22, history: "測定用", personality: "無口" } });
  const S = G.S;
  delete S.e5; // 古いセーブ
  S.loc = town; S.mode = "explore"; S.event = null; S.combat = null;
  const ids = () => G.actions().flatMap((g) => g.list).filter((a) => !a.disabled).map((a) => a.id);
  const has = (id) => ids().includes(id);
  const enter = (f) => { S.mode = "explore"; S.fac = null; G.act("fac:" + f); if (S.mode !== "fac" || S.fac !== f) fail(`e5_sinks：${f} に入れない`); };

  // 店：調合と、仲間の武具
  S.inv.herb = 9; S.gold = 2000;
  G.addCompanion({ name: "傭兵のハンス", cls: "傭兵", power: 30, dmg: [1, 6, 1] });
  const comp = S.companions[S.companions.length - 1];
  enter("shop");
  const pot0 = S.inv.potion || 0;
  if (!has("e5:brew")) fail("e5_sinks：薬草があるのに、店に調合が出ない");
  else { G.act("e5:brew"); if (S.inv.herb !== 9 - E.brew.herb || (S.inv.potion || 0) !== pot0 + 1) fail(`e5_sinks：調合の品の増減が違う（薬草 ${S.inv.herb}・回復薬 ${S.inv.potion}）`); }
  const gid = "e5:gear:" + (S.companions.length - 1);
  const p0 = comp.power, g0 = S.gold;
  if (!has(gid)) fail("e5_sinks：店に仲間の武具が出ない");
  else { G.act(gid); if (comp.power !== p0 + E.gear.power || comp.e5gear !== 1 || S.gold !== g0 - E.gear.cost[0]) fail(`e5_sinks：誂えた結果が違う（腕前 ${p0}→${comp.power}・${g0}→${S.gold}G）`); }

  // 教会：施療院・孤児院・聖水・普請
  enter("church");
  S.inv.herb = 12; S.inv.manawater = 4; S.inv.jerky = 6; S.inv.riceball = 3;
  const g1 = S.gold;
  G.act("e5:infsell");
  if (S.inv.herb !== 12 - E.infirm.sell || S.gold !== g1 + E.infirm.sell * E.infirm.price) fail(`e5_sinks：施療院の買い取りが違う（薬草 ${S.inv.herb}・${g1}→${S.gold}G）`);
  const v0 = S.virtue || 0;
  G.act("e5:infgive");
  if (S.inv.herb !== 12 - E.infirm.sell - E.infirm.give || (S.virtue || 0) !== v0 + 1) fail(`e5_sinks：施療院に納めた結果が違う（薬草 ${S.inv.herb}・善い行い ${v0}→${S.virtue}）`);
  if (has("e5:infsell")) fail("e5_sinks：一日の上限を越えて施療院が薬草を買う");
  const food0 = G.e5.foodCount(S);
  const rep0 = G.repOf(G.nationOf()).rep;
  G.act("e5:orphan");
  if (G.e5.foodCount(S) !== food0 - Math.min(E.orphan.max, food0) || G.repOf(G.nationOf()).rep < rep0 + E.orphan.rep) fail(`e5_sinks：孤児院に届けた結果が違う（食べ物 ${food0}→${G.e5.foodCount(S)}）`);
  if (has("e5:orphan")) fail("e5_sinks：孤児院に一日に二度届けられる");
  const hw0 = S.inv.holywater || 0;
  G.act("e5:holy");
  if ((S.inv.manawater || 0) !== 4 - E.holy.mana || (S.inv.holywater || 0) !== hw0 + 1) fail("e5_sinks：聖水にしてもらった結果が違う");
  const f0 = S.fame, g2 = S.gold, r1 = G.repOf(G.nationOf()).rep;
  G.act("e5:build");
  if (S.gold !== g2 - E.build.cost[0] || S.fame !== f0 + E.build.fame[0] || G.repOf(G.nationOf()).rep < r1 + E.build.fame[0] + E.build.rep[0] || S.e5.build[town] !== 1) fail(`e5_sinks：普請の寄進の結果が違う（${g2}→${S.gold}G・名声 ${f0}→${S.fame}）`);
  if (has("e5:build")) fail("e5_sinks：普請に一日に二度寄進できる");

  // 酒場：宴と賽子
  enter("tavern");
  S.inv.m7_chipdie = 1;
  const b0 = comp.bond, f1 = S.fame, g3 = S.gold, t0 = S.turn;
  G.act("e5:feast");
  if (S.gold !== g3 - E.feast.cost || S.fame < f1 + E.feast.fame) fail(`e5_sinks：宴の結果が違う（${g3}→${S.gold}G・名声 ${f1}→${S.fame}）`);
  if (comp.bond < b0) fail("e5_sinks：宴で仲間の好感度が下がった");
  if (has("e5:feast")) fail("e5_sinks：宴を続けて開ける");
  G.act("e5:dice");
  if (S.inv.m7_chipdie) fail("e5_sinks：欠けた賽子が売れない");
  void t0;

  // 宿：空き家を買う → 直す → 家で休む
  enter("inn");
  const g4 = S.gold;
  if (!has("e5:house")) fail("e5_sinks：宿に空き家が出ない");
  else {
    G.act("e5:house");
    if (S.gold !== g4 - E.home.cost || !S.e5.home || S.e5.home.loc !== town) fail(`e5_sinks：家を買った結果が違う（${g4}→${S.gold}G）`);
    if (!S.chronicle.some((x) => /家を持つ/.test(x.text))) fail("e5_sinks：家を持ったことが年表に残らない");
    if (has("e5:house")) fail("e5_sinks：家のある町で、また空き家を買える");
    S.gold = 5000;
    G.act("e5:fix");
    if (S.e5.home.lv !== 1) fail("e5_sinks：家を直せない");
    G.act("back");
    S.hp = 1; S.mp = 0; S.conds.push("毒");
    const g5 = S.gold, d0 = S.day;
    if (!has("e5home:rest")) fail("e5_sinks：家のある町で「家に帰って休む」が出ない");
    else {
      G.act("e5home:rest");
      if (S.hp !== S.maxHp || S.mp !== S.maxMp || S.conds.includes("毒") || S.gold !== g5 || S.day <= d0) fail(`e5_sinks：家で休んだ結果が違う（HP ${S.hp}/${S.maxHp}・${g5}→${S.gold}G・日 ${d0}→${S.day}）`);
    }
  }

  // 野営：食べ物を一つ食べる
  const wild = Object.keys(D.LOCS).find((k) => D.LOCS[k].type === "wild");
  S.loc = wild; S.mode = "explore"; S.fac = null;
  S.inv.jerky = 3; S.hp = 1;
  G.rand = () => 0.99; // 夜襲なし
  G.act("camp");
  if (S.inv.jerky !== 2) fail(`e5_sinks：野営で食べ物を食べない（干し肉 ${S.inv.jerky}）`);

  // 旅の道中：二日以上の旅で、晩ごとに食べ物を一つ（非常用は残す）
  const leg = Object.keys(D.LOCS).map((k) => [k, Object.entries(D.LOCS[k].links || {}).find(([, d]) => d >= 3)]).find(([, x]) => x);
  if (leg) {
    S.loc = leg[0]; S.mode = "explore"; S.fac = null; S.travel = null; E.camp.food.forEach((id) => delete S.inv[id]); S.inv.jerky = 6;
    const d1 = S.day;
    G.act("travel:" + leg[1][0]);
    const days = S.day - d1, want = 6 - Math.min(days - 1, 6 - E.road.keep);
    if (days >= 2 && S.inv.jerky !== want) fail(`e5_sinks：${days} 日の旅で干し肉が ${S.inv.jerky}（${want} のはず）`);
    S.mode = "explore"; S.combat = null; S.event = null; S.travel = null; S.w6 = null;
  }

  // 施療院は回復薬も買い取る（一日の上限まで）
  S.loc = town; S.inv.potion = 5;
  enter("church");
  const g6 = S.gold;
  for (let i = 0; i < 5; i++) if (has("e5:infpot")) G.act("e5:infpot");
  if (S.inv.potion !== 5 - E.infirmPotion.max || S.gold !== g6 + E.infirmPotion.max * E.infirmPotion.price) fail(`e5_sinks：施療院の回復薬の買い取りが違う（回復薬 ${S.inv.potion}・${g6}→${S.gold}G）`);
  G.act("back");

  // 出来事の結果の品の間引き（施設の外）・店で買う分は減らない
  S.mode = "explore";
  let got = 0;
  G.rand = seeded(77);
  for (let i = 0; i < 200; i++) { const a = S.inv.herb || 0; G.apply({ item: { herb: 1 } }); got += (S.inv.herb || 0) - a; }
  if (got < 200 * (1 - E.trim.herb) * 0.7 || got > 200 * (1 - E.trim.herb) * 1.3) fail(`e5_sinks：出来事の薬草の間引きが D.E5.trim と合わない（200 回で ${got}）`);
  S.mode = "fac";
  const a1 = S.inv.herb || 0;
  for (let i = 0; i < 20; i++) G.apply({ item: { herb: 1 } });
  if ((S.inv.herb || 0) - a1 !== 20) fail("e5_sinks：施設の中でもらった品まで間引かれる");

  // 出来事の型：飢えた子に食べ物を分ける（C10 の型に足した）
  const tp = (D.C10_TPL || []).find((t) => t.slot === "e5food");
  if (!tp) fail("e5_sinks：食べ物を分ける型が C10_TPL に無い");
  S.mode = "explore"; S.inv.jerky = 5;
  G.apply({ e5feed: 2 });
  if (S.inv.jerky !== 3) fail(`e5_sinks：e5feed で食べ物が減らない（干し肉 ${S.inv.jerky}）`);

  // 保存と読み込みを JSON に通しても残る
  const back = JSON.parse(JSON.stringify(S));
  if (!back.e5 || !back.e5.home || back.e5.build[town] !== 1) fail("e5_sinks：セーブに家と普請が残らない");

  ok(`e5_sinks: ${D.LOCS[town].name}で調合・武具・施療院・孤児院・聖水・普請・宴・賽子・家・野営・旅の食事・間引き`);
};
