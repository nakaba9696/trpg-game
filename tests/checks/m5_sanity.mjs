// M5：正気・獣の病・代償つきの品（src/engine/sanity_m5.js・src/data/*_m5.js）
export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const before = { n: 0 };
  let bad = 0;
  const f = (m) => { bad++; fail("M5: " + m); };

  const start = (cls, seed, extra) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 70; });
    G.newGame({ cls: cls || Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" }, ...(extra || {}) });
    G.S.maxHp = G.S.hp = 999;
    return G.S;
  };
  const texts = (S, n) => S.log.slice(-(n || 40)).map((l) => l.text || "").join("\n");
  const acts = () => G.actions().flatMap((g) => g.list);

  // ---------------------------------------------------------------- データ：品の入手先・出来事の欄
  const sources = new Set(D.SHOP_BASE);
  for (const L of Object.values(D.LOCS)) for (const it of L.shop || []) sources.add(it);
  for (const e of Object.values(D.ENEMIES)) for (const [it] of e.loot || []) sources.add(it);
  const addOut = (o) => { if (!o) return; for (const it of typeof o.item === "string" ? [o.item] : Object.keys(o.item || {})) sources.add(it); addOut(o.win); };
  const m5ev = D.EVENTS.filter((e) => e.id.startsWith("m5_"));
  for (const e of D.EVENTS) for (const c of e.choices) { addOut(c.ok); addOut(c.ng); addOut(c.win); }
  const m5items = Object.keys(D.ITEMS).filter((id) => id.startsWith("m5_"));
  for (const id of m5items) if (!sources.has(id)) f(`${id}: 入手先が無い`);
  for (const id of Object.keys(D.ENEMIES).filter((x) => x.startsWith("m5_"))) if (id !== "m5_oldbeast" && !Object.values(D.LOCS).some((L) => (L.pool || []).includes(id))) f(`敵 ${id} がどこにも出ない`);
  const checkM5 = (w, o) => {
    if (!o) return;
    if (o.sanity !== undefined && typeof o.sanity !== "number") f(`${w}: sanity は数`);
    if (o.beast !== undefined && !(o.beast === "infect" || o.beast === "cure" || typeof o.beast === "number")) f(`${w}: beast が変 ${o.beast}`);
    checkM5(w + ".win", o.win);
  };
  for (const e of D.EVENTS) e.choices.forEach((c, i) => { checkM5(`${e.id}[${i}].ok`, c.ok); checkM5(`${e.id}[${i}].ng`, c.ng); checkM5(`${e.id}[${i}]`, { win: c.win }); });
  for (const key of Object.keys(D.M5.TOLL.event)) if (!D.EVENTS.some((e) => e.id === key)) f(`代償の表：出来事 ${key} が無い`);
  for (const key of Object.keys(D.M5.TOLL.choice)) { const [id, i] = key.split(":"); const e = D.EVENTS.find((x) => x.id === id); if (!e || !e.choices[Number(i)]) f(`代償の表：選択肢 ${key} が無い`); }
  // 見世物の言葉を書かない（docs/lore/voice.md）
  const words = /見世物|観客|客席|舞台|台本/;
  const allText = JSON.stringify([m5ev, D.M5, m5items.map((id) => D.ITEMS[id]), Object.entries(D.ENEMIES).filter(([id]) => id.startsWith("m5_"))], (k, v) => (typeof v === "function" ? undefined : v));
  if (words.test(allText)) f("M5 の文に書いてはいけない言葉がある");

  // ---------------------------------------------------------------- 古いセーブ（項目が無い）
  let S = start("merc", 501);
  delete S.sanity; delete S.beast; delete S.m5;
  if (G.sanityOf(S) !== 100 || G.beastOf(S) !== 0) f("古いセーブで正気 100・獣 0 にならない");
  if (G.m5Rows(S).length) f("何も起きていないのに正気の行が出る");
  for (let i = 0; i < 30 && !S.over; i++) { const a = acts().filter((x) => !x.disabled); G.act(a[i % a.length].id); }
  if (!S.m5 || typeof S.m5.day !== "number") f("古いセーブで日の記録が始まらない");

  // ---------------------------------------------------------------- 術の借り（M1）で正気が減る
  S = start("mage", 502);
  G.payDebt(2);
  if (!(S.magicDebt === 2 && S.sanity === 100 + 2 * D.M5.TOLL.debt)) f(`術の借りで正気が減らない（借り ${S.magicDebt}・正気 ${S.sanity}）`);
  if (!G.m5Rows(S).some(([k]) => k === "正気")) f("正気が減っても画面の行が出ない");
  const s0 = S.sanity;
  G.learnSpell("bolt");
  if (!(S.sanity < s0)) f("術を覚えても正気が減らない");

  // ---------------------------------------------------------------- 段が変わると、数字より先に症状の文が出る・年表に残る
  S = start("merc", 503);
  G.addSanity(-35);
  if (!D.M5.SANITY_DOWN[1].some((t) => texts(S).includes(t))) f("動揺の段に入った文が出ない");
  if (!S.chronicle.some((c) => c.kind === "sanity")) f("正気の段が年表に残らない");
  if (G.chance("魅力", 0) !== G.clamp(S.stats.魅力 - 5, 5, 95)) f("動揺で魅力の判定が下がらない");
  G.addSanity(-30); // 35：狂気の縁
  if (G.sanityStage(S.sanity) !== 2) f(`狂気の縁の段にならない ${S.sanity}`);
  // 地の文が歪む・判定が揺れる
  let warped = 0, phantom = 0;
  const chances = new Set();
  for (let i = 0; i < 200; i++) { G.say("宿の主人が、男と話している。"); const l = S.log[S.log.length - 1].text; if (l !== "宿の主人が、男と話している。") warped++; }
  if (/主けもの/.test(texts(S, 240))) f("歪んだ文が言葉の途中で切れている");
  for (let i = 0; i < 40; i++) chances.add(G.check("筋力", 0, "揺れ").chance);
  if (!warped) f("狂気の縁で地の文が歪まない");
  if (chances.size < 3) f("狂気の縁で判定が揺れない");
  for (let i = 0; i < 200; i++) { S.mode = "explore"; G.endTurn(); if (D.M5.PHANTOM.includes(S.log[S.log.length - 1].text)) phantom++; }
  if (!phantom) f("存在しない物音が記録に混じらない");
  // 崩れかけ：選んだ行動が入れ替わることがある
  S.sanity = 10; S.mode = "explore"; S.hp = S.maxHp = 999;
  let swapped = 0;
  for (let i = 0; i < 80 && !S.over; i++) {
    S.mode = "explore"; S.event = null; S.combat = null; S.fac = null;
    const g = G.actions().find((x) => x.list.filter((y) => !y.disabled).length >= 2);
    if (!g) continue;
    S.log = [];
    G.act(g.list.find((y) => !y.disabled).id);
    if (S.log.some((l) => l.text === D.M5.SWAP)) swapped++;
  }
  if (!swapped) f(`崩れかけで行動が入れ替わらない（over=${S.over} 正気=${S.sanity} mode=${S.mode}）`);
  // 戻る：宿・懺悔
  S = start("merc", 504);
  S.sanity = 50; S.gold = 500; S.loc = "karna";
  G.act("fac:inn"); G.act("inn:rest");
  if (!(S.sanity > 50)) f("宿で眠っても正気が戻らない");
  G.act("back"); G.act("fac:church");
  const conf = acts().find((a) => a.id === "m5:confess");
  if (!conf || conf.disabled) f("教会で懺悔できない");
  if (!G.parse("懺悔する")) f("「懺悔する」を読み取れない");
  const s1 = S.sanity;
  G.act("m5:confess");
  if (!(S.sanity > s1)) f("懺悔しても正気が戻らない");
  if (!acts().find((a) => a.id === "m5:confess")?.disabled) f("懺悔が一日に何度もできる");
  G.give("m5_morning"); S.sanity = 50;
  if (!G.useItem("m5_morning") || !(S.sanity > 50)) f("瓶詰めの朝で正気が戻らない");

  // ---------------------------------------------------------------- 仲間（M2）が気づく・用語説明（U3）が開く・振り直し（M7）と正気の判定が両方効く
  S = start("merc", 520);
  G.addCompanion("random");
  const cn = G.m2Short ? G.m2Short(S.companions[0]) : S.companions[0].name;
  G.addSanity(-35);
  if (!S.log.slice(-10).some((l) => (l.text || "").includes(cn))) f("正気が崩れても仲間が気づかない");
  G.apply({ beast: "infect" });
  if (!S.log.slice(-10).some((l) => (l.text || "").includes(cn))) f("獣の病に仲間が気づかない");
  if (G.loreOf) {
    const lore = G.loreOf(S);
    if (!(lore.unseen || []).includes("sound") || !(lore.beast || []).includes("fever")) f("症状が出ても用語説明が開かない");
  }
  if (G.reroll) {
    S = start("merc", 521);
    S.sanity = 30; S.rerolls = 3; S.loc = "karna"; S.mode = "explore";
    let rolled = 0;
    for (let i = 0; i < 60 && !rolled && !S.over; i++) {
      S.mode = "explore"; S.event = null; S.fac = null; S.combat = null;
      G.startEvent("brawl");
      G.act("ev:0");
      if (G.rerollPending()) { const n = S.rerolls; G.act("rr:go"); if (S.rerolls === n - 1) rolled++; }
    }
    if (!rolled) f("狂気の縁でも振り直しが使えない");
    if (!(G.sanityOf(S) <= 30)) f("振り直したら正気が戻った");
  }

  // ---------------------------------------------------------------- 正気 0：選べない終わり方
  S = start("merc", 505);
  G.P.graves = [];
  G.addSanity(-100);
  if (!(S.over === "dead" && S.fate === "mad" && S.sanity === 0)) f(`正気 0 で冒険が終わらない（over=${S.over} fate=${S.fate}）`);
  if (!S.chronicle.some((c) => c.kind === "fate")) f("発狂が年表に残らない");
  if (!(G.P.graves[0] && G.P.graves[0].fate === "mad" && D.M5.END_MAD.cause.includes(G.P.graves[0].cause))) f("発狂が墓碑に残らない");
  // 出来事の途中で狂っても、状態が壊れない
  S = start("merc", 506);
  S.sanity = 3;
  G.startEvent("redmoon");
  if (!(S.over && S.mode === "over" && !S.event)) f(`出来事の途中の発狂で状態が変（mode=${S.mode} event=${S.event}）`);

  // ---------------------------------------------------------------- 獣の病
  S = start("merc", 507);
  G.apply({ beast: "infect" });
  if (S.beast !== 1 || !D.M5.BEAST_UP[1] || !texts(S).includes(D.M5.BEAST_UP[1])) f("病がうつらないか、症状の文が出ない");
  if (!G.m5Rows(S).some(([k, v]) => k === "体" && !/\d/.test(v))) f("病の行が出ないか、数字が出ている");
  // 日が経つと進む
  for (let d = 0; d < D.M5.DAYS_PER_STAGE; d++) { G.passDays(1); G.endTurn(); }
  if (S.beast !== 2) f(`日が経っても病が進まない（${S.beast}）`);
  if (G.chance("筋力", 0) !== G.clamp(S.stats.筋力 + 5, 5, 95)) f("爪の段で筋力の判定が上がらない");
  // 1〜2 段は教会で祓える
  S.gold = 500; S.loc = "karna"; S.mode = "explore";
  G.act("fac:church");
  if (!acts().some((a) => a.id === "m5:purge")) f("教会に祓いが出ない");
  G.act("m5:purge");
  if (S.beast !== 0) f("祓っても病が治らない");
  G.act("back");
  // 3 段で教会・王城に入れない。検めの出来事が起きうる
  S.beast = 3;
  G.act("fac:church");
  if (S.mode !== "explore" || S.fac) f("毛と牙を隠せないのに教会に入れる");
  if (!D.EVENTS.find((e) => e.id === "m5_inspect").cond(S)) f("3 段で門の検めが起きない");
  // 獣の病がうつるのは疫医ベルナからだけ（M9 #103）。人狼に噛まれてもうつらない。くわしくは tests/checks/m9_plague.mjs
  S = start("merc", 508);
  for (let i = 0; i < 30; i++) {
    G.startCombat(["werewolf"], {});
    const w = D.ENEMIES.werewolf, hit = w.hit; w.hit = 999;
    try { for (let k = 0; k < 5 && S.combat; k++) G.combatAct("guard"); } finally { w.hit = hit; }
    S.combat = null; S.mode = "explore";
  }
  if (G.beastOf(S) > 0) f("人狼に噛まれて病がうつった（うつすのは疫医ベルナだけ）");
  let pricked = false;
  for (let i = 0; i < 30 && !pricked; i++) {
    G.startCombat(["e2_berna"], {});
    const b = D.ENEMIES.e2_berna, hit = b.hit; b.hit = 999;
    try { for (let k = 0; k < 5 && S.combat; k++) G.combatAct("guard"); } finally { b.hit = hit; }
    S.combat = null; S.mode = "explore";
    pricked = G.beastOf(S) > 0;
  }
  if (!pricked) f("疫医ベルナに傷を負わされても病がうつらない");
  // 5 段で終わる。次の冒険で、その名の獣に会うことがある
  S = start("merc", 509, { profile: { name: "ガルド", sex: "男", age: 30, history: "テスト用", personality: "無口" } });
  G.P.graves = [];
  G.beastUp(5);
  if (!(S.over === "dead" && S.fate === "beast" && G.P.graves[0].fate === "beast")) f("獣 5 で冒険が終わらないか、墓碑に残らない");
  if (!(G.P.beasts && G.P.beasts[0].name === "ガルド")) f("獣になった者が冒険をまたいで残らない");
  const P = G.P;
  start("merc", 510); G.P = P;
  if (!(G.m5OldBeast() && D.EVENTS.find((e) => e.id === "m5_oldbeast").cond(G.S))) f("前の冒険の獣の出来事が起きない");
  G.startCombat(["m5_oldbeast"], {});
  if (!G.S.combat.foes[0].name.includes("ガルド")) f("前の冒険の獣に名前が付かない");
  G.S.combat = null; G.S.mode = "explore";
  // 古いセーブ（冒険をまたぐ記録に beasts が無い）
  G.P = { trophies: {}, graves: [] };
  if (G.m5OldBeast() !== null) f("記録が無いのに前の獣が出る");

  // ---------------------------------------------------------------- 代償つきの品
  S = start("merc", 511);
  G.give("m5_namecrown"); G.equip("m5_namecrown");
  if (G.statEff("知力") !== 60) f("忘れ名の冠で知力が上がらない");
  for (let d = 0; d < 6; d++) { G.passDays(1); G.endTurn(); }
  if (S.profile.name !== "名も知れぬ者" || S.m5.trueName !== "テスト") f(`冠で名前を忘れない（${S.profile.name}）`);
  S = start("merc", 512);
  G.give("m5_weepcleaver"); G.equip("m5_weepcleaver");
  for (let i = 0; i < 20; i++) { G.startCombat(["ogre"], {}); G.S.combat.foes[0].hp = 999; const r = G.rand; G.rand = () => 0.01; try { G.combatAct("attack"); } finally { G.rand = r; } G.S.combat = null; G.S.mode = "explore"; }
  if (!(S.sanity < 100)) f("泣き鉈で斬っても正気が減らない");
  S = start("merc", 513);
  G.give("m5_fleshhook"); G.equip("m5_fleshhook");
  const mh = S.maxHp;
  for (let i = 0; i < 30; i++) { G.startCombat(["ogre"], {}); G.S.combat.foes[0].hp = 999; const r = G.rand; G.rand = () => 0.01; try { G.combatAct("attack"); } finally { G.rand = r; } G.S.combat = null; G.S.mode = "explore"; }
  if (!(S.maxHp < mh && S.hp <= S.maxHp)) f("肉削ぎの鉤で HP の上限が減らない");
  S = start("merc", 514);
  G.give("m5_bloodring"); G.equip("m5_bloodring");
  S.hp = 10;
  G.startCombat(["ogre"], {}); G.S.combat.foes[0].hp = 999;
  { const r = G.rand; G.rand = () => 0.01; try { G.combatAct("attack"); } finally { G.rand = r; } }
  if (!(S.hp > 10 - 1 && S.log.some((l) => /指輪の石が温かくなった/.test(l.text || "")))) f("血吸いの指輪で HP が戻らない");
  G.S.combat = null; G.S.mode = "explore";
  S = start("merc", 515);
  G.give("m5_whispershell"); G.equip("m5_whispershell");
  G.startCombat(["goblin"], {});
  if (!(S.sanity < 100)) f("囁きの貝殻を付けて戦っても正気が減らない");
  G.S.combat = null; G.S.mode = "explore";
  // 使徒を見る（使徒ごとに一度）
  S = start("merc", 516);
  const majin = Object.keys(D.ENEMIES).find((id) => D.ENEMIES[id].majin);
  G.startCombat([majin], {}); const a1 = S.sanity; G.S.combat = null; G.S.mode = "explore";
  G.startCombat([majin], {}); const a2 = S.sanity; G.S.combat = null; G.S.mode = "explore";
  if (!(a1 < 100 && a2 === a1)) f(`使徒を見ても正気が減らないか、二度減る（${a1}・${a2}）`);

  // ---------------------------------------------------------------- ランダムプレイで、どれくらい進むか（数えるだけ）
  const GAMES = 100, STEPS = 500;
  const r = { lowSan: 0, edge: 0, sick: 0, deep: 0, mad: 0, beast: 0, minSan: [], turns: 0 };
  for (let g = 0; g < GAMES; g++) {
    start(Object.keys(D.CLASSES)[g % 5], 2000 + g);
    const S = G.S;
    const c = D.CLASSES[S.cls];
    D.STATS.forEach((k) => { S.stats[k] = c.base[k] + 5; S.caps[k] = S.stats[k] + 30; });
    S.maxHp = S.hp = G.maxHpOf(S.stats);
    try {
      for (let step = 0; step < STEPS && !S.over; step++) {
        const a = acts().filter((x) => !x.disabled);
        if (!a.length) break;
        G.act(a[Math.floor(G.rand() * a.length)].id);
        if (!(G.sanityOf(S) >= 0 && G.sanityOf(S) <= 100)) { f(`game ${g}: 正気が範囲外 ${S.sanity}`); break; }
        if (!(G.beastOf(S) >= 0 && G.beastOf(S) <= 5)) { f(`game ${g}: 獣が範囲外 ${S.beast}`); break; }
      }
    } catch (e) { f(`game ${g}: 例外 ${e.stack || e}`); }
    const low = S.m5 && S.m5.low !== undefined ? S.m5.low : 100;
    if (low < 70) r.lowSan++;
    if (low < 40) r.edge++;
    if (G.beastOf(S) > 0 || S.chronicle.some((x) => x.kind === "beast")) r.sick++;
    if (S.chronicle.some((x) => x.kind === "beast" && x.text === D.M5.BEAST_CHRON[3])) r.deep++;
    if (S.fate === "mad") r.mad++;
    if (S.fate === "beast") r.beast++;
    r.turns += S.turn;
  }
  console.log(`NOTE M5 ランダムプレイ ${GAMES} 回：正気が 70 を割った ${r.lowSan}・40 を割った ${r.edge}・発狂 ${r.mad}／獣の病にかかった ${r.sick}・3 段に達した ${r.deep}・獣になった ${r.beast}／平均 ${Math.round(r.turns / GAMES)} 手番`);

  if (!bad) ok(`M5 正気・獣の病・代償つきの品（出来事 ${m5ev.length}・品 ${m5items.length}・古いセーブ・術の借り・症状・懺悔・発狂・獣・祓い・人狼ではうつらない・ベルナからうつる・前の冒険の獣・品の代償）`);
};
