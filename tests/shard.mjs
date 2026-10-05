// T2：CI で仕事を N 個のジョブに分ける（tests/run.mjs の SHARD。今の CI は 2 つ）。
// groups は { key, weight } の並び。重い順に、いちばん空いている番号へ配る。同じ一覧なら、どの番号から見ても同じ分け方。
// 返すのは番号（0 から）ごとのまとまりの並びと、番号ごとの目安の合計
export function assignShards(groups, N) {
  const load = new Array(N).fill(0), parts = Array.from({ length: N }, () => []);
  for (const g of [...groups].sort((a, b) => b.weight - a.weight || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))) {
    const k = load.indexOf(Math.min(...load));
    load[k] += g.weight;
    parts[k].push(g);
  }
  return { parts: parts.map((p) => groups.filter((g) => p.includes(g))), load };
}
