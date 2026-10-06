// K2：パッシブスキル（持っているだけで常に効く）と、呼び名の整理（気力を使う技は「戦技」、持っているだけで効くものは「スキル」）
// - データ：25〜40 種。どれにも効き目と覚え方がある（稽古・師・巻物・失敗から）。巻物は店か落とし物で手に入る
// - 効き目：判定の理由の補正（画面の成功率にも出る）・状況の補正（夜）・行動の補正（gearBonus）・正気の減り・獣の病・毒・鎧の重さ・二刀・気力・眠り
// - 失敗から覚える：理由に合う判定の大失敗を重ねると身につく。覚えたわけの一文と目立つ一行。ひどい目に遭っても身につく（正気）
// - 呼び名：戦闘の組は「戦技」、覚えた一行は戦技とスキルで言い分ける。古いセーブ（S.k1.k2 が無い）でも動く
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const K = G.k1, K2 = G.k2;
  if (!K || !K2) { fail("G.k1・G.k2 が無い"); return; }
  const SK = D.SKILLS;
  const ids = K2.ids;

  // ---------------------------------------------------------------- データ
  if (ids.length < 25 || ids.length > 40) fail(`パッシブスキルが ${ids.length} 種（25〜40）`);
  const FX = ["check", "bonus", "chance", "sanity", "beast", "poison", "armorAgi", "dual", "kiMax", "rest"];
  const SUFFER = ["sanity", "poison", "beast", "brink"];
  const scrolls = new Set([...Object.values(D.LOCS).flatMap((L) => L.shop || []), ...Object.values(D.ENEMIES).flatMap((e) => (e.loot || []).map(([id]) => id))]);
  let fumbleN = 0;
  for (const id of ids) {
    const s = SK[id];
    if (!/^k2_/.test(id)) fail(`${id}：id の頭が k2_ でない`);
    if (!s.name || !s.hint) fail(`${id}：名前か効き目の言葉が無い`);
    const keys = Object.keys(s.fx || {});
    if (!keys.length || keys.some((k) => !FX.includes(k))) fail(`${id}：効き目が無いか知らない効き目（${keys}）`);
    if (s.fx.check && (typeof (s.fx.check.re && s.fx.check.re.test) !== "function" || !(s.fx.check.n > 0) || s.fx.check.n > 15)) fail(`${id}：判定の補正が変（強すぎない：15％まで）`);
    if (s.fx.bonus && !(s.fx.bonus.n > 0 && s.fx.bonus.n <= 10)) fail(`${id}：行動の補正が変`);
    if (s.fx.chance && !(s.fx.chance.n > 0 && s.fx.chance.n <= 5)) fail(`${id}：状況の補正が強すぎる`);
    if (s.fx.sanity && !(s.fx.sanity >= 0.5 && s.fx.sanity < 1)) fail(`${id}：正気の減りの倍率が変`);
    const L = s.learn || {};
    if (!L.train && !L.camp && !(L.teach || []).length && !L.scroll && !L.fumble && !L.suffer) fail(`${id}：覚え方が無い`);
    for (const t of L.teach || []) if (!D.K1_TEACHERS[t]) fail(`${id}：教える人 ${t} が無い`);
    if (L.fumble) { fumbleN++; if (!s.fx.check || !L.fumble.why) fail(`${id}：失敗から覚えるのに、判定の補正か覚えたわけの文が無い`); }
    if (L.suffer && (!SUFFER.includes(L.suffer.kind) || !L.suffer.why)) fail(`${id}：ひどい目の種類か覚えたわけの文が変`);
    const why = (L.fumble && L.fumble.why) || (L.suffer && L.suffer.why) || "";
    if (/(気がする|気がした|少しだけ|どこか|……)/.test(why)) fail(`${id}：覚えたわけの文に避ける癖（${why}）`);
    if (L.scroll) {
      const it = D.ITEMS[D.K1_SCROLL(id)];
      if (!it || it.skill !== id) fail(`${id}：巻物が無い`);
      else if (!scrolls.has(D.K1_SCROLL(id))) fail(`${id}：巻物が店にも落とし物にも無い`);
    }
  }
  if (fumbleN < 10) fail(`失敗から覚えるスキルが ${fumbleN} しかない（10 以上）`);
  if (!SK.k2_steadymind || SK.k2_steadymind.fx.sanity == null) fail("正気が下がりにくいスキルが無い");
  if (!SK.k2_keyfeel || !SK.k2_keyfeel.learn.fumble || !SK.k2_keyfeel.fx.check.re.test("錠をこじ開ける")) fail("解錠の失敗から覚える「鍵穴の勘」が無い");

  // ---------------------------------------------------------------- 遊びの準備
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  const start = (cls = "merc", seed = 21, n = 14) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls, stats: st(n), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    G.S.gold = 1000; G.S.companions = [];
    return G.S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);

  // 古いセーブ
  { const S = start(); delete S.k1; try { K2.state(S); acts(); if (!S.k1 || !S.k1.k2) fail("古いセーブでスキルの記録が作られない"); } catch (e) { fail(`古いセーブで例外 ${e.stack || e}`); } }

  // ---------------------------------------------------------------- 呼び名
  {
    const S = start("merc");
    G.startCombat(["goblin"]);
    const titles = G.actions().map((g) => g.title || "");
    if (!titles.some((t) => /^戦技（気力/.test(t))) fail(`戦闘の組が「戦技」になっていない（${titles.join("／")}）`);
    if (titles.some((t) => /^技（/.test(t))) fail("戦闘の組に「技（」が残っている");
    S.combat = null; S.mode = "explore";
    K.learn("k1_twinfang"); K.learn("k2_runner");
    const lines = S.log.filter((l) => l.k === "grow" && l.k1).map((l) => l.text);
    if (!lines.some((t) => /^戦技「返し刃」を覚えた/.test(t))) fail(`戦技を覚えた一行が「戦技」でない（${lines}）`);
    if (!lines.some((t) => /^スキル「逃げ足」を身につけた/.test(t))) fail(`スキルを身につけた一行が「スキル」でない（${lines}）`);
    if (!K.isArt("k1_parry") || K.isArt("k1_lockpick") || K.isArt("k2_runner")) fail("戦技とスキルの分け方が変（受け流しは戦技、鍵開け・逃げ足はスキル）");
  }

  // ---------------------------------------------------------------- 効き目
  {
    const S = start("merc", 31);
    // 判定の理由の補正と、画面の成功率
    G.startCombat(["bandit"]);
    const flee0 = acts().find((a) => a.id === "cb:flee").sub;
    S.skills.push("k2_runner");
    const flee1 = acts().find((a) => a.id === "cb:flee").sub;
    const pct = (t) => +(/(\d+)%/.exec(t) || [0, 0])[1];
    if (!(pct(flee1) > pct(flee0))) fail(`逃げ足を持っても逃げる成功率が上がらない（${flee0} → ${flee1}）`);
    if (K2.checkBonus("逃走").n !== 15) fail("逃走の判定に補正が付かない");
    S.combat = null; S.mode = "explore";
    // 行動の補正（gearBonus）
    const g0 = G.gearBonus("steal");
    S.skills.push("k2_lightfingers");
    if (!(G.gearBonus("steal") > g0)) fail("掏摸の指で盗みの補正が上がらない");
    // 夜の補正（G.chance。画面と判定が同じ数）
    S.phase = 3;
    const n0 = G.chance("知力", "普通");
    S.skills.push("k2_nighteye");
    if (!(G.chance("知力", "普通") > n0)) fail("夜目で夜の判定が上がらない");
    S.phase = 1;
    if (G.chance("知力", "普通") !== n0 && G.chance("知力", "普通") > n0 + 1) fail("夜目が昼にも効く");
    // 正気の減り
    S.sanity = 100;
    G.addSanity(-10);
    const lost0 = 100 - G.sanityOf(S);
    S.sanity = 100; S.skills.push("k2_steadymind");
    G.addSanity(-10);
    const lost1 = 100 - G.sanityOf(S);
    if (!(lost1 < lost0 && lost1 > 0)) fail(`据わった肝で正気の減りが軽くならない（${lost0} → ${lost1}）`);
    S.sanity = 100;
    // 気力の最大
    const k0 = K.kiMax(S);
    S.skills.push("k2_deepbreath");
    if (K.kiMax(S) !== k0 + 1) fail("息の長さで気力の最大が増えない");
    // 鎧の重さ
    const heavy = Object.keys(D.ITEMS).find((id) => D.ITEMS[id].type === "armor" && D.ITEMS[id].agi < -5 && (!D.ITEMS[id].slot || D.ITEMS[id].slot === "body"));
    if (heavy) {
      G.give(heavy); G.equip(heavy);
      const a0 = G.armor().agi;
      S.skills.push("k2_heavyarmor");
      if (!(G.armor().agi > a0)) fail(`重鎧慣れで鎧の重さが軽くならない（${a0} → ${G.armor().agi}）`);
    }
    // 二刀
    S.weapon = "longsword"; S.off = "";
    G.give("dagger"); G.equip("dagger", "off");
    if (G.weapon().dual) {
      const d0 = G.weapon().dmg[2];
      S.skills.push("k2_twohands");
      if (!(G.weapon().dmg[2] > d0)) fail("二刀の扱いで威力が上がらない");
    }
    // 眠り
    S.hp = 1;
    S.skills.push("k2_sleeper");
    G.sleep();
    if (!(S.hp > 1)) fail("寝つきの良さで眠っても HP が戻らない");
  }
  // 毒を振り払う
  {
    D.EVENTS.push({ id: "k2_test_poison", where: [], w: 0, title: "テスト", text: "テスト", choices: [{ label: "毒を受ける", ok: { text: "毒が回った。", cond: "毒" } }] });
    let shook = 0, kept = 0;
    for (let seed = 0; seed < 30; seed++) {
      const S = start("merc", 400 + seed);
      S.skills.push("k2_poisonblood");
      S.mode = "event"; S.event = "k2_test_poison";
      G.act("ev:0");
      if (S.conds.includes("毒")) kept++; else shook++;
    }
    if (!shook || !kept) fail(`毒慣れの振り払いが極端（振り払った ${shook}・残った ${kept}）`);
    D.EVENTS.pop();
  }
  // 獣の病
  {
    let held = 0;
    for (let seed = 0; seed < 30; seed++) {
      const S = start("merc", 500 + seed);
      S.skills.push("k2_beastward");
      S.beast = 1;
      G.beastUp(1);
      if (S.beast === 1) held++;
    }
    if (!(held > 2 && held < 25)) fail(`獣の病への抗いの踏みとどまりが極端（${held}/30）`);
  }

  // ---------------------------------------------------------------- 失敗から覚える
  {
    const S = start("thief", 601, 10);
    S.skills = S.skills.filter((id) => id !== "k2_keyfeel");
    let n = 0, fumbles = 0;
    while (!K.knows("k2_keyfeel") && n++ < 4000) { const r = G.check("敏捷", "難しい", "錠をこじ開ける"); if (r.fumble) fumbles++; }
    if (!K.knows("k2_keyfeel")) fail(`解錠で何度大失敗しても鍵穴の勘を覚えない（大失敗 ${fumbles}）`);
    else {
      if (fumbles < 1) fail("大失敗していないのに鍵穴の勘を覚えた");
      const line = S.log.find((l) => l.k === "grow" && l.k1 === "k2_keyfeel");
      if (!line || line.learn !== "fumble" || !/^スキル「鍵穴の勘」を身につけた/.test(line.text)) fail(`失敗から覚えた一行が変（${line && line.text}）`);
      const i = S.log.indexOf(line);
      if (!S.log.slice(Math.max(0, i - 3), i).some((l) => l.text === SK.k2_keyfeel.learn.fumble.why)) fail("失敗から覚えたわけの一文が無い");
      if (!(K2.state(S).fum.k2_keyfeel >= 1)) fail("解錠の失敗が数えられていない");
    }
    // 理由が合わない判定の失敗では覚えない
    const S2 = start("thief", 602, 10);
    S2.skills = [];
    for (let i = 0; i < 1500; i++) G.check("魅力", "難しい", "歌を歌う");
    if (K.knows("k2_keyfeel") || K.knows("k2_trapnose")) fail("関係の無い判定の失敗で、錠や罠のスキルを覚えた");
  }
  // ひどい目に遭って覚える（正気）
  {
    const S = start("merc", 701);
    let n = 0;
    while (!K.knows("k2_steadymind") && n++ < 200) { S.sanity = 100; G.addSanity(-5); }
    if (!K.knows("k2_steadymind")) fail("正気を何度削られても据わった肝を覚えない");
    if (n < 2) fail("正気を一度削られただけで据わった肝を覚えた（見込みが高すぎる）");
  }

  if (!bad) ok(`パッシブスキル（${ids.length} 種・失敗から覚える ${fumbleN}／戦技とスキルの呼び分け・効き目・失敗から覚える）`);
};
