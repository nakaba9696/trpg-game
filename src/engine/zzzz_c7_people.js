// C7：帝国と共和国の人物（src/data/c7_people.js の D.C7_PEOPLE）の好感度の始まり。DOM には触らない。
// 好感度そのものは F3（engine/zzz_f3_affinity.js・S.aff・−100〜+100）に一本化する。ここは F3 の「初対面」（G.affMeet）を包んで、
// C7 の人だけ、初めて会ったときの値をその人の始まり（aff0）にするだけ（0 の代わり。C4 の engine/zzzz_c4_people.js と同じ形）。
// 恋の相手を romance で絞るのは R1 の仕組み（engine/zzzz_romance.js・docs/romance.md）。ここでは包まない。
// 名前の頭の zzzz は、zzz_f3_affinity.js（G.affMeet）より後に読ませて包むため。
// レーン C（C7）
(function (G) {
  const D = G.data;
  const C7 = () => D.C7_PEOPLE || {};

  const meet0 = G.affMeet;
  if (meet0) G.affMeet = (id, S) => {
    S = S || G.S;
    const p = C7()[id];
    if (S && p && G.affState) {
      const A = G.affState(S);
      if (typeof A[id] !== "number") A[id] = Math.max(-100, Math.min(100, Math.round(p.aff0 || 0)));
    }
    return meet0(id, S);
  };
})(globalThis.G = globalThis.G || {});
