// R4：正気が崩れかけて行動が入れ替わったとき、押し間違いと思われないように伝わるか（src/engine/sanity_m5.js）
// - 入れ替わった行動の「あなた」の行のすぐ後に、押した選択肢の名前を含む地の文と、正気のせいだという一行（D.M5.SWAP）が続く
//   （「あなた」の行より前にあると、本文の欄の頁に出ない。ui/v9_pc.js・ui/zzzz_u19_page.js）
// - 町の行動でも、出来事の選択肢でも。入れ替わりの印（S.m5.swap）は行動のあとに残らない
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  let bad = 0;
  const f = (m) => { bad++; fail("R4 正気の入れ替わり: " + m); };
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 12]));
  let tries = 0, seen = 0, seenEv = 0;
  for (let seed = 1; seed <= 400 && (seen < 6 || seenEv < 2); seed++) {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: Object.keys(D.CLASSES)[seed % 5], stats: { ...stats }, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999; S.sanity = 10;
    for (let i = 0; i < 30 && !S.over; i++) {
      if (S.mode === "combat") { S.combat = null; S.mode = "explore"; }
      const g = G.actions().find((x) => x.list.filter((y) => !y.disabled).length >= 2);
      if (!g) break;
      const pick = g.list.find((y) => !y.disabled);
      const mode = S.mode;
      const last = S.log[S.log.length - 1];
      tries++;
      G.act(pick.id);
      const S2 = G.S;
      const from = S2.log.lastIndexOf(last) + 1; // 記録は長くなると頭から削られるので、行動の前の最後の行から数える
      const at = S2.log.findIndex((l, j) => j >= from && l.text === D.M5.SWAP);
      if (at < 0) continue;
      seen++;
      if (mode === "event") seenEv++;
      const say = S2.log[at - 1], you = S2.log[at - 2];
      if (!say || say.k !== "nar" || !say.text.includes(`「${pick.label}」`)) f(`押した選択肢「${pick.label}」が地の文に出ない（${say && say.text}）`);
      if (!you || you.k !== "you") f(`入れ替わりの文の前が「あなた」の行でない（${you && you.k}：${you && you.text}）`);
      if (you && you.k === "you" && you.text === pick.label) f(`入れ替わったのに、押した行動と同じ行動の行（${you.text}）`);
      if (S2.m5 && S2.m5.swap) f("入れ替わりの印が行動のあとに残っている");
      if (S2.log.slice(at + 1).some((l) => l.text === D.M5.SWAP)) f("正気の一行が二度出た");
    }
  }
  if (seen < 3) f(`入れ替わりが起きない（${tries} 回中 ${seen}）`);
  if (!seenEv) f("出来事の選択肢で入れ替わりを確かめられなかった");
  if (!bad) ok(`R4 正気の入れ替わり：${seen} 回（出来事 ${seenEv}）とも、押した名前と正気の一行が「あなた」の行のすぐ後に出る`);
};
