// M8：才がごく稀に変わる出来事（代償つき）。結果の m8: { up, down } は src/engine/zm8_talent.js の G.m8Shift
//   up / down：技能の鍵か、"best"（いちばん高い才をさらに）・"random"。レーン V（出来事）＋C（M8）
(function (G) {
  const D = (G.data = G.data || {});

  D.EVENTS.push({
    id: "m8_fingerstone", where: ["dungeon"], w: 1, once: true, title: "指の跡のある石",
    text: "通路の壁に、腰の高さの石が埋めてある。表面には数えきれない指の跡が、くぼみになって残っている。くぼみのひとつが、ちょうどあなたの指の形をしている。",
    choices: [
      {
        label: "指を当てる",
        ok: {
          text: "石は冷たかった。それから熱くなった。何かが指から抜けていき、別の何かが入ってきた。引きはがした指先の皮が、石に残った。",
          hp: -6, m8: { up: "best", down: "random" }, memo: "地下の壁の石：指の跡のくぼみに指を当てた。何かが入れ替わった",
        },
      },
      { label: "立ち去る", ok: { text: "あなたは石から目をそらした。背後で、誰かが指を鳴らしたような音がした。気のせいだろう。" } },
    ],
  });
  // 人の姿は出ない（石だけ）。tests/checks/a4_art.mjs
  D.EVENT_NOBODY = (D.EVENT_NOBODY || []).concat(["m8_fingerstone"]);
})(globalThis.G = globalThis.G || {});
