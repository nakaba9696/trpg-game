# ゲーム制作スターターキット

Claude Code で並行してゲームを作る進め方を、新しいゲームですぐ使えるようにまとめたもの。ジャンルも制作ツール（ツクール・Unity・Godot・HTML など）も問わない。

## 中身

| 場所 | 中身 |
|---|---|
| `KNOWHOW.md` | ノウハウ全部 |
| `TRANSPARENT_IMAGES.md` | 背景透過の立ち絵・魔物の絵を作るノウハウ（失敗したやり方・作り方・確かめ方） |
| `tools/check_alpha.py` | 透過の絵を確かめる道具（表情違いとの透け方・形のずれ、白い背景のままの絵、暗い地・マゼンタの地の一覧画像） |
| `.claude/skills/dispatcher/` | 配り役の手順書（`SKILL.md`）と、その付録（`references/`） |
| `.claude/skills/grill-me`・`grilling`・`handoff`・`to-questionnaire`・`writing-for-agents` | 同梱した外部のスキル（下の節） |
| `third_party/` | 同梱した外部のスキルの出典とライセンス |
| `references/setup.md` | GitHub とクラウドの下準備：GitHub App、環境、CI の必須チェック、ルールセット、ラベル、作業の分け方、issue、配り役の始め方 |
| `references/prompts.md` | 子への指示の雛形：起動・起こす・定期チェック・まとめ |
| `references/lessons.md` | 並行作業でぶつかった所と、その避け方 |
| `templates/CLAUDE.md` | 開発メモの雛形（すべてのセッションが最初に読む） |
| `templates/.github/workflows/ci.yml` | CI の例（Node で検証するゲームのもの。2 つに分けたテストと、必須チェック「CI result」のまとめ方の見本。検証のコマンドはゲームに合わせて書き換える） |

## 使い方（新しいゲームを始めるとき）

1. **新しいリポジトリを作る**（GitHub）。
2. **持ち主が一度だけ行う下準備**（`references/setup.md` の 1・2）
   - Claude の GitHub App を入れる。
   - claude.ai で GitHub をつなぐ。
   - Claude Code on the web の環境を作る。
   - CI の必須チェックとルールセットを入れる。
3. **新しいセッションに、このキットを渡して次のように頼む。**

```
このスターターキットを使って、新しいゲームの開発を始めたい。
1. KNOWHOW.md と README.md を読んで。
2. キットの中身をこのリポジトリに置き、ゲームに合わせて書き換える PR を出して：
   - templates/CLAUDE.md → CLAUDE.md（ゲーム名・制作ツール・検証のコマンド・構成とレーン・決まり）
   - .claude/skills/dispatcher/ → そのまま置き、SKILL.md の冒頭（必須チェックの名前・タグ・リリースの有無）をこのゲーム用に
   - templates/.github/workflows/ci.yml → 制作ツールに合わせた検証（データの整合チェックなど）。Actions は SHA で固定
   - docs/VISION.md（方向性・柱・やらないこと・用語集・文体の柱）と docs/ROADMAP.md（レーンの表・衝突を避ける約束）の下書き
3. 決めることがあれば、まとめて聞いて。
そのあと /dispatcher で配り役を始める。
```

4. **最初に持ち主が決めること**
   - ゲームの方向性と、参考にする作品（作品名はリポジトリに入れない）
   - 文体の柱
   - 制作ツール
   - 子のモデル
   - 同時に動かす子の本数
   - 自動で取り込んでよいか
5. **回し始める。** 以後は `/dispatcher` の手順で進む。持ち主が見るのは、確認票と、決めてほしいことだけ。

## 注意
- 手順書の `<必須チェック>`・`<タグ>`・`<検証のコマンド>` などは、ゲームごとに埋める。
- 持ち主の好み（短く報告・トークン節約・PC の作業は短く・設定をねじ曲げない）は `KNOWHOW.md` の 1・2 章。新しい開発メモにも入れる。
- 文体の柱・世界観・用語は、ゲームごとに持ち主と決める（このキットには入れていない）。

## 同梱した外部のスキル（mattpocock/skills・MIT）
Matt Pocock さんのエージェント用スキル集から、配り役の手順と重ならないものだけを `.claude/skills/` に同梱した（出典とライセンスは `third_party/`）。実装・レビュー・チケット分けのスキルは、配り役の手順と二重になるので入れていない。
- **/grill-me**（中身は grilling）：作る前に、計画の決めていない所を質問で詰める。新しいゲームの最初に、方向性・柱・文体・やらないことを固めるのに使う。推しの答えつきで聞いてくるので、持ち主は「はい」で進められる。
- **/handoff**：会話を、次のセッションに渡す文書にまとめる（配り役の引き継ぎや、別のゲームへのノウハウ渡しに）。
- **/to-questionnaire**：持ち主（や他の人）に決めてほしいことを、答えやすい質問票にする。
- **writing-for-agents**：CLAUDE.md やスキルを書く・直すときの指南（自動で読まれる）。
新しいゲームの始め方の例：キットを置いたら、まず `/grill-me` で企画を詰め、その答えから `docs/VISION.md` と `CLAUDE.md` を書く。

## Godot で作るとき（参考）

`references/godot-playtest-template/` に、Godot（4.7.2 / GDScript）でブラウザ向けのゲームを作るためのテンプレートリポジトリを、そのまま入れてある。作者は haryu703 さん。Godot で作るなら、これを参考にする（そのまま使うかは持ち主に確かめる）。

- 入っているもの
  - ゲーム本体の最小サンプル：`project.godot`・`scenes/`・`scripts/`（版の表示・更新の確認・変更履歴の画面）
  - GitHub Actions：Web ビルドの共通処理（`godot-build.yml`）、各ゲームから呼ぶ側（`build.yml`）、版の自動更新（`release.yml`・`tools/ci/bump-version.sh`・`changelog.d/`）、セキュリティの点検、dependabot
  - 配布：Cloudflare Pages への公開（`tools/deploy/`。Discord でのログイン制限の例つき）
  - Claude Code 用の `CLAUDE.md` と配り役のスキル（このキットの手順書の元になったもの）
- 使い方の要点は、テンプレートの `README.md` にある：テンプレートリポジトリにする設定、Use this template で新しいゲームを作る、Pages の変数、`playtest` ブランチで配布、など。
- このキットの `KNOWHOW.md`・配り役の手順書と組み合わせて使う。
  - Godot の作りに合う部分：ビルド・配布・版の自動更新はテンプレートに従う。
  - 進め方・創作・文章・絵の部分：キットに従う。
- 注意：テンプレートにはライセンスの表記が無く、元は非公開のリポジトリ。公開の場所には置かない（このキットを公開リポジトリに置くときは、このフォルダを外す）。
