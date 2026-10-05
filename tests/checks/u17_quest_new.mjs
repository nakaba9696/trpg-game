// U17：依頼が増えた・進んだことの印（engine/zzzzzzzzzzz_u17_quest_new.js・ui/u17_quest_new.js）
// - ギルドの依頼を受けると、記録に色付きの一行（k: "quest"・「依頼『〇〇』を引き受けた」）、右上の「！」（S.q17.bang）、一覧の「新」（fresh = "new"）
// - 一覧を開くと「！」が消え（seen）、閉じると「新」も消える（clear）。達成すると「果たした」の一行と「進展」
// - 仲間の頼みごと（会話で頼まれる）・R3 の続きのように G.q7.list に載るものは、どれも同じに拾う
// - 期限が近づいただけ・ただの行動では印が付かない。古いセーブ（S.q17 が無い）でも、最初の行動で増えた依頼を拾う
export default ({ G, fail, seeded }) => {
  const D = G.data;
  const F = (m) => fail("U17 依頼の印: " + m);
  if (!G.q17 || !G.q17.scan) { F("G.q17 が無い"); return; }
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "印試し", sex: "女", age: 25, history: "テスト用", personality: "慎重" } });
    return G.S;
  };
  const take = (S, kind) => {
    const q = G.q5.make(G.q5.type(kind), S, { i: 0 });
    if (!q) return null;
    q.twist = "";
    S.board = { loc: S.loc, day: S.day, list: [q], q5: 1 };
    S.mode = "fac"; S.fac = "guild";
    G.act("guild:take:" + q.id);
    S.mode = "explore"; S.fac = null;
    return S.quests.find((x) => x.id === q.id) || null;
  };
  const lines = (S, from) => S.log.slice(from).filter((e) => e.k === "quest").map((e) => e.text);

  // 始めたばかり：印なし
  let S = start(1);
  if (!S.q17 || S.q17.bang || Object.keys(S.q17.fresh || {}).length) F("始めたばかりで印がある");

  // ギルドの依頼を受ける
  S.loc = "karna";
  let at = S.log.length;
  const q = take(S, "guard");
  if (!q) { F("依頼を受けられない（試しの前提）"); return; }
  let L = lines(S, at);
  if (!L.some((t) => t.includes(`依頼『${q.title}』を引き受けた`))) F(`受けたときの一行が無い：${JSON.stringify(L)}`);
  if (!G.q17.bang(S)) F("受けても右上の「！」が付かない");
  if (G.q17.freshOf(S, "g:" + q.id) !== "new") F("受けた依頼に「新」が付かない");
  // 一覧を開く → 「！」が消える。閉じる → 「新」も消える
  G.q17.seen(S);
  if (G.q17.bang(S)) F("一覧を開いても「！」が消えない");
  if (G.q17.freshOf(S, "g:" + q.id) !== "new") F("開いただけで「新」が消える（閉じるまで残す）");
  G.q17.clear(S);
  if (G.q17.freshOf(S, "g:" + q.id)) F("閉じても「新」が残る");
  // 何も変わらない行動・期限が近づいただけでは印が付かない
  at = S.log.length;
  S.day = q.deadline - 1;
  if (G.q17.scan(S).length || G.q17.bang(S) || lines(S, at).length) F("期限が近づいただけで印が付く");
  // 達成 → 「果たした」と「進展」
  q.done = true;
  const got = G.q17.scan(S);
  if (!got.some((x) => x.how === "ready") || !lines(S, at).some((t) => t.includes("果たした"))) F("達成したときの一行が無い");
  if (!G.q17.bang(S) || G.q17.freshOf(S, "g:" + q.id) !== "up") F("達成した依頼に「！」「進展」が付かない");
  if (G.q17.scan(S).length) F("同じ状態で二度知らせる");
  G.q17.clear(S);
  // 報告して一覧から消える → 印は付かない
  S.mode = "fac"; S.fac = "guild";
  G.act("guild:report:" + q.id);
  S.mode = "explore"; S.fac = null;
  if (G.q17.bang(S)) F("報告して一覧から消えたのに「！」が付く");

  // 仲間の頼みごと（会話で頼まれる）
  const id = Object.keys(D.Q9 || {})[0];
  if (id) {
    S = start(3);
    S.tk = S.tk || {};
    S.tk.heard = Object.assign({}, S.tk.heard, { [G.q9.topicId(id, 0)]: true });
    at = S.log.length;
    const r = G.q17.scan(S);
    if (!r.some((x) => x.key === "m:" + id && x.how === "new") || !lines(S, at).length) F("会話で頼まれた頼みごとを拾わない");
    G.q17.clear(S);
    // 一行を離れただけ（説明の文が変わる）では「進んだ」にしない
    const comps = S.companions;
    S.companions = [];
    if (G.q17.scan(S).length) F("仲間が一行を離れただけで「進んだ」になる");
    S.companions = comps;
    // 次の段へ
    if (D.Q9[id].steps.length > 1) {
      S.q9 = Object.assign({}, S.q9, { [id]: Object.assign({}, (S.q9 || {})[id], { n: 1 }) });
      S.tk.heard[G.q9.topicId(id, 1)] = true;
      const r2 = G.q17.scan(S);
      if (!r2.some((x) => x.key === "m:" + id && x.how === "up")) F("頼みごとの段が進んでも拾わない");
    }
  }

  // R3 の続き（一覧に載る仕組みならどれでも）
  const fid = Object.keys(D.R3_FOLLOW || {})[0];
  if (fid) {
    S = start(5);
    S.r3 = Object.assign({ follow: {} }, S.r3 || {});
    S.r3.follow = Object.assign({}, S.r3.follow, { [fid]: 1 });
    if (G.q7.list(S).some((x) => x.key === "r3:" + fid)) {
      if (!G.q17.scan(S).some((x) => x.key === "r3:" + fid && x.how === "new")) F("R3 の続きを拾わない");
    }
  }

  // 古いセーブ：S.q17 が無い → 最初の行動の前の一覧は知っていることにし、行動で増えた依頼は拾う
  S = start(7);
  S.loc = "karna";
  delete S.q17;
  try {
    const q2 = take(S, "guard");
    if (q2) {
      if (!S.q17 || G.q17.freshOf(S, "g:" + q2.id) !== "new" || !G.q17.bang(S)) F("古いセーブで、最初の行動で受けた依頼を拾わない");
    }
    delete S.q17;
    S.quests.push({ id: "oldx", type: "deliver", title: "古い荷運び", desc: "荷", reward: 10, done: false });
    if (G.q17.scan(S).length) F("古いセーブを読んだだけで、前からある依頼を「新」にする");
    S.q17 = { sig: "壊れ", fresh: null };
    G.q17.scan(S);
    G.q17.bang(S);
  } catch (err) { F(`古いセーブ・壊れた S.q17 で止まる：${err.message}`); }

  // 一行の言い回し
  if (!/^依頼『.+』を引き受けた/.test(G.q17.line({ title: "テスト", how: "new" }))) F("引き受けたときの言い回しが違う");
  G.S = null;
  if (G.q17.scan().length || G.q17.bang()) F("冒険が無いときに印がある");
};
