// 聞いたことの帳面（U3）。覚えていること（memo）に手引きの「旅で聞いた話」の言葉が入ったら、S.heard に残す。
// 覚えていることは 30 件で古いものから消えるが、S.heard は消えないので、手引きの行も消えない（src/data/world.js）。
// 古いセーブで S.heard が無くても動く。レーン U（U3）が管理
(function (G) {
  const D = G.data;

  const words = () => {
    const out = new Set();
    (D.WORLD.all || []).forEach(([, rows]) => rows.forEach((r) => ((r[2] && r[2].hint) || []).forEach((w) => out.add(w))));
    return out;
  };

  // 言葉を聞いたことにする（通行人のひとことなど、memo に残さないもの）
  G.hear = (list) => {
    const S = G.S;
    if (!S || !list) return;
    S.heard = S.heard || {};
    (Array.isArray(list) ? list : [list]).forEach((w) => { S.heard[w] = true; });
  };

  // 文の中に出てくる手引きの言葉を、聞いたことにする
  G.hearText = (t) => {
    if (!G.S || !t) return;
    const found = [...words()].filter((w) => String(t).includes(w));
    if (found.length) G.hear(found);
  };

  const baseMemo = G.memo;
  G.memo = (t) => {
    baseMemo(t);
    G.hearText(t);
  };
})(globalThis.G = globalThis.G || {});
