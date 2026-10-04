// Q7：ステータスの「能力」のタブに出す、名声・位・国ごとの評判と悪名（持ち主の声「ステータスに悪名・名声なども表示して欲しい」）。
// 画面に出す形にして返すだけ。DOM には触らない（描くのは ui/ui.js の sheetRepute）。数と計算は core.js の M3（S.repute・G.bountyLine・G.bounty）。
// - 出すのは知られた悪名（S.repute[国].inf）だけ。隠れた罪（Q8）や罪の匂い（S.sin）は見せない
// - 段階の言葉を主に、棒（次の段階までの進み）と小さな数を添える。今いる国を先頭に、関わった国だけ並べる
// レーン C＋U
(function (G) {
  const D = G.data;
  const Q7 = (G.q7 = G.q7 || {});
  // 国ごとの評判の段階（下限, 言葉）
  Q7.REP_RANKS = [[-999, "疎まれている"], [0, "知られていない"], [10, "顔が知られている"], [30, "信頼されている"], [60, "頼りにされている"], [100, "国の誇り"]];
  const rankOf = (table, v) => {
    let i = 0;
    table.forEach(([n], j) => { if (v >= n) i = j; });
    return i;
  };
  // 次の段階までの進み（0〜1）。いちばん上なら 1
  const progress = (table, v) => {
    const i = rankOf(table, v);
    if (i >= table.length - 1) return 1;
    const lo = Math.max(table[i][0], i === 0 ? Math.min(0, v) : table[i][0]), hi = table[i + 1][0];
    return Math.max(0, Math.min(1, (v - lo) / Math.max(1, hi - lo)));
  };

  Q7.fame = (S) => {
    const f = Math.max(0, (S && S.fame) || 0);
    const R = D.FAME_RANKS;
    const i = rankOf(R, f);
    return { n: f, rank: R[i][1], next: R[i + 1] ? R[i + 1][1] : "", toNext: R[i + 1] ? R[i + 1][0] - f : 0, pct: progress(R, f) };
  };

  // 悪名の段階：知られていない／噂になっている（手配の線の半分まで）／目を付けられている／手配中
  Q7.infamy = (inf, line, wanted) => {
    if (wanted) return { label: "手配中", lv: 3 };
    if (!inf) return { label: "知られていない", lv: 0 };
    if (inf < line / 2) return { label: "噂になっている", lv: 1 };
    return { label: "目を付けられている", lv: 2 };
  };

  Q7.repute = (S) => {
    S = S || G.S;
    if (!S) return null;
    const here = (() => { try { return G.nationOf(); } catch { return null; } })();
    const all = S.repute && typeof S.repute === "object" ? S.repute : {};
    const names = Object.keys(all).filter((n) => { const r = all[n] || {}; return n === here || r.rep || r.inf || r.wanted; });
    if (here && !names.includes(here)) names.push(here);
    names.sort((a, b) => (a === here ? -1 : b === here ? 1 : 0));
    const nations = names.map((n) => {
      const r = all[n] || { rep: 0, inf: 0, wanted: false };
      const rep = r.rep || 0, inf = Math.max(0, r.inf || 0), wanted = !!r.wanted;
      const line = 30 + Math.min(20, Math.floor(Math.max(0, rep) / 10)); // G.bountyLine と同じ（repOf を呼ぶと S.repute に国が増えるので、ここで計る）
      const i = Q7.infamy(inf, line, wanted);
      return {
        name: n, here: n === here,
        rep, repLabel: Q7.REP_RANKS[rankOf(Q7.REP_RANKS, rep)][1], repPct: progress(Q7.REP_RANKS, rep),
        inf, infLabel: i.label, infLv: i.lv, infPct: wanted ? 1 : Math.min(1, inf / line),
        wanted, bounty: wanted ? inf * 10 : 0,
      };
    });
    const title = S.title ? { name: S.title, at: S.titleAt || "" } : null;
    return { fame: Q7.fame(S), title, nations };
  };
})(globalThis.G = globalThis.G || {});
