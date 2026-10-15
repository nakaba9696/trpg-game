# ドレイゼの魔物の姿（e3_zalve）：monsters.md の使徒と同じ前置き・後ろ・ネガティブ（--monsters --dry と同じ）。1024×1024
import base64, io, json, os, sys, urllib.request
from PIL import Image
PRE = "(Inuboshi:1.2), miyanogi_jiji, Anan Shokudow, yutokamizu, masterpiece, best quality, good quality, amazing quality, very aesthetic, absurdres, newest, blue archive, no halo"
POST = "no humans, monster, creature, solo, full body, simple background, white background"
NEG = open("../redesign/neg_mon.txt", encoding="utf-8").read().strip()
TAIL = "(from below:1.2), towering, looming over the viewer, rim light, divine, ancient, solemn, ominous, awe-inspiring, otherworldly"
SAND = "(dry sand:1.4), (granular sand particles:1.3), fine grains, dust"
V = {
 "a": "(dorontabi:1.3), (colossal figure made entirely of dry sand:1.4) many times taller than a man, (crumbling and re-forming outline:1.3), sand flowing inside its body, (no face:1.2), (a silver monocle floating where the face should be:1.4), (amber ringed eye behind the monocle:1.3), (huge horned shadow looming around its head:1.4), tattered remains of a black necktie and dark frock coat being swallowed by the sand, (blank ledger pages swirling in a sandstorm around it:1.4)",
 "b": "(dorontabi:1.3), (towering sand djinn:1.4) rising from a whirling sand vortex, no legs, upper body of dry sand, long thin arms made of sand, (no face:1.2), (single silver monocle floating in the void of the face:1.4), (glowing amber ringed eye:1.3), (a pair of long horns of dark shadow above its head:1.4), scraps of a black tie and a dark coat collar half buried in sand, (blank ledger pages fluttering in the sandstorm:1.4)",
 "c": "(dorontabi:1.3), (colossal hollow sand titan:1.4) with a dark cavity for a face, (a silver monocle with a chain hanging in the dark cavity:1.4), (amber ring-shaped eye glowing faintly inside:1.3), (an enormous shadow with long curved horns spreading behind it:1.4), sand pouring and crumbling from its shoulders, tattered dark frock coat fused into the sand, black tie fluttering, (many blank pages of a ledger spiralling around it:1.4)",
}
NEGX = ", (water:1.6), (liquid:1.6), (fluid:1.5), (splash:1.5), (knife:1.5), (blade:1.4), (sword:1.4), (hourglass:1.6), (money:1.5), (banknotes:1.5), (coins:1.3), (text on pages:1.3), (multiple monocles:1.4), (glasses:1.3), (desert landscape:1.4), (pyramid:1.4)"
for v in sys.argv[1].split(","):
    for sd in [int(s) for s in sys.argv[2].split(",")]:
        b = {"prompt": ", ".join([PRE, V[v], SAND, TAIL, POST]), "negative_prompt": NEG + NEGX, "seed": sd, "steps": 20, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
             "width": 1024, "height": 1024, "batch_size": 1, "n_iter": 1, "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}}
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"m_{v}_{sd}.png")
        json.dump(b, open(f"m_{v}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1); print(v, sd, flush=True)
