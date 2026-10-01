// 持ち主のパソコンで、手元の Stable Diffusion に人物の絵を作らせる（CI・テストでは動かさない）。手順は docs/art/README.md。
// docs/art/portraits.json を読み、まだ assets/portraits/<id>.(webp|png|jpg) が無い人だけ、Stable Diffusion の API に送って保存する。
// プロンプト ＝ 一覧の特徴のタグ ＋ 持ち主の画風（docs/art/style.local.json の prompt）。ネガティブ・大きさ・steps なども style.local.json から。
//
// node tools/gen_portraits.mjs                 … AUTOMATIC1111 / Forge（WebUI を --api で起動。既定 http://127.0.0.1:7860）
// node tools/gen_portraits.mjs --comfy         … ComfyUI（既定 http://127.0.0.1:8188。docs/art/comfy_workflow.json の {{prompt}} などを差し替える）
//   --only <id>[,<id>…]  その人だけ   --force  あっても作り直す   --dry  送らずにプロンプトだけ表示   --style <file>  設定のファイル
// 返ってきた png は、cwebp があれば webp にする（無ければ png のまま。埋め込みは png も受ける）。外部のライブラリは使わない（Node 18 以上の fetch）。
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = path.join(root, "docs", "art");
const outDir = path.join(root, "assets", "portraits");

// ---------------------------------------------------------------- 引数
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const comfy = flag("--comfy"), force = flag("--force"), dry = flag("--dry");
const only = opt("--only") ? new Set(opt("--only").split(",").map((s) => s.trim()).filter(Boolean)) : null;
const stylePath = opt("--style") || path.join(art, "style.local.json");

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const list = readJson(path.join(art, "portraits.json")).portraits;
let style = {};
if (existsSync(stylePath)) style = readJson(stylePath);
else if (!dry) { console.error(`${path.relative(root, stylePath)} が無い。docs/art/style.example.json を写して、画風を書く`); process.exit(1); }
else console.warn(`（${path.relative(root, stylePath)} が無いので、画風なしで表示する）`);

const join = (...a) => a.map((s) => String(s || "").trim().replace(/^,|,$/g, "").trim()).filter(Boolean).join(", ");
const promptOf = (p) => join(style.prefix, p.tags, style.prompt);
const negative = style.negative || "";
const W = style.width || 512, H = style.height || 640;

const exists = (id) => ["webp", "png", "jpg", "jpeg"].some((e) => existsSync(path.join(outDir, `${id}.${e}`)));
const todo = list.filter((p) => (!only || only.has(p.id)) && (force || !exists(p.id)));
if (only) for (const id of only) if (!list.some((p) => p.id === id)) console.warn(`一覧に ${id} がいない`);
if (!todo.length) { console.log("作る絵はない（--force で作り直す）"); process.exit(0); }

// ---------------------------------------------------------------- 保存（cwebp があれば webp）
let cwebp = null;
try { execFileSync("cwebp", ["-version"], { stdio: "ignore" }); cwebp = "cwebp"; } catch {}
function save(id, png) {
  mkdirSync(outDir, { recursive: true });
  for (const e of ["webp", "png", "jpg", "jpeg"]) rmSync(path.join(outDir, `${id}.${e}`), { force: true }); // 作り直すときに古い形式を残さない
  if (cwebp) {
    const tmp = path.join(tmpdir(), `morsveld-${id}-${process.pid}.png`);
    writeFileSync(tmp, png);
    try {
      const out = path.join(outDir, `${id}.webp`);
      execFileSync(cwebp, ["-quiet", "-q", String(style.webpQuality || 80), "-resize", String(W), String(H), tmp, "-o", out]);
      return out;
    } catch (e) { console.warn(`cwebp に失敗したので png で保存する（${e.message}）`); }
    finally { rmSync(tmp, { force: true }); }
  }
  const out = path.join(outDir, `${id}.png`);
  writeFileSync(out, png);
  return out;
}

// ---------------------------------------------------------------- AUTOMATIC1111 / Forge
async function a1111(p) {
  const url = (style.url || "http://127.0.0.1:7860").replace(/\/$/, "") + "/sdapi/v1/txt2img";
  const body = Object.assign({
    prompt: promptOf(p), negative_prompt: negative, width: W, height: H,
    steps: style.steps || 28, cfg_scale: style.cfg_scale || 6, sampler_name: style.sampler_name || "DPM++ 2M", seed: style.seed ?? -1,
    batch_size: 1, n_iter: 1,
  }, style.scheduler ? { scheduler: style.scheduler } : {}, style.override_settings ? { override_settings: style.override_settings } : {}, style.extra || {});
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} が ${res.status}：${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  if (!j.images || !j.images[0]) throw new Error("画像が返ってこない");
  return Buffer.from(j.images[0].split(",").pop(), "base64");
}

// ---------------------------------------------------------------- ComfyUI
// ワークフロー（API 形式で書き出した JSON）の中の文字列 {{prompt}} {{negative}} {{width}} {{height}} {{seed}} {{steps}} {{cfg}} {{checkpoint}} を差し替える。
// 文字列が丸ごと {{width}} などなら数に替える
async function comfyui(p) {
  const base = ((style.comfy && style.comfy.url) || "http://127.0.0.1:8188").replace(/\/$/, "");
  const wfPath = (style.comfy && style.comfy.workflow) || path.join(art, "comfy_workflow.json");
  const seed = style.seed >= 0 ? style.seed : Math.floor(Math.random() * 2 ** 32);
  const vals = { prompt: promptOf(p), negative, width: W, height: H, seed, steps: style.steps || 28, cfg: style.cfg_scale || 6, checkpoint: (style.comfy && style.comfy.checkpoint) || "" };
  const fill = (v) => {
    if (typeof v === "string") {
      const m = /^\{\{(\w+)\}\}$/.exec(v);
      if (m && m[1] in vals) return vals[m[1]];
      return v.replace(/\{\{(\w+)\}\}/g, (all, k) => (k in vals ? String(vals[k]) : all));
    }
    if (Array.isArray(v)) return v.map(fill);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]));
    return v;
  };
  const wf = fill(readJson(wfPath));
  delete wf._comment;
  const res = await fetch(base + "/prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: wf, client_id: "morsveld" }) });
  if (!res.ok) throw new Error(`${base}/prompt が ${res.status}：${(await res.text()).slice(0, 300)}`);
  const { prompt_id } = await res.json();
  for (let i = 0; i < 600; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const h = await (await fetch(`${base}/history/${prompt_id}`)).json();
    const done = h[prompt_id];
    if (!done) continue;
    const img = Object.values(done.outputs || {}).flatMap((o) => o.images || []).find((x) => x.type === "output") || Object.values(done.outputs || {}).flatMap((o) => o.images || [])[0];
    if (!img) throw new Error("ComfyUI の出力に画像が無い（SaveImage のノードがあるか）");
    const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder || "", type: img.type || "output" });
    return Buffer.from(await (await fetch(`${base}/view?${q}`)).arrayBuffer());
  }
  throw new Error("ComfyUI が10分たっても終わらない");
}

// ---------------------------------------------------------------- 回す
console.log(`${todo.length} 人（${comfy ? "ComfyUI" : "AUTOMATIC1111 / Forge"}${dry ? "・送らない" : ""}${cwebp || dry ? "" : "・cwebp が無いので png で保存"}）`);
let made = 0;
for (const p of todo) {
  if (dry) { console.log(`\n[${p.id}] ${p.name}\n  + ${promptOf(p)}\n  - ${negative}`); continue; }
  process.stdout.write(`${p.id}（${p.name}）… `);
  try {
    const out = save(p.id, comfy ? await comfyui(p) : await a1111(p));
    console.log(path.relative(root, out));
    made++;
  } catch (e) {
    console.log("失敗：" + e.message);
    if (/ECONNREFUSED|fetch failed/.test(e.message + (e.cause ? e.cause.message : ""))) { console.error("Stable Diffusion に繋がらない。WebUI を --api で起動しているか（ComfyUI なら --comfy）"); process.exit(1); }
  }
}
if (!dry) console.log(`\n${made} 枚 作った。絵を見て、気に入らないものは --only <id> --force で作り直す。終わったら node tools/build.mjs`);
