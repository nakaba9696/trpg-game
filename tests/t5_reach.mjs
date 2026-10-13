// T5：場所・迷宮にたどり着けるか（reachability）。tests/checks/t5_reach.mjs が使う。
//   reach(G, { seeds })  … 見つけた壊れ（issues）と、壊れではないが知っておくこと（info）を返す
//   node tests/t5_reach.mjs                 … 一覧を出す（T5_SEEDS=2000 で自動で作る迷宮の階を多く作る）
// 見ること：
//   1. 地図：すべての場所に、職業ごとの出発地から陸路・船でたどり着けるか（町でない所には危険度とボスでない魔物＝依頼の行き先）。たどり着いた所から出発地へ戻れるか（戻れない一方通行が無いか）。
//      行き先の無い道・船（存在しない場所を指す）・道の区切り（legs）が道に無い・金が無いと出られない所（船しか出口が無く、金を稼ぐ手が無い）
//   2. 関所（W7g）：使徒領へ入る道は、通る手（砦の夜番の戦い・名声・通行証）が出発の状態で選べるか
//   3. 迷宮：階の数・主・中ボス・魔物の表・居城の出来事が揃っているか。どの深さでも「奥へ進む」か「引き返す」が選べるか（行き止まりが無いか）
//      使徒の居城（剣が無いと主に届かない）は、居城でない迷宮の主の褒美に剣があるか（鍵より先に扉が来ていないか）
//   4. 自動で作る迷宮の階（W11）：決まった乱数で多数作り、階段がちょうど一つ・部屋の出来事が存在する・道の名が付いているか
//   5. 遺跡（W12）：断片・仕掛け・隠し部屋の階が迷宮の中にあるか。古い鍵を渡す所がエンジンにあるか
//   6. 山（W10）：どの段でも下りる・麓へ戻る手があるか
//   7. 鍵の品（type key）：手に入る所（データかエンジン）があるか
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadEngine, seeded } from "./lib.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const engineSrc = () => readdirSync(path.join(ROOT, "src", "engine")).filter((n) => n.endsWith(".js")).map((n) => readFileSync(path.join(ROOT, "src", "engine", n), "utf8")).join("\n");

export function reach(G, { seeds = 200 } = {}) {
  const D = G.data;
  const issues = [], info = [];
  const bad = (key, text) => issues.push({ key, text });
  const LOCS = D.LOCS;
  const ids = Object.keys(LOCS);
  const name = (id) => (LOCS[id] ? `${LOCS[id].name}（${id}）` : id);
  const evIds = new Set(D.EVENTS.map((e) => e.id));

  // ---------------------------------------------------------------- 1. 地図
  const edges = (id, { sea = true } = {}) => [
    ...Object.keys(LOCS[id].links || {}).map((to) => ({ to, kind: "land" })),
    ...(sea ? Object.entries(LOCS[id].sea || {}).map(([to, s]) => ({ to, kind: "sea", cost: s.cost })) : []),
  ].filter((e) => LOCS[e.to]);
  const bfs = (from, opt) => {
    const seen = new Set([from]), q = [from];
    while (q.length) { const u = q.shift(); for (const e of edges(u, opt)) if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); } }
    return seen;
  };
  for (const id of ids) {
    const L = LOCS[id];
    for (const to of Object.keys(L.links || {})) if (!LOCS[to]) bad(`link:${id}>${to}`, `${name(id)} の道が、存在しない場所 ${to} を指している`);
    for (const to of Object.keys(L.sea || {})) if (!LOCS[to]) bad(`sea:${id}>${to}`, `${name(id)} の船が、存在しない場所 ${to} を指している`);
    for (const to of Object.keys(L.legs || {})) if (!(L.links || {})[to]) bad(`legs:${id}>${to}`, `${name(id)} の道の区切り（legs）${to} に道が無い`);
    if (!edges(id).length) bad(`exit:${id}`, `${name(id)} から出る道も船も無い`);
    // 依頼の行き先（ギルドの退治・調査は、町でない所から危険度で選び、ボスでない魔物を一つ選ぶ。explore.js）
    if (L.type !== "town") {
      if (!Number.isFinite(L.danger)) bad(`danger:${id}`, `${name(id)} に危険度が無い（依頼の行き先に選ばれない・選ばれると止まる）`);
      if (!(L.pool || []).some((e) => D.ENEMIES[e] && !D.ENEMIES[e].boss)) bad(`pool0:${id}`, `${name(id)} にボスでない魔物がいない（退治の依頼が作れない）`);
    }
  }
  const starts = [...new Set(Object.values(D.CLASSES).map((c) => c.start))];
  for (const s of starts) if (!LOCS[s]) bad(`start:${s}`, `出発地 ${s} が存在しない`);
  for (const s of starts.filter((x) => LOCS[x])) {
    const r = bfs(s);
    for (const id of ids) if (!r.has(id)) bad(`unreached:${id}`, `${name(id)} に、出発地 ${name(s)} から陸路でも船でもたどり着けない`);
    // 戻れない一方通行：たどり着いた所から、出発地へ戻れるか
    for (const id of r) if (!bfs(id).has(s)) bad(`noreturn:${id}`, `${name(id)} から出発地 ${name(s)} へ戻れない（一方通行）`);
  }
  // 船でしか行けない所（壊れではない。知っておくこと）
  const landAll = new Set(starts.filter((x) => LOCS[x]).flatMap((s) => [...bfs(s, { sea: false })]));
  const seaOnly = ids.filter((id) => !landAll.has(id));
  if (seaOnly.length) info.push(`船でしか行けない場所 ${seaOnly.length}：${seaOnly.map(name).join("・")}`);
  // 金が無いと出られない所：出口が船だけで、そこで金を稼ぐ手（戦える野外・迷宮、依頼・店のある町）が無い
  for (const id of ids) {
    const L = LOCS[id];
    if (Object.keys(L.links || {}).some((to) => LOCS[to])) continue;
    const earn = L.type !== "town" ? (L.pool || []).length > 0 : (L.fac || []).some((f) => ["guild", "shop"].includes(f));
    const cheap = Math.min(...Object.values(L.sea || {}).map((s) => s.cost));
    if (!earn) bad(`broke:${id}`, `${name(id)} は出口が船だけ（最安 ${cheap}G）なのに、金を稼ぐ手が無い`);
    else info.push(`${name(id)} は出口が船だけ（最安 ${cheap}G）。金が無ければ、その場で稼いでから出る`);
  }
  // 世の大事（M12）で閉ざされる道：閉ざされているあいだ、たどり着けなくなる所（一時のことなので壊れにはしない。エンジンも最後の道は閉じない）
  for (const [kind, K] of Object.entries((D.M12 && D.M12.KINDS) || {})) (K.stages || []).forEach((st, i) => {
    const roads = (Array.isArray(st.road) ? st.road : []).filter(([a, b]) => LOCS[a] && LOCS[b]);
    if (!roads.length) return;
    const shut = new Set(roads.flatMap(([a, b]) => [`${a}>${b}`, `${b}>${a}`]));
    const cut = (from) => {
      const seen = new Set([from]), q = [from];
      while (q.length) { const u = q.shift(); for (const e of edges(u)) if (!(e.kind === "land" && shut.has(`${u}>${e.to}`)) && !seen.has(e.to)) { seen.add(e.to); q.push(e.to); } }
      return seen;
    };
    const lost = ids.filter((id) => !starts.filter((s) => LOCS[s]).every((s) => cut(s).has(id)));
    if (lost.length) info.push(`世の大事「${kind}」の段 ${i} で道が閉ざされると、行けなくなる所：${lost.map(name).join("・")}（その出来事のあいだだけ）`);
  });
  // 画面に出る旅の選択肢が、道と船の通りか（エンジンを通して確かめる）
  G.rand = seeded(1);
  G.P = { trophies: {}, graves: [] };
  const cls = Object.keys(D.CLASSES)[0];
  const { stats, caps } = G.cre.quickStats(cls, G.rand);
  const fresh = () => G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "測定", sex: "男", age: 20, history: "測定用", personality: "無口" } });
  // 選択肢を作るところで止まったら、それも壊れとして数える（行き先の無い道などで起きる）
  const acts = (where) => { try { return G.actions().flatMap((g) => g.list || []); } catch (e) { bad(`acts:${where}`, `${where} で選択肢を作ると止まる：${String(e.message || e)}`); return []; } };
  for (const id of ids) {
    fresh();
    const S = G.S;
    S.loc = id; S.mode = "explore"; S.depth = 0; S.gold = 9999; S.event = null; S.combat = null;
    const a = acts(name(id));
    const want = [...Object.keys(LOCS[id].links || {}).map((t) => "travel:" + t), ...Object.keys(LOCS[id].sea || {}).map((t) => "sail:" + t)];
    for (const w of want) if (!a.some((x) => x.id === w)) bad(`act:${id}:${w}`, `${name(id)} で「${w}」の旅の選択肢が出ない`);
    if (!a.some((x) => /^(travel|sail):/.test(x.id) && !x.disabled)) bad(`stuck:${id}`, `${name(id)} で選べる旅の選択肢が一つも無い`);
  }

  // ---------------------------------------------------------------- 2. 関所
  const lawless = (id) => (D.LAWLESS || []).includes((LOCS[id] || {}).region);
  const gated = ids.filter((a) => !lawless(a)).flatMap((a) => Object.keys(LOCS[a].links || {}).filter((b) => lawless(b)).map((b) => [a, b]));
  if (gated.length) {
    const gate = D.EVENTS.find((e) => e.id === "w7g_gate");
    if (!gate) bad("gate:event", "関所の出来事 w7g_gate が無い");
    else {
      fresh();
      const S = G.S;
      const open = gate.choices.filter((c) => [c.ok, c.win].some((o) => o && o.flag === "w7g_pass") && (!c.cond || c.cond(S)));
      if (!open.length) bad("gate:pass", "関所（w7g_gate）を、出発の状態で通る手が無い");
      else info.push(`使徒領への関所 ${gated.length} 本：出発の状態で通る手 ${open.map((c) => `「${c.label}」`).join("・")}`);
    }
  }

  // ---------------------------------------------------------------- 3. 迷宮
  const E = D.ENEMIES;
  const pierce = new Set(Object.entries(D.ITEMS).filter(([, it]) => it.pierce).map(([id]) => id));
  const swordFrom = [];
  for (const id of ids.filter((x) => LOCS[x].type === "dungeon")) {
    const L = LOCS[id];
    if (!(Number.isInteger(L.floors) && L.floors >= 1)) bad(`floors:${id}`, `${name(id)} の階の数がおかしい（${L.floors}）`);
    if (L.boss && !E[L.boss]) bad(`boss:${id}`, `${name(id)} の主 ${L.boss} が敵の表に無い`);
    for (const [d, m] of Object.entries(L.midboss || {})) {
      if (!E[m]) bad(`mid:${id}:${d}`, `${name(id)} の地下${d}階の中ボス ${m} が敵の表に無い`);
      if (!(+d >= 1 && +d < L.floors)) bad(`midd:${id}:${d}`, `${name(id)} の中ボスの階 ${d} が迷宮の中に無い（全${L.floors}階）`);
    }
    for (const p of L.pool || []) if (!E[p]) bad(`pool:${id}:${p}`, `${name(id)} の魔物 ${p} が敵の表に無い`);
    if (L.lair && !evIds.has(L.lair.event)) bad(`lair:${id}`, `${name(id)} の居城の出来事 ${L.lair.event} が無い`);
    const rw = L.reward || {};
    const its = [rw.item].flat().filter(Boolean);
    for (const it of its) if (!D.ITEMS[it]) bad(`reward:${id}:${it}`, `${name(id)} の褒美 ${it} がアイテムの表に無い`);
    if (!L.lair) swordFrom.push(...its.filter((it) => pierce.has(it)).map((it) => `${D.ITEMS[it].name}（${name(id)}）`));
    // どの深さでも、奥へ進むか引き返すかが選べる（主を倒す前・倒した後）
    for (const beaten of [false, true]) for (let d = 0; d <= L.floors; d++) {
      fresh();
      const S = G.S;
      S.loc = id; S.mode = "explore"; S.depth = d; S.event = null; S.combat = null;
      if (beaten) S.flags[rw.flag || "boss:" + id] = true;
      const a = acts(`${name(id)} の深さ ${d}`).filter((x) => !x.disabled).map((x) => x.id);
      const ok = d === 0 ? a.some((x) => /^(travel|sail):/.test(x)) && (a.includes("deeper") || beaten) : a.includes("leave") && (a.includes("deeper") || d >= L.floors);
      if (!ok) bad(`depth:${id}:${d}:${beaten}`, `${name(id)} の${d ? `地下${d}階` : "入口"}（主を${beaten ? "倒した後" : "倒す前"}）で、進むか戻る手が無い（${a.join(" ")}）`);
    }
  }
  if (ids.some((x) => LOCS[x].lair)) {
    if (!swordFrom.length) bad("lair:sword", "使徒の居城に挑むための剣（pierce）を、居城でない迷宮の主の褒美から得られない");
    else info.push(`使徒の居城の前に得られる剣：${swordFrom.join("・")}`);
  }

  // ---------------------------------------------------------------- 4. 自動で作る迷宮の階（W11）
  const W = G.w11;
  if (W && W.makeFloor) {
    let n = 0;
    const large = ids.filter((x) => LOCS[x].type === "dungeon" && W.large(x));
    for (const id of large) {
      const L = LOCS[id];
      for (let d = 1; d < L.floors; d++) for (let k = 0; k < seeds; k++) {
        const S = { loc: id, depth: d, day: 1 + (k % 97), phase: k % 4, wseed: 1000 + k, w11: { n: k } };
        G.rand = seeded(k);
        const f = W.makeFloor(S, `${id}:${d}`);
        n++;
        const stairs = f.rooms.filter((r) => r.k === "stairs").length;
        if (stairs !== 1) bad(`w11stairs:${id}:${d}`, `${name(id)} の地下${d}階に、階段が ${stairs} つの階ができる（種 ${k}）`);
        if (f.rooms.length < 2) bad(`w11rooms:${id}:${d}`, `${name(id)} の地下${d}階の部屋が ${f.rooms.length}（種 ${k}）`);
        for (const r of f.rooms) {
          if (r.k !== "stairs" && !evIds.has(r.ev)) bad(`w11ev:${id}:${r.k}:${r.ev}`, `${name(id)} の地下${d}階の部屋「${r.k}」の出来事 ${r.ev} が無い（入っても何も起きない）`);
          if (!r.way) bad(`w11way:${id}:${d}`, `${name(id)} の地下${d}階に、道の名の無い部屋ができる`);
          if (r.wet && r.k === "stairs") bad(`w11wet:${id}`, `${name(id)} の階段が水の道になる（潮で下りられない）`);
        }
        const ways = f.rooms.map((r) => r.way);
        if (new Set(ways).size !== ways.length) bad(`w11dup:${id}:${d}`, `${name(id)} の地下${d}階に、同じ名の道が二つできる（${ways.join("・")}）`);
      }
    }
    if (!evIds.has("w11_vault")) bad("w11vault", "隠し部屋の出来事 w11_vault が無い");
    info.push(`自動で作る迷宮の階：大きな迷宮 ${large.length} か所・${n} 階を作って確かめた`);
  }

  // ---------------------------------------------------------------- 5. 遺跡（W12）
  const src = engineSrc();
  for (const [loc, R] of Object.entries(D.W12_RUINS || {})) {
    const L = LOCS[loc];
    if (!L || L.type !== "dungeon") { bad(`w12loc:${loc}`, `遺跡 ${loc} が迷宮の場所に無い`); continue; }
    const inside = (f) => Number.isInteger(f) && f >= 1 && f < L.floors;
    for (const f of R.frags || []) if (!inside(f.floor)) bad(`w12frag:${f.id}`, `${name(loc)} の断片 ${f.id} の階 ${f.floor} が迷宮の中に無い（全${L.floors}階）`);
    if (R.gear && !inside(R.gear.floor)) bad(`w12gear:${loc}`, `${name(loc)} の仕掛けの階 ${R.gear.floor} が迷宮の中に無い`);
  }
  const V = D.W12_VAULT;
  if (V) {
    if (!LOCS[V.loc] || !(V.floor >= 1 && V.floor < LOCS[V.loc].floors)) bad("w12vault", `遺跡の隠し部屋の階 ${V.floor} が ${V.loc} の中に無い`);
    if (!D.ITEMS[V.key]) bad("w12key", `遺跡の隠し部屋の鍵 ${V.key} がアイテムの表に無い`);
    if (!/give\(D\.W12_VAULT\.key\)/.test(src) && !src.includes(`"${V.key}"`)) bad("w12keysrc", `遺跡の隠し部屋の鍵 ${V.key} を渡す所が無い`);
  }

  // ---------------------------------------------------------------- 6. 山（W10）
  if (G.w10) {
    for (const id of ids.filter((x) => LOCS[x].w10)) {
      if (!(D.W10_PEAKS || {})[id]) info.push(`${name(id)} は山（w10）だが、山頂の文（W10_PEAKS）が無い`);
      for (let n = 1; n <= G.w10.TOP; n++) {
        fresh();
        const S = G.S;
        S.loc = id; S.mode = "explore"; S.depth = 0; S.event = null; S.combat = null;
        S.w10 = { loc: id, stage: n, peaks: {}, passes: {}, recent: [] };
        const a = acts(`${name(id)} の段 ${n}`).filter((x) => !x.disabled).map((x) => x.id);
        if (!a.includes("w10down")) bad(`w10:${id}:${n}`, `${name(id)} の段 ${n} で下りる手が無い（${a.join(" ")}）`);
        if (n < G.w10.TOP && !a.includes("w10up")) bad(`w10up:${id}:${n}`, `${name(id)} の段 ${n} で登る手が無い`);
      }
    }
  }

  // ---------------------------------------------------------------- 7. 鍵の品
  const dataStr = new Map();
  const mentioned = (id) => {
    if (dataStr.has(id)) return dataStr.get(id);
    let hit = src.includes(`"${id}"`) || src.includes(`'${id}'`);
    if (!hit) {
      const seen = new Set();
      const walk = (v) => {
        if (hit || v == null) return;
        if (typeof v === "string") { if (v === id) hit = true; return; }
        if (typeof v === "function") { if (String(v).includes(id)) hit = true; return; }
        if (typeof v !== "object" || seen.has(v)) return;
        seen.add(v);
        for (const [k, x] of Object.entries(v)) { if (k === id) { hit = true; return; } walk(x); }
      };
      for (const [k, v] of Object.entries(D)) if (k !== "ITEMS") walk(v);
    }
    dataStr.set(id, hit);
    return hit;
  };
  for (const [id, it] of Object.entries(D.ITEMS)) if (it.type === "key" && !mentioned(id)) bad(`key:${id}`, `鍵の品 ${it.name}（${id}）を手に入れる所が無い`);

  return { issues, info };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = reach(loadEngine(), { seeds: Number(process.env.T5_SEEDS || 2000) });
  console.log(`壊れ ${r.issues.length}`);
  r.issues.forEach((x) => console.log(`- [${x.key}] ${x.text}`));
  console.log("\n知っておくこと");
  r.info.forEach((x) => console.log(`- ${x}`));
}
