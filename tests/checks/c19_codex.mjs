// C19（組 3）：使徒の人の姿・眷属・図鑑だけの人（src/data/zv3_c19_codex*.js・src/engine/zzzzzzzzzzzzzzzzzz_c19_codex.js）
// - 足した出来事が全部あり、図鑑（D.F2_PEOPLE の events）に記録され、話す人の札がその人になる
// - 足した出来事は、条件をそろえると起き、どの選択肢を選んでも止まらない（DOM なし）
// - 当て布（D.C19C.MISS）と文の差し替え（D.V3_PROSE）が全部当たった
// - 新しい名・名乗りが本文に出る（ウルリヒ・ドーレ・ヨアヒム・コルサーノ・オスヴィン）
// - 同じ名前の別人が本文に残っていない（ハンス・トマス・ゲルト・ベンノ・リタ・グレタ。仲間の筋の人だけ残す）
// - 生き聖女の口に「あら」が無い。ユズエルとサルフィエルの決め台詞が別の文。使徒の会う出来事の縁の目・呼び返す・しくじりが使徒ごとに違う
// - 聖都の聖女の場に祠の汎用の選択肢が混ざらない
// - 宿に泊まると、まれに逆さの夢の子の一行が出て、図鑑に記録される
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C19 組3: " + m); };
  const D = G.data;
  const C19 = D.C19C || {};
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  const blob = (e) => {
    const out = [e.title, typeof e.text === "string" ? e.text : ""];
    (e.choices || []).forEach((c) => { out.push(c.label); [c.ok, c.ng, c.win, c.ok && c.ok.win, c.ng && c.ng.win].forEach((o) => o && out.push(o.text || "", o.memo || "", o.chron || "")); });
    return out.join("\n");
  };

  // ---------------------------------------------------------------- 出来事と図鑑
  const NEW = {
    c19_osv_tally: "chancellor", c19_gas_lots: "gaston", c19_inn_couple: "hans", c19_gert_fork: null, c19_gert_stone: "gert",
    c19_dom_regular: "dominik", c19_neu_coin: "neumann", c19_borg_page: "borg", c19_shion_well: "konoha", c19_alb_backdoor: "albert", c19_aur_night: "aurelia",
  };
  for (const [id, who] of Object.entries(NEW)) {
    const e = ev(id);
    if (!e) { F(`出来事 ${id} が無い`); continue; }
    if (!e.noC10) F(`${id}: 手で書いた場面なのに汎用の選択肢が足される（noC10 が無い）`);
    if (!who) { if (!(D.EVENT_NOBODY || []).includes(id)) F(`${id}: 人の出ない出来事なのに EVENT_NOBODY に無い`); continue; }
    if (!((D.F2_PEOPLE[who] || {}).events || []).includes(id)) F(`${id}: 図鑑の ${who} の出来事に無い`);
    const tag = G.whoTag(e.who, null, id);
    const want = G.personTag(who, null).name;
    if (!tag || tag.name !== want) F(`${id}: 話す人の札が「${tag && tag.label}」（${want} にする）`);
  }
  if (!((D.F2_PEOPLE.greta || {}).events || []).includes("c19_inn_couple")) F("宿の夫婦の場面が女将の図鑑に記録されない");
  for (const id of ["e7m_7", "e7m_9c", "e7m_9_last", "e7m_9_flee"]) {
    if (!ev(id)) F(`日傘の若君の長編の出来事 ${id} が無い`);
    if (!(D.F2_PEOPLE.mirza.events || []).includes(id)) F(`日傘の若君の図鑑に ${id} が無い`);
  }
  // 図鑑だけの八人は、出来事が二つ以上（宰相は施設と出来事）
  for (const id of ["gaston", "joachim", "hans", "greta", "gert", "dominik", "neumann"]) {
    const evs = (D.F2_PEOPLE[id] || {}).events || [];
    if (id !== "joachim" && evs.length < 2) F(`${id}: 図鑑に載る出来事が一つしかない`);
  }
  if (!((D.F2_PEOPLE.chancellor || {}).events || []).length) F("宰相の出来事が図鑑に無い");

  // ---------------------------------------------------------------- 当て布・差し替え
  if ((C19.MISS || []).length) F(`当たらなかった当て布：${C19.MISS.join("・")}`);
  const miss = ((G.v3prose && G.v3prose.missing) || []).filter((m) => /deserter_help|r1_elf_ledger|r1_beast_molt|w1_accuse|v2_berna|m6_wall_captain/.test(JSON.stringify(m)));
  if (miss.length) F(`文の差し替えが当たらない：${JSON.stringify(miss)}`);

  // ---------------------------------------------------------------- 新しい名・名乗りが本文に出る
  const SHOW = [["r1_elf_ledger", "ウルリヒ"], ["r1_elf_ledger", "ドーレ"], ["r1_beast_molt", "ドーレ"], ["r1_beast_molt", "ウルリヒ"], ["deserter_help", "ヨアヒム"], ["deserter_help", "七番目の隊"], ["m6_wall_captain", "コルサーノ"], ["c19_osv_tally", "オスヴィン"], ["c19_gas_lots", "ガストン"]];
  for (const [id, w] of SHOW) { const e = ev(id); if (!e || !blob(e).includes(w)) F(`${id} の本文に「${w}」が出ない`); }
  for (const [id, nm] of [["hans", "ウルリヒ"], ["greta", "ドーレ"]]) {
    if (G.personTag(id, null).name !== nm) F(`${id} の名前が ${nm} になっていない`);
    if (!((D.C3_NAMES[id] || {}).was || []).length) F(`${id} の前の呼び名（was）が無い`);
  }

  // ---------------------------------------------------------------- 同じ名前の別人
  // 仲間の筋（q9_*。talk・c15・c13・恋の表は出来事の外）の人と、残す一人だけ
  const K = "ァ-ヶー・";
  const word = (w) => new RegExp(`(?<![${K}])${w}(?![${K}])`);
  const KEEP = {
    ハンス: (e) => /^q9_felix/.test(e.id),
    トマス: (e) => e.c2 === "tomas" || /^c12_tom/.test(e.id),
    ゲルト: (e) => ["r1_elf_grandfather", "c19_gert_fork", "c19_gert_stone"].includes(e.id),
    ベンノ: (e) => /^w3_t_whistle/.test(e.id),
    リタ: (e) => /^q9_/.test(e.id),
    グレタ: (e) => /^q9_/.test(e.id),
  };
  for (const [w, keep] of Object.entries(KEEP)) {
    const re = word(w);
    const bad = D.EVENTS.filter((e) => !keep(e) && re.test(blob(e))).map((e) => e.id);
    if (bad.length) F(`「${w}」が別の人の出来事に残っている：${bad.join("・")}`);
    const r = (D.RUMORS || []).filter((t) => re.test(String(t)));
    if (r.length) F(`「${w}」が噂に残っている：${r[0]}`);
  }
  const R5 = D.R5_NAMED || {};
  const r5names = Object.values(R5).map((p) => p.name);
  for (const w of ["ベンノ", "リタ"]) if (r5names.filter((x) => x === w).length > 1) F(`名のある人の表に「${w}」が二人いる`);

  // ---------------------------------------------------------------- 使徒の声
  for (const id of ["w1_miracle", "w1_misprayer", "w1_accuse", "c19_aur_night"]) if (ev(id) && /「あら/.test(blob(ev(id)))) F(`${id}: 生き聖女の口に「あら」がある`);
  const leave = (id) => { const e = ev(id); return e ? e.choices.map((c) => (c.ok && c.ok.text) || "").find((t) => /刃を向けるなら|刃でも/.test(t)) || "" : ""; };
  const sal = leave("e3_meet_salphiel"), yuz = leave("e3_meet_yuzuel");
  if (!sal || !yuz) F("サルフィエル・ユズエルの去りぎわの台詞が見つからない");
  else if (/そのほうが楽しい/.test(sal) && /そのほうが楽しい/.test(yuz)) F("サルフィエルとユズエルの決め台詞が同じ形のまま");

  // ---------------------------------------------------------------- 一つずつ動かす
  const st = {}, caps = {};
  D.STATS.forEach((k) => { st[k] = 60; caps[k] = 80; });
  let g = null;
  const start = (loc, flags, race) => {
    g = loadEngine();
    g.rand = seeded(19);
    g.P = { trophies: {}, graves: [] };
    g.newGame({ cls: "merc", stats: st, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE, race: race || "human" } });
    const S = g.S;
    S.maxHp = S.hp = 999; S.gold = 500; S.day = 30; S.fame = 200; S.phase = 0;
    S.loc = loc; S.visited[loc] = true;
    Object.assign(S.flags, flags || {});
    if (race && g.r1Set) g.r1Set(race, S);
    return S;
  };
  const RUN = {
    c19_osv_tally: ["garmund", {}],
    c19_gas_lots: ["w2_granbel", { c19_gaston: true, c19_gaston_ring: true }],
    c19_inn_couple: ["karna", {}],
    c19_gert_fork: ["plains", { "ev:r1_elf_grandfather": true }, "elf"],
    c19_gert_stone: ["karna", { c19_gert_mark: true, c19_gert_road: true, c19_gert_mine: true }, "elf"],
    c19_dom_regular: ["karna", { "c19:r1_beast_meat": true }],
    c19_neu_coin: ["karna", { "c19:r1_nose_ring": true, "ev:d6_w_coin": true }],
    c19_borg_page: ["karna", { "ev:v1_borg": true }],
    c19_shion_well: ["w1_oboro", { w1_yoifav: true }],
    c19_alb_backdoor: ["leavel", { "c19:r1_church_door": true }],
    c19_aur_night: ["w1_holy", { c19_aur_lips: true }],
  };
  let runs = 0;
  for (const [id, [loc, flags, race]] of Object.entries(RUN)) {
    const e0 = ev(id);
    if (!e0) continue;
    for (let i = 0; i < e0.choices.length; i++) {
      for (const lucky of [0.01, 0.99]) {
        const S = start(loc, flags, race);
        if (id === "c19_aur_night") S.phase = 3;
        if (race === "elf" && g.r1Is && !g.r1Is("elf", S)) { F(`${id}: エルフの主人公を作れない（試せない）`); break; }
        const e = g.data.EVENTS.find((x) => x.id === id);
        if (e.cond && !e.cond(S)) { F(`${id}: 条件をそろえても起きない`); break; }
        try {
          g.startEvent(id);
          if (S.mode !== "event") { F(`${id}: 始まらない`); break; }
          const who = NEW[id];
          if (who && !g.codexPerson(who)) F(`${id}: 会っても図鑑の ${who} に記録されない`);
          const list = g.eventChoices();
          const pick = list.find((x) => x.i === i);
          if (!pick) continue; // 条件つきの選択肢（指輪・石の話など）で、この試しでは出ないもの
          const r = g.rand; g.rand = () => lucky;
          try { g.act("ev:" + i); } finally { g.rand = r; }
          for (let k = 0; k < 30 && S.mode === "combat"; k++) { S.combat.foes.forEach((f) => { if (f.hp > 0) f.hp = 1; }); g.act("cb:attack"); }
          runs++;
        } catch (x) { F(`${id} の選択肢 ${i}（${e0.choices[i].label}）で止まった：${x && x.stack ? x.stack.split("\n").slice(0, 3).join(" ") : x}`); }
      }
    }
  }
  // 騎士ガストンが麦わらを取ると、隊を離れる
  {
    const S = start("w2_granbel", { c19_gaston: true });
    g.addCompanion({ name: "茹で騎士ガストン", cls: "傭兵", power: 55, dmg: 2, desc: "テスト" });
    g.startEvent("c19_gas_lots");
    if (!/俺の村だ/.test(S.log.map((l) => l.text).join("\n"))) F("ガストンが隊にいるときの書き出しになっていない");
    const i = g.data.EVENTS.find((x) => x.id === "c19_gas_lots").choices.findIndex((c) => /どうするのか/.test(c.label));
    const r = g.rand; g.rand = () => 0.01;
    try { g.act("ev:" + i); } finally { g.rand = r; }
    if ((S.companions || []).some((c) => /ガストン/.test(c.name))) F("ガストンが麦わらを取っても隊に残っている");
  }

  // ---------------------------------------------------------------- 縁の目・呼び返す・しくじり（使徒ごと）
  {
    const S = start("mountains", {});
    g.eventChoices && (S.mode = "explore");
    if (g.m13 && g.m13.apply) g.m13.apply();
    const texts = {};
    for (const id of C19.MEET_IDS || []) {
      const e = g.data.EVENTS.find((x) => x.id === "e3_meet_" + id);
      if (!e) { F(`e3_meet_${id} が無い`); continue; }
      const t = e.choices.filter((c) => /縁の目|呼び返す/.test(c.label)).map((c) => (c.ok && c.ok.text) || "");
      if (t.length < 2) { F(`e3_meet_${id} に縁の目・呼び返すの選択肢が無い`); continue; }
      texts[id] = t.join("|");
      if (/背中で相手が初めて黙った/.test(t.join(""))) F(`e3_meet_${id}: 呼び返したあとの一行が共通の文のまま`);
    }
    const vals = Object.values(texts);
    if (new Set(vals).size !== vals.length) F("使徒の会う出来事の縁の目・呼び返すの文に、同じものがある");
    const ngs = ["mirza", "zalve", "aurelia", "yoihime", "chezar", "yura", "azlag"].map((id) => { const e = ev("e3_meet_" + id); const c = e && e.choices.find((x) => x.label === "様子をうかがう"); return c && c.ng && c.ng.text; });
    if (new Set(ngs).size !== ngs.length || ngs.some((t) => !t || /気づかれる前にそっと離れた/.test(t))) F("「様子をうかがう」のしくじりが使徒ごとに違わない");
    // 聖都の聖女の場に祠の型の選択肢が混ざらない
    const m = g.data.EVENTS.find((x) => x.id === "w1_miracle");
    if (m && m.choices.some((c) => /屋根|台座|気配に、耳/.test(c.label))) F(`w1_miracle に祠の汎用の選択肢が混ざっている：${m.choices.map((c) => c.label).join("・")}`);
  }

  // ---------------------------------------------------------------- 逆さの夢（宿）
  {
    const S = start("karna", {});
    const yura0 = g.codexPerson("yura");
    if (!g.data.C19C.yuraCan(S)) F("宿の逆さの夢が起きる条件にならない");
    const r = g.rand; g.rand = () => 0;
    try { g.facAct("inn", "rest"); } finally { g.rand = r; }
    const said = S.log.map((l) => l.text).join("\n");
    if (!/まだ起きないでね/.test(said)) F("宿に泊まっても逆さの夢の一行が出ない（乱数を最小にしても）");
    if (yura0 || !g.codexPerson("yura")) F("逆さの夢を見ても図鑑に逆さの夢の子が記録されない");
    if (g.data.C19C.yuraCan(S)) F("逆さの夢が、日を空けずに続けて起きる");
    S.flags["e3:yura"] = true; S.day += 30;
    if (g.data.C19C.yuraCan(S)) F("逆さの夢の子を倒したのに、まだ夢を見る");
  }

  if (!n) ok(`C19 組3：出来事 ${Object.keys(NEW).length}・選択肢を ${runs} 回動かした・同名 ${Object.keys(KEEP).length} 件なし・使徒の会う出来事 ${(C19.MEET_IDS || []).length}`);
};
