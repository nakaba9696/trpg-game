# 魔物の絵（Stable Diffusion のプロンプト一覧）

このファイルは `node tools/monsters.mjs` で `docs/art/monsters.json` から作る（名前は敵のデータから取り直す）。直すときは json を直してから作り直す。

## 作り方

- 大きさ：**512×512**（正方形・全身・白い無地の背景（ゲームで周りをぼかしてなじませる））。形式：**webp**、1枚 **60KB 以下**。
- タグはその魔物の**特徴だけ**。画風・品質・構図・背景・ネガティブは [style_monsters.json](style_monsters.json) で足す（人物の `style.json` とは別）。
- できた画像は表の「ファイル」の名前で置く（例：`assets/monsters/goblin.webp`）。`node tools/build.mjs` で HTML に埋め込まれ、戦闘ではその敵をこの画像で描く（`src/ui/v6_monsters.js`。白い背景は周りをぼかして消す）。無い敵は今の canvas の絵のまま。
- 作るのは `node tools/gen_portraits.mjs --monsters`（`--only goblin,slime`・`--force`・`--dry`・`--keep`・`--new-seed` は人物と同じ。手順は [README.md](README.md)）。
- 埋め込みの合計の上限（12MB）は人物と魔物を合わせて数える。

## 使徒・ボス（12）

使徒の魔物の姿と、ボス。特にていねいに。気に入った絵は `--keep <id>` で seed を残す。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/monsters/kain.webp` | 眷属カイン | 1boy, young man, scholar, silver hair, glasses, cold smile, long dark coat, holding glowing book, floating pages, ancient runes | ボス。蒐集の使徒レヴィアンの眷属。冷たい学者 |
| `assets/monsters/shuten.webp` | 鬼の頭目ゴズ | oni, oni chief, huge, red skin, two large horns, wild white hair, fangs, scars, muscular, samurai armor pieces, tiger skin, holding glowing katana, white glowing sword, sake gourd | ボス。鬼ヶ島の大鬼。白く光る刀を持つ |
| `assets/monsters/bonedragon.webp` | 屍竜ネクロザ | skeletal dragon, undead dragon, bone dragon, huge, ribcage, sword stuck in ribs, glowing green eyes, tattered bone wings, ghostly green fire, long neck, skull | ボス。墓場を守る屍竜。腹に剣が刺さっている |
| `assets/monsters/rize.webp` | 眷属リゼ | 1girl, woman, swordswoman, short black hair, crazy smile, wild eyes, scar, dark armor, holding sword, blood splatter, battle stance | ボス。グラウの眷属。戦いに酔う女剣士 |
| `assets/monsters/graw.webp` | 鏖殺の使徒グラウ | giant, colossal, muscular, grey skin, glowing red eyes, horns, scars, battle-hungry grin, broken armor, chains, holding giant greatsword, glowing aura, barrier | 使徒（ボス）。戦いだけを好む巨人。絶界に守られている。圧倒的に |
| `assets/monsters/royalguard.webp` | 近衛騎士団長 | 1boy, man, knight commander, royal guard, grey hair, stern, ornate plate armor, white armor, gold trim, blue cape, holding longsword, shield | ボス。王国最強の騎士 |
| `assets/monsters/w1_vespa.webp` | 異端審問官ヴェスパ | inquisitor, iron mask, full face mask, tall, thin, grey armor, red cape, holding spear, torch, smoke | ボス。鉄仮面の異端審問官 |
| `assets/monsters/w1_gregor.webp` | 墓守グレゴル | 1boy, old man, necromancer, priest, white hair, long beard, gaunt, glowing eyes, smirk, black robe, holding staff, runes | ボス。死体を歩かせる老司祭 |
| `assets/monsters/e2_gormoa.webp` | 暴食の使徒ゴルモア | giant, enormously fat, obese, three mouths, mouth on belly, long tongue, drooling, pink skin, spots, small horns, three eyes, beard, bib, loincloth, holding club, barrier | 使徒（ボス）。丘のように太った暴食の使徒。おぞましく、少しまぬけ |
| `assets/monsters/e2_marmit.webp` | 料理長マルミット | 1boy, old man, chef, white hair, stubble, smirk, lanky, white apron, blood on apron, holding meat cleaver | ボス。人を見ると部位を数える料理長 |
| `assets/monsters/e2_mordu.webp` | 腐爛の使徒モルドゥ | plant monster, tall, gardener, covered in mud and moss, wilted flowers growing from head, wide-brimmed hat, one glowing eye, long claws, holding pitchfork, pollen, spores, rotting | 使徒（ボス）の魔物の姿。泥と苔の庭師。甘い腐臭 |
| `assets/monsters/w2_ironwarden.webp` | 溶けかけた機械兵 | iron golem, giant robot, ancient machine, huge, melted metal, acid, rust, glowing eyes, heavy armor, holding club, steam | ボス。半分溶けた鉄の巨人 |

## 魔物（42）

ふつうの敵のうち、魔物の姿のもの。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/monsters/goblin.webp` | ゴブリン | goblin, green skin, pointy ears, big nose, crooked teeth, yellow eyes, hunched, short, skinny, holding rusty dagger, ragged loincloth | 群れる小鬼。まぬけで憎めない |
| `assets/monsters/wolf.webp` | 飢えた野犬 | feral dog, wild dog, skinny, visible ribs, matted grey fur, bared teeth, growling, drooling, four legs, scars | 痩せこけた野犬。哀れで、少し怖い |
| `assets/monsters/barrelgob.webp` | 樽ゴブリン | goblin, green skin, pointy ears, big nose, wearing barrel, barrel armor, drunk, red face, blush, holding beer mug, beer foam, short, hiccup | 酒樽をかぶったゴブリン。いつも酔っている。まぬけ |
| `assets/monsters/dogu.webp` | ドグー | clay golem, dogu, clay figurine, round body, slit eyes, goggle eyes, cracked clay, brown clay, stubby arms, stubby legs, heavy | 泥の丸い人形。のろくて硬い。とぼけた顔 |
| `assets/monsters/orc.webp` | オーク | orc, pig face, pig nose, tusks, grey-green skin, huge, muscular, fat belly, angry, holding battle axe, leather armor, fur | 豚面の大男。力任せ |
| `assets/monsters/werewolf.webp` | 人狼 | werewolf, wolf head, grey fur, muscular, standing on two legs, long claws, fangs, glowing yellow eyes, torn shirt, torn trousers | 昼は人、夜は獣。荒々しい |
| `assets/monsters/spider.webp` | 大蜘蛛 | giant spider, black spider, hairy legs, eight legs, multiple eyes, red eyes, large fangs, venom dripping, spider web | 牛ほどの大蜘蛛。不気味 |
| `assets/monsters/slime.webp` | 酸のスライム | slime, green slime, acid slime, translucent body, bubbles, bones inside, dissolving, dripping, amorphous | 酸のスライム。溶けかけた骨が中に浮く |
| `assets/monsters/ogre.webp` | オーガ | ogre, giant, huge, fat, bald, ugly, underbite, small eyes, drooling, grey-brown skin, loincloth, holding tree trunk, club | 人を丸かじりにする巨人。頭は悪い |
| `assets/monsters/zombie.webp` | 屍の群れ | zombie, undead, rotting corpse, grey skin, torn clothes, exposed ribs, missing jaw, glowing eyes, outstretched arms, shambling | 呪いで動く死体（群れだが一体で描く） |
| `assets/monsters/wyvern.webp` | 翼竜 | wyvern, small dragon, green scales, bat wings, spread wings, two legs, long tail, tail stinger, sharp teeth, flying | 空から襲う小型の竜 |
| `assets/monsters/mimic.webp` | ミミック | mimic, treasure chest, chest monster, wooden chest, open lid, long tongue, sharp teeth, eyes inside chest, gold coins, drooling | 宝箱のふりをした魔物 |
| `assets/monsters/oni.webp` | 鬼 | oni, red skin, two horns, huge, muscular, fangs, wild black hair, tiger skin loincloth, holding kanabo, sake gourd | 沖の島の鬼。酒と人肉を好む |
| `assets/monsters/chimera.webp` | キメラ | chimera, lion body, lion head, goat head, snake tail, snake head, mane, fangs, four legs, stitches | 獅子と山羊と蛇の継ぎ合わせ |
| `assets/monsters/blackknight.webp` | 黒騎士 | living armor, black knight, full armor, black armor, closed helmet, glowing eyes in helmet, holding greatsword, tattered black cape, no face | 使徒に仕える黒い鎧。中身は見えない |
| `assets/monsters/general.webp` | 魔物将軍 | demon general, giant, horned helmet, heavy armor, spiked armor, red skin, tusks, muscular, holding halberd, war banner, cape | 魔物の軍勢を率いる将。威圧 |
| `assets/monsters/kin.webp` | 使徒の眷属 | demon, gargoyle, winged demon, bat wings, black skin, horns, long claws, glowing red eyes, slender, long tail | 使徒が生み出した翼ある僕 |
| `assets/monsters/e1_crowngob.webp` | 王冠ゴブリン | goblin, green skin, pointy ears, big nose, googly eyes, grin, paper crown, red cape, holding dagger, sweat, short, proud | 紙の王冠のゴブリン王。家来はいない。まぬけ |
| `assets/monsters/e1_bowshroom.webp` | おじぎ茸 | mushroom monster, giant mushroom, pink spotted cap, bowing, dot eyes, blush, spores, stubby legs | おじぎする茸。まぬけで憎めない |
| `assets/monsters/e1_tollrat.webp` | 関所ネズミの群れ | giant rat, standing on hind legs, brown fur, buck teeth, whiskers, smug, small pouch, holding pebble, toll sign | 関所を名乗るネズミ（群れだが一匹で描く）。まぬけ |
| `assets/monsters/e1_frostgrave.webp` | 凍えた旅人 | undead, frozen corpse, pale blue skin, frost, icicles, hollow eyes, white hair, scarf, ragged cloak, snow on shoulders, walking, outstretched arms | 凍えて死んだ旅人。哀しく不気味 |
| `assets/monsters/e1_frogprophet.webp` | 沼の預言蛙 | giant frog, green skin, spots, wide mouth, grin, googly eyes, rune necklace, sitting, drooling | 死の預言を外し続ける大蛙。まぬけ |
| `assets/monsters/e1_sweeper.webp` | 掃除人形 | stone golem, ancient automaton, stone doll, stubby body, single eye, glowing eye, cracks, runes, holding broom | 遺跡を掃除する石の人形。人をほこりと見なす |
| `assets/monsters/e1_lantern.webp` | 提灯お化け | chouchin obake, paper lantern, lantern monster, one eye, long tongue, flame, burnt paper, floating | 化け提灯。自分の火で焦げる。まぬけ |
| `assets/monsters/e1_melted.webp` | 溶けかけた見習いたち | blob monster, fused bodies, melted flesh, purple flesh, many eyes, open jaws, bones, melting robes, bubbles, runes | 溶け合った見習いたち。おぞましい |
| `assets/monsters/e1_sleepgiant.webp` | 寝返り巨人 | giant, huge, fat, beard, wild hair, eyes closed, sleepy, drooling, snot bubble, loincloth | 寝たまま歩く巨人。まぬけで規模が大きい |
| `assets/monsters/e1_bonepicker.webp` | 骨並べ | skeleton, tall, lanky, skull head, hollow eyes, ragged cloth, bone pouch, holding bone club, carrying bones | 骨を大きさ順に並べる魔物。不気味 |
| `assets/monsters/e1_herald.webp` | 使徒の触れ役 | imp, demon messenger, purple skin, ram horns, bat wings, glowing eyes, grin, dark robe, holding scroll, feather plume, floating | 使徒の布告を触れ回る使い魔。陽気で邪悪 |
| `assets/monsters/e1_ashhound.webp` | 灰喰い犬 | hellhound, black dog, ash, lava cracks, glowing cracks, embers, glowing eyes, fangs, spiked tail, four legs | 灰の荒野の犬。人は残飯 |
| `assets/monsters/w1_candlemite.webp` | 蝋燭かじり | giant caterpillar, larva, pale yellow, wax, candle on back, googly eyes, crying, tears | 蝋燭をかじる芋虫。泣き虫。まぬけ |
| `assets/monsters/w1_husk.webp` | 祈り殻 | undead, mummified pilgrim, dried corpse, hood, white robe, hollow eyes, praying hands, halo mark on neck, ribs | 死んだと気づかない巡礼者。哀しく不気味 |
| `assets/monsters/w1_choir.webp` | 聖歌の髑髏 | floating skull, singing skull, open jaw, cracked skull, choir collar, musical notes, ghostly glow | 首だけの聖歌隊（群れだが一つで描く） |
| `assets/monsters/w1_beastpriest.webp` | 獣憑きの司祭 | werewolf, wolf head, priest, white vestment, holy symbol necklace, claws, fangs, glowing eyes, blood, preaching | 獣憑きの司祭。まだ説教をやめない |
| `assets/monsters/w1_tanuki.webp` | 祭りの化け狸 | tanuki, raccoon dog, standing, round belly, leaf on head, tail, grin, blush, holding sake bottle | 祭りの化け狸。化けるのが下手。まぬけ |
| `assets/monsters/e2_cookgob.webp` | 見習い料理ゴブリン | goblin, green skin, pointy ears, big nose, chef hat, apron, sweat, worried, holding peeler, potato | 必死で働く見習いゴブリン。まぬけ |
| `assets/monsters/e2_meatling.webp` | 逃げた食材 | flesh blob, meat monster, raw meat, bones sticking out, three eyes, open jaw, bubbling | 逃げた肉の塊。おぞましい |
| `assets/monsters/e2_planted.webp` | 植えられた人 | undead, person buried to the waist in soil, flowers growing from head, reaching arms, open mouth, hollow eyes, flower bed | 花壇に植えられた人。不気味 |
| `assets/monsters/e2_rotbloom.webp` | 腐れ花 | flower monster, giant flower, pink petals, fanged mouth, single eye, antlers, pollen, drooling, vines | 眠らせる腐れ花 |
| `assets/monsters/m5_remnant.webp` | 成れの果て | beast, wolf, four legs, dark fur, scars, glowing eyes, fangs, drooling, torn apron string around neck | 成れの果ての獣。哀しい |
| `assets/monsters/m5_oldbeast.webp` | 首に布を巻いた獣 | beast, large wolf, four legs, brown fur, visible ribs, glowing eyes, fangs, cloth tied around neck, embroidered cloth | 首に名前入りの布を巻いた獣。哀しい |
| `assets/monsters/c2_captainbeast.webp` | 隊長だったもの | monster, giant, mutated soldier, three arms, extra arm, torn blue military uniform, insignia patch, glowing eyes, fangs, drooling, scars, holding club | 隊長だったもの。哀しくおぞましい |
| `assets/monsters/c2_rustspawn.webp` | 錆鎧の分かれ身 | living armor, empty armor, giant knight, rusty armor, chains inside helmet, glowing eyes, holding greatsword, rust particles, smoke, pauldrons | 錆鎧の分かれ身。兜の中は鎖 |

## 人の姿の敵（10）

盗賊・衛兵など、人の姿の敵（一覧の `human: true`）。後置きとネガティブが人向けに替わる（`style_monsters.json` の `human`）。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/monsters/bandit.webp` | 街道の盗賊 | 1boy, man, bandit, former farmer, thin, gaunt, stubble, sunken cheeks, nervous, ragged clothes, patched tunic, straw hat, holding pitchfork | 食い詰めた元農民。怖いというより哀れ |
| `assets/monsters/banditboss.webp` | 山賊の頭 | 1boy, man, bandit leader, huge man, eyepatch, black beard, scar on face, grin, fur cloak, leather armor, holding broadsword | 片目の山賊の頭。話は分かる |
| `assets/monsters/guard.webp` | 町の衛兵 | 1boy, man, town guard, mustache, bored, chainmail, blue tabard, kettle hat, holding spear | 町の衛兵。賄賂にも忠実 |
| `assets/monsters/deserter.webp` | 帝国脱走兵 | 1boy, man, deserter, soldier, imperial soldier, gaunt, stubble, tired eyes, dented armor, torn cape, holding sword | 飢えた元兵士。腕は確か |
| `assets/monsters/ninja.webp` | はぐれ忍 | 1boy, ninja, black ninja outfit, face mask, covered mouth, sharp eyes, scarf, holding kunai, crouching | 抜け忍。音もなく背後に立つ |
| `assets/monsters/warlock.webp` | 呪術師 | 1boy, man, warlock, dark hooded robe, gaunt, pale skin, glowing eyes, holding staff, cursed runes, purple flames, dark magic | 禁術の魔法使い |
| `assets/monsters/m5_feverfolk.webp` | 熱に浮いた村人 | 1boy, man, farmer, feverish, glowing eyes, sweat, fangs, hairy arms, claws, ragged clothes, needle marks on arm | 獣になりかけの村人 |
| `assets/monsters/m5_nightwatch.webp` | 夜番崩れ | 1boy, man, huge man, night watchman, hairy, black beard, glowing eyes, lantern on belt, leather armor, holding hatchet, chipped blade | 夜番崩れの大男 |
| `assets/monsters/m3_hunter.webp` | 賞金稼ぎ | 1boy, man, bounty hunter, hooded cloak, scar, smirk, holding sword, wanted posters, pouch | 賞金稼ぎ |
| `assets/monsters/m2_traitor.webp` | 裏切った仲間 | 1boy, man, hooded, scarf, smirk, ragged cloak, holding dagger | 裏切った仲間 |

## 人物の側に任せる敵

人物の一覧（[portraits.md](portraits.md)）に載っている人の姿の敵。ここでは作らない（戦闘では今の canvas の絵）。

| 敵の id | 人物の id |
|---|---|
| `c2_nora` | `nora` |
| `c2_angelica` | `angelica` |
| `c2_zork` | `zork` |
| `w1_konoha` | `konoha` |
| `e2_berna` | `berna` |
