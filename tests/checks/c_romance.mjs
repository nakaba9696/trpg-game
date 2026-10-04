// 恋の相手を絞る（src/engine/zzzz_romance.js・docs/romance.md）
// - romance の無い名のある仲間は、好感度を最大にしても恋の気配・嫉妬が立たず、「想いを打ち明ける」も出ない。代わりに情の出来事（cb_）の主役になれる
// - romance のある大人の仲間は恋の相手になれる。18 歳未満・子どもの姿は romance を付けても恋の相手にならない
// - 格の違う相手は romance が無ければ続き物が進まない
// - docs/romance.md の一覧と、データの romance が食い違わない。恋の相手は 25 人を超えない
import { readFileSync } from "node:fs";

const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "惚れっぽい" };

export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("恋の相手：" + m); };
  const G = loadEngine();
  G.data.Q8P.off = true; // Q8 の恋の相手の一覧（人間の見た目の名のある人だけ）と組み合わせは tests/checks/q8_pairs.mjs で確かめる。ここは仕組みだけ
  const D = G.data;
  if (!G.romanceOk || !G.romanceIds || !G.bondKin) return F("G.romanceOk・G.romanceIds・G.bondKin が無い");
  G.rand = seeded(9);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: PROFILE });
  G.S.day = 40;
  const S = G.S;
  const make = (id) => {
    const p = D.C2_PEOPLE[id];
    const c = Object.assign(p.join ? G.c2Make(id) : { name: p.name, cls: "旅人", power: 40, dmg: 0, desc: "", c2: id, sex: p.sex, age: p.age, who: p.who }, { id: "r" + id });
    G.m2Comp && G.m2Comp(c, S);
    c.bond = 100;
    return c;
  };
  const evs = D.EVENTS.filter((e) => e.id.startsWith("cb_"));
  if (evs.length < 3) F(`情の出来事が少ない：${evs.length}`);

  const ids = G.romanceIds();
  let off = 0, on = 0;
  for (const [id, p] of Object.entries(D.C2_PEOPLE)) {
    const c = make(id);
    const minor = G.loveMinor(c);
    if (p.romance === true && minor) F(`${id} は 18 歳未満・子どもの姿なのに romance が付いている`);
    if (p.romance === true && !minor) {
      on++;
      if (!G.m10Can(c)) F(`${id} は romance があるのに恋の相手になれない`);
      continue;
    }
    off++;
    if (G.m10Can(c)) F(`${id} は romance が無い（か 18 歳未満）のに恋の相手になれる`);
    if (G.m10P.spark(c, S) || G.m10P.rival(c, S)) F(`${id} に恋の気配か嫉妬が立つ`);
    // 古いセーブで気配だけ立っていても、先へ進まず「想いを打ち明ける」も出ない
    c.m10 = { st: "spark", since: 1 };
    if (G.m10P.sparked(c, S) || G.m10P.confess(c, S)) F(`${id} の気配が先へ進む`);
    if (p.join) {
      S.companions = [c];
      const acts = G.exploreActions().flatMap((g) => g.list);
      if (acts.some((a) => a.id === "m10tell:" + c.id)) F(`${id} に「想いを打ち明ける」が出る`);
      c.m10 = { st: "" };
      if (!G.bondKin(c, S)) F(`${id} が好感度最大でも情の出来事の主役にならない`);
      else if (!evs.some((e) => e.m2.pick(c, S))) F(`${id} を主役にできる情の出来事が無い`);
      S.companions = [];
    }
  }
  // 18 歳未満に romance を付けても外れる
  const tula = D.C2_PEOPLE.tula;
  if (tula) {
    tula.romance = true;
    if (G.m10Can(make("tula"))) F("tula（14 歳）に romance を付けると恋の相手になる");
    delete tula.romance;
  }
  // 名の無い仲間は今まで通り
  const plain = { id: "rplain", name: "ヨアヒム", cls: "傭兵", power: 40, dmg: 0, desc: "", bond: 100 };
  G.m2Comp && G.m2Comp(plain, S);
  if (!G.m10Can(plain)) F("名の無い大人の仲間が恋の相手になれない");
  // 格の違う相手
  for (const key of Object.keys(D.M11.AP)) {
    const a = D.M11.AP[key];
    if (a.romance !== true) continue;
    if (!G.m11ApAt(key, 0, S)) F(`${key}：romance があるのに続き物の最初に来られない`);
    a.romance = false;
    if (G.m11ApAt(key, 0, S)) F(`${key}：romance が無いのに続き物が進む`);
    a.romance = true;
  }
  // 一覧と合っているか・25 人まで
  const apIds = Object.keys(D.M11.AP).filter((k) => D.M11.AP[k].romance === true);
  const all = [...ids, ...apIds].sort();
  const md = readFileSync(new URL("../../docs/romance.md", import.meta.url), "utf8");
  const sec = md.split("## 一覧")[1].split("\n## ")[0];
  const listed = sec.split("\n").map((l) => l.match(/^\| ([a-z0-9_]+) \|/)).filter(Boolean).map((m) => m[1]).filter((x) => x !== "id").sort();
  const miss = all.filter((x) => !listed.includes(x)), extra = listed.filter((x) => !all.includes(x));
  if (miss.length) F(`docs/romance.md の一覧に無い：${miss.join("、")}`);
  if (extra.length) F(`docs/romance.md の一覧にあるが romance が無い：${extra.join("、")}`);
  if (all.length > 25) F(`恋の相手が 25 人を超えた：${all.length}`);
  if (!n) ok(`恋の相手：${all.length} 人（目標 20・上限 25。仲間 ${on}・格の違う相手 ${apIds.length}）、恋の相手でない ${off} 人に恋が立たず情の出来事になる`);
};
