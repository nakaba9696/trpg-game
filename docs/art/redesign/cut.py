# 透過を抜く：birefnet-general の柔らかいマスク → 白い地を引いて縁の色を戻す → 透明度をかけたまま 512×640 に縮める
# 使い方：python cut.py src.png out.webp [mask_out.png]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
from rembg import new_session, remove
S = new_session("birefnet-general")
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
a = np.array(remove(im, session=S, only_mask=True, post_process_mask=False)).astype(np.float32) / 255
a[a < 0.04] = 0; a[a > 0.96] = 1
# 人物から離れた小さな塊（地面の砂・粒）を消す：いちばん大きい塊につながる所だけ
lab, n = ndimage.label(a > 0.5)
if n > 1:
    sz = ndimage.sum(np.ones_like(a), lab, range(1, n + 1)); big = lab == (int(np.argmax(sz)) + 1)
    near = ndimage.binary_dilation(big, iterations=6); a = np.where(near, a, 0)
c = np.array(im).astype(np.float32)
# 縁の色：白い地を引いて戻す（半透明の所）。戻した色が壊れる所は、いちばん近い不透明の色を使う
fg = (c - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 1e-3)
solid = a > 0.95; _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
bad = (a < 0.95) & ((fg < -10).any(-1) | (fg > 265).any(-1) | (a < 0.25))
fg = np.where(bad[..., None], c[iy, ix], np.clip(fg, 0, 255))
pm = np.dstack([fg * a[..., None], a * 255])
small = np.array(Image.fromarray(pm[..., :3].round().astype(np.uint8)).resize((512, 640), Image.LANCZOS)).astype(np.float32)
sa = np.array(Image.fromarray((a * 255).round().astype(np.uint8)).resize((512, 640), Image.LANCZOS)).astype(np.float32)
rgb = np.clip(small / np.maximum(sa[..., None] / 255, 1e-3), 0, 255); rgb[sa < 1] = 0
out = Image.fromarray(np.dstack([rgb, sa]).round().astype(np.uint8), "RGBA")
out.save(dst, "WEBP", quality=90, alpha_quality=100, method=6)
if len(sys.argv) > 3: Image.fromarray((a * 255).astype(np.uint8)).save(sys.argv[3])
print(dst)
