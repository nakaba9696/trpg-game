# ドレイゼの作り直し 3：下塗り（zp_<n>.png）から高い denoise の img2img で描き直す。顔は候補 1 に IP-Adapter（弱め）で寄せる
import base64, io, json, os, sys, urllib.request
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
base = json.load(open(os.path.join(HERE, "zalve_15121.json"), encoding="utf-8"))
ref = Image.open(os.path.join(HERE, "zalve_15121.png")).convert("RGB").crop((392, 60, 792, 460))
b64 = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
REF = b64(ref)
OLD_SAND = ["(pale golden sand pouring from the sleeve cuff:1.5), ", "(sand trickling from the fingertips of the other hand:1.4), ", "(fine cracks on cheek like dry sand:1.2), "]
V = {
 "1": "(disintegration:1.5), (grainy:1.3), (crumbling:1.4), (no legs:1.5), (from the waist down his body collapses into a swirling mound of dry sand:1.6), (sand vortex:1.3), coat hem crumbling into sand",
 "2": "(disintegration:1.5), (the left side of his face is a dry cracked sand crust crumbling away:1.6), (sand falling from the face:1.4), (cracked skin:1.3), the monocle side of the face is human",
 "3": "(disintegration:1.5), (empty sleeve:1.4), (his left arm and hand are formed of dry sand:1.6), (sand hand:1.5), sand grains drifting from the sand hand",
 "4": "(huge dark shadow behind him with long horns:1.6), (horned silhouette:1.4), (shadow on the wall:1.3), the man himself has no horns",
}
EYES = "(amber eyes:1.3), (ringed eyes:1.3), (black sclera:1.2)"
DRY = "(dry sand:1.3), (granular sand particles:1.3), fine grains, dusty"
NEGX = ", (chain:1.3), (cloth:1.3), (rope:1.4), (bandages:1.4), (fabric wrapping:1.4), (sand stream:1.4), (scenery:1.5), (building:1.5), (water:1.6), (liquid:1.6), (fluid:1.5), (splash:1.5), (glowing:1.4), (knife:1.5), (blade:1.4), (hourglass:1.5), (money:1.4), (text:1.4), extra fingers, (extra eyes:1.5), (multiple monocles:1.4), (glasses:1.2), (scar:1.3), (blood:1.3), (horns on head:1.6)"
den = float(os.environ.get("DEN", 0.6)); ipw = float(os.environ.get("IPW", 0.4))
for v in sys.argv[1].split(","):
    p = base["prompt"]
    for o in OLD_SAND: p = p.replace(o, "")
    p = p.replace(", solo,", ", " + V[v] + ", " + EYES + ", " + DRY + ", inhuman, otherworldly, (white background:1.3), solo,")
    neg = base["negative_prompt"] + NEGX + ("" if v != "4" else "").replace("", "")
    if v == "4": neg = neg.replace("(horns:1.4)", "")
    init = b64(Image.open(os.path.join(HERE, f"zp_{v}.png")).convert("RGB"))
    for sd in [int(s) for s in sys.argv[2].split(",")]:
        b = dict(base); b.pop("override_settings_restore_afterwards", None)
        b.update({"prompt": p, "negative_prompt": neg, "seed": sd, "steps": 28, "init_images": [init], "denoising_strength": den, "resize_mode": 0,
                  "alwayson_scripts": {"ControlNet": {"args": [{"enabled": True, "module": "ip-adapter_clip_sdxl_plus_vith", "model": "ip-adapter-plus-face_sdxl_vit-h [368cf551]",
                    "image": REF, "weight": ipw, "guidance_end": 0.8, "control_mode": "Balanced", "resize_mode": "Crop and Resize", "pixel_perfect": True}]}}})
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(os.path.join(HERE, f"z7_{v}_{sd}_{den}.png"))
        b.pop("init_images"); b["init_image"] = f"zp_{v}.png（候補 1 の上の下塗り）"; b["alwayson_scripts"]["ControlNet"]["args"][0]["image"] = "zalve_15121.png の顔"
        json.dump(b, open(os.path.join(HERE, f"z7_{v}_{sd}_{den}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(v, sd, den, flush=True)
