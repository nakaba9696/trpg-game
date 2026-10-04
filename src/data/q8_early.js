// Q8：序盤の釣り合い（持ち主の声「ゴブリンとちょっと旅しただけで END になった」）。
// 死んで覚える作りは変えない。危険は前もって分かるようにし、ふつうに遊んで最初の数戦で理不尽に終わらないようにする。
// 仕組みは src/engine/q8_early.js（combat.js・explore.js は書き換えず、包む）。数字の出どころは docs/q8_early.md。レーン Q
(function (G) {
  const D = G.data;

  D.Q8 = {
    // 駆け出しのうち（倒した敵の数がこれより少ない間）は、危険度 upto までの場所の行きずりの出会いで、場所より強い段の敵が出ない
    // （危険度 1 の野に段 2 の山賊の頭、危険度 2 の沼に段 3 の屍の群れなどが混じっている）。駆け出しを過ぎたら、その敵は連れなしで出る
    novice: 8,
    upto: 2,
    // 駆け出しのうちの、危険度 1 までの行きずりの出会いが二体になる割合（ふだんは 4 割ほど）
    novicePair: 0.15,
    // 出発時の持ち物に足す（薬と煙玉。煙玉は「逃げる」が難しい序盤の、確かな逃げ道）
    startItems: { potion: 1, smoke: 1 },
    // 見積もりの言葉（戦う前・探索や旅の選択肢）。r ＝ 見込みの被ダメージ ÷ 今の HP
    threat: [
      { r: 0.25, word: "楽な相手", say: "取るに足らない相手だ。" },
      { r: 0.6, word: "油断しなければ勝てる", say: "油断しなければ、勝てる相手だ。" },
      { r: 1.0, word: "手ごわい", say: "手ごわい。無傷では済まないだろう。" },
      { r: Infinity, word: "命がけ", say: "勝ち目は薄い。逃げることも考えたほうがいい。" },
    ],
    // 戦いの中で HP がこれを下回ったら一度だけ知らせる
    lowHp: 0.34,
    lowHpSay: "傷が深い。あと一撃か二撃で倒れかねない。薬を使うか、退くか。",
  };

  Object.values(D.CLASSES).forEach((c) => {
    c.items = { ...c.items };
    for (const [id, n] of Object.entries(D.Q8.startItems)) c.items[id] = Math.max(c.items[id] || 0, n);
  });
})(globalThis.G = globalThis.G || {});
