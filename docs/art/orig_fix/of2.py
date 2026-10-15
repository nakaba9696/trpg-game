# 最初の差分の直し・2 版（2026-10-16 持ち主「元の差分のほうが髪・目・眉が崩れなかった。ただアクセサリーや線が変わった」）
#   出発点は直す前の差分（作り直した差分があればそれ）。顔（前髪・眉・目・口・頬）には基本の画素を混ぜない
#   基本と違ってしまった「物」だけを、その物の形の小さなマスク（輪郭＋3px）で基本から戻す：髪留め・耳飾り・布の柄・マスク・眼帯・片眼鏡・眼鏡の縁・傷・ばんそうこう・紋
#   差分にだけ増えた物（傷・ばんそうこう・汚れ）は、頬・額の肌の所だけ基本の肌に戻す
#   瞳の色が変わった物は、虹彩の中の色だけを基本に寄せる（形・大きさ・ハイライトは差分のまま）
#   透明は差分のまま（顔の中の外とつながらない透明は埋める）
#   前髪・眉・目にかかる物は戻さない（記録に名前を残す）
# 使い方：python of2.py id [id ...]   （OUT=出す所）
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import of as OF
import keep as K
import basefix as BF
OUT = os.environ.get("OUT", os.path.join(HERE, "of2_out"))
NOSKIN = {"filie", "angelica"}   # 髪と肌の色が近く、肌の戻しが顔じゅうに広がる人
for d_ in ("portraits", "mask", "rep"): os.makedirs(os.path.join(OUT, d_), exist_ok=True)


def objects_of(a, box, who, keep, bangs, eyezone, browzone, mouthzone, sk, hair, beard):
    """基本の絵の「物」：守る所（肌でない所）から、前髪・髪・目・眉・口・ひげを除いた塊"""
    c = a[..., :3].astype(np.float32)
    is_hair = np.abs(c - hair).max(-1) < 40
    obj = keep & ~bangs & ~is_hair & ~eyezone & ~browzone & ~mouthzone & ~beard
    obj = ndimage.binary_opening(obj, iterations=1)
    lab, n = ndimage.label(obj); sz = ndimage.sum(obj, lab, range(1, n + 1))
    return np.isin(lab, [j + 1 for j in range(n) if sz[j] >= 12])


def run(i, moods=None):
    box = OF.MANUAL.get(i) or OF.F[f"H:/game/trpg-moods/assets/portraits/{i}.webp"][0]
    b = OF.load(f"{OF.BASEFIX}/{i}.webp" if os.path.exists(f"{OF.BASEFIX}/{i}.webp") else f"{OF.SRC}{i}.webp"); H, W = b.shape[:2]
    fwin = OF.facebox_win(i)
    win = [int(fwin[0] * W), int(fwin[1] * H), int((fwin[0] + fwin[2]) * W), int((fwin[1] + fwin[3]) * H)]
    keep_b, eyes_ell, mouth, info = OF.parts(b, box, i, OF.EXT.get(i))
    sk = np.array(info["skin"], np.float32); hair = np.array(info["hair"], np.float32)
    x0, y0, x1, y1 = box[:4]; fw, fh = x1 - x0, y1 - y0; yy, xx = np.mgrid[:H, :W]
    roi = np.zeros((H, W), bool); m_ = 0.15
    roi[max(0, int(win[1] - m_ * (win[3] - win[1]))):int(win[3] + m_ * (win[3] - win[1])), max(0, int(win[0] - m_ * (win[2] - win[0]))):int(win[2] + m_ * (win[2] - win[0]))] = True
    rims = np.zeros((H, W), bool)
    try:
        import rim as RIM
        if i in RIM.LENS: rims = ndimage.binary_dilation(RIM.rim(b, box, i), iterations=2)
    except Exception: pass
    bangs_b, beard_b = OF.bangs_beard(b, box, i, sk, hair)
    be = OF.yolo_eyes(b, win)
    vs = [m for m in (OF.PJ.get(i, {}).get("variants") or {}) if os.path.exists(f"{OF.SRC}{i}_{m}.webp")]
    if moods: vs = [m for m in vs if m in moods]
    rep = {}
    for m in vs:
        v = f"{i}_{m}"
        if v in OF.NG_OWNER or i in ("barnabe", "hermes", "sig", "valdun", "anselmo", "bartolo"): rep[v] = {"skip": "持ち主が作らないと決めた"}; continue
        src = f"{OF.REGEN}/{v}.webp" if os.path.exists(f"{OF.REGEN}/{v}.webp") else f"{OF.SRC}{v}.webp"
        d0 = OF.load(src)
        if d0.shape != b.shape: rep[v] = {"skip": "大きさが違う"}; continue
        d, M = OF.align(b, d0, roi & (b[..., 3] > 250))
        # 透明：差分のまま。白い地のまま（RGB）の差分は、基本の透明を使う
        is_regen = src.startswith(OF.REGEN)
        if d0[..., 3].min() == 255 and b[..., 3].min() < 255:
            d[..., 3] = b[..., 3]
        fb = box; bw, bh = fb[2] - fb[0], fb[3] - fb[1]
        holes = 0
        if i in OF.FILLD:   # 透けた穴のある人だけ埋める（ほかの人は半透明の肌を埋めると染みになる）
            d, holes = BF.fill(d, [fb[0] - 0.1 * bw, fb[1] - 0.1 * bh, fb[2] + 0.1 * bw, fb[3] + 0.25 * bh]) if OF.FILLD[i] == "fill" else BF.fillrgb(d, fb)
        de = OF.yolo_eyes(d, win)
        c_b = b[..., :3].astype(np.float32); c_d = d[..., :3].astype(np.float32)
        # 顔の部品の範囲（ここには基本を混ぜない）
        eyezone = ndimage.binary_dilation(eyes_ell, iterations=max(3, int(0.05 * fh)))
        for e in be + de:
            ex0, ey0, ex1, ey1 = e["box"]; ew, eh = ex1 - ex0, ey1 - ey0
            eyezone |= (xx >= ex0 - 0.25 * ew) & (xx <= ex1 + 0.25 * ew) & (yy >= ey0 - 0.4 * eh) & (yy <= ey1 + 0.4 * eh)
        browzone = np.zeros((H, W), bool)
        for e in be + de:
            ex0, ey0, ex1, ey1 = e["box"]; ew, eh = ex1 - ex0, ey1 - ey0
            browzone |= (xx >= ex0 - 0.25 * ew) & (xx <= ex1 + 0.25 * ew) & (yy >= ey0 - 2.0 * eh) & (yy < ey0)
        mouthzone = ndimage.binary_dilation(mouth, iterations=max(3, int(0.06 * fh)))
        bangs_d, beard_d = OF.bangs_beard(d, box, i, sk, hair)
        face_parts = eyezone | browzone | mouthzone | ndimage.binary_dilation(bangs_b | bangs_d, iterations=2)
        # 1. 基本の物（変わった物だけ）
        obj = objects_of(b, box, i, keep_b, bangs_b, eyezone, browzone, mouthzone, sk, hair, beard_b) & roi
        lab, n = ndimage.label(obj); restore = np.zeros((H, W), bool); names = []
        hairboth = ((np.abs(c_b - hair).max(-1) < 45) | (np.abs(c_d - hair).max(-1) < 45)) & ~((np.abs(c_b - sk).max(-1) < 40))
        for j in range(1, n + 1):
            comp = lab == j
            ring = ndimage.binary_dilation(comp, iterations=3)
            changed = (np.abs(c_d - c_b).max(-1) > 40)[ring].mean()
            if changed < 0.06: continue   # 変わっていない物は触らない
            if (ring & hairboth).sum() > 0.2 * ring.sum():
                ys, xs = np.where(comp); names.append(f"髪にかかる物（{int(xs.mean())},{int(ys.mean())}）は戻さない"); continue
            if (ring & (eyezone | browzone)).sum() > 0.3 * ring.sum():
                ys, xs = np.where(comp); names.append(f"目・眉にかかる物（{int(xs.mean())},{int(ys.mean())}）は戻さない"); continue
            restore |= ring & ~(eyezone | browzone) & ~ndimage.binary_dilation(bangs_d & ~bangs_b, iterations=1)
        restore |= rims
        # 2. 差分にだけ増えた物（頬・額の肌の所）
        Yb = c_b @ np.array([0.3, 0.59, 0.11]); Yd = c_d @ np.array([0.3, 0.59, 0.11])
        # 基本の肌：肌の色に近く、まわり（9px）も肌の所（濃い肌・影の肌も入るよう、肌の色からの距離を広めに）
        skin_b = (np.abs(c_b - sk).max(-1) < 60) & (b[..., 3] > 250) & (Yb > Yb[b[..., 3] > 250].mean() * 0.7)
        skin_b &= ndimage.uniform_filter(skin_b.astype(np.float32), 9) > 0.8
        # 肌の色合いの全体の差を引いてから比べる（差分の肌が全体に明るい・暗いとき、顔じゅうが「増えた物」にならないように）
        bothskin = skin_b & (np.abs(c_d - c_b).max(-1) < 60) & roi
        offv = np.median(c_b[bothskin] - c_d[bothskin], 0) if bothskin.sum() > 200 else np.zeros(3)
        c_dn = c_d + offv; Yd = c_dn @ np.array([0.3, 0.59, 0.11])
        Ybl = ndimage.uniform_filter(Yd, 7)
        extra_dark = skin_b & (((Yb - Yd > 25) & (c_b[..., 0] - c_dn[..., 0] > 22)) | ((Ybl - Yd > 12) & (Yb - Yd > 14)))
        chd = c_d.max(-1) - c_d.min(-1)
        Ybl = ndimage.uniform_filter(Yd, 7)
        extra_dark = skin_b & (((Yb - Yd > 25) & (c_b[..., 0] - c_d[..., 0] > 22)) | ((Ybl - Yd > 12) & (Yb - Yd > 14)))   # 差分にだけある暗い塊・細い線（傷・しわ・ひび）
        extra_light = skin_b & (Yd - Yb > 18) & (chd < 45)
        # 口の開き（暗い線で囲まれた所＝歯・口の中）は口の物として残す。口の楕円の中でも、それ以外の明るい塊（ばんそうこう）は外す
        mdark = (Yd < 110) & mouthzone
        mopen = ndimage.binary_fill_holes(ndimage.binary_closing(mdark, iterations=2)) & mouthzone
        core_parts = eyezone | browzone | mouthzone
        ed = extra_dark & ~core_parts & roi
        # 差分の髪の塊（基本で肌でない髪）とつながる暗い線は、髪の毛先なので戻さない
        hair_d = (np.abs(c_d - hair).max(-1) < 50) & ~skin_b
        lab_h, _ = ndimage.label(ndimage.binary_dilation(hair_d, iterations=1) | ed)
        hair_ids = np.unique(lab_h[hair_d]); ed &= ~np.isin(lab_h, hair_ids[hair_ids > 0])
        extra = ed | (extra_light & ~(eyezone | browzone) & ~mopen & roi)
        extra = ndimage.binary_closing(extra, iterations=2)
        lab2, n2 = ndimage.label(extra); sz2 = ndimage.sum(extra, lab2, range(1, n2 + 1))
        extra = np.isin(lab2, [j + 1 for j in range(n2) if sz2[j] >= 15])
        if not is_regen and i not in NOSKIN: restore |= ndimage.binary_dilation(extra, iterations=2) & skin_b   # 作り直した差分は肌の色合いが違うので、肌は戻さない
        if os.environ.get("DEBUG"):
            dbg = np.zeros((H, W, 3), np.uint8); dbg[..., 0] = skin_b * 120; dbg[..., 1] = extra * 255; dbg[..., 2] = face_parts * 120
            Image.fromarray(dbg).save(f"{OUT}/dbg_{v}.png")
        # 基本できれいな肌の所（まわり 5px に基本の暗い線・歯が無い）：ここなら基本の肌を戻しても口や線を持ち込まない
        cleanskin = (np.abs(c_b - sk).max(-1) < 60) & (ndimage.minimum_filter(Yb, 5) > Yb[b[..., 3] > 250].mean() * 0.75) & (ndimage.maximum_filter(Yb, 5) < 245)
        for ex, ey, rx, ry in OF.DROP.get(i, []):
            fx0, fy0 = win[0], win[1]; fwp, fhp = win[2] - win[0], win[3] - win[1]
            restore |= ((((xx - (fx0 + ex * fwp)) / (rx * fwp)) ** 2 + ((yy - (fy0 + ey * fhp)) / (ry * fhp)) ** 2) <= 1) & cleanskin & ~ndimage.binary_dilation(mopen, iterations=2) & ~eyezone
        restore &= roi & (b[..., 3] > 200) & (d[..., 3] > 200)
        # 3. 重ねる（縁 1px ぼかし）
        w = ndimage.gaussian_filter(restore.astype(np.float32), 0.8)[..., None]
        o = d.astype(np.float32).copy(); o[..., :3] = c_d * (1 - w) + c_b * w
        o = o.round().clip(0, 255).astype(np.uint8)
        # 4. 瞳の色（虹彩の中の色だけ）
        allmask = np.ones((H, W), bool)
        o, irisde = OF.iris_match(b, o, be, de, allmask)
        if i in OF.FILLD: o, _ = BF.fill(o, [fb[0] - 0.1 * bw, fb[1] - 0.1 * bh, fb[2] + 0.1 * bw, fb[3] + 0.25 * bh])   # 口の中などの透けを埋める
        # 5. 点検
        why = []
        oe = OF.yolo_eyes(o, win)
        if len(oe) > max(2, len(be)): why.append(f"目が {len(oe)} つ")
        ring = ndimage.binary_dilation(restore, iterations=2) & ~ndimage.binary_erosion(restore, iterations=2)
        gO = np.hypot(*np.gradient(o[..., :3].mean(-1).astype(np.float32))); gB = np.hypot(*np.gradient(Yb)); gD = np.hypot(*np.gradient(Yd))
        seam = int((ring & (gO > np.maximum(gB, gD) + 25) & (gO > 30)).sum())
        if seam > 60: why.append(f"戻した物の縁に段差（{seam}px）")
        tr = o[..., 3] < 128; lab3, n3 = ndimage.label(tr); border = set(np.unique(np.concatenate([lab3[0], lab3[-1], lab3[:, 0], lab3[:, -1]]))) - {0}
        inface = [int((lab3 == j).sum()) for j in range(1, n3 + 1) if j not in border and (lab3 == j)[int(box[1]):int(box[3]), int(box[0]):int(box[2])].any() and (b[..., 3][lab3 == j] > 200).mean() > 0.5]   # 基本でも透明の所（髪と顔のすき間）は穴でない
        if inface and max(inface) > 30: why.append(f"顔に透明の穴（{max(inface)}px）")
        Image.fromarray(o, "RGBA").save(f"{OUT}/portraits/{v}.webp", "WEBP", quality=92, alpha_quality=100, method=6)
        Image.fromarray((restore * 255).astype(np.uint8)).save(f"{OUT}/mask/{v}.png")
        rep[v] = {"ok": not why, "why": why, "from": os.path.relpath(src, HERE).replace("\\", "/"), "restored_px": int(restore.sum()), "objects": int(n), "not_restored": names,
                  "iris_de": irisde, "holes_filled": holes, "seam": seam, "eyes": [len(be), len(de), len(oe)]}
    return rep


if __name__ == "__main__":
    for i in sys.argv[1:]:
        try: rep = run(i)
        except Exception as e:
            import traceback; traceback.print_exc(); rep = {"error": str(e)}
        json.dump(rep, open(f"{OUT}/rep/{i}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        for v, r in rep.items():
            if isinstance(r, dict): print(v, "OK" if r.get("ok") else "NG", " / ".join(r.get("why", [])) or r.get("skip", ""), r.get("restored_px", ""), r.get("not_restored", ""), flush=True)
