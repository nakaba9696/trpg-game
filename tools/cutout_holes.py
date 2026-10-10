"""切り抜いた絵に残った「囲まれた背景」（髪の後ろ・首の横・腕と髪の間・手の間・股の間）を抜く。

切り抜きのモデルは外側の背景はよく抜くが、線画に囲まれた白い背景を体の一部と見なして残すことがある。
透明でない画素のうち、背景の色（四隅の色。ふつうは白）とほぼ同じ色で、しかも色むらの無い平らな塊を探し、
一定より大きい塊を透明にする。白い服・白目・歯・光の反射を消さないよう、塊の大きさ・平らさで分ける。

使い方（cutout の venv の Python で。リポジトリの根で）：
  <venv>/python tools/cutout_holes.py --src <透明つきの絵のフォルダ> --preview <見る用のフォルダ> id1 id2 …   # 抜く所を赤で塗った絵を作るだけ
  <venv>/python tools/cutout_holes.py --src <フォルダ> --out <出すフォルダ> id1 id2 …                        # 抜いて書き出す
  --tol（背景の色との差。既定 6）・--min-area（塊の最小の画素数。既定 60）・--max-std（塊の中の色むら。既定 2.5）
  --box x0,y0,x1,y1（この四角の中だけ探す。白い服・鎧の光を消さないため、穴のある所に絞る）
  --bg "255,255,255"（背景の色。既定は白）。--orig <元の絵のフォルダ> があれば、元の絵の縁の色の中央値を使う
"""
import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage

MAXKB = {"portraits": 80, "monsters": 60}


def holes(im, bg, tol, min_area, max_std, box=None):
    a = np.array(im.convert("RGBA")).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    near = (np.abs(rgb - bg).max(axis=2) <= tol) & (chroma <= 4) & (alpha > 0)
    if box:
        keep = np.zeros(near.shape, bool)
        for x0, y0, x1, y1 in box:
            keep[y0:y1, x0:x1] = True
        near &= keep
    lab, n = ndimage.label(near)
    out = np.zeros(alpha.shape, bool)
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        m = lab[sl] == k
        area = int(m.sum())
        if area < min_area:
            continue
        if rgb[sl][m].std(axis=0).max() > max_std:
            continue
        out[sl] |= m
    # 塊の縁の白っぽい画素（背景と線の混ざった所）へ 3 画素まで広げる。明るく色の薄い画素だけ
    pale = (rgb.min(axis=2) >= 200) & (chroma <= 14) & (alpha > 0)
    for _ in range(3):
        out |= ndimage.binary_dilation(out) & pale
    ring = ndimage.binary_dilation(out, iterations=1) & ~out & (alpha > 0)
    return out, ring


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", default="")
    ap.add_argument("--preview", default="")
    ap.add_argument("--kind", default="portraits", choices=list(MAXKB))
    ap.add_argument("--tol", type=float, default=6)
    ap.add_argument("--min-area", type=int, default=60)
    ap.add_argument("--max-std", type=float, default=2.5)
    ap.add_argument("--bg", default="255,255,255")
    ap.add_argument("--box", default="", help="この四角（x0,y0,x1,y1。512 幅の座標。; で区切って幾つでも）の中だけ探す。白い服や鎧の光を消さないため")
    ap.add_argument("--orig", default="", help="白い背景の元の絵のフォルダ。あれば、その縁の色の中央値を背景の色にする")
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    bg = np.array([float(x) for x in a.bg.split(",")])
    for i in a.ids:
        im = Image.open(os.path.join(a.src, i + ".webp")).convert("RGBA")
        b = bg
        op = os.path.join(a.orig, i + ".webp") if a.orig else ""
        if op and os.path.exists(op):
            o = np.array(Image.open(op).convert("RGB")).astype(np.float32)
            b = np.median(np.concatenate([o[0], o[-1], o[:, 0], o[:, -1]]), axis=0)
        h, ring = holes(im, b, a.tol, a.min_area, a.max_std, [tuple(int(x) for x in b.split(",")) for b in a.box.split(";")] if a.box else None)
        arr = np.array(im)
        print(f"{i}: {int(h.sum())} 画素", flush=True)
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            back = Image.new("RGBA", im.size, (20, 30, 90, 255))
            back.alpha_composite(im)
            p = np.array(back)
            p[h] = (255, 0, 0, 255)
            p[ring] = (255, 160, 0, 255)
            Image.fromarray(p).save(os.path.join(a.preview, i + ".png"))
        if a.out:
            os.makedirs(a.out, exist_ok=True)
            # 抜く所をぼかして縁をなめらかにする（ギザギザの段を残さない）
            soft = ndimage.gaussian_filter(h.astype(np.float32), 0.8)
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
