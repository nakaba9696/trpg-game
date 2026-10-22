# ファリナ（候補 4・seed 19206）の差分：基本の絵（白い地・1024×1280）から全身の img2img、表情のタグだけ差し替え
import base64, io, json, os, sys, urllib.request
from PIL import Image
V = {"joy": "(gentle smile:1.4), closed mouth, soft eyes", "anger": "(angry:1.6), (glaring:1.6), (v-shaped eyebrows:1.6), (frown:1.5), (furrowed brow:1.4), cold eyes",
     "sorrow": "(sad:1.7), (teary eyes:1.3), (worried eyebrows:1.7), (frown:1.4), (looking down:1.4), (downcast eyes:1.3)", "fun": "(smile:1.5), (both eyes closed:1.7), (^_^:1.2), happy",
     "faint_smile": "(rare gentle smile:1.4), (soft eyes:1.3), closed mouth", "panic": "(flustered:1.5), (panicking:1.4), (sweatdrop:1.4), (wide-eyed:1.3), (open mouth:1.2)",
     "cold": "(cold eyes:1.6), (narrowed eyes:1.7), (half-closed eyes:1.4), (contempt:1.3), (looking down on viewer:1.3), (expressionless:1.3)"}
base = json.load(open("farina_19206.json", encoding="utf-8"))
src = base64.b64encode(open("farina_19206.png", "rb").read()).decode()
den = float(os.environ.get("DEN", 0.5))
for m in (sys.argv[1].split(",") if len(sys.argv) > 1 else V):
    b = dict(base); b.pop("override_settings_restore_afterwards", None)
    b["prompt"] = base["prompt"].replace("serious expression", V[m])
    b["negative_prompt"] = base["negative_prompt"] + (", (one eye closed:1.6), (wink:1.6)" if m == "fun" else "") + ", (anger vein:1.6)"
    b.update({"init_images": [src], "denoising_strength": den, "resize_mode": 0, "seed": int(os.environ.get("SEED", 19206))})
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"v_{m}_{den}{os.environ.get('SEED','')}.png")
    b.pop("init_images"); b["init_image"] = "farina_19206.png（基本の絵・白い地）"
    json.dump(b, open(f"v_{m}_{den}{os.environ.get('SEED','')}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(m, flush=True)
