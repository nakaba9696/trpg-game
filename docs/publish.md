# 公開のしかた（claude.ai の Artifact）

立ち絵・差分・魔物の絵を HTML に埋め込むと 1 ページの上限を超えるので（#186）、**ページ（HTML）と画像を別のファイルにして、一つの Artifact に載せる**。
CSS は HTML に入っていて、コード（JS）はページの隣の `game.js`、画像は隣のフォルダにある（コードを分けると、ブラウザが裏で読んでくれるので起動のあいだ画面が固まらない。2 回目からは覚えた結果を使う。T）。HTML は画像を相対パス（`portraits/packs/people-1.svg#xywh=…` などのスプライトの升目）で読む。

## 作る
```
node tools/build.mjs && node tests/run.mjs
```
`dist/site/` ができる。

| ファイル | 中身 |
|---|---|
| `dist/site/index.html` | ページ（CSS と、`game.js` を読む 1 行。`node tools/build.mjs --inline` なら今まで通りコードも中に入る） |
| `dist/site/game.js` | コード（画像の一覧（鍵 → 相対パス・バイト数）も入っている。画像そのものは入っていない）。最初の回の公開（`files-1.json`）に入る |
| `dist/site/game-2.js` … | コードが 10MB を超えたときの続き（ソースのファイルの境目で分ける。Artifact の 1 ファイル 15MB の上限のため）。`index.html` が `game.js` のあとに順に読む。`files.json` に入っているので、`game.js` と同じように載せる |
| `dist/site/portraits/packs/people-<n>.svg`・`kinds-<n>.svg` | 基本の立ち絵のスプライト（`assets/portraits/<id>.webp` を 25 枚ずつ 1 枚にまとめたもの。名のある人は `docs/art/portraits.json` の順、型 `kind_*` は名前順。A12。下の「立ち絵と魔物の絵のまとめ方」） |
| `dist/site/monsters/packs/monsters-<n>.svg` | 魔物の絵のスプライト（`assets/monsters/<id>.webp` を `docs/art/monsters.json` の順に 25 枚ずつ。A12） |
| `dist/site/portraits/<id>.webp`・`dist/site/monsters/<id>.webp` | 大きさがほかと違うなど、まとめられなかった絵だけ（`assets/` の写し） |
| `dist/site/portraits/<id>.moods.svg` | 表情の差分のスプライト（その人の `assets/portraits/<id>_<表情>.webp` を 1 枚にまとめたもの。下の「差分のまとめ方」） |
| `dist/site/scenes/<組>.svg` | 背景の絵のスプライト（`assets/scenes/<id>.webp` を一覧 `docs/art/scenes.json` の組ごとに 8 枚までずつ 1 枚にまとめたもの。A11。1 枚だけの組は `scenes/<id>.webp` のまま） |
| `dist/site/sounds/<名前>_<何か>.ogg`（webm・mp3） | 録音した効果音（`assets/sounds/` の写し。置いたときだけ。下の「音のファイル」） |
| `dist/site/music/<場面>.ogg`（webm・mp3） | 曲のファイル（`assets/music/` の写し。置いたときだけ。下の「曲のファイル」） |
| `dist/site/files.json` | 載せる画像の一覧（公開パス → リポジトリの根からのローカルパス）。Artifact の `files` にそのまま渡す |
| `dist/site/files-1.json`・`files-2.json`… | 1 回の公開に収まらないときだけ。回ごとの一覧（下の「分けて載せる」） |
| `dist/site/gone-1.json`・`gone-2.json`… | A12 より前に載せた Artifact を新しくするときだけ使う。1 枚ずつ載せていた基本の立ち絵・魔物の絵（今はスプライトの中）を消す一覧（公開パス → `null`。下の「A12 の載せ替え」） |

- 手元で遊ぶときは `dist/site/index.html` をブラウザで直接開いてもよい（file://）。画像も出る。ただし file:// では魔物の絵の白い背景を消せない（ブラウザの決まりで画素を読めないため）。きちんと見るなら `npx http-server dist/site` などのローカルサーバで開く。
- 外のファイルの形で遊べるかは `node tools/check_site.mjs`（Playwright。ローカルサーバと file:// で開き、立ち絵・差分・魔物の絵が出るかを見る）。
- 予備として、画像を埋め込んだ 1 枚の HTML も作れる：`node tools/build.mjs --embed` → `dist/morsveld.html`。上限（12MB）を超えるなら差分を省いて基本の絵だけにする。

## 載せる（Claude に頼む）

claude.ai/code のセッションで、このリポジトリを開いて「`dist/site` を Artifact に公開して」と頼む。Claude は Artifact ツールで次のように載せる。

1. `node tools/build.mjs` で作る（ビルドの最後に、合計の大きさと、何回に分けるかが出る）。
2. **ページ**は `file_path: "dist/site/index.html"`、**コードと画像**は `files` に `dist/site/files.json` の中身（`{ "game.js": "dist/site/game.js", "portraits/packs/people-1.svg": "dist/site/portraits/packs/people-1.svg", … }`）を渡して publish する。`game.js` が載っていないと、ページは開いても遊べない（何も出ない）。
   - 前に公開した Artifact を新しくするときは、その `url` を付ける（リンクが変わらない）。前の 1 枚の HTML（`dist/morsveld.html`）の Artifact に載せ替えてもよい。
   - アイコンは最初の公開のときだけ（例：`icon: "game"`）。
3. 公開した Artifact を開き、立ち絵と戦闘の魔物の絵が出るのを確かめる。

### 分けて載せる（ファイルが多い・大きいとき）

1 回の公開で送れるのは **255 ファイル・64MB まで**（ページも 1 つと数える）。ビルドは余裕を見て **250 ファイル・60MB** で分け、`files-1.json`・`files-2.json`… を書く。

1. 1 回目：`file_path: "dist/site/index.html"` と `files` に `files-1.json` の中身で publish する（新しい Artifact なら、ここで `url` ができる）。
2. 2 回目から：**同じ `url`** に、`file_path: "dist/site/index.html"` と `files` に `files-2.json` の中身で publish する。前の回のファイルは残り、新しいファイルが足される。
3. 最後の回まで続ける。途中でやめると、まだ載っていない画像の人・魔物は絵が出ない（読めない画像は絵を出さないだけなので、壊れはしない。A10）。

### A12 の載せ替え（前の Artifact を新しくするとき、一度だけ）

A12 より前は、基本の立ち絵（175 枚）と魔物の絵（199 枚）を 1 枚ずつ載せていた（合計 507 ファイル）。そのまま新しいスプライト（16 ファイル）を足すと、1 つの版の 511 ファイルを超えて載らない。**先に古い 1 枚ずつのファイルを消す。**

1. Artifact ツールで `action: "list"`・`scope: "files"`・その `url` でファイルの一覧を見る（消すファイルは、見たことのあるものでないと消せない）。
2. **同じ `url`** に、`file_path: "dist/site/index.html"` と `files` に `gone-1.json` の中身（`{ "monsters/goblin.webp": null, … }`）で publish する。`gone-2.json` があれば同じように続ける。このあいだ、絵は一時的に出ない（読めない画像は絵を出さないだけ。A10）。
3. ふつうに `files-1.json`・`files-2.json`… で publish する。

新しい Artifact に載せるときは `gone-N.json` は使わない。

### 消した画像

公開で渡さなかったファイルは前のまま残る。`assets/` から消した画像を Artifact からも消すなら、その公開パスを `null` にして渡す（例：`{ "portraits/old.webp": null }`）。残っていても遊びには響かない（ページの一覧に無い画像は読みに行かない）が、下の「1 つの版で 511 ファイル」に数えられる。

A10 で主人公の型の絵（10 枚）は、名もない人の二枚目の型 `portraits/kind_<種類>_<m|f>_b.webp` に名前を替えた（表は [art/a10_map.md](art/a10_map.md)）。前に載せた Artifact を新しくするときは、古い名前の次の 10 個を `null` にして渡すと、ファイル数が増えない：`portraits/hero_merc_m.webp`・`portraits/hero_merc_f.webp`・`portraits/hero_thief_m.webp`・`portraits/hero_thief_f.webp`・`portraits/hero_mage_m.webp`・`portraits/hero_mage_f.webp`・`portraits/hero_priest_m.webp`・`portraits/hero_priest_f.webp`・`portraits/hero_samurai_m.webp`・`portraits/hero_samurai_f.webp`。

## 大きさの決まり

| 決まり | Artifact の上限 | 確かめるところ |
|---|---|---|
| ページ（index.html） | 16MB | ビルドが止まる・`tests/checks/a6_site.mjs` |
| 画像 1 枚 | 15MB | 同上（ふつうは 1 枚 30〜80KB） |
| 1 つの版の合計 | 256MB・511 ファイル | 同上・`tests/checks/a8_sprites.mjs`（`files.json`＋ページが 511 の 9 割を超えたら NOTE、超えたら失敗） |
| 1 回の公開 | 255 ファイル・64MB | ビルドが `files-N.json` に分ける |

MB は余裕を見て 1000×1000 バイトで数える。予備の埋め込み（`--embed`）は画像の data URI の合計 12MB まで（`tools/assets.mjs` の `LIMIT`）。

## しくみ（開発する人へ）

- `tools/assets.mjs`：`assets/` を読む。`siteAssets`（外のファイル）と `collectAssets`（埋め込み。`shrink` で差分を省く）。どちらも `G.ASSETS["portraits/<id>"]` に Image の `src` にそのまま使える値（相対パスか data URI）を入れ、`G.ASSET_MODE` が `"files"` か `"embed"`。外のファイルの形では `G.ASSET_BYTES` にバイト数。
- `tools/site.mjs`：大きさの決まりと、何回に分けるか（`planSite`）。
- 差分のまとめ方（A8）：1 つの版は 511 ファイルまでなので、外のファイルの形では、差分（`<id>_<表情>`）が 2 枚以上ある人の差分を 1 人 1 枚のスプライト `portraits/<id>.moods.svg` にまとめる（A12 からは、基本の絵も下の「立ち絵と魔物の絵のまとめ方」で 25 枚ずつのスプライトに入る）。
  中身は SVG で、元の webp を data URI のまま升目（正方形に近い格子・512×640 なら 4 枚で 2×2）に並べたもの。描き直さないので画質は変わらず、Node だけで作れる（`cwebp` などは要らない。CI でも動く）。代わりに差分のバイト数は base64 の分（約 1.34 倍）増える。
  HTML の一覧では差分の鍵の値が `portraits/<id>.moods.svg#xywh=x,y,w,h`（切り出す場所）になり、`src/ui/v4_assets.js` がスプライトを一度だけ読んで、その升目を切り出して描く。
  表情の名前は V8 の喜怒哀楽と `docs/art/moods.json`（V11）から取る。画像セッションは今まで通り 1 表情 1 ファイル（`assets/portraits/<id>_<表情>.webp`）で作ればよい。予備の埋め込み（`--embed`）はまとめない（data URI のまま）。
  数の目安：今は差分 76 枚 → 19 枚で、合計 248 → 191 ファイル。仲間 50 人を足して主要な 60 人に差分 700 枚を作っても、基本の絵 250・魔物 120 とで 431 ファイル（まとめないと 1071）。
- 背景のまとめ方（A11）：背景の絵（`assets/scenes/<id>.webp`）は、一覧（`docs/art/scenes.json`）の `pack`（組）ごとに 8 枚までずつ `scenes/<組>.svg` にまとめる（升目は 2 列。1232×704 が 8 枚で 2464×2816）。値は差分と同じ「公開パス#xywh=…」で、`src/ui/scene_v3_photo.js` がスプライトを一度だけ読んで升目を切り出し、canvas の背景の代わりに敷く。72 枚を全部作っても 11 ファイル（`tests/checks/a11_scenes.mjs` が今のファイル数と合わせて 511 に収まるかを見る）。予備の埋め込み（`--embed`）が上限を超えるときは、差分の次に背景を省く（canvas の背景になる）。
- 立ち絵と魔物の絵のまとめ方（A12）：1 つの版は 511 ファイルまでで、A11 までで 507 ファイルになり絵を足せなくなったので、外のファイルの形では**基本の立ち絵と魔物の絵も 25 枚ずつ**スプライトにまとめる（`tools/assets.mjs` の `artChunks`・`ART_PACK`）。升目は 5 列（512×640 が 25 枚で 2560×3200、512×512 なら 2560×2560。表情のスプライトの 5×5 と同じくらい）。1 枚 0.6〜1MB ほど。
  組み方：名のある人は `portraits/packs/people-<n>.svg`（`docs/art/portraits.json` の順なので、同じ組の人が同じファイルに入りやすい）、名もない人の型は `portraits/packs/kinds-<n>.svg`（名前順なので同じ種類の型が近い）、魔物は `monsters/packs/monsters-<n>.svg`（`docs/art/monsters.json` の順）。表情のスプライトにならなかった差分（1 人 1 枚だけ）は、その人の基本の絵のすぐ後ろに入る。大きさがほかと違う絵は 1 枚のまま。
  値は差分・背景と同じ「公開パス#xywh=…」。`src/ui/v4_assets.js`（立ち絵）と `src/ui/v6_monsters.js`（戦闘・図鑑の魔物、人の姿の敵）が、同じファイルは一度だけ読み、升目を切り出して描く。画像セッションは今まで通り 1 枚 1 ファイル（`assets/portraits/<id>.webp`・`assets/monsters/<id>.webp`）で作ればよい。
  数：507 → 145 ファイル（表情 117・立ち絵 8・魔物 8・背景 11・ページ 1）。`tests/checks/a12_sprites.mjs` が、150 を超えたら NOTE、200 を超えたら失敗にし、すべての絵の鍵がスプライトの升目に当たり、升目が画像の中にあるかを見る。予備の埋め込み（`--embed`）はまとめない（data URI のまま）。
- `src/ui/v4_assets.js`：人物の絵。外のファイルは読み終わるまで枠を空けておき、読めたら画像を描く。無い人・読めない画像は絵を出さない（A10。canvas の人物の絵はやめた）。主人公は絵なし。仲間・話している人とその差分は描く前に先読みし、名のある人の基本の絵は暇なときに少しずつ読む（`G.v4Preload`）。
- 白い背景の消し方（A13・A14）：人物の絵も魔物の絵も白い無地の背景で作るので、`src/ui/a13_cutout.js`（`G.a13.keyOut`）が描く前に一度だけ背景を消して透明にする（同じ鍵は覚えておく。仲間・話している人とその差分は先読みのあと暇なときに処理）。**消すのは絵の外周からつながった、縁の色（白に近い升）にごく近い所だけ**で、線画に囲まれた白（白い魔物の体・毛皮・白い服・白髪・白目・歯・光の反射、耳と髪のあいだの背景も）は残す（A14：迷うなら消さない。A13 の「囲まれた白も消す」と、魔物の「大きな白も消す」はやめた）。境目の 3px は 0/1 で切らず、その画素の色が背景の色とすぐ内側の絵の色（線画があれば線画）のどこにあるかで半透明にし、白と混ざった分を取り除いて色を戻す（ソフトマット・色のにじみ抜き）。内側ほど透けない（線画のすぐ内側の白が透けて穴にならない）。描くときは `G.a13.draw` が imageSmoothingQuality high で、半分より小さく縮めるときは半分ずつ段階的に縮める。立ち絵は消せた canvas に `cut` の印が付き、`src/ui/a13_cutout.css` が足元だけを溶かす。魔物（`v6_monsters.js`）は下の縁からも消す。file:// では画素を読めないので元の絵のまま。白い背景でない絵（隅が白くない）も元の絵のまま。確かめは `tests/checks/a13_cutout.mjs`・`a14_matte.mjs`（実際の絵を縮めた `tests/fixtures/a14/*.png` で、白い体や服が残り、穴が空かず、境目が半透明か）。
- 囲まれた背景も消した絵（A20）：keyOut は外周とつながった白しか確実には消さないので、髪のすき間・腕と胴のあいだ・武器と体のあいだの白が残る。白い背景の絵は `tools/a20/a20_gaps.py`（Python 3・numpy・scipy・Pillow と node）で、ゲームの keyOut を先にかけた結果に、さらに「背景の色ちょうどで平らな、線画に囲まれた塊」を消した透明つきの webp に置き換えてある（比べる背景の色は、外の背景の色をぼかして広げた「その場所の背景の色」。魔物は足もとが下の縁に付くので keyOut に bottom、股や腕の間の大きな塊は外から離れていても抜く。境目の 2px は半透明で白を抜く。目の光・歯・白目・白い服・白い髪・白い毛皮・色白の肌は残す。自動で見分けられない人は `tools/a20/overrides.json` に「残す四角」を書く。差分にも効く）。透明を持つ絵は keyOut がそのまま使う。置き換えた絵の一覧は `docs/art/a20_gaps.json`、確かめの一覧画像は `docs/review/a20/`、確かめは `tests/checks/a20_gaps.mjs`。新しく白い背景の絵を入れたら `python3 tools/a20/a20_gaps.py` をもう一度動かす（すでに透明な絵は飛ばす）。予備の埋め込み（`--embed`）は透明な絵で大きくなるので、上限を超えるなら差分 → 背景 → 大きい絵の順に省く（省いた絵は予備の HTML では絵なし。本番の dist/site では全部出る）。
- `src/ui/v8_moods.js`：表情の差分は、読み終わってから顔を入れ替える（それまでは前の顔のまま）。PC の配置（V9）では、話している人の顔に表情を付ける。
- 音のファイル（S3）：効果音は Web Audio でその場で合成するが、`assets/sounds/<名前>.ogg`・`<名前>_1.ogg`…（webm・mp3 も可。同じ名前なら mp3）を置くと、画像と同じく別ファイルで載り、`G.ASSETS["sounds/<名前>_1"]` に相対パスが入る。`src/ui/sound.js` が最初のタップのあとに読み、いくつかあれば毎回一つ選んで鳴らす（高さと強さを少し揺らす）。無い・読めない（file:// など）ときは合成に戻る。今は 1 つも置いていない（ページの音は合成。`docs/sound/page_before.wav`・`page_after.wav` で聞き比べられる）。置くなら 1 つの版の 511 ファイルに数えられるので、1 つの音に 3〜4 個まで。音量は `G.sound.FILE_GAIN` で揃える。
- 曲のファイル（S4）：BGM は `src/data/s4_tracks.js` の作曲データを `src/ui/sound_bgm.js` が Web Audio でその場で合成して鳴らすが、`assets/music/<場面>.ogg`（または `<曲の id>.ogg`。webm・mp3 も可）を置くと、別ファイルで載り、`G.ASSETS["music/<場面>"]` に相対パスが入る。その場面に入ったとき読み、繰り返し鳴らす（ループの頭と終わりは自分でつなげておく）。無い・読めないときは合成の曲。場面の名前は `title town town_night tavern inn road dungeon abyss battle boss apostle death epilogue`。埋め込み（`--embed`）で上限を超えるときは、曲のファイルから先に省く。各曲の頭 20 秒は `docs/sound/bgm/<曲の id>.mp3` で聞ける（`node tools/bgm_render.mjs --out docs/sound/bgm 20` で作り直せる）。
- `src/ui/v6_monsters.js`：魔物の絵は起動の少しあとにまとめて先読みする。
