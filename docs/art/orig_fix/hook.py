# イルゼの右肩の、髪から飛び出した房（枝分かれ）と、浮いた小さな塊を消す
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    a = np.array(Image.open(src).convert("RGBA"))
    al = a[..., 3] > 40
    thin = al & ~ndimage.binary_dilation(ndimage.binary_opening(al, structure=np.ones((7, 7))), iterations=1)
    box = np.zeros(al.shape, bool); box[225:262, 366:392] = True
    rm = thin & box
    m = a[..., 3] > 20; lab, n = ndimage.label(m, structure=np.ones((3, 3))); sz = ndimage.sum(m, lab, range(1, n + 1))
    rm |= (lab > 0) & (lab != int(np.argmax(sz)) + 1)
    o = a.copy(); o[rm, 3] = 0
    Image.fromarray(o, "RGBA").save(dst, "WEBP", quality=92, alpha_quality=100, method=6)
    print(dst, int(rm.sum()), "hook left", int((o[228:252, 370:392, 3] > 40).sum()))
