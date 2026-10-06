// 戦闘中は判定の振り直し（M7）ができない（持ち主の決定：巻き戻ると急に場面が変わって分かりにくい）
// - 戦闘の手番の失敗した判定：振り直しが出ず、使えず、回数も減らない。画面のための印（G.rerollBlocked）と理由の文がある
// - 出来事の判定に失敗して、その行動で戦闘が始まった：その判定も振り直せない（巻き戻ると戦闘が消える）
// - 戦闘を終えた手番（最後の敵が倒れた）の判定も振り直せない
// - 戦闘が終わったあとの行動の判定は、今まで通り振り直せる
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const F = (m) => { bad++; fail("振り直し（戦闘）：" + m); };
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 10; caps[k] = 60; });
    G.newGame({ cls: "thief", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.maxHp = G.S.hp = 999;
    G.S.companions = [];
    return G.S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const hasRR = () => acts().some((a) => a.id === "rr:go");
  const script = (vals) => { let i = 0; return () => (i < vals.length ? vals[i++] : 0.5); };
  if (!G.REROLL_NO_COMBAT || !/戦闘中/.test(G.REROLL_NO_COMBAT)) F("理由の文（G.REROLL_NO_COMBAT）が無い");

  // 戦闘の手番
  let S = start(1);
  const n0 = S.rerolls;
  G.startCombat(["dogu"], {});
  G.rand = script([0.97]);
  G.act("cb:attack");
  const fail0 = S.log.filter((e) => e.k === "dice" && !e.ok).pop();
  if (hasRR()) F("戦闘の手番の失敗に「振り直す」が出る");
  if (!G.rerollBlocked() || !G.rerollBlockedTarget(fail0)) F("戦闘の手番の失敗に、振り直せない印が付かない");
  if (G.reroll() || S.rerolls !== n0) F("戦闘の手番の判定を振り直せる（か、回数が減った）");
  G.act("cb:guard");
  if (G.rerollBlockedTarget(fail0)) F("次の行動をしても、前の手番の印が残る");

  // 出来事の判定に失敗して戦闘が始まる
  S = start(2);
  G.startEvent("duel");
  G.rand = script([0.99]);
  G.act("ev:1"); // おだてて帰らせる（魅力）。しくじると戦闘
  if (S.mode !== "combat") F("決闘の出来事で、しくじっても戦闘が始まらない（確認の前提が崩れた）");
  if (hasRR()) F("判定に失敗して戦闘が始まったのに、その判定を振り直せる");
  if (!G.rerollBlocked()) F("判定に失敗して戦闘が始まったとき、振り直せない印が付かない");
  if (G.reroll() || S.mode !== "combat") F("戦闘の始まりを巻き戻せてしまう");

  // 戦闘を終えた手番の判定
  S = start(3);
  G.startCombat(["goblin"], {});
  const f = S.combat.foes[0];
  f.hp = 1; f.hex = 3;
  G.rand = script([0.97]);
  G.act("cb:attack"); // 攻撃は外れ、呪いの蝕みで倒れる
  if (S.combat) F("呪いで敵が倒れず、戦闘が終わらない（確認の前提が崩れた）");
  if (hasRR() || G.reroll()) F("戦闘を終えた手番の判定を振り直せる");

  // 戦闘のあとの行動は今まで通り
  G.startEvent("shrine");
  G.rand = script([0.9]);
  G.act("ev:0");
  if (!hasRR()) F("戦闘が終わったあとの出来事の判定を振り直せない");
  else if (G.rerollBlocked()) F("戦闘の外なのに、振り直せない印が付く");

  if (!bad) ok("戦闘中は振り直せない（手番・戦闘が始まった判定・戦闘を終えた手番）。戦闘のあとは振り直せる");
};
