// V3：はじめて訪れる町に着いたとき、その町の場面を数段落で語る（D.V3_FIRST[場所の id]。書くのは src/data/zv3_first*.js）。
// U14（zzzzzzzz_u14_arrive.js）の見出し・着き方の行と、W7 の一文のあと、町の説明の前に入れる。U14 の「はじめての町」の一言は、場面があるときは出さない。
// G.arrive を一番外から包む（z の数で U14・W7 より後に読まれる）。乱数は使わない。DOM には触らない。レーン V（V3）
(function (G) {
  const D = G.data;
  const V3 = (G.v3prose = G.v3prose || {});
  const arrive0 = G.arrive;
  if (!arrive0) return;
  const paras = (t) => String(t || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
  // U14 の「はじめての町」の一言（どれが選ばれたかは分からないので、ありうる行をすべて）
  const firstLines = () => {
    const U14 = G.u14;
    if (!U14 || !U14.firstLine) return [];
    const out = new Set();
    for (let k = 0; k < 12; k++) out.add(U14.firstLine(k));
    return [...out];
  };
  V3.firstScene = (dest) => (D.V3_FIRST || {})[dest] || null;
  G.arrive = (dest) => {
    const S = G.S;
    if (!S) return arrive0(dest);
    const first = !(S.visited && S.visited[dest]);
    const from = S.loc;
    const mark = S.log.length ? S.log[S.log.length - 1] : null;
    const r = arrive0(dest);
    const scene = V3.firstScene(dest);
    if (!first || !scene || S.loc !== dest || from === dest) return r;
    const L = D.LOCS[dest] || {};
    const start = mark ? S.log.lastIndexOf(mark) + 1 : 0;
    let ti = -1;
    for (let i = S.log.length - 1; i >= start; i--) if (S.log[i].k === "title" && S.log[i].text === L.name) { ti = i; break; }
    if (ti < 0) return r;
    const fl = firstLines();
    const gi = S.log.findIndex((x, i) => i > ti && x.k === "nar" && fl.includes(x.text));
    if (gi >= 0) S.log.splice(gi, 1);
    let at = S.log.findIndex((x, i) => i > ti && x.text === L.desc);
    if (at < 0) at = S.log.length;
    S.log.splice(at, 0, ...paras(scene).map((text) => ({ k: "nar", text, v3first: true })));
    if (S.log.length > 240) S.log.splice(0, S.log.length - 240);
    return r;
  };
})(globalThis.G = globalThis.G || {});
