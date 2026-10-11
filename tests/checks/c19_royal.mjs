// C19（組 1）：王家・十指・帝国・共和国の 26 人（src/data/zv3_c19_royal.js・zv3_c19_royal_events.js）
// - 当て布と文の差し替えが全部当たった（G.c19royal.missing・G.v3prose.missing に担当の出来事が無い）
// - 足した再会の出来事が全部あり、その人の居る場所で起き、図鑑に記録される（c2 が人物を指す）。会う前・死んだあとは起きない
// - 一場面しか無かった人に二度目の場面がある
// - 第四王子の新しい名（アルマン）が本文に出て、前の名（グレオル）は見える文に残っていない（前の名は C3_NAMES の was だけ）
// - ロウェル・オルヴェインの名が本文に出る。ネイラスにシェイラ同行の分岐がある
// - 小声で正体を教える入り方を外した出来事に「小声」「教えてくれた」が残っていない
// - 足した出来事を DOM なしで一つずつ走らせて、どの選択肢でも落ちない
export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C19 組1: " + m); };
  const D = G.data;
  const X = G.c19royal || {};
  (X.missing || []).forEach((m) => F(`当て布が当たらない：${m}`));
  const MINE = /^(c2_|w3_t_glasses|c19r_)/;
  ((G.v3prose && G.v3prose.missing) || []).filter((m) => MINE.test(m)).forEach((m) => F(`文の差し替えが当たらない：${m}`));

  // ---------------------------------------------------------------- 足した出来事
  const ids = X.events || [];
  const PEOPLE = ["valeon", "raios", "greol", "sixth", "tiria", "neilas", "serios", "ferida", "sig", "raisha", "bride", "greiol", "valg", "dario", "erna", "malvina", "katia", "alicia", "doctor"];
  const TAGS = new Set(["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm"]);
  const byId = new Map(D.EVENTS.map((e) => [e.id, e]));
  if (ids.length < PEOPLE.length) F(`足した出来事が ${ids.length}（${PEOPLE.length} 以上のはず）`);
  for (const id of ids) {
    const e = byId.get(id);
    if (!e) { F(`出来事 ${id} が無い`); continue; }
    const c2 = [].concat(e.c2 || []);
    if (!c2.length || c2.some((p) => !D.C2_PEOPLE[p] || !D.F2_PEOPLE[p])) F(`${id}：c2 が人物の表・図鑑を指していない`);
    if (!e.who || !e.once || !(e.w > 0) || typeof e.cond !== "function") F(`${id}：絵・一度きり・起きやすさ・条件のどれかが無い`);
    for (const w of e.where) if (!TAGS.has(w) && !D.LOCS[w]) F(`${id}：場所 ${w} が無い`);
    if (G.f2 && G.f2.peopleInEvent && !c2.every((p) => G.f2.peopleInEvent(id).includes(p))) F(`${id}：図鑑に記録されない`);
  }
  for (const p of PEOPLE) if (!ids.some((id) => [].concat((byId.get(id) || {}).c2 || []).includes(p))) F(`${p} に二度目の場面が無い`);

  // 一場面しか無かった人に、二場面以上
  const scenes = (p) => D.EVENTS.filter((e) => [].concat(e.c2 || []).includes(p)).length;
  for (const p of PEOPLE) if (scenes(p) < 2) F(`${p} の場面が ${scenes(p)}`);

  // ---------------------------------------------------------------- 名前
  const N = D.C3_NAMES.greol;
  if (!N || N.name !== "アルマン" || !(N.was || []).includes("グレオル")) F("第四王子の名がアルマンでないか、was に前の名が無い");
  if (D.C2_PEOPLE.greol.name !== "アルマン") F(`人物の表の第四王子の名が ${D.C2_PEOPLE.greol.name}`);
  const texts = [];
  const seen = new Set();
  const walk = (o, where) => {
    if (o == null) return;
    if (typeof o === "string") { texts.push([where, o]); return; }
    if (typeof o !== "object" || seen.has(o)) return;
    seen.add(o);
    for (const [k, v] of Object.entries(o)) { if (o === D.C3_NAMES && k === "greol") continue; walk(v, where); }
  };
  for (const k of ["EVENTS", "F2_PEOPLE", "C2_PEOPLE", "LORE", "WORLD", "RUMORS", "C3_NAMES", "AMBIENT"]) walk(D[k], k);
  const old = texts.filter(([, t]) => t.includes("グレオル"));
  if (old.length) F(`前の名「グレオル」が見える文に残っている：${old.slice(0, 3).map(([w, t]) => `${w}「${t.slice(0, 30)}」`).join("・")}`);
  const evText = (e) => { const out = [e.text]; for (const c of e.choices || []) for (const o of [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win]) if (o && o.text) out.push(o.text); return out.join("\n"); };
  const all = D.EVENTS.map(evText).join("\n");
  for (const nm of ["アルマン", "オルヴェイン", "ロウェル", "マリエッタ", "モルヴァン"]) if (!all.includes(nm)) F(`${nm}の名が本文に出ない`);
  if (!evText(byId.get("c2_lab_after") || {}).includes("ロウェル")) F("アンジェリカが最後にロウェルの名を呼ばない");

  // ---------------------------------------------------------------- 入り方と分岐
  for (const id of ["c2_raios", "c2_farina", "c2_greol", "c2_tiria", "c2_sixth", "c2_ferida", "c2_dario", "c2_erna", "c2_malvina", "c2_katia"]) {
    const e = byId.get(id);
    if (!e) { F(`${id} が無い`); continue; }
    if (/小声|教えてくれた/.test(evText(e))) F(`${id}：小声で正体を教える入り方が残っている`);
  }
  if (/役割を選べない/.test(evText(byId.get("c2_katia") || {}))) F("カティアが初対面で主題を口で言っている");
  if (!((byId.get("c2_neilas") || {}).choices || []).some((c) => c.label === "シェイラを前に出す")) F("ネイラスにシェイラ同行の分岐が無い");
  if (/斬ったところは見えなかった/.test(evText(byId.get("c2_yurina_mine") || {}))) F("ユリナの剣が見えない斬撃のまま");
  if (/と思ったときには/.test(evText(byId.get("c2_sixth") || {}))) F("オルヴェインの剣が見えない斬撃のまま");

  // ---------------------------------------------------------------- 走らせる
  const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口" };
  let runs = 0;
  for (const id of ids) {
    const e0 = byId.get(id);
    if (!e0) continue;
    const people = [].concat(e0.c2 || []);
    const loc = e0.where.find((w) => D.LOCS[w]) || "karna";
    for (let i = 0; i < (e0.choices || []).length; i++) {
      const g = loadEngine();
      g.rand = seeded(19 + i);
      g.P = { trophies: {}, graves: [] };
      const stats = {}, caps = {};
      g.data.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
      g.newGame({ cls: "merc", stats, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
      const S = g.S;
      S.maxHp = S.hp = 999; S.gold = 500; S.loc = loc; S.visited[loc] = true;
      S.day = 1;
      const e = g.data.EVENTS.find((x) => x.id === id);
      if (e.cond(S)) F(`${id}：会う前に起きる`);
      people.forEach((p) => g.c2Meet(p));
      S.day = 40;
      Object.assign(S.flags, { c2_valeon_eye: true, c19_yurina_word: true, c19_sig_axe: true, c3_boku_name: true, c2_ange3: true, "ev:c2_valg": true });
      if (!e.cond(S)) { F(`${id}：会って日がたっても起きない`); continue; }
      const ch = (e.choices || [])[i];
      if (ch.cond && !ch.cond(S)) continue;
      try {
        g.startEvent(id);
        const c = g.eventChoices().find((x) => x.c === ch || x.c.label === ch.label);
        if (!c) { F(`${id}「${ch.label}」が選べない`); continue; }
        g.act("ev:" + c.i);
        for (let k = 0; k < 30 && S.mode === "combat"; k++) { S.combat.foes.forEach((f) => { if (f.hp > 0) f.hp = 1; }); g.act("cb:attack"); }
        runs++;
      } catch (err) { F(`${id}「${ch.label}」で例外：${err.message}`); }
      if (people.some((p) => !g.c2Met(p, S))) F(`${id}：出来事のあと、その人に会ったことになっていない`);
      if (people.some((p) => !(g.codexPerson && g.codexPerson(p)))) F(`${id}：図鑑に載らない`);
      // 死んだあとは起きない
      people.forEach((p) => { g.c2State(S).gone[p] = true; });
      if (e.cond(S)) F(`${id}：死んだ・去った人の出来事が起きる`);
    }
  }
  if (!n) ok(`C19 組1（再会の出来事 ${ids.length}・走らせた選択肢 ${runs}・第四王子はアルマン）`);
};
