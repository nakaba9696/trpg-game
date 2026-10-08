// R5：名のある人の表（持ち主「41 歳・片目のシグルンの場面で、桃色の髪の若い娘が『冒険者』の札付きで出た」）。
// 出来事の who が型（adventurer など）だけを書いていて、本文では名のある一人として出てくる人を、ここで名のある人にする。
// 名のある人は、専用の絵（assets/portraits/<id>.webp）があればそれを、無ければ絵を出さない（型の絵で代用しない。src/ui/v4_assets.js）。
// 札は「名前（肩書き）」になる（src/engine/zzzzzzzzzzzzzzz_r5_named.js）。
//   D.R5_NAMED[id] = { name 名前, role 肩書き, events [その人が who の出来事], seeds [who.seed], names [仲間の名前に含まれる言葉] }
// ほかに名のある人として扱うもの（ここには書かない）：キャラメモの人（seed "c2:<id>"）、v4_assets.js の NAMED、
//   C3 の名のある人（G.whoPerson）、who.name が名前で終わる人（「写し場の古株ヤン」「狩人頭のオルガ婆」。G.r5.properName）。
// 新しく名のある人を出来事に出すときは、ここに足すか、who に seed（"c2:<id>"）か name（名前）を書く。tests/checks/r5_named.mjs が漏れを探す。
// レーン A（R5）
(function (G) {
  const D = (G.data = G.data || {});
  D.R5_NAMED = Object.assign(D.R5_NAMED || {}, {
    // ---------------------------------------------------------------- 序盤の因縁（F2）
    sigrun: { name: "シグルン", role: "片目の女", events: ["f2_majin_2", "f2_majin_4", "f2_majin_5", "f2r_sigrun"], names: ["シグルン"] },
    roderick: { name: "ロデリク", role: "騎士の家の三男", events: ["f2_king_1", "f2_king_5", "f2r_rod_friend", "f2r_rod_rival", "f2r_rod_foe"], names: ["ロデリク"] },
    pergo: { name: "ペルゴ", role: "笑う男", events: ["f2_rich_5", "f2r_pergo_free", "f2r_pergo_jailed"] },
    // ---------------------------------------------------------------- 縁の続き（F4）
    keil: { name: "ケイル", role: "若い傭兵", events: ["f4r_cure_young"], names: ["傭兵のケイル"] },
    // ---------------------------------------------------------------- 町と野の人（W3・W6・W7）
    benno_changer: { name: "ベンノ", role: "両替商", events: ["w3_o_k_scale"] },
    marek: { name: "マレク", role: "取り立て屋", events: ["w3_o_k_debt"] },
    oswin_tailor: { name: "オズヴィン", role: "仕立屋", events: ["w3_o_l_tailor"] },
    hannes: { name: "ハンネス", role: "鍛冶の親方", events: ["w3_o_d_bellows", "w3_o_d_bellows2"] },
    isolde: { name: "イゾルテ", role: "両替商の婆さま", events: ["w3_t_raincoin"] },
    marco: { name: "マルコ", role: "香辛料屋", events: ["w3_t_scales", "w3_t_scales2"] },
    jork: { name: "ヨルク", role: "木こり", events: ["w3_t_laugh"] },
    hanna: { name: "ハンナ", role: "狩人", events: ["w3_t_warden"] },
    benno_bridge: { name: "ベンノ", role: "橋番", events: ["w3_t_whistle"] },
    hugo_priest: { name: "フーゴ", role: "神父", events: ["w3_t_chapelrain"] },
    seebeck: { name: "ゼーベック", role: "研究所の老学者", events: ["w3_t_roarlog", "w3_t_roar2"] },
    rita_ash: { name: "リタ", role: "見習い学者", events: ["w3_t_dig", "w3_t_dig2"] },
    balt: { name: "バルト", role: "流れの傭兵", events: ["w6g_merc", "w6g_merc2"] },
    anselm_relic: { name: "アンセルム", role: "遺物売り", events: ["w6g_relic", "w6g_relic2"] },
    rosa: { name: "ロサ", role: "船の水夫", events: ["w6s_fishing"] },
    hein: { name: "ハイン", role: "石工", events: ["w7_bre_mason2"] },
    hald: { name: "ハルド", role: "漁師", events: ["w7_eis_haul"] },
    // ---------------------------------------------------------------- 最初の町の人（R3）
    helga_herb: { name: "ヘルガ", role: "薬草売り", events: ["r3_k_basket", "r3_k_basket3"] },
    oswald_honey: { name: "オズワルド", role: "蜂蜜屋", events: ["r3_k_cart"] },
    mina: { name: "ミナ", role: "網元の娘", events: ["r3_n_flute", "r3_n_flute3"] },
    basso: { name: "バッソ", role: "漁師", events: ["r3_n_bottle"] },
    gasparo: { name: "ガスパロ", role: "片目の船乗り", events: ["r3_n_arm"] },
    emil: { name: "エミール", role: "学院の助手", events: ["r3_z_frog", "r3_z_frog3"] },
    arnaud: { name: "アルノー", role: "古本屋", events: ["r3_z_book"] },
    loch: { name: "ロッホ", role: "湯守", events: ["r3_z_bath2"] },
    rita_bread: { name: "リタ", role: "パン屋の娘", events: ["r3_l_bread", "r3_l_bread3"] },
    konrad: { name: "コンラート", role: "若い兵士", events: ["r3_l_valley"] },
    // ---------------------------------------------------------------- 糸の使徒の筋（E7。seed "e7:<名>"）
    cornelius: { name: "コルネリウス", role: "靴売り", seeds: ["e7:cornelius"] },
    bromberg: { name: "ブロンベルク", role: "座長会の会頭", seeds: ["e7:bromberg"] },
    rudiger: { name: "リュドガー", role: "弦弾きの老人", seeds: ["e7:rudiger"] },
    hilde: { name: "ヒルデ", role: "筆頭写字生", seeds: ["e7:hilde"] },
    vilma: { name: "ヴィルマ", role: "峠の庵の老婆", seeds: ["e7:vilma"] },
    fine: { name: "フィーネ", role: "綱渡りの娘", seeds: ["e7:fine"] },
    hartwig: { name: "ハルトヴィヒ", role: "稽古場の主", seeds: ["e7:hartwig"] },
    oswald_smith: { name: "オズヴァルト", role: "鍛冶場の主", seeds: ["e7:oswald"] },
    sabine: { name: "ザビーネ", role: "陣描き", seeds: ["e7:sabine"] },
    anselm_merc: { name: "アンゼルム", role: "鉄鍋団の団長", seeds: ["e7:anselm"] },
  });
})(globalThis.G = globalThis.G || {});
