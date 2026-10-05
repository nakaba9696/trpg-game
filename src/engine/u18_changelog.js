// U18：更新履歴の読み方（DOM には触らない）。見た版はプロフィール（G.P.changelogSeen）に覚える。古いプロフィールで項目が無くても動く
(function (G) {
  const D = G.data;
  const CL = (G.changelog = {});
  // 公開した版だけ（「次の版」は出さない）。新しい順
  CL.published = () => (D.CHANGELOG || []).filter((e) => !e.next);
  CL.latest = () => { const e = CL.published()[0]; return e ? e.ver : D.VERSION || ""; };
  // まだ見ていない新しい版があるか
  CL.unseen = (P) => !!CL.latest() && ((P && P.changelogSeen) || "") !== CL.latest();
  CL.markSeen = (P) => { if (!P || !CL.unseen(P)) return false; P.changelogSeen = CL.latest(); return true; };
})(globalThis.G = globalThis.G || {});
