// V3：はじめて訪れる町の場面（src/engine/zzzzzzzzzz_v3_first.js・src/data/zv3_first*.js）
// - 表の町がすべてあり、町で、二段落以上・数字なし
// - 旅をして、はじめて着いたときだけ、町の説明の前に段落ごとに出る。U14 の「はじめての町」の一言は残る。二度目は出ない
export default ({ loadEngine, seeded, fail, ok }) => {
  const G = loadEngine();
  const D = G.data;
  const T = D.V3_FIRST || {};
  const ids = Object.keys(T);
  if (!ids.length) { fail("D.V3_FIRST が空"); return; }
  for (const id of ids) {
    const L = D.LOCS[id];
    if (!L) { fail(`V3_FIRST ${id}：場所が無い`); continue; }
    if (L.type !== "town") fail(`V3_FIRST ${id}：町でない`);
    const t = T[id];
    if (/[0-9０-９!！]/.test(t)) fail(`V3_FIRST ${id}：数字か「！」が入っている`);
    if (t.split(/\n+/).filter((s) => s.trim()).length < 2) fail(`V3_FIRST ${id}：一段落しかない`);
  }

  G.rand = seeded(5);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
  let shown = 0;
  for (const id of ids) {
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    if (S.loc === id || S.visited[id]) continue;
    S.w6 = { days: 2, sea: false };
    const n0 = S.log.length;
    G.arrive(id);
    if (S.loc !== id) continue;   // ほかの包みが行き先を変えた
    const got = S.log.slice(n0);
    const first = T[id].split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const at = got.findIndex((e) => e.text === first[0]);
    const desc = got.findIndex((e) => e.text === D.LOCS[id].desc);
    if (at < 0) { fail(`V3_FIRST ${id}：着いても場面が出ない`); continue; }
    if (desc >= 0 && desc < at) fail(`V3_FIRST ${id}：町の説明より後に出た`);
    if (got.slice(at, at + first.length).map((e) => e.text).join("|") !== first.join("|")) fail(`V3_FIRST ${id}：段落が順に並ばない`);
    const fl = new Set(); for (let k = 0; k < 12; k++) fl.add(G.u14.firstLine(k));
    if (!got.some((e) => fl.has(e.text))) fail(`V3_FIRST ${id}：「はじめての町」の一言が消えた`);
    // 二度目は出ない
    G.arrive(id === "karna" ? "nerva" : "karna");
    S.w6 = { days: 2, sea: false };
    const n1 = S.log.length;
    G.arrive(id);
    if (S.log.slice(n1).some((e) => e.text === first[0])) fail(`V3_FIRST ${id}：二度目にも出た`);
    shown++;
  }
  if (!shown) fail("V3_FIRST：一つも確かめられなかった");
  ok(`はじめて訪れる町の場面（${ids.length} 町・着いて確かめた ${shown}）`);
};
