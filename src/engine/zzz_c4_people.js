// C4：作った人物（src/data/c4_people.js の D.C4_PEOPLE）の好感度の始まりと、出来事の結果 c4forget。DOM には触らない。
// 名前の頭の zzz は、zz_c2_people.js・zz_f2_codex.js より後に読ませて G.c2Meet・G.apply を包むため（F3 の zzz_f3_affinity.js はこの後に包む）。
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く
//   S.aff = { 人物の id: 好感度 }（F3 #176 と同じ欄。−100〜+100）。C4 の人に初めて会ったとき、その人の始まり（aff0）を入れる
// 出来事の結果に書けるもの
//   aff: { id: 増減 } … F3 があれば F3 が動かす。F3 がまだ無いときだけ、ここで同じ欄に足しておく（F3 が来ても二重にならない）
//   c4forget: id … その人がこちらを忘れる（好感度を 0 に戻す。黒鉄の砦の砦主の冬）
// レーン C（C4）
(function (G) {
  const D = G.data;
  const C4 = () => D.C4_PEOPLE || {};
  const clamp = (n) => Math.max(-100, Math.min(100, Math.round(n)));
  const affOf = (S) => (S.aff && typeof S.aff === "object" ? S.aff : (S.aff = {}));

  // 好感度の始まり：会ったときに一度だけ（もう数があれば触らない）
  G.c4Start = (id, S) => {
    S = S || G.S;
    const p = C4()[id];
    if (!S || !p) return;
    const A = affOf(S);
    if (typeof A[id] !== "number") A[id] = clamp(p.aff0 || 0);
  };
  const meet0 = G.c2Meet;
  if (meet0) G.c2Meet = (id) => { G.c4Start(id); return meet0(id); };

  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !S || S.over) return;
    // F3 がまだ無いときの控え（F3 は G.affAdd を持ち、自分で o.aff を動かす）
    if (o.aff && !G.affAdd) Object.entries(o.aff).forEach(([id, n]) => {
      if (!C4()[id] && !(D.C2_PEOPLE || {})[id]) return;
      G.c4Start(id, S);
      const A = affOf(S);
      A[id] = clamp((typeof A[id] === "number" ? A[id] : 0) + (Number(n) || 0));
    });
    if (o.c4forget && C4()[o.c4forget]) affOf(S)[o.c4forget] = 0;
  };
})(globalThis.G = globalThis.G || {});
