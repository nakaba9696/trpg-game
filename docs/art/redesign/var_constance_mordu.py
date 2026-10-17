# コンスタンス・モルデュの差分：基本の絵（白い地・1024×1280）から全身の img2img、seed は基本と同じ・表情のタグだけ差し替え
import base64, io, json, os, sys, urllib.request
from PIL import Image
B = {"constance": ("constance_16302", "stern, expressionless"), "mordu": ("mordu_16403", "polite smile, closed mouth")}
V = {
 "constance": {"joy": "(faint smile:1.3), (soft eyes:1.2), closed mouth", "anger": "(angry:1.4), (cold glare:1.3), (v-shaped eyebrows:1.4), frown, closed mouth",
               "sorrow": "(sad:1.4), (worried eyebrows:1.4), looking down, closed mouth", "fun": "(wry smile:1.3), (smirk:1.1), half-closed eyes",
               "serious": "(serious:1.3), focused eyes, closed mouth, (furrowed brow:1.1)", "tired": "(tired:1.4), (exhausted:1.2), (half-closed eyes:1.4), sigh",
               "cold": "(cold eyes:1.4), (expressionless:1.3), (narrowed eyes:1.2), closed mouth", "faint_smile": "(slight smile:1.3), (soft eyes:1.3), closed mouth, gentle"},
 "mordu": {"joy": "(smile:1.4), (closed eyes:1.7), (eyes closed:1.5), happy, closed mouth", "anger": "(frown:1.4), (glowing eyes:1.3), (glaring:1.4), (v-shaped eyebrows:1.3), closed mouth",
           "sorrow": "(sad:1.4), looking down, (worried eyebrows:1.3), closed mouth", "fun": "(laughing:1.4), (open mouth:1.3), smile",
           "troubled": "(troubled:1.3), (worried eyebrows:1.4), polite smile", "surprise": "(surprised:1.4), (wide-eyed:1.3), (open mouth:1.2)",
           "sleepy": "(sleepy:1.4), drowsy, (half-closed eyes:1.4), closed mouth"}}
who = sys.argv[1]; den = float(os.environ.get("DEN", 0.5))
f, OLD = B[who]
base = json.load(open(f + ".json", encoding="utf-8"))
src = base64.b64encode(open(f + ".png", "rb").read()).decode()
assert OLD in base["prompt"], who
for m in (sys.argv[2].split(",") if len(sys.argv) > 2 else V[who]):
    b = dict(base); b.pop("override_settings_restore_afterwards", None)
    b["prompt"] = base["prompt"].replace(OLD, V[who][m]); b["negative_prompt"] = base["negative_prompt"]
    if who == "constance": b["prompt"] = b["prompt"].replace("thin glasses", "(black-framed glasses:1.4), (thick rectangular glasses frame:1.3)"); b["negative_prompt"] += ", (rimless eyewear:1.4), (thin glasses frame:1.3), (semi-rimless eyewear:1.3)"
    b.update({"init_images": [src], "denoising_strength": den, "resize_mode": 0, "seed": base["seed"]})
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"v_{who}_{m}_{den}.png")
    b.pop("init_images"); b["init_image"] = f + ".png（基本の絵・白い地）"
    json.dump(b, open(f"v_{who}_{m}_{den}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(who, m, den, flush=True)
