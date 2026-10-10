import base64, io, json, sys, urllib.request
from PIL import Image
S = "C:/Users/nakab/AppData/Local/Temp/claude/H--game-trpg-game2/fbefcd33-19d7-4217-a094-a054f9951e74/scratchpad/tog/"
st = json.load(open("H:/game/trpg-redo/docs/art/style_monsters.json", encoding="utf-8"))
pos = ", ".join([
 "(Inuboshi:1.2), miyanogi_jiji, Anan Shokudow, yutokamizu, masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest",
 "(dorontabi:1.3), (colossal executioner deity:1.3), dark fantasy, solo",
 "(faceless iron mask engraved with runes:1.3), two faint glowing white eyes in the eye slits",
 "tall black hooded executioner robe, hem dissolving into black smoke, no legs, floating",
 "(holding a huge executioner axe with both hands:1.2), axe blade resting before it",
 "(a giant ring of bells and chains floating behind its head:1.3), many small iron bells hanging on chains from its arms",
 "imposing, menacing, regal, majestic, eerie, solemn, (from below:1.1), dramatic pose, full body, (character fills the frame:1.2)",
 "(flat solid green background:1.4), green screen, no gradient, simple background",
])
neg = st["human"]["negative"] + ", gradient background, glow on background, vignette, scenery, floor, shadow on background, cute, chibi, small figure"
for n in range(int(sys.argv[1]), int(sys.argv[2])):
    body = {"prompt": pos, "negative_prompt": neg, "sampler_name": st["sampler_name"], "scheduler": st.get("scheduler", "Automatic"), "steps": 24, "cfg_scale": 6,
            "width": 1024, "height": 1024, "seed": -1, "override_settings": st["override_settings"], "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=900).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").resize((512, 512), Image.LANCZOS).save(S + f"d{n}.png")
    print(n, json.loads(r["info"]).get("seed"), flush=True)
