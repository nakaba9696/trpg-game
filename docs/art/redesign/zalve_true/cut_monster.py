# 魔物の姿の透過：birefnet-general の柔らかいマスク。白い霧の板（薄い半透明の明るい所）を落とし、縁の色を戻して 512×512 に
import sys, numpy as np
from PIL import Image
from scipy import ndimage
from rembg import new_session, remove
S = new_session("birefnet-general")
im = Image.open(sys.argv[1]).convert("RGB"); c = np.array(im).astype(np.float32)
if len(sys.argv) > 4:   # 縮めて置き直した絵：マスクは元の絵から取り、同じ形に縮めて置く。上の余白の描き足し（角の先）は暗い所をそのまま
    orig = Image.open(sys.argv[4]).convert("RGB"); kk = float(sys.argv[5]); Sz = im.size[0]; ww = int(Sz * kk)
    mo = remove(orig, session=S, only_mask=True, post_process_mask=False).resize((ww, ww), Image.LANCZOS)
    mm = Image.new("L", im.size, 0); mm.paste(mo, ((Sz - ww) // 2, Sz - ww))
    a = np.array(mm).astype(np.float32) / 255
    yy = np.arange(Sz)[:, None]
    tips = (yy < Sz - ww + 4) & (c.mean(-1) < 200)
    a = np.where(tips, 1.0, a)
else:
    a = np.array(remove(im, session=S, only_mask=True, post_process_mask=False)).astype(np.float32) / 255
L = c.mean(-1)
a = np.where((L > 225) & (a < 0.85), a * np.clip((255 - L) / 30, 0, 1), a)   # 明るい霧の板は薄く
a[a < 0.05] = 0; a[a > 0.96] = 1
lab, n = ndimage.label(a > 0.4)
if n > 1:
    sz = ndimage.sum(np.ones_like(a), lab, range(1, n + 1)); big = lab == (int(np.argmax(sz)) + 1)
    a = np.where(ndimage.binary_dilation(big, iterations=12), a, 0)
# 体の中は不透明に。ぼかしは体の外の細い帯（16px）だけ
core = ndimage.binary_fill_holes(ndimage.binary_opening(a > 0.5, iterations=2))
dist = ndimage.distance_transform_edt(~core)
a = np.where(core, 1.0, a * np.clip(1 - dist / 16, 0, 1))
# 縁の白い光：透明に接する明るく色の薄い所を落とす
edge = ndimage.binary_dilation(a < 0.1, iterations=8) & (a > 0)
chroma = c.max(-1) - c.min(-1)
a = np.where(edge & (((L > 200) & (chroma < 40)) | (L > 222)), 0, a)
edge2 = ndimage.binary_dilation(a < 0.1, iterations=6) & (a > 0)
a = np.where(edge2 & (L > 178) & (chroma < 60), 0, a)
a = ndimage.gaussian_filter(a, 0.7) * (a > 0)
solid = a > 0.95; _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
fg = (c - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 1e-3)
bad = (a < 0.95) & ((fg < -10).any(-1) | (fg > 265).any(-1) | (a < 0.3))
fg = np.where(bad[..., None], c[iy, ix], np.clip(fg, 0, 255))
N = int(sys.argv[3]) if len(sys.argv) > 3 else 512
pm = Image.fromarray((fg * a[..., None]).round().astype(np.uint8)).resize((N, N), Image.LANCZOS)
sa = np.array(Image.fromarray((a * 255).round().astype(np.uint8)).resize((N, N), Image.LANCZOS)).astype(np.float32)
rgb = np.clip(np.array(pm).astype(np.float32) / np.maximum(sa[..., None] / 255, 1e-3), 0, 255); rgb[sa < 1] = 0
Image.fromarray(np.dstack([rgb, sa]).round().astype(np.uint8), "RGBA").save(sys.argv[2], "WEBP", quality=88, alpha_quality=100, method=6)
print(sys.argv[2])
