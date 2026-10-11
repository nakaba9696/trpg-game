// M7：判定の振り直しを増やす物と出来事。しくみは src/engine/reroll_m7.js
// なぜ振り直せるのかは書かない。賽子・祭り・祠・手を打つ音で匂わせるだけ（docs/lore/voice.md）。
// 結果の reroll: n で振り直しが増える（上限 3）。diceNight: true は、その冬の賽の夜を済ませた印
(function (G) {
  const D = G.data;

  Object.assign(D.ITEMS, {
    m7_chipdie: {
      name: "欠けた賽子", type: "use", reroll: 1, price: 30,
      desc: "角がひとつ欠けた、骨の賽子。どう置いても、しばらくすると欠けた角が上を向いている。",
      useText: "欠けた賽子を掌で転がした。欠けた角が上を向いて止まる。握りしめて開くと賽子はもう無かった。",
    },
  });

  // 落とし物：賭け事の好きな連中が、たまに持っている
  [["goblin", 0.02], ["barrelgob", 0.05], ["bandit", 0.03], ["banditboss", 0.1]].forEach(([id, p]) => {
    const e = D.ENEMIES[id];
    if (e) e.loot = [...(e.loot || []), ["m7_chipdie", p]];
  });

  D.EVENTS.push(
    {
      id: "m7_dicenight", where: ["town"], w: 12, title: "賽の夜",
      cond: (S) => G.isWinter && G.isWinter(S.day) && !S.flags["m7_night" + G.yearOf(S.day)],
      text: "冬至の晩。通りの灯りがいつまでも消えない。広場の焚き火のまわりで、仮面をつけた人たちが樽を卓にして賽子を振っている。教会の窓は暗いが、鐘番の爺さんの声によく似た仮面が、いちばん大きな声で張っている。粉屋の女房は、亭主の外套を賭けて負けたところだ。",
      choices: [
        {
          label: "仮面を借りて、10G 賭ける", cost: 10, stat: "知力", diff: "普通",
          ok: { text: "三度続けて読んだとおりの目が来た。向かいの仮面が樽を叩いて笑い、首から下げていた小さな賽子を外して、あなたの前に放った。「持ってきな。今夜のあんたにはもう要らんだろうけどな」", gold: 30, item: "m7_chipdie", diceNight: true, lore: "dice:m7_night" },
          ng: { text: "負けた。負けるたびに、後ろで誰かが手を叩く。振り返ると、みんな自分の卓に夢中だった。", diceNight: true, lore: "dice:m7_night" },
        },
        { label: "焚き火のそばで、転がる目を眺める", ok: { text: "夜が白むまで賽子の音を聞いていた。どこかの卓で同じ目が七度続いたと騒ぎになり、振った男は青い顔で帰っていった。", hp: 3, diceNight: true, lore: "dice:m7_night" } },
        { label: "宿に戻って寝る", ok: { text: "窓の外で、夜通し歓声とため息が交互に上がった。", diceNight: true } },
      ],
    },
    {
      id: "m7_shrine", where: ["wild"], w: 2, title: "賽子の積まれた祠",
      text: "道ばたに膝の高さほどの石の祠がある。屋根の上に、誰が置いたのか、小さな賽子が三つ積んである。供え皿には銅貨が二枚と、かじりかけの林檎。",
      choices: [
        {
          label: "銅貨を供えて、手を合わせる", cost: 5, stat: "魅力", diff: "難しい",
          ok: { text: "目を開けると、積んであった賽子がひとつ、足もとに転がっていた。角がひとつ欠けている。拾い上げても誰も咎めなかった。", item: "m7_chipdie" },
          ng: { text: "何も起きなかった。林檎がひと口ぶん減っている気がしたが、たぶん気のせいだ。" },
        },
        { label: "積まれた賽子を懐に入れる", ok: { text: "賽子はほんのり温かかった。祠から離れるほど、右の肩が重くなっていく。", reroll: 1, cond: "呪い" } },
        { label: "通り過ぎる", ok: { text: "少し歩いてから振り返ると、賽子は二つになっていた。いや、はじめから二つだったかもしれない。" } },
      ],
    },
  );

  // 用語説明（U3 の D.LORE があるときだけ書き足す）
  if (D.LORE && D.LORE.dice) {
    D.LORE.dice.lines.push(
      ["m7_night", "冬至の賽の夜は、仮面をつけて夜通し賭ける。教会は知らんぷりをしている。"],
      ["m7_chip", "角の欠けた賽子を拾った。どう置いても欠けた角が上を向く。"],
      ["m7_turned", "一度だけ、賽の目が転がり直ったことがある。誰にも話していない。"],
    );
    if (D.LORE_ON && D.LORE_ON.item) D.LORE_ON.item.m7_chipdie = "dice:m7_chip";
  }
})(globalThis.G = globalThis.G || {});
