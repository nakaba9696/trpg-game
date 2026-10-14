# 顔だけを大きく作る（道具で守る版・2026-10-14）。WebUI の venv の python で動かす
#   描き直す範囲は「目の所（目の検出の箱＋その上の眉の帯）」と「口の所」だけ。前髪・眉より上・頬の印・輪郭は範囲の外（物理的に変わらない）
#   前髪で半分以上隠れた目は描かない（隠れた側に目が増えない）。目の箱の中は基本の画素を戻さない（目が二重にならない）
#   同じ人は IP-Adapter（plus-face）で保つ。描いたら face_gate で点検し、落ちたら seed を変えて作り直す。3 回落ちたら作らない
# 使い方：python face2.py id mood[,mood...]   （環境変数 DEN=0.8、IPW=0.6）
import base64, io, json, os, sys, zlib, urllib.request, datetime
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import face_conf as F
import face_gate as G
OUT = os.path.join(HERE, "face_out2"); os.makedirs(OUT, exist_ok=True)
S = 1024
CALM = {"mirza", "zalve", "aurelia", "yoihime", "mordu", "azlag", "chezar", "yura", "otmar", "valdun", "gensai", "lucien", "selevan", "souhaku", "wolfram", "noeris", "radmila", "yurien"}
CALMTAGS = {"joy": "(gentle smile, closed mouth, soft narrowed eyes:1.5), calm", "anger": "(cold glare:1.5), (narrowed eyes:1.5), (slight frown:1.3), (furrowed brows:1.2), closed mouth",
            "sorrow": "(melancholic:1.5), (downcast eyes, looking down:1.4), (worried eyebrows:1.3), closed mouth", "fun": "(amused smirk:1.5), (one corner of the mouth raised:1.4), confident"}
CALMNEG = ", (anger vein:1.6), (tears:1.6), (crying:1.6), (blush:1.5), (sweat:1.5), (open mouth:1.4), (teeth:1.4), flustered, comical, chibi"
EYENEG = ", (extra eyes:1.6), (third eye:1.6), (multiple eyes:1.6), (eyebrows over eyes:1.5), (eyebrows touching eyes:1.5), (eyebrows on hair:1.5), (small pupils:1.3), (blank eyes:1.3), (unfocused eyes:1.3)"
SMILEFUN = "(mischievous smirk:1.6), (closed mouth:1.5), (tongue out:1.3), (one eye closed, wink:1.4)"  # 元から笑顔の人の楽：口の形を基本の笑顔から変える
SMILEJOY = "(laughing:1.5), (eyes closed, happy closed eyes:1.6), (open mouth:1.4)"  # 元から笑顔の人の喜：目を閉じて笑う
COMIC = {"nora", "adele", "barnabe", "bruno", "trude", "timo", "gigra", "zerina", "takimaru", "dil", "kaidel", "hartmut", "gustav", "annelise", "elnea", "tula", "pipinelle", "margot", "lumia", "sieglinde"}  # 怒りの印を許す人（コミカル）
HIDDEN = {"nora": "left", "mirza": "left", "rui": "left", "margot": "left", "solenne": "left", "lisette": "left", "yurien": "left"}   # 前髪で片目が隠れる人（画面の左右）


LAYOUT = json.load(open(os.path.join(HERE, "layout.json" if os.path.exists(os.path.join(HERE, "layout.json")) else "face_layout.json"), encoding="utf-8"))   # 人ごとの目の箱（見える目だけ）と口の箱（顔の四角に対する割合）。目で見て書いた


def regions(i, big):
    """描いてよい所（0〜1）と、目の情報"""
    eyes = [{"box": [b[0] * S, b[1] * S, b[2] * S, b[3] * S]} for b in LAYOUT[i][0]] if i in LAYOUT else G.eyes_of(big)
    a = np.array(big).astype(np.float32); yy, xx = np.mgrid[:S, :S]
    if i in F.HAIR: hc = np.array(F.HAIR[i], np.float32)
    else:   # 髪の色：顔の四角の上の 15% の真ん中で、いちばん多い色
        top = a[: int(S * 0.3), int(S * 0.25): int(S * 0.75)].reshape(-1, 3); top = top[top.min(-1) < 235]; q = (top // 16).astype(np.int32); key = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
        v, c = np.unique(key, return_counts=True); hc = np.median(top[key == v[np.argmax(c)]], 0)
    hair = np.abs(a - hc).max(-1) < 40
    draw = np.zeros((S, S), bool); used = []
    for e in eyes:
        x0, y0, x1, y1 = e["box"]; ew, eh = x1 - x0, y1 - y0
        inner = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
        if (i not in LAYOUT and hair[inner].mean() > 0.45) or (HIDDEN.get(i) == "left" and (x0 + x1) / 2 < S * 0.45) or (HIDDEN.get(i) == "right" and (x0 + x1) / 2 > S * 0.55):
            continue   # 前髪で隠れた目は描かない
        box = (xx >= x0 - 0.3 * ew) & (xx <= x1 + 0.3 * ew) & (yy >= y0 - 0.25 * eh) & (yy <= y1 + 0.3 * eh)
        brow = (xx >= x0 - 0.2 * ew) & (xx <= x1 + 0.2 * ew) & (yy >= y0 - 0.95 * eh) & (yy < y0 - 0.25 * eh) & ~ndimage.binary_dilation(hair, iterations=3)   # 眉の帯（前髪の所は外す）
        draw |= box | brow; used.append([round(v) for v in e["box"]])
    if i in LAYOUT:
        mb = LAYOUT[i][1]; mx0, my0, mx1, my1 = [v * S for v in mb] if mb else (0, 0, 0, 0)
    elif i in F.EYEMOUTH:
        mx0, my0, mx1, my1 = [v * S for v in F.EYEMOUTH[i][1]]
    else:   # 口の四角を目から出す：目の中心の下、目と目の間の 1.05 倍の所
        es = [e["box"] for e in eyes]
        if len(es) >= 2:
            es = sorted(es, key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))[:2]
            cx = sum((b[0] + b[2]) / 2 for b in es) / 2; cy = sum((b[1] + b[3]) / 2 for b in es) / 2
            dist = abs((es[0][0] + es[0][2]) / 2 - (es[1][0] + es[1][2]) / 2)
        elif len(es) == 1:
            b = es[0]; cx, cy = S / 2, (b[1] + b[3]) / 2; dist = 2.2 * (b[2] - b[0])
        else:
            cx, cy, dist = S / 2, S * 0.4, S * 0.3
        my = cy + 1.0 * dist
        mx0, mx1, my0, my1 = cx - 0.5 * dist, cx + 0.5 * dist, my - 0.25 * dist, my + 0.25 * dist
    draw |= (xx >= mx0) & (xx <= mx1) & (yy >= my0) & (yy <= my1)
    for ex, ey, rx, ry in F.KEEP.get(i, []): draw &= (((xx - ex * S) / (rx * S)) ** 2 + ((yy - ey * S) / (ry * S)) ** 2) > 1
    # 描いたあと基本に戻す所：髪の色の所のうち、目そのもの（目の箱）でない所。髪の上に記号や前髪の形の変化が残らない
    core = np.zeros((S, S), bool)
    for e in eyes:
        x0, y0, x1, y1 = e["box"]; core |= (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
    regions.hairkeep = ndimage.binary_opening(hair, iterations=1) & ~core
    return draw, used


def gen(i, m, big, edges, draw, pos, neg, seed):
    args = [{"enabled": True, "module": "ip-adapter_clip_sdxl_plus_vith", "model": "ip-adapter-plus-face_sdxl_vit-h [368cf551]", "image": F.b64(big), "weight": float(os.environ.get("IPW", 0.6)),
             "guidance_end": 0.8, "control_mode": "Balanced", "resize_mode": "Crop and Resize", "pixel_perfect": True},
            {"enabled": True, "module": "none", "model": "controlnet-canny-sdxl-1.0-xinsir-v2 [ab7dc06d]", "image": F.b64(edges), "weight": 0.6, "guidance_end": 0.7,
             "control_mode": "Balanced", "resize_mode": "Crop and Resize", "pixel_perfect": True}]
    mask = Image.fromarray((ndimage.binary_dilation(draw, iterations=4) * 255).astype(np.uint8))
    body = {"init_images": [F.b64(big)], "mask": F.b64(mask), "inpainting_fill": 1, "inpaint_full_res": False, "mask_blur": 6,
            "denoising_strength": float(os.environ.get("DEN", 0.8)), "prompt": pos, "negative_prompt": neg, "seed": seed, "steps": 28, "cfg_scale": 5.5, "sampler_name": "Euler a",
            "width": S, "height": S, "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True,
            "alwayson_scripts": {"ControlNet": {"args": args}}}
    r = json.loads(urllib.request.urlopen(urllib.request.Request(F.URL + "/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1800).read())
    out = np.array(Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB")).astype(np.float32)
    w = np.array(Image.fromarray((draw * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32)[..., None] / 255
    hk = np.array(Image.fromarray((regions.hairkeep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))).astype(np.float32)[..., None] / 255
    w = w * (1 - hk)
    fin = (out * w + np.array(big).astype(np.float32) * (1 - w)).round().clip(0, 255).astype(np.uint8)
    return Image.fromarray(fin), {k: v for k, v in body.items() if k not in ("init_images", "mask", "alwayson_scripts")} | {"controlnet": [{k: v for k, v in a.items() if k != "image"} for a in args]}


def run(i, moods):
    p = F.PJ.get(i) or F.PM[i]; pm = F.PM.get(i, p)
    base = Image.open(f"{F.R}assets/portraits/{i}.webp").convert("RGBA"); W, H = base.size
    l, t, w, h = F.FB[i]; dl, dt, dw, dh = F.BOXFIX.get(i, [0, 0, 0, 0]); l, t, w, h = l + dl, t + dt, w + dw, h + dh
    box = (int(l * W), int(t * H), int((l + w) * W), int((t + h) * H))
    flat = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (255, 255, 255, 255)); flat.alpha_composite(base.crop(box))
    big = flat.convert("RGB").resize((S, S), Image.LANCZOS); big.save(f"{OUT}/{i}_base.png")
    draw, used = regions(i, big)
    Image.fromarray((draw * 255).astype(np.uint8)).save(f"{OUT}/{i}_draw.png")
    import cv2
    e = cv2.Canny(np.array(big.convert("L")), 80, 180); e[ndimage.binary_dilation(draw, iterations=6)] = 0
    edges = Image.fromarray(np.stack([e] * 3, -1))
    ident = (p.get("identity") or "").replace(", flour dust on face", ""); tags = p.get("tags") or ""
    neg0 = (F.STYLE.get("negative") or "worst quality, low quality, bad anatomy, lowres, text, watermark") + ", (hands:1.4), extra person, nsfw" + EYENEG + F.FNEG.get(i, "")
    calm = i in CALM
    tb = G.tags_of(big); smiling = max(tb.get("smile", 0), tb.get("grin", 0), tb.get(":d", 0)) > 0.5
    prev = json.load(open(f"{OUT}/{i}_face.json", encoding="utf-8")) if os.path.exists(f"{OUT}/{i}_face.json") else {}
    rec = {"id": f"{i}_face", "date": datetime.datetime.now().isoformat(), "base_crop": {"face_box": F.FB[i], "px": box, "scaled_to": S}, "eyes_drawn": used, "base_smiling": None,
           "draw": "目の検出の箱（AnzhcEyes-seg）＋眉の帯（前髪の所を除く）＋口の四角。前髪で隠れた目は描かない", "moods": dict(prev.get("moods", {})), "skipped": dict(prev.get("skipped", {}))}
    for m in moods:
        vt = (pm.get("variants") or {}).get(m, "")
        mt = (CALMTAGS.get(m) if calm else None) or F.MOODTAGS.get(m, "")
        if not calm and smiling and m == "fun": mt = SMILEFUN
        if not calm and smiling and m == "joy": mt = SMILEJOY
        if m == "fun" and i in F.WINK and not calm: mt = mt.replace("(one eye closed, wink:1.5)", F.WINK[i]).replace("(one eye closed, wink:1.4)", F.WINK[i])
        pos = ", ".join(x for x in [F.STYLE.get("prefix", ""), "(portrait:1.2), (close-up face:1.3), face focus", ident, tags, mt, "" if m in F.MOODTAGS else (f"({vt}:1.4)" if vt else "")] if x)
        neg = neg0 + F.MOODNEG.get(m, "") + (CALMNEG if calm else "") + ("" if i in COMIC else ", (anger vein:1.6), (cross-popping vein:1.6)")
        if i not in COMIC: mt = mt.replace(", (anger vein:1.3)", "").replace(", (anger vein:1.2)", "")
        ok = False; tries = []
        for k in range(3):
            seed = (zlib.crc32(f"{i}_{m}_face2".encode()) + k) & 0x7fffffff
            im, gp = gen(i, m, big, edges, draw, pos, neg, seed)
            im.save(f"{OUT}/{i}_{m}_try{k}.png")
            g = G.check(i, m, f"{OUT}/{i}_base.png", f"{OUT}/{i}_{m}_try{k}.png", HIDDEN.get(i), calm, comic=i in COMIC, draw=draw, eyes=LAYOUT[i][0] if i in LAYOUT else None)
            tries.append({"seed": seed, "ok": g["ok"], "why": g["why"]})
            print(i, m, k, "OK" if g["ok"] else "NG " + " / ".join(g["why"]), flush=True)
            if g["ok"]:
                im.save(f"{OUT}/{i}_{m}.png"); rec["moods"][m] = gp | {"seed": seed, "gate": g, "tries": tries}; rec["skipped"].pop(m, None); ok = True; break
        if not ok:
            rec["skipped"][m] = tries; rec["moods"].pop(m, None)
            if os.path.exists(f"{OUT}/{i}_{m}.png"): os.remove(f"{OUT}/{i}_{m}.png")
        json.dump(rec, open(f"{OUT}/{i}_face.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=float)


if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2].split(","))
