# シグルンとドレイゼをキャラデザから作り直す：基本の絵と同じ作り方（txt2img・1024×1280・同じ画風の前置き・同じネガティブ）で、seed を変えて 4 枚ずつ
import base64, io, json, os, sys, urllib.request
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
PRE_F = "(Inuboshi:1.2), miyanogi_jiji, Anan Shokudow, yutokamizu, ikezawa shin, masterpiece, best quality, good quality, amazing quality, very aesthetic, absurdres, newest, blue archive, no halo"
PRE_M = "(Inuboshi:1.2), miyanogi_jiji, Anan Shokudow, yutokamizu, ikezawa shin, (orion \\(orionproject\\):1.2), lack, masterpiece, best quality, good quality, amazing quality, very aesthetic, absurdres, newest, 1boy, male focus, anime coloring, cel shading, thick lineart, flat color, mature male, detailed face"
POST = "solo, standing, cowboy shot, looking at viewer, facing viewer, straight-on, simple background, white background, character focus, fully clothed"
P = {
 "solenne": (PRE_F, "1girl, (adult woman:1.4), (mature female:1.2), 25 years old, tall, athletic, fit, fair skin, black hair, (high ponytail:1.3), medium hair, (bangs swept to the side:1.2), forehead, both eyes visible, round eyes, amber eyes, worried eyebrows, (bandage on cheek:1.2), (faded grey-blue tunic:1.3), (small faded embroidered crest emblem on the chest:1.2), (patched brown traveling cloak:1.2), leather belt, (empty scabbard at the hip, no sword:1.3), (bundle of paper pawn tickets tucked in the belt:1.1), (holding a bundle of several leather leashes in one hand:1.3), (leashes trailing out of frame:1.2), standing straight, upright posture, serious, frown, closed mouth",
            ", (child:1.5), (loli:1.5), (teenage:1.3), (petite:1.2), (sword blade:1.5), (holding sword:1.5), (drawn sword:1.4), (dog:1.7), (puppy:1.7), (animal:1.5), (armor:1.7), (knight:1.6), (helmet:1.7), (multiple people:1.5), background characters, (sword:1.5), (hair over eyes:1.4), (hair over one eye:1.4), (hood up:1.3), (red:1.2), (flag:1.3)", "neg.txt")}
seeds = [int(s) for s in sys.argv[2].split(",")]
for who in sys.argv[1].split(","):
    pre, body, negx, nf = P[who]
    neg = open(os.path.join(HERE, nf), encoding="utf-8").read().strip() + negx
    pos = ", ".join([pre, body, POST])
    for sd in seeds:
        b = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": 20, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic", "width": 1024, "height": 1280,
             "batch_size": 1, "n_iter": 1, "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(os.path.join(HERE, f"{who}_{sd}.png"))
        json.dump(b, open(os.path.join(HERE, f"{who}_{sd}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(who, sd, flush=True)
