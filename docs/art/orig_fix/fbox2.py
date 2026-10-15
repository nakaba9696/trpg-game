# 顔の窓の四角を全員見直す：基本の絵で目（と口）を検出し、目が四角の縦 48% の所に来るように上端を決める（幅・高さはそのまま）
import re, os, sys, json, numpy as np
sys.path.insert(0, '.')
import face_gate as FG
from PIL import Image, ImageDraw, ImageFont
FB = 'H:/game/origfix-wt/src/data/u41_face_box.js'
s = open(FB, encoding='utf-8').read()
T = {m[0]: [float(v) for v in m[1].split(',')] for m in re.findall(r'(\w+): \[([\d., ]+)\]', s)}
f = ImageFont.truetype("C:/Windows/Fonts/meiryo.ttc", 12)
new, log = {}, {}
def base_of(i):
    for p in [f'basefix/{i}.webp', f'H:/game/origfix-wt/assets/portraits/{i}.webp']:
        if os.path.exists(p): return p
for i, (x, y, w, h) in T.items():
    p = base_of(i)
    if not p: continue
    im = Image.open(p).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg.convert('RGB')
    es = FG.eyes_of(im.resize((1024, 1280)))
    es = [e for e in es if x <= (e['box'][0] + e['box'][2]) / 2 / 1024 <= x + w]
    if not es: log[i] = 'no eyes'; new[i] = [x, y, w, h]; continue
    ey = float(np.mean([(e['box'][1] + e['box'][3]) / 2 / 1280 for e in es]))
    rel = (ey - y) / h
    ny = round(min(max(0.0, ey - 0.48 * h), 1 - h), 4)
    new[i] = [x, ny if abs(rel - 0.48) > 0.06 else y, w, h]; log[i] = round(rel, 2)
for i, v in new.items():
    s = re.sub(rf'(    {i}: \[)[\d., ]+(\],)', lambda m: f'{m.group(1)}{v[0]}, {v[1]}, {v[2]}, {v[3]}{m.group(2)}', s)
open(FB, 'w', encoding='utf-8', newline='\n').write(s)
json.dump(log, open('fbox_log.json', 'w'), indent=0)
ids = sorted(new); S = 110; cols = 12
sh = Image.new('RGB', (cols * S, ((len(ids) + cols - 1) // cols) * (S + 14)), (30, 30, 30)); d = ImageDraw.Draw(sh)
for k, i in enumerate(ids):
    im = Image.open(base_of(i)).convert('RGBA'); bg = Image.new('RGBA', im.size, (90, 90, 96, 255)); bg.alpha_composite(im); W, H = im.size
    x, y, w, h = new[i]; c = bg.convert('RGB').crop((int(x * W), int(y * H), int((x + w) * W), int((y + h) * H))).resize((S, S))
    x0, y0 = (k % cols) * S, (k // cols) * (S + 14); sh.paste(c, (x0, y0 + 14)); d.text((x0 + 2, y0), i, fill='white', font=f)
sh.save('../face_box_check.png'); sh.save('../face_box_check.webp', quality=85)
moved = {i: (T[i][1], new[i][1]) for i in new if abs(T[i][1] - new[i][1]) > 1e-4}
print(len(new), 'moved', len(moved)); print({k: log[k] for k in moved}); print('no eyes', [k for k, v in log.items() if v == 'no eyes'])
