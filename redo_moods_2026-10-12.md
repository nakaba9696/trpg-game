# 表情違いの作り直し（2026-10-12・持ち主の許可）

持ち主が見つけたミス（annelise・bride・constance・farina・gerhard・hermes）と、配り役の点検（117 人を並べて目で見た）の結果。
**直し方：基本の絵を下地に、顔だけをインペイントで描き直す。** 顔以外（髪・前髪・髪飾り・服・模様・武器・持ち物）は基本の絵の画素のまま。生成の設定は 1 枚ごとに docs/art/gen/<id>.json に残す（シードを固定）。

## 進め方
1. **基本の絵を先に直す**（下の「基本」の欄）。
   - 透けた穴（目・宝石・小瓶・本など）を埋める：その所だけ小さくインペイントするか、元の色で塗る。アルファを 255 に。
   - 背景が白いまま（chezar・gauthier・graul・greiol・katia・odette・zork）：絵を変えずに背景だけ透明にする。外から続く白を抜き、囲まれたすき間の白も背景なら抜く（白い服・白い髪は残す）。暗い地と赤紫の地で拡大して確かめる。抜けないなら持ち主に聞く。
   - 一覧（docs/art/portraits.json）の identity・tags にある特徴（傷・ほくろ・絆創膏・眼帯の飾り・髪飾りなど）が基本に無く、表情違いにはある場合は、基本にその特徴を小さくインペイントで足す（表情違いに多い方が正しいことが多い）。迷うものは基本のまま。
2. **表情違いを全部、基本から作り直す**：マスクは目・眉・口・頬（涙・汗・赤面を含む）だけ。髪の輪郭・前髪の房・髪飾り・眼鏡のつる・服にはかけない（眼鏡の人はレンズの内側だけ）。Inpaint area: Only masked、Masked content: original、denoise 0.4〜0.55、プロンプトは基本と同じ＋表情（portraits.json の variants）。
3. 表情がファイル名どおりになっているか（喜＝笑う、怒＝怒る、哀＝悲しむ、楽＝楽しそう…）と、表情どうしがはっきり違うかを確かめる。
4. 出す前に、基本と全表情を並べて暗い地・赤紫の地で拡大し、顔以外が同じ・透けた穴が無いことを確かめる。区切り（10〜15 人）ごとに push。

## 人ごとのミス（直したかの突き合わせ用）
| 人 | ミス |
|---|---|
| adele | 基本：頬の絆創膏が透けている・片頬だけ（表情違いは両頬） |
| alicia | sorrow：額飾りの緑の宝石が無い |
| ambroise | joy・sorrow・fun：葉っぱが付く／くわえる。前髪の流れが表情ごとに違う |
| angelica | anger：驚き顔になっている |
| annelise | 表情によって髪がガビガビ（持ち主）。fun・panic・shy：頬の絆創膏が無い |
| anselmo | serious・sorrow・faint_smile：歯を見せて笑ったまま |
| aubin | 基本：剣の柄が短く鍔の形が違う |
| aurelia | serious：右目が紫 |
| azlag | 肩の烏の位置・形が表情ごとに違う |
| barnabe | 瞳が透けている（全部）。表情がほとんど同じ笑顔 |
| bartolo | 基本：頬の×の傷が無い・髭の形が違う |
| baudouin | exasperated：首に白い線 |
| bride | 細かい模様が表情で変わる（持ち主）。基本：眼帯の金の蝶・額の包帯が無い・胸の紋章が違う |
| bruno | 瞳が透けている（全部）。fun・joy・shy が怒り顔のまま |
| captain | 胸当ての印・襟の線が表情ごとに違う |
| celestin | sorrow：胸の札の文字が赤く形も違う |
| chezar | 背景が白（全部）。基本：ボタン・ネクタイの色が違う |
| constance | 目（レンズの中）が透けている（全部・持ち主） |
| doctor | ベルトの小瓶の中身が透けている（全部） |
| dorothea | 基本：前髪の房・耳飾り・口紅が違う |
| farina | 表情によって髪の房があったり無かったり（持ち主） |
| filie | 基本：頭の青い輪・首元の緑の飾りが違う |
| gauthier | 背景が白（全部）。基本：頭巾の葉の飾りが無い |
| gensai | anger：にやりと笑っている |
| gerhard | 表情によって剣の模様が違う（持ち主） |
| gramont | cold・fun・serious：クラバットに柄 |
| graul | 背景が白（全部） |
| greol | 表情によって別人になる（持ち主） |
| greiol | 背景が白（全部）。基本：胸の飾り・襟の形が違う |
| hermes | 表情によって服の模様が違う（持ち主）。fun だけ丸眼鏡・anger だけ帽子の帯が赤・帽子の染みがまちまち |
| ingrid | 基本・exasperated・sorrow：眼鏡の縁が細い（ほかは太い黒縁） |
| iori | 基本：前髪の左の房・頭の細い毛が違う |
| izra | 基本：左下に槍の穂先（表情違いに無い）。fun・shy・sparkle：槍の位置がずれる |
| katia | 背景が白（全部）。基本：首の金属の襟が無い・剣の鍔が違う。胸の金の十字が表情で有無 |
| leopold | 開いている方の目が透けている（基本・anger・joy、fun・sorrow も穴） |
| lisette | 基本：髪型・顔立ちが違い頬の傷が無い。anger：頬の傷が無い |
| lumia | faint_smile・joy・sorrow：耳の付け根の髪に穴。基本：右上の葉が無い・左の髪の流れが違う |
| malvina | faint_smile・joy・serious：右目がピンク。マスクの柄が表情ごとに違う |
| margot | smitten：左目が透けている。基本：頬の傷が無い |
| marion | anger・faint_smile・serious：目が透けている |
| noeris | 前髪・横の房が表情ごとに違う。基本・anger・smug・sorrow：泣きぼくろが無い |
| nora | cry：絆創膏と頬の汚れが無い。shy・sorrow：絆創膏が無い |
| odette | 背景が白（全部）。服が表情ごとに別物（袖・ベルト・ベールのレース） |
| otmar | 本の持ち方・形・ローブの模様が表情ごとに違う。本や手元が透けている（基本・anger・cold・joy・sorrow・tired） |
| pipinelle | 基本：杖の房飾りが違う |
| raisha | 基本：胸元が違う（ネクタイが無い） |
| rionetta | anger：両目が透けている。joy：片目が半透明。目の色が茶・青でばらつく |
| salphiel | cold・faint_smile・fun・joy・sorrow：顔を覆う布の位置と形が違う |
| serios | 頬の絵の具の色・位置がばらばら。fun・sorrow だけ筆を持つ |
| sheila | joy：髪留めの形が違う |
| shione | 基本：右の髪飾りが赤い花（ほかは黄）・左の髪留め・編み込みが無い |
| sixth | 基本：剣の鍔の宝石が透けている・柄の巻きが違う |
| tiria | anger：にこにこ顔。joy：基本とほとんど同じ |
| titta | anger：襟に白線 |
| trude | fun・smug：手が 3 本 |
| tsuyuha | fun：茶碗の取っ手に緑の点（ほかにも小さな点） |
| valeon | 基本：王冠の中央の宝石が無い・王冠の形が違う |
| yurina | 基本・cold だけ青い髪留め |
| zerina | exasperated：左下に白い点。sorrow：左下・右下に白い四角のゴミ |
| zork | 背景が白（全部）。基本：帽子の帯・襟元が違う |

「基本：〜が違う」は、表情違いの方に合わせるか基本のままにするかを 1 で決める（identity・tags に書いてある方、表情違いの多数の方）。
