// Q7：受けている依頼の一覧（engine/q7_quests.js）
// - ギルドの依頼（Q5）と仲間の頼みごと（C9）が並ぶ。名前・依頼主・受けた町・状態・説明・報酬・期限
// - 状態：進行中／期限が近い／達成・報告待ち（どのギルドで報告できるか）。終わった依頼は「済み」に（果たした・しくじった・期限切れ・結末）
// - 内部の数（名声・成功率・好感度）を出さない
// - 古いセーブ（S.quests が無い・項目の足りない依頼・古い形の依頼）でも止まらない。古い形の依頼を報告すると「済み」に残る
// - キーの近道 Q（文字を打っている所・ほかの窓の上では効かない。同じキーで閉じる）
export default ({ G, fail, seeded }) => {
  const D = G.data;
  const F = (m) => fail("Q7 依頼の一覧: " + m);
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "依頼試し", sex: "女", age: 25, history: "テスト用", personality: "慎重" } });
    return G.S;
  };
  const take = (S, kind, twist) => {
    const q = G.q5.make(G.q5.type(kind), S, { i: 0 });
    if (!q) return null;
    if (twist !== undefined) q.twist = twist;
    S.board = { loc: S.loc, day: S.day, list: [q], q5: 1 };
    S.mode = "fac"; S.fac = "guild";
    G.act("guild:take:" + q.id);
    S.mode = "explore"; S.fac = null;
    return S.quests.find((x) => x.id === q.id) || null;
  };
  const NUMS = /名声|好感|成功率|[0-9０-９]+\s*[%％]/;

  // 0 件
  let S = start(1);
  if (G.q7.list(S).length !== 0) F("始めたばかりで依頼が並ぶ");
  if (G.q7.finished(S).length !== 0) F("始めたばかりで済んだ依頼がある");

  // ギルドの依頼：進行中 → 期限が近い → 報告待ち
  S = start(2);
  S.loc = "karna";
  const q = take(S, "guard", "");
  if (!q) { F("依頼を受けられない（試しの前提）"); return; }
  let L = G.q7.list(S);
  let e = L.find((x) => x.key === "g:" + q.id);
  if (!e) F("受けた依頼が一覧に無い");
  else {
    if (e.title !== q.title || e.client !== q.client.name) F(`名前か依頼主が違う：${e.title}／${e.client}`);
    if (e.from !== D.LOCS.karna.name) F(`受けた町が違う：${e.from}`);
    if (e.state !== "active" || e.stateLabel !== "進行中") F(`受けたばかりの状態が違う：${e.state}`);
    if (!e.desc.length || !e.desc.includes(q.desc)) F("説明に依頼の説明文が無い");
    if (!e.reward || !e.reward.includes(String(q.reward))) F(`報酬が出ない：${e.reward}`);
    if (!e.deadline || e.deadline.left !== q.dur || !e.deadline.date) F("期限（日付・残り日数）が出ない");
    if (e.report) F("進行中なのに報告の印がある");
  }
  S.day = q.deadline - 1;
  e = G.q7.list(S).find((x) => x.key === "g:" + q.id);
  if (!e || e.state !== "soon" || e.stateLabel !== "期限が近い") F(`期限の前日に「期限が近い」にならない：${e && e.state}`);
  q.done = true;
  e = G.q7.list(S).find((x) => x.key === "g:" + q.id);
  if (!e || e.state !== "ready" || !e.report || !/ギルド/.test(e.report.where)) F("達成した依頼が報告待ちにならない／報告先が出ない");
  if (e && !e.report.near) F("報告できる近いギルドの町が出ない");
  if (G.q7.readyCount(S) !== 1) F("報告待ちの数が 1 でない");
  // 報告待ちは一覧の先頭
  const q2 = take(S, "guard", "");
  if (q2 && G.q7.list(S)[0].key !== "g:" + q.id) F("報告待ちの依頼が一覧の先頭にない");
  // 内部の数を出さない
  G.q7.list(S).forEach((x) => { const t = [x.title, x.kind, x.client, x.from, x.progress, x.reward, ...x.desc].join(" "); if (NUMS.test(t)) F(`内部の数が出る：${t}`); });
  // 報告 → 済み
  S.mode = "fac"; S.fac = "guild";
  G.act("guild:report:" + q.id);
  S.mode = "explore"; S.fac = null;
  if (G.q7.list(S).some((x) => x.key === "g:" + q.id)) F("報告した依頼が一覧に残る");
  let fin = G.q7.finished(S);
  if (!fin.some((x) => x.title === q.title && !x.failed && x.result === "果たした")) F("報告した依頼が「済み」に無い");
  // 期限切れ → 済み（失敗）
  if (q2) {
    S.day = q2.deadline + 1;
    G.q5.tick(S);
    fin = G.q7.finished(S);
    if (!fin.some((x) => x.title === q2.title && x.failed && x.result === "期限切れ")) F("期限切れの依頼が「済み」に失敗として出ない");
  }

  // 仲間の頼みごと
  const id = Object.keys(D.Q9 || {})[0];
  if (id) {
    S = start(3);
    const Q9 = D.Q9[id];
    S.tk = S.tk || {};
    S.tk.heard = Object.assign({}, S.tk.heard, { [G.q9.topicId(id, 0)]: true });
    const q9before = JSON.stringify(S.q9 || null);
    e = G.q7.list(S).find((x) => x.key === "m:" + id);
    if (JSON.stringify(S.q9 || null) !== q9before) F("一覧を作るだけで S.q9 が書き換わる");
    if (!e) F("頼まれた仲間の頼みごとが一覧に無い");
    else {
      if (e.src !== "mate" || !e.title.startsWith(Q9.title)) F(`頼みごとの名前が違う：${e.title}`);
      if (!e.client || /\{/.test(e.client + e.desc.join(""))) F("頼みごとの依頼主か説明に差し込みが残る");
      if (!e.desc.length) F("頼みごとの説明が無い");
      if (!/1／/.test(e.progress)) F(`頼みごとの段が出ない：${e.progress}`);
      if (NUMS.test(e.desc.join(""))) F("頼みごとの説明に内部の数");
    }
    const endKey = Object.keys(Q9.ends || {})[0];
    if (endKey) {
      S.q9 = { [id]: { n: Q9.steps.length, day: 9, r: [], end: endKey } };
      if (G.q7.list(S).some((x) => x.key === "m:" + id)) F("結末を迎えた頼みごとが一覧に残る");
      if (!G.q7.finished(S).some((x) => x.src === "mate" && x.result.includes(Q9.ends[endKey].name))) F("結末を迎えた頼みごとが「済み」に無い");
    }
  }

  // 古いセーブ
  S = start(4);
  delete S.quests;
  delete S.q5;
  delete S.q9;
  try {
    if (G.q7.list(S).length || G.q7.finished(S).length || G.q7.readyCount(S)) F("項目の無い古いセーブで依頼が並ぶ");
    // 古い形の依頼（Q5 の項目が無い）と、壊れた依頼
    S.loc = "karna";
    S.quests = [
      { id: "old1", type: "hunt", loc: "plains", target: "goblin", need: 3, progress: 1, title: "平原のゴブリン退治", desc: "ゴブリンを3体", reward: 90, done: false },
      { id: "old2", type: "deliver", loc: "nerva", title: "港町への荷運び", desc: "荷を届ける", reward: 50, done: true },
      null, "壊れ", { id: "old3" },
    ];
    L = G.q7.list(S);
    if (L.length !== 3) F(`古い形の依頼の数が違う：${L.length}`);
    const h = L.find((x) => x.key === "g:old1");
    if (!h || h.client !== "冒険者ギルド" || h.progress !== "1／3体" || h.deadline) F(`古い形の依頼の行がおかしい：${JSON.stringify(h)}`);
    if (!L.find((x) => x.key === "g:old3")) F("名前の無い依頼で行が出ない");
    S.quests = S.quests.filter((x) => x && typeof x === "object"); // 報告の仕組み（explore.js）は壊れた依頼を想定しない。一覧だけ確かめる
    S.mode = "fac"; S.fac = "guild";
    const gold = S.gold;
    G.act("guild:report:old2");
    if (S.gold !== gold + 50) F("古い形の依頼の報告ができない（試しの前提）");
    if (!G.q7.finished(S).some((x) => x.title === "港町への荷運び" && x.result === "果たした")) F("古い形の依頼を報告しても「済み」に残らない");
  } catch (err) { F(`古いセーブで止まる：${err.message}`); }
  G.S = null;
  if (G.q7.list().length !== 0 || G.q7.finished().length !== 0 || G.q7.readyCount() !== 0) F("冒険が無いときに空でない");

  // キーの近道
  const k = (key, o = {}) => ({ key, ...o });
  const ka = G.q7.keyAction;
  if (ka(k("q"), false, null, true) !== "open") F("Q で開かない");
  if (ka(k("Q"), false, null, true) !== "open") F("大文字の Q で開かない");
  if (ka(k("q"), false, "dlgQuests", true) !== "close") F("開いているときに Q で閉じない");
  if (ka(k("q"), true, null, true)) F("文字を打っている所で Q が効く");
  if (ka(k("q"), false, "dlgCodex", true)) F("ほかの窓の上で Q が効く");
  if (ka(k("q"), false, null, false)) F("冒険の外で Q が効く");
  if (ka(k("q", { ctrlKey: true }), false, null, true)) F("Ctrl+Q で開く");

  // ランダムに遊んでも止まらない
  S = start(5);
  try {
    for (let t = 0; t < 300 && !G.S.over; t++) {
      const list = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!list.length) break;
      const pref = list.filter((a) => /^(guild:|fac:guild)/.test(a.id));
      const pool = pref.length && G.rand() < 0.5 ? pref : list;
      G.act(pool[Math.floor(G.rand() * pool.length)].id);
      if (t % 10 === 0) { G.q7.list(G.S); G.q7.finished(G.S); }
    }
  } catch (err) { F(`遊びながら一覧を作ると止まる：${err.message}`); }
};
