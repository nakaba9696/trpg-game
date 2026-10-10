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


def bg_mask(rgb, boxes, loose_flood=True):
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
    H, W = rgb.shape[:2]
    for x0, y0, x1, y1 in boxes:
        sx, sy = W / 512, H / 640
        b = np.zeros(white.shape, bool)
        b[int(y0 * sy):int(y1 * sy), int(x0 * sx):int(x1 * sx)] = True
        m |= white & b
    return ndimage.binary_dilation(m, iterations=1)


def build_init(orig, size, key, boxes, loose_flood=True):
    o = Image.open(orig).convert("RGB").resize(size, Image.LANCZOS)
    rgb = np.array(o)
    m = bg_mask(rgb, boxes, loose_flood)
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
    on = a > 0.04
    thin = ndimage.distance_transform_edt(on) <= 1.5
    far = ndimage.distance_transform_edt(~(a > 0.9)) > 3
    a = np.where(on & thin & far & (a < 0.6), 0, a)
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
    ap.add_argument("--boxes", default=os.path.join(ROOT, "docs", "art", "chroma_boxes.json"))
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, "raw"), exist_ok=True)
    os.makedirs(os.path.join(a.out, "cut"), exist_ok=True)
    rep_path = os.path.join(a.out, "report.json")
    report = json.load(open(rep_path)) if os.path.exists(rep_path) else {}
    allboxes = json.load(open(a.boxes, encoding="utf-8")) if os.path.exists(a.boxes) else {}
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
            init = build_init(orig, (W, H), key, bx, loose)
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
        report[i] = {"key": key, "keyish": g, "white_blobs": w}
        print(f"{i} key={key} 残り：背景色 {g}・白い塊 {w}", flush=True)
        json.dump(report, open(rep_path, "w"), indent=1)


if __name__ == "__main__":
    main()
