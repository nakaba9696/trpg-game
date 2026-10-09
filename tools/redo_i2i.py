"""元の絵を土台に、WebUI の img2img で「単色の背景の上の同じ絵」を描き直し、BiRefNet で抜いて透明つきにする（作り直しの方法 2）。

元の絵（白い背景）の白い背景だけを、絵に無い単色（青・緑・灰）に置き換えて土台にし、denoise 0.4 前後で描き直す。
形・色・角・光り方は元の絵のまま残り、白い背景にまぎれていた光・煙・足元の物も単色の上で描き直される。
そのあと BiRefNet（--keep-color --key 40,110）で抜き、縁に残った背景の色（青み・緑み）を取り除く（despill）。

プロンプトは gen_portraits.mjs の --dry が出すもの（人物・差分・魔物の一覧のタグ）をそのまま使い、白い背景の語だけ単色に替える。
dreamshaperXL_lightningDPMSDE は使わない（設定のモデル＝waiIllustriousSDXL のまま）。

使い方（cutout の venv の Python で。リポジトリの根で。WebUI を --api で起動しておく。環境変数 CUTOUT_PYTHON も要る）：
  <venv>/python tools/redo_i2i.py --kind monsters --orig <元の絵の根> --out <出す根> e4_ashwyrm e3_midori …
  <venv>/python tools/redo_i2i.py --kind portraits --orig <元の絵の根> --out <出す根> aurelia aurelia_joy …
    --den 0.4（denoise）・--init-cut <根>（土台を元の絵でなく、この透明つきの絵を単色に重ねたものにする。ティモの木を消すときなど）
    --step draw,cut（描く・抜くのどちらか片方だけもできる。出来た物は飛ばすので、止まっても続きから）
  出す物：<out>/raw/<kind>/<id>.webp（単色の背景）・<id>.json（背景の色）・<out>/cut/<kind>/<id>.webp（透明つき）
"""
import argparse
import base64
import io
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "http://127.0.0.1:7860"
SIZE = {"portraits": (512, 640), "monsters": (512, 512)}
MAXKB = {"portraits": 80, "monsters": 60}
BGS = {"blue": ((20, 60, 200), "plain blue background"), "green": ((0, 170, 70), "plain green background"), "grey": ((128, 128, 128), "plain grey background")}


def dry(kind, i):
    """gen_portraits.mjs --dry の、送る設定・プロンプト・ネガティブ"""
    args = ["node", os.path.join(ROOT, "tools", "gen_portraits.mjs"), "--only", i, "--force", "--dry"]
    if kind == "monsters":
        args.insert(2, "--monsters")
    elif "_" in i and not i.startswith("kind_"):
        args.insert(2, "--variants")
    out = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, encoding="utf-8").stdout
    pos = re.search(r"^\s+\+ (.*)$", out, re.M).group(1)
    m = re.search(r"送る設定：(\{.*\})", out)
    n = re.search(r"^\s+- (.*)$", out, re.M)
    if m and n:
        settings, neg = json.loads(m.group(1)), n.group(1)
    else:  # 差分の --dry は送る設定とネガティブを出さないので、基本の絵のもの（大きさ・サンプラー・モデル・ネガティブ）を使う
        base = next(b for b in (i.rsplit("_", k)[0] for k in (1, 2)) if os.path.exists(os.path.join(ROOT, "assets", kind, b + ".webp")))
        settings, _, neg = dry(kind, base)
    return settings, pos, neg


def pick_bg(rgb, fg):
    """絵の中にいちばん少ない色の背景を選ぶ（その色に近い画素の割合が小さいもの）"""
    px = rgb[fg].astype(np.float32)
    best, score = "blue", 9.0
    for name, (c, _) in BGS.items():
        near = (np.abs(px - np.array(c, np.float32)).max(axis=1) < 70).mean() if len(px) else 0
        if near < score:
            best, score = name, near
    return best


def build_init(orig_path, mask_path, size):
    """土台：元の絵の、体（mask の透明でない所）はそのまま、背景だけを単色に。
    mask は BiRefNet＋色を残す切り抜き（白い服・白い肌を背景と見なさないため。色だけで決めると白い服まで塗ってしまう）"""
    o = np.array(Image.open(orig_path).convert("RGB").resize(size, Image.LANCZOS)).astype(np.float32)
    c = np.array(Image.open(mask_path).convert("RGBA").resize(size, Image.LANCZOS)).astype(np.float32)
    a = c[..., 3:] / 255
    name = pick_bg(o.astype(np.uint8), a[..., 0] > 0.5)
    col = np.array(BGS[name][0], np.float32)
    return Image.fromarray((o * a + col * (1 - a)).astype(np.uint8)), name


def img2img(init, settings, pos, neg, den):
    buf = io.BytesIO()
    init.save(buf, "PNG")
    body = dict(settings)
    body.update({"init_images": [base64.b64encode(buf.getvalue()).decode()], "denoising_strength": den, "prompt": pos, "negative_prompt": neg, "seed": -1})
    body.pop("enable_hr", None)
    req = urllib.request.Request(URL + "/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"})
    r = json.loads(urllib.request.urlopen(req, timeout=1800).read())
    return Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB"), json.loads(r["info"]).get("seed")


def despill(im, bgname, band=4):
    """縁（透明な所から band 画素以内）の、背景の色に引っ張られた色を抜く（青なら b を max(r, g) まで下げる）"""
    a = np.array(im.convert("RGBA")).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    solid = alpha > 0
    edge = solid & (ndimage.distance_transform_edt(solid) <= band)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if bgname == "blue":
        b[edge] = np.minimum(b[edge], np.maximum(r, g)[edge])
    elif bgname == "green":
        g[edge] = np.minimum(g[edge], np.maximum(r, b)[edge])
    return Image.fromarray(np.dstack([r, g, b, alpha]).clip(0, 255).astype(np.uint8), "RGBA")


def save(im, path, kind):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for q in (88, 84, 80, 76, 72, 68):
        im.save(path, "WEBP", quality=q, method=6, alpha_quality=90)
        if os.path.getsize(path) <= MAXKB[kind] * 1024:
            break


def session():
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import cutout_model as cm
    import onnxruntime
    if hasattr(onnxruntime, "preload_dlls"):
        onnxruntime.preload_dlls()  # pip の CUDA 12・cuDNN 9 の部品を読む（無いと CPU に戻って遅い）
    from rembg import new_session, remove
    return cm, remove, new_session("birefnet-general", providers=[("CUDAExecutionProvider", {"cudnn_conv_algo_search": "HEURISTIC"}), "CPUExecutionProvider"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", default="monsters", choices=list(SIZE))
    ap.add_argument("--orig", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--den", type=float, default=0.4)
    ap.add_argument("--init-cut", default="")
    ap.add_argument("--step", default="mask,draw,cut", help="mask（元の絵の体の形）・draw（描く）・cut（抜く＋despill）")
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    steps = a.step.split(",")
    raw = os.path.join(a.out, "raw", a.kind)
    os.makedirs(raw, exist_ok=True)
    masks = os.path.join(a.out, "mask", a.kind)
    if "mask" in steps:
        os.makedirs(masks, exist_ok=True)
        todo = [i for i in a.ids if not os.path.exists(os.path.join(masks, i + ".webp"))]
        if todo:
            cm, remove, ses = session()
            for i in todo:
                cut = os.path.join(a.init_cut, a.kind, i + ".webp") if a.init_cut else ""
                if cut and os.path.exists(cut):
                    Image.open(cut).save(os.path.join(masks, i + ".webp"), "WEBP", lossless=True)
                else:
                    cm.cut(ses, os.path.join(a.orig, a.kind, i + ".webp"), remove, keep_color=True).save(os.path.join(masks, i + ".webp"), "WEBP", lossless=True)
                print(f"mask {i}", flush=True)
    if "draw" in steps:
        for i in a.ids:
            if os.path.exists(os.path.join(raw, i + ".webp")):
                continue
            t = time.time()
            settings, pos, neg = dry(a.kind, i)
            W, H = settings.get("width", 1024), settings.get("height", 1024)
            init, bg = build_init(os.path.join(a.orig, a.kind, i + ".webp"), os.path.join(masks, i + ".webp"), (W, H))
            if a.init_cut and os.path.exists(os.path.join(a.init_cut, a.kind, i + ".webp")):
                # 土台を透明つきの絵（木を消したティモなど）にする：mask の色をそのまま使う
                c = np.array(Image.open(os.path.join(masks, i + ".webp")).convert("RGBA").resize((W, H), Image.LANCZOS)).astype(np.float32)
                al = c[..., 3:] / 255
                init = Image.fromarray((c[..., :3] * al + np.array(BGS[bg][0], np.float32) * (1 - al)).astype(np.uint8))
            tag = f"({BGS[bg][1]}:1.2)"
            pos = re.sub(r"\(?white background(:[\d.]+)?\)?", tag, pos)
            if tag not in pos:
                pos += ", " + tag
            out, seed = img2img(init, settings, pos, neg, a.den)
            out.resize(SIZE[a.kind], Image.LANCZOS).save(os.path.join(raw, i + ".webp"), "WEBP", quality=92)
            json.dump({"bg": bg, "seed": seed, "den": a.den}, open(os.path.join(raw, i + ".json"), "w"))
            print(f"draw {i} bg={bg} {time.time() - t:.0f}s", flush=True)
    if "cut" in steps:
        cm, remove, ses = session()
        for i in a.ids:
            src = os.path.join(raw, i + ".webp")
            dst = os.path.join(a.out, "cut", a.kind, i + ".webp")
            if not os.path.exists(src) or os.path.exists(dst):
                continue
            bg = json.load(open(os.path.join(raw, i + ".json")))["bg"]
            im = cm.cut(ses, src, remove, keep_color=True, key=(40, 110))
            save(despill(im, bg), dst, a.kind)
            print(f"cut {i}", flush=True)


if __name__ == "__main__":
    main()
