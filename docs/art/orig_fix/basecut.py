# 背景が抜けていない基本の絵（RGB・白い地）を抜く（IMG-52）：birefnet-general の柔らかいマスク → 白い地を引いて縁の色を戻す。大きさはそのまま
import sys, numpy as np
from PIL import Image
from scipy import ndimage
from rembg import new_session, remove
S = new_session("birefnet-general")
src, out = sys.argv[1], sys.argv[2]
for n in sys.argv[3:]:
    im = Image.open(f"{src}/{n}.webp").convert("RGB"); c = np.array(im).astype(np.float32)
    bgc = np.median(np.concatenate([c[:4].reshape(-1, 3), c[-4:].reshape(-1, 3), c[:, :4].reshape(-1, 3), c[:, -4:].reshape(-1, 3)]), 0)
    a = np.array(remove(im, session=S, only_mask=True, post_process_mask=False)).astype(np.float32) / 255
    a[a < 0.04] = 0; a[a > 0.96] = 1
    lab, k = ndimage.label(a > 0.5)
    if k > 1:
        sz = ndimage.sum(np.ones_like(a), lab, range(1, k + 1)); big = sz >= 0.02 * sz.max()
        keep = np.isin(lab, [j + 1 for j in range(k) if big[j]]); a = np.where(ndimage.binary_dilation(keep, iterations=4), a, 0)
    fg = (c - (1 - a[..., None]) * bgc) / np.maximum(a[..., None], 1e-3)
    solid = a > 0.95; _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    bad = (a < 0.95) & ((fg < -10).any(-1) | (fg > 265).any(-1) | (a < 0.25))
    fg = np.where(bad[..., None], c[iy, ix], np.clip(fg, 0, 255))
    o = np.dstack([fg, a * 255]).round().astype(np.uint8); o[a == 0, :3] = 0
    Image.fromarray(o, "RGBA").save(f"{out}/{n}.webp", "WEBP", quality=90, alpha_quality=100, method=6)
    print(n, round(float((a < 0.5).mean()), 3), flush=True)
