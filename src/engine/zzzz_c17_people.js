// C17：作った人物（src/data/cz_c17_people.js の D.C17_PEOPLE）の好感度の始まりと、予定の揺れ。DOM には触らない。
// やり方は src/engine/zzzz_c12_people.js と同じ：F3 の「初対面」（G.affMeet）を包んで、初めて会ったときの値をその人の始まり（aff0）にする。
// 予定の揺れ（F4 の S.f4.shift）は、G.rand を引かずに、その冒険の種（S.wseed）と id から決める（前からある遊びの乱数の並びを変えない）。
// 名前の頭の zzzz_c17 は、zzz_f3_affinity.js と zz_f4_roster.js より後に読ませて包むため。
// レーン C（C17）
(function (G) {
  const D = G.data;
  const C17 = () => D.C17_PEOPLE || {};

  const meet0 = G.affMeet;
  if (meet0) G.affMeet = (id, S) => {
    S = S || G.S;
    const p = C17()[id];
    if (S && p && G.affState) {
      const A = G.affState(S);
      if (typeof A[id] !== "number") A[id] = Math.max(-100, Math.min(100, Math.round(p.aff0 || 0)));
    }
    return meet0(id, S);
  };

  const new0 = G.newGame;
  if (new0) G.newGame = (opt) => {
    const P = D.C2_PEOPLE || {};
    const ids = Object.keys(C17()).filter((id) => P[id] && P[id].schedule);
    const saved = {};
    ids.forEach((id) => { saved[id] = P[id].schedule; delete P[id].schedule; });
    let S;
    try { S = new0(opt); } finally { ids.forEach((id) => { P[id].schedule = saved[id]; }); }
    if (S && S.f4 && S.f4.shift) ids.forEach((id) => {
      let h = 2166136261;
      for (const ch of [S.wseed || S.id || 0, "c17", id].join("|")) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
      h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
      S.f4.shift[id] = Math.round(((h >>> 0) / 4294967296 * 2 - 1) * 6);
    });
    return S;
  };
})(globalThis.G = globalThis.G || {});
