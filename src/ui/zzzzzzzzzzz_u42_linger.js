// U42（4）：出来事が終わって町の画面に戻ったら、その場にいない人の立ち絵を下げる（持ち主の報告：王宮の奥で毒見をして成功し、
// 得たものが出て町の選択肢に戻っているのに、背景の真ん中に「宿の主人」の立ち絵と名札が出たままだった）
//   C17（zzzzzzzzzz_c17_linger.js）は、出来事の結果の表情を見せるため「次の行動まで」立ち絵を残していた。
//   残すのは結果の本文を一行ずつ出している間（U28 の流れ）だけにし、出しきって町の選択肢に戻ったら下げて描き直す。
//   本文を一度に出す設定・動きを減らす設定では残さない。出来事の中（S.mode "event"）と施設の人（S.mode "fac"）はそのまま
// G.stand.whoOf を C17 の外から包む（名前の z の数で C17 より後）。V5・V9・U41 は whoOf を読むので、立ち絵・名札・顔の窓がそろって下がる。レーン U
(function (G) {
  const U42 = (G.u42 = G.u42 || {});
  // その場にいる人か（DOM なし。テストからも呼ぶ）。busy は結果の本文を出している途中か
  //   出来事の中・施設の中の人はいる。それ以外（町・荒野・迷宮・旅）で返ってくる人は、終わった出来事の残り（C17）なので、出している途中だけ
  U42.keepWho = (S, who, busy) => {
    if (!who || !S) return who || null;
    if (S.combat || S.over) return null;
    if (S.mode === "event" || S.mode === "fac") return who;
    return busy ? who : null;
  };
  const st = G.stand;
  if (!st || !st.whoOf || st.whoOf.u42) return;
  const base = st.whoOf;
  const busy = () => !!(G.u28 && (G.u28.going || (G.u28.busy && G.u28.busy())));
  st.whoOf = (S) => U42.keepWho(S, base(S), busy());
  Object.assign(st.whoOf, base, { u42: true });

  // 結果の本文を出しきったら、立ち絵・名札・顔の窓を描き直す（残りの人を下げる）
  const U28 = G.u28;
  if (U28 && G.ui && G.ui.render) {
    const done0 = U28.done;
    U28.done = () => {
      if (done0) done0();
      // 描き直しの最中に呼ばれることがあるので、一拍おいてから
      setTimeout(() => { const S = G.S; if (S && !busy() && base(S) && !U42.keepWho(S, base(S), false)) G.ui.render(); }, 0);
    };
  }
})(globalThis.G = globalThis.G || {});
