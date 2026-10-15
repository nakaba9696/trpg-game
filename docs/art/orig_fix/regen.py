# 表情違いを作り直す（全身の img2img・最初の差分と同じ作り方）。プロンプトは gen_portraits.mjs --dry の物から表情のタグだけ差し替える
# 使い方：python regen.py id_mood seed[,seed..]   （REP の表で差し替え）
import base64, io, json, os, re, subprocess, sys, urllib.request
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); WT = "H:/game/origfix-wt"
REP = {
 "titta_anger": (None, "(angry:1.6), (v-shaped eyebrows:1.5), (frown:1.4), (glaring:1.4), clenched teeth", ", (smile:1.6), (happy:1.4), (calm:1.3)"),
 "mordu_joy": (None, "smile, closed eyes, (short grey mustache:1.5), (stubble:1.2)", ", (clean-shaven:1.5), (no mustache:1.5)"),
"mordu_anger": ("frown, glaring", "(frown:1.4), (glaring:1.4), (furrowed brows:1.3), (short grey mustache:1.5), (stubble:1.2)", ", (clean-shaven:1.5), (no mustache:1.5)"),
 "mordu_sorrow": (None, "sad, looking down, (short grey mustache:1.5), (stubble:1.2)", ", (clean-shaven:1.5), (no mustache:1.5)"),
 "mordu_fun": (None, "laughing, open mouth, (short grey mustache:1.5), (stubble:1.2)", ", (clean-shaven:1.5), (no mustache:1.5)"),
 "mordu_troubled": (None, "troubled, worried eyebrows, polite smile, (short grey mustache:1.5), (stubble:1.2)", ", (clean-shaven:1.5), (no mustache:1.5)"),
 "mordu_surprise": (None, "surprised, wide-eyed, (short grey mustache:1.5), (stubble:1.2)", ", (clean-shaven:1.5), (no mustache:1.5)"),
 "mordu_sleepy": (None, "sleepy, drowsy, half-closed eyes, (short grey mustache:1.5), (stubble:1.2)", ", (clean-shaven:1.5), (no mustache:1.5)"),
 "yurien_sorrow": (None, "(sad:1.5), (worried eyebrows:1.4), (downturned mouth:1.4), (teary eyes:1.1), closed mouth", ", (smile:1.5), (extra eyes:1.5), (heterochromia:1.3)"),
 "yurien_fun": (None, "(amused smile:1.4), (smirk:1.3), closed mouth", ", (extra eyebrows:1.6), (thick eyebrows:1.4), (eyebrows over eyes:1.5)"),
 "ambroise_sorrow": (None, "(sad:1.4), (worried eyebrows:1.4), (downturned mouth:1.3), (looking down:1.2), closed mouth", ", (leaf:1.7), (leaf in mouth:1.7), (holding leaf:1.5), (scar:1.5), (scratch:1.4)"),
 "angelica_anger": (None, "(angry:1.5), (v-shaped eyebrows:1.4), (frown:1.4), (glaring:1.3), closed mouth", ", (open mouth:1.5), (surprised:1.5), (extra eyebrows:1.5)"),
 "gustav_fun": (None, "(laughing:1.3), (grin:1.4), closed mouth smile, (eyes closed:1.1)", ", (tongue:1.7), (tongue out:1.7), (licking lips:1.6), (drool:1.5)"),
 "lumia_fun": (None, "(giggling:1.4), (smile:1.4), (small open mouth:1.2), (closed eyes:1.2)", ", (fang:1.5), (wide open mouth:1.5), (tongue:1.4), (teeth:1.3)"),
 "lumia_smug": (None, "(smug:1.5), (smirk:1.5), (half-closed eyes:1.3), closed mouth", ", (open mouth:1.6), (fang:1.5), (tongue:1.4), (teeth:1.3)"),
 "lisette_joy": ("happy smile, closed eyes", "(happy:1.4), (smile:1.4), (closed eyes:1.7), (^ ^:1.3), (eyes closed happily:1.5)", ", (open eyes:1.5), (scar:1.5), (scratch:1.5), (cut on cheek:1.5)"),
 "gigra_sorrow": ("sad smile, looking down", "(sad:1.5), (teary eyes:1.2), (worried eyebrows:1.4), (frown:1.3), (looking down:1.2), closed mouth", ", (smile:1.6), (grin:1.5), (smug:1.4)"),
 "gensai_anger": ("slightly opened eyes, cold smile", "(cold glare:1.5), (narrowed eyes:1.4), (furrowed brows:1.3), closed mouth, no smile", ", (smile:1.5), (grin:1.5), (open mouth:1.3), (anger vein:1.5)"),
 "gensai_sorrow": ("sad smile, looking at sea", "(melancholic:1.5), (downcast eyes:1.4), (worried eyebrows:1.3), closed mouth, no smile", ", (smile:1.5), (grin:1.5), (tears:1.3)"),
 "sheila_joy": ("light smile, closed mouth", "(happy:1.4), (smile:1.5), (closed eyes:1.3), (slight blush:1.1), closed mouth", ""),
 "sheila_anger": ("pout, puffed cheeks, frown", "(annoyed:1.4), (frown:1.4), (v-shaped eyebrows:1.4), (narrowed eyes:1.3), closed mouth", ", (puffed cheeks:1.6), (pout:1.5), (open mouth:1.3)"),
 "selevan_sorrow": ("gentle smile, sad smile, looking away", "(sad:1.5), (worried eyebrows:1.5), (downturned mouth:1.4), (frown:1.2), (looking down:1.2), eyes slightly open", ", (smile:1.6), (smirk:1.4)"),
}
v = sys.argv[1]; i, m = v.split("_", 1)
out = subprocess.run(["node", "tools/gen_portraits.mjs", "--variants", "--only", v, "--dry", "--force"], cwd=WT, capture_output=True, text=True, encoding="utf-8").stdout
pos = [l.strip()[2:] for l in out.splitlines() if l.strip().startswith("+ ")][0]
neg = open(f"{HERE}/../redesign/{'neg_m' if '1boy' in pos else 'neg'}.txt", encoding="utf-8").read().strip()   # 基本の絵と同じネガティブ（gen_portraits.mjs --dry の人物の物）
cfg = json.loads(re.search(r"送る設定：(\{.*\})", out).group(1)) if "送る設定" in out else {}
P = {p["id"]: p for p in json.load(open(f"{WT}/docs/art/portraits.json", encoding="utf-8"))["portraits"]}
if v in REP:
    old, new, negx = REP[v]
    if old is None: old = P[i]["variants"][m]
else:   # 一覧の表情のタグのまま（作り直すだけ）。傷・ひびをネガティブに
    P = {p["id"]: p for p in json.load(open(f"{WT}/docs/art/portraits.json", encoding="utf-8"))["portraits"]}
    old = new = P[i]["variants"][m]; negx = ", (scar:1.5), (scratch:1.5), (cut on cheek:1.5), (facial mark:1.3), (bandaid:1.3)"
assert old in pos, (old, pos)
pos = pos.replace(old, new); neg = neg + negx
base = Image.open(f"{HERE}/basefix/{i}.webp" if os.path.exists(f"{HERE}/basefix/{i}.webp") else f"{HERE}/../main_orig/assets/portraits/{i}.webp").convert("RGBA"); CLEAN = f"{HERE}/clean_{i}.png"; bg = Image.new("RGBA", base.size, (255, 255, 255, 255)); bg.alpha_composite(base)
bio = io.BytesIO(); (Image.open(CLEAN).convert("RGB") if os.path.exists(CLEAN) else bg.convert("RGB")).save(bio, "PNG"); init = base64.b64encode(bio.getvalue()).decode()
st = json.load(open(f"{WT}/docs/art/style.json", encoding="utf-8"))
for sd in [int(s) for s in sys.argv[2].split(",")]:
    b = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": st.get("steps", 20), "cfg_scale": st.get("cfg_scale", 5.5), "sampler_name": st.get("sampler_name", "Euler a"),
         "scheduler": st.get("scheduler", "Automatic"), "width": st.get("width", 1024), "height": st.get("height", 1280), "init_images": [init], "denoising_strength": 0.5, "resize_mode": 0,
         "override_settings": st.get("override_settings", {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"})}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
    im = Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").resize(base.size, Image.LANCZOS)
    im.putalpha(255); im.save(f"{HERE}/regen/{v}_{sd}.webp", "WEBP", quality=95)
    b.pop("init_images"); b["init_image"] = f"assets/portraits/{i}.webp（白い地に置いた基本の絵）"
    json.dump(b, open(f"{HERE}/regen/{v}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(v, sd, flush=True)
