# 人物と魔物に当てる絵（A10）

このファイルは `node tools/a10_map.mjs` で、今の `assets/` から作る（絵を足したら作り直す）。決め方は `src/ui/v4_assets.js`（人物）・`src/ui/v6_monsters.js`（魔物）。

- **canvas の人物・魔物の絵は使わない**（持ち主の決定）。生成画像が無い人・読めない画像は「絵なし」（枠を出さない）。

- **主人公**は立ち絵を出さない（話す場面・シート・戦闘・作成の画面・墓碑・左上の札）。`hero_*` の型も作らない。

- **名のある人**（キャラメモの人・出来事と施設の名のある人・`src/data/r5_named.js` の人）はその人の絵だけ。無ければ絵なし（型の絵は使わない。R5）。名のある人の絵は、別の人にも型にも使わない（R5b。`tests/checks/r5b_mob.mjs`）。

- **名もない人**（乱数の仲間・出来事の町の人）と**名前だけの人**（id の無い依頼人。「写し場の古株ヤン」。R5b）は、人の種類 × 性別の型 `kind_<種類>_<m|f>`。13 歳未満は `child`、60 歳以上は `elder`。who に年齢があれば、年頃（若者・壮年・老境）が同じか 8 歳以内の型だけで、合う型が無ければ絵なし（R5。下の表の「若者（25）」の絵なしはそのため。二枚目 `_b`・三枚目 `_c` の型で年頃を埋める。エルフは年齢を見ない）。種族の型（`_elf`・`_beast[_<獣>]`）が無ければ人間の型（耳は合わない）。人の姿の使徒（`majin`）は型が無いので絵なし。

- **魔物**は `assets/monsters/<id>.webp`（色違いは `same_as`）。人の姿の敵は人物の絵（`docs/art/monsters.json` の `people`）。仲間の魔物・出来事の魔物は魔物の絵を胸から上に切り取る。

## 名もない人の型（人間）

| 種類 | 性別 | 子ども（9） | 若者（25） | 中年（45） | 老人（70） |
|---|---|---|---|---|---|
| villager（町の人） | 男 | 絵なし | 絵なし | `kind_villager_m` | `kind_elder_m` |
| villager（町の人） | 女 | 絵なし | `kind_villager_f` | `kind_villager_f` | `kind_elder_f` |
| merchant（商人） | 男 | 絵なし | 絵なし | 絵なし | `kind_elder_m` |
| merchant（商人） | 女 | 絵なし | 絵なし | 絵なし | `kind_elder_f` |
| guard（衛兵） | 男 | 絵なし | 絵なし | `kind_guard_m` | `kind_elder_m` |
| guard（衛兵） | 女 | 絵なし | `kind_guard_f` | `kind_guard_f` | `kind_elder_f` |
| priest（神官） | 男 | 絵なし | `kind_priest_m` | 絵なし | `kind_elder_m` |
| priest（神官） | 女 | 絵なし | `kind_priest_f` | `kind_priest_f` | `kind_elder_f` |
| noble（貴族） | 男 | 絵なし | 絵なし | 絵なし | `kind_elder_m` |
| noble（貴族） | 女 | 絵なし | `kind_noble_f` | `kind_noble_f` | `kind_elder_f` |
| rogue（ならず者） | 男 | 絵なし | `kind_rogue_m_b` | 絵なし | `kind_elder_m` |
| rogue（ならず者） | 女 | 絵なし | `kind_rogue_f_b` | 絵なし | `kind_elder_f` |
| child（子ども） | 男 | 絵なし | 絵なし | 絵なし | `kind_elder_m` |
| child（子ども） | 女 | 絵なし | 絵なし | 絵なし | `kind_elder_f` |
| elder（老人） | 男 | 絵なし | 絵なし | 絵なし | `kind_elder_m` |
| elder（老人） | 女 | 絵なし | 絵なし | 絵なし | `kind_elder_f` |
| soldier（兵士） | 男 | 絵なし | 絵なし | `kind_soldier_m` | `kind_elder_m` |
| soldier（兵士） | 女 | 絵なし | `kind_soldier_f` | `kind_soldier_f` | `kind_elder_f` |
| knight（騎士） | 男 | 絵なし | `kind_knight_m` | `kind_knight_m` | `kind_elder_m` |
| knight（騎士） | 女 | 絵なし | `kind_knight_f` | `kind_knight_f` | `kind_elder_f` |
| sailor（船乗り） | 男 | 絵なし | 絵なし | 絵なし | `kind_elder_m` |
| sailor（船乗り） | 女 | 絵なし | 絵なし | 絵なし | `kind_elder_f` |
| mage（魔法使い） | 男 | 絵なし | `kind_mage_m` | 絵なし | `kind_elder_m` |
| mage（魔法使い） | 女 | 絵なし | `kind_mage_f` | `kind_mage_f` | `kind_elder_f` |
| ronin（シェルアークの人） | 男 | 絵なし | `kind_ronin_m_b` | `kind_ronin_m` | `kind_elder_m` |
| ronin（シェルアークの人） | 女 | 絵なし | `kind_ronin_f` | `kind_ronin_f` | `kind_elder_f` |
| host（宿や酒場の主） | 男 | 絵なし | 絵なし | 絵なし | `kind_elder_m` |
| host（宿や酒場の主） | 女 | 絵なし | `kind_host_f` | `kind_host_f` | `kind_elder_f` |
| beggar（物乞い・奴隷） | 男 | 絵なし | 絵なし | 絵なし | `kind_elder_m` |
| beggar（物乞い・奴隷） | 女 | 絵なし | 絵なし | 絵なし | `kind_elder_f` |
| archer（弓使い） | 男 | 絵なし | 絵なし | `kind_archer_m` | `kind_elder_m` |
| archer（弓使い） | 女 | 絵なし | `kind_archer_f` | `kind_archer_f` | `kind_elder_f` |
| adventurer（冒険者） | 男 | 絵なし | `kind_adventurer_m` | `kind_adventurer_m` | `kind_elder_m` |
| adventurer（冒険者） | 女 | 絵なし | `kind_adventurer_f` | `kind_adventurer_f` | `kind_elder_f` |
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

- 出来事の人：絵あり 861（うち魔物 112）・絵なし 372：pickpocket（child）・carriage（noble）・peddler（merchant）・slaver（rogue）・duel（knight）・toll（rogue）・caravan（merchant）・prince（rogue）・v1_spatship（sailor）・v1_mermaid（merchant）・v1_pilgrims（priest）・v1_taster（host）・v1_returned（sailor）・w1_fingerbone（merchant）・w1_pilgrimgirl（child）・w1_bloodfont（priest）・w1_oldman（sailor）・e3_f_mask（merchant）・e3_f_root（child）・e7m_1（merchant）・e7m_2（noble）・e7m_2b（elder）・e7m_3_lib（priest）・e7m_3_old（elder）・e7m_4b（villager）・e7m_8_train（soldier）・e7m_8_arms（villager）・e7m_8_ward（mage）・e7m_8_host（adventurer）・e7m_8_price（elder）・e7m_9a2（villager）・e7m_10（elder）・f4d_ledger（merchant）・f4d_runaway（villager）・f4d_house（child）・f4d_apprentice（villager）・f4t_impostor（rogue）・f4r_thief_spared（child）・f4r_heretic_inquisitor（priest）・f4r_traveler_help（merchant）・f4r_caravan_saved（merchant）・f4r_caravan_looted（merchant）・f4r_soldier（villager）・f4r_slaver（rogue）・f4r_grain_officer（noble）・f4r_grain_boy（child）・f4r_cure_young（soldier）・f4r_letter_sold（beggar）・f4r_letter_back（merchant）・f4r_letter_guard（rogue）・f4r_runaway_gave（beggar）・f4r_house_open（child）・f4r_house_sealed（child）・f4r_apprentice_kind（villager）・f4r_widow（merchant）・f4r_guild（villager）・c10_underworld（rogue）・c4_iori_record（host）・c12_ort_doll（mage）・c12_ort_hut（mage）・c12_ort_seven（mage）・c12_ort_go（mage）・c12_ort_pupils（mage）・c12_ort_hats（mage）・c12_ism_ladder（mage）・c12_ism_ask（mage）・c12_ism_join（mage）・c12_ism_scraped（mage）・c12_ism_woods（mage）・c12_sha_roof（rogue）・c12_sha_join（rogue）・c12_sha_cage（rogue）・c12_sha_stage（rogue）・c12_oto_bet（sailor）・c12_oto_join（sailor）・c12_oto_deep（sailor）・c12_gui_oil（elder）・c12_gui_join（elder）・c12_gui_song（elder）・c12_pie_ledger（villager）・c12_hil_hands（priest）・c12_aga_bees（merchant）・c12_ser_pulse（priest）・c12_tom_staff（elder）・c12_gan_salt（merchant）・c12_yae_knot（elder）・e2_stewwind（merchant）・m3_whisper（host）・m3_stall（merchant）・m3_sellout（rogue）・m4_ruin_board（villager）・m4_ruin_looter（child）・m4_famine_bread（child）・m4_conscript（villager）・m4_deserter（soldier）・m5_madman（beggar）・r1_elf_ears（child）・u3_scholar（mage）・w10_singer（villager）・w10_roune_foot（child）・w2_oath（villager）・w2_iron（villager）・w2_statue（noble）・w2_bookie（rogue）・w2_retake（archer）・w2_tail（merchant）・w3_o_k_scale（merchant）・w3_o_k_umbrella（child）・w3_o_k_debt（rogue）・w3_o_n_box（rogue）・w3_o_n_face（sailor）・w3_o_p_sheep（child）・w3_o_p_known（rogue）・w3_o_l_bread（child）・w3_o_h_bell（child）・w3_o_h_beast（merchant）・w3_o_h_monk（priest）・w3_o_h_monk2（priest）・w3_o_y_maps（merchant）・w3_o_y_drum（child）・w3_o_y_plank（sailor）・w3_o_b_mask（child）・w3_o_b_boat（sailor）・w3_o_d_slope（merchant）・w3_t_belldoor（rogue）・w3_t_ledgers（merchant）・w3_t_ledgers2（rogue）・w3_t_auction（merchant）・w3_t_fogpier（sailor）・w3_t_parrot（sailor）・w3_t_pickpocket（child）・w3_t_armwrestle（sailor）・w3_t_scales（merchant）・w3_t_scales2（merchant）・w3_t_winterdice（villager）・w3_t_launch（villager）・w3_t_birds（soldier）・w3_t_ice（child）・w3_t_logs（villager）・w3_t_deserter（soldier）・w3_t_stones（child）・w3_t_tray（villager）・w3_t_tray2（villager）・w3_t_oven（merchant）・w3_t_sighting（child）・w3_t_peddler（merchant）・w3_t_nightglow（host）・w3_t_ashletters（child）・w3_w_bell_toll（rogue）・w3_w_bell_barrels（foe:w3_smuggler）・w3_w_bell_child（child）・w3_w_isle_drawing（child）・w3_w_isle_stake（noble）・w3_w_cave_brother（sailor）・w4_k_bird（child）・w4_k_whistle（soldier）・w4_v_pillar（soldier）・w4_v_rooms（host）・w4_v_horse（merchant）・w4_v_bride（rogue）・w4_v_salt（beggar）・w4_v_furs（merchant）・w4_v_lantern（child）・w4_v_wanted（rogue）・w4_t_child（child）・w4_t_root（archer）・w4_t_bow（child）・w4_sw_lily（child）・w4_g_drill（soldier）・w4_g_princess（noble）・w4_z_bandage（villager）・w4_ft_grave（priest）・w4_ft_boy（child）・w4_m_goat（villager）・w4_wl_trader（merchant）・w4_z_shadow（child）・w4_n_scent（archer）・w4_n_bridge（child）・w4_s_face（child）・w4_w_runner（soldier）・w6n_lostchild（child）・w6n_peddler（merchant）・w6g_changer（merchant）・w6g_mapseller（rogue）・w6g_smoke（child）・w6g_canal（sailor）・w6g_flagell（beggar）・w6g_relic（merchant）・w6g_relic2（merchant）・w6g_silent（priest）・w6g_arena（rogue）・w6g_check（guard）・w6g_deserter（soldier）・w6r_peddler（merchant）・w6r_private_toll（rogue）・w6r_caravan（merchant）・w6r_caravan2（merchant）・w6r_bard（villager）・w6r_goat（child）・w6r_funeral（priest）・w6r_wedding（villager）・w6r_shortcut（rogue）・w6r_fame_child（child）・w6r_fame_squire（knight）・w6r_courier（villager）・w6r_cowherd（villager）・w6r_soldier_home（soldier）・w6s_smuggler（foe:w3_smuggler）・w6s_plank（sailor）・w6s_dice（sailor）・w6s_stowaway（child）・w6s_fishing（sailor）・w7_bre_snow（soldier）・w7_eis_rope（sailor）・w7_eis_wait（sailor）・w7_eis_haul（sailor）・w7_eis_storm2（sailor）・w7_eis_floe（child）・w7_eis_furwolf（merchant）・w7_eld_promise（villager）・w7_eld_archer（archer）・w7_eld_herbs（merchant）・w7_eld_fog（child）・w7_eld_winter（merchant）・w7_gri_bread（merchant）・w7_rev_cry（child）・w7_rev_chosen（child）・w7_rev_spring（villager）・w7_rev_vow（villager）・w7_sal_harvest（merchant）・w7_sal_leak（host）・w7_vol_cloth（merchant）・w7_vol_bottle（child）・w7_vol_fog（sailor）・w7_vol_elfsail（sailor）・w7_zai_stone（merchant）・w7_zai_snow（soldier）・w7_zai_deserter（soldier）・w7_zai_letter（soldier）・w7_zai_watch（soldier）・w7b_dur_found（merchant）・w7b_dur_night（villager）・w7b_gla_board（merchant）・w7b_gla_bet（host）・w7b_gla_recruit（villager）・w7b_gla_boy（villager）・w7b_gla_cage（rogue）・w7b_lum_mite（merchant）・w7b_lum_night（child）・w7b_lum_tavern（host）・w7b_mel_quiet（villager）・w7b_mel_ink（merchant）・w7b_mel_novice（child）・w7b_nor_first（sailor）・w7b_nor_first2（sailor）・w7b_nor_knotcatch（sailor）・w7b_nor_drowned（child）・w7b_orb_staff（child）・w7b_orb_charm（merchant）・w7b_orb_charm2（merchant）・w7b_orb_night（villager）・w7b_rus_bench（noble）・w7b_rus_oar（sailor）・w7b_rus_fog（sailor）・w7b_rus_night（rogue）・w7b_rus_eel（child）・w7b_ser_canes（priest）・w7b_ser_coins（child）・w7b_ser_coin2（child）・w7b_ser_fog（villager）・w7b_vin_taste（merchant）・w7c_hal_find（child）・w7c_hal_cart（soldier）・w7c_kar_knot（child）・w7c_kar_fog（sailor）・w7c_kar_haul（sailor）・w7c_kel_porridge（host）・w7c_kel_thief（rogue）・w7c_kel_winterwell（child）・w7c_kel_tavern（soldier）・w7c_mis_carve（sailor）・w7c_mis_ice（priest）・w7c_mis_cove（guard）・w7c_rin_letter（child）・w7c_rin_reply（child）・w7c_rin_rain（priest）・w7c_sol_stand（merchant）・w7c_sol_glare（child）・w7c_sol_crab（guard）・w7c_sol_tavern（host）・w7c_vel_fog（sailor）・w7c_vel_horn2（sailor）・w7c_vel_ice（sailor）・w7c_vel_spark（soldier）・w7c_yon_bet（sailor）・w7c_yon_fake（rogue）・w7c_yon_summer（child）・w7c_yon_slick（sailor）・w7c_zar_fog（child）・w7g_cliff（rogue）・w8d_peddler（merchant）・w8p_deserter（soldier）・w8p_deserter2（villager）・w8p_lostchild（child）・w8p_conman（rogue）・w8p_beachkid（child）・w8p_survivor（merchant）・w8p_courier（soldier）・v2_egg（rogue）・v2_notari（merchant）・f2r_sigrun（adventurer）・f2r_rod_friend（knight）・f2r_rod_rival（knight）・f2r_rod_foe（knight）・f2r_pergo_jailed（merchant）・f2r_pergo_free（merchant）・f2r_rich_kept（villager）・f2r_tsuba_left（child）・f2r_tsuba_sold（rogue）・f2_majin_1（child）・f2_majin_2（adventurer）・f2_majin_2q（adventurer）・f2_majin_4（adventurer）・f2_majin_5（adventurer）・f2_king_1（noble）・f2_king_2（rogue）・f2_king_4（merchant）・f2_king_5（knight）・f2_rich_2（merchant）・f2_rich_5（merchant）・f2_sword_1（rogue）・f3i_collector（merchant）・i3_saltbite（sailor）・m12_apostle_here（soldier）・m12_dragon_look（merchant）・m12_succ_b（noble）・m12_inq_pyre（priest）・m12_cough_help（mage）・m12_cough_here（host）・m12_pirates_crew（sailor）・m12_pirates_here（rogue）・m12_volcano_here（host）・m12_winter_sled（soldier）・m14_wanderer（mage）・m15_ism_copy（mage）・m15_ort_book（mage）・r3_k_cart（merchant）・r3_n_flute（child）・r3_n_flute3（child）・r3_n_bottle（sailor）・r3_n_arm（sailor）・r3_z_frog（villager）・r3_z_frog3（villager）・r3_l_bread（villager）・r3_l_bread3（villager）・r3_l_pilgrim（priest）・r3_l_valley（soldier）・r3_lead_seal（noble）・r3_lead_crate（merchant）・r3_lead_crate2（merchant）・c1_black（rogue）・r2_zalve_0（child）・r2_zalve_mend（rogue）・c19_pie_flood（villager）・c19_aga_due（merchant）・c19_ser_night（priest）・c19_tom_card（elder）・c19_gan_weigh（merchant）・c19_yae_hair（elder）・c19_yae_back（elder）・c19_mar_rope（host）・c19_hil_ladder（priest）
- 仲間（乱数の仲間 240 人と出来事の仲間）：絵あり 227／248・絵なし：傭兵のケイル（adventurer）・片目のシグルン（adventurer）・ロデリク（knight）・ならず者のブラン（rogue）・ならず者のヴァン（rogue）・ならず者のチセ（rogue）・ならず者のガラハ（rogue）・ならず者のテューリス（rogue）・ならず者のゼクス（rogue）・ならず者のカイル（rogue）・ならず者のリーナ（rogue）・ならず者のカティア（rogue）・ならず者のロイド（rogue）・ならず者のイリサール（rogue）・ならず者のフィオ（rogue）
- 魔物（敵と使徒 223）：絵あり 222・絵なし（絵ができるまで何も描かない）：w3_smuggler
- 人の姿の絵で描く敵：w1_konoha → `konoha`・c2_nora → `nora`・c2_angelica → `angelica`・c2_zork → `zork`・c4_musette → `musette`・c5_violaine → `violaine`・c5_severin → `severin`・c8_graul → `graul`・e2_berna → `berna`・e3_mirza → `mirza`・e3_zalve → `zalve`・e3_aurelia → `aurelia`・e3_yoihime → `yoihime`・e3_salphiel → `salphiel`
