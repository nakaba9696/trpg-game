// A4：絵がすべての場面で出るか。足りない物を一覧にして、あれば失敗にする
// - 場所：背景の絵がある（屋外の絵に無い名前で、汎用の丘陵に落ちていない）。迷宮の中が石の通路（汎用）のままでない。同じ絵を二つの場所で使い回していない
// - 施設：室内の絵がある。王城には玉座の主の絵（G.facWho）がある
// - 敵：生成画像がある（assets/monsters/<id>.webp。色違いは same_as、人の姿の敵は人物の絵。A10 で canvas の魔物の絵はやめた）
// - 出来事：人物の絵（who）があるか、人が出ない出来事として D.EVENT_NOBODY（src/data/events_who_a4.js）に並んでいる。who の種類・敵が実在する
// - 仲間：出来事で仲間になる魔物は魔物の絵、人は人物の絵になる
// - すべての絵（場所の外と中・施設・敵・人物）を、G.rand を使わずに例外なく描ける
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const vmc = vm.createContext({ console, G });
  for (const f of ["art_monsters.js", "art_people.js", "scene.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  const miss = { scene: [], shared: [], inside: [], fac: [], castle: [], foe: [], event: [], comp: [] };
  const { out, inside } = G.sceneNames();
  const OUT = new Set(out), IN = new Set(inside);

  // ---------------------------------------------------------------- 場所と施設
  const byScene = {};
  for (const [id, L] of Object.entries(D.LOCS)) {
    if (!OUT.has(L.scene)) miss.scene.push(`${id}（${L.scene}）`);
    (byScene[L.scene] = byScene[L.scene] || []).push(id);
    if (L.type === "dungeon" && G.dungeonScene(L) === "dungeon") miss.inside.push(id);
  }
  for (const [k, ids] of Object.entries(byScene)) if (ids.length > 1) miss.shared.push(`${k}：${ids.join("・")}`);
  // ui.js の施設の絵の表で名前が違うもの。D.FAC_SCENE は町の特色の場所（W9。室内の絵か、町の外の景色）
  const FAC_SCENE = { castle: "throne", ...(D.FAC_SCENE || {}) };
  const facs = new Set(Object.values(D.LOCS).flatMap((L) => L.fac || []));
  for (const f of facs) { const k = FAC_SCENE[f] || f; if (!IN.has(k) && !(D.FAC_SCENE && D.FAC_SCENE[f] && OUT.has(k))) miss.fac.push(f); }
  for (const [id, L] of Object.entries(D.LOCS)) if ((L.fac || []).includes("castle")) {
    const w = G.facWho({ mode: "fac", fac: "castle", loc: id, flags: {} });
    if (!w || !G.PEOPLE[w.kind]) miss.castle.push(id);
  }
  if (G.facWho({ mode: "fac", fac: "castle", loc: "leavel", flags: { throne: true } })) fail("王位を奪ったあとも、王城に前の主の絵が出る");

  // ---------------------------------------------------------------- 敵
  const mon = JSON.parse(readFileSync(new URL("../../docs/art/monsters.json", import.meta.url), "utf8"));
  const img = (dir, id) => existsSync(new URL(`../../assets/${dir}/${id}.webp`, import.meta.url));
  for (const id of Object.keys(D.ENEMIES)) {
    const m = (mon.monsters || []).find((x) => x.id === id);
    const ok = m ? img("monsters", m.same_as || id) : mon.people && mon.people[id] ? img("portraits", mon.people[id]) : false;
    if (!ok) miss.foe.push(id);
  }

  // ---------------------------------------------------------------- 出来事の人物
  const nobody = new Set(D.EVENT_NOBODY || []);
  const evIds = new Set(D.EVENTS.map((e) => e.id));
  for (const id of nobody) if (!evIds.has(id)) fail(`EVENT_NOBODY の ${id} という出来事が無い`);
  const whos = [];
  const checkWho = (w, where) => {
    if (w.kind === "foe") { if (!D.ENEMIES[w.foe]) fail(`${where}: 絵の敵 ${w.foe} が無い`); }
    else if (!G.PEOPLE[w.kind]) fail(`${where}: 人物の種類 ${w.kind} が無い（art_people.js の G.PEOPLE）`);
    whos.push([where, w]);
  };
  for (const e of D.EVENTS) {
    const d = Object.getOwnPropertyDescriptor(e, "who");
    const has = !!d || !!(D.EVENT_WHO && D.EVENT_WHO[e.id]);
    if (has && nobody.has(e.id)) fail(`出来事 ${e.id}: 人物の絵があるのに EVENT_NOBODY にも並んでいる`);
    if (!has && !nobody.has(e.id)) miss.event.push(e.id);
    if (d && d.get) continue; // 仲間の顔（M2）。下の仲間の確認で見る
    const w = G.eventWho(e);
    if (w) checkWho(w, `出来事 ${e.id}`);
    else if (has) fail(`出来事 ${e.id}: who が空`);
  }

  // ---------------------------------------------------------------- 仲間
  const MONSTER = /ゴブ|スライム|狼|土偶/;
  const comps = [];
  const scan = (o) => { if (!o || typeof o !== "object") return; if (o.companion && typeof o.companion === "object") comps.push(o.companion); for (const k of ["ok", "ng", "win"]) scan(o[k]); };
  for (const e of D.EVENTS) for (const c of e.choices || []) scan(c);
  G.rand = seeded(93);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 40])), caps: Object.fromEntries(D.STATS.map((k) => [k, 70])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  for (let i = 0; i < 40; i++) comps.push(G.genCompanion());
  for (const c of comps) {
    const w = G.companionWho(c);
    checkWho(w, `仲間 ${c.name}`);
    if (MONSTER.test(c.name) !== (w.kind === "foe")) miss.comp.push(`${c.name}（${w.kind}）`);
  }

  // ---------------------------------------------------------------- 描く（偽の canvas。G.rand を使わない）
  G.rand = () => { throw new Error("絵が G.rand を使った"); };
  const noop = () => {};
  const grad = { addColorStop: noop };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : noop), set: (t, k, v) => ((t[k] = v), true) });
  const canvas = { width: 0, height: 0, getBoundingClientRect: () => ({ width: 640, height: 360 }), getContext: () => ctx };
  const face = { width: 192, height: 240, getBoundingClientRect: () => ({ width: 96, height: 120 }), getContext: () => ctx };
  let n = 0;
  const tryPaint = (what, f) => { try { f(); n++; } catch (err) { fail(`${what}: 描くと例外 ${err.message}`); } };
  const foeIds = Object.keys(D.ENEMIES);
  for (const [id, L] of Object.entries(D.LOCS)) {
    G.S.loc = id;
    for (const season of ["春", "夏", "秋", "冬"]) for (const weather of ["晴", "雨", "霧", "雪"]) for (const phase of [0, 2, 3])
      tryPaint(`背景 ${id} ${season}${weather}`, () => G.paintScene(canvas, { key: L.scene, phase, seed: id, sky: { season, weather } }));
    if (L.type === "dungeon") tryPaint(`迷宮の中 ${id}`, () => G.paintScene(canvas, { key: G.dungeonScene(L), phase: 1, seed: id, foes: (L.pool || []).slice(0, 3).map((f) => ({ id: f })) }));
  }
  for (const key of IN) tryPaint(`室内 ${key}`, () => G.paintScene(canvas, { key, phase: 1, seed: key }));
  for (const f of facs) { Object.assign(G.S, { mode: "fac", fac: f }); tryPaint(`施設 ${f}`, () => G.paintScene(canvas, { key: (D.FAC_SCENE || {})[f], phase: 1, seed: f })); }
  G.S.mode = "explore";
  for (const id of foeIds) tryPaint(`敵 ${id}`, () => G.paintScene(canvas, { key: "plains", phase: 1, seed: id, sky: { season: "春", weather: "晴" }, foes: [{ id, boss: !!D.ENEMIES[id].boss }] }));
  for (const [where, w] of whos) tryPaint(`人物の絵 ${where}`, () => G.drawPortrait(face, w));
  for (const id of Object.keys(D.LOCS)) { const w = G.facWho({ mode: "fac", fac: "castle", loc: id, flags: {} }); if (w) tryPaint(`王城の主 ${id}`, () => G.drawPortrait(face, w)); }

  // ---------------------------------------------------------------- 一覧
  const LABEL = {
    scene: "背景の絵が無い場所（汎用の丘陵に落ちる。scene.js の OUT に足す）",
    shared: "ほかの場所と同じ背景を使い回している（scene.js の OUT に足して、場所の scene を変える）",
    inside: "迷宮の中が石の通路（汎用）のまま（scene.js の IN に「<場所の絵>_in」を足す）",
    fac: "室内の絵が無い施設（scene.js の IN に足す）",
    castle: "王城の主の絵が無い（art_people.js の FAC_WHO に足す）",
    foe: "生成画像の無い敵（docs/art/monsters.json に足して絵を作る。A10）",
    event: "人物の絵（who）が無く、人が出ない出来事（D.EVENT_NOBODY）にも並んでいない出来事（who を書くか、src/data/events_who_a4.js の EVENT_NOBODY に足す）",
    comp: "魔物なのに人の絵、人なのに魔物の絵になる仲間（art_people.js の COMP_NAMED か COMP_FOE）",
  };
  let total = 0;
  for (const [k, list] of Object.entries(miss)) if (list.length) { total += list.length; fail(`${LABEL[k]}：${list.length} 件 … ${list.join("、")}`); }
  if (!total) ok(`絵の洗い出し（場所 ${Object.keys(D.LOCS).length}・迷宮の中 ${Object.values(D.LOCS).filter((L) => L.type === "dungeon").length}・施設 ${facs.size}・敵 ${foeIds.length}・出来事 ${D.EVENTS.length}（人物 ${D.EVENTS.length - nobody.size}・人が出ない ${nobody.size}）・仲間 ${comps.length}。足りない物 0。${n} 枚を例外なく描いた）`);
};
