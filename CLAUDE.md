# Morsveld 開発メモ

ブラウザで遊ぶ一人用の TRPG 風ゲーム。HTML・CSS・素の JavaScript だけで作り、`tools/build.mjs` でページ（`dist/site/index.html`）とコード（`dist/site/game.js`。分けると起動が軽い）にまとめ、画像はその隣の別ファイル（`dist/site/portraits/` など）にする（`--embed` なら画像を埋め込んだ 1 枚の `dist/morsveld.html`）。
遊ぶ場所は claude.ai の Artifact（持ち主が `dist/site/` を「ページ＋画像の別ファイル」で公開する。[docs/publish.md](docs/publish.md)）。ゲームの方向性は [docs/VISION.md](docs/VISION.md)、並行作業の分け方は [docs/ROADMAP.md](docs/ROADMAP.md)。

## 検証（PR の前に必ず）
```
node tools/build.mjs && node tests/run.mjs
```
- `tests/run.mjs` はデータの整合（存在しない敵・アイテム・場所を指していないか）と、決まった乱数で 150 回ランダムに遊ぶテストを行う。
- 新しい仕組みを足したら確認を足す。`tests/checks/<id>.mjs` に置けば自動で読まれる（`export default ({ G, fail, ok, loadEngine, seeded }) => {...}`。例：`tests/checks/q3_autoload.mjs`）。新しいデータは整合チェックが自動で拾う。
- 見た目を変えたら、描画できる環境ならスクリーンショットを PR に載せる（クラウドでは省いてよい）。

## 構成
| 場所 | 中身 | レーン |
|---|---|---|
| `src/data/world.js` | 世界観（手引きと GM への説明） | D |
| `src/data/characters.js` | 能力値・職業・目的・人物設定の表 | C |
| `src/data/items.js` | アイテム | I |
| `src/data/enemies.js` | 敵 | E |
| `src/data/locations.js` | 場所と地図 | W |
| `src/data/events.js` | 出来事と噂 | V |
| `src/data/trophies.js` | トロフィー | T |
| `src/engine/core.js` | 状態・判定・成長・時間・出来事の結果・死と引退 | C |
| `src/engine/combat.js` | 戦闘 | B |
| `src/engine/explore.js` | 探索・旅・迷宮・施設・依頼・王城 | W / F |
| `src/engine/zzzzzzzz_c10.js`・`src/data/c10_*.js` | 状態（善悪・名声・評判・位・職業・仲間・持ち物）で現れる選択肢 | C＋V |
| `src/ui/scene.js` | 背景の絵（canvas） | A |
| `src/ui/art_monsters.js`・`src/ui/art_people.js` | 魔物・人物の入口（canvas では描かない。人物の「誰か」を決める表。A10） | A |
| `assets/`・`src/ui/v4_assets.js` | 持ち主が作った画像（ビルドで `dist/site/` に別ファイルとして置き、HTML から相対パスで読む。`tools/assets.mjs`・`tools/site.mjs`・[docs/publish.md](docs/publish.md)。描く物の一覧は `docs/art/portraits.md`） | A |
| `src/ui/ui.js`, `src/ui/setup.js`, `src/main.js`, `src/style.css`, `src/index.html` | 画面（`src/ui/*.css` は style.css のあとに名前順で足される。PC 向けの配置は `src/ui/v9_pc.*`（立ち絵・魔物の絵・キー）と、左上の状態・右上の道具・下の左のログ・下の右のコマンドの四つの窓に並べる `src/ui/zzzzz_u21_side.*`、スマホは同じ窓を縦長・横長に並べ直す `src/ui/zzzzz_u31_mobile.js`・`zzzzzzzz_u31_mobile.css`、図鑑の探す・絞る・並べ替えと読みやすい説明は `src/ui/zu24_codex_read.*`） | U |
| `src/manifest.json` | 読み込む順番（順番を決めたいファイルだけ。無いものは `tools/files.mjs` が自動で足す） | 追記だけ |

## 決まり
- **Claude を呼ばない。** 判定・戦闘・出来事はすべてゲームのデータとルールで動かす。自由入力は無く、行動はすべて選択肢から選ぶ。できることを増やすときは、状態で現れる選択肢を足す（`src/data/c10_choices*.js`）。
- エンジン（`src/data`・`src/engine`）は DOM に触らない。画面は `G.S` を読んで描く。テストは DOM なしでエンジンを動かす。
- 乱数は必ず `G.rand` / `G.d` / `G.dice` / `G.pick` を使う（テストで固定できるように）。`src/ui/setup.js` の作成画面だけは例外。
- **新しい内容は、なるべく新しいファイルに書く。`src/data/`・`src/engine/`・`src/ui/` に置けば自動で読まれるので、`src/manifest.json` は編集しない。** manifest に書いたファイルを順に読んだあと、書いていない `.js` を data → engine → ui、名前順で足し、`main.js` は必ず最後（`tools/files.mjs`）。順番がどうしても効くときだけ manifest に書く（書いても二重には読まない）。例：出来事を足すなら `src/data/events_<名前>.js` を作り、中で `G.data.EVENTS.push(...)`。敵なら `Object.assign(G.data.ENEMIES, {...})`。既存の大きなファイルを並行して書き換えると衝突する。
- 外から読み込まない（Artifact の制約。フォントだけ Google Fonts）。背景の絵は canvas で描く。人物と魔物は持ち主が作った画像だけ（`assets/` に置けば、同じ Artifact の別ファイルとして載り、HTML から相対パスで読まれる。`docs/art/`・`docs/publish.md`）。画像が無い・読めないときは絵を出さない（canvas の人物・魔物の絵に戻さない。A10）。主人公は立ち絵を出さない。
- **設定・世界観・人物の性格をねじ曲げない。** 出来事・物語・会話・仕組みを足すために、既にある設定（`src/data/world.js`・`docs/VISION.md`・人物や使徒・国のデータ）と食い違うことを書かない。根拠が無いなら、その形をやめて設定に合う形を選ぶ。出来事は「受動的（世界や人物の側から起きる。動く理由が設定にあるときだけ）」と「能動的（プレイヤーが探索・行動して初めて起きる）」に分けて考える。
- 性的な描写は直接書かない。残酷さ・下品な笑いはよいが、ほのめかしと場面転換で済ませる。
- 文章は日本語。地の文は二人称（あなた）か三人称。ゲームの用語は `docs/VISION.md` の用語集に合わせる。
- セーブの形（`G.S`）に項目を足すときは、古いセーブで項目が無くても動くように書く（`S.foo || 既定値`）。
- プレイヤーに見える変更を入れた PR は、`src/data/changelog.js` の「次の版」（`next: true`）の `items` にプレイヤー向けの一行を足す。版を上げる（`version.js` と一緒に）のは配り役。`CHANGELOG.md` は `node tools/changelog.mjs` で作り直す。
- `.github/workflows/` の Actions はコミットの SHA で固定する。`pull_request_target` は使わない。

## 並行作業（配り役）
- 配り役は `/dispatcher`（`.claude/skills/dispatcher/`）。子は `docs/ROADMAP.md` を読むだけにし、チェックは編集しない。
- main の取り込みは merge で行う（rebase・force-push はしない）。
