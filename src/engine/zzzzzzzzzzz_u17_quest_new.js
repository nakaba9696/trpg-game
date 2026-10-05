// U17：依頼が増えた・進んだことを分かるように（持ち主の声「依頼が追加されたらビックリマークをつけて。普段の会話で依頼になってるのかわかりにくいので」）
// - 受けている依頼の一覧（G.q7.list。ギルドの依頼・仲間の頼みごと・因縁（F2）・R3 の続きなど、一覧に載るものすべて）を行動のたびに見比べ、
//   新しく増えた依頼・中身が進んだ依頼を覚える。増えた・進んだその場で、記録に色付きの一行（k: "quest"）を出す
// - 画面は S.q17 を読むだけ：bang（右上の「依頼」の赤い「！」。一覧を開いたら G.q17.seen で消す）、fresh（一覧の「新」「進展」の印。一覧を閉じたら G.q17.clear で消す）
// セーブに足すもの：S.q17 = { sig: { 依頼の key: 中身の印 }, fresh: { key: "new" | "up" }, bang: 真偽 }。無い古いセーブでは、最初の行動の前に今の一覧を「もう知っている」ことにする。
// DOM には触らない（画面は src/ui/u17_quest_new.js）。名前の頭の z は、G.act・G.newGame・G.q7.list を包むほかのファイルより後に読ませるため。レーン U＋C
(function (G) {
  const U = (G.q17 = G.q17 || {});
  const list = (S) => { try { return G.q7 && G.q7.list ? G.q7.list(S) : []; } catch { return []; } };
  // 中身の印：名前・進み具合・達成（因縁は段ごとに名前が同じなので説明も）。期限が近づいただけ（soon・late）、仲間が一行を離れただけでは変わらない
  U.sigOf = (e) => [e.title, e.progress || "", e.src === "f2o" ? (e.desc || []).join("／") : "", e.state === "ready" ? "ready" : ""].join("|");
  U.state = (S) => {
    S = S || G.S;
    if (!S) return null;
    const q = S.q17 && typeof S.q17 === "object" ? S.q17 : (S.q17 = {});
    if (!q.sig || typeof q.sig !== "object") q.sig = null;
    if (!q.fresh || typeof q.fresh !== "object") q.fresh = {};
    q.bang = !!q.bang;
    return q;
  };
  // 今の一覧を「もう知っている」ことにする（新しい冒険・古いセーブ）
  U.baseline = (S) => {
    const q = U.state(S);
    if (!q) return;
    q.sig = {};
    list(S).forEach((e) => { q.sig[e.key] = U.sigOf(e); });
  };
  // 見比べる。増えた・進んだ依頼を [{ key, title, how: "new" | "up" | "ready" }] で返し、記録に一行ずつ出す
  U.scan = (S) => {
    S = S || G.S;
    const q = U.state(S);
    if (!q) return [];
    if (!q.sig) { U.baseline(S); return []; }
    const now = {};
    const out = [];
    list(S).forEach((e) => {
      const sig = U.sigOf(e);
      now[e.key] = sig;
      const was = q.sig[e.key];
      if (was === sig) return;
      const how = was == null ? "new" : e.state === "ready" && !String(was).endsWith("|ready") ? "ready" : "up";
      out.push({ key: e.key, title: e.title, how });
      q.fresh[e.key] = how === "new" || q.fresh[e.key] === "new" ? "new" : "up";
    });
    Object.keys(q.fresh).forEach((k) => { if (!(k in now)) delete q.fresh[k]; }); // 一覧から消えた依頼の印は捨てる
    q.sig = now;
    if (out.length) {
      q.bang = true;
      if (!S.over && G.log) out.forEach((x) => G.log("quest", U.line(x)));
    }
    return out;
  };
  U.line = (x) => x.how === "new" ? `依頼『${x.title}』を引き受けた。（右上の「依頼」で見られる）`
    : x.how === "ready" ? `依頼『${x.title}』を果たした。冒険者ギルドへ報告しよう。`
    : `依頼『${x.title}』が進んだ。`;
  U.seen = (S) => { const q = U.state(S); if (q) q.bang = false; };            // 一覧を開いた
  U.clear = (S) => { const q = U.state(S); if (q) { q.bang = false; q.fresh = {}; } }; // 一覧を閉じた
  U.bang = (S) => { const q = U.state(S); return !!(q && q.bang); };
  U.freshOf = (S, key) => { const q = U.state(S); return (q && q.fresh[key]) || ""; };

  const act0 = G.act;
  if (act0) {
    G.act = (id) => {
      const S = G.S;
      if (S && !S.over) { const q = U.state(S); if (!q.sig) U.baseline(S); }
      const r = act0(id);
      try { if (G.S && G.S === S) U.scan(S); } catch { /* 印が付かなくても遊びは止めない */ }
      return r;
    };
  }
  const new0 = G.newGame;
  if (new0) {
    G.newGame = (opt) => {
      const r = new0(opt);
      try { if (G.S) { G.S.q17 = { sig: null, fresh: {}, bang: false }; U.baseline(G.S); } } catch {}
      return r;
    };
  }
})(globalThis.G = globalThis.G || {});
