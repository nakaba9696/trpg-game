// V12：覚え書き（G.memo）を、関係する図鑑の項目に振り分けて「聞いた話」として残す（持ち主の声「ゴブリンはゴブリンの図鑑に」）
//   G.memo(t, { foe, person, lore, loc }) … 関係する id を渡せる。渡さなければ、文に出てくる名前から決める
//     魔物の名前 → 人物の名前 → （出来事の結果なら）その結果の用語 → 用語の見出し → 地名 → 用語の hint の言葉 → （出来事なら）出てくる人 → 「ほかの噂」の箱
//   G.P.codex.heard = { "foe:goblin": [{ t, by, date, at }], "person:id": [...], "lore:id": [...], "loc:id": [...], misc: [...] }（図鑑と同じく冒険をまたいで残る）
//   新しい話には図鑑の印（c.fresh）。項目が図鑑に載っていれば、その項目の「kind:id」。まだ載っていない（会っていない魔物・人、知らない用語）・場所・箱は「heard:key」（図鑑の「噂」のタブ）
//   S.memos は今までどおり残す（ほかの仕組みが読む）。古いセーブの S.memos は一度だけ振り分ける（S.v12heard）
// core.js・zz_f2_codex.js は書き換えず、包む。DOM なし（画面は ui/f2_codex.js）
(function (G) {
  const D = G.data;
  const V = (G.v12 = G.v12 || {});
  const F2 = () => G.f2 || {};
  const as = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  V.MAX = 12;      // 一つの項目に残す話の数
  V.MAX_BOX = 30;  // 「ほかの噂」の箱
  // 用語の見出しのうち、ありふれていて振り分けの目印にならないもの
  V.SKIP_WORDS = new Set(["大陸", "人と種族", "遺跡の品", "国王", "魔物"]);

  V.store = () => { const c = G.codex(); return c.heard || (c.heard = {}); };
  V.list = (key) => (V.store()[key] || []).slice();

  // ---------------------------------------------------------------- 名前の索引（長い名前から当てる）
  let index = null;
  V.index = () => {
    if (index) return index;
    const f = F2();
    const rows = { foe: [], person: [], lore: [], hint: [], loc: [] };
    const push = (kind, name, id) => { if (name && name.length >= 2 && !V.SKIP_WORDS.has(name)) rows[kind].push([name, id]); };
    (f.foeIds ? f.foeIds() : Object.keys(D.ENEMIES)).forEach((id) => push("foe", ((f.foe && f.foe(id)) || D.ENEMIES[id] || {}).name, id));
    Object.keys(D.F2_PEOPLE || {}).forEach((id) => {
      push("person", f.personName ? f.personName(id) : (D.F2_PEOPLE[id] || {}).name, id);
      const p = (D.C2_PEOPLE || {})[id];
      if (p && p.name) push("person", p.name, id);
    });
    Object.entries(D.LORE || {}).forEach(([id, e]) => {
      push("lore", e.title, id);
      (e.lines || []).forEach((l) => as(l[2] && l[2].hint).forEach((w) => { if (String(w).length >= 3) push("hint", w, id); }));
    });
    // 地名は、呼び名の短い形も（「港町ヴァレンツァ」→「ヴァレンツァ」、「使徒領・灰の荒野」→「灰の荒野」、「エル・ナフ遺構」→「エル・ナフ」、「聖都エルヴィナ」→「聖都」）
    Object.entries(D.LOCS || {}).forEach(([id, L]) => {
      const n = L.name || "";
      push("loc", n, id);
      n.split("・").forEach((x) => { if (x !== n && !/^[ァ-ヶー]{1,2}$/.test(x)) push("loc", x, id); });
      [/^[ァ-ヶー・]{3,}/, /[ァ-ヶー・]{3,}$/, /^[^ァ-ヶー・]{2,}(?=[ァ-ヶー])/].forEach((re) => { const m = re.exec(n); if (m && m[0] !== n) push("loc", m[0].replace(/^・|・$/g, ""), id); });
    });
    Object.values(rows).forEach((r) => r.sort((a, b) => b[0].length - a[0].length));
    return (index = rows);
  };
  const find = (kind, t) => { const r = V.index()[kind].find(([name]) => t.includes(name)); return r ? r[1] : null; };

  // ---------------------------------------------------------------- 振り分け
  V.ctx = null; // 出来事の結果を当てはめているあいだ：{ lore, person }
  const valid = {
    foe: (id) => !!(F2().foe ? F2().foe(id) : D.ENEMIES[id]),
    person: (id) => !!(D.F2_PEOPLE || {})[id],
    lore: (id) => !!(D.LORE || {})[id],
    loc: (id) => !!(D.LOCS || {})[id],
  };
  V.classify = (t, ref) => {
    t = String(t || "");
    for (const k of ["foe", "person", "lore", "loc"]) if (ref && ref[k] && valid[k](ref[k])) return `${k}:${ref[k]}`;
    const ctx = V.ctx || {};
    let id;
    if ((id = find("foe", t))) return "foe:" + id;
    if ((id = find("person", t))) return "person:" + id;
    if (ctx.lore && valid.lore(ctx.lore)) return "lore:" + ctx.lore;
    if ((id = find("lore", t))) return "lore:" + id;
    if ((id = find("loc", t))) return "loc:" + id;
    if ((id = find("hint", t))) return "lore:" + id;
    if (ctx.person && valid.person(ctx.person)) return "person:" + ctx.person;
    return "misc";
  };
  // その項目が、今の図鑑の一覧で開ける（載っている）か
  V.listed = (key) => {
    const [kind, id] = key.split(":");
    if (kind === "foe") return !!(G.codexFoe && G.codexFoe(id));
    if (kind === "person") return !!(G.codexPerson && G.codexPerson(id));
    if (kind === "lore") return !!(G.codexLore && G.codexLore()[id]);
    return false;
  };
  V.markKey = (key) => (V.listed(key) ? key : "heard:" + key);

  V.add = (t, ref, quiet) => {
    t = String(t || "").trim();
    if (!t || !G.codex) return null;
    const key = V.classify(t, ref);
    const st = V.store();
    const arr = st[key] || (st[key] = []);
    if (arr.some((x) => x.t === t)) return key;
    const S = G.S;
    arr.push({ t, by: S && S.profile ? `${S.clsName || ""} ${S.profile.name || ""}`.trim() : "", date: S && G.dateOf ? G.dateOf(S.day) : "", at: Date.now() });
    while (arr.length > (key === "misc" ? V.MAX_BOX : V.MAX)) arr.shift();
    const c = G.codex();
    if (!quiet) (c.fresh || (c.fresh = {}))[V.markKey(key)] = 1;
    if (G.onCodexChange) try { G.onCodexChange(); } catch {}
    return key;
  };

  // 「噂」のタブに出す箱：場所ごと・まだ載っていない相手ごと・ほかの噂
  V.boxName = (key) => {
    const [kind, id] = key.split(":");
    if (kind === "loc") return ((D.LOCS || {})[id] || {}).name || "どこかの土地";
    if (kind === "foe") return "まだ会っていない魔物";
    if (kind === "person") return "まだ会っていない人";
    if (kind === "lore") return "まだよく知らないこと";
    return "ほかの噂";
  };
  V.boxes = () => {
    const out = new Map();
    Object.entries(V.store()).forEach(([key, arr]) => {
      if (!arr || !arr.length || V.listed(key)) return;
      const kind = key.split(":")[0];
      const bid = kind === "loc" ? key : kind === "misc" ? "misc" : "un:" + kind;
      const b = out.get(bid) || { id: bid, name: V.boxName(key), keys: [], items: [] };
      b.keys.push(key);
      arr.forEach((x) => b.items.push(x));
      out.set(bid, b);
    });
    const rank = (b) => (b.id.startsWith("loc:") ? 0 : b.id.startsWith("un:") ? 1 : 2);
    return [...out.values()].map((b) => ({ ...b, items: b.items.sort((x, y) => (x.at || 0) - (y.at || 0)) })).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  };
  V.boxFresh = (b) => b.keys.some((k) => G.codexIsFresh && G.codexIsFresh("heard", k));
  V.boxSeen = (b) => { let any = false; b.keys.forEach((k) => { if (G.codexSeen && G.codexSeen("heard", k)) any = true; }); return any; };
  // 項目を開いたら、その項目の「まだ載っていなかったころ」の印も消す
  V.seenKey = (key) => (G.codexSeen ? G.codexSeen("heard", key) : false);

  // 古いセーブ（S.memos だけある）を一度だけ振り分ける。印は付けない
  V.seed = (S) => {
    S = S || G.S;
    if (!S || S.v12heard) return false;
    S.v12heard = 1;
    (S.memos || []).forEach((t) => V.add(t, null, true));
    return true;
  };

  // ---------------------------------------------------------------- 包む
  const baseMemo = G.memo;
  G.memo = (t, ref) => {
    baseMemo(t);
    if (G.S) { V.seed(G.S); V.add(t, ref); }
  };
  const baseApply = G.apply;
  G.apply = (o) => {
    const prev = V.ctx;
    const S = G.S;
    const lore = as(o && o.lore).map((x) => String(x).split(":")[0]).find((id) => valid.lore(id)) || null;
    const people = S && S.event && F2().peopleInEvent ? F2().peopleInEvent(S.event) : [];
    V.ctx = { lore, person: people.length === 1 ? people[0] : null };
    try { return baseApply(o); } finally { V.ctx = prev; }
  };
  const baseNewGame = G.newGame;
  G.newGame = (opt) => { const S = baseNewGame(opt); if (S) S.v12heard = 1; return S; };
  const baseEndTurn = G.endTurn;
  G.endTurn = () => { if (G.S) V.seed(G.S); baseEndTurn(); };
  // 冒険をまたいだ図鑑を一つにまとめるとき、聞いた話も合わせる（同じ文は一つ）
  if (G.codexMerge) {
    const baseMerge = G.codexMerge;
    G.codexMerge = (a, b) => {
      const out = baseMerge(a, b);
      const heard = {};
      [a, b].forEach((c) => Object.entries((c && c.heard) || {}).forEach(([key, arr]) => {
        const o = heard[key] || (heard[key] = []);
        as(arr).forEach((x) => { if (x && x.t && !o.some((y) => y.t === x.t)) o.push({ ...x }); });
      }));
      Object.entries(heard).forEach(([key, arr]) => { arr.sort((x, y) => (x.at || 0) - (y.at || 0)); heard[key] = arr.slice(-(key === "misc" ? V.MAX_BOX : V.MAX)); });
      if (Object.keys(heard).length) out.heard = heard;
      return out;
    };
  }
})(globalThis.G = globalThis.G || {});
