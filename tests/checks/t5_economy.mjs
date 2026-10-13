// T5：お金と資源の入口・出口が壊れていないことの見張り（tests/t5_econ.mjs）。報告は docs/review/economy_2026-10-12.md
// 閾値は、見つけたときの数字（型ごとに 4 回・500 行動）よりずっと緩くしてある。悪化を止めるための見張りで、釣り合いの目標ではない。
// E5（余る消耗品と終盤の金の出口。src/data/e5_sinks.js）のあとの数字で少し締めた（所持金の上限・出口の細い資源・E5 の出口が使われる）。
// 数値の調整は持ち主の判断（報告に提案だけ書いた）。重い集計は node tests/t5_econ.mjs（T5_GAMES・T5_STEPS で増やせる）
import { census, playStyles, median, top10, thinOutlets, STYLES } from "../t5_econ.mjs";

const GAMES = Number(process.env.T5_CHECK_GAMES || 4), STEPS = Number(process.env.T5_CHECK_STEPS || 500);

export default ({ G, fail, ok }) => {
  // データ：どの資源にも入口と、売る以外の出口がある（見つけたとき：入口なし 0・出口なし 0）
  const cen = census(G);
  if (cen.noIn.length) fail(`入口の無い資源：${cen.noIn.join(" ")}`);
  if (cen.noOut.length) fail(`売る以外に出口の無い資源：${cen.noOut.join(" ")}`);
  for (const k of ["店で買う", "宿", "教会（治療・祓い・懺悔）", "訓練場", "船賃", "教会の普請への寄進（E5）", "酒場の宴（E5）", "仲間の武具（E5）", "家（E5）"]) if (!(cen.gold.out.find((x) => x.name === k) || {}).n) fail(`金の出口「${k}」がデータに無い`);

  const play = playStyles({ games: GAMES, steps: STEPS, seed: 0 });
  const row = (s) => play[s];
  for (const r of Object.values(play)) {
    const name = STYLES[r.style].name;
    if (r.errors) fail(`${name}：例外で止まった回 ${r.errors}`);
    if (!r.games) { fail(`${name}：遊べた回が無い`); continue; }
    // 極端に詰む：ほとんどの回で死ぬ（見つけたとき：どの型も 0/4）
    if (r.deaths / r.games > 0.75) fail(`${name}：死亡率 ${r.deaths}/${r.games}`);
    // 所持金が早い段階で膨らむ（見つけたとき：30 日目の上位 10% は 210G 以下・一番多かった所持金は 1941G 以下。E5 のあと：144G 以下・1606G 以下）
    if (r.goldAt[30].length && top10(r.goldAt[30]) > 1000) fail(`${name}：30 日目の所持金の上位 10% が ${top10(r.goldAt[30])}G`);
    if (Math.max(...r.maxGold) > 10000) fail(`${name}：所持金が ${Math.max(...r.maxGold)}G まで膨らむ`);
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
  // 消耗品の出口が細い（手に入れた数が減った数の 5 倍を超え、50 個以上たまる。見つけたとき：薬草 164/11・干し肉 74/2。E5 のあと：なし）
  const thin = thinOutlets(play);
  if (thin.length > 1) fail(`出口の細い消耗品が ${thin.length} 品：${thin.map((x) => `${x.id} ${x.in}/${x.out}`).join("・")}`);
  // E5 の出口（宴・普請・仲間の武具・家・調合）が、どの型でも一度も使われない（E5 のあと：調合 6 回・宴 2・普請 1・武具 1）
  const e5k = ["酒場（宴）", "教会（普請の寄進）", "仲間の武具", "家", "店（調合）"];
  if (!Object.values(play).some((r) => e5k.some((k) => r.runsOut[k]))) fail("E5 の出口（宴・普請・仲間の武具・家・調合）を使った回が無い");
  ok(`t5_economy: 型 ${Object.keys(play).length}×${GAMES} 回・最後の所持金の中央値 ${Object.values(play).map((r) => `${STYLES[r.style].name} ${median(r.endGold)}G`).join("・")}`);
};
