# 4 人の差分：基本の絵（透明つき 512×640）に、差分の生成画像（白い地 1024×1280）の顔だけを楕円でぼかして重ねる
import sys, os, json
import numpy as np
from PIL import Image
E = {"magda": (254, 150, 54, 46), "marion": (256, 165, 62, 50), "tiria": (240, 165, 48, 40), "yurina": (254, 152, 44, 36)}
PICK = json.loads(sys.argv[1])   # {"magda": {"joy": "v_magda_joy_0.5.png", ...}, ...}
os.makedirs("out", exist_ok=True)
for w, moods in PICK.items():
    b = np.array(Image.open(f"{w}.webp").convert("RGBA")).astype(np.float32); H, W = b.shape[:2]
    cx, cy, rx, ry = E[w]; yy, xx = np.mgrid[:H, :W]
    e = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    m = np.clip((1 - e) * min(rx, ry) / 8, 0, 1) * (b[..., 3] > 250)
    Image.fromarray(b.astype(np.uint8), "RGBA").save(f"out/{w}.webp", "WEBP", quality=90, alpha_quality=100, method=6)
    for mood, f in moods.items():
        d = np.array(Image.open(f).convert("RGB").resize((W, H), Image.LANCZOS)).astype(np.float32)
        # 色合わせ：楕円の縁の帯で、差分の色を基本の色に寄せる（帯での平均の差を、楕円の中全体から引く）
        ring = (e > 0.75) & (e < 1.0) & (b[..., 3] > 250)
        diff = (d[ring] - b[ring, :3]); diff = diff[np.abs(diff).max(-1) < 40]
        if len(diff): d = np.clip(d - np.median(diff, 0), 0, 255)
        o = b.copy(); o[..., :3] = b[..., :3] * (1 - m[..., None]) + d * m[..., None]
        Image.fromarray(o.round().astype(np.uint8), "RGBA").save(f"out/{w}_{mood}.webp", "WEBP", quality=90, alpha_quality=100, method=6)
        print(w, mood)
