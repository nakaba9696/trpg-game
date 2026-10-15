# ドレイゼの作り直し 2：画素を直接塗る部品（WebUI の venv で動かす）
#   eyes：白目を黒く、瞳を琥珀に（AnzhcEyes-seg で目の塊を探す）。片眼鏡のレンズの白い反射は残らない程度に
#   particles：体のまわりに漂う砂の粒（seed で決まる）。hairdust：髪の先から砂の粒がほどけて流れる
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mr"))
import face_gate as FG
import cv2

SAND = [(232, 210, 160), (214, 186, 128), (196, 162, 104), (240, 224, 186)]


def person_mask(im):
    a = np.array(im.convert("L")); fg = a < 238
    fg = ndimage.binary_fill_holes(ndimage.binary_closing(fg, iterations=4))
    lab, n = ndimage.label(fg); sz = ndimage.sum(fg, lab, range(1, n + 1))
    return lab == (int(np.argmax(sz)) + 1)


def eyes(im, box=(440, 120, 760, 440), amber=(214, 140, 40)):
    a = np.array(im.convert("RGB")).copy(); x0, y0, x1, y1 = box
    crop = Image.fromarray(a[y0:y1, x0:x1]).resize((1024, 1024), Image.BICUBIC)
    es = FG.eyes_of(crop); info = []
    for e in es:
        m = np.array(Image.fromarray((e["mask"] * 255).astype(np.uint8)).resize((x1 - x0, y1 - y0), Image.BILINEAR)) > 127
        m = ndimage.binary_dilation(m, iterations=2)
        sub = a[y0:y1, x0:x1].astype(np.float32)
        L = cv2.cvtColor(sub.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
        chroma = np.hypot(L[..., 1] - 128, L[..., 2] - 128)
        sclera = m & (L[..., 0] > 150) & (chroma < 22)
        iris = m & ~sclera & (L[..., 0] > 45) & (L[..., 0] <= 200) & (chroma >= 6)
        hl = m & (L[..., 0] > 235) & (chroma < 8)
        # 瞳を琥珀に（明るさは残す）
        if iris.any():
            lum = (sub[iris].mean(-1) / 255.0)[:, None]
            sub[iris] = np.clip(np.array(amber) * (0.45 + 0.9 * lum), 0, 255)
        # 白目を黒く（白い反射の小さな点は残す）
        big_hl = ndimage.binary_opening(hl, iterations=1)
        sc = sclera & ~(hl & ~big_hl)
        w = ndimage.gaussian_filter(sc.astype(np.float32), 0.6)[..., None]
        sub = sub * (1 - w) + np.array([22, 18, 20]) * w
        a[y0:y1, x0:x1] = np.clip(sub, 0, 255).astype(np.uint8)
        info.append({"box": [round(v) for v in e["box"]], "sclera_px": int(sc.sum()), "iris_px": int(iris.sum())})
    return Image.fromarray(a), info


def particles(im, seed, n=160, region=None, near=(15, 140), size=(2, 7)):
    rng = np.random.default_rng(seed); im = im.copy(); d = ImageDraw.Draw(im)
    pm = person_mask(im); dist = ndimage.distance_transform_edt(~pm)
    ys, xs = np.where((dist > near[0]) & (dist < near[1]) & (region if region is not None else True))
    for k in rng.choice(len(ys), min(n, len(ys)), replace=False):
        r = rng.uniform(*size) * (1.2 - dist[ys[k], xs[k]] / near[1] * 0.6); c = SAND[rng.integers(len(SAND))]
        x, y = xs[k], ys[k]
        if rng.random() < 0.3: d.ellipse([x - r * 1.8, y - r * 0.5, x + r * 1.8, y + r * 0.5], fill=c)   # 流れる筋
        else: d.ellipse([x - r / 2, y - r / 2, x + r / 2, y + r / 2], fill=c)
    return im


def hairdust(im, seed, box=(400, 0, 780, 200), n=140):
    """髪の外側の縁から、右上へ流れる砂の粒の帯"""
    H, W = im.size[1], im.size[0]; yy, xx = np.mgrid[:H, :W]
    reg = (xx > box[0]) & (xx < box[2]) & (yy > box[1]) & (yy < box[3])
    return particles(im, seed, n=n, region=reg, near=(2, 90), size=(2, 6))


if __name__ == "__main__":
    src, out, ops = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
    seed = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    im = Image.open(src).convert("RGB"); log = {}
    for op in ops:
        if op == "eyes": im, log["eyes"] = eyes(im)
        elif op == "particles": im = particles(im, seed); log["particles"] = seed
        elif op == "hairdust": im = hairdust(im, seed); log["hairdust"] = seed
    im.save(out); print(json.dumps(log))


def sandify(im, seed, rect=(30, 450, 270, 720), y0=560, y1=690):
    """手の肌を、下（手首）へ行くほど砂にする：砂の色と粒・縁がほどけて粒になって流れる"""
    rng = np.random.default_rng(seed); a = np.array(im.convert("RGB")).astype(np.float32); H, W = a.shape[:2]
    yy, xx = np.mgrid[:H, :W]; x0, ya, x1, yb = rect
    sel = (xx >= x0) & (xx < x1) & (yy >= ya) & (yy < yb)
    skin = sel & (a[..., 0] > 160) & (a[..., 0] - a[..., 2] > 20) & (a[..., 0] - a[..., 1] < 70) & (a[..., 1] > 110)
    t = np.clip((yy - y0) / (y1 - y0), 0, 1)
    t = t * (0.75 + 0.5 * ndimage.gaussian_filter(rng.random((H, W)), 3) * 1.0)
    t = np.clip(t, 0, 1)
    grain = rng.random((H, W)); noise = (rng.random((H, W)) - 0.5) * 40
    sandc = np.where(grain[..., None] < 0.33, np.array(SAND[0]), np.where(grain[..., None] < 0.66, np.array(SAND[1]), np.array(SAND[2]))).astype(np.float32) + noise[..., None]
    w = (skin * t)[..., None]
    a = a * (1 - w) + sandc * w
    # 縁がほどける：砂になった所の外側の縁の画素を一部消し、右下へ粒を流す
    sandy = skin & (t > 0.55)
    bg = (np.array(im.convert("L")) > 232)
    edge = sandy & ndimage.binary_dilation(bg, iterations=3)   # 外の白い地に接する縁だけ
    gone = edge & (rng.random((H, W)) < 0.5)
    a[gone] = [246, 246, 246]
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(out)
    ys, xs = np.where(edge)
    for k in rng.choice(len(ys), min(160, len(ys)), replace=False):
        dx, dy = rng.normal(18, 14), rng.normal(22, 18); r = rng.uniform(1.5, 4.5); c = SAND[rng.integers(len(SAND))]
        x, y = xs[k] + dx, ys[k] + dy; d.ellipse([x - r / 2, y - r / 2, x + r / 2, y + r / 2], fill=c)
    return out
