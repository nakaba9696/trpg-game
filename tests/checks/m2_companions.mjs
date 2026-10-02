// M2：仲間の個性（性格・暮らし・好感度・会話・裏切り・死別・古いセーブ）。仕組みは src/engine/companions_m2.js
// ランダムに遊んで、会話・裏切り・去る・死別が何回起きたかも出す
export default ({ G, fail, ok, loadEngine, seeded }) => {
  const D = G.data;
  const m2ev = D.EVENTS.filter((e) => e.id.startsWith("m2_"));
  if (m2ev.some((e) => !e.m2)) fail("M2: m2_ の出来事に m2 の欄が無い");
  // 見せる文に書かない言葉（神々のことは明かさない）
  const texts = [];
  const addO = (o) => { if (!o) return; for (const k of ["text", "memo", "chron"]) if (o[k]) texts.push(o[k]); addO(o.win); };
  for (const e of m2ev) { texts.push(e.title, e.text); for (const c of e.choices) { texts.push(c.label); addO(c.ok); addO(c.ng); addO(c.win); } }
  for (const t of Object.values(D.M2_TRAITS)) texts.push(...t.talk, t.betray, t.die, t.name);
  texts.push(...D.M2_FRAGMENTS);
  for (const L of Object.values(D.M2_LIFE)) texts.push(...L);
  // 見世物にかかわる言葉は書かない。仲間は世界の説明役ではないので、上位の存在の名前も出さない
  for (const t of texts) if (/見世物|観客|客席|舞台|台本|神々|魔王|使徒/.test(t)) fail(`M2: 見せる文に書かない言葉がある「${t}」`);
  for (const [k, t] of Object.entries(D.M2_TRAITS)) if (!["steal", "knife", "sell", "leave"].includes(t.style) || t.talk.length < 3) fail(`M2: 性格 ${k} の欄が足りない`);
  // 今の性格の表（characters.js）は、どれも決まった性格に当たる
  for (const p of D.PROFILE.personality) if (!Object.values(D.M2_TRAITS).some((t) => t.re.test(p))) fail(`M2: 性格「${p}」に当たる M2 の性格が無い`);
  G.rand = seeded(31);
  G.P = { trophies: {}, graves: [] };
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  const start = () => G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  start();
  const S = G.S;
  S.maxHp = S.hp = 999;
  G.addCompanion("random");
  G.addCompanion({ name: "樽ゴブリンのダル", cls: "ゴブリン", power: 30, dmg: 1, desc: "酒好き。戦うときも酔っている。" });
  const [a, b] = S.companions;
  if (!a.id || !a.trait || !(a.bond > 0) || b.trait !== "drunk" || a.id === b.id) fail(`M2: 仲間に id・性格・好感度が付かない ${JSON.stringify(a)}`);
  // 「仲間と話す」→ 会話の出来事。{n} などが名前に置き換わる
  for (let i = 0; i < 40; i++) { a.talkDay = 0; G.m2Talk(a.id); if (S.event === "m2_grave" || S.event === "m2_share" && S.gold < 30) fail(`M2: 条件を満たさない会話 ${S.event}`); S.mode = "explore"; S.event = null; }
  S.m2.counts.talk = 0; a.talkDay = 0; a.bond = 50;
  const talkAct = G.actions().flatMap((x) => x.list).find((x) => x.id === "m2talk:" + a.id);
  if (!talkAct || talkAct.disabled) fail("M2: 「仲間と話す」が出ない");
  G.act("m2talk:" + a.id);
  if (S.mode !== "event" || !S.event.startsWith("m2_") || S.m2.focus !== a.id) fail(`M2: 話すと会話の出来事にならない（${S.mode} ${S.event}）`);
  if (S.log.some((l) => /\{[a-z0-9]+\}/.test(l.text || ""))) fail("M2: 文に {n} などが残る");
  if (G.actions()[0].list.some((x) => /\{/.test(x.label))) fail("M2: 選択肢に {n} などが残る");
  if (S.m2.counts.talk !== 1) fail("M2: 会話を数えない");
  if (S.event === "m2_grave") fail("M2: 死んだ仲間がいないのに、死んだ仲間の話をする");
  while (S.mode === "event") G.act(G.actions()[0].list[0].id);
  if (G.actions().flatMap((x) => x.list).find((x) => x.id === "m2talk:" + a.id)?.disabled !== true) fail("M2: 同じ日に何度も話せる");
  // 好感度が尽きると別れ話（性格ごとの去り方）
  S.day++;
  a.trait = "greedy"; a.bond = 5;
  S.gold = 200;
  G.act("m2talk:" + a.id);
  if (S.event !== "m2_betray_steal") fail(`M2: 好感度が尽きた がめつい仲間が持ち逃げしない（${S.event}）`);
  G.act("ev:1");
  if (S.companions.includes(a) || S.gold !== 100 || S.m2.counts.betray !== 1) fail(`M2: 持ち逃げで仲間が去らないか、金が半分にならない（${S.gold}）`);
  if (!S.chronicle.some((c) => c.kind === "comp" && c.text.includes(a.name) && c.text.includes("裏切"))) fail("M2: 裏切りが年表に残らない");
  // 刃を向けた仲間を討つ
  G.addCompanion({ name: "剣士のカイ", cls: "剣士", power: 50, dmg: 1, desc: "冷酷で、どこまでも合理的" });
  const k = S.companions.find((c) => c.name === "剣士のカイ");
  if (k.trait !== "cold") fail("M2: 説明から性格を拾えない");
  k.bond = 3;
  G.act("m2talk:" + k.id);
  if (S.event !== "m2_betray_knife") fail(`M2: 冷酷な仲間が刃を向けない（${S.event}）`);
  G.act("ev:0");
  if (S.mode !== "combat" || S.combat.foes[0].name !== "カイ" || S.companions.includes(k)) fail("M2: 裏切った仲間との戦いにならない");
  for (let i = 0; i < 40 && S.combat; i++) { S.combat.foes[0].hp = 1; G.act("cb:attack"); }
  if (!S.m2.gone.some((g) => g.id === k.id && g.how === "slain")) fail("M2: 討った仲間が記録に残らない");
  // 死別：深手 → 手番の終わりに看取り → 年表
  S.mode = "explore"; S.event = null; S.combat = null;
  S.m2.doom = null; // 前の戦いの乱数で b がもう深手を負っていても、ここからの看取りを確かめる（深手は最初のものが残るため）
  G.m2Doom(b, "テストの深手");
  G.endTurn();
  if (S.event !== "m2_farewell" || S.m2.focus !== b.id) fail(`M2: 深手の仲間を看取る出来事が始まらない（${S.event}）`);
  G.act("ev:1");
  if (S.companions.includes(b) || S.m2.counts.death < 2) fail("M2: 看取ったのに仲間が残る");
  const dead = S.chronicle.find((c) => c.kind === "comp" && c.text.includes(b.name) && c.text.includes("死"));
  if (!dead || !dead.text.includes("テストの深手")) fail("M2: 死別が年表に残らない");
  if (!S.m2.gone.some((g) => g.id === b.id && g.how === "death" && g.date)) fail("M2: 死別の記録（S.m2.gone）が無い");
  // 古いセーブ：S.m2 も仲間の欄も無い
  start();
  const O = G.S;
  O.companions.push({ name: "脱走兵ヨアヒム", cls: "元帝国兵", power: 50, dmg: 2, desc: "元は帝国の槍兵。人を殺すのに疲れた。" }, { name: "弓使いのミラ", cls: "弓使い", power: 40, dmg: 1, desc: "よく分からない人" });
  delete O.m2;
  try {
    const acts = G.actions().flatMap((x) => x.list);
    if (!acts.some((x) => x.id.startsWith("m2talk:"))) fail("M2: 古いセーブで「仲間と話す」が出ない");
    const j = O.companions[0];
    if (j.trait !== "loyal" || j.bond !== 50 || !j.id) fail(`M2: 古いセーブの仲間の性格・好感度が変（${j.trait} ${j.bond}）`);
    for (let i = 0; i < 30 && !O.over; i++) { const l = G.actions().flatMap((x) => x.list).filter((x) => !x.disabled); G.act(l[Math.floor(G.rand() * l.length)].id); }
    const t1 = G.m2TraitOf({ name: "弓使いのミラ" }), t2 = G.m2TraitOf({ name: "弓使いのミラ" });
    if (t1 !== t2) fail("M2: 古いセーブの仲間の性格が読み込むたびに変わる");
  } catch (e) { fail("M2: 古いセーブで例外 " + (e.stack || e)); }

  // 暮らしは名前から決まり、全員に付く。文の置き換えが残らない
  start();
  G.addCompanion("random");
  const L = G.S.companions[0].life;
  for (const k of Object.keys(D.M2_LIFE)) if (!D.M2_LIFE[k].includes(L[k])) fail(`M2: 暮らしの ${k} が表に無い`);
  for (const e of m2ev) for (const t of [e.text, ...e.choices.map((c) => c.label)]) if (/\{[a-z0-9]+\}/.test(G.m2Fill(t))) fail(`M2: 出来事 ${e.id} の置き換えが残る「${G.m2Fill(t)}」`);

  // ランダムに遊ぶ（仲間を最初から連れて）
  const R = loadEngine();
  const RD = R.data;
  const n = { talk: 0, betray: 0, leave: 0, death: 0 };
  const GAMES = 80;
  for (let g = 0; g < GAMES; g++) {
    R.rand = seeded(5000 + g);
    R.P = { trophies: {}, graves: [] };
    const cls = Object.keys(RD.CLASSES)[g % Object.keys(RD.CLASSES).length];
    const st = {}, cp = {};
    RD.STATS.forEach((k) => { st[k] = RD.CLASSES[cls].base[k] + 10; cp[k] = st[k] + 30; });
    R.newGame({ cls, stats: st, caps: cp, goal: Object.keys(RD.GOALS)[g % 4], profile: { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" } });
    R.S.gold = 300;
    R.addCompanion("random"); R.addCompanion("random");
    for (let step = 0; step < 400 && !R.S.over; step++) {
      const acts = R.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
      if (!acts.length) { fail(`M2 ランダム ${g}: できる行動が無い`); break; }
      R.act(acts[Math.floor(R.rand() * acts.length)].id);
      if (R.S.log.some((l) => /\{[a-z0-9]+\}/.test(l.text || ""))) { fail(`M2 ランダム ${g}: 文に置き換えが残る`); break; }
      for (const c of R.S.companions) if (!(c.bond >= 0 && c.bond <= 100) || !c.life) { fail(`M2 ランダム ${g}: 仲間 ${c.name} の欄が変`); break; }
    }
    for (const k of Object.keys(n)) n[k] += R.S.m2?.counts?.[k] || 0;
  }
  console.log(`NOTE M2 ランダムに ${GAMES} 回遊んだ（仲間 2 人から）: 会話 ${n.talk}・裏切り ${n.betray}・去る ${n.leave}・死別 ${n.death}`);
  if (!n.talk || !(n.betray + n.leave) || !n.death) fail(`M2: ランダムプレイで会話・別れ・死別のどれかが起きない ${JSON.stringify(n)}`);
};
