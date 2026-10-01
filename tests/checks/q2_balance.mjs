// Q2: 釣り合いの軽い確認（tests/balance.mjs を少ない回数で回す。全部の表は node tests/balance.mjs）
// - 職業ごとの平均生存手番の差（最長 ÷ 最短）が、ランダムでも筋のよい遊び方（tests/bot.mjs）でも 1.5 倍以内（筋のよい遊び方は 30 回。10 回では出来事を足しただけの乱数の並びの揺れで 1.5 倍を越えた。C2 #125）
// - 筋のよい遊び方なら、どこかでボスを倒す回がある
// 乱数の種は決まっているので、同じ中身なら毎回同じ数字になる。
// 失敗したら：node tests/balance.mjs で表を見て、職業の表（src/data/characters.js）や敵の強さを直す。
import { playGames, turnRatio } from "../balance.mjs";

const LIMIT = 1.5;

export default ({ fail, ok }) => {
  const mean = (a) => Math.round(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length));
  const show = (rows) => rows.map((r) => `${r.cls} ${mean(r.turns)}`).join("・");
  for (const [mode, games, steps] of [["random", 120, 500], ["smart", 30, 800]]) {
    const rows = playGames({ mode, games, steps, seed: 0 });
    const errs = rows.reduce((a, r) => a + r.errors, 0);
    if (errs) fail(`${mode}: 例外で止まった回が ${errs}`);
    const ratio = turnRatio(rows);
    if (!(ratio <= LIMIT)) fail(`${mode}: 職業ごとの平均手番の差が ${ratio.toFixed(2)} 倍（${LIMIT} 倍以内にする）：${show(rows)}`);
    else ok(`q2 ${mode}: 平均手番の差 ${ratio.toFixed(2)} 倍（${show(rows)}）`);
    if (mode === "smart") {
      const kills = rows.reduce((a, r) => a + r.bossRuns, 0);
      if (!kills) fail("smart: 筋のよい遊び方で、ボスを倒した回が一度も無い");
    }
  }
};
