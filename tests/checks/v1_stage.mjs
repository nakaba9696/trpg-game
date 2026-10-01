// V1: 背景を画面全体に敷く（ui/v1_stage.js）。DOM を使わない部分だけ確かめる
//   ・絵の大きさ（G.stage.fit）が画面に収まり、横長すぎ・縦長すぎにならない
//   ・タイトルと人物づくりの背景が scene.js にある場面を指す
//   ・同じ絵かどうかの印（G.stage.sig）が、絵の中身で変わり、同じ中身では変わらない
//   ・画面の側に必要なもの（背景の層・絵の窓・文章の窓・フェード）がある
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail: failTo, ok }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo(m); };
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  vm.runInContext(src("ui/scene.js"), vm.createContext({ G, Math }));
  vm.runInContext(src("ui/v1_stage.js"), vm.createContext({ G, JSON, Math, String }));
  const st = G.stage;
  if (!st || typeof st.fit !== "function" || typeof st.sig !== "function" || typeof st.titleOpt !== "function") { fail("G.stage.fit / sig / titleOpt が無い"); return; }

  for (const [vw, vh] of [[390, 844], [360, 640], [1280, 800], [1920, 1080], [2560, 900], [768, 1024], [844, 390]]) {
    const f = st.fit(vw, vh);
    if (f.w !== vw) fail(`絵の幅 ${vw}×${vh}: 画面の幅いっぱいでない（${f.w}）`);
    if (!(f.h > 0 && f.h <= vh)) fail(`絵の高さ ${vw}×${vh}: 画面からはみ出す（${f.h}）`);
    if (f.w / f.h > 2.61 && f.h < vh) fail(`絵 ${vw}×${vh}: 横長すぎる（${(f.w / f.h).toFixed(2)}）`);
    if (f.w / f.h < 0.74) fail(`絵 ${vw}×${vh}: 縦長すぎる（${(f.w / f.h).toFixed(2)}）`);
    const full = st.fit(vw, vh, true);
    if (full.w !== vw || full.h !== vh) fail(`タイトルの絵 ${vw}×${vh}: 画面いっぱいでない`);
  }

  const names = G.sceneNames ? G.sceneNames() : { out: [], inside: [] };
  const all = new Set([...names.out, ...names.inside]);
  for (const step of ["title", "person", "stats", "sheet"]) {
    const o = st.titleOpt(step);
    if (!o || !all.has(o.key)) fail(`タイトルの背景（${step}）: scene.js に無い場面 ${o && o.key}`);
  }

  const a = { key: "town", phase: 1, seed: "x" };
  if (st.sig(a) !== st.sig({ ...a })) fail("同じ絵の印が変わる");
  if (st.sig(a) === st.sig({ ...a, phase: 3 })) fail("時間帯が変わっても印が変わらない（フェードしない）");
  if (st.sig(a) === st.sig({ ...a, foes: [{ id: "goblin" }] })) fail("敵が出ても印が変わらない");

  const css = src("style.css"), html = src("index.html"), js = src("ui/v1_stage.js");
  for (const sel of ["#backdrop", ".bgLayer", ".bgLayer.on", ".bgPic", ".bgEcho", ".tome", "--pic-h"]) if (!css.includes(sel)) fail(`style.css に ${sel} が無い`);
  if (!/\.bgLayer\s*\{[^}]*transition:\s*opacity/.test(css)) fail("背景の層にフェード（opacity の transition）が無い");
  if (!/prefers-reduced-motion[^{]*\{\s*\.bgLayer\s*\{\s*transition:\s*none/.test(css)) fail("動きを減らす設定でフェードを止めていない");
  if (!html.includes('class="tome"')) fail("index.html に文章の窓（.tome）が無い");
  if (!js.includes('canvas.id === "scene"')) fail("v1_stage.js が #scene への描画を背景に回していない");
  if (!bad) ok("V1：背景の大きさ・タイトルの背景・切り替えの印・画面の部品");
};
