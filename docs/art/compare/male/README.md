# 男の絵柄：絵師タグの比較（イケメン raios・おっさん hans・一般人 kind_villager_m）

モデル waiIllustriousSDXL_v140。seed は本番（art-batch-d）を作ったときのもの（seeds.local.json）。style_male.json の共通 prefix の先頭に足し、型の prefix はそのまま。切り替えは style_male.local.json（終わったら消した）。

| 案 | 足したもの | 印象 |
|---|---|---|
| 0 | なし（基準） | — |
| O | `(orine:1.3)`（織音。`orine`・`oto (orine)` を 1.0・1.3・1.5 で試し、女の子の絵でも変化なし。モデルが知らない様子） | 0 とほぼ同じ |
| A | `(yoshida akihiko:1.1)` | 0 とほぼ同じ。ハンスの眉が少し濃くなる程度 |
| B | `(inoue takehiko:1.1)` | 0 とほぼ同じ |
| C | `(miura kentarou:1.1)` | 0 とほぼ同じ（ボルグのシャツの色が変わった程度） |
| D | `(araki hirohiko:1.1)` | 0 とほぼ同じ。眉と影がわずかに濃い |
| E | `(kida yasuaki:1.2)` | 0 とほぼ同じ（モデルが知らない様子） |
| F | prefix `anime coloring, cel shading, thick lineart, flat color`／negative `3d, realistic, photorealistic, glossy skin, airbrushed, smooth shading, blurry` | 大きく変わる。てかりとエアブラシの塗りが消え、線が太いアニメ塗りに。AI っぽさがいちばん減る |
| G | A ＋ F | F より線が太く、劇画寄り。おっさん（ハンス・カイデル）は眉・皺・無精ひげが濃くなり、いちばん渋い |

| OF | O ＋ F | F とほぼ同じ（織音のぶんの変化は見えない）。F と同じく AI っぽさは大きく減る |

絵師タグ（O・A〜E）はどれもこのモデルではほとんど効かない。違う絵師に替えても同じ見込みなので差し替えはしていない。絵柄を大きく変えるのは F の語。

ファイル：`<案>_<id>.webp`（512×640）。
