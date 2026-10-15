# IMG-38：顔だけ描き直すときの「描いてよい所」と「守る所（基本の画素を上に戻す所）」
#   描いてよい所＝目（眉を含む楕円。自動で見つけた目のまわりだけ。前髪で隠れた目は描かない）と口の楕円
#   守る所＝その中の、基本の肌でない画素（前髪＝頭の髪とつながる髪の色・ひげ・傷・そばかす・化粧・仮面・眼鏡・手や物）。ただし目と眉の芯・口の芯は描き直す
import numpy as np
from scipy import ndimage

BEARD = {"mordu", "hartmut", "gustav", "aubin", "otmar", "hermes", "gauthier", "gensai", "anselmo", "ambroise", "gramont", "gerhard", "greiol", "chezar", "zork", "valeon", "bartolo", "baudouin", "doctor", "captain"}


def mode_color(c, sel, q=12):
    p = c[sel]
    if len(p) == 0: return None
    k = (p // q).astype(np.int32); key = k[:, 0] * 10000 + k[:, 1] * 100 + k[:, 2]
    v, cnt = np.unique(key, return_counts=True); best = v[np.argmax(cnt)]
    return np.median(p[key == best], 0)


def skin_color(c, box, al=None):
    x0, y0, x1, y1 = box[:4]; fw, fh = x1 - x0, y1 - y0; H, W = c.shape[:2]
    yy, xx = np.mgrid[:H, :W]
    sel = (xx > x0 + 0.12 * fw) & (xx < x1 - 0.12 * fw) & (yy > y0 + 0.38 * fh) & (yy < y0 + 0.62 * fh)
    sel &= c.mean(-1) > 90
    if al is not None: sel &= al
    return mode_color(c, sel)


def masks(a, box, who, hair_tol=40, ext=None):
    """a: 基本の RGBA。返す：draw（描いてよい所）、keep（守る所）、eyes（目の楕円）、mouth（口の楕円）、info"""
    H, W = a.shape[:2]; c = a[..., :3].astype(np.float32); al = a[..., 3] > 250
    x0, y0, x1, y1 = box[:4]; fw, fh = x1 - x0, y1 - y0; cx = (x0 + x1) / 2
    yy, xx = np.mgrid[:H, :W]
    sk = skin_color(c, box, al)
    off = np.abs(c - sk).max(-1)
    nonskin = (off > 38) & al
    # 頭の髪の色と、それに（顔の上の外から）つながる髪＝前髪
    above = (yy > y0 - 0.25 * fh) & (yy < y0 + 0.08 * fh) & (np.abs(xx - cx) < 0.3 * fw) & al & (np.abs(c - sk).max(-1) > 45)
    hair = mode_color(c, above)
    if (ext or {}).get("haircolor"): hair = np.array(ext["haircolor"], np.float32)
    if hair is None: hair = np.array([0, 0, 0.])
    is_hair = (np.abs(c - hair).max(-1) < hair_tol) & al & (np.abs(c - sk).max(-1) > 25)
    seed = is_hair & (yy < y0 + 0.12 * fh)
    lab, n = ndimage.label(is_hair)
    ids = np.unique(lab[seed]); ids = ids[ids > 0]
    bangs = np.isin(lab, ids) & (yy >= y0) & (yy <= y1) & (xx >= x0 - 0.1 * fw) & (xx <= x1 + 0.1 * fw)
    # 目：目と眉の帯（上から 25%〜62%）の、肌でも前髪でもない塊のうち、左右の大きいもの
    band = (yy > y0 + 0.25 * fh) & (yy < y0 + 0.62 * fh) & (np.abs(xx - cx) < 0.46 * fw)
    cand = band & nonskin & ~ndimage.binary_dilation(bangs, iterations=1)
    cand = ndimage.binary_opening(cand, iterations=1)
    lab, n = ndimage.label(ndimage.binary_closing(cand, iterations=3))
    eyes = np.zeros((H, W), bool); found = []
    if n and not (ext or {}).get("noauto"):
        sz = ndimage.sum(cand, lab, range(1, n + 1)); com = ndimage.center_of_mass(cand, lab, range(1, n + 1))
        for side in (-1, 1):
            js = [j for j in range(n) if (com[j][1] - cx) * side > 0.04 * fw and sz[j] > 0.0015 * fw * fh]
            if not js: continue
            j = max(js, key=lambda k: sz[k])
            ys, xs = np.where(lab == j + 1)
            ey, ex = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
            rx = min(max((xs.max() - xs.min()) / 2 * 1.35, 0.11 * fw), 0.19 * fw); ry = min(max((ys.max() - ys.min()) / 2 * 1.4, 0.07 * fh), 0.11 * fh)
            ell = ((xx - ex) / rx) ** 2 + ((yy - ey) / ry) ** 2 <= 1
            brow = ((xx - ex) / (rx * 1.05)) ** 2 + ((yy - (ey - ry * 0.9)) / (ry * 0.8)) ** 2 <= 1
            eyes |= ell | brow; found.append((ex, ey, rx, ry))
    for e in (ext or {}).get("eyes", []):           # 人ごとに足す目（見つからないとき）
        ex, ey, rx, ry = x0 + e[0] * fw, y0 + e[1] * fh, e[2] * fw, e[3] * fh
        eyes |= ((xx - ex) / rx) ** 2 + ((yy - ey) / ry) ** 2 <= 1; found.append((ex, ey, rx, ry))
        if not (ext or {}).get("nobrow"):
            eyes |= ((xx - ex) / (rx * 1.05)) ** 2 + ((yy - (ey - ry * 1.3)) / (ry * 0.8)) ** 2 <= 1
    my = (ext or {}).get("mouthy", 0.72); ms = (ext or {}).get("mouthsz", 1.0)
    mouth = (((xx - cx) / (0.24 * ms * fw)) ** 2 + ((yy - (y0 + my * fh)) / (0.13 * ms * fh)) ** 2 <= 1)
    mcore = (((xx - cx) / (0.15 * ms * fw)) ** 2 + ((yy - (y0 + my * fh)) / (0.07 * ms * fh)) ** 2 <= 1)
    # ひげ：あごの色（ひげの人だけ）
    beard = np.zeros((H, W), bool)
    if who in BEARD:
        by = int(y0 + 0.93 * fh)
        bc = np.median(c[by - 3:by + 4, int(cx) - 5:int(cx) + 6].reshape(-1, 3), 0)
        if (ext or {}).get("beardcolor"): bc = np.array(ext["beardcolor"], np.float32)
        if np.abs(bc - sk).max() > 30:
            beard = (np.abs(c - bc).max(-1) < (ext or {}).get("beardtol", 42)) & al & (yy > y0 + 0.5 * fh)
            beard = ndimage.binary_opening(beard, iterations=1)
    # 目と眉の芯（描き直す）＝見つけた目の楕円の中の肌でない所。前髪は除く
    eyecore = eyes & nonskin & ~bangs
    keep = (nonskin & ~eyecore & ~mouth) | bangs | beard  # 口の楕円の中（歯・唇・口の線）は描き直す。ひげ・前髪・下の人ごとの物は守る
    for col in (ext or {}).get("keepcolors", []):     # 人ごとに守る色（隈取り・傷・そばかすなど）
        keep |= (np.abs(c - np.array(col, np.float32)).max(-1) < (ext or {}).get("keeptol", 30)) & (yy > y0) & (yy < y1) & (np.abs(xx - cx) < 0.6 * fw)
    try:
        import rim as RIM
        if who in RIM.LENS: keep |= ndimage.binary_dilation(RIM.rim(a, box, who), iterations=1)
    except Exception: pass
    for e in (ext or {}).get("keep", []):
        ex, ey, rx, ry = x0 + e[0] * fw, y0 + e[1] * fh, e[2] * fw, e[3] * fh
        keep |= ((xx - ex) / rx) ** 2 + ((yy - ey) / ry) ** 2 <= 1
    keep = ndimage.binary_dilation(keep, iterations=1) & al
    draw = (eyes | mouth) & al & ~keep
    draw &= ndimage.binary_erosion(al, iterations=2)
    return draw, keep, eyes, mouth, {"skin": sk.tolist(), "hair": hair.tolist(), "eyes": [[round(float(v), 1) for v in f] for f in found]}


def _iris_fix(base, out, eyes, sk):
    """描いた目の色を基本の瞳の色に合わせる（彩度のある、肌でも白目でもない所の色相と彩度を基本の中央値に）"""
    import colorsys
    import colorsys as _cs
    skh = _cs.rgb_to_hsv(*(np.array(sk) / 255))[0]
    def sel(c):
        mx, mn = c.max(-1), c.min(-1); s = (mx - mn) / np.maximum(mx, 1)
        r, g, b_ = c[..., 0], c[..., 1], c[..., 2]
        h = np.where(mx == r, ((g - b_) / np.maximum(mx - mn, 1)) % 6, np.where(mx == g, (b_ - r) / np.maximum(mx - mn, 1) + 2, (r - g) / np.maximum(mx - mn, 1) + 4)) / 6
        dh = np.minimum(np.abs(h - skh), 1 - np.abs(h - skh))
        return eyes & (s > 0.28) & (np.abs(c - sk).max(-1) > 45) & (mx > 40) & (dh > 0.035)  # 肌・頬の赤みの色相は瞳に数えない
    b = base[..., :3].astype(np.float32); o = out[..., :3].astype(np.float32)
    mb = sel(b)
    if mb.sum() < 15: return out, None
    hsv = lambda c: np.array([colorsys.rgb_to_hsv(*(p / 255)) for p in c])
    hb = hsv(b[mb][:: max(1, mb.sum() // 400)])
    cs, sn = np.cos(hb[:, 0] * 2 * np.pi).mean(), np.sin(hb[:, 0] * 2 * np.pi).mean()
    if np.hypot(cs, sn) < 0.75: return out, None   # 基本の瞳の色相がまとまらない（灰色の目など）なら合わせない
    ang = float(np.arctan2(sn, cs) / (2 * np.pi) % 1)
    sb = float(np.median(hb[:, 1]))
    mo = sel(o)
    if not mo.any(): return out, (float(ang), float(sb))
    pts = o[mo]; res = []
    for p in pts:
        h, s, v = colorsys.rgb_to_hsv(*(p / 255)); r, g, bb = colorsys.hsv_to_rgb(ang, (s + sb) / 2, v); res.append((r * 255, g * 255, bb * 255))
    out = out.copy(); out[mo, :3] = np.clip(np.array(res), 0, 255).round().astype(np.uint8)
    return out, (float(ang), sb)


def iris_fix(base, out, eyes, sk):
    """左右の目を別々に合わせる（左右で色の違う人のため）"""
    from scipy import ndimage as _nd
    lab, n = _nd.label(_nd.binary_dilation(eyes, iterations=2))
    if n < 2: return _iris_fix(base, out, eyes, sk)
    infos = []
    for j in range(1, n + 1):
        m = (lab == j) & eyes
        if m.sum() < 30: continue
        out, inf = _iris_fix(base, out, m, sk); infos.append(inf)
    return out, infos
