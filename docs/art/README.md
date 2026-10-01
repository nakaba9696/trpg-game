# 人物の絵（docs/art）

- [portraits.md](portraits.md)：描く人の一覧と、Stable Diffusion に入れる**特徴だけ**のタグ（元は [portraits.json](portraits.json)。md は `node tools/portraits.mjs` で作る）。名のある人物が先、乱数で作られる人の「型」が後。
- 画像は `assets/portraits/<id>.webp`（png・jpg でもよい）に置く。`node tools/build.mjs` で HTML に埋め込まれ（`tools/assets.mjs`）、ゲームはその人をその画像で描く（`src/ui/v4_assets.js`）。無い人は今の canvas の絵。
- 512×640（縦長・胸から上）、1枚 80KB 以下。埋め込みの合計が 12MB を超えるとビルドとテストが止まる。

## 持ち主のパソコンで、AUTOMATIC1111 / Forge に作らせる

1. WebUI を `--api` を付けて起動する（例：`webui-user.bat` の `COMMANDLINE_ARGS` に `--api`）。
2. `docs/art/style.example.json` を `docs/art/style.local.json` に写し、書き換える（git には入らない）。
   - `prefix`・`suffix`：画風・品質のタグ・LoRA（一覧の特徴のタグの前と後ろに付く）。`negative`：ネガティブ。
   - `sampler_name`・`scheduler`・`steps`・`cfg_scale`・`width`・`height`・`seed`（-1 で毎回変わる）・`clip_skip`。
   - hires fix：`enable_hr`・`hr_scale`・`hr_upscaler`・`hr_second_pass_steps`・`denoising_strength`。
   - `override_settings`：`sd_model_checkpoint`（モデル）など。ほかに渡したい項目は `extra` に書く。
3. `node tools/gen_portraits.mjs --dry` でプロンプトと seed を確かめ、`node tools/gen_portraits.mjs` で、まだ画像の無い人をすべて作る（`--only dil,nora` でその人だけ）。
4. 絵を見る。
   - 気に入った名のある人物は `node tools/gen_portraits.mjs --keep dil,nora` で、そのときの seed を一覧に書き戻す（作り直しても同じ見た目を保ちやすくなる）。
   - 気に入らない人は `node tools/gen_portraits.mjs --only <id> --force --new-seed` で別の seed で作り直す（一覧に seed が無い人は `--new-seed` なしでも毎回変わる）。
5. `node tools/build.mjs && node tests/run.mjs` で埋め込みと大きさを確かめ、`assets/portraits/` と `docs/art/portraits.json`・`portraits.md` をコミットする。

使った seed は `docs/art/seeds.local.json`（git には入らない）に残る。`cwebp` があれば webp にして保存する（無ければ png のまま。80KB を超えるならビルドが知らせる）。このスクリプトは CI やテストでは動かさない。
