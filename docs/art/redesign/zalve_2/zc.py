# A〜D を部品から組む（WebUI の venv）
import json, numpy as np
from PIL import Image
from scipy import ndimage
import zp
B = np.array(Image.open("zalve_15121.png").convert("RGB")).astype(int)
DARK = ndimage.binary_dilation(B.mean(-1) < 110, iterations=2)
def layer(base, part, keepdark=False):
    """part が基本と違う所だけ base に重ねる（keepdark：基本の暗い服の所は触らない）"""
    p = np.array(Image.open(part).convert("RGB")).astype(int); diff = np.abs(p - B).max(-1) > 6
    if keepdark: diff &= ~DARK
    diff = ndimage.binary_dilation(ndimage.binary_opening(diff, iterations=1), iterations=3)
    w = ndimage.gaussian_filter(diff.astype(float), 1.2)[..., None]
    return Image.fromarray(np.clip(np.array(base).astype(int) * (1 - w) + p * w, 0, 255).astype(np.uint8))
H, W = 1280, 1024; yy, xx = np.mgrid[:H, :W]
hem = (yy > 1060)
rec = {}
im = zp.sandify(Image.fromarray(B.astype(np.uint8)), 1); im, e = zp.eyes(im); im.save("cand_A.png"); rec["A"] = "帳簿を持つ手の手首から先が砂になって崩れる（画素で描いた）＋黒い白目と琥珀の瞳"
im = Image.open("zi_K_15222.png").convert("RGB"); im = zp.hairdust(im, 21, n=120); im = zp.particles(im, 22, n=110, region=hem, near=(2, 70)); im.save("cand_B.png"); rec["B"] = "顔と首のひび（zi_K_15222）＋髪の先と裾から砂がほどける"
im = zp.sandify(Image.open("zi_K_15221.png").convert("RGB"), 2, y0=500, y1=640); im, e = zp.eyes(im); im = zp.particles(im, 41, n=90, near=(10, 90)); im.save("cand_C.png"); rec["C"] = "顔と首のひび（inpaint・zi_K_15221）＋手が砂になって崩れる（強め）＋黒い白目と琥珀の瞳＋まわりの砂の粒"
im, e = zp.eyes(Image.fromarray(B.astype(np.uint8))); im = zp.particles(im, 31, n=200, near=(10, 120)); im.save("cand_D.png"); rec["D"] = "黒い白目と琥珀の瞳＋体のまわりに漂う砂の粒（顔は人に近い）"
json.dump(rec, open("cand.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
