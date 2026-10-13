// v17a：黒曜の獣（src/data/v17a_golvan_0.js）は、ふつうに挑んでも倒せない使徒（E8 の D.E8.UNSLAY。物では壊せない）。
// 長編「王の仇討ち」（D.E7.SAGAS.golvan）の一度目の対面と決戦だけは戦いになる：その長編が戦いを始めているあいだだけ、倒せない印を外して始める。
// 固有の守りの一行（E11 の GUARD）と、刃が届かないときの言い方（WALL_WORD。縄張りの狂った重さ）もここで足す（E11 の表はこのファイルより後の名前のデータで作り直されるため）。
// 名前の zz_v で zz_e8_unslay.js の後に読まれ、その G.startCombat を包む（長編の仕組み zzzzzzzzzzzzz_e7_saga.js はさらに外側）。セーブには何も足さない。DOM に触らない。レーン E＋V
(function (G) {
  const D = G.data;
  const a = D && D.E3 && D.E3.LIST && D.E3.LIST.golvan;
  if (!a) return;
  if (D.E11) {
    D.E11.GUARD = D.E11.GUARD || {};
    D.E11.GUARD.golvan = "黒い獣のまわりでは、重さが狂う。剣は軽く、足は重い。割った所は、刃を引くより先に閉じはじめる。";
    D.E11.WALL_WORD = D.E11.WALL_WORD || {};
    D.E11.WALL_WORD.golvan = { what: "急に重くなった空気", name: "狂った重さ" };
  }
  const start0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    const S = G.S;
    const st = S && S.e7 && S.e7.golvan;
    const saga = !!(st && st.fight && (ids || []).includes(a.foe));
    if (!saga || !a.noslay) return start0(ids, opt);
    a.noslay = false;
    try { return start0(ids, opt); } finally { a.noslay = true; }
  };
})(globalThis.G = globalThis.G || {});
