// V2：背景の絵（scene_v2*.js）。DOM なしで確かめられる範囲
// - すべての場所（外・迷宮の中）と施設に、V2 の描き方が当たる（古い scene.js の絵に落ちない）
// - 古い scene.js の絵の名前はすべて V2 にもある
// - 横長・帯・縦長のどの縦横比でも、時間帯・季節・天候・戦闘中・出来事中で、例外なく描ける。G.rand を使わない
// - 同じ場所・同じ条件なら、同じ絵になる（決まった種）
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const D = G.data;
  let bad = 0;
  const no = (m) => { bad++; fail("V2 背景: " + m); };
  const vmc = vm.createContext({ console, G });
  const dir = new URL("../../src/ui/", import.meta.url);
  const v2 = readdirSync(dir).filter((f) => /^scene_v2.*\.js$/.test(f)).sort();
  for (const f of ["art_monsters.js", "art_people.js", "scene.js", ...v2]) vm.runInContext(readFileSync(new URL(f, dir), "utf8"), vmc, { filename: "ui/" + f });
  const V = G.SV2;
  if (!V || !G.sceneNamesV2) return no("G.SV2 が無い");
  if (typeof G.paintSceneV1 !== "function") no("古い描き方（G.paintSceneV1）が残っていない");

  // ---------------------------------------------------------------- 描き方が当たるか
  const has = (k) => !!(V.OUT[k] || V.IN[k]);
  const old = G.sceneNames();
  for (const k of [...old.out, ...old.inside]) if (!has(k)) no(`scene.js の絵 ${k} が V2 に無い（古い絵に落ちる）`);
  const FAC_SCENE = { castle: "throne", ...(D.FAC_SCENE || {}) }; // D.FAC_SCENE：町の特色の場所（W9。室内の絵か、町の外の景色）
  for (const [id, L] of Object.entries(D.LOCS)) {
    if (!V.OUT[L.scene]) no(`${id} の外の絵 ${L.scene} が V2 に無い`);
    if (L.type === "dungeon" && !has(G.dungeonScene(L))) no(`${id} の迷宮の中 ${G.dungeonScene(L)} が V2 に無い`);
    for (const f of L.fac || []) if (!V.IN[FAC_SCENE[f] || f] && !((D.FAC_SCENE || {})[f] && V.OUT[FAC_SCENE[f]])) no(`${id} の施設 ${f} の室内が V2 に無い`);
  }

  // ---------------------------------------------------------------- 描く（偽の canvas。呼んだ命令を記録する）
  G.rand = () => { throw new Error("絵が G.rand を使った"); };
  let log = null;
  const grad = { addColorStop: (...a) => log && log.push("stop", ...a) };
  const ctx = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : (...a) => { if (log) log.push(String(k), ...a.map((x) => (typeof x === "number" ? Math.round(x * 100) : typeof x === "string" ? x : 0))); return k === "createRadialGradient" || k === "createLinearGradient" ? grad : k === "createImageData" ? { data: [] } : undefined; }),
    set: (t, k, v) => { if (log && typeof v !== "object") log.push(String(k), v); t[k] = v; return true; },
  });
  const canvas = (w, h) => ({ width: 0, height: 0, getBoundingClientRect: () => ({ width: w, height: h }), getContext: () => ctx });
  const SIZES = [[1920, 1080], [1000, 250], [390, 844], [768, 1024]];
  let n = 0;
  const tryPaint = (what, cv, opt) => { try { G.paintScene(cv, opt); n++; } catch (e) { no(`${what}: 描くと例外 ${e.message}`); } };
  G.S = { mode: "explore", loc: Object.keys(D.LOCS)[0], flags: {} };
  for (const [id, L] of Object.entries(D.LOCS)) {
    G.S.loc = id;
    for (const [w, h] of SIZES) {
      for (const phase of [0, 1, 2, 3]) tryPaint(`${id} ${w}x${h} 時間帯${phase}`, canvas(w, h), { key: L.scene, phase, seed: id, sky: { season: ["春", "夏", "秋", "冬"][phase], weather: ["晴", "雨", "霧", "雪"][(phase + w) % 4] } });
    }
    tryPaint(`${id} 戦闘中`, canvas(1280, 720), { key: L.scene, phase: 1, seed: id, foes: (L.pool || []).slice(0, 3).map((f) => ({ id: f, shape: D.ENEMIES[f].shape, eye: D.ENEMIES[f].eye })) });
    if (L.type === "dungeon") tryPaint(`${id} 迷宮の中`, canvas(390, 844), { key: G.dungeonScene(L), phase: 3, seed: id, foes: [{ id: L.boss, boss: true }] });
  }
  for (const k of Object.keys(V.IN)) for (const [w, h] of SIZES) tryPaint(`室内 ${k} ${w}x${h}`, canvas(w, h), { key: k, phase: 2, seed: k });
  G.S.mode = "event";
  tryPaint("出来事中", canvas(1280, 720), { key: "town", phase: 1, seed: "ev" });
  G.S.mode = "explore";

  // ---------------------------------------------------------------- 同じ条件なら同じ絵、違う場所なら違う絵
  const record = (opt, w, h) => { log = []; G.paintScene(canvas(w, h), opt); const s = log.join(","); log = null; return s; };
  const a = record({ key: "castle", phase: 1, seed: "leavel", sky: { season: "春", weather: "晴" } }, 800, 450);
  const b = record({ key: "castle", phase: 1, seed: "leavel", sky: { season: "春", weather: "晴" } }, 800, 450);
  const c = record({ key: "port", phase: 1, seed: "nerva", sky: { season: "春", weather: "晴" } }, 800, 450);
  if (a !== b) no("同じ場所・同じ条件で、描くたびに絵が変わる");
  if (a === c) no("違う場所が同じ絵になる");
  // 縦長と横長で、地平線の高さは比率で決まる（はみ出さない）
  for (const [w, h] of SIZES) { const P = V.makeP(ctx, w, h, { phase: 1, seed: "x" }, "plains", false); if (!(P.hz > h * 0.4 && P.hz < h * 0.75 && P.u > 0 && P.u * 34 < P.hz)) no(`${w}x${h} で地平線か大きさの単位がおかしい（hz=${P.hz} u=${P.u}）`); }

  if (!bad) ok(`V2 背景（外の絵 ${Object.keys(V.OUT).length}・室内と迷宮 ${Object.keys(V.IN).length}。場所 ${Object.keys(D.LOCS).length} すべてに当たる。${n} 枚を4つの縦横比で例外なく描き、同じ条件は同じ絵）`);
};
