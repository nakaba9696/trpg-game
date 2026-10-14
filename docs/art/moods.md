# 表情の種類（立ち絵の差分）

このファイルは `node tools/portraits.mjs` で `docs/art/moods.json`（種類）と `docs/art/portraits.json`（人ごとの割り当て）から作る。直すときは json を直してから作り直す。

## 決まり

- 差分のある人は、**喜怒哀楽の 4 つ**（`joy`・`anger`・`sorrow`・`fun`）を必ず持ち、さらに**その人らしい表情を 3〜5 個**持つ（仲間になる人・スプレッドシートの人物・使徒の人の姿）。
- 人ごとのタグは `portraits.json` の `variants` に書く。下の表の「既定のタグ」を元に、その人の性格に合わせて書き替える（獣人は耳・尻尾、仮面の人は目だけ、など）。タグは**表情の特徴だけ**：画風・品質・構図・作家名・作品名・性的な語は書かない（テストが見る）。男の照れも `blush` でよい（#185）。
- 見た目（`identity`）とポーズ（`tags`）は基本の絵と一字一句同じで、表情（`face`）だけ差し替えて img2img で作る（V10）。
- 絵が無い表情は、下の「落とし先」を左から探し、どれも無ければ基本の絵を出す。だから、その人に合わない表情は持たせなくてよい。
- 新しい人を足すとき（C5〜C8 など）：`portraits.json` の人に `face` と `variants`（喜怒哀楽＋3〜5 個）を書き、`node tools/portraits.mjs` で md を作り直す。新しい表情の種類が要るときは `moods.json` と `src/data/v11_moods.js` の両方に足す（並び・落とし先をそろえる）。
- ゲームでは、出来事・結果・会話（K1）・掛け合いのデータに `mood: "shy"` のように書く。書いていない出来事は文から推す（「頬を染め」→照れ、「号泣」→泣き など。`src/data/v11_moods.js` の `MOOD_GUESS`）。既存の出来事に後から付けるときは、そのファイルを書き換えずに `D.EVENT_MOODS[出来事の id] = "surprise"` と書ける。
- 作る：`node tools/gen_portraits.mjs --variants`（全部）、`--variants --mood shy,surprise`（その表情だけ）、`--variants --only nora`（その人だけ）、`--only nora_shy`（一枚だけ）。

## 種類

| 鍵 | 名前 | 既定のタグ | 落とし先 | 使う場面 | 持つ人 |
|---|---|---|---|---|---|
| `joy` | 喜 | smile, happy | 基本 | うれしい・ほっとした | 44 |
| `anger` | 怒 | angry, frown, v-shaped eyebrows | 基本 | 怒る・苛立つ | 97 |
| `sorrow` | 哀 | sad, looking down, downturned mouth | 基本 | 悲しい・沈む | 89 |
| `fun` | 楽 | laughing, open mouth, closed eyes | 基本 | 楽しい・笑い転げる | 65 |
| `surprise` | 驚き | surprised, wide-eyed, open mouth, raised eyebrows | 怯え → 基本 | 目を丸くする・息を呑む | 1 |
| `shy` | 照れ | embarrassed, blush, looking away | 喜 → 基本 | 頬を染める・褒められて照れる（男も blush でよい。#185） | 9 |
| `troubled` | 困り | troubled, worried eyebrows, awkward smile, sweatdrop | 哀 → 基本 | 困った顔・苦笑い | 6 |
| `serious` | 真剣 | serious, determined, focused eyes, closed mouth | 基本 | 腹を決めた・本気の顔 | 13 |
| `smug` | 得意げ | smug, smirk, half-closed eyes, raised eyebrow | 楽 → 喜 → 基本 | 胸を張る・したり顔 | 13 |
| `fear` | 怯え | scared, frightened, wide-eyed, worried eyebrows, pale face, sweat | 驚き → 哀 → 基本 | 震える・青ざめる | 0 |
| `tired` | 疲れ | tired, exhausted, half-closed eyes, sweat, open mouth | 困り → 哀 → 基本 | へたり込む・息が上がる | 0 |
| `cry` | 泣き | crying, tears, streaming tears, open mouth | 哀 → 基本 | 泣き崩れる・号泣（哀より強い） | 1 |
| `panic` | 慌て | flustered, panicking, wide-eyed, sweatdrop, wavy mouth | 困り → 驚き → 怯え → 基本 | あたふたする・しくじりに慌てる | 6 |
| `pout` | すね | pout, puffed cheeks, looking away | 怒 → 基本 | むくれる・すねる | 0 |
| `faint_smile` | ほんの少し笑う | slight smile, soft eyes, closed mouth | 喜 → 基本 | 無表情な人がわずかに笑う | 5 |
| `sparkle` | 目を輝かせる | excited, sparkling eyes, smile, open mouth | 楽 → 喜 → 基本 | 好きな物を前に夢中になる | 4 |
| `cold` | 冷たい目 | cold eyes, narrowed eyes, expressionless, contempt | 真剣 → 怒 → 基本 | 見下す・切り捨てる・剣を抜いた顔 | 2 |
| `wicked` | 悪い笑み | evil smile, sinister grin, narrowed eyes, shaded face | 得意げ → 楽 → 基本 | 企む・本性がのぞく | 3 |
| `drunk` | 酔い | drunk, flushed face, blush, half-closed eyes, wavy mouth | 楽 → 照れ → 喜 → 基本 | 酒が回った顔 | 1 |
| `sleepy` | 眠い | sleepy, drowsy, half-closed eyes, yawning | 疲れ → 基本 | あくび・うとうと | 4 |
| `exasperated` | 呆れ | exasperated, half-closed eyes, deadpan, sigh | 困り → 疲れ → 基本 | ため息・あきれ顔 | 0 |
| `smitten` | うっとり | smitten, blush, dreamy eyes, gentle smile | 照れ → 喜 → 基本 | 見とれる・想い人を思う | 0 |

## 人ごとの割り当て（131 人）

| 人 | 喜怒哀楽のほかの表情 |
|---|---|
| ディル（`dil`） | 得意げ（`smug`） |
| カイデル（`kaidel`） | 真剣（`serious`） |
| ノラミ（ノラ）（`nora`） | — |
| シェイラ（`sheila`） | ほんの少し笑う（`faint_smile`） |
| ルイ（`rui`） | — |
| ゼリナ（`zerina`） | — |
| エルネア（`elnea`） | 照れ（`shy`） |
| ナタリア（`natalia`） | 酔い（`drunk`） |
| ヴァレオン（`valeon`） | — |
| ライオス（`raios`） | 困り（`troubled`） |
| セリオス（`serios`） | ほんの少し笑う（`faint_smile`） |
| ファリナ（`farina`） | — |
| アルマン（`greol`） | 照れ（`shy`） |
| ネイラス（`neilas`） | 慌て（`panic`） |
| ティリア（`tiria`） | 慌て（`panic`） |
| オルヴェイン（第六騎士団の団長）（`sixth`） | — |
| アンジェリカ（`angelica`） | 慌て（`panic`） |
| ロウェル（王国軍の隊長）（`captain`） | — |
| モルヴァン（王国に雇われた博士）（`doctor`） | 悪い笑み（`wicked`） |
| ヘル爺（`hermes`） | — |
| ユリナ（`yurina`） | — |
| フェリダ（`ferida`） | 真剣（`serious`） |
| シグ（`sig`） | — |
| ライーシャ（`raisha`） | 眠い（`sleepy`） |
| ゾルク（`zork`） | — |
| マリエッタ（流れの大槌使い）（`bride`） | 泣き（`cry`） |
| テオ（「ボク」の娘。名乗るまでは呼び名）（`boku`） | 目を輝かせる（`sparkle`） |
| グレイオル（`greiol`） | — |
| ダリオ（`dario`） | — |
| エルナ（`erna`） | ほんの少し笑う（`faint_smile`） |
| ヴァルグ（`valg`） | 得意げ（`smug`） |
| マルヴィナ（`malvina`） | — |
| カティア（`katia`） | 照れ（`shy`） |
| アリシア（`alicia`） | — |
| 微笑の使徒カルマトス（`mirza`） | 悪い笑み（`wicked`） |
| 砂塵の使徒ドレイゼ（`zalve`） | — |
| 生き聖女ユヴァリエ（`aurelia`） | — |
| 香煙の使徒ベリエラ（`yoihime`） | 目を輝かせる（`sparkle`） |
| 苔衣の使徒セグリトス（`mordu`） | 困り（`troubled`） |
| 剣翼の使徒ヴァルグレア（`azlag`） | 慌て（`panic`） |
| 百面の使徒ディエラン（北の賢人）（`chezar`） | — |
| 逆夢の使徒ベルファス（`yura`） | 眠い（`sleepy`） |
| シグルン（`sigrun`） | — |
| ベルトラン（`bertrand`） | — |
| イルゼ（`ilse`） | 得意げ（`smug`） |
| トゥーラ（`tula`） | 照れ（`shy`） |
| ミルレーネ（`mirlene`） | 真剣（`serious`） |
| 薄布の娘（使徒サルフィエル）（`salphiel`） | — |
| 人形遣いの爺さん（眷属ミュゼット）（`musette`） | — |
| ゲルハルト（`gerhard`） | — |
| バルトロ（`bartolo`） | — |
| クラリス（`clarisse`） | 慌て（`panic`） |
| ティッタ（`titta`） | 得意げ（`smug`） |
| イオリ（`iori`） | — |
| ドロテア（`dorothea`） | 得意げ（`smug`） |
| ルシアン（`lucien`） | ほんの少し笑う（`faint_smile`） |
| バルナベ（`barnabe`） | — |
| セレヴァン（`selevan`） | 目を輝かせる（`sparkle`） |
| オーバン（`aubin`） | — |
| ラザール（`lazare`） | — |
| ロドルフ（`rodolphe`） | — |
| マルゴ（`margot`） | — |
| ソレンヌ（`solenne`） | 照れ（`shy`） |
| ピピネル（`pipinelle`） | — |
| リゼット（`lisette`） | — |
| グラモン（`gramont`） | — |
| ベランジェール（`berangere`） | 照れ（`shy`） |
| マリオン（`marion`） | — |
| シルヴェストル（`sylvestre`） | — |
| オデット（`odette`） | — |
| ヴォルフラム（`wolfram`） | — |
| ハルトムート（`hartmut`） | 照れ（`shy`） |
| グスタフ（`gustav`） | — |
| ティモ（`timo`） | — |
| ノエリス（`noeris`） | — |
| イングリット（`ingrid`） | — |
| ルミア（`lumia`） | — |
| ジークリンデ（`sieglinde`） | 困り（`troubled`） |
| アンネリーゼ（`annelise`） | 照れ（`shy`） |
| ラドミラ（`radmila`） | 冷たい目（`cold`） |
| オトマール（`otmar`） | — |
| オーレン（`oren`） | 目を輝かせる（`sparkle`） |
| ディートリヒ（`dietrich`） | 得意げ（`smug`） |
| マティアス（`matthias`） | 困り（`troubled`） |
| リーゼル（`liesel`） | — |
| ギグラ（`gigra`） | — |
| ヴァルドゥン（`valdun`） | — |
| ゲンサイ（`gensai`） | — |
| ツユハ（`tsuyuha`） | 眠い（`sleepy`） |
| タキマル（`takimaru`） | — |
| ユリエン（`yurien`） | ほんの少し笑う（`faint_smile`） |
| イズラ（`izra`） | — |
| アンセルモ（`anselmo`） | — |
| ポルフ（`polf`） | — |
| ルドガー（`rudger`） | 冷たい目（`cold`） |
| リオネッタ（`rionetta`） | — |
| ゼルギス（`graul`） | — |
| ロスヴィタ（`roswitha`） | 困り（`troubled`） |
| ヨナス（`jonas`） | 慌て（`panic`） |
| ブルーノ（`bruno`） | — |
| トルーデ（`trude`） | — |
| ソウハク（`souhaku`） | — |
| アデル（`adele`） | — |
| セレスティン（`celestin`） | — |
| フェリクス（`felix`） | 照れ（`shy`） |
| ヴィットリオ（`vittorio`） | 得意げ（`smug`） |
| ヴィオレーヌ（`violaine`） | 真剣（`serious`） |
| 山の館の伯爵さま（使徒ユズエル）（`yuzuel`） | — |
| 聖歌隊の若者（眷属セヴラン）（`severin`） | 悪い笑み（`wicked`） |
| 香売りの姐さん（眷属ルフィナ）（`rufina`） | 困り（`troubled`） |
| コンスタンス（`constance`） | — |
| アンブロワーズ（`ambroise`） | 眠い（`sleepy`） |
| シオネ（`shione`） | — |
| フィリエ（`filie`） | — |
| レオポルト（`leopold`） | 得意げ（`smug`） |
| ゴーティエ（`gauthier`） | 真剣（`serious`） |
| マグダ（`magda`） | 真剣（`serious`） |
| ボードワン（`baudouin`） | — |
| オルテンシア（`ortensia`） | 得意げ（`smug`） |
| イスメネ（`ismene`） | 驚き（`surprise`） |
| シャノ（`shano`） | 得意げ（`smug`） |
| オトセ（`otose`） | 得意げ（`smug`） |
| グィド（`guido`） | 真剣（`serious`） |
| ピエトロ（`pietro`） | 真剣（`serious`） |
| マルグリット（`marguerite`） | 得意げ（`smug`） |
| ヒルデガルト（`hildegard`） | 真剣（`serious`） |
| アガテ（`agathe`） | 真剣（`serious`） |
| セラフィナ（`seraphina`） | 真剣（`serious`） |
| トマス（`tomas`） | 真剣（`serious`） |
| ガンゾウ（`ganzou`） | 得意げ（`smug`） |
| ヤエ（`yae`） | 真剣（`serious`） |
