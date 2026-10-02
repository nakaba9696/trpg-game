// C5：作った人物（src/data/c5_people.js の D.C5_PEOPLE）の好感度の始まり。DOM には触らない。
// 好感度そのものは F3（engine/zzz_f3_affinity.js・S.aff・−100〜+100）。ここは F3 の「初対面」（G.affMeet）を包んで、
// C5 の人だけ、初めて会ったときの値をその人の始まり（aff0）にするだけ（C4 の engine/zzzz_c4_people.js と同じ形）。
// 名前の頭の zzzz_c5 は、zzz_f3_affinity.js と zzzz_c4_people.js より後に読ませて包むため。
// レーン C（C5）
(function (G) {
  const D = G.data;
  const C5 = () => D.C5_PEOPLE || {};

  const meet0 = G.affMeet;
  if (meet0) G.affMeet = (id, S) => {
    S = S || G.S;
    const p = C5()[id];
    if (S && p && G.affState) {
      const A = G.affState(S);
      if (typeof A[id] !== "number") A[id] = Math.max(-100, Math.min(100, Math.round(p.aff0 || 0)));
    }
    return meet0(id, S);
  };
})(globalThis.G = globalThis.G || {});
