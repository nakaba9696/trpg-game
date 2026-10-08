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

## 持ち主に聞く絵（`docs/art/cutout_review/questions.json`）

光・オーラ（e3_notari・graw・e3_tojizuki・e3_levian・e3_yuzuel）、霧（e4_seafog）、傘（e3_lugu。背景を白に描き直した版）、足元の炎・溶岩・地面（e3_tetsukui・e4_cinderhound）、
大樹の後ろの空（e3_sekaiju）、後ろの布（e4_mudhound）、止まっている岩・崖・廃墟（e4_vulture・e4_rockeater・e4_warcrow）、墓石（e4_gravejackal）、座る木・横の木（celestin・timo）。
答えが出るまで、これらは切り抜かずに元の絵のまま（`fixes_*.jpg` にある notari・graw・seafog・yuzuel・lugu・celestin・timo の「直した後」は、答えでそれがよいと言われたときの版）。

## そのままにした所（背景と判断）

e4_cropcrow の麦・ogre・lumia の木・konoha の雲・rionetta の階段・e4k_moonhare の青い光など、
人物や魔物から離れた景色は消したまま。座っている台（musette・tsuyuha・souhaku・otmar のいす）は残っている。
