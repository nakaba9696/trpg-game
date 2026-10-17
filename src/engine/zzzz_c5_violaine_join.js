// C5 の続き：宿敵ヴィオレーヌが仲間になる道（出来事は src/data/events_c5_violaine_join.js）の仕組み。DOM には触らない。
// combat.js・core.js・zz_c2_people.js は書き換えず、包んで足す。名前の頭の zzzz は、zz_c2_people.js（G.apply・G.c2CanJoin）より後に読ませるため。
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（無ければ勝ち 0・前の出来事は出会った日）
//   S.c5vio = { wins: 黒衣の剣士（敵 c5_violaine）との出来事の決闘に勝った数, last: ヴィオレーヌの出来事が最後に始まった日 }
// やること
//   - 敵 c5_violaine と戦う出来事の勝ち（win）に印を付け、その勝ちが入ったら数える（前からある c5_vio_glove・c5_vio_lost・v17a_rust_mouth_v の決闘も数える）
//   - 「顔なじみを誘う」では、四度目の戸口（c5_vio_join）を見るまで誘えない（S.flags.vj_vio_ready。誘う選択肢を出さないだけで、G.c2Join は止めない）
//   - 仲間になったあとは、町で迷子になっている前の出来事（c5_vio_lost）を出さず、炭鉱の坑口でも待っていない（一緒に来ている）
// レーン C＋V
(function (G) {
  const D = G.data;
  const ID = "violaine", FOE = "c5_violaine";
  const st = (S) => {
    if (!S.c5vio || typeof S.c5vio !== "object") S.c5vio = {};
    if (typeof S.c5vio.wins !== "number") S.c5vio.wins = 0;
    return S.c5vio;
  };
  G.c5vioState = st;
  const joined = (S) => !!(G.c2State && G.c2State(S).joined[ID]);
  const inParty = (S) => !!(G.c2In && G.c2In(ID, S));

  // ---------------------------------------------------------------- 新しい冒険の予定の揺れ（F4）
  // ヴィオレーヌの予定は一年じゅう王都なので、日の揺れ（S.f4.shift）は居場所を変えない。揺れの乱数を引かずに 0 にする
  // （仲間が一人増えるたびに、新しい冒険の始めの乱数が一つずれて、ほかの決まった乱数の流れが変わらないように）
  const new0 = G.newGame;
  G.newGame = (opt) => {
    const p = (D.C2_PEOPLE || {})[ID];
    const sch = p && p.schedule;
    const one = Array.isArray(sch) && new Set(sch.map((x) => x.loc)).size === 1;
    if (one) delete p.schedule;
    let S;
    try { S = new0(opt); } finally { if (one) p.schedule = sch; }
    if (S && S.f4 && S.f4.shift) S.f4.shift[ID] = 0;
    return S;
  };

  // ---------------------------------------------------------------- 決闘の勝ちに印
  const combat0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    if (Array.isArray(ids) && ids.includes(FOE) && opt) opt = Object.assign({}, opt, { win: Object.assign({}, opt.win || {}, { vioWin: true }) });
    return combat0(ids, opt);
  };
  const apply0 = G.apply;
  G.apply = (o) => {
    if (o && o.vioWin && G.S) st(G.S).wins++;
    return apply0(o);
  };

  // ---------------------------------------------------------------- ヴィオレーヌの出来事が始まった日
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const e = typeof ev === "string" ? D.EVENTS.find((x) => x.id === ev) : ev;
    const r = start0(ev);
    if (r && e && G.S && G.S.event === e.id && [].concat(e.c2 || []).includes(ID)) st(G.S).last = G.S.day;
    return r;
  };

  // ---------------------------------------------------------------- 町で誘えるのは、四度目の戸口のあとだけ（G.c2Join そのものは止めない）
  const ready = (S) => !!(S && S.flags && S.flags.vj_vio_ready);
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S || ready(S)) return groups;
    const g = groups.find((x) => x.title === "顔なじみ");
    if (!g) return groups;
    g.list = g.list.filter((a) => a.id !== "c2inv:" + ID);
    if (!g.list.length) groups.splice(groups.indexOf(g), 1);
    return groups;
  };
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head === "c2inv" && arg === ID && !ready(G.S)) return;
    return act0(head, arg, a);
  };

  // ---------------------------------------------------------------- 仲間になったあとの前の出来事
  const ev = (id) => D.EVENTS.find((e) => e.id === id);
  const lost = ev("c5_vio_lost");
  if (lost && lost.cond) { const c0 = lost.cond; lost.cond = (S) => !joined(S) && c0(S); }
  // 炭鉱の坑口：一党にいれば、坑口で待っている形（v17a_rust_mouth_v）でなく、ふつうの坑口（v17a_rust_mouth）へ
  for (const e of D.EVENTS) {
    const ch = e.choices || [];
    const withV = ch.filter((c) => c.ok && c.ok.next === "v17a_rust_mouth_v" && c.cond);
    for (const v of withV) {
      const alone = ch.find((c) => c !== v && c.label === v.label && c.ok && c.ok.next === "v17a_rust_mouth" && c.cond);
      if (!alone) continue;
      const cv = v.cond, ca = alone.cond;
      v.cond = (S) => !inParty(S) && cv(S);
      alone.cond = (S) => ca(S) || (inParty(S) && cv(S));
    }
  }
})(globalThis.G = globalThis.G || {});
