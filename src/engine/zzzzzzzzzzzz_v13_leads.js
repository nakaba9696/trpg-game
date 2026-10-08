// V13：時限の出来事への導線（表は src/data/v13_leads.js の D.V13.LEADS）
// 時期があって特定の場所でしか関われない出来事（季節の催し・舞台の町でしか関われない世の大事）について、
// 時期の少し前から、別々の道（遠くの酒場・近くの酒場・ギルドに入ったときの張り紙・旅人・道中・仲間）で話が一つずつ出る。
//   季節の催し：その季節の前の季節の半ばから、その季節の半ばまで（季節の長さで測る）。一度きりの出来事は、済んだら出ない
//   世の大事：前触れの段階から、関われる行動がそろう段階の手前まで（段階で測る。段階の日数が変わってもずれない）
// 聞いた話は、本文に一行と、この冒険の噂（G.memo の「噂：」「貼り紙：」→ 依頼の横の噂の欄）。
// 図鑑には、その組の覚え書き（note。どの冒険でも変わらないこと）だけを、その場所の項目（か、その大事の用語）の「聞いた話」に残す（V12）。
// 一つ一つの話は一度だけ（その時期ごと）。町に着いたときの話（旅人・道中・仲間）は、何日かに一度まで。
// 乱数は使わない（並びは日と表の順で決まる）。遊びの乱数の並びを変えないため。
// セーブに足すもの：S.v13 = { heard: { "組:時期|番号": 日 }, day 着いたときの話を最後に出した日 }（無くても動く）。
// core.js・explore.js は書き換えず、G.facAct（酒場）・G.exploreAct（ギルドに入る）・G.arrive を包む。DOM なし。レーン V（V13）
(function (G) {
  const D = G.data;
  const V = (G.v13 = G.v13 || {});
  const T = () => D.V13 || {};
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const exists = (id) => !!(id && D.LOCS[id]);

  V.GAP = 3;          // 町や土地に着いたときの話（旅人・道中・仲間）は、この日数に一度まで
  V.KEEP = 240;       // 聞いた話の印を覚えておく数
  V.CH = { far: "遠くの酒場", near: "近くの酒場", guild: "ギルドの張り紙", trav: "旅人", road: "道中", comp: "仲間" };
  V.TAVERN = ["rumor", "drink"];

  // ---------------------------------------------------------------- 暦（季節の長さで測る）
  // 季節の境目は G.seasonOf で探す（暦の長さを C16 などが変えても、ここは書き換えずに済む）
  V.SCAN = 800;       // 境目を探す範囲（日）。一年より長ければよい
  const seasonOf = (d) => (G.seasonOf ? G.seasonOf(d) : null);
  // その季節が始まる日のうち、day の前後にあるもの（古い順）
  V.seasonStarts = (season, day) => {
    const out = [];
    for (let d = Math.max(2, day - V.SCAN); d <= day + V.SCAN; d++) if (seasonOf(d) === season && seasonOf(d - 1) !== season) out.push(d);
    if (day - V.SCAN < 2 && seasonOf(1) === season) out.unshift(1);
    return out;
  };
  V.seasonLength = (start) => { let n = 0; const s = seasonOf(start); while (n < V.SCAN && seasonOf(start + n) === s) n++; return n; };
  // 季節の催しの、今の日を含む時期 { key, start, from, to }（無ければ null）。from（前の季節の半ば）〜 to（その季節の半ば）
  V.seasonWindow = (set, day) => {
    for (const start of V.seasonStarts(set.season, day)) {
      const half = Math.floor(V.seasonLength(start) / 2);
      if (day >= start - half && day < start + half) return { key: `${set.id}:${start}`, start, from: start - half, to: start + half };
    }
    return null;
  };

  // ---------------------------------------------------------------- 世の大事
  const m12Kind = (set) => (D.M12 && D.M12.KINDS ? D.M12.KINDS[set.m12] : null);
  // 関われる行動がそろう段階（その手前までが導線の時期）。行動が無ければ、居合わせる段階
  V.m12Period = (Kd) => {
    const sts = as(Kd && Kd.acts).flatMap((a) => as(a.st));
    if (sts.length) return Math.max(...sts);
    return Kd && Kd.here ? Kd.here.st : 1;
  };
  V.m12Event = (set, S) => (G.m12 && G.m12.find ? G.m12.find(set.m12, S) : null);

  // ---------------------------------------------------------------- 今、話が出る組
  // [{ set, key, ev?, targets }]
  V.active = (S) => {
    S = S || G.S;
    if (!S) return [];
    const out = [];
    as(T().LEADS).forEach((set) => {
      if (set.kind === "season") {
        const e = (D.EVENTS || []).find((x) => x.id === set.ev);
        if (!e) return;
        if (e.once && S.flags && S.flags["ev:" + e.id]) return;
        const w = V.seasonWindow(set, S.day || 1);
        if (!w) return;
        out.push({ set, key: w.key, targets: as(e.where).filter(exists) });
      } else if (set.kind === "m12") {
        const Kd = m12Kind(set);
        const ev = V.m12Event(set, S);
        if (!Kd || !ev || !(ev.st < V.m12Period(Kd))) return;
        const places = G.m12.places ? G.m12.places(ev, V.m12Period(Kd)) : [];
        out.push({ set, key: `${set.id}:${ev.id}`, ev, targets: [...new Set([ev.v && ev.v.t, ...places].filter(exists))] });
      }
    });
    return out;
  };

  // 今いる所と舞台の近さ：here 舞台そのもの / near 同じ国か道でつながる / far それ以外
  V.distance = (a, loc) => {
    if (a.targets.includes(loc)) return "here";
    const L = D.LOCS[loc] || {};
    const near = a.targets.some((t) => {
      const T0 = D.LOCS[t] || {};
      return (T0.region && T0.region === L.region) || (T0.links && T0.links[loc]) || (L.links && L.links[t]);
    });
    return near ? "near" : "far";
  };

  // ---------------------------------------------------------------- 文
  const compName = (S) => {
    const c = as(S.companions)[0];
    return c ? String(c.name || "仲間").replace(/\{.*?\}/g, "") : "";
  };
  V.fill = (text, a, S) => String(text || "").replace(/\{(\w+)\}/g, (m, k) => {
    const v = a && a.ev && a.ev.v ? a.ev.v : {};
    if (k === "t") return (T().TOWN_HINT || {})[v.t] || "遠くの町";
    if (k === "site") return (T().SITE_HINT || {})[v.site] || "古い場所";
    if (k === "n") return compName(S || G.S) || "連れ";
    return m;
  });

  // ---------------------------------------------------------------- 状態
  V.state = (S) => {
    S = S || G.S;
    if (!S) return null;
    if (!S.v13 || typeof S.v13 !== "object") S.v13 = {};
    if (!S.v13.heard || typeof S.v13.heard !== "object") S.v13.heard = {};
    return S.v13;
  };
  const hkey = (a, i) => `${a.key}|${i}`;
  V.heardAny = (S, key) => Object.keys(V.state(S).heard).some((k) => k.startsWith(key + "|"));

  // 道（ch）に合う、まだ聞いていない話：[{ a, i, lead }]
  V.candidates = (S, chs) => {
    const st = V.state(S);
    const out = [];
    V.active(S).forEach((a) => {
      const dist = V.distance(a, S.loc);
      if (dist === "here") return;
      as(a.set.leads).forEach((lead, i) => {
        if (!chs.includes(lead.ch) || st.heard[hkey(a, i)]) return;
        if (lead.ch === "far" && dist !== "far") return;
        if ((lead.ch === "near" || lead.ch === "road") && dist !== "near") return;
        if (lead.ch === "comp" && !as(S.companions).length) return;
        if (lead.ch === "trav" && (D.LOCS[S.loc] || {}).type !== "town") return;
        out.push({ a, i, lead });
      });
    });
    return out;
  };

  // 話を一つ聞く（本文・この冒険の噂・図鑑の覚え書き）
  V.tell = (S, c) => {
    const st = V.state(S);
    st.heard[hkey(c.a, c.i)] = S.day || 1;
    const keys = Object.keys(st.heard);
    if (keys.length > V.KEEP) keys.slice(0, keys.length - V.KEEP).forEach((k) => delete st.heard[k]);
    const text = V.fill(c.lead.text, c.a, S);
    G.say(text);
    if (G.memo) G.memo((c.lead.ch === "guild" ? "貼り紙：" : "噂：") + text);
    V.remember(c.a.set);
    return text;
  };
  // 図鑑の覚え書き：その場所の項目か、その大事の用語の「聞いた話」に（同じ文は一つ）
  V.noteRef = (set) => {
    if (set.kind === "season") return { loc: set.loc };
    const Kd = m12Kind(set);
    return Kd && Kd.lore ? { lore: Kd.lore } : null;
  };
  V.remember = (set) => {
    const ref = V.noteRef(set);
    if (!set.note || !ref || !G.v12 || !G.v12.add) return null;
    try { return G.v12.add(set.note, ref); } catch { return null; }
  };

  // 道ごとに一つ（日と表の順で決める。乱数は使わない）
  V.offer = (S, chs) => {
    const list = V.candidates(S, chs);
    if (!list.length) return null;
    return V.tell(S, list[(S.day || 0) % list.length]);
  };

  // ---------------------------------------------------------------- 包む
  const facAct0 = G.facAct;
  G.facAct = (head, arg, ...rest) => {
    const r = facAct0(head, arg, ...rest);
    const S = G.S;
    try {
      if (S && !S.over && S.mode !== "combat" && S.mode !== "event") {
        if (head === "tavern" && V.TAVERN.includes(arg)) V.offer(S, ["far", "near"]);
      }
    } catch { /* 導線が出なくても遊びは止めない */ }
    return r;
  };

  // ギルドに入ったとき、壁の張り紙に（報告や受けるときには出さない。依頼の窓の印を乱さない）
  const exploreAct0 = G.exploreAct;
  G.exploreAct = (head, arg, ...rest) => {
    const r = exploreAct0(head, arg, ...rest);
    const S = G.S;
    try {
      if (S && !S.over && head === "fac" && arg === "guild" && S.mode === "fac" && S.fac === "guild") V.offer(S, ["guild"]);
    } catch { /* 同上 */ }
    return r;
  };

  const arrive0 = G.arrive;
  G.arrive = (dest) => {
    const r = arrive0(dest);
    const S = G.S;
    try {
      if (S && !S.over && S.loc === dest && S.mode !== "combat" && S.mode !== "event") {
        const st = V.state(S);
        if (st.day == null || (S.day || 0) - st.day >= V.GAP) {
          if (V.offer(S, ["road", "trav", "comp"])) st.day = S.day || 0;
        }
      }
    } catch { /* 同上 */ }
    return r;
  };
})(globalThis.G = globalThis.G || {});
