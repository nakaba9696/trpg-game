// E12：魔物の耐性と弱点（属性 7 つ・物理 3 つ）と、武器の物理の種類。
// 仕組みは engine/zzzzzzzzzzzzzz_e12_resist.js（ここは表だけ。data は enemies_*・items_* より先に読まれるので、
// 敵と武器への書き写しは engine で、読み込みのあとに行う）。
//
// 種類（M14 の術・ほかの子と共有する id）
//   属性：fire 炎 / ice 氷 / bolt 雷 / wind 風 / earth 土 / light 光 / dark 闇
//   物理：slash 斬撃 / blunt 打撃 / pierce 刺突（武器の欄は dtype。既存の pierce: true〔絶界を破る〕とは別）
// 敵の書き方（FOES）："<種類><印> ..." を空白で区切る。印は
//   ++ 大きな弱点（2 倍）/ + 弱点（1.5 倍）/ - 耐性（半分）/ ! 無効（0）。書かない種類は等倍
//   @<種類> は敵の攻め手（図鑑に出すだけ。書かなければ形から決める）
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
  E12.MARK = { "++": 2, "+": 1.5, "-": 0.5, "!": 0 };

  // ---------------------------------------------------------------- 敵
  E12.FOES = {
    // enemies.js
    goblin: "blunt+", wolf: "fire+ slash+", barrelgob: "blunt- fire++", dogu: "slash- blunt+ earth!", bandit: "pierce+",
    orc: "blunt- pierce+", werewolf: "light+ dark-", spider: "fire+ slash+", slime: "slash- blunt- fire++", banditboss: "pierce+", guard: "slash- blunt+",
    ogre: "blunt- pierce+", zombie: "pierce- fire+ light+ dark!", wyvern: "pierce+ wind- bolt+", deserter: "blunt+ pierce+", ninja: "dark- blunt+", mimic: "slash- pierce- blunt+ fire+",
    oni: "blunt- light+", warlock: "dark! light+ pierce+", chimera: "fire- ice+ pierce+", blackknight: "slash- pierce- blunt+ bolt+ dark-",
    general: "pierce- bolt+", kin: "dark- light+ pierce+",
    kain: "fire+ dark-", shuten: "light+ pierce-", bonedragon: "slash- blunt+ light+ dark!", rize: "bolt+ dark-", royalguard: "slash- pierce- blunt+",
    // 使徒（D.ENEMIES にいる三体）
    graw: "pierce- blunt+ bolt+ dark-", e2_gormoa: "fire! ice+ pierce-", e2_mordu: "fire+ ice+ earth! blunt-",
    // enemies_2.js
    e1_crowngob: "blunt+ fire+", e1_bowshroom: "fire+ slash+ blunt-", e1_tollrat: "fire+ slash+ pierce-", e1_frostgrave: "fire++ ice! light+",
    e1_frogprophet: "bolt+ ice+ blunt-", e1_sweeper: "slash- pierce- blunt+ bolt+", e1_lantern: "fire+ wind+ pierce-", e1_melted: "blunt- bolt+",
    e1_sleepgiant: "blunt- pierce+", e1_bonepicker: "slash- blunt+ light+", e1_herald: "light+ wind- pierce+", e1_ashhound: "fire! ice+",
    // enemies_w1.js
    w1_candlemite: "fire+ blunt+", w1_husk: "pierce- blunt+ fire+ light+", w1_choir: "slash- pierce- blunt+ light+ dark!", w1_beastpriest: "light+ dark-",
    w1_tanuki: "wind+ fire-", w1_vespa: "light- dark+ pierce+", w1_gregor: "dark- light+ blunt+", w1_konoha: "wind+ earth-",
    // 人物（c2〜c8・m2）
    c2_nora: "bolt+", c2_angelica: "pierce+", c2_captainbeast: "fire+ light+", c2_rustspawn: "slash- blunt+ bolt+", c2_zork: "pierce+ dark-",
    c4_musette: "fire+ slash+", c5_violaine: "light+", c5_severin: "light! dark+", c8_graul: "pierce- bolt+", m2_traitor: "blunt+",
    // enemies_e2.js
    e2_marmit: "fire- ice+", e2_cookgob: "fire- blunt+", e2_meatling: "slash+ fire+", e2_berna: "fire+ dark-", e2_planted: "fire+ slash+ earth-", e2_rotbloom: "fire++ slash+ earth-",
    // enemies_e4_kin.js（E4 の weak は自動で 1.5 倍に足される）
    e4k_squire: "pierce- blunt+", e4k_chainhound: "bolt+", e4k_taster: "fire- ice+", e4k_cauldron: "fire! blunt-",
    e4k_mossdog: "earth-", e4k_pruner: "pierce- blunt+", e4k_inkling: "light+", e4k_drowned: "bolt+ fire-",
    e4k_puppet: "fire+ slash+", e4k_smiler: "fire+", e4k_fogscribe: "wind+", e4k_fogowl: "wind+ pierce+",
    e4k_sandimp: "earth! pierce-", e4k_hourglass: "earth- blunt+", e4k_whiteacolyte: "dark+ light-", e4k_haloshade: "light! dark+",
    e4k_smokecat: "wind+ pierce-", e4k_bouncer: "blunt- pierce+", e4k_maskguard: "slash-", e4k_nailer: "blunt+ bolt+",
    e4k_dreamsheep: "light+ slash+", e4k_sleepwalkers: "light+", e4k_bladechick: "wind! pierce+ slash-", e4k_cliffwatch: "wind- pierce+",
    e4k_bellfish: "fire- blunt+", e4k_drownedsailor: "fire- bolt+", e4k_unsaid: "dark! light+", e4k_blackmite: "wind+",
    e4k_moonhare: "light+ dark-", e4k_moonarcher: "dark! pierce-", e4k_rustgnaw: "slash- blunt+", e4k_ironmite: "slash- pierce-",
    e4k_bellsinner: "blunt+", e4k_guiltdog: "light+", e4k_scarecrow: "pierce- slash+", e4k_furrowmole: "earth- bolt+",
    e4k_acidbud: "blunt- earth-", e4k_greenwatch: "fire+ slash+", e4k_rootling: "earth! slash+", e4k_ember: "fire! wind-",
    // enemies_e4_regions.js（強い個体 _x は元の種と同じ）
    e4_mosswisp: "pierce- wind+", e4_satchelrat: "slash+", e4_thornboar: "slash- pierce+", e4_relicmole: "earth! wind+", e4_lampghost: "slash- pierce- fire-",
    e4_rustwatch: "slash- blunt+", e4_cropcrow: "pierce+ wind-", e4_poacher: "blunt+", e4_mudhound: "slash+ earth-", e4_rainslug: "blunt-",
    e4_brokenknight: "slash- blunt+", e4_lordhound: "slash+", e4_cinderhound: "fire!", e4_penitent: "blunt- dark+", e4_bellbat: "light+ pierce+",
    e4_relicthief: "pierce+", e4_waxsaint: "slash- pierce- blunt+", e4_ossuaryhound: "slash- blunt+ dark!", e4_candlewidow: "fire-",
    e4_tidecrab: "slash- pierce- blunt+", e4_reedimp: "fire+ slash+", e4_seafog: "slash- pierce- wind+", e4_drumbadger: "blunt- pierce+",
    e4_islepirate: "bolt+", e4_shellwitch: "ice- bolt+", e4_snowwolf: "ice! fire+", e4_iciclewraith: "ice! blunt+ slash-", e4_pressgang: "pierce+",
    e4_minerghost: "earth! blunt-", e4_frostbear: "ice! blunt-", e4_warcrow: "pierce+ wind-", e4_bogleech: "blunt-", e4_bogwitch: "pierce+",
    e4_brokenspirit: "dark- light- wind!", e4_mudcroc: "bolt+ blunt-", e4_poisonfrog: "ice+ slash+", e4_dustmoth: "wind+ slash+", e4_rockeater: "earth! blunt-",
    e4_hillorc: "blunt- pierce+", e4_gravejackal: "light+ slash+", e4_oldlegion: "pierce- blunt+ dark!", e4_stonetroll: "slash- pierce- blunt+",
    e4_cliffharpy: "pierce+ wind-", e4_ladderGob: "fire+ blunt+", e4_ashogre: "fire- ice+ blunt-", e4_scoutbird: "pierce+ wind!",
    e4_deadsentry: "slash- blunt+", e4_warbeast: "fire+ bolt+", e4_firearrowimp: "fire! pierce-", e4_runawaywatch: "blunt+",
    e4_ashwyrm: "fire! earth-", e4_bonecarter: "slash- pierce- blunt+ light+", e4_shadewalker: "dark! light+ pierce-",
    e4_redscorpion: "pierce- blunt+", e4_hollowknight: "pierce- blunt+ light+", e4_vulture: "pierce+ wind-",
    // enemies_m5.js
    m5_feverfolk: "ice+ slash+", m5_remnant: "light+ dark-", m5_nightwatch: "light+", m5_oldbeast: "light+",
    // enemies_w3.js・enemies_w4.js・events_m3.js・items_w2.js
    w3_smuggler: "pierce+", w3_hermit: "slash- pierce- blunt+", w3_cinder: "fire! ice+", w3_drowned: "bolt+ fire- light+", w3_silentmonk: "blunt- dark+",
    w3_ashmoth: "fire- wind+", w3_ashscribe: "wind+ ice+", w3_tidemaw: "pierce- bolt+",
    w4_borer: "earth! wind+ pierce+", w4_hungryrock: "slash- pierce- blunt+", w4_hushed: "light+ dark-", w4_saltwalker: "wind+ dark-",
    w4_borermother: "earth! blunt+ fire+", w4_gatekeeper: "slash- pierce- blunt+ bolt+",
    m3_hunter: "blunt+", w2_ironwarden: "slash- blunt+ bolt+",
    // 使徒（D.E3.FOES。戦いが始まるときに D.ENEMIES に入る）
    e3_levian: "bolt+ fire- pierce-", e3_mirza: "fire+ dark-", e3_zalve: "earth! fire+ pierce-", e3_aurelia: "light! fire+",
    e3_yoihime: "wind+ fire- pierce-", e3_chezar: "bolt+ pierce- dark-", e3_yura: "dark! light+ blunt-", e3_azlag: "wind! bolt+ pierce+",
    e3_lugu: "bolt+ fire- ice-", e3_notari: "wind+ pierce-", e3_kurobane: "dark! light+ pierce+", e3_tojizuki: "dark! light+ pierce-",
    e3_tetsukui: "bolt+ pierce- earth-", e3_togaoi: "light+ dark!", e3_midori: "fire+ earth! ice+", e3_sanno: "ice+ earth- pierce-",
    e3_sekaiju: "fire+ earth! wind-", e3_salphiel: "dark+ light-", e3_yuzuel: "dark+ pierce-",
  };

  // 表に無い敵の決め方（あとから足された敵にも、何か一つは特徴が付くように）
  E12.RULES = {
    shape: { blob: "blunt- fire+", swarm: "pierce- fire+", winged: "pierce+ wind-", giant: "blunt- pierce+", dragon: "slash- ice+", beast: "fire+", small: "blunt+", humanoid: "pierce+" },
    undead: "light+ dark!",
    magic: "dark-",
  };
  // 攻め手（敵の武器の物理の種類）を形から決める
  E12.ATK_BY_SHAPE = { humanoid: "slash", beast: "pierce", small: "pierce", giant: "blunt", blob: "blunt", winged: "slash", swarm: "pierce", dragon: "slash" };

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
