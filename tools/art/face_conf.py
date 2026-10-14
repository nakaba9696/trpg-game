# 顔だけを大きく作る試し：顔の窓の四角を基本の絵から切り出して 1024 に拡大し、identity・tags・表情のタグで顔全体を描き直す
# ControlNet（canny：基本の顔の線で輪郭と向き）＋ reference_adain+attn（基本の顔で同じ人）。守る所（髪・ひげ・眼鏡・傷・小物）は描いたあと基本の画素を戻す
# 使い方：python face.py id mood[,mood...]  （環境変数 CN=canny|none、CNW=0.6、RW=0.7、DEN=0.6、SEEDADD=0）
import base64, io, json, os, sys, zlib, urllib.request, datetime
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
R = "H:/game/trpg-moods/"; HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "face_out"); os.makedirs(OUT, exist_ok=True)
URL = "http://127.0.0.1:7860"
FB = {}
for l in open(R + "src/data/u41_face_box.js", encoding="utf-8"):
    l = l.strip()
    if l[:1].isalpha() and ": [" in l:
        k, v = l.split(": ", 1); FB[k] = json.loads(v.rstrip(",").rstrip())
PJ = {p["id"]: p for p in json.load(open(R + "docs/art/portraits.json", encoding="utf-8"))["portraits"]}
PM = {p["id"]: p for p in json.load(open(os.path.join(HERE, "portraits_main.json"), encoding="utf-8"))["portraits"]}
STYLE = json.load(open(R + "docs/art/style.json", encoding="utf-8"))
b64 = lambda im: (lambda b: (im.save(b, "PNG"), base64.b64encode(b.getvalue()).decode())[1])(io.BytesIO())
S = 1024
EYEMOUTH = {"nora": [(0, 0, 0, 0), (0.28, 0.4, 0.62, 0.58)], "mirza": [(0.56, 0.12, 0.85, 0.38), (0.38, 0.4, 0.7, 0.54)], "adele": [(0.08, 0.18, 0.92, 0.44), (0.3, 0.44, 0.62, 0.62)], "angelica": [(0.15, 0.2, 0.85, 0.42), (0.33, 0.42, 0.67, 0.6)], "annelise": [(0.15, 0.24, 0.85, 0.48), (0.33, 0.46, 0.7, 0.62)], "anselmo": [(0.12, 0.18, 0.88, 0.42), (0.3, 0.5, 0.72, 0.7)], "barnabe": [(0.12, 0.15, 0.88, 0.38), (0.2, 0.48, 0.82, 0.7)], "otmar": [(0.1, 0.08, 0.9, 0.42), (0.3, 0.5, 0.7, 0.72)]}
KEEP = {"adele": [(0.72, 0.53, 0.1, 0.09), (0.5, 0.45, 0.1, 0.05)], "annelise": [(0.65, 0.5, 0.1, 0.08), (0.5, 0.13, 0.1, 0.06)], "barnabe": [(0.5, 0.44, 0.12, 0.1)], "otmar": [(0.5, 0.44, 0.13, 0.1)], "nora": [(0.30, 0.62, 0.1, 0.09), (0.66, 0.52, 0.06, 0.05), (0.62, 0.06, 0.14, 0.08)]}  # 人ごとの守る楕円（絆創膏・汚れ）
HAIR = {"adele": [252, 242, 232], "nora": [110, 82, 80], "otmar": [168, 168, 172]}  # 前髪の色（目にかかる髪を守る）  # 人ごとの消す所（顔の窓の四角に対する割合 [x0,y0,x1,y1]）
MOODTAGS = {"joy": "(happy:1.5), (open mouth smile:1.5), (smiling eyes, narrowed eyes:1.3), cheerful",
            "anger": "(angry:1.6), (v-shaped eyebrows:1.6), (furrowed brows:1.6), (clenched teeth:1.5), (glaring:1.6), (narrowed eyes, sharp eyes:1.6), (anger vein:1.3)",
            "sorrow": "(sad:1.6), (eyebrows raised in the middle, worried eyebrows:1.6), (closed mouth, downturned mouth:1.5), (teary eyes, tears:1.4)",
            "fun": "(mischievous grin:1.5), (playful smirk:1.4), (one eye closed, wink:1.5)"}
MOODNEG = {"joy": ", angry, sad, frown", "anger": ", (smile:1.5), happy, (closed eyes:1.3), surprised", "sorrow": ", (smile:1.5), grin, (open mouth:1.2), happy", "fun": ", angry, sad, frown"}
WINK = {"nora": "(one eye closed:1.5), (wink:1.5), (right eye closed:1.4)", "mirza": "(one eye closed:1.5), (wink:1.5)"}  # 前髪で隠れない側の目でつむる（キャラの左目＝画面の右）
FNEG = {"mirza": ", (dirt on face:1.5), (smudge:1.5), (bruise:1.4), (scar:1.3), shadow on cheek", "barnabe": ", (flour dust:1.5), (white spots on face:1.5), (sweat:1.3), sweatdrop", "adele": ", (freckles:1.6), (freckles on nose:1.6), (mole:1.3)"}  # 人ごとに出してはいけない物
BOXFIX = {"mirza": [0.0, 0.14, 0.0, 0.0]}  # 顔の四角を下へずらす（顔の窓の四角が上に寄りすぎている人）


def run(i, moods):
    p = PJ.get(i) or PM[i]; pm = PM.get(i, p)
    base = Image.open(f"{R}assets/portraits/{i}.webp").convert("RGBA"); W, H = base.size
    l, t, w, h = FB[i]; dl, dt, dw, dh = BOXFIX.get(i, [0, 0, 0, 0]); l, t, w, h = l + dl, t + dt, w + dw, h + dh; box = (int(l * W), int(t * H), int((l + w) * W), int((t + h) * H))
    crop = base.crop(box); flat = Image.new("RGBA", crop.size, (255, 255, 255, 255)); flat.alpha_composite(crop)
    big = flat.convert("RGB").resize((S, S), Image.LANCZOS)
    big.save(f"{OUT}/{i}_base.png")
    # 線画（canny）から目・眉・口の所を消す：輪郭・髪・小物の線は残し、表情の所は自由に描かせる
    import cv2
    e = cv2.Canny(np.array(big.convert("L")), 80, 180)
    E = EYEMOUTH.get(i, [(0.12, 0.28, 0.88, 0.60), (0.28, 0.60, 0.72, 0.86)])
    for x0, y0, x1, y1 in E: e[int(y0 * S):int(y1 * S), int(x0 * S):int(x1 * S)] = 0
    edges = Image.fromarray(np.stack([e] * 3, -1)); edges.save(f"{OUT}/{i}_edges.png")
    ident = (p.get("identity") or "").replace(", flour dust on face", ""); tags = p.get("tags") or ""
    neg = STYLE.get("negative") or STYLE.get("neg") or "worst quality, low quality, bad anatomy, lowres, text, watermark"
    style = STYLE.get("prefix") or STYLE.get("positive") or ""
    prev = json.load(open(f"{OUT}/{i}_face.json", encoding="utf-8")) if os.path.exists(f"{OUT}/{i}_face.json") else {}
    rec = {"id": f"{i}_face", "date": datetime.datetime.now().isoformat(), "base_crop": {"face_box": FB[i], "px": box, "scaled_to": S}, "moods": dict(prev.get("moods", {}))}
    for m in moods:
        vt = (pm.get("variants") or {}).get(m, "")
        mt = MOODTAGS.get(m, "")
        if m == "fun" and i in WINK: mt = mt.replace("(one eye closed, wink:1.5)", WINK[i])
        pos = ", ".join(x for x in [style, "(portrait:1.2), (close-up face:1.3), face focus", ident, tags, mt, "" if m in MOODTAGS else (f"({vt}:1.4)" if vt else "")] if x)
        seed = (zlib.crc32(f"{i}_{m}_face".encode()) + int(os.environ.get("SEEDADD", 0))) & 0x7fffffff
        args = [{"enabled": True, "module": "reference_adain+attn", "model": "None", "image": b64(big), "weight": float(os.environ.get("RW", 0.7)), "threshold_a": 0.5,
                 "guidance_end": 0.8, "control_mode": "Balanced", "resize_mode": "Crop and Resize", "pixel_perfect": True}]
        if os.environ.get("CN", "canny") == "canny":
            args.append({"enabled": True, "module": "none", "model": "controlnet-canny-sdxl-1.0-xinsir-v2", "image": b64(edges), "weight": float(os.environ.get("CNW", 0.6)),
                         "guidance_end": float(os.environ.get("CNE", 0.7)), "control_mode": "Balanced", "resize_mode": "Crop and Resize", "pixel_perfect": True})
        body = {"init_images": [b64(big)], "denoising_strength": float(os.environ.get("DEN", 0.6)), "prompt": pos, "negative_prompt": neg + ", (hands:1.4), extra person, nsfw, (expressionless:1.4), (neutral face:1.3), (small pupils:1.3), (blank eyes:1.3), (unfocused eyes:1.3)" + MOODNEG.get(m, "") + FNEG.get(i, ""),
                "seed": seed, "steps": 28, "cfg_scale": 5.5, "sampler_name": "Euler a", "width": S, "height": S,
                "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True,
                "alwayson_scripts": {"ControlNet": {"args": args}}}
        r = json.loads(urllib.request.urlopen(urllib.request.Request(URL + "/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
        out = Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB")
        out.save(f"{OUT}/{i}_{m}_raw.png")
        # 描いてよい所＝目・眉・口の四角（少し広げてぼかす）。その外と、中の守る所（前髪・絆創膏・ひげ・眼鏡…：基本の肌でも目でも口でもない色の塊のうち、頭の髪とつながる物と、人ごとの楕円）は基本の画素
        bb = np.array(big).astype(np.float32); oo = np.array(out).astype(np.float32)
        draw = np.zeros((S, S), np.float32)
        for x0, y0, x1, y1 in E: draw[int(y0 * S):int(y1 * S), int(x0 * S):int(x1 * S)] = 1
        yy, xx = np.mgrid[:S, :S]
        for ex, ey, rx, ry in KEEP.get(i, []): draw[(((xx - ex * S) / (rx * S)) ** 2 + ((yy - ey * S) / (ry * S)) ** 2) <= 1] = 0
        hc = np.array(HAIR.get(i, [0, 0, 0]), np.float32)
        if i in HAIR: draw[(np.abs(bb - hc).max(-1) < 38)] = 0
        draw = np.array(Image.fromarray((draw * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))).astype(np.float32)[..., None] / 255
        fin = (oo * draw + bb * (1 - draw)).round().clip(0, 255).astype(np.uint8)
        Image.fromarray(fin).save(f"{OUT}/{i}_{m}.png")
        rec["moods"][m] = {"edges": f"{i}_edges.png（Canny 80/180 から目・眉・口の所 {E} を消した）", "seed": seed, "prompt": pos, "negative_prompt": body["negative_prompt"], "denoise": body["denoising_strength"], "steps": 28, "cfg": 5.5, "sampler": "Euler a",
                           "controlnet": [{k: v for k, v in a.items() if k != "image"} for a in args]}
        print(i, m, "done", flush=True)
    json.dump(rec, open(f"{OUT}/{i}_face.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2].split(","))
