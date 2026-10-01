# 人物の絵（docs/art）

- [portraits.md](portraits.md)：描く人の一覧と、Stable Diffusion に入れる**特徴だけ**のタグ（元は [portraits.json](portraits.json)。md は `node tools/portraits.mjs` で作る）。
- 画像は `assets/portraits/<id>.webp`（png・jpg でもよい）に置く。`node tools/build.mjs` で HTML に埋め込まれ（`tools/assets.mjs`）、ゲームはその人をその画像で描く（`src/ui/v4_assets.js`）。無い人は今の canvas の絵。
- 512×640（縦長・胸から上）、1枚 80KB 以下。埋め込みの合計が 12MB を超えるとビルドとテストが止まる。

## 持ち主のパソコンで、手元の Stable Diffusion に作らせる

1. WebUI（AUTOMATIC1111 / Forge）を `--api` を付けて起動する（ComfyUI なら普通に起動し、下では `--comfy` を付ける）。
2. `docs/art/style.example.json` を `docs/art/style.local.json` に写し、画風・品質のタグ・LoRA・ネガティブ・モデル・steps などを書く（git には入らない）。ComfyUI は `docs/art/comfy_workflow.json` を自分のワークフロー（API 形式）に置き換えてよい。
3. `node tools/gen_portraits.mjs --dry` でプロンプトを確かめ、`node tools/gen_portraits.mjs` で、まだ画像の無い人をすべて作る（`--only dil,nora` でその人だけ）。
4. 絵を見て、気に入らないものは `node tools/gen_portraits.mjs --only <id> --force` で作り直す（seed が -1 なら毎回変わる）。
5. `node tools/build.mjs && node tests/run.mjs` で埋め込みと大きさを確かめ、`assets/portraits/` をコミットする。

`cwebp` があれば webp にして保存する（無ければ png のまま。80KB を超えるならビルドが知らせる）。このスクリプトは CI やテストでは動かさない。
