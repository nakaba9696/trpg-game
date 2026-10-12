// U37：旅の出来事の区切り。持ち主の声「移動の道中、次から次にイベントが地続きに発生するのでわかりにくい。
// 移動音を鳴らす → イベント発生 → テキスト表示 → イベントが終わったらまた移動音 → イベント発生 → テキストをまた一から表示、としてほしい」
//   1. 旅の出来事（W6・R12）が終わっても、すぐ次の出来事を始めない。「旅の途中：先へ進む」（w6go。W6 が出す）を押すまで待つ（S.w6.u37hold）
//      最後の出来事のあとの到着も同じく待つ。出来事が一つも無い旅は、今までどおりそのまま着く
//   2. 一件ごとに、出来事の本文の前に道中の一行（「三日目の夕。影が長くなった道を進む……」）を記録に置く。この行が区切りの印：
//      記録 { k: "nar", text, u37: { n 何件目, kind "road"|"arrive" } }。画面（ui/zzzzzz_zu37_beats.js）が、印で移動の音を鳴らし、本文の窓を印から書き直す
//      着く前の印は「道の先に、〇〇が見えてきた……」。襲撃（W6 の最後の戦い）も一件として印を置く。襲撃の戦いのあとも、すぐ着かずに待つ
//   3. 日付の目安：何件目かを旅の日数に割り振る（一件目は旅の前のほう、最後の件は後のほう）
// W6.next・G.startEvent・G.startCombat・G.arrive・G.exploreAct を一番外から包む（名前の z の数で R12・R6・U14 より後）。
// セーブに足すもの：S.w6 の u37n（置いた印の数）・u37tot（旅の件数の目安）・u37hold（待っている）。どれも古いセーブで無くても動く（無ければ待たずに進む）
// 乱数は使わない（行は日付と場所から選ぶ。テストの乱数の流れを変えない）。DOM には触らない。レーン U（U37）
(function (G) {
  const D = G.data;
  const W6 = G.w6;
  const U37 = (G.u37 = G.u37 || {});
  if (!W6 || !W6.next) return;

  const KAN = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  const kan = (n) => (G.u14 && G.u14.kan ? G.u14.kan(n) : n <= 10 ? KAN[n] : String(n));
  const hash = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) | 0; return Math.abs(x); };
  const pickBy = (list, k) => list[k % list.length];

  U37.ROAD = {
    朝: ["{d}の朝。街道を進む……", "{d}の朝。荷を担ぎ直して、また歩き出す……"],
    昼: ["{d}の昼。街道を進む……", "{d}の昼。日の高いうちに、道を稼ぐ……"],
    夕: ["{d}の夕。影が長くなった道を進む……", "{d}の夕。今夜の寝場所を探しながら歩く……"],
    夜: ["{d}の夜。道の脇で火を起こす……", "{d}の夜。暗い道を、足もとを確かめながら進む……"],
  };
  U37.SEA = {
    朝: ["{d}の朝。船は波を分けて進む……"],
    昼: ["{d}の昼。帆が風をはらんで鳴る……"],
    夕: ["{d}の夕。甲板に西日が長く伸びる……"],
    夜: ["{d}の夜。船底で波の音を聞く……"],
  };
  U37.ARRIVE = { land: "道の先に、{to}が見えてきた……", sea: "波の向こうに、{to}が見えてきた……" };

  // 何件目（n）が旅の何日目か。tot は旅の件数の目安
  U37.dayOf = (n, tot, days) => {
    days = Math.max(1, days | 0);
    tot = Math.max(n, tot | 0);
    return Math.min(days, Math.max(1, Math.round((days * n) / (tot + 1))));
  };
  // 道中の一行
  U37.roadLine = (w, n) => {
    const tod = U37.ROAD[w.tod] ? w.tod : "昼";
    const d = kan(U37.dayOf(n, w.u37tot, w.days)) + "日目";
    return pickBy((w.sea ? U37.SEA : U37.ROAD)[tod], hash(w.dest) + n).replace("{d}", d);
  };
  U37.arriveLine = (w) => U37.ARRIVE[w.sea ? "sea" : "land"].replace("{to}", (D.LOCS[w.dest] || {}).name || "行き先");
  U37.isBeat = (e) => !!(e && e.u37);
  U37.holding = (S) => !!(S && S.travel && S.w6 && S.w6.u37hold);

  // ---------------------------------------------------------------- 印を置く
  let cur = null; // W6.next の最中：{ mark この呼び出しの前の最後の記録, done 置いたか }
  const put = (kind) => {
    const S = G.S;
    const w = S && S.w6;
    if (!cur || cur.done || !w) return;
    cur.done = true;
    let text;
    if (kind === "arrive") text = U37.arriveLine(w);
    else { w.u37n = (w.u37n || 0) + 1; text = U37.roadLine(w, w.u37n); }
    // この呼び出しで書かれた行（襲撃の「何者かに襲われた」など）より前に置く
    const at = cur.mark ? S.log.lastIndexOf(cur.mark) + 1 : 0;
    S.log.splice(at, 0, { k: "nar", text, u37: { n: w.u37n || 0, kind } });
    if (S.log.length > 240) S.log.splice(0, S.log.length - 240);
  };

  // ---------------------------------------------------------------- 包む
  let go = false; // 「先へ進む」を押した手番か
  const next0 = W6.next;
  W6.next = () => {
    const S = G.S;
    const w = S && S.w6;
    if (!S || S.over || !S.travel || S.mode !== "explore" || S.combat || !w || w.dest !== S.travel) return next0();
    if ((w.u37n || 0) > 0 && !go) { w.u37hold = 1; return false; } // 出来事が終わった：押すまで待つ
    w.u37hold = 0;
    if (w.u37tot == null) w.u37tot = (w.left || 0) + (w.raid ? 1 : 0);
    const outer = cur;
    cur = { mark: S.log[S.log.length - 1] || null, done: false };
    try { return next0(); } finally { cur = outer; }
  };

  const startEvent0 = G.startEvent;
  G.startEvent = (...a) => { if (cur) put("road"); return startEvent0(...a); };

  const startCombat0 = G.startCombat;
  G.startCombat = (ids, opt) => {
    if (cur && G.S && G.S.w6) {
      put("road");
      // 襲撃のあともすぐ着かず、戦いの結果のあとで「先へ進む」を待つ（W6.next が着かせる）
      if (opt && opt.after === "arrive") opt = Object.assign({}, opt, { after: null });
    }
    return startCombat0(ids, opt);
  };

  const arrive0 = G.arrive;
  G.arrive = (dest) => {
    const S = G.S;
    if (cur && S && S.w6 && (S.w6.u37n || 0) > 0 && dest === S.w6.dest) put("arrive");
    return arrive0(dest);
  };

  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "w6go") return act0(head, arg, a);
    go = true;
    try { return act0(head, arg, a); } finally { go = false; }
  };
})(globalThis.G = globalThis.G || {});
