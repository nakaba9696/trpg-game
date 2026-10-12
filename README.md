# ゲーム制作スターターキット

Claude Code で並行してゲームを作る進め方を、新しいゲームですぐ使えるようにまとめたもの。ジャンルも制作ツール（ツクール・Unity・Godot・HTML など）も問わない。

## 中身

| 場所 | 中身 |
|---|---|
| `KNOWHOW.md` | 持ち主との進め方・創作・人物・文章・絵のノウハウ（並行作業の詳細は配り役の手順書へ） |
| `TRANSPARENT_IMAGES.md` | 背景透過の立ち絵・魔物の絵を作るノウハウ（失敗したやり方・作り方・確かめ方） |
| `tools/check_alpha.py` | 透過の絵を確かめる道具（表情違いとの透け方・形のずれ、白い背景のままの絵、暗い地・マゼンタの地の一覧画像） |
| `.claude/skills/dispatcher/SKILL.md` | 配り役の手順書 |
| `.claude/skills/dispatcher/references/setup.md` | GitHub とクラウドの下準備：GitHub App、環境、CI の必須チェック、ルールセット、ラベル、作業の分け方、issue、配り役の始め方 |
| `.claude/skills/dispatcher/references/prompts.md` | 子への指示の雛形：起動・起こす・定期チェック・まとめ |
| `.claude/skills/dispatcher/references/lessons.md` | 並行作業でぶつかった所と、その避け方 |
| `.claude/skills/grill-me`・`grilling`・`handoff`・`to-questionnaire`・`writing-for-agents` | 同梱した外部のスキル（下の節） |
| `third_party/` | 同梱した外部のスキルの出典とライセンス |
| `templates/CLAUDE.md` | 開発メモの雛形（すべてのセッションが最初に読む）。`<…>` と「ゲームごとに決める」の印を埋める |
| `templates/docs/VISION.md` | 方向性の文書の骨組み（柱・やらないこと・用語集・文体の柱・避ける癖） |
| `templates/docs/ROADMAP.md` | 並行作業の分け方の骨組み（レーンの表・衝突を避ける約束・波・決定待ち） |
| `templates/.claude/settings.json` | Claude Code の設定の例（コミットへの自動署名を切る・子の考える深さ） |
| `templates/.github/workflows/ci.yml` | CI の例。ジョブを `needs` でまとめる必須チェック「CI result」の見本。検証のコマンドはゲームに合わせて書き換える |
| `references/godot-playtest-template/` | Godot 用のテンプレートリポジトリ（参考。下の節） |

## 使い方（新しいゲームを始めるとき）

1. **新しいリポジトリを作る**（GitHub）。
2. **持ち主が一度だけ行う下準備**（`.claude/skills/dispatcher/references/setup.md` の 1・2）
   - Claude の GitHub App を入れる。
   - claude.ai で GitHub をつなぐ。
   - Claude Code on the web の環境を作る。
   - CI の必須チェックとルールセットを入れる。
3. **新しいセッションに、このキットを渡して次のように頼む。**

```
このスターターキットを使って、新しいゲームの開発を始めたい。
1. KNOWHOW.md と README.md を読んで。
2. キットの中身をこのリポジトリに置き、ゲームに合わせて書き換える PR を出して：
   - templates/CLAUDE.md → CLAUDE.md（ゲーム名・制作ツール・検証のコマンド・構成とレーン・「ゲームごとに決める」の決まり）
   - templates/docs/ → docs/（VISION.md・ROADMAP.md の骨組みを埋める）
   - templates/.claude/settings.json → .claude/settings.json
   - .claude/skills/dispatcher/ → そのまま置き、SKILL.md の冒頭（必須チェックの名前・タグ・リリースの有無）をこのゲーム用に
   - templates/.github/workflows/ci.yml → 制作ツールに合わせた検証（データの整合チェックなど）。Actions は SHA で固定
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
   - `templates/CLAUDE.md` の「ゲームごとに決める」の決まり（遊んでいる間に AI を呼ぶか、行動の形、文章の言語）
5. **回し始める。** 以後は `/dispatcher` の手順で進む。持ち主が見るのは、確認票と、決めてほしいことだけ。

## 注意
- 手順書の `<必須チェック>`・`<タグ>`・`<検証のコマンド>` などは、ゲームごとに埋める。
- 手順書に出てくるツール名（`create_session`・`create_trigger` など）は書いた時点のもの。環境によって名前や引数が変わるので、見つからなければ ToolSearch で同じ役目のものを探す（`SKILL.md` の冒頭）。
- 持ち主の好み（短く報告・トークン節約・PC の作業は短く・設定をねじ曲げない）は `KNOWHOW.md` の 1・2 章。新しい開発メモにも入れる。
- 文体の柱・世界観・用語は、ゲームごとに持ち主と決める（このキットには入れていない）。
- 配り役の手順書は `references/godot-playtest-template/.claude/skills/dispatcher/` にもあるが、そちらは古い版（§11・§12 が無い）。**使うのはキット直下の `.claude/skills/dispatcher/`。**

## 同梱した外部のスキル（mattpocock/skills・MIT）
Matt Pocock さんのエージェント用スキル集から、配り役の手順と重ならないものだけを `.claude/skills/` に同梱した（出典とライセンスは `third_party/`）。実装・レビュー・チケット分けのスキルは、配り役の手順と二重になるので入れていない。
- **/grill-me**（中身は grilling）：作る前に、計画の決めていない所を質問で詰める。新しいゲームの最初に、方向性・柱・文体・やらないことを固めるのに使う。推しの答えつきで聞いてくるので、持ち主は「はい」で進められる。
- **/handoff**：会話を、次のセッションに渡す文書にまとめる（配り役の引き継ぎや、別のゲームへのノウハウ渡しに）。
- **/to-questionnaire**：持ち主（や他の人）に決めてほしいことを、答えやすい質問票にする。
- **writing-for-agents**：CLAUDE.md やスキルを書く・直すときの指南（自動で読まれる）。
- 各スキルの `agents/openai.yaml` は Codex 用で、Claude Code では読まれない（残して害は無い）。

新しいゲームの始め方の例：キットを置いたら、まず `/grill-me` で企画を詰め、その答えから `docs/VISION.md` と `CLAUDE.md` を書く。

## Godot で作るとき（参考）

`references/godot-playtest-template/` に、Godot（4.7.2 / GDScript）でブラウザ向けのゲームを作るためのテンプレートリポジトリを、そのまま入れてある。作者は haryu703 さん。Godot で作るなら、これを参考にする（そのまま使うかは持ち主に確かめる）。

- 入っているもの
  - ゲーム本体の最小サンプル：`project.godot`・`scenes/`・`scripts/`（版の表示・更新の確認・変更履歴の画面）
  - GitHub Actions：Web ビルドの共通処理（`godot-build.yml`）、各ゲームから呼ぶ側（`build.yml`）、版の自動更新（`release.yml`・`tools/ci/bump-version.sh`・`changelog.d/`）、セキュリティの点検、dependabot
  - 配布：Cloudflare Pages への公開（`tools/deploy/`。Discord でのログイン制限の例つき）
  - Claude Code 用の `CLAUDE.md`（英語）と配り役のスキル（このキットの手順書の元になった古い版）
  - `tools/ci/check-workflows.sh`：ghalint と actionlint で workflow を点検するスクリプト。Godot 以外のゲームでも流用できる
- 使い方の要点は、テンプレートの `README.md` にある：テンプレートリポジトリにする設定、Use this template で新しいゲームを作る、Pages の変数、`playtest` ブランチで配布、など。
- このキットの `KNOWHOW.md`・配り役の手順書と組み合わせて使う。
  - Godot の作りに合う部分：ビルド・配布・版の自動更新はテンプレートに従う。
  - 進め方・創作・文章・絵の部分：キットに従う。
- **注意：テンプレートにはライセンスの表記が無く、元は非公開のリポジトリ。公開の場所には置かない。** このキットを公開リポジトリに置くときは、`references/godot-playtest-template/` を外す（キット直下の `.gitignore` に入れてある。公開前に `git ls-files references/` が空なのを確かめる）。
