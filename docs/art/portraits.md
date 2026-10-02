# 人物の絵（Stable Diffusion のプロンプト一覧）

このファイルは `node tools/portraits.mjs` で `docs/art/portraits.json` から作る。直すときは json を直してから作り直す。

## 作り方

- 大きさ：**512×640**（縦長・胸から上・顔が上から 1/3 あたり）。形式：**webp**、1枚 **80KB 以下**。
- 名のある人物は**見た目（固定）**（`identity`：髪の色・長さ・髪型、目の色と形、肌、眉、印、服の色と形、いつも身につけている物、年齢と体格）を持つ。プロンプトはその後ろに、ポーズ・手に持つ物のタグ、表情の順に付く。差分も見た目とポーズは同じで、表情だけ替える。
- 男の人は**型**（`type`：`ojisan`・`classic`・`bishonen`・`brute`・`elder`・`boy`）で顔立ちを替える。型の語は `style_male.json` の `types` にあり、生成のときに前に足される（[README.md](README.md)）。
- タグはその人の**特徴だけ**。画風・品質（masterpiece・anime style など）・構図・ネガティブは持ち主の側で足す。
- できた画像は表の「ファイル」の名前で置く（例：`assets/portraits/dil.webp`）。`node tools/build.mjs` で HTML に埋め込まれ、ゲームはその人をこの画像で描く。無い人は今の canvas の絵のまま。
- 作るのは `node tools/gen_portraits.mjs`（AUTOMATIC1111 / Forge の API。手順は [README.md](README.md)）。名のある人物は、気に入った絵の seed を `--keep <id>` で一覧に残す（名前の下に出る）。作り直すときはその seed を使う。
- **表情**は基本の絵の顔（プロンプトでは特徴のタグの後ろに付く）。**喜・怒・哀・楽**がある人は、基本の絵から差分を作る（`node tools/gen_portraits.mjs --variants`。img2img で表情のタグだけ差し替える）。ファイルは `<id>_joy.webp`・`_anger`・`_sorrow`・`_fun`。無ければ基本の絵のまま。
- png・jpg でもよい（同じ名前なら webp を使う）。埋め込みの合計が 12MB を超えるとビルドとテストが止まる（`tools/assets.mjs`）。

## 名のある人物：キャラメモ（34）

持ち主のスプレッドシート「キャラメモ」の人（`src/data/c2_people.js`。id はデータの id）。時間軸は同じなので、どの冒険で会っても同じ一人＝一枚。出来事でも仲間になってからも同じ絵。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/dil.webp` | ディル | 型：`bishonen`<br>見た目（固定）：1boy, male focus, adult, young man, 24 years old, lean, fair skin, black hair, dark hair, short hair, messy spiky hair, swept bangs, dark brown eyes, sharp eyes, thin eyebrows, untucked white shirt, open collar, rolled-up sleeves, worn brown vest, brown leather belt, daggers on belt, pencil behind ear, narrow face, pointed chin<br>hand in pocket, holding an old book with a torn cover<br>表情：sly smirk<br>喜（`_joy`）：smile, closed mouth, pleased<br>怒（`_anger`）：annoyed, frown, glaring<br>哀（`_sorrow`）：sad, looking down, downturned mouth<br>楽（`_fun`）：grin, teeth, mischievous | 本好きでずる賢い港町の青年。黒髪のはね毛、鋭い目。にやりと何か企んでいる顔 |
| `assets/portraits/kaidel.webp` | カイデル | 型：`ojisan`<br>見た目（固定）：1boy, male focus, adult, man, 30 years old, muscular, broad shoulders, tan skin, black hair, jet black hair, short hair, messy hair, black eyes, droopy eyes, thick eyebrows, stubble, scar on face, bandages on arms, worn dark grey martial arts gi, open collar, torn sleeves, black martial arts belt, rugged face, square jaw<br>hands behind head<br>表情：big grin<br>喜（`_joy`）：smile, teeth, happy<br>怒（`_anger`）：angry, clenched teeth, glaring, v-shaped eyebrows<br>哀（`_sorrow`）：sad, frown, looking down, clenched jaw<br>楽（`_fun`）：laughing, open mouth, closed eyes | 傷だらけの古武道使いの傭兵。黒髪・無精ひげ・太い眉。お気楽で、迷ったら殴る。屈託のない笑い |
| `assets/portraits/nora.webp` | ノラミ（ノラ） | 見た目（固定）：1girl, dog girl, 18 years old, athletic, curvy, tan skin, brown hair, chestnut brown hair, medium hair, messy wild hair, ahoge, brown dog ears, floppy ears, brown dog tail, brown eyes, round eyes, thick eyebrows, fang, dirt on face, brown leather hunter clothes, short sleeves, bandaged fists<br>energetic, hands on hips<br>表情：big grin<br>喜（`_joy`）：smile, open mouth, happy, wagging tail<br>怒（`_anger`）：angry, pout, v-shaped eyebrows, ears back<br>哀（`_sorrow`）：sad, teary eyes, looking down, drooping ears<br>楽（`_fun`）：laughing, open mouth, closed eyes, wagging tail | 森の犬の獣人。明るい愛すべきあほ。弓は苦手で拳の力自慢。歯を見せて笑う |
| `assets/portraits/sheila.webp` | シェイラ | 見た目（固定）：1girl, princess, 18 years old, petite, slim, pale skin, white hair, silver-white hair, long hair, straight hair, long bangs, hair between eyes, blue eyes, light blue eyes, half-closed eyes, sleepy eyes, thin eyebrows, silver hair clip, blue hooded cloak, white dress, blue gem pendant<br>holding book against chest<br>表情：expressionless<br>喜（`_joy`）：light smile, closed mouth<br>怒（`_anger`）：pout, puffed cheeks, frown<br>哀（`_sorrow`）：sad, teary eyes, looking down<br>楽（`_fun`）：smile, open mouth, sparkling eyes | 第七王子の姫。白い髪に長い前髪、眠たげな青い目。大人しそうで実はお転婆。「うん、」 |
| `assets/portraits/rui.webp` | ルイ | 見た目（固定）：1girl, child, small child, 9 years old, petite, pale skin, blue hair, light blue hair, short hair, bob cut, straight bangs, light blue eyes, half-closed eyes, thin eyebrows, faint glowing mark on back of hand, white ancient robe, gold trim, simple clothes<br>head tilt<br>表情：expressionless<br>喜（`_joy`）：slight smile<br>怒（`_anger`）：pout, slight frown<br>哀（`_sorrow`）：teary eyes, looking down<br>楽（`_fun`）：small smile, sparkling eyes | 遺跡で眠っていた無口な女の子。表情が動かない。子どもらしく |
| `assets/portraits/zerina.webp` | ゼリナ | 見た目（固定）：1girl, 23 years old, slim, light skin, light brown hair, honey brown hair, short hair, side bangs, green eyes, bright eyes, thick eyebrows, brown wide-brimmed hat with a red feather, white blouse, green merchant vest, brown leather coin pouch, large backpack<br>confident, hand on hip, holding an abacus<br>表情：closed eyes, big grin<br>喜（`_joy`）：smile, open mouth, happy, closed eyes<br>怒（`_anger`）：angry, open mouth, shouting, v-shaped eyebrows<br>哀（`_sorrow`）：sad, teary eyes, frown<br>楽（`_fun`）：laughing, open mouth, closed eyes, playful, wink | 関西言葉の商人の娘。羽根付きの帽子と大きな荷。物怖じしない、金が大好き。にかっと笑う |
| `assets/portraits/elnea.webp` | エルネア | 見た目（固定）：1girl, elf, pointy ears, 19 years old, short, plump, frumpy, fair skin, brown hair, dull brown hair, short hair, messy bob cut, ahoge, brown eyes, round eyes, thick eyebrows, soot on face, goggles on head, baggy grey work clothes, brown work apron, work gloves<br>holding a crystal ore with both hands<br>表情：worried eyebrows, open mouth, blush<br>喜（`_joy`）：smile, blush, happy, sparkling eyes<br>怒（`_anger`）：pout, frown, puffed cheeks, blush<br>哀（`_sorrow`）：sad, teary eyes, worried eyebrows, looking down<br>楽（`_fun`）：excited, open mouth, sparkling eyes, blush | エルフの鉱石おたくの技師。容姿に自信がなく、おどおど。「〜っす」 |
| `assets/portraits/natalia.webp` | ナタリア | 見た目（固定）：1girl, 24 years old, athletic, fair skin, black hair, glossy black hair, long hair, single braid, blunt bangs, dark brown eyes, half-closed eyes, thin eyebrows, blush, dark blue martial arts uniform, white sash, hand wraps<br>martial artist, drunk, hand on hip, holding a sake bottle<br>表情：grin<br>喜（`_joy`）：smile, closed eyes, happy<br>怒（`_anger`）：angry, glaring, frown, clenched teeth<br>哀（`_sorrow`）：sad, teary eyes, looking down<br>楽（`_fun`）：laughing, open mouth, playful | 王国十指の格闘家。酒好きで、ほろ酔いの笑い。実力は本物 |
| `assets/portraits/valeon.webp` | ヴァレオン | 型：`ojisan`<br>見た目（固定）：1boy, male focus, adult, mature male, king, 58 years old, muscular, broad shoulders, tan skin, ash silver hair, grey hair, medium hair, swept back wild hair, silver beard, amber eyes, sharp eyes, thick eyebrows, scar on cheek, gold crown, red royal cape, silver plate armor, greatsword on back, weathered face, deep nasolabial folds<br>crossed arms<br>表情：fierce grin<br>喜（`_joy`）：smile, teeth, proud<br>怒（`_anger`）：angry, glaring, frown, clenched teeth<br>哀（`_sorrow`）：sad, frown, closed eyes, solemn<br>楽（`_fun`）：laughing, open mouth, head back | レオネストの国王。好戦家で若返った鋼の体。獰猛に笑う |
| `assets/portraits/raios.webp` | ライオス | 型：`classic`<br>見た目（固定）：1boy, male focus, adult, prince, 32 years old, tall, muscular, large build, fair skin, dark blonde hair, golden blonde hair, long hair, low ponytail, swept back bangs, blue eyes, gentle eyes, thick eyebrows, blue plate armor, gold crest, white cape, sword at hip, chiseled jaw, noble face<br>hand on sword hilt<br>表情：gentle smile<br>喜（`_joy`）：smile, closed eyes, happy<br>怒（`_anger`）：frown, serious, stern<br>哀（`_sorrow`）：sad, worried eyebrows, looking down<br>楽（`_fun`）：laughing, open mouth, closed eyes | 第一王子。誠実で包容力のある完璧超人。よく高笑いする |
| `assets/portraits/serios.webp` | セリオス | 型：`bishonen`<br>見た目（固定）：1boy, male focus, adult, prince, 30 years old, tall, slender, pale skin, silver hair, platinum silver hair, long hair, straight hair, side-swept bangs, violet eyes, half-closed eyes, sleepy eyes, thin eyebrows, handsome, dark grey long coat, white cravat, blue gem brooch, paint stains<br>hand on chin, holding a paintbrush<br>表情：aloof | 第二王子。銀髪の天才肌、浮世離れした芸術家。遠くを見る顔 |
| `assets/portraits/farina.webp` | ファリナ | 見た目（固定）：1girl, princess, 28 years old, slim, pale skin, black hair, blue-black hair, long hair, low ponytail, straight bangs, grey eyes, narrow eyes, cold eyes, thin eyebrows, silver-rimmed glasses, dark blue noble dress, high collar, silver chain necklace<br>adjusting glasses, holding documents<br>表情：serious expression | 第三王子（女）。冷静な完璧主義者。笑わない。冷たい視線 |
| `assets/portraits/greol.webp` | グレオル | 型：`classic`<br>見た目（固定）：1boy, male focus, adult, prince, 27 years old, muscular, tan skin, brown hair, dark brown hair, short hair, messy hair, brown eyes, serious eyes, thick eyebrows, scar on cheek, dull grey worn armor, plain dark brown cape, sword at hip<br>hand on sword hilt<br>表情：frown, stern | 第四王子。生真面目で口下手な武人。むすっと真っすぐ |
| `assets/portraits/neilas.webp` | ネイラス | 型：`bishonen`<br>見た目（固定）：1boy, male focus, adult, prince, 24 years old, slender, androgynous, pale skin, black hair, dull black hair, medium hair, messy hair, long bangs, grey eyes, half-closed eyes, eye bags, thin eyebrows, dark sweater, white lab coat, sleeves past wrists<br>hunched shoulders, holding a small stone tablet<br>表情：shy, worried eyebrows | 第五王子。儚く中性的な引きこもりの研究者。目を合わせない |
| `assets/portraits/tiria.webp` | ティリア | 見た目（固定）：1girl, princess, 23 years old, slim, fair skin, chestnut hair, soft brown hair, long hair, single braid over shoulder, soft bangs, hazel eyes, gentle eyes, thin eyebrows, wheat ear in hair, dirt on cheek, neat modest green dress, white collar<br>holding a basket<br>表情：closed eyes, gentle smile<br>喜（`_joy`）：smile, open mouth, happy, closed eyes<br>怒（`_anger`）：pout, puffed cheeks, frown<br>哀（`_sorrow`）：sad, teary eyes, worried eyebrows<br>楽（`_fun`）：laughing, open mouth, closed eyes | 第六王子（女）。現場主義でにこやかな愛され姫。少し天然 |
| `assets/portraits/sixth.webp` | オルヴェイン（第六騎士団の団長） | 型：`bishonen`<br>見た目（固定）：1boy, male focus, adult, knight captain, 33 years old, tall, slim, pale skin, black hair, white streak in hair, medium hair, long bangs, black eyes, narrow eyes, cold eyes, thin eyebrows, black plate armor, silver crest, black cape, sword at hip<br>hand on sword hilt<br>表情：expressionless | 王国最強の剣。黒髪に一筋の白、冷たい目。寡黙で何を考えているか分からない |
| `assets/portraits/angelica.webp` | アンジェリカ | 見た目（固定）：1girl, woman, 31 years old, fit, light skin, dirty blonde hair, ash blonde hair, long hair, hair bun, side bangs, green eyes, sharp eyes, thick eyebrows, blue military cap, blue military uniform, light armor, gold medal, pistol in holster<br>hand on hip<br>表情：confident smile<br>喜（`_joy`）：smile, proud, closed eyes<br>怒（`_anger`）：angry, shouting, open mouth, v-shaped eyebrows<br>哀（`_sorrow`）：sad, teary eyes, frown<br>楽（`_fun`）：laughing, open mouth, hand over mouth | 王国軍の女隊長。敵だが抜けていて人がいい。おばさん呼ばわりに怒る |
| `assets/portraits/captain.webp` | ロウェル（王国軍の隊長） | 型：`classic`<br>見た目（固定）：1boy, male focus, adult, man, 28 years old, broad shoulders, fair skin, dark brown hair, short hair, neat hair, brown eyes, calm eyes, thick eyebrows, stubble, blue military uniform, light armor, spear<br>standing at attention<br>表情：calm, stoic | アンジェリカと組む隊長。寡黙で任務に忠実 |
| `assets/portraits/doctor.webp` | モルヴァン（王国に雇われた博士） | 型：`ojisan`<br>見た目（固定）：1boy, male focus, old man, 61 years old, thin, pale skin, white hair, thin white hair, short hair, receding hairline, pale grey eyes, round eyes, thin eyebrows, wrinkles, gold monocle, white lab coat, ring of keys on belt<br>hands behind back, holding a small vial<br>表情：creepy smile | 使徒を研究する学者。倫理を気にしない。にこにこして不気味 |
| `assets/portraits/hermes.webp` | ヘル爺 | 型：`elder`<br>見た目（固定）：1boy, male focus, old man, 62 years old, short, wiry, tan skin, white hair, snow white hair, short hair, wild hair, bushy white beard, blue eyes, round eyes, bushy eyebrows, brown explorer hat, brown coat, leather satchel, dirt on clothes, deep wrinkles, big nose<br>energetic, hand on hat, holding a magnifying glass<br>表情：big grin<br>喜（`_joy`）：smile, closed eyes, happy<br>怒（`_anger`）：angry, frown, open mouth, shouting<br>哀（`_sorrow`）：sad, looking down, closed eyes<br>楽（`_fun`）：laughing, open mouth, excited | 元気な考古学者の爺さん。遺跡が生きがい |
| `assets/portraits/yurina.webp` | ユリナ | 見た目（固定）：1girl, 27 years old, slim, fair skin, red hair, crimson hair, short hair, side-swept bangs, golden eyes, closed eyes, squinting, thin eyebrows, beautiful face, dark leather swordsman outfit, black gloves, sword at hip<br>hands behind back<br>表情：smirk | 直轄特殊部隊の剣士。糸目で飄々と笑う、戦うと冷徹 |
| `assets/portraits/ferida.webp` | フェリダ | 見た目（固定）：1girl, 26 years old, athletic, fair skin, blonde hair, golden blonde hair, long hair, high ponytail, blue eyes, sharp eyes, thin eyebrows, gold lightning bolt hair ornament, white plate armor, gold crest, lance<br>hand on hip<br>表情：confident smirk | 王国十指《雷突の乙女》。王国一の槍使い |
| `assets/portraits/sig.webp` | シグ | 型：`brute`<br>見た目（固定）：1boy, male focus, adult, man, 38 years old, very muscular, large build, tan skin, bald, brown beard, full beard, brown eyes, small eyes, thick eyebrows, scar on head, heavy dark grey plate armor, battle axe on back<br>crossed arms<br>表情：stern, angry eyebrows | 王国十指《戦場の鉄塊》。王国最強の盾 |
| `assets/portraits/raisha.webp` | ライーシャ | 見た目（固定）：1girl, 28 years old, slim, pale skin, dark grey hair, ash grey hair, long hair, straight hair, messy bangs, dark blue eyes, half-closed eyes, eye bags, glaring, thin eyebrows, black cloak, sword at hip<br>slouching<br>表情：bored expression | 王国十指の天才剣士。目つきが悪く、いつも気だるそう |
| `assets/portraits/zork.webp` | ゾルク | 型：`ojisan`<br>見た目（固定）：1boy, male focus, adult, man, 43 years old, wiry, tan skin, grey hair, steel grey hair, short hair, receding hairline, grey eyes, sharp eyes, thick eyebrows, black eyepatch, scar, stubble, black wide-brimmed hat, dark long coat, chain, sword<br>thumb hooked in belt, holding a wanted poster<br>表情：smirk | 王国十指《首狩りゾルク》。非公認の賞金稼ぎ |
| `assets/portraits/bride.webp` | マリエッタ（流れの大槌使い） | 見た目（固定）：1girl, woman, 34 years old, athletic, fair skin, blonde hair, golden blonde hair, long hair, wavy hair, yellow eyes, gentle eyes, thin eyebrows, black eyepatch with a yellow lightning bolt mark, white flower in hair, silver armor, war hammer resting on shoulder<br>blush, hand on hip<br>表情：closed eyes, big grin | めちゃくちゃ強い、婚期を逃したお姉さん。波打つ金髪に稲妻の眼帯。豪快に笑う |
| `assets/portraits/boku.webp` | テオ（「ボク」の娘。名乗るまでは呼び名） | 見た目（固定）：1girl, tomboy, 17 years old, slim, fair skin, brown hair, chestnut brown hair, short hair, bob cut, heterochromia, red eye, green eye, round eyes, thin eyebrows, round glasses, small dark blue top hat, dark blue short coat, white shirt, blue neck ribbon, dark blue shorts<br>holding a notebook, pushing up glasses, pencil<br>表情：open mouth, excited | ボーイッシュで自分をボクと呼ぶおたく。左右で色の違う目に小さな帽子。早口で話している |
| `assets/portraits/greiol.webp` | グレイオル | 型：`ojisan`<br>見た目（固定）：1boy, male focus, adult, emperor, 42 years old, very tall, muscular, pale skin, black hair, jet black hair, short hair, slicked back hair, ice blue eyes, sharp eyes, thick eyebrows, scars, scar on chin, black military uniform, silver-white fur cape, sword at hip, gaunt cheeks, hard jawline<br>hand on sword hilt<br>表情：expressionless<br>喜（`_joy`）：light smile, closed mouth<br>怒（`_anger`）：glaring, frown, cold eyes<br>哀（`_sorrow`）：closed eyes, solemn, slight frown<br>楽（`_fun`）：smirk, amused | ノルディアの皇帝。寡黙で冷徹な現実主義者。カリスマ |
| `assets/portraits/dario.webp` | ダリオ | 型：`ojisan`<br>見た目（固定）：1boy, male focus, old man, 59 years old, huge, very muscular, pale skin, white hair, silver white hair, short hair, white beard, full beard, grey eyes, thick white eyebrows, wrinkles, steel mask covering half of face, artificial eye, white plate armor<br>hands resting on sword pommel, greatsword planted in ground<br>表情：frown | 帝国四騎士《氷壁の父》。巨漢の老騎士。不動・実直 |
| `assets/portraits/erna.webp` | エルナ | 見た目（固定）：1girl, woman, 38 years old, slim, pale skin, red hair, dark red hair, short hair, straight bangs, grey eyes, narrow eyes, thin eyebrows, black military cap, black military coat, silver crest<br>hands behind back, holding a folded document<br>表情：expressionless | 帝国四騎士。命令をタスクとして処理する無表情。片足は義足（胸から上には出ない） |
| `assets/portraits/valg.webp` | ヴァルグ | 型：`ojisan`<br>見た目（固定）：1boy, male focus, adult, wolf boy, man, 33 years old, muscular, tan skin, grey hair, silver grey hair, medium hair, wild hair, grey wolf ears, grey wolf tail, golden eyes, sharp eyes, thick eyebrows, fangs, scar across nose, stubble, dark leather armor, fang necklace, sword at hip<br>crossed arms<br>表情：fierce grin | 帝国四騎士。狼の獣人、元野盗の首領。荒々しいが頭が切れる |
| `assets/portraits/malvina.webp` | マルヴィナ | 見た目（固定）：1girl, woman, young woman, slim, pale skin, blonde hair, pale blonde hair, long hair, straight hair, dark blue eyes, glowing left eye, cyan left eye, thin eyebrows, black cloth mask covering lower face, black cloak, black clothes, bandages, rune-etched gauntlet<br>holding staff with both hands<br>表情：calm | 帝国四騎士の女軍師。顔の下半分を布で覆い、左目が光る。年は分からない |
| `assets/portraits/katia.webp` | カティア | 見た目（固定）：1girl, princess, 19 years old, athletic, fair skin, blonde hair, golden blonde hair, long hair, ponytail, white hair ribbon, blue eyes, bright eyes, straight eyebrows, white plate armor, gold crest, sword at hip<br>hand on sword hilt<br>表情：determined, serious expression<br>喜（`_joy`）：smile, happy, blush<br>怒（`_anger`）：angry, frown, clenched teeth<br>哀（`_sorrow`）：sad, teary eyes, looking down, frown<br>楽（`_fun`）：laughing, open mouth, closed eyes | 皇帝の一人娘。正義感が強く真っすぐな努力家 |
| `assets/portraits/alicia.webp` | アリシア | 見た目（固定）：1girl, elf, high elf, long pointy ears, young woman, slim, fair skin, blonde hair, platinum blonde hair, medium hair, hair between eyes, blue eyes, sharp eyes, piercing gaze, thin eyebrows, gold circlet, white noble dress, green gem, rapier at hip<br>crossed arms<br>表情：haughty | エルメシアの最高議長。ハイエルフ（見た目は二十代前半、三百歳超）。女王のような圧 |

## 名のある人物：出来事・施設（22）

出来事や施設に出る、名前の決まった人（使徒の人の姿・眷属・宰相・店や宿の主など。使徒は `D.MAJIN` の id）。どの出来事に出るかは `src/ui/v4_assets.js` の `NAMED`。どの出来事でも同じ顔に固定してある。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/chancellor.webp` | オスヴィン（帝国の宰相） | 型：`ojisan`<br>1boy, male focus, adult, old man, 64 years old, grey hair, slicked back hair, narrow eyes, wrinkles, eye bags, black formal clothes, chain of office, hands behind back, holding a scroll<br>表情：expressionless | 帝都の王城の玉座の脇。北の陣にいることの多い皇帝に代わって謁見を仕切る宰相。表情を出さない |
| `assets/portraits/gaston.webp` | 茹で騎士ガストン | 型：`brute`<br>1boy, male focus, adult, knight, 34 years old, black hair, flushed face, red face, sweat, stubble, plate armor, no helmet, hand on back of head<br>表情：worried eyebrows, open mouth | テルグリスの大鍋で茹でられかけた騎士。真っ赤で情けない顔 |
| `assets/portraits/joachim.webp` | 脱走兵ヨアヒム | 型：`ojisan`<br>1boy, male focus, adult, soldier, 35 years old, dark brown hair, stubble, eye bags, imperial military uniform, snow on shoulders, hugging self, shivering, worn scarf<br>表情：tired, worried eyebrows | 凍えた帝国の脱走兵。もう人を殺したくない |
| `assets/portraits/mirza.webp` | 微笑の使徒カルマトス | 型：`bishonen`<br>1boy, male focus, adult, young man, beautiful, androgynous face, silver hair, long hair, red eyes, glowing eyes, gentle smile, luxurious robe, gold embroidery, holding a parasol, puppet strings on fingers, too many rings, looking down on viewer, dark aura | 人の姿の使徒（使徒リスト 28）。銀髪の美青年。豪奢な衣で、いつも微笑んでいる。人の苦しむ顔を愛でる |
| `assets/portraits/zalve.webp` | 砂塵の使徒ドレイゼ | 型：`ojisan`<br>1boy, male focus, adult, man, 45 years old, sandy hair, short hair, narrow eyes, smirk, silver monocle, gaunt, money changer, sand-colored vest, sand spilling from sleeves, hourglass, ringed eyes, hair crumbling into sand, cracks of light on skin | ブランデールの両替商（使徒リスト 64）。砂の体。袖から砂がこぼれる。嘘はつかないが全部は言わない |
| `assets/portraits/borg.webp` | 取り立て屋ボルグ | 型：`brute`<br>1boy, male focus, adult, man, 40 years old, huge man, messy hair, scar, stubble, grin, missing fingers, ragged clothes, debt collector | ドレイゼの眷属。熊のような大男 |
| `assets/portraits/aurelia.webp` | 生き聖女ユヴァリエ | 1girl, saint, 26 years old, blonde hair, long hair, large glowing butterfly wings, merciful smile, half-closed eyes, white and gold robe, sun emblem, staff, heterochromia, eye pattern on wings, floating hair | 聖都の「生き聖女」（正体は蝶翅の使徒、使徒リスト 40）。蝶の羽を後光だと思われている。慈悲深そうな微笑み |
| `assets/portraits/yoihime.webp` | 香煙の使徒ベリエラ | 1girl, woman, 28 years old, long black hair, face half hidden by incense smoke, sheer veil, narrow eyes, calm smile, layered purple robe, hanging censer on a chain, smoke, glowing golden eyes, hair dissolving into smoke, floating hair | 朧島の、香の煙をまとった女（使徒リスト 18）。煙で顔ははっきり見えない。争いを嫌い、祭りと賽遊びが好き |
| `assets/portraits/konoha.webp` | 香炉番のシオン | 1girl, 15 years old, long hair, mischievous smile, purple robe, small censer on a chain, dice cup, smoke | ベリエラの眷属。賭場の壺振りの少女。いかさまが上手（id はもとの名のまま） |
| `assets/portraits/mordu.webp` | 苔衣の使徒セグリトス | 型：`elder`<br>1boy, male focus, adult, old man, tall, gardener, bark-like skin, moss and ivy on clothes, mushrooms, spores, wide-brimmed hat, flowers on hat, glowing eyes, polite smile, black sclera, roots growing from fingers | 毒沼の庭師（使徒リスト 7。本体は樹皮に覆われたのろい獣）。穏やかで丁寧、悪意がない |
| `assets/portraits/berna.webp` | 疫医ベルナ | 1girl, plague doctor, beak mask, black hooded coat, gloves, medicine bottles | セグリトスの眷属の医者。嘴の仮面で顔は見せない。声は若い女 |
| `assets/portraits/azlag.webp` | 剣翼の使徒ヴァルグレア | 型：`ojisan`<br>1boy, male focus, adult, man, 40 years old, huge man, one black bird wing made of blades, blonde hair, glowing eyes, frown, crossed arms, black coat, slit pupils, golden eyes, feathers in hair | 刃を撃ち出す黒い鳥の使徒（使徒リスト 62）の人の姿。片翼の大男。転んだのを無かったことにする |
| `assets/portraits/chezar.webp` | 百面の使徒ディエラン（北の賢人） | 型：`elder`<br>1boy, male focus, adult, old man, 72 years old, white hair, slicked back hair, monocle, mustache, mask-like face, expressionless, noble military coat, holding a chess piece, many masks hanging at belt, porcelain skin, cracked skin, eyes on clothing | 仮面をいくつも持つ使徒（使徒リスト 23）。今は宮廷の老将の面で、宰相の客分の軍師。駒に話しかける |
| `assets/portraits/yura.webp` | 逆夢の使徒ベルファス | toddler, androgynous, 3 years old, silver hair, messy hair, eyes closed, sleeping, floating upside down, pajamas, holding a pillow, floating hair, faint glow, crescent moon | 眠り続ける幼子の姿の使徒（使徒リスト 2）。いつも目を閉じて眠っている。逆さの夢に出る。子どもらしく |
| `assets/portraits/walker.webp` | 灰色の外套の旅人（三度目に会うとノエと名乗る） | 型：`ojisan`<br>1boy, male focus, adult, man, ageless, brown hair, short hair, half-closed eyes, gentle smile, stubble, old grey cloak, traveler | 年の分からない旅人。何でも珍しそうに喜ぶ |
| `assets/portraits/captain_east.webp` | コルサーノ（東へ出る船の船長） | 型：`ojisan`<br>1boy, male focus, adult, old man, 52 years old, eyepatch, beard, sea captain, captain hat, navy coat, hand on belt, smoking pipe<br>表情：slight smile | 東の果てへ出る片目の船長 |
| `assets/portraits/hans.webp` | 宿の主人ハンス | 型：`ojisan`<br>1boy, male focus, adult, middle-aged man, 58 years old, bald, apron, innkeeper, holding a ledger, quill pen behind ear<br>表情：kind smile, blush | 宿の主人。宿帳の年齢の欄で筆を止める |
| `assets/portraits/greta.webp` | 宿の女将グレタ | 1girl, middle-aged woman, 50 years old, hair bun, kerchief, apron, innkeeper, hands on hips, holding a ladle<br>表情：smile | 宿の女将。世話焼き |
| `assets/portraits/gert.webp` | パン屋の老人ゲルト | 型：`elder`<br>1boy, male focus, adult, old man, 80 years old, white hair, wrinkles, flour on face, baker, apron, holding a loaf of bread<br>表情：gentle smile | 粉だらけのパン屋の老人 |
| `assets/portraits/albert.webp` | 司祭アルベルト | 型：`classic`<br>1boy, male focus, adult, priest, 36 years old, grey hair, long hair, pince-nez, white priest vestment, sun emblem, pushing up pince-nez<br>表情：calm | 鼻眼鏡の司祭。眼鏡を押し上げる癖 |
| `assets/portraits/dominik.webp` | 串焼き屋のドミニク | 型：`brute`<br>1boy, male focus, adult, middle-aged man, 40 years old, mustache, headband, apron, grilling skewers, towel around neck<br>表情：grin | 串焼き屋の親父 |
| `assets/portraits/neumann.webp` | 古道具屋のノイマン | 型：`ojisan`<br>1boy, male focus, adult, old man, 57 years old, grey hair, narrow eyes, glasses, vest, antique dealer, holding a silver ring, jeweler's loupe on cord<br>表情：small smile | 古道具屋。品物をじっと見せる |

## 型：主人公（10）

冒険ごとに作られる主人公は一人ずつ作れないので、職業 × 性別の型に当てる（人間・若者が基本。エルフ・獣人・年齢は下の「型の足し方」）。外見の文で変わる髪や目の色は入れていない。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/hero_merc_m.webp` | 主人公：傭兵・男 | 型：`classic`<br>1boy, male focus, adult, young man, 20 years old, mercenary, leather armor, sword | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_merc_f.webp` | 主人公：傭兵・女 | 1girl, young woman, 20 years old, mercenary, leather armor, sword | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_m.webp` | 主人公：盗賊・男 | 型：`bishonen`<br>1boy, male focus, adult, young man, 20 years old, thief, dark hooded cloak, daggers | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_f.webp` | 主人公：盗賊・女 | 1girl, young woman, 20 years old, thief, dark hooded cloak, daggers | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_m.webp` | 主人公：魔法使い・男 | 型：`bishonen`<br>1boy, male focus, adult, young man, 20 years old, mage, robe, wizard hat, staff | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_f.webp` | 主人公：魔法使い・女 | 1girl, young woman, 20 years old, mage, robe, wizard hat, staff | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_m.webp` | 主人公：破戒神官・男 | 型：`classic`<br>1boy, male focus, adult, young man, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_f.webp` | 主人公：破戒神官・女 | 1girl, young woman, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_m.webp` | 主人公：侍・男 | 型：`classic`<br>1boy, male focus, adult, young man, 20 years old, samurai, kimono, light armor, katana, topknot | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_f.webp` | 主人公：侍・女 | 1girl, young woman, 20 years old, samurai, kimono, light armor, katana, ponytail | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |

## 型：名もない人（34）

名もない仲間・出来事の町の人など。人物の種類 × 性別。13 歳未満は子ども、60 歳以上は老人の型を使う。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/kind_villager_m.webp` | 町の人（男） | 型：`ojisan`<br>1boy, male focus, adult, middle-aged man, 45 years old, townsperson, simple tunic | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_villager_f.webp` | 町の人（女） | 1girl, woman, 30 years old, townsperson, simple tunic | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_merchant_m.webp` | 商人（男） | 型：`ojisan`<br>1boy, male focus, adult, middle-aged man, 45 years old, merchant, vest, coin pouch | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_merchant_f.webp` | 商人（女） | 1girl, woman, 30 years old, merchant, vest, coin pouch | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_guard_m.webp` | 衛兵（男） | 型：`ojisan`<br>1boy, male focus, adult, middle-aged man, 45 years old, town guard, helmet, tabard, spear | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_guard_f.webp` | 衛兵（女） | 1girl, woman, 30 years old, town guard, helmet, tabard, spear | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_priest_m.webp` | 神官・修道女（男） | 型：`bishonen`<br>1boy, male focus, adult, young man, 24 years old, priest, white vestment, sun emblem | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_priest_f.webp` | 神官・修道女（女） | 1girl, woman, 30 years old, priest, white vestment, sun emblem | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_noble_m.webp` | 貴族（男） | 型：`classic`<br>1boy, male focus, adult, man, 30 years old, noble, elegant clothes, jewelry | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_noble_f.webp` | 貴族（女） | 1girl, woman, 30 years old, noble, elegant clothes, jewelry | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_rogue_m.webp` | ならず者・盗賊（男） | 型：`ojisan`<br>1boy, male focus, adult, middle-aged man, 45 years old, rogue, bandana, dark leather clothes, dagger, scar | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_rogue_f.webp` | ならず者・盗賊（女） | 1girl, woman, 30 years old, rogue, bandana, dark leather clothes, dagger, scar | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_soldier_m.webp` | 兵士・傭兵団の兵（男） | 型：`ojisan`<br>1boy, male focus, adult, middle-aged man, 45 years old, soldier, armor, spear | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_soldier_f.webp` | 兵士・傭兵団の兵（女） | 1girl, woman, 30 years old, soldier, armor, spear | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_knight_m.webp` | 騎士（男） | 型：`classic`<br>1boy, male focus, adult, man, 30 years old, knight, plate armor, crest, sword | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_knight_f.webp` | 騎士（女） | 1girl, woman, 30 years old, knight, plate armor, crest, sword | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_sailor_m.webp` | 船乗り（男） | 型：`brute`<br>1boy, male focus, adult, man, 38 years old, sailor, striped shirt, bandana, earring | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_sailor_f.webp` | 船乗り（女） | 1girl, woman, 30 years old, sailor, striped shirt, bandana, earring | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_mage_m.webp` | 魔法使い（男） | 型：`bishonen`<br>1boy, male focus, adult, young man, 24 years old, mage, dark blue robe, staff | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_mage_f.webp` | 魔法使い（女） | 1girl, woman, 30 years old, mage, dark blue robe, staff | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_ronin_m.webp` | 八雲の人（侍・巫女）（男） | 型：`ojisan`<br>1boy, male focus, adult, middle-aged man, 45 years old, samurai, kimono, katana | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_ronin_f.webp` | 八雲の人（侍・巫女）（女） | 1girl, woman, 30 years old, samurai, kimono, katana | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_host_m.webp` | 宿や酒場の主（男） | 型：`brute`<br>1boy, male focus, adult, man, 38 years old, innkeeper, apron, friendly smile | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_host_f.webp` | 宿や酒場の主（女） | 1girl, woman, 30 years old, innkeeper, apron, friendly smile | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_beggar_m.webp` | 物乞い・囚人（男） | 型：`ojisan`<br>1boy, male focus, adult, middle-aged man, 45 years old, ragged clothes, dirty, tired | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_beggar_f.webp` | 物乞い・囚人（女） | 1girl, woman, 30 years old, ragged clothes, dirty, tired | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_archer_m.webp` | 弓使い・狩人（男） | 型：`ojisan`<br>1boy, male focus, adult, middle-aged man, 45 years old, hunter, archer, green hooded cloak, bow | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_archer_f.webp` | 弓使い・狩人（女） | 1girl, woman, 30 years old, hunter, archer, green hooded cloak, bow | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_adventurer_m.webp` | 冒険者（男） | 型：`classic`<br>1boy, male focus, adult, man, 30 years old, adventurer, leather armor, sword | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_adventurer_f.webp` | 冒険者（女） | 1girl, woman, 30 years old, adventurer, leather armor, sword | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_elder_m.webp` | 老人（男） | 型：`elder`<br>1boy, male focus, adult, old man, old, wrinkles, grey hair, 70 years old, simple robe | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_elder_f.webp` | 老人（女） | 1girl, old woman, old, wrinkles, grey hair, 70 years old, simple robe | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_child_m.webp` | 子ども（男） | 型：`boy`<br>1boy, male focus, boy, child, 10 years old, simple clothes, small | 名もない子ども。子どもらしく |
| `assets/portraits/kind_child_f.webp` | 子ども（女） | 1girl, girl, child, 10 years old, simple clothes, small | 名もない子ども。子どもらしく |

## 型の足し方（任意）

型の画像は、性別・種族が合うもののうち、獣・年齢が一番近いものを使う。表の行は人間だけなので、エルフ・獣人は下の画像を足すまで今の canvas の絵のまま。足したいときは、ファイル名の後ろに付けて、タグを替える：

- エルフ：`_elf`（例：`hero_mage_f_elf.webp`・`kind_villager_f_elf.webp`）。`elf, pointy ears` を足す。
- 獣人：`_beast_<獣>`（例：`hero_thief_m_beast_cat.webp`）か、獣を問わない `_beast`。下の表の耳と尻尾のタグを足す。
- 主人公の中年：さらに後ろに `_mid`（例：`hero_merc_m_mid.webp`）。`young man` / `young woman`・`20 years old` を `middle-aged, 45 years old` に替える。老人は `_old` で `old man / old woman, wrinkles, grey hair, 65 years old`。

| 獣 | 耳と尻尾のタグ |
|---|---|
| `wolf` | wolf ears, wolf tail |
| `dog` | dog ears, floppy ears, dog tail |
| `fox` | fox ears, fox tail |
| `cat` | cat ears, cat tail |
| `bear` | bear ears, round ears, bear tail |
| `rabbit` | rabbit ears, rabbit tail |
| `bird` | head wings, feathered ears, bird tail |
| `rat` | mouse ears, round ears, mouse tail |
