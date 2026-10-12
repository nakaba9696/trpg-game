# 秘書の差分（ゲームには入れない）

元の絵は `assets/portraits/kind_host_f.webp`。待機（idle）・処理中（busy）・報告（report）・異常（alert）・了解（ack）の 5 枚。持ち主の指定で、目はどれも閉じたまま。

- `<名前>.png`（512×640）・`<名前>_1024x1280.png`（2 倍）：透明の png。
- `<名前>_mask.png`：描き直した所（白）。マスクの外は元の絵の画素のまま（髪の輪郭・前髪・服の模様・前掛けのフリル）。
- `<名前>.json`（`docs/art/gen/secretary_<名前>.json` と同じ）：仕上げの inpaint の設定（seed・モデル・sampler・steps・CFG・denoise・マスクの作り方・背景の抜き方）と、下書きを作った各段の設定（`draft_records`）。
- 作り方：前の作業で作った下書き（顔・腕）のうち、元の絵と大きく違う所と、元の手・新しい手の所だけをマスクにし、元の絵に下書きを重ねてから、元と同じプロンプト（`node tools/gen_portraits.mjs --only kind_host_f --dry --force`）に表情のタグを足し、固定の seed で inpaint（Only masked・masked content original・denoise 0.4）。緑の地で描いて抜き、元の手の桃色の名残を前掛けの色に寄せた。
