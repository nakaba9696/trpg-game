"""背景透過の絵を確かめる道具（Python 3 + Pillow + numpy）。
使い方: python3 check_alpha.py <絵のフォルダ> [出力の一覧画像.jpg]
- 基本の絵（name.webp/png）と表情違い（name_<表情>.webp/png）を組にして、
  透け方の食い違い（片方だけ白い背景）と、形のずれ（アルファの IoU < 0.9）を表示する。
- 全部の絵を暗い地とマゼンタの地に置いた一覧画像を作る（目で拡大して確かめる用）。
"""
import os, re, sys
import numpy as np
from PIL import Image

d = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else "check_alpha.jpg"
fs = sorted(f for f in os.listdir(d) if f.lower().endswith((".webp", ".png")))
stem = lambda f: os.path.splitext(f)[0]
names = set(map(stem, fs))
def alpha(f): return np.array(Image.open(os.path.join(d, f)).convert("RGBA"))[..., 3]
def base_of(n):
    parts = n.split("_")
    for i in range(len(parts) - 1, 0, -1):
        b = "_".join(parts[:i])
        if b in names: return b
    return None
groups = {}
for f in fs:
    b = base_of(stem(f))
    if b: groups.setdefault(b, []).append(f)
ext = {stem(f): f for f in fs}
for b, vs in sorted(groups.items()):
    A = alpha(ext[b]); ta = (A < 16).mean()
    for v in vs:
        V = alpha(v); tv = (V < 16).mean()
        if (ta > 0.02) != (tv > 0.02): print(f"透け方が違う: {b} ({ta:.2f}) / {v} ({tv:.2f})")
        if A.shape != V.shape: print(f"大きさが違う: {b} / {v}"); continue
        a, c = A > 128, V > 128; iou = (a & c).sum() / max(1, (a | c).sum())
        if iou < 0.9: print(f"形がずれている: {v} IoU={iou:.3f}")
for f in fs:
    if (alpha(f) < 16).mean() <= 0.02: print(f"白い背景のまま（透明が無い）: {f}")
H = 260; tiles = []
for f in fs:
    im = Image.open(os.path.join(d, f)).convert("RGBA"); im.thumbnail((H, H))
    for bg in [(18, 18, 30), (230, 0, 200)]:
        t = Image.new("RGBA", (H, H), bg + (255,)); t.alpha_composite(im, ((H - im.width) // 2, (H - im.height) // 2)); tiles.append(t.convert("RGB"))
cols = 10; rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (cols * H, max(1, rows) * H), (60, 60, 60))
for i, t in enumerate(tiles): sheet.paste(t, ((i % cols) * H, (i // cols) * H))
sheet.save(out, quality=85); print("一覧:", out)
