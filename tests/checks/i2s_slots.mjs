// I2（装備の枠）：装備の枠を 7 つに（src/data/items_i2s.js・items_i2s_pieces.js・engine/zzzzzzzzz_i2s_slots.js・ui/zi2s_slots.js）
// - すべての装備品に枠がある（武器は片手か両手も）。頭・足・盾の品があり、入手先（店・日替わりの品の土台・落とし物）がある
// - 両手の武器を持つと右手と左手が両方塞がる（左手の品は荷物へ）。左手に持つと両手の武器は荷物へ
// - 片手の武器は左手にも持てる（二刀）。絶界を破る剣・両手の武器は左手に持てない
// - 頭・足・盾の防御が戦闘の防御（G.armor）に、能力値・補正が判定に、装飾品 2 が G.ring に足される。外すと元に戻る
// - 呪われた品は外すと傷を負う（死にはしない）。F3 の癖（条件で化ける）は新しい枠でも効く
// - 古いセーブ（足した枠が無い・両手の武器と左手が重なっている）を読んでも壊れず、品は荷物か自然な枠へ
export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n0 = 0;
  const F = (m) => { n0++; fail("I2 枠: " + m); };
  const G = loadEngine();
  const D = G.data;
  const X = G.i2s;
  if (!X) { F("G.i2s が無い"); return; }

  // ---- データ
  const gear = Object.entries(D.ITEMS).filter(([, it]) => ["weapon", "armor", "ring"].includes(it.type));
  for (const [id, it] of gear) {
    if (!it.slot || !X.FITS[it.slot]) F(`${id}（${it.name}）に枠が無い`);
    if (it.type === "weapon" && ![1, 2].includes(it.hands)) F(`${id}: 片手か両手かが無い`);
    if (it.type === "weapon" && it.slot !== "hand") F(`${id}: 武器なのに枠が ${it.slot}`);
    if (it.type === "ring" && it.slot !== "acc") F(`${id}: 装飾品なのに枠が ${it.slot}`);
  }
  const bySlot = (s) => gear.filter(([, it]) => it.slot === s).map(([id]) => id);
  for (const s of ["head", "feet", "off"]) if (bySlot(s).length < 5) F(`${X.KIND[s]}の品が少ない（${bySlot(s).length}）`);
  // 入手先：店・日替わりの品の土台（i3.gen）・落とし物のどれか
  const sources = new Set();
  for (const L of Object.values(D.LOCS)) for (const it of L.shop || []) sources.add(it);
  for (const e of Object.values(D.ENEMIES)) for (const [it] of e.loot || []) sources.add(it);
  for (const s of ["head", "feet", "off"]) for (const id of bySlot(s)) if (!sources.has(id) && !(D.ITEMS[id].i3 && D.ITEMS[id].i3.gen)) F(`${id}: 入手先が無い`);
  for (const s of ["head", "feet", "off"]) if (!bySlot(s).some((id) => sources.has(id))) F(`${X.KIND[s]}の品が、どの店にも落とし物にも無い`);
  // 強すぎない：頭と足は防御 2 まで、盾は 3 まで（胴の鎧より控えめ）
  for (const s of ["head", "feet"]) for (const id of bySlot(s)) if ((D.ITEMS[id].def || 0) > 2) F(`${id}: ${X.KIND[s]}の防御が高すぎる`);
  for (const id of bySlot("off")) if ((D.ITEMS[id].def || 0) > 3) F(`${id}: 盾の防御が高すぎる`);
  if (D.ITEMS.i3w_greatsword.hands !== 2 || D.ITEMS.longsword.hands !== 1 || D.ITEMS.i3w_shortbow.hands !== 2) F("I3 の型の片手・両手が写っていない");

  // ---- 遊ぶ
  G.rand = seeded(21);
  G.P = { trophies: {}, graves: [] };
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 30]));
  const caps = Object.fromEntries(D.STATS.map((k) => [k, 60]));
  G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口" } });
  const S = G.S;
  S.mode = "explore";
  for (const k of ["off", "head", "feet", "ring2"]) if (S[k] !== "") F(`新しい冒険の ${k} が空でない：${S[k]}`);
  const def0 = G.armor().def;

  // 盾を左手に → 防御が増える
  G.give("i2s_buckler");
  if (!G.equip("i2s_buckler") || S.off !== "i2s_buckler" || S.inv.i2s_buckler) F("盾を左手に持てない");
  if (G.armor().def !== def0 + D.ITEMS.i2s_buckler.def) F(`盾の防御が足されない（${def0}→${G.armor().def}）`);
  if (!G.has("i2s_buckler")) F("左手の盾を持っていないことになる");
  // 両手の武器 → 左手の盾は荷物へ
  G.give("i3w_greatsword");
  const w0 = S.weapon;
  if (!G.equip("i3w_greatsword") || S.weapon !== "i3w_greatsword") F("両手の武器を持てない");
  if (S.off || S.inv.i2s_buckler !== 1 || S.inv[w0] !== 1) F(`両手の武器を持っても左手が塞がらない（off=${S.off}・盾 ${S.inv.i2s_buckler}・前の武器 ${S.inv[w0]}）`);
  if (!X.blocked(S) || !X.rows(S).find((r) => r.k === "off").blocked) F("両手持ちで左手が塞がった印が無い");
  if (G.armor().def !== def0) F("盾を外したのに防御が残る");
  // 盾を左手に → 両手の武器は荷物へ（右手は素手）
  G.equip("i2s_buckler", "off");
  if (S.off !== "i2s_buckler" || S.weapon !== "fists" || S.inv.i3w_greatsword !== 1) F(`左手に持っても両手の武器が外れない（${S.weapon}）`);
  // 二刀：片手の武器を右手と左手に
  G.equip(w0, "weapon");
  G.give("dagger");
  const w1 = G.weapon();
  if (!G.equip("dagger", "off") || S.off !== "dagger" || S.inv.i2s_buckler !== 1) F("片手の武器を左手に持てない（盾が荷物に戻らない）");
  const w2 = G.weapon();
  if (w2.dmg[2] !== w1.dmg[2] + X.DUAL || w2.name !== w1.name) F(`二刀で威力が足されない（${w1.dmg}→${w2.dmg}）`);
  if (X.fits("i3w_greatsword", "off") || X.fits("volgrim", "off") || X.fits("i1_fangring", "off") || !X.fits("dagger", "off")) F("左手に持てる品の決まりが変");
  G.unequip("off");
  if (S.off || S.inv.dagger !== 1 || G.weapon().dmg[2] !== w1.dmg[2]) F("左手を外せない・二刀の威力が残る");

  // 頭・足：防御と能力値・補正
  const agi0 = G.statEff("敏捷"), steal0 = G.gearBonus("steal"), body0 = G.armor().def;
  G.give("i2s_ironhelm");
  G.equip("i2s_ironhelm");
  if (S.head !== "i2s_ironhelm" || G.armor().def !== body0 + 1) F("兜の防御が足されない");
  G.give("i2s_softboots");
  G.equip("i2s_softboots");
  if (S.feet !== "i2s_softboots" || G.gearBonus("steal") !== steal0 + 5 || !(G.statEff("敏捷") > agi0 - 1)) F(`足の品の補正が効かない（盗み ${steal0}→${G.gearBonus("steal")}）`);
  G.give("i2s_furcap");
  const con0 = G.statEff("体力");
  G.equip("i2s_furcap");
  if (S.head !== "i2s_furcap" || S.inv.i2s_ironhelm !== 1 || !(G.statEff("体力") > con0)) F("頭の品を替えても前の物が戻らない・能力値が効かない");
  G.unequip("head"); G.unequip("feet");
  if (G.gearBonus("steal") !== steal0 || G.armor().def !== body0) F("頭と足を外しても補正が残る");

  // 装飾品 2：G.ring に足される。G.equip(id) は今までどおり装飾品 1 と入れ替え
  const M = G.s5Mod;
  const str0 = G.statEff("筋力"), mag0 = G.magicBonus();
  G.give("i1_fangring"); G.give("i1_foxring");
  G.equip("i1_fangring", "ring");
  G.equip("i1_foxring", "ring2");
  if (S.ring !== "i1_fangring" || S.ring2 !== "i1_foxring") F("装飾品を二つ着けられない");
  if (Math.abs(G.statEff("筋力") - (str0 + M(5))) > 1e-9 || G.magicBonus() !== mag0 + 5) F(`装飾品 2 の効き目が足されない（筋力 ${str0}→${G.statEff("筋力")}・魔法 ${mag0}→${G.magicBonus()}）`);
  G.give("i1_slipring");
  G.equip("i1_slipring");
  if (S.ring !== "i1_slipring" || S.ring2 !== "i1_foxring" || S.inv.i1_fangring !== 1) F("枠を省いた装飾品が装飾品 1 と入れ替わらない");
  G.unequip("ring2");
  if (S.ring2 || S.inv.i1_foxring !== 1 || G.magicBonus() !== mag0) F("装飾品 2 を外せない");

  // 呪われた品は外すと傷を負う（死なない）
  G.give("i1_eyering");
  G.equip("i1_eyering", "ring2");
  S.hp = 2;
  G.unequip("ring2");
  if (S.hp !== 1 || S.over) F(`呪われた装飾品 2 を外したあとの HP が変 ${S.hp}`);
  S.hp = S.maxHp;

  // F3 の癖：組み合わせ（pair）は左手・装飾品 2 でも数える。火打ちの籠手（装飾品 2）は魔導書と組むと化ける
  if (D.ITEMS.f3i_flintgauntlet && D.ITEMS.grimoire) {
    G.give("f3i_flintgauntlet");
    G.equip("f3i_flintgauntlet", "ring2");
    const f0 = G.gearBonus("fire");
    G.give("grimoire");
    if (!(G.gearBonus("fire") > f0)) F("装飾品 2 の癖（組み合わせ）が効かない");
    if (G.f3i && !G.f3i.when("pair:f3i_flintgauntlet", S)) F("装飾品 2 の品が「持っている」に数えられない");
    G.unequip("ring2");
  }

  // 比べの印：兜は兜と比べる
  if (G.i3 && G.i3.compare) {
    G.give("i2s_greathelm");
    const c = G.i3.compare("i2s_greathelm");
    if (!c || c.dir <= 0) F(`空の頭と比べて大兜が上にならない（${JSON.stringify(c)}）`);
  }

  // 鍛冶：頭の品も鍛え直せる（枠の品の入れ替え）
  if (G.i3) {
    S.gold = 99999;
    G.give("i2s_ironhelm"); G.equip("i2s_ironhelm");
    S.loc = "w2_dranherz"; S.mode = "fac"; S.fac = "shop";
    const ids = G.actions().flatMap((g) => g.list).map((a) => a.id);
    if (!ids.includes("shop:i3up:i2s_ironhelm")) F("頭の品が鍛冶の一覧に出ない");
    else { G.act("shop:i3up:i2s_ironhelm"); if (!G.i3.parse(S.head) || G.i3.parse(S.head).plus !== 1) F(`頭の品を鍛え直しても枠の品が替わらない（${S.head}）`); }
    S.mode = "explore"; S.fac = null;
  }

  // ---- 古いセーブ
  {
    const old = JSON.parse(JSON.stringify(G.S));
    delete old.off; delete old.head; delete old.feet; delete old.ring2;
    old.weapon = "katana"; old.armor = "chain"; old.ring = "i1_fangring";
    G.S = old;
    G.fixOldNames(old);
    if (old.off !== "" || old.head !== "" || old.feet !== "" || old.ring2 !== "") F("古いセーブに足した枠が空で入らない");
    if (old.weapon !== "katana" || old.armor !== "chain" || old.ring !== "i1_fangring") F("古いセーブの装備が自然な枠に残らない");
    if (G.armor().def !== D.ITEMS.chain.def || G.weapon().name !== D.ITEMS.katana.name) F("古いセーブで戦いの数字が変わった");
    // 両手の武器と左手が重なっている・枠に合わない品
    const bad = JSON.parse(JSON.stringify(old));
    bad.weapon = "i3w_greatsword"; bad.off = "i2s_buckler"; bad.head = "i1_foxring"; bad.ring2 = "i2s_hood"; bad.inv = {};
    G.S = bad;
    G.fixOldNames(bad);
    if (bad.off || bad.inv.i2s_buckler !== 1) F("両手の武器と左手の盾が重なったセーブで、盾が荷物に戻らない");
    for (const k of X.SLOTS) if (bad[k] && bad[k] !== "fists" && !X.fits(bad[k], k)) F(`枠に合わない品が残る：${k}=${bad[k]}`);
    if (!(bad.ring2 === "i1_foxring" || bad.inv.i1_foxring === 1) || !(bad.head === "i2s_hood" || bad.inv.i2s_hood === 1)) F(`枠に合わない品が消えた（${JSON.stringify([bad.head, bad.ring2, bad.inv])}）`);
    // 何も無いセーブでも引ける
    const bare = JSON.parse(JSON.stringify(old));
    delete bare.weapon; delete bare.ring;
    G.S = bare;
    G.fixOldNames(bare);
    if (G.weapon().name !== D.ITEMS.fists.name || G.ring() !== null) F("武器と装飾品の欄が無いセーブで壊れる");
  }

  // ---- 150 回のランダムプレイ相当：着けたまま数手番まわしても例外が出ない
  {
    const G2 = loadEngine();
    G2.rand = seeded(7);
    G2.P = { trophies: {}, graves: [] };
    const D2 = G2.data;
    G2.newGame({ cls: "samurai", stats, caps, goal: Object.keys(D2.GOALS)[0], profile: { name: "テスト", sex: "男", age: 30, history: "テスト用", personality: "無口" } });
    ["i2s_kabuto", "i2s_sandals", "i2s_buckler", "i1_frogring", "i1_fangring"].forEach((id) => G2.give(id));
    G2.equip("i2s_kabuto"); G2.equip("i2s_sandals"); G2.equip("i2s_buckler"); G2.equip("i1_frogring", "ring"); G2.equip("i1_fangring", "ring2");
    try {
      for (let i = 0; i < 300 && !G2.S.over; i++) {
        const avail = G2.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
        if (!avail.length) break;
        G2.act(G2.pick(avail).id);
      }
    } catch (e) { F(`着けたまま遊ぶと例外：${e && e.stack}`); }
  }

  if (!n0) ok(`I2 装備の枠（7 枠・装備品 ${gear.length} 種に枠・頭 ${bySlot("head").length}・足 ${bySlot("feet").length}・盾 ${bySlot("off").length}・両手持ち・古いセーブの移し替え）`);
};
