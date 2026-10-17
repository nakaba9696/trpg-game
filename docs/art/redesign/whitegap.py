# 透過した絵の箱の中で、ほぼ白で色みの無い不透明な塊（囲まれた白い地）を透明にする。縁は 1px なじませる
# 使い方：python whitegap.py in.webp out.webp x0,y0,x1,y1[;...] [white=236]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
a = np.array(Image.open(sys.argv[1]).convert("RGBA")); c = a[..., :3].astype(int)
thr = int(sys.argv[4]) if len(sys.argv) > 4 else 236
hb = np.zeros(a.shape[:2], bool)
for b in sys.argv[3].split(";"):
    x0, y0, x1, y1 = [int(v) for v in b.split(",")]; hb[y0:y1, x0:x1] = True
w = (c.min(-1) >= thr) & (c.max(-1) - c.min(-1) < 12) & (a[..., 3] > 0) & hb
lab, n = ndimage.label(w); sz = ndimage.sum(w, lab, range(1, n + 1))
rm = np.isin(lab, [j + 1 for j in range(n) if sz[j] >= 8])
e = ndimage.binary_dilation(rm, iterations=1) & ~rm & hb & (a[..., 3] > 0) & (c.min(-1) > 200)
o = a.copy(); o[rm, 3] = 0; o[rm, :3] = 0; o[e, 3] = (o[e, 3] * 0.5).astype(np.uint8)
Image.fromarray(o, "RGBA").save(sys.argv[2], "WEBP", quality=90, alpha_quality=100, method=6)
print(sys.argv[2], int(rm.sum()))
