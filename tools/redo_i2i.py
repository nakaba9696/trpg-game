# 元の絵（#412 の切り抜き）を灰色の背景に置き、img2img で描き直す（形と色を保つ）
import base64, io, json, sys, time, urllib.request
from PIL import Image
S = "C:/Users/nakab/AppData/Local/Temp/claude/H--game-trpg-game2/fbefcd33-19d7-4217-a094-a054f9951e74/scratchpad/plain/"
R = "H:/game/trpg-redo/"
mid, den = sys.argv[1], float(sys.argv[2])
# 背景の色：絵に無い色を選ぶ（灰色の魔物に灰色の背景だと、足元の灰の地面まで抜けてしまう）
BGS = {"grey": ((128, 128, 128), "plain grey background"), "green": ((0, 170, 70), "plain green background"), "blue": ((20, 60, 200), "plain blue background")}
bgname = sys.argv[3] if len(sys.argv) > 3 else "grey"
BG, BGTAG = BGS[bgname]
st = json.load(open(R + "docs/art/style_monsters.json", encoding="utf-8"))
mons = json.load(open(R + "docs/art/monsters.json", encoding="utf-8"))
L = mons["monsters"] if isinstance(mons, dict) else mons
m = next(x for x in L if x["id"] == mid)
# 元の白い背景の絵から、白い背景だけを灰色に置き換える（足元の光や岩などデザインの物は残す）
import numpy as np
o = np.array(Image.open(S + "../orig/monsters/" + mid + ".webp").convert("RGB").resize((1024, 1024), Image.LANCZOS)).astype(np.float32)
B = np.median(np.concatenate([o[0], o[-1], o[:, 0], o[:, -1]]), axis=0)
a = np.clip((np.abs(o - B).max(axis=2) - 6) / 30, 0, 1)[..., None]
init = Image.fromarray((o * a + np.array(BG, np.float32) * (1 - a)).astype(np.uint8)).convert("RGBA")
buf = io.BytesIO(); init.convert("RGB").save(buf, "PNG")
prompt = ", ".join([st["prefix"], m["tags"], "no humans, monster, creature, solo, full body, simple background, (plain grey background:1.2), flat background"])
body = {"init_images": [base64.b64encode(buf.getvalue()).decode()], "denoising_strength": den, "prompt": prompt,
        "negative_prompt": st.get("negative", ""), "sampler_name": st["sampler_name"], "scheduler": st.get("scheduler", "Automatic"),
        "steps": st["steps"], "cfg_scale": st["cfg_scale"], "width": 1024, "height": 1024, "seed": -1,
        "override_settings": st["override_settings"], "override_settings_restore_afterwards": True}
t = time.time()
r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"})).read())
out = Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").resize((512, 512), Image.LANCZOS)
import os; os.makedirs(S + "i2i/monsters", exist_ok=True)
out.save(S + f"i2i/monsters/{mid}.webp", "WEBP", quality=92)
init.convert("RGB").resize((512, 512)).save(S + f"i2i/{mid}_init.png")
print(mid, den, f"{time.time() - t:.0f}s", json.loads(r["info"]).get("seed"))
