# シグルンとドレイゼをキャラデザから作り直す：基本の絵と同じ作り方（txt2img・1024×1280・同じ画風の前置き・同じネガティブ）で、seed を変えて 4 枚ずつ
import base64, io, json, os, sys, urllib.request
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
PRE_F = "(Inuboshi:1.2), miyanogi_jiji, Anan Shokudow, yutokamizu, ikezawa shin, masterpiece, best quality, good quality, amazing quality, very aesthetic, absurdres, newest, blue archive, no halo"
PRE_M = "(Inuboshi:1.2), miyanogi_jiji, Anan Shokudow, yutokamizu, ikezawa shin, (orion \\(orionproject\\):1.2), lack, masterpiece, best quality, good quality, amazing quality, very aesthetic, absurdres, newest, 1boy, male focus, anime coloring, cel shading, thick lineart, flat color, mature male, detailed face"
POST = "solo, standing, cowboy shot, looking at viewer, facing viewer, straight-on, simple background, white background, character focus, fully clothed"
P = {
 "magda": (PRE_F, "1girl, (mature female:1.4), (middle-aged woman:1.3), 46 years old, tall, muscular, tan skin, (mole on cheek:1.2), ash blonde hair, short messy hair, brown eyes, sharp eyes, (dirt smudge on cheek:1.1), (red bandana on head:1.3), leather vest over rolled-up white shirt, leather gloves, (pickaxe resting on shoulder:1.3), (reading glasses hanging from the shirt collar on a cord:1.3), loose work clothes, hand on hip, confident, loud grin",
           ", (child:1.5), (loli:1.5), (young:1.3), (glasses on face:1.4), (wearing glasses:1.4), (eyewear on head:1.6), (glasses on head:1.6), (large breasts:1.5), (cleavage:1.5), (chibi:1.6), (doll:1.5), (dog:1.4), (sword:1.4), armor", "neg.txt"),
 "marion": (PRE_F, "1girl, (old woman:1.5), (elderly:1.4), 63 years old, (short:1.3), small, (hunched back:1.2), tan skin, (wrinkles:1.4), grey hair, hair bun, (kerchief on head:1.2), green eyes, smiling eyes, flour-dusted brown dress, white apron, (holding a broom:1.4), hand on lower back, kind smile",
           ", (child:1.6), (loli:1.6), (young:1.5), (young woman:1.5), (teenage:1.5), (smooth skin:1.3), (dog:1.4), (sword:1.4)", "neg.txt"),
 "tiria": (PRE_F, "1girl, (princess:1.1), 23 years old, slim, fair skin, chestnut hair, soft brown hair, long hair, (single braid over shoulder:1.3), (short soft bangs above the eyes:1.3), (both eyes visible:1.2), hazel eyes, gentle eyes, thin eyebrows, (wheat ear in hair:1.3), (a small smudge of soil on one cheek:1.2), neat modest green dress, white collar, (holding a wicker basket of vegetables:1.3), gentle smile, closed eyes",
           ", (child:1.5), (loli:1.5), (animal ears:1.7), (hair over eyes:1.5), (crown:1.3), (tiara:1.3), (mud on face:1.4), (dirty face:1.4), (dog:1.4), (sword:1.4)", "neg.txt"),
 "yurina": (PRE_F, "1girl, (adult woman:1.3), 27 years old, slim, tall, fair skin, (crimson red hair:1.3), short hair, side-swept bangs, (closed eyes:1.3), (squinting smiling eyes:1.2), thin eyebrows, beautiful face, (long dark brown matte leather coat:1.4), (loose dark tunic:1.2), black gloves, (modest clothes:1.3), (sword at hip in scabbard:1.3), hands behind back, smirk, carefree",
           ", (child:1.5), (loli:1.5), (latex:1.7), (shiny clothes:1.6), (bodysuit:1.6), (skin tight:1.6), (large breasts:1.5), (cleavage:1.5), (open eyes:1.2), (drawn sword:1.4), (holding sword:1.4), (dog:1.4), (armor:1.3), (hairclip:1.3)", "neg.txt")}
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
