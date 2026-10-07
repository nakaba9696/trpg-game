// W3：新しい場所（src/data/locations_w3.js）と出来事（src/data/events_w3*.js）
// - 新しい場所が 6〜8（町 2〜3・迷宮 2・ほかは野外か名所）。どれも担当の地域（レオネスト王国・光天教会領・シェルアーク）の中
// - どの場所にも道か船があり（片道でない）、気候・着いたときの用語説明・背景の絵（古い scene.js と V2）がある。迷宮は中の絵も
// - 出来事が 120 以上。どの出来事も、能力値の違う解き方が二つ以上と、判定なしの選択肢がある
// - 続き物（next）の行き先があり、行き先にしか出ない出来事（w: 0）は、どこかの next から来る。一度きり・条件つきが混ざっている
// - 新しい場所ごとに出来事がある。迷宮には、階ごとの出来事がある。担当の地域の今ある場所にも出来事が増えている
// - 町には通行人のひとこと、噂も増えている。地の文に「！」が無い
// - 新しい場所で遊んでも例外が出ず、迷宮の最奥でボスに会える
import { readFileSync } from "node:fs";

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("W3: " + m); };
  const G = loadEngine();
  const D = G.data;
  const REGIONS = ["レオネスト王国", "光天教会領", "シェルアーク"];
  const w3 = Object.entries(D.LOCS).filter(([id]) => id.startsWith("w3_"));
  const by = (t) => w3.filter(([, L]) => L.type === t).length;
  if (w3.length < 6 || w3.length > 8) F(`新しい場所が ${w3.length}（6〜8 のはず）`);
  if (by("town") < 2 || by("town") > 3) F(`新しい町が ${by("town")}（2〜3 のはず）`);
  if (by("dungeon") < 2) F(`新しい迷宮が ${by("dungeon")}（2 以上のはず）`);
  if (by("wild") < 2) F(`新しい野外・名所が ${by("wild")}（2 以上のはず）`);

  // ---------------------------------------------------------------- 場所
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const v1 = src("ui/scene.js"), v2 = src("ui/scene_v2_w3.js");
  for (const [id, L] of w3) {
    if (!REGIONS.includes(L.region)) F(`${id}: 地域 ${L.region} が担当の外`);
    const ways = [...Object.keys(L.links || {}), ...Object.keys(L.sea || {})];
    if (!ways.length) F(`${id}: 道も船も無い`);
    for (const to of Object.keys(L.sea || {})) if (!D.LOCS[to] || !D.LOCS[to].sea || !D.LOCS[to].sea[id]) F(`${id}→${to}: 船が片道`);
    if (!(L.x >= 0 && L.x <= 100 && L.y >= 0 && L.y <= 100)) F(`${id}: 地図の座標が外`);
    if (!D.CLIMATE || !D.CLIMATE[id]) F(`${id}: 気候が無い`);
    if (!D.LORE_ON.loc[id]) F(`${id}: 着いたときに開く用語説明が無い`);
    if (!v1.includes(`${L.scene}(ctx, w, h, sk, R)`)) F(`${id}: 背景の絵 ${L.scene} が scene.js に無い`);
    if (!v2.includes(`OUT.${L.scene} =`)) F(`${id}: 背景の絵 ${L.scene} が scene_v2_w3.js に無い`);
    if (L.type === "dungeon" && (!v1.includes(`${L.scene}_in(ctx, w, h, R)`) || !v2.includes(`IN.${L.scene}_in =`))) F(`${id}: 迷宮の中の絵が無い`);
    if (L.type !== "town" && !(L.danger >= 1 && L.danger <= 3)) F(`${id}: 危険度 ${L.danger} が 1〜3 の外`);
    if (L.type === "town" && !(D.AMBIENT || []).some((a) => a.where.includes(id))) F(`${id}: 通行人のひとことが無い`);
  }
  // 新しい敵は場所のどこかに出る
  for (const id of Object.keys(D.ENEMIES).filter((k) => k.startsWith("w3_"))) {
    const used = Object.values(D.LOCS).some((L) => (L.pool || []).includes(id) || L.boss === id);
    if (!used) F(`敵 ${id} がどこにも出ない`);
  }

  // ---------------------------------------------------------------- 出来事
  const evs = D.EVENTS.filter((e) => e.id.startsWith("w3_"));
  const byId = Object.fromEntries(D.EVENTS.map((e) => [e.id, e]));
  if (evs.length < 120) F(`W3 の出来事が ${evs.length}（120 以上のはず）`);
  const targets = new Set();
  const scan = (o) => { if (!o) return; if (o.next) targets.add(o.next); scan(o.win); };
  for (const e of evs) for (const c of e.choices) { if (c.next) targets.add(c.next); scan(c.ok); scan(c.ng); scan(c.win); }
  const loreRef = [];
  const scanLore = (o) => { if (!o) return; if (o.lore) loreRef.push(...[].concat(o.lore)); scanLore(o.win); };
  const SHOUT = /[！!]/;
  for (const t of targets) if (!byId[t]) F(`next の行き先 ${t} が無い`);
  for (const e of evs) {
    const stats = new Set(e.choices.filter((c) => c.stat).map((c) => c.stat));
    if (stats.size < 2) F(`出来事 ${e.id}: 能力値の違う解き方が ${stats.size}（2 以上のはず）`);
    if (!e.choices.some((c) => !c.stat)) F(`出来事 ${e.id}: 判定なしの選択肢が無い`);
    if (e.w === 0 && !targets.has(e.id)) F(`出来事 ${e.id}: w: 0 なのに、どの next からも来ない`);
    if (e.lore) loreRef.push(...[].concat(e.lore));
    for (const c of e.choices) { scanLore(c.ok); scanLore(c.ng); scanLore(c.win); }
    const texts = [e.text, ...e.choices.flatMap((c) => [c.label, c.ok && c.ok.text, c.ng && c.ng.text, c.ok && c.ok.win && c.ok.win.text, c.win && c.win.text])].filter(Boolean);
    for (const t of texts) if (SHOUT.test(t)) { F(`出来事 ${e.id}: 「！」がある：${t.slice(0, 30)}`); break; }
  }
  for (const ref of loreRef) {
    const [k, line] = ref.split(":");
    const L = D.LORE[k];
    if (!L) F(`用語説明 ${k} が無い（${ref}）`);
    else if (line && !L.lines.some((x) => x[0] === line)) F(`用語説明 ${k} に行 ${line} が無い`);
  }
  const once = evs.filter((e) => e.once).length, cond = evs.filter((e) => e.cond || e.choices.some((c) => c.cond)).length, chains = evs.filter((e) => targets.has(e.id)).length;
  if (once < 15) F(`一度きりの出来事が ${once}（15 以上のはず）`);
  if (cond < 30) F(`条件つきの出来事が ${cond}（30 以上のはず）`);
  if (chains < 8) F(`続き物の出来事が ${chains}（8 以上のはず）`);
  for (const [id, L] of w3) {
    const n = evs.filter((e) => e.where.includes(id)).length;
    if (n < 8) F(`${id}: 出来事が ${n}（8 以上のはず）`);
  }
  // 「今ある場所」は W3 のときにあった場所。あとの W7 で増やした町（w7_）は、それぞれ自分の出来事を持つ（tests/checks/w7_map.mjs・w7b_towns.mjs）
  const old = Object.entries(D.LOCS).filter(([id, L]) => !id.startsWith("w3_") && !id.startsWith("w7_") && REGIONS.includes(L.region));
  for (const [id] of old) if (!evs.some((e) => e.where.includes(id))) F(`${id}: 担当の地域の今ある場所なのに、W3 の出来事が無い`);
  if (!(D.RUMORS || []).some((r) => /カルメラント|リグノア|フロスレイア|鐘撞き|修道院|数の合わない|観測所|潮鳴り/.test(r))) F("新しい場所の噂が無い");

  // ---------------------------------------------------------------- 遊ぶ（例外が出ない・迷宮の階ごとの出来事・最奥のボス）
  const start = (G, seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    G.newGame({ cls: Object.keys(G.data.CLASSES)[0], stats: Object.fromEntries(G.data.STATS.map((k) => [k, 60])), caps: Object.fromEntries(G.data.STATS.map((k) => [k, 90])), goal: Object.keys(G.data.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    return G.S;
  };
  {
    const G2 = loadEngine();
    const S = start(G2, 31);
    for (const [id, L] of w3.filter(([, L]) => L.type === "dungeon")) {
      G2.arrive(id);
      const depthEv = (d) => G2.data.EVENTS.filter((e) => e.where.includes(id) && e.cond && (() => { S.depth = d; try { return e.cond(S); } catch (err) { return false; } })() && (() => { S.depth = d === 1 ? 2 : 1; try { return !e.cond(S); } catch (err) { return true; } })());
      for (let d = 1; d < L.floors; d++) if (!depthEv(d).length) F(`${id}: 地下${d}階だけの出来事が無い`);
      S.depth = 0;
    }
  }
  {
    const G3 = loadEngine();
    const S = start(G3, 9);
    const ids = () => G3.actions().flatMap((g) => g.list).filter((a) => !a.disabled).map((a) => a.id);
    for (const [id, L] of w3) {
      G3.arrive(id);
      for (let i = 0; i < 30 && !S.over; i++) {
        S.hp = S.maxHp; S.gold = Math.max(S.gold, 200);
        if (S.loc !== id && !S.combat && S.mode !== "event") G3.arrive(id);
        const a = ids();
        if (!a.length) break;
        const pick = a.filter((x) => !x.startsWith("travel:") && !x.startsWith("sail:"));
        try { G3.act((pick.length ? pick : a)[Math.floor(G3.rand() * (pick.length || a.length))]); } catch (err) { F(`${id} で遊ぶと例外 ${err.message}`); break; }
      }
      if (S.over) break;
    }
  }
  {
    const G4 = loadEngine();
    const S = start(G4, 12);
    for (const [id, L] of w3.filter(([, L]) => L.type === "dungeon")) {
      G4.arrive(id);
      let met = false;
      for (let i = 0; i < 200 && !met && !S.over; i++) {
        S.hp = S.maxHp = 999;
        if (S.combat) { if (S.combat.foes.some((f) => f.id === L.boss)) met = true; else G4.act((ids4() .find((x) => x.startsWith("cb:attack"))) || ids4()[0]); continue; }
        if (S.mode === "event") { G4.act(ids4()[0]); continue; }
        S.mode = "explore"; S.loc = id;
        G4.act("deeper");
      }
      if (!met) F(`${id}: 最奥でボス ${L.boss} に会えない`);
      S.combat = null; S.mode = "explore"; S.depth = 0;
    }
    function ids4() { return G4.actions().flatMap((g) => g.list).filter((a) => !a.disabled).map((a) => a.id); }
  }

  if (!bad) ok(`W3 の場所と出来事（場所 ${w3.length}・出来事 ${evs.length}・一度きり ${once}・条件つき ${cond}・続き物 ${chains}）`);
};
