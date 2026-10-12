# 生成の記録（Python の道具用）：tools/gen_record.mjs と同じ形で docs/art/gen/<id>.json に書く。
# 使い方：
#   from gen_record import gen_record, write_gen_record, sha1_file
#   r = json.loads(urllib.request.urlopen(...).read())          # WebUI の API の返事
#   rec = gen_record(body, r["info"], k, id="nora_joy", method="inpaint", tool="手元の道具の名前",
#                    base={"file": "assets/portraits/nora.webp", "sha1": sha1_file(...)}, mask="楕円 x0,y0,x1,y1（1 倍）をぼかし 6",
#                    matte={"key": "green", "how": "soft_matte", "lo": 0.12, "hi": 0.80}, post={"resize": [512, 640], "webp_quality": 90})
#   write_gen_record(ROOT, "nora_joy", rec)
# seed は info の all_seeds（-1 ではなく実際の値）。モデルはファイル名とハッシュ。画像（init・mask・ControlNet の参照）は sha1 だけ残す。
import base64, hashlib, json, os
from datetime import datetime, timezone

KEEP = ["prompt", "negative_prompt", "styles", "sampler_name", "scheduler", "steps", "cfg_scale", "width", "height", "denoising_strength",
        "resize_mode", "restore_faces", "clip_skip", "batch_size", "n_iter", "inpainting_fill", "inpaint_full_res", "inpaint_full_res_padding", "mask_blur"]
HIRES = ["enable_hr", "hr_scale", "hr_upscaler", "hr_second_pass_steps", "hr_resize_x", "hr_resize_y", "hr_sampler_name", "hr_scheduler", "hr_prompt", "hr_negative_prompt", "hr_cfg"]


def sha1(b): return hashlib.sha1(b).hexdigest()
def sha1_file(f): return sha1(open(f, "rb").read())
def _b64sha1(s): return sha1(base64.b64decode(str(s).split(",")[-1]))


def gen_record(body, info, index=0, **opts):
    i = json.loads(info) if isinstance(info, str) else (info or {})
    pick = lambda a, d=None: (a[index] if index < len(a) else a[0]) if isinstance(a, list) and a else d
    rec = {"id": opts.get("id"), "source": "generated", "method": opts.get("method") or ("inpaint" if body.get("mask") else "img2img" if body.get("init_images") else "txt2img"),
           "date": datetime.now(timezone.utc).isoformat(), "tool": opts.get("tool")}
    for k in KEEP:
        if k in body: rec[k] = body[k]
    rec["prompt"] = pick(i.get("all_prompts"), body.get("prompt"))
    rec["negative_prompt"] = pick(i.get("all_negative_prompts"), body.get("negative_prompt"))
    rec["seed"] = pick(i.get("all_seeds"), i.get("seed", body.get("seed")))
    rec["subseed"] = pick(i.get("all_subseeds"), i.get("subseed", body.get("subseed", -1)))
    rec["subseed_strength"] = i.get("subseed_strength", body.get("subseed_strength", 0))
    rec["model"] = {"name": i.get("sd_model_name"), "file": (body.get("override_settings") or {}).get("sd_model_checkpoint"), "hash": i.get("sd_model_hash"),
                    "vae": i.get("sd_vae_name"), "vae_hash": i.get("sd_vae_hash")}
    for k in ("sampler_name", "steps", "cfg_scale", "width", "height", "clip_skip"):
        if i.get(k) is not None: rec[k] = i[k]
    if body.get("enable_hr"): rec["hires"] = {**{k: body[k] for k in HIRES if k in body}, "denoising_strength": body.get("denoising_strength")}
    if body.get("override_settings"): rec["override_settings"] = body["override_settings"]
    if body.get("init_images"): rec["init_image_sha1"] = [_b64sha1(x) for x in body["init_images"]]
    if body.get("mask"): rec["mask_sha1"] = _b64sha1(body["mask"])
    for k in ("base", "mask", "matte", "post"):
        if opts.get(k) is not None: rec[k] = opts[k]
    for k, v in (body.get("alwayson_scripts") or {}).items():
        if k.lower() == "controlnet":
            rec["controlnet"] = [{kk: vv for kk, vv in a.items() if "image" not in kk and kk != "mask"} | ({"image_sha1": _b64sha1(a["image"])} if a.get("image") else {}) for a in v.get("args", [])]
        elif "layer" in k.lower() and "diffuse" in k.lower(): rec["layerdiffuse"] = v
        elif "adetailer" in k.lower(): rec["adetailer"] = v
    rec["infotext"] = pick(i.get("infotexts"))
    return {k: v for k, v in rec.items() if v is not None}


def write_gen_record(root, id, rec):
    d = os.path.join(root, "docs", "art", "gen"); os.makedirs(d, exist_ok=True)
    f = os.path.join(d, id + ".json")
    out = {"id": id, **rec}
    if os.path.exists(f):
        prev = json.load(open(f, encoding="utf-8")); hist = prev.pop("history", [])
        out["history"] = ([prev] + hist)[:5]
    with open(f, "w", encoding="utf-8", newline="\n") as fh: fh.write(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    return f


def save_sidecar(img_path, rec):
    """候補の絵の隣に記録を置く（<絵>.gen.json）。採用したら adopt() で docs/art/gen に写す"""
    with open(os.path.splitext(img_path)[0] + ".gen.json", "w", encoding="utf-8", newline="\n") as fh: fh.write(json.dumps(rec, ensure_ascii=False, indent=1) + "\n")


def adopt(root, id, chain, **extra):
    """何段かで作った絵（txt2img → inpaint → 背景を抜く → 表情の差分 など）を採用するとき、各段の記録（.gen.json の道か物）を順に並べて残す。
    extra には matte（背景を抜いた方法）・post（縮め方と仕上がりの sha1）などを入れる"""
    steps = [json.load(open(s, encoding="utf-8")) if isinstance(s, str) else s for s in chain]
    rec = {"source": "generated", "method": "chain" if len(steps) > 1 else steps[0].get("method"), "date": datetime.now(timezone.utc).isoformat(), "steps": steps}
    rec.update({k: v for k, v in extra.items() if v is not None})
    return write_gen_record(root, id, rec)
