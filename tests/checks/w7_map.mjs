// W7：地図と行ける道を合わせる・町を増やす（src/data/locations_w7.js・w7_map.js・events_w7_*.js・lore_w7_*.js・engine/zzzzzzzzz_w7_arrive.js）
// 持ち主の声「地図と行ける場所が合ってない。ナグリスから使徒領に行けるように見えて行けない」「街の数はもう少し増やしていい」
// - 地図に描く道（G.w5.roads）＝ links・sea にある道（逆も）。片道が無い（日数・船賃も両方向で同じ）
// - 描く線（曲がり角 D.W5_MAP.via を通る）は、ほかの場所の印の上を通らない。陸路どうしは町の外で交わらない。船は海の上を行く
// - 狩り場の町ナグリスの近くを、ナグリスに出入りしない道が通らない。ナグリスから使徒領へ道は無い
// - どの場所にも、どこからでも行ける
// - 新しい町（w7_）が 6〜8、三つ以上の国・地方に。どれにも施設・店・気候・背景の一覧・用語説明・着いたときの一文・通行人・噂・出来事 8〜12
// - 出来事の形（能力値の違う解き方 2 つ以上・判定なしの選択肢・地の文に「！」なし・続きがある）。全部の選択肢を回しても壊れない
// - 旅をして新しい町に着くと、見出しのあとに町の一文が出る。新しい町を歩き回っても止まらない
import { readFileSync } from "node:fs";

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("W7：" + m); };
  const G = loadEngine();
  const D = G.data;
  const W5 = G.w5;
  const L = D.LOCS;
  const ids = Object.keys(L);

  // ---------------------------------------------------------------- 描く道＝行ける道
  const all = { visited: Object.fromEntries(ids.map((id) => [id, true])), loc: ids[0] };
  const drawn = W5.roads(all);
  const key = (k, a, b) => `${k}:${a < b ? a + "|" + b : b + "|" + a}`;
  const dset = new Set(drawn.map((r) => key(r.kind, r.a, r.b)));
  const lset = new Set();
  for (const [id, A] of Object.entries(L)) {
    for (const [to, days] of Object.entries(A.links || {})) {
      if (!L[to]) { F(`${id}: 道の行き先 ${to} が無い`); continue; }
      if ((L[to].links || {})[id] !== days) F(`${id}→${to}: 陸路が片道か、日数が食い違う`);
      lset.add(key("land", id, to));
    }
    for (const [to, s] of Object.entries(A.sea || {})) {
      if (!L[to]) { F(`${id}: 船の行き先 ${to} が無い`); continue; }
      const back = (L[to].sea || {})[id];
      if (!back || back.days !== s.days || back.cost !== s.cost) F(`${id}→${to}: 船が片道か、日数・船賃が食い違う`);
      lset.add(key("sea", id, to));
    }
  }
  for (const k of lset) if (!dset.has(k)) F(`行ける道 ${k} が地図に描かれない`);
  for (const k of dset) if (!lset.has(k)) F(`地図に描く道 ${k} が、旅の選択肢に無い`);
  // 旅の選択肢（行動）と地図の線が同じ：どの場所でも
  {
    const g = loadEngine();
    g.rand = seeded(7);
    const stats = Object.fromEntries(g.data.STATS.map((k) => [k, 50]));
    g.newGame({ cls: Object.keys(g.data.CLASSES)[0], stats, goal: Object.keys(g.data.GOALS)[0], profile: { name: "テスト", sex: "女", age: 22 } });
    g.S.gold = 9999;
    for (const id of ids) {
      g.S.loc = id; g.S.depth = 0; g.S.mode = "explore"; g.S.fac = null;
      const acts = g.actions().flatMap((x) => x.list).map((a) => a.id).filter((a) => /^(travel|sail):/.test(a));
      const fromActs = new Set(acts.map((a) => key(a.startsWith("sail") ? "sea" : "land", id, a.split(":")[1])));
      const fromMap = new Set(drawn.filter((r) => r.a === id || r.b === id).map((r) => key(r.kind, r.a, r.b)));
      for (const k of fromMap) if (!fromActs.has(k)) F(`${id}: 地図の道 ${k} が旅の選択肢に出ない`);
      for (const k of fromActs) if (!fromMap.has(k)) F(`${id}: 旅の選択肢 ${k} が地図に描かれない`);
    }
  }

  // ---------------------------------------------------------------- 描く線の形
  const segDist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const lineDist = (p, pts) => { let d = Infinity; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(p, pts[i], pts[i + 1])); return d; };
  const NEAR = { land: 2.2, sea: 1.6 };
  for (const r of drawn) {
    const line = W5.roadSamples(r.pts, r.kind, 16);
    for (const [id, P] of Object.entries(L)) {
      if (id === r.a || id === r.b) continue;
      const d = lineDist([P.x, P.y], line);
      if (d < NEAR[r.kind]) F(`${r.kind === "sea" ? "船" : "道"} ${r.a}–${r.b} の線が ${P.name} の印の上を通る（${d.toFixed(2)}）。そこから行けるように見える`);
    }
  }
  const side = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const cross = (p, q, r, s) => side(p, q, r) * side(p, q, s) < 0 && side(r, s, p) * side(r, s, q) < 0;
  const land = drawn.filter((r) => r.kind === "land");
  for (let i = 0; i < land.length; i++) for (let j = i + 1; j < land.length; j++) {
    const A = land[i], B = land[j];
    if ([A.a, A.b].some((x) => x === B.a || x === B.b)) continue;
    let hit = false;
    for (let a = 0; a < A.pts.length - 1 && !hit; a++) for (let b = 0; b < B.pts.length - 1 && !hit; b++) hit = cross(A.pts[a], A.pts[a + 1], B.pts[b], B.pts[b + 1]);
    if (hit) F(`道 ${A.a}–${A.b} と ${B.a}–${B.b} が町の外で交わる（交わる所で乗り換えられるように見える）`);
  }
  for (const r of drawn.filter((r) => r.kind === "sea")) {
    const s = W5.roadSamples(r.pts, "sea", 40);
    const mid = s.slice(Math.floor(s.length * 0.25), Math.ceil(s.length * 0.75));
    const onLand = mid.filter((p) => W5.onLand(p[0], p[1])).length;
    if (onLand > mid.length * 0.5) F(`船 ${r.a}–${r.b} の線が、海でなく陸の上を行く（${onLand}/${mid.length}）`);
  }
  for (const [k, pts] of Object.entries(D.W5_MAP.via || {})) {
    const [a, b] = k.replace(/^~/, "").split("|");
    if (!lset.has(key(k.startsWith("~") ? "sea" : "land", a, b))) F(`曲がり角 ${k} の道が無い`);
    if (a > b) F(`曲がり角のキー ${k} は id を名前順に`);
    if (!Array.isArray(pts) || !pts.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) F(`曲がり角 ${k} の座標が変`);
  }

  // ---------------------------------------------------------------- ナグリスと使徒領
  if (L.w2_nagris) {
    const N = [L.w2_nagris.x, L.w2_nagris.y];
    for (const r of drawn) if (r.a !== "w2_nagris" && r.b !== "w2_nagris") {
      const d = lineDist(N, W5.roadSamples(r.pts, r.kind, 16));
      if (d < 3) F(`狩り場の町ナグリスのすぐそばを、ナグリスに出入りしない道 ${r.a}–${r.b} が通る（${d.toFixed(2)}）`);
    }
    for (const to of Object.keys(Object.assign({}, L.w2_nagris.links, L.w2_nagris.sea))) if (L[to].region === "使徒領") F(`ナグリスから使徒領（${to}）へ道がある`);
  }

  // ---------------------------------------------------------------- どこからでも行ける
  {
    const seen = new Set([ids[0]]);
    const q = [ids[0]];
    while (q.length) { const id = q.shift(); Object.keys(Object.assign({}, L[id].links, L[id].sea)).forEach((to) => { if (!seen.has(to)) { seen.add(to); q.push(to); } }); }
    ids.filter((id) => !seen.has(id)).forEach((id) => F(`${id} へ行く道が無い`));
  }

  // ---------------------------------------------------------------- 新しい町
  const towns = ids.filter((id) => id.startsWith("w7_"));
  if (towns.length < 6 || towns.length > 8) F(`新しい町が ${towns.length}（6〜8 のはず）`);
  if (towns.some((id) => L[id].type !== "town")) F("w7_ の場所が町でない");
  if (new Set(towns.map((id) => L[id].region)).size < 3) F("新しい町が三つ以上の国・地方に散っていない");
  const scenes = JSON.parse(readFileSync(new URL("../../docs/art/scenes.json", import.meta.url), "utf8")).scenes;
  const short = (n) => n.replace(/^.*?の(都|町|港)|^隠れ里/, "");
  const rumors = (D.RUMORS || []).map(String);
  const evAt = (id) => D.EVENTS.filter((e) => e.w > 0 && (e.where || []).includes(id) && !e.w6);
  for (const id of towns) {
    const T = L[id];
    if (!(T.fac || []).length || !(T.shop || []).length) F(`${id}: 施設か店の品が無い`);
    (T.shop || []).forEach((it) => { if (!D.ITEMS[it]) F(`${id}: 店の品 ${it} が無い`); });
    if (!D.CLIMATE || !D.CLIMATE[id]) F(`${id}: 気候が無い`);
    if (!scenes.some((s) => s.kind === "place" && s.id === id && s.scene === T.scene)) F(`${id}: 背景の一覧（docs/art/scenes.json）に無い`);
    if (!D.LORE_ON.loc[id] || !D.LORE[[].concat(D.LORE_ON.loc[id])[0].split(":")[0]]) F(`${id}: 着いたときに開く用語説明が無い`);
    if (!((D.W7_ARRIVE || {})[id] || []).length) F(`${id}: 着いたときの一文が無い`);
    if ((D.AMBIENT || []).filter((a) => a.where.includes(id)).length < 2) F(`${id}: 通行人のひとことが 2 つ未満`);
    if (!rumors.some((r) => r.includes(short(T.name)))) F(`${id}: 噂（${short(T.name)}）が無い`);
    const n = evAt(id).length;
    if (n < 8 || n > 12) F(`${id}: 町の出来事が ${n} 件（8〜12 のはず）`);
    if (/！|!/.test(T.desc)) F(`${id}: 町の説明に「！」`);
  }

  // ---------------------------------------------------------------- 出来事の形
  const evs = D.EVENTS.filter((e) => e.id.startsWith("w7_"));
  const free = (c) => !c.stat && !c.fight && !c.cond && !c.cost;
  const nexts = new Set();
  const scan = (o) => { if (!o) return; if (o.next) nexts.add(o.next); scan(o.win); };
  for (const e of D.EVENTS) for (const c of e.choices) { if (c.next) nexts.add(c.next); scan(c.ok); scan(c.ng); scan(c.win); }
  const narr = (t) => String(t || "").replace(/「[^」]*」/g, "");
  const texts = (o, w) => { if (!o) return; if (/！|!/.test(narr(o.text))) F(`${w}: 地の文に「！」`); if (/魔王/.test(o.text || "")) F(`${w}: 「魔王」`); texts(o.win, w); };
  for (const e of evs) {
    if (e.w > 0) {
      const stats = new Set(e.choices.filter((c) => c.stat).map((c) => c.stat));
      if (stats.size < 2) F(`${e.id}: 能力値の違う解き方が ${stats.size} つ`);
      if (!e.choices.some(free)) F(`${e.id}: 条件も代金も無い、判定なしの選択肢が無い`);
    } else {
      if (!e.choices.some((c) => !c.stat && !c.fight)) F(`${e.id}: 続きに判定なしの選択肢が無い`);
      if (!nexts.has(e.id)) F(`${e.id}: 続き（w: 0）なのに、どこからも呼ばれない`);
    }
    if (/！|!/.test(narr(e.text))) F(`${e.id}: 地の文に「！」`);
    if (/魔王/.test(e.text)) F(`${e.id}: 「魔王」`);
    e.choices.forEach((c, i) => { texts(c.ok, `${e.id}[${i}]`); texts(c.ng, `${e.id}[${i}]`); texts(c.win, `${e.id}[${i}]`); });
  }
  for (const id of nexts) if (!D.EVENTS.some((e) => e.id === id)) F(`続きの出来事 ${id} が無い`);
  for (const lines of Object.values(D.W7_ARRIVE || {})) for (const t of lines) if (/！|!/.test(narr(t))) F(`着いたときの一文に「！」：${t.slice(0, 20)}`);

  // ---------------------------------------------------------------- 回す
  const start = (seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 30 + G.d(40); caps[k] = 90; });
    G.newGame({ cls: G.pick(Object.keys(D.CLASSES)), stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 22, history: "テスト用", personality: "無口" } });
    G.S.gold = 500;
    G.S.maxHp = G.S.hp = 300;
  };
  let runs = 0;
  for (const e of evs) e.choices.forEach((_, i) => {
    for (let seed = 1; seed <= 3; seed++) {
      try {
        start(seed * 41 + i);
        G.S.loc = e.where.find((w) => L[w]) || "karna";
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
  // 旅をして着く：見出しのあとに町の一文。歩き回っても止まらない
  for (const id of towns) {
    try {
      start(9);
      const from = Object.keys(L[id].links)[0];
      G.S.loc = from;
      G.arrive(id); // 旅をせずに着いた（一文は出ない）ときでも壊れない
      G.S.loc = from;
      G.S.w6 = { days: L[id].links[from], sea: false };
      const mark = G.S.log.length;
      G.arrive(id);
      const tail = G.S.log.slice(Math.max(0, mark - 2)).map((x) => x.text);
      if (!(D.W7_ARRIVE[id] || []).some((t) => tail.includes(t))) F(`${id}: 旅をして着いても、町の一文が出ない`);
      const ti = tail.indexOf(L[id].name), di = tail.lastIndexOf(L[id].desc), ai = tail.findIndex((t) => (D.W7_ARRIVE[id] || []).includes(t));
      if (ai >= 0 && !(ti < ai && ai < di)) F(`${id}: 町の一文が見出しと説明のあいだに無い`);
      G.endTurn();
      for (let t = 0; t < 50 && !G.S.over; t++) {
        G.S.hp = G.S.maxHp;
        const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled && !a.id.startsWith("travel") && !a.id.startsWith("sail"));
        if (!acts.length) break;
        G.act(G.pick(acts).id);
        if (G.S.combat) { for (let k = 0; k < 60 && G.S.combat && !G.S.over; k++) G.combatAct("attack"); }
        if (G.S.mode === "event") for (let k = 0; k < 20 && G.S.mode === "event"; k++) G.chooseEvent(G.pick(G.eventChoices()).i);
        if (G.S.loc !== id && G.S.mode === "explore") G.arrive(id);
      }
    } catch (err) {
      F(`${id} を歩き回る: ${err.message}`);
    }
  }

  if (!bad) ok(`W7（地図の道 ${drawn.length} 本＝行ける道・曲がり角 ${Object.keys(D.W5_MAP.via || {}).length}・新しい町 ${towns.length}・出来事 ${evs.length}・${runs} 回）`);
};
