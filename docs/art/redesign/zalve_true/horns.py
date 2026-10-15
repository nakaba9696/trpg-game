# 魔物の姿：0.86 倍に縮めて下寄せに置き、上の端で切れた角の先を、切れ口から細くとがらせて描き足す
import numpy as np
from PIL import Image, ImageDraw
src = Image.open("m_a_15408.png").convert("RGB"); S = 1024; k = 0.86; w = int(S * k)
sm = src.resize((w, w), Image.LANCZOS); a = np.array(sm).astype(int)
top = np.median(np.array(src)[0:4].reshape(-1, 3), 0)
canvas = Image.new("RGB", (S, S), tuple(int(v) for v in np.median(np.array(src)[:, :6].reshape(-1, 3), 0)))
x0, y0 = (S - w) // 2, S - w
# 上の余白は、元の絵の上の端の行を上へ伸ばした色（光のにじみをつなぐ）
canvas = Image.new("RGB", (S, S), (246, 246, 246))
canvas.paste(sm, (x0, y0))
d = ImageDraw.Draw(canvas)
dark = a[2].mean(-1) < 175; runs = []; i = 0
while i < w:
    if dark[i]:
        j = i
        while j < w and dark[j]: j += 1
        if 8 < j - i < 90 and 0.25 * w < (i + j) / 2 < 0.75 * w: runs.append((i, j))
        i = j
    else: i += 1
print(runs)
cx_mid = w / 2
for (l, r) in runs:
    L, R = x0 + l, x0 + r; mid = (L + R) / 2; out = -1 if mid < x0 + cx_mid else 1
    H = 125; tip = (mid + out * 30, y0 - H)
    # 切れ口の色の中央値（角の本体）・縁の線
    col = tuple(int(v) for v in np.median(a[2:6, l:r].reshape(-1, 3), 0))
    # 少し外へ反った形：左右の辺を、切れ口からとがった先へ
    pl = [(L, y0 + 2), (L + out * 6 - 2, y0 - H * 0.45), (tip[0] - out * 4, tip[1] + 18), tip]
    pr = [tip, (tip[0] + 2, tip[1] + 22), (R + out * 10, y0 - H * 0.5), (R, y0 + 2)]
    d.polygon(pl + pr, fill=col)
    d.line(pl + pr, fill=(14, 12, 12), width=3, joint="curve")
    d.line([(mid - out * 3, y0), (mid + out * 14, y0 - H * 0.6)], fill=tuple(min(255, c + 40) for c in col), width=3)   # つやの線
canvas.save("mh.png")
canvas.crop((150, 0, 874, 340)).save("zt.png")
