// 恋の線（src/engine/zzz_love_age.js）：18 歳未満の人と子どもの姿の人は、恋（M10・M11）の相手にならない。主人公が 18 歳未満でも恋の出来事は起きない
// - 名のある人物（D.C2_PEOPLE）のうち 18 歳未満・子どもの姿（childLook・絵が child）の人は、仲間にしても G.m10Can が false。好感度を最大にしても恋の気配・嫉妬が立たない
// - 18 歳以上の名のある仲間・ふつうの仲間は、今まで通り恋の相手になれる
// - ふつうの仲間でも 18 歳未満・子どもの絵なら外れる。主人公が 17 歳なら、誰とも恋の気配が立たず、格の違う相手との続き物も進まない
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "惚れっぽい" };

export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("恋の線：" + m); };
  const G = loadEngine();
  const D = G.data;
  if (!G.loveMinor || !G.loveHeroMinor) return F("G.loveMinor・G.loveHeroMinor が無い");
  const start = (age) => {
    G.rand = seeded(5);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { ...PROFILE, age } });
    G.S.day = 40;
    return G.S;
  };
  const minors = [], adults = [];
  for (const [id, p] of Object.entries(D.C2_PEOPLE)) {
    const child = p.childLook || p.age < 18 || (p.who && (p.who.kind === "child" || p.who.age < 18));
    if (child) minors.push(id); else if (p.join) adults.push(id);
  }
  for (const id of ["tula", "rui", "salphiel", "musette"]) if (D.C2_PEOPLE[id] && !minors.includes(id)) F(`${id} が 18 歳未満・子どもの姿の人に数えられていない`);
  // 名のある人：仲間の欄を作って確かめる（仲間にならない人も、仲間になったとして）
  start(24);
  let tried = 0;
  for (const id of minors) {
    const p = D.C2_PEOPLE[id];
    const c = Object.assign(p.join ? G.c2Make(id) : { name: p.name, cls: "旅人", power: 40, dmg: 0, desc: "", c2: id, sex: p.sex, age: p.age, who: p.who }, { id: "t" + id });
    tried++;
    G.m2Comp && G.m2Comp(c, G.S);
    c.bond = 100;
    if (G.m10Can(c)) F(`${id}（${D.C2_PEOPLE[id].age} 歳）が恋の相手になれる`);
    if (G.m10P && (G.m10P.spark(c, G.S) || G.m10P.rival(c, G.S))) F(`${id} に好感度最大で恋の気配か嫉妬が立つ`);
  }
  if (tried < 4) F(`確かめた 18 歳未満・子どもの姿の人が少ない：${tried}`);
  for (const id of adults) {
    const c = G.c2Make(id);
    if (!G.m10Can(c) && !D.C2_PEOPLE[id].join.noLove && D.C2_PEOPLE[id].romance !== false) F(`18 歳以上の仲間 ${id} が恋の相手になれない`);
  }
  // ふつうの仲間
  const base = { name: "剣士のアル", cls: "剣士", power: 50, dmg: 1, desc: "無口", sex: "男" };
  if (!G.m10Can({ ...base, age: 24 })) F("ふつうの 24 歳の仲間が恋の相手になれない");
  if (G.m10Can({ ...base, age: 16 })) F("ふつうの 16 歳の仲間が恋の相手になれる");
  if (G.m10Can({ ...base, who: { kind: "child", age: 11 } })) F("子どもの絵のふつうの仲間が恋の相手になれる");
  // 主人公が 17 歳
  start(17);
  if (!G.loveHeroMinor(G.S)) F("17 歳の主人公が 18 歳未満に数えられない");
  const adult = { ...base, age: 24, bond: 100 };
  if (G.m10Can(adult)) F("主人公が 17 歳なのに、大人の仲間が恋の相手になれる");
  if (G.m11ApAt && (G.m11ApAt("yoi", 0, G.S) || G.m11ApAt("zalve", 0, G.S))) F("主人公が 17 歳なのに、格の違う相手との恋の続き物が進む");
  start(18);
  if (G.loveHeroMinor(G.S) || !G.m10Can({ ...base, age: 24 })) F("18 歳の主人公で恋の相手が外れている");
  if (G.m11ApAt && !G.m11ApAt("yoi", 0, G.S)) F("18 歳の主人公で、格の違う相手との続き物の一段目が来ない");

  if (!n) ok(`恋の線：18 歳未満・子どもの姿の名のある人 ${minors.length} 人（${minors.join("・")}）は恋の相手にならない。17 歳の主人公にも恋の出来事が起きない`);
};
