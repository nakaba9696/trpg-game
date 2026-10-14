# 最初の差分を、表情はそのままで基本の絵に合わせて直す（2026-10-15・orig-fix-1）
#   1. 合わせ：差分を基本に重ねる（ECC・相似変換＝平行移動と小さな回転・拡大）。範囲の境目の輪郭が 2px 以上ずれる物は描き直しへ回す
#   2. 表情の範囲：目（AnzhcEyes-seg を広げた所＋目と眉の楕円）・眉の帯・口・目の下から口の周りの頬の肌。
#      髪・前髪・アクセサリー・服・ひげ・眼鏡・傷・化粧・透過の縁は外す（keep.py の守る所＋差分側の前髪とひげ）。縁は 3〜6px ぼかす
#   3. 範囲の外は基本の画素（透過も基本）、範囲の中は差分の画素
#   4. 瞳の色：差分の虹彩を、基本の虹彩の Lab の分布に合わせる（白目・ハイライトは除く）
#   6. 点検：目の数・眉と目の重なり・範囲の外が基本と同じ・境目の段差・表情の差 0.025 以上・瞳の色が近い
# 使い方：python of.py id [id ...]   （WebUI の venv の python。SRC=main の絵の場所、OUT=出す所）
import json, os, sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import keep as K
import face_gate as FG

SRC = os.environ.get("SRC", os.path.join(HERE, "../main_orig/assets/portraits/").replace("\\", "/"))
WT = "H:/game/origfix-wt/"
OUT = os.environ.get("OUT", os.path.join(HERE, "of_out"))
F = json.load(open(os.path.join(HERE, "faces.json"))); MANUAL = {"barnabe": [195, 45, 320, 150], "bartolo": [188, 30, 318, 150]}
EXT = json.load(open(os.path.join(HERE, "ext.json"), encoding="utf-8"))
HT = {"constance": 14, "margot": 55}
PJ = {p["id"]: p for p in json.load(open(WT + "docs/art/portraits.json", encoding="utf-8"))["portraits"]}
NG_OWNER = {"sheila_anger", "ilse_joy", "elnea_joy", "zerina_joy", "zerina_fun"}
TH = {"misfit": 2.0, "misfit_frac": 0.35, "seam": 60, "diff": 0.025, "iris_de": 12.0}
for d in ("portraits", "mask", "rep"): os.makedirs(os.path.join(OUT, d), exist_ok=True)


def facebox_win(i):
    """顔の窓の四角（u41_face_box.js）を画素で"""
    if not hasattr(facebox_win, "t"):
        import re
        s = open(WT + "src/data/u41_face_box.js", encoding="utf-8").read()
        facebox_win.t = {m[0]: [float(v) for v in m[1].split(",")] for m in re.findall(r"(\w+): \[([\d., ]+)\]", s)}
    return facebox_win.t.get(i)


def load(p): return np.array(Image.open(p).convert("RGBA"))


def align(b, d, roi):
    """差分を基本に合わせる（相似変換）。返す：合わせた差分、行列"""
    g = lambda a: cv2.GaussianBlur((a[..., :3].mean(-1) * (a[..., 3] / 255.0) + 255 * (1 - a[..., 3] / 255.0)).astype(np.float32), (0, 0), 1.2)
    gb, gd = g(b), g(d)
    M = np.eye(2, 3, dtype=np.float32)
    try:
        _, M = cv2.findTransformECC(gb, gd, M, cv2.MOTION_EUCLIDEAN, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), roi.astype(np.uint8), 5)
    except cv2.error:
        M = np.eye(2, 3, dtype=np.float32)
    if np.abs(M[:, 2]).max() > 12 or abs(M[0, 1]) > 0.05: M = np.eye(2, 3, dtype=np.float32)   # 大きくずれる答えは信じない
    H, W = b.shape[:2]
    if np.abs(M[:, 2]).max() < 0.5 and abs(M[0, 1]) < 0.002: return d, np.eye(2, 3, dtype=np.float32)   # ずれ 0.5px 未満は動かさない（ぼけない）
    w = cv2.warpAffine(d, M, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    return w, M


def parts(a, box, who, ext):
    """keep.py と同じ作りで、肌の色・髪の色・前髪・ひげ・目と眉の楕円・口の楕円を返す"""
    draw, keep, eyes, mouth, info = K.masks(a, box, who, HT.get(who, 40), ext)
    return keep, eyes, mouth, info


def bangs_beard(a, box, who, sk, hair):
    """差分側の前髪（頭の髪の色で、顔の上の外とつながる所）とひげ"""
    H, W = a.shape[:2]; c = a[..., :3].astype(np.float32); al = a[..., 3] > 250
    x0, y0, x1, y1 = box[:4]; fw, fh = x1 - x0, y1 - y0; cx = (x0 + x1) / 2; yy, xx = np.mgrid[:H, :W]
    is_hair = (np.abs(c - hair).max(-1) < HT.get(who, 40)) & al & (np.abs(c - sk).max(-1) > 25)
    lab, n = ndimage.label(is_hair); ids = np.unique(lab[is_hair & (yy < y0 + 0.12 * fh)]); ids = ids[ids > 0]
    m = np.isin(lab, ids) & (yy >= y0) & (yy <= y1) & (xx >= x0 - 0.1 * fw) & (xx <= x1 + 0.1 * fw)
    bd = np.zeros_like(m)
    if who in K.BEARD:
        by = int(y0 + 0.93 * fh); bc = np.median(c[by - 3:by + 4, int(cx) - 5:int(cx) + 6].reshape(-1, 3), 0)
        if np.abs(bc - sk).max() > 30: bd = ndimage.binary_opening((np.abs(c - bc).max(-1) < 42) & al & (yy > y0 + 0.5 * fh), iterations=1)
    return m, bd


def yolo_eyes(a, win):
    """顔の窓の四角を 1024 に広げて目を探し、元の大きさの目の塊を返す"""
    H, W = a.shape[:2]; x0, y0, x1, y1 = win
    crop = Image.fromarray(a).crop((x0, y0, x1, y1)); bg = Image.new("RGBA", crop.size, (255, 255, 255, 255)); bg.alpha_composite(crop)
    S = 1024; es = FG.eyes_of(bg.convert("RGB").resize((S, S), Image.BICUBIC))
    out = []
    for e in es:
        m = np.array(Image.fromarray((e["mask"] * 255).astype(np.uint8)).resize((x1 - x0, y1 - y0), Image.BILINEAR)) > 127
        full = np.zeros((H, W), bool); full[y0:y1, x0:x1] = m
        bx = e["box"]; sx, sy = (x1 - x0) / S, (y1 - y0) / S
        out.append({"mask": full, "box": [x0 + bx[0] * sx, y0 + bx[1] * sy, x0 + bx[2] * sx, y0 + bx[3] * sy]})
    return out


def lab(c): return cv2.cvtColor(np.clip(c, 0, 255).astype(np.uint8)[None], cv2.COLOR_RGB2LAB)[0].astype(np.float32)


def iris_sel(a, m):
    """目の塊の中の虹彩：白目（明るく色の薄い所）・ハイライト・黒い線を除く"""
    c = a[..., :3].astype(np.float32); L = lab(c.reshape(-1, 3)).reshape(c.shape)
    chroma = np.hypot(L[..., 1] - 128, L[..., 2] - 128)
    return m & (L[..., 0] > 20) & ~((L[..., 0] > 190) & (chroma < 20)) & ~((L[..., 0] > 230)), L


def dE(p, q):
    """OpenCV の 8bit Lab の平均の差を、ふつうの ΔE（L は 0〜100）に直す"""
    d = p - q; return float(np.sqrt((d[0] / 2.55) ** 2 + d[1] ** 2 + d[2] ** 2))


def iris_match(b, o, be, de, region):
    """差分の虹彩の色を基本に合わせる。目ごと（左右の近い物どうし）"""
    o = o.copy(); res = []
    for e in de:
        cx = (e["box"][0] + e["box"][2]) / 2
        if not be: break
        bb = min(be, key=lambda q: abs((q["box"][0] + q["box"][2]) / 2 - cx))
        mb, Lb = iris_sel(b, bb["mask"]); mo, Lo = iris_sel(o, e["mask"] & (o[..., 3] > 250) & region)
        if mb.sum() < 20 or mo.sum() < 20: continue
        pb, po = Lb[mb], Lo[mo]
        de0 = dE(pb.mean(0), po.mean(0))
        if de0 < 6: res.append(round(de0, 1)); continue
        sb, so = pb.std(0) + 1e-3, po.std(0) + 1e-3
        k = np.clip(sb / so, 0.7, 2.0)
        new = (po - po.mean(0)) * k + pb.mean(0)
        hl = Lo[mo][:, 0] > 215   # ハイライトは明るさを残す
        new[hl, 0] = po[hl, 0]
        rgb = cv2.cvtColor(np.clip(new, 0, 255).astype(np.uint8)[None], cv2.COLOR_LAB2RGB)[0]
        soft = ndimage.gaussian_filter(mo.astype(np.float32), 0.7)[mo][:, None]
        o[mo, :3] = np.clip(o[mo, :3] * (1 - soft) + rgb * soft, 0, 255).round().astype(np.uint8)
        _, Ln = iris_sel(o, e["mask"]); res.append(round(dE(pb.mean(0), Ln[mo].mean(0)), 1))
    return o, res


def misfit(b, d, region):
    """範囲の境目の帯で、基本の輪郭の線から差分の輪郭の線までの距離（px）。2 より遠い線の割合"""
    ring = ndimage.binary_dilation(region, iterations=4) & ~ndimage.binary_erosion(region, iterations=4)
    eb = cv2.Canny(cv2.cvtColor(b[..., :3], cv2.COLOR_RGB2GRAY), 60, 140) > 0
    ed = cv2.Canny(cv2.cvtColor(d[..., :3], cv2.COLOR_RGB2GRAY), 60, 140) > 0
    sel = eb & ring
    if sel.sum() < 15: return 0.0
    dist = ndimage.distance_transform_edt(~ed)
    return float((dist[sel] > TH["misfit"]).mean())


def run(i, moods=None):
    box = MANUAL.get(i) or F[f"H:/game/trpg-moods/assets/portraits/{i}.webp"][0]
    b = load(f"{SRC}{i}.webp"); H, W = b.shape[:2]
    fwin = facebox_win(i)
    win = [int(fwin[0] * W), int(fwin[1] * H), int((fwin[0] + fwin[2]) * W), int((fwin[1] + fwin[3]) * H)] if fwin else [0, 0, W, H]
    ext = EXT.get(i)
    keep_b, eyes_ell, mouth, info = parts(b, box, i, ext)
    sk = np.array(info["skin"], np.float32); hair = np.array(info["hair"], np.float32)
    x0, y0, x1, y1 = box[:4]; fw, fh = x1 - x0, y1 - y0; yy, xx = np.mgrid[:H, :W]
    al_b = b[..., 3] > 250
    rims = np.zeros((H, W), bool); rimb = rims; rimthr = 232
    try:
        import rim as RIM
        if i in RIM.LENS: rimb = RIM.rim(b, box, i); rimthr = RIM.THR.get(i, 232); rims = ndimage.binary_dilation(rimb, iterations=1)
        if i in RIM.LENS or i in RIM.PHANTOM: rims |= RIM.band(b, box, i)
    except Exception: pass
    bangs_b, _ = bangs_beard(b, box, i, sk, hair); bangs_b = ndimage.binary_dilation(bangs_b, iterations=1) & keep_b
    be = yolo_eyes(b, win)
    vs = [m for m in (PJ.get(i, {}).get("variants") or {}) if os.path.exists(f"{SRC}{i}_{m}.webp")]
    if moods: vs = [m for m in vs if m in moods]
    rep = {}
    roi = np.zeros((H, W), bool); roi[win[1]:win[3], win[0]:win[2]] = True
    for m in vs:
        v = f"{i}_{m}"
        if v in NG_OWNER: rep[v] = {"skip": "持ち主が表情で NG"}; continue
        d0 = load(f"{SRC}{v}.webp")
        if d0.shape != b.shape: rep[v] = {"skip": "大きさが違う"}; continue
        d, M = align(b, d0, roi & al_b)
        # 肌の色合いを基本に寄せる（差分だけ肌が明るい・暗いと、範囲の所が浮く）
        cb_, cd_ = b[..., :3].astype(np.float32), d[..., :3].astype(np.float32)
        both = roi & al_b & (np.abs(cb_ - sk).max(-1) < 25) & (np.abs(cd_ - cb_).max(-1) < 30)   # 両方で肌の所（頬の赤みは外れる）
        skin_shift = [0, 0, 0]
        if both.sum() > 200:
            off = np.clip(np.median(cb_[both] - cd_[both], 0), -15, 15)
            if np.abs(off).max() > 3:
                near = np.clip(1 - np.abs(cd_ - (sk - off)).max(-1) / 90, 0, 1)[..., None]   # 肌に近い色ほど強く
                d = d.copy(); d[..., :3] = np.clip(cd_ + off * near, 0, 255).round().astype(np.uint8); skin_shift = [round(float(t)) for t in off]
        de = yolo_eyes(d, win)
        # 表情の範囲
        eyes = eyes_ell.copy(); browb = np.zeros((H, W), bool)
        for e in be + de:
            ex0, ey0, ex1, ey1 = e["box"]; ew, eh = ex1 - ex0, ey1 - ey0
            eyes |= ndimage.binary_dilation(e["mask"], iterations=max(2, int(0.12 * ew)))
            bb_ = (xx >= ex0 - 0.15 * ew) & (xx <= ex1 + 0.15 * ew) & (yy >= ey0 - 1.6 * eh) & (yy < ey0)   # 眉の帯
            eyes |= bb_; browb |= bb_
        c_d = d[..., :3].astype(np.float32); c_b = b[..., :3].astype(np.float32)
        ey_bot = max([e["box"][3] for e in be + de] or [y0 + 0.55 * fh])
        exl = min([e["box"][0] for e in be + de] or [x0 + 0.15 * fw]); exr = max([e["box"][2] for e in be + de] or [x1 - 0.15 * fw])
        mys, mxs = np.where(mouth); mb = mys.max() if len(mys) else y0 + 0.85 * fh
        cheek = (yy > ey_bot - 2) & (yy < mb + 4) & (xx > exl) & (xx < exr)
        cheek &= (np.abs(c_b - sk).max(-1) < 38) & (np.abs(c_d - sk).max(-1) < 70) & (c_d.mean(-1) > 100) & (c_d.mean(-1) > c_b.mean(-1) - 30) & (c_d[..., 0] >= c_d[..., 2])   # 肌の色の所だけ（頬の赤み・汗は差分のまま）
        # 前髪：基本と差分の両方で前髪の所だけ外す（前髪の下の眉が基本で前髪に数えられても、差分の眉を使う）
        bangs_d, beard_d = bangs_beard(d, box, i, sk, hair)
        # 眉の帯の中の前髪は、眉の線（髪より暗い所）だけ差分を使う。髪の色の違う所は基本のまま
        hl = float(np.mean(hair))
        browline = ndimage.binary_dilation((c_d.mean(-1) < hl - 35) | (c_b.mean(-1) < hl - 35), iterations=2) & browb & ~eyes_ell
        hairish = (np.abs(c_b - hair).max(-1) < 40) & (np.abs(c_b - sk).max(-1) > 20) & browb & ~eyes_ell & ~browline   # 眉の帯の中の髪の色（前髪と分からなくても）
        excl = (((keep_b & ~bangs_b) | (bangs_b & bangs_d)) & ~browline) | hairish | beard_d | rims   # 眉の帯（目の楕円の外）は、前髪の上の眉も差分を使う。眼鏡の縁だけ守る
        keep_d = excl
        # 差分にだけある暗い塊（泥・汚れ）は、目・眉・口の芯の外なら外す
        eyecore = np.zeros((H, W), bool)
        for e in be + de: eyecore |= ndimage.binary_dilation(e["mask"], iterations=3)
        mcore = ndimage.binary_erosion(mouth, iterations=max(2, int(0.05 * fh)))
        dark = (c_d.mean(-1) < c_b.mean(-1) - 35) & ~eyecore & ~mcore & ~browb
        dark = ndimage.binary_dilation(ndimage.binary_opening(dark, iterations=2), iterations=2)
        excl |= dark
        # 口の所を、差分と基本の違う所へ広げる（基本の大きく開いた口が外に残らないように）
        grow = ndimage.binary_dilation(mouth, iterations=max(3, int(0.08 * fh))) & (np.abs(c_d - c_b).max(-1) > 45) & (yy > ey_bot)
        lab_, n_ = ndimage.label(grow | mouth); keepids = np.unique(lab_[mouth]); grow = np.isin(lab_, keepids[keepids > 0]) & grow
        region = (eyes | mouth | cheek | grow) & ~excl & roi
        region &= ndimage.binary_erosion(al_b, iterations=3) & ndimage.binary_erosion(d[..., 3] > 250, iterations=3)   # 透過の縁は入れない
        region = ndimage.binary_opening(region, iterations=1)
        region = ndimage.binary_fill_holes(region) & ~excl
        # 3. 重ねる（縁を 3〜6px ぼかす：範囲の内側へ）
        inner = ndimage.binary_erosion(region, iterations=2)
        w = ndimage.gaussian_filter(inner.astype(np.float32), 1.6); w = np.where(region, w, 0)[..., None]
        o = b.astype(np.float32).copy()
        o[..., :3] = b[..., :3] * (1 - w) + d[..., :3] * w
        o = o.round().clip(0, 255).astype(np.uint8); o[..., 3] = b[..., 3]
        # 4. 瞳の色
        o, irisde = iris_match(b, o, be, de, ndimage.binary_erosion(region, iterations=1))
        # 6. 点検
        why = []
        mf = misfit(b, d, region)
        if mf > TH["misfit_frac"]: why.append(f"境目の輪郭がずれる（{mf:.2f}）")
        # 目の位置のずれ（眼鏡の人は縁と目が合わなくなるので厳しく）
        emax = 0.0
        for e in de:
            if not be: break
            cx, cy = (e["box"][0] + e["box"][2]) / 2, (e["box"][1] + e["box"][3]) / 2
            q = min(be, key=lambda q: abs((q["box"][0] + q["box"][2]) / 2 - cx))
            if abs((q["box"][0] + q["box"][2]) / 2 - cx) > (q["box"][2] - q["box"][0]): continue
            emax = max(emax, abs((q["box"][1] + q["box"][3]) / 2 - cy) / max(q["box"][3] - q["box"][1], 1))
        if emax > (0.2 if rims.any() else 0.45): why.append(f"目の位置がずれる（{emax:.2f}）")
        rimfit = None
        if rimb.any():   # 眼鏡の縁：基本の縁の画素のうち、差分でも（1px 以内で）暗い割合
            dk = ndimage.binary_dilation((d[..., :3].max(-1) < rimthr) & (d[..., 3] > 250), iterations=1)
            rimfit = float((dk & rimb).sum() / rimb.sum())
        # 基本の表情の線（差分では肌の所）が、範囲の外に残っていないか（口の位置が下がった物など）
        low = roi & (yy > ey_bot + 0.3 * (mb - ey_bot)) & (xx > exl) & (xx < exr) & ~ndimage.binary_dilation(region, iterations=2) & al_b
        lost = int((low & (c_b.mean(-1) < c_d.mean(-1) - 70) & (np.abs(c_d - sk).max(-1) < 40)).sum())
        oe = yolo_eyes(o, win)
        if len(oe) > max(2, len(be)): why.append(f"目が {len(oe)} つ")
        outside = ~ndimage.binary_dilation(region, iterations=1)
        if np.abs(o.astype(int) - b.astype(int))[outside].max() > 0: why.append("範囲の外が基本と違う")
        ring = ndimage.binary_dilation(region, iterations=3) & ~ndimage.binary_erosion(region, iterations=3)
        gO = np.hypot(*np.gradient(o[..., :3].mean(-1).astype(np.float32))); gB = np.hypot(*np.gradient(b[..., :3].mean(-1).astype(np.float32))); gD = np.hypot(*np.gradient(d[..., :3].mean(-1).astype(np.float32)))
        seam = int((ring & (gO > np.maximum(gB, gD) + 25) & (gO > 30)).sum())
        if seam > TH["seam"]: why.append(f"境目に段差（{seam}px）")
        for eb_ in be:   # 眉と目の重なり（基本の目の上の帯が暗くなった）
            ex0, ey0, ex1, ey1 = [int(t) for t in eb_["box"]]; eh = max(ey1 - ey0, 4); w4 = (ex1 - ex0) // 5
            band = (slice(max(0, ey0 - int(0.55 * eh)), max(1, ey0 - int(0.08 * eh))), slice(ex0 + w4, ex1 - w4))
            gb_, go_, gd_ = b[..., :3].mean(-1)[band], o[..., :3].mean(-1)[band], d[..., :3].mean(-1)[band]
            if gb_.size and (go_ < 95).mean() - (gb_ < 95).mean() > 0.22 and (go_ < 95).mean() - (gd_ < 95).mean() > 0.1: why.append("眉と目が重なる（重ねて出た）")
        reg = np.zeros((H, W), bool)
        for e in be + de:
            ex0, ey0, ex1, ey1 = [int(t) for t in e["box"]]; reg[max(0, ey0 - 5):ey1 + 5, max(0, ex0 - 5):ex1 + 5] = True
        reg |= mouth
        diff = float((np.abs(o[..., :3].astype(np.float32) - c_b).max(-1) / 255)[reg].mean()) if reg.any() else 0
        if diff < TH["diff"]: why.append(f"表情の差が残らない（{diff:.3f}）")
        if irisde and max(irisde) > TH["iris_de"]: why.append(f"瞳の色が遠い（{max(irisde)}）")
        Image.fromarray(o, "RGBA").save(f"{OUT}/portraits/{v}.webp", "WEBP", quality=92, alpha_quality=100, method=6)
        Image.fromarray((region * 255).astype(np.uint8)).save(f"{OUT}/mask/{v}.png")
        rep[v] = {"ok": not why, "why": why, "M": [round(float(t), 3) for t in M.ravel()], "misfit": round(mf, 3), "seam": seam, "diff": round(diff, 3), "iris_de": irisde,
                  "region_px": int(region.sum()), "eye_shift": round(emax, 2), "lost": lost, "skin_shift": skin_shift, "rimfit": rimfit and round(rimfit, 2), "eyes": [len(be), len(de), len(oe)]}
    return rep


if __name__ == "__main__":
    for i in sys.argv[1:]:
        try:
            rep = run(i)
        except Exception as e:
            import traceback; traceback.print_exc(); rep = {"error": str(e)}
        json.dump(rep, open(f"{OUT}/rep/{i}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        for v, r in rep.items():
            if isinstance(r, dict): print(v, "OK" if r.get("ok") else "NG", " / ".join(r.get("why", [])) or r.get("skip", ""), r.get("diff", ""), r.get("misfit", ""), r.get("seam", ""), r.get("iris_de", ""), flush=True)
