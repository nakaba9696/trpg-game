// T3：トロフィーの格（白金・金・銀・銅）の決まりが崩れていないか（src/data/trophies_t3.js）。
// - 格は D.TROPHY_TIERS のどれか。白金は少なく（極めて大変なやりこみだけ）、点は 銅 1・銀 2・金 5・白金 10
// - 作ったばかりの冒険では、旅立ち以外は取れない（どの職業・目的でも。銅もここで取れてはいけない）
// - 数で決まる条件は、説明に書いた数と条件の境目が合う（例：key が stat70 でも、説明が 40 なら 40 で取れる）
// - 能力値の条件は、作成で届く値より上
// - 同じ筋の段（依頼 1 → 10 → 30 など）で、重い方の格が軽い方より低くない
// - T3 で足した節目の条件が、狙った状態で真・そうでないとき偽
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const B = (m) => { bad++; fail("T3: " + m); };
  const T = D.TROPHIES;
  const tt = (k) => T.find((t) => t.key === k);
  const TIERS = D.TROPHY_TIERS;
  if (!Array.isArray(TIERS) || TIERS.join() !== "白金,金,銀,銅") B(`D.TROPHY_TIERS が高い順の 白金・金・銀・銅 でない（${TIERS}）`);
  const rank = (k) => { const t = tt(k); return t ? TIERS.indexOf(t.tier) : -1; }; // 0 が白金
  const count = {};
  T.forEach((t) => { if (!TIERS.includes(t.tier)) B(`${t.key}: 格「${t.tier}」が無い格`); count[t.tier] = (count[t.tier] || 0) + 1; });
  if (!count.白金 || count.白金 > T.length * 0.1) B(`白金が ${count.白金 || 0} 個（1 個以上、全体の 1 割まで）`);
  const pts = D.TROPHY_POINTS || {};
  if (pts.銅 !== 1 || pts.銀 !== 2 || pts.金 !== 5 || pts.白金 !== 10) B(`格の点が 銅 1・銀 2・金 5・白金 10 でない（${JSON.stringify(pts)}）`);
  if (G.cre && G.cre.trophyScore) {
    const s = G.cre.trophyScore({ trophies: { explorer: { tier: "金" }, first_step: {} } }); // 記録の格は古くても、表の今の格で数える
    if (s !== 11) B(`白金 1・銅 1 の点が ${s}（11 のはず）`);
  }

  const start = (seed, cls, goal) => {
    G.rand = seeded(seed);
    const { stats, caps } = G.cre.quickStats(cls, G.rand, { even: seed % 2 === 0 });
    G.newGame({ cls, stats, caps, goal, goalText: goal === "custom" ? "自分の店を持つ" : undefined, profile: { name: "テスト", sex: "女", age: 22, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const classes = Object.keys(D.CLASSES), goals = Object.keys(D.GOALS);

  // ---------------------------------------------------------------- 作ったばかりの冒険
  let maxStart = 0;
  for (let i = 0; i < classes.length * goals.length * 4; i++) {
    G.P = { trophies: {}, graves: [] };
    const S = start(3300 + i, classes[i % classes.length], goals[Math.floor(i / classes.length) % goals.length]);
    G.checkTrophies();
    const got = Object.keys(G.P.trophies).filter((k) => k !== "first_step");
    if (got.length) { B(`作ったばかりの冒険（${S.cls}・${S.goal.id}）で取れてしまう：${got.join("・")}`); break; }
    maxStart = Math.max(maxStart, ...D.STATS.map((k) => G.pt(S.stats[k])));
  }

  // ---------------------------------------------------------------- 説明の数と条件の境目
  G.P = { trophies: {}, graves: [] };
  const S = start(3399, "merc", "majin");
  const edge = (key, set, lo, hi) => { // set(v) で状態を作り、真になるいちばん小さい v を探す
    const t = tt(key);
    if (!t) return B(`${key} が無い`), 0;
    for (let v = lo; v <= hi; v++) { set(v); if (t.test(S)) return v; }
    return Infinity;
  };
  const statAt = (v) => D.STATS.forEach((k, i) => { S.stats[k] = i === 0 ? v : 1; });
  const save = { ...S.stats };
  const NUM = [
    ["stat70", statAt, 1, 120], ["stat85", statAt, 1, 120],
    ["rich1", (v) => { S.gold = v * 100; }, 1, 200], ["rich2", (v) => { S.gold = v * 100; }, 1, 200],
    ["fame150", (v) => { S.fame = v; }, 1, 1000], ["fame600", (v) => { S.fame = v; }, 1, 1000],
    ["quests10", (v) => { S.counters.quests = v; }, 1, 50],
    ["day100", (v) => { S.day = v; }, 1, 500],
  ];
  const at = {};
  for (const [key, set, lo, hi] of NUM) {
    const v = edge(key, set, lo, hi);
    const shown = key.startsWith("rich") ? v * 100 : v;
    at[key] = shown;
    if (!Number.isFinite(v)) { B(`${key}: どの値でも取れない`); continue; }
    const KAN = { 100: "百", 10: "十", 30: "三十" }; // 説明は漢数字で書いたものもある
    if (!tt(key).desc.includes(String(shown)) && !(KAN[shown] && tt(key).desc.includes(KAN[shown]))) B(`${key}: 条件の境目は ${shown} なのに、説明は「${tt(key).desc}」`);
  }
  Object.assign(S.stats, save);
  // 能力値の条件は作成で届く値より上（作成直後に届く値なら、条件を上げるか格を下げる）
  for (const k of ["stat70", "stat85"]) if (at[k] <= maxStart) B(`${k}: ${at[k]} 点は作成で届く（作成の最大 ${maxStart} 点）`);
  if (at.stat70 >= at.stat85) B("stat70 の点が stat85 より低くない");

  // ---------------------------------------------------------------- 同じ筋の段
  const CHAINS = [
    ["t2_quest1", "quests10", "t2_quests30"], ["first_win", "t2_kills20", "t2_kills200"], ["t2_day30", "day100", "t2_year"],
    ["fame150", "fame600"], ["rich1", "rich2"], ["knight", "lord", "king"], ["stat70", "stat85"],
    ["t2_ally", "party"], ["t2_region3", "t2_regions", "explorer"], ["t2_codex30", "t2_bestiary", "t3_codex_foes"],
    ["majin", "e3_five", "t3_apostles"], ["e3_kokunan", "e3_saigai"], ["majin", "e3_kokunan"], ["e4_elder", "e4_elder5"],
    ["m10_love", "m10_wed", "m10_child"], ["t2_boss1", "t2_lairs"], ["shuten", "byakuya"], ["goal", "retire"],
    ["t2_runs3", "t2_dead5"], ["t2_bond", "t3_bond"], ["t2_know", "t2_traps"],
    // trophies_t3b.js（仕組みごとの節目）
    ["t3_fame60", "fame150", "t3_fame300", "fame600"], ["t3_all20", "t3_all30", "t3_all45"], ["grow15", "t3_grow60", "t3_all30"], ["t3_wanted", "t3_wanted3"],
    ["majin", "t3_ap_b"], ["majin", "t3_ap_two"], ["t2_boss1", "t3_bosses10"], ["e4_core", "t3_cores3"], ["e4_elder5", "t3_elders_all"],
    ["t3_spell2", "t3_spell3", "t3_spell3x3"], ["t3_elems5", "t3_elems7"], ["t3_k1lv1", "t3_skill", "t3_kiwame3"], ["t3_k2", "t3_k2_10"],
    ["t3_plus1", "t3_forge3", "t3_plus5"], ["t3_legend", "t3_legends_all"], ["t2_travel10", "t3_travel50", "t3_travel150"], ["t3_towns15", "t3_towns30"],
    ["t3_spot", "t3_spots10", "t3_spots30"], ["t3_depth3", "t3_depth5"], ["t3_mid", "t3_mid_all"], ["t3_side", "t3_side5"],
    ["t2_boss1", "t3_lairs3", "t3_lairs6", "t3_lairs_all"], ["t2_lairs", "t3_lairs_all"], ["t3_ev30", "t3_ev80"], ["t3_m12", "t3_m12_end"],
    ["t2_quest1", "t3_qkinds10", "t3_qkinds_all"], ["t2_q9", "t3_q9_10", "t3_q9_all"], ["t3_c13", "t3_c13_3", "t3_bond"], ["t3_c13", "t3_c13_10"],
    ["t3_m6_3", "t3_m6_6"], ["t2_runs3", "t3_runs10", "t3_runs30"], ["t2_endings3", "t3_endings8"], ["t3_lore50", "t3_lore_half", "t3_lore_all"],
    ["t3_know100", "t3_know300"], ["t3_i3_10", "t3_i3_names", "t3_i3_mats"], ["t3_purse300", "rich1", "rich2"], ["t3_trade1", "t3_trade1000", "t3_trade5000", "t3_trade20000"],
  ];
  // 仕組みごとの分け方（D.TROPHY_GROUPS）：すべてのトロフィーがちょうど一つに入る
  const GR = D.TROPHY_GROUPS || {};
  const inG = Object.values(GR).flat();
  for (const t of T) { const c = inG.filter((k) => k === t.key).length; if (c !== 1) B(`${t.key} が仕組みの分け方に ${c} 回入っている（1 回のはず）`); }
  for (const k of inG) if (!tt(k)) B(`仕組みの分け方に無いトロフィー ${k}`);
  for (const ch of CHAINS) {
    for (let i = 1; i < ch.length; i++) {
      const a = rank(ch[i - 1]), b = rank(ch[i]);
      if (a < 0 || b < 0) { B(`段の表のトロフィーが無い：${ch[i - 1]}・${ch[i]}`); continue; }
      if (b > a) B(`${ch[i]}（${tt(ch[i]).tier}）が、軽い ${ch[i - 1]}（${tt(ch[i - 1]).tier}）より低い格`);
    }
  }
  // 決めた格（測った結果と理由は PR の本文）。ここが動くときは、表を測り直して PR に書く
  const FIX = {
    銅: ["first_step", "first_win", "crit", "fumble", "death", "grow15", "t2_quest1", "t2_kills20", "t2_day30", "t2_dungeon"],
    銀: ["stat70", "fame150", "day100", "t2_boss1", "kain", "shuten", "knight", "goal", "t2_codex30"],
    金: ["stat85", "fame600", "rich2", "t2_year", "majin", "e3_saigai", "e3_kokunan", "volgrim", "byakuya", "king", "t3_bond", "t3_spell3"],
    白金: ["explorer", "t2_traps", "t3_apostles", "t3_codex_foes", "t3_codex_items", "t3_codex_people"],
  };
  for (const [tier, keys] of Object.entries(FIX)) for (const k of keys) if (!tt(k) || tt(k).tier !== tier) B(`${k} の格が ${tt(k) && tt(k).tier}（${tier} のはず）`);

  // ---------------------------------------------------------------- T3 の節目
  const yes = (k, s, why) => { let r; try { r = tt(k).test(s); } catch (e) { r = e.message; } if (r !== true) B(`${k}: ${why}なのに取れない（${r}）`); };
  const no = (k, s, why) => { let r; try { r = tt(k).test(s); } catch (e) { r = e.message; } if (r !== false) B(`${k}: ${why}なのに取れる（${r}）`); };
  G.P = { trophies: {}, graves: [] };
  const S2 = start(3400, "mage", "majin");
  for (const k of ["t3_skill", "t3_spell3", "t3_bond", "t3_apostles", "t3_codex_foes", "t3_codex_items", "t3_codex_people"]) no(k, S2, "作ったばかり");
  // 技を極みまで
  const sk = Object.keys(D.SKILLS || {})[0];
  if (sk && G.k1) {
    S2.skills = [...(S2.skills || []), sk];
    S2.k1 = S2.k1 || { ki: 0, use: {}, prog: {}, day: {} };
    S2.k1.use = S2.k1.use || {};
    S2.k1.use[sk] = D.K1_LV[D.K1_LV.length - 1] - 1; no("t3_skill", S2, "極みの一つ手前");
    S2.k1.use[sk] = D.K1_LV[D.K1_LV.length - 1]; yes("t3_skill", S2, "技を極みまで使い込んだ");
  }
  // 上級の術
  const sp3 = Object.keys(D.SPELLS).find((id) => D.SPELLS[id].tier === 3);
  const sp2 = Object.keys(D.SPELLS).find((id) => D.SPELLS[id].tier === 2);
  S2.spells = [...(S2.spells || []), sp2]; no("t3_spell3", S2, "中級しか知らない");
  S2.spells.push(sp3); yes("t3_spell3", S2, "上級の術を覚えた");
  // 最後の段の絆
  const who = Object.keys(D.C13_BOND || {}).find((id) => (D.C13_BOND[id] || []).length >= 2);
  if (!who) B("絆の段の表（D.C13_BOND）が無い（t3_bond が取れない）");
  else {
    const last = D.C13_BOND[who].length - 1;
    S2.c13 = { done: { [who]: [0, last - 1] } }; no("t3_bond", S2, "最後の段の手前まで");
    S2.c13.done[who].push(last); yes("t3_bond", S2, "最後の段の褒美を受け取った");
  }
  // 討てる使徒をすべて（冒険をまたいで）
  const list = Object.values((D.E3 && D.E3.LIST) || {}).filter((a) => !a.noslay);
  if (list.length < 5) B(`討てる使徒が ${list.length} 体（t3_apostles の数がおかしい）`);
  G.P.slain = Object.fromEntries(list.slice(1).map((a) => [a.foe, { n: 1 }])); no("t3_apostles", S2, "一体残っている");
  G.P.slain[list[0].foe] = { n: 1 }; yes("t3_apostles", S2, "討てる使徒をすべて討った");
  const noslay = Object.values(D.E3.LIST).find((a) => a.noslay);
  if (noslay && G.P.slain[noslay.foe]) B("討てない使徒まで数えている");
  // 図鑑の九割（G.codexCount の数で）
  if (G.codexCount) {
    const c0 = G.codexCount;
    for (const [k, key] of [["foes", "t3_codex_foes"], ["items", "t3_codex_items"], ["people", "t3_codex_people"]]) {
      G.codexCount = () => ({ ...c0(), [k]: 89, [k + "All"]: 100 }); no(key, S2, "八割九分");
      G.codexCount = () => ({ ...c0(), [k]: 90, [k + "All"]: 100 }); yes(key, S2, "九割");
      G.codexCount = () => ({ ...c0(), [k]: 0, [k + "All"]: 0 }); no(key, S2, "頁が無い");
    }
    G.codexCount = c0;
  }
  // 古い記録（項目が無い）でも例外なく動く
  for (const P of [{}, { trophies: {} }, { trophies: {}, slain: null, codex: null }]) {
    G.P = P;
    const s = start(3401, "thief", "rich");
    for (const t of T) if (t.test) { try { t.test(s); } catch (e) { B(`${t.key}: 古い記録で例外 ${e.message}`); } }
  }

  if (!bad) ok(`T3 トロフィーの格（白金 ${count.白金}・金 ${count.金}・銀 ${count.銀}・銅 ${count.銅}。作成直後は旅立ちだけ・作成の能力値の最大 ${maxStart} 点・段 ${CHAINS.length} 組・仕組み ${Object.keys(GR).length}）`);
};
