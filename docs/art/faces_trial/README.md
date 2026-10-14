# 顔だけを大きく作るやり方の試し（2026-10-14・face-trial-1）

持ち主「キャラタグ＋表情で作れる気がする」。顔の窓専用の絵（assets/portraits/faces/<id>_<表情>.webp・512×512）。全身の絵には戻さない。置き場所は画面側と合わせる。

作り方（tools は手元のスクリプト face.py。値は docs/art/gen/<id>_face.json）：
1. 顔の窓の四角（src/data/u41_face_box.js）を基本の絵から切り出し、1024 に拡大。
2. img2img（denoise 0.7・steps 28・cfg 5.5・Euler a）。プロンプト＝style.json の prefix＋顔の大写し＋ identity・tags＋表情のタグ（variants）。
3. ControlNet：
   - canny（controlnet-canny-sdxl-1.0-xinsir-v2・重み 0.6・終わり 0.7）。基本の顔の線（Canny 80/180）から目・眉・口の所を消した線画を渡し、輪郭・髪・小物は線で押さえ、表情の所だけ自由に描かせる。
   - reference_adain+attn（重み 0.7・終わり 0.8）：基本の顔で同じ人に見せる。IP-Adapter のモデルは入っていない。
4. 目・眉・口の四角の外と、その中の守る所（前髪の色・絆創膏・汚れ・鼻・ひげの色）は、描いたあとに基本の画素を戻す（境目は 10 画素ぼかし）。

compare.webp：上が otmar（基本・喜・怒・哀・楽・冷たい目）、下が nora（基本・喜・怒・哀・楽・目を輝かせる）。
