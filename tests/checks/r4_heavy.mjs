// R4：命や仲間に関わる重い出来事では、正気による入れ替わりが起きない（src/engine/zzzzzzzzzzzz_r4_heavy.js・src/data/r4_heavy.js・src/engine/sanity_m5.js）
// - 見分け方：恋と結婚・仲間の裏切りと別れ・使徒との対面・因縁と続き・F4 の迷う選択と返り・目的の節目と光の壁・仲間の頼みの決着・表に書いた出来事は重い。ふつうの出来事は重くない
// - 崩れかけで、入れ替わりの見込みが必ず当たるようにしても、重い出来事では押した選択肢がそのまま選ばれる。ふつうの出来事では今までどおり入れ替わる
// - 表（D.R4_HEAVY.ids）の出来事がすべてある
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  let bad = 0;
  const f = (m) => { bad++; fail("R4 重い選択: " + m); };
  if (!G.heavyEvent || !D.R4_HEAVY) { f("G.heavyEvent か D.R4_HEAVY が無い"); return; }
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  for (const id of D.R4_HEAVY.ids) if (!ev(id)) f(`表の出来事 ${id} が無い`);

  // 見分け方
  const must = (pred, what) => { const list = D.EVENTS.filter(pred); if (!list.length) f(`${what} の出来事が見つからない`); list.forEach((e) => { if (!G.heavyEvent(e)) f(`${what}：${e.id}（${e.title}）が重くない`); }); return list.length; };
  let n = 0;
  n += must((e) => /^m10_(confess|propose|wedding)/.test(e.id), "恋と結婚");
  n += must((e) => /^m2_(betray|leave|farewell|grave|sky)/.test(e.id), "仲間の裏切りと別れ");
  n += must((e) => /^e3_meet_/.test(e.id), "使徒との対面");
  n += must((e) => /^f2_/.test(e.id) || /^f2r_/.test(e.id), "因縁と続き");
  n += must((e) => /^f4d_/.test(e.id) || !!e.echo, "迷う選択と返り");
  n += must((e) => /^m6_/.test(e.id), "節目と光の壁");
  n += must((e) => e.q9 && e.choices.some((c) => [c.ok, c.ng].some((o) => o && o.end)), "仲間の頼みの決着");
  n += must((e) => e.choices.some((c) => [c.ok, c.ng].some((o) => o && o.c2dead)), "人の死");
  n += must((e) => D.R4_HEAVY.ids.includes(e.id), "表");
  const light = ["goblinnest", "c2_t_dil_book", "u3_graves", "w2_oath"].filter(ev);
  light.forEach((id) => { if (G.heavyEvent(id)) f(`ふつうの出来事 ${id} が重いことになっている`); });
  const share = D.EVENTS.filter((e) => G.heavyEvent(e)).length / D.EVENTS.length;
  if (share > 0.3) f(`重い出来事が多すぎる（${Math.round(share * 100)}%）。ふつうの出来事でも入れ替わりが起きなくなる`);

  // 入れ替わり：見込みが必ず当たるようにして、重い出来事とふつうの出来事で一つ選ぶ
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 12]));
  const tryOne = (e, seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats: { ...stats }, goal: "sword", profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999; S.sanity = 10; S.gold = 9999;
    G.startEvent(e);
    if (S.mode !== "event" || S.event !== e.id) return null;
    const list = G.actions()[0].list.filter((x) => !x.disabled);
    if (list.length < 2) return null;
    const base = G.rand;
    let first = true;
    G.rand = () => { if (first) { first = false; return 0; } return base(); };   // 入れ替わりの見込みだけ必ず当てる
    const last = S.log[S.log.length - 1];
    G.act(list[0].id);
    G.rand = base;
    const after = G.S.log.slice(G.S.log.lastIndexOf(last) + 1);
    return { label: list[0].label, swapped: after.some((l) => l.text === D.M5.SWAP), you: after.find((l) => l.k === "you") };
  };
  let heavyTried = 0, lightSwapped = 0, lightTried = 0;
  D.EVENTS.filter((e) => G.heavyEvent(e)).slice(0, 400).forEach((e, i) => {
    const r = tryOne(e, 300 + i);
    if (!r) return;
    heavyTried++;
    if (r.swapped) f(`重い出来事 ${e.id}（${e.title}）で入れ替わった`);
    else if (r.you && r.you.text !== r.label) f(`重い出来事 ${e.id}：押した「${r.label}」と違う行動（${r.you.text}）`);
  });
  D.EVENTS.filter((e) => !G.heavyEvent(e)).slice(0, 60).forEach((e, i) => {
    const r = tryOne(e, 900 + i);
    if (!r) return;
    lightTried++;
    if (r.swapped) lightSwapped++;
  });
  if (heavyTried < 50) f(`重い出来事を確かめられた数が少ない（${heavyTried}）`);
  if (!lightSwapped) f(`ふつうの出来事で入れ替わりが起きない（${lightTried} 件）`);
  if (!bad) ok(`R4 重い選択：見分け ${n} 件・重い出来事 ${heavyTried} 件で入れ替わらない・ふつうの出来事 ${lightTried} 件中 ${lightSwapped} 件で入れ替わる（重い出来事は全体の ${Math.round(share * 100)}%）`);
};
