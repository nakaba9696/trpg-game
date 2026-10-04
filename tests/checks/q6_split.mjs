// Q6：q2 の釣り合いの確認は、回を小分けにして働き手に遊ばせる（tests/balance.mjs の playSplit）。
// 分けて遊んでも、一度に遊んだとき（playGames）と同じ数字になること。働き手を使うときも、使わないとき（JOBS=1）も
import { playGames, playSplit } from "../balance.mjs";

export default async ({ fail, ok, loadEngine }) => {
  const classes = Object.keys(loadEngine().data.CLASSES).slice(1, 3);
  for (const [mode, steps] of [["random", 80], ["smart", 80]]) {
    const whole = JSON.stringify(playGames({ mode, games: 4, steps, seed: 3, classes }));
    for (const jobs of [1, 2]) {
      const split = JSON.stringify(await playSplit({ mode, games: 4, steps, seed: 3, classes, jobs, chunk: 3 }));
      if (split !== whole) fail(`${mode}: 働き手 ${jobs} で小分けに遊ぶと、一度に遊んだときと数字が違う`);
    }
  }
  ok("釣り合いの確認は、小分けにして働き手に遊ばせても同じ数字");
};
