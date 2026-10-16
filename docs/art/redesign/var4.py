# マグダ・マリオン・ティリア・ユリナの差分：基本の絵（白い地・1024×1280）から全身の img2img、seed は基本と同じ・表情のタグだけ差し替え（denoising 0.5）
# 出来た絵は、顔だけを基本の絵に重ねて使う（facepaste）
import base64, io, json, os, sys, urllib.request
from PIL import Image
R = "../redesign/"
SEED = {"magda": 16213, "marion": 16202, "tiria": 16213, "yurina": 16213}
OLD = {"magda": "confident, loud grin", "marion": "kind smile", "tiria": "gentle smile, closed eyes", "yurina": "smirk, carefree"}
V = {
 "magda": {"joy": "(loud laugh:1.3), open mouth, happy", "anger": "(shouting:1.3), (angry:1.4), (v-shaped eyebrows:1.3), frown, open mouth",
           "sorrow": "(sad:1.4), (worried eyebrows:1.3), frown, looking down, closed mouth", "fun": "(laughing:1.4), (closed eyes:1.4), (open mouth:1.3), happy",
           "sparkle": "(excited:1.3), (sparkling eyes:1.4), open mouth, smile"},
 "marion": {"joy": "(warm smile:1.3), closed eyes, happy", "anger": "(angry:1.6), (frown:1.4), (v-shaped eyebrows:1.5), (open mouth:1.3), shouting, (round glasses:1.4)",
            "sorrow": "(sad:1.5), (worried eyebrows:1.5), (frown:1.3), looking down, (round glasses:1.3)", "fun": "(laughing:1.3), open mouth, closed eyes",
            "exasperated": "(exasperated:1.3), sigh, (half-closed eyes:1.3), frown"},
 "tiria": {"joy": "(smile:1.3), open mouth, happy, closed eyes", "anger": "(pout:1.3), (puffed cheeks:1.1), frown, (v-shaped eyebrows:1.3), (open eyes:1.4), hazel eyes",
           "sorrow": "(sad:1.4), (teary eyes:1.3), (worried eyebrows:1.3), (open eyes:1.4), hazel eyes", "fun": "(laughing:1.3), open mouth, closed eyes",
           "panic": "(flustered:1.3), panicking, sweatdrop, open mouth, (open eyes:1.3), hazel eyes, wavy mouth"},
 "yurina": {"joy": "(smile:1.3), happy", "anger": "(angry:1.5), (v-shaped eyebrows:1.6), (frown:1.3), (clenched teeth:1.2)",
            "sorrow": "(sad:1.4), (worried eyebrows:1.5), (frown:1.2), looking down, closed mouth", "fun": "(laughing:1.4), (open mouth:1.3), (smile:1.2)",
            "cold": "(expressionless:1.5), (cold:1.4), (closed mouth:1.3), (serious:1.4), (straight mouth:1.2)"}}
NEGX = {"tiria": ", (crying:1.2)", "magda": "", "marion": "", "yurina": ", (open eyes:1.4)"}
den = float(os.environ.get("DEN", 0.5))
who = sys.argv[1]
base = json.load(open(R + f"{who}_{SEED[who]}.json", encoding="utf-8"))
src = base64.b64encode(open(R + f"{who}_{SEED[who]}.png", "rb").read()).decode()
assert OLD[who] in base["prompt"], who
for m in (sys.argv[2].split(",") if len(sys.argv) > 2 else V[who]):
    b = dict(base); b.pop("override_settings_restore_afterwards", None)
    p = base["prompt"].replace(OLD[who], V[who][m])
    if who == "tiria" and "open eyes" in V[who][m]: p = p.replace("gentle eyes, ", "")
    if who == "marion" and m in ("anger", "sorrow", "exasperated"): p = p.replace("smiling eyes, ", "")
    if who == "yurina" and m != "joy": p = p.replace("(squinting smiling eyes:1.2), ", "(narrow eyes:1.2), ")
    b["prompt"] = p; b["negative_prompt"] = base["negative_prompt"] + NEGX[who] + (", (open eyes:1.3)" if who == "tiria" and "closed eyes" in V[who][m] else "")
    b.update({"init_images": [src], "denoising_strength": den, "resize_mode": 0, "seed": SEED[who]})
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"v_{who}_{m}_{den}.png")
    b.pop("init_images"); b["init_image"] = f"{who}_{SEED[who]}.png（基本の絵・白い地）"
    json.dump(b, open(f"v_{who}_{m}_{den}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(who, m, den, flush=True)
