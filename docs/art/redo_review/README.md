# 作り直しの確認（変な絵・消えた絵・持ち主に決めてほしい絵）

#412 の全数点検で持ち主が選んだ「変な絵」136 枚、「消えた絵」16 件、迷った 15 枚と、目視の点検で見つけた絵の作り直し。
**持ち主がよいと言うまで `assets/` には入れない。** 新しい絵は `new/` に置いてある（よいと言われた物だけ、あとで `assets/` に移す）。

- `questions.json`：1 件ずつ。`what` は (a) 切り抜きの失敗／(b) 絵そのものが変／(c) 両方 と、何をどう直したか。`status` は done（作り直した）・todo（まだ）・ask（持ち主に決めてほしい）。`answer` に答えを書く。
- `<id>.webp`：上の段が元の絵、下の段が作り直し。黒・白・宿の背景の上に重ね、右端は顔まわり（魔物は中央）の拡大。
- `<id>_moods.webp`：描き直した人の表情の差分の一覧（紺の上）。
- `triage.json`：見分けた結果の元の一覧（人物・魔物・持ち主に聞く絵）。
- `new/portraits/`・`new/monsters/`：作り直した絵（透明つき webp）。

## 決まり（持ち主、10/9）

- 人物：残すのは持ち物と体に付いた小物だけ。木・岩・椅子・机・長椅子などの背景の物は消す。背景の物に座る・寄りかかる絵は、同じ顔・髪・服のまま立ち姿などで描き直す（表情の差分も）。
- 使徒・魔物（人型も）：オーラ・光・羽・煙・炎・血だまり・溶岩・台座など、絵の一部としてデザインされた物は全部残す。消すのは空・遠景・ただの床や壁の色だけ。

## 作り方と時間（RTX 3080 10GB・メモリ 32GB）

| 作業 | 道具 | 1 枚あたり |
|---|---|---|
| 描き直し（基本の絵） | WebUI（`tools/gen_portraits.mjs --force --no-cutout`。立ち姿にするため一覧の tags を直した） | 約 14 秒 |
| 表情の差分 | WebUI（`--variants`） | 約 7.5 秒（168 枚で 21 分） |
| 切り抜き（描き直した絵） | BiRefNet（`tools/cutout_model.py`） | 約 14 秒（195 枚で 45 分） |
| 透明版（消えた所を残す） | ComfyUI＋Qwen-Image 2.1（`tools/qwen_cut.py`。公式の背景を消す作りに「〜は残す」を足す） | 約 100〜330 秒 |

- 描き直しは 1 回でうまくいかない絵が 3 割ほどあった（後ろに別の人、余分な長靴、今の服に戻る、箱に座ったまま）。seed を変えて 2〜3 回で収まった。
- Qwen は「残す物」を言わないと、葉の茂りなどを背景として消す。`--keep` で残す物を英語で書くと残る（e3_midori）。
- Qwen は持ち主の PC では、WebUI を閉じても途中でメモリ不足として止められた（e3_midori・e4_ashwyrm の 2 枚まで）。続きは `todo`。

## Qwen（ComfyUI）の入れ方

ComfyUI は持ち主の HunyuanVideo 用とは別に、`H:\game\comfyui-qwen`（専用の venv）に入れた。モデルは Comfy-Org/Qwen-Image-2.1 の 3 つ（約 14.3GB）：
`diffusion_models/qwen_image_2.1_int8_convrot.safetensors`・`text_encoders/qwen3vl_8b_w4a8.safetensors`・`vae/qwen_image_2.1_vae_bf16.safetensors`。
起動：`venv\Scripts\python main.py --listen 127.0.0.1 --port 8188`。使い方は `tools/qwen_cut.py` の先頭。
