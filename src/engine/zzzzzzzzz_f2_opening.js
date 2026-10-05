// F2：序盤の引き（表は src/data/f2_threads.js の D.F2_THREADS）。
// 1. 因縁：冒険を始めると、目的ごとの因縁（「自分で決める」人は名前から）を一つ持つ。導入の最後の頁と、最初の町に着いた文で目に入る。
//    行動の欄のいちばん上に、因縁の名の組で今の段が出る（その段の場所にいるときだけ）。出来事の結果の f2o: <段> で進む。f2o: 9 で一区切り。
// 2. 空の場面を減らす：その段の町で「町をぶらつく」が何も起こさなかったら、因縁の気配を一行（一日一回）。
// 3. 依頼の一覧（Q7）：因縁（二段目から）と、R3 の「気になること」の続き（受けたもの）も載せる。行き先の町の名だけ出す。
// セーブに足すもの：S.f2o = { th, step, home, gday, done }。古いセーブ（S.f2o が無い）では何も出ない。乱数は使わない。DOM なし
(function (G) {
  const D = G.data;
  const F2 = (G.f2o = G.f2o || {});
  F2.DONE = 9;
  const T = () => D.F2_THREADS || {};
  const locName = (id) => (id && D.LOCS[id] ? D.LOCS[id].name : "");

  // 因縁を選ぶ。目的にあればそれ、無ければ（自分で決める）名前から（乱数を使わない。同じ人なら同じ因縁）
  F2.threadFor = (goalId, profile) => {
    const all = T();
    if (all[goalId]) return goalId;
    const keys = Object.keys(all);
    if (!keys.length) return "";
    const seed = [...String((profile && profile.name) || "")].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    return keys[seed % keys.length];
  };
  const homeOk = (home) => !!(D.F2_WILD && D.F2_WILD[home]);

  // 段の場所
  F2.locOf = (f, step) => {
    const th = T()[f.th];
    const s = th && th.steps[step - 1];
    if (!s) return "";
    if (s.at === "home") return f.home;
    if (s.at && typeof s.at === "object") return s.at[f.home] || "";
    return s.at || "";
  };
  // 今の段（終わっていれば null）
  F2.cur = (S) => {
    S = S || G.S;
    const f = S && S.f2o;
    if (!f || f.done || !T()[f.th]) return null;
    const th = T()[f.th];
    const s = th.steps[f.step - 1];
    if (!s) return null;
    return { th, step: f.step, s, loc: F2.locOf(f, f.step) };
  };
  // その場にいて選べる段
  F2.open = (S) => {
    S = S || G.S;
    const c = F2.cur(S);
    if (!c || c.loc !== S.loc || S.mode !== "explore") return null;
    const L = G.loc(S.loc);
    if (L && L.type === "dungeon") return null;
    return c;
  };

  // ---------------------------------------------------------------- 導入の最後の頁に、因縁の一節（締めの一文の前）
  if (G.cre && G.cre.prologue) {
    const basePro = G.cre.prologue;
    G.cre.prologue = (o) => {
      const pages = basePro(o);
      try {
        const g = o.goal && typeof o.goal === "object" ? o.goal.id : o.goal;
        const p = o.profile || {};
        const start = (D.CLASSES[o.cls] || {}).start;
        const th = T()[F2.threadFor(g, p)];
        if (!th || !homeOk(start) || !pages.length) return pages;
        const last = pages[pages.length - 1];
        const t = (p.origin === start ? th.pro.home : th.pro.away) || "";
        if (t) last.splice(Math.max(0, last.length - 1), 0, t);
      } catch (e) { /* 導入が組めないときは元のまま */ }
      return pages;
    };
  }

  // ---------------------------------------------------------------- 冒険の始まり
  const baseNew = G.newGame;
  G.newGame = (opt) => {
    const S = baseNew(opt);
    if (!S) return S;
    const id = F2.threadFor(S.goal && S.goal.id, S.profile);
    if (id && homeOk(S.loc)) {
      S.f2o = { th: id, step: 1, home: S.loc, gday: 0, done: 0 };
      G.say(T()[id].arrive);
    }
    return S;
  };

  // ---------------------------------------------------------------- 行動の欄
  const baseActions = G.exploreActions;
  G.exploreActions = () => {
    const groups = baseActions();
    const S = G.S;
    const c = S && F2.open(S);
    if (c) groups.unshift({ title: c.th.title, list: [{ id: "f2o:" + c.step, label: c.s.label, sub: c.th.title, kw: [] }] });
    return groups;
  };

  const baseAct = G.exploreAct;
  G.exploreAct = (head, arg, a) => {
    const S = G.S;
    if (head === "f2o") {
      const c = F2.open(S);
      if (!c || String(c.step) !== String(arg)) return;
      G.log("you", c.s.label);
      G.startEvent(c.s.ev);
      return;
    }
    const r = baseAct(head, arg, a);
    // 町をぶらついて何も起きなかったら、因縁の気配（一日一回）
    if (head === "walk" && S && S === G.S && !S.over && S.mode === "explore" && !S.event && S.f2o) {
      const c = F2.open(S);
      if (c && c.s.glimpse && S.f2o.gday !== S.day) { S.f2o.gday = S.day; G.say(c.s.glimpse); }
    }
    return r;
  };

  // 出来事の結果の f2o: <段>
  const baseApply = G.apply;
  G.apply = (o) => {
    baseApply(o);
    const S = G.S;
    if (!o || o.f2o == null || !S || S.over || !S.f2o || S.f2o.done) return;
    const f = S.f2o;
    const th = T()[f.th];
    if (!th) return;
    if (o.f2o >= F2.DONE || o.f2o > th.steps.length) {
      f.done = S.day || 1;
      G.note(`「${th.title}」はひと区切りついた。`);
      return;
    }
    const was = f.step;
    f.step = o.f2o;
    const to = F2.locOf(f, f.step);
    if (f.step === was || !to) return;
    if (to !== S.loc) { G.note(`「${th.title}」の行き先：${locName(to)}`); return; }
    // 同じ町で次の段へ：次の段の気配をすぐに見せる（次の行動の名に出てくる人や場所が、先に目に入るように）
    const s = th.steps[f.step - 1];
    if (s && s.glimpse) { G.say(s.glimpse); f.gday = S.day; }
  };

  // ---------------------------------------------------------------- 依頼の一覧（Q7）
  if (G.q7 && G.q7.list) {
    const baseList = G.q7.list;
    G.q7.list = (S) => {
      S = S || G.S;
      const out = baseList(S);
      if (!S) return out;
      const c = F2.cur(S);
      if (c && c.step >= 2) {
        out.unshift({
          key: "f2o:" + S.f2o.th, src: "f2o", kind: c.th.kind, title: c.th.title, client: c.th.client, from: locName(S.f2o.home),
          state: "active", stateLabel: G.q7.STATE.active, desc: [c.s.hint, c.loc ? `行き先：${locName(c.loc)}` : ""].filter(Boolean),
          progress: "", reward: "", deadline: null, report: null,
        });
      }
      // R3 の続き（受けた頼みごと・確かめに行く噂）
      const r = S.r3;
      if (r && r.follow && G.r3 && G.r3.followLoc) {
        Object.keys(r.follow).forEach((id) => {
          const f = (D.R3_FOLLOW || {})[id];
          if (!f) return;
          const to = G.r3.followLoc(r, id);
          out.push({
            key: "r3:" + id, src: "r3", kind: "気になること", title: f.sub || f.label, client: "町の人", from: locName(r.home),
            state: "active", stateLabel: G.q7.STATE.active, desc: [f.label, to ? `行き先：${locName(to)}` : ""].filter(Boolean),
            progress: "", reward: "", deadline: null, report: null,
          });
        });
      }
      return out;
    };
    const baseFin = G.q7.finished;
    G.q7.finished = (S) => {
      S = S || G.S;
      const out = baseFin(S);
      const th = S && S.f2o && S.f2o.done && T()[S.f2o.th];
      if (th) {
        out.push({ src: "f2o", title: th.title, day: S.f2o.done, date: G.dateOf ? G.dateOf(S.f2o.done) : "", result: "ひと区切り", failed: false });
        out.sort((a, b) => b.day - a.day);
      }
      return out;
    };
  }
})(globalThis.G = globalThis.G || {});
