// U21：職業を選ぶときに出す「初期装備・持ち物・所持金」と「最初の戦技／スキル／魔法」を、表から作る（DOM に触らない）。
// 職業を足せば自動で出る。品の名は D.ITEMS、戦技とスキルは D.SKILLS（K1・K2 の呼び分け：combat・both は「戦技」、field・passive は「スキル」）、
// 魔法は D.SPELLS（S.spells の初期値 D.SPELL_START。誰でも使える炎と癒しは「最初から覚えている」ものではないので出さない）。
// 職業の名前は書かない（E5 が名前を変える作業中）。名前の頭の zu21 は、表（src/data/）のあとに読むため。レーン U（作成画面）
(function (G) {
  const cre = G.cre;
  if (!cre) return;
  const D = G.data;
  const itemName = (id) => ((D.ITEMS || {})[id] || {}).name || id;

  // 戦技かスキルか（K1・K2 の呼び分け）
  cre.skillKindName = (sk) => (sk && (sk.kind === "field" || sk.kind === "passive") ? "スキル" : "戦技");

  // 職業ひとつ分（id を渡す）。無い職業なら null
  cre.classInfo = (cls) => {
    const c = (D.CLASSES || {})[cls];
    if (!c) return null;
    const gear = [c.weapon, c.armor].filter(Boolean).map(itemName);
    const items = Object.entries(c.items || {}).map(([id, n]) => itemName(id) + (n > 1 ? "×" + n : ""));
    const skills = ((D.SKILL_START || {})[cls] || [])
      .map((id) => ({ id, sk: (D.SKILLS || {})[id] })).filter((x) => x.sk)
      .map(({ id, sk }) => ({ id, name: sk.name, hint: sk.hint || "", kind: cre.skillKindName(sk) }));
    const spells = ((D.SPELL_START || {})[cls] || [])
      .map((id) => ({ id, sp: (D.SPELLS || {})[id] })).filter((x) => x.sp)
      .map(({ id, sp }) => ({ id, name: sp.name, hint: sp.hint || "" }));
    return { gear, items, gold: c.gold || 0, skills, spells };
  };

  // 画面に出す行（[見出し, 中身] の並び）。中身の無い行は作らない
  cre.classLines = (cls) => {
    const o = cre.classInfo(cls);
    if (!o) return [];
    // 効き目の文に括弧が入ることがあるので、名前と効き目は「：」でつなぐ
    const one = (x) => (x.hint ? `${x.name}：${x.hint}` : x.name);
    const rows = [];
    if (o.gear.length) rows.push(["初期装備", o.gear.join("・")]);
    if (o.items.length) rows.push(["持ち物", o.items.join("・")]);
    rows.push(["所持金", `${o.gold}G`]);
    // 戦技とスキルは呼び名ごとにまとめる（「最初の戦技」「最初のスキル」）
    for (const kind of ["戦技", "スキル"]) {
      const list = o.skills.filter((s) => s.kind === kind);
      if (list.length) rows.push(["最初の" + kind, list.map(one).join("／")]);
    }
    // 戦技を持たない職業は、最初から覚えている魔法を出す（持ち主の決定。両方ある職業は両方）
    if (o.spells.length) rows.push(["覚えている魔法", o.spells.map(one).join("／")]);
    return rows;
  };
})(globalThis.G = globalThis.G || {});
