"""元の絵の画素はそのまま残し、背景の所だけを抜く（確認票 8：描き直さない 12 件）。

1. 背景の所を決める：BiRefNet の外側（体の形の外）＋ 体の内側でも、背景の色（縁の中央値）に近く色むらの無い、ある大きさ以上の塊
   （足の間・腕と体のすき間・髪と首のすき間など、囲まれた背景）＋ 手で決めた「消す所」（煙・景色・地面・傘の下の布。docs/art/keep_orig.json の drop）
2. 背景の所を無地の緑（#00FF00）で塗り、縁は元の背景の色を割り戻して色を戻す
3. G − max(R,B) のクロマキーで抜く（キャラクターの所は描き直さない。顔・目・線はそのまま）

使い方（cutout の venv の Python で）：
  <venv>/python tools/keep_orig.py --src <元の絵の根> --out <出す根> --preview <見る用> --kind monsters id1 id2 …
  docs/art/keep_orig.json：{"<id>": {"drop": [[x1,y1,x2,y2,…], …], "keep": [[…]], "min_area": 40, "tol": 14, "holes": false}}
    holes: false で、背景の色に近い塊を自動では抜かない（白い肌・白い髪・白い体の絵。囲まれた背景は drop で手で決める）（512 幅の座標の多角形。keep は抜かない所）
  表情違いは基本の絵の設定を使う（<id>_<表情> → <id>）
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import cutout_model as cm  # noqa: E402
import redo_i2i as ri  # noqa: E402



def poly_mask(polys, size):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon(list(zip(p[0::2], p[1::2])), fill=255)
    return np.array(m) > 0


def bg_region(rgb, body, conf):
    """背景の所（True）。体の外 ＋ 体の中の、背景の色に近い平らな大きい塊 ＋ drop − keep"""
    H, W = rgb.shape[:2]
    c = rgb.astype(np.float32)
    B = np.median(np.concatenate([c[0], c[-1], c[:, 0], c[:, -1]]), axis=0)
    tol = conf.get("tol", 14)
    near = np.abs(c - B).max(axis=2) <= tol
    lab, n = ndimage.label(near)
    holes = np.zeros(near.shape, bool)
    min_area = conf.get("min_area", 40)
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        if conf.get("holes") is False:
            break
        m = lab[sl] == k
        if m.sum() >= min_area and c[sl][m].std(axis=0).max() < 6:
            holes[sl] |= m
    bg = (body < 0.5) | holes
    if conf.get("drop"):
        bg |= poly_mask(conf["drop"], (W, H))
    if conf.get("keep"):
        bg &= ~poly_mask(conf["keep"], (W, H))
    return bg, B


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--preview", default="")
    ap.add_argument("--kind", default="monsters", choices=list(ri.SIZE))
    ap.add_argument("--conf", default=os.path.join(ROOT, "docs", "art", "keep_orig.json"))
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    confs = json.load(open(a.conf, encoding="utf-8")) if os.path.exists(a.conf) else {}
    import onnxruntime
    if hasattr(onnxruntime, "preload_dlls"):
        onnxruntime.preload_dlls()
    from rembg import new_session, remove
    ses = new_session("birefnet-general", providers=[("CUDAExecutionProvider", {"cudnn_conv_algo_search": "HEURISTIC"}), "CPUExecutionProvider"])
    os.makedirs(a.out, exist_ok=True)
    for i in a.ids:
        base = next((b for b in sorted(confs, key=len, reverse=True) if i == b or i.startswith(b + "_")), None)
        conf = confs.get(base, {})
        path = os.path.join(a.src, i + ".webp")
        rgb = np.array(Image.open(path).convert("RGB"))
        body = np.array(cm.cut(ses, path, remove))[..., 3].astype(np.float32) / 255
        bg, B = bg_region(rgb, body, conf)
        # 2. 背景を緑で塗る（縁はなめらかに。縁の色は元の背景の色を割り戻す）
        soft = ndimage.gaussian_filter(bg.astype(np.float32), 0.8)
        soft[bg] = 1.0
        a_fg = (1 - soft)[..., None]
        fg = cm.decontaminate(rgb, (a_fg[..., 0] * 255).astype(np.uint8), B).astype(np.float32)
        # 3. クロマキー：緑は塗った所にしか無いので、G − max(R,B) で出る透明度は塗った量（1 − soft）と同じになる
        alpha = 1 - soft
        col = fg.copy()
        a8 = (alpha * 255).astype(np.uint8)
        a8 = np.where(a8 < 8, 0, np.where(a8 > 247, 255, a8)).astype(np.uint8)
        col[a8 == 0] = 0
        im = Image.fromarray(np.dstack([col.clip(0, 255).astype(np.uint8), a8]), "RGBA")
        ri.save(im, os.path.join(a.out, i + ".webp"), a.kind)
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            p = rgb.copy()
            p[bg] = (p[bg] * 0.4 + np.array([255, 0, 0]) * 0.6).astype(np.uint8)
            Image.fromarray(p).save(os.path.join(a.preview, i + ".jpg"), quality=85)
        print(i, flush=True)


if __name__ == "__main__":
    main()
