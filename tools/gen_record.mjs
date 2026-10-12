// 生成の記録：絵を 1 枚作るたびに、同じ絵をもう一度出せるだけの設定を docs/art/gen/<id>.json に残す（持ち主の決まり「出すたびに違うキャラになったら意味がない」）。
// id は assets/portraits・assets/monsters のファイル名（表情違いも 1 枚ずつ。nora_joy など）。
// seed は -1 ではなく実際に使った値（API の返す info から取る）。モデルはファイル名とハッシュ。下地（img2img）はファイル名と sha1。
// 手元の Python の道具は tools/gen_record.py が同じ形で書く。中身の説明は docs/art/gen/README.md。
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

export const sha1 = (buf) => createHash("sha1").update(buf).digest("hex");
export const sha1File = (f) => sha1(readFileSync(f));

const KEEP = ["prompt", "negative_prompt", "styles", "sampler_name", "scheduler", "steps", "cfg_scale", "width", "height", "denoising_strength",
  "resize_mode", "restore_faces", "clip_skip", "batch_size", "n_iter", "inpainting_fill", "inpaint_full_res", "inpaint_full_res_padding", "mask_blur"];
const HIRES = ["enable_hr", "hr_scale", "hr_upscaler", "hr_second_pass_steps", "hr_resize_x", "hr_resize_y", "hr_sampler_name", "hr_scheduler", "hr_prompt", "hr_negative_prompt", "hr_cfg"];

// body：API に送った中身。info：API が返した info（文字列か物）。index：何枚目か（n_iter・batch のとき）
// opts：{ method: "txt2img"|"img2img"|"inpaint", base: 下地のファイル, mask: マスクの作り方か画像, matte: 背景を抜いた方法, post: 縮め方など, tool: 作った道具 }
export function genRecord(body, info, index = 0, opts = {}) {
  const i = typeof info === "string" ? (() => { try { return JSON.parse(info); } catch { return {}; } })() : info || {};
  const pick = (a, k) => (Array.isArray(a) ? a[k] ?? a[0] : a);
  const rec = { id: opts.id, source: "generated", method: opts.method || (body.init_images ? (body.mask ? "inpaint" : "img2img") : "txt2img"), date: new Date().toISOString(), tool: opts.tool };
  for (const k of KEEP) if (body[k] !== undefined) rec[k] = body[k];
  rec.prompt = pick(i.all_prompts, index) ?? body.prompt;
  rec.negative_prompt = pick(i.all_negative_prompts, index) ?? body.negative_prompt;
  rec.seed = pick(i.all_seeds, index) ?? i.seed ?? body.seed;
  rec.subseed = pick(i.all_subseeds, index) ?? i.subseed ?? body.subseed ?? -1;
  rec.subseed_strength = i.subseed_strength ?? body.subseed_strength ?? 0;
  rec.model = { name: i.sd_model_name, file: (body.override_settings || {}).sd_model_checkpoint, hash: i.sd_model_hash, vae: i.sd_vae_name, vae_hash: i.sd_vae_hash };
  rec.sampler_name = i.sampler_name || body.sampler_name;
  rec.steps = i.steps ?? body.steps;
  rec.cfg_scale = i.cfg_scale ?? body.cfg_scale;
  rec.width = i.width ?? body.width;
  rec.height = i.height ?? body.height;
  rec.clip_skip = i.clip_skip ?? body.clip_skip;
  if (body.enable_hr) rec.hires = Object.fromEntries(HIRES.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]).concat([["denoising_strength", body.denoising_strength]]));
  else delete rec.enable_hr;
  if (body.override_settings) rec.override_settings = body.override_settings;
  const b64sha1 = (x) => sha1(Buffer.from(String(x).split(",").pop(), "base64"));
  if (body.init_images) rec.init_image_sha1 = body.init_images.map(b64sha1);
  if (body.mask) rec.mask_sha1 = b64sha1(body.mask);
  if (opts.base) rec.base = Array.isArray(opts.base) ? opts.base : { file: opts.base.file, sha1: opts.base.sha1 };
  if (opts.mask) rec.mask = opts.mask;
  const scripts = body.alwayson_scripts || {};
  const cn = scripts.ControlNet || scripts.controlnet;
  if (cn) rec.controlnet = (cn.args || []).map((a) => Object.fromEntries(Object.entries(a).filter(([k]) => !/image|mask/.test(k)).concat(a.image ? [["image_sha1", sha1(Buffer.from(String(a.image.image || a.image).split(",").pop(), "base64"))]] : [])));
  for (const [k, v] of Object.entries(scripts)) if (/layer.?diffuse/i.test(k)) rec.layerdiffuse = v;
  for (const [k, v] of Object.entries(scripts)) if (/adetailer/i.test(k)) rec.adetailer = v;
  if (opts.matte) rec.matte = opts.matte;
  if (opts.post) rec.post = opts.post;
  rec.infotext = pick(i.infotexts, index);
  for (const k of Object.keys(rec)) if (rec[k] === undefined) delete rec[k];
  return rec;
}

// docs/art/gen/<id>.json に書く（前の記録は history に積む。描き直しても、前の絵の出し方が消えないように）
export function writeGenRecord(root, id, rec) {
  const dir = path.join(root, "docs", "art", "gen");
  mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${id}.json`);
  let prev = null;
  try { prev = JSON.parse(readFileSync(f, "utf8")); } catch {}
  const out = Object.assign({ id }, rec);
  if (prev) { const { history = [], ...old } = prev; out.history = [old, ...history].slice(0, 5); }
  writeFileSync(f, JSON.stringify(out, null, 1) + "\n");
  return f;
}
