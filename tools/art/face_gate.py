# 顔の点検の道具（tools/art/face_gate.py）：基本の顔と作った顔を入れると、合否と理由を出す
# 使い方：python face_gate.py --who <id> --mood <表情> --base base.png --face face.png [--hidden left|right] [--calm] [--json out.json]
#   WebUI の venv の python で動かす（ultralytics・onnxruntime がある）。モデルは手元の WebUI の物を使う
#   - 目の数・位置：ADetailer の AnzhcEyes-seg（目の塊の検出）
#   - 眉と目の間隔：目の塊の上の端から、上へ暗い線（眉）までの距離を基本と比べる
#   - 表情の差：目の塊と口の所の画素の差を基本と比べる
#   - 表情の札・別人：WD14（wd-eva02-large-tagger-v3）の札を基本と比べる
import argparse, csv, glob, json, os, sys
import numpy as np
from PIL import Image

ROOT = "C:/EasyReforge/stable-diffusion-webui-reForge/models/"
EYES = ROOT + "adetailer/segm/AnzhcEyes-seg.pt"
TAGGER = glob.glob(ROOT + "diffusers/models--SmilingWolf--wd-eva02-large-tagger-v3/snapshots/*/")[0]
# 表情ごとの「狙った札」（どれかが出ていればよい）
WANT = {"joy": ["smile", ":d", "happy", "grin", "laughing"], "anger": ["angry", "v-shaped eyebrows", "frown", "clenched teeth", "glaring", "annoyed"],
        "sorrow": ["sad", "tears", "crying", "frown", "worried", "furrowed brow", "teary eyes"], "fun": ["smirk", "one eye closed", ";)", "grin", "smug", "tongue out", ":d", "laughing"],
        "surprise": ["surprised", "wide-eyed", ":o", "open mouth"], "sparkle": ["sparkling eyes", "+ +", "star-shaped pupils"], "smug": ["smug", "smirk", "half-closed eyes"],
        "cold": ["expressionless", "half-closed eyes", "narrowed eyes", "glaring"], "wicked": ["evil smile", "smirk", "smug", "grin"], "shy": ["blush", "embarrassed", "looking away"],
        "panic": ["sweat", "wide-eyed", "flustered", "open mouth"], "drunk": ["blush", "drunk", "half-closed eyes"], "sleepy": ["half-closed eyes", "sleepy", "closed eyes"]}
BAD = ["multiple eyes", "extra eyes", "third eye", "extra arms", "extra mouth", "multiple mouths"]
BAD_CALM = ["anger vein", "tears", "crying", "streaming tears", "blush", "sweat", "sweatdrop", "nose blush", "flustered"]   # 使徒・強者・威厳のある人に出たら落とす
SAME = ["eye color", "hair color"]   # 基本と食い違ったら別人（札の名前の末尾で見る）
TH = {"same_joy": 0.92, "same_fun": 0.78, "tag": 0.08, "eyes_max": 2, "brow_dark": 0.22, "diff": 0.025, "newpos": 1.3}

_models = {}


def eyes_of(im):
    from ultralytics import YOLO
    if "eyes" not in _models: _models["eyes"] = YOLO(EYES)
    r = _models["eyes"].predict(np.array(im.convert("RGB")), conf=0.35, verbose=False)[0]
    out = []
    if r.masks is None: return out
    for k in range(len(r.boxes)):
        x0, y0, x1, y1 = map(float, r.boxes.xyxy[k].tolist())
        m = r.masks.data[k].cpu().numpy() > 0.5
        out.append({"box": [x0, y0, x1, y1], "conf": float(r.boxes.conf[k]), "mask": m})
    out.sort(key=lambda e: -e["conf"]); keep = []
    for e in out:
        if all(iou(e["box"], k2["box"]) < 0.3 for k2 in keep): keep.append(e)
    return keep


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1])); i = ix * iy
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i
    return i / max(u, 1) if u else 0


def tags_of(im):
    import onnxruntime as ort
    if "tag" not in _models:
        s = ort.InferenceSession(TAGGER + "model.onnx", providers=["CPUExecutionProvider"])
        names = [row["name"].replace("_", " ") for row in csv.DictReader(open(TAGGER + "selected_tags.csv", encoding="utf-8"))]
        _models["tag"] = (s, names)
    s, names = _models["tag"]
    size = s.get_inputs()[0].shape[1]
    bg = Image.new("RGB", im.size, (255, 255, 255)); bg.paste(im.convert("RGB"))
    x = np.array(bg.resize((size, size), Image.BICUBIC)).astype(np.float32)[:, :, ::-1][None]
    p = s.run(None, {s.get_inputs()[0].name: x})[0][0]
    return {n: float(v) for n, v in zip(names, p)}


def brow_gap(im, eye):
    """目の塊の上の端から、上へ向かって最初の暗い太い線（眉）までの距離を、目の高さで割った値。見つからなければ None"""
    a = np.array(im.convert("L")).astype(np.float32); H, W = a.shape
    x0, y0, x1, y1 = [int(v) for v in eye["box"]]; eh = max(y1 - y0, 4)
    xs = slice(max(0, x0 + (x1 - x0) // 4), min(W, x1 - (x1 - x0) // 4))
    top = y0
    for y in range(top - 1, max(0, top - int(2.2 * eh)), -1):
        row = a[y, xs]
        if (row < 90).mean() > 0.35: return (top - y) / eh
    return None


def check(who, mood, base, face, hidden=None, calm=False):
    why = []
    bi, fi = Image.open(base).convert("RGBA"), Image.open(face).convert("RGBA")
    if bi.size != fi.size: fi = fi.resize(bi.size)
    W, H = bi.size
    be, fe = eyes_of(bi), eyes_of(fi)
    if be and len(fe) > max(TH["eyes_max"], len(be)): why.append(f"目が {len(fe)} つ（基本は {len(be)}）")
    # 基本に無い位置の目（前髪の上・頬などに増えた目）
    if be:
        for e in fe:
            cx, cy = (e["box"][0] + e["box"][2]) / 2, (e["box"][1] + e["box"][3]) / 2
            dmin = min(np.hypot(cx - (b["box"][0] + b["box"][2]) / 2, cy - (b["box"][1] + b["box"][3]) / 2) / max(b["box"][2] - b["box"][0], 1) for b in be)
            if dmin > TH["newpos"]: why.append(f"基本に無い所に目がある（{dmin:.2f}）")
    if hidden: why += [w for w in [] ]
    # 眉と目の重なり：基本の目の上の帯（眉と目のあいだの肌）が、作った顔で暗くなっていたら重なり
    ga = np.array(bi.convert("L")).astype(np.float32); gf = np.array(fi.convert("L")).astype(np.float32)
    for b in be:
        x0, y0, x1, y1 = [int(v) for v in b["box"]]; eh = max(y1 - y0, 6); w4 = (x1 - x0) // 5
        band = (slice(max(0, y0 - int(0.55 * eh)), max(1, y0 - int(0.08 * eh))), slice(x0 + w4, x1 - w4))
        db = float((ga[band] < 95).mean()); df = float((gf[band] < 95).mean())
        if df - db > TH["brow_dark"]: why.append(f"眉と目が重なる（目の上の暗さ {db:.2f}→{df:.2f}）")
    # 表情の差（目と口の所）
    a = np.array(bi.convert("RGB")).astype(np.float32) / 255; c = np.array(fi.convert("RGB")).astype(np.float32) / 255
    reg = np.zeros((H, W), bool)
    for e in be + fe:
        x0, y0, x1, y1 = [int(v) for v in e["box"]]; reg[max(0, y0 - 10):y1 + 10, max(0, x0 - 10):x1 + 10] = True
    reg[int(H * 0.55):int(H * 0.8), int(W * 0.3):int(W * 0.7)] = True
    d = float(np.abs(a - c).max(-1)[reg].mean()) if reg.any() else 0.0
    if d < TH["diff"]: why.append(f"基本と変わっていない（差 {d:.3f}）")
    # 札
    tb, tf = tags_of(bi), tags_of(fi)
    want = WANT.get(mood, [])
    best = max([tf.get(t, 0) for t in want] or [1])
    if want and best < TH["tag"]: why.append(f"何の表情か分からない（{mood} の札 {best:.2f}）")
    # 元から笑顔の人の喜・楽：表情の札の並びが基本とほぼ同じなら「変わってない」
    EX = sorted({t for v in WANT.values() for t in v} | {"closed eyes", "one eye closed", "open mouth", "closed mouth", "teeth", "clenched teeth", "fang", "tears", "blush", "frown", "furrowed brow", "raised eyebrows", "v-shaped eyebrows", "half-closed eyes", "wide-eyed", "parted lips", "sharp teeth"})
    va = np.array([tb.get(e, 0) for e in EX]); vf = np.array([tf.get(e, 0) for e in EX])
    sim = float(va @ vf / max(np.linalg.norm(va) * np.linalg.norm(vf), 1e-6))
    smiling = max(tb.get("smile", 0), tb.get("grin", 0), tb.get(":d", 0)) > 0.5
    if smiling and ((mood == "joy" and sim > TH["same_joy"]) or (mood in ("fun", "smug") and sim > TH["same_fun"])): why.append(f"元から笑顔で、基本と同じ表情（札の似かた {sim:.2f}）")
    if mood in ("anger", "sorrow", "cold") and max(tf.get("smile", 0), tf.get(":d", 0), tf.get("grin", 0)) > 0.5: why.append(f"{mood} なのに笑っている（smile {tf.get('smile', 0):.2f}）")
    if mood in ("joy", "fun") and max(tf.get("angry", 0), tf.get("crying", 0), tf.get("sad", 0)) > 0.5: why.append(f"{mood} なのに怒り・泣き")
    for t in BAD + (BAD_CALM if calm else []):
        if tf.get(t, 0) > 0.35: why.append(f"札 {t}（{tf[t]:.2f}）")
    for kind in SAME:
        nb = max(((n, v) for n, v in tb.items() if n.endswith(kind)), key=lambda x: x[1], default=None)
        nf = max(((n, v) for n, v in tf.items() if n.endswith(kind)), key=lambda x: x[1], default=None)
        if nb and nf and nb[1] > 0.5 and nf[1] > 0.5 and nb[0] != nf[0] and tf.get(nb[0], 0) < 0.3: why.append(f"別人（{nb[0]} → {nf[0]}）")
    return {"who": who, "mood": mood, "ok": not why, "why": why, "eyes": [len(be), len(fe)], "diff": round(d, 3),
            "want_tag": round(best, 2), "sim": round(sim, 3), "top_tags": sorted(((round(v, 2), n) for n, v in tf.items() if v > 0.4), reverse=True)[:12]}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--who"); ap.add_argument("--mood"); ap.add_argument("--base"); ap.add_argument("--face")
    ap.add_argument("--hidden", choices=["left", "right"]); ap.add_argument("--calm", action="store_true"); ap.add_argument("--json")
    ap.add_argument("--batch", help="json の一覧 [{who,mood,base,face,hidden,calm}]")
    o = ap.parse_args()
    items = json.load(open(o.batch, encoding="utf-8")) if o.batch else [vars(o)]
    res = [check(x["who"], x["mood"], x["base"], x["face"], x.get("hidden"), x.get("calm", False)) for x in items]
    for r in res: print(("OK  " if r["ok"] else "NG  ") + f'{r["who"]}_{r["mood"]}  ' + " / ".join(r["why"]))
    if o.json: json.dump(res, open(o.json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
