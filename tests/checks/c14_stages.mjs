// C14：関係の段（src/engine/zzzzzzzzzzzzzzzz_c14_stages.js・src/data/c14_stages.js）
// - 表：段の上限は上がっていき、C13 の節目（30・55・80）が段の上限と同じ
// - 上限：好感度は今の段の上限を超えて上がらない（話す・出来事・仲間の bond のどれでも）。下がる分はそのまま
// - 道：仲間になる人は一人残らず、身の上話と頼みごとを進め、節目の出来事を済ませて、最後の段まで届く。
//   その途中で要る話題・頼みごとの好感度は、その時の段の上限で届く（上限で詰まらない）
// - 手がかり：上限で止まって関係の出来事が足りないとき、「絆」に薄く出て、何をすれば進むかが添えられる
// - 古いセーブ：好感度だけのセーブは今の値に合う段に置かれ、上限を超えていても下がらない
// - 仲間にならない人は、日数だけでは進まず、会った場所の段の出来事（C15）で最後の段まで
// - 結婚：最後の段の前は誓い・式に進まない。恋の相手の決まりは今のまま
// （褒美が強いかどうかは確かめない。持ち主の方針：キャラに沿った褒美）
const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口だが義理堅い" };

export default ({ G, fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("C14: " + m); };
  const D = G.data;
  const ST = D.C14.STAGES;
  const P = D.C2_PEOPLE;
  const mates = Object.keys(P).filter((id) => P[id].join);

  // ---------------------------------------------------------------- 表
  for (let i = 1; i < ST.length; i++) if (!(ST[i].cap > ST[i - 1].cap)) F(`段 ${ST[i].name} の上限が上がっていない`);
  if (ST[ST.length - 1].cap !== 100) F("最後の段の上限が 100 でない");
  const tiers = new Set(Object.values(D.C13_BOND).flat().map((t) => t.at));
  for (const at of tiers) if (!ST.some((s) => s.cap === at)) F(`C13 の節目 ${at} が段の上限と一致しない（二重の仕組みになる）`);

  // 上限で詰まらない：段 k へ進むのに要る話題・頼みごとの好感度が、段 k−1 の上限以下
  const capBefore = (k) => ST[k - 1].cap;
  for (const id of mates) {
    const past = (D.TALK[id] || { topics: [] }).topics.filter((t) => t.kind === "past" && t.step > 0);
    const q = (D.Q9 || {})[id];
    for (const [k, need] of Object.entries(D.C14.NEED)) {
      if (need.past) for (const t of past) if (t.step <= need.past && (t.min || 0) > capBefore(+k)) F(`${id}: 身の上話 ${t.id}（好感度 ${t.min}）が、${ST[k - 1].name}の上限 ${capBefore(+k)} を超える`);
      if (need.q9 && q) {
        const n = need.q9 === "end" ? q.steps.length : need.q9 === "half" ? Math.ceil(q.steps.length / 2) : need.q9;
        q.steps.slice(0, n).forEach((s, i) => { const m = s.min ?? [10, 25, 40, 55, 65][i]; if (m > capBefore(+k)) F(`${id}: 頼みごとの ${i + 1} 段目（好感度 ${m}）が、${ST[k - 1].name}の上限を超える`); });
      }
    }
  }

  // ---------------------------------------------------------------- 遊んで確かめる
  let g = null;
  const start = (cls) => {
    g = loadEngine();
    g.rand = seeded(1414);
    g.P = { trophies: {}, graves: [] };
    const st = {}, caps = {};
    g.data.STATS.forEach((k) => { st[k] = 60; caps[k] = 80; });
    g.newGame({ cls: cls || "mage", stats: st, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
    g.S.maxHp = g.S.hp = 999; g.S.gold = 3000; g.S.day = 10;
  };
  const join = (id) => {
    g.S.loc = P[id].join.home[0]; g.S.visited[g.S.loc] = true; g.S.mode = "explore";
    if (!g.c2Join(id)) { F(`${id}: 仲間に加わらない`); return false; }
    return true;
  };
  const aff = (id) => g.affOf(id);
  const pump = (id) => { for (let i = 0; i < 40; i++) g.affAdd(id, 20, true); }; // Q8 で割り引かれるので何度も
  const heard = (id, upTo) => {
    const tk = (g.S.tk = g.S.tk || {}); tk.heard = tk.heard || {};
    g.data.TALK[id].topics.filter((t) => t.kind === "past" && t.step <= upTo).forEach((t) => { tk.heard[t.id] = { day: 1, k: "x", seq: 0 }; });
  };
  // C15 の段の深い話（あれば）を、段 upTo まで聞いたことにする
  const deep = (id, upTo) => {
    const tk = (g.S.tk = g.S.tk || {}); tk.heard = tk.heard || {};
    for (let k = 0; k <= upTo; k++) if (g.c15 && g.c15.hasTalk(id)) tk.heard[g.c15.topicId(id, k)] = { day: 1, k: "x", seq: 0 };
  };
  const q9 = (id, n, end) => { const q = g.data.Q9[id]; if (!q) return; g.S.q9 = g.S.q9 || {}; g.S.q9[id] = { n: Math.min(n, q.steps.length), day: 1, r: [], end: end ? Object.keys(q.ends || {})[0] || "done" : undefined }; };
  const acts = () => g.actions().flatMap((x) => x.list);
  const bondAct = (id) => acts().find((a) => typeof a.id === "string" && a.id.startsWith(`c13:${id}:`));
  const lucky = (f) => { const r = g.rand; g.rand = () => 0.01; try { return f(); } finally { g.rand = r; } };
  // 呼ばれた節目の出来事を済ませる（依頼は頼まれたあと場所へ）
  const playTier = (id) => {
    for (let n = 0; n < 4; n++) {
      g.S.day += 4; g.S.mode = "explore"; g.S.event = null; g.S.combat = null;
      const x = g.c13.next(id);
      if (x && x.t.kind === "quest" && g.S.c13 && g.S.c13.ask[id] === x.i) { const l = [].concat(x.t.loc)[0]; g.S.loc = l; g.S.visited[l] = true; }
      if (g.k1 && g.k1.state().lesson != null) g.k1.state().lesson = -999;
      const a = bondAct(id);
      if (!a || a.disabled) return a ? a.sub : "出ない";
      const before = (g.S.c13 && g.S.c13.done[id] || []).length;
      g.act(a.id);
      const ch = acts().filter((c) => c.id.startsWith("ev:") && !c.disabled);
      if (!ch.length) return "選択肢が無い";
      lucky(() => g.act(ch[0].id));
      if ((g.S.c13.done[id] || []).length > before) return "";
    }
    return "済まない";
  };

  let reached = 0;
  for (const id of mates) {
    start();
    if (!join(id)) continue;
    // 上限：いくら上げても今の段の上限まで
    pump(id);
    if (g.c14.stage(id) === 0) { deep(id, 0); pump(id); } // 顔見知り→知人は深い話（あれば）を聞いて
    const k0 = g.c14.stage(id);
    if (aff(id) > g.c14.capOf(k0)) F(`${id}: 好感度 ${aff(id)} が段「${g.c14.nameOf(k0)}」の上限を超えた`);
    // 段ごとに：関係の出来事を済ませる前は上限で止まり、手がかりが出る → 済ませて節目の出来事 → 次の段
    const steps = [[2, 3, 1], [3, 5, "half"], [4, 6, "end"]];
    let okPath = true;
    for (const [k, past, qn] of steps) {
      if (g.c14.stage(id) < k - 1) { F(`${id}: 段 ${k - 1} の前で止まった（${g.c14.nameOf(g.c14.stage(id))}）`); okPath = false; break; }
      pump(id);
      if (aff(id) > g.c14.capOf(k - 1)) F(`${id}: ${g.c14.nameOf(k - 1)}の上限を超えた（${aff(id)}）`);
      if (k === 2) {
        const a = bondAct(id);
        if (!a || !a.disabled || !a.sub) F(`${id}: 上限で関係の出来事が足りないのに、手がかりが出ない`);
      }
      const q = g.data.Q9[id];
      heard(id, past);
      deep(id, k - 1);
      q9(id, qn === "end" ? 99 : qn === "half" ? Math.ceil(q.steps.length / 2) : qn, qn === "end");
      const why = playTier(id);
      if (why) { F(`${id}: ${g.c14.nameOf(k)}へ進む節目の出来事が済まない（${why}）`); okPath = false; break; }
      if (g.c14.stage(id) < k) { F(`${id}: 節目の出来事のあとも「${g.c14.nameOf(k)}」にならない`); okPath = false; break; }
    }
    pump(id);
    if (okPath && g.c14.stage(id) === ST.length - 1 && aff(id) === 100) reached++;
    else if (okPath) F(`${id}: 最後の段で好感度が 100 まで届かない（${aff(id)}）`);
  }
  if (reached !== mates.length) F(`最後の段まで届いたのは ${reached}/${mates.length} 人`);

  // 下がる分は切らない
  start(); join(mates[0]);
  { const a = aff(mates[0]); g.affAdd(mates[0], -15, true); if (aff(mates[0]) !== Math.max(-100, a - 15)) F("下がる分が切られた"); }
  // 仲間の bond（M2）でも上限
  start(); join(mates[0]);
  { const c = g.S.companions.find((x) => x.c2 === mates[0]); g.m2Bond(c, 50, true); if (aff(mates[0]) > g.c14.cap(mates[0])) F("仲間の bond で上限を超えた"); }

  // 古いセーブ：好感度だけ → 今の値に合う段。上限を超えていても下げない
  start(); join(mates[1]);
  g.affState()[mates[1]] = 70; delete g.S.c14;
  if (g.c14.stage(mates[1]) !== 3) F(`古いセーブの好感度 70 が「深い仲」にならない（${g.c14.nameOf(g.c14.stage(mates[1]))}）`);
  g.affState()[mates[1]] = 42; g.S.c14.st[mates[1]] = 1; // 上限（30）より上の値が入っていた
  g.affAdd(mates[1], 5, true);
  if (aff(mates[1]) !== 42) F(`上限を超えていた好感度が変わった（${aff(mates[1])}）`);
  // C13 の褒美を済ませていた古いセーブは、その先の段
  start(); join(mates[2]);
  g.S.c13 = { done: { [mates[2]]: [0, 1] }, ask: {}, last: {}, wait: {} }; g.affState()[mates[2]] = 20; delete g.S.c14;
  if (g.c14.stage(mates[2]) < 3) F("C13 の節目を二つ済ませた古いセーブが「深い仲」にならない");

  // 仲間にならない人：日数だけでは進まない。会った場所で段の出来事（C15）を済ませると次の段（最後の段まで）
  const other = Object.keys(D.F2_PEOPLE || {}).find((id) => !(P[id] && P[id].join));
  if (other) {
    start();
    const town = Object.keys(g.data.LOCS).find((l) => g.data.LOCS[l].type === "town");
    g.S.loc = town; g.S.visited[town] = true; g.S.mode = "explore";
    g.affMeet(other);
    for (let k = 0; k < ST.length - 1; k++) {
      pump(other);
      const a = aff(other);
      if (a > g.c14.capOf(k)) F(`仲間にならない人の好感度が上限を超えた（${a}）`);
      if (g.c14.stage(other) !== k) { F(`仲間にならない人の段が ${g.c14.stage(other)}（${k} のはず）`); break; }
      g.S.day += 60; pump(other);
      if (g.c14.stage(other) !== k) F("仲間にならない人が、日数だけで次の段へ進んだ");
      const act = acts().find((x) => x.id === `c15v:${other}`);
      if (!act) { F(`仲間にならない人の段の出来事（${k}）が、会った場所で出ない`); break; }
      g.act(act.id);
      const ch = acts().filter((c) => c.id.startsWith("ev:"));
      if (!ch.length) { F("仲間にならない人の段の出来事に選択肢が無い"); break; }
      g.act(ch[0].id);
      if (g.c14.stage(other) !== k + 1) { F(`段の出来事のあとも ${g.c14.nameOf(k + 1)} にならない`); break; }
    }
    if (g.c14.stage(other) !== ST.length - 1) F("仲間にならない人が、出来事で最後の段まで届かない");
  }

  // 結婚：最後の段の前は誓い・式に進まない
  const lover = mates.find((id) => P[id].romance && (D.Q8P.ALLOW || {})[id]);
  if (lover) {
    start(); join(lover);
    const c = g.S.companions.find((x) => x.c2 === lover);
    g.S.c14.st[lover] = 3; g.affState()[lover] = 80;
    c.m10 = Object.assign(c.m10 || {}, { st: "love" });
    g.m10Do("vow", c, {});
    if ((g.m10St ? g.m10St(c) : c.m10.st) === "vow") F("最後の段の前に誓いへ進んだ");
    if (g.c14.wedOk(c)) F("深い仲で結婚できることになっている");
    g.S.c14.st[lover] = 4;
    if (!g.c14.wedOk(c)) F("最後の段で結婚の段の条件を満たさない");
  }

  if (!bad) ok(`C14：関係の段（${ST.map((s) => `${s.name}≤${s.cap}`).join("・")}。仲間 ${mates.length} 人が最後の段まで届く・上限を超えない・手がかり・古いセーブ・仲間にならない人・結婚は最後の段から）`);
};
