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

## 人気の絵師タグ 10 個と組み合わせ（配り役が Danbooru の API で選んだもの）

T7＝K（kazuma kaneko）、T9＝O（織音）、T10＝A2（yoshida akihiko 1.3）は上の表と同じ画像。露出はどの案にも無い。

| 案 | タグ | 印象 |
|---|---|---|
| T1 | `kotomaru \(kotokoto kottan\)` | 0 とほぼ同じ。少しだけ塗りが明るい |
| T2 | `yuichirou` | 顔の影がやや濃くなり、一般人の眉と目つきが強い。小さな変化 |
| T3 | `haruakira` | 線がはっきりしたアニメ塗りに近づき、AI っぽさが少し減る。一般人は眉が太く目つきが鋭くなり、おっさんらしさが増す |
| T4 | `kadeart` | 少しくすんだ色・柔らかい塗り。ハンスの前掛けの横に署名のような小さな文字が出た（要注意） |
| T5 | `dairi` | はっきり変わる。線が太く色が鮮やかな少年漫画寄りの塗り。若く見えやすく（一般人が青年に）、おっさんの渋さは減る |
| T6 | `kyata ti666` | 0 とほぼ同じ。少しコントラストが強い |
| T8 | `kato takuji` | 0 とほぼ同じ |
| X1 | dairi ＋ kotomaru | T5 とほぼ同じ（dairi が勝つ）。若く華やか |
| X2 | kotomaru ＋ F | F とほぼ同じ。線の太いアニメ塗りで AI っぽさは大きく減る |
| X3 | dairi ＋ F | 線がいちばん強く、少年漫画らしい。ハンスは歯を見せて笑い、一般人は若い |

まとめ：絵柄をはっきり変えるのは F（とその組み合わせ）、T5 dairi、T3 haruakira。おっさんを渋くするなら O12（織音）・OF・G、華やかにするなら T5。
