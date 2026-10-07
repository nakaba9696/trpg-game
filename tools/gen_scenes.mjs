// 持ち主のパソコンで、手元の Stable Diffusion（AUTOMATIC1111 / Forge / reForge の API）に背景の絵を作らせる（A11。CI・テストでは動かさない）。手順は docs/art/README.md の「背景の絵（A11）」。
// docs/art/scenes.json を読み、まだ assets/scenes/<id>.(webp|png|jpg) が無いものだけ、/sdapi/v1/txt2img に送って保存する。
// 設定：docs/art/style_scenes.json を読み、docs/art/style_scenes.local.json があればその項目で上書きする（local は git に入れない）。
// プロンプト ＝ prefix ＋ 案の prefix_add（style_scenes.json の variants[variant]）＋ 一覧の特徴のタグ ＋ suffix_place（屋外）か suffix_inside（室内・迷宮）＋ daytime（屋外で一覧に sky が無いとき）。
// seed：一覧に seed があればそれ、無ければ設定の seed（-1 なら毎回変わる）。使った seed は docs/art/seeds_scenes.local.json（git に入れない）に残る。
// 保存：一覧の size.save（1232×704）の webp に縮める（1. cwebp  2. WebUI の /sdapi/v1/extra-single-image  3. どちらもだめなら保存せずに止まる）。
//   size.maxKB（150）を超えたら webp の質を 8 ずつ下げて縮め直す（50 まで）
//
// node tools/gen_scenes.mjs                    … まだ画像の無い背景をすべて作る（案は style_scenes.json の variant）
//   --only <id>[,<id>…]  その背景だけ      --force  あっても作り直す      --dry  送らずに、最終的なプロンプトと設定だけ表示
//   --new-seed           一覧の seed を使わずに作る      --style <file>  上書きの設定ファイル（既定は style_scenes.local.json）
//   --trial              試しの 5 枚（一覧の trial）だけ。2 案の両方で作り、docs/art/scenes_trial/<id>.<案>.webp に並べる。
//                        設定の variant の案の絵は assets/scenes/<id>.webp にも置く（ゲームで見られる）。--force が無くても作り直す
//   --variant <案>       その案で作る（--trial なら、その案だけ）
// node tools/gen_scenes.mjs --keep <id>[,<id>…]   … 最後に作ったときの seed を一覧（scenes.json・md）に書き戻す。<id>=<seed> で直に書ける
// 外部のライブラリは使わない（Node 18 以上の fetch）。
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import { JSON_PATH, MD_PATH, renderScenesMd } from "./scenes.mjs";

const argv = process.argv.slice(2);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = path.join(root, "docs", "art");
const outDir = path.join(root, "assets", "scenes");
const trialDir = path.join(art, "scenes_trial");
const seedsPath = path.join(art, "seeds_scenes.local.json");

const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const ids = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : null);
const force = flag("--force"), dry = flag("--dry"), newSeed = flag("--new-seed"), trial = flag("--trial");
const only = ids(opt("--only")) && new Set(ids(opt("--only")));
const stylePath = opt("--style") || path.join(art, "style_scenes.local.json");

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const data = readJson(JSON_PATH);
const list = data.scenes;
const seeds = existsSync(seedsPath) ? readJson(seedsPath) : {};
const writeList = () => { writeFileSync(JSON_PATH, JSON.stringify(data, null, 1) + "\n"); writeFileSync(MD_PATH, renderScenesMd(data) + "\n"); };

// ---------------------------------------------------------------- --keep：seed を一覧に書き戻す
if (flag("--keep")) {
  const keep = ids(opt("--keep")) || [];
  if (!keep.length) { console.error("--keep <id>[,<id>…] か <id>=<seed>"); process.exit(1); }
  for (const k of keep) {
    const [id, given] = k.split("=");
    const s = list.find((x) => x.id === id);
    if (!s) { console.error(`一覧に ${id} が無い`); process.exit(1); }
    const seed = given !== undefined ? Number(given) : seeds[id] && seeds[id].seed;
    if (!Number.isInteger(seed) || seed < 0) { console.error(`${id} の seed が分からない（まだ作っていないか、${path.relative(root, seedsPath)} に無い）`); process.exit(1); }
    s.seed = seed;
    console.log(`${id}（${s.name}）の seed を ${seed} に`);
  }
  writeList();
  console.log(`${path.relative(root, JSON_PATH)}・${path.basename(MD_PATH)} を書き直した。コミットしておく`);
  process.exit(0);
}

// ---------------------------------------------------------------- 設定
const shared = path.join(art, "style_scenes.json");
const style = readJson(shared);
if (existsSync(stylePath)) {
  const local = readJson(stylePath);
  const os = Object.assign({}, style.override_settings, local.override_settings);
  Object.assign(style, local);
  if (Object.keys(os).length) style.override_settings = os;
  console.log(`（${path.relative(root, stylePath)} で上書き：${Object.keys(local).filter((k) => !k.startsWith("_")).join("・")}）`);
}
const VARS = Object.keys(style.variants || {}).filter((k) => !k.startsWith("_"));
const want = opt("--variant");
if (want && !VARS.includes(want)) { console.error(`style_scenes.json の variants に ${want} が無い（${VARS.join("・")}）`); process.exit(1); }
const main = want || style.variant || VARS[0];
const variants = trial && !want ? VARS : [main];

const splitTags = (s) => String(s || "").split(",").map((t) => t.trim()).filter(Boolean);
const uniq = (...a) => { const seen = new Set(); return a.flatMap(splitTags).filter((t) => { const k = t.toLowerCase(); return !seen.has(k) && seen.add(k); }).join(", "); };
// 施設でも外の場所（造船所・火口・城壁の上など）は、一覧に outdoor: true を付ければ外の後置き（scenery, outdoors…）と昼の空で作る
const outdoor = (s) => s.outdoor === true || s.kind === "place" || s.scene === "field" || s.scene === "hunt";
const promptOf = (s, v) => uniq(style.prefix, (style.variants[v] || {}).prefix_add, s.tags, outdoor(s) ? style.suffix_place : style.suffix_inside, outdoor(s) && !s.sky ? style.daytime : "");
const seedOf = (s) => (!newSeed && Number.isInteger(s.seed) ? s.seed : style.seed ?? -1);
const PASS = ["styles", "negative_prompt", "sampler_name", "scheduler", "steps", "cfg_scale", "width", "height", "enable_hr", "hr_scale", "hr_upscaler", "hr_second_pass_steps", "hr_resize_x", "hr_resize_y", "denoising_strength", "clip_skip", "override_settings"];
function bodyOf(s, v) {
  const b = { prompt: promptOf(s, v), seed: seedOf(s), batch_size: 1, n_iter: 1, override_settings_restore_afterwards: true };
  for (const k of PASS) if (style[k] !== undefined) b[k] = style[k];
  if (style.negative !== undefined && b.negative_prompt === undefined) b.negative_prompt = style.negative;
  return Object.assign(b, style.extra || {});
}

// ---------------------------------------------------------------- 何を作るか
const exists = (id) => ["webp", "png", "jpg", "jpeg"].some((e) => existsSync(path.join(outDir, `${id}.${e}`)));
if (only) for (const id of only) if (!list.some((s) => s.id === id)) console.warn(`一覧に ${id} が無い`);
const pick = list.filter((s) => (!trial || s.trial) && (!only || only.has(s.id)) && (trial || force || !exists(s.id)));
const todo = pick.flatMap((s) => variants.map((v) => ({ s, v })));
if (!todo.length) { console.log("作る絵はない（--force で作り直す）"); process.exit(0); }

// ---------------------------------------------------------------- 送る・縮める
const api = (p) => (style.url || "http://127.0.0.1:7860").replace(/\/$/, "") + p;
async function call(p, method, body) {
  const res = await fetch(api(p), { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`${api(p)} が ${res.status}：${(await res.text()).slice(0, 300)}`);
  return res.json();
}
async function txt2img(s, v) {
  const j = await call("/sdapi/v1/txt2img", "POST", bodyOf(s, v));
  if (!j.images || !j.images[0]) throw new Error("画像が返ってこない");
  let seed = null;
  try { seed = JSON.parse(j.info).seed; } catch {}
  return { png: Buffer.from(j.images[0].split(",").pop(), "base64"), seed };
}
let cwebp = null;
try { execFileSync("cwebp", ["-version"], { stdio: "ignore" }); cwebp = "cwebp"; } catch {}
const save = Object.assign({ width: 1232, height: 704 }, (data.size || {}).save);
const maxKB = (data.size || {}).maxKB || 150;
const kindOf = (buf) => (buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP" ? "webp" : buf[0] === 0xff && buf[1] === 0xd8 ? "jpg" : buf[0] === 0x89 && buf[1] === 0x50 ? "png" : "?");
async function shrinkByWebUI(png, q) {
  const keep = ["samples_format", "jpeg_quality", "webp_lossless"];
  const before = await call("/sdapi/v1/options", "GET");
  const back = Object.fromEntries(keep.filter((k) => k in before).map((k) => [k, before[k]]));
  await call("/sdapi/v1/options", "POST", { samples_format: "webp", jpeg_quality: q, webp_lossless: false });
  try {
    const j = await call("/sdapi/v1/extra-single-image", "POST", {
      image: png.toString("base64"), resize_mode: 1, upscaling_resize_w: save.width, upscaling_resize_h: save.height, upscaling_crop: true,
      upscaler_1: "Lanczos", upscaler_2: "None", extras_upscaler_2_visibility: 0, show_extras_results: true,
    });
    return Buffer.from(String(j.image || "").split(",").pop(), "base64");
  } finally {
    await call("/sdapi/v1/options", "POST", back).catch((e) => console.warn(`WebUI の設定（${keep.join("・")}）を元に戻せなかった。画面の設定で直す：${e.message}`));
  }
}
let webuiShrink = true;
async function shrinkOnce(id, png, q) {
  if (cwebp) {
    const tmp = path.join(tmpdir(), `morsveld-scene-${id}-${process.pid}.png`), out = path.join(tmpdir(), `morsveld-scene-${id}-${process.pid}.webp`);
    writeFileSync(tmp, png);
    try {
      execFileSync(cwebp, ["-quiet", "-q", String(q), "-resize", String(save.width), String(save.height), tmp, "-o", out]);
      return { buf: readFileSync(out), ext: "webp" };
    } catch (e) { console.warn(`\ncwebp に失敗した（${e.message}）。WebUI で縮める`); }
    finally { rmSync(tmp, { force: true }); rmSync(out, { force: true }); }
  }
  if (webuiShrink) {
    try {
      const buf = await shrinkByWebUI(png, q);
      const ext = kindOf(buf);
      if (ext === "webp" || ext === "jpg") return { buf, ext };
      webuiShrink = false;
      console.warn(`\nWebUI が webp で返さなかった（${ext}）`);
    } catch (e) { webuiShrink = false; console.warn(`\nWebUI で縮められなかった（${e.message}）`); }
  }
  throw new Error("STOP");
}
async function shrink(id, png) {
  let q = style.webpQuality || 72, r = await shrinkOnce(id, png, q);
  while (r.buf.length > maxKB * 1024 && q > 50) { q = Math.max(50, q - 8); r = await shrinkOnce(id, png, q); }
  return Object.assign(r, { q });
}
function put(dir, name, { buf, ext }) {
  mkdirSync(dir, { recursive: true });
  for (const e of ["webp", "png", "jpg", "jpeg"]) rmSync(path.join(dir, `${name}.${e}`), { force: true });
  const out = path.join(dir, `${name}.${ext}`);
  writeFileSync(out, buf);
  return out;
}

// ---------------------------------------------------------------- 回す
console.log(`${pick.length} 枚${trial ? `（試し・案 ${variants.join("・")}）` : `（案 ${main}）`}（${api("")}${dry ? "・送らない" : ""}・${save.width}×${save.height} に縮めて保存：${cwebp ? "cwebp" : "WebUI（cwebp が無い）"}）`);
if (dry) { const show = bodyOf(todo[0].s, todo[0].v); delete show.prompt; delete show.seed; console.log("送る設定：" + JSON.stringify(show)); }
let made = 0;
for (const { s, v } of todo) {
  const tag = variants.length > 1 || trial ? `・案 ${v}` : "";
  if (dry) { const b = bodyOf(s, v); console.log(`\n[${s.id}] ${s.name}${tag}  seed ${b.seed}${Number.isInteger(s.seed) && !newSeed ? "（一覧）" : ""}\n  + ${b.prompt}`); continue; }
  process.stdout.write(`${s.id}（${s.name}${tag}）… `);
  try {
    const { png, seed } = await txt2img(s, v);
    const small = await shrink(s.id, png);
    let out;
    if (trial) {
      out = put(trialDir, `${s.id}.${v}`, small);
      if (v === main) put(outDir, s.id, small);
    } else out = put(outDir, s.id, small);
    if (Number.isInteger(seed)) { seeds[trial && v !== main ? `${s.id}@${v}` : s.id] = { seed, variant: v, at: new Date().toISOString() }; writeFileSync(seedsPath, JSON.stringify(seeds, null, 1) + "\n"); }
    console.log(`${path.relative(root, out)}  ${(small.buf.length / 1024).toFixed(0)}KB（質 ${small.q}）  seed ${seed ?? "?"}${small.buf.length > maxKB * 1024 ? `（${maxKB}KB を超えた）` : ""}`);
    made++;
  } catch (e) {
    if (e.message === "STOP") { console.log("保存しない"); console.error("\n縮められないので止めた。cwebp を入れてから、もう一度動かす（docs/art/README.md）。"); process.exit(1); }
    console.log("失敗：" + e.message);
    if (/ECONNREFUSED|fetch failed/.test(e.message + (e.cause ? e.cause.message : ""))) { console.error("Stable Diffusion に繋がらない。WebUI を --api で起動しているか（style_scenes.json の url）"); process.exit(1); }
  }
}
if (!dry) {
  console.log(`\n${made} 枚 作った。1 枚ずつ見て、人が写っていたら --only <id> --force --new-seed で作り直す。気に入った絵は --keep <id> で seed を一覧に残す。`);
  if (trial) console.log(`試しの絵は ${path.relative(root, trialDir)}/<id>.<案>.webp。持ち主が案を選んだら style_scenes.json の variant をその案にして、node tools/gen_scenes.mjs で残りを作る（試しで作った案の絵はそのまま使われる）`);
  console.log("終わったら node tools/build.mjs");
}
