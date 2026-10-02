# 人物の絵（docs/art）

- [portraits.md](portraits.md)：描く人の一覧と、Stable Diffusion に入れる**特徴だけ**のタグ（元は [portraits.json](portraits.json)。md は `node tools/portraits.mjs` で作る）。名のある人物が先、乱数で作られる人の「型」が後。
- [style.json](style.json)：持ち主の絵柄の設定（モデル・画風のタグ・ネガティブ・sampler など）。**もう入っている。**
- 画像は `assets/portraits/<id>.webp` に置く。`node tools/build.mjs` で `dist/site/portraits/<id>.webp` に写され、HTML から相対パスで読まれる（`tools/assets.mjs`・公開のしかたは [../publish.md](../publish.md)）。ゲームはその人をその画像で描く（`src/ui/v4_assets.js`）。無い人（読めない人）は今の canvas の絵。
- 512×640（縦長・胸から上）、1枚 80KB 以下。画像は HTML の外なので、数の上限は Artifact の決まり（1 つの版で 511 ファイル・256MB。`tests/checks/a6_site.mjs`）。予備の埋め込み（`--embed`）は 12MB までで、超えるなら差分を省く。

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
6. できた `assets/portraits/` と、`--keep` したなら `docs/art/portraits.json`・`portraits.md` を、配り役（Claude）に渡すか、コミットする。`node tools/build.mjs && node tests/run.mjs` で大きさを確かめられる。

**男の人物**（identity・tags に 1boy / male などがある人）は `style_male.json` を style.json の上に重ねて作る（持ち主の絵柄は可愛い女の子向けなので、男は絵師名を外す）。手元で変えるときは `style_male.local.json`。

**男の型（A5）**：男が全員同じ美形にならないよう、顔立ちを型で分ける。型は `style_male.json` の `types` にあり、[portraits.json](portraits.json) の男の人に `type` で割り振る（無ければ `default_type` の `classic`）。`ojisan`（渋い中年〜初老。劇画寄りの濃い顔・ほうれい線・こけた頬・角ばった顎。いちばん多い）・`classic`（正統派の美形）・`bishonen`（線の細い美形）・`brute`（少しブサイクで愛嬌のある巨漢。この型だけネガティブの `ugly face` を外す）・`elder`（老人）・`boy`（子ども）。プロンプトは共通の前置きの後ろに型の `prefix` が付き（同じタグは一度だけ）、ネガティブは型の `negative_remove` を外して `negative_add` を足す。型の語は特徴だけで、作家名・作品名は書かない（テストが見る）。`node tools/gen_portraits.mjs --dry --type ojisan` でその型の男だけのプロンプトを確かめ、`--type ojisan --force` でその型だけ作り直せる（`--only`・`--variants` と重ねられる）。

**画面の欄に入れた絵柄の文は API では使われない。** WebUI の Styles に保存して `style.json` の `"styles": ["名前"]` に書くか、`prefix`・`suffix`・`negative` に書く。
自分のパソコンだけで設定を変えたいときは、`docs/art/style.local.json` に変えたい項目だけを書く（`style.json` の上に重なる。git には入らない）。使った seed は `docs/art/seeds.local.json`（git には入らない）に残る。このスクリプトは CI やテストでは動かさない。

## 喜怒哀楽の差分（V8）

- 一覧の `face` は基本の表情、`variants` は喜（`joy`）・怒（`anger`）・哀（`sorrow`）・楽（`fun`）と、その人らしい表情（V11。下）のタグ。ファイルは `assets/portraits/<id>_joy.webp` など。無い差分は近い表情か、通常の絵のまま。
- 作る：基本の絵（`assets/portraits/<id>.webp`）ができてから `node tools/gen_portraits.mjs --variants --dry` で確かめ、`node tools/gen_portraits.mjs --variants` で作る（`--only nora` でその人だけ、`--only nora_joy` で一枚だけ、`--force` で作り直す）。基本の絵を元に img2img（`/sdapi/v1/img2img`）で、seed は基本と同じ（`--keep` した seed か `seeds.local.json`）、見た目（`identity`）とポーズ（`tags`）は一字一句同じで、表情のタグだけ差し替える。基本の絵が無い人は飛ばす。
- 強さ（denoising）は `style.json` の `variants.denoising`（既定 0.35）。顔が変わりすぎるなら `style.local.json` に `"variants": { "denoising": 0.3 }`、表情が変わらなければ 0.45 に。
- 名のある人物の `identity` は見た目を固定するタグ（髪の色は2語・長さ・髪型、目の色と形、肌、眉、傷やそばかすなどの印、服の色と形、いつも身につけている物、年齢と体格）。差分で別人にならないよう、色や髪型はここに書き、`tags` にはポーズと手に持つ物だけを書く（V10）。1 枚 30KB 前後なので、15 人 × 4 で 2MB ほど（画像は HTML の外なので、人数は Artifact の決まりの中で増やせる）。
- ゲームは出来事の `mood`（無ければ文から推す）で、その場の表情の差分を立ち絵に出す（`src/engine/v8_moods.js`・`src/ui/v8_moods.js`）。

## 喜怒哀楽のほかの表情（V11）

- 種類は [moods.md](moods.md)（元は [moods.json](moods.json)）。喜怒哀楽に加えて、驚き（`surprise`）・照れ（`shy`）・困り（`troubled`）・真剣（`serious`）・得意げ（`smug`）・怯え（`fear`）・疲れ（`tired`）・泣き（`cry`）・慌て（`panic`）・すね（`pout`）・ほんの少し笑う（`faint_smile`）・目を輝かせる（`sparkle`）・冷たい目（`cold`）・悪い笑み（`wicked`）・酔い（`drunk`）・眠い（`sleepy`）・呆れ（`exasperated`）・うっとり（`smitten`）。
- 主要な人（仲間になる人・キャラメモの人・使徒の人の姿）は、喜怒哀楽＋その人らしい表情を 3〜5 個持つ（[portraits.json](portraits.json) の `variants`。人ごとの割り当ては moods.md の表）。新しい人を足すときの書き方も moods.md に。
- 作る：`node tools/gen_portraits.mjs --variants`（まだ無い差分を全部）、`--variants --mood shy,surprise`（その表情だけ）、`--variants --only nora`・`--only nora_shy`。作り方は喜怒哀楽と同じ（img2img・表情のタグだけ差し替え）。
- 絵の無い表情は近い表情（moods.md の「落とし先」）、それも無ければ基本の絵を出すので、少しずつ作ってよい。作る順は仲間 → 王家・帝国などの中核 → 使徒がよい。
- 数の上限：画像は HTML の外のファイルになった（#192）が、Artifact は 1 つの版で **511 ファイル**まで（`tests/checks/a6_site.mjs`）。今の絵は 247 枚（基本 171・喜怒哀楽 76）で、一覧の差分を全部（398 枚）作ると 569 枚になり超える。**作る順は 仲間（97 枚）→ 王家・帝国・共和国の中核 → 使徒 → ほかのキャラメモの人**にし、合計が 500 枚ほどになったら止める（絵の無い表情は落とし先に落ちるので、止めても遊べる）。
- ゲームは出来事・結果・会話・掛け合いの `mood`（例：`mood: "shy"`）か、文から推した表情を出す（`src/data/v11_moods.js`・`src/engine/v8_moods_v11.js`・`src/ui/v8_moods_v11.js`）。

## 魔物の絵（V6）

- 一覧は [monsters.md](monsters.md)（元は [monsters.json](monsters.json)。名前は敵のデータから取るので、敵の名前が変わったら `node tools/monsters.mjs` で作り直す）。人物の一覧に載っている人の姿の敵（コノハ・ベルナなど）は人物の側に任せる。
- 設定は人物と別の [style_monsters.json](style_monsters.json)（最初は人物と同じモデル・同じ絵柄。後置きは `no humans, monster, creature, …, white background`）。手元だけで変えるなら `docs/art/style_monsters.local.json`。人の姿の敵（一覧の `human: true`）は `human` の後置き・ネガティブに替わる。
- 作る：`node tools/gen_portraits.mjs --monsters --dry --only goblin,slime` でプロンプトを確かめ、`node tools/gen_portraits.mjs --monsters --only goblin,slime` で作る（引数なしなら、まだ画像の無い魔物をすべて）。`--force`・`--keep`・`--new-seed` も人物と同じ。1024×1024 で作り、512×512 の webp に縮めて `assets/monsters/<id>.webp` に置く。
- ゲームは戦闘でその敵を画像で描き（`src/ui/v6_monsters.js`）、白い背景は縁から消して周りをぼかす。画像の無い敵は今の canvas の絵。予備の埋め込み（12MB）は人物と魔物を合わせて数えるので、魔物は 1 枚 60KB 以下を目安に。

## 異形と、人の姿の使徒（V7）

- 魔物は基本 [style_monsters.json](style_monsters.json)（人物と同じモデル）。ゴブリン・スライム・獣・亜人・まぬけな魔物はこれでよい。
- **人の形を持たない格上の存在**（使徒の異形の姿・天災の格の化物・不気味な異形）だけ、[monsters.json](monsters.json) の行に `"style": "eldritch"` を付ける。`--monsters` で作るとき、その行は [style_eldritch.json](style_eldritch.json)（`dreamshaperXL_lightningDPMSDE.safetensors`・暗い油彩の挿絵）に替わる。数は絞る（魔物全体の 2 割まで。テストが見る）。ふつうの魔物を先に、異形を後にまとめて送るので、モデルの入れ替えは一度で済む。
  - Lightning 系のモデルなので、既定は steps 7・cfg 2・sampler `DPM++ SDE`・scheduler `Karras`。**モデルの説明に合わせて調整する**（手元だけなら `docs/art/style_eldritch.local.json`）。`sd_model_checkpoint` はファイル名だけでも動く。WebUI に出るハッシュ（`[xxxxxxxxxx]`）は後で足してよい。
- **人の姿の使徒**（[portraits.json](portraits.json) のカルマトス・ドレイゼ・ユヴァリエ・ベリエラ・セグリトス・ヴァルグレア・ディエラン・ベルファス）は、モデルを替えずに**特徴のタグで異質さ**を出す（人ではない目・輪郭の歪み・まとう気配・ずれた意匠・表情）。一人ずつ伝承に合わせて選んでいる。`no halo` と衝突する `halo` は使わない。
