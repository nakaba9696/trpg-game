// T5：お金と資源の入口・出口が壊れていないことの見張り（tests/t5_econ.mjs）。報告は docs/review/economy_2026-10-12.md
// 閾値は、見つけたときの数字（型ごとに 4 回・500 行動）よりずっと緩くしてある。悪化を止めるための見張りで、釣り合いの目標ではない。
// 数値の調整は持ち主の判断（報告に提案だけ書いた）。重い集計は node tests/t5_econ.mjs（T5_GAMES・T5_STEPS で増やせる）
import { census, playStyles, median, top10, STYLES } from "../t5_econ.mjs";

const GAMES = Number(process.env.T5_CHECK_GAMES || 4), STEPS = Number(process.env.T5_CHECK_STEPS || 500);

export default ({ G, fail, ok }) => {
  // データ：どの資源にも入口と、売る以外の出口がある（見つけたとき：入口なし 0・出口なし 0）
  const cen = census(G);
  if (cen.noIn.length) fail(`入口の無い資源：${cen.noIn.join(" ")}`);
  if (cen.noOut.length) fail(`売る以外に出口の無い資源：${cen.noOut.join(" ")}`);
  for (const k of ["店で買う", "宿", "教会（治療・祓い・懺悔）", "訓練場", "船賃"]) if (!(cen.gold.out.find((x) => x.name === k) || {}).n) fail(`金の出口「${k}」がデータに無い`);

  const play = playStyles({ games: GAMES, steps: STEPS, seed: 0 });
  const row = (s) => play[s];
  for (const r of Object.values(play)) {
    const name = STYLES[r.style].name;
    if (r.errors) fail(`${name}：例外で止まった回 ${r.errors}`);
    if (!r.games) { fail(`${name}：遊べた回が無い`); continue; }
    // 極端に詰む：ほとんどの回で死ぬ（見つけたとき：どの型も 0/4）
    if (r.deaths / r.games > 0.75) fail(`${name}：死亡率 ${r.deaths}/${r.games}`);
    // 所持金が早い段階で膨らむ（見つけたとき：30 日目の上位 10% は 210G 以下・一番多かった所持金は 1941G 以下）
    if (r.goldAt[30].length && top10(r.goldAt[30]) > 3000) fail(`${name}：30 日目の所持金の上位 10% が ${top10(r.goldAt[30])}G`);
    if (Math.max(...r.maxGold) > 30000) fail(`${name}：所持金が ${Math.max(...r.maxGold)}G まで膨らむ`);
    // 金欠のまま抜けられない回が多い（見つけたとき：0）
    if (r.broke / r.games > 0.5) fail(`${name}：金欠が続いた回 ${r.broke}/${r.games}`);
    // 金の入口：戦って得る金と、依頼か売るか
    if (!r.runsIn["戦闘"]) fail(`${name}：戦闘で金を得た回が無い`);
    if (!r.runsIn["依頼の報酬"] && !r.runsIn["店で売る"]) fail(`${name}：依頼でも売っても金を得た回が無い`);
  }
  // 金の出口：ふつうの遊び方で、店と宿が使われる（見つけたとき：店 3/4・宿 2/4）
  const n = row("normal");
  if (n && !n.runsOut["店で買う"]) fail("ふつう：店で買った回が無い");
  if (n && !n.runsOut["宿"]) fail("ふつう：宿に泊まった回が無い");
  if (row("cautious") && !row("cautious").runsOut["店で買う"]) fail("慎重：薬を買い込んだ回が無い");
  // 貯める型は買わない（ボットの確かめ）。買わなければ、ふつうより金が残る（見つけたとき：最後の所持金の中央値 ふつう 140G・貯める 421.5G）
  const sv = row("saver");
  if (sv && sv.runsOut["店で買う"]) fail("貯める：店で買っている（遊び方の型が効いていない）");
  if (sv && n && median(sv.endGold) < median(n.endGold)) fail(`貯める型の最後の所持金（中央値 ${median(sv.endGold)}G）が、ふつう（${median(n.endGold)}G）より少ない（出口が効いていない）`);
  ok(`t5_economy: 型 ${Object.keys(play).length}×${GAMES} 回・最後の所持金の中央値 ${Object.values(play).map((r) => `${STYLES[r.style].name} ${median(r.endGold)}G`).join("・")}`);
};
