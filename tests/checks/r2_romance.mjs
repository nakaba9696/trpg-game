// 恋の筋（R2）：一人 8 段以上・段が順に進む・こじれる（仲直りまで次が出ない）・18 歳未満と子どもの姿の除外・難しい道の条件・古いセーブ・
// 格の違う相手の筋（出来事）・仲間どうしの恋の掛け合い・ランダムに遊んで止まらない。仕組みは src/engine/zzzzzz_romance2.js、書き方は docs/romance.md。
const BANNED = /見世物|観客|客席|舞台|台本|言霊|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリコン|体つき|乳房|裸|抱かれ|寝床を共に/;
const TAGS = ["{n}", "{c}", "{m}", "{a}", "{b}", "{o}", "{you}", "{kin}", "{food}", "{home}", "{keep}", "{habit}", "{place}", "{name}", "{sp}", "{who}", "{boss}"];
const PART_ALL = ["ltease", "lworry"];
const PART_LOVE = ["lteased", "lworried", "jeal", "jealR"];
const AP_KEYS = ["yoi", "zalve"];

export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("恋の筋R2: " + m); };
  const D0 = G0.data;
  const P = D0.C2_PEOPLE || {};
  const A0 = (D0.R2 && D0.R2.ARCS) || {};
  const ids = G0.romanceIds();
  if (!G0.r2Topics || !G0.R2) { F("仕組み（G.r2Topics・G.R2）が無い"); return; }

  // ---------------------------------------------------------------- 1. 量と形（一人 8 段以上。告白・恋仲・求婚・結婚・暮らし・この先まで）
  const texts = [];
  const add = (w, t, h) => {
    if (typeof t === "function") { for (const hh of HEROES) add(w, t(hh, null, null), hh); return; }
    if (Array.isArray(t)) t.forEach((x) => add(w, x, h));
    else if (typeof t === "string") for (const hh of h ? [h] : HEROES) texts.push([w, G0.r2Vary(t, hh)]);
  };
  const HEROES = [
    { sex: "男", race: "human", beast: "", age: 24, band: "young", name: "テスト" }, { sex: "女", race: "elf", beast: "", age: 120, band: "old", name: "テスト" },
    { sex: "女", race: "beast", beast: "dog", age: 35, band: "mid", name: "テスト" },
  ];
  const topicText = (w, tp) => { add(w, tp.title); add(w, tp.text); (tp.replies || []).forEach((r) => { add(w, r.label); add(w, r.text); add(w, r.memo); }); };
  const replyOk = (w, tp, lo) => { const r = tp.replies || []; if (r.length < lo || r.length > 3) F(`${w}: 返し方が ${r.length} 個（${lo}〜3）`); return r; };
  for (const id of ids) {
    const A = A0[id];
    if (!A) { F(`${id}: 恋の筋（D.R2.ARCS）が無い`); continue; }
    const steps = A.steps || [];
    if (steps.length !== 10) F(`${id}: 段が ${steps.length}（10 段）`);
    steps.forEach((tp, i) => {
      const w = `${id}.${i + 1}`;
      const r = replyOk(w, tp, 2);
      topicText(w, tp);
      if (!r.some((x) => !x.hold && !x.sour)) F(`${w}: 深まる返し（hold・sour の無い返し）が無い`);
      if (i === 4 && !r.some((x) => x.m10 === "love")) F(`${w}: 告白の段に m10: "love" の返しが無い`);
      if (i === 6 && !r.some((x) => x.m10 === "vow")) F(`${w}: 求婚の段に m10: "vow" の返しが無い`);
      if (i === 9 && !(r.some((x) => x.fut === "road") && r.some((x) => x.fut === "retire"))) F(`${w}: この先の段に fut の road と retire が無い`);
    });
    if (!steps.some((tp) => (tp.replies || []).some((x) => x.sour))) F(`${id}: こじれる返し（sour）が一つも無い`);
    if (!A.mend) F(`${id}: 仲直りの話題（mend）が無い`);
    else { topicText(id + ".mend", A.mend); if (!replyOk(id + ".mend", A.mend, 2).some((x) => x.mend)) F(`${id}.mend: 仲直りになる返し（mend: true）が無い`); }
    if (!A.jeal) F(`${id}: やきもちの話題（jeal）が無い`); else { topicText(id + ".jeal", A.jeal); replyOk(id + ".jeal", A.jeal, 2); }
    if ((A.trust || []).length !== 3) F(`${id}: 信頼の筋（trust）が 3 段でない`);
    (A.trust || []).forEach((tp, i) => { topicText(`${id}.t${i + 1}`, tp); replyOk(`${id}.t${i + 1}`, tp, 2); });
    for (const k of ["love", "wed", "retire"]) if (!(A.story && [].concat(A.story[k] || []).length)) F(`${id}: 人生の物語の一行（story.${k}）が無い`); else add(`${id}.story`, A.story[k]);
    if (!A.retireSay) F(`${id}: 剣を置くときの一言（retireSay）が無い`); else add(`${id}.retire`, A.retireSay);
    // 主人公で変わる所（性別・種族・年齢のどれか）が、どこかにある
    const all = JSON.stringify(A, (k, v) => (typeof v === "function" ? "FN" + v.toString() : v));
    if (!/\{h[sra]:|FN/.test(all)) F(`${id}: 主人公の性別・種族・年齢で変わる所が無い`);
  }
  // 子どもの姿・18 歳未満の人に筋が無い
  for (const id of Object.keys(A0)) {
    const p = P[id];
    if (!p) { F(`${id}: 人物の表に無い人の筋`); continue; }
    if (!p.romance) F(`${id}: 恋の相手でない（romance が無い）人に筋がある`);
    if (p.childLook || (p.age || 0) < 18) F(`${id}: 18 歳未満・子どもの姿の人に筋がある`);
  }
  // 仲間どうしの部品
  const RP = D0.R2_PARTS || {};
  for (const id of Object.keys(P).filter((k) => P[k].join)) {
    const keys = PART_ALL.concat(P[id].romance ? PART_LOVE : []);
    for (const k of keys) {
      const l = [].concat((RP[id] || {})[k] || []);
      if (!l.length) { F(`${id}.${k}: 恋の掛け合いの部品が無い`); continue; }
      for (const s of l) {
        if (/[「」]/.test(s)) F(`${id}.${k}: 「」は書かない：${s}`);
        for (const t of s.match(/\{[^}]*\}/g) || []) if (!["{o}", "{you}"].includes(t)) F(`${id}.${k}: 知らない置き換え ${t}`);
        texts.push([`${id}.${k}`, "「" + s + "」"]);
      }
    }
  }
  const B = (D0.TALK_BANTER || []).filter((b) => /^bt_r2_/.test(b.id));
  const bline = (w, ln) => { if (Array.isArray(ln)) texts.push([w, ln[0] ? "「" + ln[1] + "」" : ln[1]]); else add(w, ln); };
  for (const b of B) {
    if (!b.when) F(`${b.id}: 恋の掛け合いに when（段の条件）が無い`);
    for (const x of [b.a, b.b, b.c].filter(Boolean)) if (!P[x]) F(`${b.id}: 人 ${x} が無い`);
    add(b.id, b.title);
    (b.lines || []).forEach((ln) => bline(b.id, ln));
    if (b.side) { add(b.id, b.side.q); ["a", "b", "none"].forEach((s) => { if (!b.side[s]) return; add(b.id, b.side[s].label); [].concat(b.side[s].text || []).forEach((ln) => bline(b.id, ln)); }); }
  }
  for (const id of ids) if (B.filter((b) => [b.a, b.b, b.c].includes(id)).length < 2) F(`${id}: 恋の手書きの掛け合い（bt_r2_）が 2 つ未満`);
  for (const [w, t] of texts) {
    if (BANNED.test(t)) F(`${w}: 書かない言葉「${t.match(BANNED)[0]}」：${t}`);
    if (/[！!]/.test(t.replace(/「[^」]*」/g, ""))) F(`${w}: 地の文に「！」：${t}`);
    for (const x of t.match(/\{[^}]*\}/g) || []) if (!TAGS.includes(x)) F(`${w}: 知らない置き換え ${x}`);
  }

  // ---------------------------------------------------------------- 遊ぶ
  const game = (seed, prof) => {
    const G = loadEngine();
    const D = G.data;
    G.rand = seeded(seed);
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: Object.assign({ name: "テスト", sex: "男", age: 24, history: "テスト用", personality: "無口" }, prof || {}) });
    const S = G.S;
    S.maxHp = S.hp = 999;
    S.loc = "nerva";
    S.mode = "explore";
    S.visited.nerva = true;
    return { G, D, S };
  };
  // その人の今の筋の話題を開いて、i 番目で返す（返しを関数で選べる）
  const talk = (G, S, c, pick) => {
    const tps = G.r2Topics(c, S);
    if (!tps.length) return null;
    const tp = tps[0];
    c.talkDay = 0;
    G.tk.open(c);
    if (!S.tk.cur) return null;
    G.tk.openTopic(tp.id);
    const i = pick ? pick(tp) : (tp.replies || []).findIndex((r) => !r.hold && !r.sour);
    G.tk.reply(Math.max(0, i));
    if (S.tk.cur) G.tk.finish();
    if (S.mode === "event") { S.mode = "explore"; S.event = null; }
    return tp;
  };
  const meetAll = (A, S, c) => Object.values((A.hard && A.hard.need) || {}).forEach((x) => x.meet && x.meet(S, c));

  // 2. 一人ずつ、段が順に 1→10 と進む（難しい道は、条件がそろうまで止まる）
  let full = 0;
  for (const id of ids.filter((x) => A0[x])) {
    const { G, S } = game(400 + full);
    const A = G.data.R2.ARCS[id];
    G.c2Join(id);
    const c = S.companions.find((x) => x.c2 === id);
    if (!c) { F(`${id}: 仲間にできない`); continue; }
    G.affState(S)[id] = Math.min(G.affOf(id, S), 0);
    if (G.r2Topics(c, S).some((t) => t.r2.type === "step")) F(`${id}: 好感度が低いうちから筋が出る`);
    let last = 0, stuck = 0, hardSeen = {};
    for (let d = 0; d < 120 && last < 10; d++) {
      S.day += 7;
      G.affState(S)[id] = Math.min(100, Math.max(G.affOf(id, S), -100) + 12);
      const need = A.hard && A.hard.need && A.hard.need[last + 1];
      const tps = G.r2Topics(c, S).filter((t) => t.r2.type === "step");
      if (need && !hardSeen[last + 1] && G.affOf(id, S) >= 100) {
        if (tps.length) F(`${id}: 難しい道の条件（${last + 1} 段）がそろわないのに、段が出る`);
        hardSeen[last + 1] = true;
        need.meet && need.meet(S, c);
        if (!need.test(S, c)) F(`${id}: 難しい道の条件（${last + 1} 段）が meet でそろわない`);
        continue;
      }
      if (last === 7 && G.m10St(c) === "vow") { G.m10Do("wed", c); }
      const tp = talk(G, S, c);
      if (!tp || tp.r2.type !== "step") { if (++stuck > 40) break; continue; }
      const now = G.r2St(id, S);
      if (now !== last + 1) { F(`${id}: 段が順に進まない（${last} → ${now}、話題 ${tp.id}）`); break; }
      last = now;
    }
    if (last < 10) F(`${id}: 筋が最後まで進まない（${last} 段で止まる。恋の間柄 ${G.m10St(c)}）`);
    else full++;
    if (A.hard && A.hard.need && !Object.keys(hardSeen).length) F(`${id}: 難しい道の条件で止まる所が無い`);
    if (A.hard && A.hard.need) for (const x of Object.values(A.hard.need)) if (!x.hint) F(`${id}: 難しい道の条件に hint が無い`);
    // 剣を置く
    if (last >= 10) {
      const p = G.r2Of(id, S);
      p.fut = "retire";
      const a = G.exploreActions().flatMap((g) => g.list).find((x) => x.id === "r2retire:" + c.id);
      if (!a) F(`${id}: 剣を置くと決めたのに「剣を置く」が出ない`);
      const life = G.m6Compose(S);
      if (life && life.life && !life.life.join("").includes(G.m2Short(c))) F(`${id}: 人生の物語に一行が入らない`);
    }
  }
  if (full) ok(`恋の筋：${full} 人が 1→10 段まで順に進む`);

  // 3. こじれる：sour の返しで、仲直りまで次の段が出ない
  {
    const { G, S } = game(77);
    G.c2Join("dil");
    const c = S.companions.find((x) => x.c2 === "dil");
    G.affState(S).dil = 60;
    let sourStep = 0;
    for (let d = 0; d < 20 && !sourStep; d++) {
      S.day += 2;
      const tp = talk(G, S, c, (t) => { const i = (t.replies || []).findIndex((r) => r.sour); return i >= 0 ? i : (t.replies || []).findIndex((r) => !r.hold && !r.sour); });
      if (tp && (tp.replies || []).some((r) => r.sour)) sourStep = tp.r2.n;
    }
    const p = G.r2Of("dil", S);
    if (!sourStep || !p.sour) F("こじれる返しを選んでも、こじれない");
    S.day += 1;
    if (G.r2Topics(c, S).some((t) => t.r2.type === "step")) F("こじれているのに、次の段が出る");
    S.day += 10;
    const m = G.r2Topics(c, S).find((t) => t.r2.type === "mend");
    if (!m) F("こじれたあと、仲直りの話題が出ない");
    else {
      talk(G, S, c, (t) => (t.replies || []).findIndex((r) => !r.mend));
      if (!p.sour) F("仲直りにならない返しで、こじれが解ける");
      S.day += 10;
      talk(G, S, c, (t) => (t.replies || []).findIndex((r) => r.mend));
      if (p.sour) F("仲直りの返しで、こじれが解けない");
      S.day += 2;
      if (!G.r2Topics(c, S).some((t) => t.r2.type === "step" && t.r2.n === sourStep + 1)) F("仲直りのあと、次の段が出ない");
    }
    // 保留（告白を考えさせて）は段が進まず、日をおいてまた出る
    const st0 = p.st;
    if (st0 >= 4) {
      while (G.r2St("dil", S) < 4) { S.day += 2; talk(G, S, c); }
      G.affState(S).dil = 90;
      S.day += 2;
      const tp = talk(G, S, c, (t) => (t.replies || []).findIndex((r) => r.hold));
      if (tp && tp.r2.n === 5 && (tp.replies || []).some((r) => r.hold)) {
        if (G.r2St("dil", S) !== 4 || G.m10St(c)) F("告白を保留しても、段が進む");
        S.day += 1;
        if (G.r2Topics(c, S).some((t) => t.r2.type === "step")) F("保留したのに、すぐに同じ段がまた出る");
        S.day += 20;
        if (!G.r2Topics(c, S).some((t) => t.r2.n === 5)) F("保留した段が、日をおいても出ない");
      }
    }
  }

  // 4. 18 歳未満の主人公には恋の筋が出ず、信頼の筋が出る。子どもの姿の人には筋が無い
  {
    const { G, S } = game(88, { age: 16 });
    G.c2Join("dil");
    const c = S.companions.find((x) => x.c2 === "dil");
    G.affState(S).dil = 90;
    S.day += 5;
    const t = G.r2Topics(c, S);
    if (t.some((x) => x.love || x.r2.type === "step")) F("16 歳の主人公に、恋の筋が出る");
    if (!t.some((x) => x.r2.type === "trust")) F("16 歳の主人公に、信頼の筋が出ない");
    let tr = 0;
    for (let d = 0; d < 10; d++) { S.day += 3; const tp = talk(G, S, c); if (tp && tp.r2.type === "trust") tr++; }
    if (tr !== 3 || G.r2Of("dil", S).tr !== 3) F(`16 歳の主人公の信頼の筋が 3 段進まない（${tr}）`);
    if (G.r2St("dil", S)) F("16 歳の主人公で、恋の段が進む");
    const { G: G2, S: S2 } = game(89);
    for (const id of ["rui", "tula", "lumia", "tsuyuha", "pipinelle"].filter((x) => P[x])) {
      G2.c2Join(id);
      const k = S2.companions.find((x) => x.c2 === id);
      if (k && G2.r2Topics(k, S2).length) F(`${id}（18 歳未満・子どもの姿）に筋の話題が出る`);
      S2.companions = [];
    }
    // 大人の主人公には、信頼の筋は出ない
    const { G: G3, S: S3 } = game(90);
    G3.c2Join("dil");
    G3.affState(S3).dil = 90;
    if (G3.r2Topics(S3.companions[0], S3).some((x) => x.r2.type === "trust")) F("大人の主人公に、信頼の筋が出る");
  }

  // 5. 古いセーブ：S.r2 が無く、すでに恋仲・連れ合い
  {
    const { G, S } = game(91);
    G.c2Join("dil");
    const c = S.companions.find((x) => x.c2 === "dil");
    G.affState(S).dil = 80;
    G.m10Do("love", c);
    delete S.r2;
    S.day += 10;
    const t = G.r2Topics(c, S).filter((x) => x.r2.type === "step");
    if (!t.length || t[0].r2.n !== 6) F(`古いセーブ（恋仲）で、筋が恋仲の段から始まらない（${t.map((x) => x.id)}）`);
    const { G: G2, S: S2 } = game(92);
    G2.c2Join("dil");
    const c2 = S2.companions[0];
    G2.affState(S2).dil = 80;
    G2.m10Do("love", c2); G2.m10Do("vow", c2); G2.m10Do("wed", c2);
    S2.r2 = undefined;
    S2.day += 10;
    const t2 = G2.r2Topics(c2, S2).filter((x) => x.r2.type === "step");
    if (!t2.length || t2[0].r2.n !== 8) F(`古いセーブ（連れ合い）で、筋が結婚の段から始まらない（${t2.map((x) => x.id)}）`);
    // M10 の告白は、すれ違いの段のあとだけ
    const { G: G3, S: S3 } = game(93);
    G3.c2Join("dil");
    const c3 = S3.companions[0];
    G3.m10Of(c3).st = "spark";
    c3.bond = 95;
    if (G3.m10P.confess(c3, S3)) F("筋が始まる前に、M10 の告白が起きる");
    G3.r2Of("dil", S3).st = 4;
    if (!G3.m10P.confess(c3, S3)) F("すれ違いの段のあと、M10 の告白が起きない");
  }

  // 6. 仲間どうし：恋仲の相手をからかう・張り合う型の掛け合いが組める。やきもちの話題
  {
    const { G, S } = game(94);
    G.c2Join("dil"); G.c2Join("ilse");
    const [c1, c2] = S.companions;
    G.affState(S).dil = 80; G.affState(S).ilse = 80;
    G.m10Do("love", c1);
    G.r2Of("dil", S).st = 6;
    G.r2Of("ilse", S).st = 3;
    G.tk.relAdd("dil", "ilse", 30, S); // 始まりの間柄（−15）では冷やかしの線（−10）に届かないので、少し打ち解けたことにする
    const ty = G.r2Typed("ilse", "dil", S);
    if (!ty.some((b) => b.typed === "r2tease")) F("恋仲の相手を、ほかの仲間がからかう型が組めない");
    if (!ty.some((b) => b.typed === "r2rival")) F("恋の筋の進んだ二人の、張り合いの型が組めない");
    for (const b of ty) for (const ln of b.lines) { const t = G.tk.banterLine(b, ln, S); if (/\{[a-z]+\}|undefined/.test(t)) F(`型の掛け合いが文にならない：${t}`); }
    S.day += 3;
    const j = G.r2Topics(c2, S).find((x) => x.r2.type === "jeal");
    if (!j) F("恋の相手が二人いるのに、やきもちの話題が出ない");
    else if (j.mate !== "dil") F("やきもちの話題の相手が違う");
    // 全員の部品で型が組める
    let bad = 0;
    const made = Object.fromEntries(Object.keys(P).filter((k) => P[k].join).map((k) => [k, G.c2Make(k)]));
    for (const a of Object.keys(made)) for (const b of ids) {
      if (a === b) continue;
      for (const tp of G.R2.TYPES) {
        if (tp.k === "r2rival" && !ids.includes(a)) continue;
        S.companions = [made[a], made[b]];
        const ln = G.r2Build(tp, a, b, "t");
        if (!ln) { if (bad++ < 5) F(`${a}→${b}: 恋の型「${tp.title}」が組めない`); continue; }
        for (const x of ln) { const t = G.tk.banterLine({ id: "t", a, b, lines: ln }, x, S); if (/\{[a-z]+\}|undefined/.test(t) && bad++ < 5) F(`${a}→${b}: 文にならない：${t}`); }
      }
    }
  }

  // 7. 格の違う相手（出来事の筋）：8 段以上・出来事がある・順に並ぶ
  {
    const AP = (D0.R2 && D0.R2.AP) || {};
    const evIds = new Set(D0.EVENTS.map((e) => e.id));
    for (const k of AP_KEYS) {
      const L = AP[k] || [];
      if (L.length < 8) F(`格の違う相手 ${k}: 筋の段が ${L.length}（8 以上）`);
      for (const e of L) if (!evIds.has(e)) F(`格の違う相手 ${k}: 出来事 ${e} が無い`);
      if (!(D0.R2.AP_HINT || {})[k]) F(`格の違う相手 ${k}: 難しい道の条件の手がかり（D.R2.AP_HINT）が無い`);
    }
  }

  // 8. ランダムに遊んで止まらない（恋の相手を連れて、好感度を高くして）
  {
    let errs = 0, steps = 0;
    for (let s = 0; s < 6; s++) {
      const { G, S } = game(1200 + s, { sex: s % 2 ? "女" : "男" });
      const rnd = seeded(5000 + s);
      const two = [ids[(s * 3) % ids.length], ids[(s * 3 + 7) % ids.length]].filter((x) => A0[x]);
      two.forEach((id) => { G.c2Join(id); G.affState(S)[id] = 70; });
      S.gold = 2000;
      for (let t = 0; t < 400 && !S.over; t++) {
        try {
          if (S.mode === "explore" && t % 5 === 0) { const c = S.companions.find((x) => G.r2Has(x) && x.talkDay !== S.day); if (c) G.m2Talk(c.id); }
          const list = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled && !/^r2retire|^retire/.test(a.id));
          if (!list.length) break;
          G.act(list[Math.floor(rnd() * list.length)].id);
          S.hp = Math.max(S.hp, 1);
          steps++;
        } catch (e) { if (errs++ < 3) F(`ランダムに遊んで例外：${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" ") : e}`); break; }
      }
      for (const id of two) { const p = S.r2 && S.r2.p && S.r2.p[id]; if (p && (p.st < 0 || p.st > 10)) F(`${id}: 段が範囲の外（${p.st}）`); }
    }
    if (!errs) ok(`恋の筋：ランダムに ${steps} 手遊んで止まらない`);
  }

  if (!n) ok(`恋の筋（R2）：${ids.length} 人・掛け合い ${B.length}`);
};
