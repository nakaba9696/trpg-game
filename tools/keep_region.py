"""背景込みの一枚絵から、体（BiRefNet）と、手で決めた「残す範囲」（光の輪・後光・岩・止まり木・煙・小さな連れ）を透明つきで切り出す。

光や後光は背景と地続きに描かれていて、機械では背景との境が決められない。そこで 1 枚ずつ、残す範囲を楕円か多角形で指定する。
- 体：BiRefNet の透明度
- 範囲（key）：範囲の中だけ、背景の色との差から透明度を出す（後光・光の輪・煙・水しぶきなど、ふちが半透明な物）
- 範囲（solid）：範囲の中は不透明（背景と同じような色の岩・地面など、色の差で分けられない物）
- 範囲（clear）：範囲の中は、BiRefNet が体と見なしても、背景の色に近い所は抜く（炎や毛のすき間の白など）
- 範囲（drop）：範囲の中は必ず透明（体と地続きに描かれた、持ち運べない背景。洞窟のアーチなど）
- 1 枚ごとに "lo"・"hi"（色の差の幅）も変えられる（白い背景のもやを残さないときは lo を上げる）
二つの大きい方を透明度にし、範囲の半透明の所は背景の色を割り戻して色を戻す。

範囲は docs/art/keep_regions.json（512×512 の座標）：
  {"<id>": {"bg": [x, y] か null（背景の色を取る点。null なら縁の中央値）, "shapes": [["e", cx, cy, rx, ry, "key"], ["p", [x1, y1, x2, y2, …], "solid"]]}}
使い方（cutout の venv の Python で）：
  <venv>/python tools/keep_region.py --src <元の絵のフォルダ> --out <出すフォルダ> [--preview <フォルダ>] id1 id2 …
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import cutout_model as cm  # noqa: E402


def region_masks(shapes, size):
    key = Image.new("L", size, 0)
    solid = Image.new("L", size, 0)
    drop = Image.new("L", size, 0)
    clear = Image.new("L", size, 0)
    for s in shapes:
        layer = {"key": key, "solid": solid, "drop": drop, "clear": clear}[s[-1]]
        d = ImageDraw.Draw(layer)
        if s[0] == "e":
            _, cx, cy, rx, ry, _ = s
            d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
        else:
            d.polygon(list(zip(s[1][0::2], s[1][1::2])), fill=255)
    soft = lambda m: np.array(m.filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255
    return soft(key), soft(solid), soft(drop), soft(clear)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--preview", default="")
    ap.add_argument("--regions", default=os.path.join(ROOT, "docs", "art", "keep_regions.json"))
    ap.add_argument("--lo", type=float, default=25)
    ap.add_argument("--hi", type=float, default=90)
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    regions = json.load(open(a.regions, encoding="utf-8"))
    import onnxruntime
    if hasattr(onnxruntime, "preload_dlls"):
        onnxruntime.preload_dlls()
    from rembg import new_session, remove
    ses = new_session("birefnet-general", providers=[("CUDAExecutionProvider", {"cudnn_conv_algo_search": "HEURISTIC"}), "CPUExecutionProvider"])
    os.makedirs(a.out, exist_ok=True)
    for i in a.ids:
        r = regions[i]
        path = os.path.join(a.src, i + ".webp")
        rgb = np.array(Image.open(path).convert("RGB"))
        body = np.array(cm.cut(ses, path, remove))[..., 3].astype(np.float32) / 255
        if r.get("bg"):
            x, y = r["bg"]
            B = np.median(rgb[max(0, y - 4):y + 5, max(0, x - 4):x + 5].reshape(-1, 3), axis=0).astype(np.float32)
        else:
            B = cm.border_bg(rgb)
        kmask, smask, dmask, cmask = region_masks(r["shapes"], (rgb.shape[1], rgb.shape[0]))
        diff = np.abs(rgb.astype(np.float32) - B).max(axis=2)
        lo, hi = r.get("lo", a.lo), r.get("hi", a.hi)
        key = np.clip((diff - lo) / (hi - lo), 0, 1)
        alpha = np.maximum(body, np.maximum(key * kmask, smask)) * (1 - dmask)
        # clear：範囲の中は、BiRefNet が体と見なしても、背景の色に近い所（炎のすき間の白など）は色の差の透明度にする
        near = np.clip((diff - r.get("clear_lo", 8)) / (r.get("clear_hi", 28) - r.get("clear_lo", 8)), 0, 1)
        alpha = alpha * (1 - cmask) + np.minimum(alpha, near) * cmask
        a8 = (alpha * 255).astype(np.uint8)
        a8 = np.where(a8 < 8, 0, np.where(a8 > 247, 255, a8)).astype(np.uint8)
        col = cm.decontaminate(rgb, a8, B)
        col[a8 == 0] = 0
        im = Image.fromarray(np.dstack([col, a8]), "RGBA")
        dst = os.path.join(a.out, i + ".webp")
        for q in (88, 84, 80, 76, 72, 68):
            im.save(dst, "WEBP", quality=q, method=6, alpha_quality=90)
            if os.path.getsize(dst) <= 60 * 1024:
                break
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            p = Image.fromarray(rgb).convert("RGBA")
            ov = Image.new("RGBA", p.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(ov)
            for s in r["shapes"]:
                c = {"key": (0, 255, 255, 255), "solid": (255, 160, 0, 255), "drop": (255, 0, 0, 255), "clear": (0, 255, 0, 255)}[s[-1]]
                if s[0] == "e":
                    _, cx, cy, rx, ry, _ = s
                    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=c, width=3)
                else:
                    d.polygon(list(zip(s[1][0::2], s[1][1::2])), outline=c, width=3)
            p.alpha_composite(ov)
            p.convert("RGB").save(os.path.join(a.preview, i + ".jpg"), quality=85)
        print(i, flush=True)


if __name__ == "__main__":
    main()
