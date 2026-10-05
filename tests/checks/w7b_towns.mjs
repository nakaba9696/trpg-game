// W7 の続き：国・地方ごとに町を 6〜8 に（src/data/locations_w7b*.js・events_w7b_*.js・lore_w7b_*.js）
// 持ち主の声「（地方ごとに増やすのを）頼みます」
// - DONE の国・地方は、町が 6〜8
// - 増やした町（marks を持つ w7_ の町）は、町の印（marks）が決まった種類から 1 つ以上・出来事 6〜10
// - 地図と行ける道・新しい町の中身（施設・店・気候・背景・用語説明・着いたときの一文・通行人・噂・出来事の形）は tests/checks/w7_map.mjs が見る
const DONE = ["レオネスト王国", "ノルディア帝国", "エルメシア共和国", "自由都市連合", "光天教会領"];
const MARKS = ["port", "river", "mine", "holy", "border", "market", "farm", "craft", "ruins", "mercs"];

export default ({ fail, ok, loadEngine }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("W7b：" + m); };
  const G = loadEngine();
  const D = G.data;
  const L = D.LOCS;
  const count = {};
  for (const T of Object.values(L)) if (T.type === "town") count[T.region] = (count[T.region] || 0) + 1;
  for (const r of DONE) { const n = count[r] || 0; if (n < 6 || n > 8) F(`${r} の町が ${n}（6〜8 のはず）`); }
  const added = Object.keys(L).filter((id) => id.startsWith("w7_") && L[id].marks);
  if (!added.length) F("増やした町が無い");
  for (const id of added) {
    const T = L[id];
    if (!Array.isArray(T.marks) || !T.marks.length || T.marks.some((m) => !MARKS.includes(m))) F(`${id}: 町の印（marks）が変（${T.marks}）`);
    const n = D.EVENTS.filter((e) => e.w > 0 && !e.w6 && (e.where || []).includes(id)).length;
    if (n < 6 || n > 10) F(`${id}: 町の出来事が ${n} 件（6〜10 のはず）`);
  }
  if (typeof (G.w7 && G.w7.townsWith) !== "function" || !G.w7.townsWith("holy").length) F("町の印で町を引く G.w7.townsWith が無い");
  if (!bad) ok(`W7b（${DONE.map((r) => `${r} ${count[r]}`).join("・")}・増やした町 ${added.length}）`);
};
