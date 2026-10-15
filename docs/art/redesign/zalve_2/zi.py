# ドレイゼの作り直し 2：候補 1（seed 15121）の上に、場所ごとの inpaint で人でない異質さを足す
#   python zi.py <組> <seed>   組は A〜D。部品を順に重ねる
import base64, io, json, os, sys, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
base = json.load(open(os.path.join(HERE, "zalve_15121.json"), encoding="utf-8"))
PRE = base["prompt"].split("adult, 45 years old")[0]
CORE = "adult, 45 years old, tall, thin, pale tan skin, dark brown slicked back hair, grey temples, (silver monocle:1.2), monocle chain, thin smile, dark frock coat, waistcoat, white shirt, black necktie"
NEG = base["negative_prompt"] + ", (person:1.4), (face:1.3), (tiny person:1.5), (white sclera:1.3), (glowing:1.4), (glowing cracks:1.4), (horns:1.5), (knife:1.5), (hourglass:1.5), (money:1.4), (text:1.4), extra fingers, (extra eyes:1.5), (multiple monocles:1.4), (glasses:1.3), blood"
# 部品：(マスクの形, 足すタグ, denoise)。座標は 1024×1280
PART = {
 "sandhand": ([("nodark", 780, 1120, 1024, 1280)], "(no hand:1.5), (a thick stream of pale sand pouring out of the empty shirt cuff:1.8), the hand has crumbled into sand, sand grains", 0.9),
 "cracks":   ([("e", 470, 170, 720, 420), ("r", 540, 380, 680, 470)], "(cracked skin like dry sandstone:1.7), (dark cracks spreading across the cheek, temple and neck:1.7), (pieces of skin flaking off as sand:1.4), (sand trickling out of the cracks:1.4), not glowing", 0.7),
 "eyes":     ([("r", 515, 215, 705, 290)], "(black sclera:2.0), (black eyeballs with amber irises:1.6), (ringed eyes:1.4), narrow eyes, silver monocle", 0.78),
 "hair":     ([("e", 430, 0, 740, 190)], "(hair tips dissolving into drifting sand:1.6), sand particles blowing from the hair", 0.6),
 "hem":      ([("r", 0, 1050, 1024, 1280)], "(coat dissolving into drifting sand:1.6), (sand particles blowing away from the coat:1.4)", 0.75),
 "floating": ([("ring",)], "(many sand grains floating in the air around him:1.8), (swirling streams of sand around the body:1.6), white background", 0.88),
 "bookhand": ([("skin", 30, 450, 270, 720)], "(hand made of sand:1.7), (sand crumbling from the fingers and wrist:1.6), (grainy sand texture skin:1.5), (sand pouring from the hand:1.5), holding a red book", 0.62),
 "smile":    ([("r", 560, 300, 680, 360)], "(fixed unmoving smile:1.4), (uncanny thin smile:1.3)", 0.5),
}
SET = {"H": ["bookhand"], "A": ["sandhand"], "B": ["cracks"], "C": ["cracks", "sandhand"], "D": ["smile"], "S": ["sandhand"], "K": ["cracks"]}


def b64(im):
    bio = io.BytesIO(); im.save(bio, "PNG"); return base64.b64encode(bio.getvalue()).decode()


def mask_of(shapes, im):
    m = Image.new("L", im.size, 0); d = ImageDraw.Draw(m)
    for s in shapes:
        if s[0] == "e": d.ellipse(s[1:], fill=255)
        elif s[0] == "r": d.rectangle(s[1:], fill=255)
        elif s[0] == "nodark":   # 四角の中の、暗い服でない所（袖口・手・地）
            from scipy import ndimage
            a = np.array(im.convert("L")); x0, y0, x1, y1 = s[1:]
            sel = np.zeros(a.shape, bool); sel[y0:y1, x0:x1] = True
            dark = ndimage.binary_dilation(a < 110, iterations=6)
            m = Image.fromarray(np.maximum(np.array(m), (sel & ~dark) * 255).astype(np.uint8)); d = ImageDraw.Draw(m)
        elif s[0] == "skin":   # 四角の中の肌の色の所（帳簿の赤・袖の白は外す）
            from scipy import ndimage
            a = np.array(im.convert("RGB")).astype(int); x0, y0, x1, y1 = s[1:]
            sel = np.zeros(a.shape[:2], bool); sel[y0:y1, x0:x1] = True
            skin = (a[..., 0] > 170) & (a[..., 0] - a[..., 2] > 25) & (a[..., 0] - a[..., 1] < 70) & (a[..., 1] > 120)
            m = Image.fromarray(np.maximum(np.array(m), (ndimage.binary_dilation(sel & skin, iterations=5) & sel) * 255).astype(np.uint8)); d = ImageDraw.Draw(m)
        elif s[0] == "ring":   # 体のまわりの白い地（人の輪郭から 20〜110px 外）
            a = np.array(im.convert("L")); fg = a < 235
            from scipy import ndimage
            fg = ndimage.binary_fill_holes(ndimage.binary_closing(fg, iterations=5))
            ring = ndimage.binary_dilation(fg, iterations=110) & ~ndimage.binary_dilation(fg, iterations=20)
            m = Image.fromarray((np.maximum(np.array(m), ring * 255)).astype(np.uint8)); d = ImageDraw.Draw(m)
    return m.filter(ImageFilter.GaussianBlur(3))


def inpaint(im, part, seed):
    shapes, tags, den = PART[part]
    m = mask_of(shapes, im)
    b = {"prompt": ", ".join([PRE.rstrip(", "), CORE, tags, "inhuman, otherworldly, solo, simple background, white background"]), "negative_prompt": NEG,
         "seed": seed, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic", "width": 1024, "height": 1280,
         "init_images": [b64(im)], "mask": b64(m), "denoising_strength": den, "inpainting_fill": 1, "inpaint_full_res": part not in ("floating", "hem"),
         "inpaint_full_res_padding": 64, "mask_blur": 4, "override_settings": base["override_settings"]}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
    b.pop("init_images"); b.pop("mask")
    return Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB"), b


if __name__ == "__main__":
    for v in sys.argv[1].split(","):
        for sd in [int(s) for s in sys.argv[2].split(",")]:
            im = Image.open(os.path.join(HERE, "zalve_15121.png")).convert("RGB"); log = {"base": "zalve_15121.png（候補 1）", "steps": []}
            for k, p in enumerate(SET[v]):
                im, b = inpaint(im, p, sd + k); b["part"] = p; b["mask_shapes"] = PART[p][0]; log["steps"].append(b)
            im.save(os.path.join(HERE, f"zi_{v}_{sd}.png")); json.dump(log, open(os.path.join(HERE, f"zi_{v}_{sd}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            print(v, sd, flush=True)
