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

**男の人物**（identity・tags に 1boy / male などがある人）は `style_male.json` を style.json の上に重ねて作る（持ち主の絵柄は可愛い女の子向けなので、男は絵師名を外して美形の男性に寄せる）。手元で変えるときは `style_male.local.json`。

**画面の欄に入れた絵柄の文は API では使われない。** WebUI の Styles に保存して `style.json` の `"styles": ["名前"]` に書くか、`prefix`・`suffix`・`negative` に書く。
自分のパソコンだけで設定を変えたいときは、`docs/art/style.local.json` に変えたい項目だけを書く（`style.json` の上に重なる。git には入らない）。使った seed は `docs/art/seeds.local.json`（git には入らない）に残る。このスクリプトは CI やテストでは動かさない。

## 喜怒哀楽の差分（V8）

- 一覧の `face` は基本の表情、`variants` は喜（`joy`）・怒（`anger`）・哀（`sorrow`）・楽（`fun`）の表情のタグ（仲間の 8 人と主要な数人）。ファイルは `assets/portraits/<id>_joy.webp` など。無い差分は通常の絵のまま。
- 作る：基本の絵（`assets/portraits/<id>.webp`）ができてから `node tools/gen_portraits.mjs --variants --dry` で確かめ、`node tools/gen_portraits.mjs --variants` で作る（`--only nora` でその人だけ、`--only nora_joy` で一枚だけ、`--force` で作り直す）。基本の絵を元に img2img（`/sdapi/v1/img2img`）で、seed は基本と同じ（`--keep` した seed か `seeds.local.json`）、見た目（`identity`）とポーズ（`tags`）は一字一句同じで、表情のタグだけ差し替える。基本の絵が無い人は飛ばす。
- 強さ（denoising）は `style.json` の `variants.denoising`（既定 0.35）。顔が変わりすぎるなら `style.local.json` に `"variants": { "denoising": 0.3 }`、表情が変わらなければ 0.45 に。
- 名のある人物の `identity` は見た目を固定するタグ（髪の色は2語・長さ・髪型、目の色と形、肌、眉、傷やそばかすなどの印、服の色と形、いつも身につけている物、年齢と体格）。差分で別人にならないよう、色や髪型はここに書き、`tags` にはポーズと手に持つ物だけを書く（V10）。1 枚 30KB 前後なので、15 人 × 4 で 2MB ほど（埋め込みの上限 12MB に入る）。
- ゲームは出来事の `mood`（無ければ文から推す）で、その場の表情の差分を立ち絵に出す（`src/engine/v8_moods.js`・`src/ui/v8_moods.js`）。

## 魔物の絵（V6）

- 一覧は [monsters.md](monsters.md)（元は [monsters.json](monsters.json)。名前は敵のデータから取るので、敵の名前が変わったら `node tools/monsters.mjs` で作り直す）。人物の一覧に載っている人の姿の敵（コノハ・ベルナなど）は人物の側に任せる。
- 設定は人物と別の [style_monsters.json](style_monsters.json)（最初は人物と同じモデル・同じ絵柄。後置きは `no humans, monster, creature, …, white background`）。手元だけで変えるなら `docs/art/style_monsters.local.json`。人の姿の敵（一覧の `human: true`）は `human` の後置き・ネガティブに替わる。
- 作る：`node tools/gen_portraits.mjs --monsters --dry --only goblin,slime` でプロンプトを確かめ、`node tools/gen_portraits.mjs --monsters --only goblin,slime` で作る（引数なしなら、まだ画像の無い魔物をすべて）。`--force`・`--keep`・`--new-seed` も人物と同じ。1024×1024 で作り、512×512 の webp に縮めて `assets/monsters/<id>.webp` に置く。
- ゲームは戦闘でその敵を画像で描き（`src/ui/v6_monsters.js`）、白い背景は縁から消して周りをぼかす。画像の無い敵は今の canvas の絵。埋め込みの上限（12MB）は人物と魔物を合わせて数えるので、魔物は 1 枚 60KB 以下を目安に。

## 異形と、人の姿の使徒（V7）

- 魔物は基本 [style_monsters.json](style_monsters.json)（人物と同じモデル）。ゴブリン・スライム・獣・亜人・まぬけな魔物はこれでよい。
- **人の形を持たない格上の存在**（使徒の異形の姿・天災の格の化物・不気味な異形）だけ、[monsters.json](monsters.json) の行に `"style": "eldritch"` を付ける。`--monsters` で作るとき、その行は [style_eldritch.json](style_eldritch.json)（`dreamshaperXL_lightningDPMSDE.safetensors`・暗い油彩の挿絵）に替わる。数は絞る（魔物全体の 2 割まで。テストが見る）。ふつうの魔物を先に、異形を後にまとめて送るので、モデルの入れ替えは一度で済む。
  - Lightning 系のモデルなので、既定は steps 7・cfg 2・sampler `DPM++ SDE`・scheduler `Karras`。**モデルの説明に合わせて調整する**（手元だけなら `docs/art/style_eldritch.local.json`）。`sd_model_checkpoint` はファイル名だけでも動く。WebUI に出るハッシュ（`[xxxxxxxxxx]`）は後で足してよい。
- **人の姿の使徒**（[portraits.json](portraits.json) のカルマトス・ドレイゼ・ユヴァリエ・ベリエラ・セグリトス・ヴァルグレア・ディエラン・ベルファス）は、モデルを替えずに**特徴のタグで異質さ**を出す（人ではない目・輪郭の歪み・まとう気配・ずれた意匠・表情）。一人ずつ伝承に合わせて選んでいる。`no halo` と衝突する `halo` は使わない。
