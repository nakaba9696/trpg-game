# assets（持ち主が作った画像）

ここに置いた画像（webp・png・jpg）は、`node tools/build.mjs` のときに data URI にして `dist/morsveld.html` に埋め込まれる（`tools/assets.mjs`）。外からは読み込まない。

- 人物の絵：`assets/portraits/<id>.webp`。id と、Stable Diffusion に入れる特徴のタグは [docs/art/portraits.md](../docs/art/portraits.md)。
- 魔物の絵：`assets/monsters/<id>.webp`（id は敵の id）。一覧とタグは [docs/art/monsters.md](../docs/art/monsters.md)。
- 大きさは人物が 512×640（縦長・胸から上）で 1枚 80KB 以下、魔物が 512×512（全身・白い無地の背景）で 1枚 60KB 以下。埋め込みの合計（人物と魔物を合わせて）が 12MB を超えるとビルドとテストが止まる。
- 画像が無い人・魔物は、今までどおり canvas の絵で描く。
