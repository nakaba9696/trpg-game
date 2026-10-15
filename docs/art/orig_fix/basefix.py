# 基本の絵の直し（2026-10-15 持ち主の確認の反映）
#   fill：顔の箱の中の、外とつながらない透けた所（絆創膏・歯・白目）を不透明にする（IMG-36）。色は、ある程度不透明ならその色、ほぼ透明ならまわりの不透明の色
#   strands：輪郭から細く飛び出した毛（枝毛）を消す（5×5 の開きで残らない、細い所）
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
F = json.load(open(os.path.join(HERE, "faces.json")))


def fill(a, box, thr=250):
    x0, y0, x1, y1 = [int(v) for v in box[:4]]; H, W = a.shape[:2]
    low = a[..., 3] < thr; lab, n = ndimage.label(low)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m = np.zeros((H, W), bool)
    for j in range(1, n + 1):
        if j in border: continue
        ys, xs = np.where(lab == j)
        if ys.min() >= y0 and ys.max() <= y1 and xs.min() >= x0 and xs.max() <= x1: m |= lab == j
    if not m.any(): return a, 0
    solid = (a[..., 3] >= thr) & ~m; _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    w = np.clip((a[..., 3].astype(np.float32) - 40) / 160, 0, 1)[..., None]
    col = a[..., :3] * w + a[iy, ix, :3] * (1 - w)
    a = a.copy(); a[m, :3] = col[m].round().astype(np.uint8); a[m, 3] = 255
    return a, int(m.sum())


def fillrgb(a, box):
    """囲まれた透明の所を、そこに残っている色のまま不透明にする（目の絵が残っている人）"""
    x0, y0, x1, y1 = [int(v) for v in box[:4]]
    low = a[..., 3] < 250; lab, n = ndimage.label(low)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m = np.zeros(low.shape, bool)
    for j in range(1, n + 1):
        if j in border: continue
        ys, xs = np.where(lab == j)
        if ys.min() >= y0 and ys.max() <= y1 and xs.min() >= x0 and xs.max() <= x1 and len(ys) < 600: m |= lab == j
    a = a.copy(); a[m, 3] = 255
    return a, int(m.sum())


def recut(a):
    """白い地に置いてから、birefnet-general で抜き直す（髪の抜けの直し）"""
    from rembg import new_session, remove
    from PIL import Image as _I
    im = _I.fromarray(a, "RGBA"); bg = _I.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im); w = bg.convert("RGB"); c = np.array(w).astype(np.float32)
    al = np.array(remove(w, session=new_session("birefnet-general"), only_mask=True, post_process_mask=False)).astype(np.float32) / 255
    al[al < 0.04] = 0; al[al > 0.96] = 1
    fg = (c - (1 - al[..., None]) * 255) / np.maximum(al[..., None], 1e-3)
    solid = al > 0.95; _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    bad = (al < 0.95) & ((fg < -10).any(-1) | (fg > 265).any(-1) | (al < 0.25))
    fg = np.where(bad[..., None], c[iy, ix], np.clip(fg, 0, 255))
    return np.dstack([fg, al * 255]).round().astype(np.uint8), int((al > 0.5).sum())


def strands(a):
    al = a[..., 3] > 40
    core = ndimage.binary_dilation(ndimage.binary_opening(al, structure=np.ones((5, 5))), iterations=1)
    thin = al & ~core
    a = a.copy(); a[thin, 3] = 0
    edge = ndimage.binary_dilation(thin, iterations=1) & ~thin & al   # つけ根を少しなじませる
    a[edge, 3] = (a[edge, 3] * 0.6).astype(np.uint8)
    return a, int(thin.sum())


if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    for spec in sys.argv[3:]:
        i, ops = spec.split(":"); ops = set(ops.split("+"))
        a = np.array(Image.open(f"{src}/{i}.webp").convert("RGBA")); rep = {}
        box = F[f"H:/game/trpg-moods/assets/portraits/{i}.webp"][0]
        bw, bh = box[2] - box[0], box[3] - box[1]
        if "fill" in ops: a, rep["fill"] = fill(a, [box[0] - 0.1 * bw, box[1] - 0.1 * bh, box[2] + 0.1 * bw, box[3] + 0.25 * bh])
        if "strands" in ops: a, rep["strands"] = strands(a)
        if "fillrgb" in ops: a, rep["fillrgb"] = fillrgb(a, box)
        if "recut" in ops: a, rep["recut"] = recut(a)
        Image.fromarray(a, "RGBA").save(f"{out}/{i}.webp", "WEBP", quality=92, alpha_quality=100, method=6)
        print(i, rep)
