// E12：魔物の耐性と弱点（src/data/e12_affinity.js・src/engine/zzzzzzzzzzzzzz_e12_resist.js）
// - 全部の魔物（使徒を含む）に耐性か弱点が一つはある。表の印が読める。E4 の弱点と食い違わない
// - 使徒の斬撃は等倍（討伐の目安は剣で測る。tests/checks/e8_power.mjs）
// - G.dmgMod：弱点で倍率が上がる・耐性で下がる・無効は 0。戦いの一撃に掛かり、ひとことが出る（数は見せない）
// - 全部の武器に物理の種類があり、説明に「斬」「打」「突」が出る
// - 図鑑：はじめは「？」、当てて確かめた種類・倒した数で段階的に開く。使徒は一度倒せばすべて
// - 人間の敵は身なり（板金鎧・鎖帷子・革鎧・ローブ・平服）で決まる
// - 攻撃する戦技はすべて物理の種類を持ち、説明に出る。物理と属性を両方持つ技は両方で掛ける（無効は半分とみなす）
export default ({ G: G0, fail, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const X = D.E12;
  if (!X || !G.e12 || !G.dmgMod) return fail("E12 の表か仕組み（D.E12・G.e12・G.dmgMod）が無い");
  const TYPES = X.TYPES.map((t) => t.id);
  const want = ["fire", "ice", "bolt", "wind", "earth", "light", "dark", "slash", "blunt", "pierce"];
  want.forEach((t) => { if (!TYPES.includes(t)) fail(`種類 ${t} が無い`); });

  // 表の id が実在する（打ち間違いで効かない、を防ぐ）
  Object.keys(X.FOES).forEach((id) => { if (!D.ENEMIES[id] && !(D.E3.FOES || {})[id]) fail(`E12 の表に存在しない敵 ${id}`); });
  Object.keys(X.WEAPONS).forEach((id) => { if (!D.ITEMS[id]) fail(`E12 の武器の表に存在しない品 ${id}`); });

  const foes = { ...D.ENEMIES, ...(D.E3.FOES || {}) };
  const E4W = { fire: ["fire"], ice: ["ice"], bolt: ["bolt"], holy: ["light"], blade: ["slash", "blunt", "pierce"] };
  Object.entries(foes).forEach(([id, e]) => {
    const aff = G.e12.affOf(id);
    const marks = Object.entries(aff).filter(([, m]) => m !== 1);
    if (!marks.length) fail(`${id}（${e.name}）に耐性も弱点も無い`);
    marks.forEach(([t, m]) => { if (!TYPES.includes(t) || ![0, 0.5, 1.5, 2].includes(m)) fail(`${id} の効き目 ${t}=${m} が段に無い`); });
    if (!X.FOES[id] && !e.elderOf) fail(`${id}（${e.name}）が E12 の表に無い（決まりで付いただけ）`);
    (E4W[e.weak] || []).forEach((t) => { if (!(aff[t] >= 1.5)) fail(`${id} は E4 で ${e.weak} が弱点なのに、${t} が ${aff[t] ?? 1} 倍`); });
    if (e.majin && aff.slash != null && aff.slash !== 1) fail(`使徒 ${id} の斬撃が等倍でない（${aff.slash}）`);
    if (!X.TYPES.some((t) => t.id === e.atk && t.kind === "phys")) fail(`${id} の攻め手 ${e.atk} が物理の種類でない`);
  });
  // スケルトン・スライム・ゴーレムなど、魔物らしさの代表
  const expect = [["bonedragon", "blunt", ">"], ["bonedragon", "slash", "<"], ["slime", "fire", ">"], ["slime", "blunt", "<"],
    ["w4_gatekeeper", "blunt", ">"], ["w4_gatekeeper", "slash", "<"], ["e4_cinderhound", "fire", "0"], ["zombie", "light", ">"]];
  expect.forEach(([id, t, op]) => {
    const m = G.dmgMod(id, t);
    if (!(op === ">" ? m > 1 : op === "<" ? m < 1 : m === 0)) fail(`${id} の ${t} が ${m} 倍（${op}）`);
  });
  if (G.dmgMod("nothing", "fire") !== 1 || G.dmgMod("slime", "nothing") !== 1) fail("知らない敵・種類は等倍でない");

  // 武器
  Object.entries(D.ITEMS).filter(([, it]) => it.type === "weapon").forEach(([id, it]) => {
    const ts = G.e12.weaponTypes(it);
    if (!ts.length || ts.some((t) => !["slash", "blunt", "pierce"].includes(t))) fail(`武器 ${id} の物理の種類がおかしい（${ts}）`);
    const eff = G.itemEffect(it);
    if (!/^(斬|打|突)/.test(eff)) fail(`武器 ${id} の説明に斬・打・突が出ない（${eff}）`);
  });
  [["longsword", "slash"], ["mace", "blunt"], ["i3w_spear", "pierce"], ["fists", "blunt"], ["axe", "slash"], ["i3w_shortbow", "pierce"]].forEach(([id, t]) => {
    if (!G.e12.weaponTypes(D.ITEMS[id]).includes(t)) fail(`${id} が ${t} でない`);
  });
  if (!G.codexItemStats("mace").some((r) => r[0] === "種類" && r[1] === "打撃")) fail("図鑑の武器に種類が出ない");

  // 戦い：弱点で上がる・耐性で下がる・無効は 0、ひとことが出る
  const start = (cls, weapon) => {
    G.rand = seeded(12);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats(cls, G.rand);
    G.newGame({ cls, stats, caps, goal: "majin", profile: { name: "試し", sex: "女", age: 30, history: "", personality: "" } });
    G.S.weapon = weapon;
    G.S.companions = [];
  };
  const blow = (foe, weapon, how, n) => {
    start("merc", weapon);
    G.startCombat([foe]);
    const f = G.S.combat.foes[0];
    f.hp = f.max = 999;
    const from = G.S.log.length;
    G.cbDamage(f, n, how);
    return { dealt: 999 - f.hp, text: G.S.log.slice(from).map((l) => l.text).join("\n") };
  };
  const plain = blow("bonedragon", "longsword", "fire", 20);
  if (plain.dealt !== 20) fail(`等倍の炎で ${plain.dealt}（20 のはず）`);
  const weak = blow("bonedragon", "mace", "blade", 20);
  if (!(weak.dealt > 20)) fail(`屍竜に槌で ${weak.dealt}（20 より大きいはず）`);
  if (!/よく効いている/.test(weak.text) || /1\.5|倍/.test(weak.text)) fail(`弱点のひとことが無いか、数を見せている：${weak.text}`);
  const res = blow("bonedragon", "longsword", "blade", 20);
  if (!(res.dealt < 20 && res.dealt > 0)) fail(`屍竜に剣で ${res.dealt}（20 より小さいはず）`);
  if (!/通りが悪い/.test(res.text)) fail(`耐性のひとことが無い：${res.text}`);
  const imm = blow("e4_cinderhound", "longsword", "fire", 20);
  if (imm.dealt !== 0) fail(`炎の効かない敵に炎で ${imm.dealt}（0 のはず）`);
  if (!/まるで効かない/.test(imm.text)) fail(`無効のひとことが無い：${imm.text}`);
  const holy = blow("zombie", "longsword", "holy", 20);
  if (!(holy.dealt > 20)) fail(`屍に聖水（光）で ${holy.dealt}`);
  // 二つの種類を持つ武器は効くほうで
  const dual = blow("orc", "dagger", "blade", 20);
  if (!(dual.dealt > 20)) fail(`オーク（突きに弱い）に短剣で ${dual.dealt}`);
  // 仲間の一撃
  if (G.e12.allyType({ cls: "一番槍の先輩", desc: "" }) !== "pierce" || G.e12.allyType({ cls: "拳法家", desc: "" }) !== "blunt" || G.e12.allyType({ cls: "名家の術士", fire: true }) !== null) fail("仲間の物理の種類の決め方がおかしい");

  // 戦闘の札に種類が出る
  start("merc", "mace");
  G.startCombat(["bonedragon"]);
  const atk = G.combatActions().flatMap((g) => g.list).find((a) => a.id === "cb:attack");
  if (!atk || !/打/.test(atk.sub)) fail(`攻撃の札に武器の種類が出ない（${atk && atk.sub}）`);

  // 図鑑：段階で開く
  start("merc", "longsword");
  const id = "bonedragon";
  G.codexMeet(id, true);
  const shown = () => G.e12.known(id).filter((x) => x.known).map((x) => x.type).sort().join(",");
  if (shown() !== "") fail(`会っただけで効き目が見える（${shown()}）`);
  G.codexKill(id, true);
  const one = shown();
  if (one.split(",").length !== 1 || G.dmgMod(id, one) <= 1) fail(`一度倒して、目立つ弱点一つが開かない（${one}）`);
  G.codexKill(id, true, 2);
  const three = G.e12.known(id);
  if (three.some((x) => x.m > 1 && !x.known) || three.every((x) => x.known)) fail("三度倒して、弱点すべて（だけ）が開かない");
  G.codexKill(id, true, 2);
  if (G.e12.known(id).some((x) => !x.known)) fail("五度倒して、すべて開かない");
  const rows = G.codexFoeStats(id);
  if (!rows.some((r) => r[0] === "よく効く" && /打撃/.test(r[1])) || !rows.some((r) => r[0] === "効かない" && /闇/.test(r[1]))) fail(`図鑑の行がおかしい：${JSON.stringify(rows)}`);
  // 当てて確かめた種類は、倒す前でも開く
  start("merc", "longsword");
  G.codexMeet("slime", true);
  G.startCombat(["slime"]);
  const f = G.S.combat.foes[0];
  f.hp = f.max = 999;
  G.cbDamage(f, 10, "blade");
  if (!G.e12.known("slime").some((x) => x.type === "slash" && x.known)) fail("当てて確かめた耐性が図鑑に載らない");
  if (!G.codexFoeStats("slime").length || !(G.S.lore.e12_aff || []).includes("res")) fail("当てたとき手引きの「効き目」が書き足されない");
  // 使徒は一度倒せばすべて
  G.codexKill("e3_levian", true);
  if (G.e12.known("e3_levian").some((x) => !x.known)) fail("使徒を一度倒しても効き目がすべて開かない");
  // 人間の敵の身なり
  const gearOf = (id) => G.e12.affOf(id);
  if (!(gearOf("guard").slash < 1 && gearOf("guard").pierce > 1)) fail("鎖帷子の衛兵が斬に強く突に弱くない");
  if (!(gearOf("royalguard").slash < 1 && gearOf("royalguard").pierce < 1 && gearOf("royalguard").blunt > 1 && gearOf("royalguard").bolt > 1)) fail("板金鎧の騎士団長の効き目がおかしい");
  if (!(gearOf("warlock").slash > 1 && gearOf("warlock").fire < 1 && gearOf("warlock").dark === 0)) fail("ローブの呪術師の効き目がおかしい（身なりのあとの印で上書きできない）");
  if (gearOf("w3_ashscribe").fire != null) fail("「fire=」で身なりの炎の耐性を打ち消せない");
  Object.entries(D.ENEMIES).filter(([, e]) => e.gear).forEach(([id, e]) => { if (!X.GEAR[e.gear]) fail(`${id} の身なり ${e.gear} が無い`); });
  if (Object.values(D.ENEMIES).filter((e) => e.gear).length < 30) fail("身なりのある人間の敵が少ない");
  G.codexKill("guard", true);
  if (!G.codexFoeStats("guard").some((r) => r[0] === "身なり" && r[1] === "鎖帷子")) fail("図鑑に身なりが出ない");

  // 戦技
  Object.entries(D.SKILLS).filter(([id, s]) => s.fx && ["hit", "parry", "counter"].includes(s.fx.t)).forEach(([id, s]) => {
    const ts = G.e12.skillTypes(id);
    if (ts.filter((t) => ["slash", "blunt", "pierce"].includes(t)).length !== 1) fail(`戦技 ${id}（${s.name}）に物理の種類が一つでない（${ts}）`);
    if (!/^(斬|打|突)/.test(s.hint)) fail(`戦技 ${id} の説明に種類が出ない（${s.hint}）`);
  });
  Object.keys(X.SKILL_TYPES).forEach((id) => { if (!D.SKILLS[id]) fail(`E12 の戦技の表に存在しない技 ${id}`); });
  if (!Object.values(X.SKILL_TYPES).some((t) => /fire|bolt|wind|earth|light|dark|ice/.test(t))) fail("属性を持つ戦技が無い");
  if (G.e12.mulOf("e4_cinderhound", ["slash", "fire"]) !== 0.5) fail("片方が無効の技が半分にならない");
  if (G.e12.mulOf("slime", ["blunt", "fire"]) !== 1) fail("耐性と弱点の技が打ち消し合わない");
  // 戦技で斬る：技の種類が武器より先（剣で兜割り＝打撃。ゴブリンは打撃に弱く、斬撃は等倍）
  {
    start("merc", "longsword");
    G.S.skills = ["k1_helmsplit", "k1_emberedge"];
    G.startCombat(["goblin"]);
    const f = G.S.combat.foes[0];
    f.hp = f.max = 9999;
    G.S.maxHp = G.S.hp = 999;
    if (G.k1 && G.k1.state) G.k1.state(G.S).ki = 9;
    G.e12.cur = "k1_helmsplit";
    const tsNow = G.e12.typesOf("blade", f);
    G.e12.cur = null;
    if (tsNow.join() !== "blunt") fail(`兜割りの最中の種類が ${tsNow}（blunt のはず）`);
    const from = G.S.log.length;
    for (let i = 0; i < 20 && !G.S.log.slice(from).some((l) => /打撃がよく効いている/.test(l.text || "")); i++) { G.S.hp = G.S.maxHp; G.k1.state(G.S).ki = 9; G.combatAct("k1:k1_helmsplit"); }
    if (!G.S.log.slice(from).some((l) => /打撃がよく効いている/.test(l.text || ""))) fail("剣の兜割りがゴブリン（打撃に弱い）に打撃として効かない");
    if (G.e12.cur !== null) fail("戦技のあとも技の種類が残る");
  }

  // 古い profile（e12 も codex も無い）でも動く
  G.P = { trophies: {}, graves: [] };
  G.e12.known("slime");
  G.codexMerge({ foes: { slime: { kills: 1, e12: { fire: 1 } } } }, { foes: { slime: { kills: 2, e12: { slash: 1 } } } }).foes.slime.e12.fire || fail("図鑑をまとめると覚えた効き目が消える");
};
