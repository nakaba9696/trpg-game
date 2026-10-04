// Q2: 釣り合いの確認（tests/balance.mjs の CHECK_PLAN の回数を、働き手に分けて遊ぶ。全部の表は node tests/balance.mjs）
// - 職業ごとの平均生存手番の差（最長 ÷ 最短）が、ランダムでも筋のよい遊び方（tests/bot.mjs）でも 1.5 倍以内
// - 筋のよい遊び方なら、どこかでボスを倒す回がある
// 乱数の種は決まっているので、同じ中身なら毎回同じ数字になる。
// 回数（Q6）：少ないと運のぶれで境目を行き来した（ランダム 240 回では種 0〜9 で 1.31〜1.50 倍、筋のよい遊び方 30 回では 1.24〜1.99 倍）。
//   ランダム 600 回・筋のよい遊び方 50 回にして、種 0〜9 で ランダム 1.25〜1.44 倍、筋のよい遊び方 1.12〜1.24 倍（数字の出どころは tests/balance.mjs の CHECK_PLAN）。
//   それでもランダムは種によって ±0.1 倍ほど動く。出来事を足しただけで数字が動くのはこのぶれのせい。
//   境目を越えたら、まず BALANCE_SEED=1〜9 node tests/balance.mjs で種を変えて見る（どの種でも越えるなら、ゲームの側を直す）。
// 失敗したら：node tests/balance.mjs で表を見て、職業の表（src/data/characters.js）や敵の強さを直す。
import { CHECK_PLAN, playSplit, turnRatio } from "../balance.mjs";

const LIMIT = 1.5;

export default async ({ fail, ok }) => {
  const mean = (a) => Math.round(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length));
  const show = (rows) => rows.map((r) => `${r.cls} ${mean(r.turns)}`).join("・");
  for (const mode of ["random", "smart"]) {
    const { games, steps } = CHECK_PLAN[mode];
    const rows = await playSplit({ mode, games, steps, seed: CHECK_PLAN.seed });
    const errs = rows.reduce((a, r) => a + r.errors, 0);
    if (errs) fail(`${mode}: 例外で止まった回が ${errs}`);
    const ratio = turnRatio(rows);
    if (!(ratio <= LIMIT)) fail(`${mode}: 職業ごとの平均手番の差が ${ratio.toFixed(2)} 倍（${LIMIT} 倍以内にする）：${show(rows)}`);
    else ok(`q2 ${mode}: 平均手番の差 ${ratio.toFixed(2)} 倍（職業ごとに ${games} 回。${show(rows)}）`);
    if (mode === "smart") {
      const kills = rows.reduce((a, r) => a + r.bossRuns, 0);
      if (!kills) fail("smart: 筋のよい遊び方で、ボスを倒した回が一度も無い");
    }
  }
};
