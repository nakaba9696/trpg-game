// 持ち主のパソコンで、手元の Stable Diffusion（AUTOMATIC1111 / Forge / reForge の API）に人物の絵を作らせる（CI・テストでは動かさない）。手順は docs/art/README.md。
// docs/art/portraits.json を読み、まだ assets/portraits/<id>.(webp|png|jpg) が無い人だけ、/sdapi/v1/txt2img に送って保存する。
// 設定：docs/art/style.json（持ち主の設定。リポジトリに入っている）を読み、docs/art/style.local.json があればその項目で上書きする（local は git に入れない）。
// プロンプト ＝ 画風の前置き（prefix）＋ 一覧の特徴のタグ ＋ 後置き（suffix）＋ WebUI の Styles（styles に名前）。
// seed：一覧にその人の seed が書いてあればそれを使う（名のある人の見た目を保つ）。無ければ設定の seed（-1 なら毎回変わる）。
//   使った seed は docs/art/seeds.local.json（git に入れない）に残る。気に入ったら --keep <id> で一覧に書き戻す。
// 保存：大きな png（1024×1280 で 1〜2MB）は埋め込めないので、必ず一覧の大きさ（512×640）に縮めて保存する。
//   1. cwebp があれば webp（-resize 512 640 -q 80）  2. 無ければ WebUI の /sdapi/v1/extra-single-image で縮め、WebUI に webp で返させる
//   3. どちらもできなければ、大きいまま保存せずに止める
//
// node tools/gen_portraits.mjs                    … まだ画像の無い人をすべて作る
//   --only <id>[,<id>…]  その人だけ        --force  あっても作り直す        --dry  送らずに、最終的なプロンプトと設定だけ表示
//   --new-seed           一覧の seed を使わずに作る（別の見た目を探す）       --style <file>  上書きの設定ファイル（既定は style.local.json）
// node tools/gen_portraits.mjs --keep <id>[,<id>…]   … 最後に作ったときの seed を一覧（portraits.json・md）に書き戻す。<id>=<seed> で直に書ける
// 外部のライブラリは使わない（Node 18 以上の fetch）。
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import { JSON_PATH, MD_PATH, renderPortraitsMd } from "./portraits.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = path.join(root, "docs", "art");
const outDir = path.join(root, "assets", "portraits");
const seedsPath = path.join(art, "seeds.local.json");

// ---------------------------------------------------------------- 引数
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const ids = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : null);
const force = flag("--force"), dry = flag("--dry"), newSeed = flag("--new-seed");
const only = ids(opt("--only")) && new Set(ids(opt("--only")));
const stylePath = opt("--style") || path.join(art, "style.local.json");

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const data = readJson(JSON_PATH);
const list = data.portraits;
const seeds = existsSync(seedsPath) ? readJson(seedsPath) : {};

// ---------------------------------------------------------------- --keep：seed を一覧に書き戻す
if (flag("--keep")) {
  const keep = ids(opt("--keep")) || [];
  if (!keep.length) { console.error("--keep <id>[,<id>…] か <id>=<seed>"); process.exit(1); }
  for (const k of keep) {
    const [id, given] = k.split("=");
    const p = list.find((x) => x.id === id);
    if (!p) { console.error(`一覧に ${id} がいない`); process.exit(1); }
    const seed = given !== undefined ? Number(given) : seeds[id] && seeds[id].seed;
    if (!Number.isInteger(seed) || seed < 0) { console.error(`${id} の seed が分からない（まだ作っていないか、${path.relative(root, seedsPath)} に無い）`); process.exit(1); }
    p.seed = seed;
    console.log(`${id}（${p.name}）の seed を ${seed} に`);
  }
  writeFileSync(JSON_PATH, JSON.stringify(data, null, 1) + "\n");
  writeFileSync(MD_PATH, renderPortraitsMd(data));
  console.log("docs/art/portraits.json・portraits.md を書き直した。コミットしておく");
  process.exit(0);
}

// 設定：style.json ＋ style.local.json（override_settings だけは中身ごと合わせる）
const sharedPath = path.join(art, "style.json");
if (!existsSync(sharedPath)) { console.error("docs/art/style.json が無い"); process.exit(1); }
const style = readJson(sharedPath);
if (existsSync(stylePath)) {
  const local = readJson(stylePath);
  const os = Object.assign({}, style.override_settings, local.override_settings);
  Object.assign(style, local);
  if (Object.keys(os).length) style.override_settings = os;
  console.log(`（${path.relative(root, stylePath)} で上書き：${Object.keys(local).filter((k) => !k.startsWith("_")).join("・")}）`);
}

const join = (...a) => a.map((s) => String(s || "").trim().replace(/^,|,$/g, "").trim()).filter(Boolean).join(", ");
const promptOf = (p) => join(style.prefix, p.tags, style.suffix);
const seedOf = (p) => (!newSeed && Number.isInteger(p.seed) ? p.seed : style.seed ?? -1);

const exists = (id) => ["webp", "png", "jpg", "jpeg"].some((e) => existsSync(path.join(outDir, `${id}.${e}`)));
const todo = list.filter((p) => (!only || only.has(p.id)) && (force || !exists(p.id)));
if (only) for (const id of only) if (!list.some((p) => p.id === id)) console.warn(`一覧に ${id} がいない`);
if (!todo.length) { console.log("作る絵はない（--force で作り直す）"); process.exit(0); }

// ---------------------------------------------------------------- 送る
// 設定の項目をそのまま txt2img に渡す（無いものは WebUI の既定）。hires fix は enable_hr・hr_scale・hr_upscaler・denoising_strength など。
// styles は WebUI の「Styles」（styles.csv）に保存した名前の配列。API は画面の入力欄の文を使わないので、汎用の絵柄はここか prefix・suffix・negative に書く
const PASS = ["styles", "negative_prompt", "sampler_name", "scheduler", "steps", "cfg_scale", "width", "height", "enable_hr", "hr_scale", "hr_upscaler", "hr_second_pass_steps", "hr_resize_x", "hr_resize_y", "denoising_strength", "restore_faces", "clip_skip", "override_settings"];
function bodyOf(p) {
  const b = { prompt: promptOf(p), seed: seedOf(p), batch_size: 1, n_iter: 1, override_settings_restore_afterwards: true };
  for (const k of PASS) if (style[k] !== undefined) b[k] = style[k];
  if (style.negative !== undefined && b.negative_prompt === undefined) b.negative_prompt = style.negative;
  return Object.assign(b, style.extra || {});
}
async function txt2img(p) {
  const url = (style.url || "http://127.0.0.1:7860").replace(/\/$/, "") + "/sdapi/v1/txt2img";
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bodyOf(p)) });
  if (!res.ok) throw new Error(`${url} が ${res.status}：${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  if (!j.images || !j.images[0]) throw new Error("画像が返ってこない");
  let seed = null;
  try { seed = JSON.parse(j.info).seed; } catch {}
  return { png: Buffer.from(j.images[0].split(",").pop(), "base64"), seed };
}

// ---------------------------------------------------------------- 保存（必ず縮める）
let cwebp = null;
try { execFileSync("cwebp", ["-version"], { stdio: "ignore" }); cwebp = "cwebp"; } catch {}
const size = data.size || { width: 512, height: 640 };
const quality = style.webpQuality || 80;
const kindOf = (buf) => (buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP" ? "webp" : buf[0] === 0xff && buf[1] === 0xd8 ? "jpg" : buf[0] === 0x89 && buf[1] === 0x50 ? "png" : "?");
const api = (p) => (style.url || "http://127.0.0.1:7860").replace(/\/$/, "") + p;
async function call(p, method, body) {
  const res = await fetch(api(p), { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`${api(p)} が ${res.status}：${(await res.text()).slice(0, 300)}`);
  return res.json();
}
// WebUI で縮める。API が返す画像の形式は WebUI の設定（samples_format）で決まるので、そのあいだだけ webp にして、終わったら元に戻す
async function shrinkByWebUI(png) {
  const keep = ["samples_format", "jpeg_quality", "webp_lossless"];
  const before = await call("/sdapi/v1/options", "GET");
  const back = Object.fromEntries(keep.filter((k) => k in before).map((k) => [k, before[k]]));
  await call("/sdapi/v1/options", "POST", { samples_format: "webp", jpeg_quality: quality, webp_lossless: false });
  try {
    const j = await call("/sdapi/v1/extra-single-image", "POST", {
      image: png.toString("base64"), resize_mode: 1, upscaling_resize_w: size.width, upscaling_resize_h: size.height, upscaling_crop: true,
      upscaler_1: "Lanczos", upscaler_2: "None", extras_upscaler_2_visibility: 0, show_extras_results: true,
    });
    return Buffer.from(String(j.image || "").split(",").pop(), "base64");
  } finally {
    await call("/sdapi/v1/options", "POST", back).catch((e) => console.warn(`WebUI の設定（${keep.join("・")}）を元に戻せなかった。画面の設定で直す：${e.message}`));
  }
}
let webuiShrink = true; // 一度だめなら二度は試さない
async function shrink(id, png) {
  if (cwebp) {
    const tmp = path.join(tmpdir(), `morsveld-${id}-${process.pid}.png`), out = path.join(tmpdir(), `morsveld-${id}-${process.pid}.webp`);
    writeFileSync(tmp, png);
    try {
      execFileSync(cwebp, ["-quiet", "-q", String(quality), "-resize", String(size.width), String(size.height), tmp, "-o", out]);
      return { buf: readFileSync(out), ext: "webp" };
    } catch (e) { console.warn(`\ncwebp に失敗した（${e.message}）。WebUI で縮める`); }
    finally { rmSync(tmp, { force: true }); rmSync(out, { force: true }); }
  }
  if (webuiShrink) {
    try {
      const buf = await shrinkByWebUI(png);
      const ext = kindOf(buf);
      if (ext === "webp" || ext === "jpg") return { buf, ext };
      webuiShrink = false;
      console.warn(`\nWebUI が webp で返さなかった（${ext}）`);
    } catch (e) { webuiShrink = false; console.warn(`\nWebUI で縮められなかった（${e.message}）`); }
  }
  throw new Error("STOP");
}
function save(id, { buf, ext }) {
  mkdirSync(outDir, { recursive: true });
  for (const e of ["webp", "png", "jpg", "jpeg"]) rmSync(path.join(outDir, `${id}.${e}`), { force: true }); // 作り直すときに古い形式を残さない
  const out = path.join(outDir, `${id}.${ext}`);
  writeFileSync(out, buf);
  return out;
}

// ---------------------------------------------------------------- 回す
console.log(`${todo.length} 人（${api("")}${dry ? "・送らない" : ""}・${size.width}×${size.height} に縮めて保存：${cwebp ? "cwebp" : "WebUI（cwebp が無い）"}）`);
if (dry) {
  const show = Object.assign({}, bodyOf(todo[0]));
  delete show.prompt; delete show.negative_prompt; delete show.seed;
  console.log("送る設定：" + JSON.stringify(show));
}
let made = 0;
for (const p of todo) {
  if (dry) { const b = bodyOf(p); console.log(`\n[${p.id}] ${p.name}  seed ${b.seed}${Number.isInteger(p.seed) && !newSeed ? "（一覧）" : ""}\n  + ${b.prompt}\n  - ${b.negative_prompt || ""}${b.styles && b.styles.length ? `\n  styles: ${b.styles.join(", ")}（WebUI の Styles の文が、さらに足される）` : ""}`); continue; }
  process.stdout.write(`${p.id}（${p.name}）… `);
  try {
    const { png, seed } = await txt2img(p);
    const small = await shrink(p.id, png);
    const out = save(p.id, small);
    if (Number.isInteger(seed)) { seeds[p.id] = { seed, at: new Date().toISOString() }; writeFileSync(seedsPath, JSON.stringify(seeds, null, 1) + "\n"); }
    console.log(`${path.relative(root, out)}  ${(small.buf.length / 1024).toFixed(0)}KB  seed ${seed ?? "?"}${small.buf.length > 80 * 1024 ? "（80KB を超えた。webpQuality を下げる）" : ""}`);
    made++;
  } catch (e) {
    if (e.message === "STOP") {
      console.log("保存しない");
      console.error("\n大きい画像のまま保存すると埋め込みの上限（12MB）をすぐ超えるので止めた。cwebp を入れてから、もう一度動かす（docs/art/README.md）。");
      process.exit(1);
    }
    console.log("失敗：" + e.message);
    if (/ECONNREFUSED|fetch failed/.test(e.message + (e.cause ? e.cause.message : ""))) { console.error("Stable Diffusion に繋がらない。WebUI を --api で起動しているか（style.json の url）"); process.exit(1); }
  }
}
if (!dry) console.log(`\n${made} 枚 作った。気に入った人は --keep <id> で seed を一覧に残す。気に入らない人は --only <id> --force --new-seed で作り直す。終わったら node tools/build.mjs`);
