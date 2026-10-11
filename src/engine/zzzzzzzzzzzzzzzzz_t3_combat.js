// T3：戦いの最中にしか分からない節目のトロフィーを渡す（読み勝ち・多勢に無勢。表は src/data/trophies_t3b.js）。
// G.combatAct をいちばん外から包み、手のあとに戦いが勝って終わっていたら見る。戦闘の決まりは変えない。
// あわせて、ほかのレーンが足したトロフィーを仕組みの分け方（D.TROPHY_GROUPS。src/data/trophies_t3b.js）に入れる：
//   トロフィーに group: "迷宮・遺跡・山" のように書けばその仕組みへ、書かなければ「その他」へ（どれもちょうど一つに入る）。
// 名前の頭の z の数は、ほかの G.combatAct の包み（F1・F8 など）やトロフィーを足すファイルより後に読ませるため。DOM には触らない。レーン T
(function (G) {
  const D = G.data;
  const GR = D.TROPHY_GROUPS;
  if (GR && D.TROPHIES) {
    const has = new Set(Object.values(GR).flat());
    D.TROPHIES.forEach((t) => { if (!has.has(t.key)) { const g = t.group || "その他"; (GR[g] = GR[g] || []).push(t.key); has.add(t.key); } });
  }
  const act0 = G.combatAct;
  if (!act0) return;
  G.combatAct = (...a) => {
    const S = G.S;
    const C = S && S.combat;
    const r = act0(...a);
    try {
      const S2 = G.S;
      if (C && S2 && S2 === S && S2.combat !== C && S2.over !== "dead" && (C.foes || []).length && C.foes.every((f) => (f.hp || 0) <= 0)) {
        if (((C.f1 || {}).breaks || 0) >= 3) G.award("t3_reads");
        if (C.foes.length >= 5) G.award("t3_horde");
      }
    } catch (e) { /* トロフィーの見落としで戦いを止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
