// E12：魔物の耐性と弱点（属性 7 つ・物理 3 つ）と、武器の物理の種類。
// 仕組みは engine/zzzzzzzzzzzzzz_e12_resist.js（ここは表だけ。data は enemies_*・items_* より先に読まれるので、
// 敵と武器への書き写しは engine で、読み込みのあとに行う）。
//
// 種類（M14 の術・ほかの子と共有する id）
//   属性：fire 炎 / ice 氷 / bolt 雷 / wind 風 / earth 土 / light 光 / dark 闇
//   物理：slash 斬撃 / blunt 打撃 / pierce 刺突（武器の欄は dtype。既存の pierce: true〔絶界を破る〕とは別）
// 敵の書き方（FOES）："<種類><印> ..." を空白で区切る。印は
//   ++ 大きな弱点（2 倍）/ + 弱点（1.5 倍）/ - 耐性（半分）/ ! 無効（0）。書かない種類は等倍
//   <種類>= は等倍に戻す（身なりの印を打ち消すとき）
//   =<身なり> は人間の敵の装備（GEAR）。身なりの印を先に置き、あとに書いた印で上書きする。図鑑に「身なり」として出る
//   @<種類> は敵の攻め手（物理一つと、属性があれば一つ）。こちらの防具の効き目で受けるダメージが変わる（E12b）。
//     書かなければ物理は形から（呪いの攻撃〔magic〕は物理なし）、属性は効かない属性・呪いから決める（ATK_ELEM）
// 敵には読み込みのあと e.aff = { 種類: 倍率 } が付く。E4 の weak（一つの属性の弱点）は aff に 1.5 倍として合わせる。
// 強い個体（elderOf）は書かなければ元の種と同じ。表に無い敵（あとから足された敵）は形・不死・魔法から決める（RULES）。
// 使徒（E3）は、討伐の目安（tests/checks/e8_power.mjs）が剣で測るので斬撃は等倍のまま。弱点は伝承・眷属の弱点・弱る条件に合わせる。
// 正体・使徒の名前は書かない（docs/lore/voice.md）。レーン E（敵）
(function (G) {
  const D = (G.data = G.data || {});
  const E12 = (D.E12 = D.E12 || {});

  E12.TYPES = [
    { id: "slash", name: "斬撃", short: "斬", word: "刃", kind: "phys" },
    { id: "blunt", name: "打撃", short: "打", word: "打撃", kind: "phys" },
    { id: "pierce", name: "刺突", short: "突", word: "突き", kind: "phys" },
    { id: "fire", name: "炎", short: "炎", word: "炎", kind: "elem" },
    { id: "ice", name: "氷", short: "氷", word: "冷気", kind: "elem" },
    { id: "bolt", name: "雷", short: "雷", word: "雷", kind: "elem" },
    { id: "wind", name: "風", short: "風", word: "風", kind: "elem" },
    { id: "earth", name: "土", short: "土", word: "土", kind: "elem" },
    { id: "light", name: "光", short: "光", word: "光", kind: "elem" },
    { id: "dark", name: "闇", short: "闇", word: "闇", kind: "elem" },
  ];
  E12.MARK = { "++": 2, "+": 1.5, "-": 0.5, "!": 0, "=": 1 };
  // 人間の敵の身なり。板金鎧＝斬突に強く打と雷に弱い／鎖帷子＝斬に強く突に弱い／革鎧は控えめ（打に弱い）／
  // ローブ（術師）＝物理に弱く、炎と雷に少し強い／平服＝斬と突に弱い
  E12.GEAR = {
    plate: { name: "板金鎧", aff: "slash- pierce- blunt+ bolt+" },
    chain: { name: "鎖帷子", aff: "slash- pierce+" },
    leather: { name: "革鎧", aff: "blunt+" },
    robe: { name: "ローブ", aff: "slash+ pierce+ blunt+ fire- bolt-" },
    cloth: { name: "平服", aff: "slash+ pierce+" },
  };

  // ---------------------------------------------------------------- 敵
  E12.FOES = {
    // enemies.js
    goblin: "blunt+", wolf: "fire+ slash+", barrelgob: "blunt- fire++", dogu: "slash- blunt+ earth!", bandit: "=cloth",
    orc: "blunt- pierce+", werewolf: "light+ dark-", spider: "fire+ slash+", slime: "slash- blunt- fire++", banditboss: "=leather", guard: "=chain",
    ogre: "blunt- pierce+", zombie: "pierce- fire+ light+ dark!", wyvern: "pierce+ wind- bolt+", deserter: "=chain", ninja: "=cloth dark-", mimic: "slash- pierce- blunt+ fire+",
    oni: "blunt- light+", warlock: "=robe dark! light+", chimera: "fire- ice+ pierce+", blackknight: "=plate dark-",
    general: "pierce- bolt+", kin: "dark- light+ pierce+",
    kain: "=robe fire+ dark-", shuten: "light+ pierce-", bonedragon: "slash- blunt+ light+ dark!", rize: "=leather bolt+ dark-", royalguard: "=plate",
    // 使徒（D.ENEMIES にいる三体）
    // 使徒は一体ずつ（E12b。姿・伝承・固有の守り〔data/zz_e11_wall.js〕・弱らせる出来事に合わせる。斬撃も使徒ごと）
    graw: "slash- pierce- blunt+ bolt+ dark- @blunt",                      // 黒鎧：板金の巨体。叩くか雷。大剣は抜かず、鎧ごとぶつかってくる
    e2_gormoa: "fire! ice+ slash+ pierce- @blunt @fire", // 灼け口：熱い肉の獣。刃はよく通るが、突きは脂に滑る。重い体でのしかかり、熱い息を吐く
    e2_mordu: "slash- blunt- fire++ ice+ earth! @blunt @earth",            // 苔衣：斬っても苔が這い出す。焼き払いと冬に弱い
    // enemies_2.js
    e1_crowngob: "blunt+ fire+", e1_bowshroom: "fire+ slash+ blunt-", e1_tollrat: "fire+ slash+ pierce-", e1_frostgrave: "fire++ ice! light+",
    e1_frogprophet: "bolt+ ice+ blunt-", e1_sweeper: "slash- pierce- blunt+ bolt+", e1_lantern: "fire+ wind+ pierce-", e1_melted: "blunt- bolt+",
    e1_sleepgiant: "blunt- pierce+", e1_bonepicker: "slash- blunt+ light+", e1_herald: "light+ wind- pierce+", e1_ashhound: "fire! ice+",
    // enemies_w1.js
    w1_candlemite: "fire+ blunt+", w1_husk: "pierce- blunt+ fire+ light+", w1_choir: "slash- pierce- blunt+ light+ dark!", w1_beastpriest: "=robe light+ dark-",
    w1_tanuki: "wind+ fire-", w1_vespa: "=chain light- dark+", w1_gregor: "=robe dark- light+", w1_konoha: "=cloth wind+ earth-",
    // 人物（c2〜c8・m2）
    c2_nora: "=leather bolt+", c2_angelica: "=chain", c2_captainbeast: "fire+ light+", c2_rustspawn: "slash- blunt+ bolt+", c2_zork: "=leather dark-",
    c4_musette: "fire+ slash+", c5_violaine: "=cloth light+", c5_severin: "light! dark+", c8_graul: "=leather bolt+", m2_traitor: "=leather",
    // enemies_e2.js
    e2_marmit: "=cloth fire- ice+", e2_cookgob: "fire- blunt+", e2_meatling: "slash+ fire+", e2_berna: "=robe fire+ dark-", e2_planted: "fire+ slash+ earth-", e2_rotbloom: "fire++ slash+ earth-",
    // enemies_e4_kin.js（E4 の weak は自動で 1.5 倍に足される）
    e4k_squire: "pierce- blunt+", e4k_chainhound: "bolt+", e4k_taster: "fire- ice+", e4k_cauldron: "fire! blunt-",
    e4k_mossdog: "earth-", e4k_pruner: "pierce- blunt+", e4k_inkling: "light+", e4k_drowned: "bolt+ fire-",
    e4k_puppet: "fire+ slash+", e4k_smiler: "=cloth fire+", e4k_fogscribe: "wind+", e4k_fogowl: "wind+ pierce+",
    e4k_sandimp: "earth! pierce-", e4k_hourglass: "earth- blunt+", e4k_whiteacolyte: "=robe dark+ light-", e4k_haloshade: "light! dark+",
    e4k_smokecat: "wind+ pierce-", e4k_bouncer: "=leather", e4k_maskguard: "=chain", e4k_nailer: "blunt+ bolt+",
    e4k_dreamsheep: "light+ slash+", e4k_sleepwalkers: "light+", e4k_bladechick: "wind! pierce+ slash-", e4k_cliffwatch: "wind- pierce+",
    e4k_bellfish: "fire- blunt+", e4k_drownedsailor: "fire- bolt+", e4k_unsaid: "dark! light+", e4k_blackmite: "wind+",
    e4k_moonhare: "light+ dark-", e4k_moonarcher: "dark! pierce-", e4k_rustgnaw: "slash- blunt+", e4k_ironmite: "slash- pierce-",
    e4k_bellsinner: "blunt+", e4k_guiltdog: "light+", e4k_scarecrow: "pierce- slash+", e4k_furrowmole: "earth- bolt+",
    e4k_acidbud: "blunt- earth-", e4k_greenwatch: "fire+ slash+", e4k_rootling: "earth! slash+", e4k_ember: "fire! wind-",
    // enemies_e4_regions.js（強い個体 _x は元の種と同じ）
    e4_mosswisp: "pierce- wind+", e4_satchelrat: "slash+", e4_thornboar: "slash- pierce+", e4_relicmole: "earth! wind+", e4_lampghost: "slash- pierce- fire-",
    e4_rustwatch: "slash- blunt+", e4_cropcrow: "pierce+ wind-", e4_poacher: "=leather", e4_mudhound: "slash+ earth-", e4_rainslug: "blunt-",
    e4_brokenknight: "=plate", e4_lordhound: "slash+", e4_cinderhound: "fire!", e4_penitent: "=cloth blunt- dark+", e4_bellbat: "light+ pierce+",
    e4_relicthief: "=cloth", e4_waxsaint: "slash- pierce- blunt+", e4_ossuaryhound: "slash- blunt+ dark!", e4_candlewidow: "fire-",
    e4_tidecrab: "slash- pierce- blunt+", e4_reedimp: "fire+ slash+", e4_seafog: "slash- pierce- wind+", e4_drumbadger: "blunt- pierce+",
    e4_islepirate: "=cloth bolt+", e4_shellwitch: "ice- bolt+", e4_snowwolf: "ice! fire+", e4_iciclewraith: "ice! blunt+ slash-", e4_pressgang: "=chain",
    e4_minerghost: "earth! blunt-", e4_frostbear: "ice! blunt-", e4_warcrow: "pierce+ wind-", e4_bogleech: "blunt-", e4_bogwitch: "=robe",
    e4_brokenspirit: "dark- light- wind!", e4_mudcroc: "bolt+ blunt-", e4_poisonfrog: "ice+ slash+", e4_dustmoth: "wind+ slash+", e4_rockeater: "earth! blunt-",
    e4_hillorc: "blunt- pierce+", e4_gravejackal: "light+ slash+", e4_oldlegion: "pierce- blunt+ dark!", e4_stonetroll: "slash- pierce- blunt+",
    e4_cliffharpy: "pierce+ wind-", e4_ladderGob: "fire+ blunt+", e4_ashogre: "fire- ice+ blunt-", e4_scoutbird: "pierce+ wind!",
    e4_deadsentry: "slash- blunt+", e4_warbeast: "fire+ bolt+", e4_firearrowimp: "fire! pierce-", e4_runawaywatch: "=leather",
    e4_ashwyrm: "fire! earth-", e4_bonecarter: "slash- pierce- blunt+ light+", e4_shadewalker: "dark! light+ pierce-",
    e4_redscorpion: "pierce- blunt+", e4_hollowknight: "pierce- blunt+ light+", e4_vulture: "pierce+ wind-",
    // enemies_m5.js
    m5_feverfolk: "=cloth ice+", m5_remnant: "light+ dark-", m5_nightwatch: "=leather light+", m5_oldbeast: "light+",
    // enemies_w3.js・enemies_w4.js・events_m3.js・items_w2.js
    w3_smuggler: "=leather", w3_hermit: "slash- pierce- blunt+", w3_cinder: "fire! ice+", w3_drowned: "bolt+ fire- light+", w3_silentmonk: "=robe blunt- dark+",
    w3_ashmoth: "fire- wind+", w3_ashscribe: "=robe wind+ ice+ fire=", w3_tidemaw: "pierce- bolt+",
    w4_borer: "earth! wind+ pierce+", w4_hungryrock: "slash- pierce- blunt+", w4_hushed: "light+ dark-", w4_saltwalker: "wind+ dark-",
    w4_borermother: "earth! blunt+ fire+", w4_gatekeeper: "slash- pierce- blunt+ bolt+",
    m3_hunter: "=leather", w2_ironwarden: "slash- blunt+ bolt+",
    // 使徒（D.E3.FOES。戦いが始まるときに D.ENEMIES に入る）
    e3_levian: "slash- pierce- bolt+ fire- @blunt @ice",                    // 忘れ水：水の体。刃も穂先も抜けていく。雷が水を走る
    e3_mirza: "fire+ pierce- dark- @blunt @dark", // 微笑：糸の守り。糸は燃える。穂先は糸に絡む。糸で引き寄せて叩きつける
    e3_zalve: "slash- pierce- blunt+ ice+ fire+ earth! @blunt @earth",     // 砂塵：斬れば砂に崩れる。叩き固め、水気で固め、焼いて硝子に
    e3_aurelia: "light! dark+ fire+ @slash @light", // 蝶翅：後光の羽は火に弱い。光は効かない
    e3_chezar: "bolt+ pierce- dark- @pierce", // 百面：面ごとに得物が替わり、穂先は面に逸らされる。雷が面の継ぎ目を走る
    e3_azlag: "wind! slash- pierce- bolt+ @blunt @wind", // 剣翼：刃の羽が刃と穂先を払う。降り立つ巨体を叩く。雨の日の雷。風は効かない
    e3_lugu: "pierce+ blunt- bolt+ fire- ice- @blunt @ice",                // 海嘯：鱗と海。銛で突く。雷が海を走る
    e3_notari: "wind++ slash- pierce- fire+ @blunt @wind",                 // 白霧：剣も穂先も霧を払うだけ。風が霧を晴らす
    e3_kurobane: "dark! light+ slash- @slash @dark", // 黒翼：高い空の翼に刃は届きにくい。影の力は効かない
    e3_tojizuki: "dark! light+ slash- blunt- @dark", // 閉じ月：見上げた先の目に、刃も槌も届きにくい。闇は効かない
    e3_tetsukui: "slash- pierce- blunt+ bolt+ earth- @blunt @earth", // 鉄喰い：刃と穂先は齧り取られる。鉄でない棍棒で殴る。雷は鉄の腹を走る
    e3_togaoi: "light+ dark! @blunt", // 咎追い：鉄の仮面と処刑衣。大斧の重みで打ち据える。闇は効かない、光に弱い
    e3_sanno: "slash- pierce- ice++ earth- @blunt @earth",                  // 酸溜まり：刃も穂先も溶ける。凍らせれば固まる
    // 討てない使徒（会える・挑んでも戦いにならない）
    e3_yoihime: "wind+ fire- pierce- @dark", e3_yura: "dark! light+ blunt- @dark",
    e3_midori: "fire+ earth! ice+ slash- @earth", e3_sekaiju: "fire+ earth! wind- slash- @earth", e3_salphiel: "dark+ light- @wind", e3_yuzuel: "dark+ pierce- @slash",
  };

  // 表に無い敵の決め方（あとから足された敵にも、何か一つは特徴が付くように）
  E12.RULES = {
    shape: { blob: "blunt- fire+", swarm: "pierce- fire+", winged: "pierce+ wind-", giant: "blunt- pierce+", dragon: "slash- ice+", beast: "fire+", small: "blunt+", humanoid: "pierce+" },
    undead: "light+ dark!",
    magic: "dark-",
  };
  // 攻め手（敵の武器の物理の種類）を形から決める
  E12.ATK_BY_SHAPE = { humanoid: "slash", beast: "pierce", small: "pierce", giant: "blunt", blob: "blunt", winged: "slash", swarm: "pierce", dragon: "slash" };
  // 攻め手の属性（書かなければ）：その属性が効かない敵はその属性で攻める（火の獣は火を吐く）。呪いの攻撃は闇
  E12.ATK_ELEM = ["fire", "ice", "bolt", "wind", "earth", "light"];

  // ---------------------------------------------------------------- こちらの防具（E12b）
  // 受けるダメージの倍率。印は -- 0.5 / - 0.75 / + 1.25 / ++ 1.5（敵の段より穏やか。着ている物すべてを掛け合わせ、0.5〜1.5 に収める）
  // 鎖帷子＝斬に強く突に弱い／板金＝斬突に強く打と雷に弱い／革＝控えめ（打を少し和らげる）だが軽い／毛皮＝氷に強く炎に弱い／
  // 布の衣＝刃に弱い（術師の衣は属性に少し強い）／聖別した衣と盾＝闇に強い
  E12.ARMOR_MARK = { "--": 0.5, "-": 0.75, "+": 1.25, "++": 1.5 };
  E12.ARMOR = {
    // 胴
    leather: "blunt-", i3a_hardleather: "blunt- slash-", i3a_studded: "blunt- slash-", i3a_nightleather: "blunt-", i3a_hunterleather: "blunt-",
    i3a_gladiator: "blunt-", i3a_beastvest: "blunt- ice-", i3a_gambeson: "blunt- pierce+", i3a_wyvernleather: "slash- wind-", i1_potlid: "pierce- bolt+",
    chain: "slash- pierce+", i3a_chainshirt: "slash- pierce+", i3a_hauberk: "slash-- pierce+ bolt+", f3i_brinkmail: "slash- pierce+", f3i_saintmail: "slash- pierce+ dark-",
    domaru: "slash- blunt+", i3a_scale: "slash- pierce- blunt+", i3a_brigandine: "slash- pierce- blunt+", i3a_yoroi: "slash- pierce- blunt+ fire-",
    plate: "slash- pierce- blunt+ bolt+", i3a_breastplate: "slash- pierce- blunt+ bolt+", i3a_halfplate: "slash- pierce- blunt+ bolt+",
    i3a_fullplate: "slash-- pierce- blunt+ bolt+", i3a_knightplate: "slash- pierce- blunt+ bolt+", i3a_blackiron: "slash- pierce- blunt+ bolt+ ice-",
    i1_mirrorplate: "slash- pierce- bolt+ light-", dragonmail: "fire-- slash- ice+", i1_onihaori: "slash- fire-", i1_majincoat: "dark- fire-",
    i3a_wolfpelt: "ice- fire+", i3a_bearhide: "ice-- blunt- fire+",
    robe: "fire- ice- bolt- slash+ pierce+", i3a_silkrobe: "fire- ice- bolt- slash+ pierce+", i3a_scholarcoat: "fire- slash+",
    i3a_vestment: "dark-- slash+ pierce+", i3a_monkrobe: "dark- slash+", i3l_thousandstitch: "dark- slash-",
    i3a_tunic: "slash+ pierce+", i3a_kosode: "slash+ pierce+", i3a_yukata: "slash+ pierce+", i3a_dancer: "slash+ pierce+",
    i3a_travelcloak: "ice- wind-", i3a_oilcoat: "ice- wind- fire+", i3a_leafmail: "earth- fire+", i3a_kinhide: "dark- light+",
    i3a_ashmantle: "fire- dark-", i3a_bonemail: "slash- dark- blunt+ light+", i3l_ashshell: "slash- pierce- fire-",
    // 頭
    i2s_hood: "wind-", i2s_furcap: "ice-", i2s_leathercap: "blunt-", i2s_ironhelm: "slash- bolt+", i2s_hachigane: "slash-", i2s_circlet: "dark-",
    i2s_wizardhat: "bolt-", i2s_greathelm: "slash- blunt- bolt+", i2s_kabuto: "slash- blunt+",
    // 足
    i2s_sandals: "fire+", i2s_shoes: "earth-", i2s_leatherboots: "pierce-", i2s_softboots: "ice-", i2s_greaves: "blunt-", i2s_sabaton: "pierce- bolt+", i2s_elfboots: "wind-",
    // 盾
    i2s_buckler: "slash-", i2s_woodshield: "pierce- fire+", i2s_roundshield: "pierce-", i2s_kiteshield: "pierce- slash-",
    i2s_holyshield: "dark-- pierce-", i2s_towershield: "pierce-- slash- blunt+",
  };
  // 表に無い防具は名前から
  E12.ARMOR_RX = [
    [/鎖/, "slash- pierce+"], [/板金|甲冑|甲|鉄/, "slash- pierce- blunt+ bolt+"], [/毛皮|皮衣/, "ice- fire+"], [/革|皮/, "blunt-"],
    [/聖|祭|司祭/, "dark-"], [/術|魔導|学院/, "fire- slash+"], [/衣|服|着|外套|帽|頭巾|袖/, "slash+"], [/盾/, "pierce-"],
  ];

  // ---------------------------------------------------------------- 武器（dtype。二つ持つ武器は配列）
  // 剣・刀・斧＝斬 / 槌・棍棒・杖・素手＝打 / 槍・弓・細剣・錐＝突。短剣は突きと斬り
  const W = {
    slash: "longsword katana mithril volgrim byakuya axe i1_scythe i1_umbrella f3i_moonedge f3i_brokeblade f3i_twinblade i3l_fatheraxe i3l_saltbite i3l_nameless " +
      "i3w_shortsword i3w_broadsword i3w_bastard i3w_greatsword i3w_falchion i3w_executioner i3w_sabre i3w_knightsword i3w_imperial i3w_corsair i3w_holyblade " +
      "i3w_elfblade i3w_wakizashi i3w_tachi i3w_nodachi i3w_kodachi i3w_knife i3w_handaxe i3w_battleaxe i3w_bearded i3w_greataxe i3w_throwaxe i3w_naginata " +
      "i3w_whip i3w_claws i3w_sickle i3w_cleaver i3w_kinfang i3w_ashblade i3w_bonegreat m5_weepcleaver",
    blunt: "fists mace staff oniclub i1_spoon i1_chickenflail i1_baton f3i_rainstaff f3i_giantmaul i3l_lastbell i3l_heartgauntlet i3w_club i3w_morningstar i3w_maul " +
      "i3w_flail i3w_censer i3w_wand i3w_quarterstaff i3w_crystalstaff i3w_bonestaff i3w_chainwhip i3w_cestus i3w_bearpaw i3w_sling",
    pierce: "rapier f3i_windbow i3l_dawnspear i3l_greywing i3w_estoc i3w_stiletto i3w_pick i3w_spear i3w_pike i3w_trident i3w_boarspear i3w_shortbow " +
      "i3w_longbow i3w_crossbow i3w_elfbow i3w_throwknife i3w_javelin m5_fleshhook",
    "pierce slash": "dagger i3w_kris i3w_gladius i3w_halberd",
    "blunt pierce": "i3w_warhammer",
  };
  E12.WEAPONS = {};
  Object.entries(W).forEach(([t, ids]) => ids.split(/\s+/).filter(Boolean).forEach((id) => { E12.WEAPONS[id] = t.split(" "); }));
  // 表に無い武器は名前から（あとから足された武器・鍛え直した品）
  E12.WEAPON_RX = [
    [/弓|弩|槍|銛|錐|鎧通し|刺突|細剣|矢|鉤|針|つるはし/, ["pierce"]],
    [/槌|鎚|棍|棒|杖|拳|籠手|鞭|球|石|鐘|竿|香炉|匙|フレイル/, ["blunt"]],
  ];
  // 仲間の物理の種類（c.dtype が無ければ、職と人となりの言葉から。どれにも当たらなければ斬撃）
  E12.ALLY_RX = [
    [/槍|弓|狩|鷹|銛|射/, "pierce"],
    [/拳|力|人足|粉挽き|荷運び|荷揚げ|坑夫|鐘番|婆|爺|大男|鍛冶|技師|山の民|殴/, "blunt"],
  ];
})(globalThis.G = globalThis.G || {});
