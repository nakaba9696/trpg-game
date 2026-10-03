// C6：作った人物（src/data/c6_people.js の D.C6_PEOPLE）の好感度の始まり。DOM には触らない。
// 好感度そのものは F3（engine/zzz_f3_affinity.js・S.aff・−100〜+100）に一本化する。ここは F3 の「初対面」（G.affMeet）を包んで、
// C6 の人だけ、初めて会ったときの値をその人の始まり（aff0）にするだけ（0 の代わり）。増減は F3 の G.affAdd と結果の aff のまま。
// 名前の頭の zzzz は、zzz_f3_affinity.js（G.affMeet）より後に読ませて包むため。レーン C（C6）
(function (G) {
  const D = G.data;
  const C6 = () => D.C6_PEOPLE || {};

  const meet0 = G.affMeet;
  if (meet0) G.affMeet = (id, S) => {
    S = S || G.S;
    const p = C6()[id];
    if (S && p && G.affState) {
      const A = G.affState(S);
      if (typeof A[id] !== "number") A[id] = Math.max(-100, Math.min(100, Math.round(p.aff0 || 0)));
    }
    return meet0(id, S);
  };
})(globalThis.G = globalThis.G || {});
