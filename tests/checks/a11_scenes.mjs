// A11：背景の画像（docs/art/scenes.json・style_scenes.json・tools/gen_scenes.mjs・tools/assets.mjs・src/ui/scene_v3_photo.js）
// - 一覧がすべての場所・施設・迷宮の中（と、描ける室内の絵）を覆う。id は重ならず、特徴のタグ・組がある。md が json と合う。試しの 5 枚は種類が散っている
// - 設定：人物と同じモデル（waiIllustriousSDXL。dreamshaperXL は使わない）、人物を入れないタグとネガティブ、横長、2 案。案に足す語は人物の設定にある語だけ（作家名・作品名を新しく足さない）
// - 画面：画像があれば読み終わってから出し（その間は canvas の絵）、無い・読めないときは canvas の絵に戻す。雨・雪の粒は画像の上にも重なる。時間帯・季節・天候の色味
// - まとめ方：背景は組ごとに 1 つのスプライト（scenes/<組>.svg）。数：今のファイル＋背景を全部作ったときの組の数が、1 つの版の上限 511 に収まる
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import vm from "node:vm";
import path from "node:path";
import { renderScenesMd, missingScenes, insideId } from "../../tools/scenes.mjs";
import { siteAssets, sceneChunks, SCENE_PACK } from "../../tools/assets.mjs";
import { planSite, SITE_LIMITS } from "../../tools/site.mjs";

// 縦横だけを持つ webp（VP8）の頭
const webp = (w, h, fill) => {
  const b = Buffer.alloc(400, fill);
  b.write("RIFF", 0, "ascii"); b.writeUInt32LE(b.length - 8, 4); b.write("WEBP", 8, "ascii"); b.write("VP8 ", 12, "ascii");
  b.writeUInt32LE(b.length - 20, 16); b[20] = 0x10; b[21] = 0; b[22] = 0; b[23] = 0x9d; b[24] = 0x01; b[25] = 0x2a;
  b.writeUInt16LE(w, 26); b.writeUInt16LE(h, 28);
  return b;
};

export default ({ fail, ok, loadEngine }) => {
  const root = new URL("../../", import.meta.url).pathname;
  const errs = [];
  const F = (m) => { errs.push(m); fail("A11 " + m); };
  const art = path.join(root, "docs/art");
  const data = JSON.parse(readFileSync(path.join(art, "scenes.json"), "utf8"));
  const style = JSON.parse(readFileSync(path.join(art, "style_scenes.json"), "utf8"));
  const list = data.scenes || [];

  // ---------------------------------------------------------------- 画面の部品（DOM なし）
  const G = loadEngine();
  const D = G.data;
  const loaded = [];
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.ls = {}; loaded.push(this); }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    set src(v) { this._src = v; }
    get src() { return this._src; }
    fire(t) { if (t !== "error") { this.complete = true; this.naturalWidth = /\.svg$/.test(this._src) ? 2464 : 1232; this.naturalHeight = /\.svg$/.test(this._src) ? 2816 : 704; } (this.ls[t || "load"] || []).forEach((f) => f()); }
  }
  const timers = [];
  const vmc = vm.createContext({ console, G, Image: FakeImage, setTimeout: (f) => timers.push(f) });
  const dir = new URL("../../src/ui/", import.meta.url);
  const sv = readdirSync(dir).filter((f) => /^scene_v[23].*\.js$/.test(f)).sort();
  if (!sv.includes("scene_v3_photo.js")) return F("src/ui/scene_v3_photo.js が無い");
  for (const f of ["art_monsters.js", "art_people.js", "scene.js", ...sv]) vm.runInContext(readFileSync(new URL(f, dir), "utf8"), vmc, { filename: "ui/" + f });
  const V = G.SV2;

  // ---------------------------------------------------------------- 一覧が覆うか
  const ui = readFileSync(path.join(root, "src/ui/ui.js"), "utf8");
  const fm = /FAC_SCENE = (\{[^}]*\})/.exec(ui);
  // 町の特色の場所（W9）の絵の名前は D.FAC_SCENE（src/engine/w9_spots.js。src/ui/w9_spots.js が使う）
  // 専用の絵の名前（D.W9_ART の w9s_*）があればそちらが一覧に要る
  const facScene = { ...(fm ? vm.runInNewContext("(" + fm[1] + ")") : {}), ...(D.FAC_SCENE || {}), ...(D.W9_ART || {}) };
  if (!fm) F("ui.js の FAC_SCENE を読めない");
  const insideKeys = Object.keys(V.IN || {});
  const miss = missingScenes(data, { LOCS: D.LOCS, facScene, dungeonScene: G.dungeonScene, insideKeys });
  miss.forEach((m) => F(`背景の一覧（docs/art/scenes.json）に無い：${m}`));
  const ids = list.map((s) => s.id);
  if (new Set(ids).size !== ids.length) F("一覧の id が重なっている");
  for (const s of list) {
    if (!s.tags || s.tags.split(",").length < 3) F(`${s.id} の特徴のタグが少ない`);
    if (!s.pack) F(`${s.id} に組（pack）が無い`);
    if (!/^[a-z0-9_]+$/.test(s.id)) F(`${s.id} の id に使えない字がある`);
    if (s.kind === "place" && !D.LOCS[s.id]) F(`一覧の場所 ${s.id} がデータに無い`);
    if (s.kind !== "place" && s.id !== insideId(s.scene)) F(`${s.id} の id が絵の名前 ${s.scene} から決まる名前（${insideId(s.scene)}）と違う`);
    if (s.kind === "place" && D.LOCS[s.id] && D.LOCS[s.id].scene !== s.scene) F(`${s.id} の絵の名前が場所のデータと違う（node tools/scenes.mjs で取り直す）`);
    if (/\b(1girl|1boy|girl|boy|man|woman|people|person|crowd)\b/i.test(s.tags)) F(`${s.id} の特徴のタグに人の語がある`);
  }
  const md = readFileSync(path.join(art, "scenes.md"), "utf8");
  if (md !== renderScenesMd(data) + "\n") F("docs/art/scenes.md が scenes.json と合わない（node tools/scenes.mjs で作り直す）");
  const trial = list.filter((s) => s.trial);
  if (trial.length !== 5) F(`試しの印が ${trial.length} 枚（5 枚のはず）`);
  if (new Set(trial.map((s) => s.kind === "place" ? D.LOCS[s.id] && D.LOCS[s.id].scene : s.scene)).size !== trial.length || !trial.some((s) => s.kind === "facility") || !trial.some((s) => s.kind === "dungeon" || (D.LOCS[s.id] || {}).type === "dungeon")) F("試しの 5 枚の種類が散っていない（町・港・森・迷宮・施設の中など）");

  // ---------------------------------------------------------------- 設定
  const model = JSON.stringify(style.override_settings || {});
  const people = JSON.parse(readFileSync(path.join(art, "style.json"), "utf8"));
  if (!/waiIllustriousSDXL/i.test(model) || model !== JSON.stringify(people.override_settings)) F("背景のモデルが人物と同じ waiIllustriousSDXL でない");
  if (/dreamshaper/i.test(JSON.stringify(style))) F("背景の設定に dreamshaperXL がある（使わない）");
  const neg = String(style.negative || "").toLowerCase().split(",").map((t) => t.trim());
  for (const t of ["1girl", "1boy", "people", "person", "character", "text", "watermark"]) if (!neg.includes(t)) F(`背景のネガティブに ${t} が無い`);
  for (const k of ["suffix_place", "suffix_inside"]) for (const t of ["scenery", "no humans"]) if (!String(style[k] || "").includes(t)) F(`背景の ${k} に ${t} が無い`);
  if (!(style.width > style.height)) F("背景が横長でない");
  const vars = Object.keys(style.variants || {}).filter((k) => !k.startsWith("_"));
  if (vars.length < 2 || !vars.includes(style.variant)) F(`背景の設定の案が 2 つ無いか、variant（${style.variant}）が案に無い`);
  const tok = (s) => String(s || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  const known = new Set([...tok(people.prefix), ...tok(JSON.parse(readFileSync(path.join(art, "style_monsters.json"), "utf8")).prefix)]);
  for (const v of vars) for (const t of tok(style.variants[v].prefix_add)) if (!known.has(t)) F(`案 ${v} の「${t}」が人物の設定に無い語（作家名・作品名を新しく足さない）`);
  if (!vars.some((v) => !tok(style.variants[v].prefix_add).length)) F("絵師タグなしの案が無い");
  const artistTags = new Set(vars.flatMap((v) => tok(style.variants[v].prefix_add)));
  for (const t of [...tok(style.prefix), ...tok(style.suffix_place), ...tok(style.suffix_inside), ...list.flatMap((s) => tok(s.tags))]) if (artistTags.has(t)) F(`絵師タグ ${t} が案の外にある`);
  const gi = readFileSync(path.join(root, ".gitignore"), "utf8");
  if (!gi.includes("docs/art/style_scenes.local.json") || !gi.includes("docs/art/seeds_scenes.local.json")) F(".gitignore に背景の local の設定か seed が無い");

  // ---------------------------------------------------------------- 画面：画像があれば出し、無ければ canvas
  let calls = [];
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push([String(k), a]); return k === "createRadialGradient" || k === "createLinearGradient" ? grad : k === "createImageData" ? { data: [] } : undefined; }), set: (t, k, v) => { if (k === "globalCompositeOperation") calls.push(["op", [v]]); t[k] = v; return true; } });
  const canvas = () => ({ width: 0, height: 0, getBoundingClientRect: () => ({ width: 800, height: 450 }), getContext: () => ctx });
  G.S = { mode: "explore", loc: "karna", flags: {} };
  G.ASSET_MODE = "files";
  G.ASSETS = { "scenes/karna": "scenes/west.svg#xywh=1232,704,1232,704", "scenes/in_inn": "scenes/in_inn.webp" };
  if (G.sceneImageId("town") !== "karna") F(`町の絵（town）に場所の画像 karna を選ばない：${G.sceneImageId("town")}`);
  if (G.sceneImageId("inn") !== "in_inn") F(`宿屋の絵に in_inn を選ばない：${G.sceneImageId("inn")}`);
  if (G.sceneImageId("port") !== null) F("画像の無い場所に画像を選んだ");
  const drew = (img) => calls.find(([k, a]) => k === "drawImage" && a[0] === img);
  const sky = { season: "秋", weather: "晴" };
  // 読み込み中：canvas の絵。読み終わったら描き直して画像
  const cv = canvas();
  calls = [];
  G.paintScene(cv, { key: "town", phase: 1, seed: "karna", sky });
  const img = loaded.find((i) => i.src === "scenes/west.svg");
  if (!img) F("背景の画像（スプライト）を読みに行かない");
  else {
    if (drew(img)) F("読み終わる前に画像を描いた");
    if (calls.length < 50) F("読み込み中に canvas の絵を描いていない");
    calls = [];
    img.fire();
    const d = drew(img);
    if (!d) F("読み終わったあと、背景を描き直して画像を出していない");
    else {
      const [, sx, sy, sw, sh] = d[1];
      if (sx < 1232 || sy < 704 || sx + sw > 2464 + 0.01 || sy + sh > 1408 + 0.01) F(`スプライトの升目の外を切り出した：${[sx, sy, sw, sh].map(Math.round)}`);
    }
    if (!calls.some(([k, a]) => k === "op" && a[0] === "soft-light")) F("秋の色味を重ねていない");
    // もう読めているので、次からはすぐ画像。雨の粒は画像の上にも重なる
    calls = [];
    const cv2 = canvas();
    G.paintScene(cv2, { key: "town", phase: 3, seed: "karna", sky: { season: "夏", weather: "雨" } });
    if (!drew(img)) F("読み終わった画像をすぐ出さない");
    if (!(cv2.__sv2 && cv2.__sv2.weather.some((W) => W.type === "rain"))) F("画像の背景に雨の粒が重ならない");
    if (!calls.some(([k, a]) => k === "op" && a[0] === "multiply")) F("夜・雨の色味（暗さ）を重ねていない");
  }
  // 読めない画像：canvas の絵に戻る
  calls = [];
  G.paintScene(canvas(), { key: "inn", phase: 1, seed: "inn" });
  const bad = loaded.find((i) => i.src === "scenes/in_inn.webp");
  if (!bad) F("施設の中の画像を読みに行かない");
  else {
    bad.fire("error");
    calls = [];
    G.paintScene(canvas(), { key: "inn", phase: 1, seed: "inn2" });
    if (drew(bad) || calls.length < 50) F("読めない背景の画像のとき、canvas の絵に戻していない");
  }
  // 画像の無い場所：読みに行かず canvas の絵
  const n0 = loaded.length;
  calls = [];
  G.paintScene(canvas(), { key: "port", phase: 1, seed: "nerva" });
  if (loaded.length !== n0 || calls.length < 50) F("画像の無い場所で、読みに行ったか canvas の絵を描かない");
  // 色味：室内はそのまま、使徒領の赤い空と時間帯の決まった絵には時間帯の色味を重ねない、冬は白く
  const tint = (t) => { calls = []; G.sceneTint(ctx, 100, 100, t); return calls.filter(([k]) => k === "op").map(([, a]) => a[0]); };
  if (tint({ phase: 3, inside: true }).length) F("室内の画像に色味を重ねた");
  if (tint({ phase: 3, red: true }).includes("multiply")) F("使徒領の赤い空の絵に夜の色味を重ねた");
  if (tint({ phase: 3, fixed: true }).includes("multiply")) F("時間帯の決まった絵（朧島の夜）に夜の色味を重ねた");
  if (!tint({ phase: 1, season: "winter" }).includes("screen")) F("冬の白さを重ねていない");
  if (tint({ phase: 1 }).length) F("昼・晴れの画像に色味を重ねた（画像は昼・晴れで作る）");
  if (!tint({ phase: 2 }).includes("multiply")) F("夕方の赤みを重ねていない");

  // ---------------------------------------------------------------- まとめ方（作ったフォルダで）
  const tmp = mkdtempSync(path.join(tmpdir(), "a11-"));
  try {
    mkdirSync(path.join(tmp, "scenes"));
    const west = list.filter((s) => s.pack === "west").slice(0, 3).map((s) => s.id);
    west.forEach((id, i) => writeFileSync(path.join(tmp, "scenes", id + ".webp"), webp(1232, 704, 10 + i)));
    writeFileSync(path.join(tmp, "scenes", "in_academy.webp"), webp(1232, 704, 3)); // 組に 1 枚だけ → まとめない
    const s = siteAssets(tmp);
    const sp = s.files.find((f) => f.pub === "scenes/west.svg");
    if (!sp || !/^<svg [^>]*width="2464" height="1408"/.test(sp.data.toString())) F(`背景の組 west のスプライト（2 列）ができない：${sp ? sp.data.toString().slice(0, 80) : "無い"}`);
    if (s.map["scenes/" + west[1]] !== "scenes/west.svg#xywh=1232,0,1232,704") F(`背景の切り出す場所が違う：${s.map["scenes/" + west[1]]}`);
    if (s.map["scenes/in_academy"] !== "scenes/in_academy.webp") F("1 枚だけの組までまとめた");
    if (s.files.length !== 2) F(`背景をまとめたあとのファイルの数が違う：${s.files.length}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }

  // ---------------------------------------------------------------- 数（1 つの版は 511 ファイルまで）
  const all = sceneChunks(list.map((x) => ({ key: "scenes/" + x.id })));
  if (all.some((c) => c.list.length > SCENE_PACK)) F("組の大きさが上限を超える");
  const fj = path.join(root, "dist/site/files.json");
  let now = null;
  if (existsSync(fj)) {
    const pubs = Object.keys(JSON.parse(readFileSync(fj, "utf8")));
    now = pubs.length + 1;
    const others = pubs.filter((p) => !p.startsWith("scenes/")).length + 1;
    const after = others + all.length;
    const files = Array.from({ length: after - 1 }, (_, i) => ({ pub: `x/${i}`, local: "", bytes: 1000 }));
    const plan = planSite({ pageBytes: 1e6, files });
    if (plan.errors.length) F(`背景を全部（${list.length} 枚・${all.length} ファイル）作ると、今の ${others} ファイルと合わせて 1 つの版の上限 ${SITE_LIMITS.versionFiles} を超える`);
    now = `今 ${now} ファイル → 背景を全部作ると ${after}`;
  }
  if (!errs.length) ok(`A11 背景の画像：一覧 ${list.length} 枚（場所 ${list.filter((s) => s.kind === "place").length}・施設の中 ${list.filter((s) => s.kind === "facility").length}・迷宮の中 ${list.filter((s) => s.kind === "dungeon").length}）がすべてを覆う・試し ${trial.map((s) => s.id).join("・")}・案 ${vars.join("／")}・まとめると ${all.length} ファイル${now ? `（${now}・上限 ${SITE_LIMITS.versionFiles}）` : ""}`);
};
