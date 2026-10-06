// U17：噂を「受けている依頼」の横に（engine/zzzzzzzzzzz_u17_rumors.js・ui/u17_rumors.js）
// - 酒場の「噂を聞く」で入った噂が、この冒険の噂（G.q17.rumors）に並ぶ。新しい噂には「新」と右上の「！」（S.q17.bang）と記録の一行（一つの行動で一度）。一覧を閉じたら「新」は消える
// - 一つ一つに、続きがありそうな所（地名は LOCS の名）か、まだ分からないことを添える
// - 続きが依頼になったら（噂の場所が受けている依頼の行き先）「依頼になった」として下へ
// - 知っている魔物の「聞いた話」（知識）は噂に入れない（図鑑に残す）。図鑑の入口の「！」に噂の印を数えない
// - 古いセーブ（S.q17r が無い）でも、覚え書きの「噂：」と、図鑑の噂の箱の話が噂に出る
export default ({ G, fail, seeded }) => {
  const D = G.data;
  const F = (m) => fail("U17 噂: " + m);
  if (!G.q17 || !G.q17.rumors) { F("G.q17.rumors が無い"); return; }
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "噂試し", sex: "女", age: 25, history: "テスト用", personality: "慎重" } });
    return G.S;
  };

  // 酒場の「噂を聞く」
  let S = start(11);
  if (G.q17.rumors(S).length) F("始めたばかりで噂がある");
  S.loc = "karna"; S.mode = "fac"; S.fac = "tavern"; S.gold = 100;
  const acts = G.actions().flatMap((g) => g.list);
  if (acts.some((a) => a.id === "tavern:rumor" && !a.disabled)) {
    S.q17.bang = false;
    const at = S.log.length;
    G.act("tavern:rumor");
    // その場で分かる一行（U19 の書き直す本文でも、その行動の頁に出る）。一つの行動で一度だけ
    const lines = S.log.slice(at).filter((e) => e.k === "quest" && e.text === G.q17.RUMOR_LINE);
    if (lines.length !== 1) F(`噂を聞いた行動で、書き留めた一行が ${lines.length} 回出る`);
    const R = G.q17.rumors(S);
    if (!R.length) F("酒場で聞いた噂が、依頼の窓の噂に入らない");
    else {
      if (!R[0].fresh) F("新しい噂に「新」が付かない");
      if (!R[0].hint) F("噂に続きの手がかり（行き先か、まだ分からない）が無い");
    }
    if (R.length && !G.q17.bang(S)) F("新しい噂で右上の「！」が付かない");
  } else F("酒場で噂を聞けない（試しの前提）");
  S.mode = "explore"; S.fac = null;

  // 地名入りの噂：続きの場所。依頼になったら下へ
  S = start(12);
  S.loc = "karna";
  G.heard("噂：竜の墓場の奥で、しゃべる剣が眠ってるって話だ。");
  G.heard("噂：赤い月の晩に生まれた子は、よく笑うらしい。");
  let R = G.q17.rumors(S);
  const dragon = R.find((x) => x.text.includes("竜の墓場"));
  if (!dragon || dragon.loc !== "graveyard" || !dragon.hint.includes(D.LOCS.graveyard.name)) F(`地名入りの噂に続きの場所が出ない：${JSON.stringify(dragon)}`);
  const moon = R.find((x) => x.text.includes("赤い月"));
  if (!moon || moon.loc || !/まだ分からない/.test(moon.hint)) F("地名の無い噂に「まだ分からない」が出ない");
  if (R.some((x) => /^噂：/.test(x.text))) F("噂の頭の「噂：」が残る");
  // 依頼になる
  S.quests.push({ id: "uq1", type: "hunt", loc: "graveyard", target: "goblin", need: 1, progress: 0, title: "竜の墓場の見回り", desc: "見回り", reward: 10, done: false });
  R = G.q17.rumors(S);
  const d2 = R.find((x) => x.text.includes("竜の墓場"));
  if (!d2 || d2.quest !== "竜の墓場の見回り") F("噂の場所が依頼の行き先になっても「依頼になった」にならない");
  if (R[R.length - 1] !== d2) F("依頼になった噂が下へ行かない");
  // 閉じたら「新」が消える
  G.q17.rumorClear(S);
  if (G.q17.rumors(S).some((x) => x.fresh) || G.q17.rumorFresh(S)) F("閉じても噂の「新」が残る");
  // 同じ噂は一つ
  const n = G.q17.rumors(S).length;
  G.heard("噂：赤い月の晩に生まれた子は、よく笑うらしい。");
  if (G.q17.rumors(S).length !== n) F("同じ噂が二つ並ぶ");

  // 知っている魔物の聞いた話（知識）は噂に入れない
  S = start(13);
  if (G.codexFoe && D.ENEMIES.goblin) {
    G.P.codex = G.P.codex || {};
    const listed = () => G.codexFoe("goblin");
    if (!listed() && G.f2 && G.f2.slain) { /* 図鑑の仕組みが違えば飛ばす */ }
    if (listed()) {
      G.heard("ゴブリンに倒された者の話：棍棒で足を狙ってくる。", { foe: "goblin" });
      if (G.q17.rumors(S).some((x) => x.text.includes("棍棒"))) F("知っている魔物の聞いた話が噂に入る");
    }
  }
  // 図鑑の入口の「！」に噂の印を数えない（ui/f2_codex.js の freshOf と同じ式）
  G.heard("噂：まだ誰も見たことのない、銀の角の獣が北にいるらしい。");
  const codexBtn = (G.codexFresh ? G.codexFresh() : []).filter((k) => !String(k).startsWith("heard:"));
  if (codexBtn.some((k) => String(k).startsWith("heard:"))) F("図鑑の入口の印に噂が数えられる");

  // 古いセーブ：S.q17r が無い
  S = start(14);
  delete S.q17r;
  S.memos = ["噂：港町ヴァレンツァの裏通りに、腕のいい写し屋がいる。", "ただの覚え書き"];
  try {
    R = G.q17.rumors(S);
    const v = R.find((x) => x.text.includes("写し屋"));
    if (!v) F("古いセーブの覚え書きの噂が出ない");
    else {
      if (v.fresh) F("古いセーブの噂に「新」が付く");
      if (v.loc !== "nerva") F(`古いセーブの噂の行き先が違う：${v.loc}`);
    }
    if (R.some((x) => x.text.includes("ただの覚え書き"))) F("噂でない覚え書きが噂に出る");
    S.q17r = { list: "壊れ" };
    G.q17.rumors(S);
  } catch (err) { F(`古いセーブ・壊れた S.q17r で止まる：${err.message}`); }
  G.S = null;
  if (G.q17.rumors().length) F("冒険が無いときに噂がある");
};
