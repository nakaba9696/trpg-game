"""Qwen-Image 2.1（ComfyUI）で、白い背景の絵から透明つきの絵を作る（背景を消す編集）。試し・作り直し用。

ComfyUI（Qwen-Image 2.1 の 3 つのファイルを models/ に入れたもの）を先に起動しておく（docs/art/redo_review/README.md）。
公式の「Remove Background: Qwen Image 2.1」の作り（参照の絵＋「背景を消して PNG で」）を API で送り、出た PNG を
元の大きさ（人物 512×640・魔物 512×512）の webp にする。

使い方（cutout の venv の Python で。リポジトリの根で）：
  <venv>/python tools/qwen_cut.py --src <元の絵のフォルダ> --out <出すフォルダ> --kind monsters e3_midori e4_ashwyrm …
  --prompt で指示を足す（例：「足元の溶岩は残す」）。--keep で、残す物を英語で足す（例：--keep "glowing lava under its feet"）
"""
import argparse
import io
import json
import os
import time
import urllib.parse
import urllib.request
import uuid

from PIL import Image

URL = "http://127.0.0.1:8188"
SIZE = {"portraits": (512, 640), "monsters": (512, 512)}
MAXKB = {"portraits": 80, "monsters": 60}
BASE = "Remove the background, and output a PNG image"


def post(path, data, ctype="application/json"):
    req = urllib.request.Request(URL + path, data=data, headers={"Content-Type": ctype})
    return json.loads(urllib.request.urlopen(req).read())


def upload(path):
    b = "----" + uuid.uuid4().hex
    name = os.path.basename(path).rsplit(".", 1)[0] + ".png"
    buf = io.BytesIO()
    Image.open(path).convert("RGB").save(buf, "PNG")
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\nContent-Type: image/png\r\n\r\n").encode() + buf.getvalue() + (
        f"\r\n--{b}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{b}--\r\n").encode()
    return post("/upload/image", body, "multipart/form-data; boundary=" + b)["name"]


def graph(image, prompt, seed, steps):
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "qwen_image_2.1_int8_convrot.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_8b_w4a8.safetensors", "type": "qwen_image", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_2.1_vae_bf16.safetensors"}},
        "4": {"class_type": "LoadImage", "inputs": {"image": image}},
        "5": {"class_type": "QwenImage21Cache", "inputs": {"model": ["1", 0], "device": "auto", "dtype": "default"}},
        "6": {"class_type": "TextEncodeQwenImage21", "inputs": {"clip": ["2", 0], "prompt": prompt, "negative_prompt": "", "vae": ["3", 0], "resolution": 1024, "images.image_1": ["4", 0]}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["5", 0], "positive": ["6", 0], "negative": ["6", 1], "latent_image": ["6", 2], "seed": seed, "steps": steps, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "qwen_cut"}},
    }


def run(image, prompt, seed, steps):
    pid = post("/prompt", json.dumps({"prompt": graph(image, prompt, seed, steps), "client_id": "qwen_cut"}).encode())["prompt_id"]
    while True:
        h = json.loads(urllib.request.urlopen(f"{URL}/history/{pid}").read())
        if pid in h:
            st = h[pid].get("status", {})
            if st.get("status_str") == "error":
                raise RuntimeError(json.dumps(st.get("messages"))[:800])
            outs = h[pid]["outputs"]
            if outs:
                f = outs["9"]["images"][0]
                q = urllib.parse.urlencode({"filename": f["filename"], "subfolder": f["subfolder"], "type": f["type"]})
                return Image.open(io.BytesIO(urllib.request.urlopen(f"{URL}/view?{q}").read()))
        time.sleep(1)


def save(im, path, kind):
    im = im.convert("RGBA").resize(SIZE[kind], Image.LANCZOS)
    for q in (88, 84, 80, 76, 72, 68):
        im.save(path, "WEBP", quality=q, method=6, alpha_quality=90)
        if os.path.getsize(path) <= MAXKB[kind] * 1024:
            break


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--kind", default="monsters", choices=list(SIZE))
    ap.add_argument("--keep", default="", help="残す物（英語）。指示に「Keep …」として足す")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--steps", type=int, default=25)
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    prompt = BASE + (f". Keep {a.keep} exactly as drawn, as part of the subject." if a.keep else "")
    for i in a.ids:
        t = time.time()
        src = next(os.path.join(a.src, i + e) for e in (".webp", ".png") if os.path.exists(os.path.join(a.src, i + e)))
        im = run(upload(src), prompt, a.seed, a.steps)
        save(im, os.path.join(a.out, i + ".webp"), a.kind)
        print(f"{i}  {im.mode} {im.size}  {time.time() - t:.0f} 秒", flush=True)


if __name__ == "__main__":
    main()
