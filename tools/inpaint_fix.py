"""絵の中身の一部だけを WebUI の inpaint で描き直す（顔・線は変えない。確認票 10）。

元の絵（白い背景。透明つきの絵は白に重ねる）を 2 倍にし、手で決めた範囲（多角形）だけを inpaint する。
プロンプトは gen_portraits.mjs --dry のもの（その人の見た目・表情違いの表情）に、直す物の語（add）を足す。
表情違いも同じ範囲・同じ語で直す（ポーズは基本の絵と同じなので）。背景はこのあと tools/keep_orig.py で抜く。

設定 docs/art/inpaint_fix.json：
  {"<id>": {"mask": [[x1,y1,x2,y2,…], …], "add": "…", "neg": "…", "den": 0.75, "region": [x0,y0,x1,y1]}}
    mask：512×640（魔物は 512×512）の座標の多角形。add：直す物の語。neg：出したくない物。den：denoise
使い方（cutout の venv の Python で。WebUI を --api で起動。環境変数 CUTOUT_PYTHON も要る）：
  <venv>/python tools/inpaint_fix.py --src <絵のフォルダ> --out <出すフォルダ> --kind portraits anselmo anselmo_joy …
"""
import argparse
import base64
import io
import json
import os
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import redo_i2i as ri  # noqa: E402

URL = "http://127.0.0.1:7860"


def b64(im):
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--kind", default="portraits", choices=list(ri.SIZE))
    ap.add_argument("--conf", default=os.path.join(ROOT, "docs", "art", "inpaint_fix.json"))
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    confs = json.load(open(a.conf, encoding="utf-8"))
    os.makedirs(a.out, exist_ok=True)
    for i in a.ids:
        base = next(b for b in sorted(confs, key=len, reverse=True) if i == b or i.startswith(b + "_"))
        conf = confs[base]
        if os.path.exists(os.path.join(a.out, i + ".webp")):
            continue  # できた物は飛ばす（止まっても続きから）
        src = Image.open(os.path.join(a.src, i + ".webp")).convert("RGBA")
        white = Image.new("RGBA", src.size, tuple(conf.get("bg", [255, 255, 255])) + (255,))  # 下に敷く色（緑にすればあとでクロマキーで抜ける）
        white.alpha_composite(src)
        W, H = src.size
        # 先に手で描く線（体の前を通る柄など）。輪郭を暗く、中を木の色で
        dl = ImageDraw.Draw(white)
        for poly in conf.get("paint", []):
            # 先に塗りつぶす所（消したい物を、まわりの布の色で）。最後の 3 つが色
            *pts, r_, g_, b_ = poly
            dl.polygon(list(zip(pts[0::2], pts[1::2])), fill=(r_, g_, b_, 255))
        for x0, y0, x1, y1, w, col in conf.get("lines", []):
            dl.line([(x0, y0), (x1, y1)], fill=(60, 40, 25, 255), width=w + 4)
            dl.line([(x0, y0), (x1, y1)], fill=tuple(col) + (255,), width=w)
        K = 2
        big = white.convert("RGB").resize((W * K, H * K), Image.LANCZOS)
        m = Image.new("L", (W * K, H * K), 0)
        d = ImageDraw.Draw(m)
        polys = conf["mask"] + (conf.get("mask_variants", []) if i != base else [])
        for p in polys:
            d.polygon([(x * K, y * K) for x, y in zip(p[0::2], p[1::2])], fill=255)
        settings, pos, neg = ri.dry(a.kind, i)
        for old, new in conf.get("replace", []):
            pos = pos.replace(old, new)
        pos = pos + ", " + conf.get("add", "")
        neg = neg + ", " + conf.get("neg", "")
        body = dict(settings)
        body.update({"init_images": [b64(big)], "mask": b64(m), "mask_blur": 6, "inpainting_fill": 1, "inpaint_full_res": True,
                     "inpaint_full_res_padding": 48, "inpainting_mask_invert": 0, "denoising_strength": conf.get("den", 0.75),
                     "prompt": pos, "negative_prompt": neg, "seed": conf.get("seed", -1), "width": W * K, "height": H * K})
        body.pop("enable_hr", None)
        r = json.loads(urllib.request.urlopen(urllib.request.Request(URL + "/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
        out = Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").resize((W, H), Image.LANCZOS)
        # 範囲の外は元の画素のまま（線・顔を変えない）
        mm = m.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.5))
        res = Image.composite(out, white.convert("RGB"), mm)
        res.save(os.path.join(a.out, i + ".webp"), "WEBP", lossless=True)
        print(i, json.loads(r["info"]).get("seed"), flush=True)


if __name__ == "__main__":
    main()
