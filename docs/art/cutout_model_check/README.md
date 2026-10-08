# 背景除去モデルの切り抜きの点検（10/8）

全部の絵（立ち絵 1,065 枚・魔物 203 枚）を、元の絵と切り抜き後を並べた一覧で見比べた。
持ち主の注意（周りの物まで一体の絵・車いすなど体に付いた物を消さない）に沿って、モデルが消した物を直した。

| 画像 | 中身 |
|---|---|
| `before_after_portraits.jpg`・`before_after_monsters.jpg` | 前（ゲームの色の背景消し）と後（モデル）。濃紺の上 |
| `fixes_1.jpg`〜`fixes_3.jpg` | 直した絵：元／モデルだけ／直した後（マゼンタ）／直した後（黒） |

## 直した絵

| 絵 | 消えていた物 | 直し方 |
|---|---|---|
| 魔物 kain | 周りに浮かぶ結晶 | `--keep-color`（モデルの透明に、背景の色との差を重ねる） |
| 魔物 warlock | 手の紫の炎 | `--keep-color` |
| 魔物 e3_togaoi | 後ろの鎖 | `--keep-color` |
| 魔物 e4k_ember | 口から吐く炎 | `--keep-color` |
| 魔物 e4_ashogre・e4_firearrowimp・w3_ashscribe・w2_ironwarden | まとった煙 | `--keep-color` |
| 魔物 e4k_cauldron | 湯気 | `--keep-color`（白い湯気は線だけ残る） |
| 魔物 e4_lampghost | 青い鬼火 | `--keep-color` |
| 人物 titta（8 枚） | 車いす | `--model isnet-anime` |
| 人物 aurelia（8 枚） | 翼（serious・sorrow で消えた） | `--keep-color`（差分も同じ形にそろえる） |

このほか、前の点検で背景が残った・白いもやが出た 13 枚（bartolo・kind_villager_m・titta_exasperated・timo の一部・yura ほか）は `--model isnet-anime`。

## 持ち主に聞いた絵（`docs/art/cutout_review/questions.json` の answer）

- **背景込みの一枚絵として出す**（切り抜かず、表示の背景消しにも通さない。`src/ui/a17_keep_bg.js`）：e3_yuzuel・e3_lugu・e3_notari・graw・e3_tojizuki・e3_levian・e3_tetsukui・e3_sekaiju・e4_vulture・e4_rockeater・e4_rockeater_x・e4_warcrow。
  縁と足元は、ほかの魔物と同じ仕上げ（`v6_monsters.js` の finish：丸いぼかし・足元を消す）で戦闘の背景になじむ。
- **切り抜き後でよい**：e4_seafog（霧を半透明で残す）・e4_cinderhound（溶岩と煙を消す）・e4_mudhound と _x（布を残す）・e4_gravejackal（墓石を消す）・celestin（木ごと残す。差分も）。
- **timo は木を消す**（差分も。差分は基本の絵の透明の形を少し広げた範囲に収め、木の残りを消した）。

## そのままにした所（背景と判断）

e4_cropcrow の麦・ogre・lumia・timo の木・konoha の雲・rionetta の階段・e4k_moonhare の青い光など、
人物や魔物から離れた景色は消したまま。座っている台（musette・tsuyuha・souhaku・otmar のいす）は残っている。
