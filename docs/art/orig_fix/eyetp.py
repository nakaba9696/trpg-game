# 基本の目を差分に移す：目のまわりの楕円（基本の座標）を、差分の同じ所に最も合うずらし（±sh px）を探してから、縁をぼかして置く
# 使い方：python eyetp.py <基本> <差分> <出す所> cx,cy,rx,ry[;...] [sh=6] [feather=2]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
b = np.array(Image.open(sys.argv[1]).convert("RGBA")).astype(np.float32)
d = np.array(Image.open(sys.argv[2]).convert("RGBA")).astype(np.float32)
sh = int(sys.argv[5]) if len(sys.argv) > 5 else 6
fe = float(sys.argv[6]) if len(sys.argv) > 6 else 2
H, W = b.shape[:2]; yy, xx = np.mgrid[:H, :W]
g = lambda a: a[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)
gb, gd = g(b), g(d)
o = d.copy()
for spec in sys.argv[4].split(";"):
    cx, cy, rx, ry = [float(v) for v in spec.split(",")]
    # 合わせ：目のまわり（楕円の 1.8 倍の箱）の明るさ
    x0, x1, y0, y1 = int(cx - 1.8 * rx), int(cx + 1.8 * rx), int(cy - 1.8 * ry), int(cy + 1.8 * ry)
    pb = gb[y0:y1, x0:x1]; pb = (pb - pb.mean()) / (pb.std() + 1e-3)
    best = (-9, 0, 0)
    for dy in range(-sh, sh + 1):
        for dx in range(-sh, sh + 1):
            pd = gd[y0 + dy:y1 + dy, x0 + dx:x1 + dx]; pd = (pd - pd.mean()) / (pd.std() + 1e-3)
            s = float((pb * pd).mean())
            if s > best[0]: best = (s, dx, dy)
    s, dx, dy = best
    e = np.sqrt(((xx - cx - dx) / rx) ** 2 + ((yy - cy - dy) / ry) ** 2)
    m = np.clip((1 - e) * min(rx, ry) / fe, 0, 1)[..., None]
    sb = np.roll(np.roll(b, dy, 0), dx, 1)
    o = o * (1 - m) + sb * m
    print(f"eye {cx},{cy} shift {dx},{dy} score {s:.2f}")
Image.fromarray(o.round().clip(0, 255).astype(np.uint8), "RGBA").save(sys.argv[3], "WEBP", quality=92, alpha_quality=100, method=6)
