// R5：場面の背景の表（持ち主「森への道中の戦闘が町の通りの背景のまま」「酒場の中の会話が屋外の石壁の背景だった」）。
// 仕組みは src/engine/zzzzzzzzzzzzzzzz_r5_scene.js（どの場面にどの絵を出すかの対応表もそこに）。
//   D.R5_EVENT_SCENE[出来事の id] = 施設の種類（inn・tavern・shop・guild・church・train・alley・castle・academy・forge・arena・bath）
//     本文の書き出しが施設の中の出来事。施設の室内の絵を出す（迷宮の中だけは迷宮の絵のまま）
//   D.R5_OUTDOOR = [出来事の id]：書き出しに施設の名があっても外の出来事（中庭・裏庭・窓の外から覗く…）。tests/checks/r5_scene.mjs の見落とし探しで除く
//   D.R5_ROAD[地方] = 町と町のあいだの道中の絵（行き先も出発地も町のとき）。海の旅は D.R5_SEA
// 新しく施設の中の出来事を書いたら、ここに足す（tests/checks/r5_scene.mjs が書き出しから見落としを探す）。レーン A（R5）
(function (G) {
  const D = (G.data = G.data || {});
  D.R5_EVENT_SCENE = Object.assign(D.R5_EVENT_SCENE || {}, {
    // ---------------------------------------------------------------- 酒場
    e3_after_chezar: "tavern", e3_f_song: "tavern", e7m_1: "tavern", e7m_4: "tavern", e7m_8_host: "tavern", f4r_traveler_robbed: "tavern", f4r_caravan_left: "tavern",
    m6_wall_captain: "tavern", c2_natalia: "tavern", c2_yurina: "tavern", c2_zork_bar: "tavern", c2_t_natalia_seat: "tavern", c4_bert_tab: "tavern", c4_ilse_plan: "tavern",
    c4_t_tula_red: "tavern", c5_leo_poison: "tavern", c7_hart_poem: "tavern", c7_hart_join: "tavern", c7_t_noe_refund: "tavern", c7_t_anne_blush: "tavern", c8_graul_track: "tavern",
    m2_brawl: "tavern", m3_whisper: "tavern", m5_bloodwine: "tavern", w2_statue: "tavern", w3_o_n_box: "tavern", w3_t_armwrestle: "tavern", w3_t_song: "tavern",
    w4_k_veteran: "tavern", w4_k_arm: "tavern", w4_g_frostfire: "tavern", w4_k_card: "tavern", w7_bre_song: "tavern", w7_eis_wait: "tavern", w7_gri_rumor: "tavern",
    w7b_dur_board: "tavern", w7b_dur_bet: "tavern", w7b_gla_bet: "tavern", w7b_gla_poach: "tavern", w7b_lum_tavern: "tavern", w7b_vin_taste: "tavern",
    w7c_kel_tavern: "tavern", w7c_sol_tavern: "tavern", w7c_yon_tavern: "tavern", f2_majin_2: "tavern", m13_stranger: "tavern",
    // ---------------------------------------------------------------- 宿
    e3_meet_yura: "inn", e3_after_yura: "inn", e3_f_awake: "inn", f4r_heretic_inquisitor: "inn", f4r_caravan_saved: "inn", f4r_slaves: "inn", f4r_letter_back: "inn",
    f4r_house_sealed: "inn", c2_t_kaidel_chair: "inn", c2_t_sheila_trail: "inn", c2_t_rui_bread: "inn", c2_t_zerina_book: "inn", c2_t_elnea_mirror: "inn",
    c4_clar_letters: "inn", c4_iori_record: "inn", c5_sev_letter: "inn", c5_ruf_mirror: "inn", c6_vio_join: "inn", c6_t_vio_love: "inn", c7_t_timo_crush: "inn",
    c8_t_gen_cards: "inn", c8_t_ing_lot: "inn", cb_table: "inn", c12_t_gui_decide: "inn", m10_kinletter: "inn", m10_secret: "inn", m11_mon_town: "inn",
    m2_letter: "inn", m2_crush: "inn", r1_elf_ledger: "inn", r1_beast_molt: "inn", u3_innbook: "inn", u3_scholar: "inn", w3_t_ledgers2: "inn", w3_t_nightglow: "inn",
    w4_v_rooms: "inn", w4_t_poem2: "inn", w7_gri_stay: "inn", w7c_hal_hearth: "inn", f2r_pergo_jailed: "inn", m12_inq_here: "inn", m12_cough_here: "inn", d6_w_inn: "inn",
    // ---------------------------------------------------------------- 教会
    w1_gods: "church", w1_misprayer: "church", e3_meet_aurelia: "church", f4d_grain: "church", c5_sev_choir: "church", c5_sev_fight: "church", m10_wedding: "church",
    w3_w_abbey_crypt: "church", w7c_rin_rain: "church", m12_cough_help: "church",
    // ---------------------------------------------------------------- ギルド・店・学院・鍛冶場・闘技場・湯屋
    c2_sheila_hire: "guild", c5_con_ledger: "guild", q9_annelise_1: "guild",
    c4_doro_loan: "shop", c5_tsu_rate: "shop", c5_fel_count: "shop",
    c4_titta_stairs: "academy", e7m_8_ward: "academy",
    e3_f_nail: "forge", c2_serios: "forge", q9_annelise_2: "forge",
    e3_f_pin: "arena", c7_gus_sand: "arena",
    w4_am_friends: "bath", w4_am_float: "bath", w2_sleeper: "bath",
  });
  D.R5_OUTDOOR = [...(D.R5_OUTDOOR || []), "c7_anne_forge", "c12_aga_bees", "c12_t_sha_rope", "m10_confess"];
  D.R5_ROAD = Object.assign(D.R5_ROAD || {}, {
    レオネスト王国: "plains", ノルディア帝国: "snow", エルメシア共和国: "plains", 光天教会領: "plains", シェルアーク: "plains",
    人類の最前線: "w4_watch", 人と魔の境: "mountain", 使徒領: "realm",
  });
  D.R5_SEA = D.R5_SEA || "w3_isles";
})(globalThis.G = globalThis.G || {});
