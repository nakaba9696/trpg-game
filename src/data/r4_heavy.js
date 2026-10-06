// R4：重い選択の見分け方（仕組みは src/engine/zzzzzzzzzzzz_r4_heavy.js）。持ち主の決定「命や仲間に関わる重い選択では、正気による入れ替わりを起こさない」。
// 出来事に heavy: true（選択肢に heavy: true でも、その出来事ごと重い）と書くか、ここの ids に足す。ほかは既にある印から決める：
//   山場（v3peak）・使徒（e3）・F4 の印の付いた出来事（_echoTag）と返りの出来事（echo）・id の頭（恋・節目・迷う選択・因縁と続き）・
//   仲間の頼みの決着（q9 で結果に end）・結果の印（仲間の死・別れ・加入・恋・使徒との戦い・物語の終わり・覚え）・使徒との戦い
// レーン C＋V（R4）
(function (G) {
  const D = (G.data = G.data || {});
  D.R4_HEAVY = {
    // 印では拾えないもの：微笑の使徒との対面（命乞い）・仲間を亡くしたあとの夜・仲間が金を持って消えた朝・仲間が去るか決める夜・息子の死を母に伝える頼み
    ids: ["mirza", "m2_grave", "m2_betray_steal", "m2_sky", "m2_sky_go", "q9_sieglinde_3"],
    prefix: /^(m10|m11|m6|f4d|f2|f2r)_/,
    out: ["c2dead", "dropCompanion", "companion", "c2join", "m10", "wedHow", "m11won", "m11try", "m11ap", "e3fight", "m6end", "m6reach", "echo"],
  };
})(globalThis.G = globalThis.G || {});
