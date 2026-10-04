# 公開のしかた（claude.ai の Artifact）

立ち絵・差分・魔物の絵を HTML に埋め込むと 1 ページの上限を超えるので（#186）、**ページ（HTML）と画像を別のファイルにして、一つの Artifact に載せる**。
コードと CSS は今まで通り 1 枚の HTML に入っていて、画像だけが隣のフォルダにある。HTML は画像を相対パス（`portraits/nora.webp` など）で読む。

## 作る
```
node tools/build.mjs && node tests/run.mjs
```
`dist/site/` ができる。

| ファイル | 中身 |
|---|---|
| `dist/site/index.html` | ページ（コード・CSS・画像の一覧（鍵 → 相対パス・バイト数）。画像そのものは入っていない） |
| `dist/site/portraits/<id>.webp`・`dist/site/monsters/<id>.webp` | 画像（`assets/` の写し） |
| `dist/site/portraits/<id>.moods.svg` | 表情の差分のスプライト（その人の `assets/portraits/<id>_<表情>.webp` を 1 枚にまとめたもの。下の「差分のまとめ方」） |
| `dist/site/scenes/<組>.svg` | 背景の絵のスプライト（`assets/scenes/<id>.webp` を一覧 `docs/art/scenes.json` の組ごとに 8 枚までずつ 1 枚にまとめたもの。A11。1 枚だけの組は `scenes/<id>.webp` のまま） |
| `dist/site/files.json` | 載せる画像の一覧（公開パス → リポジトリの根からのローカルパス）。Artifact の `files` にそのまま渡す |
| `dist/site/files-1.json`・`files-2.json`… | 1 回の公開に収まらないときだけ。回ごとの一覧（下の「分けて載せる」） |

- 手元で遊ぶときは `dist/site/index.html` をブラウザで直接開いてもよい（file://）。画像も出る。ただし file:// では魔物の絵の白い背景を消せない（ブラウザの決まりで画素を読めないため）。きちんと見るなら `npx http-server dist/site` などのローカルサーバで開く。
- 外のファイルの形で遊べるかは `node tools/check_site.mjs`（Playwright。ローカルサーバと file:// で開き、立ち絵・差分・魔物の絵が出るかを見る）。
- 予備として、画像を埋め込んだ 1 枚の HTML も作れる：`node tools/build.mjs --embed` → `dist/morsveld.html`。上限（12MB）を超えるなら差分を省いて基本の絵だけにする。

## 載せる（Claude に頼む）

claude.ai/code のセッションで、このリポジトリを開いて「`dist/site` を Artifact に公開して」と頼む。Claude は Artifact ツールで次のように載せる。

1. `node tools/build.mjs` で作る（ビルドの最後に、合計の大きさと、何回に分けるかが出る）。
2. **ページ**は `file_path: "dist/site/index.html"`、**画像**は `files` に `dist/site/files.json` の中身（`{ "portraits/nora.webp": "dist/site/portraits/nora.webp", … }`）を渡して publish する。
   - 前に公開した Artifact を新しくするときは、その `url` を付ける（リンクが変わらない）。前の 1 枚の HTML（`dist/morsveld.html`）の Artifact に載せ替えてもよい。
   - アイコンは最初の公開のときだけ（例：`icon: "game"`）。
3. 公開した Artifact を開き、立ち絵と戦闘の魔物の絵が出るのを確かめる。

### 分けて載せる（ファイルが多い・大きいとき）

1 回の公開で送れるのは **255 ファイル・64MB まで**（ページも 1 つと数える）。ビルドは余裕を見て **250 ファイル・60MB** で分け、`files-1.json`・`files-2.json`… を書く。

1. 1 回目：`file_path: "dist/site/index.html"` と `files` に `files-1.json` の中身で publish する（新しい Artifact なら、ここで `url` ができる）。
2. 2 回目から：**同じ `url`** に、`file_path: "dist/site/index.html"` と `files` に `files-2.json` の中身で publish する。前の回のファイルは残り、新しいファイルが足される。
3. 最後の回まで続ける。途中でやめると、まだ載っていない画像の人・魔物は絵が出ない（読めない画像は絵を出さないだけなので、壊れはしない。A10）。

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
- 差分のまとめ方（A8）：1 つの版は 511 ファイルまでなので、外のファイルの形では、差分（`<id>_<表情>`）が 2 枚以上ある人の差分を 1 人 1 枚のスプライト `portraits/<id>.moods.svg` にまとめる（基本の絵 `<id>.webp` はよく使うので 1 枚のまま）。
  中身は SVG で、元の webp を data URI のまま升目（正方形に近い格子・512×640 なら 4 枚で 2×2）に並べたもの。描き直さないので画質は変わらず、Node だけで作れる（`cwebp` などは要らない。CI でも動く）。代わりに差分のバイト数は base64 の分（約 1.34 倍）増える。
  HTML の一覧では差分の鍵の値が `portraits/<id>.moods.svg#xywh=x,y,w,h`（切り出す場所）になり、`src/ui/v4_assets.js` がスプライトを一度だけ読んで、その升目を切り出して描く。
  表情の名前は V8 の喜怒哀楽と `docs/art/moods.json`（V11）から取る。画像セッションは今まで通り 1 表情 1 ファイル（`assets/portraits/<id>_<表情>.webp`）で作ればよい。予備の埋め込み（`--embed`）はまとめない（data URI のまま）。
  数の目安：今は差分 76 枚 → 19 枚で、合計 248 → 191 ファイル。仲間 50 人を足して主要な 60 人に差分 700 枚を作っても、基本の絵 250・魔物 120 とで 431 ファイル（まとめないと 1071）。
- 背景のまとめ方（A11）：背景の絵（`assets/scenes/<id>.webp`）は、一覧（`docs/art/scenes.json`）の `pack`（組）ごとに 8 枚までずつ `scenes/<組>.svg` にまとめる（升目は 2 列。1232×704 が 8 枚で 2464×2816）。値は差分と同じ「公開パス#xywh=…」で、`src/ui/scene_v3_photo.js` がスプライトを一度だけ読んで升目を切り出し、canvas の背景の代わりに敷く。72 枚を全部作っても 11 ファイル（`tests/checks/a11_scenes.mjs` が今のファイル数と合わせて 511 に収まるかを見る）。予備の埋め込み（`--embed`）が上限を超えるときは、差分の次に背景を省く（canvas の背景になる）。
- `src/ui/v4_assets.js`：人物の絵。外のファイルは読み終わるまで枠を空けておき、読めたら画像を描く。無い人・読めない画像は絵を出さない（A10。canvas の人物の絵はやめた）。主人公は絵なし。仲間・話している人とその差分は描く前に先読みし、名のある人の基本の絵は暇なときに少しずつ読む（`G.v4Preload`）。
- `src/ui/v8_moods.js`：表情の差分は、読み終わってから顔を入れ替える（それまでは前の顔のまま）。PC の配置（V9）では、話している人の顔に表情を付ける。
- `src/ui/v6_monsters.js`：魔物の絵は起動の少しあとにまとめて先読みする。
