// C19（組 3）：図鑑だけの人・使徒の人の姿の場面を動かす小さな仕組み（文と出来事は src/data/zv3_c19_codex*.js）。DOM には触らない。
// - 一度きりでない出来事（串焼き屋・古道具屋・教会の戸口 など）を見た印：S.flags["c19:<出来事 id>"]（二度目の場面の条件）
// - 結果の c19drop：名前にその言葉を含む仲間が、一行を残して隊を離れる（騎士ガストンが麦わらを取ったとき）
// - 宿に泊まると、まれに逆さの夢の子に「まだ起きないでね」と言われる（使徒が生きているあいだ。前に見てから日が空いたとき）
//   S.c19yura = { last 最後に見た日, n 見た回数 }。古いセーブに無くても動く
// 名前の頭の z の数は、宿の泊まり（G.facAct）・出来事の始まり（G.startEvent）を包むほかのファイルより後に読ませるため。レーン C＋V（C19）
(function (G) {
  const D = G.data;
  const C19 = D.C19C || {};

  // ---------------------------------------------------------------- 見た印
  const track = new Set(C19.TRACK || []);
  const start0 = G.startEvent;
  G.startEvent = (ev) => {
    const ok = start0(ev);
    const S = G.S;
    if (ok && S && S.event && track.has(S.event)) (S.flags = S.flags || {})["c19:" + S.event] = true;
    return ok;
  };

  // ---------------------------------------------------------------- 仲間が離れる（c19drop）
  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !o.c19drop || !S || S.over) return;
    const i = (S.companions || []).findIndex((c) => String(c.name || "").includes(o.c19drop));
    if (i < 0) return;
    const [c] = S.companions.splice(i, 1);
    G.note(`${c.name}は、隊を離れた。`);
  };

  // ---------------------------------------------------------------- 逆さの夢（宿の泊まり）
  const YURA = C19.YURA_INN || [];
  const GAP = 10, RATE = 0.08;
  const yuraAlive = (S) => !(S.flags && S.flags[(D.E3 && D.E3.LIST && D.E3.LIST.yura && D.E3.LIST.yura.flag) || "e3:yura"]);
  C19.yuraCan = (S) => !!S && YURA.length > 0 && S.day >= 5 && yuraAlive(S) && S.day - ((S.c19yura && S.c19yura.last) ?? -999) >= GAP;
  C19.yuraDream = (S) => {
    const st = (S.c19yura = S.c19yura || { last: -999, n: 0 });
    const line = YURA[st.n % YURA.length];
    st.last = S.day;
    st.n = (st.n || 0) + 1;
    G.say(line);
    if (st.n === 1) G.memo("宿で眠った晩、逆さの夢の子どもに「まだ起きないでね」と言われた");
    if (G.codexMeetPerson) {
      G.codexMeetPerson("yura");
      const r = G.codexPerson && G.codexPerson("yura");
      if (r) r.ev = (r.ev || 0) + 1;
    }
    return line;
  };
  const fac0 = G.facAct;
  G.facAct = (head, arg, a) => {
    const S = G.S;
    const day = S && S.day;
    const r = fac0(head, arg, a);
    if (head === "inn" && arg === "rest" && S && G.S === S && !S.over && S.day !== day && C19.yuraCan(S) && G.rand() < RATE) C19.yuraDream(S);
    return r;
  };
})(globalThis.G = globalThis.G || {});
