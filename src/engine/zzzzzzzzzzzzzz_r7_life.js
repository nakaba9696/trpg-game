// R7：人生の振り返り（M6）が、していないことを語らないように、暮らしの記録を数える
//   宿に泊まった・宿で食事をした・酒場で金を使った・店で買った・薬草を買った回数。振り返りの文は、条件つきの行（{ t, if }）でこれを見る
//   （src/data/epilogue_m6.js の「宿代と薬草の日付」など。仕組みは src/engine/ending_m6.js の line）
// セーブに足すもの：S.r7life = { inn, meal, tavern, buy, herb }（無い古いセーブでは 0 として扱う＝その行は出ない）。
// DOM には触らない。名前の頭の z は、G.facAct を包むほかのファイルより後に読ませるため（いちばん外で、実際に金が減ったかを見る）。レーン C（R7）
(function (G) {
  const R7 = (G.r7 = G.r7 || {});
  R7.life = (S) => {
    S = S || G.S;
    const l = S && S.r7life && typeof S.r7life === "object" ? S.r7life : {};
    return { inn: l.inn || 0, meal: l.meal || 0, tavern: l.tavern || 0, buy: l.buy || 0, herb: l.herb || 0 };
  };
  const bump = (S, k) => { S.r7life = R7.life(S); S.r7life[k]++; };

  const fac0 = G.facAct;
  if (!fac0) return;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    const gold = S ? S.gold : 0;
    const day = S ? S.day : 0;
    const [kind, id] = String(arg || "").split(":");
    const had = S && S.inv && id ? S.inv[id] || 0 : 0;
    const r = fac0(head, arg, a);
    try {
      if (S && G.S === S && !S.over) {
        const paid = S.gold < gold;
        if (head === "inn" && arg === "rest" && (paid || S.day > day)) bump(S, "inn");
        else if (head === "inn" && arg === "meal" && paid) bump(S, "meal");
        else if (head === "tavern" && paid) bump(S, "tavern");
        else if (head === "shop" && kind === "buy" && paid && (S.inv[id] || 0) > had) { bump(S, "buy"); if (id === "herb") bump(S, "herb"); }
      }
    } catch { /* 数え損ねても遊びは止めない */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
