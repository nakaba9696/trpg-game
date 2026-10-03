// M10：仲間との恋と結婚（気配・告白・すれ違い・嫉妬・別れ・求婚・式・家・連れ合いの死と裏切り・人生の物語・古いセーブ）。
// 仕組みは src/engine/m10_love.js、表は src/data/m10_love.js、出来事は src/data/events_m10.js。ランダムに遊んで、恋仲・結婚・別れの回数も出す
export default ({ G, fail, ok, loadEngine, seeded }) => {
  const D = G.data;
  const before = { n: 0 };
  const F = (m) => { before.n++; fail("M10: " + m); };
  const evs = D.EVENTS.filter((e) => e.id.startsWith("m10_"));
  if (evs.length < 25) F(`出来事が少ない（${evs.length}）`);

  // ---------------------------------------------------------------- 見せる文
  const texts = [];
  const addO = (o) => { if (!o) return; for (const k of ["text", "memo", "chron"]) if (o[k]) texts.push(o[k]); addO(o.win); };
  for (const e of evs) { texts.push(e.title, e.text); for (const c of e.choices) { texts.push(c.label); addO(c.ok); addO(c.ng); } }
  const T = D.M10;
  for (const [k, L] of Object.entries(T.LINES)) texts.push(...Object.values(L));
  for (const L of Object.values(T.LOST)) texts.push(...L.love, ...L.wed);
  for (const L of Object.values(T.STORY)) texts.push(...L);
  texts.push(...T.HOUSE, ...T.STAY, ...T.BRING, ...T.HOME_PLAIN, ...T.HOME_EMPTY, ...Object.values(T.AGE_YOU).flat());
  const ms = D.M6.MILESTONES.find((m) => m.id === "m10_hearth");
  if (!ms) F("節目（灯りのある窓）が無い");
  else texts.push(ms.title, ms.text, ms.end);
  const nar = D.M6.NARRATORS.spouse;
  if (!nar) F("語り手（連れ合い）が無い");
  else texts.push(...nar.open, ...nar.hear, ...nar.gap, ...nar.close);
  texts.push(...D.M6.AFTER.soon.spouse);
  for (const t of texts) if (/見世物|観客|客席|舞台|台本|神々|魔王|使徒/.test(t)) F(`見せる文に書かない言葉がある「${t}」`);
  for (const k of Object.keys(D.M2_TRAITS)) for (const w of ["spark", "confess", "propose", "part", "cold"]) if (!T.LINES[k] || !T.LINES[k][w]) F(`性格 ${k} の ${w} のひとことが無い`);
  for (const t of ["m10_love", "m10_wed", "m10_home", "m10_child"]) if (!D.TROPHIES.some((x) => x.key === t)) F(`トロフィー ${t} が無い`);

  // ---------------------------------------------------------------- 決まった流れ
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  const start = (sex, age, personality) => {
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: sex || "女", age: age || 24, history: "テスト用", personality: personality || "無口だが義理堅い" } });
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  const acts = () => G.actions().flatMap((x) => x.list);
  const has = (id) => acts().find((a) => a.id === id && !a.disabled);
  const always = (fn) => { const r = G.rand; G.rand = () => 0.01; try { return fn(); } finally { G.rand = r; } };
  const noBraces = (where) => { const S = G.S; const bad = S.log.filter((l) => /\{[a-z_0-9]+\}|undefined/.test(l.text || "")); if (bad.length) F(`${where}：文に置き換えが残る「${bad[0].text}」`); };
  G.rand = seeded(1010);

  // 同性：女のあなたと、女の名前の仲間
  let S = start("女", 24);
  G.addCompanion({ name: "弓使いのセラ", cls: "弓使い", power: 40, dmg: 1, desc: "無口だが義理堅い" });
  G.addCompanion({ name: "剣士のロイド", cls: "剣士", power: 45, dmg: 1, desc: "陽気なほら吹き" });
  const [a, b] = S.companions;
  if (G.m10Sex(a) !== "女" || G.m10Sex(b) !== "男") F(`名前から性別を推せない（${G.m10Sex(a)} ${G.m10Sex(b)}）`);
  if (G.m10Compat(a) < 1) F(`同じ性格（義理堅い）の相性が上がらない（${G.m10Compat(a)}）`);
  if (!G.m10Can({ name: "樽ゴブリンのダル", cls: "ゴブリン" })) F("ゴブリンの子分と恋仲になれない（M11：遠いが道はある）");
  // 気配
  a.bond = 70; b.bond = 30;
  if (!G.m10P.spark(a, S) || G.m10P.spark(b, S)) F("気配の立つ線が変");
  S.m2.force = a.id;
  G.startEvent("m10_spark");
  if (S.event !== "m10_spark" || S.m2.focus !== a.id) F(`気配の出来事が始まらない（${S.event}）`);
  G.act("ev:0");
  if (G.m10St(a) !== "spark") F("気配が立たない");
  noBraces("気配");
  // 想いを打ち明ける（失敗ならすれ違い、成功なら恋仲）
  S.day += 1;
  if (!has("m10tell:" + a.id)) F("「想いを打ち明ける」が出ない");
  G.act("m10tell:" + a.id);
  if (S.event !== "m10_tell") F(`打ち明ける出来事にならない（${S.event}）`);
  const r0 = G.rand; G.rand = () => 0.99; G.act("ev:0"); G.rand = r0;
  if (G.m10St(a) !== "spark" || !(a.m10.cool > S.day)) F("打ち明けに失敗しても、しばらく待つことにならない");
  if (has("m10tell:" + a.id)) F("打ち明けに失敗した直後に、また打ち明けられる");
  S.day += 10;
  always(() => { G.act("m10tell:" + a.id); G.act("ev:0"); });
  if (G.m10St(a) !== "love" || S.m10.lover !== a.id || !S.m10.counts.confess) F(`打ち明けて恋仲にならない（${G.m10St(a)}）`);
  if (!S.chronicle.some((c) => c.kind === "comp" && c.text.includes("恋仲") && c.text.includes(a.name))) F("恋仲が年表に残らない");
  if (!acts().some((x) => x.id === "m2talk:" + a.id && /恋仲/.test(x.sub))) F("仲間の欄に「恋仲」が出ない");
  if (!G.m10Rows(S).some(([k]) => k === "恋仲")) F("シートに恋仲の行が出ない");
  // 恋人がいると、ほかの仲間に気配は立たない。嫉妬の出来事は立つ
  b.bond = 80;
  if (G.m10P.spark(b, S)) F("恋人がいるのに、別の仲間に気配が立つ");
  S.m2.force = a.id;
  G.startEvent("m10_jealous");
  if (S.event !== "m10_jealous" || S.m2.focus2 !== b.id) F("嫉妬の出来事で、二人目が恋敵にならない");
  G.act("ev:1");
  if (!S.m10.counts.jealous) F("嫉妬を数えない");
  noBraces("嫉妬");
  // すれ違い → 仲直り
  a.bond = 70;
  S.m2.force = a.id; G.startEvent("m10_miss"); G.act("ev:2");
  if (!a.m10.miss) F("すれ違わない");
  if (G.m10P.propose(a, S)) F("すれ違ったままでも求婚できる");
  S.m2.force = a.id; G.startEvent("m10_mend_rift"); G.act("ev:0");
  if (a.m10.miss) F("仲直りできない");
  // 求婚 → 約束 → 教会で式
  a.bond = 90; a.m10.since = S.day - 12; a.m10.cool = 0;
  if (!has("m10ask:" + a.id)) F("「一緒になろうと言う」が出ない");
  G.act("m10ask:" + a.id);
  S.gold = 1000;
  G.act("ev:1"); // 指輪を渡す
  if (G.m10St(a) !== "vow" || S.gold !== 970) F(`約束にならない（${G.m10St(a)} ${S.gold}）`);
  S.loc = "karna"; S.mode = "explore";
  G.act("fac:church");
  if (!has("m10wed:" + a.id)) F("教会に「式を挙げる」が出ない");
  G.act("m10wed:" + a.id);
  if (S.event !== "m10_wedding") F(`式の出来事にならない（${S.event}）`);
  if (!G.actions()[0].list.some((x) => /酒場を借りて/.test(x.label))) F("金があるのに、酒場で祝う選択肢が出ない");
  G.act("ev:0");
  if (G.m10St(a) !== "wed" || !S.m10.spouse || S.m10.spouse.id !== a.id || S.m10.spouse.how !== "church") F("式で結ばれない");
  if (!G.P.trophies.m10_wed || !S.chronicle.some((c) => c.text.includes("結ばれる"))) F("結ばれたことがトロフィーか年表に残らない");
  if (S.flags.m10_sp !== a.name) F("連れ合いの名前が flags に残らない");
  if (G.m10Fill("{nw}と{yw}") !== "妻と妻") { S.m2.focus = a.id; if (G.m10Fill("{nw}と{yw}") !== "妻と妻") F(`呼び名が性別に合わない（${G.m10Fill("{nw}と{yw}")}）`); }
  // 節目：連れ合いがいると「灯りのある窓」に着く
  G.endTurn();
  if (!S.m6 || S.m6.reached.m10_hearth === undefined) F("連れ合いがいるのに節目に着かない");
  // 家を持つ → 家を任せる → 家に帰る
  if (!has("m10house")) F("「家を持つ」が出ない");
  const g0 = S.gold;
  G.act("m10house");
  if (!S.m10.home || S.m10.home.loc !== "karna" || S.gold !== g0 - 500 || !G.P.trophies.m10_home) F("家を持てない");
  if (!has("m10stay:" + a.id)) F("「家を任せる」が出ない");
  G.act("m10stay:" + a.id);
  if (S.companions.includes(a) || S.m10.atHome !== a || G.m10Spouse(S) !== a) F("連れ合いが家に残らない");
  if (G.m6Best(S)?.id === undefined || !G.m6Reached(S).some((m) => m.id === "m10_hearth")) F("家に残った連れ合いでも節目が残らない");
  S.hp = 5;
  for (let i = 0; i < 12 && !S.m10.child; i++) {
    S.day += 25; S.m10.spouse.day = 0;
    G.act("m10home");
    if (S.mode === "event") { if (!S.event.startsWith("m10_home")) F(`家に帰って、家でない出来事が起きた（${S.event}）`); G.act("ev:0"); }
  }
  if (S.hp !== S.maxHp) F("家に帰っても HP が戻らない");
  if (!S.m10.child) F("家に帰っても、小さな靴の出来事が起きない");
  noBraces("家");
  // 最後の家の手番の終わりに、乱数で世界の出来事（M4 など）が始まっていることがある。家の行動だけを見るので閉じておく（乱数の並びは足した人物で動く）
  if (S.mode === "event" && !String(S.event).startsWith("m10_")) { S.mode = "explore"; S.event = null; }
  if (!has("m10bring")) F("「連れ出す」が出ない");
  // 留守の家：家ごと失う（理不尽）
  S.loc = "nerva"; S.mode = "explore"; S.fac = null;
  G.startEvent("m10_home_ash");
  G.act("ev:1");
  if (S.m10.atHome || S.m10.home || S.m10.spouse.lost !== "ash" || S.flags.m10_sp || !S.m10.counts.widow) F("留守の家を失っても、連れ合いと家が残る");
  if (!S.m10.past.some((g) => g.how === "ash" && g.wed)) F("家ごと失った連れ合いが記録に残らない");
  if (!G.m10Rows(S).some(([k]) => k === "連れ合いだった人")) F("シートに連れ合いだった人が出ない");

  // M2 の死別：道端で誓った連れ合いが深手で死ぬ
  S = start("男", 58, "陽気なほら吹き");
  G.addCompanion({ name: "僧侶のマリカ", cls: "僧侶", power: 40, dmg: 1, desc: "色恋に目がなく、すぐ惚れる" });
  const c = S.companions[0];
  c.bond = 95; G.m10Of(c).st = "love"; c.m10.since = S.day - 20;
  S.m2.force = c.id; G.startEvent("m10_propose"); G.act("ev:1");
  if (G.m10St(c) !== "wed" || S.m10.spouse.how !== "road") F("道端で誓えない");
  G.m2Doom(c, "テストの深手");
  G.endTurn();
  if (S.event !== "m2_farewell") F(`連れ合いの看取りが始まらない（${S.event}）`);
  G.act("ev:1");
  if (S.companions.includes(c) || S.m10.counts.widow !== 1 || S.m10.spouse.lost !== "death") F("連れ合いが死んでも、連れ合いのまま");
  if (!S.chronicle.some((x) => x.text.includes("連れ合いの") && x.text.includes("亡くす"))) F("連れ合いの死が年表に残らない");
  if (S.flags.m10_sp) F("死んだ連れ合いの名前が flags に残る");
  noBraces("死別");
  // 裏切り：宿の男 → 問い詰めて失敗すると、連れ合いが去る
  G.addCompanion({ name: "槍兵のヴァン", cls: "槍兵", power: 40, dmg: 1, desc: "誰も信じない" });
  const v = S.companions[0];
  G.m10Of(v).st = "wed"; v.bond = 40;
  S.m2.force = v.id; G.startEvent("m10_secret");
  const r1 = G.rand; G.rand = () => 0.99; G.act("ev:1"); G.rand = r1;
  if (S.companions.includes(v) || !S.m10.counts.betray || !S.m10.past.some((g) => g.how === "betray" && g.wed)) F("宿の男の夜に、連れ合いが裏切って去らない");
  // 別れ：好感度の落ちた恋人は、手番の終わりに別れ話を持ち出す
  G.addCompanion({ name: "剣士のジーク", cls: "剣士", power: 40, dmg: 1, desc: "正義感が強すぎて空回りする" });
  const j = S.companions[0];
  G.m10Of(j).st = "love"; j.bond = 32; S.mode = "explore";
  G.endTurn();
  if (S.event !== "m10_part") F(`別れ話が始まらない（${S.event}）`);
  G.act("ev:1");
  if (G.m10St(j) !== "" || !j.m10.ex || !S.companions.includes(j) || !S.m10.counts.part) F("別れたあと、ただの仲間に戻らない");
  if (G.m10P.spark(Object.assign(j, { bond: 90 }), S)) F("別れた直後に、また気配が立つ");
  // 物語（M6）：連れ合いの段落が入り、終えたなら「その後」にも入る
  S = start("女", 30);
  G.addCompanion({ name: "傭兵のグレン", cls: "傭兵", power: 40, dmg: 1, desc: "口は悪いが、根はお人好し" });
  const w = S.companions[0];
  G.m10Of(w).st = "love"; w.bond = 95; w.m10.since = -20;
  S.m2.force = w.id; G.startEvent("m10_ask"); G.act("ev:2");
  if (G.m10St(w) !== "wed") F("「今、ここで誓おう」で結ばれない");
  G.endTurn();
  G.endStory("m10_hearth");
  const story = S.story;
  if (!story || !story.life.some((p) => p.includes("グレン")) || !story.after || !story.after.some((p) => p.includes("グレン"))) F(`人生の物語に連れ合いの段落が無い ${JSON.stringify(story && story.life)}`);
  if (!S.chronicle.some((x) => x.kind === "end" && x.text.includes("連れ合い"))) F("連れ合いの節目で終えたことが年表に残らない");
  const allStory = [...(story.life || []), ...(story.after || [])].join("");
  if (/\{|undefined/.test(allStory)) F(`物語に置き換えが残る「${allStory}」`);
  // 語り手：連れ合いが語ることがある
  let spouseNar = 0;
  for (let i = 0; i < 30; i++) { G.rand = seeded(200 + i); if (G.m6Compose(S).narratorKey === "spouse") spouseNar++; }
  if (!spouseNar) F("連れ合いが語り手にならない");

  // 古いセーブ：S.m10 も仲間の m10・sex も無い
  S = start("男", 40);
  S.companions.push({ name: "脱走兵ヨアヒム", cls: "元帝国兵", power: 50, dmg: 2, desc: "元は帝国の槍兵。人を殺すのに疲れた。" });
  delete S.m10;
  try {
    for (let i = 0; i < 40 && !S.over; i++) { const l = acts().filter((x) => !x.disabled); G.act(l[Math.floor(G.rand() * l.length)].id); }
    if (G.m10Sex({ name: "脱走兵ヨアヒム" }) !== "男") F("古いセーブの仲間の性別が推せない");
    G.m10Rows(S);
    G.m6Compose(S);
  } catch (e) { F("古いセーブで例外 " + (e.stack || e)); }

  // ---------------------------------------------------------------- ランダムに遊ぶ（仲間 2 人を連れて）
  const R = loadEngine();
  const RD = R.data;
  const n = {};
  const GAMES = 100;
  let partStory = 0;
  for (let g = 0; g < GAMES; g++) {
    R.rand = seeded(7000 + g);
    R.P = { trophies: {}, graves: [] };
    const cls = Object.keys(RD.CLASSES)[g % 5];
    const st = {}, cp = {};
    RD.STATS.forEach((k) => { st[k] = RD.CLASSES[cls].base[k] + 10; cp[k] = st[k] + 30; });
    R.newGame({ cls, stats: st, caps: cp, goal: Object.keys(RD.GOALS)[g % 4], profile: { name: "テスト", sex: g % 2 ? "女" : "男", age: 18 + (g * 7) % 50, history: "テスト用", personality: RD.PROFILE.personality[g % RD.PROFILE.personality.length] } });
    R.S.gold = 600;
    R.addCompanion("random"); R.addCompanion("random");
    try {
      for (let step = 0; step < 500 && !R.S.over; step++) {
        const l = R.actions().flatMap((x) => x.list).filter((x) => !x.disabled);
        if (!l.length) { F(`ランダム ${g}: できる行動が無い`); break; }
        R.act(l[Math.floor(R.rand() * l.length)].id);
        const bad = R.S.log.find((x) => /\{[a-z_0-9]+\}/.test(x.text || ""));
        if (bad) { F(`ランダム ${g}: 文に置き換えが残る「${bad.text}」`); break; }
        const partners = R.S.companions.filter((c) => ["love", "vow", "wed"].includes(R.m10St(c)));
        if (partners.length > 1) { F(`ランダム ${g}: 恋人・連れ合いが二人いる`); break; }
      }
    } catch (e) { F(`ランダム ${g}: 例外 ${e.stack || e}`); }
    for (const [k, v] of Object.entries(R.S.m10?.counts || {})) n[k] = (n[k] || 0) + v;
    if (R.S.over && R.S.story && R.S.m10 && (R.S.m10.past.length || R.m10Partner(R.S))) partStory++;
  }
  console.log(`NOTE M10 ランダムに ${GAMES} 回遊んだ（仲間 2 人から・500 行動まで）: 気配 ${n.spark}・恋仲 ${n.love}（打ち明けて ${n.confess}）・断る ${n.refuse}・すれ違い ${n.miss}・嫉妬 ${n.jealous}・別れ ${n.part}・求婚 ${n.propose}・結婚 ${n.wed}・家 ${n.home}・小さな靴 ${n.child}・連れ合い／恋人の死 ${n.widow}・裏切り ${n.betray}・去る ${n.leave}・物語に恋の段落 ${partStory}`);
  if (!n.love || !n.wed || !(n.part + n.widow + n.betray + n.leave)) F(`ランダムプレイで恋仲・結婚・別れのどれかが起きない ${JSON.stringify(n)}`);
  if (!before.n) ok(`M10 恋と結婚（出来事 ${evs.length}・気配→告白→すれ違い→嫉妬→求婚→式→家→死別・裏切り・別れ・人生の物語・古いセーブ）`);
};
