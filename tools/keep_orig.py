"""元の絵の画素はそのまま残し、背景の所だけを抜く（確認票 8：描き直さない 12 件）。

1. 背景の所を決める：BiRefNet の外側（体の形の外）＋ 体の内側でも、背景の色（縁の中央値）に近く色むらの無い、ある大きさ以上の塊
   （足の間・腕と体のすき間・髪と首のすき間など、囲まれた背景）＋ 手で決めた「消す所」（煙・景色・地面・傘の下の布。docs/art/keep_orig.json の drop）
2. 背景の所を無地の緑（#00FF00）で塗り、縁は元の背景の色を割り戻して色を戻す
3. G − max(R,B) のクロマキーで抜く（キャラクターの所は描き直さない。顔・目・線はそのまま）

使い方（cutout の venv の Python で）：
  <venv>/python tools/keep_orig.py --src <元の絵の根> --out <出す根> --preview <見る用> --kind monsters id1 id2 …
  docs/art/keep_orig.json：{"<id>": {"drop": [[x1,y1,x2,y2,…], …], "keep": [[…]], "min_area": 40, "tol": 14, "holes": false}}
    patch_yellow: [[x0,y0,x1,y1]] の四角の中の黄色（体に重なった麦など）を、まわりの色で塗り直す。drop_yellow: true で残りの黄色を背景にする
    patch: [[x0,y0,x1,y1]] の四角の中の白い点を、まわりの色で埋めてから抜く（外套の中の白い点など）
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
    if conf.get("drop_greenish"):
        # 緑がかった布（オリーブ色）とその暗い影を背景にする（本体に緑が無い絵だけ）
        R, G, Bc = c[..., 0], c[..., 1], c[..., 2]
        gr = (G >= R - 4) & (G > Bc + 6) & (c.mean(axis=2) < 200)
        bg |= ndimage.binary_opening(gr, iterations=1)
    if conf.get("only"):
        bg |= ~poly_mask(conf["only"], (W, H))  # この多角形の外はすべて背景（布・泥など周りの物を消して本体だけにする）
    if conf.get("drop_brown"):
        # 木の幹・枝など（茶色）を、四角の中だけ背景にする（白い髪・服は残る）
        R, G, Bc = c[..., 0], c[..., 1], c[..., 2]
        brown = (R - Bc > 25) & (R >= G) & (c.max(axis=2) < 215) & (G - Bc > 5)
        box = np.zeros(brown.shape, bool)
        for x0, y0, x1, y1 in conf["drop_brown"]:
            box[y0:y1, x0:x1] = True
        bg |= ndimage.binary_dilation(brown & box, iterations=2) & box & ~(c.min(axis=2) > 225)
    if conf.get("drop_arc"):
        # 体の後ろの弧など、決まった色（くすんだ桃色）の所だけを、四角の中で背景にする
        R, G, Bc = c[..., 0], c[..., 1], c[..., 2]
        arc = (R - G > 25) & (R - G < 80) & (np.abs(G - Bc) < 14) & (G > 95) & (R > 140)
        box = np.zeros(arc.shape, bool)
        for x0, y0, x1, y1 in conf["drop_arc"]:
            box[y0:y1, x0:x1] = True
        # 弧の縁の薄い所（白に溶ける所）も含める
        am = ndimage.binary_dilation(arc & box, iterations=3) & box & ((R - G > 8) | (c.min(axis=2) > 200))
        if conf.get("arc_keep"):
            am &= ~poly_mask(conf["arc_keep"], (W, H))  # 顔など、弧の色に近い体の所は弧として消さない
        if conf.get("arc_keep_dark"):
            # 角など：四角の中の暗い所（とその 1 画素のまわり）だけを残す
            dark = ndimage.binary_dilation((G < 80) & (R < 180), iterations=1)
            am &= ~(poly_mask(conf["arc_keep_dark"], (W, H)) & dark)
        bg |= am
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
        # 体の形は元の絵から（塗り直しの前に。塗り直した所を体と見なさないため）
        body = np.array(cm.cut(ses, path, remove))[..., 3].astype(np.float32) / 255
        yellow = lambda c: (c[..., 0].astype(int) > 110) & (c[..., 0].astype(int) - c[..., 2] > 45) & (c[..., 1].astype(int) - c[..., 2] > 25)
        for x0, y0, x1, y1 in conf.get("patch_yellow", []):
            # 体に重なった麦の穂など（黄色）を、まわりの黄色でない色で塗り直す
            box = np.zeros(rgb.shape[:2], bool); box[y0:y1, x0:x1] = True
            c16 = rgb.astype(int)
            # 麦：黄色に加え、羽の灰黒より明るく赤みのある所（薄茶・白っぽい穂）も
            wheat = yellow(rgb) | ((c16.mean(axis=2) > 95) & (c16[..., 0] - c16[..., 2] > 12)) | ((c16[..., 0] - c16[..., 2] > 22) & (c16[..., 1] - c16[..., 2] > 8))
            wheat = ndimage.binary_dilation(wheat, iterations=1)
            # 体の形の、麦の茎で切れたすき間を閉じる（四角の中だけ）
            cbox = poly_mask(conf["close_poly"], (rgb.shape[1], rgb.shape[0])) if conf.get("close_poly") else box
            closed = ndimage.binary_fill_holes(ndimage.binary_closing(body > 0.5, iterations=8)) & cbox
            body = np.where(closed, 1.0, body).astype(np.float32)
            spot = box & wheat & (body > 0.5)  # 体の中だけ塗り直す（外の麦は背景として抜く）
            if spot.any():
                # 塗る色は、四角の中の暗く色の無い所（羽）からとる
                ref = box & ~ndimage.binary_dilation(spot, iterations=2) & (c16.mean(axis=2) < 90) & (c16.max(axis=2) - c16.min(axis=2) < 30)
                if not ref.any():
                    ref = ~spot
                _, (iy, ix) = ndimage.distance_transform_edt(~ref, return_indices=True)
                rgb[spot] = rgb[iy, ix][spot]
            p2 = os.path.join(a.out, "_patched_" + i + ".png")
            Image.fromarray(rgb).save(p2)
            path = p2
        for x0, y0, x1, y1 in conf.get("patch", []):
            # 塗りの中に残った背景の白い点（外套の穴など）を、まわりの色で埋める
            box = np.zeros(rgb.shape[:2], bool); box[y0:y1, x0:x1] = True
            spot = box & (rgb.min(axis=2) > 110)
            if spot.any():
                _, (iy, ix) = ndimage.distance_transform_edt(spot, return_indices=True)
                rgb[spot] = rgb[iy, ix][spot]
            p2 = os.path.join(a.out, "_patched_" + i + ".png")
            Image.fromarray(rgb).save(p2)
            path = p2
        bg, B = bg_region(rgb, body, conf)
        if conf.get("drop_yellow"):
            # 残った麦（黄色）は背景として消す（keep の所は除く）
            ky = yellow(rgb)
            if conf.get("keep_yellow"):
                ky &= ~poly_mask(conf["keep_yellow"], (rgb.shape[1], rgb.shape[0]))  # 目など、黄色でも残す所
            bg |= ndimage.binary_dilation(ky, iterations=1)
        if conf.get("solid"):
            # 止まり木の岩など：麦に隠れた所も含めて形ごと残す（黄色は岩の灰色に塗り直す）
            sm = poly_mask(conf["solid"], (rgb.shape[1], rgb.shape[0]))
            yy = sm & yellow(rgb)
            if yy.any():
                ref = sm & ~yellow(rgb) & (rgb.max(axis=2).astype(int) - rgb.min(axis=2) < 40)
                if ref.any():
                    _, (iy, ix) = ndimage.distance_transform_edt(~ref, return_indices=True)
                    rgb = rgb.copy(); rgb[yy] = rgb[iy, ix][yy]
            bg &= ~sm
        rgb_used = rgb
        # 2. 背景を緑で塗る（縁はなめらかに。縁の色は元の背景の色を割り戻す）
        soft = ndimage.gaussian_filter(bg.astype(np.float32), 0.8)
        soft[bg] = 1.0
        a_fg = (1 - soft)[..., None]
        fg = cm.decontaminate(rgb, (a_fg[..., 0] * 255).astype(np.uint8), B).astype(np.float32)
        # 3. クロマキー：緑は塗った所にしか無いので、G − max(R,B) で出る透明度は塗った量（1 − soft）と同じになる
        alpha = 1 - soft
        # 本体から離れた小さな点（背景の残り）を消す
        lab, n = ndimage.label(alpha > 0.05)
        if n > 1:
            sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
            big = int(np.argmax(sizes)) + 1
            for k in range(1, n + 1):
                if k != big and sizes[k - 1] < conf.get("min_island", 80):
                    alpha[lab == k] = 0
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
