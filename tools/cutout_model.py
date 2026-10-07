"""背景除去モデルで、立ち絵・魔物の絵を透明つきの webp にする（A13 の点検のあとの方法）。

白い背景で作った絵（assets/portraits/・assets/monsters/）を、背景除去のモデル（rembg の birefnet-general。BiRefNet の汎用の高精度版）で
切り抜き、アルファつきの webp で書き出す。縁の半透明の画素は、白い背景と混ざった分を取り除いて色を戻す（白いふちを残さない）。

設定（docs/art/cutout_model.md に手順）：
- モデル：birefnet-general（rembg 2.0.69・onnxruntime-gpu）。比べた isnet-anime より、囲まれた背景・背景の物の残りが少なかった。
- 後処理なし（post_process_mask=False）・アルファマットなし。マスクをそのままアルファにし、ALPHA_FLOOR 未満は 0、ALPHA_CEIL 以上は 255 にそろえる。
- 色のにじみ抜き：半透明の画素 c は c = a·F + (1−a)·B（B：元の背景の色＝四隅の色）とみなし、F = (c − (1−a)·B) / a に戻す。

使い方（モデルの入った venv の Python で。リポジトリの根で）：
  <venv>/python tools/cutout_model.py --out tmp/cut            # 全部を tmp/cut/<dir>/<id>.webp に（assets は触らない）
  <venv>/python tools/cutout_model.py --only kind_priest_m --out tmp/cut
  <venv>/python tools/cutout_model.py --in-place                # assets/ を書き換える（アルファを持つ絵は飛ばす。--force で切り直す）
  <venv>/python tools/cutout_model.py --model isnet-anime --only <id> --out tmp/cut   # うまく抜けなかった絵を別のモデルで
  <venv>/python tools/cutout_model.py --flatten assets/portraits/<id>.webp tmp.png  # 白い背景に戻す（差分の img2img の元）
要るもの：rembg[gpu]（onnxruntime-gpu）・Pillow・numpy。モデルは初回に ~/.u2net に落ちてくる。
"""
import argparse
import os
import sys
import time

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALPHA_FLOOR, ALPHA_CEIL = 8, 248
MAXKB = {"portraits": 80, "monsters": 60}


def corner_bg(a):
    h, w = a.shape[:2]
    cs = [a[2, 2, :3], a[2, w - 3, :3], a[h // 2, 2, :3], a[h // 2, w - 3, :3], a[h - 3, 2, :3], a[h - 3, w - 3, :3]]
    cs = [c for c in cs if c.min() > 200]
    return np.mean(cs, axis=0) if cs else np.array([255.0, 255.0, 255.0])


def decontaminate(rgb, alpha, B):
    a = alpha.astype(np.float32) / 255
    out = rgb.astype(np.float32)
    m = (a > 0) & (a < 1)
    am = a[m][:, None]
    out[m] = (out[m] - (1 - am) * B) / np.maximum(am, 0.08)
    return np.clip(out, 0, 255).astype(np.uint8)


def cut(session, path, remove):
    src = Image.open(path).convert("RGB")
    mask = remove(src, session=session, only_mask=True, post_process_mask=False)
    alpha = np.array(mask.convert("L"))
    alpha = np.where(alpha < ALPHA_FLOOR, 0, np.where(alpha >= ALPHA_CEIL, 255, alpha)).astype(np.uint8)
    rgb = np.array(src)
    B = corner_bg(np.dstack([rgb, alpha]))
    rgb = decontaminate(rgb, alpha, B)
    rgb[alpha == 0] = 0
    return Image.fromarray(np.dstack([rgb, alpha]), "RGBA")


def save(im, path, kind):
    for q in (88, 84, 80, 76, 72, 68):
        im.save(path, "WEBP", quality=q, method=6, alpha_quality=90)
        if os.path.getsize(path) <= MAXKB[kind] * 1024:
            return q
    return q


def has_alpha(path):
    im = Image.open(path)
    if im.mode != "RGBA":
        return False
    return np.array(im)[:, :, 3].min() < 250


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dirs", default="portraits,monsters")
    ap.add_argument("--only", default="")
    ap.add_argument("--model", default="birefnet-general")
    ap.add_argument("--out", default="")
    ap.add_argument("--in-place", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--flatten", nargs=2, metavar=("IN", "OUT"), help="透明つきの絵を白い背景に戻した png にする（gen_portraits.mjs の差分の元）")
    a = ap.parse_args()
    if a.flatten:
        im = Image.open(a.flatten[0]).convert("RGBA")
        back = Image.new("RGBA", im.size, (255, 255, 255, 255))
        back.alpha_composite(im)
        back.convert("RGB").save(a.flatten[1], "PNG")
        return
    if not a.out and not a.in_place:
        sys.exit("--out <フォルダ> か --in-place を指定する")
    from rembg import new_session, remove

    session = new_session(a.model, providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
    only = set(x for x in a.only.split(",") if x)
    n, t0 = 0, time.time()
    for d in [x for x in a.dirs.split(",") if x]:
        src = os.path.join(ROOT, "assets", d)
        names = sorted(f[:-5] for f in os.listdir(src) if f.endswith(".webp"))
        if only:
            names = [x for x in names if x in only]
        for name in names:
            p = os.path.join(src, name + ".webp")
            if a.in_place and not a.force and has_alpha(p):
                continue
            im = cut(session, p, remove)
            if a.in_place:
                dst = p
            else:
                os.makedirs(os.path.join(a.out, d), exist_ok=True)
                dst = os.path.join(a.out, d, name + ".webp")
            q = save(im, dst, d)
            n += 1
            if n % 50 == 0:
                print(f"{n} 枚（{time.time() - t0:.0f} 秒）", flush=True)
    print(f"切り抜いた絵：{n}（{time.time() - t0:.0f} 秒・{a.model}）")


if __name__ == "__main__":
    main()
