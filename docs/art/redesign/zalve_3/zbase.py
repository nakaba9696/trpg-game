# 候補 1 から、帳簿の手からこぼれる液体のような筋と床の砂だまりを消した「きれいな下地」を作る（筋の道すじを帯にして inpaint）
import base64, io, json, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
base = json.load(open("zalve_15121.json", encoding="utf-8"))
b64 = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
im = Image.open("zalve_15121.png").convert("RGB"); a = np.array(im).astype(int); H, W = a.shape[:2]
st = (np.abs(a - [247, 233, 205]).max(-1) < 16) & (a[..., 0] - a[..., 2] > 25)
pts = []
for y in range(520, 1160, 8):
    xs = np.where(st[y, 150:360])[0]
    if len(xs) > 2: pts.append((150 + int(np.median(xs)), y))
m = Image.new("L", (W, H), 0); d = ImageDraw.Draw(m)
d.line(pts, fill=255, width=46, joint="curve")
for p in pts: d.ellipse([p[0] - 23, p[1] - 23, p[0] + 23, p[1] + 23], fill=255)
yy, xx = np.mgrid[:H, :W]
puddle = ndimage.binary_dilation(st & (yy > 1060), iterations=8) | ((yy > 1080) & (np.abs(a - [236, 222, 186]).max(-1) < 30))
mm = np.maximum(np.array(m), ndimage.binary_dilation(puddle, iterations=6) * 255)
mask = Image.fromarray(mm.astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
p = base["prompt"]
for o in ["(pale golden sand pouring from the sleeve cuff:1.5), ", "(sand trickling from the fingertips of the other hand:1.4), "]: p = p.replace(o, "")
b = {"prompt": p + ", white background", "negative_prompt": base["negative_prompt"] + ", sand, liquid, water, stream, chain, rope", "seed": 15121, "steps": 24, "cfg_scale": 5.5,
     "sampler_name": "Euler a", "width": W, "height": H, "init_images": [b64(im)], "mask": b64(mask), "denoising_strength": 0.8, "inpainting_fill": 1, "inpaint_full_res": False, "mask_blur": 3,
     "override_settings": base["override_settings"]}
r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save("zalve_clean.png"); mask.save("zalve_clean_mask.png"); print(len(pts))
