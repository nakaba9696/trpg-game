// W9：町の特色の場所の専用の絵（in_w9s_*）
// - どの場所にも専用の絵の名前（D.W9_ART の w9s_*）があり、docs/art/scenes.json に施設の中として載っている（組 special_in・特徴のタグあり）
// - V2 に専用の絵の名前が置かれ、借りる絵（D.FAC_SCENE）と同じ描き方になる（町の外の景色なら外の扱い）
// - 画像の候補は専用の絵が先、無ければ借りる絵の画像。施設の名前（先読み）でも同じ候補になる
// - 施設にいるとき、#scene には専用の絵の名前で描く
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: fail0, ok, loadEngine }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const G = loadEngine();
  const D = G.data;
  const ART = D.W9_ART || {};
  const SP = D.W9_SPOTS || {};
  const list = JSON.parse(readFileSync(new URL("../../docs/art/scenes.json", import.meta.url), "utf8")).scenes || [];
  const byId = Object.fromEntries(list.map((s) => [s.id, s]));
  for (const f of Object.keys(SP)) {
    const art = ART[f];
    if (!art || !/^w9s_/.test(art)) { fail(`${f}: 専用の絵の名前（w9s_*）が無い`); continue; }
    const s = byId["in_" + art];
    if (!s) { fail(`${f}: docs/art/scenes.json に in_${art} が無い`); continue; }
    if (s.kind !== "facility" || s.scene !== art || s.pack !== "special_in" || !(s.tags || "").trim() || !s.name) fail(`in_${art}: 施設の中の形でない（kind・scene・pack・name・tags）`);
  }

  // 画面の部品（DOM なし）
  class FakeImage { addEventListener() {} set src(v) { this._src = v; } get src() { return this._src; } }
  const vmc = vm.createContext({ console, G, Image: FakeImage, setTimeout: () => {} });
  const dir = new URL("../../src/ui/", import.meta.url);
  const sv = readdirSync(dir).filter((f) => /^scene_v[23].*\.js$/.test(f)).sort();
  for (const f of ["art_monsters.js", "art_people.js", "scene.js", ...sv, "w9_spots.js"]) vm.runInContext(readFileSync(new URL(f, dir), "utf8"), vmc, { filename: "ui/" + f });
  const V = G.SV2;
  let n = 0;
  for (const [f, art] of Object.entries(ART)) {
    const b = D.FAC_SCENE[f];
    if (!V.IN[art]) { fail(`${f}: V2 に ${art} が無い`); continue; }
    if (V.IN[b] && V.IN[art] !== V.IN[b]) fail(`${f}: ${art} が借りる室内の絵 ${b} と違う描き方`);
    if (!V.IN[b] && !(V.OUT[b] && V.IN[art].outdoor)) fail(`${f}: ${art} が町の外の景色 ${b} の扱いになっていない`);
    for (const key of [art, f]) {
      const ids = G.sceneImageIds(key);
      if (ids[0] !== "in_" + art) fail(`${f}: 鍵 ${key} の画像の候補の先頭が in_${art} でない（${ids.join(",")}）`);
      const borrowed = G.sceneImageIds(b);
      if (!borrowed.every((id) => ids.includes(id))) fail(`${f}: 鍵 ${key} の画像の候補に、借りる絵 ${b} の画像が無い`);
    }
    n++;
  }
  // 施設にいるとき、#scene には専用の絵の名前で描く
  // w9_spots.js の包みの下を差し替えて、渡された鍵を見る
  const got = [];
  G.S = { mode: "fac", fac: Object.keys(ART)[0], loc: SP[Object.keys(ART)[0]].town };
  const wrapSrc = readFileSync(new URL("w9_spots.js", dir), "utf8");
  const ctx2 = vm.createContext({ console, G: { data: D, SV2: V, S: G.S, paintScene: (cv, opt) => got.push(opt.key) } });
  vm.runInContext(wrapSrc, ctx2);
  ctx2.G.paintScene({ id: "scene" }, { key: undefined, phase: 1 });
  if (got[0] !== ART[G.S.fac]) fail(`施設にいるとき、専用の絵の名前で描かない（${got[0]}）`);
  if (!bad) ok(`W9 の専用の絵：場所 ${Object.keys(SP).length}・一覧の in_w9s_* ${list.filter((s) => /^in_w9s_/.test(s.id)).length}・V2 と画像の候補 ${n}`);
};
