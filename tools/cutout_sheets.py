"""透過の点検シート（A13 の点検）。

立ち絵・魔物の絵を、ゲームと同じ背景消し（src/ui/a13_cutout.js）に通し、濃い色・市松模様・明るい色の背景の上に並べた一覧シートを作る。
抜け残りの白や灰（腕と胴・武器と体・髪の房のあいだ・髪と首など）は濃い背景で、服や髪に開いた穴は明るい背景で目立つ。
全部のシートを目で見て、違和感のある絵を拾う（機械の候補出しだけで済ませない）。

使い方（このフォルダの一つ上＝リポジトリの根で）：
  python tools/cutout_sheets.py                       # 人物と魔物の全部を、濃い背景のシートに（out: cutout_sheets/）
  python tools/cutout_sheets.py --bg dark,checker,light --only kind_priest_m,bandit
  python tools/cutout_sheets.py --dirs portraits --per 36 --cell 200 --out tmp/sheets
  python tools/cutout_sheets.py --a13 path/to/a13_cutout.js   # 別の版の背景消しで見比べる
  python tools/cutout_sheets.py --base-only                   # 表情の差分（<id>_<表情>）を除く
  python tools/cutout_sheets.py --src tmp/cut --bg dark,navy,light   # 切り抜き済み（アルファつき）の絵をそのまま並べる
  python tools/cutout_sheets.py --src tmp/cut --list docs/art/cutout_audit/white.txt   # 一覧の絵だけ（白い服・白い髪など）

要るもの：Python 3 と Pillow、Node.js（背景消しは tools/cutout_run.mjs が src/ui/a13_cutout.js をそのまま動かす）。
出力（cutout_sheets/ など）は git に入れない。
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BGS = {
    "dark": lambda w, h: Image.new("RGBA", (w, h), (190, 30, 150, 255)),
    "navy": lambda w, h: Image.new("RGBA", (w, h), (20, 30, 70, 255)),
    "light": lambda w, h: Image.new("RGBA", (w, h), (235, 240, 225, 255)),
}


def checker(w, h, s=16):
    im = Image.new("RGBA", (w, h), (90, 90, 90, 255))
    d = ImageDraw.Draw(im)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2:
                d.rectangle((x, y, x + s - 1, y + s - 1), fill=(150, 150, 150, 255))
    return im


BGS["checker"] = checker


def moods():
    try:
        with open(os.path.join(ROOT, "docs", "art", "moods.json"), encoding="utf8") as f:
            m = json.load(f).get("moods") or {}
        return set(m.keys() if isinstance(m, dict) else (x.get("id") for x in m))
    except Exception:
        return set()


def is_variant(name, keys):
    return not name.startswith("kind_") and any(name.endswith("_" + k) for k in keys)


def game_cut(src, names, a13, d):
    """ゲームと同じ背景消し（a13_cutout.js）に通した絵を返す"""
    tmp = tempfile.mkdtemp(prefix="cutout-")
    try:
        sizes = {}
        for n in names:
            im = Image.open(os.path.join(src, n + ".webp")).convert("RGBA")
            sizes[n] = im.size
            with open(os.path.join(tmp, f"{n}.{im.size[0]}x{im.size[1]}.raw"), "wb") as fh:
                fh.write(im.tobytes())
        r = subprocess.run(["node", os.path.join(ROOT, "tools", "cutout_run.mjs"), a13, tmp, "1" if d == "monsters" else "0"], capture_output=True, text=True)
        if r.returncode:
            sys.exit(r.stderr)
        cut = {}
        for n in names:
            w, h = sizes[n]
            with open(os.path.join(tmp, f"{n}.{w}x{h}.raw"), "rb") as fh:
                cut[n] = Image.frombytes("RGBA", (w, h), fh.read())
        return cut
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dirs", default="portraits,monsters")
    ap.add_argument("--bg", default="dark")
    ap.add_argument("--only", default="")
    ap.add_argument("--base-only", action="store_true")
    ap.add_argument("--per", type=int, default=36)
    ap.add_argument("--cell", type=int, default=180)
    ap.add_argument("--out", default=os.path.join(ROOT, "cutout_sheets"))
    ap.add_argument("--a13", default=os.path.join(ROOT, "src", "ui", "a13_cutout.js"))
    ap.add_argument("--src", default="", help="切り抜き済み（アルファつき）の絵のフォルダ（<src>/<dir>/<id>.webp）。指定すると、ゲームの背景消しを通さずにそのまま並べる")
    ap.add_argument("--list", default="", help="並べる絵の一覧（1 行に <dir>/<id>）。白い服・長い髪などを別のシートにまとめるとき")
    a = ap.parse_args()
    only = set(x for x in a.only.split(",") if x)
    mood_keys = moods()
    os.makedirs(a.out, exist_ok=True)
    made = []
    for d in [x for x in a.dirs.split(",") if x]:
        src = os.path.join(a.src, d) if a.src else os.path.join(ROOT, "assets", d)
        if not os.path.isdir(src):
            continue
        names = sorted(f[:-5] for f in os.listdir(src) if f.endswith(".webp"))
        if a.list:
            with open(a.list, encoding="utf8") as fh:
                want = set(l.strip().split("/", 1)[1] for l in fh if l.strip().startswith(d + "/"))
            names = [n for n in names if n in want]
        if only:
            names = [n for n in names if n in only]
        if a.base_only and d == "portraits":
            names = [n for n in names if not is_variant(n, mood_keys)]
        if not names:
            continue
        cut = {n: Image.open(os.path.join(src, n + ".webp")).convert("RGBA") for n in names} if a.src else game_cut(src, names, a.a13, d)
        cols = 6 if a.per >= 30 else 4
        C = a.cell
        for bg in [x for x in a.bg.split(",") if x]:
            for b in range(0, len(names), a.per):
                part = names[b:b + a.per]
                rows = (len(part) + cols - 1) // cols
                ch = C * 640 // 512 if d == "portraits" else C
                sheet = Image.new("RGB", (cols * C, rows * (ch + 14)), (24, 24, 24))
                dr = ImageDraw.Draw(sheet)
                for k, n in enumerate(part):
                    im = cut[n]
                    back = BGS[bg](im.size[0], im.size[1])
                    back.alpha_composite(im)
                    x, y = (k % cols) * C, (k // cols) * (ch + 14)
                    sheet.paste(back.convert("RGB").resize((C, ch), Image.LANCZOS), (x, y + 14))
                    dr.text((x + 2, y + 1), n, fill=(255, 255, 0))
                tag = os.path.splitext(os.path.basename(a.list))[0] + "_" if a.list else ""
                out = os.path.join(a.out, f"{tag}{d}_{bg}_{b // a.per + 1:02d}.png")
                sheet.save(out)
                made.append(out)
    print("\n".join(made))


if __name__ == "__main__":
    main()
