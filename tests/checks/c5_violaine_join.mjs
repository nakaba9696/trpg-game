// C5 の続き：宿敵ヴィオレーヌが仲間になる道（src/data/events_c5_violaine_join.js・src/engine/zzzz_c5_violaine_join.js）
// - 表：宿敵のまま（C5 の side）で、仲間の欄（join）・恋の相手（romance・Q8 の一覧）・恋の筋（R2）・会話（K1）・頼みごと（C9）がある
// - 流れ：決闘（敵 c5_violaine）に勝つと数える。勝ちが三つになるまでは四度目の戸口（c5_vio_join）が起きず、町で誘うこともできない。
//   果たし状・雨の稽古・師の席の話を経て、勝ち三つで四度目の戸口が起き、選ぶと仲間になる
// - 仲間になったあと：恋の相手になれる（G.m10Can）。身の上話を聞いて日がたつと、恋の筋の一段目が話題に出る。迷子の出来事（c5_vio_lost）はもう起きない
// - 古いセーブ（S.c5vio が無い）でも条件が読める
export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("ヴィオレーヌの仲間入り: " + m); };
  const D0 = G0.data;
  const ID = "violaine";
  const P = (D0.C2_PEOPLE || {})[ID];

  // ---------------------------------------------------------------- 表
  if (!P || !P.join) { F("仲間の欄（join）が無い"); return; }
  if (P.romance !== true) F("恋の相手（romance: true）でない");
  if (((D0.C5_PEOPLE || {})[ID] || {}).side !== "宿敵") F("C5 の控えで宿敵でなくなっている（宿敵の関係は残す）");
  if (!(D0.Q8P && D0.Q8P.ALLOW && D0.Q8P.ALLOW[ID])) F("恋の相手の一覧（Q8P.ALLOW）に無い");
  if (!(D0.R2 && D0.R2.ARCS && D0.R2.ARCS[ID])) F("恋の筋（R2）が無い");
  if (!(D0.TALK || {})[ID]) F("会話の表（D.TALK）が無い");
  if (!(D0.Q9 || {})[ID]) F("頼みごと（C9）が無い");
  const joinEv = D0.EVENTS.find((e) => e.id === "c5_vio_join");
  if (!joinEv || !joinEv.choices.some((c) => c.ok && c.ok.c2join === ID)) F("仲間になる出来事（c5_vio_join の c2join）が無い");
  if (!G0.romanceIds().includes(ID)) F("G.romanceIds に入っていない");

  // ---------------------------------------------------------------- 流れ
  const G = loadEngine();
  G.rand = seeded(7);
  G.P = { trophies: {}, graves: [] };
  const D = G.data;
  D.C14.off = true; // 関係の段の上限は tests/checks/c14_stages.mjs で確かめる。ここは道だけ
  const { stats, caps } = G.cre.quickStats("merc", G.rand);
  G.newGame({ cls: "merc", stats, caps, goal: "custom", goalText: "店を持つ", profile: { name: "測定", sex: "女", age: 24 } });
  const S = G.S;
  S.maxHp = S.hp = 999;
  S.loc = "leavel"; S.visited.leavel = true; S.mode = "explore"; S.day = 20;
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  const wins = () => (S.c5vio && S.c5vio.wins) || 0;
  const invites = () => G.exploreActions().some((g) => (g.list || []).some((a) => a.id === "c2inv:" + ID));
  const joinOk = () => !!ev("c5_vio_join").cond(S);
  const run = (id, pick, label) => {
    const e = ev(id);
    if (!e) { F(`${id} が無い`); return; }
    if (e.cond && !e.cond(S)) { F(`${label}：${id} の条件がそろわない（勝ち ${wins()}・日 ${S.day}）`); return; }
    if (!G.startEvent(id) || S.event !== id) { F(`${id} が始まらない`); return; }
    const i = e.choices.findIndex(pick);
    if (i < 0) { F(`${id} に選ぶ選択肢が無い`); return; }
    G.chooseEvent(i);
    if (S.combat) G._endCombat("win");
    S.mode = "explore"; S.event = null;
  };

  if (joinOk()) F("会う前から、四度目の戸口の条件がそろう");
  run("c5_vio_glove", (c) => !!c.fight, "出会い");
  if (wins() !== 1) F(`出会いの決闘に勝っても勝ちが 1 にならない（${wins()}）`);
  if (invites()) F("出会っただけで、王都で「ヴィオレーヌを誘う」が出る");
  delete S.c5vio.last; // 古いセーブ（最後の出来事の日が無い）でも、出会った日から数える
  S.day += 8;
  run("vj_vio_duel", (c) => !!c.fight, "また決闘");
  if (wins() !== 2) F(`また決闘に勝っても勝ちが 2 にならない（${wins()}）`);
  S.day += 6;
  run("vj_vio_letter", (c) => c.ok && /地図/.test(c.label), "果たし状");
  S.day += 6;
  if (joinOk()) F("勝ち二つで、四度目の戸口の条件がそろう");
  run("vj_vio_rain", (c) => !!c.fight, "雨の稽古");
  if (wins() !== 3) F(`雨の稽古の決闘に勝っても勝ちが 3 にならない（${wins()}）`);
  if (ev("vj_vio_duel").cond(S)) F("勝ちが三つになっても、また決闘が起きる");
  S.day += 5;
  if (joinOk()) F("師の席の話の前に、四度目の戸口の条件がそろう");
  run("vj_vio_seat", (c) => c.ok && /旅/.test(c.label), "師の席");
  S.day += 3;
  if (!joinOk()) F(`勝ち三つ・師の席の話のあとで、四度目の戸口の条件がそろわない（好感度 ${G.affOf(ID, S)}）`);
  if (invites()) F("四度目の戸口の前に、王都で「ヴィオレーヌを誘う」が出る");
  run("c5_vio_join", (c) => c.ok && c.ok.c2join === ID, "四度目の戸口");
  const c = G.c2In(ID, S);
  if (!c) { F("四度目の戸口で「一緒に行こう」と言っても仲間にならない"); return; }
  if (ev("c5_vio_lost").cond(S)) F("仲間になったあとも、町で迷子になっている出来事が起きる");

  // ---------------------------------------------------------------- 恋
  if (!G.romanceOk(c) || !G.m10Can(c)) F("仲間になったあと、恋の相手になれない");
  const h = G.tkState(S).heard;
  h.violaine_p1 = { day: S.day, k: "" };
  h.violaine_p2 = { day: S.day, k: "" };
  S.day += 20;
  G.affAdd(ID, 40, true);
  c.talkDay = 0;
  const tps = G.r2Topics(c, S);
  if (!tps.length) F(`身の上話を聞いて日がたっても、恋の筋の一段目が話題に出ない（好感度 ${G.affOf(ID, S)}）`);

  // 断っても、王都で誘える
  const G2 = loadEngine();
  G2.rand = seeded(8);
  G2.P = { trophies: {}, graves: [] };
  const q = G2.cre.quickStats("merc", G2.rand);
  G2.newGame({ cls: "merc", stats: q.stats, caps: q.caps, goal: "custom", goalText: "店を持つ", profile: { name: "測定", sex: "男", age: 30 } });
  const S2 = G2.S;
  S2.loc = "leavel"; S2.visited.leavel = true; S2.mode = "explore"; S2.day = 30;
  G2.c2Meet(ID);
  S2.flags.vj_vio_ready = true;
  if (!G2.exploreActions().some((g) => (g.list || []).some((a) => a.id === "c2inv:" + ID))) F("四度目の戸口のあと（断ったあと）、王都で「ヴィオレーヌを誘う」が出ない");

  if (!n) ok(`ヴィオレーヌ：決闘の勝ち 3 で四度目の戸口・仲間入り・恋の筋の一段目まで（好感度 ${G.affOf(ID, S)}）`);
};
