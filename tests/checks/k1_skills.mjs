// K1：スキル（技）
// - データ：技は 30 以上・どの技にも覚え方がある。師・巻物・訓練場の町・節目・武器の型・選択肢の技・出来事が実在する
// - 古いセーブ（S.skills・S.k1 が無い）でも動く。職業ごとのはじめの技
// - 戦闘：技は「技」の組に出る。型が合わない・気力が足りない技は理由つきで押せない。気力が減り、身を守る・眠ると戻る
//   F1 の読み合いとつながる：抜き打ちが溜めを潰す・受け流しが大技を崩して斬り返す・誘いで大技の気配が出る・見切りで ◎・毒・型
// - 覚え方：訓練場（金と日数。しくじっても積み重ね）・師（条件が足りないとうっすら）・仲間（打ち解けると）・巻物（読めない条件）・野営の稽古
// - 熟練：使うと数え、段が上がる。戦闘の外：技で現れる選択肢（技が無ければ出ない）・施設の「身につけた技で」は一日に一度
export default ({ fail: fail0, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const K = G.k1;
  if (!K || !D.SKILLS) { fail("G.k1・D.SKILLS が無い"); return; }
  const SK = D.SKILLS;
  const ids = Object.keys(SK);

  // ---------------------------------------------------------------- データ
  if (ids.length < 30 || ids.length > 50) fail(`技の数が ${ids.length}（30〜50）`);
  const STYLES = new Set(["剣", "刀", "短剣", "斧", "槌", "槍", "弓", "杖", "鞭", "投げ物", "拳", "盾", "二刀", "両手"]);
  const FX = new Set(["hit", "parry", "counter", "stance", "wall", "read", "heal", "focus", "feint"]);
  const facs = new Set(Object.values(D.LOCS).flatMap((L) => L.fac || []));
  const kinds = { combat: 0, field: 0, both: 0 };
  for (const id of ids) {
    const s = SK[id];
    kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    if (!/^k1_/.test(id)) fail(`技 ${id}：id の頭が k1_ でない`);
    if (!s.name || !s.hint) fail(`技 ${id}：名前か効き目が無い`);
    if (!["combat", "field", "both"].includes(s.kind)) fail(`技 ${id}：種類が変（${s.kind}）`);
    if (s.stat !== "武器" && !D.STATS.includes(s.stat)) fail(`技 ${id}：判定の能力値が無い（${s.stat}）`);
    if (s.kind === "field" && s.stat === "武器") fail(`技 ${id}：戦闘の外の技が武器で判定する`);
    for (const k of Object.keys(s.need || {})) if (!D.STATS.includes(k)) fail(`技 ${id}：目安の能力値 ${k} が無い`);
    if (!Object.keys(s.need || {}).length) fail(`技 ${id}：必要な能力値の目安が無い`);
    for (const k of s.style || []) if (!STYLES.has(k)) fail(`技 ${id}：知らない武器の型 ${k}`);
    if (s.kind !== "field" && (!s.fx || !FX.has(s.fx.t))) fail(`技 ${id}：戦闘の効き目が無い`);
    if (s.kind !== "field" && !Number.isFinite(s.ki)) fail(`技 ${id}：気力が無い`);
    const L = s.learn || {};
    if (!L.train && !L.camp && !(L.teach || []).length && !L.scroll) fail(`技 ${id}：覚え方が無い`);
    for (const t of L.teach || []) if (!D.K1_TEACHERS[t]) fail(`技 ${id}：教える人 ${t} が無い`);
    if (L.scroll && (!D.ITEMS["k1s_" + id.slice(3)] || D.ITEMS["k1s_" + id.slice(3)].skill !== id)) fail(`技 ${id}：巻物 k1s_${id.slice(3)} が無い`);
    if (L.train) {
      if (!(L.train.gold > 0) || !(L.train.days > 0)) fail(`技 ${id}：鍛錬の金か日数が無い`);
      for (const loc of L.train.towns || []) if (!D.LOCS[loc] || !(D.LOCS[loc].fac || []).includes("train")) fail(`技 ${id}：鍛錬の町 ${loc} が無いか、訓練場が無い`);
      for (const c of L.train.cls || []) if (!D.CLASSES[c]) fail(`技 ${id}：鍛錬の職業 ${c} が無い`);
      if (L.train.mark && !(G.f3m && G.f3m.mark(L.train.mark[0], L.train.mark[1]))) fail(`技 ${id}：鍛錬の節目 ${L.train.mark} が無い`);
    }
  }
  if (kinds.combat + kinds.both < 15 || kinds.field + kinds.both < 10) fail(`戦闘の技 ${kinds.combat + kinds.both}・戦闘の外の技 ${kinds.field + kinds.both}（15・10 以上）`);
  for (const [tid, T] of Object.entries(D.K1_TEACHERS)) {
    if (!K.taughtBy(tid).length) fail(`師 ${tid}：教える技が無い`);
    if (T.fac && !facs.has(T.fac)) fail(`師 ${tid}：施設 ${T.fac} がどの町にも無い`);
    if (T.ev && !D.EVENTS.some((e) => e.id === T.ev)) fail(`師 ${tid}：出来事 ${T.ev} が無い`);
    if (T.comp && !(G.c10 && G.c10.KIND_NAMES[T.comp])) fail(`師 ${tid}：仲間の得意 ${T.comp} が無い`);
    if (!T.fac && !T.ev && !T.comp) fail(`師 ${tid}：どこにもいない`);
  }
  for (const [cls, list] of Object.entries(D.SKILL_START)) { if (!D.CLASSES[cls]) fail(`はじめの技：職業 ${cls} が無い`); for (const id of list) if (!SK[id]) fail(`はじめの技：${id} が無い`); }
  for (const cls of Object.keys(D.CLASSES)) if (!(D.SKILL_START[cls] || []).length) fail(`職業 ${cls} にはじめの技が無い`);
  const scrolls = Object.keys(D.ITEMS).filter((id) => D.ITEMS[id].type === "k1scroll");
  for (const id of scrolls) { const it = D.ITEMS[id]; if (!SK[it.skill]) fail(`巻物 ${id}：技 ${it.skill} が無い`); if (!(it.price > 0) || !it.desc) fail(`巻物 ${id}：値段か説明が無い`); }
  const inShop = new Set(Object.values(D.LOCS).flatMap((L) => L.shop || []).filter((id) => scrolls.includes(id)));
  const inLoot = new Set(Object.values(D.ENEMIES).flatMap((e) => (e.loot || []).map(([id]) => id)).filter((id) => scrolls.includes(id)));
  for (const id of scrolls) if (!inShop.has(id) && !inLoot.has(id)) fail(`巻物 ${id}：店にも落とし物にも無い（図鑑の入手場所が引けない）`);
  if (inShop.size < 10) fail(`店に並ぶ巻物が ${inShop.size} 種しかない`);
  if (inLoot.size < 10) fail(`敵が落とす巻物が ${inLoot.size} 種しかない`);
  for (const [loc, list] of Object.entries(D.K1_SHOP)) { if (!D.LOCS[loc]) fail(`巻物の店：場所 ${loc} が無い`); for (const id of list) if (!SK[id]) fail(`巻物の店：技 ${id} が無い`); }
  for (const [eid, list] of Object.entries(D.K1_DROPS)) { if (!D.ENEMIES[eid]) fail(`巻物の落とし物：敵 ${eid} が無い`); for (const [id] of list) if (!SK[id]) fail(`巻物の落とし物：技 ${id} が無い`); }
  const cats = new Set([...Object.keys(D.C10_CATS || {}), ...Object.keys(D.K1_CATS || {})]);
  for (const t of D.K1_TPL) { if (!SK[t.sk] || SK[t.sk].kind === "combat") fail(`型「${t.label}」：戦闘の外の技 ${t.sk} でない`); if (!cats.has(t.cat)) fail(`型「${t.label}」：種類 ${t.cat} が無い`); }
  for (const [eid, list] of Object.entries(D.K1_ADD)) { if (!D.EVENTS.some((e) => e.id === eid)) fail(`手書きの選択肢：出来事 ${eid} が無い`); for (const t of list) if (!SK[t.sk]) fail(`手書きの選択肢：技 ${t.sk} が無い`); }
  for (const [fac, list] of Object.entries(D.K1_FAC)) { if (!facs.has(fac)) fail(`施設の選択肢：施設 ${fac} が無い`); for (const t of list) if (!SK[t.sk]) fail(`施設の選択肢：技 ${t.sk} が無い`); }
  // 戦闘の外の技は、どれも出来事か施設か探索のどこかで使える
  const usedField = new Set([...D.K1_TPL.map((t) => t.sk), ...Object.values(D.K1_ADD).flat().map((t) => t.sk), ...Object.values(D.K1_FAC).flat().map((t) => t.sk), "k1_camp", "k1_firstaid"]);
  for (const id of ids) if (SK[id].kind === "field" && !usedField.has(id)) fail(`戦闘の外の技 ${id} を使う場面が無い`);
  const withK1 = D.EVENTS.filter((e) => e.choices.some((c) => c.k1 && !/^k1_/.test(e.id)));
  if (withK1.length < 60) fail(`技で現れる選択肢を足した出来事が ${withK1.length} 件（60 件以上）`);

  // ---------------------------------------------------------------- 遊びの準備
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  const start = (cls = "merc", seed = 11, n = 16) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls, stats: st(n), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.gold = 2000; S.companions = [];
    return S;
  };
  const acts = () => G.actions().flatMap((g) => g.list);
  const find = (id) => acts().find((a) => a.id === id);
  const lastText = (n = 12) => G.S.log.slice(-n).map((l) => l.text).join("\n");

  // はじめの技
  for (const cls of Object.keys(D.CLASSES)) { const S = start(cls); if (String(S.skills) !== String(D.SKILL_START[cls])) fail(`${cls} のはじめの技が ${S.skills}`); if (!(S.k1.ki > 0)) fail(`${cls} の気力が無い`); }

  // 古いセーブ
  {
    const S = start();
    delete S.skills; delete S.k1;
    try {
      acts();
      G.startCombat(["goblin"]);
      acts();
      G.act("cb:guard");
      S.combat = null; S.mode = "explore";
      if (!Array.isArray(S.skills) || !S.k1) fail("古いセーブで技と気力の欄が作られない");
      if (K.view(S).length) fail("古いセーブで、覚えていない技が一覧に出る");
    } catch (e) { fail(`古いセーブで例外 ${e.stack || e}`); }
  }

  // ---------------------------------------------------------------- 戦闘
  {
    const S = start("merc");
    S.skills = ["k1_parry", "k1_aim", "k1_drawcut", "k1_guardform", "k1_read", "k1_feint", "k1_venom", "k1_focus"];
    S.weapon = "longsword";
    G.startCombat(["bandit"]);
    const grp = G.actions().find((g) => /^技（気力/.test(g.title || ""));
    if (!grp) fail("戦闘に「技」の組が無い");
    else {
      const aim = grp.list.find((a) => a.id === "cb:k1:k1_aim");
      if (!aim || !aim.disabled || !/弓/.test(aim.sub)) fail(`剣で狙い撃ちが押せる・理由が無い（${aim && aim.sub}）`);
      const venom = grp.list.find((a) => a.id === "cb:k1:k1_venom");
      if (!venom || !venom.disabled) fail("剣で毒刃が押せる");
      const parry = grp.list.find((a) => a.id === "cb:k1:k1_parry");
      if (!parry || parry.disabled || !/%/.test(parry.sub) || !/気力/.test(parry.sub)) fail(`受け流しの添え書きが変（${parry && parry.sub}）`);
    }
    // 気力が減る・足りないと押せない
    const ki0 = K.ki(S);
    G.act("cb:k1:k1_guardform");
    if (S.combat && K.ki(S) !== ki0 - SK.k1_guardform.ki) fail(`守りの型で気力が減らない（${ki0}→${K.ki(S)}）`);
    if (S.combat && !(S.combat.k1stance && S.combat.k1stance.k === "guard")) fail("守りの型に入らない");
    if (S.combat) {
      S.k1.ki = 0;
      const p = find("cb:k1:k1_parry");
      if (!p || !p.disabled || !/気力が足りない/.test(p.sub)) fail(`気力が無いのに受け流しが押せる（${p && p.sub}）`);
      G.act("cb:guard");
      if (S.combat && K.ki(S) < 1) fail("身を守っても気力が戻らない");
    }
    S.combat = null; S.mode = "explore";
    S.k1.ki = 0;
    G.sleep();
    if (K.ki(S) !== K.kiMax(S)) fail("眠っても気力が戻らない");
  }
  // 抜き打ちが溜めを潰す
  {
    let cut = false;
    for (let seed = 1; seed < 40 && !cut; seed++) {
      const S = start("samurai", 100 + seed, 30);
      S.weapon = "katana";
      G.startCombat(["blackknight"]);
      const f = S.combat.foes[0];
      f.f1i = { k: "heavy" };
      G.act("cb:k1:k1_drawcut");
      if (/技を潰した/.test(lastText(20))) cut = true;
    }
    if (!cut) fail("抜き打ちで大技の溜めを潰せない");
  }
  // 受け流しが大技を崩して斬り返す
  {
    let parried = false;
    for (let seed = 1; seed < 40 && !parried; seed++) {
      const S = start("merc", 200 + seed, 30);
      S.weapon = "longsword";
      G.startCombat(["blackknight"]);
      const f = S.combat.foes[0];
      f.f1i = { k: "heavy" };
      const hp0 = f.hp;
      G.act("cb:k1:k1_parry");
      if (/斬り返す/.test(lastText(20)) && (f.hp < hp0) && (f.f1stun || /崩れ|泳いだ/.test(lastText(20)))) parried = true;
    }
    if (!parried) fail("受け流しで大技を崩して斬り返せない");
  }
  // 誘い：次の手番に大技の気配
  {
    let lured = false;
    for (let seed = 1; seed < 40 && !lured; seed++) {
      const S = start("merc", 300 + seed, 30);
      S.skills.push("k1_feint");
      G.startCombat(["bandit", "bandit"]);
      G.act("cb:k1:k1_feint");
      if (S.combat && S.combat.foes.some((f) => f.hp > 0 && f.f1i && f.f1i.k === "heavy")) lured = true;
    }
    if (!lured) fail("誘いの隙で、大技の気配が出ない");
  }
  // 見切り：知らない敵でも ◎
  {
    const S = start("merc", 401, 30);
    S.skills.push("k1_read");
    G.P = { trophies: {}, graves: [], codex: {} };
    G.startCombat(["blackknight"]);
    S.combat.k1read = true;
    S.combat.foes[0].f1i = { k: "heavy" };
    if (!acts().some((a) => /^◎/.test(a.sub || ""))) fail("見切りのあとも ◎ が付かない");
  }
  // 毒：敵が蝕まれる
  {
    let bled = false;
    for (let seed = 1; seed < 30 && !bled; seed++) {
      const S = start("thief", 500 + seed, 30);
      S.weapon = "dagger"; S.skills.push("k1_venom");
      G.startCombat(["orc"]);
      G.act("cb:k1:k1_venom");
      if (S.combat && /毒が/.test(lastText(30))) bled = true;
      if (!S.combat && /傷口が、黒ずみ/.test(lastText(30))) bled = true;
    }
    if (!bled) fail("毒刃の毒が回らない");
  }
  // すべての戦闘の技を、合う武器で一度ずつ使っても壊れない
  {
    const WEAPON = { 剣: "longsword", 刀: "katana", 短剣: "dagger", 斧: "axe", 槌: "mace", 槍: Object.keys(D.ITEMS).find((id) => D.ITEMS[id].i3 && D.ITEMS[id].i3.k === "槍"), 弓: Object.keys(D.ITEMS).find((id) => D.ITEMS[id].i3 && D.ITEMS[id].i3.k === "弓"), 杖: "staff", 拳: "fists", 投げ物: Object.keys(D.ITEMS).find((id) => D.ITEMS[id].i3 && D.ITEMS[id].i3.k === "投げ物") };
    for (const id of ids.filter((x) => SK[x].kind !== "field")) {
      const S = start("merc", 600, 30);
      S.skills = [id];
      const need = (SK[id].style || []).find((k) => WEAPON[k] || k === "盾" || k === "二刀");
      if (SK[id].style && !need) { fail(`技 ${id}：試せる武器が無い`); continue; }
      if (need === "盾") { S.weapon = "longsword"; G.give("i2s_buckler"); G.equip("i2s_buckler", "off"); }
      else if (need === "二刀") { S.weapon = "longsword"; G.give("dagger"); G.equip("dagger", "off"); }
      else if (need) S.weapon = WEAPON[need];
      S.hp = Math.max(1, S.hp - 5);
      G.startCombat(["orc", "goblin"]);
      const a = find("cb:k1:" + id);
      if (!a) { fail(`技 ${id} が戦闘の選択肢に出ない`); continue; }
      if (a.disabled) { fail(`技 ${id} が合う武器（${S.weapon}）でも押せない（${a.sub}）`); continue; }
      try { G.act(a.id); } catch (e) { fail(`技 ${id} で例外 ${e.stack || e}`); }
      if (!(S.hp >= 0 && S.hp <= S.maxHp)) fail(`技 ${id} のあと HP が範囲外`);
      if (K.uses(id, S) !== 1) fail(`技 ${id} を使っても熟練が数えられない`);
    }
  }
  // 武器の型
  {
    const S = start();
    const kind = (w) => { S.weapon = w; return [...K.styles(S)]; };
    if (!kind("katana").includes("刀") || !kind("dagger").includes("短剣") || !kind("fists").includes("拳") || !kind("axe").includes("斧")) fail("武器の型が決まらない");
    const bow = Object.keys(D.ITEMS).find((id) => D.ITEMS[id].i3 && D.ITEMS[id].i3.k === "弓");
    if (bow && !kind(bow).includes("弓")) fail("弓が弓の型にならない");
    // I2 の左手：盾と二刀
    S.weapon = "longsword"; S.off = "";
    G.give("i2s_buckler"); G.equip("i2s_buckler", "off");
    if (!K.styles(S).has("盾")) fail(`左手に盾を持っても盾の型にならない（${[...K.styles(S)]}）`);
    G.give("dagger"); G.equip("dagger", "off");
    if (!K.styles(S).has("二刀") || K.styles(S).has("盾")) fail(`左手に短剣を持っても二刀にならない（${[...K.styles(S)]}）`);
    G.give("axe"); G.equip("axe");
    if (K.styles(S).has("二刀") || !K.styles(S).has("両手")) fail(`両手の大斧に持ち替えても二刀のまま・両手にならない（${[...K.styles(S)]}）`);
  }

  // ---------------------------------------------------------------- 熟練
  {
    const S = start("merc");
    const lv0 = K.lv("k1_parry");
    K.use("k1_parry", D.K1_LV[1]);
    if (K.lv("k1_parry") !== lv0 + 1) fail("使っても熟練の段が上がらない");
    if (!S.log.some((l) => l.k === "grow" && l.k1 === "k1_parry" && l.lv === 1)) fail("熟練の段が上がった一行が無い");
    K.use("k1_parry", D.K1_LV[3]);
    if (K.cost("k1_parry") >= SK.k1_parry.ki && SK.k1_parry.ki > 0) fail("極みでも気力が軽くならない");
  }

  // ---------------------------------------------------------------- 覚え方：訓練場
  {
    const S = start("merc", 701, 16);
    const town = Object.keys(D.LOCS).find((id) => (D.LOCS[id].fac || []).includes("train") && D.LOCS[id].type === "town");
    S.loc = town; S.mode = "fac"; S.fac = "train";
    const a = acts().find((x) => x.id === "k1train:k1_twinfang");
    if (!a || a.disabled) fail(`訓練場で返し刃を稽古できない（${a && a.sub}）`);
    else {
      const g0 = S.gold, d0 = S.day;
      let n = 0;
      while (!K.knows("k1_twinfang") && n++ < 10) { S.mode = "fac"; S.fac = "train"; G.act("k1train:k1_twinfang"); }
      if (!K.knows("k1_twinfang")) fail("訓練場で何度稽古しても返し刃を覚えない");
      if (!(S.gold < g0) || !(S.day > d0)) fail("稽古に金か日数がかからない");
      if (!S.log.some((l) => l.k === "grow" && l.k1 === "k1_twinfang")) fail("技を覚えた一行が無い");
    }
    // 目安に届かないと押せない・町が違うと出ない
    S.stats.敏捷 = 5; S.mode = "fac"; S.fac = "train";
    const fl = acts().find((x) => x.id === "k1train:k1_flurry");
    if (!fl || !fl.disabled || !/敏捷/.test(fl.sub)) fail(`敏捷が低いのに乱れ打ちを稽古できる（${fl && fl.sub}）`);
    if (S.loc !== "yakumo" && acts().some((x) => x.id === "k1train:k1_drawcut")) fail("島の外の訓練場で抜き打ちを稽古できる");
  }
  // 師（条件が足りないとうっすら・足りれば教わる）
  {
    const S = start("mage", 801, 16);
    const town = Object.keys(D.LOCS).find((id) => (D.LOCS[id].fac || []).includes("alley"));
    S.loc = town; S.mode = "fac"; S.fac = "alley"; S.sin = 0;
    const lk = acts().find((x) => x.id === "k1lock:fence");
    if (!lk || !lk.disabled || !lk.locked || !lk.sub || /\d/.test(lk.sub)) fail(`罪の無い者に、元締めの「教わる」がうっすら出ない（${lk && lk.sub}）`);
    S.sin = 20;
    const t = acts().find((x) => x.id === "k1teach:fence:k1_lockpick");
    if (!t || t.disabled) fail("罪が濃いのに元締めに鍵開けを教われない");
    else { G.act(t.id); if (!K.knows("k1_lockpick")) fail("元締めに教わっても鍵開けを覚えない"); }
  }
  // 仲間に習う
  {
    const S = start("mage", 901, 16);
    S.loc = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "wild");
    S.companions = [{ id: "t1", name: "弓使いのイオ", cls: "弓使い", power: 45, dmg: 1, desc: "目がいい", bond: 30 }];
    if (acts().some((a) => /^k1comp:/.test(a.id))) fail("打ち解けていない仲間に技を習える");
    S.companions[0].bond = 80;
    const a = acts().find((x) => x.id === "k1comp:comp:scout:k1_aim");
    if (!a || a.disabled) fail(`打ち解けた弓使いに狙い撃ちを習えない（${a && a.sub}）`);
    else { G.act(a.id); if (!K.knows("k1_aim")) fail("仲間に習っても狙い撃ちを覚えない"); }
  }
  // 巻物
  {
    const S = start("merc", 1001, 16);
    G.give("k1s_flurry");
    S.stats.敏捷 = 5;
    const a = acts().find((x) => x.id === "k1scroll:k1s_flurry");
    if (!a || !a.disabled || !/敏捷/.test(a.sub)) fail(`敏捷が低いのに乱れ打ちの巻物が読める（${a && a.sub}）`);
    S.stats.敏捷 = 30;
    let n = 0;
    while (!K.knows("k1_flurry") && n++ < 20) G.act("k1scroll:k1s_flurry");
    if (!K.knows("k1_flurry")) fail("巻物を読んでも技を覚えない");
    if (G.count("k1s_flurry")) fail("覚えたのに巻物が残っている");
    // 古い字の巻物は古文字読みか知力が要る
    G.give("k1s_letters");
    S.stats.知力 = 15;
    const o = acts().find((x) => x.id === "k1scroll:k1s_letters");
    if (!o || !o.disabled || !/古い字/.test(o.sub)) fail(`古い字の巻物が、古文字読みなしで読める（${o && o.sub}）`);
    // 出来事の結果で巻物が手に入る・技を覚える
    const inv0 = Object.keys(S.inv).filter((id) => D.ITEMS[id] && D.ITEMS[id].type === "k1scroll").length;
    G.apply({ k1scroll: "combat" });
    if (Object.keys(S.inv).filter((id) => D.ITEMS[id] && D.ITEMS[id].type === "k1scroll").length <= inv0) fail("結果の k1scroll で巻物が手に入らない");
    G.apply({ skill: "k1_herb" });
    if (!K.knows("k1_herb")) fail("結果の skill で技を覚えない");
  }
  // 野営の稽古
  {
    const S = start("merc", 1101, 30);
    S.loc = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "wild");
    const a = acts().find((x) => /^k1camp:k1_/.test(x.id));
    if (!a) fail("荒野で野営の稽古ができない");
    S.loc = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town");
    if (acts().some((x) => /^k1camp:/.test(x.id))) fail("町の中で野営の稽古ができる");
  }

  // ---------------------------------------------------------------- 戦闘の外
  {
    const S = start("merc", 1201, 16);
    const e = withK1.find((x) => x.choices.some((c) => c.k1 === "k1_lockpick")) || withK1[0];
    const sk = e.choices.find((c) => c.k1).k1;
    S.skills = S.skills.filter((id) => id !== sk);
    S.mode = "event"; S.event = e.id;
    const shown = () => acts().filter((a) => /^ev:/.test(a.id) && a.k1 && !a.locked);
    if (shown().length) fail(`技が無いのに、出来事 ${e.id} で技の選択肢が出る`);
    S.skills.push(sk);
    const got = shown();
    if (!got.length) fail(`技 ${sk} があるのに、出来事 ${e.id} で技の選択肢が出ない`);
    else if (!got[0].sub || !got[0].sub.includes(SK[sk].name)) fail(`技の選択肢に技の名の添え書きが無い（${got[0].sub}）`);
    else {
      const u0 = K.uses(sk);
      G.act(got[0].id);
      if (K.uses(sk) !== u0 + 1) fail("技の選択肢を選んでも熟練が数えられない");
    }
    // 施設の「身につけた技で」は一日に一度
    S.skills.push("k1_song");
    S.loc = Object.keys(D.LOCS).find((id) => (D.LOCS[id].fac || []).includes("tavern") && D.LOCS[id].type === "town");
    S.mode = "fac"; S.fac = "tavern"; S.event = null;
    const f = acts().find((x) => x.id === "k1f:tavern:0");
    if (!f || f.disabled) fail("酒場で弾き語りができない");
    else {
      G.act(f.id);
      S.mode = "fac"; S.fac = "tavern";
      const f2 = acts().find((x) => x.id === "k1f:tavern:0");
      if (!f2 || !f2.disabled) fail("酒場の弾き語りが一日に何度もできる");
    }
  }

  if (!bad) ok(`スキル（技 ${ids.length}：戦闘 ${kinds.combat}・外 ${kinds.field}・両方 ${kinds.both}／師 ${Object.keys(D.K1_TEACHERS).length}・巻物 ${scrolls.length}（店 ${inShop.size}・落とし物 ${inLoot.size}）・技の選択肢のある出来事 ${withK1.length}）`);
};
