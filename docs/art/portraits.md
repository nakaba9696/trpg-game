# 人物の絵（Stable Diffusion のプロンプト一覧）

このファイルは `node tools/portraits.mjs` で `docs/art/portraits.json` から作る。直すときは json を直してから作り直す。

## 作り方

- 大きさ：**512×640**（縦長・胸から上・顔が上から 1/3 あたり）。形式：**webp**、1枚 **80KB 以下**。
- タグはその人の**特徴だけ**。画風・品質（masterpiece・anime style など）・構図・ネガティブは持ち主の側で足す。
- できた画像は表の「ファイル」の名前で置く（例：`assets/portraits/dil.webp`）。`node tools/build.mjs` で HTML に埋め込まれ、ゲームはその人をこの画像で描く。無い人は今の canvas の絵のまま。
- 作るのは `node tools/gen_portraits.mjs`（AUTOMATIC1111 / Forge の API。手順は [README.md](README.md)）。名のある人物は、気に入った絵の seed を `--keep <id>` で一覧に残す（名前の下に出る）。作り直すときはその seed を使う。
- **表情**は基本の絵の顔（プロンプトでは特徴のタグの後ろに付く）。**喜・怒・哀・楽**がある人は、基本の絵から差分を作る（`node tools/gen_portraits.mjs --variants`。img2img で表情のタグだけ差し替える）。ファイルは `<id>_joy.webp`・`_anger`・`_sorrow`・`_fun`。無ければ基本の絵のまま。
- png・jpg でもよい（同じ名前なら webp を使う）。埋め込みの合計が 12MB を超えるとビルドとテストが止まる（`tools/assets.mjs`）。

## 名のある人物：キャラメモ（34）

持ち主のスプレッドシート「キャラメモ」の人（`src/data/c2_people.js`。id はデータの id）。時間軸は同じなので、どの冒険で会っても同じ一人＝一枚。出来事でも仲間になってからも同じ絵。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/dil.webp` | ディル | 1boy, young man, 24 years old, brown hair, messy hair, narrow eyes, slim, worn vest, rolled-up sleeves, daggers on belt, hand in pocket, holding an old book with a torn cover, pencil behind ear<br>表情：sly smirk<br>喜（`_joy`）：smile, closed mouth, pleased<br>怒（`_anger`）：annoyed, frown, glaring<br>哀（`_sorrow`）：sad, looking down, downturned mouth<br>楽（`_fun`）：grin, teeth, mischievous | 本好きでずる賢い港町の青年。にやりと何か企んでいる顔 |
| `assets/portraits/kaidel.webp` | カイデル | 1boy, man, 30 years old, dark brown hair, spiky hair, headband, scar on face, bandages, stubble, muscular, broad shoulders, red leather armor, torn clothes, hands behind head, black martial arts belt<br>表情：big grin<br>喜（`_joy`）：smile, teeth, happy<br>怒（`_anger`）：angry, clenched teeth, glaring, v-shaped eyebrows<br>哀（`_sorrow`）：sad, frown, looking down, clenched jaw<br>楽（`_fun`）：laughing, open mouth, closed eyes | 傷だらけの凄腕傭兵。お気楽で、迷ったら殴る。屈託のない笑い |
| `assets/portraits/nora.webp` | ノラミ（ノラ） | 1girl, dog girl, dog ears, floppy ears, dog tail, 18 years old, brown hair, messy hair, wild hair, brown eyes, round eyes, fang, leather hunter clothes, dirt on face, energetic, hands on hips, small wooden bow on back<br>表情：big grin<br>喜（`_joy`）：smile, open mouth, happy, wagging tail<br>怒（`_anger`）：angry, pout, v-shaped eyebrows, ears back<br>哀（`_sorrow`）：sad, teary eyes, looking down, drooping ears<br>楽（`_fun`）：laughing, open mouth, closed eyes, wagging tail | 森の犬の獣人。明るい愛すべきあほ。歯を見せて笑う |
| `assets/portraits/sheila.webp` | シェイラ | 1girl, princess, 18 years old, long hair, blonde hair, half-closed eyes, sleepy eyes, petite, slim, blue hooded cloak, gem pendant, holding book against chest, silver hair clip<br>表情：expressionless<br>喜（`_joy`）：light smile, closed mouth<br>怒（`_anger`）：pout, puffed cheeks, frown<br>哀（`_sorrow`）：sad, teary eyes, looking down<br>楽（`_fun`）：smile, open mouth, sparkling eyes | 第七王子の姫。大人しそうで実はお転婆。眠たげな目で「うん、」 |
| `assets/portraits/rui.webp` | ルイ | 1girl, child, 9 years old, small child, blue hair, short hair, bob cut, half-closed eyes, white ancient robe, simple clothes, head tilt, faint glowing mark on back of hand<br>表情：expressionless<br>喜（`_joy`）：slight smile<br>怒（`_anger`）：pout, slight frown<br>哀（`_sorrow`）：teary eyes, looking down<br>楽（`_fun`）：small smile, sparkling eyes | 遺跡で眠っていた無口な女の子。表情が動かない。子どもらしく |
| `assets/portraits/zerina.webp` | ゼリナ | 1girl, 23 years old, red hair, ponytail, freckles, kerchief, merchant vest, coin pouch, confident, hand on hip, holding an abacus<br>表情：closed eyes, big grin<br>喜（`_joy`）：smile, open mouth, happy, closed eyes<br>怒（`_anger`）：angry, open mouth, shouting, v-shaped eyebrows<br>哀（`_sorrow`）：sad, teary eyes, frown<br>楽（`_fun`）：laughing, open mouth, closed eyes, playful, wink | 関西言葉の商人の娘。物怖じしない、金が大好き。にかっと笑う |
| `assets/portraits/elnea.webp` | エルネア | 1girl, elf, pointy ears, 19 years old, short, plump, brown hair, short hair, messy bob cut, round eyes, work apron, soot on face, holding a crystal ore with both hands, goggles on head, work gloves<br>表情：worried eyebrows, open mouth, blush<br>喜（`_joy`）：smile, blush, happy, sparkling eyes<br>怒（`_anger`）：pout, frown, puffed cheeks, blush<br>哀（`_sorrow`）：sad, teary eyes, worried eyebrows, looking down<br>楽（`_fun`）：excited, open mouth, sparkling eyes, blush | エルフの鉱石おたくの技師。容姿に自信がなく、おどおど。「〜っす」 |
| `assets/portraits/natalia.webp` | ナタリア | 1girl, 24 years old, black hair, single braid, half-closed eyes, blush, drunk, martial artist, dark blue martial arts uniform, hand on hip, holding a sake bottle, hand wraps<br>表情：grin<br>喜（`_joy`）：smile, closed eyes, happy<br>怒（`_anger`）：angry, glaring, frown, clenched teeth<br>哀（`_sorrow`）：sad, teary eyes, looking down<br>楽（`_fun`）：laughing, open mouth, playful | 王国十指の格闘家。酒好きで、ほろ酔いの笑い。実力は本物 |
| `assets/portraits/valeon.webp` | ヴァレオン | 1boy, old man, king, 58 years old, grey hair, silver hair, wild hair, grey beard, amber eyes, scar, muscular, crown, red royal cape, plate armor, crossed arms, greatsword on back<br>表情：fierce grin<br>喜（`_joy`）：smile, teeth, proud<br>怒（`_anger`）：angry, glaring, frown, clenched teeth<br>哀（`_sorrow`）：sad, frown, closed eyes, solemn<br>楽（`_fun`）：laughing, open mouth, head back | レオネストの国王。好戦家で若返った鋼の体。獰猛に笑う |
| `assets/portraits/raios.webp` | ライオス | 1boy, prince, 32 years old, dark blonde hair, long hair, low ponytail, blue eyes, tall, muscular, blue plate armor, crest, hand on sword hilt, sword at hip<br>表情：gentle smile<br>喜（`_joy`）：smile, closed eyes, happy<br>怒（`_anger`）：frown, serious, stern<br>哀（`_sorrow`）：sad, worried eyebrows, looking down<br>楽（`_fun`）：laughing, open mouth, closed eyes | 第一王子。誠実で包容力のある完璧超人。よく高笑いする |
| `assets/portraits/serios.webp` | セリオス | 1boy, prince, 30 years old, silver hair, long hair, handsome, half-closed eyes, slender, dark grey coat, gem brooch, paint stains, hand on chin, holding a paintbrush<br>表情：aloof | 第二王子。銀髪の天才肌、浮世離れした芸術家。遠くを見る顔 |
| `assets/portraits/farina.webp` | ファリナ | 1girl, princess, 28 years old, black hair, long hair, low ponytail, glasses, cold eyes, narrow eyes, dark blue noble dress, chain necklace, adjusting glasses, holding documents<br>表情：serious expression | 第三王子（女）。冷静な完璧主義者。笑わない。冷たい視線 |
| `assets/portraits/greol.webp` | グレオル | 1boy, prince, 27 years old, brown hair, short hair, tan skin, scar on cheek, muscular, dull worn armor, hand on sword hilt, sword at hip, plain dark cape<br>表情：frown, stern | 第四王子。生真面目で口下手な武人。むすっと真っすぐ |
| `assets/portraits/neilas.webp` | ネイラス | 1boy, prince, 24 years old, black hair, messy hair, androgynous, pale skin, half-closed eyes, eye bags, white lab coat, hunched shoulders, sleeves past wrists, holding a small stone tablet<br>表情：shy, worried eyebrows | 第五王子。儚く中性的な引きこもりの研究者。目を合わせない |
| `assets/portraits/tiria.webp` | ティリア | 1girl, princess, 23 years old, light brown hair, soft hair, braid, freckles, kerchief, modest green dress, apron, dirt on cheek, holding a basket, wheat ear in hair<br>表情：closed eyes, gentle smile<br>喜（`_joy`）：smile, open mouth, happy, closed eyes<br>怒（`_anger`）：pout, puffed cheeks, frown<br>哀（`_sorrow`）：sad, teary eyes, worried eyebrows<br>楽（`_fun`）：laughing, open mouth, closed eyes | 第六王子（女）。現場主義でにこやかな愛され姫。少し天然 |
| `assets/portraits/sixth.webp` | 第六騎士団の団長 | 1boy, knight captain, 33 years old, black hair, slicked back hair, narrow eyes, slim, black plate armor, crest, hand on sword hilt, sword at hip, black cape<br>表情：expressionless | 王国最強の剣。寡黙で何を考えているか分からない |
| `assets/portraits/angelica.webp` | アンジェリカ | 1girl, woman, 31 years old, dirty blonde hair, hair bun, military cap, sharp eyes, blue military uniform, armor, hand on hip, pistol in holster, medal<br>表情：confident smile<br>喜（`_joy`）：smile, proud, closed eyes<br>怒（`_anger`）：angry, shouting, open mouth, v-shaped eyebrows<br>哀（`_sorrow`）：sad, teary eyes, frown<br>楽（`_fun`）：laughing, open mouth, hand over mouth | 王国軍の女隊長。敵だが抜けていて人がいい。おばさん呼ばわりに怒る |
| `assets/portraits/captain.webp` | 寡黙な隊長 | 1boy, man, 28 years old, dark brown hair, short hair, stubble, blue military uniform, armor, spear, broad shoulders, standing at attention<br>表情：calm, stoic | アンジェリカと組む隊長。寡黙で任務に忠実 |
| `assets/portraits/doctor.webp` | 博士 | 1boy, old man, 61 years old, white hair, receding hairline, monocle, wrinkles, round eyes, white lab coat, keys, hands behind back, holding a small vial<br>表情：creepy smile | 使徒を研究する学者。倫理を気にしない。にこにこして不気味 |
| `assets/portraits/hermes.webp` | ヘル爺 | 1boy, old man, 62 years old, white hair, wild hair, white beard, round eyes, explorer hat, brown coat, dirt, energetic, hand on hat, magnifying glass, satchel<br>表情：big grin<br>喜（`_joy`）：smile, closed eyes, happy<br>怒（`_anger`）：angry, frown, open mouth, shouting<br>哀（`_sorrow`）：sad, looking down, closed eyes<br>楽（`_fun`）：laughing, open mouth, excited | 元気な考古学者の爺さん。遺跡が生きがい |
| `assets/portraits/yurina.webp` | ユリナ | 1girl, 27 years old, red hair, short hair, closed eyes, slim, dark leather swordsman outfit, hands behind back, sword at hip<br>表情：smirk | 直轄特殊部隊の剣士。糸目で飄々と笑う、戦うと冷徹 |
| `assets/portraits/ferida.webp` | フェリダ | 1girl, 26 years old, blonde hair, ponytail, sharp eyes, white plate armor, crest, lance, hand on hip, lightning bolt hair ornament<br>表情：confident smirk | 王国十指《雷突の乙女》。王国一の槍使い |
| `assets/portraits/sig.webp` | シグ | 1boy, man, 38 years old, bald, brown beard, scar, very muscular, large build, heavy dark plate armor, crossed arms, battle axe on back<br>表情：stern, angry eyebrows | 王国十指《戦場の鉄塊》。王国最強の盾 |
| `assets/portraits/raisha.webp` | ライーシャ | 1girl, 28 years old, dark grey hair, long hair, half-closed eyes, eye bags, glaring, black cloak, slouching, sword at hip<br>表情：bored expression | 王国十指の天才剣士。目つきが悪く、いつも気だるそう |
| `assets/portraits/zork.webp` | ゾルク | 1boy, man, 43 years old, grey hair, receding hairline, eyepatch, scar, stubble, sharp eyes, wide-brimmed hat, dark long coat, chain, sword, thumb hooked in belt, holding a wanted poster<br>表情：smirk | 王国十指《首狩りゾルク》。非公認の賞金稼ぎ |
| `assets/portraits/bride.webp` | 大槌の姉さん | 1girl, woman, 34 years old, blonde hair, hair bun, blush, muscular, armor, war hammer resting on shoulder, hand on hip, flower in hair<br>表情：closed eyes, big grin | めちゃくちゃ強い、婚期を逃したお姉さん。豪快に笑う |
| `assets/portraits/boku.webp` | 「ボク」の娘 | 1girl, tomboy, 17 years old, brown hair, short hair, bob cut, glasses, cap, round eyes, green coat, holding a notebook, pushing up glasses, pencil<br>表情：open mouth, excited | ボーイッシュで自分をボクと呼ぶおたく。早口で話している |
| `assets/portraits/greiol.webp` | グレイオル | 1boy, emperor, 42 years old, black hair, slicked back hair, sharp eyes, scars, very tall, muscular, black military uniform, white fur cape, hand on sword hilt, sword at hip<br>表情：expressionless<br>喜（`_joy`）：light smile, closed mouth<br>怒（`_anger`）：glaring, frown, cold eyes<br>哀（`_sorrow`）：closed eyes, solemn, slight frown<br>楽（`_fun`）：smirk, amused | ノルディアの皇帝。寡黙で冷徹な現実主義者。カリスマ |
| `assets/portraits/dario.webp` | ダリオ | 1boy, old man, 59 years old, white hair, short hair, white beard, steel mask covering half of face, artificial eye, wrinkles, huge, white plate armor, hands resting on sword pommel, greatsword planted in ground<br>表情：frown | 帝国四騎士《氷壁の父》。巨漢の老騎士。不動・実直 |
| `assets/portraits/erna.webp` | エルナ | 1girl, woman, 38 years old, red hair, short hair, military cap, narrow eyes, black military coat, crest, hands behind back, holding a folded document<br>表情：expressionless | 帝国四騎士。命令をタスクとして処理する無表情。片足は義足（胸から上には出ない） |
| `assets/portraits/valg.webp` | ヴァルグ | 1boy, wolf boy, wolf ears, wolf tail, man, 33 years old, grey hair, wild hair, golden eyes, sharp eyes, fangs, scar, stubble, muscular, dark leather armor, crossed arms, sword at hip, fang necklace<br>表情：fierce grin | 帝国四騎士。狼の獣人、元野盗の首領。荒々しいが頭が切れる |
| `assets/portraits/malvina.webp` | マルヴィナ | 1girl, woman, blonde hair, long hair, black cloth mask covering lower face, glowing left eye, cyan eye, black cloak, bandages, holding staff with both hands, rune-etched gauntlet<br>表情：calm | 帝国四騎士の女軍師。顔の下半分を布で覆い、左目が光る。年は分からない |
| `assets/portraits/katia.webp` | カティア | 1girl, princess, 19 years old, blonde hair, ponytail, blue eyes, white plate armor, crest, hand on sword hilt, sword at hip, simple hair ribbon<br>表情：determined, serious expression<br>喜（`_joy`）：smile, happy, blush<br>怒（`_anger`）：angry, frown, clenched teeth<br>哀（`_sorrow`）：sad, teary eyes, looking down, frown<br>楽（`_fun`）：laughing, open mouth, closed eyes | 皇帝の一人娘。正義感が強く真っすぐな努力家 |
| `assets/portraits/alicia.webp` | アリシア | 1girl, elf, high elf, long pointy ears, blonde hair, medium hair, hair between eyes, blue eyes, sharp eyes, piercing gaze, circlet, white noble dress, gem, crossed arms, rapier at hip<br>表情：haughty | エルメシアの最高議長。ハイエルフ（見た目は二十代前半、三百歳超）。女王のような圧 |

## 名のある人物：出来事・施設（22）

出来事や施設に出る、名前の決まった人（使徒の人の姿・眷属・宰相・店や宿の主など。使徒は `D.MAJIN` の id）。どの出来事に出るかは `src/ui/v4_assets.js` の `NAMED`。どの出来事でも同じ顔に固定してある。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/chancellor.webp` | 帝国の宰相 | 1boy, old man, 64 years old, grey hair, slicked back hair, narrow eyes, wrinkles, eye bags, black formal clothes, chain of office, hands behind back, holding a scroll<br>表情：expressionless | 帝都の王城の玉座の脇。北の陣にいることの多い皇帝に代わって謁見を仕切る宰相。表情を出さない |
| `assets/portraits/gaston.webp` | 茹で騎士ガストン | 1boy, knight, 34 years old, black hair, flushed face, red face, sweat, stubble, plate armor, no helmet, hand on back of head<br>表情：worried eyebrows, open mouth | テルグリスの大鍋で茹でられかけた騎士。真っ赤で情けない顔 |
| `assets/portraits/joachim.webp` | 脱走兵ヨアヒム | 1boy, soldier, 35 years old, dark brown hair, stubble, eye bags, imperial military uniform, snow on shoulders, hugging self, shivering, worn scarf<br>表情：tired, worried eyebrows | 凍えた帝国の脱走兵。もう人を殺したくない |
| `assets/portraits/mirza.webp` | 微笑の使徒カルマトス | 1boy, young man, beautiful, androgynous face, silver hair, long hair, red eyes, glowing eyes, gentle smile, luxurious robe, gold embroidery, holding a parasol, puppet strings on fingers, too many rings, looking down on viewer, dark aura | 人の姿の使徒（使徒リスト 28）。銀髪の美青年。豪奢な衣で、いつも微笑んでいる。人の苦しむ顔を愛でる |
| `assets/portraits/zalve.webp` | 砂塵の使徒ドレイゼ | 1boy, man, 45 years old, sandy hair, short hair, narrow eyes, smirk, silver monocle, gaunt, money changer, sand-colored vest, sand spilling from sleeves, hourglass, ringed eyes, hair crumbling into sand, cracks of light on skin | ブランデールの両替商（使徒リスト 64）。砂の体。袖から砂がこぼれる。嘘はつかないが全部は言わない |
| `assets/portraits/borg.webp` | 取り立て屋ボルグ | 1boy, man, 40 years old, huge man, messy hair, scar, stubble, grin, missing fingers, ragged clothes, debt collector | ドレイゼの眷属。熊のような大男 |
| `assets/portraits/aurelia.webp` | 生き聖女ユヴァリエ | 1girl, saint, 26 years old, blonde hair, long hair, large glowing butterfly wings, merciful smile, half-closed eyes, white and gold robe, sun emblem, staff, heterochromia, eye pattern on wings, floating hair | 聖都の「生き聖女」（正体は蝶翅の使徒、使徒リスト 40）。蝶の羽を後光だと思われている。慈悲深そうな微笑み |
| `assets/portraits/yoihime.webp` | 香煙の使徒ベリエラ | 1girl, woman, 28 years old, long black hair, face half hidden by incense smoke, sheer veil, narrow eyes, calm smile, layered purple robe, hanging censer on a chain, smoke, glowing golden eyes, hair dissolving into smoke, floating hair | 朧島の、香の煙をまとった女（使徒リスト 18）。煙で顔ははっきり見えない。争いを嫌い、祭りと賽遊びが好き |
| `assets/portraits/konoha.webp` | 香炉番のシオン | 1girl, 15 years old, long hair, mischievous smile, purple robe, small censer on a chain, dice cup, smoke | ベリエラの眷属。賭場の壺振りの少女。いかさまが上手（id はもとの名のまま） |
| `assets/portraits/mordu.webp` | 苔衣の使徒セグリトス | 1boy, old man, tall, gardener, bark-like skin, moss and ivy on clothes, mushrooms, spores, wide-brimmed hat, flowers on hat, glowing eyes, polite smile, black sclera, roots growing from fingers | 毒沼の庭師（使徒リスト 7。本体は樹皮に覆われたのろい獣）。穏やかで丁寧、悪意がない |
| `assets/portraits/berna.webp` | 疫医ベルナ | 1girl, plague doctor, beak mask, black hooded coat, gloves, medicine bottles | セグリトスの眷属の医者。嘴の仮面で顔は見せない。声は若い女 |
| `assets/portraits/azlag.webp` | 剣翼の使徒ヴァルグレア | 1boy, man, 40 years old, huge man, one black bird wing made of blades, blonde hair, glowing eyes, frown, crossed arms, black coat, slit pupils, golden eyes, feathers in hair | 刃を撃ち出す黒い鳥の使徒（使徒リスト 62）の人の姿。片翼の大男。転んだのを無かったことにする |
| `assets/portraits/chezar.webp` | 百面の使徒ディエラン（北の賢人） | 1boy, old man, 72 years old, white hair, slicked back hair, monocle, mustache, mask-like face, expressionless, noble military coat, holding a chess piece, many masks hanging at belt, porcelain skin, cracked skin, eyes on clothing | 仮面をいくつも持つ使徒（使徒リスト 23）。今は宮廷の老将の面で、宰相の客分の軍師。駒に話しかける |
| `assets/portraits/yura.webp` | 逆夢の使徒ベルファス | toddler, androgynous, 3 years old, silver hair, messy hair, eyes closed, sleeping, floating upside down, pajamas, holding a pillow, floating hair, faint glow, crescent moon | 眠り続ける幼子の姿の使徒（使徒リスト 2）。いつも目を閉じて眠っている。逆さの夢に出る。子どもらしく |
| `assets/portraits/walker.webp` | 灰色の外套の旅人 | 1boy, man, ageless, brown hair, short hair, half-closed eyes, gentle smile, stubble, old grey cloak, traveler | 年の分からない旅人。何でも珍しそうに喜ぶ |
| `assets/portraits/captain_east.webp` | 東へ出る船の船長 | 1boy, old man, 52 years old, eyepatch, beard, sea captain, captain hat, navy coat, hand on belt, smoking pipe<br>表情：slight smile | 東の果てへ出る片目の船長 |
| `assets/portraits/hans.webp` | 宿の主人ハンス | 1boy, middle-aged man, 58 years old, bald, apron, innkeeper, holding a ledger, quill pen behind ear<br>表情：kind smile, blush | 宿の主人。宿帳の年齢の欄で筆を止める |
| `assets/portraits/greta.webp` | 宿の女将グレタ | 1girl, middle-aged woman, 50 years old, hair bun, kerchief, apron, innkeeper, hands on hips, holding a ladle<br>表情：smile | 宿の女将。世話焼き |
| `assets/portraits/gert.webp` | パン屋の老人ゲルト | 1boy, old man, 80 years old, white hair, wrinkles, flour on face, baker, apron, holding a loaf of bread<br>表情：gentle smile | 粉だらけのパン屋の老人 |
| `assets/portraits/albert.webp` | 司祭アルベルト | 1boy, priest, 36 years old, grey hair, long hair, pince-nez, white priest vestment, sun emblem, pushing up pince-nez<br>表情：calm | 鼻眼鏡の司祭。眼鏡を押し上げる癖 |
| `assets/portraits/dominik.webp` | 串焼き屋のドミニク | 1boy, middle-aged man, 40 years old, mustache, headband, apron, grilling skewers, towel around neck<br>表情：grin | 串焼き屋の親父 |
| `assets/portraits/neumann.webp` | 古道具屋のノイマン | 1boy, old man, 57 years old, grey hair, narrow eyes, glasses, vest, antique dealer, holding a silver ring, jeweler's loupe on cord<br>表情：small smile | 古道具屋。品物をじっと見せる |

## 型：主人公（10）

冒険ごとに作られる主人公は一人ずつ作れないので、職業 × 性別の型に当てる（人間・若者が基本。エルフ・獣人・年齢は下の「型の足し方」）。外見の文で変わる髪や目の色は入れていない。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/hero_merc_m.webp` | 主人公：傭兵・男 | 1boy, young man, 20 years old, mercenary, leather armor, sword | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_merc_f.webp` | 主人公：傭兵・女 | 1girl, young woman, 20 years old, mercenary, leather armor, sword | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_m.webp` | 主人公：盗賊・男 | 1boy, young man, 20 years old, thief, dark hooded cloak, daggers | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_f.webp` | 主人公：盗賊・女 | 1girl, young woman, 20 years old, thief, dark hooded cloak, daggers | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_m.webp` | 主人公：魔法使い・男 | 1boy, young man, 20 years old, mage, robe, wizard hat, staff | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_f.webp` | 主人公：魔法使い・女 | 1girl, young woman, 20 years old, mage, robe, wizard hat, staff | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_m.webp` | 主人公：破戒神官・男 | 1boy, young man, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_f.webp` | 主人公：破戒神官・女 | 1girl, young woman, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_m.webp` | 主人公：侍・男 | 1boy, young man, 20 years old, samurai, kimono, light armor, katana, topknot | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_f.webp` | 主人公：侍・女 | 1girl, young woman, 20 years old, samurai, kimono, light armor, katana, ponytail | 主人公の型（人間・若者）。外見の文で変わる髪や目の色は入れない |

## 型：名もない人（34）

名もない仲間・出来事の町の人など。人物の種類 × 性別。13 歳未満は子ども、60 歳以上は老人の型を使う。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/kind_villager_m.webp` | 町の人（男） | 1boy, man, 30 years old, townsperson, simple tunic | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_villager_f.webp` | 町の人（女） | 1girl, woman, 30 years old, townsperson, simple tunic | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_merchant_m.webp` | 商人（男） | 1boy, man, 30 years old, merchant, vest, coin pouch | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_merchant_f.webp` | 商人（女） | 1girl, woman, 30 years old, merchant, vest, coin pouch | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_guard_m.webp` | 衛兵（男） | 1boy, man, 30 years old, town guard, helmet, tabard, spear | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_guard_f.webp` | 衛兵（女） | 1girl, woman, 30 years old, town guard, helmet, tabard, spear | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_priest_m.webp` | 神官・修道女（男） | 1boy, man, 30 years old, priest, white vestment, sun emblem | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_priest_f.webp` | 神官・修道女（女） | 1girl, woman, 30 years old, priest, white vestment, sun emblem | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_noble_m.webp` | 貴族（男） | 1boy, man, 30 years old, noble, elegant clothes, jewelry | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_noble_f.webp` | 貴族（女） | 1girl, woman, 30 years old, noble, elegant clothes, jewelry | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_rogue_m.webp` | ならず者・盗賊（男） | 1boy, man, 30 years old, rogue, bandana, dark leather clothes, dagger, scar | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_rogue_f.webp` | ならず者・盗賊（女） | 1girl, woman, 30 years old, rogue, bandana, dark leather clothes, dagger, scar | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_soldier_m.webp` | 兵士・傭兵団の兵（男） | 1boy, man, 30 years old, soldier, armor, spear | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_soldier_f.webp` | 兵士・傭兵団の兵（女） | 1girl, woman, 30 years old, soldier, armor, spear | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_knight_m.webp` | 騎士（男） | 1boy, man, 30 years old, knight, plate armor, crest, sword | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_knight_f.webp` | 騎士（女） | 1girl, woman, 30 years old, knight, plate armor, crest, sword | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_sailor_m.webp` | 船乗り（男） | 1boy, man, 30 years old, sailor, striped shirt, bandana, earring | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_sailor_f.webp` | 船乗り（女） | 1girl, woman, 30 years old, sailor, striped shirt, bandana, earring | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_mage_m.webp` | 魔法使い（男） | 1boy, man, 30 years old, mage, dark blue robe, staff | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_mage_f.webp` | 魔法使い（女） | 1girl, woman, 30 years old, mage, dark blue robe, staff | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_ronin_m.webp` | 八雲の人（侍・巫女）（男） | 1boy, man, 30 years old, samurai, kimono, katana | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_ronin_f.webp` | 八雲の人（侍・巫女）（女） | 1girl, woman, 30 years old, samurai, kimono, katana | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_host_m.webp` | 宿や酒場の主（男） | 1boy, man, 30 years old, innkeeper, apron, friendly smile | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_host_f.webp` | 宿や酒場の主（女） | 1girl, woman, 30 years old, innkeeper, apron, friendly smile | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_beggar_m.webp` | 物乞い・囚人（男） | 1boy, man, 30 years old, ragged clothes, dirty, tired | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_beggar_f.webp` | 物乞い・囚人（女） | 1girl, woman, 30 years old, ragged clothes, dirty, tired | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_archer_m.webp` | 弓使い・狩人（男） | 1boy, man, 30 years old, hunter, archer, green hooded cloak, bow | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_archer_f.webp` | 弓使い・狩人（女） | 1girl, woman, 30 years old, hunter, archer, green hooded cloak, bow | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_adventurer_m.webp` | 冒険者（男） | 1boy, man, 30 years old, adventurer, leather armor, sword | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_adventurer_f.webp` | 冒険者（女） | 1girl, woman, 30 years old, adventurer, leather armor, sword | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_elder_m.webp` | 老人（男） | 1boy, old man, old, wrinkles, grey hair, 70 years old, simple robe | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_elder_f.webp` | 老人（女） | 1girl, old woman, old, wrinkles, grey hair, 70 years old, simple robe | 名もない人の型（仲間・出来事の人） |
| `assets/portraits/kind_child_m.webp` | 子ども（男） | 1boy, boy, child, 10 years old, simple clothes, small | 名もない子ども。子どもらしく |
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
