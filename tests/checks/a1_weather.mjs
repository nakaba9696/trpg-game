// A1: 季節と天候（engine/weather.js）と背景の絵（ui/scene.js）。DOM なしの偽の canvas で描く。
// 夏・秋・冬と雨・霧・雪が来ること、町ごとの気候、古いセーブ、S.weather と環境音のつながり、
// 全場面×季節×天候×時間帯を例外なく描けること、学院の背景があること
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const vmc = vm.createContext({ console, G });
  for (const f of ["art_monsters.js", "scene.js", "sound.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  G.rand = seeded(7);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 40])), caps: Object.fromEntries(D.STATS.map((k) => [k, 70])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  if (!(G.S.wseed > 0)) fail("新しい冒険に天候の種（wseed）が無い");
  if (G.S.weather !== G.skyAt().weather) fail("新しい冒険の S.weather が今の天候と違う");

  // 行動のたびに S.weather が今の場所・日の天候に合う
  for (let i = 0; i < 60 && !G.S.over; i++) {
    const acts = G.actions().flatMap((x) => x.list).filter((a) => !a.disabled);
    if (!acts.length) break;
    G.act(acts[Math.floor(G.rand() * acts.length)].id);
    if (G.S.weather !== G.skyAt(G.S.loc, G.S.day).weather) { fail(`行動のあとの S.weather が違う（${G.S.weather}）`); break; }
  }
  // 雨の日は環境音が雨になる（S1 の予約とつながる）
  if (G.sound && G.sound.ambFor) {
    const rainy = Object.keys(D.LOCS).flatMap((id) => [...Array(200)].map((_, d) => [id, d + 1])).find(([id, d]) => G.skyAt(id, d).weather === "雨" && D.LOCS[id].type === "town");
    if (!rainy) fail("雨の降る町が無い");
    else if (G.sound.ambFor({ loc: rainy[0], mode: "explore", depth: 0, weather: G.skyAt(rainy[0], rainy[1]).weather, log: [] }) !== "rain") fail("雨の日の環境音が雨にならない");
  }

  G.rand = () => { throw new Error("天候や絵が G.rand を使った"); };
  const seasons = new Set(), weathers = new Set();
  const seen = {};
  for (const id of Object.keys(D.LOCS)) {
    seen[id] = new Set();
    for (let day = 1; day <= 720; day += 3) {
      const a = G.skyAt(id, day);
      if (JSON.stringify(a) !== JSON.stringify(G.skyAt(id, day))) fail(`${id} ${day}日: 同じ日なのに天候が変わる`);
      if (a.still) continue;
      if (!G.SEASONS.includes(a.season)) fail(`${id}: 季節が変 ${a.season}`);
      if (!["晴", "雨", "霧", "雪"].includes(a.weather)) fail(`${id}: 天候が変 ${a.weather}`);
      seasons.add(a.season); weathers.add(a.weather); seen[id].add(a.season + a.weather);
    }
  }
  for (const s of ["夏", "秋", "冬"]) if (!seasons.has(s)) fail(`季節「${s}」がどこにも来ない`);
  for (const w of ["雨", "霧", "雪"]) if (!weathers.has(w)) fail(`「${w}」がどこにも来ない`);
  if ([...seen.garmund].some((x) => !x.startsWith("冬"))) fail("帝都ノルディアに冬でない日がある");
  if ([...seen.w1_holy].some((x) => x.endsWith("雨"))) fail("聖都エルヴィナに雨が降った");
  if ([...seen.w1_oboro].some((x) => !x.startsWith("秋"))) fail("朧島の季節が進んだ");
  if (seen.wasteland.size) fail("魔物界に季節がある");
  // 古いセーブ（wseed も id も weather も無い）でも動き、G.rand を使わない
  const S0 = G.S; G.S = { loc: "karna", day: 100 };
  try { G.skyAt(); G.syncWeather(); if (!G.S.weather) fail("古いセーブで S.weather が入らない"); } catch (err) { fail(`古いセーブで例外 ${err.message}`); }
  G.S = S0;

  // すべての場面を、季節・天候・時間帯ごとに描いて例外が出ないか
  const noop = () => {};
  const grad = { addColorStop: noop };
  const calls = [];
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "createRadialGradient" || k === "createLinearGradient" ? () => grad : () => calls.push(k)), set: (t, k, v) => ((t[k] = v), true) });
  const canvas = { width: 0, height: 0, getBoundingClientRect: () => ({ width: 640, height: 360 }), getContext: () => ctx };
  const keys = new Set(Object.values(D.LOCS).map((L) => L.scene).concat(["inn", "tavern", "dungeon", "cave", "academy"]));
  let n = 0;
  for (const key of keys) for (const season of ["春", "夏", "秋", "冬"]) for (const weather of ["晴", "雨", "霧", "雪"]) for (const phase of [1, 3]) {
    try { G.paintScene(canvas, { key, phase, seed: key, sky: { season, weather }, foes: n % 5 ? [] : [{ id: "goblin", shape: "small" }] }); n++; } catch (err) { fail(`背景 ${key} ${season}${weather}: 描くと例外 ${err.message}`); }
  }
  for (const id of Object.keys(D.LOCS)) { G.S.loc = id; try { G.paintScene(canvas, { key: D.LOCS[id].scene, phase: 0 }); } catch (err) { fail(`背景 ${id}: 今の天候で描くと例外 ${err.message}`); } }
  // 学院：画面が場面の名前を渡さなくても（施設の絵の表に無くても）学院の室内を描く。外の景色（空）にならない
  Object.assign(G.S, { mode: "fac", fac: "academy" });
  calls.length = 0;
  G.paintScene(canvas, { key: undefined, phase: 1, seed: "a" });
  const inside = calls.length;
  calls.length = 0;
  G.paintScene(canvas, { key: "academy", phase: 1, seed: "a" });
  if (inside !== calls.length) fail("学院で、場面の名前が無いと学院の絵にならない");
  ok(`季節と天候（季節 ${[...seasons].join("")}・天候 ${[...weathers].join("")}・背景 ${n} 枚を描いた）`);
};
