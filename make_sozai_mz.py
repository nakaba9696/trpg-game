"""素材集（RPGツクールMZ 用）を作る。
使い方: python make_sozai_mz.py <trpg-game のリポジトリ> <出力フォルダ>
例: python make_sozai_mz.py C:/path/to/trpg-game %USERPROFILE%/Desktop/sozai_mz
必要: Python 3・Pillow・numpy・node
"""
import json, os, re, sys, csv, html, subprocess, tempfile
import numpy as np
from PIL import Image
REPO, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(os.path.expanduser(os.path.expandvars(sys.argv[2])))
HERE = os.path.dirname(os.path.abspath(__file__))
MO = "joy|anger|sorrow|fun|serious|faint_smile|surprise|smug|cold|panic|shy|troubled|sparkle|wicked|sleepy|pout|cry|silly|exasperated|drunk|fear|tired|smitten|calm|fierce"
P = {p["id"]: p for p in json.load(open(f"{REPO}/docs/art/portraits.json", encoding="utf-8"))["portraits"]}
Mj = json.load(open(f"{REPO}/docs/art/monsters.json", encoding="utf-8")); Mm = {}
if isinstance(Mj, dict):
    for k, v in Mj.items():
        if isinstance(v, dict) and not k.startswith("_"): Mm[k] = v
        if isinstance(v, list):
            for x in v:
                if isinstance(x, dict) and x.get("id"): Mm[x["id"]] = x
rows = []
for d in ["portraits", "monsters"]:
    fs = sorted(f for f in os.listdir(f"{REPO}/assets/{d}") if f.endswith(".webp")); ids = [f[:-5] for f in fs]
    for n in ids:
        if any(re.fullmatch(re.escape(b) + r"_(%s)" % MO, n) for b in ids if b != n): continue
        moods = [x[len(n) + 1:] for x in ids if re.fullmatch(re.escape(n) + r"_(%s)" % MO, x)]
        meta = P.get(n) or Mm.get(n) or {}
        kind = "魔物" if d == "monsters" else ("名前の無い人（町の人など）" if n.startswith("kind_") else "名のある人物")
        rows.append({"id": n, "dir": d, "種類": kind, "名前": meta.get("name", ""), "表情違い": "・".join(moods),
                     "特徴タグ": ", ".join(x for x in [meta.get("identity", ""), meta.get("tags", "")] if x), "メモ": meta.get("memo", "")})
for sub in ["pictures", "faces", "enemies", "sv_enemies"]: os.makedirs(f"{OUT}/img/{sub}", exist_ok=True)
tmp = tempfile.mkdtemp(); imgs = {}; jobs = []
for r in rows:
    for f in [r["id"]] + [r["id"] + "_" + m for m in (r["表情違い"].split("・") if r["表情違い"] else [])]:
        im = Image.open(f"{REPO}/assets/{r['dir']}/{f}.webp").convert("RGBA")
        if (np.array(im)[..., 3] < 16).mean() <= 0.02:
            k = os.path.join(tmp, r["dir"] + "__" + f); open(k + ".in", "wb").write(im.tobytes())
            jobs.append([k + ".in", k + ".out", im.width, im.height, r["dir"] == "monsters"])
        imgs[(r["dir"], f)] = im
if jobs:
    json.dump(jobs, open(os.path.join(tmp, "jobs.json"), "w"))
    subprocess.run(["node", os.path.join(HERE, "key.mjs"), REPO, os.path.join(tmp, "jobs.json")], check=True)
    for i, o, w, h, b in jobs:
        d, f = os.path.basename(i)[:-3].split("__", 1)
        imgs[(d, f)] = Image.fromarray(np.frombuffer(open(o, "rb").read(), np.uint8).reshape(h, w, 4).copy())
def face(im):
    a = np.array(im)[..., 3] > 128; ys, xs = np.nonzero(a); top = ys.min()
    band = a[top: top + int(im.height * 0.28)]; cx = int(np.nonzero(band.any(0))[0].mean())
    s = int(im.width * 0.42); x0 = max(0, min(im.width - s, cx - s // 2)); y0 = max(0, top + int(s * 0.05))
    return im.crop((x0, y0, x0 + s, y0 + s)).resize((144, 144), Image.LANCZOS)
for r in rows:
    n, d = r["id"], r["dir"]; ms = r["表情違い"].split("・") if r["表情違い"] else []
    if d == "monsters":
        imgs[(d, n)].save(f"{OUT}/img/enemies/{n}.png"); imgs[(d, n)].save(f"{OUT}/img/sv_enemies/{n}.png")
    else:
        names = [n] + [n + "_" + m for m in ms]
        for f in names: imgs[(d, f)].save(f"{OUT}/img/pictures/{f}.png")
        sheet = Image.new("RGBA", (576, 288), (0, 0, 0, 0))
        for i, f in enumerate(names[:8]): sheet.alpha_composite(face(imgs[(d, f)]), ((i % 4) * 144, (i // 4) * 144))
        sheet.save(f"{OUT}/img/faces/{n}.png"); r["顔グラの並び"] = "・".join((["基本"] + ms)[:8])
keys = ["id", "種類", "名前", "表情違い", "顔グラの並び", "特徴タグ", "メモ"]
with open(f"{OUT}/index.csv", "w", newline="", encoding="utf-8-sig") as fp:
    w = csv.DictWriter(fp, fieldnames=keys, extrasaction="ignore"); w.writeheader(); w.writerows(rows)
json.dump(rows, open(f"{OUT}/index.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
tr = "".join(f'<tr><td><img src="img/{"enemies" if r["dir"]=="monsters" else "faces"}/{r["id"]}.png" loading="lazy" style="height:96px"></td><td>{html.escape(r["id"])}<br><b>{html.escape(r["名前"])}</b></td><td>{r["種類"]}</td><td>{html.escape(r["表情違い"])}</td><td style="font-size:12px">{html.escape(r["特徴タグ"])}<br>{html.escape(r["メモ"])}</td></tr>' for r in rows)
open(f"{OUT}/catalog.html", "w", encoding="utf-8").write('<!doctype html><meta charset="utf-8"><title>素材集</title><style>body{font-family:sans-serif;background:#2b2b33;color:#eee}td{border-bottom:1px solid #555;padding:6px;vertical-align:top}img{background:#55556a}</style><h1>素材集（%d 体）</h1><table>%s</table>' % (len(rows), tr))
import shutil; shutil.copy(os.path.join(HERE, "SOZAI_README.md"), f"{OUT}/README.md")
print("できた:", OUT, len(rows), "体")
