// W4：担当の地域（ノルディア帝国・エルメシア共和国・人と魔の境・人類の最前線・使徒領）の新しい場所と出来事
// - 新しい場所（w4_）が 6〜8：町 2〜3・野外 2〜3・迷宮 2。どれも担当の地域の中で、気候・着いたときの用語説明・背景の絵（外と迷宮の中）がある
// - 新しい町は施設・店・通行人のひとことを持つ。新しい場所はどれも出来事が 6 件以上ある。迷宮には階（S.depth）で変わる部屋の出来事がある
// - 出来事（w4_）が 120 件以上。新しい場所と、担当の地域の今ある場所に散らばる
// - 本編の出来事は、能力値の違う解き方が二つ以上と、条件も代金も無い判定なしの選択肢を一つ以上持つ。続き（w: 0）は判定なしの選択肢を持ち、どこかの next から呼ばれる
// - 季節・時間帯・天候・評判・種族・職業・仲間で変わるもの、一度きり（once）、続き物（next）、場所をまたぐ続き物（印でつながる）が混ざっている
// - 全部の選択肢を種を変えて最後まで（戦闘・続きの出来事まで）回しても、例外も存在しない続きも出ない。新しい場所へ行って探索・迷宮に入っても止まらない
import { readFileSync } from "node:fs";

const REGIONS = ["ノルディア帝国", "エルメシア共和国", "人と魔の境", "人類の最前線", "使徒領"];

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("W4：" + m); };
  const G = loadEngine();
  const D = G.data;

  // ---------------------------------------------------------------- 場所
  const locs = Object.entries(D.LOCS).filter(([id]) => id.startsWith("w4_"));
  const by = (t) => locs.filter(([, L]) => L.type === t).length;
  if (locs.length < 6 || locs.length > 8) F(`新しい場所が ${locs.length}（6〜8 のはず）`);
  if (by("town") < 2 || by("town") > 3) F(`新しい町が ${by("town")}（2〜3 のはず）`);
  if (by("wild") < 2 || by("wild") > 3) F(`新しい野外が ${by("wild")}（2〜3 のはず）`);
  if (by("dungeon") !== 2) F(`新しい迷宮が ${by("dungeon")}（2 のはず）`);
  const sceneSrc = readFileSync(new URL("../../src/ui/scene.js", import.meta.url), "utf8");
  const v2Src = readFileSync(new URL("../../src/ui/scene_v2_w4.js", import.meta.url), "utf8");
  const evAt = (id) => D.EVENTS.filter((e) => e.where.includes(id));
  for (const [id, L] of locs) {
    if (!REGIONS.includes(L.region)) F(`${id}: 地域「${L.region}」が担当の外`);
    if (!D.CLIMATE || !D.CLIMATE[id]) F(`${id}: 気候（D.CLIMATE）が無い`);
    if (!D.LORE_ON.loc[id]) F(`${id}: 着いたときに開く用語説明が無い`);
    if (!sceneSrc.includes(`${L.scene}(ctx, w, h, sk, R)`) || !v2Src.includes(`OUT.${L.scene} = `)) F(`${id}: 背景の絵 ${L.scene} が scene.js か scene_v2_w4.js に無い`);
    if (L.type === "dungeon" && (!sceneSrc.includes(`${L.scene}_in(ctx, w, h, R)`) || !v2Src.includes(`IN.${L.scene}_in = `))) F(`${id}: 迷宮の中の絵 ${L.scene}_in が無い`);
    if (!Object.keys(L.links).length) F(`${id}: 道が無い`);
    if (evAt(id).length < 6) F(`${id}: 出来事が ${evAt(id).length} 件（6 件以上のはず）`);
    if (L.type === "town") {
      if (!(L.fac || []).length || !(L.shop || []).length) F(`${id}: 施設か店の品が無い`);
      if (!(D.AMBIENT || []).some((a) => a.where.includes(id))) F(`${id}: 通行人のひとことが無い`);
    }
    if (L.type === "dungeon" && !evAt(id).some((e) => e.cond && /depth/.test(String(e.cond)))) F(`${id}: 階で変わる部屋の出来事が無い`);
  }

  // ---------------------------------------------------------------- 出来事のデータ
  const evs = D.EVENTS.filter((e) => e.id.startsWith("w4_"));
  const main = evs.filter((e) => e.w > 0);
  if (evs.length < 120) F(`W4 の出来事が ${evs.length} 件（120 件以上のはず）`);
  const old = new Set(evs.flatMap((e) => e.where).filter((w) => D.LOCS[w] && !w.startsWith("w4_")));
  for (const w of old) if (!REGIONS.includes(D.LOCS[w].region)) F(`今ある場所 ${w}（${D.LOCS[w].region}）が担当の地域の外`);
  if (old.size < 12) F(`担当の地域の今ある場所への出来事が ${old.size} か所しかない`);
  const free = (c) => !c.stat && !c.fight && !c.cond && !c.cost;
  for (const e of main) {
    const stats = new Set(e.choices.filter((c) => c.stat).map((c) => c.stat));
    if (stats.size < 2) F(`${e.id}: 能力値の違う解き方が ${stats.size} つ`);
    if (!e.choices.some(free)) F(`${e.id}: 条件も代金も無い、判定なしの選択肢が無い`);
  }
  const nexts = new Set();
  const scan = (o) => { if (!o) return; if (o.next) nexts.add(o.next); scan(o.win); };
  for (const e of D.EVENTS) for (const c of e.choices) { if (c.next) nexts.add(c.next); scan(c.ok); scan(c.ng); scan(c.win); }
  for (const e of evs.filter((e) => !(e.w > 0))) {
    if (!e.choices.some((c) => !c.stat && !c.fight)) F(`${e.id}: 続きに判定なしの選択肢が無い`);
    if (!nexts.has(e.id)) F(`${e.id}: 続き（w: 0）なのに、どこからも呼ばれない`);
  }
  for (const id of nexts) if (!D.EVENTS.some((e) => e.id === id)) F(`続きの出来事 ${id} が無い`);
  // 変わり方の混ざり具合
  const src = (e) => String(e.cond || "") + e.choices.map((c) => String(c.cond || "")).join(" ");
  const KINDS = { 季節: /seasonOf|season\(/, 時間帯: /phase/, 天候: /skyAt|weather\(/, 評判: /repOf|fame/, 種族: /r1Of|raceIs/, 職業: /S\.cls|cls\(/, 仲間: /companions|withFriend/, 階: /depth/ };
  for (const [k, re] of Object.entries(KINDS)) { const n = evs.filter((e) => re.test(src(e))).length; if (n < 2) F(`${k}で変わる出来事が ${n} 件（2 件以上のはず）`); }
  if (evs.filter((e) => e.once).length < 15) F("一度きり（once）の出来事が少ない");
  const chains = evs.filter((e) => e.cond && /S\.flags\.w4_/.test(String(e.cond)));
  if (chains.length < 3) F(`印でつながる続き物が ${chains.length} 件（3 件以上のはず）`);
  if (chains.every((e) => e.where.every((w) => w.startsWith("w4_")))) F("場所をまたぐ続き物（今ある場所で続きが起きる）が無い");
  // 地の文に「！」を使わない（台詞の中はよい）
  const narr = (t) => String(t || "").replace(/「[^」]*」/g, "");
  const texts = (o, w) => { if (!o) return; if (/！|!/.test(narr(o.text))) F(`${w}: 地の文に「！」`); texts(o.win, w); };
  for (const e of evs) { if (/！|!/.test(narr(e.text))) F(`${e.id}: 地の文に「！」`); e.choices.forEach((c, i) => { texts(c.ok, `${e.id}[${i}]`); texts(c.ng, `${e.id}[${i}]`); texts(c.win, `${e.id}[${i}]`); }); }

  // ---------------------------------------------------------------- 回す
  let runs = 0;
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 30 + G.d(40); caps[k] = 90; });
    G.newGame({ cls: G.pick(Object.keys(D.CLASSES)), stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 22, history: "テスト用", personality: "無口" } });
    G.S.gold = 500;
    G.S.maxHp = G.S.hp = 300;
  };
  for (const e of evs) e.choices.forEach((_, i) => {
    for (let seed = 1; seed <= 3; seed++) {
      try {
        start(seed * 37 + i);
        G.S.loc = e.where.find((w) => D.LOCS[w]) || "frost";
        if (D.LOCS[G.S.loc].type === "dungeon") G.S.depth = 3;
        G.S.inv.jerky = 2;
        G.startEvent(e.id);
        G.chooseEvent(i);
        runs++;
        for (let step = 0; step < 200 && !G.S.over; step++) {
          if (G.S.combat) { G.combatAct("attack"); continue; }
          if (G.S.mode !== "event") break;
          if (!D.EVENTS.some((x) => x.id === G.S.event)) { F(`${e.id}[${i}]: 続きの出来事 ${G.S.event} が無い`); break; }
          G.chooseEvent(G.pick(G.eventChoices()).i);
        }
      } catch (err) {
        F(`${e.id}[${i}] 種 ${seed}: ${err.message}`);
      }
    }
  });
  // 新しい場所へ行って、探索・迷宮を回る（行き来と出来事の引き方が止まらない）
  for (const [id, L] of locs) {
    try {
      start(7);
      G.arrive(id);
      G.endTurn();
      if (!(G.loreOf(G.S)[[].concat(D.LORE_ON.loc[id])[0].split(":")[0]] || []).length) F(`${id}: 着いても用語説明が開かない`);
      for (let t = 0; t < 60 && !G.S.over; t++) {
        G.S.hp = G.S.maxHp;
        const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
        const want = L.type === "dungeon" ? acts.find((a) => a.id === "deeper") : L.type === "wild" ? acts.find((a) => a.id === "explore") : null;
        const a = G.S.mode === "explore" && want ? want : G.pick(acts.filter((x) => !x.id.startsWith("travel")) .length ? acts.filter((x) => !x.id.startsWith("travel")) : acts);
        if (!a) break;
        G.act(a.id);
        if (G.S.loc !== id && G.S.mode === "explore") G.arrive(id);
      }
    } catch (err) {
      F(`${id} を回る: ${err.message}`);
    }
  }
  if (!bad) ok(`W4（場所 ${locs.length}・出来事 ${evs.length}（本編 ${main.length}・続き ${evs.length - main.length}）・今ある場所 ${old.size} か所・${runs} 回）`);
};
