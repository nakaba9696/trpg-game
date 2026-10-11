// R4：選んだことが返ってきたとき（F4 の返りの出来事）、年表に一行残る（src/engine/zzzzzzzzzzzz_r4_echo.js・src/data/r4_echo.js）
// - 返りの出来事（echo があり echoChron が無いもの）すべてで、覚えた町と返ってきた町と、したこと（D.ECHO_KEYS の name）が一行になる
// - echoChron のある出来事（F2b の因縁の続き）は、その文だけで二重にならない
// - 覚えが無いまま（テストや古いセーブで直に）起きたときは書かない。古いセーブ（S.echo が無い）でも止まらない
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  let bad = 0;
  const f = (m) => { bad++; fail("R4 返りの年表: " + m); };
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 12]));
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats: { ...stats }, goal: "sword", profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const from = "karna", to = "leavel";
  const backs = D.EVENTS.filter((e) => e.echo);
  let n = 0;
  backs.forEach((e, i) => {
    const S = start(100 + i);
    S.loc = to; S.day = 60;
    S.echo = { marks: [{ k: e.echo, day: 1, loc: from, n: 1 }], town: {} };
    const c0 = S.chronicle.length;
    G.startEvent(e);
    const added = S.chronicle.slice(c0).map((c) => c.text);
    const name = (D.ECHO_KEYS[e.echo] || {}).name;
    if (e.echoChron) {
      if (added.some((t) => name && t.includes(name + "こと"))) f(`${e.id}: echoChron があるのに決まった形の行も書いた`);
      return;
    }
    n++;
    const line = added.find((t) => t.includes(name + "こと"));
    if (!line) { f(`${e.id}: 年表に「${name}」の行が無い（${added.join(" / ")}）`); return; }
    if (!line.includes(D.LOCS[from].name) || !line.includes(D.LOCS[to].name)) f(`${e.id}: 町の名が無い（${line}）`);
    if (/[0-9０-９{}]/.test(line)) f(`${e.id}: 数字か埋め残し（${line}）`);
  });
  // 覚えが無い・古いセーブ
  const e = backs.find((x) => !x.echoChron);
  let S = start(7);
  let c0 = S.chronicle.length;
  G.startEvent(e);
  if (S.chronicle.slice(c0).some((c) => c.text.includes("返ってくる"))) f("覚えが無いのに返りの行を書いた");
  S = start(8); delete S.echo;
  c0 = S.chronicle.length;
  try { G.startEvent(e); } catch (er) { f("古いセーブで止まる：" + er.message); }
  if (!bad) ok(`R4 返りの年表：返りの出来事 ${n} 件で、したことと町の名が年表に残る（echoChron のあるものは二重にしない）`);
};
