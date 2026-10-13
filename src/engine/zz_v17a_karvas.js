// V17a（t04）：明けずの町カルヴァス。町で一日を越すたびに、正気が少し減る（docs/lore/curses.md 5.「一日ごとに正気 −3」）。
// 数えるのは町にいるあいだに日が変わったときだけ（旅の途中は数えない）。セーブには S.v17aKv（最後に数えた日）だけ。古いセーブで無くても動く。
// 乱数は G.rand だけ。DOM には触らない。レーン W＋V（V17a）
(function (G) {
  const D = G.data;
  if (!D || !D.LOCS || !D.LOCS.karvas) return;
  const LOSS = 3;
  const LINES = [
    "宿の窓の外は、寝る前と同じ赤い色だった。体は休んだのに、目の奥が休んでいない。",
    "起きたのか、まだ起きていないのか、しばらく分からなかった。雄鶏が鳴いている。",
    "雄鶏の声で目が覚めた。外は夜だった。昨日も、そうだった。",
  ];
  const end0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    if (S && !S.over && S.loc === "karvas" && !S.travel && G.addSanity) {
      const last = typeof S.v17aKv === "number" ? S.v17aKv : S.day;
      if (S.day > last) {
        G.addSanity(-LOSS * Math.min(S.day - last, 5));
        G.log("sys", G.pick(LINES));
      }
      S.v17aKv = S.day;
    } else if (S) delete S.v17aKv;
    return end0();
  };
})(globalThis.G = globalThis.G || {});
