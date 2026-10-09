// R7c：目的「自分で決める」をやめて「目的なし」に（持ち主の決定）
// - 作成の画面では「自分で決める」（custom）は選べず、「目的なし」（none）が選べる。おまかせはどちらも選ばない
// - 目的なしで作って最後まで遊べる。達成の判定はしない。始まりの語り・年表・墓碑・人生の物語に、空の「目的は『』」が出ない
// - 目的なしでも、旅を重ねれば節目「道の途中」で物語を終えられる
// - 古いセーブ・記録の「自分で決める」（自由に書いた目的の文）は、そのまま年表・墓碑・人生の物語に出る
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("R7c: " + m); };
  const EMPTY = /「」|『』|目的は「」|目当ては「」/;
  const G = loadEngine();
  const D = G.data;
  const start = (goal, seed, goalText) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [], codex: {} };
    const cls = Object.keys(D.CLASSES)[seed % 5];
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = D.CLASSES[cls].base[k] + 5; caps[k] = stats[k] + 30; });
    G.newGame({ cls, stats, caps, goal, goalText, profile: { name: "テスト", sex: "女", age: 24, history: "", personality: "無口" } });
    return G.S;
  };

  // ---- 表
  if (!D.GOALS.none || D.GOALS.none.text) F("目的なし（none）が無いか、目的の文を持っている");
  if (!D.GOALS.custom || !D.GOALS.custom.hidden) F("自分で決める（custom）が作成の画面から外れていない（hidden が無い）");
  const cre = G.cre || G.u5 || null;
  if (cre && cre.fresh) {
    const seen = new Set();
    const rnd = seeded(77);
    for (let i = 0; i < 300; i++) seen.add(cre.fresh(rnd).goal);
    if (seen.has("custom") || seen.has("none")) F(`おまかせが、自分で決める・目的なしを選ぶ（${[...seen].join("・")}）`);
  }
  if (D.CRE_TEXT && !/果たしてもいいし、果たさなくてもいい/.test(D.CRE_TEXT.goalNote || "")) F("作成の画面の目的の欄に、果たしても果たさなくてもいいという説明が無い");

  // ---- 目的なしで遊ぶ
  for (let s = 1; s <= 6; s++) {
    const S = start("none", 4100 + s);
    if (S.goal.id !== "none" || S.goal.text) F(`目的なしで作った目的が ${JSON.stringify(S.goal)}`);
    const first = S.chronicle[0] && S.chronicle[0].text;
    if (!first || /目的/.test(first) || EMPTY.test(first)) F(`目的なしの年表の一行目：${first}`);
    if (G.goalDone(S)) F("目的なしが達成になっている");
    if (cre && cre.prologue) {
      const pro = cre.prologue({ cls: S.cls, goal: "none", goalText: "", profile: S.profile }).flat().join("");
      if (EMPTY.test(pro) || /目指すのは、こと/.test(pro)) F(`目的なしの始まりの語りに空の目的：${pro.slice(-80)}`);
    }
    try {
      for (let step = 0; step < 400 && !S.over; step++) {
        const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
        if (!acts.length) break;
        G.act(acts[Math.floor(G.rand() * acts.length)].id);
      }
    } catch (e) { F(`目的なしで遊んでいて例外：${e.stack || e}`); break; }
    if (!S.over) { S.over = "dead"; S.deathCause = "力尽きた"; }
    const st = G.m6Compose(S);
    const text = [...st.life, ...(st.after || [])].join("\n");
    if (EMPTY.test(text)) F(`目的なしの人生の物語に空の目的：${text.match(EMPTY)[0]}`);
    if (/自由に生きる/.test(text)) F("目的なしの人生の物語に、仮の目的「自由に生きる」が出る");
  }
  // 旅を重ねると、節目「道の途中」で終えられる
  {
    const S = start("none", 4200);
    S.day = 40; S.fame = 30;
    G.endTurn();
    if (S.m6?.pending !== "none") F(`目的なしで旅を重ねても、節目「道の途中」で尋ねられない（${S.m6?.pending}）`);
    else {
      G.endStory(S.m6.pending);
      const text = [...S.story.life, ...(S.story.after || [])].join("\n");
      if (EMPTY.test(text)) F("目的なしで物語を終えたとき、空の目的が出る");
      const g = (G.P.graves || [])[0];
      if (!g || g.goal !== "") F(`目的なしの墓碑の目的が空でない（${g && g.goal}）`);
    }
  }

  // ---- 古い「自分で決める」の記録
  {
    const want = "海の見える町に住む";
    const S = start("custom", 4300, want);
    if (S.goal.text !== want) F(`自分で決めた目的の文が残らない（${S.goal.text}）`);
    if (!(S.chronicle[0] && S.chronicle[0].text.includes(want))) F("自分で決めた目的が年表に出ない");
    S.over = "dead"; S.deathCause = "力尽きた";
    let found = false;
    for (let s = 0; s < 12 && !found; s++) { G.rand = seeded(4400 + s); found = G.m6Compose(S).life.join("").includes(want); }
    if (!found) F("自分で決めた目的が人生の物語に出ない");
    G.finishRun();
    if (!((G.P.graves || [])[0] || {}).goal || G.P.graves[0].goal !== want) F("自分で決めた目的が墓碑に残らない");
  }

  if (!n) ok("R7c 目的なし（作成で選べる・おまかせは選ばない・空の目的を語らない・節目で終えられる・古い自分で決めた目的が読める）");
};
