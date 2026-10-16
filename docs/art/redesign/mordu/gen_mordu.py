# モルデュ（苔衣の使徒）の基本の絵を同じデザインで作り直す：元の生成の値に、ひげが無いことをはっきり足して seed を変えて 4 枚
import base64, io, json, sys, urllib.request
from PIL import Image
rec = json.load(open("H:/game/trpg-gen/docs/art/gen/mordu.json", encoding="utf-8"))
pos = rec["prompt"].replace("polite smile,", "(clean-shaven:1.4), round glasses, amber eyes, dark green robe, beige sash, hand on chest, grey hair, short hair, polite smile, closed mouth,")
neg = rec["negative_prompt"] + ", (mustache:1.5), (beard:1.5), (facial hair:1.5), (stubble:1.4), goatee"
for sd in [int(s) for s in sys.argv[1].split(",")]:
    b = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": 20, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic", "width": 1024, "height": 1280,
         "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"mordu_{sd}.png")
    json.dump(b, open(f"mordu_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(sd, flush=True)
