// R5：背景が場面と合う（src/engine/zzzzzzzzzzzzzzzz_r5_scene.js・src/data/r5_scenes.js・src/ui/zzzzzz_r5_scene.js）
// - 対応表の名前がすべて描ける絵（canvas の絵がある）：施設の室内・特色の場所（w8s・w9s）・地方の道中・海の旅
// - 出来事の表：出来事があり、施設の種類が分かる。本文の書き出しが施設の中なのに表に無い出来事が無い（見落とし探し。外の出来事は D.R5_OUTDOOR）
// - 場面ごと：道中の戦闘は野の絵（町の絵でない）・酒場の中の出来事は酒場・施設から始まった出来事と戦闘はその施設・迷宮の中は迷宮のまま・町の通りはそのまま
// - 画面：#scene に描くとき、決まった名前に差し替わる（ほかの canvas は変えない）
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, ok, loadEngine, seeded }) => {
  const errs = [];
  const F = (m) => { errs.push(m); fail("R5 " + m); };
  const G = loadEngine();
  const D = G.data;
  const R5 = G.r5;
  if (!R5 || !R5.sceneOf) return F("G.r5.sceneOf が無い");

  // ---------------------------------------------------------------- 描ける絵の名前（画面の部品を DOM なしで読む）
  const vmc = vm.createContext({ console, G, Image: class { addEventListener() {} }, setTimeout: () => {} });
  const dir = new URL("../../src/ui/", import.meta.url);
  const sv = readdirSync(dir).filter((f) => /^scene_v[23].*\.js$/.test(f)).sort();
  for (const f of ["art_monsters.js", "art_people.js", "scene.js", ...sv]) vm.runInContext(readFileSync(new URL(f, dir), "utf8"), vmc, { filename: "ui/" + f });
  const names = new Set([...G.sceneNames().out, ...G.sceneNames().inside, ...G.sceneNamesV2().out, ...G.sceneNamesV2().inside]);
  const can = (k) => names.has(k);
  const facOk = (f, w) => { const r = R5.facScene(f); if (!r || !(can(r.key) || can(r.alt))) F(`${w}：施設 ${f} の絵 ${r && r.key}${r && r.alt ? "・" + r.alt : ""} が描けない`); };
  Object.keys(R5.FAC).forEach((f) => facOk(f, "施設の表"));
  const facs = new Set();
  Object.values(D.LOCS).forEach((L) => (L.fac || []).forEach((f) => facs.add(f)));
  facs.forEach((f) => facOk(f, "町の施設"));
  const regions = new Set(Object.values(D.LOCS).map((L) => L.region).filter(Boolean));
  regions.forEach((r) => { const k = (D.R5_ROAD || {})[r]; if (!k) F(`地方 ${r} の道中の絵が D.R5_ROAD に無い`); else if (!can(k)) F(`地方 ${r} の道中の絵 ${k} が描けない`); });
  if (!can(D.R5_SEA)) F(`海の旅の絵 ${D.R5_SEA} が描けない`);
  Object.values(D.LOCS).forEach((L) => { if (L.type !== "town" && !can(L.scene)) F(`野・迷宮 ${L.name} の外の絵 ${L.scene} が描けない（道中に使う）`); });

  // ---------------------------------------------------------------- 出来事の表と見落とし
  const T = D.R5_EVENT_SCENE || {};
  for (const [id, f] of Object.entries(T)) {
    if (!D.EVENTS.some((e) => e.id === id)) F(`r5_scenes.js の出来事 ${id} が無い`);
    if (!R5.FAC[f]) F(`r5_scenes.js の ${id} の施設 ${f} が分からない`);
  }
  for (const id of D.R5_OUTDOOR || []) { if (T[id]) F(`${id} が施設の中と外の両方にある`); if (!D.EVENTS.some((e) => e.id === id)) F(`R5_OUTDOOR の出来事 ${id} が無い`); }
  // 書き出し（最初の一文）に施設の名があり、そのすぐ後ろが中を言う言葉（の奥・の隅・の卓・の部屋・で・に入る…）なら、施設の中の出来事
  const RULES = [["tavern", "酒場|居酒屋|坑夫酒場"], ["inn", "宿屋|商人宿|船宿|下宿|宿"], ["church", "大聖堂|教会|礼拝堂|聖堂"], ["guild", "ギルド本部|ギルドの出張所|ギルド"], ["academy", "学院"], ["arena", "闘技場"], ["forge", "鍛冶場|工房"], ["bath", "湯屋|湯船"], ["castle", "玉座の間|謁見の間"], ["train", "訓練場"]];
  const IN = /^(の(中|奥|隅|片隅|卓|席|真ん中|二階|一階|厨房|台所|帳場|カウンター|食堂|部屋|寝台|広間|回廊|控え室|大階段|一室|窓|窓辺|いちばん|底|床|灯り|主|女将|亭主|主人|物干し|朝|隣の部屋|入口で|縁))|^(で|に入|に、|の扉が開いて)/;
  const OUT = new Set(D.R5_OUTDOOR || []);
  const miss = [];
  for (const e of D.EVENTS) {
    if (T[e.id] || OUT.has(e.id)) continue;
    const head = String(e.text || "").replace(/\{[a-z]+\}/g, "X").split(/(?<=。)/)[0];
    for (const [f, src] of RULES) {
      const re = new RegExp(src, "g");
      let m, hit = false;
      while ((m = re.exec(head))) if (IN.test(head.slice(m.index + m[0].length))) { hit = true; break; }
      if (hit) { miss.push(`${e.id}（${f}：${head.slice(0, 24)}）`); break; }
    }
  }
  if (miss.length) F(`書き出しが施設の中なのに、背景の表（src/data/r5_scenes.js）に無い出来事：${miss.join("、")}`);

  // ---------------------------------------------------------------- 場面ごと
  const PD = G.data;
  G.rand = seeded(55);
  G.newGame({ cls: Object.keys(PD.CLASSES)[0], stats: Object.fromEntries(PD.STATS.map((k) => [k, 60])), caps: Object.fromEntries(PD.STATS.map((k) => [k, 80])), goal: Object.keys(PD.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const S = G.S;
  const keyOf = () => { const r = R5.sceneOf(S); return r ? r.key : null; };
  const reset = (loc) => { S.loc = loc; S.depth = 0; S.mode = "explore"; S.fac = null; S.combat = null; S.event = null; delete S.travel; delete S.w6; delete S.r5from; };
  const townScene = D.LOCS.karna.scene;
  // 町の通り：決めない（町の絵のまま）
  reset("karna");
  if (keyOf() !== null) F(`町の通りで背景が ${keyOf()} に変わる`);
  // 道中の戦闘（カルナから森へ。持ち主の見つけた場面）
  reset("karna");
  S.travel = "forest"; S.w6 = { dest: "forest", from: "karna", sea: false, days: 1, danger: 1, left: 0, raid: true, seen: [], tod: "昼" };
  G.startCombat(["wolf"], { after: "arrive" });
  if (keyOf() !== D.LOCS.forest.scene) F(`カルナから森への道中の戦闘の背景が ${keyOf()}（森の絵 ${D.LOCS.forest.scene}）`);
  if (keyOf() === townScene) F("道中の戦闘が町の絵のまま");
  // 町から町の道中：地方の道
  reset("karna");
  S.travel = "nerva"; S.w6 = { dest: "nerva", from: "karna", sea: false, days: 2, danger: 1, left: 1, raid: false, seen: [], tod: "昼" };
  if (keyOf() !== D.R5_ROAD[D.LOCS.nerva.region]) F(`カルナからネルヴァの道中の背景が ${keyOf()}（地方の道 ${D.R5_ROAD[D.LOCS.nerva.region]}）`);
  S.w6.sea = true;
  if (keyOf() !== D.R5_SEA) F(`海の旅の背景が ${keyOf()}`);
  // 旅の途中の出来事
  const w6e = D.EVENTS.find((e) => e.w6 && !T[e.id]);
  reset("karna");
  S.travel = "forest"; S.w6 = { dest: "forest", from: "karna", sea: false, days: 1, danger: 1, left: 0, raid: false, seen: [], tod: "昼" };
  if (w6e) { G.startEvent(w6e); if (keyOf() !== D.LOCS.forest.scene) F(`旅の途中の出来事 ${w6e.id} の背景が ${keyOf()}`); }
  // 酒場の中の出来事（シグルン）・町の通りの出来事
  reset("karna");
  G.startEvent("f2_majin_2");
  if (keyOf() !== "tavern") F(`酒場の隅のシグルンの場面の背景が ${keyOf()}（酒場）`);
  reset("karna");
  G.startEvent("f2_majin_1");
  if (keyOf() !== null) F(`門の外の出来事 f2_majin_1 の背景が ${keyOf()}（町の絵のまま）`);
  // 施設から始まった出来事と、そこからの戦闘（酒場の喧嘩は酒場で）
  reset("karna");
  S.mode = "fac"; S.fac = "tavern";
  if (keyOf() !== "tavern") F(`酒場の中の背景が ${keyOf()}`);
  G.startEvent("f2_majin_1");
  if (keyOf() !== "tavern") F(`酒場から始まった出来事の背景が ${keyOf()}`);
  G.startCombat(["bandit"], {});
  if (keyOf() !== "tavern") F(`酒場から始まった戦闘の背景が ${keyOf()}`);
  // 特色の場所（W9・W8）
  const w9 = Object.keys(D.W9_ART || {})[0], w8 = Object.keys(D.W8S_SPOTS || {})[0];
  for (const sp of [w9, w8].filter(Boolean)) {
    const town = (D.W8S_SPOTS[sp] || {}).town || Object.entries(D.LOCS).find(([, L]) => (L.fac || []).includes(sp))[0];
    reset(town); S.mode = "fac"; S.fac = sp;
    const k0 = keyOf();
    if (!k0 || !(can(k0) || can(R5.facScene(sp).alt))) F(`特色の場所 ${sp} の背景が ${k0}`);
    const e = D.EVENTS.find((x) => !T[x.id] && (x.where || []).includes("town"));
    G.startEvent(e);
    if (keyOf() !== k0) F(`特色の場所 ${sp} から始まった出来事の背景が ${keyOf()}（${k0}）`);
  }
  // 迷宮の中：決めない（迷宮の絵）
  reset("ruins"); S.depth = 2;
  G.startEvent("f2_majin_2");
  if (keyOf() !== null) F(`迷宮の中の出来事の背景が ${keyOf()}（迷宮の絵のまま）`);
  // 古いセーブ（S.combat.r5・S.r5from が無い）
  reset("karna"); S.combat = { foes: [], round: 1 }; S.mode = "combat";
  if (keyOf() !== null) F("古いセーブの戦闘で背景が変わる");

  // ---------------------------------------------------------------- 画面：#scene の名前が差し替わる
  const got = [];
  G.paintScene = (cv, opt) => got.push([cv.id, opt.key]);
  G.ui = undefined;
  vm.runInContext(readFileSync(new URL("zzzzzz_r5_scene.js", dir), "utf8"), vmc, { filename: "ui/zzzzzz_r5_scene.js" });
  reset("karna"); G.startEvent("f2_majin_2");
  G.paintScene({ id: "scene" }, { key: townScene });
  G.paintScene({ id: "other" }, { key: townScene });
  if (JSON.stringify(got) !== JSON.stringify([["scene", "tavern"], ["other", townScene]])) F(`画面の背景の差し替えが違う：${JSON.stringify(got)}`);

  if (!errs.length) ok(`R5 背景：施設 ${facs.size}・地方 ${regions.size}・施設の中の出来事 ${Object.keys(T).length}。道中の戦闘は野の絵、酒場の中は酒場、施設から始まった出来事と戦闘はその施設、迷宮の中は迷宮のまま`);
};
