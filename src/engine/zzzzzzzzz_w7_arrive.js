// W7：新しい町に旅をして着いたときの一文（D.W7_ARRIVE[場所の id] の中から一つ。書くのは data/lore_w7_*.js）。
// U14（zzzzzzzz_u14_arrive.js）の見出しと「何日歩いて着いた」の行のあと、町の説明の前に入れる。旅をせずに着いたとき（はじめの町など）は書かない。
// G.arrive を一番外から包む（z の数で U14 より後に読まれる）。乱数は使わない（日付と場所で選ぶ）。DOM には触らない。レーン W（W7）
(function (G) {
  const D = G.data;
  const arrive0 = G.arrive;
  if (!arrive0) return;
  const hash = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) | 0; return Math.abs(x); };
  G.arrive = (dest) => {
    const S = G.S;
    const from = S && S.loc;
    const traveled = !!(S && S.w6); // 旅の様子（W6）があるときだけ。旅をせずに着いたときは書かない
    const r = arrive0(dest);
    const lines = (D.W7_ARRIVE || {})[dest];
    if (!S || S.loc !== dest || !traveled || !from || from === dest || !lines || !lines.length) return r;
    const L = D.LOCS[dest] || {};
    const ti = S.log.map((x) => x.k === "title" && x.text === L.name).lastIndexOf(true);
    if (ti < 0) return r;
    let at = S.log.findIndex((x, i) => i > ti && x.text === L.desc);
    if (at < 0) at = S.log.length;
    S.log.splice(at, 0, { k: "nar", text: lines[(hash(dest) + (S.day || 0)) % lines.length] });
    if (S.log.length > 240) S.log.splice(0, S.log.length - 240);
    return r;
  };
})(globalThis.G = globalThis.G || {});
// 町の印（locations_w7b*.js の marks）で町を引く。R3 の最初のきっかけ・M12 の世の大事の舞台を選ぶときに使える。印の無い町は入らない
(function (G) {
  const D = G.data;
  const W7 = (G.w7 = G.w7 || {});
  W7.townsWith = (mark) => Object.keys(D.LOCS).filter((id) => D.LOCS[id].type === "town" && (D.LOCS[id].marks || []).includes(mark));
})(globalThis.G = globalThis.G || {});
