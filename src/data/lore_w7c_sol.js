// 用語説明（W7c）：塩の島ソルネ。旅人が知れることだけ（〔噂〕まで）。書き方は lore_w7b_nor.js と同じ
// 着いたときの一文（D.W7_ARRIVE）もここに書く
// レーン W（W7c）
(function (G) {
  const D = (G.data = G.data || {});
  if (!D.LORE || !D.LORE_ON) return;

  Object.assign(D.LORE, {
    w7c_sol: { sec: "国と人", title: "塩の島", lines: [
      ["first", "ソルネはシェルアークの島の一つで、島の都の東の浜に塩田が並ぶ。島には島の顔役がいて、塩の目方をごまかした者を、自分の掻いた塩田に一晩立たせる。"],
      ["flat", "ソルネの塩掻きは、寄せた塩の山のてっぺんを、熊手の背で平らにならす。誰もわけは言わない。", { hint: ["平らにならした"] }],
      ["scale", "ソルネの顔役は塩倉の奥で帳面をつける老婆で、島の秤をみな自分で確かめる。", { hint: ["秤", "顔役"] }],
      ["three", "ソルネの酒場には、白い塩・灰色の塩・赤い塩の小皿が並ぶ。赤いのは主人が自分で煮た塩だという。", { hint: ["三つの塩"] }],
    ] },
  });

  D.LORE_ON.loc = D.LORE_ON.loc || {};
  D.LORE_ON.loc.w7_saltisle = "w7c_sol";

  D.W7_ARRIVE = D.W7_ARRIVE || {};
  D.W7_ARRIVE.w7_saltisle = [
    "浜に近づくにつれて、風が唇に貼りつくようになった。舐めると、しょっぱい。",
    "白く光る四角の向こうで、熊手が砂を掻く、ざり、ざり、という音が重なっている。",
  ];
})(globalThis.G = globalThis.G || {});
