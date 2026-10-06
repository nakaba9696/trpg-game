// U21：職業を選ぶときに、初期装備・持ち物・所持金と、最初の戦技／スキル／魔法が出る（engine/zu21_classinfo.js）
// - どの職業にも行が作れる。品の名は D.ITEMS の名前で、id がそのまま出ていない
// - 戦技（combat・both）とスキル（field・passive）を K1・K2 の呼び名で分ける
// - 戦技を持たない職業は、最初から覚えている魔法（D.SPELL_START）が出る。両方ある職業は両方
// - 職業の名前は書かない（E5 が名前を変える作業中）。画面は表から作る（職業を足せば自動で出る）
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ G, fail, ok }) => {
  const F = (m) => fail("U21: " + m);
  const D = G.data, cre = G.cre;
  if (!cre.classLines) { F("職業の行を作る口（cre.classLines）が無い"); return; }

  let withSkill = 0, withSpell = 0;
  for (const [id, c] of Object.entries(D.CLASSES)) {
    const info = cre.classInfo(id), rows = cre.classLines(id);
    const key = (k) => (rows.find((r) => r[0] === k) || [])[1] || "";
    const all = rows.map((r) => r.join("")).join(" ");
    if (!rows.length) { F(`職業 ${id} の行が作れない`); continue; }
    // 初期装備・持ち物・所持金
    for (const it of [c.weapon, c.armor].filter(Boolean)) {
      if (!D.ITEMS[it]) { F(`職業 ${id} の装備 ${it} が品の表に無い`); continue; }
      if (!key("初期装備").includes(D.ITEMS[it].name)) F(`職業 ${id} の装備 ${D.ITEMS[it].name} が出ない`);
    }
    for (const [it, n] of Object.entries(c.items || {})) {
      if (!D.ITEMS[it]) { F(`職業 ${id} の持ち物 ${it} が品の表に無い`); continue; }
      if (!key("持ち物").includes(D.ITEMS[it].name)) F(`職業 ${id} の持ち物 ${D.ITEMS[it].name} が出ない`);
      if (n > 1 && !key("持ち物").includes(D.ITEMS[it].name + "×" + n)) F(`職業 ${id} の持ち物 ${it} の数が出ない`);
    }
    if (key("所持金") !== `${c.gold}G`) F(`職業 ${id} の所持金が ${key("所持金")}（${c.gold}G のはず）`);
    if (/[a-z_]{4,}/.test(all)) F(`職業 ${id} の行に id がそのまま出ている：${all}`);
    // 戦技・スキル・魔法
    for (const sid of (D.SKILL_START || {})[id] || []) {
      const sk = D.SKILLS[sid];
      if (!sk) { F(`職業 ${id} の最初の技 ${sid} が技の表に無い`); continue; }
      const kind = cre.skillKindName(sk);
      if (!["戦技", "スキル"].includes(kind)) F(`技 ${sid} の呼び名が ${kind}`);
      if (!key("最初の" + kind).includes(sk.name)) F(`職業 ${id} の最初の${kind} ${sk.name} が出ない`);
      if (sk.hint && !key("最初の" + kind).includes(sk.hint)) F(`職業 ${id} の ${sk.name} の効き目が出ない`);
    }
    for (const pid of (D.SPELL_START || {})[id] || []) {
      const sp = D.SPELLS[pid];
      if (!sp) { F(`職業 ${id} の最初の魔法 ${pid} が魔法の表に無い`); continue; }
      if (!key("覚えている魔法").includes(sp.name)) F(`職業 ${id} の魔法 ${sp.name} が出ない`);
    }
    // 戦技もスキルも魔法も無い職業は作らない（選ぶときに何も分からなくなる）
    if (!info.skills.length && !info.spells.length) F(`職業 ${id} に最初の戦技・スキル・魔法がどれも無い`);
    if (info.skills.length) withSkill++;
    if (info.spells.length) withSpell++;
    // 冒険の始まりと合っているか（持ち物・所持金・覚えている魔法）
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 40]));
    const S = G.newGame({ cls: id, stats, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 24 } });
    if (S.gold !== c.gold) F(`職業 ${id} の所持金が始めてみると ${S.gold}`);
    for (const pid of (D.SPELL_START || {})[id] || []) if (!(S.spells || []).includes(pid)) F(`職業 ${id} の魔法 ${pid} を始めから覚えていない`);
  }
  if (!withSkill) F("最初の戦技・スキルを出す職業が一つも無い");
  if (!withSpell) F("最初から覚えている魔法を出す職業が一つも無い");

  // 無い職業では落ちない
  if (cre.classInfo("なにか") !== null || cre.classLines("なにか").length) F("知らない職業で行を作ってしまう");

  // 画面は表から作る（職業を足せば自動で出る）。職業の名前も id も書かない（E5 が名前を変える作業中）
  const src = readFileSync(fileURLToPath(new URL("../../src/ui/setup.js", import.meta.url)), "utf8");
  if (!/cre\.classLines\(id\)/.test(src)) F("職業の札で cre.classLines を使っていない");
  const eng = readFileSync(fileURLToPath(new URL("../../src/engine/zu21_classinfo.js", import.meta.url)), "utf8");
  for (const [id, c] of Object.entries(D.CLASSES)) {
    if (c.name && eng.includes(c.name)) F(`職業の行を作る所に職業の名前「${c.name}」が書かれている`);
    if (new RegExp(`["'\`]${id}["'\`]`).test(eng)) F(`職業の行を作る所に職業の id ${id} が書かれている`);
  }
  ok(`U21: 職業の札に初期装備・持ち物・所持金と最初の戦技／スキル（${withSkill} 職）・覚えている魔法（${withSpell} 職）`);
};
