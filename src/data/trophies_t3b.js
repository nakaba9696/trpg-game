// T3（続き）：ゲームの仕組みごとの節目に、トロフィーを置く（持ち主「数は気にせずに、各々の節目にトロフィーを設定して」）。
// 格の決まりは trophies_t3.js。条件はどれも今の状態（S＝G.S）と冒険をまたぐ記録（G.P）を読むだけで、書き換えない。
// 古いセーブで項目が無くても動き、作ったばかりの冒険では偽（tests/checks/t3_trophy_tiers.mjs）。
// 戦いの最中にしか分からない節目（読み勝ち・多勢）だけは src/engine/zzzzzzzzzzzzzzzz_t3_combat.js が G.award で渡す。
// D.TROPHY_GROUPS：仕組み → トロフィーの key の並び（すべてのトロフィーがどれか一つに入る。PR の集計表・画面の分け方に使える）。レーン T
(function (G) {
  const D = (G.data = G.data || {});
  const T = (D.TROPHIES = D.TROPHIES || []);
  const P = () => G.P || {};
  const n = (o) => Object.keys(o || {}).length;
  const ST = () => D.STATS || [];
  const st = (S, k) => ((S.stats || {})[k] || 0);
  const rep = (S) => Object.values(S.repute || {}).filter(Boolean);
  const nations = () => [...new Set(Object.values(D.LOCS || {}).map((L) => L.nation || L.region).filter((x) => x && !(D.LAWLESS || []).includes(x)))];
  const chron = (S, re) => (S.chronicle || []).some((c) => re.test((c && c.text) || ""));
  const worn = (S) => (G.i2s && G.i2s.worn ? G.i2s.worn(S) : [S.weapon, S.armor, S.ring]).filter(Boolean);
  const held = (S) => [...Object.keys(S.inv || {}), ...worn(S)];
  const plus = (S, k) => held(S).some((id) => { const p = G.i3 && G.i3.parse ? G.i3.parse(id) : null; return !!p && (p.plus || 0) >= k; });
  const skills = (S) => S.skills || [];
  const uses = (S) => (S.k1 && S.k1.use) || {};
  const knows = (S) => Object.keys(D.SPELLS || {}).filter((id) => !!G.knows && G.knows(id, S));
  const elems = (S, f) => new Set(knows(S).filter((id) => !D.SPELLS[id].generic && (!f || f(D.SPELLS[id]))).map((id) => D.SPELLS[id].el)).size;
  const k5tier = (id) => (D.K5 && typeof D.K5.tier === "function" ? D.K5.tier(id) : 0);
  const e3done = (S) => ((S.e3 && S.e3.done) || []).map((id) => D.E3 && D.E3.LIST && D.E3.LIST[id]).filter(Boolean);
  const slainRanks = () => new Set(Object.keys(P().slain || {}).map((f) => (G.e3Of ? G.e3Of(f) : null)).filter(Boolean).map((a) => a.rank));
  const visitedOf = (S, f) => Object.keys(S.visited || {}).filter((k) => D.LOCS[k] && f(D.LOCS[k]));
  const spots = (S) => { const s = new Set(); [S.w8s && S.w8s.once, S.w8s && S.w8s.cd, S.w9 && S.w9.once, S.w9 && S.w9.last].forEach((o) => Object.keys(o || {}).forEach((k) => s.add(k.split(":")[0]))); return s; };
  const lairs = (S) => Object.entries(D.LOCS || {}).filter(([id, L]) => L.type === "dungeon" && (S.flags || {})[(L.reward && L.reward.flag) || "boss:" + id]).length;
  const mids = () => Object.entries(D.LOCS || {}).flatMap(([id, L]) => Object.keys(L.midboss || {}).map((d) => `mid:${id}:${d}`));
  const q5res = (S) => (S.q5 && S.q5.res) || {};
  const m2c = (S) => (S.m2 && S.m2.counts) || {};
  const m10c = (S) => (S.m10 && S.m10.counts) || {};
  const c13done = (S) => Object.entries((S.c13 && S.c13.done) || {}).filter(([, d]) => (d || []).length);
  const c13kind = (S, kinds) => c13done(S).some(([id, d]) => d.some((i) => kinds.includes((((D.C13_BOND || {})[id] || [])[i] || {}).kind)));
  const runs = (S) => (G.t2 && G.t2.runs ? G.t2.runs(S) : []);
  const cc = () => (G.codexCount ? G.codexCount() : {});
  const i3c = () => ((P().codex || {}).i3) || {};
  const knowKind = (kind) => { const K = G.l1 && G.l1.build ? G.l1.build() : D.KNOW || {}; const ids = Object.keys(K).filter((id) => K[id].kind === kind); const k = P().know || {}; return ids.length > 0 && ids.every((id) => k[id]); };
  const bySeen = (k) => (S) => ((S.counters || {})[k] || 0);

  const GROUPS = (D.TROPHY_GROUPS = D.TROPHY_GROUPS || {});
  const add = (group, list) => { list.forEach((t) => T.push(t)); GROUPS[group] = [...(GROUPS[group] || []), ...list.map((t) => t.key)]; };
  const tag = (group, keys) => { GROUPS[group] = [...(GROUPS[group] || []), ...keys]; };

  // ---------------------------------------------------------------- 成長・能力値（節目は 20・30・45 点。f3m_marks.js）
  tag("成長・能力値", ["grow15", "stat70", "stat85", "crit", "fumble"]);
  add("成長・能力値", [
    { key: "t3_mark_first", name: "名のつく腕", tier: "銅", desc: "能力値が伸びて、初めて節目（20 点）に届いた", test: (S) => Object.values((S.f3m || {}).marks || {}).some((d) => d > 0) },
    { key: "t3_all20", name: "隙のない身", tier: "銀", desc: "六つの能力値すべてが 20 点に届いた", test: (S) => ST().length > 0 && ST().every((k) => st(S, k) >= 20) && ST().some((k) => ((S.startStats || {})[k] || 0) < 20) },
    { key: "t3_weak10", name: "不向きを越えて", tier: "銀", desc: "職業に向かない能力値を、作ったときより 10 点伸ばした",
      test: (S) => !!G.s5AptOf && ST().some((k) => G.s5AptOf(S.cls, k) < 0 && st(S, k) - ((S.startStats || {})[k] || 0) >= 10) },
    { key: "t3_all30", name: "万能の人", tier: "金", desc: "六つの能力値すべてが 30 点に届いた", test: (S) => ST().length > 0 && ST().every((k) => st(S, k) >= 30) },
    { key: "t3_grow60", name: "積み上げた日々", tier: "銀", desc: "一度の冒険で能力値を合計 60 伸ばした", test: (S) => !!S.startStats && !!G.totalGrowth && G.totalGrowth(S) >= 60 },
    { key: "t3_all45", name: "十八の名", tier: "白金", desc: "六つの能力値すべてが 45 点に届いた（節目の名をすべて得た）", test: (S) => ST().length > 0 && ST().every((k) => st(S, k) >= 45) },
  ]);

  // ---------------------------------------------------------------- 職業・位・名声・評判・善悪（評判の段 30・100。罪の匂い 8・善い行い 4。c10）
  tag("職業・位・名声・評判・善悪", ["fame150", "fame600", "knight", "lord", "king", "t2_allcls"]);
  add("職業・位・名声・評判・善悪", [
    { key: "t3_fame60", name: "一人前", tier: "銅", desc: "名声が 60 に届いた", test: (S) => (S.fame || 0) >= 60 },
    { key: "t3_pure", name: "清い手", tier: "銀", desc: "善い行いを四つ重ね、罪の匂いは 4 に満たない", test: (S) => (S.virtue || 0) >= 4 && (S.sin || 0) < 4 },
    { key: "t3_fame300", name: "英雄", tier: "銀", desc: "名声が 300 に届いた", test: (S) => (S.fame || 0) >= 300 },
    { key: "t3_rep100", name: "国の誇り", tier: "銀", desc: "どこかの国での評判が 100 に届いた", test: (S) => rep(S).some((r) => (r.rep || 0) >= 100) },
    { key: "t3_wanted", name: "お尋ね者", tier: "銀", desc: "どこかの国で賞金首になった", test: (S) => rep(S).some((r) => !!r.wanted) },
    { key: "t3_cleared", name: "ほとぼり", tier: "銀", desc: "賞金首の手配が解けるまで逃げ延びた", test: (S) => chron(S, /での手配が解かれる$/) },
    { key: "t3_sinful", name: "血の匂い", tier: "銀", desc: "罪の匂いが 8 に届いた", test: (S) => (S.sin || 0) >= 8 },
    { key: "t3_abyss", name: "淵の縁", tier: "銅", desc: "正気が 15 を切っても、正気を失わずに冒険を続けた", test: (S) => (((S.m5 || {}).low ?? 100) < 15) && !S.over },
    { key: "t3_beastcure", name: "獣を祓う", tier: "銀", desc: "獣の病を教会で祓ってもらった", test: (S) => chron(S, /^獣の病が祓われる$/) },
    { key: "t3_rep_all", name: "大陸の信頼", tier: "金", desc: "法の及ぶ国すべてで評判が 30 に届いた",
      test: (S) => { const ns = nations(); const R = S.repute || {}; return ns.length > 0 && ns.every((x) => ((R[x] || {}).rep || 0) >= 30); } },
    { key: "t3_wanted3", name: "三国の手配書", tier: "金", desc: "三つの国で同時に賞金首になった", test: (S) => rep(S).filter((r) => !!r.wanted).length >= 3 },
  ]);

  // ---------------------------------------------------------------- 戦闘・魔物・強敵・使徒
  tag("戦闘・魔物・強敵・使徒", ["first_win", "t2_kills20", "t2_kills200", "close_call", "t2_boss1", "kain", "shuten", "dragon", "majin", "e3_kokunan", "e3_saigai", "e3_five", "t3_apostles", "e4_elder", "e4_elder5", "e4_core", "e2_gormoa", "e2_mordu", "mirza"]);
  add("戦闘・魔物・強敵・使徒", [
    { key: "t3_reads", name: "読み勝ち", tier: "銀", desc: "一度の戦いで敵の体勢を三度崩して勝った" },   // 渡すのは zzzzzzzzzzzzzzzz_t3_combat.js
    { key: "t3_horde", name: "多勢に無勢", tier: "銀", desc: "五体以上の敵の群れに勝った" },               // 同上
    { key: "t3_party30", name: "戦友", tier: "銀", desc: "仲間の一人と三十度、共に勝ち残った", test: (S) => (S.companions || []).some((c) => ((c && c.b5wins) || 0) >= 30) },
    { key: "t3_cores3", name: "三つの縄張り", tier: "銀", desc: "一度の冒険で、三体の使徒の縄張りを崩した",
      test: (S) => Object.values(S.e4kin || {}).filter((x) => x >= ((D.E4 && D.E4.CORE_NEED) || 2)).length >= 3 },
    { key: "t3_gradeB10", name: "B 級狩り", tier: "銀", desc: "冒険をまたいで、使徒でない B 級の魔物を十種倒した",
      test: () => { const f = (P().codex && P().codex.foes) || {}; return !!G.gradeOf && Object.keys(f).filter((i) => f[i] && f[i].kills > 0 && !(G.e3Of && G.e3Of(i)) && G.gradeOf(i) === "B").length >= 10; } },
    { key: "t3_ap_b", name: "B 級の首", tier: "金", desc: "B 級の使徒を討ち果たした", test: (S) => e3done(S).some((a) => a.rank === "B") },
    { key: "t3_ap_two", name: "二つ目の刻印", tier: "金", desc: "一度の冒険で使徒を二体討った", test: (S) => ((S.e3 && S.e3.done) || []).length >= 2 },
    { key: "t3_bosses10", name: "大物の山", tier: "金", desc: "一度の冒険で強敵・迷宮の主を十体倒した", test: (S) => ((S.counters || {}).bosses || 0) >= 10 },
    { key: "t3_ap_ranks", name: "三つの格付け", tier: "金", desc: "冒険をまたいで、S・A・B 級の使徒をそれぞれ討ったことがある", test: () => { const r = slainRanks(); return ["S", "A", "B"].every((x) => r.has(x)); } },
    { key: "t3_ap_ball", name: "B 級の名簿", tier: "金", desc: "冒険をまたいで、討てる B 級の使徒をすべて討った",
      test: () => { const l = Object.values((D.E3 && D.E3.LIST) || {}).filter((a) => a && a.rank === "B" && !a.noslay); const s = P().slain || {}; return l.length > 0 && l.every((a) => s[a.foe]); } },
    { key: "t3_elders_all", name: "年経たものの目録・完", tier: "白金", desc: "冒険をまたいで、まれに出る強い個体をすべて倒した",
      test: () => { const a = Object.keys(D.ENEMIES || {}).filter((i) => D.ENEMIES[i].elderOf); const s = P().e4elders || {}; return a.length > 0 && a.every((i) => s[i]); } },
  ]);

  // ---------------------------------------------------------------- 魔法（属性 7・段 1〜3・暮らしの術。m14）
  tag("魔法", ["t2_spells", "t3_spell3"]);
  add("魔法", [
    { key: "t3_spell2", name: "中の段の言葉", tier: "銀", desc: "中級の術を覚えた", test: (S) => knows(S).some((id) => D.SPELLS[id].tier === 2) },
    { key: "t3_elems5", name: "五つの色", tier: "銀", desc: "五つの属性の術を知っている", test: (S) => elems(S) >= 5 },
    { key: "t3_generic", name: "暮らしの術", tier: "銀", desc: "暮らしの術を六つすべて覚えた", test: (S) => { const g = Object.keys(D.SPELLS || {}).filter((id) => D.SPELLS[id].generic); return g.length > 0 && g.every((id) => !!G.knows && G.knows(id, S)); } },
    { key: "t3_debt", name: "帳面の常連", tier: "銀", desc: "術の借りが 3 に積もった", test: (S) => (S.magicDebt || 0) >= 3 },
    { key: "t3_elems7", name: "七つの色", tier: "金", desc: "七つの属性すべての術を知っている", test: (S) => elems(S) >= 7 },
    { key: "t3_spell3x3", name: "三つの頂", tier: "白金", desc: "三つの属性で上級の術を覚えた", test: (S) => elems(S, (sp) => sp.tier === 3) >= 3 },
  ]);

  // ---------------------------------------------------------------- 技・巻物・魔導書（熟練 6・18・40 回。巻物の段 1〜3）
  tag("技・巻物・魔導書", ["t3_skill"]);
  add("技・巻物・魔導書", [
    { key: "t3_k1lv1", name: "慣れた手", tier: "銅", desc: "技を一つ「慣れた」まで使い込んだ（6 回）", test: (S) => !!D.K1_LV && skills(S).some((id) => (uses(S)[id] || 0) >= D.K1_LV[1]) },
    { key: "t3_skills3", name: "三つの技", tier: "銀", desc: "技とスキルを三つ身につけた", test: (S) => skills(S).length >= 3 },
    { key: "t3_k2", name: "体が覚えた", tier: "銀", desc: "経験からスキルを一つ身につけた", test: (S) => skills(S).some((id) => id.startsWith("k2_")) },
    { key: "t3_scrollgift", name: "師の巻物", tier: "銀", desc: "師から巻物を譲られた", test: (S) => Object.keys((S.k5 && S.k5.gift) || {}).some((k) => k.startsWith("t:")) },
    { key: "t3_tomes4", name: "書架", tier: "銀", desc: "魔導書を四冊手元に置いた", test: (S) => Object.keys(S.inv || {}).filter((id) => (D.ITEMS[id] || {}).type === "tome").length >= 4 },
    { key: "t3_sk3", name: "奥伝", tier: "銀", desc: "上級の技を身につけた", test: (S) => skills(S).some((id) => k5tier(id) === 3) },
    { key: "t3_kiwame3", name: "三つの極み", tier: "金", desc: "技を三つ、極みまで使い込んだ", test: (S) => !!D.K1_LV && skills(S).filter((id) => (uses(S)[id] || 0) >= D.K1_LV[D.K1_LV.length - 1]).length >= 3 },
    { key: "t3_k2_10", name: "傷だらけの手引き", tier: "金", desc: "スキルを十身につけた", test: (S) => skills(S).filter((id) => id.startsWith("k2_")).length >= 10 },
  ]);

  // ---------------------------------------------------------------- 装備・伝説の武具・防具（稀さ 並・上・逸品・伝説。鍛冶 +5 まで）
  tag("装備・伝説の武具・防具", ["t2_gear", "volgrim", "byakuya"]);
  add("装備・伝説の武具・防具", [
    { key: "t3_plus1", name: "焼き直し", tier: "銀", desc: "武具を一度鍛え直した（+1）", test: (S) => plus(S, 1) },
    { key: "t3_stash", name: "宿の預かり", tier: "銅", desc: "宿に品を預けた", test: (S) => n((S.i3 || {}).stash) >= 1 },
    { key: "t3_epic", name: "逸品", tier: "銀", desc: "逸品以上の武具を身に着けた", test: (S) => !!(G.i3 && G.i3.rarityOf) && worn(S).some((id) => G.i3.rarityOf(D.ITEMS[id]) >= 2) },
    { key: "t3_fullkit", name: "頭から爪先まで", tier: "銀", desc: "装備の枠すべてに品を着けた", test: (S) => !!(G.i2s && G.i2s.worn && G.i2s.SLOTS) && G.i2s.worn(S).length >= G.i2s.SLOTS.length },
    { key: "t3_cursed", name: "呪いと寝る", tier: "銀", desc: "呪われた品を身に着けた", test: (S) => worn(S).some((id) => !!(D.ITEMS[id] || {}).cursed) },
    { key: "t3_forge3", name: "鍛え直し", tier: "銀", desc: "鍛冶で +3 以上に鍛えた武具を持った", test: (S) => plus(S, 3) },
    { key: "t3_gun", name: "失われた筒", tier: "銀", desc: "銃を手に入れた", test: (S) => !!(S.inv && (S.inv.c1_raizutsu || S.inv.c1_kouzutsu)) || ["c1_raizutsu", "c1_kouzutsu"].includes(S.weapon) },
    { key: "t3_legend", name: "伝説の手触り", tier: "金", desc: "伝説の品を手に入れた", test: (S) => n((S.i3 || {}).legends) >= 1 },
    { key: "t3_plus5", name: "親方の槌", tier: "金", desc: "武具を +5 まで鍛え上げた", test: (S) => plus(S, 5) },
    { key: "t3_legends_all", name: "伝説の目録", tier: "白金", desc: "冒険をまたいで、伝説の品をすべて手にした",
      test: () => { const c = (P().codex && P().codex.items) || {}; const l = Object.keys(D.ITEMS || {}).filter((i) => D.ITEMS[i].legend); return l.length > 0 && l.every((i) => c[i]); } },
  ]);

  // ---------------------------------------------------------------- 旅・地方・町の特色の場所
  tag("旅・地方・町の特色の場所", ["t2_travel10", "t2_region3", "t2_regions", "explorer", "t2_day30", "day100", "t2_year"]);
  add("旅・地方・町の特色の場所", [
    { key: "t3_isle", name: "潮を越えて", tier: "銅", desc: "シェルアーク諸島の土地を踏んだ", test: (S) => visitedOf(S, (L) => L.region === "シェルアーク").length >= 1 },
    { key: "t3_spot", name: "土地の顔", tier: "銅", desc: "町の特色の場所で行いをした", test: (S) => spots(S).size >= 1 },
    { key: "t3_travel50", name: "旅の垢", tier: "銀", desc: "一度の冒険で五十度旅をした", test: (S) => bySeen("travels")(S) >= 50 },
    { key: "t3_towns15", name: "宿帳の束", tier: "銀", desc: "一度の冒険で十五の町を訪れた", test: (S) => visitedOf(S, (L) => L.type === "town").length >= 15 },
    { key: "t3_realm", name: "灰の上を歩く", tier: "銀", desc: "使徒領に足を踏み入れた", test: (S) => visitedOf(S, (L) => L.region === "使徒領").length >= 1 },
    { key: "t3_spots10", name: "名所めぐり", tier: "銀", desc: "一度の冒険で特色の場所を十か所使った", test: (S) => spots(S).size >= 10 },
    { key: "t3_courts", name: "二つの玉座の奥", tier: "銀", desc: "王宮の奥と黒い城の奥の両方で行いをした", test: (S) => ["w8s_leavel_court", "w8s_garmund_court"].every((k) => spots(S).has(k)) },
    { key: "t3_travel150", name: "道が家", tier: "金", desc: "一度の冒険で百五十度旅をした", test: (S) => bySeen("travels")(S) >= 150 },
    { key: "t3_towns30", name: "町々の顔", tier: "金", desc: "一度の冒険で三十の町を訪れた", test: (S) => visitedOf(S, (L) => L.type === "town").length >= 30 },
    { key: "t3_spots30", name: "土地の暮らし", tier: "金", desc: "一度の冒険で特色の場所を三十か所使った", test: (S) => spots(S).size >= 30 },
    { key: "t3_atlas", name: "大陸の地図", tier: "金", desc: "冒険をまたいで、すべての場所を訪れたことがある",
      test: () => { const p = (P().codex || {}).places || {}; const ids = Object.keys(D.LOCS || {}); return ids.length > 0 && ids.every((k) => p[k]); } },
  ]);

  // ---------------------------------------------------------------- 迷宮・遺跡・山（深さ・途中の番人・脇道・主）
  tag("迷宮・遺跡・山", ["t2_dungeon", "t2_lairs", "t2_traps"]);
  add("迷宮・遺跡・山", [
    { key: "t3_depth3", name: "地下三階", tier: "銅", desc: "迷宮の地下三階まで降りた", test: (S) => (S.depth || 0) >= 3 },
    { key: "t3_mid", name: "門番", tier: "銀", desc: "迷宮の途中の番人を倒した", test: (S) => Object.keys(S.flags || {}).some((k) => k.startsWith("mid:")) },
    { key: "t3_depth5", name: "底の近く", tier: "銀", desc: "迷宮の地下五階まで降りた", test: (S) => (S.depth || 0) >= 5 },
    { key: "t3_lairs3", name: "三つの最奥", tier: "銀", desc: "一度の冒険で三つの迷宮の主を倒した", test: (S) => lairs(S) >= 3 },
    { key: "t3_side", name: "脇道の静けさ", tier: "銀", desc: "迷宮の脇道の主を退けた", test: (S) => n((S.w8 || {}).cleared) >= 1 },
    { key: "t3_lairs6", name: "六つの最奥", tier: "金", desc: "一度の冒険で六つの迷宮の主を倒した", test: (S) => lairs(S) >= 6 },
    { key: "t3_mid_all", name: "番人の名簿", tier: "金", desc: "一度の冒険で、迷宮の途中の番人をすべて倒した", test: (S) => { const m = mids(); return m.length > 0 && m.every((f) => (S.flags || {})[f]); } },
    { key: "t3_side5", name: "脇道の地図", tier: "金", desc: "迷宮の脇道を五つ静めた", test: (S) => n((S.w8 || {}).cleared) >= 5 },
    { key: "t3_lairs_all", name: "迷宮の王", tier: "白金", desc: "一度の冒険で、すべての迷宮の主を倒した", test: (S) => { const all = Object.values(D.LOCS || {}).filter((L) => L.type === "dungeon").length; return all > 0 && lairs(S) >= all; } },
  ]);

  // ---------------------------------------------------------------- 依頼・噂・出来事（人の筋の出来事もここ）
  tag("依頼・噂・出来事", ["t2_quest1", "quests10", "t2_quests30", "god", "c2_lab", "c4_thread", "c4_soap", "c4_defy", "c5_debate", "c5_choir", "c5_duel", "c5_chain", "c5_ledger", "c6_ledger", "c6_pawn", "c7_dirty", "c7_verse", "c7_pawn", "c8_bell", "c8_seven", "r1_ledger", "r1_seven"]);
  add("依頼・噂・出来事", [
    { key: "t3_expose", name: "嘘の依頼", tier: "銀", desc: "依頼人の嘘を暴いた", test: (S) => (q5res(S).expose || 0) >= 1 },
    { key: "t3_m12", name: "世の大事", tier: "銀", desc: "世の大事に加わった", test: (S) => ((S.m12 || {}).list || []).some((e) => e && e.joined) },
    { key: "t3_here", name: "居合わせた", tier: "銀", desc: "世の出来事の場に居合わせた", test: (S) => ((S.world || {}).hist || []).some((h) => h && h.heard === "here") },
    { key: "t3_turncoat", name: "寝返り", tier: "銀", desc: "依頼の途中で相手の側についた", test: (S) => (q5res(S).ally || 0) + (q5res(S).betray || 0) >= 1 },
    { key: "t3_leads", name: "掲示の隅", tier: "銀", desc: "掲示の隅の頼みごとをすべて手に取った", test: (S) => (D.R3_LEADS || []).length > 0 && D.R3_LEADS.every((x) => ((S.r3 || {}).seen || {})[x.id]) },
    { key: "t3_rumors10", name: "耳ざとい", tier: "銀", desc: "一度の冒険で噂を十書き留めた", test: (S) => ((S.q17r || {}).list || []).length >= 10 },
    { key: "t3_ev30", name: "語り草", tier: "銀", desc: "一度の冒険で一度きりの出来事を三十経験した", test: (S) => Object.keys(S.flags || {}).filter((k) => k.startsWith("ev:")).length >= 30 },
    { key: "t3_m12_end", name: "決着の場", tier: "銀", desc: "加わった世の大事の決着を見届けた", test: (S) => ((S.m12 || {}).list || []).some((e) => e && e.joined && e.out) },
    { key: "t3_ev80", name: "生き字引", tier: "金", desc: "一度の冒険で一度きりの出来事を八十経験した", test: (S) => Object.keys(S.flags || {}).filter((k) => k.startsWith("ev:")).length >= 80 },
    { key: "t3_qkinds10", name: "何でも屋", tier: "金", desc: "冒険をまたいで、十種の依頼をこなした", test: () => Object.values((P().q5 || {}).kinds || {}).filter((k) => k && (k.ok || 0) >= 1).length >= 10 },
    { key: "t3_m12_5", name: "大陸の年代記", tier: "金", desc: "冒険をまたいで、五種の世の大事に加わった",
      test: () => new Set((P().graves || []).flatMap((g) => ((g && g.m12) || []).filter((h) => h && h.joined).map((h) => h.name))).size >= 5 },
    { key: "t3_qkinds_all", name: "ギルドの全帳", tier: "白金", desc: "冒険をまたいで、すべての種類の依頼をこなした",
      test: () => { const k = (P().q5 || {}).kinds || {}; const t = (D.Q5 && D.Q5.TYPES) || []; return t.length > 0 && t.every((x) => ((k[x.key] || {}).ok || 0) >= 1); } },
  ]);

  // ---------------------------------------------------------------- 仲間・作戦
  tag("仲間・作戦", ["t2_ally", "party", "c2_party", "r1_kin", "t2_q9", "m11_mon", "t2_bond"]);
  add("仲間・作戦", [
    { key: "t3_talk50", name: "焚き火の常連", tier: "銀", desc: "仲間と五十度語らった", test: (S) => (m2c(S).talk || 0) >= 50 },
    { key: "t3_betrayed", name: "背中の刃", tier: "銀", desc: "仲間に裏切られた", test: (S) => (m2c(S).betray || 0) >= 1 },
    { key: "t3_mourn", name: "看取り", tier: "銀", desc: "仲間を亡くした", test: (S) => (m2c(S).death || 0) >= 1 },
    { key: "t3_slain", name: "自らの手で", tier: "銀", desc: "刃を向けた仲間を討った", test: (S) => ((S.m2 || {}).gone || []).some((g) => g && g.how === "slain") },
    { key: "t3_long", name: "長い付き合い", tier: "銀", desc: "同じ仲間と百八十日旅をした", test: (S) => (S.companions || []).some((c) => c && c.joined != null && (S.day || 0) - c.joined >= 180) },
    { key: "t3_met10", name: "顔なじみ", tier: "銀", desc: "一度の冒険で名のある人に十人会った", test: (S) => n((S.c2 || {}).met) >= 10 },
    { key: "t3_adored", name: "慕われる", tier: "銀", desc: "三人に慕われた（好感度 60 以上）", test: (S) => Object.values(S.aff || {}).filter((v) => v >= 60).length >= 3 },
    { key: "t3_hated", name: "憎まれ役", tier: "銀", desc: "誰かに憎まれた（好感度 −70 以下）", test: (S) => Object.values(S.aff || {}).some((v) => v <= -70) },
    { key: "t3_tactics", name: "采配", tier: "銀", desc: "三人の仲間にそれぞれ別の作戦を与えた", test: (S) => new Set((S.companions || []).map((c) => c && c.f5tac).filter(Boolean)).size >= 3 },
    { key: "t3_q9_3", name: "三つの頼み", tier: "金", desc: "一度の冒険で、三人の頼みごとを結末まで見届けた", test: (S) => Object.values(S.q9 || {}).filter((x) => x && x.end).length >= 3 },
    { key: "t3_q9_10", name: "頼まれ屋", tier: "金", desc: "冒険をまたいで、十人の頼みごとを見届けた", test: () => Object.values(P().q9 || {}).filter((m) => n(m) >= 1).length >= 10 },
    { key: "t3_q9_all", name: "頼みの目録・完", tier: "白金", desc: "冒険をまたいで、すべての人の頼みごとを見届けた",
      test: () => { const ids = Object.keys(D.Q9 || {}); return ids.length > 0 && ids.every((id) => n((P().q9 || {})[id]) >= 1); } },
  ]);

  // ---------------------------------------------------------------- 絆の段・恋・結婚（絆の段は好感度 30・55・80。C13）
  tag("絆の段・恋・結婚", ["t3_bond", "m10_love", "m10_wed", "m10_home", "m10_child", "m11_ap", "r2_full"]);
  add("絆の段・恋・結婚", [
    { key: "t3_c13", name: "最初の贈り物", tier: "銀", desc: "仲間から絆の褒美を受け取った", test: (S) => c13done(S).length >= 1 },
    { key: "t3_spark", name: "気配", tier: "銀", desc: "仲間との恋の気配が立った", test: (S) => (m10c(S).spark || 0) >= 1 },
    { key: "t3_c13_3", name: "三人の褒美", tier: "銀", desc: "一度の冒険で、三人から絆の褒美を受け取った", test: (S) => c13done(S).length >= 3 },
    { key: "t3_c13_skill", name: "手ほどき", tier: "銀", desc: "絆の褒美で技か術を教わった", test: (S) => c13kind(S, ["skill", "spell"]) },
    { key: "t3_c13_quest", name: "二人の用事", tier: "銀", desc: "絆の頼みごとを果たした", test: (S) => c13kind(S, ["quest"]) },
    { key: "t3_refused", name: "届かなかった言葉", tier: "銀", desc: "想いを断られた", test: (S) => (m10c(S).refuse || 0) >= 1 },
    { key: "t3_jealous", name: "火種", tier: "銀", desc: "嫉妬の場面が起きた", test: (S) => (m10c(S).jealous || 0) >= 1 },
    { key: "t3_widow", name: "喪服", tier: "銀", desc: "連れ合いに先立たれた", test: (S) => (m10c(S).widow || 0) >= 1 },
    { key: "t3_c13_10", name: "十人の形見", tier: "金", desc: "冒険をまたいで、十人から絆の褒美を受け取った",
      test: () => Object.values(((P().codex || {}).people) || {}).filter((p) => p && (p.c13 || []).length).length >= 10 },
  ]);

  // ---------------------------------------------------------------- 王城・長編・結末・死と引退
  tag("王城・長編・結末・死と引退", ["first_step", "death", "goal", "retire", "t2_custom", "m6_end", "m6_bed", "m6_blade", "m6_vanish", "m6_folly", "m6_road", "m6_wall", "m6_brief", "t2_runs3", "t2_dead5", "t2_endings3", "e7_mirza", "e7_mirza_clean"]);
  add("王城・長編・結末・死と引退", [
    { key: "t3_e7_ch1", name: "糸の端", tier: "銀", desc: "長編の第一章を済ませた", test: (S) => Object.values(S.e7 || {}).some((x) => x && (x.ch || 0) >= 1) },
    { key: "t3_m6_3", name: "三つの節目", tier: "銀", desc: "一度の冒険で人生の節目を三つ迎えた", test: (S) => n((S.m6 || {}).reached) >= 3 },
    { key: "t3_runs10", name: "十の墓碑", tier: "銀", desc: "冒険を十度終えた", test: (S) => runs(S).length >= 10 },
    { key: "t3_retire5", name: "剣を置く者たち", tier: "銀", desc: "冒険をまたいで五度、生きて物語を閉じた", test: (S) => runs(S).filter((g) => g.end === "end").length >= 5 },
    { key: "t3_e7_prep", name: "万全の備え", tier: "金", desc: "一つの長編で、備えをすべて整えた",
      test: (S) => Object.entries(S.e7 || {}).some(([id, x]) => { const k = Object.keys((((D.E7 || {}).SAGAS || {})[id] || {}).preps || {}); return k.length > 0 && k.every((q) => ((x || {}).prep || {})[q]); }) },
    { key: "t3_m6_6", name: "六つの節目", tier: "金", desc: "一度の冒険で人生の節目を六つ迎えた", test: (S) => n((S.m6 || {}).reached) >= 6 },
    { key: "t3_endings8", name: "八つの物語", tier: "金", desc: "冒険をまたいで、八通りの結末で物語を閉じた",
      test: (S) => new Set(runs(S).filter((g) => g.end === "end" && g.ending).map((g) => g.ending)).size >= 8 },
    { key: "t3_runs30", name: "墓地の主", tier: "金", desc: "冒険を三十度終えた", test: (S) => runs(S).length >= 30 },
  ]);

  // ---------------------------------------------------------------- 図鑑（分類ごと）
  tag("図鑑", ["t2_know", "t2_codex30", "t2_people30", "t2_bestiary", "t3_codex_foes", "t3_codex_items", "t3_codex_people"]);
  add("図鑑", [
    { key: "t3_lore50", name: "用語の手帳", tier: "銀", desc: "冒険をまたいで、用語を五十項目開いた", test: () => (cc().lore || 0) >= 50 },
    { key: "t3_know100", name: "覚え書きの束", tier: "銀", desc: "冒険をまたいで、覚え書きを百残した", test: () => n(P().know) >= 100 },
    { key: "t3_i3_10", name: "銘を読む", tier: "銀", desc: "冒険をまたいで、品の銘を十種見た", test: () => n(i3c().pre) + n(i3c().suf) >= 10 },
    { key: "t3_lore_half", name: "用語の半分", tier: "金", desc: "冒険をまたいで、用語の頁を半分埋めた", test: () => { const c = cc(); return c.loreAll > 0 && c.lore * 2 >= c.loreAll; } },
    { key: "t3_know300", name: "分厚い手帳", tier: "金", desc: "冒険をまたいで、覚え書きを三百残した", test: () => n(P().know) >= 300 },
    { key: "t3_know_ap", name: "使徒の素描", tier: "金", desc: "冒険をまたいで、使徒の覚え書きをすべて集めた", test: () => knowKind("apostle") },
    { key: "t3_kills100", name: "討伐記録", tier: "金", desc: "冒険をまたいで、百種の魔物を倒した", test: () => (cc().kills || 0) >= 100 },
    { key: "t3_i3_names", name: "銘の目録", tier: "金", desc: "冒険をまたいで、前の銘と後ろの銘をすべて見た",
      test: () => { const I = D.I3 || {}; const a = n(I.PRE) + n(I.SUF); return a > 0 && Object.keys(I.PRE || {}).every((k) => (i3c().pre || {})[k]) && Object.keys(I.SUF || {}).every((k) => (i3c().suf || {})[k]); } },
    { key: "t3_lore_all", name: "用語集・完", tier: "白金", desc: "冒険をまたいで、用語の頁を九割埋めた", test: () => { const c = cc(); return c.loreAll > 0 && c.lore >= c.loreAll * 0.9; } },
    { key: "t3_know_foe", name: "魔物の覚え書き・完", tier: "白金", desc: "冒険をまたいで、魔物の覚え書きをすべて集めた", test: () => knowKind("foe") },
    { key: "t3_i3_mats", name: "材質の目録", tier: "白金", desc: "冒険をまたいで、武具の材質をすべて見た",
      test: () => { const M = (D.I3 && D.I3.MATS) || {}; const got = i3c().mats || {}; const all = Object.entries(M).flatMap(([k, m]) => Object.keys(m || {}).map((q) => k + ":" + q)); return all.length > 0 && all.every((x) => got[x]); } },
  ]);

  // ---------------------------------------------------------------- 交易・お金（交易の利ざや S.q4。荷車 400G）
  tag("交易・お金", ["rich1", "rich2"]);
  add("交易・お金", [
    { key: "t3_purse300", name: "重い財布", tier: "銅", desc: "所持金が 300G に届いた", test: (S) => (S.gold || 0) >= 300 },
    { key: "t3_trade1", name: "初荷", tier: "銀", desc: "交易の荷を売って利ざやを得た", test: (S) => ((S.q4 || {}).profit || 0) > 0 },
    { key: "t3_cart", name: "荷車の主", tier: "銀", desc: "荷車を手に入れた", test: (S) => !!(S.inv || {}).q4_cart },
    { key: "t3_trade1000", name: "千枚の利ざや", tier: "銀", desc: "交易の利ざやの合計が 1000G を越えた", test: (S) => !!((S.q4 || {}).marks || {})[1000] || ((S.q4 || {}).profit || 0) >= 1000 },
    { key: "t3_trade5000", name: "ひと財産", tier: "金", desc: "交易の利ざやの合計が 5000G を越えた", test: (S) => !!((S.q4 || {}).marks || {})[5000] || ((S.q4 || {}).profit || 0) >= 5000 },
    { key: "t3_trade20000", name: "大商い", tier: "白金", desc: "交易の利ざやの合計が 20000G に届いた", test: (S) => ((S.q4 || {}).profit || 0) >= 20000 },
  ]);
})(globalThis.G = globalThis.G || {});
