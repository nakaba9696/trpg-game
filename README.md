# ゲーム制作スターターキット

Morsveld の開発で作った進め方を、新しいゲームですぐ使えるようにまとめたもの。制作ツール（ツクール・Unity・HTML など）は問わない。

## 中身

| 場所 | 中身 |
|---|---|
| `KNOWHOW.md` | ノウハウ全部 |
| `.claude/skills/dispatcher/` | 配り役の手順書（`SKILL.md`）と、その付録（`references/`） |
| `references/setup.md` | GitHub とクラウドの下準備：GitHub App、環境、CI の必須チェック、ルールセット、ラベル、作業の分け方、issue、配り役の始め方 |
| `references/prompts.md` | 子への指示の雛形：起動・起こす・定期チェック・まとめ |
| `references/lessons.md` | 並行作業でぶつかった所と、その避け方 |
| `templates/CLAUDE.md` | 開発メモの雛形（すべてのセッションが最初に読む） |
| `templates/.github/workflows/ci.yml` | CI の例（Morsveld のもの。検証のコマンドはゲームに合わせて書き換える） |

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
- 手順書と雛形は Morsveld の作りから来ているので、例やファイル名が HTML＋JavaScript 前提の所がある。新しいゲームの作りに合わせて書き換える。
  - 例：`node tools/build.mjs`、`src/data/`、`tests/checks/`
- 持ち主の好み（日本語で短く報告、トークン節約、PC の作業は短く、設定をねじ曲げない）は、`KNOWHOW.md` の 1・2 章にある。新しい開発メモにも入れる。
