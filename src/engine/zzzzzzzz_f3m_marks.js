// F3：能力値の節目（データは src/data/f3m_marks.js）。能力値が節目に届くと名がつき（「剛力」など）、記録に残り、
// 出来事と町の施設に、その腕前でしかできない選択肢が現れる。まだ届いていない節目の選択肢は、一つだけうっすら見せる（次の目当て）。
// 選択肢の条件は、その能力値の今の点（装備の補正も入る：力の指輪で剛力に届けば、剛力の選択肢が開く）。
// 見せ方は C10（src/engine/zzzzzzzz_c10.js）にならうが、印は c10 ではなく f3m（C10 の「平らな状態」の確かめとは別に数える）。
// セーブに足す項目（古いセーブで無くても動く）：S.f3m = { marks { "筋力:1": 届いた日（はじめから届いていたものは 0） }, fac { day, used { 施設: 1 } } }
// 名前の頭の zzzzzzzz_f3m は C10 のあとに読ませるため。DOM には触らない。レーン C＋V（F3）
(function (G) {
  const D = G.data;
  const F3 = D.F3M;
  const API = (G.f3m = G.f3m || {});
  if (!F3) return;

  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

  // ---------------------------------------------------------------- 節目
  API.need = (tier) => F3.TIERS[tier];
  API.mark = (k, tier) => (F3.MARKS[k] || [])[tier] || null;
  // 今の点（装備の補正も入る）。G.S でない状態（テストの仮の状態）は素の点
  API.val = (S, k) => {
    S = S || G.S;
    if (!S || !S.stats) return 0;
    if (S === G.S && G.statEff) { const v = G.statEff(k); return Number.isFinite(v) ? Math.floor(v + 1e-9) : S.stats[k] || 0; }
    return S.stats[k] || 0;
  };
  API.has = (S, k, tier) => API.val(S, k) >= API.need(tier);
  // 素の点で届いている節目の段（-1 は一つも無い）
  const tierOf = (v) => { let t = -1; F3.TIERS.forEach((n, i) => { if (v >= n) t = i; }); return t; };

  // 節目の記録（古いセーブ・はじめから届いていた節目は、知らせずに記録だけ）
  API.state = (S) => {
    S = S || G.S;
    if (!S.f3m) {
      S.f3m = { marks: {}, fac: null };
      D.STATS.forEach((k) => { for (let t = 0; t <= tierOf((S.stats || {})[k] || 0); t++) S.f3m.marks[`${k}:${t}`] = 0; });
    }
    S.f3m.marks = S.f3m.marks || {};
    return S.f3m;
  };

  // 能力値が伸びて節目を越えたら知らせる
  const grow0 = G.grow;
  G.grow = (k, n) => {
    const S = G.S;
    if (S && S.stats && !S.over) API.state(S);
    const r = grow0(k, n);
    if (!S || !S.f3m || !Array.isArray(r) || !(r[1] > r[0])) return r;
    for (let t = 0; t < F3.TIERS.length; t++) {
      const key = `${k}:${t}`;
      if (r[1] < F3.TIERS[t] || key in S.f3m.marks) continue;
      S.f3m.marks[key] = S.day || 1;
      const m = API.mark(k, t);
      if (!m) continue;
      G.log("grow", `節目「${m.name}」：${m.gain}。`, { f3m: key });
      if (G.chron && t >= 1) G.chron(`${k}の節目「${m.name}」に届く`);
    }
    return r;
  };

  // 届いた節目の一覧と、次の節目（画面のシート用）
  API.view = (S) => {
    S = S || G.S;
    if (!S || !S.stats) return [];
    API.state(S);
    return D.STATS.map((k) => {
      const v = API.val(S, k);
      const got = [];
      let next = null;
      F3.TIERS.forEach((n, t) => {
        const m = API.mark(k, t);
        if (!m) return;
        if (v >= n) got.push({ tier: t, name: m.name, gain: m.gain });
        else if (!next) next = { tier: t, name: m.name, gain: m.gain, need: n, left: n - v };
      });
      return { stat: k, val: v, got, next };
    });
  };

  // ---------------------------------------------------------------- 出来事の選択肢
  const tagOf = (spec) => { const m = API.mark(spec.stat, spec.tier); return m ? m.name : spec.stat; };
  API.make = (spec) => {
    if (!D.STATS.includes(spec.stat) || !API.mark(spec.stat, spec.tier)) throw new Error(`F3：節目が無い ${spec.stat}:${spec.tier}`);
    const c = { label: spec.label, ok: spec.ok, f3mtag: tagOf(spec), cond: (S) => API.has(S, spec.stat, spec.tier) };
    // 節目の鍵（"筋力:1"）は数えない欄に置く（物語の文を調べる確かめに、内部の数として拾われないように）
    Object.defineProperty(c, "f3m", { value: `${spec.stat}:${spec.tier}`, enumerable: false });
    if (spec.ng) c.ng = spec.ng;
    if (spec.check) { c.stat = spec.stat; c.diff = spec.check.diff || "普通"; }
    if (spec.cost) c.cost = spec.cost;
    return c;
  };
  API.added = {};
  const SKIP_ID = /^(m6_|e3_|rr|m7_|m10_|m11_|m2_|c\d+_|q\d+_|kn_|r2_|v2_gigi|w6w_mate|epi|i3_|c1_|w6)/;   // 旅の出来事（w6）は選択肢の数が決まっている
  API.PER_EVENT = 2;
  API.apply = () => {
    const C = G.c10;
    (D.EVENTS || []).forEach((e) => {
      if (!e || !Array.isArray(e.choices) || e._f3m) return;
      e._f3m = true;
      const push = (spec) => { e.choices.push(API.make(spec)); API.added[e.id] = (API.added[e.id] || 0) + 1; };
      if (F3.ADD[e.id]) { F3.ADD[e.id].forEach(push); return; }
      if (!C || !C.catsOf || e.once || e.noC10 || SKIP_ID.test(e.id) || (D.C10_NOTPL || []).includes(e.id) || /\{[a-z]+\}/.test(e.text || "") || e.choices.some((c) => c.next)) return;
      const cats = C.catsOf(e);
      if (!cats.length) return;
      // 合う型から、能力値が重ならないように二つまで（出来事 id で選ぶので、いつも同じ）
      const pool = F3.TPL.filter((t) => cats.includes(t.cat)).sort((a, b) => hash(e.id + a.label) - hash(e.id + b.label));
      const used = new Set();
      pool.forEach((t) => { if (used.size < API.PER_EVENT && !used.has(t.stat)) { used.add(t.stat); push(t); } });
    });
  };
  API.apply();
  // あとから足された出来事にも効くように。出来事の数が変わったときだけ見直す（毎回すべてを見ると手番が重い）
  let seenN = (D.EVENTS || []).length;
  const choices0 = G.eventChoices;
  G.eventChoices = () => { const n = (D.EVENTS || []).length; if (n !== seenN) { seenN = n; API.apply(); } return choices0(); };

  // 画面：節目の選択肢に名を添え、まだ届かない節目の選択肢を一つだけうっすら見せる（選択肢が多い場面では見せない）
  API.showLocked = true;
  const actions0 = G.actions;
  G.actions = () => {
    const g = actions0();
    const S = G.S;
    if (!S || S.mode !== "event") return g;
    const e = D.EVENTS.find((x) => x.id === S.event);
    if (!e || !e._f3m) return g;
    let grp0 = null;
    g.forEach((grp) => (grp.list || []).forEach((a) => {
      const m = /^ev:(\d+)$/.exec(a.id || "");
      if (!m) return;
      if (!grp0) grp0 = grp;
      const c = e.choices[+m[1]];
      if (c && c.f3mtag && !a.f3m) { a.f3m = c.f3m; a.sub = a.sub ? `${c.f3mtag}・${a.sub}` : c.f3mtag; }
    }));
    if (!grp0 || !API.showLocked) return g;
    const shown = g.reduce((n, grp) => n + (grp.list || []).length, 0);
    if (shown >= ((G.c10 && G.c10.CROWDED) || 6)) return g;
    // 次に届きそうな節目（足りない点がいちばん少ないもの）
    let best = null;
    e.choices.forEach((c, i) => {
      if (!c.f3m || c.cond(S)) return;
      const [k, t] = c.f3m.split(":");
      const left = API.need(+t) - API.val(S, k);
      if (!best || left < best.left) best = { i, c, k, t: +t, left };
    });
    if (best) grp0.list.push({ id: "f3mlock:" + best.i, label: best.c.label, sub: (F3.HINT[best.k] || [])[best.t] || "", disabled: true, locked: true, f3m: best.c.f3m });
    return g;
  };

  // ---------------------------------------------------------------- 町の施設の「鍛えた腕で」（一つの施設で一日に一度）
  API.facList = (S) => {
    S = S || G.S;
    return ((F3.FAC || {})[S.fac] || []).map((f, i) => ({ f, i })).filter(({ f }) => API.has(S, f.stat, f.tier));
  };
  const facActions0 = G.facActions;
  G.facActions = () => {
    const g = facActions0();
    const S = G.S;
    const list = API.facList(S);
    if (!list.length) return g;
    const x = API.state(S);
    const used = x.fac && x.fac.day === S.day ? x.fac.used || {} : {};
    const items = list.map(({ f, i }) => {
      const sub = [tagOf(f)];
      if (f.check) sub.push(`${f.stat} ${G.chance(f.stat, f.check.diff || "普通")}%`);
      if (f.cost) sub.push(`${f.cost}G`);
      if (used[S.fac]) sub.push("今日はもうした");
      return { id: `f3mf:${S.fac}:${i}`, label: f.label, sub: sub.join("・"), f3m: `${f.stat}:${f.tier}`, disabled: !!used[S.fac] || !!(f.cost && S.gold < f.cost) };
    });
    g.splice(Math.max(0, g.length - 1), 0, { title: "鍛えた腕で", list: items });
    return g;
  };
  const facAct0 = G.facAct;
  G.facAct = (head, arg, a) => {
    if (head !== "f3mf") return facAct0(head, arg, a);
    const S = G.S;
    const [fac, n] = String(arg).split(":");
    const f = ((F3.FAC || {})[fac] || [])[+n];
    if (!f || fac !== S.fac || !API.has(S, f.stat, f.tier)) return;
    const x = API.state(S);
    if (x.fac && x.fac.day === S.day && (x.fac.used || {})[fac]) return;
    if (f.cost) { if (S.gold < f.cost) return; S.gold -= f.cost; G.note(`所持金 -${f.cost}G`); }
    if (!x.fac || x.fac.day !== S.day) x.fac = { day: S.day, used: {} };
    x.fac.used[fac] = 1;
    G.log("you", f.label);
    let o = f.ok;
    if (f.check) o = G.check(f.stat, f.check.diff || "普通", f.label).ok ? f.ok : f.ng;
    G.apply(o);
    if (!S.over) G.pass(1);
  };
})(globalThis.G = globalThis.G || {});
