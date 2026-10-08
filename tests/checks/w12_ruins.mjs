// W12：遺跡らしさ（src/data/w12_ruins.js・src/engine/w12_ruins.js）
// - データの整合：遺跡は迷宮の場所・断片の id・種類・階（主のいる最奥より手前）・仕掛けの階に壁画がある・能力値と難しさ・物・トロフィー・禁じた言葉・内部の数
// - どの断片も手に入る道がある：遺跡ごとに階を下りて、出た行動を押し続けると、すべての断片がそろい、鍵が出て、隠し部屋が開く（古いセーブ S.w12 なしから）
// - 古文字読みが無いと碑文は一行目だけ。あとで覚えると読み直せる
// - 手がかりが多いほど仕掛けが易しい。一日に一度
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const W12 = G.w12;
  if (!W12) { fail("G.w12 が無い"); return; }
  const RU = D.W12_RUINS || {};
  const BANNED = /見世物|観客|客席|舞台|台本|言霊|魔王|ガイゼリク|ヴェルム/;
  const texts = [];
  const ids = new Set();
  for (const [loc, R] of Object.entries(RU)) {
    const L = D.LOCS[loc];
    const w = `W12 ${loc}`;
    if (!L || L.type !== "dungeon") { fail(`${w}: 迷宮の場所でない`); continue; }
    if (!R.name || !R.nature || !R.group || !(R.air && R.air.length)) fail(`${w}: 名・性格・組の見出し・空気の文が無い`);
    texts.push(R.nature, ...(R.air || []));
    const kinds = new Set(R.frags.map((f) => f.kind));
    ["script", "mural", "relic"].forEach((k) => { if (!kinds.has(k)) fail(`${w}: ${k} の断片が無い`); });
    for (const f of R.frags) {
      if (!/^w12_/.test(f.id) || ids.has(f.id)) fail(`${w}: 断片の id ${f.id} が w12_ で始まらないか重なる`);
      ids.add(f.id);
      if (!W12.KIND[f.kind]) fail(`${w}:${f.id}: 種類 ${f.kind}`);
      if (!(f.floor >= 1 && f.floor < L.floors)) fail(`${w}:${f.id}: 階 ${f.floor} が 1〜${L.floors - 1} でない`);
      if (!f.name || !(f.lines && f.lines.length)) fail(`${w}:${f.id}: 名か文が無い`);
      texts.push(f.name, ...f.lines);
    }
    const g = R.gear;
    if (!g) { fail(`${w}: 仕掛けが無い`); continue; }
    if (!D.STATS.includes(g.stat) || !(g.diff in D.DIFF)) fail(`${w}: 仕掛けの能力値か難しさ`);
    if (!R.frags.some((f) => f.kind === "mural" && f.floor === g.floor)) fail(`${w}: 仕掛けの階 ${g.floor} に壁画が無い`);
    if (R.frags.some((f) => f.kind === "mural" && f.floor !== g.floor)) fail(`${w}: 仕掛けの階でない壁画（手に入らない）`);
    texts.push(g.label, g.ok.text, g.ng.text);
  }
  if (Object.keys(RU).length < 4) fail(`遺跡が ${Object.keys(RU).length}（4 つ以上）`);
  const V = D.W12_VAULT;
  if (!D.ITEMS[V.key] || !D.ITEMS[V.item] || !RU[V.loc]) fail("隠し部屋の鍵・品・場所が無い");
  if (!(V.floor >= 1 && V.floor < D.LOCS[V.loc].floors)) fail("隠し部屋の階");
  ["w12_ruvenal", "w12_vault"].forEach((k) => { if (!D.TROPHIES.some((t) => t.key === k)) fail(`トロフィー ${k} が無い`); });
  texts.push(...D.W12_SECRET.text, ...V.text);
  for (const t of [...texts, D.ITEMS[V.key].desc, D.ITEMS[V.item].desc]) if (BANNED.test(t)) fail(`W12 の見える文に「${t.match(BANNED)[0]}」：${t.slice(0, 30)}`);
  for (const t of texts) if (/\d|HP|MP|……/.test(t)) fail(`W12 の物語の文に数か「……」：${t.slice(0, 30)}`);

  // ---------------------------------------------------------------- 遊ぶ：どの断片も手に入る
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 60]));
  const start = (seed, cls, v) => {
    G.rand = seeded(seed);
    G.newGame({ cls, stats: v ? Object.fromEntries(D.STATS.map((k) => [k, v])) : { ...stats }, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.mode = "explore"; S.event = null; S.combat = null;
    delete S.w12; // 古いセーブ
    return S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const reset = (S, loc, depth) => { S.mode = "explore"; S.event = null; S.combat = null; S.fac = null; S.loc = loc; S.depth = depth; S.hp = S.maxHp; S.over = null; };
  for (const cls of ["mage", "merc"]) {
    const S = start(7 + cls.length, cls);
    const hasLetters = G.k1.knows("k1_letters", S);
    let pressed = 0;
    for (const [loc, R] of Object.entries(RU)) {
      const L = D.LOCS[loc];
      S.visited[loc] = true;
      for (let depth = 1; depth < L.floors; depth++) {
        for (let tries = 0; tries < 60; tries++) {
          reset(S, loc, depth);
          const mine = acts().filter((a) => /^w12:/.test(a.id) && a.id !== "w12:vault");
          if (!mine.length) break;
          const a = mine.find((x) => !x.disabled);
          if (!a) { S.day++; continue; }
          const before = W12.count(S);
          try { G.act(a.id); pressed++; } catch (e) { fail(`${cls} ${loc}:${depth} ${a.id}: 例外 ${e.message}`); break; }
          if (S.mode === "combat") { S.combat = null; S.mode = "explore"; }
          if (acts().some((x) => x.id === a.id && !x.disabled) && W12.count(S) === before && S.depth === depth) fail(`${cls} ${a.id}: 同じ日にまた押せる`);
        }
      }
    }
    const miss = W12.all().filter((f) => !W12.st(S).got[f.id]);
    if (miss.length) fail(`${cls}: 手に入らなかった断片 ${miss.map((f) => f.id).join("・")}`);
    if (!W12.st(S).done) fail(`${cls}: そろったのに分かったことが出ない`);
    if (!G.P.trophies.w12_ruvenal) fail(`${cls}: トロフィー w12_ruvenal が無い`);
    // 碑文の読めた行
    const sc = W12.all().filter((f) => f.kind === "script");
    if (hasLetters && sc.some((f) => W12.st(S).got[f.id] < f.lines.length)) fail(`${cls}: 古文字読みがあるのに碑文を読み切れない`);
    if (!hasLetters && sc.some((f) => W12.st(S).got[f.id] !== 1)) fail(`${cls}: 古文字読みが無いのに一行目より多く読めた`);
    // 隠し部屋
    reset(S, V.loc, V.floor);
    if (!(S.inv[V.key] > 0)) fail(`${cls}: 鍵が無い`);
    const b = acts().find((x) => x.id === "w12:vault");
    if (!b) fail(`${cls}: 隠し部屋の行動が出ない`);
    else {
      G.act("w12:vault");
      if (!(S.inv[V.item] > 0) || S.inv[V.key] > 0) fail(`${cls}: 隠し部屋で品が出ない／鍵が残る`);
      if (acts().some((x) => x.id === "w12:vault")) fail(`${cls}: 隠し部屋がまた開く`);
    }
    // 読み直し：古文字読みを覚えると続きが読める
    if (!hasLetters) {
      const f = sc[0];
      S.skills = [...(S.skills || []), "k1_letters"];
      if (!G.k1.knows("k1_letters", S)) { fail("k1_letters を覚えさせられない"); continue; }
      let got = false;
      for (let i = 0; i < 40 && !got; i++) {
        reset(S, f.loc, f.floor); S.day++;
        const a = acts().find((x) => x.id === "w12:script");
        if (!a) { fail(`${cls}: 古文字読みを覚えても読み直しが出ない`); break; }
        G.act("w12:script");
        got = W12.st(S).got[f.id] === f.lines.length;
      }
      if (!got) fail(`${cls}: 読み直しで続きが読めない`);
    }
    if (Number.isNaN(S.gold) || Number.isNaN(S.hp)) fail(`${cls}: 数が壊れた`);
    if (pressed < W12.all().length) fail(`${cls}: 押した数が少ない ${pressed}`);
  }

  // ---------------------------------------------------------------- 手がかり・遺跡の外
  {
    const S = start(3, "merc", 12);
    reset(S, "w4_pass", 3);
    const sub0 = acts().find((x) => x.id === "w12:gear");
    if (!sub0) fail("仕掛けの行動が出ない");
    W12.st(S).got = Object.fromEntries(W12.all().filter((f) => f.kind !== "mural").slice(0, 5).map((f) => [f.id, 1]));
    const sub1 = acts().find((x) => x.id === "w12:gear");
    const pc = (a) => Number((a.sub.match(/(\d+)%/) || [])[1]);
    if (sub0 && sub1 && !(pc(sub1) > pc(sub0))) fail(`手がかりで仕掛けが易しくならない（${sub0.sub} → ${sub1.sub}）`);
    reset(S, "w4_pass", 0);
    if (acts().some((x) => /^w12:/.test(x.id))) fail("入口で遺跡の行動が出る");
    reset(S, Object.keys(D.LOCS).find((k) => D.LOCS[k].type === "town"), 0);
    if (acts().some((x) => /^w12:/.test(x.id))) fail("町で遺跡の行動が出る");
  }
  ok(`W12：遺跡 ${Object.keys(RU).length}・断片 ${W12.all().length}。どの断片も手に入り、隠し部屋が開く`);
};
