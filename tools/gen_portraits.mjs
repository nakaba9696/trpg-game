// 持ち主のパソコンで、手元の Stable Diffusion（AUTOMATIC1111 / Forge の API）に人物の絵を作らせる（CI・テストでは動かさない）。手順は docs/art/README.md。
// docs/art/portraits.json を読み、まだ assets/portraits/<id>.(webp|png|jpg) が無い人だけ、/sdapi/v1/txt2img に送って保存する。
// プロンプト ＝ 画風の前置き（style.local.json の prefix）＋ 一覧の特徴のタグ ＋ 画風の後置き（suffix）＋ WebUI の Styles（styles に名前）。ほかの設定も docs/art/style.local.json から。
// seed：一覧にその人の seed が書いてあればそれを使う（名のある人の見た目を保つ）。無ければ style.local.json の seed（-1 なら毎回変わる）。
//   使った seed は docs/art/seeds.local.json（git に入れない）に残る。気に入ったら --keep <id> で一覧に書き戻す。
//
// node tools/gen_portraits.mjs                    … まだ画像の無い人をすべて作る
//   --only <id>[,<id>…]  その人だけ        --force  あっても作り直す        --dry  送らずにプロンプトと seed だけ表示
//   --new-seed           一覧の seed を使わずに作る（別の見た目を探す）       --style <file>  設定のファイル
// node tools/gen_portraits.mjs --keep <id>[,<id>…]   … 最後に作ったときの seed を一覧（portraits.json・md）に書き戻す。<id>=<seed> で直に書ける
// 返ってきた png は、cwebp があれば webp にする（無ければ png のまま。埋め込みは png も受ける）。外部のライブラリは使わない（Node 18 以上の fetch）。
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

let style = {};
if (existsSync(stylePath)) style = readJson(stylePath);
else if (!dry) { console.error(`${path.relative(root, stylePath)} が無い。docs/art/style.example.json を写して、画風を書く`); process.exit(1); }
else console.warn(`（${path.relative(root, stylePath)} が無いので、画風なしで表示する）`);

const join = (...a) => a.map((s) => String(s || "").trim().replace(/^,|,$/g, "").trim()).filter(Boolean).join(", ");
const promptOf = (p) => join(style.prefix, p.tags, style.suffix);
const seedOf = (p) => (!newSeed && Number.isInteger(p.seed) ? p.seed : style.seed ?? -1);

const exists = (id) => ["webp", "png", "jpg", "jpeg"].some((e) => existsSync(path.join(outDir, `${id}.${e}`)));
const todo = list.filter((p) => (!only || only.has(p.id)) && (force || !exists(p.id)));
if (only) for (const id of only) if (!list.some((p) => p.id === id)) console.warn(`一覧に ${id} がいない`);
if (!todo.length) { console.log("作る絵はない（--force で作り直す）"); process.exit(0); }

// ---------------------------------------------------------------- 送る
// style.local.json の項目をそのまま txt2img に渡す（無いものは WebUI の既定）。hires fix は enable_hr・hr_scale・hr_upscaler・denoising_strength など。
// styles は WebUI の「Styles」（styles.csv）に保存した名前の配列。API は画面の入力欄の文を使わないので、汎用の絵柄はここか prefix・suffix・negative に書く
const PASS = ["styles", "negative_prompt", "sampler_name", "scheduler", "steps", "cfg_scale", "width", "height", "enable_hr", "hr_scale", "hr_upscaler", "hr_second_pass_steps", "hr_resize_x", "hr_resize_y", "denoising_strength", "restore_faces", "clip_skip", "override_settings"];
function bodyOf(p) {
  const b = { prompt: promptOf(p), seed: seedOf(p), batch_size: 1, n_iter: 1, width: 512, height: 640, override_settings_restore_afterwards: true };
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

// ---------------------------------------------------------------- 保存（cwebp があれば webp。縮めるのは一覧の大きさ）
let cwebp = null;
try { execFileSync("cwebp", ["-version"], { stdio: "ignore" }); cwebp = "cwebp"; } catch {}
const size = data.size || { width: 512, height: 640 };
function save(id, png) {
  mkdirSync(outDir, { recursive: true });
  for (const e of ["webp", "png", "jpg", "jpeg"]) rmSync(path.join(outDir, `${id}.${e}`), { force: true }); // 作り直すときに古い形式を残さない
  if (cwebp) {
    const tmp = path.join(tmpdir(), `morsveld-${id}-${process.pid}.png`);
    writeFileSync(tmp, png);
    try {
      const out = path.join(outDir, `${id}.webp`);
      execFileSync(cwebp, ["-quiet", "-q", String(style.webpQuality || 80), "-resize", String(size.width), String(size.height), tmp, "-o", out]);
      return out;
    } catch (e) { console.warn(`cwebp に失敗したので png で保存する（${e.message}）`); }
    finally { rmSync(tmp, { force: true }); }
  }
  const out = path.join(outDir, `${id}.png`);
  writeFileSync(out, png);
  return out;
}

// ---------------------------------------------------------------- 回す
console.log(`${todo.length} 人（AUTOMATIC1111 / Forge${dry ? "・送らない" : ""}${cwebp || dry ? "" : "・cwebp が無いので png で保存"}）`);
let made = 0;
for (const p of todo) {
  if (dry) { const b = bodyOf(p); console.log(`\n[${p.id}] ${p.name}  seed ${b.seed}${Number.isInteger(p.seed) && !newSeed ? "（一覧）" : ""}\n  + ${b.prompt}\n  - ${b.negative_prompt || ""}${b.styles && b.styles.length ? `\n  styles: ${b.styles.join(", ")}（WebUI の Styles の文が、さらに足される）` : ""}`); continue; }
  process.stdout.write(`${p.id}（${p.name}）… `);
  try {
    const { png, seed } = await txt2img(p);
    const out = save(p.id, png);
    if (Number.isInteger(seed)) { seeds[p.id] = { seed, at: new Date().toISOString() }; writeFileSync(seedsPath, JSON.stringify(seeds, null, 1) + "\n"); }
    console.log(`${path.relative(root, out)}  seed ${seed ?? "?"}`);
    made++;
  } catch (e) {
    console.log("失敗：" + e.message);
    if (/ECONNREFUSED|fetch failed/.test(e.message + (e.cause ? e.cause.message : ""))) { console.error("Stable Diffusion に繋がらない。WebUI を --api で起動しているか"); process.exit(1); }
  }
}
if (!dry) console.log(`\n${made} 枚 作った。気に入った人は --keep <id> で seed を一覧に残す。気に入らない人は --only <id> --force --new-seed で作り直す。終わったら node tools/build.mjs`);
