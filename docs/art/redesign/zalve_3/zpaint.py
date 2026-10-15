# ドレイゼの作り直し 3 の下塗り：候補 1 の上に、異質な形を大まかに塗る（この下塗りを高い denoise の img2img で描き直す）
import numpy as np, math, sys
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
SAND = [(226, 200, 150), (206, 176, 122), (186, 152, 100), (238, 220, 180), (170, 136, 88)]
rng = np.random.default_rng(5)
B = Image.open("zalve_clean.png").convert("RGB"); W, H = B.size
# 液体のような筋は、zalve_clean.png（zbase.py）で消してある


def grains(d, n, box, r=(2, 6)):
    for _ in range(n):
        x, y = rng.uniform(box[0], box[2]), rng.uniform(box[1], box[3]); rr = rng.uniform(*r); c = SAND[rng.integers(len(SAND))]
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=c)


def sandfill(im, mask, scale=1.2):
    a = np.array(im).astype(np.float32); n = ndimage.gaussian_filter(rng.random(a.shape[:2]), scale)
    n = (n - n.min()) / (n.max() - n.min() + 1e-6); pal = np.array(SAND, np.float32)
    idx = np.clip((n * len(SAND)).astype(int), 0, len(SAND) - 1); col = pal[idx] + (rng.random(a.shape[:2])[..., None] - 0.5) * 30
    m = mask[..., None].astype(np.float32); a = a * (1 - m) + col * m
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def v1():   # 腰から下が砂の渦になって床へ崩れる
    im = B.copy(); yy, xx = np.mgrid[:H, :W]
    edge = 900 + 30 * np.sin(xx / 45.0)
    person = np.array(B.convert("L")) < 235
    m = (yy > edge) & ndimage.binary_dilation(person, iterations=8)
    im = sandfill(im, m)
    d = ImageDraw.Draw(im)
    for k in range(9):   # 渦の弧
        cx, cy = 560, 1230; rx, ry = 120 + k * 45, 30 + k * 12
        d.arc([cx - rx, cy - ry, cx + rx, cy + ry], 200 + k * 10, 340 + k * 15, fill=SAND[k % 5], width=10)
    grains(d, 700, (180, 820, 960, 1280)); grains(d, 250, (300, 700, 900, 900), (1, 3))
    return im


def v2():   # 顔の片側（本人の左＝絵の右）が砂の仮面のように乾いて崩れる
    im = B.copy(); yy, xx = np.mgrid[:H, :W]; a = np.array(B).astype(int)
    skin = (np.abs(a - [245, 214, 190]).max(-1) < 60) | (np.abs(a - [225, 185, 160]).max(-1) < 50)
    half = (xx > 598) & (yy > 150) & (yy < 400) & skin & (xx < 720)
    half = ndimage.binary_closing(half, iterations=3)
    im = sandfill(im, half, 1.5); d = ImageDraw.Draw(im)
    for _ in range(22):   # ひび（暗い）
        x, y = rng.uniform(600, 690), rng.uniform(160, 390); L = rng.uniform(15, 50); t = rng.uniform(0, 6.28)
        d.line([x, y, x + L * math.cos(t), y + L * math.sin(t)], fill=(96, 70, 46), width=3)
    for _ in range(10):   # 欠けて中が暗い穴
        x, y = rng.uniform(650, 705), rng.uniform(190, 380); r = rng.uniform(7, 16)
        d.polygon([(x + r * math.cos(t) * rng.uniform(0.7, 1.2), y + r * math.sin(t) * rng.uniform(0.7, 1.2)) for t in np.linspace(0, 6.28, 7)], fill=(60, 44, 32))
    grains(d, 500, (640, 250, 820, 700), (2, 5))
    return im


def v3():   # 片腕（本人の左＝絵の右）の袖の中が空で、砂が腕と手の形を作る
    im = B.copy(); d = ImageDraw.Draw(im)
    d.rectangle([780, 1060, 1024, 1280], fill=(246, 246, 246))   # 袖口から下を消す
    d.rectangle([820, 960, 980, 1080], fill=(246, 246, 246))
    poly = [(830, 960), (960, 950), (985, 1080), (950, 1200), (900, 1270), (850, 1250), (840, 1150)]
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).polygon(poly, fill=255)
    for k in range(4):   # 指
        ImageDraw.Draw(m).ellipse([845 + k * 25, 1225, 865 + k * 25, 1280], fill=255)
    im = sandfill(im, np.array(m) > 0, 2); d = ImageDraw.Draw(im)
    d.polygon([(800, 900), (1000, 880), (1010, 980), (810, 990)], fill=(60, 52, 50))   # 空の袖口（暗い穴）
    grains(d, 500, (760, 900, 1024, 1280))
    return im


def v4():   # 背後の大きな影に角がある（体には重ねない）
    im = B.copy(); sh = Image.new("L", (W, H), 0); d = ImageDraw.Draw(sh)
    d.ellipse([560, 60, 1000, 640], fill=255)   # 頭と肩の影
    d.polygon([(640, 160), (560, -40), (700, 120)], fill=255); d.polygon([(900, 160), (1010, -40), (860, 120)], fill=255)   # 角
    d.rectangle([600, 500, 1024, 1280], fill=255)
    sh = sh.filter(ImageFilter.GaussianBlur(4))
    person = np.array(B.convert("L")) < 235; person = ndimage.binary_dilation(ndimage.binary_fill_holes(person), iterations=6)
    a = np.array(im).astype(np.float32); s = np.array(sh).astype(np.float32)[..., None] / 255 * (~person)[..., None]
    a = a * (1 - s * 0.55) + np.array([70, 62, 70]) * s * 0.55
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


for k, f in {"1": v1, "2": v2, "3": v3, "4": v4}.items():
    f().save(f"zp_{k}.png")
print("ok")
