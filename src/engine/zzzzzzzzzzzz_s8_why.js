// S8：出来事の選択肢に「選ぶ理由」の一言を添える（src/data/zz_s8_reasons.js）
// - 選択肢に why: "名が落ちる" のような言葉があれば、成功率のあとに小さく足す（成功率は変えない・隠さない。数字は出さない）
// 名前の頭の z は、ほかの包み（C10・K1 など）より外側にするため。DOM には触らない。レーン C＋V（S8）
(function (G) {
  const D = G.data;
  const actions0 = G.actions;
  G.actions = () => {
    const g = actions0();
    const S = G.S;
    if (!S || S.mode !== "event") return g;
    const e = (D.EVENTS || []).find((x) => x.id === S.event);
    if (!e) return g;
    g.forEach((grp) => (grp.list || []).forEach((a) => {
      const m = /^ev:(\d+)$/.exec(a.id || "");
      const c = m && e.choices[+m[1]];
      if (c && c.why && !String(a.sub || "").includes(c.why)) a.sub = a.sub ? `${a.sub}・${c.why}` : c.why;
    }));
    return g;
  };
})(globalThis.G = globalThis.G || {});
