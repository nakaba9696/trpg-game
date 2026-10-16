# 基本の絵に、差分の顔（目・眉・口・頬・前髪の下の方）だけを楕円でぼかして重ねる。透明は基本のまま
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
cx, cy, rx, ry, fe = [float(v) for v in sys.argv[1].split(",")]
b = np.array(Image.open("src/solenne.webp").convert("RGBA")).astype(np.float32)
H, W = b.shape[:2]; yy, xx = np.mgrid[:H, :W]
d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
m = np.clip((1 - d) * min(rx, ry) / fe, 0, 1)
os.makedirs("fp_out", exist_ok=True)
# 絆創膏（守る所）は基本から戻す：基本と差分の白い所を合わせた形＋縁 3px
def bandage(x):
    bw = (x[..., :3].min(-1) > 215) & (x[..., :3].max(-1) - x[..., :3].min(-1) < 9)
    bb = np.zeros((H, W), bool); bb[132:172, 260:300] = True
    lab, n = ndimage.label(bw & bb)
    if not n: return np.zeros((H, W), bool)
    sz = ndimage.sum(bw & bb, lab, range(1, n + 1))
    return ndimage.binary_fill_holes(ndimage.binary_closing(lab == int(np.argmax(sz)) + 1, iterations=3))
bb0 = bandage(b)
for v in sys.argv[2].split(","):
    a = np.array(Image.open(f"src/solenne_{v}.webp").convert("RGBA")).astype(np.float32)
    bm = ndimage.gaussian_filter(ndimage.binary_dilation(bb0 | bandage(a), iterations=3).astype(np.float32), 1)
    mm = (m * (1 - bm) * (a[..., 3] > 250) * (b[..., 3] > 250))[..., None]
    o = b.copy(); o[..., :3] = b[..., :3] * (1 - mm) + a[..., :3] * mm
    Image.fromarray(o.round().astype(np.uint8), "RGBA").save(f"fp_out/solenne_{v}.webp", "WEBP", quality=90, alpha_quality=100, method=6)
Image.fromarray((m * 255).astype(np.uint8)).save("fp_out/mask.png")
