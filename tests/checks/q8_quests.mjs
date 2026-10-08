// Q8：恋人・結婚の前に、その人の頼みごと（C9）をこなす（data/q8_love_quests.js・engine/zzzzzzz_q8_quests.js）
// - 好感度が高くても、頼みごとの前半が済んでいなければ告白（恋の筋の告白の段・M10 の告白）に進まない。済めば進む
// - 恋仲でも、頼みごとの結末まで済んでいなければ求婚（M10 の求婚・恋の筋の求婚の段・約束）に進まない。済めば進む
// - 古いセーブで約束まで進んでいる仲は、そのまま式に進める
// - 恋の相手は全員、頼みごとを持つ
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("q8 恋と頼みごと: " + m); };
  const G = loadEngine();
  G.data.C14.off = true; // C14 の段（上限・結婚の段）は tests/checks/c14_stages.mjs で確かめる。ここは仕組みだけ
  const D = G.data;
  G.rand = seeded(1);
  G.P = { trophies: {}, graves: [] };
  const { stats, caps } = G.cre.quickStats("merc", G.rand);
  G.newGame({ cls: "merc", stats, caps, goal: "custom", goalText: "店を持つ", profile: { name: "測定", sex: "女", age: 26 } });
  const S = G.S;
  G.c2Join("dil");
  const c = S.companions[0];
  const quest = (k, end) => { S.q9 = S.q9 || {}; S.q9.dil = { n: k, day: S.day, r: [], end: end || "" }; };
  // ほかの条件（好感度・日数・身の上話・すれ違いの段）はそろえる
  c.bond = 95;
  S.day += 40;
  const h = G.tkState(S).heard;
  for (let i = 1; i <= 6; i++) h[`dil_p${i}`] = { day: S.day, k: "" };
  const steps = D.Q9.dil.steps.length;
  const half = D.Q8Q.loveSteps(steps);

  // ---- 恋人の前：頼みごとの前半
  c.m10 = { st: "spark", cool: 0 };
  G.r2Of("dil", S).st = 4;
  quest(half - 1);
  if (G.m10P.confess(c, S)) F("頼みごとの前半が済んでいないのに、告白の出来事が起きる");
  if (G.r2Gate(G.r2Topic("r2_dil_5"), c, S)) F("頼みごとの前半が済んでいないのに、恋の筋の告白の段が出る");
  G.m10Do("love", c, { confess: true });
  if (G.m10St(c) === "love") F("頼みごとの前半が済んでいないのに、恋仲になった");
  c.m10.cool = 0;
  quest(half);
  if (!G.m10P.confess(c, S)) F(`頼みごとの前半が済んだのに、告白の出来事が起きない（${G.q8LoveMissing(c, S).join("・")}）`);
  G.m10Do("love", c, { confess: true });
  if (G.m10St(c) !== "love") F("頼みごとの前半が済んだのに、恋仲になれない");

  // ---- 結婚の前：頼みごとの結末
  c.m10.since = S.day - 30; c.m10.cool = 0; c.m10.miss = false;
  G.r2Of("dil", S).st = 6; G.r2Of("dil", S).day = S.day - 10; G.r2Of("dil", S).sour = 0;
  if (G.m10P.propose(c, S)) F("頼みごとの結末が済んでいないのに、求婚の出来事が起きる");
  if (G.r2Gate(G.r2Topic("r2_dil_7"), c, S)) F("頼みごとの結末が済んでいないのに、恋の筋の求婚の段が出る");
  G.m10Do("vow", c);
  if (G.m10St(c) !== "love") F("頼みごとの結末が済んでいないのに、約束した");
  if (!S.log.some((l) => l.text === D.Q8Q.HOLD.replace("{n}", G.m2Short(c)))) F("約束が先送りになったとき、一言も出ない");
  c.m10.cool = 0;
  quest(steps, "done");
  if (!G.m10P.propose(c, S)) F("頼みごとの結末まで済んだのに、求婚の出来事が起きない");
  if (!G.r2Gate(G.r2Topic("r2_dil_7"), c, S)) F("頼みごとの結末まで済んだのに、恋の筋の求婚の段が出ない");
  G.m10Do("vow", c);
  if (G.m10St(c) !== "vow") F("頼みごとの結末まで済んだのに、約束できない");

  // ---- 古いセーブ：約束まで進んでいれば、頼みごとが済んでいなくても式に進める
  quest(0);
  G.m10Do("wed", c);
  if (G.m10St(c) !== "wed") F("古いセーブの約束の仲が、式に進めない");

  // ---- 恋の相手は全員、頼みごとを持つ
  for (const id of Object.keys(D.Q8P.ALLOW)) if (!(D.Q9[id] && D.Q9[id].steps.length >= 2)) F(`${id}: 頼みごとが無い`);
  if (!n) ok(`q8 恋と頼みごと（恋人の前に前半・結婚の前に結末・古いセーブ・恋の相手 ${Object.keys(D.Q8P.ALLOW).length} 人に頼みごと）`);
};
