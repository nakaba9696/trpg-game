// Q8：仲間の好感度の上がり方（data/q8_bond.js の D.Q8B）。上がる分だけを、どこで上がったかで分けて減らす。下がる分はそのまま。
//   雑談（話す〔話題・夜の会話・掛け合い〕・M2 の世間話の出来事）：割合を小さく。一人につき一日の上限。雑談だけでは「信頼している」の入り口まで
//   その人の話（C2 のその人だけの場面〔e.c2talk〕）：少しだけ減らす
//   それ以外（一緒の戦い・依頼・出来事の選択・旅の暮らし）：減らす
// 包むもの：G.affAdd（名のある人。仲間でいる人だけ）・G.m2Bond（ふつうの仲間・名のある仲間の bond の窓）。どちらか一方しか通らない。
// 名前の頭の zzzzzzz は、zzzzz_talk.js・zzzzzz_banter2.js・zzz_f3_affinity.js より後に読ませて包むため。
// セーブに足すもの：S.q8b = { carry { 仲間の id: 端数 }, chat { 仲間の id: [日, その日に雑談で上がった分] } }。古いセーブで無くても動く。レーン Q
(function (G) {
  const D = G.data;
  const B = () => D.Q8B;
  const state = (S) => {
    if (!S.q8b || typeof S.q8b !== "object") S.q8b = {};
    S.q8b.carry = S.q8b.carry || {};
    S.q8b.chat = S.q8b.chat || {};
    return S.q8b;
  };
  const aff = (c) => (G.affFromBond ? G.affFromBond(c.bond) : Math.round(c.bond * 2 - 100));

  // 今、どこで上がっているか
  G.q8BondKind = (S) => {
    S = S || G.S;
    const e = S.event && D.EVENTS.find((x) => x.id === S.event);
    if (e && e.c2talk) return "story";
    if (S.tk && S.tk.cur) return "chat";
    if (e && e.m2 && e.m2.talk) return "chat";
    return "deed";
  };

  // 上がる分 n（好感度の目盛り）を減らして返す。unit の倍数に切り捨て（bond で動かすときは 2）。端数は仲間ごとに持ち越す
  G.q8BondGain = (c, n, unit) => {
    unit = unit || 1;
    const S = G.S;
    if (!S || !c || !(n > 0) || B().off) return n; // off：今までの上がり方（仕組みだけを確かめるテスト用）
    const st = state(S);
    const kind = G.q8BondKind(S);
    let x = n * B().mul[kind] + (st.carry[c.id] || 0);
    if (kind === "chat") {
      const d = st.chat[c.id] && st.chat[c.id][0] === S.day ? st.chat[c.id] : (st.chat[c.id] = [S.day, 0]);
      x = Math.min(x, B().chatPerDay - d[1], B().chatTop - aff(c));
      x = Math.max(0, x);
      const k = Math.floor(x / unit) * unit;
      d[1] += k;
      st.carry[c.id] = 0; // 雑談の端数は持ち越さない（上限を越えて積もらないように）
      return k;
    }
    const k = Math.floor(x / unit) * unit;
    st.carry[c.id] = x - k;
    return k;
  };

  const compOf = (id, S) => ((S && S.companions) || []).find((c) => c.c2 === id || c.aff === id) || null;
  if (G.affAdd) {
    const base = G.affAdd;
    G.affAdd = (id, n, quiet) => {
      const S = G.S;
      const c = n > 0 && S && compOf(id, S);
      if (!c) return base(id, n, quiet);
      const k = G.q8BondGain(c, n);
      if (k > 0) base(id, k, quiet);
    };
  }
  const baseBond = G.m2Bond;
  G.m2Bond = (c, n, quiet) => {
    const S = G.S;
    if (!S || !c || !(n > 0) || !(S.companions || []).includes(c)) return baseBond(c, n, quiet);
    const k = G.q8BondGain(c, n * 2, 2); // bond の 1 は好感度の目盛りの 2
    if (k > 0) baseBond(c, k / 2, quiet);
  };
})(globalThis.G = globalThis.G || {});
