# assets（持ち主が作った画像）

ここに置いた画像（webp・png・jpg）は、`node tools/build.mjs` のときに data URI にして `dist/morsveld.html` に埋め込まれる（`tools/assets.mjs`）。外からは読み込まない。

- 人物の絵：`assets/portraits/<id>.webp`。id と、Stable Diffusion に入れる特徴のタグは [docs/art/portraits.md](../docs/art/portraits.md)。
- 大きさは 512×640（縦長・胸から上）、1枚 80KB 以下。埋め込みの合計が 12MB を超えるとビルドとテストが止まる。
- 画像が無い人は、今までどおり canvas の絵で描く。
