// F3：既にある出来事の結果に、名のある人物の好感度（aff。−100〜+100 の目盛り）を足す。出来事の本文は書き換えない。
// 恨まれる・見捨てる・裏切る・嘲るとマイナスへ、助ける・筋を通すとプラスへ。仕組みは engine/zzz_f3_affinity.js
// 一行ずつ：[出来事の id, 選択肢の label に含まれる言葉, "ok" | "ng" | "win"（ok の中の戦いに勝ったとき）, { 人物の id: 増減 }]
// 名前の頭の zz は、events*.js より後に読ませるため。見つからなかった行は D.F3_AFF_MISS に残す（テストが拾う）
// レーン F＋V（F3）
(function (G) {
  const D = G.data;
  const ROWS = [
    // 凍えた脱走兵：身ぐるみを剥ぐ・見捨てる
    ["deserter_help", "身ぐるみを剥ぐ", "ok", { joachim: -60 }],
    ["deserter_help", "放っておく", "ok", { joachim: -15 }],
    // 王国軍の女隊長：おばさんと呼ぶ・わざと逆の道を教える
    ["c2_ange1", "人違いだと説く", "ok", { angelica: 5 }],
    ["c2_ange1", "人違いだと説く", "ng", { angelica: -10 }],
    ["c2_ange1", "おばさん", "ok", { angelica: -35, captain: -5 }],
    ["c2_ange2", "道を教える", "ok", { angelica: 15, captain: 10 }],
    ["c2_ange2", "わざと逆の道", "ok", { angelica: -10, captain: -20 }],
    ["c2_ange2", "寡黙な隊長に話しかける", "ok", { captain: 15 }],
    // 足跡を測る王
    ["c2_valeon", "足跡の主を一緒に追う", "ok", { valeon: 10 }],
    ["c2_valeon", "足跡の主を一緒に追う", "ng", { valeon: -5 }],
    ["c2_valeon", "使徒を討ったこと", "ok", { valeon: 20 }],
    // 面接の卓：途中で立ち去る
    ["c2_sheila_hire", "立ち去る", "ok", { sheila: -5 }],
    // 嘴の医者：仮面を剥いで奪う
    ["v2_berna", "100G で薬を買う", "ok", { berna: 5 }],
    ["v2_berna", "処方の嘘を見抜く", "ok", { berna: 15 }],
    ["v2_berna", "仮面を剥いで薬を奪う", "ok", { berna: -60 }],
    ["v2_berna", "仮面を剥いで薬を奪う", "ng", { berna: -30 }],
    // 取り立て屋：逃げる・帳面の不備で恥をかかせる
    ["v1_borg", "400G 払う", "ok", { borg: 10 }],
    ["v1_borg", "路地を駆け抜けて逃げる", "ok", { borg: -20 }],
    ["v1_borg", "帳面の不備を突く", "ok", { borg: -40 }],
    // 大広場の告発：聖女の正体を暴く
    ["w1_accuse", "群衆に真実を叫ぶ", "ok", { aurelia: -80 }],
    ["w1_accuse", "司教たちを揺さぶる", "ok", { aurelia: -40 }],
  ];
  D.F3_AFF_MISS = [];
  D.F3_AFF_ROWS = ROWS.length;
  ROWS.forEach(([eid, part, branch, aff]) => {
    const e = (D.EVENTS || []).find((x) => x.id === eid);
    const c = e && (e.choices || []).find((x) => String(x.label || "").includes(part));
    const o = c && (branch === "win" ? c.ok && c.ok.win : c[branch]);
    if (!o) { D.F3_AFF_MISS.push(`${eid} / ${part} / ${branch}`); return; }
    o.aff = Object.assign({}, o.aff || {}, aff);
  });
})(globalThis.G = globalThis.G || {});
