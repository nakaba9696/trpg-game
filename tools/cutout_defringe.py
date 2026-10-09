"""切り抜いた絵の縁に残る白いふち（白い背景がにじんだ縁・毛先）を消す。

透明な所から band 画素以内の縁の画素のうち、内側（縁から band 画素より奥）のいちばん近い画素より明るいものを、
その内側の色に塗り直す（白に引っ張られた色を取り除く）。線画の外側に付いた白い輪は透明にする。いちばん外の 1 画素は透明度を下げて、縁を細く削る。
暗い背景（黒・紺）の上で白い線に見えていた縁が、絵の色になる。白い髪・白い服の縁は、内側も白いので変わらない。

使い方（cutout の venv の Python で。リポジトリの根で）：
  <venv>/python tools/cutout_defringe.py --src <透明つきの絵のフォルダ> --out <出すフォルダ> id1 id2 …
  --band（縁の幅。既定 3）・--trim（外の 1 画素の透明度に掛ける数。既定 0.45。1 で削らない）
"""
import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage

MAXKB = {"portraits": 80, "monsters": 60}


def defringe(im, band=3, trim=0.45, rim_band=2.5, rim_box=None):
    a = np.array(im.convert("RGBA")).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    solid = alpha > 0
    dist = ndimage.distance_transform_edt(solid)  # 透明な所からの距離
    edge = solid & (dist <= band)
    inner = solid & (dist > band) & (alpha >= 250)
    if not inner.any():
        return im
    _, (iy, ix) = ndimage.distance_transform_edt(~inner, return_indices=True)
    near = rgb[iy, ix]
    lum = rgb.mean(axis=2)
    brighter = edge & (lum > near.mean(axis=2) + 8)
    out = rgb.copy()
    out[brighter] = near[brighter]
    # 線画（暗い画素）の外側に付いた白い輪は、絵の外なので透明にする。
    # 「外側」＝その画素より透明な所から遠い暗い画素が、2 画素以内にある
    dark = solid & (lum < 110) & (alpha > 180)
    dark_dist = ndimage.maximum_filter(np.where(dark, dist, 0), size=5)
    pale = (rgb.min(axis=2) >= 185) & ((rgb.max(axis=2) - rgb.min(axis=2)) <= 30)
    near_rim = dist <= 2.5
    if rim_box:
        x0, y0, x1, y1 = rim_box
        wide = np.zeros(dist.shape, bool)
        wide[y0:y1, x0:x1] = True
        near_rim |= wide & (dist <= rim_band)
    elif rim_band > 2.5:
        near_rim = dist <= rim_band
    rim = solid & pale & near_rim & (dark_dist > dist)
    outer = solid & (dist <= 1)
    alpha2 = alpha.copy()
    alpha2[outer] = alpha[outer] * trim
    alpha2[rim] = 0
    res = np.dstack([out, alpha2]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(res, "RGBA")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--kind", default="portraits", choices=list(MAXKB))
    ap.add_argument("--band", type=int, default=3)
    ap.add_argument("--trim", type=float, default=0.45)
    ap.add_argument("--rim", type=float, default=2.5, help="線画の外の白い輪を消す幅（画素）。白い塊が広く残る絵は 6〜8")
    ap.add_argument("--rim-box", default="", help="--rim の広い幅を、この四角（x0,y0,x1,y1）の中だけに使う。白い頭巾などの縁を削らないため")
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    for i in a.ids:
        im = defringe(Image.open(os.path.join(a.src, i + ".webp")), a.band, a.trim, a.rim, tuple(int(x) for x in a.rim_box.split(",")) if a.rim_box else None)
        dst = os.path.join(a.out, i + ".webp")
        for q in (88, 84, 80, 76, 72, 68):
            im.save(dst, "WEBP", quality=q, method=6, alpha_quality=90)
            if os.path.getsize(dst) <= MAXKB[a.kind] * 1024:
                break
        print(i, flush=True)


if __name__ == "__main__":
    main()
