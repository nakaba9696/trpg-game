"""透過の点検（A13）：背景消しのあとに残った「背景の色の島」を探す。

ゲームと同じ背景消し（src/ui/a13_cutout.js。tools/cutout_run.mjs が動かす）に通したあと、
不透明のまま残った画素のうち、元の背景の色（絵の四隅の色）にごく近いものの塊を数える。
外の背景とつながった所はもう消えているので、残った塊は「線画に囲まれた背景」（腕と胴・武器と体・髪の房のあいだ・髪と首など）か、
背景と同じ色の白い服・白い髪・白目・光の反射のどちらか。どちらかは目で決める（白い服や髪を消してはいけない）。

使い方（リポジトリの根で）：
  python tools/cutout_islands.py --out tmp/islands            # 人物と魔物の全部。islands.json と、塊に番号を振った拡大図
  python tools/cutout_islands.py --only kind_priest_m --min 40
  python tools/cutout_islands.py --verdicts docs/art/cutout_audit/verdicts.json   # 目で決めた答え（remove / keep）と照らし、まだ残る remove を数える

出力：<out>/islands.json（{ "portraits/<id>": [{ "n": 1, "x":…, "y":…, "w":…, "h":…, "area":…, "seed": [x, y] }] }）と <out>/crops/<dir>_<id>.png。
要るもの：Python 3 と Pillow・numpy、Node.js。
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

try:
    from PIL import ImageFont
    FONT = ImageFont.load_default(size=18)
except Exception:
    FONT = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def corner_bg(im):
    px = im.load()
    w, h = im.size
    cs = [px[2, 2], px[w - 3, 2], px[2, h // 2], px[w - 3, h // 2]]
    cs = [c for c in cs if min(c[:3]) > 200]
    if not cs:
        return None
    return tuple(sum(c[i] for c in cs) / len(cs) for i in range(3))


def islands(orig, cut, tol, minarea):
    bg = corner_bg(orig)
    if not bg:
        return []
    w, h = orig.size
    o = np.asarray(orig, dtype=np.int16)[:, :, :3]
    c = np.asarray(cut)
    d = np.abs(o - np.array(bg, dtype=np.int16)).max(axis=2)
    cand = bytearray(((c[:, :, 3] >= 200) & (d < tol)).astype(np.uint8).tobytes())
    seen = bytearray(w * h)
    out = []
    for i in range(w * h):
        if not cand[i] or seen[i]:
            continue
        q = deque([i])
        seen[i] = 1
        pts = []
        while q:
            j = q.popleft()
            pts.append(j)
            x, y = j % w, j // w
            for k in ((j - 1) if x > 0 else -1, (j + 1) if x < w - 1 else -1, j - w, j + w):
                if 0 <= k < w * h and cand[k] and not seen[k]:
                    seen[k] = 1
                    q.append(k)
        if len(pts) < minarea:
            continue
        xs = [p % w for p in pts]
        ys = [p // w for p in pts]
        cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        seed = min(pts, key=lambda p: (p % w - cx) ** 2 + (p // w - cy) ** 2)
        out.append({"x": min(xs), "y": min(ys), "w": max(xs) - min(xs) + 1, "h": max(ys) - min(ys) + 1, "area": len(pts), "seed": [seed % w, seed // w]})
    out.sort(key=lambda r: -r["area"])
    for n, r in enumerate(out, 1):
        r["n"] = n
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dirs", default="portraits,monsters")
    ap.add_argument("--only", default="")
    ap.add_argument("--tol", type=int, default=10)
    ap.add_argument("--min", type=int, default=80)
    ap.add_argument("--out", default=os.path.join(ROOT, "cutout_sheets", "islands"))
    ap.add_argument("--a13", default=os.path.join(ROOT, "src", "ui", "a13_cutout.js"))
    ap.add_argument("--verdicts", default="")
    ap.add_argument("--no-crops", action="store_true")
    ap.add_argument("--base-only", action="store_true")
    a = ap.parse_args()
    only = set(x for x in a.only.split(",") if x)
    os.makedirs(os.path.join(a.out, "crops"), exist_ok=True)
    result = {}
    for d in [x for x in a.dirs.split(",") if x]:
        src = os.path.join(ROOT, "assets", d)
        names = sorted(f[:-5] for f in os.listdir(src) if f.endswith(".webp"))
        if only:
            names = [n for n in names if n in only]
        if a.base_only and d == "portraits":
            sys.path.insert(0, os.path.join(ROOT, "tools"))
            from cutout_sheets import moods, is_variant
            keys = moods()
            names = [n for n in names if not is_variant(n, keys)]
        if not names:
            continue
        tmp = tempfile.mkdtemp(prefix="islands-")
        try:
            origs = {}
            for n in names:
                im = Image.open(os.path.join(src, n + ".webp")).convert("RGBA")
                origs[n] = im
                with open(os.path.join(tmp, f"{n}.{im.size[0]}x{im.size[1]}.raw"), "wb") as fh:
                    fh.write(im.tobytes())
            r = subprocess.run(["node", os.path.join(ROOT, "tools", "cutout_run.mjs"), a.a13, tmp, "1" if d == "monsters" else "0"], capture_output=True, text=True)
            if r.returncode:
                sys.exit(r.stderr)
            for n in names:
                im = origs[n]
                w, h = im.size
                with open(os.path.join(tmp, f"{n}.{w}x{h}.raw"), "rb") as fh:
                    cut = Image.frombytes("RGBA", (w, h), fh.read())
                isl = islands(im, cut, a.tol, a.min)
                if not isl:
                    continue
                result[f"{d}/{n}"] = isl
                if a.no_crops:
                    continue
                back = Image.new("RGBA", (w, h), (190, 30, 150, 255))
                back.alpha_composite(cut)
                back = back.convert("RGB")
                dr = ImageDraw.Draw(back)
                for r_ in isl:
                    dr.rectangle((r_["x"] - 2, r_["y"] - 2, r_["x"] + r_["w"] + 1, r_["y"] + r_["h"] + 1), outline=(0, 255, 255), width=2)
                    tx, ty = r_["x"], max(0, r_["y"] - 22)
                    dr.rectangle((tx, ty, tx + 12 * len(str(r_["n"])) + 6, ty + 20), fill=(0, 0, 0))
                    dr.text((tx + 3, ty), str(r_["n"]), fill=(0, 255, 255), font=FONT)
                back.save(os.path.join(a.out, "crops", f"{d}_{n}.png"))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    with open(os.path.join(a.out, "islands.json"), "w", encoding="utf8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=1)
    print(f"images with islands: {len(result)}  islands: {sum(len(v) for v in result.values())}")
    if a.verdicts:
        with open(a.verdicts, encoding="utf8") as fh:
            ver = json.load(fh)
        left = []
        for key, items in ver.items():
            for it in items:
                if it.get("verdict") != "remove":
                    continue
                sx, sy = it["seed"]
                still = any(r_["x"] <= sx < r_["x"] + r_["w"] and r_["y"] <= sy < r_["y"] + r_["h"] for r_ in result.get(key, []))
                if still:
                    left.append(f"{key} #{it.get('n')} {it.get('why', '')}")
        print(f"remove のうちまだ残る：{len(left)}")
        for s in left:
            print("  " + s)


if __name__ == "__main__":
    main()
