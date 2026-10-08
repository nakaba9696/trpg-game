// I5：兜・靴・盾を増やし、鎧を耐性と性格で分ける（src/data/items_i5_*.js・engine/zzzzzzzzzzzzzzz_i5_armor.js・ui/zi5_armor.js）
// - 部位ごとの数（兜・靴・盾は 15〜20、胴は 54 のまま）。どの防具にも手に入る道がある（店・日替わり・落とし物・出来事・褒美）
// - 鎧の耐性の形が重複しすぎない（同じ形は 2 つまで）。どの防具にも耐性の表の行がある（名前からの当て推量に頼らない）
// - 序盤の町の店に強すぎる物が並ばない（R6）
// - 仕組み：盾の受け・反撃（とどめは刺さない）・庇う、兜の大技と恐れと視界、靴の逃げ・旅・地形、着慣れ
// - 効き目の文と図鑑に、耐性の印と性格が出る。古いセーブ（頭・足・盾の欄が無い）でも動く
export default ({ fail, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const F = (m) => fail("I5: " + m);
  if (!G.i5 || !D.I5) return F("G.i5 か D.I5 が無い");
  const armor = Object.entries(D.ITEMS).filter(([, it]) => it.type === "armor");
  const by = (s) => armor.filter(([, it]) => it.slot === s).map(([id]) => id);

  // ---- 数
  for (const s of ["head", "feet", "off"]) { const n = by(s).length; if (n < 15 || n > 20) F(`${s} の品が ${n}（15〜20）`); }
  if (by("body").length < 54) F(`胴の鎧が ${by("body").length}（54 より減った）`);

  // ---- 手に入る道
  for (const [id] of armor) if (!G.codexItemWhere(id, 10).length) F(`${id}（${D.ITEMS[id].name}）に手に入る道が無い`);

  // ---- 耐性の形
  for (const [id, it] of armor) if (D.E12.ARMOR[id] == null) F(`${id}（${it.name}）に耐性の表の行が無い`);
  const shapes = new Map();
  for (const id of by("body")) {
    const k = Object.entries(G.e12.armorAff(D.ITEMS[id])).sort().map(([t, m]) => t + m).join(" ");
    shapes.set(k, [...(shapes.get(k) || []), id]);
  }
  for (const [k, ids] of shapes) if (ids.length > 2) F(`胴の鎧の耐性の形「${k}」が ${ids.length} つ（${ids.join("・")}）`);
  if (shapes.size < 45) F(`胴の鎧の耐性の形が ${shapes.size} 通りしかない`);
  // 弱点のある鎧が多い（ただ強いだけの鎧ばかりにしない）。弱点も強みも無い鎧は無い
  const weakN = by("body").filter((id) => Object.values(G.e12.armorAff(D.ITEMS[id])).some((m) => m > 1)).length;
  if (weakN < 35) F(`弱点のある胴の鎧が ${weakN}`);
  // 設定の筋：金属は雷に弱い・毛皮は炎に弱い・聖別の衣は闇に強い
  for (const id of ["chain", "plate", "i3a_hauberk", "i3a_fullplate", "i3a_blackiron"]) if (!(G.e12.armorAff(D.ITEMS[id]).bolt > 1)) F(`${id}（金属）が雷に弱くない`);
  for (const id of ["i3a_wolfpelt", "i3a_bearhide", "leather"]) if (!(G.e12.armorAff(D.ITEMS[id]).fire > 1)) F(`${id} が炎に弱くない`);
  for (const id of ["i3a_vestment", "i3a_monkrobe", "i5h_mitre", "i2s_holyshield"]) if (!(G.e12.armorAff(D.ITEMS[id]).dark < 1)) F(`${id}（聖別）が闇に強くない`);
  if (!(G.e12.armorAff(D.ITEMS.i3a_hardleather).bolt < 1)) F("硬革が雷に強くない");
  // 説明（由来）：新しい品にはどれも説明がある
  for (const [id, it] of armor) if (/^i5/.test(id) && !(it.flavor && it.flavor.length >= 40)) F(`${id} の説明が短い`);

  // すべての防具に説明（flavor：由来）と効き目の説明（desc）があり、図鑑で鎧・兜・靴・盾に分かれる
  for (const [id, it] of armor) {
    if (!(typeof it.flavor === "string" && it.flavor.length >= 40)) F(`${id}（${it.name}）に flavor が無い`);
    if (!(typeof it.desc === "string" && it.desc)) F(`${id}（${it.name}）に desc が無い`);
  }
  const KIND = { body: "armor", head: "head", feet: "feet", off: "shield" };
  for (const [id, it] of armor) if (G.f2.kindOf(it) !== KIND[it.slot]) F(`${id} の図鑑の分類が ${G.f2.kindOf(it)}`);
  for (const k of ["armor", "head", "feet", "shield"]) if (!G.f2.ITEM_KINDS.some(([x]) => x === k)) F(`図鑑の分類に ${k} が無い`);

  // ---- 序盤の店（R6）：はじめの町の店に、防御 3 以上・値 300 以上の I5 の品が並ばない
  for (const loc of ["karna", "nerva", "w2_granbel", "leavel"]) for (const id of D.LOCS[loc].shop || []) {
    const it = D.ITEMS[id];
    if (/^i5/.test(id) && ((it.def || 0) >= 3 || it.price >= 300)) F(`序盤の町 ${loc} の店に ${id}（強すぎる）`);
  }
  for (const [id, it] of armor) if (/^i5/.test(id) && it.i3 && it.i3.lv >= 5 && (it.i3.from || []).length) F(`${id}: 使徒領の素材なのに町で売られる`);

  // ---- 仕組み
  const start = (cls) => {
    G.rand = seeded(55);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats(cls, G.rand);
    G.newGame({ cls, stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 30, history: "", personality: "" } });
    G.S.companions = [];
    G.S.mode = "explore";
    ["head", "feet", "off"].forEach((k) => { G.S[k] = ""; });
  };
  const wear = (id) => { G.give(id); if (!G.equip(id)) F(`${id} を着けられない`); };
  // 盾で受ける：受けたダメージが減る。身を守ると受けやすい
  {
    const avg = (shield, guard) => {
      start("merc");
      G.S.weapon = "longsword";
      if (shield) wear(shield);
      G.S.maxHp = G.S.hp = 9999;
      G.startCombat(["deserter"]);
      const f = G.S.combat.foes[0];
      f.hp = f.max = 9999;
      G.S.combat.guard = guard;
      const e = G.foeData(f);
      let sum = 0;
      for (let i = 0; i < 400; i++) sum += G.cbHurtMod(f, e, 20, null);
      return sum / 400;
    };
    const none = avg(null, false), tower = avg("i2s_towershield", false), towerG = avg("i2s_towershield", true);
    if (!(tower < none * 0.95)) F(`大盾で受けても軽くならない（${none.toFixed(1)}→${tower.toFixed(1)}）`);
    if (!(towerG < tower)) F(`身を守っても受けやすくならない（${tower.toFixed(1)}→${towerG.toFixed(1)}）`);
    if (G.i5.blockChance({ mul: 1.8 }) >= G.i5.blockChance(null)) F("大技も受けやすさが同じ");
  }
  // 反撃：とどめは刺さない
  {
    start("merc");
    wear("i5s_spiked");
    G.startCombat(["goblin"]);
    const f = G.S.combat.foes[0];
    f.hp = 2;
    G.S.maxHp = G.S.hp = 9999;
    const e = G.foeData(f);
    for (let i = 0; i < 200; i++) G.cbHurtMod(f, e, 20, null);
    if (f.hp < 1) F("盾の反撃でとどめを刺した");
    f.hp = f.max = 9999;
    for (let i = 0; i < 200; i++) G.cbHurtMod(f, e, 20, null);
    if (!(f.hp < 9999)) F("棘盾で受けても殴り返さない");
  }
  // 庇う：仲間の傷が減ることがある
  {
    start("merc");
    const c = { name: "仲間", hp: 50 };
    let a = 0;
    for (let i = 0; i < 200; i++) a += G.cbAllyHurt(c, 20);
    wear("i5s_warden");
    let b = 0;
    for (let i = 0; i < 200; i++) b += G.cbAllyHurt(c, 20);
    if (!(b < a)) F(`庇い盾で仲間の傷が減らない（${a}→${b}）`);
  }
  // 兜：大技を和らげる・視界
  {
    start("merc");
    G.S.weapon = "longsword";
    G.startCombat(["deserter"]);
    const f = G.S.combat.foes[0];
    const e = G.foeData(f);
    const big = { mul: 1.8, f1: "heavy" };
    let a = 0; for (let i = 0; i < 100; i++) a += G.cbHurtMod(f, e, 30, big);
    wear("i2s_greathelm");
    let b = 0; for (let i = 0; i < 100; i++) b += G.cbHurtMod(f, e, 30, big);
    if (!(b < a)) F(`大兜で大技が軽くならない（${a}→${b}）`);
    const hit0 = D.ITEMS.longsword.hit || 0;
    if (G.weapon().hit !== hit0 + D.ITEMS.i2s_greathelm.i5.sight) F(`大兜の視界が命中に効かない（${G.weapon().hit}）`);
    G.unequip("head");
    if ((G.weapon().hit || 0) !== hit0) F("兜を外しても命中が戻らない");
  }
  // 恐れ：正気の減りが和らぐ
  {
    start("priest");
    G.S.sanity = 100;
    for (let i = 0; i < 20; i++) G.addSanity(-2, true);
    const a = 100 - G.S.sanity;
    start("priest");
    wear("i5h_kinmask");
    G.S.sanity = 100;
    for (let i = 0; i < 20; i++) G.addSanity(-2, true);
    const b = 100 - G.S.sanity;
    if (!(b < a)) F(`骨面で正気の減りが和らがない（${a}→${b}）`);
  }
  // 靴：逃げ・旅・地形
  {
    start("thief");
    G.startCombat(["goblin"]);
    const p0 = G.cb.flee();
    G._endCombat && G._endCombat("fled");
    wear("i5f_courier");
    G.startCombat(["goblin"]);
    const p1 = G.cb.flee();
    G._endCombat && G._endCombat("fled");
    if (!(p1 > p0)) F(`早駆け靴で逃げやすくならない（${p0}→${p1}）`);
    if (!(G.w6.raidChance(3, 2) < (() => { G.unequip("feet"); return G.w6.raidChance(3, 2); })())) F("早駆け靴で旅の襲撃が減らない");
    // 雪道：かんじきの雪靴は凍てつく街道で身軽、町では重い
    wear("i5f_snowshoe");
    if (!G.i5.terrainOf("frost").includes("snow")) F("凍てつく街道が雪道にならない");
    if (!G.i5.terrainOf("swamp").includes("bog")) F("毒沼の湿地が沼地にならない");
    if (!G.i5.terrainOf("mountains").includes("mount")) F("断界山脈が山道にならない");
    if (!G.i5.terrainOf("ruins").includes("ruin") || !G.i5.terrainOf("ruins").includes("maze")) F("エル・ナフ遺構が遺跡と迷宮にならない");
    if (G.i5.terrainOf("karna").length) F("町に地形が付いた");
    if (!G.i5.terrainOf({ name: "どこかの峰", type: "wild", terrain: "snow" }).includes("snow")) F("場所の terrain が効かない");
    G.S.loc = "karna";
    const town = G.statEff("敏捷");
    G.S.loc = "frost";
    const snow = G.statEff("敏捷");
    if (!(snow > town)) F(`雪靴で雪道が身軽にならない（${town}→${snow}）`);
  }
  // 着慣れ：武士が当世具足を着ると、身のこなしの重さが半分
  {
    start("samurai");
    wear("i3a_yoroi");
    const sam = G.armor().agi;
    start("merc");
    wear("i3a_yoroi");
    const merc = G.armor().agi;
    if (!(sam > merc)) F(`武士が当世具足を着慣れていない（${sam}・${merc}）`);
  }

  // ---- 文と図鑑
  if (!/受け25%/.test(G.itemEffect(D.ITEMS.i2s_towershield))) F(`大盾の効き目に受けが無い：${G.itemEffect(D.ITEMS.i2s_towershield)}`);
  if (!/雪道で身軽/.test(G.i3.effectText(D.ITEMS.i5f_snowshoe))) F(`雪靴の効き目に雪道が無い：${G.i3.effectText(D.ITEMS.i5f_snowshoe)}`);
  const rows = G.codexItemStats("plate");
  const res = rows.find((r) => r[0] === "耐性");
  if (!res || !/斬○/.test(res[1]) || !/雷△/.test(res[1])) F(`図鑑の板金鎧に耐性の印が無い：${res && res[1]}`);
  if (!rows.some((r) => r[0] === "特長")) F("図鑑の板金鎧に特長の行が無い");
  if (G.i5.resistRow().length !== D.E12.TYPES.length) F("合わせた耐性が十の種類でない");
  // 組み合わせの品（材質・銘つき）にも性格と耐性が写る
  const gid = G.i3.id({ base: "i2s_towershield", mat: "steel", pre: "", suf: "" });
  const gen = D.ITEMS[gid];
  if (!gen || !gen.i5 || gen.i5.block !== 25 || !G.e12.armorWords(gen)) F(`組み合わせの大盾に受けや耐性が写らない（${gid}）`);

  // ---- 古いセーブ（頭・足・盾の欄が無い）
  start("merc");
  delete G.S.head; delete G.S.feet; delete G.S.off;
  try { G.i5.sum(); G.armor(); G.weapon(); G.statEff("敏捷"); } catch (e) { F("古いセーブで落ちる：" + e.message); }
};
