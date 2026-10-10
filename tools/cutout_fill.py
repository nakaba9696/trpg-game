"""切り抜いた絵に残った背景の区画を、手で指定した点からの塗りつぶしで抜く（髪の房と首の間・腕と髪の間など）。

白い服や肌と背景の白は機械では見分けにくいので、抜く区画の中の点を 1 枚ずつ目で選び、その点から
色の近い画素を線画で止まるまで広げ、その区画を透明にする。広がりすぎないよう、点ごとに四角で範囲を区切る。

使い方（cutout の venv の Python で。リポジトリの根で）：
  <venv>/python tools/cutout_fill.py --src <フォルダ> --out <出すフォルダ> --at "x,y,x0,y0,x1,y1;…" id1 id2 …
    x,y は区画の中の点、x0,y0,x1,y1 はその区画が収まる四角（512×640 の座標）。; で区切って幾つでも
  --tol（点の色との差。既定 18）・--preview <フォルダ>（抜く所を赤で塗った絵）
表情の差分は同じ場所なので、同じ --at で一緒に直せる（点の色が背景でない差分は飛ばす）。
"""
import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage

MAXKB = {"portraits": 80, "monsters": 60}


def region(arr, x, y, box, tol):
    rgb = arr[..., :3].astype(np.float32)
    alpha = arr[..., 3]
    seed = rgb[y, x]
    if seed.min() < 200 or alpha[y, x] == 0:
        return None  # 点が背景の色でない（この差分では区画が無いか、ずれている）
    x0, y0, x1, y1 = box
    m = np.zeros(alpha.shape, bool)
    m[y0:y1, x0:x1] = (np.abs(rgb[y0:y1, x0:x1] - seed).max(axis=2) <= tol) & (alpha[y0:y1, x0:x1] > 0)
    lab, _ = ndimage.label(m)
    k = lab[y, x]
    if k == 0:
        return None
    r = lab == k
    # 区画の縁の、白と線の混ざった画素も 1 画素だけ含める
    pale = (rgb.min(axis=2) >= 170) & (alpha > 0)
    return r | (ndimage.binary_dilation(r) & pale)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", default="")
    ap.add_argument("--preview", default="")
    ap.add_argument("--kind", default="portraits", choices=list(MAXKB))
    ap.add_argument("--at", required=True)
    ap.add_argument("--tol", type=float, default=18)
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    pts = [tuple(int(v) for v in s.split(",")) for s in a.at.split(";")]
    for i in a.ids:
        im = Image.open(os.path.join(a.src, i + ".webp")).convert("RGBA")
        arr = np.array(im)
        h = np.zeros(arr.shape[:2], bool)
        miss = 0
        for x, y, *box in pts:
            r = region(arr, x, y, box, a.tol)
            if r is None:
                miss += 1
            else:
                h |= r
        print(f"{i}: {int(h.sum())} 画素" + (f"（点 {miss} 個は背景の色でなく飛ばした）" if miss else ""), flush=True)
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            back = Image.new("RGBA", im.size, (20, 30, 90, 255))
            back.alpha_composite(im)
            p = np.array(back)
            p[h] = (255, 0, 0, 255)
            Image.fromarray(p).save(os.path.join(a.preview, i + ".png"))
        if a.out:
            os.makedirs(a.out, exist_ok=True)
            soft = ndimage.gaussian_filter(h.astype(np.float32), 0.7)
            soft[h] = 1.0
            arr[..., 3] = (arr[..., 3] * (1 - soft)).astype(np.uint8)
            arr[arr[..., 3] == 0, :3] = 0
            dst = os.path.join(a.out, i + ".webp")
            for q in (88, 84, 80, 76, 72, 68):
                Image.fromarray(arr, "RGBA").save(dst, "WEBP", quality=q, method=6, alpha_quality=90)
                if os.path.getsize(dst) <= MAXKB[a.kind] * 1024:
                    break


if __name__ == "__main__":
    main()
