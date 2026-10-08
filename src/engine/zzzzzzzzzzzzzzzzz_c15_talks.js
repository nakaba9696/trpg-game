// C15：段ごとの深い話と、仲間にならない人の段の出来事（持ち主「後の段ほど深い話に。顔見知り＝表の顔、知人＝暮らしと好み、友＝過去の一端、
// 深い仲＝誰にも言っていない悩みや傷、かけがえのない人＝その人の核心」「仲間にならない人も、関係の出来事をこなすと次の段」）。
// 段の仕組みは C14（src/engine/zzzzzzzzzzzzzzzz_c14_stages.js）。ここは段へ進むための出来事を足す。
//
// 仲間になる人：D.C15_TALK[id][k]（k＝今の段 0〜4）＝ { title, text: [行], replies: [{ tone, label, text, ... }] }（会話〔zzzzz_talk.js〕の話題と同じ形）
//   その段で好感度が上限に届くと、話題の一覧のいちばん上に出る（かけがえのない人の話は、その段に入れば出る）。聞き終えると次の段の条件の一つ（C14 の NEED.talk）
//   深い話がまだ書かれていない人は、C14 が今までどおり身の上話（past）を見る
// 仲間にならない名のある人：その人に会った場所（今の冒険で好感度が動いた場所・図鑑の会った場所）で、上限に届くと行動の欄に「〇〇を訪ねる」。
//   出来事は段ごとの共通の型（D.C15_VISIT[k]）に、その人の呼び名・役・図鑑の一行を差し込む。済ませると次の段（日数だけでは進まない）
// セーブに足すもの：S.c15 = { at { 人: [場所] }, visit { 人: [済ませた段] } }。古いセーブで無くても動く。
// 乱数は使わない（型の選び方は人の id から決める）。DOM には触らない。名前の頭の z の数は C14（16 個）より後に読ませるため。レーン C＋V（C15）
(function (G) {
  const D = G.data;
  const X = (G.c15 = G.c15 || {});
  const TALK = () => D.C15_TALK || {};
  const P = () => D.C2_PEOPLE || {};
  const Q = () => D.F2_PEOPLE || {};
  const C14 = () => G.c14;
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (Math.imul(31, h) + ch.codePointAt(0)) | 0; return Math.abs(h); };

  X.state = (S) => {
    S = S || G.S;
    if (!S.c15 || typeof S.c15 !== "object") S.c15 = {};
    S.c15.at = S.c15.at || {}; S.c15.visit = S.c15.visit || {};
    return S.c15;
  };

  // ---------------------------------------------------------------- 仲間になる人の深い話
  X.topicId = (id, k) => `c15_${id}_${k}`;
  X.hasTalk = (id) => !!(TALK()[id] && Object.keys(TALK()[id]).length);
  X.heard = (id, k, S) => { S = S || G.S; return !!(S && S.tk && S.tk.heard && S.tk.heard[X.topicId(id, k)]); };
  const at = (id, k) => C14() ? C14().capOf(k) : [10, 30, 55, 80, 100][k];
  // 話題の表へ足す（会話の仕組みが読む D.TALK[id].topics）
  X.build = () => {
    Object.entries(TALK()).forEach(([id, stages]) => {
      const T = (D.TALK = D.TALK || {});
      const p = T[id];
      if (!p) return;
      p.topics = p.topics || [];
      Object.entries(stages).forEach(([ks, t]) => {
        const k = Number(ks), tid = X.topicId(id, k);
        if (p.topics.some((x) => x.id === tid)) return;
        p.topics.push(Object.assign({}, t, {
          id: tid, kind: "chat", c15: k, min: -19,
          // その段にいて、上限に届いている（最後の段は入れば）。前の段の話を聞いていること
          when: (S, c) => {
            const st = C14() ? C14().stage(id, S) : 0;
            if (st !== k) return false;
            if (k < 4 && (G.affOf ? G.affOf(id, S) : 0) < at(id, k)) return false;
            return k === 0 || X.heard(id, k - 1, S) || !(TALK()[id] || {})[k - 1];
          },
        }));
      });
    });
  };
  X.build();
  // その人の今の段の深い話（出せるなら）
  X.sceneFor = (c, S) => {
    const id = c && c.c2;
    if (!id || !TALK()[id] || !G.tk || !G.tk.can) return null;
    const p = (D.TALK || {})[id];
    const tps = ((p && p.topics) || []).filter((t) => t.c15 != null);
    return tps.find((t) => G.tk.can(t, c, S)) || null;
  };
  if (G.tk && G.tk.pickMenu) {
    const pick0 = G.tk.pickMenu;
    G.tk.pickMenu = (c, S) => {
      const out = pick0(c, S);
      const sc = X.sceneFor(c, S);
      if (!sc) return out;
      return [sc].concat(out.filter((x) => x !== sc && x.id !== sc.id)).slice(0, 5);
    };
  }
  // 深い話を聞き終えたら、進める段は進める（顔見知り→知人。友から先は C13 の節目の出来事で）
  if (G.tk && G.tk.reply) {
    const reply0 = G.tk.reply;
    G.tk.reply = (i) => {
      const S = G.S;
      const k = S && S.tk && S.tk.cur;
      const tp = k && k.topic && G.tk.topic(k.topic);
      const r = reply0(i);
      if (tp && tp.c15 != null && C14() && C14().autoUp) C14().autoUp(tp.who, G.S);
      return r;
    };
  }

  // ---------------------------------------------------------------- 仲間にならない人の段の出来事
  const isOther = (id) => !!Q()[id] && !(P()[id] && P()[id].join);
  X.visitDone = (id, k, S) => (X.state(S).visit[id] || []).includes(k);
  // 会える場所：今の冒険で好感度が動いた場所 → 図鑑の会った場所
  X.places = (id, S) => {
    S = S || G.S;
    const out = (X.state(S).at[id] || []).slice();
    const rec = G.codexPerson ? G.codexPerson(id) : null;
    Object.keys((rec && rec.places) || {}).forEach((l) => { if (!out.includes(l)) out.push(l); });
    Object.keys((rec && rec.seen) || {}).forEach((k) => { const l = k.split("|")[0]; if (!out.includes(l)) out.push(l); });
    return out.filter((l) => D.LOCS[l]);
  };
  X.whereName = (id, S) => { const l = X.places(id, S)[0]; return l ? D.LOCS[l].name : ""; };
  const note = (id, S) => {
    if (!S || !S.loc || !isOther(id)) return;
    const a = (X.state(S).at[id] = X.state(S).at[id] || []);
    if (!a.includes(S.loc)) a.push(S.loc);
  };
  if (G.affAdd) { const add0 = G.affAdd; G.affAdd = (id, n, quiet) => { note(id, G.S); return add0(id, n, quiet); }; }
  if (G.affMeet) { const meet0 = G.affMeet; G.affMeet = (id, S) => { note(id, S || G.S); return meet0(id, S); }; }
  // 今ここで訪ねられる段（無ければ null）
  X.visitHere = (id, S) => {
    S = S || G.S;
    if (!C14() || !isOther(id) || !G.affKnown || !G.affKnown(id, S)) return null;
    const k = C14().stage(id, S);
    if (k >= C14().last() || X.visitDone(id, k, S)) return null;
    if ((G.affOf(id, S) || 0) < C14().capOf(k)) return null;
    const places = X.places(id, S);
    if (places.length && !places.includes(S.loc)) return null;
    if (!places.length && G.loc().type !== "town") return null;
    return k;
  };
  const nm = (id) => (G.f3 && G.f3.name ? G.f3.name(id) : id);
  const title = (id) => (Q()[id] && Q()[id].title) || "";
  const line = (id) => ((Q()[id] && Q()[id].lines) || [])[0] || "";
  X.fill = (s, id) => String(s).replace(/\{who\}/g, nm(id)).replace(/\{title\}/g, title(id)).replace(/\{line\}/g, line(id));
  // その人の顔（図鑑の顔と同じ決め方：C2 の顔 → その人の出来事の顔 → 町の人）
  X.who = (id) => {
    const p = P()[id];
    if (p && p.who) return Object.assign({}, p.who, { name: p.name });
    const q = Q()[id] || {};
    const e = (q.events || []).map((x) => (D.EVENTS || []).find((y) => y.id === x)).find((y) => y && y.who);
    const base = e && typeof e.who === "object" ? e.who : { kind: (e && e.who) || "villager" };
    return Object.assign({}, base, { seed: "v4:" + id, name: nm(id) });
  };
  // 出来事（段ごとに一つ。型は人の id で選ぶ）
  X.evId = (k) => `c15_visit_${k}`;
  const curVisit = () => (G.S && G.S.c15 && G.S.c15.cur) || null;
  X.tpl = (id, k) => { const list = (D.C15_VISIT || {})[k] || []; return list.length ? list[hash(id + ":" + k) % list.length] : null; };
  X.buildVisit = () => {
    const have = new Set((D.EVENTS || []).map((e) => e.id));
    Object.keys(D.C15_VISIT || {}).forEach((ks) => {
      const k = Number(ks), eid = X.evId(k);
      if (have.has(eid)) return;
      const e = { id: eid, where: [], w: 0, c15visit: k };
      const cur = () => { const v = curVisit(); return v ? { id: v.id, t: X.tpl(v.id, k) } : null; };
      Object.defineProperty(e, "title", { get: () => { const v = cur(); return v && v.t ? X.fill(v.t.title, v.id) : "再会"; }, enumerable: true });
      Object.defineProperty(e, "text", { get: () => { const v = cur(); return v && v.t ? X.fill(v.t.text, v.id) : ""; }, enumerable: true });
      Object.defineProperty(e, "choices", { get: () => {
        const v = cur();
        if (!v || !v.t) return [{ label: "立ち去る", ok: { text: "" } }];
        return v.t.choices.map((ch) => ({ label: X.fill(ch.label, v.id), ok: { text: X.fill(ch.text, v.id), c15visit: { id: v.id, k } } }));
      }, enumerable: true });
      Object.defineProperty(e, "who", { get: () => { const v = curVisit(); return v ? X.who(v.id) : null; }, enumerable: true });
      D.EVENTS.push(e);
    });
  };
  X.buildVisit();
  const apply0 = G.apply;
  G.apply = (o) => {
    apply0(o);
    const S = G.S;
    if (!o || !o.c15visit || !S || S.over) return;
    const { id, k } = o.c15visit;
    const v = (X.state(S).visit[id] = X.state(S).visit[id] || []);
    if (!v.includes(k)) v.push(k);
    S.c15.cur = null;
    if (C14()) C14().autoUp(id, S);
    if (G.chron && k >= 2) G.chron(`${nm(id)}と、${C14() ? C14().nameOf(C14().stage(id, S)) : "親しい仲"}になる`, "comp");
  };
  // 行動の欄
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S || S.travel || S.combat || S.mode !== "explore") return groups;
    const list = [];
    Object.keys(Q()).forEach((id) => {
      const k = X.visitHere(id, S);
      if (k == null || !X.tpl(id, k)) return;
      list.push({ id: `c15v:${id}`, label: `${nm(id)}を訪ねる`, sub: title(id), kw: ["訪", nm(id)] });
    });
    if (list.length) groups.push({ title: "顔なじみの人", list: list.slice(0, 4) });
    return groups;
  };
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "c15v") return act0(head, arg, a);
    const S = G.S;
    const k = X.visitHere(arg, S);
    if (k == null) return;
    X.state(S).cur = { id: arg, k };
    G.log("you", `${nm(arg)}を訪ねる`);
    G.startEvent(X.evId(k));
  };
})(globalThis.G = globalThis.G || {});
