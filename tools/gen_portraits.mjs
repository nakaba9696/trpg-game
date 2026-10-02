// 持ち主のパソコンで、手元の Stable Diffusion（AUTOMATIC1111 / Forge / reForge の API）に人物の絵を作らせる（CI・テストでは動かさない）。手順は docs/art/README.md。
// docs/art/portraits.json を読み、まだ assets/portraits/<id>.(webp|png|jpg) が無い人だけ、/sdapi/v1/txt2img に送って保存する。
// 設定：docs/art/style.json（持ち主の設定。リポジトリに入っている）を読み、docs/art/style.local.json があればその項目で上書きする（local は git に入れない）。
// プロンプト ＝ 画風の前置き（prefix）＋ 一覧の特徴のタグ（見た目の identity ＋ tags ＋ 表情。tools/portraits.mjs の featureOf）＋ 後置き（suffix）＋ WebUI の Styles（styles に名前）。
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
// --monsters  魔物の絵（V6）：一覧は docs/art/monsters.json、設定は docs/art/style_monsters.json（＋ style_monsters.local.json）、
//   保存は assets/monsters/<id>.webp（512×512）、seed は docs/art/seeds_monsters.local.json。ほかの引数は同じ
//   一覧で human: true の敵は、設定の human の suffix・negative に替わる。same_as: <id> の敵は作らない（その絵を使う）
//   一覧で style: "eldritch" の魔物（人の形を持たない格上の存在。V7）は docs/art/style_eldritch.json（＋ style_eldritch.local.json）で作る（別のモデル）。
//   モデルの入れ替えを減らすため、ふつうの魔物を先に、異形を後にまとめて送る
// --variants  喜怒哀楽の差分（V8）：一覧に variants がある人の、基本の絵（assets/portraits/<id>.webp）を元に /sdapi/v1/img2img で作り、
//   assets/portraits/<id>_<joy|anger|sorrow|fun>.webp に置く。同じ人に見えるよう、seed は基本と同じ（一覧の seed か seeds.local.json）、
//   プロンプトは基本の絵と同じ見た目（identity）・ポーズ（tags）のまま、表情（face）を差分の表情のタグに差し替えるだけ（V10）、
//   denoising_strength は設定の variants.denoising（既定 0.35。0.3〜0.45 で）。
//   基本の絵が無い人は飛ばす。--only・--force・--dry も使える（--only dil,nora か、--only dil_joy で一枚だけ）
// 外部のライブラリは使わない（Node 18 以上の fetch）。
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import * as P from "./portraits.mjs";
import * as M from "./monsters.mjs";

// ---------------------------------------------------------------- 引数
const argv = process.argv.slice(2);
const MON = argv.includes("--monsters");
const KIND = MON
  ? { JSON_PATH: M.JSON_PATH, MD_PATH: M.MD_PATH, render: M.renderMonstersMd, key: "monsters", dir: "monsters", style: "style_monsters", seeds: "seeds_monsters.local.json", unit: "体" }
  : { JSON_PATH: P.JSON_PATH, MD_PATH: P.MD_PATH, render: P.renderPortraitsMd, key: "portraits", dir: "portraits", style: "style", seeds: "seeds.local.json", unit: "人" };
const { JSON_PATH, MD_PATH } = KIND;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = path.join(root, "docs", "art");
const outDir = path.join(root, "assets", KIND.dir);
const seedsPath = path.join(art, KIND.seeds);

const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const ids = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : null);
const force = flag("--force"), dry = flag("--dry"), newSeed = flag("--new-seed");
const only = ids(opt("--only")) && new Set(ids(opt("--only")));
const stylePath = opt("--style") || path.join(art, `${KIND.style}.local.json`);

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const data = readJson(JSON_PATH);
const list = data[KIND.key];
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
  writeFileSync(MD_PATH, KIND.render(data));
  console.log(`${path.relative(root, JSON_PATH)}・${path.basename(MD_PATH)} を書き直した。コミットしておく`);
  process.exit(0);
}

// 設定：style.json ＋ style.local.json（override_settings だけは中身ごと合わせる）
function loadStyle(name, localPath) {
  const shared = path.join(art, `${name}.json`);
  if (!existsSync(shared)) { console.error(`${path.relative(root, shared)} が無い`); process.exit(1); }
  const st = readJson(shared);
  if (existsSync(localPath)) {
    const local = readJson(localPath);
    const os = Object.assign({}, st.override_settings, local.override_settings);
    Object.assign(st, local);
    if (Object.keys(os).length) st.override_settings = os;
    console.log(`（${path.relative(root, localPath)} で上書き：${Object.keys(local).filter((k) => !k.startsWith("_")).join("・")}）`);
  }
  return st;
}
const style = loadStyle(KIND.style, stylePath);
// 異形（魔物の一覧の style: "eldritch"）は別の設定。使うときだけ読む。url は魔物の設定のもの
const STYLES = { monsters: style };
const baseOf = (p) => {
  if (!MON || p.style !== "eldritch") return style;
  if (!STYLES.eldritch) STYLES.eldritch = loadStyle("style_eldritch", path.join(art, "style_eldritch.local.json"));
  return STYLES.eldritch;
};

const join = P.joinTags;
// 人の姿の敵（魔物の一覧の human: true）は、設定の human の項目で後置き・ネガティブを替える
const styleOf = (p) => { const b = baseOf(p); return p.human && b.human ? Object.assign({}, b, b.human) : b; };
const promptOf = (p, face) => join(baseOf(p).prefix, P.featureOf(p, face), styleOf(p).suffix);
const seedOf = (p) => (!newSeed && Number.isInteger(p.seed) ? p.seed : baseOf(p).seed ?? -1);

const exists = (id) => ["webp", "png", "jpg", "jpeg"].some((e) => existsSync(path.join(outDir, `${id}.${e}`)));
const isEld = (p) => MON && p.style === "eldritch";
const VARIANTS = flag("--variants") && !MON;
const todo = list.filter((p) => !p.same_as && (!only || only.has(p.id)) && (force || !exists(p.id)));
todo.sort((a, b) => isEld(a) - isEld(b)); // 異形を後にまとめる（並びは安定）
const lastEld = todo.filter(isEld).pop();
if (only && !VARIANTS) for (const id of only) if (!list.some((p) => p.id === id)) console.warn(`一覧に ${id} がいない`);
if (!todo.length && !VARIANTS) { console.log("作る絵はない（--force で作り直す）"); process.exit(0); }

// ---------------------------------------------------------------- 送る
// 設定の項目をそのまま txt2img に渡す（無いものは WebUI の既定）。hires fix は enable_hr・hr_scale・hr_upscaler・denoising_strength など。
// styles は WebUI の「Styles」（styles.csv）に保存した名前の配列。API は画面の入力欄の文を使わないので、汎用の絵柄はここか prefix・suffix・negative に書く
const PASS = ["styles", "negative_prompt", "sampler_name", "scheduler", "steps", "cfg_scale", "width", "height", "enable_hr", "hr_scale", "hr_upscaler", "hr_second_pass_steps", "hr_resize_x", "hr_resize_y", "denoising_strength", "restore_faces", "clip_skip", "override_settings"];
function bodyOf(p) {
  // 異形が続くあいだはモデルを戻さない（最後の異形のあとで戻す）
  const b = { prompt: promptOf(p), seed: seedOf(p), batch_size: 1, n_iter: 1, override_settings_restore_afterwards: !isEld(p) || p === lastEld };
  const st = styleOf(p);
  for (const k of PASS) if (st[k] !== undefined) b[k] = st[k];
  if (st.negative !== undefined && b.negative_prompt === undefined) b.negative_prompt = st.negative;
  return Object.assign(b, baseOf(p).extra || {});
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
const size = data.size || (MON ? { width: 512, height: 512 } : { width: 512, height: 640 });
const qualityOf = (p) => baseOf(p).webpQuality || style.webpQuality || 80;
let quality = style.webpQuality || 80; // 今の絵の webp の質（回すときに一体ずつ替える）
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

if (VARIANTS) { await runVariants(); process.exit(0); }

// ---------------------------------------------------------------- 回す
console.log(`${todo.length} ${KIND.unit}（${api("")}${dry ? "・送らない" : ""}・${size.width}×${size.height} に縮めて保存：${cwebp ? "cwebp" : "WebUI（cwebp が無い）"}）`);
if (dry) {
  for (const p of [todo[0], todo.find(isEld)].filter((p, i, a) => p && a.indexOf(p) === i)) {
    const show = Object.assign({}, bodyOf(p));
    delete show.prompt; delete show.negative_prompt; delete show.seed;
    console.log(`送る設定${isEld(p) ? "（異形：style_eldritch.json）" : ""}：` + JSON.stringify(show));
  }
}
let made = 0;
for (const p of todo) {
  if (dry) { const b = bodyOf(p); console.log(`\n[${p.id}] ${p.name}${isEld(p) ? "（異形）" : ""}  seed ${b.seed}${Number.isInteger(p.seed) && !newSeed ? "（一覧）" : ""}\n  + ${b.prompt}\n  - ${b.negative_prompt || ""}${b.styles && b.styles.length ? `\n  styles: ${b.styles.join(", ")}（WebUI の Styles の文が、さらに足される）` : ""}`); continue; }
  process.stdout.write(`${p.id}（${p.name}${isEld(p) ? "・異形" : ""}）… `);
  quality = qualityOf(p);
  try {
    const { png, seed } = await txt2img(p);
    const small = await shrink(p.id, png);
    const out = save(p.id, small);
    if (Number.isInteger(seed)) { seeds[p.id] = { seed, at: new Date().toISOString() }; writeFileSync(seedsPath, JSON.stringify(seeds, null, 1) + "\n"); }
    console.log(`${path.relative(root, out)}  ${(small.buf.length / 1024).toFixed(0)}KB  seed ${seed ?? "?"}${small.buf.length > (size.maxKB || 80) * 1024 ? `（${size.maxKB || 80}KB を超えた。webpQuality を下げる）` : ""}`);
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
const M_ = MON ? " --monsters" : "";
if (!dry) console.log(`\n${made} 枚 作った。気に入った絵は${M_} --keep <id> で seed を一覧に残す。気に入らない絵は${M_} --only <id> --force --new-seed で作り直す。終わったら node tools/build.mjs`);

// ---------------------------------------------------------------- --variants：喜怒哀楽の差分（V8）
async function runVariants() {
  const MOODS = P.MOODS;
  const v = Object.assign({ denoising: 0.35 }, style.variants || {});
  const baseFile = (id) => ["webp", "png", "jpg", "jpeg"].map((e) => path.join(outDir, `${id}.${e}`)).find((f) => existsSync(f));
  const jobs = [];
  for (const p of list.filter((x) => x.variants)) {
    const base = baseFile(p.id);
    for (const m of MOODS) {
      const id = `${p.id}_${m}`;
      if (!p.variants[m] || (only && !only.has(p.id) && !only.has(id))) continue;
      if (!base) { if (only) console.warn(`${id}：基本の絵（assets/portraits/${p.id}.webp）が無いので飛ばす`); continue; }
      if (!force && exists(id)) continue;
      jobs.push({ p, m, id, base });
    }
  }
  if (only) for (const id of only) if (!list.some((p) => p.variants && (p.id === id || MOODS.some((m) => `${p.id}_${m}` === id)))) console.warn(`差分のある人に ${id} がいない`);
  const seedOfVariant = (p) => (Number.isInteger(p.seed) ? p.seed : seeds[p.id] && Number.isInteger(seeds[p.id].seed) ? seeds[p.id].seed : -1);
  const bodyOfVariant = ({ p, m, base }) => {
    const b = bodyOf(p);
    delete b.enable_hr;
    return Object.assign(b, {
      prompt: promptOf(p, p.variants[m]), seed: seedOfVariant(p),
      init_images: [readFileSync(base).toString("base64")], denoising_strength: v.denoising, resize_mode: 0,
    }, v.extra || {});
  };
  if (!jobs.length) { console.log("作る差分はない（基本の絵が無い人は飛ばす。--force で作り直す）"); return; }
  console.log(`差分 ${jobs.length} 枚（${api("")}${dry ? "・送らない" : ""}・img2img・denoising ${v.denoising}・${size.width}×${size.height} に縮めて保存：${cwebp ? "cwebp" : "WebUI（cwebp が無い）"}）`);
  let made = 0;
  const warned = new Set();
  for (const j of jobs) {
    const b = bodyOfVariant(j);
    if (b.seed < 0 && !warned.has(j.p.id)) { warned.add(j.p.id); console.warn(`${j.p.id}：基本の絵の seed が分からない（一覧にも seeds.local.json にも無い）。seed -1 で作る（元の絵から作るので顔はおおむね保たれる）`); }
    if (dry) { console.log(`\n[${j.id}] ${j.p.name}  seed ${b.seed}  元：${path.relative(root, j.base)}\n  + ${b.prompt}`); continue; }
    process.stdout.write(`${j.id}（${j.p.name}）… `);
    try {
      const res = await fetch(api("/sdapi/v1/img2img"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      if (!res.ok) throw new Error(`${api("/sdapi/v1/img2img")} が ${res.status}：${(await res.text()).slice(0, 300)}`);
      const r = await res.json();
      if (!r.images || !r.images[0]) throw new Error("画像が返ってこない");
      const small = await shrink(j.id, Buffer.from(r.images[0].split(",").pop(), "base64"));
      const out = save(j.id, small);
      console.log(`${path.relative(root, out)}  ${(small.buf.length / 1024).toFixed(0)}KB`);
      made++;
    } catch (e) {
      if (e.message === "STOP") { console.log("保存しない"); console.error("\ncwebp を入れてから、もう一度動かす（docs/art/README.md）。"); process.exit(1); }
      console.log("失敗：" + e.message);
      if (/ECONNREFUSED|fetch failed/.test(e.message + (e.cause ? e.cause.message : ""))) { console.error("Stable Diffusion に繋がらない。WebUI を --api で起動しているか（style.json の url）"); process.exit(1); }
    }
  }
  if (!dry) console.log(`\n差分を ${made} 枚 作った。顔が変わりすぎたら style.local.json の variants.denoising を下げて（0.3 など）--force で作り直す。終わったら node tools/build.mjs`);
}
