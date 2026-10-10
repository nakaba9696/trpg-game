"""確認票 7 の 27 件：元の絵に寄せたプロンプトで、最初から単色の背景（緑。緑の多い絵はマゼンタ）に描き、クロマキーで抜く。

プロンプトは一覧（portraits.json・monsters.json）の見た目のタグ（元の絵を描いたタグ）から、景色の語（沼・麦畑・岩場・雨・月など）を除き、
白い背景の語を単色の背景に替える。透明度は「背景の色の強さ」（緑なら G − max(R,B)、マゼンタなら min(R,B) − G）だけで決める（BiRefNet は使わない）。

使い方（cutout の venv の Python で。WebUI を --api で起動。環境変数 CUTOUT_PYTHON も要る）：
  <venv>/python tools/redo7_fresh.py --out <出す根> --n 2 e4_bogleech annelise …   … 1 件につき n 案を描いて抜く
出す物：<out>/raw/<id>_<k>.png（単色の背景）・<out>/cut/<id>_<k>.webp（透明つき）
"""
import argparse
import base64
import io
import json
import os
import re
import sys
import urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import chroma_redo as cr  # noqa: E402
import redo_i2i as ri  # noqa: E402

URL = "http://127.0.0.1:7860"
MONSTERS = set("e4_bogleech e4_ossuaryhound e4k_inkling shuten e4_ashogre e4_cropcrow e4_rainslug e4_relicmole e4_satchelrat e4_tidecrab_x e4k_drowned e4k_moonhare general mimic spider".split())
# 景色・背景の語（描かない）
SCENE = ["swamp", "ossuary", "flock", "wheat field", "rain", "dirt", "rocky shore", "moonlight", "two moons", "spider web", "smoke", "sitting on stone steps"]
# 人ごと・魔物ごとの足し引き
EXTRA_POS = {"e4_bogleech": "(green and dark green striped body:1.3), one big round yellow eye, long pink tongue, drooling slime, rearing up", "e4k_moonhare": "(round fluffy white hare:1.3), big, chubby, blue glow around it, long ears, cute", "e4_relicmole": "standing, holding a gold coin in both hands, big digging claws", "spider": "white spider web pattern on its abdomen", "e4_ossuaryhound": "skull head, green glowing eyes", "rionetta": "standing", "e4k_moonhare": "standing on hind legs", "mirza": "red parasol"}
EXTRA_NEG = {"e4_relicmole": "pile of coins, treasure pile", "e4k_moonhare": "deer, llama, long legs", "e4_bogleech": "ring, circle, donut", "mirza": "white cloth, veil, cloth under umbrella, curtain"}
KEY_OF = {"e4_ossuaryhound": "magenta", "e4_bogleech": "magenta"}  # 緑の光・緑がかった体
BG_TAG = {"green": "simple background, (flat solid green background:1.4), green screen, no gradient",
          "magenta": "simple background, (flat solid magenta background:1.4), no gradient"}
NEG_ADD = "scenery, landscape, sky, ground, grass, water surface, fog, smoke, gradient background, floor, shadow on background, light rays, glow on background"


def prompt(i):
    kind = "monsters" if i in MONSTERS else "portraits"
    settings, pos, neg = ri.dry(kind, i)
    for w in SCENE:
        pos = re.sub(r",\s*" + re.escape(w) + r"\b", "", pos)
    key = KEY_OF.get(i, "green")
    pos = re.sub(r"\(?(plain grey background|white background)(:[\d.]+)?\)?", BG_TAG[key], pos)
    if "solid" not in pos:
        pos += ", " + BG_TAG[key]
    if i in EXTRA_POS:
        pos += ", " + EXTRA_POS[i]
    neg = neg + ", " + NEG_ADD + (", " + EXTRA_NEG[i] if i in EXTRA_NEG else "")
    return kind, settings, pos, neg, key


def txt2img(settings, pos, neg):
    body = dict(settings)
    body.update({"prompt": pos, "negative_prompt": neg, "seed": -1})
    body.pop("enable_hr", None)
    r = json.loads(urllib.request.urlopen(urllib.request.Request(URL + "/sdapi/v1/txt2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
    return Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB"), json.loads(r["info"]).get("seed")


def key_cut(rgb, key, min_bg=0):
    """緑なら G − max(R,B)、マゼンタなら min(R,B) − G を、縁の値を基準に透明度にする（chroma_redo の border_key_cut と同じ考え）"""
    if key == "green":
        return cr.border_key_cut(rgb, min_bg)
    # マゼンタは、G と R・B を入れ替えて緑として扱い、色を戻す
    # 「マゼンタの強さ」min(R,B) − G を、緑の強さ G − max(R,B) の形にする（G に min(R,B)、R と B に元の G）
    sw = np.empty_like(rgb)
    sw[..., 0] = rgb[..., 1]
    sw[..., 1] = np.minimum(rgb[..., 0], rgb[..., 2])
    sw[..., 2] = rgb[..., 1]
    out, B = cr.border_key_cut(sw.astype(np.uint8), min_bg)
    a = out[..., 3]
    # 色は元の絵から（縁のマゼンタかぶりだけ抜く）
    c = rgb.astype(np.float32)
    ex = np.clip(np.minimum(c[..., 0], c[..., 2]) - c[..., 1], 0, None)
    c[..., 0] -= ex
    c[..., 2] -= ex
    col = c.clip(0, 255).astype(np.uint8)
    col[a == 0] = 0
    return np.dstack([col, a]), B


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=2)
    ap.add_argument("--cut-only", action="store_true")
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, "raw"), exist_ok=True)
    os.makedirs(os.path.join(a.out, "cut"), exist_ok=True)
    for i in a.ids:
        kind, settings, pos, neg, key = prompt(i)
        size = ri.SIZE[kind]
        for k in range(1, a.n + 1):
            raw = os.path.join(a.out, "raw", f"{i}_{k}.png")
            if not os.path.exists(raw) and not a.cut_only:
                im, seed = txt2img(settings, pos, neg)
                im.resize(size, Image.LANCZOS).save(raw)
                print(f"draw {i}_{k} seed {seed} key {key}", flush=True)
            if not os.path.exists(raw):
                continue
            rgba, B = key_cut(np.array(Image.open(raw).convert("RGB")), key, 100 if kind == "monsters" else 0)
            rgba = cr.clean(rgba, key)
            ri.save(Image.fromarray(rgba, "RGBA"), os.path.join(a.out, "cut", f"{i}_{k}.webp"), kind)


if __name__ == "__main__":
    main()
