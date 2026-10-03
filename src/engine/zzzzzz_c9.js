// C9：仲間の頼みごと（その人の身の上と結びついた、個人の続き物）。DOM には触らない。
// データは src/data/quest_c9_*.js（D.Q9[人の id]）。書き方は docs/quests.md。
// 名前の頭の zzzzzz_c9 は、zzzzz_talk.js（G.tk）・zzzzzz_banter2.js・zz_f2_codex.js・ending_m6.js より後に読ませて包むため。
//
// 流れ：信頼が上がると、その人が「話す」の一覧で頼みごとの段を切り出す（話題。返せば段が開く）
//   → 行き先に、その人を連れて行くと、行動の「頼みごと」の欄に段が出る → 出来事（解き方 2〜3 と判定なし。戦い・ほかの仲間の選択肢）
//   → 最後の段の選び方で結末が決まる → その人が変わる（ひとこと・声のかけ方・話題・掛け合い・能力・人生の物語の一行）。図鑑に結末が残る。
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.q9State が埋める）
//   S.q9 = { 人の id: { n 済んだ段の数, day 最後の段を済ませた日, r [段ごとの結果の key], end 結末の key } }
// 冒険をまたいで残るもの（G.P）：G.P.q9 = { 人の id: { 結末の key: { by, date, at } } }（図鑑の人物の頁に出る）
// 乱数は使わない（G.rand の並びを変えない。判定と戦いは出来事の仕組みのまま）。
// レーン C（C9）
(function (G) {
  const D = G.data;
  const TK = G.tk || {};
  const Q = () => D.Q9 || {};
  const P = () => D.C2_PEOPLE || {};
  const lines = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const C9 = (G.q9 = G.q9 || {});
  C9.MIN = [10, 25, 40, 55, 65]; // 段ごとの好感度の既定（F3 の −100〜+100）
  C9.STAGE_AFF = 6; // 段を済ませたときの好感度の既定
  C9.END_AFF = 12; // 結末のときの好感度の既定
  C9.MATE_REL = 4;
  C9.PAST_STEP = 2; // 最初の段が開くのに聞いておく身の上の段 // ほかの仲間の選択肢を選んだときの、二人の間柄の動きの既定

  // ---------------------------------------------------------------- 状態
  G.q9State = (S) => {
    S = S || G.S;
    if (!S) return {};
    if (!S.q9 || typeof S.q9 !== "object") S.q9 = {};
    return S.q9;
  };
  C9.of = (id, S) => {
    const all = G.q9State(S);
    const st = all[id] || (all[id] = { n: 0, day: 0, r: [], end: "" });
    st.r = st.r || [];
    st.n = st.n || 0;
    return st;
  };
  C9.end = (id, S) => { const s = (S || G.S) && G.q9State(S)[id]; return (s && s.end) || ""; };
  G.q9End = C9.end;
  C9.endData = (id, S) => { const k = C9.end(id, S); const q = Q()[id]; return (k && q && q.ends && q.ends[k]) || null; };
  const comp = (id, S) => ((S || G.S || {}).companions || []).find((c) => c.c2 === id) || null;
  const short = (c) => (G.m2Short ? G.m2Short(c) : (c && c.name) || "");
  const nameOf = (id, S) => { const c = comp(id, S); return c ? short(c) : (P()[id] || {}).short || (P()[id] || {}).name || id; };
  const aff = (c) => (TK.aff ? TK.aff(c) : Math.round((c.bond || 0) * 2 - 100));
  C9.topicId = (id, i) => `q9_${id}_${i + 1}`;
  C9.eventId = (id, i) => `q9_${id}_${i + 1}`;
  const heard = (S, tid) => !!(S && S.tk && S.tk.heard && S.tk.heard[tid]);
  // 文の差し込み：{n} 頼んだ人・{m} その段のほかの仲間・{you} 主人公の名前
  C9.fill = (s, id, i, S) => {
    if (typeof s !== "string") return s;
    S = S || G.S;
    const st = (Q()[id] && Q()[id].steps[i]) || {};
    return s.replace(/\{(n|m|you)\}/g, (all, k) => {
      if (k === "n") return nameOf(id, S);
      if (k === "m") return st.mate ? nameOf(st.mate, S) : "仲間";
      return (S && S.profile && S.profile.name) || "あなた";
    });
  };
  const fillAll = (v, id, i) => (Array.isArray(v) ? v.map((x) => C9.fill(x, id, i)) : C9.fill(v, id, i));

  // 段 i を頼める（話題に出せる）か
  C9.canAsk = (id, i, S, c) => {
    S = S || G.S;
    const q = Q()[id];
    if (!q || !S) return false;
    const st = C9.of(id, S);
    if (st.end || st.n !== i || !q.steps[i]) return false;
    if (i > 0 && S.day <= (st.day || 0)) return false; // 前の段を済ませた日のうちには、次を頼まない
    c = c || comp(id, S);
    if (!c) return false;
    // 最初の段は、その人が身の上を二段目まで話してから（打ち明けてから頼む）
    if (i === 0) {
      const past = ((D.TALK || {})[id] || {}).topics || [];
      if (past.some((t) => t.kind === "past") && !past.some((t) => t.kind === "past" && (t.step || 0) >= C9.PAST_STEP && heard(S, t.id))) return false;
    }
    const min = q.steps[i].min !== undefined ? q.steps[i].min : C9.MIN[Math.min(i, C9.MIN.length - 1)];
    return aff(c) >= min;
  };
  // 今、行き先で始められる段（頼まれて、まだ済んでいない）
  C9.open = (id, S) => {
    S = S || G.S;
    const q = Q()[id];
    if (!q || !S) return -1;
    const st = C9.of(id, S);
    if (st.end || st.n >= q.steps.length) return -1;
    return heard(S, C9.topicId(id, st.n)) ? st.n : -1;
  };
  C9.here = (S) => {
    S = S || G.S;
    if (!S || S.over || S.travel || S.mode !== "explore" || S.combat) return [];
    return (S.companions || []).filter((c) => c.c2 && Q()[c.c2]).map((c) => {
      const i = C9.open(c.c2, S);
      if (i < 0) return null;
      const st = Q()[c.c2].steps[i];
      return lines(st.at).includes(S.loc) ? { id: c.c2, i, c, st } : null;
    }).filter(Boolean);
  };

  // ---------------------------------------------------------------- 話題（頼まれる）
  // D.TALK[id].topics に段ごとの話題を足す（kind: "ask"。q9: true の印で、ふつうの並びからは外し、頼めるときに一覧の後ろの話題と入れ替える）
  // 表情は、だれの絵にもある喜怒哀楽だけ（ほかは文から推す）
  const MOODS = ["joy", "anger", "sorrow", "fun"];
  const moodOk = (m) => (MOODS.includes(m) ? m : undefined);
  const placeName = (at) => lines(at).map((l) => (D.LOCS[l] ? D.LOCS[l].name : l)).join("か");
  const addTopics = () => {
    const T = D.TALK || {};
    Object.entries(Q()).forEach(([id, q]) => {
      const p = T[id];
      if (!p) return;
      p.topics = p.topics || [];
      q.steps.forEach((st, i) => {
        const tid = C9.topicId(id, i);
        if (p.topics.some((t) => t.id === tid)) return;
        const a = st.ask || {};
        const replies = (a.replies && a.replies.length ? a.replies : [
          { tone: "earnest", label: "引き受ける", text: "{n}は、小さくうなずいた。", aff: 3 },
          { tone: "quiet", label: "黙ってうなずく", text: "{n}は、それで十分だという顔をした。", aff: 2 },
        ]).map((r) => Object.assign({ aff: r.aff !== undefined ? r.aff : 2 }, r, { memo: r.memo || `${P()[id].short || P()[id].name}の頼み（${q.title}）：${placeName(st.at)}へ。${st.title}` }));
        p.topics.push({
          id: tid, kind: "ask", q9: true, title: a.title || `${q.title}（${i + 1}）`, text: a.text || "……", mood: moodOk(a.mood), replies,
          min: -19, when: (S, c) => C9.canAsk(id, i, S, c),
        });
      });
      // 結末のあとの話題（身の上の続き）
      Object.entries(q.ends || {}).forEach(([k, e]) => {
        lines(e.topics || (e.topic ? [e.topic] : [])).forEach((t, j) => {
          const tid = `q9_${id}_e_${k}${j ? "_" + j : ""}`;
          if (p.topics.some((x) => x.id === tid)) return;
          p.topics.push(Object.assign({ kind: "past", step: 0, min: 10 }, t, { mood: moodOk(t.mood), id: tid, q9end: k, when: (S) => C9.end(id, S) === k }));
        });
      });
    });
    // 結末のあとの掛け合い
    const B = (D.TALK_BANTER = D.TALK_BANTER || []);
    Object.entries(Q()).forEach(([id, q]) => Object.entries(q.ends || {}).forEach(([k, e]) => lines(e.banter).forEach((b, j) => {
      const bid = `bt_q9_${id}_${k}${j ? "_" + j : ""}`;
      if (B.some((x) => x.id === bid)) return;
      B.push(Object.assign({ where: ["any", "road", "camp", "inn"] }, b, { id: bid, a: id, when: (S) => C9.end(id, S) === k && (!b.when || b.when(S)) }));
    })));
  };

  if (TK.pickMenu) {
    const topics0 = G.tkTopics;
    G.tkTopics = (c, S, opt) => (topics0(c, S, opt) || []).filter((tp) => !tp.q9);
    const pick0 = TK.pickMenu;
    TK.pickMenu = (c, S) => {
      const out = pick0(c, S);
      S = S || G.S;
      const id = c && c.c2;
      if (!id || !Q()[id] || aff(c) <= -20) return out;
      const st = C9.of(id, S);
      const tp = TK.topic(C9.topicId(id, st.n));
      // 一覧の数は変えない（いちばん後ろの話題と入れ替える。ランダムに遊ぶボットの選び方の並びを揺らしにくい）
      // 恋の筋（zzzzzz_romance2.js）が頭に足して五つに切っても残るように、五つあるときは後ろから二つ目と入れ替える
      if (tp && TK.can(tp, c, S)) { if (out.length >= 5) out[out.length - 2] = tp; else if (out.length >= 3) out[out.length - 1] = tp; else out.push(tp); }
      return out;
    };
  }

  // ---------------------------------------------------------------- 出来事（行き先で）
  const whoOf = (st, id) => {
    const w = st.who;
    if (typeof w === "string" && P()[w]) return Object.assign({}, P()[w].who, { name: P()[w].name });
    if (typeof w === "string" && D.ENEMIES[w]) return { kind: "foe", foe: w, name: D.ENEMIES[w].name };
    if (w && typeof w === "object") {
      if (w.foe) return { kind: "foe", foe: w.foe, name: w.name || (D.ENEMIES[w.foe] || {}).name };
      return Object.assign({ kind: "villager", sex: "男", age: 40, seed: `q9:${id}:${w.name || ""}` }, w);
    }
    return null;
  };
  // 結果に q9 の印を付ける（済ませる段・結末）
  const mark = (o, id, i, key, last, rel) => {
    if (!o) return o;
    const r = Object.assign({}, o);
    if (r.win) r.win = mark(r.win, id, i, key, last, rel);
    if (r.fight) return r; // 戦いの結果は win のほうで
    if (r.next) return r;
    r.q9 = { id, i, key: r.key || key, end: last ? r.end : undefined, rel: r.rel !== undefined ? r.rel : rel };
    return r;
  };
  const buildEvents = () => {
    Object.entries(Q()).forEach(([id, q]) => q.steps.forEach((st, i) => {
      const eid = C9.eventId(id, i);
      if (D.EVENTS.some((e) => e.id === eid)) return;
      const last = i === q.steps.length - 1;
      const raw = (st.choices || []).map((c, ci) => {
        const x = Object.assign({}, c);
        const rel = c.mate ? (c.rel !== undefined ? c.rel : C9.MATE_REL) : undefined;
        x.ok = mark(c.ok, id, i, "c" + ci, last, rel);
        if (c.ng) x.ng = mark(c.ng, id, i, "c" + ci + "ng", last, rel);
        if (c.win) x.win = mark(c.win, id, i, "c" + ci, last, rel);
        if (c.mate) { const m = st.mate; x.cond = (S) => !!comp(m, S) && (!c.cond || c.cond(S)); }
        return x;
      });
      const e = { id: eid, where: [], w: 0, q9: { id, i }, mood: moodOk(st.mood) };
      if (typeof st.who === "string" && P()[st.who]) e.c2 = st.who;
      Object.defineProperty(e, "title", { get: () => C9.fill(st.title || q.title, id, i), enumerable: true });
      Object.defineProperty(e, "text", { get: () => {
        const S = G.S;
        let t = lines(st.text).join("");
        if (st.mate && comp(st.mate, S) && st.mateText) t += lines(st.mateText).join("");
        return C9.fill(t, id, i, S);
      }, enumerable: true });
      Object.defineProperty(e, "who", { get: () => whoOf(st, id), enumerable: true });
      Object.defineProperty(e, "choices", { get: () => raw.map((c) => Object.assign({}, c, { label: C9.fill(c.label, id, i) })), enumerable: true });
      D.EVENTS.push(e);
    }));
  };

  // ---------------------------------------------------------------- 行動の欄
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const list = C9.here(G.S);
    if (list.length) groups.push({ title: "頼みごと", list: list.map(({ id, i, c, st }) => ({
      id: `q9:${id}`, label: `${short(c)}の頼み：${C9.fill(st.title || Q()[id].title, id, i)}`, sub: `${Q()[id].title}・${i + 1}／${Q()[id].steps.length}`, kw: ["頼", short(c)],
    })) });
    return groups;
  };
  const act0 = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    if (head !== "q9") return act0(head, arg, a);
    const S = G.S;
    const it = C9.here(S).find((x) => x.id === arg);
    if (!it) return;
    G.log("you", `${short(it.c)}の頼みに付き合う`);
    G.pass(1);
    if (G.m2State) G.m2State(S).force = it.c.id;
    G.startEvent(C9.eventId(it.id, it.i));
  };

  // ---------------------------------------------------------------- 結果の当てはめ
  const apply0 = G.apply;
  G.apply = (o) => {
    if (!o || !o.q9 || !G.S) return apply0(o);
    const S = G.S;
    const { id, i, key, end, rel } = o.q9;
    const q = Q()[id];
    const st = q && q.steps[i];
    const c = comp(id, S);
    const o2 = Object.assign({}, o);
    delete o2.q9;
    delete o2.rel;
    delete o2.end;
    delete o2.key;
    if (o2.text) o2.text = fillAll(o2.text, id, i);
    if (Array.isArray(o2.text)) o2.text = o2.text.join("");
    if (o2.memo) o2.memo = C9.fill(o2.memo, id, i);
    // 段を済ませる（好感度は書いてあればその数、無ければ既定）
    if (!o2.aff && c) o2.aff = { [id]: C9.STAGE_AFF };
    apply0(o2);
    if (S.over || !q) return;
    const s = C9.of(id, S);
    if (s.n === i && !s.end) {
      s.n = i + 1;
      s.day = S.day;
      s.r[i] = key || "";
      if (rel && st && st.mate && comp(st.mate, S) && TK.relAdd) TK.relAdd(id, st.mate, rel, S); // ほかの仲間と、二人の間柄が動く（K7）
      if (i === q.steps.length - 1) C9.finish(id, end || Object.keys(q.ends || {})[0], S);
      else G.note(`（${nameOf(id, S)}の頼みごと「${q.title}」：${i + 1}／${q.steps.length}）`);
    }
  };

  // 結末：その人が変わる
  C9.finish = (id, k, S) => {
    S = S || G.S;
    const q = Q()[id];
    const e = q && q.ends && q.ends[k];
    if (!e) return false;
    const s = C9.of(id, S);
    s.end = k;
    s.n = q.steps.length;
    const c = comp(id, S);
    if (e.text) G.say(C9.fill(lines(e.text).join(""), id, q.steps.length - 1, S));
    if (c) {
      if (e.power) { c.power = Math.max(10, Math.min(99, (c.power || 0) + e.power)); }
      if (e.dmg) c.dmg = (c.dmg || 0) + e.dmg;
      if (e.heal) c.heal = true;
      if (e.fire) c.fire = true;
      if (e.t && c.m8 && c.m8.t) Object.entries(e.t).forEach(([sk, n]) => { c.m8.t[sk] = Math.max(0, Math.min(3, (c.m8.t[sk] || 0) + n)); });
      if (e.desc) c.desc = e.desc;
      if (G.affAdd) G.affAdd(id, e.aff !== undefined ? e.aff : C9.END_AFF);
      const ch = [e.power ? `力 ${G.sign ? G.sign(e.power) : e.power}` : "", e.dmg ? "一撃が重くなった" : "", e.heal ? "手当てを覚えた" : "", e.t ? "才が伸びた" : ""].filter(Boolean);
      if (ch.length) G.note(`${short(c)}が変わった（${ch.join("・")}）`);
    }
    if (e.memo) G.memo(C9.fill(e.memo, id, 0, S));
    G.note(`（${nameOf(id, S)}の頼みごと「${q.title}」の結末：${e.name}）`);
    if (G.chron) G.chron(`${nameOf(id, S)}の頼みごと「${q.title}」：${e.name}`, "event");
    C9.record(id, k);
    return true;
  };
  // 図鑑（冒険をまたいで残る）
  C9.record = (id, k) => {
    if (!G.P) return;
    const all = G.P.q9 || (G.P.q9 = {});
    const m = all[id] || (all[id] = {});
    if (m[k]) return;
    const S = G.S;
    m[k] = { by: S && S.profile ? `${S.clsName || ""} ${S.profile.name || ""}`.trim() : "", date: S && G.dateOf ? G.dateOf(S.day) : "", at: Date.now() };
    if (G.onProfile) try { G.onProfile(); } catch (err) { /* 保存は画面の仕事 */ }
  };
  C9.seen = (id) => Object.keys(((G.P && G.P.q9) || {})[id] || {});
  if (G.codexPersonLines) {
    const lines0 = G.codexPersonLines;
    G.codexPersonLines = (id) => {
      const out = lines0(id);
      const q = Q()[id];
      if (!q) return out;
      const seen = C9.seen(id);
      const all = Object.keys(q.ends || {});
      if (!seen.length) return out;
      const rec = G.P.q9[id];
      const got = all.filter((k) => seen.includes(k)).map((k) => `頼みごと「${q.title}」の結末：${q.ends[k].name}。${q.ends[k].codex || ""}（${rec[k].by || "誰か"}が見た）`);
      return out.concat(got, all.length > got.length ? [`（結末 ${got.length}／${all.length}。ほかの結末は、まだ見ていない）`] : []);
    };
  }

  // ---------------------------------------------------------------- その人が変わる（ひとこと・声のかけ方）
  if (G.m2Trait) {
    const trait0 = G.m2Trait;
    G.m2Trait = (c) => {
      const t = trait0(c);
      const e = c && c.c2 && G.S && C9.endData(c.c2);
      return e && e.talk ? Object.assign({}, t, { talk: lines(e.talk) }) : t;
    };
  }
  if (TK.data) {
    const data0 = TK.data;
    TK.data = (c) => {
      const p = data0(c);
      const e = p && c && c.c2 && G.S && C9.endData(c.c2);
      if (!e || !e.greet) return p;
      const g = Object.assign({}, p.greet || {});
      g.warm = lines(e.greet);
      g.mid = lines(e.greet);
      return Object.assign({}, p, { greet: g });
    };
  }

  // ---------------------------------------------------------------- 人生の物語（M6）の一行
  if (G.m6Compose) {
    const compose0 = G.m6Compose;
    G.m6Compose = (S) => {
      const r = compose0(S);
      if (!r || !r.life || !r.life.length || !S || !S.q9) return r;
      try {
        const hero = (S.profile && S.profile.name) || "その人";
        const inParty = new Set((S.companions || []).map((c) => c.c2).filter(Boolean));
        const ids = Object.keys(S.q9).filter((id) => S.q9[id] && S.q9[id].end && C9.endData(id, S)).sort((a, b) => (inParty.has(b) ? 1 : 0) - (inParty.has(a) ? 1 : 0)).slice(0, 2);
        ids.forEach((id) => {
          const e = C9.endData(id, S);
          if (!e.line) return;
          const t = String(e.line).replace(/\{name\}/g, hero).replace(/\{who\}/g, (P()[id] || {}).short || (P()[id] || {}).name || id);
          r.life[Math.max(0, r.life.length - 2)] += t;
        });
      } catch (err) { /* 一行なしでも物語は出る */ }
      return r;
    };
  }

  addTopics();
  buildEvents();
})(globalThis.G = globalThis.G || {});
