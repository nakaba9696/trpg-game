# 画質の悪い基本の絵を、同じタグの img2img（低い denoise）で描き直して整える。python clean.py id den seed[,seed]
import base64, io, json, os, subprocess, sys, urllib.request
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); WT = "H:/game/origfix-wt"
i, den = sys.argv[1], float(sys.argv[2])
out = subprocess.run(["node", "tools/gen_portraits.mjs", "--only", i, "--dry", "--force"], cwd=WT, capture_output=True, text=True, encoding="utf-8").stdout
pos = [l.strip()[2:] for l in out.splitlines() if l.strip().startswith("+ ")][0]
neg = [l.strip()[2:] for l in out.splitlines() if l.strip().startswith("- ")][0]
base = Image.open(f"{HERE}/../main_orig/assets/portraits/{i}.webp").convert("RGBA"); bg = Image.new("RGBA", base.size, (255, 255, 255, 255)); bg.alpha_composite(base)
big = bg.convert("RGB").resize((1024, 1280), Image.LANCZOS)
bio = io.BytesIO(); big.save(bio, "PNG"); init = base64.b64encode(bio.getvalue()).decode()
st = json.load(open(f"{WT}/docs/art/style.json", encoding="utf-8"))
for sd in [int(s) for s in sys.argv[3].split(",")]:
    b = {"prompt": pos, "negative_prompt": neg + ", (jpeg artifacts:1.4), (blurry:1.3), (lowres:1.3)", "seed": sd, "steps": 24, "cfg_scale": st.get("cfg_scale", 5.5), "sampler_name": "Euler a",
         "width": 1024, "height": 1280, "init_images": [init], "denoising_strength": den, "resize_mode": 0, "override_settings": st.get("override_settings")}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"{HERE}/clean_{i}_{sd}_{den}.png")
    b.pop("init_images"); b["init_image"] = f"assets/portraits/{i}.webp（白い地・1024×1280 に拡大）"
    json.dump(b, open(f"{HERE}/clean_{i}_{sd}_{den}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1); print(i, sd, den, flush=True)
