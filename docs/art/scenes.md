# 背景の絵の一覧（A11）

> このファイルは [scenes.json](scenes.json) から `node tools/scenes.mjs` で作る。直すときは json を直してから作り直す。
> 作り方は [README.md](README.md) の「背景の絵（A11）」。設定は [style_scenes.json](style_scenes.json)。1344×768 で作り、1232×704 の webp に縮めて `assets/scenes/<id>.webp` に置く（1 枚 150KB 以下）。

全部で 120 枚（場所 72・施設の中 36・迷宮の中 12）。

## 試しの 5 枚

まずこれだけを `node tools/gen_scenes.mjs --trial` で、設定の 2 案（絵師タグなし／立ち絵の絵師タグ）の両方で作り、持ち主が絵柄を見る。

| id | 名前 | 種類 |
|---|---|---|
| `karna` | 商都ブランデール | 場所 |
| `nerva` | 港町ヴァレンツァ | 場所 |
| `forest` | 迷いの森 | 場所 |
| `in_tavern` | 酒場 | 施設の中 |
| `in_ruins` | エル・ナフ遺構の中 | 迷宮の中 |

## 場所（72）

町・荒野・迷宮の外の景色（場所の id ごとに 1 枚）。屋外は昼・晴れで作り、時間帯・季節・天候はゲームが色味と雨・雪・霧の粒で重ねる。`sky` が night・red の場所は空が決まっている（朧島は夜、使徒領は赤い空）。

| id | 名前 | 絵 | まとめ | 特徴のタグ |
|---|---|---|---|---|
| `karna` | 商都ブランデール（レオネスト王国・町）・**試し** | `town` | west | medieval fantasy town, cobblestone main street, half-timbered houses, money changer signboards, large guild hall with banners, stone town gate, grassy low hills beyond the town wall |
| `w7_vinale` | 葡萄の町ヴィナレ（レオネスト王国・町） | `w7_vineyard` | west | vineyard town on gentle south-facing slopes, terraced grape trellises, wooden wine barrels, press house, warm sunlight |
| `w7_durm` | 発掘人の町ドゥルム（レオネスト王国・町） | `w7_diggers` | west | diggers' town grown from tents, canvas tents beside rough stone houses, broken white ancient pillars in the distance, shovels and carts |
| `w7_glatz` | 傭兵の町グラッツ（レオネスト王国・町） | `w7_mercs` | west | mercenary town around a fenced drill yard, wooden palisade, large notice board covered with paper postings, inns, taverns and smithy |
| `w7_russen` | 渡しの町リュッセン（レオネスト王国・町） | `w7_ferry` | west | river ferry town, wide river with a flat ferry boat, wooden landing piers, small toll booth hut, half-timbered houses on the bank |
| `nerva` | 港町ヴァレンツァ（レオネスト王国・町）・**試し** | `port` | west | harbor town, wooden piers, moored sailing ships with heavy wet sails, fishing nets, warehouses, misty sea, lighthouse, seagulls |
| `forest` | 迷いの森（レオネスト王国・荒野）・**試し** | `forest` | west | dense dark forest, branches interlocking overhead, thick moss on the ground, gnarled old trees, dim light through the canopy, narrow overgrown path, old barrel by the path |
| `ruins` | エル・ナフ遺構（レオネスト王国・迷宮） | `ruins` | west | ancient ruins, broken white stone pillars standing in tall grass like ribs, crumbling stone stairs leading underground, huge circular stone tablet carved with symbols, overgrown |
| `w3_bells` | 鐘撞きの丘（レオネスト王国・荒野） | `w3_bells` | west | low grassy hills, an old stone watchtower on each hilltop, bronze bell hanging in each tower, bell ropes, windy grassland |
| `w1_holy` | 聖都エルヴィナ（光天教会領・町） | `w1_holy` | west | holy city, white stone pavement, golden spires, grand cathedral, many bell towers, pilgrim road lined with candles and flowers |
| `w7_norve` | 祈りの浜ノルヴェ（光天教会領・町） | `w7_prayerbeach` | west | fishing beach village, small boats pulled up on sand, fishing nets drying on poles, tiny wooden shrine on the beach |
| `w7_serena` | 泉の町セレナ（光天教会領・町） | `w7_spring` | west | small town on a seaside cliff around a little sacred spring, stone basin, chapel, sea below |
| `w7_lumie` | 蝋燭の町リュミエ（光天教会領・町） | `w7_candles` | west | candle-making town, rows of white beeswax candles hanging in windows like curtains, warm glowing streets, small church |
| `w7_melvi` | 写本の町メルヴィ（光天教会領・町） | `w7_scriptorium` | west | riverside monastery town, long stone scriptorium building with many windows, paper mills and ink shops, calm river |
| `w7_orbe` | 巡礼の宿場オルベ（光天教会領・町） | `w7_pilgrim` | west | pilgrim road waystation town, inns with bundles of wooden walking staffs hanging from eaves, distant cathedral spire beyond a hill |
| `w1_catacomb` | エルヴィナの地下墓地（光天教会領・迷宮） | `w1_catacomb` | west | stone stairway descending to catacombs beneath a cathedral, archway lined with bones and skulls, rows of candles, iron gate |
| `w3_abbey` | 沈黙の修道院（光天教会領・荒野） | `w3_abbey` | west | roofless ruined monastery on a hill of cypress trees, stone gate with carved inscription, courtyard with old well, loaf of bread on the well edge, quiet |
| `plains` | 白銀の丘陵（レオネスト王国・荒野） | `plains` | leonest | rolling hills, white pampas grass waving in the wind, wide open view, dirt road, lone tree, distant hills |
| `leavel` | 王都レオネスト（レオネスト王国・町） | `castle` | leonest | royal capital, white castle walls, grand white castle with spires, main avenue decorated with flowers, noble mansions with heavy curtained windows, royal banners |
| `w2_granbel` | 麦の都グランベール（レオネスト王国・町） | `w2_farm` | leonest | endless golden wheat fields, many windmills, farming town, crooked field boundaries, young forest where old fields used to be |
| `w2_dranherz` | 鍛冶の都ドランヘルツ（レオネスト王国・町） | `w2_forge` | leonest | forge town clinging to a mountainside, countless chimneys, smoke, stone houses on steep slope, glowing furnaces, anvils |
| `w3_carmeland` | 港の商都カルメラント（レオネスト王国・町） | `w3_harbor` | leonest | merchant harbor city in a cove, crowded warehouses and counting houses, cargo cranes, crates and barrels on the quay, small brass bells hanging at doorways |
| `w7_zaigros` | 辺境の都ザイグロス（レオネスト王国・町） | `w7_frontier` | leonest | frontier military town on a hill, stone barracks on the hilltop, low stone houses ringing it, watchtower with a bell, noticeboard in the square, distant snowy mountains to the north |
| `w3_lignoa` | 森と湖の都リグノア（レオネスト王国・町） | `w3_lake` | leonest | fortress city on a lake, surrounded by deep forest, raised drawbridge, stone walls, calm lake, flock of birds over the forest |
| `w3_frosleia` | 火山の都フロスレイア（レオネスト王国・町） | `w3_volcano` | leonest | volcano city, black ash slopes, white plaster houses in terraces, research observatory, brooms leaning on ash-covered roofs, smoking volcano behind |
| `w3_ashvault` | 灰の観測所（レオネスト王国・迷宮） | `w3_ashvault` | leonest | half-buried domed observatory in volcanic ash, on a volcano slope, door boarded up with planks, ash-covered ground |
| `frost` | 凍てつく街道（ノルディア帝国・荒野） | `snow` | nordia | frozen highway across a snowfield, blizzard, snow-covered wooden signpost, dead trees, distant snowy mountains |
| `garmund` | 帝都ノルディア（ノルディア帝国・町）・空 overcast | `snowcity` | nordia | vast fortified city of black stone seen from above, many black stone buildings and towers, snow on the roofs, high fortress walls, straight columns of chimney smoke, war banners, barracks, orderly streets, overcast sky |
| `w7_eldenholm` | 緑の都エルデンホルム（ノルディア帝国・町） | `w7_greenvale` | nordia | green valley town in a snowy land, warm spring with steam, grove of trees around it, archery butts and practice range, herb gardens, wooden houses |
| `w7_eisenvan` | 北の港アイゼルヴァン（ノルディア帝国・町） | `w7_icehaven` | nordia | northern harbor town in winter, snow on the rooftops and warehouses, ice-covered wooden piers and mooring posts, fishing boats tied up, floating ice on calm deep blue sea, crisp clear blue winter sky, snowy mountains |
| `w7_grishaim` | 監獄の都グリスハイム（ノルディア帝国・町） | `w7_prison` | nordia | bleak snowy plain with several tall stone prison towers with tiny windows, a small town clustered at their feet, smoke from chimneys, grey sky |
| `w7_brenark` | 砦の都ブレイナーク（ノルディア帝国・町） | `w7_clawwall` | nordia | snowy fortress city with three rings of grey stone walls, frozen sea behind, huge old claw marks high on the outer wall, banners, overcast sky |
| `w2_zalgros` | 闘技の都ザルグロス（ノルディア帝国・町） | `w2_arena` | nordia | (huge round stone colosseum:1.3) in the middle of a snowy town, barracks, betting booths, snowy rooftops, banners |
| `w4_kaesverg` | 鉱山の都カースヴェルグ（ノルディア帝国・町） | `w4_mine` | nordia | mining town in snowy mountains, mine entrances in the mountainside with smoke, old iron rails running through the town, rusted mine cart covered in snow |
| `w4_valmiria` | 市の都ヴァルミリア（ノルディア帝国・町） | `w4_market` | nordia | bustling market town, many colorful market tents and stalls, stone houses around a snowy town square, four roads meet, tall stone pillar in the center, snow |
| `w4_oldrail` | 古い鉄の道（ノルディア帝国・迷宮） | `w4_rail` | nordia | abandoned mine entrance in a snowy mountain, ancient iron railway tracks leading inside, boarded wooden barricade, rusted machinery |
| `fort` | 黒鉄の砦（人類の最前線・町） | `fort` | border | black iron fortress wall blocking a narrow mountain pass, watchtowers with alarm bells, graveyard outside the wall, rugged mountains |
| `w7_frostgate` | 北の烽火台ヴェルト（人類の最前線・町） | `w7_beacon` | border | northern beacon station by a cold sea, three stone beacon towers with fire and smoke, firewood piles, soldiers |
| `w7_widows` | 鐘待ちの村リーネ（人類の最前線・町） | `w7_widows` | border | farming village of soldiers' families, ploughed fields, a graveyard slightly larger than the fields, distant watchtower |
| `w7_ironwell` | 井戸の砦町ケルン（人類の最前線・町） | `w7_wellfort` | border | frontier supply town, deep stone well with a wooden frame in the center, storehouses and soldiers' row houses, grey sky |
| `w4_watch` | 鐘の見張り塔（人類の最前線・荒野） | `w4_watch` | border | line of stone watchtowers stretching to the horizon, alarm bell on top of each tower, barren plain, northeast road |
| `mountains` | 断界山脈（人と魔の境・荒野） | `mountain` | border | towering jagged mountain peaks, sea of clouds below, narrow ridge trail, cold thin air, snowy summits |
| `w7_hermitage` | 峠の庵ザレム（人と魔の境・町） | `w7_hermitage` | border | misty mountain pass with a crumbling hermitage and an old altar, small huts of settlers, fog |
| `w7_lastvillage` | 最後の村ハルト（人と魔の境・町） | `w7_lastvillage` | border | last human village on a mountain shoulder, a dozen stone houses, small statues facing away from the peaks, snowy mountains |
| `graveyard` | 竜の墓場（人と魔の境・迷宮） | `bones` | border | valley of giant dragon skeletons, huge white ribcages taller than houses, piles of bones, wind-swept barren valley |
| `w4_pass` | 断界の古関（人と魔の境・迷宮） | `w4_pass` | border | ancient massive stone gatehouse sealing a mountain crevice, unreadable inscription above the gate, height notches carved on the gate, cliffs |
| `w2_echo` | 懺悔の谷（ノルディア帝国・荒野） | `w2_echo` | border | valley with crumbled city walls, roofless houses half-buried in the valley floor, steep cliffs, desolate |
| `w2_shadow` | 影の谷（ノルディア帝国・荒野） | `w2_shadow` | border | ruined empty town, black scorched shadow stains on walls and cobblestones, laundry lines, abandoned streets |
| `w2_acid` | 酸の谷（ノルディア帝国・迷宮） | `w2_acid` | border | melting valley, green acidic steam, rows of rusted giant iron robots kneeling, corroded metal, toxic pools |
| `zephara` | 首都エルメシア（エルメシア共和国・町） | `magic` | elmesia | floating crystal towers in the sky, elegant city of elves, council hall at the top of long stairs, gigantic world tree in the far distance, greenery |
| `swamp` | 毒沼の湿地（エルメシア共和国・荒野）・空 overcast | `swamp` | elmesia | toxic swamp, murky green water, rotting dead trees, purple mist, bubbles, reeds, dark gloomy overcast sky |
| `e2_garden` | 腐れ庭園（エルメシア共和国・迷宮）・空 overcast | `e2_garden` | elmesia | beautiful flower garden in the middle of a dark swamp, perfectly trimmed flowerbeds, unnaturally vivid flowers, dead trees around, mist, eerie, gloomy overcast sky |
| `w2_amyrein` | 湯の町アミュレイン（エルメシア共和国・町） | `w2_spa` | elmesia | quiet hot spring town by a lake, steam rising, wooden bathhouses, stone baths, calm lake |
| `w2_nagris` | 狩り場の町ナグリス（エルメシア共和国・町） | `w2_hunt` | elmesia | town built on huge tree branches, treehouses, rope bridges, giant world tree silhouette filling the eastern sky, forest |
| `w7_volera` | 灯台の港ヴォルエラ（エルメシア共和国・町） | `w7_lighthouse` | elmesia | calm bay harbor with a tall white lighthouse, gentle sea, small trading ships with patterned sails, wooden piers, market cloth and dried fish |
| `w7_revandel` | 隠れ里レヴァンデル（エルメシア共和国・町） | `w7_mossvillage` | elmesia | hidden village melting into a deep forest, moss-covered roofs, vines over doorways, houses built among huge tree trunks, a large old stump with offerings, dappled light |
| `w7_salyues` | 芸の町サリュエス（エルメシア共和国・町） | `w7_artstown` | elmesia | colorful crossroads town, open-air theater stage of wooden boards in the square, walls covered with painted murals, market stalls with banners, forest road beyond |
| `w4_tulier` | 水の都トゥリエル（エルメシア共和国・町） | `w4_water` | elmesia | water town on a lake, wooden boardwalks, houses and council hall on stilts, stargazing tower, small boats, reflection of a giant tree on the lake |
| `w4_silent` | 沈黙の森（エルメシア共和国・荒野） | `w4_silent` | elmesia | silent forest, faded white paper talismans stuck on tree trunks, still air, pale light, birds perched on branches |
| `yakumo` | 島の都シェルアーク（シェルアーク・町） | `yakumo` | isles | sea city built across small islands, wooden walkway bridges between islands, fish drying racks, barrels, small boats, sailing ships offshore |
| `w7_pearlisle` | 真珠採りの島ヨナ（シェルアーク・町） | `w7_pearls` | isles | island with a shallow turquoise cove, pearl diving boats, huts roofed with shells, beach with shells |
| `w7_bellisle` | 霧鐘の島ミストラ（シェルアーク・町） | `w7_bellisle` | isles | rocky island facing the open ocean, a large fog bell on a wooden frame on the cliff top, misty sea, small chapel |
| `w7_netisle` | 網の島カラヴ（シェルアーク・町） | `w7_netisle` | isles | small fishing island with ropes strung between beaches and dozens of fishing nets drying, wooden cottages, boats |
| `w7_saltisle` | 塩の島ソルネ（シェルアーク・町） | `w7_saltpans` | isles | island village with square salt evaporation ponds shining like mirrors, salt rakers, small wooden huts, calm sea |
| `onigashima` | 鬼ヶ島の洞窟（シェルアーク・迷宮） | `onigashima` | isles | rocky island, huge cave mouth, rough sea, sake barrels, bonfire smoke from the cave |
| `w1_oboro` | シェルアーク・朧島（シェルアーク・町）・空 night | `w1_oboro` | isles | night, island festival, paper lanterns hanging from the beach to a shrine on the cape, incense smoke drifting low, festival stalls, cherry trees |
| `w3_driftisle` | 数の合わない島（シェルアーク・荒野） | `w3_isles` | isles | many scattered small islands in the sea, sandbars, small rowboat on a beach, calm sea |
| `w3_seacave` | 潮鳴りの洞（シェルアーク・迷宮） | `w3_seacave` | isles | sea cave on a rocky shore, cave mouth at low tide, tide pools, seaweed, waves |
| `wasteland` | 使徒領・灰の荒野（使徒領・荒野）・空 red | `realm` | realm | red sky, ash falling like snow, ashen wasteland, barren grey dunes, distant dark spires, apocalyptic |
| `majincastle` | 黒鎧の使徒の居城（使徒領・迷宮）・空 red | `majin` | realm | castle made of bones and black iron, open gate, red sky, ominous fortress, ash in the air |
| `e2_kitchen` | 肉の谷の大厨房（使徒領・迷宮）・空 red | `e2_kitchen` | realm | gigantic castle-like kitchen building at the bottom of a valley, many chimneys with steam, red sky, giant cauldrons |
| `w4_canopy` | 使徒領・天蓋の原（使徒領・荒野） | `w4_canopy` | realm | white salt flat, mirror-like ground reflecting the sky, blurred horizon, huge round shadow on the ground |

## 施設の中（36）

町の施設（宿屋・酒場・商店・ギルド・教会・訓練場・裏路地・王城・学院と、町ごとの施設）。どの町でも同じ絵。

| id | 名前 | 絵 | まとめ | 特徴のタグ |
|---|---|---|---|---|
| `in_inn` | 宿屋 | `inn` | town_in | cozy inn interior, wooden beams, fireplace, tables and chairs, staircase to guest rooms, lanterns, warm light |
| `in_tavern` | 酒場・**試し** | `tavern` | town_in | medieval tavern interior, long wooden bar counter, ale barrels, mugs, round tables, candlelight, notice board |
| `in_shop` | 商店 | `shop` | town_in | medieval fantasy general store interior, rustic wooden shelves with potion bottles and clay jars, swords and shields hanging on the stone wall, wooden counter with brass scales, candlelight, old shop |
| `in_guild` | 冒険者ギルド | `guild` | town_in | adventurers guild hall interior, reception counter, notice board covered in papers, wooden benches, banners |
| `in_church` | 教会 | `church` | town_in | church interior, stained glass windows, rows of pews, altar with candles, stone pillars, light rays |
| `in_train` | 訓練場 | `train` | town_in | training hall interior, wooden floor, practice dummies, weapon racks, sandbags |
| `in_alley` | 裏路地 | `alley` | town_in | dark back alley, narrow street between buildings, crates, puddles, hanging laundry, dim lamp |
| `in_throne` | 王城（玉座の間） | `throne` | special_in | throne room, empty throne, red carpet, tall pillars, royal banners, high windows |
| `in_academy` | 学院 | `academy` | special_in | magic academy library, tall bookshelves, floating books, astronomical instruments, magic circle on the floor |
| `in_forge` | 鍛冶場（ドランヘルツ） | `forge` | special_in | blacksmith forge interior, glowing furnace, anvil, hammers and tongs, hot iron, sparks |
| `in_arena` | 闘技場（ザルグロス） | `arena` | special_in | colosseum arena floor, sand, empty stone stands, iron gate, snow on the rim |
| `in_bath` | 湯（アミュレイン） | `bath` | special_in | hot spring bathhouse, stone bath, steam, wooden walls, lake view |
| `in_field` | 畑（グランベール） | `field` | special_in | wheat field next to a windmill, golden wheat, farm path, blue sky |
| `in_hunt` | 狩り場（ナグリス） | `hunt` | special_in | hunting ground in a deep forest, morning mist, animal tracks, hunting blind, giant trees |
| `in_w8s_karna_bourse` | 金貨の取引所（ブランデール） | `w8s_karna_bourse` | special_in | grand exchange hall, wooden counters, giant brass balance scale, stacks of gold coins, coin purses, ledgers |
| `in_w8s_nerva_horn` | 霧笛小屋（ヴァレンツァ） | `w8s_nerva_horn` | special_in | small hut on a foggy cape, huge brass foghorn, names carved on wooden wall, sea mist through window |
| `in_w8s_carmel_yard` | 造船所（カルメラント） | `w8s_carmel_yard` | special_in | (shipbuilding yard on dry land:1.3), (half-built wooden ship hull resting on wooden blocks on the shore:1.3), hull planks missing so the ribs show, tall wooden scaffolding and ladders, stacks of timber and planks, sawhorses and workbenches, wood shavings on the ground, harbor in the background |
| `in_w8s_lignoa_lake` | 湖の舟着き場（リグノア） | `w8s_lignoa_lake` | special_in | wooden pier on a misty forest lake, flat-bottomed boats moored, small island with a stone shrine in the distance, calm water |
| `in_w8s_frosleia_crater` | 火口の祭壇（フロスレイア） | `w8s_frosleia_crater` | special_in | rim of a volcanic crater, black stone altar on the edge, rising steam and ash, glowing lava far below, rope path with wooden stakes, barren rocks |
| `in_w8s_zaigros_tower` | 北の見張り塔（ザイグロス） | `w8s_zaigros_tower` | special_in | top of a stone watchtower, open battlements, bronze bell with colored cloth ribbons, brass telescope on a stand, snowy plain on the northern horizon |
| `in_w8s_russen_isle` | 渡し舟の中洲（リュッセン） | `w8s_russen_isle` | special_in | sandbar in the middle of a wide river, small ferry hut, ferry boats pulled up on the sand, driftwood and a round shield drying on the sand |
| `in_w8s_glatz_post` | 傭兵の詰所（グラッツ） | `w8s_glatz_post` | special_in | mercenary guardhouse, wall covered with hundreds of small wooden tags, weapon racks, fireplace, long table |
| `in_w8s_durm_shed` | 欠片の鑑定小屋（ドゥルム） | `w8s_durm_shed` | special_in | cramped appraiser shed, shelves full of strange ancient fragments, old gears and glass shards, magnifying glass on a workbench, rope ladders, muddy boots |
| `in_w8s_vinale_cellar` | 醸造所の酒蔵（ヴィナレ） | `w8s_vinale_cellar` | special_in | stone wine cellar, barrels stacked to the ceiling with three different brand marks, grape pressing vat |
| `in_w8s_kaes_shaft` | 古い坑道（カースヴェルグ） | `w8s_kaes_shaft` | special_in | old mine entrance, wooden tags hanging on nails, mine cart rails, lanterns, snow outside |
| `in_w8s_valm_pillar` | 石の柱の広場（ヴァルミリア） | `w8s_valm_pillar` | special_in | (snowy:1.3) market square in a winter town, snow on the ground, tall black stone pillar circled by wooden stakes, colorful tribal tents and stalls, large cooking pot over a fire |
| `in_w8s_brenark_wall` | 爪痕の城壁（ブレイナーク） | `w8s_brenark_wall` | special_in | (view from the top of a city wall:1.3), stone walkway with battlements running into the distance, (four huge claw marks gouged into the stone parapet:1.3), grey stone, frozen sea beyond the wall |
| `in_w8s_gris_visit` | 塔の面会所（グリスハイム） | `w8s_gris_visit` | special_in | prison tower visiting room, iron bars, two stools facing each other, chalk line on the floor, small window |
| `in_w8s_eisen_ice` | 氷の漁場（アイゼルヴァン） | `w8s_eisen_ice` | special_in | frozen bay, (small wooden ice fishing huts:1.3) around round holes in the ice, fishing lines and buckets, rope path across the ice, (huge whale skeleton ribs sticking out of the ice far away:1.2), no living animals |
| `in_w8s_elden_garden` | 泉の森の薬草園（エルデンホルム） | `w8s_elden_garden` | special_in | herb garden around a steaming warm spring, green rows of herbs amid snow, archery target on the wooden fence, wicker baskets |
| `in_w8s_fort_wall` | 黒い壁の上（黒鉄の砦） | `w8s_fort_wall` | special_in | (walkway on top of a fortress wall:1.3), black iron and stone battlements in the foreground, three different national banners on poles, (mountain pass seen from the wall:1.2) |
| `in_w8s_kern_well` | 深い井戸（ケルン） | `w8s_kern_well` | special_in | small town square of a fort town, (old round stone well with a wooden roof and a pulley:1.4), rope with countless knots, wooden bucket on the well rim, separate big iron porridge cauldron hanging over a campfire nearby, stone houses around the square |
| `in_w8s_rine_field` | 鐘待ちの畑（リーネ） | `w8s_rine_field` | special_in | village field with hoes left in the soil, small graveyard beside the field, distant watchtower with a bell |
| `in_w8s_velt_beacon` | 烽火台（ヴェルト） | `w8s_velt_beacon` | special_in | (three round stone beacon towers:1.3) with stacked firewood on top on a cliff, thin smoke, northern sea on one side, mountains on the other side |
| `in_w8s_halt_carver` | 像彫りの小屋（ハルト） | `w8s_halt_carver` | special_in | stone carver's hut, dozens of small faceless stone statues, all facing away from the mountains, window on the far side |
| `in_w8s_zalem_altar` | 庵の奥の祭壇（ザレム） | `w8s_zalem_altar` | special_in | inside a crumbling mountain hermitage, mossy stone altar with plates of bread, pile of walking staffs, candles |

## 迷宮の中（12）

迷宮に入ったあと（深さ 1 から）の絵。汎用の石の通路と洞窟、迷宮ごとの中。竜の墓場と黒鎧の使徒の居城は外と同じ絵を使う。

| id | 名前 | 絵 | まとめ | 特徴のタグ |
|---|---|---|---|---|
| `in_dungeon` | 石の通路（迷宮の中の汎用） | `dungeon` | dungeon_a | dungeon corridor, stone brick walls, torches, dark depths, cobwebs |
| `in_cave` | 洞窟（迷宮の中の汎用） | `cave` | dungeon_a | natural cave, stalactites, damp rock, faint glow, underground |
| `in_ruins` | エル・ナフ遺構の中・**試し** | `ruins_in` | dungeon_a | inside ancient ruins, underground temple hall, broken pillars, carved glyphs, dust, light from cracks in the ceiling |
| `in_w1_catacomb` | エルヴィナの地下墓地の中 | `w1_catacomb_in` | dungeon_a | catacombs, walls and ceiling made of skulls and bones, skeletal hands folded in prayer, candles, endless tunnels |
| `in_w3_ashvault` | 灰の観測所の中 | `w3_ashvault_in` | dungeon_a | inside an abandoned observatory, ash-covered telescope, broken instruments, boarded windows, dome ceiling |
| `in_w4_rail` | 古い鉄の道の中 | `w4_rail_in` | dungeon_a | abandoned mine tunnel, ancient iron rails, rusted machinery, timber supports, darkness |
| `in_w4_pass` | 断界の古関の中 | `w4_pass_in` | dungeon_b | inside an ancient gatehouse, massive stone corridors, giant doors, carved runes |
| `in_w2_acid` | 酸の谷の底 | `w2_acid_in` | dungeon_b | bottom of an acid valley, green toxic pools, corroded giant iron wrecks, steam |
| `in_e2_garden` | 腐れ庭園の奥 | `e2_garden_in` | dungeon_b | deep in a rotting garden, overgrown flower maze, giant flowers, mist, eerie |
| `in_e2_kitchen` | 大厨房の中 | `e2_kitchen_in` | dungeon_b | giant kitchen interior, enormous cauldrons, stoves with fire, hanging meat hooks, steam, huge cleavers |
| `in_onigashima` | 鬼ヶ島の洞窟の奥 | `onigashima_in` | dungeon_b | cave lair, warm wet rock walls, sake barrels, bonfire, feast remains, scattered bones |
| `in_w3_seacave` | 潮鳴りの洞の中 | `w3_seacave_in` | dungeon_b | inside a sea cave, tide water, glowing algae, wet rocks |

