// R7：依頼・噂が済んだら、黙って消さない（持ち主の声「鐘の噂は引き受けた表示が出るのに、済むと黙って消える」）
// - 行動の前と後で、受けている依頼の一覧（G.q7.list）を見比べる。一覧から消えた依頼には、記録に色付きの一行（k: "quest"）を出す
//   （ギルドの依頼は Q5 が報告・期限切れのときに一行出すので除く。出すのは R3 の続き・仲間の頼みごと・因縁・使徒の長編）
//   「依頼『〇〇』は済んだ。」／失敗・期限切れなら「依頼『〇〇』は終わった（期限切れ）。」。結果は G.q7.finished に新しく増えた分から読む
// - 町のきっかけ（R3 の続き）のように、済んだ記録をどこにも残さない依頼は、ここで S.r7done に残して「済んだ依頼」の欄に出す
// - R3 の続きが次の段へ移る（同じ名前で行き先だけ変わる）ときは、消えたのではなく「進んだ」
// - 噂が依頼になったあと、その依頼が済んだら、噂の欄でも「済んだ」と分かるように（x.done）
// セーブに足すもの：S.r7done = [{ src, title, day, result }]（無くても動く）。噂の箱の一つ一つに qt（なった依頼の名前）。DOM には触らない。
// 名前の頭の z は、G.act・G.q7.list・G.q17 を包むほかのファイル（u17・e7）より後に読ませるため。レーン C＋U（R7）
(function (G) {
  const Q7 = G.q7;
  const U = G.q17;
  if (!Q7 || !Q7.list) return;
  const R7 = (G.r7 = G.r7 || {});
  const arr = (v) => (Array.isArray(v) ? v : []);
  const list = (S) => { try { return Q7.list(S); } catch { return []; } };
  const finished = (S) => { try { return Q7.finished ? Q7.finished(S) : []; } catch { return []; } };
  const finKey = (x) => `${x.src}|${x.title}|${x.day}|${x.result}`;

  // R3 の続きが次の段へ移る（k_basket → k_basket3。同じ「婆さんの籠」で key だけ変わる）ときは、新しく引き受けたのではなく「進んだ」：
  // U17 が見比べる前に、消えた key の印を、同じ名前の新しい key へ移す。行き先が変われば「進んだ」と出るよう、R3 は説明も印に入れる
  if (U && U.sigOf) {
    const sig0 = U.sigOf;
    U.sigOf = (e) => sig0(e) + (e && e.src === "r3" ? "|" + (e.desc || []).join("／") : "");
  }
  if (U && U.scan && U.state) {
    const scan0 = U.scan;
    U.scan = (S) => {
      S = S || G.S;
      try {
        const q = S ? U.state(S) : null;
        if (q && q.sig) {
          const now = list(S).filter((e) => e.src === "r3");
          const keys = new Set(now.map((e) => e.key));
          now.forEach((e) => {
            if (e.key in q.sig) return;
            const old = Object.keys(q.sig).find((k) => k.startsWith("r3:") && !keys.has(k) && String(q.sig[k]).split("|")[0] === e.title);
            if (old) { q.sig[e.key] = q.sig[old]; delete q.sig[old]; }
          });
        }
      } catch { /* 移せなくても遊びは止めない */ }
      return scan0(S);
    };
  }

  // 済んだ記録の無い依頼（R3 の続き）を「済んだ依頼」の欄に
  if (Q7.finished) {
    const fin0 = Q7.finished;
    Q7.finished = (S) => {
      S = S || G.S;
      const out = fin0(S);
      if (!S) return out;
      arr(S.r7done).forEach((x) => {
        if (x && x.title) out.push({ src: x.src || "r3", title: String(x.title), day: x.day || 0, date: x.day && G.dateOf ? G.dateOf(x.day) : "", result: x.result || "済んだ", failed: false });
      });
      return out.sort((a, b) => b.day - a.day);
    };
  }

  R7.line = (title, x) => {
    if (!x || !x.failed) return `依頼『${title}』は済んだ。${x && x.result && !/^(済んだ|果たした)$/.test(x.result) ? `（${x.result}）` : ""}`;
    return `依頼『${title}』は終わった。（${x.result}）`;
  };

  // 見比べる。消えた依頼を [{ key, title, src, result, failed }] で返し、記録に一行ずつ出す
  R7.compare = (S, before, finBefore) => {
    if (!S || S.over) return [];
    const now = list(S);
    const keys = new Set(now.map((e) => e.key));
    const titles = new Set(now.map((e) => e.title));
    // ギルドの依頼は、報告・期限切れ・しくじりのときに Q5 が一行出しているので、ここでは足さない
    const gone = before.filter((e) => e.src !== "guild" && !keys.has(e.key) && !titles.has(e.title));
    if (!gone.length) return [];
    const known = new Set(finBefore.map(finKey));
    const fresh = finished(S).filter((x) => !known.has(finKey(x)));
    const out = [];
    gone.forEach((e) => {
      // 同じ出どころで新しく増えた「済んだ」記録。名前が合うものを先に（仲間の頼みは「題（名前）」、使徒の長編は「題：段」の形）
      const base = String(e.title).split("：")[0];
      const i = fresh.findIndex((x) => x.src === e.src && (x.title === e.title || String(x.title).startsWith(base)));
      const x = i >= 0 ? fresh.splice(i, 1)[0] : null;
      if (!x) {
        S.r7done = arr(S.r7done);
        S.r7done.push({ src: e.src, title: e.title, day: S.day || 0, result: "済んだ" });
      }
      const r = { key: e.key, title: e.title, src: e.src, result: x ? x.result : "済んだ", failed: !!(x && x.failed) };
      out.push(r);
      if (G.log) G.log("quest", R7.line(e.title, r));
    });
    // 右上の「依頼」に赤い「！」（済んだ依頼の欄に一件増えた）
    if (out.length && U && U.state) { const q = U.state(S); if (q) q.bang = true; }
    return out;
  };

  // 一覧の元になる状態の指紋（U17 の指紋＋使徒の長編の開閉）。変わっていなければ一覧を作り直さない（毎手番の行動を重くしない）
  const fp = (S) => {
    let f = "";
    try { f = U && U.fp ? U.fp(S) : ""; } catch { f = ""; }
    const e7 = S.e7 && typeof S.e7 === "object" ? Object.keys(S.e7).map((k) => [k, !!(S.e7[k] && S.e7[k].on), !!(S.e7[k] && S.e7[k].closed)]) : 0;
    return f + JSON.stringify(e7);
  };
  let memo = { S: null, fp: "", list: [], fin: [] };
  const snap = (S) => {
    const f = fp(S);
    if (memo.S !== S || memo.fp !== f) { const l = list(S); memo = { S, fp: f, list: l, fin: l.length ? finished(S) : [] }; }
    return memo;
  };
  const act0 = G.act;
  if (act0) {
    G.act = (id) => {
      const S = G.S;
      const live = S && !S.over;
      const b = live ? snap(S) : null;
      const r = act0(id);
      try {
        if (b && b.list.length && G.S === S && fp(S) !== b.fp) R7.compare(S, b.list, b.fin);
      } catch { /* 一行が出なくても遊びは止めない */ }
      return r;
    };
  }

  // 噂：依頼になった噂は、その依頼の名前を覚えておき、依頼が済んだら「済んだ」と出す
  if (U && U.rumors) {
    const rum0 = U.rumors;
    U.rumors = (S) => {
      S = S || G.S;
      const out = rum0(S);
      const st = S && U.rumorStore ? U.rumorStore(S) : null;
      if (!st) return out;
      let fin = null;
      out.forEach((x) => {
        const box = st.list[x.i];
        if (!box) return;
        if (x.quest) { box.qt = x.quest; return; }
        if (!box.qt) return;
        fin = fin || new Set(finished(S).map((f) => f.title));
        if (fin.has(box.qt)) x.done = box.qt;
      });
      return out.sort((a, b) => (a.quest || a.done ? 1 : 0) - (b.quest || b.done ? 1 : 0) || b.i - a.i);
    };
  }
})(globalThis.G = globalThis.G || {});
