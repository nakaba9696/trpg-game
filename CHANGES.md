# 精査後の変更点（2026-10-11）

## 整合
- README の付録のパスを実体（`.claude/skills/dispatcher/references/`）に合わせた。dispatcher が 2 版あること、使うのはキット側であることを明記。
- 定期チェックを止める条件を SKILL.md §6 に統一（「変化なしが 3 回」は削除。prompts.md の雛形も §11 を呼ぶ形に）。
- SKILL.md 冒頭の「埋める値」から方針文を §1 へ移動。`<検証のコマンド>` を埋める値に追加。
- ツール名が環境で変わる旨と、見つからないときの探し方を SKILL.md 冒頭と README に追記。

## ゲーム固有の残骸を汎用化
- SKILL.md §11-2（`node tests/run.mjs`・Q1・職業）、lessons.md 冒頭（sfrts）、prompts.md（`check-workflows.sh` の要求）をプレースホルダ／例に。
- `templates/.github/workflows/ci.yml` を `needs` + `if: always()` のまとめジョブ版に書き換え（setup.md §2 の説明と一致）。ランナーが少ないときの代案はコメントに残した。

## 追加
- `templates/docs/VISION.md`・`templates/docs/ROADMAP.md`（骨組み）。
- `templates/.claude/settings.json`（`includeCoAuthoredBy: false`・`effortLevel`）。CLAUDE.md の「モデル名を書かない」と自動署名の衝突を解消。
- `.gitignore`（godot テンプレートを公開リポジトリに入れない）。

## 雛形の精度
- `templates/CLAUDE.md` の決まりを「どのゲームでも」と「ゲームごとに決める」に分けた（AI を呼ぶか・行動の形・言語・配布）。
- KNOWHOW §7・§9 を要点＋リンクに痩せさせ、SKILL.md / lessons.md との二重管理をやめた。

## 未対応（持ち主の確認が要る）
- `actions/checkout` の SHA とタグの一致確認（`gh api repos/actions/checkout/git/ref/tags/v7.0.1`）。
- godot テンプレート内の dispatcher（古い版）をキット版で置き換えるか。
- `agents/openai.yaml` を消すか（消すなら third_party/README も更新）。

# 配り役が足したもの（2026-10-12）
- 精査版で抜けていた `TRANSPARENT_IMAGES.md`・`tools/check_alpha.py` を戻し、README の表に載せた。
- KNOWHOW §5・§6・§10 に最近わかったこと（印と実際を合わせる・長い移動の区切り・名のある人の絵・設定をプロンプトに全部書く など）。
- lessons.md に「子の止まり・持ち主の PC」（判断待ちの子の見張り・ブランチ名・PC の予約・声のまとめ方）。
