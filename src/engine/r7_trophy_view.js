// R7：トロフィーの見せ方。まだ取っていないものは、名前だけでなく説明も伏せる（持ち主の声「名は？？？なのに、説明が屍竜ネクロザを討ったと明かしている」）
//   取った：{ name, desc }。まだ：{ name: "？？？", desc: 手がかり（D.R7_TROPHY_HINTS）か「まだ誰も語っていない。」 }
// 画面（src/ui/ui.js の ui.openTrophies）はこれを読んで描く。DOM には触らない。レーン T（R7）
(function (G) {
  const R7 = (G.r7 = G.r7 || {});
  R7.HIDDEN_NAME = "？？？";
  R7.HIDDEN_DESC = "まだ誰も語っていない。";
  R7.trophyView = (t, got) => {
    if (got) return { name: t.name, desc: t.desc || "" };
    const hint = ((G.data && G.data.R7_TROPHY_HINTS) || {})[t.key];
    return { name: R7.HIDDEN_NAME, desc: hint || R7.HIDDEN_DESC };
  };
})(globalThis.G = globalThis.G || {});
