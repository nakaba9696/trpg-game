# シグルンの差分：基本の絵（白い地・1024×1280）から全身の img2img、seed 同じ・表情のタグだけ差し替え（denoising は style.json の 0.5）
import base64, io, json, os, sys, urllib.request
from PIL import Image
R = "../redesign/"
base = json.load(open(R + "zalve_15121.json", encoding="utf-8"))
src = base64.b64encode(open(R + "zalve_15121.png", "rb").read()).decode()
V = {"joy": "(gentle smile:1.4), (soft narrowed eyes:1.3), closed mouth, calm", "anger": "(cold glare:1.5), (narrowed eyes:1.4), (furrowed brows:1.3), (no smile:1.3), closed mouth", "sorrow": "(melancholic:1.4), (downcast eyes:1.4), (worried eyebrows:1.3), closed mouth, no smile", "fun": "(amused smile:1.4), (one corner of the mouth raised:1.3), (half-closed eyes:1.2), closed mouth", "smug": "(smug:1.5), (smirk:1.4), (raised eyebrow:1.4), (looking down on viewer:1.2), closed mouth"}
OLD = "thin smile"
assert OLD in base["prompt"]
NEGX = ", (open mouth:1.4), (teeth:1.4), (glasses:1.3), (multiple monocles:1.4), (blush:1.4), (tears:1.4), (anger vein:1.5), (open mouth:1.2), (teeth:1.3), sweat, comical, chibi"
den = float(os.environ.get("DEN", 0.5))
for m in sys.argv[1].split(","):
    for sd in [int(s) for s in (sys.argv[2].split(",") if len(sys.argv) > 2 else ["15121"])]:
        b = dict(base); b.pop("override_settings_restore_afterwards", None)
        b["prompt"] = base["prompt"].replace(OLD, V[m]); b["negative_prompt"] = base["negative_prompt"] + NEGX
        b.update({"init_images": [src], "denoising_strength": den, "resize_mode": 0, "seed": sd})
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"v_{m}_{sd}_{den}.png")
        b.pop("init_images"); b["init_image"] = "zalve_15121.png（基本の絵・白い地）"
        json.dump(b, open(f"v_{m}_{sd}_{den}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(m, sd, den, flush=True)
