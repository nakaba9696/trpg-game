"""元の絵を土台に、真緑（#00FF00。緑の多い絵は真マゼンタ #FF00FF）の背景で描き直し、クロマキーで抜く（作り直しの方法 3）。

BiRefNet は「人の形」で切るので、髪と首の間のような囲まれた背景を体の一部として残すことがある。
ここでは背景の色に近い画素を、外とつながっているかに関係なく全部抜く（囲まれた所も）。

1. 土台：元の絵（白い背景）の白い背景を、真緑に置き換える。縁につながった白に加え、囲まれた背景の白は四角で場所を決めて緑にする（docs/art/chroma_boxes.json）
2. img2img（denoise 0.45）。プロンプトの白い背景の語を「simple background, solid green background」に替える
3. クロマキー：背景の色との距離で透明度を決め（縁はなめらかに）、緑かぶり（スピル）を取る
4. 自動の確かめ：抜いたあと、背景の色に近い画素と、白い平らな塊（元の背景の白）が残っていないかを数える

使い方（cutout の venv の Python で。WebUI を --api で起動。環境変数 CUTOUT_PYTHON も要る）：
  <venv>/python tools/chroma_redo.py --orig <元の絵の根> --out <出す根> rui rui_joy …
出す物：<out>/raw/<id>.png（緑の背景）・<out>/cut/<id>.webp（透明つき）・<out>/report.json（残った画素の数）
"""
import argparse
import json
import os
import re
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import redo_i2i as ri  # noqa: E402

KEYS = {"green": (0, 255, 0), "magenta": (255, 0, 255)}
TAGS = {"green": "simple background, (solid green background:1.3), green screen", "magenta": "simple background, (solid magenta background:1.3)"}


def pick_key(rgb):
    """緑が多い絵はマゼンタ"""
    px = rgb.reshape(-1, 3).astype(np.int32)
    greenish = ((px[:, 1] > px[:, 0] + 40) & (px[:, 1] > px[:, 2] + 40)).mean()
    return "magenta" if greenish > 0.03 else "green"


def white_bg_mask(rgb, min_area=40):
    """白い背景：外の白に加え、囲まれた所の平らな白い塊も"""
    d = np.abs(rgb.astype(np.float32) - 255).max(axis=2)
    chroma = rgb.max(axis=2).astype(np.int32) - rgb.min(axis=2)
    white = (d <= 10) & (chroma <= 6)
    lab, n = ndimage.label(white)
    keep = np.zeros(white.shape, bool)
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        m = lab[sl] == k
        if m.sum() >= min_area:
            keep[sl] |= m
    return ndimage.binary_dilation(keep, iterations=1)


def bg_mask(rgb, boxes, loose_flood=True, body=None):
    """背景の白：縁につながった白と、指定した四角（囲まれた背景のある所）の中の白。
    白い服・白い肌も同じ白なので、囲まれた所は四角で場所を決める（docs/art/chroma_boxes.json。512×640 の座標）"""
    d = np.abs(rgb.astype(np.float32) - 255).max(axis=2)
    chroma = rgb.max(axis=2).astype(np.int32) - rgb.min(axis=2)
    white = (d <= 10) & (chroma <= 6)
    # 縁につながった背景は、白に少しむらのある絵もあるので、ゆるめの白でたどる（線画で止まる）
    loose = ((d <= 28) & (chroma <= 14)) if loose_flood else white
    lab, n = ndimage.label(loose)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m = np.isin(lab, list(edge))
    if body is not None:
        # 体（BiRefNet の形）の中は、縁につながっていても背景にしない（裾が絵の下の縁に触れる白い服・前掛けを守る）
        m &= body < 0.5
    H, W = rgb.shape[:2]
    for x0, y0, x1, y1 in boxes:
        sx, sy = W / 512, H / 640
        b = np.zeros(white.shape, bool)
        b[int(y0 * sy):int(y1 * sy), int(x0 * sx):int(x1 * sx)] = True
        m |= white & b
    return ndimage.binary_dilation(m, iterations=1)


def build_init(orig, size, key, boxes, loose_flood=True, body_path=""):
    o = Image.open(orig).convert("RGB").resize(size, Image.LANCZOS)
    rgb = np.array(o)
    body = None
    if body_path and os.path.exists(body_path):
        body = np.array(Image.open(body_path).convert("RGBA").resize(size, Image.LANCZOS))[..., 3].astype(np.float32) / 255
    m = bg_mask(rgb, boxes, loose_flood, body)
    soft = ndimage.gaussian_filter(m.astype(np.float32), 1.0)[..., None]
    out = rgb * (1 - soft) + np.array(KEYS[key], np.float32) * soft
    return Image.fromarray(out.astype(np.uint8))


def chroma_cut(rgb, key, lo=60, hi=150):
    """背景の色からの距離で透明度。縁の色は背景の色を割り戻し、残りのかぶりも取る"""
    K = np.array(KEYS[key], np.float32)
    c = rgb.astype(np.float32)
    if key == "green":
        # 緑らしさ：g が r・b より大きい分
        score = c[..., 1] - np.maximum(c[..., 0], c[..., 2])
    else:
        score = np.minimum(c[..., 0], c[..., 2]) - c[..., 1]
    alpha = 1 - np.clip((score - (255 - hi)) / (hi - lo), 0, 1)
    alpha = np.where(score > 255 - lo, 0.0, alpha)
    a = alpha[..., None]
    f = (c - (1 - a) * K) / np.maximum(a, 0.05)
    f = np.clip(f, 0, 255)
    if key == "green":
        f[..., 1] = np.minimum(f[..., 1], np.maximum(f[..., 0], f[..., 2]) + 10)
    else:
        lim = f[..., 1] + 10
        f[..., 0] = np.minimum(f[..., 0], np.maximum(lim, f[..., 2]))
    a8 = (alpha * 255).astype(np.uint8)
    a8 = np.where(a8 < 10, 0, np.where(a8 > 245, 255, a8)).astype(np.uint8)
    f[a8 == 0] = 0
    return np.dstack([f.astype(np.uint8), a8])


def clean(rgba, key, band=6, min_area=300, faint=0.55, faint_area=4000):
    """仕上げ：
    - 縁（透明な所から band 画素以内）の背景色かぶりを強めに取る：緑かぶりの画素は、いちばん近い内側の画素の色に寄せる
    - 浮いた線：本体（いちばん大きい塊）とつながっていない、小さい塊・薄い塊を消す"""
    rgb = rgba[..., :3].astype(np.float32)
    a = rgba[..., 3].astype(np.float32) / 255
    solid = a > 0
    dist = ndimage.distance_transform_edt(solid)
    edge = solid & (dist <= band)
    inner = solid & (dist > band) & (a > 0.98)
    if inner.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~inner, return_indices=True)
        near = rgb[iy, ix]
        if key == "green":
            cast = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
        else:
            cast = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
        hit = edge & (cast > 2)
        w = np.clip(cast / 15, 0, 1)[..., None]
        rgb = np.where(hit[..., None], rgb * (1 - w) + near * w, rgb)
        if key == "green":
            rgb[..., 1] = np.where(edge, np.minimum(rgb[..., 1], np.maximum(rgb[..., 0], rgb[..., 2]) + 4), rgb[..., 1])
    # 浮いた線（ゴーストの輪郭）：薄く（透明度 0.6 未満）、細く（太さ 2 画素ほど）、不透明な所から離れた画素を消す。
    # 髪の線は濃いので残る
    lab, n = ndimage.label(a > 0.04)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
        means = ndimage.mean(a, lab, range(1, n + 1))
        big = int(np.argmax(sizes)) + 1
        for k in range(1, n + 1):
            if k == big:
                continue
            if sizes[k - 1] < min_area or (means[k - 1] < faint and sizes[k - 1] < faint_area):
                a[lab == k] = 0
    a8 = (a * 255).astype(np.uint8)
    out = np.dstack([rgb.clip(0, 255).astype(np.uint8), a8])
    out[a8 == 0, :3] = 0
    return out


def border_key_cut(rgb, min_bg=0):
    """最初から描いた絵（緑の背景。モデルは真緑でなく薄い緑・むらのある緑で描く）を抜く。
    透明度は「緑がほかの色より強い量」（G − max(R,B)）だけで決め、背景の量（縁の中央値）を基準にする。
    白・灰・肌・桃色の髪は G − max(R,B) が 0 以下なので抜けない。囲まれた所の背景も同じように全部抜ける"""
    c = rgb.astype(np.float32)
    ex = c[..., 1] - np.maximum(c[..., 0], c[..., 2])
    edge = np.concatenate([ex[0], ex[-1], ex[:, 0], ex[:, -1]])
    bg = float(np.median(edge))
    hi, lo = bg * 0.75, bg * 0.3
    alpha = 1 - np.clip((ex - lo) / max(hi - lo, 1), 0, 1)
    # 緑の目・緑の飾りなど、小さくて縁につながらない緑は抜かない（囲まれた背景は大きいので抜ける）
    lab, n = ndimage.label(ex > lo)
    if n:
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        sizes = ndimage.sum(np.ones_like(ex), lab, range(1, n + 1))
        small = [k for k in range(1, n + 1) if k not in border and sizes[k - 1] < min_bg]
        keep_green = np.isin(lab, small)
        alpha[keep_green] = 1.0
    else:
        keep_green = np.zeros(ex.shape, bool)
    # 緑かぶりを取る：残す画素の G を max(R,B) に寄せる
    f = c.copy()
    spill = np.clip(ex, 0, None)
    # 緑かぶりは全部取る（G を max(R,B) まで下げる）。緑の目など残すと決めた小さい緑だけはそのまま
    f[..., 1] = np.where(keep_green, c[..., 1], c[..., 1] - spill)
    # 縁（透明な所から 2 画素以内）に緑かぶりのあった画素は、線の色（暗い色）に寄せる
    solid = alpha > 0.04
    rim = solid & (ndimage.distance_transform_edt(solid) <= 2) & (spill > 6) & ~keep_green
    # 半透明の縁で緑かぶりのあった画素は、いちばん近い不透明な内側の画素の色にする（毛先の黄緑のふちを残さない）
    inner = (alpha > 0.98) & (spill <= 2)
    if inner.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~inner, return_indices=True)
        semi = solid & (alpha < 0.98) & (spill > 4) & ~keep_green
        f[semi] = c[iy, ix][semi]
    f[rim & ~semi if inner.any() else rim] = f[rim & ~semi if inner.any() else rim] * 0.45
    # 縁（4 画素以内）の黄緑のふち（緑の背景の照り返しで毛先が黄緑に描かれた所）：内側の色が黄緑でなければ、内側の色にする
    if inner.any():
        yg = (f[..., 1] - f[..., 2] > 45) & (f[..., 0] - f[..., 2] > 25)
        inside = c[iy, ix]
        in_yg = (inside[..., 1] - inside[..., 2] > 35)
        band = solid & (ndimage.distance_transform_edt(solid) <= 4) & yg & ~in_yg & ~keep_green
        f[band] = inside[band]
    # 縁の線画（4 画素以内）が緑の照り返しでオリーブ色に描かれていたら、暗い茶に寄せる
    L = f.mean(axis=2)
    olive = solid & (ndimage.distance_transform_edt(solid) <= 4) & (L < 160) & (f[..., 1] - f[..., 2] > 18) & ~keep_green
    f[olive] = np.stack([L * 0.8, L * 0.6, L * 0.5], axis=-1)[olive]
    a8 = (alpha * 255).astype(np.uint8)
    a8 = np.where(a8 < 10, 0, np.where(a8 > 245, 255, a8)).astype(np.uint8)
    f[a8 == 0] = 0
    B = np.median(np.concatenate([c[0], c[-1], c[:, 0], c[:, -1]]), axis=0)
    return np.dstack([f.clip(0, 255).astype(np.uint8), a8]), B


def leftovers(rgba, key, boxes):
    """残り：不透明な画素のうち背景の色に近いもの、と、囲まれた背景の四角の中の白い平らな塊（元の背景の白）"""
    rgb, a = rgba[..., :3].astype(np.int32), rgba[..., 3]
    if key == "green":
        keyish = (rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2]) > 60) & (a > 128)
    else:
        keyish = (np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1] > 60) & (a > 128)
    inbox = np.zeros(a.shape, bool)
    for x0, y0, x1, y1 in boxes:
        inbox[y0:y1, x0:x1] = True
    white = white_bg_mask(rgba[..., :3], min_area=30) & (a > 128) & inbox
    return int(keyish.sum()), int(white.sum())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--orig", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--den", type=float, default=0.45)
    ap.add_argument("--key", default="", choices=["", *KEYS])
    ap.add_argument("--body", default="", help="体の形（BiRefNet で切った透明つきの絵）のフォルダ。<body>/<id>.webp。白い服の裾を背景にしないため")
    ap.add_argument("--boxes", default=os.path.join(ROOT, "docs", "art", "chroma_boxes.json"))
    ap.add_argument("--keep-small", type=int, default=0, help="--fresh で、縁につながらないこの画素数未満の緑は残す（緑の目の人だけ。例 100）")
    ap.add_argument("--tint-box", default="", help="--fresh で、この四角（x0,y0,x1,y1）の中の黄緑を、近くの赤み・桃色の色に塗り直す（severin の髪）")
    ap.add_argument("--fresh", default="", help="最初から描いた絵（単色の背景）のフォルダ。土台を作らず、縁の色をキーにして抜くだけ")
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, "raw"), exist_ok=True)
    os.makedirs(os.path.join(a.out, "cut"), exist_ok=True)
    rep_path = os.path.join(a.out, "report.json")
    report = json.load(open(rep_path)) if os.path.exists(rep_path) else {}
    allboxes = json.load(open(a.boxes, encoding="utf-8")) if os.path.exists(a.boxes) else {}
    if a.fresh:
        for i in a.ids:
            rgb = np.array(Image.open(os.path.join(a.fresh, i + ".webp")).convert("RGB"))
            rgba, B = border_key_cut(rgb, a.keep_small)
            if a.tint_box:
                # 髪の房のすき間など、緑の照り返しで黄緑に描かれた所を、近くの髪の色に塗り直す（四角の中だけ）
                x0, y0, x1, y1 = (int(v) for v in a.tint_box.split(","))
                f = rgba[..., :3].astype(np.float32)
                box = np.zeros(f.shape[:2], bool); box[y0:y1, x0:x1] = True
                yg = box & (rgba[..., 3] > 0) & (f[..., 1] - f[..., 2] > 25) & (f[..., 1] >= f[..., 0] - 15)
                ref = (rgba[..., 3] > 200) & (f[..., 0] - f[..., 1] > 20)
                if ref.any() and yg.any():
                    _, (iy, ix) = ndimage.distance_transform_edt(~ref, return_indices=True)
                    rgba[yg, :3] = rgba[iy, ix][yg, :3]
            rgba = clean(rgba, "green")
            ri.save(Image.fromarray(rgba, "RGBA"), os.path.join(a.out, "cut", i + ".webp"), "portraits")
            print(f"{i} 背景 {B.astype(int).tolist()}", flush=True)
        return
    for i in a.ids:
        raw = os.path.join(a.out, "raw", i + ".png")
        orig = os.path.join(a.orig, "portraits", i + ".webp")
        key = a.key or pick_key(np.array(Image.open(orig).convert("RGB")))
        if not os.path.exists(raw):
            settings, pos, neg = ri.dry("portraits", i)
            W, H = settings.get("width", 1024), settings.get("height", 1280)
            base = next((b for b in sorted(allboxes, key=len, reverse=True) if i == b or i.startswith(b + "_")), None)
            ent = allboxes.get(base, [])
            # 一覧の値は四角の並び、または {"boxes": [...], "strict": true}（白い頭巾など、縁につながった白い服がある人はゆるめにたどらない）
            bx, loose = (ent, True) if isinstance(ent, list) else (ent.get("boxes", []), not ent.get("strict"))
            init = build_init(orig, (W, H), key, bx, loose, os.path.join(a.body, i + ".webp") if a.body else "")
            pos = re.sub(r"\(?(plain grey background|white background)(:[\d.]+)?\)?", TAGS[key], pos)
            if "solid" not in pos:
                pos += ", " + TAGS[key]
            neg += ", white background, grey background, gradient background, shadow on background"
            out, seed = ri.img2img(init, settings, pos, neg, a.den)
            out.resize(ri.SIZE["portraits"], Image.LANCZOS).save(raw)
        rgba = clean(chroma_cut(np.array(Image.open(raw).convert("RGB")), key), key)
        ent0 = allboxes.get(next((b for b in sorted(allboxes, key=len, reverse=True) if i == b or i.startswith(b + "_")), ""), [])
        for poly in (ent0.get("drop", []) if isinstance(ent0, dict) else []):
            # 手で決めた「消す所」（頭から離れた輪郭の線など。512×640 の座標の多角形）
            from PIL import ImageDraw
            m = Image.new("L", (rgba.shape[1], rgba.shape[0]), 0)
            ImageDraw.Draw(m).polygon(list(zip(poly[0::2], poly[1::2])), fill=255)
            rgba[np.array(m) > 0] = 0
        im = Image.fromarray(rgba, "RGBA")
        ri.save(im, os.path.join(a.out, "cut", i + ".webp"), "portraits")
        base = next((b for b in sorted(allboxes, key=len, reverse=True) if i == b or i.startswith(b + "_")), None)
        ent = allboxes.get(base, [])
        g, w = leftovers(rgba, key, ent if isinstance(ent, list) else ent.get("boxes", []))
        holes = -1
        bp = os.path.join(a.body, i + ".webp") if a.body else ""
        if bp and os.path.exists(bp):
            # 服・頭巾の穴：体の形の奥（縁から 4 画素より内側）で、透明になった画素。囲まれた背景の四角の中は数えない
            body = np.array(Image.open(bp).convert("RGBA").resize((rgba.shape[1], rgba.shape[0])))[..., 3] > 200
            deep = ndimage.binary_erosion(body, iterations=4)
            inbox = np.zeros(body.shape, bool)
            for x0, y0, x1, y1 in (ent0 if isinstance(ent0, list) else ent0.get("boxes", [])):
                inbox[y0:y1, x0:x1] = True
            holes = int((deep & (rgba[..., 3] < 128) & ~inbox).sum())
        report[i] = {"key": key, "keyish": g, "white_blobs": w, "holes": holes}
        print(f"{i} key={key} 残り：背景色 {g}・白い塊 {w}・体の中の穴 {holes}", flush=True)
        json.dump(report, open(rep_path, "w"), indent=1)


if __name__ == "__main__":
    main()
