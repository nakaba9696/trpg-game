# 男の絵柄：絵師タグの比較（イケメン raios・おっさん hans・一般人 kind_villager_m）

モデル waiIllustriousSDXL_v140。seed は本番（art-batch-d）を作ったときのもの（seeds.local.json）。style_male.json の共通 prefix の先頭に足し、型の prefix はそのまま。切り替えは style_male.local.json（終わったら消した）。

| 案 | 足したもの | 印象 |
|---|---|---|
| 0 | なし（基準） | — |
| Oorine | `(orine:1.3)`（タグ名の間違い。ファイルは Oorine_*）（織音。`orine`・`oto (orine)` を 1.0・1.3・1.5 で試し、女の子の絵でも変化なし。モデルが知らない様子） | 0 とほぼ同じ |
| A | `(yoshida akihiko:1.1)` | 0 とほぼ同じ。ハンスの眉が少し濃くなる程度 |
| B | `(inoue takehiko:1.1)` | 0 とほぼ同じ |
| C | `(miura kentarou:1.1)` | 0 とほぼ同じ（ボルグのシャツの色が変わった程度） |
| D | `(araki hirohiko:1.1)` | 0 とほぼ同じ。眉と影がわずかに濃い |
| E | `(kida yasuaki:1.2)` | 0 とほぼ同じ（モデルが知らない様子） |
| F | prefix `anime coloring, cel shading, thick lineart, flat color`／negative `3d, realistic, photorealistic, glossy skin, airbrushed, smooth shading, blurry` | 大きく変わる。てかりとエアブラシの塗りが消え、線が太いアニメ塗りに。AI っぽさがいちばん減る |
| G | A ＋ F | F より線が太く、劇画寄り。おっさん（ハンス・カイデル）は眉・皺・無精ひげが濃くなり、いちばん渋い |

| OForine | Oorine ＋ F（ファイルは OForine_*） | F とほぼ同じ（織音のぶんの変化は見えない）。F と同じく AI っぽさは大きく減る |

絵師タグ（O・A〜E）はどれもこのモデルではほとんど効かない。違う絵師に替えても同じ見込みなので差し替えはしていない。絵柄を大きく変えるのは F の語。

ファイル：`<案>_<id>.webp`（512×640）。

## Danbooru のタグ名でやり直し（配り役が Danbooru で確かめた名前。括弧は `\(` `\)` でエスケープ）

見本は raios（イケメン）・hans（おっさん）・kind_villager_m（一般人）。seed は同じ。

| 案 | 足したもの | 印象 |
|---|---|---|
| O | `orion \(orionproject\)`（織音） | 効く。塗りが少し締まり、一般人は顔の彫りが深く頬がこけ、体が厚くなって渋くなる。イケメンは目つきがやや鋭く。ハンスは小さな変化 |
| O12 | `(orion \(orionproject\):1.2)` | O と同じ向きで少し強い。崩れなし |
| OF | O12 ＋ F | 線が太いアニメ塗りに。AI っぽさは F と同じくらい減り、一般人は F より顔が濃い |
| K | `kazuma kaneko`（金子一馬） | 少し変わる。一般人は服の形が変わり顔が細めに。絵柄の差は小さい |
| N | `nomura tetsuya`（野村哲也） | 0 とほぼ同じ |
| A2 | `(yoshida akihiko:1.3)` | 髪が短い金髪・刈り上げに変わる（ハンスにも髪が生えた）。絵柄の差は小さく、見た目を変えてしまう |

※ Git Bash からコマンドの引数で渡すとバックスラッシュが消える（`\(` が `(` になり重みの記法として読まれる）。設定ファイルに書くときは JSON で `\(` と書く。
