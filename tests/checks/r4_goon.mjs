// R4：目的の節目で「旅を続ける」を選んだとき、まだ終わっていないことを地の文で思い出させる（src/engine/zzzzzzzzzzzz_r4_goon.js・src/data/r4_goon.js）
// - 「旅を続ける」のあとに、因縁の名と行き先の町の名が出る。行は多くても MAX まで。数字は出さない
// - 「いつでも終えられる」の案内は、つなぎの文のあと（最後）に残る。節目の問いはもう出ていない
// - 古いセーブ（因縁・覚え・世の大事・依頼の状態が無い）でも止まらず、何も無ければ「まだ知らない土地」の一行
// - 節目の問いが出ていないときに呼んでも、何も足さない
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const T = D.R4_GOON;
  let bad = 0;
  const f = (m) => { bad++; fail("R4 旅を続ける: " + m); };
  if (!T || !G.r4goon) { f("D.R4_GOON か G.r4goon が無い"); return; }
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 12]));
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats: { ...stats }, goal: "sword", profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const reach = (S) => { S.inv.volgrim = 1; S.mode = "explore"; S.event = null; S.combat = null; G.endTurn(); return S.m6 && S.m6.pending; };

  // 因縁が途中のまま目的を果たした
  let S = start(11);
  if (!S.f2o) f("因縁が始まっていない");
  else { S.f2o.step = 2; S.f2o.home = S.loc; }
  if (!reach(S)) f("目的の節目の問いが出ない");
  const n0 = S.log.length;
  G.m6GoOn();
  const added = S.log.slice(n0);
  const said = added.filter((l) => l.k === "nar").map((l) => l.text);
  const th = D.F2_THREADS[S.f2o.th];
  const to = G.f2o.locOf(S.f2o, 2);
  if (!said.some((t) => t.includes(`「${th.title}」`))) f(`因縁「${th.title}」が出ない：${said.join(" / ")}`);
  if (to && to !== S.loc && !said.some((t) => t.includes(D.LOCS[to].name))) f(`因縁の行き先 ${D.LOCS[to].name} が出ない`);
  if (said.length - 1 > T.MAX) f(`行が多すぎる（${said.length - 1}）`);
  if (said.some((t) => /[0-9０-９]/.test(t))) f(`数字が出ている：${said.join(" / ")}`);
  const last = added[added.length - 1];
  if (!last || last.k !== "sys") f(`最後が「いつでも終えられる」の案内でない（${last && last.text}）`);
  if (S.m6.pending) f("節目の問いが残っている");

  // 古いセーブ：つなぎの元が何も無い
  S = start(12);
  delete S.f2o; delete S.echo; delete S.m12; S.quests = []; delete S.q9; delete S.q5;
  if (!reach(S)) f("古いセーブで目的の節目の問いが出ない");
  const n1 = S.log.length;
  try { G.m6GoOn(); } catch (e) { f("古いセーブで止まる：" + e.message); }
  if (!S.log.slice(n1).some((l) => l.text === T.none)) f("何も無いときの一行が出ない");

  // 問いが出ていないときは何もしない
  S = start(13);
  const n2 = S.log.length;
  G.m6GoOn();
  if (S.log.length !== n2) f("節目の問いが無いのに文が足された");

  if (!bad) ok("R4 旅を続ける：因縁と行き先・数字なし・案内は最後・古いセーブ・問いが無いときは何もしない");
};
