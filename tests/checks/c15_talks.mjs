// C15：段ごとの深い話と、仲間にならない人の段の出来事（src/engine/zzzzzzzzzzzzzzzzz_c15_talks.js・src/data/c15_*.js）
// - 表：深い話のある人は仲間になる人で、段 0〜4 の五つがそろい、題・本文・返し（二つ以上）がある。会話の表（D.TALK）に入っている
// - 出方：その段で上限に届くまでは出ず、届くと話題の一覧のいちばん上に出る。前の段の話を聞くまで次の段の話は出ない
// - 条件：深い話のある人は、その段の話を聞くまで次の段へ進めない（聞けば進む）
// - 仲間にならない人の段の出来事：段 0〜3 の型があり、どの型も選択肢が二つ以上・差し込みが埋まる
// （全員が出来事で最後の段まで届くこと・日数だけでは進まないことは tests/checks/c14_stages.mjs が確かめる）
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("C15: " + m); };
  const D = G.data;
  const T = D.C15_TALK || {};
  const P = D.C2_PEOPLE || {};
  const ids = Object.keys(T);
  if (!ids.length) F("深い話が一人ぶんも無い");
  for (const id of ids) {
    if (!P[id] || !P[id].join) { F(`${id}: 仲間になる人でない`); continue; }
    for (let k = 0; k <= 4; k++) {
      const t = T[id][k];
      if (!t) { F(`${id}: 段 ${k} の深い話が無い`); continue; }
      if (!t.title || !(t.text || []).length || (t.replies || []).length < 2) F(`${id}: 段 ${k} の話に題・本文・返し（二つ以上）が無い`);
      if (!((D.TALK[id] || {}).topics || []).some((x) => x.id === G.c15.topicId(id, k))) F(`${id}: 段 ${k} の話が会話の表に入っていない`);
    }
  }
  const V = D.C15_VISIT || {};
  for (let k = 0; k <= 3; k++) {
    const list = V[k] || [];
    if (!list.length) F(`仲間にならない人の段 ${k} の出来事の型が無い`);
    for (const t of list) {
      if (!t.title || !t.text || (t.choices || []).length < 2) F(`段 ${k} の型「${t.title}」に題・本文・選択肢（二つ以上）が無い`);
      const filled = G.c15.fill(`${t.text}${t.choices.map((c) => c.label + c.text).join("")}`, "valeon");
      if (/\{[a-z]+\}/.test(filled)) F(`段 ${k} の型「${t.title}」に埋まらない差し込みがある`);
    }
  }

  // ---------------------------------------------------------------- 遊んで確かめる
  const id = ids[0];
  const g = loadEngine();
  g.rand = seeded(1515);
  g.P = { trophies: {}, graves: [] };
  const st = {}, caps = {};
  g.data.STATS.forEach((k) => { st[k] = 60; caps[k] = 80; });
  g.newGame({ cls: "merc", stats: st, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
  g.S.day = 10; g.S.loc = P[id].join.home[0]; g.S.visited[g.S.loc] = true; g.S.mode = "explore";
  g.c2Join(id);
  const c = g.S.companions.find((x) => x.c2 === id);
  const pump = () => { for (let i = 0; i < 40; i++) g.affAdd(id, 20, true); };
  const hear = (k) => { const tk = (g.S.tk = g.S.tk || {}); tk.heard = tk.heard || {}; tk.heard[g.c15.topicId(id, k)] = { day: g.S.day, k: "x", seq: 0 }; };
  // 段 1（知人）で、上限の手前では出ない・上限で出て一覧のいちばん上
  g.S.c14 = { st: { [id]: 1 }, day: {}, told: {} };
  hear(0);
  g.affState()[id] = 20;
  if (g.c15.sceneFor(c, g.S)) F("上限の手前で深い話が出る");
  pump();
  const sc = g.c15.sceneFor(c, g.S);
  if (!sc || sc.id !== g.c15.topicId(id, 1)) F("上限に届いても、その段の深い話が出ない");
  else if (g.tk.pickMenu(c, g.S)[0].id !== sc.id) F("深い話が一覧のいちばん上に出ない");
  // 前の段の話を聞いていなければ出ない
  delete g.S.tk.heard[g.c15.topicId(id, 0)];
  if (g.c15.sceneFor(c, g.S)) F("前の段の話を聞いていないのに、次の段の話が出る");
  hear(0);
  // 聞くまでは次の段の条件が足りない（頼みごとなどは済ませてあっても）
  const tk = g.S.tk; tk.heard = tk.heard || {};
  g.data.TALK[id].topics.filter((t) => t.kind === "past").forEach((t) => { tk.heard[t.id] = { day: 1, k: "x", seq: 0 }; });
  const q = g.data.Q9[id]; if (q) g.S.q9 = { [id]: { n: q.steps.length, day: 1, r: [], end: Object.keys(q.ends || {})[0] } };
  if (!g.c14.missing(id, 2).includes("talk")) F("深い話を聞く前に、次の段の条件がそろっている");
  hear(1);
  if (g.c14.missing(id, 2).length) F(`深い話を聞いても、次の段の条件がそろわない（${g.c14.missing(id, 2)}）`);

  if (!bad) ok(`C15：段ごとの深い話（${ids.length} 人・${ids.length * 5} 話）・仲間にならない人の段の出来事（型 ${Object.values(V).flat().length}）`);
};
