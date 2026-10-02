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
3. 最後の回まで続ける。途中でやめると、まだ載っていない画像の人は canvas の絵のまま（読めない画像は canvas の絵に戻るので、壊れはしない）。

### 消した画像

公開で渡さなかったファイルは前のまま残る。`assets/` から消した画像を Artifact からも消すなら、その公開パスを `null` にして渡す（例：`{ "portraits/old.webp": null }`）。残っていても遊びには響かない（ページの一覧に無い画像は読みに行かない）が、下の「1 つの版で 511 ファイル」に数えられる。

## 大きさの決まり

| 決まり | Artifact の上限 | 確かめるところ |
|---|---|---|
| ページ（index.html） | 16MB | ビルドが止まる・`tests/checks/a6_site.mjs` |
| 画像 1 枚 | 15MB | 同上（ふつうは 1 枚 30〜80KB） |
| 1 つの版の合計 | 256MB・511 ファイル | 同上（511 の 9 割を超えたらテストが知らせる） |
| 1 回の公開 | 255 ファイル・64MB | ビルドが `files-N.json` に分ける |

MB は余裕を見て 1000×1000 バイトで数える。予備の埋め込み（`--embed`）は画像の data URI の合計 12MB まで（`tools/assets.mjs` の `LIMIT`）。

## しくみ（開発する人へ）

- `tools/assets.mjs`：`assets/` を読む。`siteAssets`（外のファイル）と `collectAssets`（埋め込み。`shrink` で差分を省く）。どちらも `G.ASSETS["portraits/<id>"]` に Image の `src` にそのまま使える値（相対パスか data URI）を入れ、`G.ASSET_MODE` が `"files"` か `"embed"`。外のファイルの形では `G.ASSET_BYTES` にバイト数。
- `tools/site.mjs`：大きさの決まりと、何回に分けるか（`planSite`）。
- `src/ui/v4_assets.js`：人物の絵。外のファイルは少し（160 ミリ秒）待ってから canvas の絵を出し、読めたら画像に替える（すぐ読めればちらつかない）。主人公・仲間・話している人とその差分は描く前に先読みし、名のある人の基本の絵は暇なときに少しずつ読む（`G.v4Preload`）。
- `src/ui/v8_moods.js`：表情の差分は、読み終わってから顔を入れ替える（それまでは前の顔のまま）。
- `src/ui/v6_monsters.js`：魔物の絵は起動の少しあとにまとめて先読みする。
