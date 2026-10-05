// U17：依頼に関係ある場所・選択肢に印（持ち主の声「冒険で依頼に関係ある場所は、前みたいにコメントを出して」）
// - U4 の G.travelMarks はギルドの依頼（S.quests）だけを見ていた。一覧に載るすべての依頼（ギルド・因縁 F2・R3 の続き・仲間の頼み C9／恋の前の頼み Q8）と、
//   噂の続きの場所（zzzzzzzzzzz_u17_rumors.js）に広げ、どの依頼のためか分かる一言にする：「依頼『〇〇』の場所」「依頼『〇〇』への道（港町〇〇）」「噂の続き：〇〇」
// - G.q17.targets(S)：[{ to, at: 着いた所での一言, way: 途中の一言, src }]
// - G.travelMarks(S)：{ 行き先 id: 一言 }（旅立つ・船のボタン。ui.js が読む）
// - G.actMarks(S)：{ 行動の id: 一言 }（町の中・探索中の選択肢：依頼に取りかかる・仲間の頼み・因縁の段・R3 の続き、依頼の場所での探索・町歩き、報告できるギルド。旅立つ・船も含む）
// 状態は書き換えない。DOM なし。レーン U（U4 の続き）
(function (G) {
  const D = G.data;
  const U = (G.q17 = G.q17 || {});
  const arr = (v) => (Array.isArray(v) ? v : []);
  const locName = (id) => (id && D.LOCS[id] ? D.LOCS[id].name : "");
  const q = (t) => `依頼『${t}』`;
  U.RUMOR_MARKS = 3; // 印にする噂の数（新しいものから）

  U.targets = (S) => {
    S = S || G.S;
    if (!S || S.over) return [];
    const out = [];
    const put = (to, at, way, src) => { if (to && D.LOCS[to]) out.push({ to, at, way, src }); };
    // ギルドの依頼（U4 の行き先。期限は Q5 が添える）
    try {
      (G.questWays ? G.questWays(S) : []).forEach((w) => {
        const t = (w.q && w.q.title) || "名の無い依頼";
        if (w.q && w.q.done) put(w.to, `${q(t)}の報告ができる`, `${q(t)}の報告（${locName(w.to)}）`, "guild");
        else { const why = String(w.why || "依頼の場所").replace(/^依頼の/, ""); put(w.to, `${q(t)}の${why}`, `${q(t)}への道（${locName(w.to)}）`, "guild"); }
      });
    } catch {}
    // 因縁（F2）・R3 の続き・仲間の頼み（U17 の噂の仕組みが集める、依頼の行き先）
    try {
      const c = G.f2o && G.f2o.cur ? G.f2o.cur(S) : null;
      if (c && c.step >= 2) put(c.loc, `${q(c.th.title)}の場所`, `${q(c.th.title)}への道（${locName(c.loc)}）`, "f2o");
    } catch {}
    try {
      const r = S.r3;
      if (r && r.follow && G.r3 && G.r3.followLoc) Object.keys(r.follow).forEach((id) => {
        const f = (D.R3_FOLLOW || {})[id];
        if (!f) return;
        const to = G.r3.followLoc(r, id), t = f.sub || f.label;
        put(to, `${q(t)}の場所`, `${q(t)}への道（${locName(to)}）`, "r3");
      });
    } catch {}
    try {
      const all = S.q9 && typeof S.q9 === "object" ? S.q9 : {};
      Object.keys(D.Q9 || {}).forEach((id) => {
        const Q = D.Q9[id], s = all[id] || {}, n = s.n || 0;
        if (s.end || !Q.steps || n >= Q.steps.length) return;
        const tid = G.q9 && G.q9.topicId ? G.q9.topicId(id, n) : "";
        if (!(S.tk && S.tk.heard && S.tk.heard[tid])) return;
        const to = Q.steps[n].at;
        put(to, `${q(Q.title)}の場所`, `${q(Q.title)}への道（${locName(to)}）`, "mate");
      });
    } catch {}
    // 噂の続き（まだ依頼になっていないもの。新しいものから少しだけ）
    try {
      (U.rumors ? U.rumors(S) : []).filter((x) => x.loc && !x.quest).slice(0, U.RUMOR_MARKS).forEach((x) => {
        put(x.loc, x.who ? `噂の続き：${x.who}` : "噂の続きがありそう", `噂の続き${x.who ? "：" + x.who : ""}（${locName(x.loc)}）`, "rumor");
      });
    } catch {}
    return out;
  };

  // 旅立つ・船のボタンの印。同じ一歩に二つ以上あれば「ほか n 件」
  G.travelMarks = (S) => {
    S = S || G.S;
    const out = {}, more = {};
    if (!S || !G.routeTo) return out;
    U.targets(S).forEach((t) => {
      if (t.to === S.loc) return;
      const path = G.routeTo(S.loc, t.to);
      const next = path && path[1];
      if (!next) return;
      if (out[next]) { more[next] = (more[next] || 0) + 1; return; }
      out[next] = next === t.to ? t.at : t.way;
    });
    Object.keys(more).forEach((k) => { out[k] += `　ほか${more[k]}件`; });
    return out;
  };

  // 選択肢ごとの印（旅立つ・船も含む）
  G.actMarks = (S, groups) => {
    S = S || G.S;
    const out = {};
    if (!S || S.over || S.combat || S.mode === "event") return out;
    let acts = [];
    try { acts = (groups || G.actions()).flatMap((g) => g.list || []); } catch { return out; }
    const tm = G.travelMarks(S);
    const here = U.targets(S).filter((t) => t.to === S.loc);
    const quests = arr(S.quests).filter((x) => x && typeof x === "object");
    const mateTitle = (id) => ((D.Q9 || {})[id] || {}).title || "";
    const r3 = S.r3 && S.r3.follow ? S.r3.follow : {};
    const c = (() => { try { return G.f2o && G.f2o.cur ? G.f2o.cur(S) : null; } catch { return null; } })();
    // 依頼の場所での探索・町歩き（一つだけ：迷宮なら先へ進む、野外なら探索、町なら町をぶらつく）
    const spot = here.filter((t) => t.src !== "guild" || !/報告/.test(t.at));
    const walkId = ["deeper", "explore", "walk"].find((id) => acts.some((a) => a.id === id && !a.disabled));
    acts.forEach((a) => {
      const id = String(a.id || "");
      const [head, ...rest] = id.split(":");
      const arg = rest.join(":");
      let m = "";
      if (head === "travel" || head === "sail") m = tm[arg] || "";
      else if (head === "q5go") { const x = quests.find((y) => y.id === arg); if (x) m = q(x.title); }
      else if (head === "q9") m = mateTitle(arg) ? q(mateTitle(arg)) : "";
      else if (head === "f2o") m = c && c.step >= 2 ? q(c.th.title) : ""; // 一段目は、まだ依頼の一覧に載らない
      else if (head === "r3" && r3[arg]) { const f = (D.R3_FOLLOW || {})[arg] || {}; m = q(f.sub || f.label || ""); }
      else if (id === "fac:guild" && quests.some((x) => x.done)) m = "依頼の報告ができる";
      else if (id === walkId && spot.length) m = spot[0].at + (spot.length > 1 ? `　ほか${spot.length - 1}件` : "");
      if (m) out[id] = m;
    });
    return out;
  };
})(globalThis.G = globalThis.G || {});
