// C4：作った人物（src/data/c4_people.js の D.C4_PEOPLE）の好感度の始まりと、出来事の結果 c4forget。DOM には触らない。
// 好感度そのものは F3（engine/zzz_f3_affinity.js・S.aff・−100〜+100）に一本化する。ここは F3 の「初対面」（G.affMeet）を包んで、
// C4 の人だけ、初めて会ったときの値をその人の始まり（aff0）にするだけ（0 の代わり）。増減は F3 の G.affAdd と結果の aff のまま。
// 名前の頭の zzzz は、zzz_f3_affinity.js（G.affMeet・G.apply）より後に読ませて包むため。
//
// 出来事の結果に書けるもの
//   c4forget: id … その人がこちらを忘れる（好感度を 0 に戻す。黒鉄の砦の砦主の冬）
// レーン C（C4）
(function (G) {
  const D = G.data;
  const C4 = () => D.C4_PEOPLE || {};

  const meet0 = G.affMeet;
  if (meet0) G.affMeet = (id, S) => {
    S = S || G.S;
    const p = C4()[id];
    if (S && p && G.affState) {
      const A = G.affState(S);
      if (typeof A[id] !== "number") A[id] = Math.max(-100, Math.min(100, Math.round(p.aff0 || 0)));
    }
    return meet0(id, S);
  };

  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !S || S.over || !o.c4forget || !C4()[o.c4forget]) return;
    if (G.affState) G.affState(S)[o.c4forget] = 0;
  };
})(globalThis.G = globalThis.G || {});
