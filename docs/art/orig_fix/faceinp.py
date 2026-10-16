# 顔だけの描き直し：基本の絵（透明つき）を白い地に置いて 2 倍にし、顔の楕円だけ inpaint（only masked）で表情を描き直す。
# 結果は顔の楕円だけを基本の絵に重ねる（透明・髪の外形・服は基本のまま）
# 使い方：python faceinp.py <id> <基本.webp> <出す所の頭> cx,cy,rx,ry(512×640 の座標) "<表情のタグ>" den seed[,seed...] ["<外すタグ>"] ["<ネガティブに足す>"]
import base64, io, json, sys, urllib.request
import numpy as np
from PIL import Image
i, basef, outp, ell, expr, den, seeds = sys.argv[1:8]
drop = [w.strip() for w in sys.argv[8].split(",")] if len(sys.argv) > 8 and sys.argv[8] else []
negx = sys.argv[9] if len(sys.argv) > 9 else ""
cx, cy, rx, ry = [float(v) for v in ell.split(",")]
rec = json.load(open(f"H:/game/trpg-gen/docs/art/gen/{i}.json", encoding="utf-8"))
pos = rec["prompt"]
for w in drop: pos = pos.replace(w + ", ", "").replace(", " + w, "")
pos = pos + ", " + expr
neg = rec["negative_prompt"] + (", " + negx if negx else "")
b = Image.open(basef).convert("RGBA"); W, H = b.size
wb = Image.new("RGBA", b.size, (255, 255, 255, 255)); wb.alpha_composite(b)
big = wb.convert("RGB").resize((W * 2, H * 2), Image.LANCZOS)
yy, xx = np.mgrid[:H * 2, :W * 2]
e = np.sqrt(((xx - 2 * cx) / (2 * rx)) ** 2 + ((yy - 2 * cy) / (2 * ry)) ** 2)
mask = Image.fromarray(((e < 1) * 255).astype(np.uint8))
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
ba = np.array(b).astype(np.float32)
for sd in [int(s) for s in seeds.split(",")]:
    body = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
            "width": W * 2, "height": H * 2, "init_images": [enc(big)], "mask": enc(mask), "denoising_strength": float(den), "inpainting_fill": 1,
            "inpaint_full_res": True, "inpaint_full_res_padding": 64, "mask_blur": 6, "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    g = Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").resize((W, H), Image.LANCZOS)
    ga = np.array(g).astype(np.float32)
    yy1, xx1 = np.mgrid[:H, :W]
    e1 = np.sqrt(((xx1 - cx) / rx) ** 2 + ((yy1 - cy) / ry) ** 2)
    m = (np.clip((1 - e1) * min(rx, ry) / 4, 0, 1) * (ba[..., 3] > 250))[..., None]
    o = ba.copy(); o[..., :3] = ba[..., :3] * (1 - m) + ga * m
    Image.fromarray(o.round().astype(np.uint8), "RGBA").save(f"{outp}_{sd}.webp", "WEBP", quality=92, alpha_quality=100, method=6)
    body.pop("init_images"); body.pop("mask"); body["init_image"] = basef; body["mask_ellipse_512"] = [cx, cy, rx, ry]
    json.dump(body, open(f"{outp}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(outp, sd, flush=True)
