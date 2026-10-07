// M11（#117）：恋の広がり。魔物の子分は恋の相手にならず、好感度の高い子分との情の出来事になる（C11）・エルフ／獣人の恋人の一行・格の違う相手との恋の続き物。
// 仕組みは src/engine/zz_m11_love.js、表は src/data/m11_love.js、出来事は src/data/events_m11_love.js
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  G.data.Q8P.off = G.data.Q8Q.off = true; // Q8 の恋の相手の一覧（人間の見た目の名のある人だけ）と組み合わせは tests/checks/q8_pairs.mjs で確かめる。ここは仕組みだけ
  const D = G.data;
  const before = { n: 0 };
  const F = (m) => { before.n++; fail("M11: " + m); };
  const evs = D.EVENTS.filter((e) => e.id.startsWith("m11_"));
  if (evs.length < 20) F(`出来事が少ない（${evs.length}）`);

  // ---------------------------------------------------------------- 見せる文
  const texts = [];
  const addO = (o) => { if (!o) return; for (const k of ["text", "memo", "chron"]) if (o[k]) texts.push(o[k]); };
  const addE = (e) => { texts.push(e.title, e.text); for (const c of e.choices) { texts.push(c.label); addO(c.ok); addO(c.ng); } };
  evs.forEach(addE);
  for (const id of ["m10_star", "m10_night", "m10_spark", "m10_confess", "m10_wedding"]) {
    const e = D.EVENTS.find((x) => x.id === id);
    if (["m10_star", "m10_night", "m10_spark", "m10_confess"].includes(id) && (!e || !e.choices.some((c) => c.cond && /尻尾|星の名前|一生分|耳/.test(c.label)))) F(`${id} に種族の一行が足されていない`);
    else if (e && e.choices.some((c) => /鍋を叩いて誓|自分の言葉で、もう一度/.test(c.label))) F(`${id} に魔物の子分との恋の一行が残る`);
    else if (e) e.choices.forEach((c) => { texts.push(c.label); addO(c.ok); addO(c.ng); });
  }
  const T = D.M11;
  texts.push(...T.STORY_MON.together, ...T.STORY_MON.lost);
  for (const a of Object.values(T.AP)) texts.push(a.who, a.chron, ...a.story);
  for (const t of texts) {
    if (/見世物|観客|客席|舞台|台本|神々|魔王|使徒|眷属/.test(t)) F(`見せる文に書かない言葉がある「${t}」`);
    if (/ベリエラ|ドレイゼ|カルマトス|ベルファス|宵姫|ザルヴェ|ミルザ|ユラ|ルイ/.test(t)) F(`格の違う相手の名前か、子どもの姿の者が出る「${t}」`);
  }
  for (const e of evs.filter((x) => x.id.startsWith("m11_mon_"))) for (const c of e.choices) for (const o of [c.ok, c.ng]) if (o && o.m10) F(`${e.id}: 魔物の子分の出来事に恋の結果（m10: ${o.m10}）がある`);
  for (const t of ["m11_mon", "m11_ap"]) if (!D.TROPHIES.some((x) => x.key === t)) F(`トロフィー ${t} が無い`);

  // ---------------------------------------------------------------- 準備
  const stats = {}, caps = {};
  D.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
  const start = (sex) => {
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: sex || "男", age: 30, history: "テスト用", personality: "無口だが義理堅い" } });
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  const acts = () => G.actions().flatMap((x) => x.list);
  const has = (id) => acts().find((a) => a.id === id && !a.disabled);
  const always = (fn, v) => { const r = G.rand; G.rand = () => (v === undefined ? 0.01 : v); try { return fn(); } finally { G.rand = r; } };
  const noBraces = (where) => { const bad = G.S.log.filter((l) => /\{[a-z_0-9]+\}|undefined/.test(l.text || "")); if (bad.length) F(`${where}：文に置き換えが残る「${bad[0].text}」`); };
  const idx = (ev, re) => D.EVENTS.find((e) => e.id === ev).choices.findIndex((c) => re.test(c.label));
  G.rand = seeded(1111);

  // ---------------------------------------------------------------- 魔物の子分：恋の相手にならない。好感度が高ければ情の出来事（C11）
  let S = start("女");
  G.addCompanion({ name: "樽ゴブリンのダル", cls: "ゴブリン", power: 30, dmg: 1, desc: "酒好き。戦うときも酔っている。" });
  G.addCompanion({ name: "剣士のロイド", cls: "剣士", power: 45, dmg: 1, desc: "無口だが義理堅い" });
  const [gob, hum] = S.companions;
  if (!G.m11Monster(gob) || G.m11Monster(hum)) F("魔物の子分を見分けられない");
  if (G.m10Can(gob)) F("魔物の子分が恋の相手になる");
  if (!G.m10Can(hum)) F("人の仲間が恋の相手になれない");
  if (G.m10Can({ name: "ルイ", c2: "rui" }) && D.C2_PEOPLE && D.C2_PEOPLE.rui) F("子どもの姿の者が恋の相手になる");
  gob.bond = 100;
  for (let d = 0; d < 30; d++) { S.day = 100 + d; if (G.m10P.spark(gob, S)) { F("好感度 100 の魔物の子分に恋の気配が立つ"); break; } }
  // 打ち明け・告白・求婚・式：出来事の結果から来ても恋の間柄にならない
  G.m10Of(gob).st = "spark"; gob.m10.cool = 0;
  if (G.m10P.confess(gob, S) || G.m10P.sparked(gob, S)) F("気配の立った（古いセーブの）魔物の子分が告白してくる");
  if (acts().some((a) => a.id === "m10tell:" + gob.id)) F("魔物の子分に「想いを打ち明ける」が出る");
  S.m2.focus = gob.id;
  always(() => G.apply({ text: "テスト", m10: "love", confess: true }));
  if (G.m10St(gob) === "love") F("出来事の結果から、魔物の子分と恋仲になる");
  gob.m10.st = "";
  // 情の出来事：好感度が高い子分だけ。人の仲間では起きない。恋の結果は無い
  gob.bond = 30;
  if (D.EVENTS.find((x) => x.id === "m11_mon_rat").cond(S)) F("好感度の低い魔物の子分で、情の出来事が起きる");
  gob.bond = 80;
  for (const id of ["m11_mon_rat", "m11_mon_words", "m11_mon_pack", "m11_mon_years", "m11_mon_town", "m11_mon_night"]) {
    S.mode = "explore"; S.loc = "karna";
    S.m2.force = gob.id;
    const e = D.EVENTS.find((x) => x.id === id);
    if (!e.cond(S)) { F(`${id} の条件が通らない`); continue; }
    G.startEvent(id);
    if (S.event !== id) { F(`${id} が始まらない（${S.event}）`); continue; }
    always(() => G.act("ev:0"));
    if (G.m10St(gob)) F(`${id} のあと、魔物の子分と恋の間柄（${G.m10St(gob)}）になる`);
  }
  noBraces("魔物の子分の暮らし");
  if (!S.log.some((l) => /アネキ/.test(l.text || ""))) F("魔物の子分が、女のあなたをアネキと呼ばない");
  if (D.EVENTS.find((x) => x.id === "m11_mon_words").cond(Object.assign({}, S, { companions: [hum] }))) F("人の仲間で、魔物の子分の出来事が起きる");
  gob.bond = 95;
  S.mode = "explore"; S.m2.focus = gob.id;
  always(() => G.apply({ text: "テスト", bond: 1 }));
  if (!G.P.trophies.m11_mon) F("好感度 90 を超えた魔物の子分で、言葉の半分のトロフィーが無い");
  if (G.m10Partner(S)) F("魔物の子分が恋人・連れ合いになっている");

  // ---------------------------------------------------------------- エルフ・獣人の恋人
  S = start("男");
  G.addCompanion({ name: "弓使いのリエル", cls: "弓使い", power: 40, dmg: 1, desc: "無口だが義理堅い", race: "elf" });
  G.addCompanion({ name: "斧使いのガルド", cls: "斧使い", power: 40, dmg: 1, desc: "無口だが義理堅い", race: "beast", beast: "wolf" });
  const [elf, wolf] = S.companions;
  if (G.r1Comp(elf).race !== "elf" || G.r1Comp(wolf).race !== "beast") F("仲間の種族が読めない");
  G.m10Of(elf).st = "love"; elf.bond = 60;
  S.m2.force = elf.id; G.startEvent("m11_elf_grey");
  if (S.event !== "m11_elf_grey") F(`エルフの恋人の出来事が始まらない（${S.event}）`);
  G.act("ev:0");
  S.m2.force = elf.id; G.startEvent("m10_star");
  const si = idx("m10_star", /星の名前/);
  if (!G.eventChoices().some(({ i }) => i === si)) F("エルフの恋人に、星の名前の一行が出ない");
  G.act("ev:" + si);
  elf.m10.st = ""; S.m10.lover = null;
  G.m10Of(wolf).st = "love"; wolf.bond = 60;
  S.m2.force = wolf.id; G.startEvent("m10_night");
  const ni = idx("m10_night", /尻尾/);
  if (!G.eventChoices().some(({ i }) => i === ni)) F("獣人の恋人に、尻尾の一行が出ない");
  G.act("ev:" + ni);
  S.m2.force = wolf.id; G.startEvent("m11_beast_scent");
  if (S.event !== "m11_beast_scent") F("獣人の恋人の出来事が始まらない");
  G.act("ev:1");
  noBraces("種族の恋");
  // 人間の恋人には、種族の一行は出ない
  G.addCompanion({ name: "剣士のロイド", cls: "剣士", power: 45, dmg: 1, desc: "無口だが義理堅い" });
  const h2 = S.companions[2];
  wolf.m10.st = ""; G.m10Of(h2).st = "love"; h2.bond = 60;
  S.m2.force = h2.id; G.startEvent("m10_night");
  if (G.eventChoices().some(({ i }) => i === ni)) F("人間の恋人に、尻尾の一行が出る");

  // ---------------------------------------------------------------- 格の違う相手：続き物を最後までたどる
  const chain = (key, loc, setup) => {
    S = start("男");
    setup(S);
    if (D.R2 && D.R2.AP_MEET && D.R2.AP_MEET[key]) D.R2.AP_MEET[key](S); // R2 で足した段（気になる・すれ違い・難しい道）をそろえる（src/data/romance_<key>.js）
    S.loc = loc; S.mode = "explore";
    S.day = 50;
    for (let n = 1; n <= 4; n++) {
      const id = `m11_${key}_${n}`;
      const e = D.EVENTS.find((x) => x.id === id);
      if (!e || !e.cond(S)) { F(`${id} の条件が通らない（段 ${n}）`); return; }
      G.startEvent(id);
      always(() => G.act("ev:0"));
      if (G.m11Ap(key).st !== n) { F(`${id} で続き物が進まない（${G.m11Ap(key).st}）`); return; }
      if (e.cond(S) || D.EVENTS.find((x) => x.id === `m11_${key}_${n + 1}`)?.cond(S)) F(`${id} のすぐあとに、また会える`);
      S.mode = "explore"; S.event = null; S.loc = loc;
      S.day += 7;
    }
    const last = D.EVENTS.find((x) => x.id === `m11_${key}_last`);
    if (!last.cond(S)) { F(`m11_${key}_last の条件が通らない`); return; }
    // 断られる道：しばらく会えない
    // 判定に勝っても、最後の一歩はごく稀にしか通らない。通らなければ断りの出来事
    always(() => G.apply({ text: "テスト", m11try: key }), 0.99);
    const a = G.m11Ap(key);
    if (S.event !== `m11_${key}_no` || a.won) F(`最後の一歩が通らなくても、断りの出来事にならない（${S.event}）`);
    {
      G.act("ev:1");
      S.mode = "explore"; S.loc = loc;
      if (last.cond(S)) F("断られた直後に、また最後の一歩を踏める");
      S.day += 30;
      if (!last.cond(S)) F("断られたあと、日が経っても会えない");
      G.startEvent(last);
      always(() => G.act("ev:0"), 0.01);
      if (S.event !== `m11_${key}_won`) { F(`最後の一歩が通っても、成就の出来事にならない（${S.event}）`); return; }
      G.act("ev:0");
    }
    if (!G.m11ApWon(key)) F(`${key} の恋が成就しない`);
    if (!a.tries) F("最後の一歩を数えない");
    if (!S.chronicle.some((c) => c.text === T.AP[key].chron)) F(`${key} の成就が年表に残らない`);
    if (!G.P.trophies.m11_ap) F("格の違う相手のトロフィーが無い");
    if (!G.m10Rows(S).some(([k2, v]) => k2 === "契り" && v === T.AP[key].who)) F("シートに契りの行が出ない");
    S.mode = "explore"; S.loc = loc;
    const after = D.EVENTS.find((x) => x.id === `m11_${key}_after`);
    if (!after || !after.cond(S)) F(`${key} の成就のあとの出来事が無い`);
    if (D.EVENTS.find((x) => x.id === `m11_${key}_1`).cond(S)) F("成就したあとも、続き物の最初に戻る");
    const story = G.m6Compose(S).life.join("");
    if (!T.AP[key].story.some((t) => story.includes(t.replace(/\{name\}/g, "テスト").slice(0, 12)))) F(`人生の物語に ${key} の一文が無い ${story}`);
    if (G.m10Partner(S)) F("格の違う相手が、仲間の恋人になっている");
    noBraces(key);
  };
  chain("yoi", "w1_oboro", (S2) => { S2.flags.w1_yoifav = true; });
  if (D.EVENTS.find((x) => x.id === "m11_yoi_1").cond(Object.assign({}, start("男"), { loc: "w1_oboro" }))) F("朧島で気に入られていないのに、続き物が始まる");
  chain("zalve", "karna", (S2) => { S2.flags["ev:v1_zalve"] = true; });

  // ---------------------------------------------------------------- 古いセーブ：S.m11 が無い
  S = start("男");
  delete S.m11;
  try {
    G.m10Rows(S); G.m6Compose(S);
    G.m11ApAt("yoi", 0, S);
    for (let i = 0; i < 30 && !S.over; i++) { const l = acts().filter((x) => !x.disabled); G.act(l[Math.floor(G.rand() * l.length)].id); }
  } catch (e) { F("古いセーブで例外 " + (e.stack || e)); }

  if (!before.n) ok(`M11 恋の広がり（出来事 ${evs.length}・魔物の子分は恋でなく情の出来事・種族の一行・格の違う相手の続き物 2 つ）`);
};
