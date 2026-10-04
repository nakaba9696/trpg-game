# 人物・魔物・背景の絵（docs/art）

背景の絵（A11）は下の「背景の絵（A11）」。

- [portraits.md](portraits.md)：描く人の一覧と、Stable Diffusion に入れる**特徴だけ**のタグ（元は [portraits.json](portraits.json)。md は `node tools/portraits.mjs` で作る）。名のある人物が先、乱数で作られる人の「型」が後。
- [style.json](style.json)：持ち主の絵柄の設定（モデル・画風のタグ・ネガティブ・sampler など）。**もう入っている。**
- 画像は `assets/portraits/<id>.webp` に置く。`node tools/build.mjs` で 25 枚ずつのスプライト（`dist/site/portraits/packs/*.svg`。A12）にまとめられ、HTML から相対パスで読まれる（`tools/assets.mjs`・公開のしかたは [../publish.md](../publish.md)）。ゲームはその人をその画像で描く（`src/ui/v4_assets.js`）。無い人（読めない人）は絵を出さない（A10：canvas の人物の絵はやめた。誰に何を当てるかは [a10_map.md](a10_map.md)。`node tools/a10_map.mjs` で作り直す）。**主人公は立ち絵を出さない**ので、主人公の型（`hero_*`）は作らない（前に作った 10 枚は、名もない人の二枚目の型 `kind_<種類>_<m|f>_b` に回した。人ごとに半分ほどが二枚目になる）。
- 512×640（縦長・胸から上）、1枚 80KB 以下。画像は HTML の外なので、数の上限は Artifact の決まり（1 つの版で 511 ファイル・256MB。`tests/checks/a6_site.mjs`）。予備の埋め込み（`--embed`）は 12MB までで、超えるなら差分を省く。

## 持ち主のパソコンで作る（AUTOMATIC1111 / Forge / reForge）

**音量ミキサー・音声デバイス・ほかのアプリ（Discord・ブラウザなど）には触らない。** 音量やミュートを変える処理（PowerShell・nircmd・SoundVolumeView・音声の COM API など）は使わない。メモリが足りないときも、止めてよいのは画像生成のために自分で立ち上げたもの（WebUI・自分の node）だけ。足りなければ止まって持ち主に頼む。

設定は入っているので、フォルダを持ってきて WebUI を `--api` で起動し、スクリプトを動かすだけ。

1. このリポジトリのフォルダを持ってくる（GitHub の「Code → Download ZIP」で展開してもよい）。Node.js（18 以上）を入れておく。
2. **cwebp を入れる**（1024×1280 の絵を 512×640 の webp に縮めるのに使う）。Windows：[WebP のダウンロード](https://developers.google.com/speed/webp/download) から `libwebp-…-windows-x64.zip` を落として展開し、`bin` の中の `cwebp.exe` をこのフォルダ（`trpg-game`）か PATH の通った所に置く。
   - cwebp が無ければ WebUI の機能（`/sdapi/v1/extra-single-image`）で縮める。それもできないときは、大きいまま保存せずに止まる。
3. WebUI を `--api` を付けて起動する（例：`webui-user.bat` の `COMMANDLINE_ARGS` に `--api`）。
4. このフォルダで `node tools/gen_portraits.mjs --dry` を動かし、送るプロンプトと設定を確かめる。よければ `node tools/gen_portraits.mjs` で、まだ画像の無い人をすべて作る（`--only dil,nora` でその人だけ）。
5. 絵を**1枚ごとに見る**（`assets/portraits/`）。
   - **2人以上写っていたら作り直す**（背景の小さな人影・持ち物や服の柄の中の顔・鏡や水に映った姿も数える）。`node tools/gen_portraits.mjs --only <id> --force --new-seed` で seed を変える。すぐ作り直せないときは一覧（[portraits.json](portraits.json)）のその人に `"redo": "multi"` を付けておき、あとで `node tools/gen_portraits.mjs --redo --new-seed` でまとめて作り直す（作り直すと印は消える）。髪の色など identity を変えて描き直す人には `"redo": "color"` を付ける（持ち主の決定で、白に寄っていた女のモブの型 9 人の髪の色を散らした）。差分（img2img）も元の絵の人数を引き継ぐので、差分を作る前に基本の絵を見ること。
   - 気に入った名のある人物は `node tools/gen_portraits.mjs --keep dil,nora` で、そのときの seed を一覧に残す（作り直しても同じ見た目を保ちやすくなる）。
   - 気に入らない人は `node tools/gen_portraits.mjs --only <id> --force --new-seed` で作り直す。
6. できた `assets/portraits/` と、`--keep` したなら `docs/art/portraits.json`・`portraits.md` を、配り役（Claude）に渡すか、コミットする。`node tools/build.mjs && node tests/run.mjs` で大きさを確かめられる。

**男の人物**（identity・tags に 1boy / male などがある人）は `style_male.json` を style.json の上に重ねて作る（男の絵柄は BOLF。持ち主の絵師タグに織音・lack と AI っぽさを消す語を足す）。手元で変えるときは `style_male.local.json`。

**絵師タグ ikezawa shin と絵の版（A9）**：人物の prefix（`style.json`・`style_male.json`）には持ち主の指定で `ikezawa shin` が入っている（10/1 に一度外し、10/3 に戻した。魔物の設定には入れない）。露出を抑えるタグ（suffix の `fully clothed`・ネガティブの `nsfw, nude, topless…`）と複数人を避けるタグ（suffix の `solo`・ネガティブの `multiple girls, 2girls, multiple boys, group, crowd, background characters, other characters…`）はそのまま。
- 絵師タグに髪の色を引っ張られないよう、[portraits.json](portraits.json) の**全員**（モブの型 `kind_*`・主人公の型 `hero_*` も）の `identity` に**髪の色**（禿げ・剃髪なら `bald`）・**髪型**（長さか形）・**目の色**（閉じた目・覆われた目ならそれ）を書く。絵がある人は今の絵と同じ色を書く（`tests/checks/a9_hair.mjs` が見る）。
- **絵の版**：`style.json` の `art`（今は 2）が今の版。基本の絵（txt2img）は今の版の prefix で作り、作ると一覧のその人に `"art": 2` が書かれる。`art` の無い人（版 1）の基本の絵は ikezawa shin なしで描いたので、その人の**差分**（`--variants`）は `art_drop["1"]`（`ikezawa shin`）を prefix から外して作る（同じ画風にそろえる）。版 1 の人の基本の絵を作り直したら（版 2 になる）、差分も `--variants --only <id> --force` で作り直す。`--dry` で差分の行に「絵の版」が出る。
- また prefix の絵師タグを足すときは、`art` を 3 にし、`art_drop` の版 1・版 2 それぞれに「その版の絵を描いたときに無かった語」を書く（差分はその語を外して作る）。

**男の型（A5）**：男が全員同じ美形にならないよう、顔立ちを型で分ける。型は `style_male.json` の `types` にあり、[portraits.json](portraits.json) の男の人に `type` で割り振る（無ければ `default_type` の `classic`）。`ojisan`（渋い中年〜初老。劇画寄りの濃い顔・ほうれい線・こけた頬・角ばった顎。いちばん多い）・`classic`（正統派の美形）・`bishonen`（線の細い美形）・`brute`（少しブサイクで愛嬌のある巨漢。この型だけネガティブの `ugly face` を外す）・`elder`（老人）・`boy`（子ども）。プロンプトは共通の前置きの後ろに型の `prefix` が付き（同じタグは一度だけ）、ネガティブは型の `negative_remove` を外して `negative_add` を足す。型の語は特徴だけで、作家名・作品名は書かない（テストが見る）。`node tools/gen_portraits.mjs --dry --type ojisan` でその型の男だけのプロンプトを確かめ、`--type ojisan --force` でその型だけ作り直せる（`--only`・`--variants` と重ねられる）。

**主要人物を似せない（A7）**：持ち主の決まりは「モブや兄弟ならいいけど、主要人物であんまり似たような顔にしないで」。人物を足すとき、主要人物（[portraits.json](portraits.json) の `people`・`hero` 以外）は**髪の色・髪型・目の色・印（眼鏡・眼帯・帽子・傷など）をほかの人と被らせない**。設定に書かれた見た目は残し、書かれていない所で差をつける。`node tools/portraits_similar.mjs` で似すぎの組・近い組・偏り（性別・年齢帯・髪の色・長さ・体格がそろった人の群れ）を確かめる（`node tools/portraits_similar.mjs <id>` でその人に近い順）。似すぎ（点が高い組か、同じ性別・同じ色と長さの髪で年の近い「髪の双子」。獣の耳・顔を覆う物・眼帯・翼・眼鏡・帽子が片方にだけあれば双子にしない）か、3 人以上の偏りがあると `tests/checks/a7_similar.mjs` が失敗する。血縁は行に `"kin": "<家>"` を付ければ比べない（今は `leonest`・`nordia`）。髪や目の色に新しい語を使ったら、道具の `HAIR`・`EYE` に足す（読めない色もテストが失敗にする）。

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
- 数の上限：画像は HTML の外のファイルになった（#192）が、Artifact は 1 つの版で **511 ファイル**まで（`tests/checks/a6_site.mjs`）。今の絵は 247 枚（基本 171・喜怒哀楽 76）。一覧の差分を全部（69 人・513 枚）作ると 700 枚近くになり超える。**作る順は 仲間（22 人）→ 王家・帝国・共和国の中核 → 使徒 → ほかのキャラメモの人**にし、合計が 500 枚ほどになったら止める（絵の無い表情は落とし先に落ちるので、止めても遊べる）。
- ゲームは出来事・結果・会話・掛け合いの `mood`（例：`mood: "shy"`）か、文から推した表情を出す（`src/data/v11_moods.js`・`src/engine/v8_moods_v11.js`・`src/ui/v8_moods_v11.js`）。

## 魔物の絵（V6）

- 一覧は [monsters.md](monsters.md)（元は [monsters.json](monsters.json)。名前は敵のデータから取るので、敵の名前が変わったら `node tools/monsters.mjs` で作り直す）。人物の一覧に載っている人の姿の敵（コノハ・ベルナなど）は人物の側に任せる。
- 設定は人物と別の [style_monsters.json](style_monsters.json)（最初は人物と同じモデル・同じ絵柄。後置きは `no humans, monster, creature, …, white background`）。手元だけで変えるなら `docs/art/style_monsters.local.json`。人の姿の敵（一覧の `human: true`）は `human` の後置き・ネガティブに替わる。
- 作る：`node tools/gen_portraits.mjs --monsters --dry --only goblin,slime` でプロンプトを確かめ、`node tools/gen_portraits.mjs --monsters --only goblin,slime` で作る（引数なしなら、まだ画像の無い魔物をすべて）。`--force`・`--keep`・`--new-seed` も人物と同じ。1024×1024 で作り、512×512 の webp に縮めて `assets/monsters/<id>.webp` に置く。
- ゲームは戦闘でその敵を画像で描き（`src/ui/v6_monsters.js`）、白い背景は縁から消して周りをぼかす。画像の無い敵は何も描かない（A10）。予備の埋め込み（12MB）は人物と魔物を合わせて数えるので、魔物は 1 枚 60KB 以下を目安に。

## 異形と、人の姿の使徒（V7）

- 魔物は基本 [style_monsters.json](style_monsters.json)（人物と同じモデル）。ゴブリン・スライム・獣・亜人・まぬけな魔物はこれでよい。
- **異形の設定（style_eldritch.json・dreamshaperXL_lightningDPMSDE）は使わない**（持ち主の決定：絵柄が浮く）。人の形を持たない格上の存在も、一般の魔物と同じ style_monsters.json で作り、異様さは魔物の一覧のタグ（形・色・質感）で出す。monsters.json に `"style": "eldritch"` を書かない（`tests/checks/a7_no_eldritch.mjs` が見る）。
- **人の姿の使徒**（[portraits.json](portraits.json) のカルマトス・ドレイゼ・ユヴァリエ・ベリエラ・セグリトス・ヴァルグレア・ディエラン・ベルファス）は、モデルを替えずに**特徴のタグで異質さ**を出す（人ではない目・輪郭の歪み・まとう気配・ずれた意匠・表情）。一人ずつ伝承に合わせて選んでいる。`no halo` と衝突する `halo` は使わない。

## 背景の絵（A11）

- 一覧は [scenes.md](scenes.md)（元は [scenes.json](scenes.json)。場所の名前・地方はデータから取るので、場所が増えたり名前が変わったら `node tools/scenes.mjs`）。場所ごと（町・荒野・迷宮の外。46）＋施設の中（宿屋・酒場・商店・ギルド・教会・訓練場・裏路地・王城・学院と町ごとの施設。14）＋迷宮の中（汎用の通路と洞窟、迷宮ごと。12）の 72 枚。タグは建物・地形など**季節・天候・時間帯に依らない見た目だけ**。
- 設定は人物と別の [style_scenes.json](style_scenes.json)。モデルは人物と同じ waiIllustriousSDXL（dreamshaperXL は使わない）。後置きは `scenery, no humans, landscape, wide shot, detailed background`（室内は `indoors`）、ネガティブに `1girl, 1boy, people, person, character, text, watermark` など。屋外は昼・晴れで作る（一覧の `sky` が night・red の場所だけ、その空で作る）。1344×768 で作り、1232×704 の webp に縮めて `assets/scenes/<id>.webp` に置く（1 枚 150KB 以下。超えたら道具が質を下げて縮め直す）。手元だけで変えるなら `docs/art/style_scenes.local.json`。
- **2 案**：`variants` の `plain`（絵師タグなし。背景らしさを優先）と `artist`（立ち絵の絵師タグを使い回す。立ち絵と並べて浮かない）。`variant` が使う案（最初は plain）。案に足してよいのは人物の設定にある語だけ（作家名・作品名を新しく書き足さない。`tests/checks/a11_scenes.mjs` が見る）。
- ゲームは画像があれば canvas の背景の代わりに出し（`src/ui/scene_v3_photo.js`）、時間帯・季節・天候は画像の上に色味（朝の暖色・夕方の赤み・夜の暗さ・冬の白さ・雨の灰色・霧）と、今の雨・雪・霧・花びらの粒を重ねる。画像が無い・読めない・読み込み中は今の canvas の背景。
- 1 つの版は 511 ファイルまでなので、ビルドは背景を一覧の `pack`（組）ごとに 8 枚までずつ 1 つのスプライト（`scenes/<組>.svg`）にまとめる（全部作っても 11 ファイル）。画像セッションは 1 枚 1 ファイル（`assets/scenes/<id>.webp`）で作ればよい。

### 持ち主のパソコンで作る（人物と同じ決まり）

**音量ミキサー・音声デバイス・ほかのアプリには触らない**（人物と同じ。止めてよいのは画像生成のために自分で立ち上げた WebUI と自分の node だけ）。WebUI を `--api` で起動し、cwebp を入れておくのも人物と同じ。

1. **試しの 5 枚**：`node tools/gen_scenes.mjs --trial --dry` でプロンプトを確かめ、`node tools/gen_scenes.mjs --trial` で作る。5 枚（町 `karna`・港 `nerva`・森 `forest`・酒場の中 `in_tavern`・遺構の中 `in_ruins`）を **2 案の両方**で作り、`docs/art/scenes_trial/<id>.<案>.webp` に並べる（ゲームには出ない）。設定の `variant` の案の絵は `assets/scenes/<id>.webp` にも置く（ゲームで見られる）。push して、持ち主に絵柄と案を選んでもらう。
2. 持ち主が案を選んだら `style_scenes.json` の `variant` をその案にする（plain のままなら変えない）。選んだ案が今の `variant` と違えば `node tools/gen_scenes.mjs --trial --variant <案>` で試しの 5 枚を置き直す。
3. **残り**：`node tools/gen_scenes.mjs` で、まだ画像の無い背景をすべて作る（`--only karna,nerva` でその背景だけ）。
4. 絵を**1 枚ずつ見る**（`assets/scenes/`）。
   - **人が写っていたら作り直す**（遠くの小さな人影・窓の中の人・像や絵の中の顔に見える物も数える）。`node tools/gen_scenes.mjs --only <id> --force --new-seed`。
   - 文字・看板の読める字・透かしが入っていたら作り直す。
   - 気に入った絵は `node tools/gen_scenes.mjs --keep <id>` で seed を一覧に残す。
5. **30〜50 枚ごとに push**（`assets/scenes/` と、`--keep` したなら `docs/art/scenes.json`・`scenes.md`）。`node tools/build.mjs && node tests/run.mjs` で大きさと数を確かめられる。
