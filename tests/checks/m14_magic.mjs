// M14：魔法の作り直し（属性 × 段階・術の才・得意と苦手・覚え方）
// - 七つの属性それぞれに初級・中級・上級があり、上の段ほど MP と借りが重い。どの段にも覚える道がある
// - 作成で才を振る：才なしが出る。魔法使い・破戒神官は才なしにならない。エルフは才が高く出やすい。作成で決めた才が冒険に渡る
// - 才なしは覚えられない（学院・魔導書・師・learnSpell）。苦手な属性は中級に届かず、ふつうの属性は上級に届かない。段は順に
// - 野営の一人稽古では覚えない
// - 古いセーブ（S.magic が無い）は才ありとして扱い、覚えている術（炎と癒しも）がそのまま使える
// - 新しい術が戦闘で効く（燃え続ける・凍る・追い風・石の肌・足止め・吸う・癒しの雨・浄め）。師・大成功・伝承の書で覚える
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const M = G.m14;
  const before = { n: 0 };
  const F = (m) => { before.n++; fail(m); };
  if (!M) { fail("G.m14 が無い"); return; }
  const SP = D.SPELLS;

  // ---------------------------------------------------------------- データ
  for (const el of D.M14_ELEM_KEYS) {
    for (const tier of [1, 2, 3]) if (!M.ofEl(el, tier).length) F(`${el} に ${D.M14_TIERS[tier]} が無い`);
    const mp = [1, 2, 3].map((t) => Math.max(...M.ofEl(el, t).map((id) => SP[id].mp)));
    const debt = [1, 2, 3].map((t) => Math.max(...M.ofEl(el, t).map((id) => SP[id].debt || 0)));
    if (!(mp[0] < mp[1] && mp[1] < mp[2])) F(`${el}: 上の段ほど MP が重くない（${mp}）`);
    if (!(debt[0] <= debt[1] && debt[1] < debt[2])) F(`${el}: 上の段ほど借りが重くない（${debt}）`);
  }
  for (const [id, sp] of Object.entries(SP)) {
    if (sp.base) F(`術 ${id} がまだ誰でも使える`);
    if (!sp.generic && (!D.M14_ELEMS[sp.el] || ![1, 2, 3].includes(sp.tier))) F(`術 ${id} の属性か段が無い`);
  }
  const tomes = Object.entries(D.ITEMS).filter(([, it]) => it.type === "tome");
  const sources = new Set(D.SHOP_BASE);
  for (const L of Object.values(D.LOCS)) for (const it of L.shop || []) sources.add(it);
  for (const e of Object.values(D.ENEMIES)) for (const [it] of e.loot || []) sources.add(it);
  for (const [id, sp] of Object.entries(SP)) {
    if (sp.generic) continue;
    const tome = tomes.some(([tid, it]) => it.teach === id && sources.has(tid));
    if (sp.tier === 1 && !sp.school && !tome) F(`初級 ${id} を学院でも魔導書でも覚えられない`);
    if (sp.tier === 2 && !(D.M14_MASTERS || []).some((x) => x.els.includes(sp.el) && D.LOCS[x.loc])) F(`中級 ${id} を教える師がいない`);
    if (sp.tier === 3 && !tome) F(`上級 ${id} の伝承の書が無いか、手に入らない`);
    if (sp.school && sp.tier !== 1) F(`学院が ${D.M14_TIERS[sp.tier]}の ${id} を教えている`);
  }
  if (SP.curse.school) F("呪いを学院で教えている");

  // ---------------------------------------------------------------- 作成：才を振る
  const cre = G.cre;
  const rnd = seeded(14);
  const roll = (cls, race, origin) => {
    const dr = { cls, origin: origin || D.CLASS_ORIGIN[cls], ageBand: "prime", profile: { race: race || "human" }, bonus: {}, rolls: 0 };
    cre.roll(dr, rnd);
    return M.ofDraft(dr);
  };
  const lvs = (cls, race, n) => Array.from({ length: n }, () => roll(cls, race).lv);
  const merc = lvs("merc", "human", 600);
  const none = merc.filter((x) => x === 0).length;
  if (!(none > 60 && none < 300)) F(`人間の傭兵の才なしが ${none}/600（多すぎるか少なすぎる）`);
  if (!merc.some((x) => x >= 2)) F("人間の傭兵に才のある者がいない");
  for (const cls of ["mage", "priest"]) if (lvs(cls, "human", 300).some((x) => x === 0)) F(`${D.CLASSES[cls].name}が才なしで出る`);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  if (!(avg(lvs("merc", "elf", 600)) > avg(lvs("merc", "human", 600)))) F("エルフの才が人間より高く出ない");
  for (let i = 0; i < 300; i++) {
    const t = roll("thief", "human");
    if (t.good.length !== t.lv) F(`得意な属性の数が才と合わない（${JSON.stringify(t)}）`);
    if (t.good.some((e) => t.bad.includes(e))) F(`得意と苦手が重なる（${JSON.stringify(t)}）`);
    if (i > 20) break;
  }
  if (!lvs("merc", "human", 1).length || !roll("mage").good.includes("fire")) F("魔法使いの得意に炎が無い");
  // 作成で決めた才が冒険に渡り、言葉でシートに出る
  {
    const dr = cre.fresh(seeded(3));
    const want = M.ofDraft(dr);
    const o = cre.options(dr, seeded(4));
    if (JSON.stringify(o.magic) !== JSON.stringify(want)) F("作成の才が冒険に渡らない");
    const rows = cre.sheetRows(dr);
    if (!rows.length || !/才/.test(rows[0][0]) || /\d/.test(rows[0][1])) F(`確認のシートに才が言葉で出ない（${JSON.stringify(rows)}）`);
    G.rand = seeded(5);
    G.P = { trophies: {}, graves: [] };
    G.newGame(o);
    if (JSON.stringify(G.S.magic) !== JSON.stringify(want)) F("冒険の S.magic が作成の才と違う");
  }

  // ---------------------------------------------------------------- 冒険を始める
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

  // 才なし：何も覚えられない
  let S = start("merc", { lv: 0, good: [], bad: [] });
  if (S.spells.length) F("才なしが術を覚えて始まる");
  if (G.learnSpell("fire") || G.knows("fire")) F("才なしが炎を覚えた");
  S.loc = "zephara"; S.gold = 9999;
  G.act("fac:academy");
  const lec = acts().find((a) => a.id === "academy:fire");
  if (!lec || !lec.disabled || !/才/.test(lec.sub)) F("才なしに学院の講義が受けられる（か、わけが出ない）");
  always(() => G.facAct("academy", "fire"));
  if (G.knows("fire")) F("才なしが学院で炎を覚えた");
  G.act("back");
  G.give("m14_tome_fire");
  const tomeA = acts().find((a) => a.id === "tome:m14_tome_fire");
  if (!tomeA || !tomeA.disabled) F("才なしに魔導書を読む行動が出る");
  always(() => G.readTome("m14_tome_fire"));
  if (G.knows("fire")) F("才なしが魔導書で炎を覚えた");
  if (acts().some((a) => /^m14m:/.test(a.id))) F("才なしに師事する行動が出る");
  G.startCombat(["goblin"], {});
  if (G.actions().some((g) => g.title === "魔法")) F("才なしの戦闘に魔法の組が出る");
  G.S.combat = null; G.S.mode = "explore";
  // 出来事の m14learn も効かない
  G.apply({ m14learn: "low" });
  if ((S.spells || []).length) F("才なしが出来事で術を覚えた");

  // 得意・ふつう・苦手：段の届き方と順番
  S = start("merc", { lv: 1, good: ["fire"], bad: ["ice"] });
  if (!G.knows("fire")) F("得意な属性の初級を知らずに始まる");
  if (M.canLearn("fire3") === "") F("中級を飛ばして上級を覚えられる");
  if (!G.learnSpell("ice")) F("苦手な属性の初級が覚えられない");
  if (G.learnSpell("ice2") || !/苦手/.test(M.canLearn("ice2"))) F("苦手な属性が中級に届く");
  if (!G.learnSpell("bolt") || !G.learnSpell("bolt2")) F("ふつうの属性が中級まで届かない");
  if (G.learnSpell("bolt3") || !/得意/.test(M.canLearn("bolt3"))) F("ふつうの属性が上級に届く");
  if (!G.learnSpell("fire2") || !G.learnSpell("fire3")) F("得意な属性が上級まで届かない");
  if (!(M.learnBonus("fire2") > M.learnBonus("bolt2") && M.learnBonus("bolt2") > M.learnBonus("ice"))) F("得意・ふつう・苦手で覚えやすさが変わらない");
  if (!(G.gearBonus("fire") > G.gearBonus("bolt") && G.gearBonus("bolt") > G.gearBonus("ice"))) F("得意・ふつう・苦手で唱えやすさが変わらない");

  // 野営の一人稽古では覚えない・伸びない
  S = start("mage", null, 7);
  S.loc = "plains"; S.mp = 0; S.maxHp = S.hp = 999;
  const n0 = S.spells.slice();
  for (let i = 0; i < 40 && !S.over; i++) {
    if (S.mode === "combat") { G.S.combat = null; G.S.mode = "explore"; }
    if (S.mode !== "explore") { S.mode = "explore"; S.event = null; S.fac = null; }
    const camp = acts().filter((a) => /camp/.test(a.id) && !a.disabled);
    if (!camp.length) break;
    G.act(camp[i % camp.length].id);
  }
  if (JSON.stringify(S.spells) !== JSON.stringify(n0)) F(`野営で術を覚えた（${n0} → ${S.spells}）`);

  // 古いセーブ：才ありとして扱い、覚えている術はそのまま
  S = start("merc", null, 8);
  delete S.magic; S.spells = ["ice"];
  if (!G.knows("fire") || !G.knows("heal") || !G.knows("ice")) F("古いセーブで炎・癒し・覚えていた術が使えない");
  if (!M.has() || M.talent().lv < 1) F("古いセーブの主人公が才なしになる");
  S.maxMp = S.mp = 99; S.maxHp = S.hp = 999;
  G.startCombat(["goblin"], {});
  for (const id of ["fire", "heal", "ice"]) if (!acts().some((a) => a.id === "cb:" + id && !a.disabled)) F(`古いセーブの戦闘に ${id} が出ない`);
  always(() => G.act("cb:fire"));
  if (G.S.combat && G.S.combat.foes[0].hp === G.S.combat.foes[0].max) F("古いセーブの炎の魔法が効かない");
  G.S.combat = null; G.S.mode = "explore";

  // ---------------------------------------------------------------- 新しい術の効き目
  S = start("mage", { lv: 3, good: ["fire", "wind", "dark"], bad: [] }, 9);
  Object.keys(SP).forEach((id) => M.grant(id));
  S.stats.魔力 = 99; S.maxMp = S.mp = 999; S.maxHp = S.hp = 999;
  const fight = (ids) => { G.startCombat(ids, {}); return G.S.combat; };
  let C = fight(["ogre"]);
  let f = C.foes[0];
  always(() => G.combatAct("fire2"));
  if (!(f.hp < f.max)) F("炎の槍が当たらない");
  if (G.S.combat === C && !(f.m14burn > 0) && f.hp > 0) F("炎の槍で燃え続けない");
  C = fight(["ogre"]); f = C.foes[0];
  always(() => G.combatAct("ice2"));
  if (G.S.combat === C && f.hp > 0 && !(f.frozen > 0)) F("氷の枷で凍らない");
  C = fight(["goblin", "goblin", "goblin"]);
  always(() => G.combatAct("ice3"));
  if (G.S.combat === C && C.foes.some((x) => x.hp === x.max)) F("凍てつく檻が全員に当たらない");
  C = fight(["ogre"]);
  always(() => G.combatAct("wind1"));
  if (!(C.m14wind > 0)) F("追い風がかからない");
  const e = D.ENEMIES.ogre, agi = S.stats.敏捷;
  S.stats.敏捷 = 10;   // 当たる見込みが 5〜95％の端に張りつかないように
  const withWind = G.foeHitChance(e);
  C.m14wind = 0;
  if (!(withWind < G.foeHitChance(e))) F("追い風で敵の攻撃が当たりにくくならない");
  S.stats.敏捷 = agi;
  C = fight(["ogre"]);
  const def0 = (G.armor() || { def: 0 }).def;
  always(() => G.combatAct("earth1"));
  if (!(C.m14stone > 0) || !(G.armor().def > def0)) F("石の肌で守りが増えない");
  C = fight(["ogre"]); f = C.foes[0];
  const eva0 = G.cb.attack();
  always(() => G.combatAct("earth2"));
  if (G.S.combat === C && f.hp > 0 && !(G.cb.attack() > eva0)) F("石つぶての足止めで当てやすくならない");
  C = fight(["ogre"]);
  S.hp = 100;
  always(() => G.combatAct("dark2"));
  if (!(S.hp > 100 - 30)) F("命を吸うで傷が癒えない");
  C = fight(["zombie"]); f = C.foes[0];
  const hp0 = f.max;
  always(() => G.combatAct("light3"));
  if (G.S.combat === C && f.hp >= hp0) F("浄めの光が不死に効かない");
  C = fight(["goblin"]);
  S.hp = 50; S.conds = ["毒"];
  always(() => G.combatAct("light2"));
  if (!(S.hp > 50) || S.conds.includes("毒")) F("癒しの雨で傷が癒えないか、毒が消えない");
  // 使徒には絶界で効かない
  const majin = Object.keys(D.ENEMIES).find((id) => D.ENEMIES[id].majin);
  C = fight([majin]); f = C.foes[0];
  always(() => { G.combatAct("fire3"); G.combatAct("dark3"); });
  if (G.S.combat === C && (f.hp < f.max || f.m14burn || f.hex)) F("使徒に新しい術が効いた");
  G.S.combat = null; G.S.mode = "explore";
  // 大失敗で借り（上の段ほど重い）
  const debtOf = (id) => {
    fight(["goblin"]);
    const d0 = S.magicDebt || 0;
    S.hp = S.maxHp;
    always(() => G.combatAct(id), 0.99);
    G.S.combat = null; G.S.mode = "explore";
    return (S.magicDebt || 0) - d0;
  };
  const d1 = debtOf("wind1"), d3 = debtOf("wind3");
  if (!(d1 > 0 && d3 > d1)) F(`大失敗の借りが上の段ほど重くない（初級 ${d1}・上級 ${d3}）`);

  // ---------------------------------------------------------------- 覚える道（中級：師・出来事、上級：大成功・伝承の書・強敵）
  S = start("merc", { lv: 2, good: ["fire", "earth"], bad: ["dark"] }, 10);
  G.learnSpell("fire");
  S.loc = "zephara"; S.gold = 9999; S.stats.魔力 = 99;
  const m = acts().find((a) => a.id === "m14m:zep:fire2");
  if (!m || m.disabled) F("エルメシアの老講師に炎の中級を教われない");
  else { for (let i = 0; i < 10 && !G.knows("fire2"); i++) always(() => G.act(m.id)); if (!G.knows("fire2")) F("師に教わっても炎の中級を覚えない"); }
  if (acts().some((a) => a.id === "m14m:zep:ice2" && !a.disabled)) F("初級を知らない属性の中級を師が教える");
  S.maxMp = S.mp = 99;
  fight(["ogre"]);
  always(() => G.combatAct("fire2"), 0.001);   // 大成功（と、上級に手が届く見込み）
  if (!G.knows("fire3")) F("中級の大成功で上級を覚えない");
  G.S.combat = null; G.S.mode = "explore";
  // 伝承の書
  G.learnSpell("earth1"); G.learnSpell("earth2");
  G.give("m14_lore_earth");
  S.stats.知力 = 99;
  for (let i = 0; i < 30 && !G.knows("earth3"); i++) always(() => G.readTome("m14_lore_earth"));
  if (!G.knows("earth3")) F("伝承の書で上級を覚えない");
  // 出来事（m14learn）
  S = start("merc", { lv: 1, good: ["earth"], bad: [] }, 11);
  G.apply({ m14learn: "mid" });
  if (!G.knows("earth2")) F("出来事で得意な属性の中級を覚えない");
  // 強敵：中級を使って勝つと上級を覚えることがある
  S = start("merc", { lv: 1, good: ["earth"], bad: [] }, 12);
  M.grant("earth2"); S.stats.魔力 = 99; S.maxMp = S.mp = 99; S.maxHp = S.hp = 9999;
  const boss = Object.keys(D.ENEMIES).find((id) => D.ENEMIES[id].boss && !D.ENEMIES[id].majin && !D.ENEMIES[id].undead);
  C = fight([boss]);
  always(() => G.combatAct("earth2"), 0.3);
  if (G.S.combat === C) { C.foes.forEach((x) => { x.hp = 1; }); always(() => G.combatAct("attack"), 0.3); }
  if (G.S.combat === C) { G.S.combat = null; G.S.mode = "explore"; F("強敵の試しで戦闘が終わらない"); }
  else if (!G.knows("earth3")) F("中級の術で強敵を倒しても上級を覚えない");

  // ---------------------------------------------------------------- 仲間の術の才
  const c1 = { name: "術士", fire: true }, c2 = { name: "司祭", heal: true }, c3 = { name: "剣士", magic: { lv: 0 } };
  if (M.allyTalent(c1).lv < 2 || !M.allyTalent(c2).good.includes("light") || M.allyTalent(c3).lv !== 0) F("仲間の術の才が変");
  if (!/術の才/.test(G.m14CompLabel(c1)) || /\d/.test(G.m14CompLabel(c1))) F("仲間の術の才が言葉で出ない");

  if (!before.n) ok(`魔法の作り直し（術 ${Object.keys(SP).length} 種・才なし・得意と苦手・段の順・野営・古いセーブ・戦闘の効き目・師・大成功・伝承の書・強敵）`);
};
