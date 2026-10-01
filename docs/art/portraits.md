# 人物の絵（Stable Diffusion のプロンプト一覧）

このファイルは `node tools/portraits.mjs` で `docs/art/portraits.json` から作る。直すときは json を直してから作り直す。

## 作り方

- 大きさ：**512×640**（縦長・胸から上・顔が上から 1/3 あたり）。形式：**webp**、1枚 **80KB 以下**。
- タグはその人の**特徴だけ**。画風・品質（masterpiece・anime style など）・構図・ネガティブは持ち主の側で足す。
- できた画像は表の「ファイル」の名前で置く（例：`assets/portraits/dil.webp`）。`node tools/build.mjs` で HTML に埋め込まれ、ゲームはその人をこの画像で描く。無い人は今の canvas の絵のまま。
- png・jpg でもよい（同じ名前なら webp を使う）。埋め込みの合計が 12MB を超えるとビルドとテストが止まる（`tools/assets.mjs`）。

## 主人公の年齢・獣人の獣

主人公は、職業・性別・種族が合う画像のうち、獣・年齢が一番近いものを使う。表の行は若者・狼が基本。足したいときは：

- 中年：ファイル名の後ろに `_mid`（例：`hero_merc_m_human_mid.webp`）。タグの `young man` / `young woman`・`20 years old` を `middle-aged, 45 years old` に替える。
- 老人：`_old`。`old man / old woman, wrinkles, grey hair, 65 years old` に替える。
- 獣人の獣：`hero_<職業>_<m|f>_beast_<獣>`（例：`hero_thief_f_beast_cat.webp`）。狼の耳と尻尾のタグを次に替える。獣ごとの画像が無ければ `_beast`（狼）を使う。

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

仲間の種類も同じように、エルフなら `kind_<種類>_<m|f>_elf`、獣人なら `kind_<種類>_<m|f>_beast[_<獣>]` を置ける（無ければ今の絵）。

## キャラメモの人物（34）

持ち主のスプレッドシート「キャラメモ」の人（`src/data/c2_people.js`）。出来事でも仲間になってからも同じ絵を使う。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/dil.webp` | ディル | 1boy, young man, 24 years old, brown hair, messy hair, narrow eyes, sly smirk, slim, worn vest, rolled-up sleeves, daggers on belt, holding an old book | 本好きでずる賢い港町の青年。にやりと何か企んでいる顔 |
| `assets/portraits/kaidel.webp` | カイデル | 1boy, man, 30 years old, dark brown hair, spiky hair, headband, big grin, scar on face, bandages, stubble, muscular, broad shoulders, red leather armor, torn clothes, fists | 傷だらけの凄腕傭兵。お気楽で、迷ったら殴る。屈託のない笑い |
| `assets/portraits/nora.webp` | ノラミ（ノラ） | 1girl, dog girl, dog ears, floppy ears, dog tail, 18 years old, brown hair, messy hair, wild hair, brown eyes, round eyes, big grin, fang, leather hunter clothes, dirt on face, energetic | 森の犬の獣人。明るい愛すべきあほ。歯を見せて笑う |
| `assets/portraits/sheila.webp` | シェイラ | 1girl, princess, 18 years old, long hair, blonde hair, half-closed eyes, sleepy eyes, expressionless, petite, slim, blue hooded cloak, gem pendant, holding a book | 第七王子の姫。大人しそうで実はお転婆。眠たげな目で「うん、」 |
| `assets/portraits/rui.webp` | ルイ | 1girl, child, 9 years old, small child, blue hair, short hair, bob cut, half-closed eyes, expressionless, white ancient robe, simple clothes | 遺跡で眠っていた無口な女の子。表情が動かない。子どもらしく |
| `assets/portraits/zerina.webp` | ゼリナ | 1girl, 23 years old, red hair, ponytail, freckles, closed eyes, big grin, kerchief, merchant vest, coin pouch, confident | 関西言葉の商人の娘。物怖じしない、金が大好き。にかっと笑う |
| `assets/portraits/elnea.webp` | エルネア | 1girl, elf, pointy ears, 19 years old, short, plump, brown hair, short hair, messy bob cut, round eyes, worried eyebrows, open mouth, blush, work apron, soot on face, holding a crystal ore | エルフの鉱石おたくの技師。容姿に自信がなく、おどおど。「〜っす」 |
| `assets/portraits/natalia.webp` | ナタリア | 1girl, 24 years old, black hair, single braid, half-closed eyes, grin, blush, drunk, martial artist, dark blue martial arts uniform, holding a sake bottle | 王国十指の格闘家。酒好きで、ほろ酔いの笑い。実力は本物 |
| `assets/portraits/valeon.webp` | ヴァレオン | 1boy, old man, king, 58 years old, grey hair, silver hair, wild hair, grey beard, amber eyes, fierce grin, scar, muscular, crown, red royal cape, plate armor, greatsword | レオネストの国王。好戦家で若返った鋼の体。獰猛に笑う |
| `assets/portraits/raios.webp` | ライオス | 1boy, prince, 32 years old, dark blonde hair, long hair, low ponytail, blue eyes, gentle smile, laughing, tall, muscular, blue plate armor, crest | 第一王子。誠実で包容力のある完璧超人。よく高笑いする |
| `assets/portraits/serios.webp` | セリオス | 1boy, prince, 30 years old, silver hair, long hair, handsome, half-closed eyes, aloof, slender, dark grey coat, gem brooch, paint stains | 第二王子。銀髪の天才肌、浮世離れした芸術家。遠くを見る顔 |
| `assets/portraits/farina.webp` | ファリナ | 1girl, princess, 28 years old, black hair, long hair, low ponytail, glasses, cold eyes, narrow eyes, serious expression, dark blue noble dress, chain necklace | 第三王子（女）。冷静な完璧主義者。笑わない。冷たい視線 |
| `assets/portraits/greol.webp` | グレオル | 1boy, prince, 27 years old, brown hair, short hair, tan skin, scar on cheek, frown, stern, muscular, dull worn armor, sword | 第四王子。生真面目で口下手な武人。むすっと真っすぐ |
| `assets/portraits/neilas.webp` | ネイラス | 1boy, prince, 24 years old, black hair, messy hair, androgynous, pale skin, half-closed eyes, eye bags, shy, worried eyebrows, white lab coat | 第五王子。儚く中性的な引きこもりの研究者。目を合わせない |
| `assets/portraits/tiria.webp` | ティリア | 1girl, princess, 23 years old, light brown hair, soft hair, braid, closed eyes, gentle smile, freckles, kerchief, modest green dress, apron, dirt on cheek | 第六王子（女）。現場主義でにこやかな愛され姫。少し天然 |
| `assets/portraits/sixth.webp` | 第六騎士団の団長 | 1boy, knight captain, 33 years old, black hair, slicked back hair, narrow eyes, expressionless, slim, black plate armor, crest, sword | 王国最強の剣。寡黙で何を考えているか分からない |
| `assets/portraits/angelica.webp` | アンジェリカ | 1girl, woman, 31 years old, dirty blonde hair, hair bun, military cap, sharp eyes, angry, shouting, open mouth, blue military uniform, armor, holding a pistol | 王国軍の女隊長。敵だが抜けていて人がいい。おばさん呼ばわりに怒る |
| `assets/portraits/captain.webp` | 寡黙な隊長 | 1boy, man, 28 years old, dark brown hair, short hair, stubble, calm, stoic, blue military uniform, armor, spear, broad shoulders | アンジェリカと組む隊長。寡黙で任務に忠実 |
| `assets/portraits/doctor.webp` | 博士 | 1boy, old man, 61 years old, white hair, receding hairline, monocle, wrinkles, round eyes, creepy smile, white lab coat, keys | 使徒を研究する学者。倫理を気にしない。にこにこして不気味 |
| `assets/portraits/hermes.webp` | ヘル爺 | 1boy, old man, 62 years old, white hair, wild hair, white beard, round eyes, big grin, explorer hat, brown coat, dirt, energetic | 元気な考古学者の爺さん。遺跡が生きがい |
| `assets/portraits/yurina.webp` | ユリナ | 1girl, 27 years old, red hair, short hair, closed eyes, smirk, slim, dark leather swordsman outfit, sword | 直轄特殊部隊の剣士。糸目で飄々と笑う、戦うと冷徹 |
| `assets/portraits/ferida.webp` | フェリダ | 1girl, 26 years old, blonde hair, ponytail, sharp eyes, confident smirk, white plate armor, crest, lance | 王国十指《雷突の乙女》。王国一の槍使い |
| `assets/portraits/sig.webp` | シグ | 1boy, man, 38 years old, bald, brown beard, scar, stern, angry eyebrows, very muscular, large build, heavy dark plate armor, battle axe | 王国十指《戦場の鉄塊》。王国最強の盾 |
| `assets/portraits/raisha.webp` | ライーシャ | 1girl, 28 years old, dark grey hair, long hair, half-closed eyes, eye bags, glaring, bored expression, black cloak, sword | 王国十指の天才剣士。目つきが悪く、いつも気だるそう |
| `assets/portraits/zork.webp` | ゾルク | 1boy, man, 43 years old, grey hair, receding hairline, eyepatch, scar, stubble, sharp eyes, smirk, wide-brimmed hat, dark long coat, chain, sword | 王国十指《首狩りゾルク》。非公認の賞金稼ぎ |
| `assets/portraits/bride.webp` | 大槌の姉さん | 1girl, woman, 34 years old, blonde hair, hair bun, closed eyes, big grin, blush, muscular, armor, large war hammer | めちゃくちゃ強い、婚期を逃したお姉さん。豪快に笑う |
| `assets/portraits/boku.webp` | 「ボク」の娘 | 1girl, tomboy, 17 years old, brown hair, short hair, bob cut, glasses, cap, round eyes, open mouth, excited, green coat, holding a notebook | ボーイッシュで自分をボクと呼ぶおたく。早口で話している |
| `assets/portraits/greiol.webp` | グレイオル | 1boy, emperor, 42 years old, black hair, slicked back hair, sharp eyes, expressionless, scars, very tall, muscular, black military uniform, white fur cape, sword at hip | ノルディアの皇帝。寡黙で冷徹な現実主義者。カリスマ |
| `assets/portraits/dario.webp` | ダリオ | 1boy, old man, 59 years old, white hair, short hair, white beard, steel mask covering half of face, artificial eye, wrinkles, frown, huge, white plate armor, greatsword | 帝国四騎士《氷壁の父》。巨漢の老騎士。不動・実直 |
| `assets/portraits/erna.webp` | エルナ | 1girl, woman, 38 years old, red hair, short hair, military cap, expressionless, narrow eyes, black military coat, crest | 帝国四騎士。命令をタスクとして処理する無表情。片足は義足（胸から上には出ない） |
| `assets/portraits/valg.webp` | ヴァルグ | 1boy, wolf boy, wolf ears, wolf tail, man, 33 years old, grey hair, wild hair, golden eyes, sharp eyes, fierce grin, fangs, scar, stubble, muscular, dark leather armor, sword | 帝国四騎士。狼の獣人、元野盗の首領。荒々しいが頭が切れる |
| `assets/portraits/malvina.webp` | マルヴィナ | 1girl, woman, blonde hair, long hair, black cloth mask covering lower face, glowing left eye, cyan eye, calm, black cloak, staff, bandages | 帝国四騎士の女軍師。顔の下半分を布で覆い、左目が光る。年は分からない |
| `assets/portraits/katia.webp` | カティア | 1girl, princess, 19 years old, blonde hair, ponytail, blue eyes, determined, serious expression, white plate armor, crest, sword | 皇帝の一人娘。正義感が強く真っすぐな努力家 |
| `assets/portraits/alicia.webp` | アリシア | 1girl, elf, high elf, long pointy ears, blonde hair, medium hair, hair between eyes, blue eyes, sharp eyes, piercing gaze, haughty, circlet, white noble dress, gem | エルメシアの最高議長。ハイエルフ（見た目は二十代前半、三百歳超）。女王のような圧 |

## 名のある人物（22）

出来事や施設に出る、名前の決まった人（使徒の人の姿・眷属・店や宿の主など）。どの出来事に出るかは `src/ui/v4_assets.js` の `NAMED`。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/chancellor.webp` | 帝国の宰相 | 1boy, old man, 64 years old, grey hair, slicked back hair, narrow eyes, wrinkles, eye bags, expressionless, black formal clothes, chain of office | 帝都の王城の玉座の脇。病床の皇帝に代わる宰相。表情を出さない |
| `assets/portraits/gaston.webp` | 茹で騎士ガストン | 1boy, knight, 34 years old, black hair, flushed face, red face, sweat, stubble, worried eyebrows, open mouth, plate armor, no helmet | ゴルモアの大鍋で茹でられかけた騎士。真っ赤で情けない顔 |
| `assets/portraits/joachim.webp` | 脱走兵ヨアヒム | 1boy, soldier, 35 years old, dark brown hair, stubble, eye bags, tired, worried eyebrows, imperial military uniform, snow on shoulders | 凍えた帝国の脱走兵。もう人を殺したくない |
| `assets/portraits/mirza.webp` | 享楽の使徒ミルザ | 1girl, girl, petite, black hair, long hair, red eyes, glowing eyes, smirk, small crown, black frilled dress, holding a parasol | 人の姿の使徒。日傘の少女。格が違うのにどこかまぬけ。にんまり |
| `assets/portraits/zalve.webp` | 契約の使徒ザルヴェ | 1boy, man, 45 years old, black hair, short hair, narrow eyes, smirk, silver monocle, gaunt, money changer, dark green vest, abacus | ブランデールの両替商（使徒）。嘘はつかないが全部は言わない |
| `assets/portraits/borg.webp` | 取り立て屋ボルグ | 1boy, man, 40 years old, huge man, messy hair, scar, stubble, grin, missing fingers, ragged clothes, debt collector | ザルヴェの眷属。熊のような大男 |
| `assets/portraits/aurelia.webp` | 生き聖女アウレリア | 1girl, saint, 26 years old, blonde hair, long hair, halo of light, closed eyes, holy smile, white and gold robe, sun emblem, staff | 聖都の「生き聖女」（正体は偽聖の使徒）。大げさな聖女の笑み |
| `assets/portraits/yoihime.webp` | 月喰いの宵姫 | 1girl, woman, 28 years old, long hair, fox mask, juunihitoe, red layered kimono, folding fan, smirk | 朧島の狐面の女（使徒）。祭りと博打が好き。面で顔は見せない |
| `assets/portraits/konoha.webp` | 狐の忍コノハ | 1girl, 15 years old, fox mask on head, long hair, mischievous smile, red kimono, dice cup | 宵姫の眷属。賭場の壺振りの少女。いかさまが上手 |
| `assets/portraits/mordu.webp` | 腐爛の使徒モルドゥ | 1boy, old man, tall, gardener, mud and moss on clothes, wide-brimmed hat, flowers on hat, pale skin, glowing eyes, polite smile | 毒沼の庭師（使徒）。穏やかで丁寧、悪意がない |
| `assets/portraits/berna.webp` | 疫医ベルナ | 1girl, plague doctor, beak mask, black hooded coat, gloves, medicine bottles | モルドゥの眷属の医者。嘴の仮面で顔は見せない。声は若い女 |
| `assets/portraits/azlag.webp` | 天墜の使徒アズラグ | 1boy, man, 40 years old, huge man, one black dragon wing, blonde hair, glowing eyes, frown, crossed arms, black coat | 黒い翼竜の使徒の人の姿。片翼の大男。転んだのを無かったことにする |
| `assets/portraits/chezar.webp` | 盤上の使徒シェザール（北の賢人） | 1boy, old man, 72 years old, white hair, slicked back hair, monocle, mustache, wrinkles, smirk, noble military coat, holding a chess piece | 宮廷の老将の姿の使徒。駒に話しかける |
| `assets/portraits/yura.webp` | 微睡の使徒ユラ | child, androgynous, 9 years old, silver hair, messy hair, sleepy eyes, yawning, pajamas, holding a pillow | 眠そうな子どもの姿の使徒。子どもらしく |
| `assets/portraits/walker.webp` | 灰色の外套の旅人 | 1boy, man, ageless, brown hair, short hair, half-closed eyes, gentle smile, stubble, old grey cloak, traveler | 年の分からない旅人。何でも珍しそうに喜ぶ |
| `assets/portraits/captain_east.webp` | 東へ出る船の船長 | 1boy, old man, 52 years old, eyepatch, beard, sea captain, captain hat, navy coat | 東の果てへ出る片目の船長 |
| `assets/portraits/hans.webp` | 宿の主人ハンス | 1boy, middle-aged man, 58 years old, bald, kind smile, blush, apron, innkeeper | 宿の主人。宿帳の年齢の欄で筆を止める |
| `assets/portraits/greta.webp` | 宿の女将グレタ | 1girl, middle-aged woman, 50 years old, hair bun, smile, kerchief, apron, innkeeper | 宿の女将。世話焼き |
| `assets/portraits/gert.webp` | パン屋の老人ゲルト | 1boy, old man, 80 years old, white hair, wrinkles, flour on face, baker, apron | 粉だらけのパン屋の老人 |
| `assets/portraits/albert.webp` | 司祭アルベルト | 1boy, priest, 36 years old, grey hair, long hair, pince-nez, white priest vestment, sun emblem | 鼻眼鏡の司祭。眼鏡を押し上げる癖 |
| `assets/portraits/dominik.webp` | 串焼き屋のドミニク | 1boy, middle-aged man, 40 years old, mustache, grin, headband, apron, grilling skewers | 串焼き屋の親父 |
| `assets/portraits/neumann.webp` | 古道具屋のノイマン | 1boy, old man, 57 years old, grey hair, narrow eyes, small smile, glasses, vest, antique dealer, holding a silver ring | 古道具屋。品物をじっと見せる |

## 仲間の種類（22）

名前の決まっていない仲間（雇った傭兵など）。種類と性別で一枚。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/kind_adventurer_m.webp` | 仲間：冒険者（傭兵・剣士）（男） | 1boy, young man, 25 years old, adventurer, leather armor, sword | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_adventurer_f.webp` | 仲間：冒険者（傭兵・剣士）（女） | 1girl, young woman, 25 years old, adventurer, leather armor, sword | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_archer_m.webp` | 仲間：弓使い（男） | 1boy, young man, 25 years old, hunter, archer, green hooded cloak, bow, quiver | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_archer_f.webp` | 仲間：弓使い（女） | 1girl, young woman, 25 years old, hunter, archer, green hooded cloak, bow, quiver | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_priest_m.webp` | 仲間：神官・僧侶（男） | 1boy, young man, 25 years old, priest, white vestment, sun emblem | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_priest_f.webp` | 仲間：神官・僧侶（女） | 1girl, young woman, 25 years old, priest, white vestment, sun emblem | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_mage_m.webp` | 仲間：魔法使い（男） | 1boy, young man, 25 years old, mage, dark blue robe, staff | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_mage_f.webp` | 仲間：魔法使い（女） | 1girl, young woman, 25 years old, mage, dark blue robe, staff | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_rogue_m.webp` | 仲間：ならず者・盗賊（男） | 1boy, young man, 25 years old, rogue, bandana, dark leather clothes, dagger, scar | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_rogue_f.webp` | 仲間：ならず者・盗賊（女） | 1girl, young woman, 25 years old, rogue, bandana, dark leather clothes, dagger, scar | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_soldier_m.webp` | 仲間：兵士（槍兵・元帝国兵）（男） | 1boy, young man, 25 years old, soldier, armor, spear | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_soldier_f.webp` | 仲間：兵士（槍兵・元帝国兵）（女） | 1girl, young woman, 25 years old, soldier, armor, spear | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_ronin_m.webp` | 仲間：侍・浪人（男） | 1boy, young man, 25 years old, samurai, kimono, katana | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_ronin_f.webp` | 仲間：侍・浪人（女） | 1girl, young woman, 25 years old, samurai, kimono, katana | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_knight_m.webp` | 仲間：騎士（男） | 1boy, young man, 25 years old, knight, plate armor, crest, sword | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_knight_f.webp` | 仲間：騎士（女） | 1girl, young woman, 25 years old, knight, plate armor, crest, sword | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_sailor_m.webp` | 仲間：船乗り（男） | 1boy, young man, 25 years old, sailor, striped shirt, bandana, earring | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_sailor_f.webp` | 仲間：船乗り（女） | 1girl, young woman, 25 years old, sailor, striped shirt, bandana, earring | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_merchant_m.webp` | 仲間：商人（男） | 1boy, young man, 25 years old, merchant, vest, coin pouch | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_merchant_f.webp` | 仲間：商人（女） | 1girl, young woman, 25 years old, merchant, vest, coin pouch | 名前の決まっていない仲間。種類の顔 |
| `assets/portraits/kind_child_m.webp` | 仲間：子ども（男） | 1boy, boy, child, 10 years old, simple clothes, small | 仲間の子ども。子どもらしく |
| `assets/portraits/kind_child_f.webp` | 仲間：子ども（女） | 1girl, girl, child, 10 years old, simple clothes, small | 仲間の子ども。子どもらしく |

## 主人公（30）

職業 × 性別 × 種族。年齢は若者が基本（下の「主人公の年齢・獣人の獣」で足せる）。外見の文で変わる髪や目の色は入れていない。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/portraits/hero_merc_m_human.webp` | 主人公：傭兵・男・人間 | 1boy, young man, 20 years old, mercenary, leather armor, sword | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_merc_m_elf.webp` | 主人公：傭兵・男・エルフ | 1boy, young man, elf, pointy ears, 20 years old, mercenary, leather armor, sword | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_merc_m_beast.webp` | 主人公：傭兵・男・獣人（狼） | 1boy, young man, wolf boy, wolf ears, wolf tail, 20 years old, mercenary, leather armor, sword | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_merc_f_human.webp` | 主人公：傭兵・女・人間 | 1girl, young woman, 20 years old, mercenary, leather armor, sword | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_merc_f_elf.webp` | 主人公：傭兵・女・エルフ | 1girl, young woman, elf, pointy ears, 20 years old, mercenary, leather armor, sword | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_merc_f_beast.webp` | 主人公：傭兵・女・獣人（狼） | 1girl, young woman, wolf girl, wolf ears, wolf tail, 20 years old, mercenary, leather armor, sword | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_m_human.webp` | 主人公：盗賊・男・人間 | 1boy, young man, 20 years old, thief, dark hooded cloak, daggers | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_m_elf.webp` | 主人公：盗賊・男・エルフ | 1boy, young man, elf, pointy ears, 20 years old, thief, dark hooded cloak, daggers | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_m_beast.webp` | 主人公：盗賊・男・獣人（狼） | 1boy, young man, wolf boy, wolf ears, wolf tail, 20 years old, thief, dark hooded cloak, daggers | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_f_human.webp` | 主人公：盗賊・女・人間 | 1girl, young woman, 20 years old, thief, dark hooded cloak, daggers | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_f_elf.webp` | 主人公：盗賊・女・エルフ | 1girl, young woman, elf, pointy ears, 20 years old, thief, dark hooded cloak, daggers | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_thief_f_beast.webp` | 主人公：盗賊・女・獣人（狼） | 1girl, young woman, wolf girl, wolf ears, wolf tail, 20 years old, thief, dark hooded cloak, daggers | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_m_human.webp` | 主人公：魔法使い・男・人間 | 1boy, young man, 20 years old, mage, robe, wizard hat, staff | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_m_elf.webp` | 主人公：魔法使い・男・エルフ | 1boy, young man, elf, pointy ears, 20 years old, mage, robe, wizard hat, staff | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_m_beast.webp` | 主人公：魔法使い・男・獣人（狼） | 1boy, young man, wolf boy, wolf ears, wolf tail, 20 years old, mage, robe, wizard hat, staff | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_f_human.webp` | 主人公：魔法使い・女・人間 | 1girl, young woman, 20 years old, mage, robe, wizard hat, staff | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_f_elf.webp` | 主人公：魔法使い・女・エルフ | 1girl, young woman, elf, pointy ears, 20 years old, mage, robe, wizard hat, staff | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_mage_f_beast.webp` | 主人公：魔法使い・女・獣人（狼） | 1girl, young woman, wolf girl, wolf ears, wolf tail, 20 years old, mage, robe, wizard hat, staff | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_m_human.webp` | 主人公：破戒神官・男・人間 | 1boy, young man, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_m_elf.webp` | 主人公：破戒神官・男・エルフ | 1boy, young man, elf, pointy ears, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_m_beast.webp` | 主人公：破戒神官・男・獣人（狼） | 1boy, young man, wolf boy, wolf ears, wolf tail, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_f_human.webp` | 主人公：破戒神官・女・人間 | 1girl, young woman, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_f_elf.webp` | 主人公：破戒神官・女・エルフ | 1girl, young woman, elf, pointy ears, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_priest_f_beast.webp` | 主人公：破戒神官・女・獣人（狼） | 1girl, young woman, wolf girl, wolf ears, wolf tail, 20 years old, priest, white vestment, sun emblem, mace, disheveled | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_m_human.webp` | 主人公：侍・男・人間 | 1boy, young man, 20 years old, samurai, kimono, light armor, katana, topknot | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_m_elf.webp` | 主人公：侍・男・エルフ | 1boy, young man, elf, pointy ears, 20 years old, samurai, kimono, light armor, katana, topknot | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_m_beast.webp` | 主人公：侍・男・獣人（狼） | 1boy, young man, wolf boy, wolf ears, wolf tail, 20 years old, samurai, kimono, light armor, katana, topknot | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_f_human.webp` | 主人公：侍・女・人間 | 1girl, young woman, 20 years old, samurai, kimono, light armor, katana, ponytail | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_f_elf.webp` | 主人公：侍・女・エルフ | 1girl, young woman, elf, pointy ears, 20 years old, samurai, kimono, light armor, katana, ponytail | 主人公の若者。外見の文で変わる髪や目の色は入れない |
| `assets/portraits/hero_samurai_f_beast.webp` | 主人公：侍・女・獣人（狼） | 1girl, young woman, wolf girl, wolf ears, wolf tail, 20 years old, samurai, kimono, light armor, katana, ponytail | 主人公の若者。外見の文で変わる髪や目の色は入れない |
