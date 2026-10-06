// U17：噂は図鑑ではなく「受けている依頼」の横に（持ち主の声「噂は図鑑ではなく依頼の横にして。導線になって、依頼にまだならない程度の話という理解です」）
// - 酒場の「噂を聞く」・世の中の噂・道中で聞いた話など、G.heard に来る話（と、G.memo の「噂：」「手がかり：」「貼り紙：」）のうち、噂（「噂：」で始まる）・場所の話・まだ図鑑に載っていない相手の話を、
//   この冒険の噂として S.q17r に残す。魔物・人物・用語の項目の「聞いた話」（知識）は今までどおり図鑑（zzzz_v12_heard.js）に残す
// - 一つ一つの噂に、続きがありそうな所（地名。LOCS の名は「港町〇〇」のように種類つき）か、会えば分かりそうな相手を添える
// - 続きが依頼になったら（その噂の場所・相手が、受けている依頼の行き先・文に出てくる）「依頼になった」として下へ
// - 新しい噂が入ったら、依頼と同じく右上の「依頼」に赤い「！」（S.q17.bang）、一覧では「新」（n: 1。一覧を閉じたら消す）
// - 古いセーブ：S.q17r が無ければ、S.memos の「噂：」「手がかり：」と、図鑑の「噂」のタブにあった話（V12 の箱）を一度だけ移す（印は付けない）
// セーブに足すもの：S.q17r = { list: [{ t, day, loc, key, n }] }（無くても動く）。DOM なし（画面は ui/u17_rumors.js）。レーン U＋C
(function (G) {
  const D = G.data;
  const U = (G.q17 = G.q17 || {});
  U.RUMOR_MAX = 40;
  U.RUMOR_LINE = "噂を書き留めた。続きの手がかりは、右上の「依頼」の噂の欄に。";
  const arr = (v) => (Array.isArray(v) ? v : []);
  const V = () => G.v12 || null;
  const locName = (id) => (G.placeName ? G.placeName(id) : id && D.LOCS[id] ? D.LOCS[id].name : ""); // 地名は種類つき（D2）
  const RUMOR_HEAD = /^(噂|手がかり|貼り紙)：/;
  const plain = (t) => String(t || "").replace(RUMOR_HEAD, "").replace(/^「(.*)」$/, "$1").trim();

  // 文に出てくる地名（長い名前から。V12 の索引を借りる）
  const locIn = (t) => {
    const v = V();
    if (!v || !v.index) return "";
    const r = v.index().loc.find(([name]) => t.includes(name));
    return r ? r[1] : "";
  };
  // 噂の相手の名前（まだ図鑑に無い魔物・人）
  const subjectName = (key) => {
    if (!key) return "";
    const [kind, id] = key.split(":");
    if (kind === "foe") { const f = (G.f2 && G.f2.foe && G.f2.foe(id)) || D.ENEMIES[id]; return (f && f.name) || ""; }
    if (kind === "person") { const p = (D.C2_PEOPLE || {})[id] || {}; return p.name || (G.f2 && G.f2.personName ? G.f2.personName(id) : "") || ""; }
    return "";
  };

  U.rumorStore = (S) => {
    S = S || G.S;
    if (!S) return null;
    if (!S.q17r || typeof S.q17r !== "object" || !Array.isArray(S.q17r.list)) {
      S.q17r = { list: [] };
      U.rumorSeed(S);
    }
    return S.q17r;
  };
  // 噂を一つ足す（同じ文は一つ）。足したら true
  U.addRumor = (S, t, key, quiet) => {
    const st = U.rumorStore(S);
    const text = plain(t);
    if (!st || !text) return false;
    const loc = key && key.startsWith("loc:") ? key.slice(4) : locIn(text);
    const same = st.list.find((x) => x.t === text);
    if (same) { if (key && !same.key) { same.key = key; same.loc = loc || same.loc; } return false; } // 覚え書き（G.memo）が先に来て、G.heard があとから項目を教える
    st.list.push({ t: text, day: S.day || 0, loc: loc || "", key: key || "", n: quiet ? 0 : 1 });
    while (st.list.length > U.RUMOR_MAX) st.list.shift();
    if (!quiet && U.state) { const q = U.state(S); if (q) q.bang = true; }
    // その場で分かるように、記録に一行（一つの行動で一度だけ。U19 の書き直す本文でも、その行動の頁に出る）
    if (!quiet && G.log && S.turn !== st.lineTurn) { st.lineTurn = S.turn; G.log("quest", U.RUMOR_LINE); }
    return true;
  };
  // 古いセーブ：覚え書きと、図鑑の「噂」のタブにあった話を移す
  U.rumorSeed = (S) => {
    const st = S.q17r;
    const add = (t, key) => { const text = plain(t); if (text && !st.list.some((x) => x.t === text)) st.list.push({ t: text, day: 0, loc: key && key.startsWith("loc:") ? key.slice(4) : locIn(text), key: key || "", n: 0 }); };
    arr(S.memos).forEach((t) => { if (RUMOR_HEAD.test(String(t))) add(t, ""); });
    try {
      const v = V();
      if (v && v.boxes && G.codex) v.boxes().forEach((b) => b.keys.forEach((k) => v.list(k).forEach((x) => add(x.t, k))));
    } catch { /* 図鑑が無くても止めない */ }
    while (st.list.length > U.RUMOR_MAX) st.list.shift();
  };

  // 受けている依頼の行き先と文（噂が依頼になったかを見る）
  U.questLocs = (S) => {
    S = S || G.S;
    const out = {};
    const put = (to, title) => { if (to && D.LOCS[to] && !out[to]) out[to] = title; };
    arr(S && S.quests).forEach((q) => { if (q && typeof q === "object") put(q.loc, q.title || ""); });
    try {
      const c = G.f2o && G.f2o.cur ? G.f2o.cur(S) : null;
      if (c && c.step >= 2) put(c.loc, c.th.title);
    } catch {}
    try {
      const r = S && S.r3;
      if (r && r.follow && G.r3 && G.r3.followLoc) Object.keys(r.follow).forEach((id) => { const f = (D.R3_FOLLOW || {})[id]; if (f) put(G.r3.followLoc(r, id), f.sub || f.label); });
    } catch {}
    try {
      const all = S && S.q9 && typeof S.q9 === "object" ? S.q9 : {};
      Object.keys(D.Q9 || {}).forEach((id) => {
        const q = D.Q9[id], s = all[id] || {}, n = s.n || 0;
        if (s.end || !q.steps || n >= q.steps.length) return;
        const tid = G.q9 && G.q9.topicId ? G.q9.topicId(id, n) : "";
        if (!(S.tk && S.tk.heard && S.tk.heard[tid])) return;
        put(q.steps[n].at, q.title);
      });
    } catch {}
    return out;
  };
  // 噂が依頼になったか（なったら依頼の名前）
  U.rumorQuest = (x, S, locs, entries) => {
    if (x.loc && locs[x.loc]) return locs[x.loc];
    const name = subjectName(x.key);
    if (name) { const e = entries.find((q) => [q.title, ...(q.desc || [])].join(" ").includes(name)); if (e) return e.title; }
    return "";
  };
  // 一覧に出す噂。新しい順に、依頼になったものは下へ
  U.rumors = (S) => {
    S = S || G.S;
    const st = S ? U.rumorStore(S) : null;
    if (!st) return [];
    const locs = U.questLocs(S);
    let entries = [];
    try { entries = G.q7 && G.q7.list ? G.q7.list(S) : []; } catch { entries = []; }
    const out = st.list.map((x, i) => {
      const quest = U.rumorQuest(x, S, locs, entries);
      const who = subjectName(x.key);
      const kind = (x.key || "").split(":")[0];
      const hint = x.loc ? `続きがありそうな所：${locName(x.loc)}`
        : who ? (kind === "person" ? `続きを知っていそうな人：${who}` : `続きに関わる魔物：${who}`)
        : "どこで続きがあるかは、まだ分からない";
      return { i, text: x.t, date: x.day && G.dateOf ? G.dateOf(x.day) : "", day: x.day || 0, loc: x.loc || "", who, hint, quest, fresh: !!x.n };
    });
    return out.sort((a, b) => (a.quest ? 1 : 0) - (b.quest ? 1 : 0) || b.i - a.i);
  };
  U.rumorFresh = (S) => { const st = S ? U.rumorStore(S) : null; return !!(st && st.list.some((x) => x.n)); };
  U.rumorClear = (S) => { const st = S ? U.rumorStore(S) : null; if (st) st.list.forEach((x) => { x.n = 0; }); };

  // ---------------------------------------------------------------- 包む
  // G.heard（zzzz_v12_heard.js）：図鑑の知識として残すのは今までどおり。噂・場所の話・まだ載っていない相手の話は、この冒険の噂にも
  const heard0 = G.heard;
  if (heard0) {
    G.heard = (t, ref) => {
      const key = heard0(t, ref);
      const S = G.S;
      try {
        if (S && !S.over) {
          const v = V();
          const rumor = /^噂：/.test(String(t || "")) || !key || key.startsWith("loc:") || (v && v.inBox ? v.inBox(key) : false);
          if (rumor) U.addRumor(S, G.m2Fill ? G.m2Fill(String(t)) : t, key);
        }
      } catch { /* 噂が残らなくても遊びは止めない */ }
      return key;
    };
  }
  // 覚え書き（G.memo）の「噂：」「手がかり：」「貼り紙：」も噂に（酒場の尋ね人の噂 F4・世の中の噂など、G.heard を通らない話）
  const memo0 = G.memo;
  if (memo0) {
    G.memo = (t) => {
      memo0(t);
      try { const S = G.S; if (S && !S.over && RUMOR_HEAD.test(String(t || ""))) U.addRumor(S, G.m2Fill ? G.m2Fill(String(t)) : t, ""); } catch {}
    };
  }
  const new0 = G.newGame;
  if (new0) {
    G.newGame = (opt) => {
      const r = new0(opt);
      if (G.S) G.S.q17r = { list: [] };
      return r;
    };
  }
})(globalThis.G = globalThis.G || {});
