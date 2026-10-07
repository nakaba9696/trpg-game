// C12：作った人物（src/data/cz_c12_people.js の D.C12_PEOPLE）の好感度の始まりと、予定の揺れ。DOM には触らない。
// 好感度そのものは F3（engine/zzz_f3_affinity.js・S.aff・−100〜+100）に一本化する。ここは F3 の「初対面」（G.affMeet）を包んで、
// C12 の人だけ、初めて会ったときの値をその人の始まり（aff0）にするだけ（0 の代わり）。増減は F3 の G.affAdd と結果の aff のまま。
// 名前の頭の zzzz_c12 は、zzz_f3_affinity.js より後に読ませて包むため（zzzz_c8_people.js と同じやり方）。
// レーン C（C12）
(function (G) {
  const D = G.data;
  const C12 = () => D.C12_PEOPLE || {};

  const meet0 = G.affMeet;
  if (meet0) G.affMeet = (id, S) => {
    S = S || G.S;
    const p = C12()[id];
    if (S && p && G.affState) {
      const A = G.affState(S);
      if (typeof A[id] !== "number") A[id] = Math.max(-100, Math.min(100, Math.round(p.aff0 || 0)));
    }
    return meet0(id, S);
  };

  // 予定の揺れ（F4 の S.f4.shift）：zz_f4_roster.js は新しい冒険のたびに、予定を持つ仲間の数だけ G.rand を引く。
  // C12 の人の分まで G.rand で引くと、前からある遊びの乱数の並びが変わる（決まった乱数で遊ぶテストが揺れる）。
  // そこで C12 の人は、その冒険の種（S.wseed）と id から決まる揺れにする。幅は F4 と同じ（±6 日）
  const new0 = G.newGame;
  if (new0) G.newGame = (opt) => {
    const P = D.C2_PEOPLE || {};
    const ids = Object.keys(C12()).filter((id) => P[id] && P[id].schedule);
    const saved = {};
    ids.forEach((id) => { saved[id] = P[id].schedule; delete P[id].schedule; });
    let S;
    try { S = new0(opt); } finally { ids.forEach((id) => { P[id].schedule = saved[id]; }); }
    if (S && S.f4 && S.f4.shift) ids.forEach((id) => {
      let h = 2166136261;
      for (const ch of [S.wseed || S.id || 0, "c12", id].join("|")) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
      h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
      S.f4.shift[id] = Math.round(((h >>> 0) / 4294967296 * 2 - 1) * 6);
    });
    return S;
  };
})(globalThis.G = globalThis.G || {});
