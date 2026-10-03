# 魔物の絵（Stable Diffusion のプロンプト一覧）

このファイルは `node tools/monsters.mjs` で `docs/art/monsters.json` から作る（名前は敵のデータから取り直す）。直すときは json を直してから作り直す。

## 作り方

- 大きさ：**512×512**（正方形・全身・白い無地の背景（ゲームで周りをぼかしてなじませる））。形式：**webp**、1枚 **60KB 以下**。
- タグはその魔物の**特徴だけ**。画風・品質・構図・背景・ネガティブは [style_monsters.json](style_monsters.json) で足す（人物の `style.json` とは別）。
- できた画像は表の「ファイル」の名前で置く（例：`assets/monsters/goblin.webp`）。`node tools/build.mjs` で HTML に埋め込まれ、戦闘ではその敵をこの画像で描く（`src/ui/v6_monsters.js`。白い背景は周りをぼかして消す）。無い敵は今の canvas の絵のまま。
- 作るのは `node tools/gen_portraits.mjs --monsters`（`--only goblin,slime`・`--force`・`--dry`・`--keep`・`--new-seed` は人物と同じ。手順は [README.md](README.md)）。
- 「**異形**」と書いた魔物（一覧の `style: "eldritch"`）は、人の形を持たない格上の存在。別のモデルの [style_eldritch.json](style_eldritch.json)（暗い油彩の挿絵）で作る。ほかは `style_monsters.json`。
- 埋め込みの合計の上限（12MB）は人物と魔物を合わせて数える。

## 使徒・ボス（12）

使徒の魔物の姿と、ボス。特にていねいに。気に入った絵は `--keep <id>` で seed を残す。

| ファイル | 名前 | 特徴のタグ | メモ |
|---|---|---|---|
| `assets/monsters/kain.webp` | 眷属カイン | 1boy, young man, scholar, silver hair, glasses, cold smile, long dark coat, holding glowing book, floating pages, ancient runes | ボス。蒐集の使徒レヴィアンの眷属。冷たい学者 |
| `assets/monsters/shuten.webp` | 鬼の頭目ゴズ | oni, oni chief, huge, red skin, two large horns, wild white hair, fangs, scars, muscular, samurai armor pieces, tiger skin, holding glowing katana, white glowing sword, sake gourd | ボス。鬼ヶ島の大鬼。白く光る刀を持つ |
| `assets/monsters/bonedragon.webp` | 屍竜ネクロザ | skeletal dragon, undead dragon, bone dragon, huge, ribcage, sword stuck in ribs, glowing green eyes, tattered bone wings, ghostly green fire, long neck, skull | ボス。墓場を守る屍竜。腹に剣が刺さっている |
| `assets/monsters/rize.webp` | 眷属リゼ | 1girl, woman, swordswoman, short black hair, crazy smile, wild eyes, scar, dark armor, holding sword, blood splatter, battle stance | ボス。グラウの眷属。戦いに酔う女剣士 |
| `assets/monsters/graw.webp` | 黒鎧の使徒エンバルダ | giant, colossal, muscular, grey skin, glowing red eyes, horns, scars, battle-hungry grin, broken armor, chains, holding giant greatsword, glowing aura, barrier | 使徒（ボス）。戦いだけを好む巨人。絶界に守られている。圧倒的に |
| `assets/monsters/royalguard.webp` | 近衛騎士団長 | 1boy, man, knight commander, royal guard, grey hair, stern, ornate plate armor, white armor, gold trim, blue cape, holding longsword, shield | ボス。王国最強の騎士 |
| `assets/monsters/w1_vespa.webp` | 異端審問官ヴェスパ | inquisitor, iron mask, full face mask, tall, thin, grey armor, red cape, holding spear, torch, smoke | ボス。鉄仮面の異端審問官 |
| `assets/monsters/w1_gregor.webp` | 墓守グレゴル | 1boy, old man, necromancer, priest, white hair, long beard, gaunt, glowing eyes, smirk, black robe, holding staff, runes | ボス。死体を歩かせる老司祭 |
| `assets/monsters/e2_gormoa.webp` | 灼け口の使徒テルグリス | monster, ogre-like giant, grotesque, enormously fat, round belly covered by a huge stained apron, mouth on belly, three eyes, small horns, long tongue, drooling, pink spotted skin, wearing a bib and a tattered tunic, holding a giant ladle like a club | 使徒（ボス）。丘のように太った暴食の使徒。おぞましく、少しまぬけ |
| `assets/monsters/e2_marmit.webp` | 料理長マルミット | 1boy, old man, chef, white hair, stubble, smirk, lanky, white apron, blood on apron, holding meat cleaver | ボス。人を見ると部位を数える料理長 |
| `assets/monsters/e2_mordu.webp` | 苔衣の使徒セグリトス | plant monster, tall, gardener, covered in mud and moss, wilted flowers growing from head, wide-brimmed hat, one glowing eye, long claws, holding pitchfork, pollen, spores, rotting | 使徒（ボス）の魔物の姿。泥と苔の庭師。甘い腐臭 |
| `assets/monsters/w2_ironwarden.webp` | 溶けかけた機械兵 | iron golem, giant robot, ancient machine, huge, melted metal, acid, rust, glowing eyes, heavy armor, holding club, steam | ボス。半分溶けた鉄の巨人 |

## 魔物（140）

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
| `assets/monsters/e1_melted.webp` | 溶けかけた見習いたち | blob monster, fused bodies, melted flesh, purple flesh, many eyes, open jaws, bones, melting robes, bubbles | 溶け合った見習いたち。おぞましい |
| `assets/monsters/e1_sleepgiant.webp` | 寝返り巨人 | giant, huge, fat, beard, wild hair, eyes closed, sleepy, drooling, snot bubble, loincloth | 寝たまま歩く巨人。まぬけで規模が大きい |
| `assets/monsters/e1_bonepicker.webp` | 骨並べ | skeleton, tall, lanky, skull head, hollow eyes, ragged cloth, bone pouch, holding bone club, carrying bones | 骨を大きさ順に並べる魔物。不気味 |
| `assets/monsters/e1_herald.webp` | 使徒の触れ役 | imp, demon messenger, purple skin, ram horns, bat wings, glowing eyes, grin, dark robe, holding scroll, feather plume, floating | 使徒の布告を触れ回る使い魔。陽気で邪悪 |
| `assets/monsters/e1_ashhound.webp` | 灰喰い犬 | hellhound, black dog, ash, lava cracks, glowing cracks, embers, glowing eyes, fangs, spiked tail, four legs | 灰の荒野の犬。人は残飯 |
| `assets/monsters/w1_candlemite.webp` | 蝋燭かじり | giant caterpillar, larva, pale yellow, wax, candle on back, googly eyes, crying, tears | 蝋燭をかじる芋虫。泣き虫。まぬけ |
| `assets/monsters/w1_husk.webp` | 祈り殻 | undead, mummified pilgrim, dried corpse, hood, white robe, hollow eyes, praying hands, halo mark on neck, ribs | 死んだと気づかない巡礼者。哀しく不気味 |
| `assets/monsters/w1_choir.webp` | 聖歌の髑髏 | floating skull, singing skull, open jaw, cracked skull, choir collar, musical notes, ghostly glow | 首だけの聖歌隊（群れだが一つで描く） |
| `assets/monsters/w1_beastpriest.webp` | 獣憑きの司祭 | werewolf, wolf head, priest, white vestment, holy symbol necklace, claws, fangs, glowing eyes, blood, preaching | 獣憑きの司祭。まだ説教をやめない |
| `assets/monsters/w1_tanuki.webp` | 祭りの煙小鬼 | tanuki, raccoon dog, standing, round belly, leaf on head, tail, grin, blush, holding sake bottle | 祭りの化け狸。化けるのが下手。まぬけ |
| `assets/monsters/e2_cookgob.webp` | 見習い料理ゴブリン | goblin, green skin, pointy ears, big nose, chef hat, apron, sweat, worried, holding peeler, potato | 必死で働く見習いゴブリン。まぬけ |
| `assets/monsters/e2_meatling.webp` | 逃げた食材 | flesh blob, meat monster, raw meat, bones sticking out, three eyes, open jaw, bubbling | 逃げた肉の塊。おぞましい |
| `assets/monsters/e2_planted.webp` | 植えられた人 | undead, person buried to the waist in soil, flowers growing from head, reaching arms, open mouth, hollow eyes, flower bed | 花壇に植えられた人。不気味 |
| `assets/monsters/e2_rotbloom.webp` | 腐れ花 | flower monster, giant flower, pink petals, fanged mouth, single eye, antlers, pollen, drooling, vines | 眠らせる腐れ花 |
| `assets/monsters/m5_remnant.webp` | 成れの果て | beast, wolf, four legs, dark fur, scars, glowing eyes, fangs, drooling, torn apron string around neck | 成れの果ての獣。哀しい |
| `assets/monsters/m5_oldbeast.webp` | 首に布を巻いた獣 | beast, large wolf, four legs, brown fur, visible ribs, glowing eyes, fangs, cloth tied around neck, embroidered cloth | 首に名前入りの布を巻いた獣。哀しい |
| `assets/monsters/c2_captainbeast.webp` | 隊長だったもの | monster, giant, mutated soldier, three arms, extra arm, torn blue military uniform, insignia patch, glowing eyes, fangs, drooling, scars, holding club | 隊長だったもの。哀しくおぞましい |
| `assets/monsters/c2_rustspawn.webp` | 錆鎧の分かれ身 | living armor, empty armor, giant knight, rusty armor, chains inside helmet, glowing eyes, holding greatsword, rust particles, smoke, pauldrons | 錆鎧の分かれ身。兜の中は鎖 |
| `assets/monsters/e4k_squire.webp` | 黒鎧の従騎士 | small black knight, black full plate armor, helmet with glowing red eyes, sword and shield, cape | 黒い鎧の主の従騎士 |
| `assets/monsters/e4k_chainhound.webp` | 鎖の黒犬 | black hound, huge dark dog, broken chain collar, glowing red eyes, lava-like cracks, spiked tail | 鎖を引きずる黒い大犬 |
| `assets/monsters/e4k_taster.webp` | 毒見の小鬼 | goblin, poison taster, green spotted skin, cook cap, drooling, sick, holding spoon and dagger | 毒見をさせられる小鬼 |
| `assets/monsters/e4k_cauldron.webp` | 歩く大鍋 | living cauldron, big iron pot monster, bubbling stew, steam, fangs on rim, glowing eyes | 煮え立つまま歩く大鍋 |
| `assets/monsters/e4k_mossdog.webp` | 苔むした番犬 | guard dog covered in moss, green mossy fur, small plants growing on back, glowing eyes | 苔むした庭の番犬 |
| `assets/monsters/e4k_pruner.webp` | 枝打ち人形 | wooden puppet gardener, lanky wooden body, shear-shaped blade hands, single lens eye, cracked wood | 庭師が作った枝打ち人形 |
| `assets/monsters/e4k_inkling.webp` | 滲み文字 | swarm of living ink letters, floating dark blue ink characters, runes, dripping ink | 水に溶けた本の文字の群れ |
| `assets/monsters/e4k_drowned.webp` | 書庫の溺れ人 | drowned man, pale waterlogged skin, wet dark long hair, holding soaked book, hollow eyes, dripping water | 名前を失った書庫の溺れ人 |
| `assets/monsters/e4k_puppet.webp` | 糸吊りの踊り手 | dancing marionette people, strings from above, crying faces, closed eyes, tattered clothes, floating | 糸で吊られて踊る旅人 |
| `assets/monsters/e4k_smiler.webp` | 笑い面の侍従 | masked servant, smiling white mask, elegant purple robe, holding parasol staff, bowing | 笑い面の侍従 |
| `assets/monsters/e4k_fogscribe.webp` | 霧の書記 | hooded scribe, grey robe, glowing eyes in hood, holding open book, quill, mist, floating | 霧の中で先を書く書記 |
| `assets/monsters/e4k_fogowl.webp` | 霧梟 | owl, pale grey feathers, big round eyes, carrying torn paper page, mist | 紙を盗む霧梟 |
| `assets/monsters/e4k_sandimp.webp` | 砂の小僧 | small imp made of sand, crumbling sandy body, cracked, grinning, stolen coin pouch, sand trailing | 砂でできたすりの小僧 |
| `assets/monsters/e4k_hourglass.webp` | 砂時計の番人 | sand golem with large hourglass in chest, cracked sandstone body, single lens eye, runes | 胸に砂時計を抱えた人形 |
| `assets/monsters/e4k_whiteacolyte.webp` | 白目の侍祭 | acolyte, white robes, long white hair, cloudy white blind eyes, serene smile, holding staff | 目が白く濁った侍祭 |
| `assets/monsters/e4k_haloshade.webp` | 後光の影 | small winged shadow spirit, pale pink glow, moth wings covered in eye patterns, three glowing eyes | 後光から剥がれた羽の影 |
| `assets/monsters/e4k_smokecat.webp` | 煙の猫 | cat made of smoke, lavender grey fur dissolving into incense smoke, slit eyes, smirk | 香の煙の猫 |
| `assets/monsters/e4k_maskguard.webp` | 銀面の衛士 | guard with silver mask, expressionless silver face mask, armor, spear and shield, cape | 銀の面の衛士 |
| `assets/monsters/e4k_nailer.webp` | 釘打ち人形 | stubby wooden puppet, hammer in hand, goggle eyes, nail pouch, cracked wood | 面を打ちつける釘打ち人形 |
| `assets/monsters/e4k_dreamsheep.webp` | 逆さ羊 | dream sheep, fluffy white wool, curled ram horns, closed eyes, peaceful smile, floating upside down | 逆さに歩く夢の羊 |
| `assets/monsters/e4k_sleepwalkers.webp` | 夢遊びの子ら | group of sleepwalking children, eyes closed, holding hands, pale nightclothes, arms forward, floating | 目を閉じて歩く子どもたち |
| `assets/monsters/e4k_bladechick.webp` | 刃羽の雛 | chick of giant bird, feathers made of soft metal blades, big round eyes, fluffy | 刃の羽の雛 |
| `assets/monsters/e4k_cliffwatch.webp` | 崖の羽番 | bird-headed guard, beak, armor made of blade feathers, spear, feathered wings, plume | 抜け羽を鎧にした番人 |
| `assets/monsters/e4k_bellfish.webp` | 鐘鳴り魚 | big round fish, blue spotted scales, googly eyes, small bell visible inside belly, bubbles | 腹で鐘が鳴る魚 |
| `assets/monsters/e4k_drownedsailor.webp` | 沈んだ水夫 | drowned sailor, undead, waterlogged pale skin, bandana, tattered sailor clothes, visible ribs, reaching | 沖の歌に呑まれた水夫 |
| `assets/monsters/e4k_unsaid.webp` | 言いかけの影 | shadow figure, black silhouette, glowing eyes, open mouth as if speaking, smoky edges, floating | 言いかけの影 |
| `assets/monsters/e4k_blackmite.webp` | 黒い羽虫 | swarm of black insects, black feather-like wings, red glowing eyes, stingers | 黒い羽のかけらの虫 |
| `assets/monsters/e4k_moonhare.webp` | 二つ月の兎 | white hare, glowing eyes, long ears, moonlight, two moons, floating | 二つ月の夜の兎 |
| `assets/monsters/e4k_moonarcher.webp` | 月を射る亡者 | skeleton archer, tattered cloak, longbow aimed upward, hollow eyes, moonlight | 月を射ろうとした亡者 |
| `assets/monsters/e4k_rustgnaw.webp` | 錆かじり | small rust-colored rodent, gnawing on iron, sharp teeth, round ears, spotted | 鉄をかじる小さな獣 |
| `assets/monsters/e4k_ironmite.webp` | 鉄虫 | armored beetle, iron grey carapace, metal shell, glowing eyes, mandibles | 鎧をかじる鉄虫 |
| `assets/monsters/e4k_bellsinner.webp` | 鈴振りの罪人 | undead sinner, hooded rags, bell hanging from neck, scarred, hollow eyes, chained | 鈴を下げた罪人の亡者 |
| `assets/monsters/e4k_guiltdog.webp` | 咎の犬 | black hound, scarred dark fur, glowing red eyes, sniffing, spiked tail, menacing | 咎人を追う犬 |
| `assets/monsters/e4k_scarecrow.webp` | 動く案山子 | living scarecrow, straw body, burlap face with stitched grin, straw hat, ragged clothes, scarf | 畑から歩き出した案山子 |
| `assets/monsters/e4k_furrowmole.webp` | 畝走りの土竜 | giant mole, brown fur, digging claws, pink nose, seeds in paws, farm field | 畝の下を走る大土竜 |
| `assets/monsters/e4k_acidbud.webp` | 酸の芽 | acid slime sprout, bright green bubbling blob, three eyes, dripping acid | 酸の溜まりの芽 |
| `assets/monsters/e4k_greenwatch.webp` | 緑の見張り | mossy stone sentinel, green stone golem, single lens eye, spear, empty socket in chest, runes | 溜まりを囲む石の見張り |
| `assets/monsters/e4k_rootling.webp` | 根の子 | small root creature, body of twisted tree roots, dot eyes, claw-like rootlets | 大樹の根から芽吹いた子 |
| `assets/monsters/e4k_ember.webp` | 燠喰い虫 | beetle, dark shell with glowing orange cracks, eating embers, smoke, mandibles | 火の粉を食べる甲虫 |
| `assets/monsters/e4_mosswisp.webp` | 苔灯り | glowing moss ball, floating orb of moss, small round body, bioluminescent green moss, tiny dot eyes, spores drifting, night forest glow | 夜の森の光る苔の玉。眠りの胞子。ふわふわでかわいい |
| `assets/monsters/e4_satchelrat.webp` | 鞄ネズミ | giant rat, brown fur, round ears, big nose, carrying stolen leather pouch, thin tail, sneaky, standing on hind legs | 鞄を狙うネズミ。小ずるくてまぬけ |
| `assets/monsters/e4_thornboar.webp` | 棘猪 | wild boar, thorny brambles growing from back, dark brown bristly fur, tusks, angry, thorn spikes | 背に茨の棘が生えた猪 |
| `assets/monsters/e4_relicmole.webp` | 遺構モグラ | giant mole, dark fur, huge digging claws, pink nose, small eyes, holding shiny old gold coin, dirt | 光り物好きの大モグラ。とぼけた顔 |
| `assets/monsters/e4_lampghost.webp` | 灯し番の亡霊 | ghost lamplighter, hooded robe, pale translucent body, holding lantern pole, glowing yellow eyes, floating, wisps of smoke | 消えた灯りを点けて回る亡霊。人の温もりを吸う |
| `assets/monsters/e4_rustwatch.webp` | 錆びた見張り | rusted iron automaton, stubby body, single round lens eye, holding spear, cracked rusty armor plates, ancient guardian | 錆びた鉄の見張り人形 |
| `assets/monsters/e4_cropcrow.webp` | 麦畑の大烏 | giant crow, black feathers, sharp beak, flock, wheat field, mischievous | 麦畑を荒らす大烏の群れ |
| `assets/monsters/e4_mudhound.webp` | 泥浴び犬 | feral dog, mud-caked fur, muddy, tongue out, scruffy, spotted coat, pack dog | 泥まみれの野良犬 |
| `assets/monsters/e4_rainslug.webp` | 雨の大なめくじ | giant slug, slimy grey-brown body, eye stalks, glistening mucus, dripping slime, rain | 雨の日の牛ほどのなめくじ |
| `assets/monsters/e4_lordhound.webp` | 領主の猟犬 | hunting hound, sleek tan coat, red scarf collar, bared fangs, lean muscular dog | 逃げ出した領主の猟犬 |
| `assets/monsters/e4_bellbat.webp` | 鐘楼の蝙蝠 | giant bat, dark purple membrane wings, pointy ears, red glowing eyes, fangs, bell tower | 鐘楼の蝙蝠の群れ |
| `assets/monsters/e4_waxsaint.webp` | 蝋の聖人像 | wax statue of a saint, melted candle wax body, closed eyes, serene face, dripping wax, robe of wax, lit candles on shoulders | 蝋燭が溶け重なった聖人の像 |
| `assets/monsters/e4_ossuaryhound.webp` | 骨堂の番犬 | skeletal dog, undead hound, bones, empty eye sockets, green ghostly glow, ossuary | 骨だけの番犬 |
| `assets/monsters/e4_candlewidow.webp` | 蝋燭売りの寡婦 | ghost woman, widow, black hooded mourning dress, pale grey skin, long hair, holding candle staff, hollow eyes, floating | 夜の参道で蝋燭を売る寡婦の亡霊 |
| `assets/monsters/e4_tidecrab.webp` | 磯の大蟹 | giant crab, red shell, huge pincers, googly eye stalks, barnacles, rocky shore | 荷車ほどの磯の大蟹 |
| `assets/monsters/e4_reedimp.webp` | 葦の小鬼 | small green water imp, plate-like flat head, beak mouth, webbed hands, spotted skin, mischievous, reeds | 葦の中の皿頭の小鬼 |
| `assets/monsters/e4_seafog.webp` | 沖の黒坊主 | giant dark sea spirit, huge bald black figure, faceless except glowing eyes, emerging from fog, wet, looming | 霧の浜に立つ黒い坊主 |
| `assets/monsters/e4_drumbadger.webp` | 腹鼓の狸 | fat raccoon dog, round belly, drumming on belly, striped tail, blushing cheeks, sake gourd, cheerful | 腹鼓を打つ狸。のんき |
| `assets/monsters/e4_shellwitch.webp` | 海女の亡霊 | ghost woman, drowned pearl diver, white diving clothes, long wet black hair, pale bluish skin, hollow eyes, reaching hands | 嵐で戻らなかった海女の亡霊 |
| `assets/monsters/e4_snowwolf.webp` | 雪狼 | white wolf, snow wolf, thick white fur, glowing pale blue eyes, fangs, snow | 雪の日の白い狼 |
| `assets/monsters/e4_iciclewraith.webp` | 氷柱の霊 | ice wraith, spirit made of icicles, translucent blue ice body, hollow eyes, frost mist, floating | 氷柱に宿った霊 |
| `assets/monsters/e4_minerghost.webp` | 坑夫の亡者 | undead miner, skeleton, mining helmet, pickaxe, ragged clothes, hollow eyes, ore pouch | 落盤で死んだ坑夫の亡者 |
| `assets/monsters/e4_frostbear.webp` | 霜熊 | giant bear, frost-covered pale fur, icy breath, huge claws, snarling | 霜をまとった大熊 |
| `assets/monsters/e4_warcrow.webp` | 戦場鴉 | crow, black feathers, red glowing eyes, battlefield, ominous, flock | 戦場を渡る鴉の群れ |
| `assets/monsters/e4_bogleech.webp` | 大蛭 | giant leech, slimy dark segmented body, circular toothed mouth, swamp | 腕ほどもある大蛭 |
| `assets/monsters/e4_brokenspirit.webp` | 契約を破られた精霊 | small angry fairy spirit, translucent teal body, moth wings, pointed ears, glowing eyes, floating runes | 契約を破られた小さな精霊 |
| `assets/monsters/e4_mudcroc.webp` | 泥鰐 | crocodile, muddy green scales, wide jaws full of teeth, swamp water, spiked tail | 泥に沈んで待つ鰐 |
| `assets/monsters/e4_poisonfrog.webp` | 毒蛙 | poison dart frog, bright orange and yellow spots, small, googly eyes, glossy skin | 派手な色の毒蛙の群れ |
| `assets/monsters/e4_dustmoth.webp` | 鱗粉蛾 | giant moth, dusty brown wings with eye spots, fuzzy body, scattering scales, night | 皿ほどの鱗粉蛾 |
| `assets/monsters/e4_rockeater.webp` | 岩喰い鳥 | giant bird, grey stone-like feathers, heavy beak, cracked rocky texture, mountain cliff | 岩を食べる大きな鳥 |
| `assets/monsters/e4_hillorc.webp` | 境の山オーク | orc, pig face, tusks, green-grey skin, fur mantle, shoulder armor, battle axe, war horn | 山の洞穴のオーク |
| `assets/monsters/e4_gravejackal.webp` | 墓荒らし山犬 | jackal, scrawny wild dog, spotted tan fur, pointy ears, bone in mouth, graveyard | 竜の墓場の山犬の群れ |
| `assets/monsters/e4_oldlegion.webp` | 古戦場の亡兵 | skeleton soldiers, undead legion, rusty helmets and armor, spears, marching in formation, green glow | 隊列を組んだ古戦場の亡兵 |
| `assets/monsters/e4_stonetroll.webp` | 石肌の巨人 | stone giant, rocky grey skin, cracked boulder texture, tusks, huge stone club, hulking | 岩肌の巨人 |
| `assets/monsters/e4_cliffharpy.webp` | 崖の鳥女 | harpy, woman with feathered wings for arms, talons, wild red-brown long hair, ragged clothes, mischievous grin | 光り物好きの崖の鳥女 |
| `assets/monsters/e4_ladderGob.webp` | 梯子担ぎのゴブリン隊 | goblin soldiers, carrying siege ladder, helmets, spears, crude armor, war cry | 攻め梯子を担いだゴブリン隊 |
| `assets/monsters/e4_ashogre.webp` | 灰被りのオーガ | ogre, covered in white ash, grey skin, tusks, wild hair, huge club, smoke | 灰を浴びて白くなったオーガ |
| `assets/monsters/e4_scoutbird.webp` | 魔物の斥候鳥 | monstrous bird, dark red feathers, three glowing eyes, sharp beak, scout, flying | 使徒領の斥候鳥 |
| `assets/monsters/e4_deadsentry.webp` | 砦の亡霊兵 | ghost soldier, translucent green armor, helmet, spear and shield, tattered cape, hollow eyes, floating | 砦の外の亡霊兵 |
| `assets/monsters/e4_warbeast.webp` | 鎖付きの魔獣 | war beast, lion-like monster, dark fur, broken chain collar, scars, spiked tail, glowing red eyes | 鎖を引きずる魔獣 |
| `assets/monsters/e4_ashwyrm.webp` | 灰の地竜 | wingless dragon, ash-grey scales, glowing lava cracks, long horns, crawling through ash | 翼の無い灰の地竜 |
| `assets/monsters/e4_bonecarter.webp` | 骨車引き | hulking hooded figure, pulling cart piled with bones, ragged cloak, glowing eyes under hood, huge club | 骨の荷車を引く大男 |
| `assets/monsters/e4_shadewalker.webp` | 影歩き | shadow assassin, black mask, dark wrappings, glowing purple eyes, dagger, dissolving into shadow smoke | 影から影へ渡る者 |
| `assets/monsters/e4_redscorpion.webp` | 赤砂の蠍 | giant scorpion, red carapace, stinger tail, four glowing eyes, red sand | 赤砂の大蠍 |
| `assets/monsters/e4_hollowknight.webp` | 抜け殻の騎士 | empty suit of armor, animated armor, no body inside, glowing red eyes in helmet, sword and shield, plume, smoke | 中身の無い騎士の鎧 |
| `assets/monsters/e4_vulture.webp` | 屍食い禿鷲 | vulture, bald pink head, dark brown feathers, hooked beak, scarred, wasteland | 屍を待つ禿鷲 |
| `assets/monsters/e4_satchelrat_x.webp` | 鞄ネズミの頭目 | giant rat, brown fur, round ears, big nose, carrying stolen leather pouch, thin tail, sneaky, standing on hind legs, much larger, old, grizzled, many battle scars, imposing | 鞄ネズミの強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_thornboar_x.webp` | 年経た棘猪 | wild boar, thorny brambles growing from back, dark brown bristly fur, tusks, angry, thorn spikes, much larger, old, grizzled, many battle scars, imposing | 棘猪の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_mudhound_x.webp` | 泥浴び犬の頭目 | feral dog, mud-caked fur, muddy, tongue out, scruffy, spotted coat, pack dog, much larger, old, grizzled, many battle scars, imposing | 泥浴び犬の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_tidecrab_x.webp` | 年経た大蟹 | giant crab, red shell, huge pincers, googly eye stalks, barnacles, rocky shore, much larger, old, grizzled, many battle scars, imposing | 磯の大蟹の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_snowwolf_x.webp` | 雪狼の頭目 | white wolf, snow wolf, thick white fur, glowing pale blue eyes, fangs, snow, much larger, old, grizzled, many battle scars, imposing | 雪狼の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_frostbear_x.webp` | 年経た霜熊 | giant bear, frost-covered pale fur, icy breath, huge claws, snarling, much larger, old, grizzled, many battle scars, imposing | 霜熊の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_mudcroc_x.webp` | 年経た泥鰐 | crocodile, muddy green scales, wide jaws full of teeth, swamp water, spiked tail, much larger, old, grizzled, many battle scars, imposing | 泥鰐の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_rockeater_x.webp` | 年経た岩喰い鳥 | giant bird, grey stone-like feathers, heavy beak, cracked rocky texture, mountain cliff, much larger, old, grizzled, many battle scars, imposing | 岩喰い鳥の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_hillorc_x.webp` | 山オークの頭目 | orc, pig face, tusks, green-grey skin, fur mantle, shoulder armor, battle axe, war horn, much larger, old, grizzled, many battle scars, imposing | 境の山オークの強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_stonetroll_x.webp` | 年経た石肌の巨人 | stone giant, rocky grey skin, cracked boulder texture, tusks, huge stone club, hulking, much larger, old, grizzled, many battle scars, imposing | 石肌の巨人の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_ladderGob_x.webp` | ゴブリン隊の頭目 | goblin soldiers, carrying siege ladder, helmets, spears, crude armor, war cry, much larger, old, grizzled, many battle scars, imposing | 梯子担ぎのゴブリン隊の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_ashwyrm_x.webp` | 年経た灰の地竜 | wingless dragon, ash-grey scales, glowing lava cracks, long horns, crawling through ash, much larger, old, grizzled, many battle scars, imposing | 灰の地竜の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_redscorpion_x.webp` | 赤砂の女王蠍 | giant scorpion, red carapace, stinger tail, four glowing eyes, red sand, much larger, old, grizzled, many battle scars, imposing | 赤砂の蠍の強い個体。ひと回り大きく、古傷だらけ |

## 人の姿の敵（20）

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
| `assets/monsters/e4k_bouncer.webp` | 賭場の用心棒 | 1boy, burly man, gambling den bouncer, black hair, scars, stubble, purple kimono-like outfit, scarf, holding club | 賭場の用心棒 |
| `assets/monsters/e4_poacher.webp` | 密猟者 | 1boy, man, poacher, lean, stubble, leather cap, green hunting cloak, holding longbow, quiver, wary expression | 領主の森の密猟者。追い詰められた男 |
| `assets/monsters/e4_brokenknight.webp` | 落ちぶれ騎士 | 1boy, man, fallen knight, middle-aged, greying hair, stubble, battered dented armor, tattered cape, chipped sword, proud but weary | 落ちぶれた元騎士。誇りだけは高い |
| `assets/monsters/e4_penitent.webp` | 鞭打ちの巡礼 | 1boy, flagellant pilgrim, hooded brown robe, bloody whip marks, scarred back, holding whip, gaunt, fervent eyes | 自分を鞭打つ巡礼 |
| `assets/monsters/e4_relicthief.webp` | 聖遺物盗り | 1boy, man, grave robber, thin, black hair, sly smirk, dark hood and scarf, dagger, sack of bones | 聖遺物盗りの男。小ずるい |
| `assets/monsters/e4_islepirate.webp` | 島荒らしの海賊 | 1boy, man, pirate, tanned, bandana, eyepatch, stubble, cutlass, ragged red coat, grinning | 島荒らしの海賊 |
| `assets/monsters/e4_pressgang.webp` | 徴兵隊 | 1boy, imperial soldier, helmet, grey uniform, steel armor, spear, stern face | 旅人を捕まえる帝国の徴兵隊 |
| `assets/monsters/e4_bogwitch.webp` | 沼の魔女見習い | 1girl, young witch apprentice, green hood, small, holding staff, smug smile, rune charms, swamp hut | 学院を追われた沼の魔女見習い。生意気 |
| `assets/monsters/e4_poacher_x.webp` | 密猟者の頭目 | 1boy, man, poacher, lean, stubble, leather cap, green hunting cloak, holding longbow, quiver, wary expression, much larger, old, grizzled, many battle scars, imposing | 密猟者の強い個体。ひと回り大きく、古傷だらけ |
| `assets/monsters/e4_islepirate_x.webp` | 海賊の頭目 | 1boy, man, pirate, tanned, bandana, eyepatch, stubble, cutlass, ragged red coat, grinning, much larger, old, grizzled, many battle scars, imposing | 島荒らしの海賊の強い個体。ひと回り大きく、古傷だらけ |

## 人物の側に任せる敵

人物の一覧（[portraits.md](portraits.md)）に載っている人の姿の敵。ここでは作らない（戦闘では今の canvas の絵）。

| 敵の id | 人物の id |
|---|---|
| `c4_musette` | `musette` |
| `c5_violaine` | `violaine` |
| `c5_severin` | `severin` |
| `c8_graul` | `graul` |
| `c2_nora` | `nora` |
| `c2_angelica` | `angelica` |
| `c2_zork` | `zork` |
| `w1_konoha` | `konoha` |
| `e2_berna` | `berna` |
