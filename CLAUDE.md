# Morsveld 開発メモ

ブラウザで遊ぶ一人用の TRPG 風ゲーム。HTML・CSS・素の JavaScript だけで作り、`tools/build.mjs` で1枚の HTML（`dist/morsveld.html`）にまとめる。
遊ぶ場所は claude.ai の Artifact（持ち主が `dist/morsveld.html` を公開する）。ゲームの方向性は [docs/VISION.md](docs/VISION.md)、並行作業の分け方は [docs/ROADMAP.md](docs/ROADMAP.md)。

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
| `src/engine/parser.js` | 自由入力の読み取り（トークンを使わない） | C |
| `src/engine/gm.js` | GM（Claude）に任せる自由行動（任意） | C |
| `src/ui/scene.js` | 背景の絵（canvas） | A |
| `src/ui/art_monsters.js` | モンスターの絵（部品の組み合わせ。敵のデータの `look` で指定できる） | A |
| `assets/`・`src/ui/v4_assets.js` | 持ち主が作った画像（ビルドで HTML に埋め込む。`tools/assets.mjs`。描く物の一覧は `docs/art/portraits.md`） | A |
| `src/ui/ui.js`, `src/ui/setup.js`, `src/main.js`, `src/style.css`, `src/index.html` | 画面 | U |
| `src/manifest.json` | 読み込む順番（順番を決めたいファイルだけ。無いものは `tools/files.mjs` が自動で足す） | 追記だけ |

## 決まり
- **普段の遊びで Claude を呼ばない。** 判定・戦闘・出来事はすべてゲームのデータとルールで動かす。Claude を使うのは、プレイヤーが自由入力で「GM に任せる」を選んだときだけ。
- エンジン（`src/data`・`src/engine`）は DOM に触らない。画面は `G.S` を読んで描く。テストは DOM なしでエンジンを動かす。
- 乱数は必ず `G.rand` / `G.d` / `G.dice` / `G.pick` を使う（テストで固定できるように）。`src/ui/setup.js` の作成画面だけは例外。
- **新しい内容は、なるべく新しいファイルに書く。`src/data/`・`src/engine/`・`src/ui/` に置けば自動で読まれるので、`src/manifest.json` は編集しない。** manifest に書いたファイルを順に読んだあと、書いていない `.js` を data → engine → ui、名前順で足し、`main.js` は必ず最後（`tools/files.mjs`）。順番がどうしても効くときだけ manifest に書く（書いても二重には読まない）。例：出来事を足すなら `src/data/events_<名前>.js` を作り、中で `G.data.EVENTS.push(...)`。敵なら `Object.assign(G.data.ENEMIES, {...})`。既存の大きなファイルを並行して書き換えると衝突する。
- 外から読み込まない（Artifact の制約。フォントだけ Google Fonts）。絵は canvas で描く。持ち主が作った画像は `assets/` に置けば HTML に埋め込まれる（`docs/art/`）。
- 性的な描写は直接書かない。残酷さ・下品な笑いはよいが、ほのめかしと場面転換で済ませる。
- 文章は日本語。地の文は二人称（あなた）か三人称。ゲームの用語は `docs/VISION.md` の用語集に合わせる。
- セーブの形（`G.S`）に項目を足すときは、古いセーブで項目が無くても動くように書く（`S.foo || 既定値`）。
- `.github/workflows/` の Actions はコミットの SHA で固定する。`pull_request_target` は使わない。

## 並行作業（配り役）
- 配り役は `/dispatcher`（`.claude/skills/dispatcher/`）。子は `docs/ROADMAP.md` を読むだけにし、チェックは編集しない。
- main の取り込みは merge で行う（rebase・force-push はしない）。
