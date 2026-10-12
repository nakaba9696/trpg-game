# 生成の記録（docs/art/gen）

持ち主の決まり：「同じ絵を出せるようにプロンプトは残しておいて。出すたびに違うキャラになったら意味がない」。
絵を 1 枚作るたびに、同じ絵をもう一度出せるだけの設定をここに残す。ファイルは `<id>.json`（id は `assets/portraits`・`assets/monsters` のファイル名。表情違いも 1 枚ずつ。背景の絵は `scene_<id>.json`）。

## 書くもの
- `tools/gen_portraits.mjs`（基本の絵・`--variants`・`--monsters`）と `tools/gen_scenes.mjs` は、絵を保存するたびに自動で書く（`tools/gen_record.mjs`）。
- 手元の Python の道具は `tools/gen_record.py` を使う。候補の絵の隣に `save_sidecar()` で `<絵>.gen.json` を置き、採用したら `adopt(root, id, [各段の記録…], matte=…, post=…)` でここに写す（txt2img → inpaint → 背景を抜く → 表情の差分、のように何段かで作った絵は `steps` に順に並ぶ）。
- 描き直すと、前の記録は `history` に積まれる（5 件まで）。

## 中身
| 項目 | 中身 |
|---|---|
| `source` | `generated`（作ったときに書いた）か `recovered`（あとから拾い集めた） |
| `method` | `txt2img`・`img2img`・`inpaint`・`chain`（何段か。`steps` に各段） |
| `prompt`・`negative_prompt` | 送った文（API の info の all_prompts から） |
| `seed`・`subseed`・`subseed_strength` | 実際に使った値（-1 ではなく、API の info の all_seeds から） |
| `model` | `name`・`file`（ファイル名）・`hash`（WebUI の短いハッシュ）・`vae` |
| `sampler_name`・`scheduler`・`steps`・`cfg_scale`・`width`・`height`・`clip_skip` | 送った設定 |
| `hires` | hires fix の設定（使ったときだけ） |
| `denoising_strength`・`init_image_sha1`・`base` | img2img・inpaint の強さと下地（ファイル名と sha1） |
| `mask`・`mask_sha1` | inpaint のマスクの作り方と、送ったマスクの sha1 |
| `controlnet`・`adetailer`・`layerdiffuse` | 使ったときの設定（画像は sha1 だけ） |
| `matte` | 背景を抜いた方法（色と閾値） |
| `post` | 縮め方（大きさ・webp の質・仕上がりの sha1） |
| `infotext` | WebUI が返した設定の文（画面の PNG Info と同じ） |
| `date`・`tool` | 作った日と道具 |

## 拾い集めた記録（source: recovered）
2026-10-12 に、手元に残っていた記録から拾った。
- **WebUI の保存先**（`Desktop\AI` の日付のフォルダ・reForge の `outputs`）：このゲームの絵は API で作っていて保存されていなかった（一覧の見た目の文を含むプロンプトは 0 件）。
- **`docs/art/seeds*.local.json`**（gen_portraits.mjs が残した実際の seed）と、その seed で作った直後のコミットの一覧・設定（`--dry` で送る中身を出した）から、txt2img の設定を作り直した。
  - `exact: true`：今の絵は、その生成のあと手を加えていない（git でその時の絵と同じ）。同じ設定で同じ絵が出るはず。
  - `exact: false`：元の絵の生成。今の絵は、そのあと描き直し・背景を抜く・すき間を消すなどの手を加えたもの（`note` にそのコミット）。同じキャラの元の絵は出せるが、今の絵そのものは出ない。
  - `missing` に、分からなかった項目（subseed・モデルのハッシュ・手元の上書き style.local.json など）。
- `trpg-redo`（描き直し用の作業場所）の seed は、`--style` で背景の色を上書きした作り直しの試しのもので、そのまま送ると今の絵とは別の絵になった（2 枚で確かめた）。記録では本線の seed を使い、試しの seed は `redo_try` に分けて残した。
- 同じ設定で同じ絵が出るか確かめた：chancellor・c2_captainbeast・e4k_drownedsailor（`verified`。縮めた差は 1 未満）。
- 作業フォルダの描き直しの途中の絵も今の絵と見比べたが、seed の残った記録で今の絵と一致するものは無かった。
- 見つからなかった絵は [MISSING.md](MISSING.md)。
