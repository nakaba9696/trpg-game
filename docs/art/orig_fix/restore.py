# 差分の小さな所を基本の絵から戻す：箱（512×640 の座標）の中で、基本と差分の違う画素を中心に、縁をぼかして基本の画素を置く
# 使い方：python restore.py <基本> <差分> <出す所> x0,y0,x1,y1[,feather] [...]   （箱は ; で並べる。末尾に ,a を付けると箱の中を全部戻す）
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
b = np.array(Image.open(sys.argv[1]).convert("RGBA")).astype(np.float32)
d = np.array(Image.open(sys.argv[2]).convert("RGBA")).astype(np.float32)
H, W = b.shape[:2]; m = np.zeros((H, W), np.float32)
for spec in sys.argv[4].split(";"):
    p = spec.split(","); x0, y0, x1, y1 = [int(v) for v in p[:4]]; fe = int(p[4]) if len(p) > 4 and p[4] != "a" else 2
    box = np.zeros((H, W), bool); box[y0:y1, x0:x1] = True
    if "a" in p[4:]: sel = box
    else:
        diff = np.abs(b - d).max(-1) > 40
        sel = ndimage.binary_dilation(ndimage.binary_opening(diff & box, iterations=1), iterations=fe + 1) & box
    mm = ndimage.gaussian_filter(sel.astype(np.float32), fe / 2)
    mm[~box] = 0; m = np.maximum(m, mm)
m = m[..., None]
o = d * (1 - m) + b * m
Image.fromarray(o.round().astype(np.uint8), "RGBA").save(sys.argv[3], "WEBP", quality=92, alpha_quality=100, method=6)
print(sys.argv[3], int((m[..., 0] > 0.5).sum()))
