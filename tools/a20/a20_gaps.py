# A20：囲まれて残った背景（髪のすき間・腕と胴のあいだ・武器と体のあいだ）も透明にした、透明つきの webp を作る。
# ゲームの白抜き（src/ui/a13_cutout.js の G.a13.keyOut）を node で先にかけ、その結果に残った「背景の色ちょうどで平らな、線画に囲まれた塊」を消す。
# 目の光・歯・白目・白い服・白い髪・白い毛皮は残す（線画に囲まれていない・陰がある・中に物を閉じこめている・外から遠い塊は消さない。迷う塊は残す）。
# 自動で見分けられない所は overrides.json に書く（"keep"＝その人はぜんぶ残す、[[x0,y0,x1,y1], …]＝その四角に掛かる塊は残す。差分にも効く）。
# 境目の 2px は半透明にして白を抜く（ソフトマット）。透明を持つ絵は keyOut がそのまま使う（transparent()）ので、外周の背景も透明にした完成品にする。
# すでに透明な絵・描き直し待ち（redraw）の絵・別のセッションが直している絵（SKIP）は飛ばす。魔物は足もとが下の縁に付くので keyOut に bottom。
# 比べる背景の色は、外の背景の色をぼかして広げた「その場所の背景の色」（縁や上下で濃淡のある背景でも、囲まれた所を近くの背景と比べる）。
# 囲まれた背景を消した絵だけを書く（見つからない絵は元のまま）。持ち主が点検で崩れを見つけた人は overrides.json で "keep"（作り直し候補）。
# 使い方：python3 tools/a20/a20_gaps.py [出力先（既定は assets/。上書き）] [名前の正規表現]。要るもの：Python 3・numpy・scipy・Pillow（webp つき）・node
# 結果の一覧は <出力先>/a20_result.json（assets/ に書くときは assets/a20_result.json。消してよい。確かめの一覧画像は docs/review/a20/）。レーン A（絵）
import sys, os, io, re, json, struct, subprocess, numpy as np
from multiprocessing import Pool
from scipy import ndimage as ndi
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
# 元の絵（白い背景）の置き場。既定は assets/。置き換えたあとでやり直すときは、元の絵を取り出した所を A20_SRC に（例：git archive <元の版> assets | tar -x -C /tmp/a20src → A20_SRC=/tmp/a20src/assets）
SRC = os.environ.get("A20_SRC") or os.path.join(REPO, "assets")

# ---- ゲームの白抜き（node）
class Keyer:
    def __init__(s):
        s.p = subprocess.Popen(["node", os.path.join(HERE, "keyworker.mjs"), REPO], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    def key(s, rgba, bottom):
        H, W = rgba.shape[:2]
        s.p.stdin.write(struct.pack("<IIB", W, H, 1 if bottom else 0) + rgba.astype(np.uint8).tobytes()); s.p.stdin.flush()
        r = struct.unpack("<d", s.p.stdout.read(8))[0]
        out = np.frombuffer(s.p.stdout.read(W*H*4), np.uint8).reshape(H, W, 4).copy()
        return r, out

# ---- 囲まれた背景の見分け方

TOL = 12      # 背景の色との差（塊に入れる）
EXACT = 3     # 背景の色ちょうど
NEAR = 40     # 外の透明な所からの距離

def bgcolor(im, keyed):
    gone = keyed[..., 3] < 8
    o = im[..., :3].astype(int)
    m = gone & (o.min(-1) > 200)
    if m.sum() < 100: return None
    return np.median(o[m], axis=0)

def decide(s, n, mon=False):
    # s: stats dict. 返り値 True＝消す
    if s["area"] < 6: return False
    big_flat = s["area"] >= 2000 and s["med"] <= 3 and s["sd"] <= 2.0 and s["dloc"] <= 1.0  # 大きく、近くの背景とまったく同じ色の塊（マントの下など）
    if s["ink"] < (0.4 if big_flat else 0.5): return False  # 縁が線画に囲まれていない（茸の斑点・歯・模様）
    if s["isl"] >= 0.03: return False  # 中に閉じこめた物がある（仮面の目・頭蓋の穴・羊毛の巻き毛）
    if s["tint"] >= 3: return False  # 色みがある（色白の肌・色のついた白）
    # 近く（40px）の外の背景の色とずれている塊は残す。近くに外の背景が無い（奥まった）塊は、背景の色ちょうどの所が多いときだけ
    if s["dloc"] < 99 and s["dloc"] > 4: return False
    if s["dloc"] >= 99 and s["area"] >= 100 and not (s["exact"] >= 0.5 and s["med"] <= 4): return False
    if s["area"] >= 40 and (s["th"] < 1.6 or s["wmax"] <= 2.9): return False  # 細く長い白（服の縁取り・光の筋）
    # 中身：背景に近く平ら（囲まれた所の背景は、外の背景より少しだけ色がずれていることが多い）
    if s["area"] <= n * 0.004:
        if not (s["med"] <= 6 and s["sd"] <= 4.5 and s["e6"] >= 0.5): return False
    elif not (s["med"] <= 6 and s["e6"] >= 0.5 and s["sd"] <= 3.0): return False
    strong = s["ink"] >= 0.95 and s["rimDark"] >= 0.8  # 濃い線にぐるりと囲まれている（腕と胴・脚のあいだ・武器と体）
    deep = s["area"] >= 400 and s["ink"] >= 0.8 and s["rimDark"] >= 0.5
    if mon:  # 魔物：白い面・斑点・刃・仮面が多いので、大きめの隙間だけ。股や腕の間の大きな塊は外から離れていてもよい
        if s["area"] < 150: return False
        return s["dmin"] <= NEAR or (deep and s["dmin"] <= 150) or (strong and s["dmin"] <= 90)
    if s["dmin"] > (90 if (deep or strong) else NEAR): return False
    if s["dmin"] <= 6 or deep or strong: return True   # 外の透明な所と線一本でへだてられている
    if s["area"] >= 500: return True
    return s["dmin"] <= 20 and s["rimDark"] < 0.5

def process(im, keyed, dbg=None, mon=False, keep=None):
    H, W = im.shape[:2]
    B = bgcolor(im, keyed)
    out = keyed.copy()
    if B is None: return out, []
    o = im[..., :3].astype(float)
    A = keyed[..., 3]
    outside = A < 16
    # その場所の背景の色（外の背景の色をぼかして広げた地図。上下や縁で濃淡のある背景でも、囲まれた所はその近くの背景の色と比べる）
    ref = outside & (np.abs(o - B).max(-1) <= 40)
    wgt = ndi.gaussian_filter(ref.astype(float), 24)
    Bm = np.stack([ndi.gaussian_filter(o[..., c] * ref, 24) for c in range(3)], -1)
    ok = wgt > 0.02
    Bm = np.where(ok[..., None], Bm / np.maximum(wgt, 1e-6)[..., None], B)
    dist = np.abs(o - Bm).max(-1)
    cand = (dist <= TOL) & ~outside
    lab, n = ndi.label(cand)
    if n == 0: return out, []
    dout = ndi.distance_transform_edt(~outside)
    lum = o.sum(-1) / 3
    sl = ndi.find_objects(lab)
    kill = np.zeros(n + 1, bool)
    stats = []
    for k in range(n):
        s = sl[k]
        y0, y1 = max(0, s[0].start - 6), min(H, s[0].stop + 6)
        x0, x1 = max(0, s[1].start - 6), min(W, s[1].stop + 6)
        m = lab[y0:y1, x0:x1] == k + 1
        area = int(m.sum())
        if area < 6: continue
        d = dist[y0:y1, x0:x1][m]
        st = dict(k=k + 1, area=area, dmin=float(dout[y0:y1, x0:x1][m].min()), med=float(np.median(d)),
                  exact=float((d <= EXACT).mean()), e6=float((d <= 6).mean()), sd=float(lum[y0:y1, x0:x1][m].std()),
                  cx=(s[1].start + s[1].stop) // 2, cy=(s[0].start + s[0].stop) // 2)
        # まわり：塊の縁から外へ 4px 以内に濃い線（明るさ 110 未満）がある割合／縁のすぐ外の色が明るく色の薄い（白っぽい）割合
        mm = ndi.binary_dilation(m, iterations=4)
        r1 = ndi.binary_dilation(m) & ~m
        L = lum[y0:y1, x0:x1]
        dark = (oc_max := o[y0:y1, x0:x1].max(-1)) < 130
        near_dark = ndi.binary_dilation(dark, iterations=4)
        st["ink"] = float(near_dark[r1].mean()) if r1.any() else 0.0
        oc = o[y0:y1, x0:x1]
        sat = oc.max(-1) - oc.min(-1)
        r3 = ndi.binary_dilation(m, iterations=3) & ~ndi.binary_dilation(m, iterations=1)
        st["rimL"] = float(np.median(L[r3])) if r3.any() else 0.0
        st["rimDark"] = float(dark[r3].mean()) if r3.any() else 0.0
        # その近く（40px）の外の背景の色との差（色ごとの平均の差の最大）。生成の背景はゆるい濃淡があり、白い服・白髪はたいてい少しずれる
        Y0, Y1, X0, X1 = max(0, s[0].start - 40), min(H, s[0].stop + 40), max(0, s[1].start - 40), min(W, s[1].stop + 40)
        ob = outside[Y0:Y1, X0:X1] & (dist[Y0:Y1, X0:X1] <= TOL)
        if ob.sum() >= 30:
            lb = o[Y0:Y1, X0:X1][ob].mean(0)
            st["dloc"] = float(np.abs(o[y0:y1, x0:x1][m].mean(0) - lb).max())
        else: st["dloc"] = 99.0
        mc = (o[y0:y1, x0:x1][m] - Bm[y0:y1, x0:x1][m]).mean(0)
        st["tint"] = float(mc.max() - mc.min())  # 色み（背景の色からの、色ごとのずれの差。肌・色のついた白はずれる）
        st["isl"] = float((ndi.binary_fill_holes(m).sum() - area) / area)
        per = int((m & ~ndi.binary_erosion(m)).sum())
        st["th"] = float(area / max(1, per))  # 太さの目安
        st["wmax"] = float(ndi.distance_transform_edt(m).max())  # いちばん太い所の半分
        st["compact"] = float(4 * np.pi * area / max(1, per) ** 2)
        st["kill"] = decide(st, H * W, mon)
        if keep == "keep": st["kill"] = False
        elif keep:
            for (rx0, ry0, rx1, ry1) in keep:
                sub = lab[max(0, ry0):ry1, max(0, rx0):rx1]
                if (sub == k + 1).any(): st["kill"] = False
        kill[k + 1] = st["kill"]
        stats.append(st)
    gone = kill[lab]
    # 境目（消す所のまわり 2px）：ソフトマット
    band = ndi.binary_dilation(gone, iterations=2) & ~gone & ~outside & (dist > TOL)
    # 内側の色：消す所でも背景の色でもない、近くの最も濃い色（3px 以内）
    far = np.where(gone | outside | (dist <= TOL), -1.0, dist)
    # 近くで背景からいちばん遠い画素の位置
    best = far.copy(); by = np.indices((H, W))[0]; bx = np.indices((H, W))[1]
    py, px = by.copy(), bx.copy()
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            if dy * dy + dx * dx > 10: continue
            sh = np.full((H, W), -1.0)
            ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
            xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
            sh[yd, xd] = far[ys, xs]
            better = sh > best
            best = np.where(better, sh, best)
            py = np.where(better, by + dy, py); px = np.where(better, bx + dx, px)
    res = out.astype(float)
    ys, xs = np.nonzero(band)
    for y, x in zip(ys, xs):
        if best[y, x] < 30: continue
        F = o[py[y, x], px[y, x]]; c = o[y, x]
        Bp = Bm[y, x]; fb = F - Bp; L = (fb * fb).sum()
        a = float(np.clip(((c - Bp) * fb).sum() / L, 0, 1))
        if a >= 0.98: continue
        a0 = res[y, x, 3] / 255
        if a <= 0.02: res[y, x, 3] = 0; continue
        res[y, x, :3] = np.clip((res[y, x, :3] - (1 - a) * Bp) / a, 0, 255)
        res[y, x, 3] = a0 * a * 255
    res[gone] = 0
    out = np.round(res).astype(np.uint8)
    if dbg is not None:
        dbg["lab"] = lab; dbg["kill"] = kill; dbg["outside"] = outside
    return out, stats

# ---- 全部の絵
SKIP = set("lumia e4_mudhound e3_azlag anselmo bertrand gensai gerhard otmar malvina salphiel rui severin liesel aurelia timo wolfram bandit e3_yuzuel e4_seafog w4_gatekeeper".split())
MOODS = json.load(open(f"{REPO}/docs/art/moods.json"))["moods"].keys()
MOODS = sorted(set(list(MOODS) + ["joy", "anger", "sorrow", "fun"]), key=len, reverse=True)
redraw = set(os.popen(f"cd {REPO} && node -e 'import(\"./tools/assets.mjs\").then(m=>console.log([...m.redrawKeys()].join(\" \")))'").read().split())
def base(d, n):
    if d == "portraits":
        for m in MOODS:
            if n.endswith("_" + m) and len(n) > len(m) + 1: return n[: -len(m) - 1]
    return n
def targets():
    for d in ("portraits", "monsters"):
        for f in sorted(os.listdir(f"{SRC}/{d}")):
            if not f.endswith(".webp"): continue
            n = f[:-5]; b = base(d, n)
            if b in SKIP or n in SKIP or f"{d}/{b}" in redraw or f"{d}/{n}" in redraw: continue
            yield d, n
K = None
OVR = json.load(open(os.path.join(HERE, 'overrides.json')))
def enc(res, q, aq):
    b = io.BytesIO(); Image.fromarray(res, "RGBA").save(b, "WEBP", quality=q, alpha_quality=aq, method=6); return b.getvalue()
def work(t):
    global K
    d, n = t
    b = base(d, n)
    if K is None:
        K = Keyer()
    path = f"{SRC}/{d}/{n}.webp"
    src = Image.open(path); orig = os.path.getsize(path)
    im = np.array(src.convert("RGBA"))
    a = im[..., 3]
    if min(a[0, 0], a[0, -1], a[-1, 0], a[-1, -1]) < 16 or (a < 128).mean() >= 0.01: return dict(key=f"{d}/{n}", skip="transparent")
    r, keyed = K.key(im, d == "monsters")
    if r < 0.03: return dict(key=f"{d}/{n}", skip=f"not white bg ({r:.3f})")
    res, st = process(im, keyed, mon=(d == "monsters"), keep=OVR.get(f"{d}/{n}", OVR.get(f"{d}/{b}")))
    gaps = [s for s in st if s["kill"]]
    for q, aq in ((72, 75), (65, 70), (58, 65), (52, 60)):
        data = enc(res, q, aq)
        if len(data) <= orig * 1.15: break
    kill0 = (keyed[..., 3] >= 16) & (res[..., 3] < 16)
    if kill0.any() or os.environ.get("A20_ALL"):  # 囲まれた背景を消した絵だけを書く（ほかは元のまま。ゲームの白抜きで外周が消える）
        os.makedirs(f"{OUT}/{d}", exist_ok=True)
        open(f"{OUT}/{d}/{n}.webp", "wb").write(data)
    # 確かめ用：消した所（keyOut 後に消した囲まれた背景）
    kill = (keyed[..., 3] >= 16) & (res[..., 3] < 16)
    if os.environ.get("A20_KILL"): np.save(f"{OUT}/{d}/{n}.kill.npy", np.packbits(kill))
    dec = np.array(Image.open(io.BytesIO(data)).convert("RGBA"))
    A = dec[..., 3]
    return dict(key=f"{d}/{n}", bytes=len(data), orig=orig, q=q, gaps=len(gaps), gapPx=int(kill.sum()), keyed=round(r, 3),
                corners=[int(A[0, 0]), int(A[0, -1]), int(A[-1, 0]), int(A[-1, -1])])
if __name__ == "__main__":
    OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "assets")
    ts = list(targets())
    if len(sys.argv) > 2: ts = [t for t in ts if re.search(sys.argv[2], t[1])]
    print(len(ts), "targets", flush=True)
    out = []
    with Pool(4) as p:
        for i, r in enumerate(p.imap_unordered(work, ts, chunksize=4)):
            out.append(r)
            if i % 50 == 0: print(i, r, flush=True)
    out.sort(key=lambda r: r["key"])
    json.dump(out, open(f"{OUT}/a20_result.json", "w"), ensure_ascii=False, indent=0)
    print("done", sum(1 for r in out if "skip" not in r), "made", sum(1 for r in out if "skip" in r), "skipped")
