// T1：テストを並べて動かすための分け方が、数字を変えないこと（tests/run.mjs・tests/balance.mjs）
// - 釣り合いの測定を職業ごと・回の途中で分けて遊び、mergeRows で足しても、一度に遊んだときと同じ集計になる
//   （run.mjs は q2 が遊んだはじめの回を、釣り合いの測定に使い回す）
import { playGames, mergeRows } from "../balance.mjs";

export default ({ fail, ok, loadEngine }) => {
  const cls = Object.keys(loadEngine().data.CLASSES)[1];
  for (const [mode, steps] of [["random", 120], ["smart", 120]]) {
    const whole = playGames({ mode, games: 3, steps, seed: 3 });
    const one = playGames({ mode, games: 3, steps, seed: 3, classes: [cls] });
    const a = playGames({ mode, games: 2, steps, seed: 3, classes: [cls] });
    const b = playGames({ mode, games: 3, steps, seed: 3, classes: [cls], start: 2 });
    const w = JSON.stringify(whole.find((r) => r.cls === cls));
    if (JSON.stringify(one[0]) !== w) fail(`${mode}: 職業だけ選んで遊ぶと、全部の職業で遊んだときと数字が違う`);
    if (JSON.stringify(mergeRows(a[0], b[0])) !== w) fail(`${mode}: 回の途中で分けて足すと、一度に遊んだときと数字が違う`);
  }
  ok("釣り合いの測定は、職業ごと・回の途中で分けても同じ数字");
};
