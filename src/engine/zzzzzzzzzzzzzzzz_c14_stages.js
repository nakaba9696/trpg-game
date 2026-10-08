// C14：関係の段。表は src/data/c14_stages.js（D.C14）。
// - 名のある人ごとに段（S.c14.st[id]）があり、段ごとに好感度の上限がある。上限に届くと、それ以上は上がらない（下がる分はそのまま）
// - 仲間になる人は、その人の「関係の出来事」（身の上話・頼みごと〔C9〕）を済ませると、上限で C13 の節目の褒美の出来事が開き、それを済ませると次の段へ。
//   済ませていなければ、行動の欄「絆」に薄く出して、何をすれば進むかを短く添える（C13 の tierWhy を包む）
// - 仲間にならない人（共通の段の出来事）：上限に届いてから D.C14.OTHER_DAYS 日で次の段へ
// - 結婚：誓い・式・求婚は、最後の段に届いてから（m10P.propose・r2 の求婚の段・m10Do の vow／wed を包む）。恋の相手の決まり（18 歳以上・人の姿）は今のまま
// - Q8 の雑談の上限（chatTop）は段の上限に任せる（二重にしない）
// セーブに足すもの：S.c14 = { st { 人: 段 }, day { 人: 段が決まった日 }, told { 人: 上限を知らせた段 } }。
//   古いセーブ：記録の無い人は、今の好感度に合う段に置く（上限を超えていても下げない）。C13 の節目の褒美を済ませていれば、その先の段
// 乱数は使わない。DOM には触らない。名前の頭の z の数は、C13（15 個）・Q8・C11・R2 の包みより後に読ませるため。レーン C（C14）
(function (G) {
  const D = G.data;
  const C = () => D.C14;
  const X = (G.c14 = G.c14 || {});
  const P = () => D.C2_PEOPLE || {};
  if (D.Q8B) D.Q8B.chatTop = 100;

  // ---------------------------------------------------------------- 段
  X.stages = () => C().STAGES;
  X.last = () => C().STAGES.length - 1;
  X.capOf = (k) => C().STAGES[Math.max(0, Math.min(X.last(), k))].cap;
  X.nameOf = (k) => C().STAGES[Math.max(0, Math.min(X.last(), k))].name;
  // 好感度に合う段（上限がその値以上になる、いちばん低い段）
  X.stageFor = (a) => { const i = C().STAGES.findIndex((s) => (a || 0) <= s.cap); return i < 0 ? X.last() : i; };
  X.state = (S) => {
    S = S || G.S;
    if (!S.c14 || typeof S.c14 !== "object") S.c14 = {};
    const s = S.c14;
    s.st = s.st || {}; s.day = s.day || {}; s.told = s.told || {};
    return s;
  };
  const affRaw = (id, S) => { const a = ((S && S.aff) || {})[id]; return typeof a === "number" ? a : 0; };
  // 今の段（記録が無ければ、今の好感度と C13 の済んだ節目から決めて記録する）
  X.stage = (id, S) => {
    S = S || G.S;
    if (!S) return 0;
    const s = X.state(S);
    if (typeof s.st[id] !== "number") {
      let k = X.stageFor(affRaw(id, S));
      const done = (S.c13 && S.c13.done && S.c13.done[id]) || [];
      done.forEach((i) => { k = Math.max(k, Math.min(X.last(), i + 2)); });
      s.st[id] = k;
      s.day[id] = S.day || 0;
    }
    return s.st[id];
  };
  X.cap = (id, S) => X.capOf(X.stage(id, S));
  X.setStage = (id, k, S, quiet) => {
    S = S || G.S;
    const s = X.state(S);
    const now = X.stage(id, S);
    if (k <= now) return false;
    s.st[id] = Math.min(X.last(), k);
    s.day[id] = S.day || 0;
    if (!quiet && G.note) G.note(C().UP.replace("{n}", nameOf(id, S)).replace("{stage}", X.nameOf(s.st[id])));
    return true;
  };
  const comp = (id, S) => ((S || G.S).companions || []).find((c) => c.c2 === id || c.aff === id) || null;
  const nameOf = (id, S) => { const c = comp(id, S); const p = P()[id] || {}; return (c && G.m2Short ? G.m2Short(c) : "") || p.short || p.name || (G.f3 && G.f3.name ? G.f3.name(id) : id); };
  X.isMate = (id) => !!(P()[id] && P()[id].join);

  // ---------------------------------------------------------------- 関係の出来事（次の段へ進む条件）
  const pastSteps = (id) => ((((D.TALK || {})[id] || {}).topics) || []).filter((t) => t.kind === "past" && t.step > 0);
  X.pastMax = (id) => pastSteps(id).reduce((m, t) => Math.max(m, t.step), 0);
  X.pastHeard = (id, S) => {
    const h = ((S || G.S).tk && (S || G.S).tk.heard) || {};
    return pastSteps(id).filter((t) => h[t.id]).reduce((m, t) => Math.max(m, t.step), 0);
  };
  const q9 = (id, S) => { const q = (D.Q9 || {})[id]; const st = ((S || G.S).q9 || {})[id] || {}; return { q, n: st.n || 0, end: !!st.end, len: q ? q.steps.length : 0 }; };
  // 足りないもの（無ければ空の配列）。k は進む先の段
  X.missing = (id, k, S) => {
    S = S || G.S;
    const need = C().NEED[k];
    const out = [];
    if (!need || !X.isMate(id)) return out;
    if (need.joined && !((S.c2 && S.c2.joined && S.c2.joined[id]) || comp(id, S))) out.push("joined");
    if (need.past) { const want = Math.min(need.past, X.pastMax(id)); if (want && X.pastHeard(id, S) < want) out.push("past"); }
    if (need.q9) {
      const x = q9(id, S);
      if (x.q) {
        if (need.q9 === "end") { if (!x.end && x.n < x.len) out.push("q9end"); }
        else { const want = need.q9 === "half" ? Math.ceil(x.len / 2) : need.q9; if (x.n < want && !x.end) out.push("q9"); }
      }
    }
    return out;
  };
  X.hint = (id, k, S) => {
    const m = X.missing(id, k, S);
    return m.length ? C().HINT[m[0]].replace("{n}", nameOf(id, S)) : "";
  };
  // 上限に届いたとき、条件なしで進む段（顔見知り→知人・仲間にならない人）
  const autoUp = (id, S) => {
    const k = X.stage(id, S);
    if (k >= X.last()) return false;
    if (X.isMate(id)) {
      if (k === 0 && !X.missing(id, 1, S).length) return X.setStage(id, 1, S);
      return false;
    }
    if ((S.day || 0) - (X.state(S).day[id] || 0) >= C().OTHER_DAYS) return X.setStage(id, k + 1, S);
    return false;
  };

  // ---------------------------------------------------------------- 上限
  // 上がる分 n を、今の段の上限までに切る。上限に届いていて進める段があれば、先に進める
  X.room = (id, n, S) => {
    S = S || G.S;
    if (!S || !(n > 0)) return n;
    const a = affRaw(id, S);
    if (a + n > X.cap(id, S)) autoUp(id, S);
    const cap = X.cap(id, S);
    return Math.max(0, Math.min(n, cap - a));
  };
  // 上限に届いていれば、その段で一度だけ手がかりを知らせる
  X.told = (id, S) => { if (affRaw(id, S) >= X.cap(id, S)) told(id, S); };
  const told = (id, S) => {
    const s = X.state(S), k = X.stage(id, S);
    if (s.told[id] === k || k >= X.last() || !X.isMate(id)) return;
    s.told[id] = k;
    const h = X.hint(id, k + 1, S);
    if (h && G.note) G.note(`（${nameOf(id, S)}との仲は、今はここまで。${h}）`);
  };
  if (G.affAdd) {
    const add0 = G.affAdd;
    G.affAdd = (id, n, quiet) => {
      const S = G.S;
      if (!(n > 0) || !S || !(G.f3 && G.f3.has(id))) return add0(id, n, quiet);
      if (G.affMeet) G.affMeet(id, S);
      const k = X.room(id, n, S);
      if (k > 0) add0(id, k, quiet);
      X.told(id, S);
    };
  }
  if (G.m2Bond) {
    const bond0 = G.m2Bond;
    G.m2Bond = (c, n, quiet) => {
      const S = G.S;
      const id = c && (c.c2 || c.aff);
      if (!(n > 0) || !S || !id || !(G.f3 && G.f3.has(id))) return bond0(c, n, quiet);
      const k = X.room(id, n * 2, S) / 2; // bond の 1 は好感度の 2
      if (k > 0) bond0(c, k, quiet);
      X.told(id, S);
    };
  }
  // 出来事の結果の aff（F3）・仲間に加わったとき（それまでの好感度＋始まり）は、段を今の値に合わせるだけで切らない
  if (G.c2Join) {
    const join0 = G.c2Join;
    G.c2Join = (id) => { const r = join0(id); const S = G.S; if (r && S) { const k = X.stageFor(affRaw(id, S)); if (k > X.stage(id, S)) X.setStage(id, k, S, true); } return r; };
  }

  // ---------------------------------------------------------------- C13 の節目の褒美＝次の段へ進む出来事
  // 節目 i（0 から）は段 i+2 へ進む出来事。今の段が足りていて、関係の出来事が済んでいなければ、手がかりを添えて待つ
  const C13 = G.c13;
  if (C13 && C13.tierWhy) {
    const why0 = C13.tierWhy;
    C13.tierWhy = (id, i, S) => {
      S = S || G.S;
      const k = i + 2;
      if (X.stage(id, S) < k - 1) return `${X.nameOf(k - 1)}になってから`;
      if (X.stage(id, S) < k) { const h = X.hint(id, k, S); if (h) return h; }
      return why0(id, i, S);
    };
    const grant0 = C13.grant;
    C13.grant = (o) => {
      grant0(o);
      const k = o && o.c13;
      if (k && G.S && C13.done(k.id, k.i, G.S)) X.setStage(k.id, k.i + 2, G.S);
    };
  }

  // ---------------------------------------------------------------- 結婚は最後の段から
  const wedOk = (c, S) => { const id = c && (c.c2 || c.aff); return !id || !(G.f3 && G.f3.has(id)) || X.stage(id, S || G.S) >= C().WED; };
  X.wedOk = wedOk;
  const st = (c) => (G.m10St ? G.m10St(c) : (c && c.m10 && c.m10.st) || "");
  if (G.m10P && G.m10P.propose) {
    const propose0 = G.m10P.propose;
    G.m10P.propose = (c, S) => propose0(c, S) && wedOk(c, S);
  }
  if (G.r2Gate) {
    const gate0 = G.r2Gate;
    G.r2Gate = (tp, c, S) => {
      if (!gate0(tp, c, S)) return false;
      const meta = tp && tp.r2;
      if (meta && meta.type === "step" && meta.n === 7 && !["vow", "wed"].includes(st(c))) return wedOk(c, S || G.S);
      return true;
    };
  }
  if (G.m10Do) {
    const do0 = G.m10Do;
    G.m10Do = (kind, c, o) => {
      const S = G.S;
      const step = (kind === "vow" && st(c) === "love") || (kind === "wed" && !["vow", "wed"].includes(st(c)));
      if (step && c && S && !wedOk(c, S)) {
        G.note(C().WED_HOLD.replace("{n}", G.m2Short ? G.m2Short(c) : c.name));
        return;
      }
      return do0(kind, c, o);
    };
  }

  // ---------------------------------------------------------------- 画面：仲間と話すの添え書きに段の名
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S) return groups;
    groups.forEach((g) => (g.list || []).forEach((a) => {
      if (typeof a.id !== "string" || !a.id.startsWith("m2talk:") || typeof a.sub !== "string") return;
      const c = (S.companions || []).find((x) => x.id === a.id.slice(7));
      const id = c && (c.c2 || c.aff);
      if (id && G.f3 && G.f3.has(id)) a.sub += `・${X.nameOf(X.stage(id, S))}`;
    }));
    return groups;
  };
})(globalThis.G = globalThis.G || {});
