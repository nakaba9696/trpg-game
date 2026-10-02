// A7：主要人物の見た目を似せすぎない（持ち主「モブや兄弟ならいいけど、主要人物であんまり似たような顔にしないで」。tools/portraits_similar.mjs）
// - 名のある人（group people・hero 以外）を二人ずつ比べ、似すぎ（点が LIMIT 以上か、同じ性別・髪の色・長さで年の近い「髪の双子」）の組が無い。血縁（kin が同じ）は除く
// - 性別・年齢帯・髪の色・髪の長さ・体格がそろった人が CLUSTER_MAX を超えない（「黒髪の細身の青年」が何人も、のような偏り）
// - identity を持つ人は、道具が髪の色・長さと目の色を読み取れる（読めない色の語で、比べる網をすり抜けない）
// - 血縁の組が残っている（レオネストの王家・ノルディアの皇帝と皇女）
import { load, pairs, tooSimilar, clusters, CLUSTER_MAX, namedOf, looksOf, LIMIT } from "../../tools/portraits_similar.mjs";

export default ({ fail, ok }) => {
  const F = (m) => fail("A7：" + m);
  const list = load();
  const named = namedOf(list);
  for (const p of named.filter((p) => p.identity)) {
    const l = looksOf(p);
    if (!l.hair) F(`${p.id} の髪の色が読めない（tools/portraits_similar.mjs の HAIR に色の語を足す）`);
    if (!l.length) F(`${p.id} の髪の長さが読めない（short / medium / long hair・bob cut・bald など）`);
    if (!l.eye) F(`${p.id} の目の色が読めない（tools/portraits_similar.mjs の EYE に色の語を足す）`);
  }
  const kin = (k) => named.filter((p) => p.kin === k).length;
  if (kin("leonest") < 8 || kin("nordia") < 2) F("血縁（kin）の印が足りない：レオネストの王家 8 人・ノルディアの皇帝と皇女");
  const P = pairs(list);
  const bad = P.filter(tooSimilar);
  for (const r of bad) F(`${r.a.id} と ${r.b.id} が似すぎ（${r.score} 点${r.twin ? "・髪の双子" : ""}：${r.why.join("、")}）。片方の髪の色・髪型・目の色・印・服を変える（node tools/portraits_similar.mjs）`);
  for (const c of clusters(list).filter((c) => c.people.length > CLUSTER_MAX)) F(`${c.key} の人が ${c.people.length} 人いる（${CLUSTER_MAX} 人まで）：${c.people.map((l) => l.id).join("・")}`);
  if (!bad.length) ok(`A7：名のある人 ${named.length} 人・${P.length} 組に、似すぎ（${LIMIT} 点以上・髪の双子）と偏りが無い`);
};
