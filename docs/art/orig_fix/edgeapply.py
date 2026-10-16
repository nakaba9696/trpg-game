# keyedge で作った基本の縁（マスクの所）を、差分にも同じように置く
# 使い方：python edgeapply.py <新しい基本.webp> <マスク.npy> <出す所> <差分.webp ...>
import sys, os
import numpy as np
from scipy import ndimage
from PIL import Image
nb = np.array(Image.open(sys.argv[1]).convert("RGBA")).astype(np.float32)
m = np.load(sys.argv[2])[..., None]; out = sys.argv[3]; os.makedirs(out, exist_ok=True)
for f in sys.argv[4:]:
    d = np.array(Image.open(f).convert("RGBA")).astype(np.float32)
    o = d * (1 - m) + nb * m
    # 縁のまわりでは、基本の外にはみ出した差分の画素（浮いた線）を消す
    R = ndimage.binary_dilation(m[..., 0] > 0.01, iterations=14)
    cap = ndimage.maximum_filter(nb[..., 3], size=3)
    o[..., 3] = np.where(R, np.minimum(o[..., 3], cap), o[..., 3])
    o[..., 3] = np.where(o[..., 3] < 3, 0, o[..., 3]); o[o[..., 3] == 0, :3] = 0
    Image.fromarray(o.round().clip(0, 255).astype(np.uint8), "RGBA").save(os.path.join(out, os.path.basename(f)), "WEBP", quality=92, alpha_quality=100, method=6)
    print(os.path.basename(f))
