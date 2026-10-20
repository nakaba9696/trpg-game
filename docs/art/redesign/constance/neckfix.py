# コンスタンスの首の右：あごの線より下で、首の線より右の、白く色みの無い所を透明にする
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
for f in sys.argv[1:]:
    a = np.array(Image.open(f).convert("RGBA")); c = a[..., :3].astype(int)
    H, W = a.shape[:2]; yy, xx = np.mgrid[:H, :W]
    # あごの線 (299,195)-(270,226) より下（外側）
    x1, y1, x2, y2 = 299, 195, 270, 226
    below = ((x2 - x1) * (yy - y1) - (y2 - y1) * (xx - x1)) < -40
    box = (xx >= 272) & (xx <= 295) & (yy >= 198) & (yy <= 240)
    w = (c.min(-1) >= 225) & (c.max(-1) - c.min(-1) < 14) & (a[..., 3] > 0)
    rm = box & below & w
    lab, n = ndimage.label(rm); sz = ndimage.sum(rm, lab, range(1, n + 1))
    rm = np.isin(lab, [j + 1 for j in range(n) if sz[j] >= 6])
    e = ndimage.binary_dilation(rm, iterations=1) & ~rm & box & below & (c.min(-1) > 200) & (a[..., 3] > 0)
    a[rm, 3] = 0; a[rm, :3] = 0; a[e, 3] = (a[e, 3] * 0.5).astype(np.uint8)
    Image.fromarray(a, "RGBA").save(f, "WEBP", quality=90, alpha_quality=100, method=6)
    print(f, int(rm.sum()))
