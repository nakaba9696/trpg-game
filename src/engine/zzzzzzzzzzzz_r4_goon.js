// R4：目的の節目で「旅を続ける」を選んだとき、今の冒険でまだ終わっていないことを地の文で一〜三行（文は src/data/r4_goon.js の D.R4_GOON）。
// 持ち主の決めた「ここで物語を終える／旅を続ける」（M6）はそのまま。新しい目的・依頼・出来事は作らず、すでにあるものを指すだけ：
//   因縁（F2。G.f2o.cur）・返ってきていない覚え（F4。S.echo.marks）・聞いた世の大事（M12。G.m12.active）・受けている依頼（Q7。G.q7.list）・仲間（M2）
// どうするかはプレイヤーが決める（行き先の手順・答えは書かない）。乱数は G.pick だけ。セーブに足すものは無い。DOM なし。
// 名前の頭の z は、F2・F4・M12・Q7・U17 の包みより後に読むため。レーン C＋V（R4）
(function (G) {
  const D = G.data;
  const R4 = (G.r4goon = G.r4goon || {});
  const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (a, k) => (v[k] != null ? v[k] : ""));
  const place = (id) => (id && D.LOCS[id] ? (G.placeName ? G.placeName(id) : D.LOCS[id].name) : "");
  const tryList = (fn) => { try { return fn() || []; } catch (e) { return []; } }; // 一つ壊れても、ほかの行は出す

  // まだ終わっていないこと（出す順）
  R4.lines = (S) => {
    S = S || G.S;
    const T = D.R4_GOON;
    if (!S || !T) return [];
    const out = [];
    // 因縁
    tryList(() => {
      const c = G.f2o && G.f2o.cur ? G.f2o.cur(S) : null;
      if (c) out.push(c.loc && c.loc !== S.loc ? fill(T.thread, { title: c.th.title, place: place(c.loc) }) : fill(T.threadNoPlace, { title: c.th.title }));
    });
    // 返ってきていない覚え（いちばん新しいもの）
    tryList(() => {
      const keys = D.ECHO_KEYS || {};
      const stale = (G.echo && G.echo.STALE) || 120;
      const marks = ((S.echo && S.echo.marks) || []).filter((m) => m && !m.done && keys[m.k] && keys[m.k].name && (S.day || 0) - (m.day || 0) <= stale);
      const m = marks[marks.length - 1];
      if (m) out.push(fill(T.echo, { name: keys[m.k].name }));
    });
    // 聞いた世の大事（決着の前）
    tryList(() => {
      const K = (D.M12 && D.M12.KINDS) || {};
      const ev = (G.m12 && G.m12.active ? G.m12.active(S) : []).find((e) => e.st < 3 && e.heard && Object.keys(e.heard).length && K[e.kind]);
      if (ev) { const at = ev.v && ev.v.t; out.push(at && D.LOCS[at] ? fill(T.world, { place: place(at), name: K[ev.kind].name }) : fill(T.worldNoPlace, { name: K[ev.kind].name })); }
    });
    // 受けている依頼（因縁は上で出したので除く。物語の文に数字を出さないので、名前に数字のある依頼は飛ばす）
    tryList(() => {
      const q = (G.q7 && G.q7.list ? G.q7.list(S) : []).find((x) => x && x.src !== "f2o" && x.title && !/[0-9０-９]/.test(x.title));
      if (q) out.push(fill(T.quest, { title: q.title }));
    });
    const lines = out.slice(0, T.MAX - (S.companions && S.companions.length ? 1 : 0));
    if (!lines.length) lines.push(T.none);
    // 仲間
    tryList(() => {
      const c = (S.companions || [])[0];
      if (c && c.name) lines.push(fill(G.pick(T.mate), { n: G.m2Short ? G.m2Short(c) : c.name }));
    });
    return lines;
  };

  const goOn0 = G.m6GoOn;
  if (goOn0) {
    G.m6GoOn = () => {
      const S = G.S;
      const was = !!(S && S.m6 && S.m6.pending);
      goOn0();
      if (!was || !G.S || G.S.over) return;
      // 「いつでも終えられる」の案内（記録の最後の sys の行）は、つなぎの文のあとへ回す
      const log = G.S.log;
      const tail = log.length && log[log.length - 1].k === "sys" ? log.pop() : null;
      R4.lines(G.S).forEach((t) => G.say(t));
      if (tail) log.push(tail);
    };
  }
})(globalThis.G = globalThis.G || {});
