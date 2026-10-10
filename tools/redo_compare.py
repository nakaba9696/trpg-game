"""作り直した絵を、元の絵と並べた比較画像にする（docs/art/redo_review/<id>.webp。配り役の確認ページ・持ち主の点検用）。

1 枚：上の段が元の絵、下の段が作り直した絵。それぞれ 黒・白・場面の背景（宿の中）の上に重ね、右端に顔まわりの拡大（黒の上）。
使い方（cutout の venv の Python で。リポジトリの根で）：
  <venv>/python tools/redo_compare.py --old <元の絵のフォルダ> --new <作り直した絵のフォルダ> --out docs/art/redo_review id1 id2 …
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont

W, H = 256, 320
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def font():
    for f in ("C:/Windows/Fonts/meiryo.ttc", "C:/Windows/Fonts/YuGothM.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"):
        if os.path.exists(f):
            return ImageFont.truetype(f, 14)
    return ImageFont.load_default()


def row(im, scene, label):
    im = im.convert("RGBA").resize((W, H), Image.LANCZOS)
    out = Image.new("RGB", (W * 4, H + 20), (32, 32, 32))
    for k, back in enumerate([Image.new("RGBA", (W, H), (0, 0, 0, 255)), Image.new("RGBA", (W, H), (255, 255, 255, 255)), scene.copy()]):
        back.alpha_composite(im)
        out.paste(back.convert("RGB"), (W * k, 20))
    z = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    src = im.resize((W * 2, H * 2), Image.LANCZOS).crop((W // 2, 0, W // 2 + W, H))
    z.alpha_composite(src)
    out.paste(z.convert("RGB"), (W * 3, 20))
    ImageDraw.Draw(out).text((6, 1), label, fill=(255, 230, 120), font=font())
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--old", required=True)
    ap.add_argument("--new", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scene", default=os.path.join(ROOT, "assets", "scenes", "in_inn.webp"))
    ap.add_argument("--labels", default="元,作り直し", help="上の段と下の段の見出し（,で区切る）")
    ap.add_argument("--size", default="256,320", help="1 枚の大きさ（魔物は 320,320）")
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    global W, H
    W, H = (int(x) for x in a.size.split(","))
    top, bottom = a.labels.split(",")
    sc = Image.open(a.scene).convert("RGBA")
    s = min(sc.width / W, sc.height / H)
    scene = sc.crop((0, 0, int(W * s), int(H * s))).resize((W, H))
    os.makedirs(a.out, exist_ok=True)
    for i in a.ids:
        old = Image.open(os.path.join(a.old, i + ".webp"))
        new = Image.open(os.path.join(a.new, i + ".webp"))
        sheet = Image.new("RGB", (W * 4, (H + 20) * 2))
        sheet.paste(row(old, scene, f"{i}  {top}（黒・白・宿の背景・拡大）"), (0, 0))
        sheet.paste(row(new, scene, f"{i}  {bottom}"), (0, H + 20))
        sheet.save(os.path.join(a.out, i + ".webp"), "WEBP", quality=82)
    print(len(a.ids), "枚")


if __name__ == "__main__":
    main()
