# 立ち絵・魔物の背景を抜く（背景除去のモデル）

持ち主の決定（10/7）：立ち絵と魔物の絵は、**背景除去のモデルで切り抜いた透明つきの webp** で入れる。
これまではゲームが描くときに白い背景を色で消していた（`src/ui/a13_cutout.js`）が、腕と体のあいだ・武器と体のあいだ・髪の房のあいだなど、
線画に囲まれた背景が残り、白い服や白い髪とも見分けにくかった。

- **今ある絵**は `tools/cutout_model.py` でまとめて切り抜き、同じファイル名の透明つき webp に置き換える。
- **これから描く絵**は、`tools/gen_portraits.mjs`（人物・魔物・差分）が保存のあとすぐ同じ手順に通す。最初から透明つきで入る。
- ゲームは、透明を持つ絵には実行時の背景消しをしない（そのまま描く）。

## 道具

| 道具 | すること |
|---|---|
| `tools/cutout_model.py` | 背景除去のモデルで切り抜き、透明つき webp に書き出す（`--out` で別のフォルダに・`--in-place` で assets を書き換え・`--flatten` で白い背景に戻す） |
| `tools/cutout_sheets.py` | 濃い色（マゼンタ・濃紺）・市松・明るい色の背景に並べた一覧シートを作る（`--src` で切り抜き済みの絵・`--list` で選んだ絵だけ） |
| `tools/cutout_islands.py` | 背景の色のまま残った塊（囲まれた背景）を探す。`--verdicts` で、目で決めた「抜く所」がまだ残っていないかを数える |
| `tools/cutout_run.mjs` | ゲームと同じ実行時の背景消し（`a13_cutout.js`）を Node で動かす（白い背景のままの絵を見比べるとき） |
| `docs/art/cutout_audit/verdicts.json` | 10/7 に色の方法で全部の基本の絵を目で見て、「抜くべき背景」と決めた 209 枚・526 か所。モデルで抜いたあと、これが全部抜けたかを確かめる |

## モデルと設定

- モデル：**birefnet-general**（BiRefNet の汎用・高精度版。rembg 2.0.69 から使う。onnxruntime-gpu・CUDA）。
  8 枚で比べた isnet-anime（アニメ調向け）より、囲まれた背景と背景の物（木・傘の外）の残りが少なかった。うまく抜けない絵だけ `--model isnet-anime` で試す。
- 後処理（post_process_mask）なし。マスクをそのまま透明度にし、8 未満は 0、248 以上は 255 にそろえる。
- 色のにじみ抜き：半透明の画素は白い背景と混ざっているので、`F = (c − (1−a)·B) / a`（B は四隅の背景の色）で絵の色に戻す（白いふちを残さない）。
- 保存：webp（quality 88 から、人物 80KB・魔物 60KB に収まるまで下げる。alpha_quality 90）。512×640（人物）・512×512（魔物）のまま。

## 入れ方（持ち主のパソコン）

1. 専用の venv を作る（WebUI の venv とふだんの Python には入れない）：
   ```
   python -m venv H:\game\cutout-venv
   H:\game\cutout-venv\Scripts\python -m pip install "rembg[gpu]" numpy pillow
   H:\game\cutout-venv\Scripts\python -m pip install "nvidia-cudnn-cu12==9.8.*" nvidia-cublas-cu12 nvidia-cuda-runtime-cu12 nvidia-cufft-cu12 nvidia-curand-cu12 nvidia-cuda-nvrtc-cu12
   ```
   2 行目（CUDA 12・cuDNN 9 の部品）が無いと GPU が使えず CPU で動く（1 枚 10 秒以上・メモリも重い）。cuDNN は 9.8 に止める（9.27 では BiRefNet の大きな畳み込みが CUDNN_BACKEND_API_FAILED で落ち、CPU に戻った）。`cutout_model.py` が `onnxruntime.preload_dlls()` で読み込む。
   モデル（birefnet-general 約 1GB・isnet-anime 約 170MB）は初回に `~/.u2net` へ落ちてくる。
2. 生成の道具にその python を教える：環境変数 `CUTOUT_PYTHON=H:\game\cutout-venv\Scripts\python.exe`、または `docs/art/style.local.json`（魔物は `style_monsters.local.json`）に `"cutout_python": "…"`。
   無いと `gen_portraits.mjs` は作る前に止まる（`--no-cutout` で、抜かずに白い背景のまま試せる。入れる絵は必ず抜く）。
3. メモリ：モデルは GPU で 2〜3GB 使う。WebUI を動かしたままだと足りないことがある。足りなければ、自分で起動したものだけを止める（ほかのアプリには触らない）。

## 点検

1. 切り抜いたら、全部を一覧シートにして目で見る：
   ```
   python tools/cutout_sheets.py --src <切り抜いたフォルダ> --bg dark,navy,light --per 24 --cell 240
   ```
   濃い背景では抜け残りの白・灰が、明るい背景では服や髪に開いた穴が目立つ。
2. 白い服・白や銀の髪の人、武器や杖を持つ人、長い髪の人は、`--list` で別のシートにまとめて特に見る。
3. 見る所：武器・杖・盾と体のあいだ、髪の房のあいだ・髪と首や肩のあいだ、腕と胴、脚のあいだ、翼・尾・角と体のあいだ、指のあいだ。白目・歯・光の反射・白い服・白い毛皮が残っているか。
4. **周りの物まで一体の絵は、それを消さない**（持ち主の注意）。モデルは体から離れた物を背景と見なして消しやすい。
   魔物・使徒：玉座・翼・光輪・浮かぶ武器・鎖・触手・まとった煙や炎・足元の台座・従えた小さなもの。人物：車いす・杖・松葉杖・旗・長い槍・弓・背負った荷・肩の鳥や動物・座っている台。
   必ず元の絵と切り抜き後を並べた一覧（`--list` か、元と並べるシート）で見比べる。差分（表情）は基本の絵と同じ物が残っているかも見る（差分ごとにモデルの結果がばらつく）。
5. 直し方：
   - 白い背景の上の物（浮かぶ物・煙・炎・光）：`--keep-color`。モデルの透明に、背景の色との差の透明を重ねる（白い背景と同じ色の白い湯気は戻らない）。
   - 暗い・グラデーションの背景の光や霧：`--keep-color --key 40,110`（背景の色を縁の中央値で決め、差の幅を広げる）。
   - 車いすなど形のはっきりした物：`--model isnet-anime` で試す。
   - それでも分けられない絵は、切り抜かずに元のまま入れる（ゲームの表示のときの白抜きに任せる）。
   - 直した絵は一覧にして、元／切り抜き後を並べた画像を PR に載せる（例：`docs/art/cutout_model_check/`）。
6. 細部で迷う所は、薄く白い半透明でよい（持ち主了承）。
