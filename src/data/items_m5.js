// 代償つきの品（M5）。強いが、持つ・使うたびに何かを奪う。説明文は、何を奪うかを書かない（使って気づく）
// toll: 代償（src/engine/sanity_m5.js が読む）
//   hit:  { sanity, maxHp, chance }  … この武器の攻撃が当たるたびに（chance の確率で）正気・HP の上限を失う
//   day:  { sanity, name, beast }    … 持っている（装備を含む）だけで、一日ごとに。name = 名前を一文字ずつ忘れる。beast = 獣の病が進む日数
//   fight:{ sanity }                 … 装備して戦いを始めるたびに
// drain: 敵に与えた傷のうち、この割合だけ HP が戻る（装飾品）
// sanity: 使うと正気が戻る（消耗品。hp があるのは、画面の「使う」を出すため）
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ITEMS, {
    // 武器
    m5_weepcleaver: {
      name: "泣き鉈", type: "weapon", dmg: [2, 6, 2], stat: "筋力", hit: 5, price: 160, toll: { hit: { sanity: 1, chance: 0.5 } },
      desc: "刃こぼれだらけの鉈。柄に、夜番の刻み目が数え切れないほど。よく斬れる。斬るたびに、どこかで誰かがすすり泣く。",
    },
    m5_fleshhook: {
      name: "肉削ぎの鉤", type: "weapon", dmg: [1, 8, 4], stat: "敏捷", hit: 10, vital: 10, price: 120, toll: { hit: { maxHp: 1, chance: 0.2 } },
      desc: "質流れの鉤爪。前の持ち主は三人とも、痩せ細って死んだと質屋は言う。四人目だったかもしれない。",
    },
    // 装飾品
    m5_namecrown: {
      name: "忘れ名の冠", type: "ring", stats: { 知力: 10 }, cursed: true, price: 0, toll: { day: { name: 1 } },
      desc: "知力+10。子ども用かと思うほど小さな冠。載せると、頭の中が静かになる。内側に、削られた名前の跡がいくつもある。",
    },
    m5_whispershell: {
      name: "囁きの貝殻", type: "ring", stats: { 知力: 5, 敏捷: 5 }, price: 90, toll: { fight: { sanity: 2 } },
      desc: "知力+5・敏捷+5。巻き貝。耳に当てると、潮騒の奥で誰かが敵の癖を教えてくれる。ときどき、歌う。音程が外れている。",
    },
    m5_bloodring: {
      name: "血吸いの指輪", type: "ring", stats: { 体力: 5 }, drain: 0.3, price: 140, toll: { day: { beast: 1 } },
      desc: "体力+5。赤黒い石の指輪。敵を斬ると、指の付け根が温かくなる。満腹になると、小さくげっぷをする。",
    },
    // 気休め
    m5_morning: {
      name: "瓶詰めの朝", type: "use", hp: 1, sanity: 5, price: 25,
      desc: "コルクで栓をした空っぽの瓶。振ると、鶏の声がする気がする。",
    },
  });
  D.SHOP_BASE.push("m5_morning");
})(globalThis.G = globalThis.G || {});
