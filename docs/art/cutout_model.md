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
   ```
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
4. 失敗した絵（体の一部が欠ける・背景が残る）は、別のモデル（`--model isnet-anime`）で切り直すか、手で直す。細部で迷う所は、薄く白い半透明でよい（持ち主了承）。
