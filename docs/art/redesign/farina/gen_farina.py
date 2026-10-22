# ファリナを最初から作り直す：portraits.json の identity・tags のまま、style.json と同じ設定で seed を変えて生成
import base64, io, json, sys, urllib.request
from PIL import Image
r = json.load(open("H:/game/trpg-gen/docs/art/gen/farina.json", encoding="utf-8"))
pos = r["prompt"].replace("adjusting glasses, holding documents", "(holding documents to chest:1.2), (one hand adjusting glasses:1.1)")
neg = r["negative_prompt"] + ", (six fingers:1.7), (extra fingers:1.7), (too many fingers:1.7), (fused fingers:1.5), (bad hands:1.6), (both hands on glasses:1.4)"
for sd in [int(s) for s in sys.argv[1].split(",")]:
    b = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
         "width": 1024, "height": 1280, "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    res = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    Image.open(io.BytesIO(base64.b64decode(res["images"][0]))).convert("RGB").save(f"far/farina_{sd}.png")
    json.dump(b, open(f"far/farina_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(sd, flush=True)
