# 人物の絵（docs/art）

- [portraits.md](portraits.md)：描く人の一覧と、Stable Diffusion に入れる**特徴だけ**のタグ（元は [portraits.json](portraits.json)。md は `node tools/portraits.mjs` で作る）。名のある人物が先、乱数で作られる人の「型」が後。
- [style.json](style.json)：持ち主の絵柄の設定（モデル・画風のタグ・ネガティブ・sampler など）。**もう入っている。**
- 画像は `assets/portraits/<id>.webp` に置く。`node tools/build.mjs` で HTML に埋め込まれ（`tools/assets.mjs`）、ゲームはその人をその画像で描く（`src/ui/v4_assets.js`）。無い人は今の canvas の絵。
- 512×640（縦長・胸から上）、1枚 80KB 以下。埋め込みの合計が 12MB を超えるとビルドとテストが止まる。

## 持ち主のパソコンで作る（AUTOMATIC1111 / Forge / reForge）

設定は入っているので、フォルダを持ってきて WebUI を `--api` で起動し、スクリプトを動かすだけ。

1. このリポジトリのフォルダを持ってくる（GitHub の「Code → Download ZIP」で展開してもよい）。Node.js（18 以上）を入れておく。
2. **cwebp を入れる**（1024×1280 の絵を 512×640 の webp に縮めるのに使う）。Windows：[WebP のダウンロード](https://developers.google.com/speed/webp/download) から `libwebp-…-windows-x64.zip` を落として展開し、`bin` の中の `cwebp.exe` をこのフォルダ（`trpg-game`）か PATH の通った所に置く。
   - cwebp が無ければ WebUI の機能（`/sdapi/v1/extra-single-image`）で縮める。それもできないときは、大きいまま保存せずに止まる。
3. WebUI を `--api` を付けて起動する（例：`webui-user.bat` の `COMMANDLINE_ARGS` に `--api`）。
4. このフォルダで `node tools/gen_portraits.mjs --dry` を動かし、送るプロンプトと設定を確かめる。よければ `node tools/gen_portraits.mjs` で、まだ画像の無い人をすべて作る（`--only dil,nora` でその人だけ）。
5. 絵を見る（`assets/portraits/`）。
   - 気に入った名のある人物は `node tools/gen_portraits.mjs --keep dil,nora` で、そのときの seed を一覧に残す（作り直しても同じ見た目を保ちやすくなる）。
   - 気に入らない人は `node tools/gen_portraits.mjs --only <id> --force --new-seed` で作り直す。
6. できた `assets/portraits/` と、`--keep` したなら `docs/art/portraits.json`・`portraits.md` を、配り役（Claude）に渡すか、コミットする。`node tools/build.mjs && node tests/run.mjs` で埋め込みと大きさを確かめられる。

**画面の欄に入れた絵柄の文は API では使われない。** WebUI の Styles に保存して `style.json` の `"styles": ["名前"]` に書くか、`prefix`・`suffix`・`negative` に書く。
自分のパソコンだけで設定を変えたいときは、`docs/art/style.local.json` に変えたい項目だけを書く（`style.json` の上に重なる。git には入らない）。使った seed は `docs/art/seeds.local.json`（git には入らない）に残る。このスクリプトは CI やテストでは動かさない。
