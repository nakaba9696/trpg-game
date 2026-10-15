# 人の姿の透過：sig/cut.py と同じ。そのうえで、頭の右後ろの鎖の輪の中に閉じ込められた白い地を透明にする
import sys, numpy as np
from PIL import Image
from scipy import ndimage
from rembg import new_session, remove
S = new_session("birefnet-general")
im = Image.open(sys.argv[1]).convert("RGB"); c = np.array(im).astype(np.float32); H, W = c.shape[:2]; yy, xx = np.mgrid[:H, :W]
a = np.array(remove(im, session=S, only_mask=True, post_process_mask=False)).astype(np.float32) / 255
a[a < 0.04] = 0; a[a > 0.96] = 1
# 鎖の輪の中（頭の左手前の白い地）：箱の中の、地の色に近い所を透明に
lens = ((xx - 515) / 40.0) ** 2 + ((yy - 245) / 36.0) ** 2 < 1
box = (((xx > 420) & (xx < 500) & (yy > 150) & (yy < 390)) | ((xx > 190) & (xx < 320) & (yy > 500) & (yy < 760))) & ~lens
hole = box & (c.min(-1) > 236) & (np.abs(c - c[30, 30]).max(-1) < 9)
hole = ndimage.binary_dilation(ndimage.binary_opening(hole, iterations=1), iterations=1) & box & (c.min(-1) > 200)
a[hole] = 0
lab, n = ndimage.label(a > 0.5)
if n > 1:
    sz = ndimage.sum(np.ones_like(a), lab, range(1, n + 1)); big = lab == (int(np.argmax(sz)) + 1)
    near = ndimage.binary_dilation(big, iterations=6); a = np.where(near, a, 0)
if len(sys.argv) > 3:   # 描き足した砂の粒は不透明に（地の上に落ちる粒も残す）
    cl = np.array(Image.open(sys.argv[3]).convert("RGB")).astype(np.float32)
    grain = np.abs(c - cl).max(-1) > 12
    a = np.where(grain, 1.0, a)
fg = (c - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 1e-3)
solid = a > 0.95; _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
bad = (a < 0.95) & ((fg < -10).any(-1) | (fg > 265).any(-1) | (a < 0.25))
fg = np.where(bad[..., None], c[iy, ix], np.clip(fg, 0, 255))
small = np.array(Image.fromarray((fg * a[..., None]).round().astype(np.uint8)).resize((512, 640), Image.LANCZOS)).astype(np.float32)
sa = np.array(Image.fromarray((a * 255).round().astype(np.uint8)).resize((512, 640), Image.LANCZOS)).astype(np.float32)
rgb = np.clip(small / np.maximum(sa[..., None] / 255, 1e-3), 0, 255); rgb[sa < 1] = 0
Image.fromarray(np.dstack([rgb, sa]).round().astype(np.uint8), "RGBA").save(sys.argv[2], "WEBP", quality=90, alpha_quality=100, method=6)
print(sys.argv[2], int(hole.sum()))
