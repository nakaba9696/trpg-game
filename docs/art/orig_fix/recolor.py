# 差分の物（髪留めなど）の色だけを基本の物の色に寄せる：箱の中の、色みのある画素（彩度＞thr）を物とみなし、明るさの順位で基本の物の色に置き換える
# 使い方：python recolor.py <基本> <差分> <出す所> x0,y0,x1,y1(基本の物の箱) x0,y0,x1,y1(差分の物の箱) [thr]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
b = np.array(Image.open(sys.argv[1]).convert("RGBA")).astype(np.float32)
d = np.array(Image.open(sys.argv[2]).convert("RGBA")).astype(np.float32)
thr = float(sys.argv[6]) if len(sys.argv) > 6 else 40
def sel(a, bx):
    x0, y0, x1, y1 = [int(v) for v in bx.split(",")]
    m = np.zeros(a.shape[:2], bool); m[y0:y1, x0:x1] = True
    c = a[..., :3]; sat = c.max(-1) - c.min(-1)
    return m & (sat > thr) & (a[..., 3] > 200) & (c[..., 2] - c[..., 0] > thr)
mb, md = sel(b, sys.argv[4]), sel(d, sys.argv[5])
# 差分の物は大きな塊だけ（髪の青い影を拾わない）
lab, n = ndimage.label(md); sz = ndimage.sum(md, lab, range(1, n + 1))
md = np.isin(lab, [j + 1 for j in range(n) if sz[j] >= max(40, 0.15 * sz.max())])
md = ndimage.binary_fill_holes(md)
lum = lambda c: c @ np.array([0.299, 0.587, 0.114], np.float32)
cb = b[..., :3][mb]; lb = lum(cb); order = np.argsort(lb); cb = cb[order]; lb = lb[order]
ld = lum(d[..., :3][md])
# 明るさの順位で写す
rank = np.argsort(np.argsort(ld)) / max(len(ld) - 1, 1)
new = cb[(rank * (len(cb) - 1)).round().astype(int)]
o = d.copy(); o[..., :3][md] = new
# 縁の 1px は半分だけ混ぜる
edge = ndimage.binary_dilation(md, iterations=1) & ~md & (o[..., 3] > 0)
print("base px", int(mb.sum()), "diff px", int(md.sum()))
Image.fromarray(o.round().clip(0, 255).astype(np.uint8), "RGBA").save(sys.argv[3], "WEBP", quality=92, alpha_quality=100, method=6)
