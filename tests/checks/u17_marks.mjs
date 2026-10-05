// U17：依頼に関係ある場所・選択肢の印（engine/zzzzzzzzzzz_u17_marks.js）
// - 旅立つボタン（G.travelMarks）：ギルドの依頼に加え、R3 の続き・仲間の頼み（C9／Q8）・噂の続きにも、どの依頼のためか分かる一言
// - 町の中・探索中（G.actMarks）：依頼に取りかかる・仲間の頼み・R3 の続き、依頼の場所での探索、報告できるギルド
// - 戦闘・出来事のあいだは印を出さない。状態を書き換えない
export default ({ G, fail, seeded }) => {
  const D = G.data;
  const F = (m) => fail("U17 依頼の印: " + m);
  if (!G.actMarks || !G.q17 || !G.q17.targets) { F("G.actMarks が無い"); return; }
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "印試し", sex: "男", age: 30, history: "テスト用", personality: "慎重" } });
    const S = G.S;
    S.event = null; S.mode = "explore"; S.fac = null;
    return S;
  };
  const neighbor = (from) => Object.keys((D.LOCS[from] || {}).links || {}).find((k) => D.LOCS[k]);

  // ギルドの依頼：隣の場所なら「依頼『〇〇』の場所」、その場では探索に印
  let S = start(21);
  S.loc = "karna";
  const nb = neighbor("karna");
  S.quests = [{ id: "m1", type: "hunt", loc: nb, target: "goblin", need: 1, progress: 0, title: "隣の見回り", desc: "見回り", reward: 10, done: false }];
  let tm = G.travelMarks(S);
  if (!tm[nb] || !tm[nb].includes("依頼『隣の見回り』")) F(`旅立つボタンに依頼の名が出ない：${JSON.stringify(tm)}`);
  G.actions(); // 選択肢を作るときに足される項目（W8 など）は先に作っておく
  const before = JSON.stringify(S);
  G.actMarks(S);
  if (JSON.stringify(S) !== before) F("印を作るだけで状態が変わる");
  S.loc = nb;
  const t = D.LOCS[nb].type;
  let am = G.actMarks(S);
  const spotId = Object.keys(am).find((id) => ["explore", "deeper", "walk"].includes(id));
  if (t !== "town" && !spotId) F(`依頼の場所で、探索の選択肢に印が無い：${JSON.stringify(am)}`);
  // 達成したら、ギルドのある町で報告の印
  S.quests[0].done = true;
  S.loc = "karna";
  am = G.actMarks(S);
  if (am["fac:guild"] !== "依頼の報告ができる") F(`報告できるギルドに印が無い：${JSON.stringify(am)}`);

  // 遠い依頼：途中の一歩に「〇〇への道（行き先）」
  S.quests = [{ id: "m2", type: "hunt", loc: "graveyard", target: "goblin", need: 1, progress: 0, title: "竜の墓場の調べ", desc: "", reward: 10, done: false }];
  tm = G.travelMarks(S);
  const way = Object.values(tm).find((x) => x.includes("竜の墓場の調べ"));
  if (!way || !way.includes(D.LOCS.graveyard.name)) F(`遠い依頼の途中の印に行き先の名が無い：${JSON.stringify(tm)}`);

  // R3 の続き
  const fid = Object.keys(D.R3_FOLLOW || {}).find((id) => D.R3_FOLLOW[id].at);
  if (fid) {
    S = start(22);
    S.loc = "karna";
    const to = D.R3_FOLLOW[fid].at.karna; // 受けた町で行き先が決まるものは、受けたときに町の id を残す（zzzzzzzz_r3_first.js）
    S.r3 = Object.assign({}, S.r3 || {}, { home: "karna", follow: { [fid]: to } });
    if (to && to !== S.loc) {
      const all = G.q17.targets(S);
      if (!all.some((x) => x.src === "r3" && x.to === to)) F("R3 の続きが印の行き先に入らない");
    }
  }

  // 仲間の頼み（C9。Q8 の恋の前の頼みも同じ表）
  const qid = Object.keys(D.Q9 || {}).find((id) => D.Q9[id].steps && D.Q9[id].steps[0] && D.Q9[id].steps[0].at);
  if (qid) {
    S = start(23);
    S.tk = S.tk || {};
    S.tk.heard = Object.assign({}, S.tk.heard, { [G.q9.topicId(qid, 0)]: true });
    const all = G.q17.targets(S);
    const m = all.find((x) => x.src === "mate");
    if (!m || m.to !== D.Q9[qid].steps[0].at || !m.at.includes(D.Q9[qid].title)) F(`仲間の頼みの行き先に印が無い：${JSON.stringify(m)}`);
  }

  // 噂の続き
  S = start(24);
  S.loc = "karna";
  G.heard("噂：竜の墓場の奥で、しゃべる剣が眠ってるって話だ。");
  if (!G.q17.targets(S).some((x) => x.src === "rumor" && x.to === "graveyard" && /噂の続き/.test(x.at))) F("噂の続きの場所に印が無い");
  if (!Object.values(G.travelMarks(S)).some((x) => /噂の続き/.test(x))) F("旅立つボタンに噂の続きの印が無い");

  // 戦闘・出来事のあいだは出さない
  S.mode = "event";
  if (Object.keys(G.actMarks(S)).length) F("出来事のあいだに選択肢の印が出る");
  G.S = null;
  if (G.q17.targets().length || Object.keys(G.travelMarks()).length || Object.keys(G.actMarks()).length) F("冒険が無いときに印がある");
};
