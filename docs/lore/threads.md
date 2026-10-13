# 伏線の帳簿（threads）

ゲームの出来事・噂・依頼・人物の話で「張られたもの」（謎・約束・予告・名前だけ出る人や場所・続きがありそうな話）を一行ずつ並べ、どこで張り、どこで拾ったかを記す。V16（2026-10-12）に src/data の全部（出来事・噂と導線・F2 の引き・R3 の最初の一歩・C9 の頼みごと・C15 の深い話・仲間の会話と恋・使徒の筋と E7 の長編・C10 の選択肢・場所の見どころと用語説明・迷宮と遺跡・品の説明）を読んで作った。確認は `tests/checks/v16_threads.mjs`（表の列がそろっている・参照したファイルと id が実在する）。

## 読み方
- **糸**：張られたものを一行で。
- **張った所**：`ファイル.js:id`。出来事は出来事の id、頼みごとは `quest_c9_x.js:人id[段]`、人物の表は `c*_people.js:人id`、会話は `talk_人.js:話題のキー`、表の項目は `ファイル.js:表のキー`。複数は「・」で区切る。
- **回収した所**：拾っている出来事・会話・仕組み。無ければ「―」。
- **状態**：
  - **回収済み**：どこかで拾われている（答えを出さずに「触れた」だけでもよい）。
  - **未回収**：張ったきりで、どこにも拾われていない。
  - **取り下げてよい**：情景や味付けで、拾わなくても困らないもの。
  - **余白**：設定でわざと決めないもの（[reveal.md](reveal.md)「わざと残す余白」・[canon_2026-10-11.md](../review/canon_2026-10-11.md) 8. の「決めていないこと」）。**回収案を書かない。**
- **備考**：食い違い（同じことが二通りに書かれている所）もここに書く。
- 未回収のうち、持ち主の決定が要るものは下の「持ち主の決定が要るもの」に推し案つきで並べた。設定（[world.md](world.md)・[VISION.md](../VISION.md)・人物の表）をねじ曲げる回収案は書いていない。
- 「印だけ浮く」（出来事の結果で `flag` を立てるが、どこも読まない）ものは、糸として一行ずつ載せた。印の一覧は `node` で `tests/checks/v16_threads.mjs` の隣に置いた調べ方（下の「印の調べ方」）で出せる。

## 数（V16 時点）
| 状態 | 数 |
|---|---|
| 回収済み | 238 |
| 未回収 | 164 |
| 取り下げてよい | 48 |
| 余白 | 94 |
| 計 | 544 |

未回収のうち持ち主の決定が要るもの：下の表の 26 件。残りは小さな続き（手紙の届け先・一言の約束）で、場所の子が出来事を足すときに拾えばよい。

## 表
| 糸 | 張った所 | 回収した所 | 状態 | 備考 |
|---|---|---|---|---|
| シグルン「次の町の見張り塔で会う」 | f2_threads.js:f2_majin_4 | f2_threads.js:f2_majin_5 | 回収済み | |
| 爪の印の地図は断界山脈へ点々と続く | f2_threads.js:f2_majin_4 | f2_sequel.js:f2r_sigrun（二枚目「さらに東へ」） | 未回収 | 印の終点・印を刻む「仕えたがる者」はどこにも出ない。方向が使徒領を指すだけで止まる |
| 高い所で手を叩く音（影の前触れ） | f2_threads.js:f2_majin_5・f2_sequel.js:f2r_tsuba_kept・q4_paths.js:MAJIN_MILESTONE | ― | 余白 | 拍手の余白（m13_edge.js:m13_seats と同根） |
| 羽根を持つ限り向こうから来る | f2_threads.js:f2_majin_2 | f2_threads.js:f2_majin_3 | 回収済み | 羽根は持ち物にならない（memo のみ）。majin_4 で渡さず持ち続けた場合の続きは無い |
| 仲間になったシグルン・ロデリクの会話 | f2_sequel.js:f2r_sigrun・f2_sequel.js:f2r_rod_friend | zzzzzzzzzzzzzzzzzzzzzzz_v17b.js:MATE_TALK | 回収済み | 持ち主の決定（2026-10-13）で 仲間の一言を二人ぶん三本ずつ足した（名のある仲間には昇格させない）。巣潰しの続きは無い |
| 仕えたがる者は人でなくなる・名を忘れる | f2_threads.js:f2_majin_2・f2_sequel.js:f2r_sigrun | f2_bestiary.js:kin・enemies_e4_kin.js:kin | 回収済み | 知識としての回収。シグルン本人の筋では閉じない |
| シグルンの無くなった村 | f2_threads.js:f2_majin_5 | ― | 取り下げてよい | 動機の一言として完結している |
| ロデリク「次は別の町で会おう」 | f2_threads.js:f2_king_4 | f2_threads.js:f2_king_5 | 回収済み | |
| 王城の門は名のある者のほうから開く | f2_threads.js:f2_king_5 | explore.js:knight | 回収済み | 仕組みで回収（名声 150） |
| 都での再会（手・張り合い・恨み） | f2_threads.js:f2_king_4 | f2_sequel.js:f2r_rod_friend・f2_sequel.js:f2r_rod_rival・f2_sequel.js:f2r_rod_foe | 回収済み | |
| 「どちらかが城の中」「次は正面から勝つ」 | f2_sequel.js:f2r_rod_friend・f2_sequel.js:f2r_rod_foe | ― | 未回収 | 三度目の再会無し |
| ペルゴの帳面：隣の町の市場の名 | f2_threads.js:f2_rich_3 | f2_threads.js:f2_rich_5 | 回収済み | |
| 紙の裏の町と品・商館の奥で土地の品 | f2_threads.js:f2_rich_5・r3_leads.js:r3_lead_crate2 | q4_paths.js:GOODS | 回収済み | 交易の仕組み |
| 牢の手紙「出るころには使われていてほしい」 | f2_sequel.js:f2r_pergo_jailed | ― | 取り下げてよい | 出所後のペルゴは無いが手紙で完結 |
| 「倉は空だった」の嘘 | f2_threads.js:f2_rich_4 | f2_sequel.js:f2r_rich_kept | 回収済み | |
| 逃げたペルゴの再登場 | f2_threads.js:f2_rich_5 | f2_sequel.js:f2r_pergo_free | 回収済み | |
| 留め具の片割れ（もう片方を探す連中） | f2_threads.js:f2_sword_1 | zzzzzzzzzzzzzzzzzzzzzzz_v17b.js:CLASP_LINE（locations.js:graveyard の鉤槍の文） | 回収済み | 持ち主の決定（2026-10-13）で 片割れは物として出さず、竜の墓場で鉤槍を手にしたとき、持ち歩いた留め具が「一度だけ鳴った」の一行だけ |
| 「片方をもう片方が呼ぶ」→留め具が鳴る | f2_threads.js:f2_sword_2 | f2_sequel.js:f2r_tsuba_kept・f2_sequel.js:f2r_tsuba_left | 回収済み | |
| 鉤の黒い槍と夜明けに鳴る白い鎖の昔話 | f2_threads.js:f2_sword_4 | locations.js:graveyard・events.js:RUMORS・lore_u3.js:swords | 回収済み | |
| 読む女「片割れを見つけたら取りに来い」 | f2_threads.js:f2_sword_5 | ― | 取り下げてよい | 持ち主の決定（2026-10-13）で 鉤槍の一行（上の行）で収め、取りに行く場面は作らない |
| 墓荒らしの地図の二重の丸＝遺跡 | f2_threads.js:f2_sword_3 | locations.js:ruins | 回収済み | 遺跡側に留め具へ触れる出来事は無い |
| 古物商から消えた留め具「持ち主を変えたがる」 | f2_sequel.js:f2r_tsuba_sold | ― | 余白 | 鉤がひとりでに向く理由と同根 |
| 「遠くまで歩いた足だけが着く」 | f2_threads.js:f2_sword_5 | locations.js:graveyard | 回収済み | 方向だけの示唆 |
| 路地の男の紙切れ（墓地の名） | f2_threads.js:f2_sword_1 | ― | 取り下げてよい | 三段目の地図で同じ役目を果たす |
| 鐘撞きの丘：切れた綱・十年鳴らない・消えた堂守 | r3_hooks.js:r3_k_bell2 | events_w3_wild.js:w3_w_bell_tally | 回収済み | 食い違い：同じ丘の events_w3_wild.js:w3_w_bell_keeper は番人が綱を握り毎日の鐘の数を記す。R3 の「もう十年鳴っていない」と噛み合わない |
| 鐘の内側の名前・地面の下から返る音 | r3_hooks.js:r3_k_bell2 | ― | 未回収 | 地下の鐘の正体に触れる出来事無し |
| 丘陵の倒木で通行料を取る連中 | r3_hooks.js:r3_k_cart | events.js:toll | 回収済み | |
| 沈黙の修道院の七番目の扉・向こうの誰か | r3_hooks.js:r3_n_bottle2 | ― | 未回収 | w3_abbey の出来事（井戸のパン・夜明けの修道士・crypt）は扉に触れない。バッソの棚の瓶二本も続き無し |
| 南の島へ行く船は季節の風を待つ | r3_hooks.js:r3_n_arm | explore.js:sail | 回収済み | 船旅の仕組み |
| 古い星図と星の位置がずれている | r3_hooks.js:r3_z_book | ― | 未回収 | c10_choices_w4.js:w4_ft_stare「動く星が東の山並みへずれる」が似た手がかりだが互いに結ばれていない |
| 湯の町の赤い湯・源泉の石段の赤い手形 | r3_hooks.js:r3_z_bath2 | ― | 未回収 | w2_amyrein の出来事に階段・赤い湯は無い |
| 夜に鈴を鳴らさない巡礼に道を譲れ | r3_hooks.js:r3_l_pilgrim | ― | 未回収 | 咎追い（m3_lore.js:togaoi）は「鈴を鳴らす」側で逆。聖都の手前の街道にそれらしい出来事無し |
| 懺悔の谷：声に答えるな・コンラート | r3_hooks.js:r3_l_valley2 | events_w4_region.js:w4_e_name・zz_e10_events.js:e10_togaoi_confess | 回収済み | コンラート本人の続きは無い |
| R3 の頼みごと四本（籠・笛・蛙・パン） | r3_hooks.js:r3_k_basket・r3_hooks.js:r3_n_flute・r3_hooks.js:r3_z_frog・r3_hooks.js:r3_l_bread | r3_hooks.js:r3_k_basket3・r3_hooks.js:r3_l_bread3 | 回収済み | |
| 海に返した瓶が沖へ流れる・棚の瓶二本 | r3_hooks.js:r3_n_bottle | ― | 取り下げてよい | 情景として完結 |
| 家令「次も使いを頼むかも」 | r3_leads.js:r3_lead_seal2 | ― | 取り下げてよい | 印 r3_steward は読まれない。memo で足りる |
| 剣と麦の穂の紋の古い騎士の家 | r3_leads.js:r3_lead_seal | ― | 未回収 | ロデリクの「騎士の家の紋」とも結ばれていない |
| 砦の女兵士と焦げた足跡（三つで途切れ・東向き） | r3_leads.js:r3_lead_tracks2 | ― | 未回収 | 砦で女兵士に再会する出来事無し。「剣の通らないもの」の照合先も無い |
| 芯の鳴る剣は島の鍛冶・刃の背に波の印 | r3_leads.js:r3_lead_blades | ― | 未回収 | 「波の印」は他に無い |
| 骨ばかり出る谷の掘り屋 | r3_leads.js:r3_lead_blades | locations.js:graveyard | 回収済み | |
| 噂：竜の腹の黒い槍／鬼ヶ島の白い鎖 | events.js:RUMORS | locations.js:graveyard・locations.js:shuten | 回収済み | |
| 噂：水の書庫で思い出を読む女の声 | events.js:RUMORS | lore_u3.js:levian・e3_apostles.js:levian | 回収済み | |
| 噂：灰の荒野の日傘の銀髪 | events.js:RUMORS | e7_mirza_1.js:e7m_1 | 回収済み | |
| 噂：皇女の婿争いの殺し合い | events.js:RUMORS | events.js:blackknight | 回収済み | 北の賢人が誰を推すかは余白 |
| 噂：赤い月の晩に生まれた子 | events.js:RUMORS | events.js:redmoon・m13_edge.js:m13_seats | 余白 | |
| 噂：司祭が寄付金で賭場通い | events.js:RUMORS | events.js:donation | 回収済み | |
| 噂：樽ゴブリンに飲み比べで勝つと宝 | events.js:RUMORS | ― | 未回収 | barrelgob は敵として出るだけ。飲み比べの出来事無し |
| 噂：嘴の医者が来た町に夜番・順番が逆 | m9_plague.js:RUMORS | enemies_m5.js:m5_nightwatch・m9_plague.js:m9_needles | 回収済み | |
| 檻の男「先生の帳面にそう書いてあった」 | m9_plague.js:m9_cage | lore_u3.js:beast | 回収済み | |
| ノラが探す「村を潰したもの」 | f2_people.js:nora | f4_roster.js:nora・quest_c9_b.js:nora | 未回収 | 探す姿は出るが、潰したものには一度も行き当たらない |
| ヴァレオンの兄弟を殺した使徒ゴルヴァン | f2_people.js:valeon・c2_people.js:valeon | v17a_golvan_1.js:SAGAS.golvan | 回収済み | V17a（t01）：長編「王の仇討ち」。ゴルヴァンは E3 に入れたが、討てるのは長編の中だけ（E8 の討てない使徒） |
| 錆の鎧の騎士団の紋（年鑑に無い騎士団） | f2_bestiary.js:c2_rustspawn | zc2_lore.js:c2_jusshi | 未回収 | 騎士団の名はどこにも無い |
| テオドラ・ピムとミナの兄ピム | zc3_names.js:boku・r3_hooks.js:r3_n_flute | ― | 取り下げてよい | 別人が同じ「ピム」（姓と名）。片方の名を変える案 |
| 王国十指の空いた席 | zc2_lore.js:c2_jusshi | c2_people.js:yurina | 回収済み | |
| 屍竜の槍の柄に刻まれた誰かの名 | f2_bestiary.js:bonedragon | i2_flavor.js:volgrim | 回収済み | |
| 黒鎧「まだか。まだ来ないのか」 | boss_lines.js:graw | r13_unfinished.js:APOSTLES | 回収済み | |
| 鉄の番人「バンゴウ、ヲ」 | boss_lines.js:w2_ironwarden | f2_bestiary.js:w2_ironwarden | 余白 | 古い文明 |
| 近衛団長「今夜で七人目か」 | boss_lines.js:royalguard | ― | 取り下げてよい | 前口上の味付け |
| 咎追いは五百五十一年に討たれた記録 | m3_lore.js:togaoi | ― | 余白 | 討たれた使徒は本当に死んだか |
| 石の席・拍手・空いた席ひとつ | m13_edge.js:m13_seats | q4_paths.js:MAJIN_MILESTONE | 余白 | |
| 無かった扉の「忘れ物」の札（自分の字） | m13_edge.js:m13_door | ― | 余白 | |
| 人間の術は借り物（返し方） | m14_masters.js:m14_wanderer | ― | 余白 | ファイル頭に「匂わせるだけ」と明記 |
| 名だけの使徒（湖の占い娘・山の館の伯爵） | r13_unfinished.js:NAMES・m13_edge.js:NAMES | know_l1_apostles.js:salphiel | 未回収 | e3_apostles.js・enemies_e4_kin.js に id 無し。名を呼ぶ行だけがある（c4/c5 の人物の表には会える人として出る） |
| 処刑台の老人「鬼の島の白いの・竜の骨・二つ」 | events.js:heretic | quest_c9_g.js:yurien・lore_u3.js:rumor・events_town2.js:v1_foxfest・echo_f4_events.js:f4r_heretic_cave・c10_choices.js:heretic | 回収済み | 二振りの武具の在り処 |
| 占い師「竜の骨の中に鉤」 | events.js:fortune | items.js:volgrim・lore_u3.js:fortune | 回収済み | |
| 石碑「目が離れたとき、終わる」続きは削られ | events.js:stele・r1_races.js:stele | m13_edge.js:m13_seats・events_u3.js:u3_scholar | 余白 | これ以上は〔秘〕 |
| 昼の泉に映った月に目・一度だけ瞬き | events.js:spring | e3_apostles.js:e3_meet_tojizuki・zz_e10b_events.js:e10_tojizuki_lake | 回収済み | 閉じ月の正体は余白 |
| 祠の三神像の一つだけ顔が削られている | events.js:shrine | walker_d6.js:d6_w_shrine | 余白 | 神々 |
| 冒険者の骸の日記「奥の主に一人で挑むな」 | events.js:corpse | ― | 取り下げてよい | 一言の忠告 |
| 微笑の使徒「また会おう」 | events.js:mirza | e7_mirza_1.js:e7m_1 | 回収済み | 長編 |
| 赤い月の夜、高い所で誰かが手を打つ | events.js:redmoon | ― | 余白 | |
| 砦の隊長「名前は覚えておく」 | events.js:frontline | ― | 取り下げてよい | |
| 皇女の婿を争う二家の密命 | events.js:prince | zv3_c19_royal_events.js:c19r_katia_poster・events_w7_gri.js:w7_gri_rumor | 回収済み | 北の賢人が誰を推すかは余白 |
| 辻斬りがくれた古い巻物 | events.js:tsujigiri | ― | 取り下げてよい | 持ち物にならない |
| ノラの村がひと晩で消えた・爪痕は東の山脈へ | events_c2.js:c2_nora_sniff・events_c2.js:c2_nora_village | quest_c9_b.js:nora・f4_roster.js:nora | 回収済み | |
| 夜の荷馬車の空の檻・錠に王国の印 | events_c2.js:c2_sheila_cart | events_c2.js:c2_lab・events_c2.js:c2_lab_after | 回収済み | |
| 基地に忍び込んだ者は「何かを見た」 | events_c2.js:c2_ange1・events_c2.js:c2_ange2 | events_c2.js:c2_lab_after・zv3_c19_royal_events.js:c19r_doctor_almanac | 回収済み | |
| 博士「百年後の味方」使徒の力を人へ | events_c2.js:c2_lab | zv3_c19_royal_events.js:c19r_doctor_almanac | 回収済み | |
| 古い炭鉱の奥で脈打つ錆びた鎖 | events_c2.js:c2_yurina_mine | events_c2.js:c2_yurina_last | 回収済み | 鎖の正体は余白 |
| ユリナ「王子さまに伝えて。ここで合ってた」 | events_c2.js:c2_yurina_last | zv3_c19_royal_events.js:c19r_serios_sketch・talk_natalia.js:natalia_c_yurina・events_c5.js:c5_gau_extra | 回収済み | |
| 四騎士ヴァルグ「四つ目の落とし穴は人でも獣でもない匂い」 | events_c2.js:c2_valg | zv3_c19_royal_events.js:c19r_valg_stitch | 回収済み | |
| 議長アリシア「七人目」 | events_c2.js:c2_alicia | zv3_c19_royal_events.js:c19r_alicia_council・quest_c9_b.js:sheila | 回収済み | |
| 「ボク」の娘「次に会ったら三つ目の歯車の話」 | events_c2.js:c2_boku | events_c3.js:c3_boku_name | 回収済み | 「誰かが何かを回してた」は余白 |
| アンジェリカの離島の祖母・毎月の干し魚 | events_c2.js:c2_ange2・f2_people.js:angelica | ― | 取り下げてよい | 人物の味付け。会話・依頼に祖母無し |
| イルゼの帳面の余白の几帳面な字 | events_c4.js:c4_ilse_book・events_c4.js:c4_t_ilse_ledger | quest_c9_c.js:ilse | 回収済み | 鞄に触れた手 |
| 薄布の娘の予言「三つ目の扉は開けずに叩け」 | events_c4.js:c4_sal_omen | events_w4_wild.js:w4_r_door | 未回収 | w4_r_door では鍵で開けている。「叩け」の筋は拾われていない。「二つの月」「剣の重さ」は e3_apostles.js:e3_meet_tojizuki・events_c4.js:c4_sal_name で回収 |
| 石の環の三十三番目サルフィエル／十三番目ユズエル | events_c4.js:c4_sal_name・events_c5.js:c5_yuz_name | zc4_people.js:salphiel・zc5_people.js:yuzuel | 回収済み | 環の空いた枠は余白 |
| 砂色の外套の男との取引「冬ごとに名前を一つ」 | events_c4.js:c4_ger_deal | events_c8.js:c8_ing_tag・events_town2.js:v1_zalve | 回収済み | |
| イオリの棋譜「最後の一手」「続きは、あなたと」 | events_c4.js:c4_iori_record | v17b_threads.js:v1_boardgame（イオリの棋譜の続きから指す）・zzzzzzzzzzzzzzzzzzzzzzz_v17b.js:IORI_LINE | 回収済み | 持ち主の決定（2026-10-13）で 北の賢人との盤で棋譜を使える選択肢と、冬が明けたら年表に「冬を越せなかった」一行（S.c2.gone.iori） |
| ブルーノの証文を両替屋の女主人が買い取った | events_c5.js:c5_bru_join | quest_c9_c.js:bruno・events_c5.js:c5_bru_chain | 回収済み | |
| コンスタンスの帳面に載らない依頼（監査の帳簿） | events_c5.js:c5_con_job | events_c5.js:c5_con_fall | 回収済み | |
| 墓守ボードワンの短剣をヴァレンツァの船大工の家へ | events_c5.js:c5_bau_tags | v17b_threads.js:v17b_bau_dagger | 回収済み | 持ち主の決定（2026-10-13）で 短剣を預かった印（v17b_bau_has）で港町に船大工の家の出来事。娘の行方は言わない |
| マグダの八つ目の字 | events_c5.js:c5_mag_eighth | zc5_people.js:magda・zv3_c19_town2.js:c5_mag_eighth | 回収済み | |
| ラザールの二つ名は焼かれた本の最後の頁の言葉 | events_c6.js:c6_t_laz_name | ― | 未回収 | talk_lazare.js の「二つ名の帳面」は別の話。最後の頁の言葉はどこにも無い |
| マルゴの父の火打ち金（形見） | events_c6.js:c6_t_mgt_father | talk_margot.js:margot_b2 | 回収済み | 火打ち金を預ける |
| ウォルフラムの名を言わない村 | events_c7.js:c7_t_wolf_village | talk_wolfram.js:wolfram_p5 | 余白 | 村の名は言わない |
| ラドミラの黒い剣「手放したら取りに来る」 | events_c7.js:c7_rad_join・events_c7.js:c7_t_rad_sword | quest_c9_f.js:radmila・talk_radmila.js:radmila_b2 | 回収済み | 剣の主は余白 |
| ゲンサイの最後の「子どもではない名前」 | events_c8.js:c8_t_gen_names | talk_gensai.js:gensai_p4 | 回収済み | 匂わせどうし |
| 鉄の面の男が片羽黒い鷹を探す | events_c8.js:c8_graul_track | events_c8.js:c8_izra_hunt・events_c8.js:c8_izra_hunt2 | 回収済み | |
| ユリエンの七十一枚目の先 | events_c8.js:c8_yur_join | ― | 余白 | 刻印の環の空いた枠 |
| 仲間の書きかけの手紙「もし俺が戻らなかったら{keep}は――」 | events_m2.js:m2_letter | events_m2.js:m2_farewell | 回収済み | 形見 |
| 裏切った仲間の懐の、あなた宛てで本人の字ではない手紙 | events_m2.js:m2_betray_knife | ― | 未回収 | 誰が書いたかどこにも無い |
| 打ち明け話「続きはまた今度」 | events_m2.js:m2_confide | ― | 未回収 | 印を立てるだけ。続きの場面が無い |
| もう一つの足音→足音のしない処刑人 | events_m3.js:m3_steps・events_m3.js:m3_steps2 | events_m3.js:m3_togaoi | 回収済み | |
| 首に布を巻いた獣「かならず、かえる」 | events_m5.js:m5_oldbeast | sanity_m5.js:m5_oldbeast | 回収済み | 前の主人公の名 |
| 遺跡の小さな冠と名前を削られた七つの墓標 | events_m5.js:m5_crown | m13_edge.js:m13_relics | 回収済み | 七つ目が誰かは余白 |
| 壁に話しかける男「数えるな」 | events_m5.js:m5_madman | ― | 取り下げてよい | 正気の仕組みの味付け |
| 巻き尺の老人（若い体の王） | events_m4.js:m4_oldking | events_c2.js:c2_valeon | 余白 | 若返りの理由は余白 |
| ドレイゼの預かり証（字が汚くて読めない） | events_m11_love.js:m11_zalve_2 | events_m11_love.js:m11_zalve_last | 回収済み | |
| 朧の女は約束を守らない・帰りそびれた者たち | events_town2.js:v1_foxfest・events_town2.js:v1_returned・events_w1.js:w1_oldman | romance_yoi.js:yoi・events_m11_love.js:m11_yoi_1 | 回収済み | |
| 吐き出された船の日誌「沈んだ船の町」別筆跡の一行 | events_town2.js:v1_spatship | zz_e10b_events.js:e10_lugu_bell・lore_u3.js:ship | 回収済み | 海の底の長いのは余白 |
| 北の賢人「覚えておくぞ」・駒に謝る名「ルーペルト」 | events_town2.js:v1_boardgame | zz_e10b_events.js:e10_chezar_piece | 回収済み | 印 v1_shezar_lost は読まれない（上の行）。推す婿は余白 |
| 竜の卵と竜に乗った赤い鎧の少女 | events_wild2.js:v2_egg | ― | 未回収 | 少女＝竜騎手カルラか。world.js の表にカルラの名はあるが、結ばれていない |
| 凍えた旅人の、帝都の石工の娘宛ての四十年前の手紙 | events_wild2.js:v2_letter | ― | 未回収 | 預かっても印も持ち物も無く、届け先の出来事が無い |
| 翼の触れ役「傘のお方と香のお方が町を一つ賭ける」 | events_wild2.js:v2_herald | v17b_threads.js:u3_v17b_oboro_wager | 回収済み | 持ち主の決定（2026-10-13）で 結末は書かず、朧島の通行人のひとことで、芸の町の三日三晩がその賭けの町だったと読める |
| 庭師の長話「荒野の真ん中の、どなたでしたか」 | events_wild2.js:v2_garden | events_wild2.js:v2_notari・e3_apostles.js:e3_meet_notari | 回収済み | |
| 道端の骨の賽子の女の声「覚えておくよ」 | events_wild2.js:v2_dice | ― | 余白 | |
| 鬼の酒盛り「頭目の刀は夜に…」 | events_wild2.js:v2_oni_feast | lore_u3.js:rumor | 回収済み | 白い鎖 |
| 粉屋の娘が待つ「砦の人」 | events_u3.js:u3_miller | ambient_u3.js:u3_miller | 未回収 | 噂だけ |
| 片腕の傭兵「腕は貸してる。そのうち返しに来る」 | events_u3.js:u3_oldsoldier | ― | 未回収 | |
| 道標の見たことのない町の名・途切れた石畳と子どもの靴跡 | events_u3.js:u3_milestone | ― | 余白 | 幕引きの夜 |
| 首のない像「首は見上げたから落とされた」 | events_u3.js:u3_statue | ― | 余白 | |
| 楡の木の高い所の「起きるな」 | events_u3.js:u3_carved_tree | oldera_d6.js:d6_old_prayer | 余白 | 断片どうし |
| 墓守「書く者がおらんと帳面に載らん」 | events_u3.js:u3_graves | ― | 余白 | 神々の帳面 |
| 聖女の正体・告発後「聖女は消えた」 | events_w1.js:w1_accuse | dungeon_w11_places.js:w11_cc_lore2 | 回収済み | |
| 古い祭壇で告げると賽子の音と宝石 | events_w1.js:w1_gods | ― | 余白 | 神々 |
| 顔を探す絵描き「三年探した顎」 | events_w2.js:w2_statue | ― | 取り下げてよい | 印 w2_statue は読まれない |
| 港町で預かった封をした包み→王都の鈴の戸口 | events_w3_old.js:w3_o_n_box | events_w3_old.js:w3_o_l_box | 回収済み | |
| 鬼の島の下手な太鼓をなおしてきて | events_w3_old.js:w3_o_y_drum | events_w3_old.js:w3_o_g_drum | 回収済み | |
| 橋脚の瓶の手紙「森から帰ったら橋のたもとで」 | events_w3_towns.js:w3_t_whistle2 | events_w3_towns.js:w3_t_whistle3 | 回収済み | |
| 灰の扉「鳴る日まで閉じよ」・山を向いた椅子・赤い頂 | events_w3_towns.js:w3_t_dig2・events_w3_towns.js:w3_t_nightglow | m12_events_d.js:volcano | 回収済み | 何が眠るかは余白 |
| 研究所の奥の扉の下の隙間（第五王子） | events_w3_towns.js:w3_t_tray2 | zv3_c19_royal_events.js:c19r_neilas_tray | 回収済み | 「数えてくる」の約束の印は読まれない（上の行） |
| 鐘撞きの丘：孫が名を言わない塔・番人のいない塔 | events_w3_wild.js:w3_w_bell_child・events_w3_wild.js:w3_w_bell_tally | events_w3_wild.js:w3_w_bell_keeper | 回収済み | 同じファイル内で対になる。塔の正体は余白 |
| 沈黙の修道院の針と糸（唇を縫う） | events_w3_wild.js:w3_w_abbey_priest・events_w3_wild.js:w3_w_abbey_monk | lore_w3_wild.js:needle | 回収済み | |
| 十一番目の島「ここの、下」・窪地の息・地図に無い島 | events_w3_wild.js:w3_w_isle_drawing・events_w3_wild.js:w3_w_isle_breath | w9_spots_isles.js:drift | 余白 | 島亀。討たれた使徒は本当に死んだか |
| 観測所の筒：研究所の奥から覗き返す者・火口の旗の下の書き手 | events_w3_wild.js:w3_w_ash_scope・events_w3_wild.js:w3_w_ash_scope2 | zv3_c19_royal_events.js:c19r_neilas_tray | 回収済み | 火口の人物は余白 |
| 片腕の老人の鍵→三つ目の扉→交代の札 | events_w4.js:w4_k_veteran | events_w4_wild.js:w4_r_door・events_w4.js:w4_k_card・events_w4_region.js:w4_a_seat | 回収済み | |
| 塩を「返す」相手 | events_w4.js:w4_v_salt | events_w4.js:w4_v_salt2 | 回収済み | |
| エルフの詩人の詩を湯の町の人へ | events_w4.js:w4_t_poem | events_w4.js:w4_t_poem2 | 回収済み | |
| 三十年前に森を出た子 | events_w4.js:w4_t_elder | c10_choices_w4.js:w4_t_elder | 回収済み | |
| 灰の中の第三の塔の妻への手紙 | events_w4_more.js:w4_wl_letter | events_w4_more.js:w4_ft_letter | 回収済み | |
| 砦の少年の兜「十五になったら取りに来る」 | events_w4_region.js:w4_ft_boy | ― | 未回収 | |
| 郵便の女が燃やす宛先のいない手紙 | events_w4_region.js:w4_f_sled | ― | 取り下げてよい | |
| 北へ歩く白いもの・足跡の先は地図に無い | events_w4_region.js:w4_f_giant | lore_w4.js:giant | 余白 | 氷の巨神 |
| 渡し守が淵の女に名前を返す | events_w4_region.js:w4_sw_ferry | c10_choices_w4.js:w4_sw_ferry | 回収済み | |
| 腐れ庭園の名札に湯の町の帰ってこない冒険者の名 | events_w4_region.js:w4_gd_names | ― | 未回収 | 「尋ね人の張り紙と見比べる」先が無い |
| 沈黙の森の狩人の家族あての手紙「愛してる」 | events_w4_wild.js:w4_s_hunter | ― | 未回収 | 手紙は持ち物にならず、届け先も無い |
| 懺悔の谷の歌は「戻ったら」で止まる | events_w4_more.js:w4_e_choir | ― | 取り下げてよい | |
| 関の預かり所の手の届かない包み | events_w4_wild.js:w4_p_store | ― | 取り下げてよい | |
| 凍り火の女兵「残りは北から帰ってきたら」 | events_w4_region.js:w4_g_frostfire | ― | 取り下げてよい | |
| 砦の見張りカスパーだけに聞こえる山の鐘 | events_w6_region.js:w6g_deserter | events_w6_region.js:w6g_bell | 回収済み | |
| 薬草摘みの娘と獣人の弓兵の市の日の約束 | events_w7_eld.js:w7_eld_promise | events_w7_eld.js:w7_eld_archer・events_w7_eld.js:w7_eld_chapel | 回収済み | |
| 灯台守は沖の歌に歌い返すか | events_w7_vol.js:w7_vol_keeper | events_w7_vol.js:w7_vol_answer・talk_guido.js:guido | 回収済み | |
| 帝国の脱走兵の、北の村の女への手紙 | events_w7_zai.js:w7_zai_deserter・events_w7_zai.js:w7_zai_letter | ― | 未回収 | 預かった後の出来事も印も無い |
| 絵描きが毎朝溶いて待つ水の色 | events_w7_sal.js:w7_sal_easel | ― | 取り下げてよい | |
| 看守の食い違う皇女の婿の噂 | events_w7_gri.js:w7_gri_rumor | ― | 余白 | |
| レヴァンデルの子の約束の相手 | events_w7_rev.js:w7_rev_cry | events_w7_rev.js:w7_rev_chosen | 回収済み | |
| 鐘待ちの村の女の子の手紙→砦の北の隊の父 | events_w7c_rin.js:w7c_rin_letter | events_w7c_rin.js:w7c_rin_reply | 回収済み | |
| ハルトの子の白い物が戸口に戻ってくる | events_w7c_hal.js:w7c_hal_find | events_w7c_hal.js:w7c_hal_find2 | 回収済み | 像の背中の削り直しは余白 |
| オルベの老婆の石工の息子、聖都の大聖堂「仕事はとても静か」 | events_w7b_orb.js:w7b_orb_mother | lore_w7b_orb.js:mother | 未回収 | 聖都の地下（墓守の帳面）への匂わせ。噂だけ |
| 隊商頭「うちの隊商に会ったら名を言え」 | echo_f4_events.js:f4r_caravan_saved | ― | 未回収 | 印が無い |
| ケイルから預かった薬師の種 | echo_f4_events.js:f4r_cure_young | ― | 未回収 | 持ち物は薬草に化け、蒔く先が無い |
| 削られた玉座の獣の顔を何度も削り直す誰か | oldera_d6.js:d6_old_mural | events_w7c_hal.js:w7c_hal_statue | 余白 | 魔王 |
| 祈祷文「王の眠りを妨げるな」 | oldera_d6.js:d6_old_prayer | events_town2.js:v1_yuradream・e3_apostles.js:e3_meet_yura | 回収済み | 断片どうし。本当に眠っているかは余白 |
| 逆さの夢の子「起こそうとしてる人」 | events_town2.js:v1_yuradream | e3_apostles.js:e3_meet_yura・lore_u3.js:dream | 回収済み | 起こそうとする人が誰か（暁鐘会）は上の行 |
| 灰色の外套の旅人（八件） | walker_d6.js:d6_w_shrine | ― | 余白 | GM も決めない |
| 地図売りの地図の裏の子どもの落書き（崖と穴と矢印） | events_w8_wild.js:w8p_conman | ― | 未回収 | 地図の先の出来事が無い |
| 北の谷の母の畑へ帰る脱走兵 | events_w8_wild.js:w8p_deserter | events_w8_wild.js:w8p_deserter | 回収済み | 同じ出来事の中の畑の若い男。頭のコメントの「後編 w8_deserter2」は無い |
| ゴルモアの食糧庫の木箱「まだ噂になっていない町の名」 | events_e2.js:e2_kitchen_larder | e2_lair.js:STOP | 回収済み | 長編の結末 |
| 黒鎧 after「空の城」荒野の魔物が城へ | e3_apostles.js:graw.after | e3_apostles.js:e3_after_graw・epilogue_m6.js:majin | 回収済み | 一度きりの出来事と人生の物語だけ。城の中は変わらない |
| 灼け口 after「冷めた谷」飢饉の襲来が止む | e3_apostles.js:gormore.after | e2_lair.js:STOP・e3_apostles.js:e3_after_gormore | 回収済み | |
| 苔衣 after「枯れた花畑」庭の広がりが止む | e3_apostles.js:mordu.after | e2_lair.js:STOP・e3_apostles.js:e3_after_mordu | 回収済み | 獣の病（M9）はベルナの病なので止まらないのは設定どおり |
| 忘れ水 after「乾いた書庫」 | e3_apostles.js:levian.after | e3_apostles.js:e3_after_levian | 未回収 | 遺構の眷属（滲み文字・溺れ人）は討ったあとも出る |
| 微笑 after「踊りの終わった町」踊りの襲来が止む | e3_apostles.js:mirza.after | zz_e3_apostles.js:STOP | 回収済み | |
| 砂塵 win「町じゅうの借金が白紙」 | e3_apostles.js:zalve.win | romance_zalve.js:alive・e3_apostles.js:e3_after_zalve | 回収済み | 恋の筋は止まる |
| 砂塵 討伐後もボルグの取り立てが来る | e3_apostles.js:zalve.win | ― | 未回収 | events_town2.js:v1_debt は消えない。「白紙の帳面」と食い違う |
| 砂塵 砂の字『貸し、ひとつ』 | e3_apostles.js:zalve.win | ― | 未回収 | 貸しが何かは出ない |
| 蝶翅 after「聖女さまの病」 | e3_apostles.js:aurelia.after | e3_apostles.js:e3_after_aurelia | 未回収 | events_w1.js の聖女の出来事は討伐の印を見ない |
| 香煙 after「祭りの終わり」 | e3_apostles.js:yoihime.after | ― | 取り下げてよい | 倒せない使徒（e8_unslay.js:yoihime）。古いセーブでしか起きない |
| 百面 after「婿取りの盤がひっくり返った」 | e3_apostles.js:chezar.after | e3_apostles.js:chezar | 回収済み | m12_events.js の砦の噂「北の賢人」は見ない |
| 逆夢 after「よく眠れる夜」 | e3_apostles.js:yura.after | ― | 取り下げてよい | 倒せない。zv3_c19_codex.js:yuraAlive だけが印を読む |
| 剣翼 after「刃の羽の尾根」空の襲来が止む | e3_apostles.js:azlag.after | zz_e3_apostles.js:STOP | 回収済み | |
| 海嘯 after「凪の港」 | e3_apostles.js:lugu.after | e3_apostles.js:e3_after_lugu | 未回収 | 船旅の沖の歌がもともと無い |
| 白霧 after「霧の晴れた荒野」闇市が散る | e3_apostles.js:notari.after | e3_apostles.js:e3_after_notari | 未回収 | events_wild2.js:v2_notari は討ったあとも市が立つ |
| 鉄喰い after「埋めなくていい夜」 | e3_apostles.js:tetsukui.after | e3_apostles.js:e3_after_tetsukui | 未回収 | events_w2.js:w2_iron は印を見ない |
| 咎追い after「静かな谷」 | e3_apostles.js:togaoi.after | e3_apostles.js:e3_after_togaoi | 未回収 | events_m3.js:m3_togaoi は討ったあとも追ってくる |
| 芽吹き・根の王の after | e3_apostles.js:midori.after・e3_apostles.js:sekaiju.after | ― | 取り下げてよい | 倒せない使徒 |
| 酸溜まり・黒翼・閉じ月の after | e3_apostles.js:sanno.after・e3_apostles.js:kurobane.after・e3_apostles.js:tojizuki.after | e3_apostles.js:e3_after_sanno | 回収済み | 一度きりで足りる |
| 倒せない使徒の鍵の断片（砦の燠・逆さ歌・去年の麦の種・根の上の嘘） | e3_apostles.js:e3_f_ember・e3_apostles.js:e3_f_lullaby・e3_apostles.js:e3_f_seed・e3_apostles.js:e3_f_root | ― | 取り下げてよい | 根の王・逆夢・芽吹きは倒せないので鍵は使われない。断片の文は残してよい |
| 霧の老人「……三つ先の冬だ」 | e3_apostles.js:e3_meet_notari | ― | 未回収 | 三つ先の冬に何も起きない |
| 破られた頁の目録「いずれ戻る」 | e3_apostles.js:e3_page | ― | 未回収 | |
| 目隠しの布を縫った娘が音信不通 | e3_apostles.js:e3_blindfold | enemies_e4_kin.js:e4k_whiteacolyte | 回収済み | ほのめかし（侍祭の部屋の祈祷布） |
| 消えた仮面の剣闘士（銀釘の札） | e3_apostles.js:e3_maskpin | enemies_e4_kin.js:e4k_nailer | 未回収 | 余白に寄せてもよい |
| 毒沼の庭師の老夫婦の行方 | e3_apostles.js:e3_f_shears | enemies_e4_kin.js:e4k_pruner | 未回収 | 同上 |
| 宿敵の抜け羽（城の壁に刺さった羽） | e3_apostles.js:e3_f_feather | e3_apostles.js:graw | 回収済み | 鍵の品 |
| 使徒どうしの縁（遊び仲間・金の貸し借り） | world.js:LORE_GM | enemies_e2.js:e2_mordu | 未回収 | GM 向け設定。噂一行で足りる |
| 眷属会（年に一度もめる） | world.js:LORE_GM | ― | 取り下げてよい | |
| 暁鐘会（千回の鐘・裏のディエラン） | world.js:LORE_GM | lore_u3.js:gyoushou・v17a_bells.js:v17a_bells | 回収済み | V17a（t05）：帝都の鐘楼で数を数える・苦情・何も起きない。ディエランは出さない |
| 夜哭城・眠らずの番兵オルド | world.js:MAJIN | v17b_threads.js:v17b_ordo・v17b_ordo_gate | 回収済み | 持ち主の決定（2026-10-13）で 場所は作らず、灰の荒野の出来事の終点を城の外（泣く音のする谷）まで。オルドは門で会えるだけで戦わない。城の名・中は出さない |
| 天の巣・竜騎手カルラ | world.js:MAJIN | v17b_kin.js:e4k_karla | 回収済み | 持ち主の決定（2026-10-13）で 天の巣は場所にせず対面の場のまま。カルラは剣翼の眷属に一体（一度倒したら出ない。倒したあとは v2_egg も出ない） |
| 万巻の塔 | talk_banter_k9_c6c7.js:bt_k9_lh_beat | ― | 取り下げてよい | 水に沈んだ書庫に置き換え済み。ネタ台詞だけ |
| 明けずの町カルヴァス（オスリック卿） | world.js:LORE_GM | lore_u3.js:rumor・sanity_m5.js:END_MAD・v17a_karvas.js:karvas | 回収済み | V17a（t04）：場所 karvas。住人の話と家令の日記の三枚。朝を呼ぶ・館の奥はまだ無い |
| 黒騎士団長ハイデル（元四騎士） | world.js:MAJIN | v17b_threads.js（enemies.js:blackknight の lines.open） | 回収済み | 持ち主の決定（2026-10-13）で 人物の表には足さず、黒騎士の前口上で「団長ハイデル」の名が出るだけ |
| 王の仇討ち（黒曜の獣ゴルヴァン） | world.js:LORE_GM・events_c2.js:c2_valeon | v17a_golvan_1.js:SAGAS.golvan | 回収済み | V17a（t01）：依頼主は国王ヴァレオン。A 級・六章と終章 |
| 錆鎧の心核 | c2_people.js:c2_rustspawn | know_l1_foes.js:c2_rustspawn・v17a_rust.js:v17a_rust_core | 回収済み | V17a（t02）：炭鉱の奥で分かれ身と心核を砕く。本体は出さない |
| 取り立て屋ボルグ | world.js:MAJIN | events_town2.js:v1_borg | 回収済み | |
| 溺れ船長ギュスタ・腹の中の町 | world.js:MAJIN | zz_e10b_events.js:e10_lugu_bell | 未回収 | 鐘の舌の噂のみ。迷宮無し |
| 蠅の宰相ブンブ | world.js:MAJIN | zz_e10_events.js:e10_notari_fate | 回収済み | 名無しで登場 |
| 料理長マルミット（毒見役に毒） | world.js:MAJIN | enemies_e2.js:e2_marmit | 回収済み | |
| 残りの使徒の長編（A・S 級の雛形） | e7_0_saga.js:SAGAS | e7_mirza_1.js:e7m_1・v17a_graw_0.js:SAGAS.graw・v17a_golvan_1.js:SAGAS.golvan | 回収済み | V17a（t06・t01）：黒鎧と黒曜の獣の A 級の長編。S 級はまだ |
| 灼け口：大食い・皿洗い・食材として追われる | world.js:MAJIN | events_e2.js:e2_gormoa_table | 回収済み | 献上は蜂蜜の焼き菓子（鍵）で代替 |
| 砂塵：借金・抜け穴・取り立てから逃げる | world.js:MAJIN | events_town2.js:v1_zalve・romance_zalve.js:zalve | 回収済み | |
| 蝶翅：奇跡・告発・審問から逃げる | world.js:MAJIN | events_w1.js:w1_believer・events_w1.js:w1_exposed・events_w1.js:w1_inquisition | 回収済み | |
| 香煙：丁半・踊り比べ・神隠し・月見の問答 | world.js:MAJIN | events_w1.js:w1_yoidice・events_w1.js:w1_dance・events_w1.js:w1_kamikakushi・events_w1.js:w1_moonriddle | 回収済み | |
| 苔衣：被験体・病の種を盗む | world.js:MAJIN | events_town2.js:v1_plague・m9_plague.js:m9_needles | 回収済み | 種を井戸に投げる筋は無し |
| 百面：盤上遊戯で勝負・企みを暴く | world.js:MAJIN | explore_w2.js:third | 未回収 | 駒として雇われるだけ。「勝った者とだけ戦う」は e3 の keys にも無い |
| 逆夢：夢の問答・夢の取引 | world.js:MAJIN | ― | 取り下げてよい | 持ち主の決定で S 級は会話にならない |
| 剣翼：卵を返す・背に乗る | world.js:MAJIN | events_wild2.js:v2_egg・events_wild2.js:v2_ride | 回収済み | ただし印は使徒の対面につながらない（上の v2 の行） |
| 山の村の生贄のくじ | world.js:LORE_GM | lore_u3.js:kuji・zv3_prose_v15.js:e3_after_azlag | 回収済み | 噂と、刃の羽の村のくじの箱。くじを引く場面そのものは無い |
| 海嘯：歌に答える・積荷を捧げる・呑まれる | world.js:MAJIN | v17b_threads.js:w6v17b_sea_song | 回収済み | 持ち主の決定（2026-10-13）で ヴァレンツァ〜シェルアークの夜の船旅に沖の歌（灯台の港と同じ四つの音）。答える・答えない。積荷を捧げる・呑まれるは作らない |
| 白霧：霧の市・一言の問答・場所代 | world.js:MAJIN | events_wild2.js:v2_notari・zz_e10_events.js:e10_notari_fate | 回収済み | |
| 忘れ水：記憶を売ると知識／正気が戻る | world.js:LORE_GM | ― | 未回収 | e3_apostles.js:e3_meet_levian は挑む・覗く・去るだけ |
| 日傘の札「持ち主が取りに来る」 | e7_mirza_1.js:e7m_2 | e7_mirza_4.js:e7r_parasol | 回収済み | |
| 記録「骨を折れ。一本では足りぬ」 | e7_mirza_1.js:e7m_3_lib | e7_mirza_4.js:e7m_9_last | 回収済み | |
| ヴィルマ「顔を捨てる気ならまた来な」 | e7_mirza_1.js:e7m_3_old | e7_mirza_3.js:e7m_8_price | 回収済み | |
| ロザ「十年前の絵描き」「付けを払ってやれ」 | e7_mirza_1.js:e7m_3_rope | e7_mirza_2.js:e7m_4 | 回収済み | |
| フィーネ「あいつの顔を見たら教えて」 | e7_mirza_2.js:e7m_4b | e7_mirza_4.js:e7m_10 | 回収済み | |
| 屋根の糸が夜だけ東へ光る | e7_mirza_1.js:e7m_2b | ― | 取り下げてよい | 印 roof を読む所無し。軽い |
| リュドガー「最後の小節」 | e7_mirza_1.js:e7m_2b | e7_mirza_4.js:e7m_10 | 回収済み | 印 song 自体は読まれない |
| ベルトラン「勝った顔を描かせろ」 | e7_mirza_4.js:e7m_9 | e7_mirza_4.js:e7m_9_last | 回収済み | |
| ベルトランの付け「親父に払っといてくれ」 | e7_mirza_4.js:e7m_9_last | e7_0_saga.js:ends | 未回収 | 帳面が開いたままの結末だけ。払う場面が無い |
| 鉄鍋団「旗に名を」「帰ったらもう一度飲め」 | e7_mirza_3.js:e7m_8_host | ― | 未回収 | 軽い |
| オズヴァルト「糸に負けたら持ってこい」 | e7_mirza_3.js:e7m_8_arms | ― | 取り下げてよい | |
| ハルトヴィヒ「二十年前の御前試合」 | e7_mirza_3.js:e7m_8_train | talk_bertrand.js:bertrand_p3 | 回収済み | 答えは出さない形 |
| 若君「また来てね。席は空けておくよ」 | e7_mirza_3.js:e7m_7 | e7_mirza_4.js:e7m_9c | 回収済み | |
| 吊られた村の糸（断つ・触れない） | e7_mirza_2.js:e7m_5 | e7_mirza_4.js:e7r_cut・e7_mirza_4.js:e7r_left | 回収済み | |
| ミュゼット「縫い留めたらどうなる」 | e7_mirza_2.js:e7m_6 | e7_mirza_4.js:e7m_9_last | 回収済み | |
| 伯爵さま「次の問答の日付の札」 | e8_unslay.js:yuzuel | events_c5.js:c5_debate | 回収済み | |
| 告解「鬼の島…竜の骨…ふたつ」 | c10_choices.js:heretic | events.js:heretic・locations.js:graveyard | 回収済み | 二つの伝説の武具 |
| 受付「徴税吏が三人続けて行方知れず」 | c10_fac.js:guild | ― | 未回収 | memo だけ |
| 仲買「次の新月、港の倉で盗品の競り」 | c10_fac.js:alley | ― | 未回収 | |
| 盗賊宿「東の屋敷の番犬は干し肉で」 | c10_fac.js:alley | ― | 取り下げてよい | |
| 偽の赦免状の卸元（港の写字屋） | c10_choices.js:m3_pardon | ― | 未回収 | |
| 賭け屋「四騎士の一人は古傷で左膝」 | c10_choices.js:w2_bookie | ― | 未回収 | |
| 口入れ屋「前の組が帰らない塔」 | c10_choices_w4.js:w4_v_contract | ― | 未回収 | |
| 議員が帝国の商人から金を受けた書状 | c10_choices_w6.js:w6g_envoy | ― | 未回収 | |
| 差配人の年貢の上乗せ（名を書きとめた） | c10_choices_w6.js:w6g_wheat | ― | 未回収 | quest_c9_d.js の「差配人」は別件 |
| 徴兵の名簿に自分の名を書いた | c10_choices.js:v1_conscript | ― | 未回収 | 「来なかったら好きにしろ」の約束 |
| 闇の隠れ家「借りが一つできた」 | c10_choices.js:m3_chase | ― | 未回収 | |
| 審問官「……いずれ、また」 | c10_choices.js:w1_inquisition | events_w1.js:w1_inquisition | 回収済み | vespaAlive で繰り返す |
| 婿の噂の紙切れの小さな丸 | c10_choices_w4.js:w4_v_bride | ― | 取り下げてよい | |
| 古い字「ここより先、名を呼ぶな」 | c10_choices_tpl.js:script | ― | 取り下げてよい | |
| 嘴の医者の針の札（町の名と日付） | m9_plague.js:m9_needles | lore_u3.js:beast・world_events_m4.js:m4_plague_mask | 回収済み | |
| 忘れ名の冠の削られた名・七つの墓標 | items_m5.js:m5_namecrown | sanity_m5.js:crown | 回収済み | |
| 刻印の環の空いた枠と小さな人の形 | world.js:LORE_GM | ― | 余白 | |
| 光の壁の向こう（974 年の艦隊） | world.js:LORE_GM・epilogue_m6.js:m6_wall | ― | 余白 | 印 m6_wall_seen は読まれないが、壁の向こうは余白 |
| 魔王を殺したのは誰か・夜哭城が泣く理由 | world.js:LORE_GM | ― | 余白 | |
| 神々は死んだのか去ったのか | world.js:LORE_GM | ― | 余白 | |
| 討たれた使徒は本当に死んだか | world.js:LORE_GM・e3_apostles.js:e3_f_bell | ― | 余白 | |
| ベルファスが目を合わせない理由 | world.js:MAJIN | ― | 余白 | |
| ベルナが善意か研究か | enemies_e2.js:e2_berna | ― | 余白 | |
| ルイを眠らせた者・本当の名 | world.js:LORE_GM・zc2_lore.js:c2_rui | ― | 余白 | |
| 閉じ月は創世神の眼か | world.js:LORE_GM | ― | 余白 | |
| ヴォルグリムの鉤が強い方へ向く理由 | world.js:LORE_GM・f2_sequel.js:f2r_tsuba_sold | ― | 余白 | |
| 爺さんの店の本の行方（港湾税則・第三版） | c2_people.js:dil・talk_dil.js:dil_a1 | quest_c9_a.js:dil | 回収済み | 爺さんは死んだ（talk_dil.js:dil_p5）。canon の「生死」は本文で決まっている |
| 港の役所で指を折られた | romance_dil.js:dil | quest_c9_a.js:dil | 回収済み | 取り立て屋・写し場 |
| ずるい手の決まり「三つ目は生き延びたら教える」 | talk_dil.js:dil_b1 | talk_dil.js:dil_b2 | 回収済み | |
| 本の代金「借りはちゃんと返す。いつか」 | talk_dil.js:dil_a1 | ― | 取り下げてよい | 小さな借り。返す場面は要らない |
| 親を殺した仇（顔を見ていない） | c2_people.js:kaidel | quest_c9_b.js:kaidel | 回収済み | 仇が誰かは余白 |
| 壊した物「金で返す。いつか」 | talk_kaidel.js:kaidel_a1 | ― | 取り下げてよい | 冗談の筋 |
| 村を潰した化け物の正体 | c2_people.js:nora・talk_nora.js:nora | quest_c9_b.js:nora | 回収済み | 峰の洞の獣・古い布。獣が何かは語らない＝余白。探す姿（f4_roster.js）は潰したものに行き当たらない |
| 長老との喧嘩「大っきらい」（家出） | c2_people.js:nora | quest_c9_b.js:nora | 回収済み | 表の secret は家出、R9 の芯は追試＝二通り |
| 長老の弓で「いつか一本だけ当てる」 | talk_nora.js:nora_a1 | ― | 未回収 | 当たる場面が無い。romance_nora.js の当てっこは別物 |
| 料理番の娘ミーナ | talk_sheila.js:sheila | quest_c9_b.js:sheila | 回収済み | 表（c2）に無い |
| 前の城主の日記が文の途中で終わる | talk_sheila.js:sheila_p3 | quest_c9_b.js:sheila | 回収済み | |
| 鍵のかかった棚 | c2_people.js:sheila | quest_c9_b.js:sheila | 回収済み | 書庫の奥の棚 |
| 第七王子だと自分から言わない | talk_sheila.js:sheila | events_c2.js:c2_siblings | 回収済み | |
| 銀の札の名・ルヴェナール王女・封印した者 | c2_people.js:rui・talk_rui.js:rui | quest_c9_b.js:rui | 余白 | 答え合わせはしない |
| 二つの峰の山「いつか一緒に探そう」 | talk_rui.js:rui_p5 | quest_c9_b.js:rui | 回収済み | 山の絵 |
| 顔を思い出せない誰かの歌 | c2_people.js:rui | quest_c9_b.js:rui | 回収済み | 誰かは余白 |
| 騙した男（帳面の最後の頁） | c2_people.js:zerina | quest_c9_b.js:zerina | 回収済み | 正体・生死は余白。騙された歳 十六／十二 の揺れ |
| 妹ピア | talk_zerina.js:zerina | quest_c9_b.js:zerina | 回収済み | 表（c2）に無い |
| 鏡を見るなと言われたわけ | c2_people.js:elnea | quest_c9_b.js:elnea | 回収済み | 映った物は余白 |
| 里の母さんへ出していない手紙 | talk_elnea.js:elnea_p5 | talk_elnea.js:elnea_b2 | 回収済み | 取次所の箱 |
| 十指に選ばれた日を覚えていない | c2_people.js:natalia | quest_c9_b.js:natalia | 回収済み | 師を「じいさま」30 回・「師匠」9 回（talk_natalia.js）。揺れは残る |
| 空いた一席ユリナ | talk_natalia.js:natalia_c_yurina | events_c2.js:c2_yurina | 回収済み | |
| 弟子の娘（眷属ミュゼット） | c4_people.js:bertrand | events_c4.js:c4_mus_bert・e7_mirza_2.js:e7m_6 | 回収済み | |
| 弟子の絵に「いつか目を描く」 | romance_bertrand.js:bertrand・talk_bertrand.js:bertrand_p2 | ― | 余白 | 最後の一筆が入らないのが芯 |
| 二十年前の十指だったか | c4_people.js:bertrand | ― | 余白 | 噂のまま |
| 策を漏らした者 | c4_people.js:ilse | quest_c9_c.js:ilse | 回収済み | 漏らした者は余白。坊ちゃまとの勝ち負けが R9 で二通り |
| 坊ちゃま「いつか、わたしが…」（読ませたい策） | c4_people.js:ilse・talk_ilse.js:ilse_p3 | quest_c9_c.js:ilse・romance_ilse.js:ilse | 回収済み | 盤 |
| 帳面の余白の字 | talk_ilse.js:ilse | events_c4.js:c4_ilse_book | 回収済み | |
| 宮廷の書記（イルゼとイングリットが同じ相手を探している） | c7_people.js:ingrid・talk_ingrid.js:ingrid_m_ilse | ― | 未回収 | quest_c9_e.js:ingrid の書記とイルゼの筋はつながっていない。同じ人かは決めていない |
| 父の死の日（ハルトムートの崩れと同じ日か） | c4_people.js:tula・c7_people.js:hartmut | quest_c9_c.js:tula・quest_c9_e.js:hartmut | 回収済み | 同じ日かは表に無い＝余白 |
| 底の抜けた靴 | c4_people.js:tula | quest_c9_c.js:tula | 回収済み | ゲオルクと靴屋 |
| ちびども五人を宿の寝台に「いつか、連れてこよう」 | talk_tula.js:tula_n2 | ― | 未回収 | 「兄貴が言ったんだからな。覚えとくからな」と念を押している |
| アンネリーゼとの腕相撲「まだ決着ついてない」 | talk_banter_k8_d.js:tula・talk_annelise.js:annelise_m_tula | ― | 余白 | 決着を付けない掛け合い |
| 東の海へ出た許嫁の生死 | c4_people.js:mirlene | quest_c9_c.js:mirlene・romance_mirlene.js:mirlene | 回収済み | 生死は余白。凍った湖の経緯が二通り |
| 手紙を自分で届けに行く約束 | talk_mirlene.js:mirlene_b2 | romance_mirlene.js:mirlene | 回収済み | 求婚の条件 |
| 港の役人三代へのお礼「いつかまとめて」 | talk_mirlene.js:mirlene_p3 | quest_c9_c.js:mirlene | 回収済み | 老役人の退き祝い |
| 十個目の輪「今はまだ、言えない」 | c5_people.js:bruno・talk_bruno.js:bruno_p3 | quest_c9_c.js:bruno | 回収済み | |
| 見習いリタ（膝の腱） | c5_people.js:trude・talk_trude.js:trude_p6 | quest_c9_c.js:trude | 回収済み | R9：巻き込まれなかった／膝の下 で二通り |
| 上官の計算違い（赤い丸） | c5_people.js:trude | events_c5.js:c5_tru_officer | 回収済み | |
| 抱えて泳いだ娘シオネ | c5_people.js:souhaku | quest_c9_c.js:souhaku・events_c5.js:c5_sou_tooth | 回収済み | 娘は知らないまま（設計） |
| 沈んだ島の名・沖の何か | c5_people.js:souhaku | ― | 余白 | |
| 灯台守の婆さまに六十年片思い | talk_souhaku.js:souhaku_p2 | ― | 余白 | 婆さま側の返事は書かない |
| 出稼ぎから帰らない父の穂先 | c5_people.js:adele・romance_adele.js:adele | quest_c9_c.js:adele | 回収済み | 父の行方は余白 |
| 畦の上の約束（麦畑へ必ず行く） | talk_adele.js:adele_b2 | romance_adele.js:adele・quest_c9_c.js:adele | 回収済み | 刈り入れ前の畦 |
| 妹の縁談 | c5_people.js:adele | talk_adele.js:adele | 回収済み | 話題止まり。縁談の行方は書かない |
| 百年森から出てこない兄への手紙 | c5_people.js:celestin | quest_c9_c.js:celestin | 回収済み | 返事の有無は余白 |
| 兄の結界の札がときどき光る | talk_celestin.js:celestin_p5 | ― | 余白 | 結界の仕組みは語らない |
| 最後に回した隊（七番目・ハンス・ヴァイス） | c5_people.js:felix | events_c5.js:c5_fel_list・quest_c9_c.js:felix・talk_felix.js:felix_c_after | 回収済み | |
| 徴税総監グラモンと二冊目の帳面（九軒目） | c6_people.js:lucien | quest_c9_d.js:lucien・events_c6.js:c6_ledger | 回収済み | |
| 家を出た妻と娘（娘の店） | c6_people.js:lucien | quest_c9_d.js:lucien・romance_lucien.js:lucien | 回収済み | 焼き菓子屋の娘。妻は出てこない |
| 森で消えた幼なじみ | c6_people.js:barnabe | quest_c9_d.js:barnabe | 回収済み | 名・行方は余白 |
| 賞金を騙し取った者 | c6_people.js:barnabe・talk_barnabe.js:barnabe_p3 | quest_c9_d.js:barnabe | 回収済み | 王都の酒場・隅の卓の頭 |
| 母マリオンの余分な白パン | talk_barnabe.js:barnabe | romance_barnabe.js:barnabe・quest_c9_d.js:barnabe | 回収済み | |
| 三百年探す病の名 | c6_people.js:selevan | quest_c9_d.js:selevan | 余白 | 書かない設定 |
| 一番古い帳面の最初の数頁が別の人の字 | talk_selevan.js:selevan_p6 | ― | 余白 | 答え合わせはしない |
| 学院に残した弟子・追われた理由の一行 | c6_people.js:selevan | quest_c9_d.js:selevan | 回収済み | 弟子の手紙 |
| 「最後の頁の約束」（治し方が見つかった日） | talk_selevan.js:selevan_b2 | ― | 余白 | 見つかる日は来ない前提 |
| 先々代の王の影の盾・守れなかった夜 | c6_people.js:aubin | quest_c9_d.js:aubin | 回収済み | |
| 馬にだけ話す約束「死ぬまで」 | talk_aubin.js:aubin_p6 | ― | 余白 | 何の役だったかは言わない |
| 師匠シルヴェストルを斬る夢（憎むか恩か） | c6_people.js:lazare | quest_c9_d.js:lazare | 回収済み | 決めないのが芯 |
| 師匠が毎晩つぶやく二つの言葉 | talk_lazare.js:lazare_p6 | quest_c9_d.js:lazare | 回収済み | |
| 壁の字「いつか読む。読めたら最初にあんたに」 | talk_lazare.js:lazare_p4 | ― | 未回収 | 読める日の場面が無い |
| 吊るした子の弟への名無しの仕送り | c6_people.js:rodolphe | quest_c9_d.js:rodolphe | 回収済み | |
| 梁の縄 | c6_people.js:rodolphe | quest_c9_d.js:rodolphe・events_c6.js:c6_rod_snare | 回収済み | |
| 前の番人ブルクハルト（半分だけ吊るした） | talk_rodolphe.js:rodolphe | ― | 余白 | talk にしか出ない名。許し状で「爺」として触れるだけ |
| 許し状を返しに行く「北の沢から入る」 | talk_rodolphe.js:rodolphe_b2 | ― | 未回収 | 一緒に猟場へ戻る場面が無い |
| 砦の爆破で火を点けた者（今は代官） | c6_people.js:margot | quest_c9_d.js:margot | 回収済み | |
| 質札が一月で流れる剣 | c6_people.js:solenne | quest_c9_d.js:solenne | 回収済み | |
| 次席ベランジェールが裏で利子を払う | talk_solenne.js:solenne・romance_solenne.js:solenne | quest_c9_d.js:solenne・events_c6.js:c6_ber_debt | 回収済み | 本人は知らないまま |
| 父が娘の負けに賭けた御前試合 | talk_solenne.js:solenne_p6 | quest_c9_d.js:solenne | 回収済み | |
| 削れていない名（海を見たがった子） | c6_people.js:pipinelle | quest_c9_e.js:pipinelle | 回収済み | 子が誰かは余白 |
| ピピネルが何者か（森がざわつく） | talk_pipinelle.js:pipinelle | ― | 余白 | 説明しない設定 |
| 森の奥の名を言わない何か | c6_people.js:lisette | quest_c9_e.js:lisette | 回収済み | 正体・大きさは余白 |
| 柄だけ古い槍を誰にもらったか | talk_lisette.js:lisette_p2 | quest_c9_e.js:lisette | 余白 | 「誰にもらったにしろ」 |
| 檻を齧って出た／見逃された | talk_lisette.js:lisette | ― | 余白 | R9 二通り |
| 焼けと命じられた村の名 | c7_people.js:wolfram | quest_c9_e.js:wolfram | 余白 | 名は書かない |
| 「三人には言った。三人目は」 | talk_banter_k9_c6c7.js:wolfram | talk_banter_k9_c6c7.js:sieglinde | 回収済み | 同じ掛け合いの中 |
| 死んだら勲章を川に放る頼み | talk_wolfram.js:wolfram_b2 | ― | 未回収 | 仲間の死の場面（M2 die）で拾える |
| 届かなかった一人の札の番号 | c7_people.js:hartmut | quest_c9_e.js:hartmut | 回収済み | 誰のかは言わない |
| 酒場の娘リーゼルへの詩の返事 | c7_people.js:hartmut | quest_c9_e.js:hartmut | 回収済み | 返事が来た |
| 詩を紙で渡す「読むときは俺のいねえところで」 | talk_hartmut.js:hartmut_a2 | ― | 未回収 | 渡す場面が無い |
| 同じ鎖の値の合わなかった子 | talk_gustav.js:gustav_p6 | quest_c9_e.js:gustav | 回収済み | 行方は余白 |
| 買い戻す子どもたち（あと十一人）・オトマール | c7_people.js:gustav | events_c7.js:c7_gus_offer・quest_c9_e.js:gustav | 回収済み | |
| 帰らなかった兄・杭の向こう | c7_people.js:timo | quest_c9_e.js:timo・romance_timo.js:timo・talk_timo.js:timo_b2 | 回収済み | 兄の行方は余白 |
| 夜明けに同じ音の弦が鳴る | talk_timo.js:timo_p6 | quest_c9_e.js:timo | 余白 | 何の音かは言わない |
| 弦を張り替える日「そのうち」 | romance_timo.js:timo | romance_timo.js:wed | 回収済み | |
| 帰らなかった先輩・帳面の白い最後の頁 | c7_people.js:noeris | quest_c9_e.js:noeris | 回収済み | 先輩の行方・遺構の底は余白 |
| 角の欠けた骰子「いつかお返しする約束」 | talk_noeris.js:noeris_c_dice | quest_c9_e.js:noeris | 回収済み | 骰子を十九段目に置く。預け主が先輩とは書かない |
| ティッタ（同じ先輩を追う） | c7_people.js:noeris | quest_c9_e.js:noeris・talk_noeris.js:noeris_a1_done | 回収済み | |
| 握り潰された報告書・宮廷の書記（指の形） | c7_people.js:ingrid・talk_ingrid.js:ingrid_p3 | quest_c9_e.js:ingrid | 回収済み | なぜ止めたかは余白 |
| 最後に開いたのは先生（師匠） | talk_ingrid.js:ingrid_p2 | ― | 余白 | 断片だけ |
| 幹に刻む場所が無い（次の名） | c7_people.js:lumia | quest_c9_f.js:lumia | 回収済み | |
| 根もとの一つの名 | talk_lumia.js:lumia_p6 | ― | 余白 | 「そなたの名を刻む日が来たら隣に」で止める |
| ミルレーネの許嫁の出航を見送った | c7_people.js:lumia | talk_lumia.js:lumia・talk_banter_k7.js:lumia | 回収済み | |
| 署名した命令書・ディートリヒ | c7_people.js:sieglinde | quest_c9_f.js:sieglinde・quest_c9_e.js:wolfram | 回収済み | |
| 父が最後に打った剣・二枚目の質札 | c7_people.js:annelise | quest_c9_f.js:annelise | 回収済み | |
| 次席マティアスとの話（恋の筋に取っておく） | talk_annelise.js:annelise・c7_people.js:matthias | events_c7.js:c7_matt_ask・quest_c9_f.js:annelise | 未回収 | 登場のみ。恋の筋そのものは作っていない。zv3_c19_town.js:c7_matt_ask と c7_people.js の「父の帳面に首席を婿に」も本人が知る場面が無い |
| 黒い城から持ち出した剣の持ち主 | c7_people.js:radmila | quest_c9_f.js:radmila | 余白 | 持ち主は語らない。黒い城＝イズラの居城かも決めていない |
| ベルトランの布の剣「いつか、ほどいた所を見たい」 | talk_radmila.js:radmila_m_bertrand | ― | 未回収 | 抜く場面が無い（e7 の決戦はラドミラの目では語られない） |
| 退いた相手「いつか、もう一度」 | talk_radmila.js:radmila_e_fled | ― | 取り下げてよい | 相手は毎回違う |
| 逃がした人の子（見張り兵ヨナス） | c8_people.js:gigra | events_c8.js:c8_gig_jonas・quest_c9_f.js:gigra | 回収済み | 答え合わせはしない |
| 樽の底の名前（逃がした子／自分の本名） | c8_people.js:gigra | ― | 余白 | R9 二通り |
| 恋の話題「五と五」（gigra_v1/v2） | talk_gigra.js:gigra_v2 | q8_pairs.js:DENY | 取り下げてよい | 恋に進まない人なので出ない話題として残っている。romance_gigra.js も同じ |
| 竜の墓場の奥へ呼ばれた父 | c8_people.js:valdun | quest_c9_f.js:valdun | 回収済み | 生死は余白 |
| 増える鱗・自分も呼ばれる日 | c8_people.js:valdun・talk_valdun.js:valdun_b2 | quest_c9_f.js:valdun | 回収済み | 呼ばれる日は余白 |
| 霧の夜に見失った妻 | c8_people.js:gensai | quest_c9_f.js:gensai | 回収済み | 経緯は R9 で二通り |
| 霧の明けた朝に油が多く減る | talk_gensai.js:gensai | quest_c9_f.js:gensai | 回収済み | 誰が足すかは余白 |
| タキマルの借金を裏で肩代わり | c8_people.js:gensai | talk_gensai.js:gensai・talk_banter_k4.js:gensai | 回収済み | |
| 十三の名の無い墓・もとの名 | c8_people.js:tsuyuha・talk_tsuyuha.js:tsuyuha_p6 | quest_c9_f.js:tsuyuha | 回収済み | もとの名・出自は余白 |
| 顔を思い出せない一人 | c8_people.js:takimaru | quest_c9_g.js:takimaru | 回収済み | |
| 七十二枚目の場所 | c8_people.js:yurien | quest_c9_g.js:yurien | 回収済み | |
| 誰にも読ませない論文「あなたにだけ」 | talk_yurien.js:yurien_b2・talk_banter_k9_c6c8.js:yurien | quest_c9_g.js:yurien | 回収済み | 下書き・二本目の論文。読ませる場面そのものは無い |
| ルドガー所長 | c8_people.js:yurien | events_c8.js:c8_yur_rival・quest_c9_g.js:yurien | 回収済み | |
| 砦主に忘れられる名前・名札 | c8_people.js:roswitha | quest_c9_g.js:roswitha | 回収済み | |
| 砦主が何と引き換えに砦を立たせているか | talk_roswitha.js:roswitha_p6 | quest_c9_g.js:roswitha | 回収済み | 署名の書付。引き換えの中身は余白（「知らないことにしています」） |
| 猟兵頭ゼルギスが連れ戻しに来る | c8_people.js:izra | events_c8.js:c8_izra_hunt・quest_c9_g.js:izra | 回収済み | |
| 城の奥で一晩に何があったか「全部はまだ話せない」 | c8_people.js:izra・talk_izra.js:izra_b1 | quest_c9_g.js:izra | 余白 | 黒い羽は矢に。居城の主も書かない |
| 黒い羽を捨てる場所 | talk_izra.js:izra_p3 | talk_izra.js:izra_b2 | 回収済み | |
| 思い出せない弔いの一節（破った頁） | c8_people.js:anselmo | quest_c9_g.js:anselmo | 回収済み | 十五年／三十年の揺れ（talk 頭書きと c8 secret） |
| 盲目の娘リオネッタ | c8_people.js:anselmo | events_c8.js:c8_ans_hymn・quest_c9_g.js:anselmo | 回収済み | |
| 「わしの弔いはお前さんがやれ」 | talk_anselmo.js:anselmo_b2 | ― | 未回収 | 死の場面（M2 die）で拾える |
| 鳴らし遅れた夜の村にいた息子 | c8_people.js:polf | quest_c9_g.js:polf | 回収済み | 粉屋。生死は決めない＝余白 |
| 鐘楼で居眠り | c8_people.js:polf | events_c8.js:c8_polf_late・quest_c9_g.js:polf | 回収済み | |
| 先代の帽子（飽きて沼へ） | cz_c12_people.js:ortensia | quest_c9_c12.js:ortensia・romance_ortensia.js:ortensia | 回収済み | |
| 自分もいつか飽きて出ていくのでは（fate 裏切り） | cz_c12_people.js:ortensia・talk_ortensia.js:ortensia | romance_ortensia.js:ortensia・talk_ortensia.js:ortensia_b2 | 回収済み | fate の去る場面は ending_m6.js 側 |
| 削られた行の三文字・夢の続き | cz_c12_people.js:ismene | quest_c9_c12.js:ismene | 回収済み | 中身は余白。fate は一人で遺構へ |
| 書くことを許さなかった里の家族 | cz_c12_people.js:ismene・talk_ismene.js:ismene_p2 | ― | 余白 | 里へ戻る筋は無い |
| 「自分の名前も書いてくれるか」→「書きません」 | talk_ismene.js:ismene_a2 | romance_ismene.js:ismene | 回収済み | 余白にあなたの名前 |
| 置いていった檻の一座 | cz_c12b_people.js:shano | quest_c9_c12b.js:shano | 回収済み | |
| 大きな都の高い塔「いつか、怒られない日に上る」 | talk_shano.js:shano_l_tower | ― | 取り下げてよい | 拾うなら王都・首都で一度 |
| 深みで上がってこなかった妹 | cz_c12b_people.js:otose | quest_c9_c12b.js:otose | 回収済み | 妹の綱を握っていたのは「自分」（talk_otose.js）と表の「母」で二通り |
| 深みへ「いつかね」（シャノに） | talk_shano.js:shano_m_otose | quest_c9_c12b.js:otose | 回収済み | 綱を握って深みまで送る |
| 帰らなかった兄の船・消えた灯の夜 | cz_c12b_people.js:guido | quest_c9_c12b.js:guido | 回収済み | 沖の歌の正体は余白 |
| 名の無い仲間の去り台詞「あんたを見つけたらこうする約束だった」 | companions_m2.js:cold | ― | 余白 | 誰との約束かは語らない設計 |
| ギャロ商会の証文 | quest_c9_a.js:dil[1] | quest_c9_a.js:dil.ends | 回収済み | |
| 塩じゃない塩を運んだ船の荷主 | quest_c9_a.js:dil[1] | ― | 未回収 | 他の「荷主」（talk_bruno・talk_ilse）は別物 |
| ギャロの息子 | quest_c9_a.js:dil[3] | ― | 取り下げてよい | 名だけ |
| 前の城主「馬だけ戻った」 | quest_c9_b.js:sheila[2] | ― | 未回収 | |
| 北の水門の新しい鉄の扉と錠前の印・『第七の』を消した跡 | quest_c9_b.js:sheila[2]・quest_c9_b.js:sheila[3] | ― | 未回収 | 「毎月、包みに付いてくるのと同じ」印の送り主も無い。sheila.ends.pursue が「いつかの今夜」と言うだけ |
| 丘の宿場の四つの印と娘たち | quest_c9_b.js:sheila[4] | ― | 未回収 | |
| 長老の矢に付いた灰色の毛 | quest_c9_b.js:nora[2] | ― | 未回収 | 「なんであいつの毛で」。events_m5 の灰色の毛は別の筋 |
| 洞の獣の首の布の縫い取り | quest_c9_b.js:nora[3] | events_m5.js:m5_oldbeast | 余白 | 同じ意匠を m5 の獣が持つ。同じ獣なら回収済み |
| オルガ婆 | quest_c9_b.js:nora[2] | quest_c9_e.js:timo | 回収済み | 再登場 |
| 息子は沢で見つからなかった | quest_c9_b.js:kaidel[2] | ― | 未回収 | |
| 背中の布にくるんだ長いもの | quest_c9_b.js:kaidel[3] | ― | 未回収 | |
| 流れの名前の頭が同じ（結末の掛け合い） | quest_c9_b.js:kaidel.ends | ― | 未回収 | 結末の掛け合いで新しく張った糸 |
| 北の宿場で背中から殴った爺さん「春になったらな」 | c15_talk_a.js:kaidel | ― | 未回収 | |
| 赤い髪の糸目の女 | quest_c9_b.js:natalia[1] | talk_natalia.js:natalia_c_yurina・zc2_lore.js:c2_jusshi | 回収済み | C9 内では名を言わない |
| 前の第一席（片腕・焼き菓子屋） | quest_c9_b.js:natalia[3] | quest_c9_b.js:natalia[4] | 回収済み | natalia は「じいさま」、gauthier は「お前の師匠」と呼ぶ（呼び方の食い違い） |
| 腹の扉の中の娘 | quest_c9_b.js:bertrand[2] | e7_mirza_2.js:e7m_6・e7_mirza_4.js:e7m_9_last | 余白 | 使徒の筋に任せている |
| 床板の下の広場の絵／二人斬った | c15_talk_a.js:bertrand | ― | 余白 | |
| ヴェルナー「十四人目」「十二人目で止まってる」 | quest_c9_c.js:ilse.ends・quest_c9_c.js:mirlene[2] | ― | 未回収 | 数の食い違い（同じファイルの中） |
| 「上手な字」「不要」の指図主 | quest_c9_c.js:ilse[3] | quest_c9_c.js:ilse.ends | 未回収 | 「後ろにいる誰かは、まだ分からない」で止める |
| 父ちゃんの札 四百十二 | quest_c9_c.js:tula[1] | talk_tula.js:tula_n1 | 回収済み | 四百十二は roswitha のくじ回数・ツユハの歳と同じ数 |
| 靴の二度目の代金の主 | quest_c9_c.js:tula[2] | ― | 未回収 | 「名前は言うなと言われとる」 |
| 第三艦隊 最後の便りの行方 | quest_c9_c.js:mirlene[2] | events_c4.js:c4_mir_harbor | 余白 | 「帰ったかどうか…書いていない」 |
| 北の入江へ泳いだ二つ目の影 | quest_c9_c.js:bruno[2] | quest_c9_c.js:bruno.ends | 余白 | |
| ジャンニさんの膝「港に戻ったら言う」 | c15_talk_a.js:bruno | ― | 未回収 | 他にジャンニ無し |
| 「軍から閉じておけ」「上から話すな」 | quest_c9_c.js:trude[2] | ― | 未回収 | |
| 浪人カガリ | quest_c9_c.js:souhaku[2] | ― | 取り下げてよい | 一度きり |
| 白い石「返事ではない、たぶん」 | quest_c9_c.js:celestin[2] | quest_c9_c.js:celestin.ends | 回収済み | |
| ハンス・ヴァイスの行方が枝ごとに違う | quest_c9_c.js:felix[3] | quest_c9_c.js:felix.ends | 回収済み | 「片腕で家に」「南へ出た」「娘が家に」（分岐の食い違い） |
| 帰った三人の残り二人 | quest_c9_c.js:felix[3] | ― | 余白 | |
| 三つ目の線の家の子「石を一つ」 | c15_talk_c.js:lucien | ― | 未回収 | |
| 手紙の真ん中（バルナベ） | quest_c9_d.js:barnabe[1] | quest_c9_d.js:barnabe.ends | 余白 | |
| 荷の底の紐「来年」 | c15_talk_c.js:barnabe | ― | 未回収 | |
| 塗り潰された名＝「一番ええ脈の方」 | quest_c9_d.js:selevan[2] | talk_selevan.js:selevan_p5 | 余白 | |
| 馬の名付け親 | quest_c9_d.js:aubin.ends | talk_aubin.js:aubin_c_apricot | 回収済み | 名付けは会話の返事「干し杏」でだけ起きる。選んでいないと C9 の「名付け親」が浮く |
| 二つの名（アルノー・ミレイユ） | quest_c9_d.js:lazare[2] | quest_c9_d.js:lazare.ends | 余白 | |
| 誰が焚書監察に訴えたか | quest_c9_d.js:lazare[3] | ― | 未回収 | |
| 親父の分の小石 | c15_talk_c.js:margot | ― | 余白 | |
| 子爵 | quest_c9_d.js:solenne[2] | ― | 取り下げてよい | 一度きり |
| 首席の徽章「あなたに預けた」 | quest_c9_d.js:solenne[3] | talk_solenne.js:solenne_b1 | 回収済み | 預けるのは絆の場面 solenne_b1。経ていないと「預けた」が食い違う |
| 海を見たがった子＝エルマの母 | quest_c9_e.js:pipinelle[2] | talk_pipinelle.js:pipinelle_p6 | 余白 | |
| 三つの灯台守の婆さま（エルマ 79・港町／婆さま 81・島の都／灯台守グィド） | quest_c9_e.js:pipinelle[1]・quest_c9_c.js:bruno・quest_c9_c12b.js:guido | quest_c9_e.js:pipinelle[1]（灯台守のエルマ婆さん） | 回収済み | 持ち主の決定（2026-10-13）で 別人とする。名（エルマ）は港町ヴァレンツァの婆さまだけ。島の都・北の港の灯台守は名を出さない（今の文のまま） |
| 切り株の輪（木こりの村） | c15_talk_c2.js:pipinelle | ― | 余白 | wolfram の村・lumia の木こりの婆ハンネと混ざりやすい |
| 婆さまハンネ（二人） | quest_c9_e.js:wolfram[2]・quest_c9_f.js:lumia[1] | ― | 取り下げてよい | 同名別人 |
| 出てこない名（ハインツ） | c15_talk_c2.js:wolfram | talk_wolfram.js:wolfram_p2 | 回収済み | talk_wolfram では「一緒に出た兵の名は全部言える」と言う（食い違い） |
| 切り取られた一行／見舞い金 | quest_c9_e.js:hartmut[2] | ― | 未回収 | tula の家が見舞い金を受け取っていない（quest_c9_c.js:tula）と結べる |
| もう一人の鼠の子（北の坑道町）「いつか行く」 | quest_c9_e.js:gustav[1]・c15_talk_d.js:gustav | ― | 余白 | 二度「いつか」と言って開けている |
| 宮廷の医者（イングリット） | quest_c9_e.js:ingrid[2] | ― | 未回収 | 名も顔も無い |
| オーレン 春まで／封を切らぬ手紙 | quest_c9_f.js:lumia[2]・c15_talk_d.js:lumia | ― | 未回収 | 「開けたら帰ったか帰らぬか決まってしまう」と二度開けている |
| 参謀ケスラー＝ディートリヒ | quest_c9_f.js:sieglinde[1] | c7_people.js:dietrich | 回収済み | 本文は「ケスラー参謀」、who は dietrich。表記ゆれ |
| 鏡の廊下「扉は閉め忘れたりしない」 | quest_c9_f.js:radmila[3] | ― | 未回収 | |
| 街道につけられた俺の名「お前が聞いてきてくれ」 | c15_talk_d.js:valdun | ― | 未回収 | 聞ける場が無い |
| ロレンツォの帳面（顔役に渡した金） | quest_c9_f.js:gensai[2] | ― | 未回収 | gensai が懐に入れたまま。ロレンツォは他に無し |
| 砦主の記録の白い行「上の行のことは、いつか報告します」 | quest_c9_g.js:roswitha[2]・c15_talk_d2.js:roswitha | ― | 未回収 | hint は「古い帳簿に砦主の名」とまで言う |
| 千人目（女）・弦を弾く人（リオネッタの母？） | quest_c9_g.js:anselmo[1]・quest_c9_g.js:anselmo[2] | ― | 余白 | |
| 送り手の名（切られた頁） | quest_c9_c12.js:ismene[2] | ― | 未回収 | |
| 売られた十九人（残り十六人） | quest_c9_c12b.js:shano[2] | quest_c9_c12b.js:shano.ends | 余白 | 続きとして空けている |
| 潮見商会 | quest_c9_c12b.js:otose[3] | ― | 未回収 | 他に無し |
| 姪に本当を話す | c15_talk_d2.js:guido | ― | 余白 | |
| 領地の地図の『立ち入るな』の空白 | epilogue_m6.js:lord | epilogue_m6.js:soon | 余白 | |
| 聖都の列の老婆「三度目には目が合う」 | zv3_first.js:w1_holy | w9_spots_church.js:w9_staffs・zz_e10_events.js:e10_aurelia_pilgrims | 回収済み | 拝謁の先は聖女の筋 |
| ヒルデガルトの切られた頁・白い行の一文字「扉を閉じたのち」 | zv3_c19_town.js:c12_hil_hands・lore_w7b_mel.js:w7b_mel | zv3_c19_town_ev.js:c19_hil_ladder | 余白 | 続きは出ない。〔秘〕に近い |
| ピエトロの刻みの年「帳面の舟から呼び戻した」 | zv3_c19_town.js:c12_pie_ledger | zv3_c19_town_ev.js:c19_pie_flood | 未回収 | 呼び戻した舟・白紙の帳面の意味は出ない |
| レオポルトの番組表の丸の無い試合・父の死（毒見役のいない杯） | zv3_c19_town.js:c5_leo_coat・zv3_c19_town.js:c5_leo_poison | ― | 未回収 | 誰が組んだか・酒場の主の噂止まり |
| オデットの夫（海に出たきり上がらない） | zv3_c19_town.js:c6_ode_job | ― | 取り下げてよい | 泣き女の噂止まり。人物の味付け |
| ヴィットリオの棺の札の古い名前 | zv3_c19_town2.js:c5_vit_funeral | ― | 未回収 | 「金狼団」でない別の名。誰かは出ない |
| ネイラス「読めるのは四人、二人は死んでる」 | zv3_c19_royal.js:c2_neilas | ― | 未回収 | 残る一人は誰か |
| 皇帝「数えていたか」／北の陣の通行札（名の欄が空） | zv3_c19_royal_events.js:c19r_greiol_count | ― | 未回収 | 北の陣へ行く場面が無い |
| ネイラス「テオに紙越しなら会いたい」 | zv3_c19_royal_events.js:c19r_neilas_tray | v17b_threads.js:v17b_teo_go・v17b_teo_door | 回収済み | 持ち主の決定（2026-10-13）で テオを誘って研究所へ。扉越しに紙をやり取りする一場面。ネイラスは扉を開けない |
| セリオスの「三年探した顔」 | lore_w2.js:kyodai・zv3_c19_royal_events.js:c19r_serios_sketch | events_w2.js:w2_statue | 未回収 | 見つかる場面は無い（赤い髪の下絵は別の顔） |
| ヴァルグの傷「足りん」・落とし穴が翌朝五つに | zv3_c19_royal_events.js:c19r_valg_stitch | ― | 未回収 | 皇帝の言葉の意味・誰が掘るのか |
| ダリオ「あの子は九つで壁に寄らなくなった」 | zv3_c19_royal_events.js:c19r_dario_nine | ― | 未回収 | 誰のことか（皇帝？） |
| マルヴィナの最初の盾（地図に無い村・拾った人） | zv3_c19_royal.js:c2_malvina・zv3_c19_royal_events.js:c19r_malvina_shield | v17b_threads.js:v17b_malvina_village | 回収済み | 持ち主の決定（2026-10-13）で 二度目の場面。村の暮らしだけを話し、村の名・使徒の名・拾った人は言わない |
| アリシアに名を覚えられた前の六人の最後の一人 | zv3_c19_royal_events.js:c19r_alicia_council・events_c2.js:c2_alicia | ― | 未回収 | 「あと一人は知らん」 |
| モルヴァンの百年先の暦・「君の脈はまた今度」 | zv3_c19_royal_events.js:c19r_doctor_almanac | ― | 未回収 | 王国の博士（〔進〕）の続きが無い |
| ゲルトの祖父が東へ行った草の道 | zv3_c19_codex.js:c19_gert_fork | zv3_c19_codex.js:c19_gert_stone | 回収済み | 道の先（東）は出ない |
| 聖女の唇「上の方々より大きく聞こえるまで」 | zv3_c19_codex.js:c19_aur_night | ― | 余白 | 神々。印 c19_aur_read は読まれない（聖女の筋で触れてよいが、唇の中身は余白） |
| シグルンの消えた村「使徒にこっちを見させたい」 | zv3_prose_f2.js:f2_majin_5 | zv3_prose_f2b.js:f2r_sigrun | 未回収 | 使徒に見させる場面が無い（E3 の対面に結べる） |
| 看取った仲間の形見（届け先が分からない） | zv3_prose_m2.js:m2_farewell・events_m2.js:m2_farewell | ― | 取り下げてよい | 届ける仕組みが無い。形見は持ち物に残る |
| 空から降りて三歩だけ歩いた足跡 | zv3_prose_r3.js:r3_lead_tracks2 | ― | 未回収 | 何の足跡かは出ない |
| 靴屋の親方が取っておく靴底「また要る」 | zv3_prose_v15.js:e3_after_mirza | ― | 余白 | 討たれた使徒は本当に死んだか |
| 影の無い子「かえして、と言ったら返してくれた」 | zz_e10b_events.js:e10_kurobane_child | ― | 余白 | S 級は理屈を書かない |
| 一晩で老いた見張り「あれは数えていた」 | zz_e10b_events.js:e10_tojizuki_watch | ― | 余白 | 閉じ月 |
| 迷いの森の中にあった町（消された名）・消し跡がまだ温かい | zz_s6_events_tune.js:w6r_signpost・zz_s8_reasons.js:w6r_signpost | events_w6_road.js:w6r_signpost | 未回収 | 誰が名を消したかは出ない |
| 王都の門番の帳面の保証人の酒場 | zz_s8_reasons.js:w3_o_l_gate | ― | 取り下げてよい | その酒場は出ない |
| 水の都の誰のものでもない小舟（朝には戻る） | zz_a11_sights.js:w4_tulier | ― | 取り下げてよい | 情景 |
| 黒鎧の帳面の頁「あと一つで百」 | dungeon_w11_places.js:w11_mc_lore2 | boss_lines.js:rize | 回収済み | 頁を返す場面は無い（上の行） |
| 逆さの浮き彫りの顔を削られた玉座の獣 | dungeon_w11_places.js:w11_mc_lore1・w12_ruins.js:w12_ps_mural | ― | 余白 | 昔の魔王 |
| いちばん古い鎧の子どもの落書きのような丸 | dungeon_w11_places.js:w11_mc_lore3 | ― | 余白 | 刻印の環の彫りかけの人 |
| ゴズの削られた誓い「夜明けまで、門を」 | dungeon_w11_places.js:w11_og_lore3 | ― | 余白 | 鎖と香煙の女の関わりは〔秘〕 |
| 石の帳「ヴァ・エル」「名を呼べば竜は膝を折る」 | dungeon_w11_places.js:w11_gy_lore3 | w12_ruins.js:w12_nf_boast | 回収済み | |
| 王が何を願い、民がどこへ、向こうの灯がなぜ消えたか | w12_ruins.js:W12_SECRET | ― | 余白 | 古王国の滅び |
| 鉄冠岳の弁当箱「上で待ってる」 | w10_peaks.js:w10_drause・lore_w10.js:w10_drause | events_w10.js:w10_drause_foot | 余白 | 「鉄が呼ぶ」の正体は書かない |
| 囚人の母（ヴィナレ）に「生きている」と伝える | w8s_spots_empire.js:w8s_gris_visit | ― | 未回収 | 葡萄の町に受け取る場面が無い |
| 一号塔にいる四騎士の陣の甥・塔の灯りが囚人より一つ多い夜 | w8s_spots_empire.js:w8s_gris_visit・lore_w7_gri.js:w7_gri | events_w7_gri.js:w7_gri_lights | 未回収 | 余る灯りの主は出ない |
| 北の陣へ送った毛布三百枚が消えた・張り紙の一番下の皇帝の名 | w8s_spots_empire.js:w8s_garmund_court | ― | 未回収 | 拾う所なし |
| 鐘待ちの村の五つの鐘（誰も知らない） | w8s_spots_front.js:w8s_rine_field | events_w7_zai.js:w7_zai_bell | 未回収 | 村ごとの意味。五つが鳴る場面は無い |
| 最後の村の東の杭の向こう・金属の欠片・石の裏 | w8s_spots_front.js:w8s_halt_carver・lore_w7c_hal.js:w7c_hal | events_w7c_hal.js:w7c_hal_find | 余白 | 山の向こうの物の正体は出ない（lore の頭に「書かない」） |
| 峠の庵の主が会いたい者・九度目の荷・「山の向こうの客」 | w8s_spots_front.js:w8s_zalem_altar・lore_w7c_zar.js:w7c_zar | events_w7c_zar.js:w7c_zar_altar | 未回収 | 会いたい者・客が誰かは出ない |
| 『灰色の鷗』（諸島へ渡る途中で消えた） | w8s_spots_kingdom.js:w8s_nerva_horn | ― | 未回収 | 海嘯（歌に答えない船）に結べるが船名は他に出ない |
| 湖の島の祠の胸当て（四十年前、橋が落ちた年）・湖の主 | w8s_spots_kingdom.js:w8s_lignoa_lake・lore_w3_towns.js:w3_lake | events_w3_towns.js:w3_t_whistle2 | 未回収 | 同じ年らしいが結ぶ場面は無い |
| 昔の隊の生き残り三人（札の裏に居場所） | w8s_spots_kingdom.js:w8s_glatz_post | ― | 未回収 | 会いに行く場面が無い |
| 鑑定「時を数える物の一部」 | w8s_spots_kingdom.js:w8s_durm_shed | ― | 未回収 | 遺物の糸の一つ |
| 酒蔵の印の無い樽（国が一つ滅んだ日に開ける） | w8s_spots_kingdom.js:w8s_vinale_cellar・lore_w7b_vin.js:w7b_vin | ― | 取り下げてよい | 設定上は開かない |
| 王宮の獲物の間の空欄の札 | w8s_spots_kingdom.js:w8s_leavel_court | zv3_c19_royal_events.js:c19r_valeon_petition | 未回収 | 王が今追う物（ゴルヴァン）は出ない |
| 名前を削られた北の王国・滅んだ王国の金貨 | w8s_spots_kingdom.js:w8s_leavel_court・w9_spots_church.js:w9_relics・items_f3i.js:f3i_kingcoin | ― | 未回収 | 同じ糸か別かも決まっていない（バスロニア？） |
| 最古の板絵（三柱の真ん中が削られている） | w9_spots_church.js:w9_relics | ― | 余白 | 神々 |
| 年代記で使徒に名を付けた者（写字生の欄が破られている） | w9_spots_church.js:w9_scriptorium | ― | 余白 | 刻印の読みを出さない決まり |
| 今年は鬼の島へ舟を出さない（理由は言わない） | w9_spots_isles.js:w9_council | ― | 未回収 | 鬼ヶ島（明けの鎖）の筋に結べる |
| 奥の塩田だけ星を映さない・塩の山のてっぺんをならす | w9_spots_isles.js:w9_saltpan・lore_w7c_sol.js:w7c_sol | ― | 未回収 | わけは言わない |
| 真珠の入り江の砂の下の歌 | w9_spots_isles.js:w9_pearlcove | ― | 未回収 | 海嘯か島の下の息か |
| 霧鐘の島の火を入れない角灯の老婆 | lore_w7c_mis.js:w7c_mis | events_w7c_mis.js:w7c_mis_cove | 未回収 | 「あの人」が誰かは出ない |
| 星読み「星があなたを数え忘れている」「弓を持つ者を信じよ」 | w9_spots_republic.js:w9_sluice | ― | 未回収 | 予言の回収なし |
| 議場の床の契約の文（同じ言葉が二度） | w9_spots_republic.js:w9_senate | ― | 余白 | 世界樹〔秘〕 |
| 湯の町の湖の底の灯りの点いた町 | w9_spots_republic.js:w9_lake | ― | 未回収 | 番人の禁の理由は出ない |
| 議長の生まれた家（背丈の線が胸で止まる） | lore_w7_rev.js:w7_rev | ― | 未回収 | アリシア本人の場面に結ばれない |
| 教会の蝋燭が毎晩ひとり分多い「来訪者一。名前なし」 | lore_u3.js:book | ― | 余白 | 灰色の外套の旅人 |
| 三国の協定を結び直さない理由（1130年） | lore_u7.js:u7_pact・world.js:WORLD | world_m4.js:treaty | 回収済み | 結び直しの市は M4 の仕組み。理由は国ごとに食い違わせたまま |
| 見張り塔の鐘が三つより多く鳴った日・四本で終わる束・塔の数より一つ多い鐘 | lore_w3.js:w3_bells・lore_w3_wild.js:tally・lore_w4.js:w4_kane | ― | 未回収 | 番人のいない塔の最後の日 |
| 遺構の壺の封が内側から押し広げられていた | lore_w3_old.js:w3o_stairs | ― | 未回収 | |
| 兵の口笛「そこは吹くな」 | lore_w4.js:w4_kuchibue | events_w4.js:w4_k_whistle | 未回収 | 止めた理由は出ない |
| 緑の都の泉の向こう側（帰り道が違う） | lore_w7_eld.js:w7_eld_far | ― | 未回収 | |
| 辺境の掘り場のつるりとした板 | lore_w7_zai.js:w7_zai | events_w7_zai.js:u3_w7_zai_board | 未回収 | 見た坑夫が口をきかなくなった |
| 傭兵の町の同じ欠け方の判 | lore_w7b_gla.js:w7b_gla | ― | 未回収 | 雇い主の正体（ディエラン？） |
| 葡萄の町の祠「先に飲んだ者が」 | lore_w7b_vin.js:w7b_vin | events_w7b_vin.js:w7b_vin_shrine | 余白 | 続きは根に割られて読めない |
| 網の島の島のものではない刺繍の布の箱・烽火台の角笛に混じる三つ目の低い音 | lore_w7c_kar.js:w7c_kar・lore_w7c_vel.js:w7c_vel | events_w7c_vel.js:w7c_vel_horn | 未回収 | 海嘯に結べる |
| 戻らぬ父の斧（名札の村は地図に無い） | items_i3_forge.js:i3_fatheraxe | ― | 取り下げてよい | 品の味。家族へ届ける道が無い |
| 雷筒の箱の蓋「残りは東へ」・帝国の蔵に眠る筒 | relics_c1.js:c1_vault・relics_c1.js:c1_black | ― | 未回収 | 帝国の蔵の場面は無い |
| 『落雷の手順』の削られた蔵書印（元の本は人の手の届かぬ所） | items_m1.js:m1_tome_bolt | ― | 余白 | 誰から借りているか（術は借り物） |
| イスメネ「読み終えたら何が書いてあったか教えて」 | m15_tomes.js:m15_ism_copy | ― | 未回収 | |
| 若い司祭「祈りが届いてしまった」 | ambient_u3.js:u3_priest_quiet | ― | 余白 | 祈りに応える仕組み |
| 脱走兵に食べ物を分けた印（後編 w8_deserter2 と書いてある） | events_w8_wild.js:w8p_deserter | ― | 未回収 | 頭のコメントが「後編 w8_deserter2」と言うが、その出来事は無い。印 w8_deserter は読まれない |
| 奥の部屋に「釘の数」を数えてくると約束した | events_w3_towns.js:w3_t_tray2 | ― | 未回収 | 印 w3_t_traynote は読まれない。約束の続き（数えて戻る）が無い |
| 黒鎧の居城の帳面の頁を「持ち主に返すつもりで」懐に入れた | dungeon_w11_places.js:w11_mc_lore2 | v17a_graw_2.js | 回収済み | V17a：長編「膝を折らぬ者」で女剣士に返せる |
| 墓守の新しい帳面を「何かの証に」持ち出した | dungeon_w11_places.js:w11_cc_lore2 | ― | 未回収 | 印 w11_ledger は読まれない。告発（e3 aurelia の地下墓地の証拠）に使えない |
| 鈴の男に戸口へ鈴を掛けられた | events_w3_towns.js:w3_t_ledgers2 | ― | 未回収 | 印 w3_t_belled は読まれない（頭のコメントに「使う印」とある） |
| 見捨てられた塔の刻み目を数えた | events_w3_wild.js:w3_w_bell_tally | ― | 未回収 | 印 w3_w_tally は読まれない |
| 数の合わない島に役人の杭を打った | events_w3_wild.js:w3_w_isle_stake | ― | 未回収 | 印 w3_w_stake は読まれない |
| 迷宮の行商人から買った・見習いを入口まで送った | events_w8_deep.js:w8d_peddler・events_w8_deep.js:w8d_novice | ― | 取り下げてよい | 印 w8_peddler・w8_novice は読まれない。一回きりの小話でよい |
| 世捨て人のなぞなぞ・地図売りの偽地図 | events_w8_wild.js:w8p_hermit・events_w8_wild.js:w8p_conman | ― | 取り下げてよい | 印 w8_hermit・w8_conman は読まれない。一回きりの小話でよい |
| ゴブリン王ギギの大将軍に任じられた | events_wild2.js:v2_gigi | events_wild2.js:v2_gigi_war | 回収済み | next で続く。印 v2_gigi_general 自体は読まれない |
| 片翼の大男の背に乗って「何も見ていない」と言った | events_wild2.js:v2_ride | ― | 未回収 | 印 v2_azrag は読まれない。ヴァルグレア（e3 azlag）の対面で「見た者」として扱われない |
| 竜の卵を返した／帝都で売った | events_wild2.js:v2_egg | zzzzzzzzzzzzzzzzzzzzzzz_v17b.js:AZ_EGG（e3_meet_azlag） | 回収済み | 持ち主の決定（2026-10-13）で 卵を返した印で剣翼の対面が一行やわらぐ。v2_egg_sold は読まない（売った側の筋は作らない） |
| 北の賢人に盤上遊戯で勝った／捨て駒にされた | events_town2.js:v1_boardgame | v17b_threads.js:chezar（弱る条件 board） | 回収済み | 持ち主の決定（2026-10-13）で 盤で勝った印を百面の使徒の条件（刃が届く）に足した。捨て駒にされた側は覚え書きのまま |
| ヴァルグレアの着地の失敗を見た | events_town2.js:v1_skyshadow | zzzzzzzzzzzzzzzzzzzzzzz_v17b.js:AZ_SEEN（e3_meet_azlag） | 回収済み | 持ち主の決定（2026-10-13）で、印 v1_azlag_seen があると剣翼の対面で口を封じに先に襲ってくる（選べるのは身構えるだけ） |
| ロデリクに手を差し出した／頬の跡を笑った | f2_threads.js:f2_king_4・f2_sequel.js:f2r_rod_foe | zzzzzzzzzzzzzzzzzzzzzzz_v17b.js（f2r_rod_friend・f2r_rod_foe） | 回収済み | 持ち主の決定（2026-10-13）で 再会の場面で印を読み、台詞を一行変える（手：握らなかった手の一言／笑い：「笑え。あの日みたいに」） |
| 真珠採りの島で大粒の真珠を見た | w9_spots_isles.js:dive | ― | 取り下げてよい | 印 w9_bigpearl は読まれない |

## 持ち主の決定が要るもの
未回収のうち、拾うかどうか・どう拾うかが持ち主の決定になるもの。推し案は一行。設定をねじ曲げないものだけ（〔秘〕の中身を明かす案、人物の性格を変える案は書いていない）。

| 糸 | 張った所 | 推し案 |
|---|---|---|
| 王の仇討ち（黒曜の獣ゴルヴァン） | world.js:LORE_GM・events_c2.js:c2_valeon | 「続き物」と書いたまま出来事が無い。E7 の A 級の長編の一本目に「王の仇討ち」を当て、依頼主を国王ヴァレオンにする（王が自ら出てくる筋は設定どおり）。作らないなら LORE_GM の「続き物」の文を消す |
| 錆鎧の心核 | c2_people.js:c2_rustspawn | 「心核を探す続き物」も出来事が無い。ヴィオレーヌ（ユリナの席を狙う）とナタリアの筋に結び、炭鉱の奥で分かれ身を討つ B 級の続き物にする。本体（A 級）は出さない |
| 明けずの町カルヴァス（オスリック卿） | world.js:LORE_GM | 噂（lore_u3.js:akezu）だけで場所が無い。凍てつく街道と黒鉄の砦の間に場所を一つ足し、中の出来事は curses.md の「日記と住人の話から」の形で。朝を呼ぶ道はベルファスの筋（夢の問答）と結ぶ |
| 暁鐘会（千回の鐘） | world.js:LORE_GM | 用語説明に二行あるだけ。「鐘を数える・千回に届かず苦情が来る・何も起きない」出来事を一つ（帝都か聖都）。黒幕のディエランは出さない |
| 残りの使徒の長編（A・S 級の雛形） | e7_0_saga.js:SAGAS | 試作は mirza のみ。次の一本は黒鎧エンバルダ（A 級。宿敵の抜け羽・砦・王命の出来事 e10 が既にある）。S 級は最後に |
| 砂塵 討伐後もボルグの取り立てが来る | e3_apostles.js:zalve.win | 「町じゅうの借金が白紙」と食い違う。討伐の印（e3:zalve）で v1_debt を消し、ボルグは「貸し、ひとつ」と言って去る一行に |
| 討伐後も続く使徒の出来事（咎追い・鉄喰い・白霧・忘れ水・蝶翅） | e3_apostles.js:togaoi.after・e3_apostles.js:tetsukui.after・e3_apostles.js:notari.after・e3_apostles.js:levian.after・e3_apostles.js:aurelia.after | after の文と食い違う。zz_e3_apostles.js の STOP にこの五体の出来事（m3_togaoi・w2_iron・v2_notari・遺構の眷属・w1 の聖女）を加える |
| 忘れ水：記憶を売ると知識／正気が戻る | world.js:LORE_GM | e3_meet_levian に「記憶を一つ売る」の選択肢（memo が一行消え、正気が戻る）。設定どおりで小さい |
| 薄布の娘の予言「三つ目の扉は開けずに叩け」 | events_c4.js:c4_sal_omen | w4_r_door に「叩く」選択肢を一つ（鍵で開けた道と結果を変える） |
| 手紙三通（石工の娘・沈黙の森の狩人の家族・北の村の女） | events_wild2.js:v2_letter・events_w4_wild.js:w4_s_hunter・events_w7_zai.js:w7_zai_letter | 預かった手紙を持ち物にし、届け先の町に着いたとき一行で渡す（三通まとめて一つの仕組み）。やらないなら「預かる」選択肢を「読んで返す」に |
| C10 の約束（徴兵の名簿・闇の隠れ家の借り・新月の競り・口入れ屋の塔） | c10_choices.js:v1_conscript・c10_choices.js:m3_chase・c10_fac.js:alley・c10_choices_w4.js:w4_v_contract | 徴兵の名簿だけ M4 の戦の知らせで拾う（名簿に名があれば呼び出しの一行）。残りは取り下げ |

## 印の調べ方
出来事の結果で `flag` を立てるが、どこも読まない印は、次で出せる（`src/` を読むだけ。engine の組み立てる印 `e10:`・`w8foe:`・`e3:` は除く）。
```
node -e 'const fs=require("fs"),p=require("path");const d="src";const L=[];for(const s of["data","engine","ui"])for(const f of fs.readdirSync(p.join(d,s)))if(f.endsWith(".js"))fs.readFileSync(p.join(d,s,f),"utf8").split("\n").forEach((l,i)=>L.push([f,i+1,l]));const set=new Map();for(const[f,n,l]of L){let m;const r=/\bflag:\s*"([^"#:]+)"/g;while((m=r.exec(l)))(set.get(m[1])||set.set(m[1],[]).get(m[1])).push(f+":"+n)}for(const[k,w]of set){const o=L.filter(([f,n,l])=>!w.includes(f+":"+n)&&(l.includes("\""+k+"\"")||new RegExp("flags\\."+k+"\\b").test(l)));if(!o.length)console.log(k,w.join(" "))}'
```
