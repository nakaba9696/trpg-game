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
| `joy` | 喜 | smile, happy | 基本 | うれしい・ほっとした | 130 |
| `anger` | 怒 | angry, frown, v-shaped eyebrows | 基本 | 怒る・苛立つ | 130 |
| `sorrow` | 哀 | sad, looking down, downturned mouth | 基本 | 悲しい・沈む | 130 |
| `fun` | 楽 | laughing, open mouth, closed eyes | 基本 | 楽しい・笑い転げる | 130 |
| `surprise` | 驚き | surprised, wide-eyed, open mouth, raised eyebrows | 怯え → 基本 | 目を丸くする・息を呑む | 44 |
| `shy` | 照れ | embarrassed, blush, looking away | 喜 → 基本 | 頬を染める・褒められて照れる（男も blush でよい。#185） | 31 |
| `troubled` | 困り | troubled, worried eyebrows, awkward smile, sweatdrop | 哀 → 基本 | 困った顔・苦笑い | 33 |
| `serious` | 真剣 | serious, determined, focused eyes, closed mouth | 基本 | 腹を決めた・本気の顔 | 76 |
| `smug` | 得意げ | smug, smirk, half-closed eyes, raised eyebrow | 楽 → 喜 → 基本 | 胸を張る・したり顔 | 39 |
| `fear` | 怯え | scared, frightened, wide-eyed, worried eyebrows, pale face, sweat | 驚き → 哀 → 基本 | 震える・青ざめる | 6 |
| `tired` | 疲れ | tired, exhausted, half-closed eyes, sweat, open mouth | 困り → 哀 → 基本 | へたり込む・息が上がる | 12 |
| `cry` | 泣き | crying, tears, streaming tears, open mouth | 哀 → 基本 | 泣き崩れる・号泣（哀より強い） | 13 |
| `panic` | 慌て | flustered, panicking, wide-eyed, sweatdrop, wavy mouth | 困り → 驚き → 怯え → 基本 | あたふたする・しくじりに慌てる | 29 |
| `pout` | すね | pout, puffed cheeks, looking away | 怒 → 基本 | むくれる・すねる | 9 |
| `faint_smile` | ほんの少し笑う | slight smile, soft eyes, closed mouth | 喜 → 基本 | 無表情な人がわずかに笑う | 55 |
| `sparkle` | 目を輝かせる | excited, sparkling eyes, smile, open mouth | 楽 → 喜 → 基本 | 好きな物を前に夢中になる | 25 |
| `cold` | 冷たい目 | cold eyes, narrowed eyes, expressionless, contempt | 真剣 → 怒 → 基本 | 見下す・切り捨てる・剣を抜いた顔 | 33 |
| `wicked` | 悪い笑み | evil smile, sinister grin, narrowed eyes, shaded face | 得意げ → 楽 → 基本 | 企む・本性がのぞく | 19 |
| `drunk` | 酔い | drunk, flushed face, blush, half-closed eyes, wavy mouth | 楽 → 照れ → 喜 → 基本 | 酒が回った顔 | 4 |
| `sleepy` | 眠い | sleepy, drowsy, half-closed eyes, yawning | 疲れ → 基本 | あくび・うとうと | 14 |
| `exasperated` | 呆れ | exasperated, half-closed eyes, deadpan, sigh | 困り → 疲れ → 基本 | ため息・あきれ顔 | 14 |
| `smitten` | うっとり | smitten, blush, dreamy eyes, gentle smile | 照れ → 喜 → 基本 | 見とれる・想い人を思う | 10 |

## 人ごとの割り当て（130 人）

| 人 | 喜怒哀楽のほかの表情 |
|---|---|
| ディル（`dil`） | 得意げ（`smug`）・驚き（`surprise`）・慌て（`panic`）・呆れ（`exasperated`） |
| カイデル（`kaidel`） | 真剣（`serious`）・驚き（`surprise`）・困り（`troubled`） |
| ノラミ（ノラ）（`nora`） | 目を輝かせる（`sparkle`）・驚き（`surprise`）・泣き（`cry`）・すね（`pout`）・照れ（`shy`） |
| シェイラ（`sheila`） | ほんの少し笑う（`faint_smile`）・照れ（`shy`）・目を輝かせる（`sparkle`）・真剣（`serious`）・驚き（`surprise`） |
| ルイ（`rui`） | ほんの少し笑う（`faint_smile`）・眠い（`sleepy`）・驚き（`surprise`）・泣き（`cry`） |
| ゼリナ（`zerina`） | 得意げ（`smug`）・目を輝かせる（`sparkle`）・呆れ（`exasperated`）・驚き（`surprise`） |
| エルネア（`elnea`） | 照れ（`shy`）・目を輝かせる（`sparkle`）・慌て（`panic`）・泣き（`cry`）・怯え（`fear`） |
| ナタリア（`natalia`） | 酔い（`drunk`）・真剣（`serious`）・疲れ（`tired`）・驚き（`surprise`） |
| ヴァレオン（`valeon`） | 目を輝かせる（`sparkle`）・真剣（`serious`）・驚き（`surprise`） |
| ライオス（`raios`） | 困り（`troubled`）・真剣（`serious`）・驚き（`surprise`） |
| セリオス（`serios`） | ほんの少し笑う（`faint_smile`）・目を輝かせる（`sparkle`）・驚き（`surprise`） |
| ファリナ（`farina`） | ほんの少し笑う（`faint_smile`）・慌て（`panic`）・冷たい目（`cold`） |
| グレオル（`greol`） | 照れ（`shy`）・困り（`troubled`）・真剣（`serious`） |
| ネイラス（`neilas`） | 慌て（`panic`）・ほんの少し笑う（`faint_smile`）・目を輝かせる（`sparkle`）・怯え（`fear`） |
| ティリア（`tiria`） | 慌て（`panic`）・驚き（`surprise`）・目を輝かせる（`sparkle`） |
| オルヴェイン（第六騎士団の団長）（`sixth`） | ほんの少し笑う（`faint_smile`）・冷たい目（`cold`）・驚き（`surprise`） |
| アンジェリカ（`angelica`） | 慌て（`panic`）・照れ（`shy`）・得意げ（`smug`）・驚き（`surprise`） |
| ロウェル（王国軍の隊長）（`captain`） | ほんの少し笑う（`faint_smile`）・困り（`troubled`）・真剣（`serious`） |
| モルヴァン（王国に雇われた博士）（`doctor`） | 悪い笑み（`wicked`）・目を輝かせる（`sparkle`）・冷たい目（`cold`） |
| ヘル爺（`hermes`） | 目を輝かせる（`sparkle`）・驚き（`surprise`）・疲れ（`tired`） |
| ユリナ（`yurina`） | 冷たい目（`cold`）・真剣（`serious`）・驚き（`surprise`） |
| フェリダ（`ferida`） | 真剣（`serious`）・得意げ（`smug`）・驚き（`surprise`） |
| シグ（`sig`） | 真剣（`serious`）・驚き（`surprise`）・困り（`troubled`） |
| ライーシャ（`raisha`） | 眠い（`sleepy`）・冷たい目（`cold`）・ほんの少し笑う（`faint_smile`） |
| ゾルク（`zork`） | 悪い笑み（`wicked`）・真剣（`serious`）・得意げ（`smug`） |
| マリエッタ（流れの大槌使い）（`bride`） | 泣き（`cry`）・うっとり（`smitten`）・すね（`pout`） |
| テオ（「ボク」の娘。名乗るまでは呼び名）（`boku`） | 目を輝かせる（`sparkle`）・照れ（`shy`）・慌て（`panic`）・怯え（`fear`） |
| グレイオル（`greiol`） | ほんの少し笑う（`faint_smile`）・冷たい目（`cold`）・真剣（`serious`）・驚き（`surprise`） |
| ダリオ（`dario`） | 真剣（`serious`）・ほんの少し笑う（`faint_smile`）・驚き（`surprise`） |
| エルナ（`erna`） | ほんの少し笑う（`faint_smile`）・冷たい目（`cold`）・驚き（`surprise`） |
| ヴァルグ（`valg`） | 得意げ（`smug`）・真剣（`serious`）・驚き（`surprise`） |
| マルヴィナ（`malvina`） | 真剣（`serious`）・冷たい目（`cold`）・ほんの少し笑う（`faint_smile`） |
| カティア（`katia`） | 照れ（`shy`）・真剣（`serious`）・困り（`troubled`）・驚き（`surprise`） |
| アリシア（`alicia`） | 冷たい目（`cold`）・得意げ（`smug`）・ほんの少し笑う（`faint_smile`） |
| 微笑の使徒カルマトス（`mirza`） | 悪い笑み（`wicked`）・冷たい目（`cold`）・うっとり（`smitten`） |
| 砂塵の使徒ドレイゼ（`zalve`） | 得意げ（`smug`）・冷たい目（`cold`）・驚き（`surprise`） |
| 生き聖女ユヴァリエ（`aurelia`） | 冷たい目（`cold`）・悪い笑み（`wicked`）・真剣（`serious`） |
| 香煙の使徒ベリエラ（`yoihime`） | 目を輝かせる（`sparkle`）・得意げ（`smug`）・困り（`troubled`） |
| 苔衣の使徒セグリトス（`mordu`） | 困り（`troubled`）・驚き（`surprise`）・眠い（`sleepy`） |
| 剣翼の使徒ヴァルグレア（`azlag`） | 慌て（`panic`）・真剣（`serious`）・得意げ（`smug`） |
| 百面の使徒ディエラン（北の賢人）（`chezar`） | ほんの少し笑う（`faint_smile`）・冷たい目（`cold`）・悪い笑み（`wicked`） |
| 逆夢の使徒ベルファス（`yura`） | 眠い（`sleepy`）・驚き（`surprise`）・ほんの少し笑う（`faint_smile`） |
| ベルトラン（`bertrand`） | 冷たい目（`cold`）・困り（`troubled`）・ほんの少し笑う（`faint_smile`） |
| イルゼ（`ilse`） | 得意げ（`smug`）・慌て（`panic`）・驚き（`surprise`）・困り（`troubled`） |
| トゥーラ（`tula`） | 照れ（`shy`）・すね（`pout`）・驚き（`surprise`） |
| ミルレーネ（`mirlene`） | 真剣（`serious`）・困り（`troubled`）・うっとり（`smitten`）・驚き（`surprise`）・怯え（`fear`） |
| 薄布の娘（使徒サルフィエル）（`salphiel`） | ほんの少し笑う（`faint_smile`）・真剣（`serious`）・冷たい目（`cold`） |
| 人形遣いの爺さん（眷属ミュゼット）（`musette`） | ほんの少し笑う（`faint_smile`）・呆れ（`exasperated`）・疲れ（`tired`） |
| ゲルハルト（`gerhard`） | 目を輝かせる（`sparkle`）・真剣（`serious`）・驚き（`surprise`） |
| バルトロ（`bartolo`） | 悪い笑み（`wicked`）・慌て（`panic`）・得意げ（`smug`） |
| クラリス（`clarisse`） | 慌て（`panic`）・照れ（`shy`）・泣き（`cry`）・真剣（`serious`） |
| ティッタ（`titta`） | 得意げ（`smug`）・呆れ（`exasperated`）・驚き（`surprise`） |
| イオリ（`iori`） | 眠い（`sleepy`）・照れ（`shy`）・真剣（`serious`）・ほんの少し笑う（`faint_smile`） |
| ドロテア（`dorothea`） | 得意げ（`smug`）・うっとり（`smitten`）・驚き（`surprise`） |
| ルシアン（`lucien`） | ほんの少し笑う（`faint_smile`）・困り（`troubled`）・真剣（`serious`）・呆れ（`exasperated`） |
| バルナベ（`barnabe`） | 驚き（`surprise`）・照れ（`shy`）・真剣（`serious`）・泣き（`cry`）・慌て（`panic`） |
| セレヴァン（`selevan`） | 目を輝かせる（`sparkle`）・悪い笑み（`wicked`）・冷たい目（`cold`）・ほんの少し笑う（`faint_smile`） |
| オーバン（`aubin`） | 眠い（`sleepy`）・真剣（`serious`）・酔い（`drunk`）・得意げ（`smug`） |
| ラザール（`lazare`） | 得意げ（`smug`）・照れ（`shy`）・慌て（`panic`）・真剣（`serious`） |
| ロドルフ（`rodolphe`） | 冷たい目（`cold`）・ほんの少し笑う（`faint_smile`）・真剣（`serious`）・呆れ（`exasperated`） |
| マルゴ（`margot`） | 得意げ（`smug`）・悪い笑み（`wicked`）・目を輝かせる（`sparkle`）・真剣（`serious`）・うっとり（`smitten`） |
| ソレンヌ（`solenne`） | 照れ（`shy`）・慌て（`panic`）・真剣（`serious`）・困り（`troubled`）・うっとり（`smitten`） |
| ピピネル（`pipinelle`） | 得意げ（`smug`）・すね（`pout`）・眠い（`sleepy`）・ほんの少し笑う（`faint_smile`） |
| リゼット（`lisette`） | 目を輝かせる（`sparkle`）・悪い笑み（`wicked`）・眠い（`sleepy`）・困り（`troubled`） |
| グラモン（`gramont`） | 冷たい目（`cold`）・真剣（`serious`）・得意げ（`smug`） |
| ベランジェール（`berangere`） | 照れ（`shy`）・すね（`pout`）・得意げ（`smug`） |
| マリオン（`marion`） | 呆れ（`exasperated`）・ほんの少し笑う（`faint_smile`）・真剣（`serious`） |
| シルヴェストル（`sylvestre`） | 真剣（`serious`）・ほんの少し笑う（`faint_smile`）・疲れ（`tired`） |
| オデット（`odette`） | 悪い笑み（`wicked`）・冷たい目（`cold`）・ほんの少し笑う（`faint_smile`） |
| ヴォルフラム（`wolfram`） | 困り（`troubled`）・真剣（`serious`）・ほんの少し笑う（`faint_smile`）・疲れ（`tired`） |
| ハルトムート（`hartmut`） | 照れ（`shy`）・泣き（`cry`）・うっとり（`smitten`）・慌て（`panic`） |
| グスタフ（`gustav`） | 悪い笑み（`wicked`）・得意げ（`smug`）・慌て（`panic`）・真剣（`serious`） |
| ティモ（`timo`） | うっとり（`smitten`）・照れ（`shy`）・真剣（`serious`）・泣き（`cry`） |
| ノエリス（`noeris`） | 悪い笑み（`wicked`）・冷たい目（`cold`）・得意げ（`smug`）・驚き（`surprise`） |
| イングリット（`ingrid`） | ほんの少し笑う（`faint_smile`）・目を輝かせる（`sparkle`）・呆れ（`exasperated`）・すね（`pout`） |
| ルミア（`lumia`） | 眠い（`sleepy`）・得意げ（`smug`）・ほんの少し笑う（`faint_smile`）・すね（`pout`） |
| ジークリンデ（`sieglinde`） | 困り（`troubled`）・照れ（`shy`）・真剣（`serious`）・疲れ（`tired`） |
| アンネリーゼ（`annelise`） | 照れ（`shy`）・慌て（`panic`）・得意げ（`smug`）・驚き（`surprise`） |
| ラドミラ（`radmila`） | 冷たい目（`cold`）・悪い笑み（`wicked`）・ほんの少し笑う（`faint_smile`）・真剣（`serious`） |
| オトマール（`otmar`） | 冷たい目（`cold`）・真剣（`serious`）・疲れ（`tired`） |
| オーレン（`oren`） | 目を輝かせる（`sparkle`）・すね（`pout`）・真剣（`serious`） |
| ディートリヒ（`dietrich`） | 得意げ（`smug`）・冷たい目（`cold`）・慌て（`panic`） |
| マティアス（`matthias`） | 困り（`troubled`）・真剣（`serious`）・照れ（`shy`） |
| リーゼル（`liesel`） | 呆れ（`exasperated`）・照れ（`shy`）・得意げ（`smug`） |
| ギグラ（`gigra`） | 照れ（`shy`）・得意げ（`smug`）・慌て（`panic`）・悪い笑み（`wicked`）・酔い（`drunk`） |
| ヴァルドゥン（`valdun`） | 真剣（`serious`）・ほんの少し笑う（`faint_smile`）・困り（`troubled`） |
| ゲンサイ（`gensai`） | 悪い笑み（`wicked`）・冷たい目（`cold`）・ほんの少し笑う（`faint_smile`）・真剣（`serious`） |
| ツユハ（`tsuyuha`） | 眠い（`sleepy`）・真剣（`serious`）・ほんの少し笑う（`faint_smile`）・呆れ（`exasperated`） |
| タキマル（`takimaru`） | 目を輝かせる（`sparkle`）・慌て（`panic`）・泣き（`cry`）・真剣（`serious`）・照れ（`shy`） |
| ユリエン（`yurien`） | ほんの少し笑う（`faint_smile`）・冷たい目（`cold`）・得意げ（`smug`）・すね（`pout`） |
| イズラ（`izra`） | 目を輝かせる（`sparkle`）・真剣（`serious`）・驚き（`surprise`）・照れ（`shy`） |
| アンセルモ（`anselmo`） | 酔い（`drunk`）・真剣（`serious`）・悪い笑み（`wicked`）・ほんの少し笑う（`faint_smile`） |
| ポルフ（`polf`） | 得意げ（`smug`）・驚き（`surprise`）・真剣（`serious`）・眠い（`sleepy`） |
| ルドガー（`rudger`） | 冷たい目（`cold`）・ほんの少し笑う（`faint_smile`）・真剣（`serious`） |
| リオネッタ（`rionetta`） | 真剣（`serious`）・困り（`troubled`）・ほんの少し笑う（`faint_smile`） |
| ゼルギス（`graul`） | 冷たい目（`cold`）・真剣（`serious`）・ほんの少し笑う（`faint_smile`） |
| ロスヴィタ（`roswitha`） | 真剣（`serious`）・困り（`troubled`）・ほんの少し笑う（`faint_smile`）・疲れ（`tired`） |
| ヨナス（`jonas`） | 慌て（`panic`）・照れ（`shy`）・真剣（`serious`） |
| ブルーノ（`bruno`） | 怯え（`fear`）・泣き（`cry`）・慌て（`panic`）・真剣（`serious`）・照れ（`shy`） |
| トルーデ（`trude`） | 得意げ（`smug`）・目を輝かせる（`sparkle`）・慌て（`panic`）・呆れ（`exasperated`） |
| ソウハク（`souhaku`） | 眠い（`sleepy`）・真剣（`serious`）・うっとり（`smitten`）・ほんの少し笑う（`faint_smile`） |
| アデル（`adele`） | 得意げ（`smug`）・照れ（`shy`）・慌て（`panic`）・真剣（`serious`） |
| セレスティン（`celestin`） | 眠い（`sleepy`）・ほんの少し笑う（`faint_smile`）・驚き（`surprise`）・冷たい目（`cold`） |
| フェリクス（`felix`） | 照れ（`shy`）・慌て（`panic`）・真剣（`serious`）・疲れ（`tired`） |
| ヴィットリオ（`vittorio`） | 得意げ（`smug`）・悪い笑み（`wicked`）・慌て（`panic`）・泣き（`cry`） |
| ヴィオレーヌ（`violaine`） | 真剣（`serious`）・困り（`troubled`）・照れ（`shy`）・泣き（`cry`） |
| 山の館の伯爵さま（使徒ユズエル）（`yuzuel`） | 得意げ（`smug`）・冷たい目（`cold`）・目を輝かせる（`sparkle`）・ほんの少し笑う（`faint_smile`） |
| 聖歌隊の若者（眷属セヴラン）（`severin`） | 悪い笑み（`wicked`）・うっとり（`smitten`）・泣き（`cry`）・冷たい目（`cold`） |
| 香売りの姐さん（眷属ルフィナ）（`rufina`） | 困り（`troubled`）・疲れ（`tired`）・ほんの少し笑う（`faint_smile`）・驚き（`surprise`） |
| コンスタンス（`constance`） | 真剣（`serious`）・疲れ（`tired`）・冷たい目（`cold`）・ほんの少し笑う（`faint_smile`） |
| アンブロワーズ（`ambroise`） | 眠い（`sleepy`）・真剣（`serious`）・冷たい目（`cold`）・呆れ（`exasperated`） |
| シオネ（`shione`） | 困り（`troubled`）・慌て（`panic`）・目を輝かせる（`sparkle`）・真剣（`serious`） |
| フィリエ（`filie`） | 困り（`troubled`）・慌て（`panic`）・ほんの少し笑う（`faint_smile`）・疲れ（`tired`） |
| レオポルト（`leopold`） | 得意げ（`smug`）・真剣（`serious`）・慌て（`panic`）・困り（`troubled`） |
| ゴーティエ（`gauthier`） | 真剣（`serious`）・ほんの少し笑う（`faint_smile`）・驚き（`surprise`） |
| マグダ（`magda`） | 真剣（`serious`）・目を輝かせる（`sparkle`）・呆れ（`exasperated`） |
| ボードワン（`baudouin`） | 呆れ（`exasperated`）・真剣（`serious`）・ほんの少し笑う（`faint_smile`） |
| オルテンシア（`ortensia`） | 得意げ（`smug`）・驚き（`surprise`）・照れ（`shy`）・悪い笑み（`wicked`）・ほんの少し笑う（`faint_smile`） |
| イスメネ（`ismene`） | 驚き（`surprise`）・照れ（`shy`）・真剣（`serious`）・目を輝かせる（`sparkle`）・怯え（`fear`） |
| シャノ（`shano`） | 得意げ（`smug`）・照れ（`shy`）・驚き（`surprise`）・困り（`troubled`） |
| オトセ（`otose`） | 得意げ（`smug`）・真剣（`serious`）・ほんの少し笑う（`faint_smile`） |
| グィド（`guido`） | 真剣（`serious`）・困り（`troubled`）・ほんの少し笑う（`faint_smile`） |
| ピエトロ（`pietro`） | 真剣（`serious`）・困り（`troubled`）・驚き（`surprise`） |
| マルグリット（`marguerite`） | 得意げ（`smug`）・真剣（`serious`）・ほんの少し笑う（`faint_smile`） |
| ヒルデガルト（`hildegard`） | 真剣（`serious`）・冷たい目（`cold`）・困り（`troubled`） |
| アガテ（`agathe`） | 真剣（`serious`）・困り（`troubled`）・ほんの少し笑う（`faint_smile`） |
| セラフィナ（`seraphina`） | 真剣（`serious`）・困り（`troubled`）・ほんの少し笑う（`faint_smile`） |
| トマス（`tomas`） | 真剣（`serious`）・ほんの少し笑う（`faint_smile`）・困り（`troubled`） |
| ガンゾウ（`ganzou`） | 得意げ（`smug`）・真剣（`serious`）・困り（`troubled`） |
| ヤエ（`yae`） | 真剣（`serious`）・ほんの少し笑う（`faint_smile`）・驚き（`surprise`） |
