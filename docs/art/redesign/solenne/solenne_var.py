# シグルンの差分：基本の絵（白い地・1024×1280）から全身の img2img、seed 同じ・表情のタグだけ差し替え（denoising は style.json の 0.5）
import base64, io, json, os, sys, urllib.request
from PIL import Image
R = "../redesign/"
base = json.load(open(R + "solenne_15612.json", encoding="utf-8"))
src = base64.b64encode(open(R + "solenne_15612.png", "rb").read()).decode()
V = {"joy": "(embarrassed smile:1.4), (blush:1.2), (happy:1.2), closed mouth", "anger": "(angry:1.5), (v-shaped eyebrows:1.4), (shouting:1.2), (open mouth:1.2), (blush:1.1)", "sorrow": "(sad:1.5), (teary eyes:1.3), (frown:1.3), (worried eyebrows:1.3)", "fun": "(laughing:1.4), (smile:1.4), (open mouth:1.2), (closed eyes:1.2)", "shy": "(embarrassed:1.5), (heavy blush:1.5), (looking away:1.4), (wavy mouth:1.2)"}
OLD = "serious, frown, closed mouth"
assert OLD in base["prompt"]
NEGX = ", (anger vein:1.5), comical, chibi, (dog:1.6), (knight:1.5), (armor:1.5)"
den = float(os.environ.get("DEN", 0.5))
for m in sys.argv[1].split(","):
    for sd in [int(s) for s in (sys.argv[2].split(",") if len(sys.argv) > 2 else ["15612"])]:
        b = dict(base); b.pop("override_settings_restore_afterwards", None)
        b["prompt"] = base["prompt"].replace(OLD, V[m]); b["negative_prompt"] = base["negative_prompt"] + NEGX
        b.update({"init_images": [src], "denoising_strength": den, "resize_mode": 0, "seed": sd})
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"v_{m}_{sd}_{den}.png")
        b.pop("init_images"); b["init_image"] = "solenne_15612.png（基本の絵・白い地）"
        json.dump(b, open(f"v_{m}_{sd}_{den}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(m, sd, den, flush=True)
