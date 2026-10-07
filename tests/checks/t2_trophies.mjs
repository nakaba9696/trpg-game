// T2：トロフィー 100 個（src/data/trophies_t2.js ほか）と格の見直し。
// - 数が 100、key の重複なし、格が銅・銀・金のどれか、名前と説明がある
// - すべての条件（test）が、作ったばかりの冒険・遊んだあと・古い記録（G.P に項目が無い）で例外なく動く
// - test の無いトロフィーには取れる道がある（出来事・場所の報酬の trophy キーか、エンジンの G.award("key")）。出来事・報酬の trophy キーは実在する
// - 新しいトロフィーの条件が、狙った状態で真になり、作ったばかりの冒険では（旅立ち・冒険をまたぐもの以外）偽
// - 全部取ったときの点とボーナス点（銅 1・銀 2・金 5、10 点ごと +1）
import { readFileSync, readdirSync } from "node:fs";

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const F = (m) => fail("T2: " + m);
  let bad = 0;
  const B = (m) => { bad++; F(m); };
  const T = D.TROPHIES;

  // ---------------------------------------------------------------- 表の形
  // 使徒を正面から倒す長編（E7）のトロフィーは、長編ごとに足す（100 個の外に数える）
  const saga = T.filter((t) => /^e7_/.test(t.key)).length;
  if (T.length - saga !== 100) B(`トロフィーが ${T.length - saga} 個（長編の ${saga} 個を除いて 100 個のはず）`);
  const keys = new Set();
  for (const t of T) {
    if (keys.has(t.key)) B(`key ${t.key} が重複している`);
    keys.add(t.key);
    if (!["銅", "銀", "金"].includes(t.tier)) B(`${t.key}: 格「${t.tier}」が銅・銀・金のどれでもない`);
    if (!t.name || !t.desc) B(`${t.key}: 名前か説明が無い`);
    if (t.test && typeof t.test !== "function") B(`${t.key}: test が関数でない`);
  }
  const tiers = { 銅: 0, 銀: 0, 金: 0 };
  T.forEach((t) => { tiers[t.tier] = (tiers[t.tier] || 0) + 1; });
  // 金ばかり・銅ばかりにしない（どの格も 2 割以上）
  for (const [k, v] of Object.entries(tiers)) if (v < T.length * 0.2) B(`${k}が少ない（${v} 個）`);

  // ---------------------------------------------------------------- 取れる道
  const given = new Set();
  const addO = (o) => { if (!o) return; if (o.trophy) given.add(o.trophy); addO(o.win); };
  for (const e of D.EVENTS) for (const c of e.choices || []) { addO(c); addO(c.ok); addO(c.ng); addO(c.win); }
  for (const L of Object.values(D.LOCS)) addO(L.reward);
  for (const ap of Object.values((D.E3 && D.E3.LIST) || {})) addO(ap.reward);
  for (const d of (D.M6 && D.M6.AFTER_DEATHS) || []) if (d.trophy) given.add(d.trophy);
  // エンジン・データの G.award("key") と、終わり方の表の trophy: "key"
  const dirs = ["../../src/engine/", "../../src/data/"];
  for (const d of dirs) {
    const dir = new URL(d, import.meta.url);
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".js"))) {
      const src = readFileSync(new URL(f, dir), "utf8");
      for (const m of src.matchAll(/award\(\s*"([a-z0-9_]+)"/g)) given.add(m[1]);
      for (const m of src.matchAll(/award\([^;)]*\?\s*"([a-z0-9_]+)"\s*:\s*"([a-z0-9_]+)"\s*\)/g)) { given.add(m[1]); given.add(m[2]); } // award(x ? "a" : "b")
      if (/epilogue_m6/.test(f)) for (const m of src.matchAll(/trophy:\s*"([a-z0-9_]+)"/g)) given.add(m[1]);
    }
  }
  for (const k of given) if (!keys.has(k)) B(`取れる道が指すトロフィー ${k} が無い`);
  for (const t of T) if (!t.test && !given.has(t.key)) B(`${t.key}: 条件（test）も、渡す出来事・報酬も無い（取れない）`);

  // ---------------------------------------------------------------- 条件が例外なく動く
  const start = (seed, cls, goal) => {
    G.rand = seeded(seed);
    const { stats, caps } = G.cre.quickStats(cls, G.rand);
    G.newGame({ cls, stats, caps, goal, goalText: goal === "custom" ? "自分の店を持つ" : undefined, profile: { name: "テスト", sex: "女", age: 22, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  const runAll = (where) => {
    for (const t of T) if (t.test) { try { t.test(G.S); } catch (e) { B(`${t.key}: ${where}で条件が例外 ${e.message}`); } }
  };
  const classes = Object.keys(D.CLASSES), goals = Object.keys(D.GOALS);
  // 古い記録（項目が無い）・空の記録
  for (const P of [{}, { trophies: {} }, { trophies: {}, graves: [] }, { trophies: {}, graves: [{}, { id: "x" }], codex: {}, know: null, q9: { a: null } }]) {
    G.P = P;
    start(77, classes[0], goals[0]);
    runAll(`古い記録 ${JSON.stringify(P).slice(0, 40)} `);
  }
  // 作ったばかりの冒険で、旅立ち以外の一度の冒険の条件は偽（取れすぎない）
  G.P = { trophies: {}, graves: [] };
  const S0 = start(78, "merc", "majin");
  const early = T.filter((t) => t.test && t.key.startsWith("t2_")).filter((t) => t.test(S0));
  if (early.length) B(`作ったばかりの冒険で取れてしまう：${early.map((t) => t.key).join("・")}`);
  // ランダムに遊んだあと（死・引退・時間切れ）
  for (let g = 0; g < 10; g++) {
    G.P = { trophies: {}, graves: [] };
    start(4000 + g, classes[g % classes.length], goals[g % goals.length]);
    for (let i = 0; i < 300 && !G.S.over; i++) {
      const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      G.act(acts[Math.floor(G.rand() * acts.length)].id);
      if (i % 50 === 0) runAll(`遊んでいる途中（${g}）`);
    }
    runAll(`遊んだあと（${g}）`);
  }

  // ---------------------------------------------------------------- 新しいトロフィーの条件が、狙った状態で真になる
  const tt = (k) => T.find((t) => t.key === k);
  const yes = (k, S, why) => { const t = tt(k); if (!t) return B(`${k} が無い`); let r; try { r = t.test(S); } catch (e) { r = e.message; } if (r !== true) B(`${k}: ${why}なのに取れない（${r}）`); };
  const no = (k, S, why) => { const t = tt(k); if (t && t.test(S)) B(`${k}: ${why}なのに取れる`); };
  G.P = { trophies: {}, graves: [] };
  let S = start(79, "merc", "custom");
  const dung = Object.keys(D.LOCS).filter((id) => D.LOCS[id].type === "dungeon");
  S.visited[dung[0]] = true; yes("t2_dungeon", S, "迷宮に入った");
  const byRegion = {};
  for (const [id, L] of Object.entries(D.LOCS)) byRegion[L.region] = byRegion[L.region] || id;
  Object.values(byRegion).slice(0, 3).forEach((id) => { S.visited[id] = true; });
  yes("t2_region3", S, "三つの地方に入った");
  no("t2_regions", S, "地方を全部は回っていない");
  Object.values(byRegion).forEach((id) => { S.visited[id] = true; });
  yes("t2_regions", S, "地方をすべて回った");
  S.counters.kills = 20; yes("t2_kills20", S, "二十体倒した"); no("t2_kills200", S, "二十体しか倒していない");
  S.counters.kills = 200; yes("t2_kills200", S, "二百体倒した");
  S.counters.quests = 1; yes("t2_quest1", S, "依頼を一件こなした"); no("t2_quests30", S, "依頼が一件");
  S.counters.quests = 30; yes("t2_quests30", S, "依頼を三十件こなした");
  S.counters.travels = 10; yes("t2_travel10", S, "十度旅をした");
  S.counters.bosses = 1; yes("t2_boss1", S, "強敵を倒した");
  S.day = 30; yes("t2_day30", S, "三十日生きた"); yes("t2_custom", S, "自分で決めた目的で区切りに着いた");
  S.day = 361; yes("t2_year", S, "一年生きた");
  S.over = "dead"; no("t2_year", S, "死んだ"); no("t2_day30", S, "死んだ"); S.over = "";
  S.weapon = Object.keys(D.ITEMS).find((id) => D.ITEMS[id].type === "weapon" && id !== D.CLASSES.merc.weapon);
  yes("t2_gear", S, "武器を替えた");
  S.companions.push({ id: "t2c", name: "傭兵のテスト", cls: "傭兵", bond: 95 });
  yes("t2_ally", S, "仲間を連れた"); yes("t2_bond", S, "絆の深い仲間がいる");
  S.spells = Object.keys(D.SPELLS); yes("t2_spells", S, "術をすべて覚えた");
  S.goal = { id: "majin", text: "x" }; no("t2_custom", S, "目的が自分で決めたものでない");
  // 冒険をまたぐもの
  const P = G.P;
  P.know = { a: {} }; yes("t2_know", S, "覚え書きがある");
  P.q9 = { dil: { good: {} } }; yes("t2_q9", S, "頼みごとの結末を見た");
  P.codex = { foes: {}, people: {}, items: {} };
  Object.keys(D.ENEMIES).slice(0, 30).forEach((id) => { P.codex.foes[id] = { kills: 0 }; });
  for (let i = 0; i < 30; i++) P.codex.people["p" + i] = {};
  yes("t2_codex30", S, "魔物が三十種載った"); yes("t2_people30", S, "人物が三十人載った");
  no("t2_lairs", S, "迷宮の主を倒していない");
  G.t2.dungeonBosses().forEach((id) => { P.codex.foes[id] = { kills: 1 }; });
  yes("t2_lairs", S, "迷宮の主をすべて倒した");
  if (G.codexCount) {
    no("t2_bestiary", S, "図鑑の魔物が半分に届かない");
    Object.keys(D.ENEMIES).forEach((id) => { P.codex.foes[id] = { kills: 1 }; });
    yes("t2_bestiary", S, "図鑑の魔物をすべて載せた");
  }
  const K = G.l1 && G.l1.build ? G.l1.build() : D.KNOW;
  const traps = Object.keys(K).filter((id) => K[id].kind === "trap");
  if (!traps.length) B("迷宮の罠の覚え書きが無い（t2_traps が取れない）");
  P.know = Object.fromEntries(traps.slice(1).map((id) => [id, {}])); no("t2_traps", S, "罠の覚え書きが一つ足りない");
  P.know[traps[0]] = {}; yes("t2_traps", S, "罠の覚え書きをすべて集めた");
  // 墓碑（今の冒険が終わったところなら、それも数える）
  const names = Object.values(D.CLASSES).map((c) => c.name);
  P.graves = [{ id: "g1", cls: names[0], end: "dead", cause: "a" }, { id: "g2", cls: names[1], end: "end", ending: "king" }];
  no("t2_runs3", S, "終えた冒険が二つ");
  S.over = "end"; S.ending = { id: "rich" };
  yes("t2_runs3", S, "今の冒険を入れて三つ終えた");
  no("t2_endings3", S, "結末が二通り");
  P.graves.push({ id: "g3", cls: names[2], end: "end", ending: "custom" });
  yes("t2_endings3", S, "三通りの結末");
  P.graves.push({ id: "g4", cls: names[3], end: "dead" }, { id: "g4", cls: names[4], end: "dead" });
  no("t2_allcls", S, "同じ冒険の墓碑が二つ（重複は数えない）");
  P.graves.push({ id: "g5", cls: names[4], end: "dead" });
  yes("t2_allcls", S, "すべての職業で冒険を終えた");
  no("t2_dead5", S, "三度しか死んでいない");
  P.graves.push({ id: "g6", end: "dead" }, { id: "g7", end: "dead" });
  yes("t2_dead5", S, "五度死んだ");

  // ---------------------------------------------------------------- 全部取ったときの点
  const pts = D.TROPHY_POINTS || { 銅: 1, 銀: 2, 金: 5 };
  const sum = T.reduce((a, t) => a + pts[t.tier], 0);
  G.P = { trophies: Object.fromEntries(T.map((t) => [t.key, { name: t.name, tier: "銅" }])), graves: [] }; // 記録の格が古くても、今の表の格で数える
  if (G.cre && G.cre.trophyScore && G.cre.trophyScore() !== sum) B(`全部取ったときの点が ${G.cre.trophyScore()}（表の格では ${sum}）。記録に残った古い格で数えている`);
  if (!bad) ok(`T2 トロフィー ${T.length} 個（銅 ${tiers.銅}・銀 ${tiers.銀}・金 ${tiers.金}。全部で ${sum} 点 → ボーナス点 +${Math.floor(sum / (D.TROPHY_PER_BONUS || 10))}）・取れる道・条件`);
};
