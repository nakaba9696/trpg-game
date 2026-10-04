// C9：仲間の頼みごと（src/engine/zzzzzz_c9.js・src/data/quest_c9_*.js・docs/quests.md）
// - 48 人全員（会話の表のある仲間）に頼みごとがある。3〜5 段。結末 2 つ以上、どの結末にも届く道がある
// - 各段：行き先（場所）・相手（名のある人か敵）が実在する。解き方（判定・戦い）と判定なしの道がある。頼まれる話題の返しが 2〜3 個
// - ほかの仲間が絡む段が一人一つ以上（相手は仲間になる人。その仲間の選択肢がある）
// - 結末でその人が変わる（台詞・声のかけ方・話題・能力・人生の物語の一行）。恋の段を書いていない。18 歳未満・子どもの姿の人に酒と色恋が無い
// - 見せる文：書かない言葉が無い。地の文が叫ばない。置き換えが残らない
// - 遊ぶ：好感度を上げて話すと段が開き、行き先で出来事が起き、最後の段で結末になる。図鑑に残る。ほかの仲間の選択肢で間柄が動く
// - 周回の手がかり：結末ごとに覚え書きの元（hint）があり、冒険をまたいで残り、次の冒険で頼まれたときに出る。持っていく物で開く選択肢と、痛い失敗が一人一つ以上
// - 古いセーブ（S.q9・S.tk が無い）で動く。ランダムに遊んでも止まらない
const BANNED = /見世物|観客|客席|舞台|台本|言霊|神々|魔王|魔人|正体|もういない|胸|童貞|貧乳|巨乳|ナイスバディ|ロリ|体つき|裸|下着|情欲|色気/;
const TONES = ["earnest", "tease", "joke", "praise", "sweet", "scold", "cold", "quiet"];
const QFILL = ["{n}", "{m}", "{you}"];
const TFILL = ["{n}", "{c}", "{m}", "{you}", "{kin}", "{food}", "{home}", "{keep}", "{habit}", "{place}"];

export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C9: " + m); };
  const D0 = G0.data;
  const Q = D0.Q9 || {};
  const P = D0.C2_PEOPLE || {};
  const T = D0.TALK || {};
  const people = Object.keys(T).filter((id) => P[id] && P[id].join);

  // ---------------------------------------------------------------- 顔ぶれ
  if (people.length < 48) F(`会話の表のある仲間が ${people.length} 人（48 人のはず）`);
  for (const id of people) if (!Q[id]) F(`${id}: 頼みごとが無い`);
  for (const id of Object.keys(Q)) if (!P[id] || !P[id].join) F(`${id}: 頼みごとの人が仲間になる人でない`);

  // ---------------------------------------------------------------- 一人ずつの形
  const texts = [];
  const add = (w, t, fills) => { if (Array.isArray(t)) t.forEach((x) => add(w, x, fills)); else if (typeof t === "string") texts.push([w, t, fills]); };
  const validWho = (w) => {
    if (typeof w === "string") return !!(P[w] || D0.ENEMIES[w]);
    if (w && typeof w === "object") return w.foe ? !!D0.ENEMIES[w.foe] : !!(w.name && w.kind);
    return false;
  };
  const counts = [];
  let totalEnds = 0, totalSteps = 0;
  for (const [id, q] of Object.entries(Q)) {
    const w = (x) => `${id}${x}`;
    const steps = q.steps || [];
    if (!q.title) F(w(": 題が無い"));
    add(w(".title"), q.title, QFILL);
    if (steps.length < 3 || steps.length > 5) F(w(`: 段が ${steps.length}（3〜5）`));
    const ends = Object.keys(q.ends || {});
    if (ends.length < 2) F(w(`: 結末が ${ends.length}（2 以上）`));
    totalSteps += steps.length;
    totalEnds += ends.length;
    counts.push(`${P[id] ? P[id].short || P[id].name : id} ${steps.length}段${ends.length}結`);
    let mates = 0, prevMin = -100, needs = 0, hints = 0, hurts = 0;
    const reach = new Set(), hinted = new Set();
    steps.forEach((st, i) => {
      const s = w(`[${i + 1}]`);
      const last = i === steps.length - 1;
      if (st.min !== undefined && st.min < prevMin) F(`${s}: 好感度の段（min）が前の段より低い`);
      if (st.min !== undefined) prevMin = st.min;
      const at = [].concat(st.at || []);
      if (!at.length) F(`${s}: 行き先が無い`);
      for (const l of at) if (!D0.LOCS[l]) F(`${s}: 行き先 ${l} が無い`);
      if (!validWho(st.who)) F(`${s}: 相手 ${JSON.stringify(st.who)} が名のある人でも敵でもない`);
      if (!st.title || !st.text) F(`${s}: 見出しか本文が無い`);
      add(s, [st.title, st.text, st.mateText], QFILL);
      const a = st.ask || {};
      if (!a.title || !a.text) F(`${s}: 頼まれる話題（ask）の見出しか文が無い`);
      add(s + ".ask", [a.title, a.text], TFILL);
      const rs = a.replies || [];
      if (rs.length < 2 || rs.length > 3) F(`${s}: 頼まれる話題の返しが ${rs.length} 個（2〜3）`);
      rs.forEach((r, ri) => { if (!TONES.includes(r.tone)) F(`${s}.ask[${ri}]: 返し方 ${r.tone} が無い`); if (!r.label || !r.text) F(`${s}.ask[${ri}]: 返しの文が無い`); add(s + ".ask", [r.label, r.text], TFILL); });
      if (!rs.some((r) => (r.aff || 0) > 0)) F(`${s}: 頼まれる話題に、喜ぶ返し（aff > 0）が無い`);
      if (st.mate) {
        mates++;
        if (!(P[st.mate] || {}).join || st.mate === id) F(`${s}: ほかの仲間 ${st.mate} が仲間になる人でない`);
        if (!(st.choices || []).some((c) => c.mate)) F(`${s}: ほかの仲間の選択肢（mate: true）が無い`);
        if (!st.mateText) F(`${s}: ほかの仲間がいるときの文（mateText）が無い`);
      }
      const cs = (st.choices || []).filter((c) => !c.mate && !c.need);
      const rolls = cs.filter((c) => c.stat || c.fight);
      const free = cs.filter((c) => !c.stat && !c.fight);
      for (const c of st.choices || []) if (c.need) { needs++; if (!c.need.item || !D0.ITEMS[c.need.item]) F(`${s}: 持っていく物 ${JSON.stringify(c.need)} が無い`); }
      if (rolls.length < 2 || rolls.length > 3) F(`${s}: 解き方（判定・戦い）が ${rolls.length}（2〜3）`);
      if (!free.length) F(`${s}: 判定なしの道が無い`);
      (st.choices || []).forEach((c, ci) => {
        const cw = `${s}.c${ci}`;
        add(cw, c.label, QFILL);
        if (c.stat && !D0.STATS.includes(c.stat)) F(`${cw}: 能力値 ${c.stat} が無い`);
        if (c.diff && D0.DIFF[c.diff] === undefined) F(`${cw}: 難易度 ${c.diff} が無い`);
        if (c.stat && !c.ng) F(`${cw}: 判定に失敗したときの結果（ng）が無い`);
        if (c.fight) { for (const f of [].concat(c.fight)) if (!D0.ENEMIES[f]) F(`${cw}: 敵 ${f} が無い`); if (!c.win) F(`${cw}: 勝ったときの結果（win）が無い`); }
        if (!c.fight && !c.ok) F(`${cw}: 結果（ok）が無い`);
        for (const [k, o] of [["ok", c.ok], ["ng", c.ng], ["win", c.win]]) {
          if (!o) continue;
          add(`${cw}.${k}`, [o.text, o.memo, o.hint], QFILL);
          if (o.hint) { hints++; if (last && o.end) hinted.add(o.end); }
          if ((o.hp || 0) <= -6) hurts++;
          for (const it of Object.keys(typeof o.item === "string" ? { [o.item]: 1 } : o.item || {})) if (!D0.ITEMS[it]) F(`${cw}.${k}: 物 ${it} が無い`);
          if (o.fight) F(`${cw}.${k}: 結果の中で戦わない（戦いは選択肢の fight に）`);
          if (last) { if (!o.end || !ends.includes(o.end)) F(`${cw}.${k}: 最後の段の結果に結末（end）が無いか、知らない結末 ${o.end}`); else reach.add(o.end); }
          else if (o.end) F(`${cw}.${k}: 最後の段でないのに結末（end）がある`);
        }
      });
    });
    if (!mates) F(w(": ほかの仲間が絡む段が無い"));
    for (const [k, e] of Object.entries(q.ends || {})) if (e.hint) { hints++; hinted.add(k); add(w(`.ends.${k}.hint`), e.hint, QFILL); }
    for (const k of ends) if (!hinted.has(k)) F(w(`: 結末 ${k} への覚え書きの元（hint）が無い`));
    if (hints < 4) F(w(`: 覚え書きの元（hint）が ${hints}（4 以上）`));
    if (!needs) F(w(": 持っていく物で開く選択肢（need）が無い"));
    if (!hurts) F(w(": 痛い失敗（hp −6 以下）が無い"));
    for (const k of ends) if (!reach.has(k)) F(w(`: 結末 ${k} に届く選択肢が無い`));
    for (const [k, e] of Object.entries(q.ends || {})) {
      const ew = w(`.ends.${k}`);
      if (!e.name || !e.text || !e.line) F(`${ew}: 名前・余韻の文・人生の物語の一行（line）のどれかが無い`);
      if (!(e.greet || []).length || !(e.talk || []).length) F(`${ew}: 声のかけ方（greet）か、ひとこと（talk）が無い`);
      if (!(e.topics || (e.topic ? [e.topic] : [])).length) F(`${ew}: 結末のあとの話題が無い`);
      if (!(e.power || e.dmg || e.heal || e.fire || (e.t && Object.keys(e.t).length))) F(`${ew}: 能力が変わらない`);
      if (e.t) F(`${ew}: 才（t）が残っている`);
      add(ew, [e.name, e.codex, e.text, e.memo], QFILL);
      add(ew + ".line", e.line, ["{who}", "{name}"]);
      add(ew + ".greet", [e.greet, e.talk], TFILL);
      for (const t of e.topics || (e.topic ? [e.topic] : [])) {
        add(ew + ".topic", [t.title, t.text], TFILL);
        if ((t.replies || []).length < 2 || t.replies.length > 3) F(`${ew}: 結末のあとの話題の返しが 2〜3 個でない`);
        (t.replies || []).forEach((r) => { if (!TONES.includes(r.tone)) F(`${ew}: 返し方 ${r.tone} が無い`); add(ew + ".topic", [r.label, r.text], TFILL); });
      }
      for (const b of e.banter || []) {
        if (!(P[b.b] || {}).join || b.b === id) F(`${ew}: 掛け合いの相手 ${b.b} が仲間になる人でない`);
        if ((b.lines || []).length < 2 || b.lines.length > 6) F(`${ew}: 掛け合いが 2〜6 行でない`);
        add(ew + ".banter", b.title, TFILL);
        for (const ln of b.lines || []) texts.push([ew + ".banter", Array.isArray(ln) && ln[0] ? "「" + ln[1] + "」" : Array.isArray(ln) ? ln[1] : ln, TFILL.concat(["{a}", "{b}"])]);
      }
    }
    // 恋の段は書かない（R2）。18 歳未満・子どもの姿の人には酒と色恋を筋にしない
    const raw = JSON.stringify(q);
    if (/"love"\s*:\s*true/.test(raw)) F(w(": 恋の印（love: true）がある（恋の段は R2 が書く）"));
    const p = P[id] || {};
    if ((p.age || 0) < 18 && /酒|恋|口づけ|嫁|婿/.test(raw)) F(w(": 18 歳未満の人の頼みごとに、酒か色恋の言葉がある"));
    if (p.childLook && /恋|口づけ|嫁|婿/.test(raw)) F(w(": 子どもの姿の人の頼みごとに、色恋の言葉がある"));
  }
  for (const [w, t, fills] of texts) {
    if (BANNED.test(t)) F(`${w}: 書かない言葉「${t.match(BANNED)[0]}」：${t.slice(0, 60)}`);
    const out = t.replace(/「[^」]*」/g, "");
    if (/[！!]/.test(out)) F(`${w}: 地の文に「！」：${t.slice(0, 60)}`);
    for (const x of t.match(/\{([a-z0-9_]+)\}/g) || []) if (!fills.includes(x)) F(`${w}: 知らない置き換え ${x}`);
  }

  // ---------------------------------------------------------------- 遊ぶ：一人ずつ、結末を全部見る
  const G = loadEngine();
  const D = G.data;
  G.rand = seeded(909);
  G.P = { trophies: {}, graves: [] };
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 60]));
  const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
  const fresh = (i, mates) => {
    G.newGame({ cls: Object.keys(D.CLASSES)[i % Object.keys(D.CLASSES).length], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: i % 2 ? "女" : "男", age: 24, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999;
    S.gold = 999;
    S.mode = "explore";
    mates.forEach((m) => G.c2Join(m));
    G.tkState(S);
    return S;
  };
  const leftover = (S) => S.log.some((l) => /\{[a-z0-9_]+\}/.test(l.text || ""));
  let played = 0, relMoved = 0;
  Object.entries(Q).forEach(([id, q], qi) => {
    const ends = Object.keys(q.ends || {});
    const mateOf = (q.steps.find((s) => s.mate) || {}).mate;
    ends.forEach((k, ki) => {
      const withMate = ki === 0 && mateOf;
      const S = fresh(qi + ki, withMate ? [id, mateOf] : [id]);
      const c = S.companions.find((x) => x.c2 === id);
      if (!c) { F(`${id}: 仲間にならない`); return; }
      const power0 = c.power;
      try {
        for (let i = 0; i < q.steps.length; i++) {
          const st = q.steps[i];
          S.day += 2;
          S.mode = "explore"; S.event = null;
          G.affState(S)[id] = 90;
          if (withMate) G.affState(S)[mateOf] = 60;
          // 最初の段は、身の上を二段目まで聞いてから
          if (i === 0) {
            if (G.q9.canAsk(id, 0, S)) F(`${id}: 身の上を聞く前に、最初の段が頼まれる`);
            T[id].topics.filter((t) => t.kind === "past" && !t.q9end && t.step <= 2).forEach((t) => (S.tk.heard[t.id] = { day: S.day, k: "", seq: 0 }));
          }
          // 話す：一覧に頼みごとの段が出る
          c.talkDay = 0;
          G.m2Talk(c.id);
          const tid = G.q9.topicId(id, i);
          const mi = S.tk.cur ? S.tk.cur.menu.indexOf(tid) : -1;
          if (S.event !== "tk_menu" || mi < 0) { F(`${id}[${i + 1}]: 話すと、一覧に頼みごとの段が出ない（${S.event} ${S.tk.cur && S.tk.cur.menu.join(",")}）`); return; }
          G.act("ev:" + mi);
          if (S.event !== "tk_topic") { F(`${id}[${i + 1}]: 頼みごとの話題が開かない`); return; }
          G.act("ev:0");
          if (ki > 0 && G.q9.notes(id, i).length && !S.memos.some((m) => m.startsWith("前の冒険の覚え書き："))) F(`${id}[${i + 1}]: 二度目の冒険で、前の冒険の覚え書きが出ない`);
          if (S.mode === "event") { const e = G.actions()[0].list.findIndex((a) => a.label === "話を切り上げる"); if (e >= 0) G.act("ev:" + e); }
          if (S.mode === "event") { S.mode = "explore"; S.event = null; S.tk.cur = null; }
          // 行き先で、行動の欄に出る
          const at = [].concat(st.at)[0];
          if (G.exploreActions().flatMap((g) => g.list).some((a) => a.id === "q9:" + id) && S.loc !== at) F(`${id}[${i + 1}]: 行き先でない所で頼みごとの行動が出る`);
          S.loc = at; S.visited[at] = true; S.depth = 0;
          const act = G.exploreActions().flatMap((g) => g.list).find((a) => a.id === "q9:" + id);
          if (!act) { F(`${id}[${i + 1}]: 行き先 ${at} で、頼みごとの行動が出ない`); return; }
          G.act("q9:" + id);
          if (S.event !== G.q9.eventId(id, i)) { F(`${id}[${i + 1}]: 頼みごとの出来事が始まらない（${S.event}）`); return; }
          const e = D.EVENTS.find((x) => x.id === S.event);
          const chs = e.choices;
          const avail = G.eventChoices().map((x) => x.i);
          let pick = -1, out = null;
          const last = i === q.steps.length - 1;
          if (withMate && st.mate === mateOf) { pick = chs.findIndex((x, xi) => x.mate && avail.includes(xi)); if (pick < 0) F(`${id}[${i + 1}]: ほかの仲間がいるのに、その選択肢が出ない`); }
          if (!(withMate && st.mate === mateOf) && st.mate && !S.companions.some((x) => x.c2 === st.mate) && chs.some((x, xi) => x.mate && avail.includes(xi))) F(`${id}[${i + 1}]: ほかの仲間がいないのに、その選択肢が出る`);
          if (last) {
            // 結末 k に届く結果を当てはめる（判定と戦いは結果だけ）
            for (let xi = 0; xi < chs.length && !out; xi++) {
              if (!avail.includes(xi)) continue;
              for (const o of [chs[xi].ok, chs[xi].ng, chs[xi].win]) if (o && o.q9 && o.q9.end === k) { out = o; pick = xi; break; }
            }
            if (!out) { F(`${id}: 結末 ${k} に届かない`); return; }
          } else if (pick < 0) pick = chs.findIndex((x, xi) => !x.stat && !x.fight && !x.mate && !x.need && avail.includes(xi));
          const rel0 = withMate ? G.tk.rel(id, mateOf, S) : 0;
          const ch = chs[pick];
          if (!out && (ch.stat || ch.fight)) out = ch.fight ? ch.win : ch.ok;
          if (out) { if (ch.cost) S.gold -= ch.cost; S.mode = "explore"; S.event = null; G.apply(out); }
          else G.act("ev:" + pick);
          if (S.combat) { F(`${id}[${i + 1}]: 判定なしの道で戦いになった`); return; }
          if (S.q9[id].n !== i + 1) { F(`${id}[${i + 1}]: 段が済まない`); return; }
          if (withMate && st.mate === mateOf && ch.mate && G.tk.rel(id, mateOf, S) > rel0) relMoved++;
          else if (withMate && st.mate === mateOf && ch.mate) F(`${id}[${i + 1}]: ほかの仲間の選択肢で、二人の間柄が動かない`);
          // 同じ日のうちには次の段を頼まれない
          if (i < q.steps.length - 1 && G.tkTopics && G.q9.canAsk(id, i + 1, S)) F(`${id}[${i + 1}]: 段を済ませた日に、次の段が頼まれる`);
        }
        const e = q.ends[k];
        if (G.q9End(id, S) !== k) { F(`${id}: 結末が ${G.q9End(id, S)}（${k} のはず）`); return; }
        if (!((G.P.q9 || {})[id] || {})[k]) F(`${id}.${k}: 図鑑に結末が残らない`);
        if (!G.q9.notes(id).length) F(`${id}.${k}: 覚え書きが冒険をまたいで残らない`);
        if (!G.codexPersonLines(id).some((t) => t.includes(e.name))) F(`${id}.${k}: 図鑑の人物の頁に結末が出ない`);
        if (JSON.stringify(G.m2Trait(c).talk) !== JSON.stringify(e.talk)) F(`${id}.${k}: ひとことが結末のものにならない`);
        if (JSON.stringify(G.tk.data(c).greet.warm) !== JSON.stringify(e.greet)) F(`${id}.${k}: 声のかけ方が結末のものにならない`);
        if (!G.tkTopics(c, S).some((t) => t.q9end === k)) F(`${id}.${k}: 結末のあとの話題が出ない`);
        if (e.power && c.power === power0) F(`${id}.${k}: 力が変わらない`);
        if (e.banter && e.banter.length && withMate && e.banter.some((b) => b.b === mateOf) && !G.tk.banters(S).some((b) => b.id.startsWith(`bt_q9_${id}_${k}`))) F(`${id}.${k}: 結末のあとの掛け合いが起きない`);
        const story = G.m6Compose(S);
        const frag = String(e.line).replace(/\{name\}/g, "テスト").replace(/\{who\}/g, P[id].short || P[id].name).slice(0, 12);
        if (!story || !story.life.join("").includes(frag)) F(`${id}.${k}: 人生の物語に結末の一行が入らない`);
        if (leftover(S)) F(`${id}.${k}: 記録に {n} などが残る：${S.log.find((l) => /\{[a-z0-9_]+\}/.test(l.text || "")).text.slice(0, 60)}`);
        played++;
      } catch (err) {
        F(`${id}.${k}: 遊んでいる途中で例外 ${err.stack || err}`);
      }
    });
  });
  // 二度目の冒険で別の結末を見ると、図鑑に二つ並ぶ（上の遊びは一つの profile を使い回している）
  const multi = Object.keys(Q).filter((id) => Object.keys((G.P.q9 || {})[id] || {}).length >= 2).length;
  if (multi < Object.keys(Q).length) F(`図鑑に結末が二つ以上並ばない人がいる（${multi}／${Object.keys(Q).length}）`);

  // ---------------------------------------------------------------- 古いセーブ
  try {
    const S = fresh(1, ["dil"]);
    delete S.q9; delete S.tk;
    G.affState(S).dil = 90;
    G.exploreActions();
    G.endTurn();
    S.companions[0].talkDay = 0;
    G.m2Talk(S.companions[0].id);
    if (!S.q9 || typeof S.q9 !== "object") F("古いセーブ（S.q9 が無い）で、状態が埋まらない");
    S.mode = "explore"; S.event = null; if (S.tk) S.tk.cur = null;
    const old = JSON.parse(JSON.stringify(S));
    G.S = old;
    G.m6Compose(old);
  } catch (err) { F(`古いセーブで例外 ${err.stack || err}`); }

  // ---------------------------------------------------------------- ランダムに遊ぶ（行き先へ寄せながら）
  let stuck = 0, turns = 0;
  const ids = Object.keys(Q);
  for (let g = 0; g < 2; g++) {
    const G2 = loadEngine();
    G2.rand = seeded(9300 + g);
    G2.P = { trophies: {}, graves: [] };
    const D2 = G2.data;
    const r = G2.rand;
    G2.newGame({ cls: Object.keys(D2.CLASSES)[g % Object.keys(D2.CLASSES).length], stats, caps, goal: Object.keys(D2.GOALS)[0], profile: { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口" } });
    const S = G2.S;
    S.maxHp = S.hp = 400; S.gold = 500;
    const team = [ids[(g * 7) % ids.length], ids[(g * 7 + 3) % ids.length], ids[(g * 7 + 5) % ids.length]];
    team.forEach((id) => G2.c2Join(id));
    try {
      for (let k = 0; k < 300 && !S.over; k++) {
        team.forEach((id) => { if (G2.c2In(id, S)) G2.affState(S)[id] = 80; });
        if (S.mode === "explore" && !S.travel && r() < 0.08) {
          const id = team[Math.floor(r() * team.length)];
          const st = D2.Q9[id].steps[Math.min(G2.q9State(S)[id] ? G2.q9State(S)[id].n : 0, D2.Q9[id].steps.length - 1)];
          S.loc = [].concat(st.at)[0]; S.visited[S.loc] = true; S.depth = 0;
        }
        const acts = G2.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
        if (!acts.length) { if (S.mode === "event") { stuck++; break; } continue; }
        const q9 = acts.filter((a) => /^q9:/.test(a.id) || /頼み/.test(a.label));
        const a = q9.length && r() < 0.7 ? q9[0] : acts[Math.floor(r() * acts.length)];
        G2.act(a.id);
        turns++;
        if (S.hp < 50) S.hp = 400;
      }
    } catch (err) { F(`ランダムに遊んでいる途中で例外 ${err.stack || err}`); }
  }
  if (stuck) F(`ランダムに遊ぶと、選択肢の無い出来事で止まる（${stuck} 回）`);

  if (!n) ok(`C9：頼みごと ${Object.keys(Q).length} 人・${totalSteps} 段・結末 ${totalEnds}（${counts.join("・")}）。結末まで ${played} 回遊んだ・間柄が動いた ${relMoved}・ランダム ${turns} 手番`);
};
