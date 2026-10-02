# assets（持ち主が作った画像）

ここに置いた画像（webp・png・jpg）は、`node tools/build.mjs` のときに `dist/site/`（ページ `index.html` の隣）に写され、ページから相対パスで読まれる（`tools/assets.mjs`）。Artifact には「ページ＋画像の別ファイル」で載せる（[docs/publish.md](../docs/publish.md)）。`--embed` なら data URI にして `dist/morsveld.html` に埋め込む（予備）。

- 人物の絵：`assets/portraits/<id>.webp`。id と、Stable Diffusion に入れる特徴のタグは [docs/art/portraits.md](../docs/art/portraits.md)。
- 魔物の絵：`assets/monsters/<id>.webp`（id は敵の id）。一覧とタグは [docs/art/monsters.md](../docs/art/monsters.md)。
- 大きさは人物が 512×640（縦長・胸から上）で 1枚 80KB 以下、魔物が 512×512（全身・白い無地の背景）で 1枚 60KB 以下。数と合計は Artifact の決まり（1 つの版で 511 ファイル・256MB）に収める（`tests/checks/a6_site.mjs`）。予備の埋め込みは 12MB を超えると差分を省く。
- 画像が無い人・魔物は、今までどおり canvas の絵で描く。
