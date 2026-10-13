// V17b：持ち主の決定（2026-10-13）で拾った伏線（src/data/v17b_threads.js・v17b_kin.js・engine/zzzzzzzzzzzzzzzzzzzzzzz_v17b.js）
// - 差し込み先（既存の出来事・選択肢・場所の文）が全部見つかる（G.v17b.missing が空）
// - 足した出来事が、印が無いと起きず、印がそろうと起きる。どの選択肢でも落ちない
// - 印を読む所：ロデリクの台詞（f2_rival_hand・f2_rival_grudge）・鉤槍の留め具（f2_tsuba_kept）・剣翼の対面（v1_azlag_seen・v2_egg_returned）・
//   百面の使徒の条件（v1_shezar_lost）・カルラは一度きり（e4clue:e4k_karla）・イオリの冬（ev:c4_iori_record）・前の選択の印（v17b_bau_has など）
// - 一言・前口上・ひとこと：シグルンとロデリクに三本ずつ・黒騎士の前口上に団長の名・朧島の賭けの町
// - 灯台守の婆さま：名（エルマ）があるのは港町ヴァレンツァの一人だけ
export default ({ G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("V17b: " + m); };
  const D = G.data;
  const X = G.v17b;
  if (!X) { F("G.v17b が無い"); return; }
  (X.missing || []).forEach((m) => F(`差し込み先が無い：${m}`));
  const byId = (d, id) => d.EVENTS.find((e) => e.id === id);

  const PROFILE = { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口" };
  const fresh = (seed = 17) => {
    const g = loadEngine();
    g.rand = seeded(seed);
    g.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    g.data.STATS.forEach((k) => { stats[k] = 60; caps[k] = 80; });
    g.newGame({ cls: "merc", stats, caps, goal: Object.keys(g.data.GOALS)[0], profile: { ...PROFILE } });
    const S = g.S;
    S.maxHp = S.hp = 999; S.gold = 500;
    return g;
  };
  const textOf = (g, id) => byId(g.data, id).text;

  // ---------------------------------------------------------------- 足した出来事：起きる条件と、走らせる
  const SETUP = {
    v17b_ordo: { loc: "wasteland" },
    v17b_ordo_gate: { loc: "wasteland" },
    v17b_sea_song: { loc: "nerva", before: (g, S) => { S.w6 = { from: "nerva", dest: "w1_oboro", sea: true }; }, ready: (g, S) => { S.w6 = { from: "nerva", dest: "yakumo", sea: true, seen: [], tod: "夜" }; } },
    v17b_malvina_village: { loc: "w2_shadow", ready: (g, S) => { g.c2Meet("malvina"); S.day = 40; Object.assign(S.flags, { "ev:c19r_malvina_shield": true, v17b_malvina_read: true }); } },
    v17b_bau_dagger: { loc: "nerva", before: (g, S) => { S.flags.c5_bau_tags = true; }, ready: (g, S) => { Object.assign(S.flags, { c5_bau_tags: true, v17b_bau_has: true }); } },
    v17b_teo_go: { loc: "zephara", ready: (g, S) => { Object.assign(S.flags, { c3_boku_name: true, v17b_neilas_teo: true }); } },
    v17b_teo_door: { loc: "w3_frosleia", ready: (g, S) => { S.flags.v17b_teo_go = true; } },
  };
  const TAGS = new Set(["any", "town", "wild", "dungeon", "capital", "port", "snow", "realm", "w6"]);
  let runs = 0;
  for (const [id, set] of Object.entries(SETUP)) {
    const e0 = byId(D, id);
    if (!e0) { F(`出来事 ${id} が無い`); continue; }
    for (const w of e0.where) if (!TAGS.has(w) && !D.LOCS[w]) F(`${id}：場所 ${w} が無い`);
    for (let i = 0; i < e0.choices.length; i++) {
      const g = fresh(170 + i);
      const S = g.S;
      S.loc = set.loc; S.visited[set.loc] = true;
      const e = byId(g.data, id);
      if (set.before) set.before(g, S);
      if (e.cond && (set.ready || set.before) && e.cond(S)) F(`${id}：印がそろう前に起きる`);
      if (set.ready) set.ready(g, S);
      if (e.cond && !e.cond(S)) { F(`${id}：印がそろっても起きない`); break; }
      const ch = e.choices[i];
      if (ch.cond && !ch.cond(S)) continue;
      try {
        g.startEvent(id);
        const c = g.eventChoices().find((x) => x.c === ch);
        if (!c) { F(`${id}「${ch.label}」が選べない`); continue; }
        g.act("ev:" + c.i);
        for (let k = 0; k < 30 && S.mode === "event"; k++) g.act("ev:0");
        runs++;
      } catch (err) { F(`${id}「${ch.label}」で例外：${err.message}`); }
    }
  }
  // 選択肢の結果に印が付く（次の場面の鍵）
  {
    const g = fresh();
    const S = g.S;
    S.loc = "w3_frosleia";
    S.flags.v17b_teo_go = true;
    g.startEvent("v17b_teo_door"); g.act("ev:0");
    if (!S.flags.v17b_teo_door) F("扉越しの場面のあとに印が付かない");
    if (!(S.memos || []).some((m) => /扉は一度も開かなかった/.test(m))) F("扉越しの場面の覚え書きが無い");
  }

  // ---------------------------------------------------------------- 前の出来事の選択に印を付ける
  {
    const g = fresh();
    const S = g.S;
    const c = byId(g.data, "c5_bau_tags").choices.find((x) => /届ける/.test(x.label));
    g.apply(c.ok);
    if (!S.flags.v17b_bau_has) F("墓守の短剣を預かっても印 v17b_bau_has が付かない");
    const c2 = byId(g.data, "c5_bau_tags").choices.find((x) => /なぞり直す/.test(x.label));
    const g2 = fresh(); g2.apply(byId(g2.data, "c5_bau_tags").choices.find((x) => x.label === c2.label).ok);
    if (g2.S.flags.v17b_bau_has) F("札をなぞるのを手伝っただけで短剣を預かったことになる");
  }

  // ---------------------------------------------------------------- t09 シグルン・ロデリクの一言
  for (const [f2o, n3] of [["sigrun", 3], ["roderick", 3]]) {
    const g = fresh();
    const c = Object.assign({}, g.data.F2_MATES[f2o === "sigrun" ? "sigrun" : "roderick"]);
    const talk = g.m2Trait(c).talk || [];
    const mine = X.MATE_TALK[f2o] || [];
    if (mine.length !== n3) F(`${f2o} の一言が ${mine.length} 本（${n3} 本のはず）`);
    if (!mine.every((t) => talk.includes(t))) F(`${f2o} の一言が会話の候補に入らない`);
    const plain = g.m2Trait({ name: "ただの傭兵", desc: "", trait: c.trait });
    if (mine.some((t) => (plain.talk || []).includes(t))) F("ほかの仲間にも二人の一言が混ざる");
  }

  // ---------------------------------------------------------------- t10 ロデリクの再会
  {
    const g = fresh();
    const S = g.S;
    const rf = byId(g.data, "f2r_rod_friend").choices.find((c) => /礼を言い/.test(c.label)).ok;
    const foe = byId(g.data, "f2r_rod_foe").choices.find((c) => c.label === "剣を抜く").win;
    const a = rf.text, b = foe.text;
    S.flags.f2_rival_hand = true; S.flags.f2_rival_grudge = true;
    if (rf.text === a || !/握らなかった/.test(rf.text)) F("手を差し出した印で、ロデリクの礼の台詞が変わらない");
    if (foe.text === b || !/あの日みたいに/.test(foe.text)) F("笑った印で、ロデリクの負けたときの台詞が変わらない");
  }

  // ---------------------------------------------------------------- t11 鉤槍と留め具
  {
    const g = fresh();
    const S = g.S;
    const r = g.data.LOCS.graveyard.reward;
    if (r.text.includes(X.CLASP_LINE)) F("留め具を持っていないのに鳴る");
    S.echo = { marks: [{ k: "f2_tsuba_kept", day: 1, loc: "karna", n: 1 }], town: {} };
    if (!r.text.includes(X.CLASP_LINE)) F("留め具を持ち歩いていても、鉤槍を手にしたとき鳴らない");
    S.flags.f2_sold_tsuba = true;
    if (r.text.includes(X.CLASP_LINE)) F("売った留め具が鳴る");
  }

  // ---------------------------------------------------------------- t13 剣翼の対面
  {
    const g = fresh();
    const S = g.S;
    S.loc = "mountains";
    const e = byId(g.data, "e3_meet_azlag");
    const t0 = e.text;
    S.flags.v2_egg_returned = true;
    if (!e.text.includes(X.AZ_EGG)) F("卵を返した印で、剣翼の対面がやわらがない");
    const labels0 = g.data.EVENTS && (S.mode = "explore", g.startEvent("e3_meet_azlag"), g.eventChoices().map((x) => x.c.label));
    if (labels0.includes("身構える")) F("見ていない者にも口封じの選択肢が出る");
    S.flags.v1_azlag_seen = true;
    if (!e.text.includes(X.AZ_SEEN) || e.text.includes(X.AZ_EGG)) F("転ぶのを見た印で、口封じの文にならない");
    const labels = g.eventChoices().map((x) => x.c.label);
    if (labels.length !== 1 || labels[0] !== "身構える") F(`見た者の選択肢が口封じだけになっていない（${labels.join("・")}）`);
    g.act("ev:" + g.eventChoices()[0].i);
    if (S.mode !== "combat" || !S.combat.foes.some((f) => f.id === "e3_azlag")) F("口封じで戦いにならない");
    if (t0.includes(X.AZ_SEEN) || t0.includes(X.AZ_EGG)) F("印が無いのに対面の文が変わる");
  }

  // ---------------------------------------------------------------- t14 盤で勝った者とだけ自ら剣を取る
  {
    const g = fresh();
    const S = g.S;
    const k = () => g.e3Keys("chezar").find((x) => x.id === "board");
    if (!k() || !k().zekkai) { F("百面の使徒に盤の条件（刃が届く）が無い"); }
    else {
      if (k().met) F("盤で勝っていないのに条件を満たす");
      S.flags.v1_shezar_lost = true;
      if (!k().met || !g.e3Open("chezar")) F("盤で勝った印で、百面の使徒に刃が届かない");
    }
  }

  // ---------------------------------------------------------------- t15 竜騎手カルラ
  {
    const g = fresh();
    const S = g.S;
    const E = g.data.ENEMIES.e4k_karla;
    if (!E || E.kinOf !== "azlag" || !(E.where || []).includes("mountains")) F("竜騎手カルラが剣翼の縄張りの眷属にいない");
    else {
      if (!(g.data.LOCS.mountains.e4pool || []).includes("e4k_karla")) F("カルラが断界山脈の出現表にいない");
      if (!g.data.E4.whenOk(E, S)) F("カルラが出ない");
      const egg = byId(g.data, "v2_egg");
      S.loc = "mountains";
      const eggOk = !egg.cond || egg.cond(S);
      S.flags["e4clue:e4k_karla"] = 1;
      if (g.data.E4.whenOk(E, S)) F("倒したカルラがまた出る");
      if (eggOk && egg.cond(S)) F("カルラを倒したあとも竜の卵の少女が出る");
    }
  }

  // ---------------------------------------------------------------- t16 黒騎士団長
  {
    const open = ((D.ENEMIES.blackknight.lines || {}).open || []);
    if (!open.some((l) => /団長ハイデル/.test(l))) F("黒騎士の前口上に団長の名が無い");
    if (D.C2_PEOPLE && Object.values(D.C2_PEOPLE).some((p) => /ハイデル/.test(p.name || ""))) F("ハイデルが人物の表に足されている");
  }

  // ---------------------------------------------------------------- t17 沖の歌は、ヴァレンツァ〜シェルアークの夜の船旅だけ
  {
    const g = fresh();
    const S = g.S;
    const e = byId(g.data, "v17b_sea_song");
    if (!e || !e.w6 || e.w6.on !== "sea" || !(e.w6.tod || []).includes("夜")) F("沖の歌が夜の船旅の出来事になっていない");
    else {
      S.w6 = { from: "yakumo", dest: "nerva", sea: true, seen: [], tod: "夜" };
      if (!g.w6.fits(e, S, g.w6.ctx(S))) F("シェルアーク→ヴァレンツァの夜の船旅で沖の歌が引けない");
      S.w6.tod = "昼";
      if (g.w6.fits(e, S, g.w6.ctx(S))) F("昼にも沖の歌が引ける");
      S.w6 = { from: "nerva", dest: "w1_oboro", sea: true, seen: [], tod: "夜" };
      if (g.w6.fits(e, S, g.w6.ctx(S))) F("ほかの航路でも沖の歌が引ける");
      S.w6 = { from: "nerva", dest: "yakumo", sea: true, seen: [], tod: "夜" };
      S.flags["e3:lugu"] = true;
      if (g.w6.fits(e, S, g.w6.ctx(S))) F("海嘯の使徒を討ったあとも沖の歌が聞こえる");
    }
  }

  // ---------------------------------------------------------------- t19 イオリの棋譜
  {
    const g = fresh();
    const S = g.S;
    const b = byId(g.data, "v1_boardgame").choices.find((c) => /イオリの棋譜/.test(c.label));
    if (!b) F("北の賢人との盤に、イオリの棋譜を使う選択肢が無い");
    else {
      if (b.cond(S)) F("棋譜を受け取る前に棋譜が使える");
      S.flags["ev:c4_iori_record"] = true;
      if (!b.cond(S)) F("棋譜を受け取っても使えない");
      if (b.ok.flag !== "v1_shezar_lost") F("棋譜で勝っても、盤で勝った印が付かない");
    }
    // 冬が明けたら一行。季節は暦（G.seasonOf）で探す
    const days = []; for (let d = 1; d < 800 && days.length < 2; d++) { const s = g.seasonOf(d); if (s === "冬" && !days.length) days.push(d); else if (days.length === 1 && s !== "冬") days.push(d); }
    if (days.length < 2) F("暦に冬が無い");
    else {
      S.day = days[0] - 1 > 0 && g.seasonOf(days[0] - 1) !== "冬" ? days[0] - 1 : days[0];
      g.v17b.ioriTick(S);
      if (S.chronicle.some((c) => c.text === X.IORI_LINE)) F("冬の前に、イオリが冬を越せなかったと書かれる");
      S.day = days[0]; g.v17b.ioriTick(S);
      S.day = days[1]; g.v17b.ioriTick(S);
      const k = S.chronicle.filter((c) => c.text === X.IORI_LINE).length;
      if (k !== 1) F(`冬が明けても年表の一行が ${k} 本`);
      if (!g.c2Gone("iori", S)) F("冬を越せなかったイオリが、まだいることになっている");
      g.v17b.ioriTick(S);
      if (S.chronicle.filter((c) => c.text === X.IORI_LINE).length !== 1) F("年表の一行が二度書かれる");
    }
    const g2 = fresh();
    for (let d = 1; d < 800; d += 7) { g2.S.day = d; g2.v17b.ioriTick(g2.S); }
    if (g2.S.chronicle.some((c) => c.text === X.IORI_LINE)) F("棋譜を受け取っていないのに、イオリの一行が出る");
  }

  // ---------------------------------------------------------------- t20 朧島のひとこと
  {
    const a = (D.AMBIENT || []).find((x) => x.id === "v17b_oboro_wager");
    if (!a || !a.where.includes("w1_oboro") || !/芸の町の三日三晩/.test(a.text)) F("朧島に賭けの町のひとことが無い");
    if (a && /勝った(?!か)/.test(a.text)) F("賭けの結末が書かれている");
  }

  // ---------------------------------------------------------------- t12 灯台守の婆さま：名があるのは港町の一人だけ
  {
    const names = [];
    const walk = (o, seen = new Set()) => { if (!o || typeof o !== "object" || seen.has(o)) return; seen.add(o); if (typeof o.name === "string" && /灯台守/.test(o.name) && o.sex === "女") names.push(o.name); Object.values(o).forEach((v) => walk(v, seen)); };
    walk(D.C9_QUESTS || D);
    const named = [...new Set(names)].filter((nm) => !/^(灯台守の婆さま|北の港の古い灯台守)$/.test(nm));
    if (named.length !== 1 || !/エルマ/.test(named[0])) F(`名のある灯台守の婆さまが一人でない（${[...new Set(names)].join("・")}）`);
  }

  if (!n) ok(`V17b 伏線の回収（足した出来事 ${Object.keys(SETUP).length}・走らせた選択肢 ${runs}・印を読む所 9）`);
};
