// T2：CI でテストを分けて動かしても、確認が抜けたり二度走ったりせず、数字も変わらないこと
// - tests/shard.mjs の分け方：どの N でも、全部のまとまりがちょうど一つの番号に入る
// - q2 の回を先に遊んでおいて playSplit に渡しても（tests/run.mjs の __preplayed）、その場で遊んだときと同じ数字
import { assignShards } from "../shard.mjs";
import { playGames, playSplit, splitTasks, splitKey } from "../balance.mjs";
import { SECTIONS } from "../core.mjs";

export default async ({ fail, ok, loadEngine }) => {
  const groups = [...SECTIONS.map(([n]) => ({ key: "core:" + n, weight: n.length % 7 })), ...Array.from({ length: 40 }, (_, i) => ({ key: "c" + i, weight: (i * 37) % 23 }))];
  for (let N = 1; N <= 9; N++) {
    const { parts } = assignShards(groups, N);
    const seen = parts.flat();
    if (parts.length !== N) fail(`N=${N}: 分けた数が ${parts.length}`);
    if (seen.length !== groups.length || new Set(seen).size !== groups.length) fail(`N=${N}: 抜けたか二度入ったまとまりがある`);
    if (JSON.stringify(assignShards([...groups].reverse(), N).parts.map((p) => p.map((g) => g.key).sort())) !== JSON.stringify(parts.map((p) => p.map((g) => g.key).sort()))) fail(`N=${N}: 並びが変わると分け方が変わる`);
  }
  const classes = Object.keys(loadEngine().data.CLASSES).slice(0, 2);
  for (const mode of ["random", "smart"]) {
    const opt = { mode, games: 4, steps: 100, seed: 5, classes, chunk: 3 };
    const fresh = JSON.stringify(await playSplit({ ...opt, jobs: 1 }));
    globalThis.__preplayed = new Map(splitTasks(opt).map((t) => [splitKey(t), playGames({ ...t, classes: [t.cls] })]));
    let pre;
    try { pre = JSON.stringify(await playSplit({ ...opt, jobs: 1 })); } finally { globalThis.__preplayed = null; }
    if (pre !== fresh) fail(`${mode}: 先に遊んだ回を使うと、その場で遊んだときと数字が違う`);
  }
  ok("テストの分け方（SHARD）と、先に遊んだ q2 の回の使い回し");
};
