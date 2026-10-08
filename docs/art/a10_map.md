# 人物と魔物に当てる絵（A10）

このファイルは `node tools/a10_map.mjs` で、今の `assets/` から作る（絵を足したら作り直す）。決め方は `src/ui/v4_assets.js`（人物）・`src/ui/v6_monsters.js`（魔物）。

- **canvas の人物・魔物の絵は使わない**（持ち主の決定）。生成画像が無い人・読めない画像は「絵なし」（枠を出さない）。

- **主人公**は立ち絵を出さない（話す場面・シート・戦闘・作成の画面・墓碑・左上の札）。`hero_*` の型も作らない。

- **名のある人**（キャラメモの人・出来事と施設の名のある人・`src/data/r5_named.js` の人・名前の付いた `who.name`（「写し場の古株ヤン」））はその人の絵だけ。無ければ絵なし（型の絵は使わない。R5）。

- **名もない人**（乱数の仲間・出来事の町の人）は、人の種類 × 性別の型 `kind_<種類>_<m|f>`。13 歳未満は `child`、60 歳以上は `elder`。who に年齢があれば、年頃（若者・壮年・老境）が同じか 8 歳以内の型だけで、合う型が無ければ絵なし（R5。下の表の「若者（25）」の絵なしはそのため）。種族の型（`_elf`・`_beast[_<獣>]`）が無ければ人間の型（耳は合わない）。人の姿の使徒（`majin`）は型が無いので絵なし。

- **魔物**は `assets/monsters/<id>.webp`（色違いは `same_as`）。人の姿の敵は人物の絵（`docs/art/monsters.json` の `people`）。仲間の魔物・出来事の魔物は魔物の絵を胸から上に切り取る。

## 名もない人の型（人間）

| 種類 | 性別 | 子ども（9） | 若者（25） | 中年（45） | 老人（70） |
|---|---|---|---|---|---|
| villager（町の人） | 男 | `kind_child_m` | 絵なし | `kind_villager_m` | `kind_elder_m` |
| villager（町の人） | 女 | `kind_child_f` | `kind_villager_f` | `kind_villager_f` | `kind_elder_f` |
| merchant（商人） | 男 | `kind_child_m` | 絵なし | `kind_merchant_m` | `kind_elder_m` |
| merchant（商人） | 女 | `kind_child_f` | `kind_merchant_f` | `kind_merchant_f` | `kind_elder_f` |
| guard（衛兵） | 男 | `kind_child_m` | 絵なし | `kind_guard_m` | `kind_elder_m` |
| guard（衛兵） | 女 | `kind_child_f` | `kind_guard_f` | `kind_guard_f` | `kind_elder_f` |
| priest（神官） | 男 | `kind_child_m` | `kind_priest_m` | 絵なし | `kind_elder_m` |
| priest（神官） | 女 | `kind_child_f` | `kind_priest_f` | `kind_priest_f` | `kind_elder_f` |
| noble（貴族） | 男 | `kind_child_m` | `kind_noble_m` | `kind_noble_m` | `kind_elder_m` |
| noble（貴族） | 女 | `kind_child_f` | `kind_noble_f` | `kind_noble_f` | `kind_elder_f` |
| rogue（ならず者） | 男 | `kind_child_m` | `kind_rogue_m_b` | `kind_rogue_m` | `kind_elder_m` |
| rogue（ならず者） | 女 | `kind_child_f` | `kind_rogue_f` | `kind_rogue_f` | `kind_elder_f` |
| child（子ども） | 男 | `kind_child_m` | 絵なし | 絵なし | `kind_elder_m` |
| child（子ども） | 女 | `kind_child_f` | 絵なし | 絵なし | `kind_elder_f` |
| elder（老人） | 男 | `kind_child_m` | 絵なし | 絵なし | `kind_elder_m` |
| elder（老人） | 女 | `kind_child_f` | 絵なし | 絵なし | `kind_elder_f` |
| soldier（兵士） | 男 | `kind_child_m` | 絵なし | `kind_soldier_m` | `kind_elder_m` |
| soldier（兵士） | 女 | `kind_child_f` | `kind_soldier_f` | `kind_soldier_f` | `kind_elder_f` |
| knight（騎士） | 男 | `kind_child_m` | `kind_knight_m` | `kind_knight_m` | `kind_elder_m` |
| knight（騎士） | 女 | `kind_child_f` | `kind_knight_f` | `kind_knight_f` | `kind_elder_f` |
| sailor（船乗り） | 男 | `kind_child_m` | 絵なし | `kind_sailor_m` | `kind_elder_m` |
| sailor（船乗り） | 女 | `kind_child_f` | `kind_sailor_f` | `kind_sailor_f` | `kind_elder_f` |
| mage（魔法使い） | 男 | `kind_child_m` | `kind_mage_m` | 絵なし | `kind_elder_m` |
| mage（魔法使い） | 女 | `kind_child_f` | `kind_mage_f` | `kind_mage_f` | `kind_elder_f` |
| ronin（シェルアークの人） | 男 | `kind_child_m` | `kind_ronin_m_b` | `kind_ronin_m` | `kind_elder_m` |
| ronin（シェルアークの人） | 女 | `kind_child_f` | `kind_ronin_f` | `kind_ronin_f` | `kind_elder_f` |
| host（宿や酒場の主） | 男 | `kind_child_m` | 絵なし | `kind_host_m` | `kind_elder_m` |
| host（宿や酒場の主） | 女 | `kind_child_f` | `kind_host_f` | `kind_host_f` | `kind_elder_f` |
| beggar（物乞い・奴隷） | 男 | `kind_child_m` | 絵なし | `kind_beggar_m` | `kind_elder_m` |
| beggar（物乞い・奴隷） | 女 | `kind_child_f` | `kind_beggar_f` | `kind_beggar_f` | `kind_elder_f` |
| archer（弓使い） | 男 | `kind_child_m` | 絵なし | `kind_archer_m` | `kind_elder_m` |
| archer（弓使い） | 女 | `kind_child_f` | `kind_archer_f` | `kind_archer_f` | `kind_elder_f` |
| adventurer（冒険者） | 男 | `kind_child_m` | `kind_adventurer_m` | `kind_adventurer_m` | `kind_elder_m` |
| adventurer（冒険者） | 女 | `kind_child_f` | `kind_adventurer_f` | `kind_adventurer_f` | `kind_elder_f` |
| majin（使徒（人の姿）） | 男 | 絵なし | 絵なし | 絵なし | 絵なし |
| majin（使徒（人の姿）） | 女 | 絵なし | 絵なし | 絵なし | 絵なし |

上の表は一人の例。二枚目の型（`_b`）がある種類・性別は、人ごと（seed）に半分ほどが二枚目になる：`kind_adventurer_f_b`・`kind_adventurer_m_b`・`kind_mage_f_b`・`kind_mage_m_b`・`kind_priest_f_b`・`kind_priest_m_b`・`kind_rogue_f_b`・`kind_rogue_m_b`・`kind_ronin_f_b`・`kind_ronin_m_b`

### 二枚目の型（もとは主人公の型。主人公の立ち絵をやめたので回した）

| もとの絵 | 今の id | 当てる人 |
|---|---|---|
| `hero_merc_f` | `kind_adventurer_f_b` | 冒険者（女）の名もない人の半分ほど |
| `hero_merc_m` | `kind_adventurer_m_b` | 冒険者（男）の名もない人の半分ほど |
| `hero_mage_f` | `kind_mage_f_b` | 魔法使い（女）の名もない人の半分ほど |
| `hero_mage_m` | `kind_mage_m_b` | 魔法使い（男）の名もない人の半分ほど |
| `hero_priest_f` | `kind_priest_f_b` | 神官（女）の名もない人の半分ほど |
| `hero_priest_m` | `kind_priest_m_b` | 神官（男）の名もない人の半分ほど |
| `hero_thief_f` | `kind_rogue_f_b` | ならず者（女）の名もない人の半分ほど |
| `hero_thief_m` | `kind_rogue_m_b` | ならず者（男）の名もない人の半分ほど |
| `hero_samurai_f` | `kind_ronin_f_b` | シェルアークの人（女）の名もない人の半分ほど |
| `hero_samurai_m` | `kind_ronin_m_b` | シェルアークの人（男）の名もない人の半分ほど |

## 種族（例：25 歳の女の神官）

| 種族 | 当てる絵 |
|---|---|
| エルフ | `kind_priest_f` |
| 獣人（狼） | `kind_priest_f` |
| 獣人（熊） | `kind_priest_f` |
| 獣人（猫） | `kind_priest_f` |
| 獣人（兎） | `kind_priest_f` |
| 獣人（鳥） | `kind_priest_f` |
| 獣人（鼠） | `kind_priest_f` |
| 獣人（狐） | `kind_priest_f` |
| 獣人（犬） | `kind_priest_f` |

## 名のある人（144 人。絵あり 131）

絵の無い人（絵なし）：オルテンシア（`ortensia`）・イスメネ（`ismene`）・シャノ（`shano`）・オトセ（`otose`）・グィド（`guido`）・ピエトロ（`pietro`）・マルグリット（`marguerite`）・ヒルデガルト（`hildegard`）・アガテ（`agathe`）・セラフィナ（`seraphina`）・トマス（`tomas`）・ガンゾウ（`ganzou`）・ヤエ（`yae`）

## 出来事の人・仲間・魔物

- 出来事の人：絵あり 994（うち魔物 103）・絵なし 179：duel（knight）・v1_pilgrims（priest）・v1_returned（sailor）・w1_bloodfont（priest）・w1_oldman（sailor）・e7m_1（merchant）・e7m_2（noble）・e7m_2b（elder）・e7m_3_lib（priest）・e7m_3_old（elder）・e7m_3_rope（merchant）・e7m_4b（villager）・e7m_8_train（soldier）・e7m_8_arms（villager）・e7m_8_ward（mage）・e7m_8_host（adventurer）・e7m_8_price（elder）・e7m_9a2（villager）・e7m_10（elder）・f4d_runaway（villager）・f4d_apprentice（villager）・f4r_heretic_inquisitor（priest）・f4r_traveler_help（merchant）・f4r_soldier（villager）・f4r_cure_young（soldier）・f4r_runaway_gave（beggar）・f4r_apprentice_kind（villager）・f4r_guild（villager）・c12_ort_doll（mage）・c12_ort_hut（mage）・c12_ort_seven（mage）・c12_ort_go（mage）・c12_ort_pupils（mage）・c12_ort_hats（mage）・c12_ism_ladder（mage）・c12_ism_ask（mage）・c12_ism_join（mage）・c12_ism_scraped（mage）・c12_ism_woods（mage）・c12_sha_roof（rogue）・c12_sha_join（rogue）・c12_sha_cage（rogue）・c12_sha_stage（rogue）・c12_oto_bet（sailor）・c12_oto_join（sailor）・c12_oto_deep（sailor）・c12_gui_oil（elder）・c12_gui_join（elder）・c12_gui_song（elder）・c12_pie_ledger（villager）・c12_hil_hands（priest）・c12_aga_bees（merchant）・c12_ser_pulse（priest）・c12_tom_staff（elder）・c12_gan_salt（merchant）・c12_yae_knot（elder）・m4_ruin_board（villager）・m4_conscript（villager）・m4_deserter（soldier）・u3_scholar（mage）・w2_oath（villager）・w2_iron（villager）・w2_retake（archer）・w3_o_k_scale（merchant）・w3_o_k_debt（rogue）・w3_o_l_tailor（villager）・w3_o_h_monk（priest）・w3_o_h_monk2（priest）・w3_o_y_plank（sailor）・w3_o_d_bellows（villager）・w3_o_d_bellows2（villager）・w3_t_raincoin（merchant）・w3_t_scales（merchant）・w3_t_scales2（merchant）・w3_t_winterdice（villager）・w3_t_launch（villager）・w3_t_birds（soldier）・w3_t_laugh（villager）・w3_t_warden（archer）・w3_t_logs（villager）・w3_t_deserter（soldier）・w3_t_whistle（guard）・w3_t_chapelrain（priest）・w3_t_tray（villager）・w3_t_tray2（villager）・w3_t_roarlog（elder）・w3_t_roar2（elder）・w3_t_dig（mage）・w3_t_dig2（mage）・w3_w_cave_brother（sailor）・w4_k_whistle（soldier）・w4_v_pillar（soldier）・w4_t_root（archer）・w4_g_drill（soldier）・w4_g_princess（noble）・w4_z_bandage（villager）・w4_ft_grave（priest）・w4_m_goat（villager）・w4_n_scent（archer）・w4_w_runner（soldier）・w6g_merc（adventurer）・w6g_merc2（adventurer）・w6g_relic（merchant）・w6g_relic2（merchant）・w6g_silent（priest）・w6g_check（guard）・w6g_deserter（soldier）・w6r_bard（villager）・w6r_funeral（priest）・w6r_wedding（villager）・w6r_fame_squire（knight）・w6r_courier（villager）・w6r_cowherd（villager）・w6r_soldier_home（soldier）・w6s_fishing（sailor）・w7_bre_snow（soldier）・w7_bre_mason2（villager）・w7_eis_rope（sailor）・w7_eis_haul（sailor）・w7_eld_promise（villager）・w7_eld_archer（archer）・w7_rev_spring（villager）・w7_rev_vow（villager）・w7_vol_fog（sailor）・w7_zai_snow（soldier）・w7_zai_deserter（soldier）・w7_zai_letter（soldier）・w7_zai_watch（soldier）・w7b_dur_night（villager）・w7b_gla_recruit（villager）・w7b_gla_boy（villager）・w7b_mel_quiet（villager）・w7b_orb_night（villager）・w7b_rus_fog（sailor）・w7b_ser_canes（priest）・w7b_ser_fog（villager）・w7c_hal_cart（soldier）・w7c_kel_tavern（soldier）・w7c_mis_ice（priest）・w7c_mis_cove（guard）・w7c_rin_rain（priest）・w7c_sol_crab（guard）・w7c_vel_spark（soldier）・w8p_deserter（soldier）・w8p_deserter2（villager）・w8p_courier（soldier）・f2r_sigrun（adventurer）・f2r_rod_friend（knight）・f2r_rod_rival（knight）・f2r_rod_foe（knight）・f2r_pergo_jailed（merchant）・f2r_pergo_free（merchant）・f2r_rich_kept（villager）・f2_majin_2（adventurer）・f2_majin_4（adventurer）・f2_majin_5（adventurer）・f2_king_1（noble）・f2_king_5（knight）・f2_rich_5（merchant）・m12_apostle_here（soldier）・m12_inq_pyre（priest）・m12_cough_help（mage）・m12_pirates_crew（sailor）・m12_winter_sled（soldier）・r3_k_basket（elder）・r3_k_basket3（elder）・r3_k_cart（merchant）・r3_n_flute（child）・r3_n_flute3（child）・r3_n_bottle（sailor）・r3_n_arm（sailor）・r3_z_frog（villager）・r3_z_frog3（villager）・r3_z_book（elder）・r3_z_bath2（elder）・r3_l_bread（villager）・r3_l_bread3（villager）・r3_l_pilgrim（priest）・r3_l_valley（soldier）
- 仲間（乱数の仲間 240 人と出来事の仲間）：絵あり 244／248・絵なし：傭兵のケイル（adventurer）・片目のシグルン（adventurer）・ロデリク（knight）
- 魔物（敵と使徒 217）：絵あり 217
- 人の姿の絵で描く敵：w1_konoha → `konoha`・c2_nora → `nora`・c2_angelica → `angelica`・c2_zork → `zork`・c4_musette → `musette`・c5_violaine → `violaine`・c5_severin → `severin`・c8_graul → `graul`・e2_berna → `berna`・e3_mirza → `mirza`・e3_zalve → `zalve`・e3_aurelia → `aurelia`・e3_yoihime → `yoihime`・e3_salphiel → `salphiel`
