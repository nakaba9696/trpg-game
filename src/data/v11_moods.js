// V11：立ち絵の表情の種類（喜怒哀楽＋その人らしい表情）。並び・名前・落とし先は docs/art/moods.json と同じ（tests/checks/v11_moods.mjs が見る）。
// fallback：その人にその表情の絵が無いときに探す近い表情（左から順。どれも無ければ基本の絵）。
// guess：出来事の文から表情を推す手がかり（src/engine/v8_moods_v11.js が上から順に当てる。強いもの・はっきりしたものが先）。
// EVENT_MOODS：既存の出来事に、ファイルを書き換えずに表情を付ける表（出来事の id → 表情）。出来事のデータに mood があればそちらが先。
// レーン A（絵）・U（画面）の V11
(function (G) {
  const D = (G.data = G.data || {});
  D.MOOD_TABLE = {
    joy: { name: "喜", fallback: [] },
    anger: { name: "怒", fallback: [] },
    sorrow: { name: "哀", fallback: [] },
    fun: { name: "楽", fallback: [] },
    surprise: { name: "驚き", fallback: ["fear"] },
    shy: { name: "照れ", fallback: ["joy"] },
    troubled: { name: "困り", fallback: ["sorrow"] },
    serious: { name: "真剣", fallback: [] },
    smug: { name: "得意げ", fallback: ["fun", "joy"] },
    fear: { name: "怯え", fallback: ["surprise", "sorrow"] },
    tired: { name: "疲れ", fallback: ["troubled", "sorrow"] },
    cry: { name: "泣き", fallback: ["sorrow"] },
    panic: { name: "慌て", fallback: ["troubled", "surprise", "fear"] },
    pout: { name: "すね", fallback: ["anger"] },
    faint_smile: { name: "ほんの少し笑う", fallback: ["joy"] },
    sparkle: { name: "目を輝かせる", fallback: ["fun", "joy"] },
    cold: { name: "冷たい目", fallback: ["serious", "anger"] },
    wicked: { name: "悪い笑み", fallback: ["smug", "fun"] },
    drunk: { name: "酔い", fallback: ["fun", "shy", "joy"] },
    sleepy: { name: "眠い", fallback: ["tired"] },
    exasperated: { name: "呆れ", fallback: ["troubled", "tired"] },
    smitten: { name: "うっとり", fallback: ["shy", "joy"] },
  };
  // 文から推す。上から順に当てる（泣き崩れていれば哀より泣き、照れて笑っていれば喜より照れ）
  D.MOOD_GUESS = [
    ["cry", /号泣|泣き崩れ|泣きじゃく|わんわん泣|大泣き|おいおい泣/],
    ["sorrow", /泣(?!か[なずせ])|涙|嗚咽|すすり泣|しゃくり上げ|べそ/],
    ["fear", /怯え|おびえ|青ざめ|悲鳴を上げ|腰を抜か|歯の根が合わ|がたがた震え/],
    ["anger", /怒鳴|怒っ|怒り|怒った|激昂|睨みつけ|舌打ち|声を荒|歯ぎしり|地団駄/],
    ["shy", /頬を染め|頬を赤|顔を赤く|赤くなっ|真っ赤にな|耳まで赤|赤面|照れ|もじもじ/],
    ["panic", /あたふた|慌てふため|うろたえ|狼狽|おろおろ/],
    ["drunk", /酔っ払|酔っぱら|千鳥足|呂律が回/],
    ["smug", /得意げ|得意満面|胸を張っ|したり顔|ふふん/],
    ["fun", /けらけら|げらげら|大笑い|笑い転げ|吹き出し|噴き出し|高笑い|腹を抱え|笑い声/],
    ["joy", /笑顔|微笑|笑った|笑う|にっこり|にかっと|喜ん|喜び|嬉し|うれし|跳ね起き/],
    ["surprise", /目を丸く|目を見開|息を呑|ぎょっと|仰天|飛び上がっ/],
    ["troubled", /困った顔|眉を下げ|頭を掻|苦笑/],
    ["tired", /へたり込|ぐったり|息を切ら|疲れ果て/],
  ];
  // 既存の出来事の表情（出来事のデータに mood があればそちらが先。文から推すと外れる所・推せない所だけ）
  D.EVENT_MOODS = Object.assign(D.EVENT_MOODS || {}, {
    c2_rui: "sleepy", // 遺跡で眠っていた子のまぶたが動く
    c2_greol: "shy", // 口下手な王子が、ぎこちなく頭を下げる
    c2_raisha: "sleepy", // 絡まれて、あくびをする
    c2_dario: "faint_smile", // 子どもにしがみつかれて「……よい」
    c2_natalia: "drunk", // 杯の塔に突っ伏している
    c4_bert_join: "cold", // 眠たげな目が、一瞬だけ笑っていない
    c4_mir_tea: "troubled", // お茶が三倍苦い
    c4_mir_bottle: "joy", // 「精霊の涙」を嬉しそうに買う（涙で哀と推さない）
    c4_sal_omen: "serious", // 水盤の先読み（予言の「泣く」で哀と推さない）
    m2_crush: "smitten", // 看板の絵に見とれる
    m2_sky: "fear", // 空を渡るものに震える
    m10_spark: "shy", // 目が合って慌てる
    m11_mon_rat: "shy", // 贈り物を置いて岩陰に隠れる
    m11_beast_moult: "exasperated", // 抜け毛にため息
  });
  // 会話（K1）の話題・掛け合いの表情（話題・掛け合いの id → 表情）。データに mood があればそちらが先。src/engine/v8_moods_v11.js が読み込みのあとで当てる
  D.TALK_MOODS = Object.assign(D.TALK_MOODS || {}, {
    dil_e_boss: "surprise", // 正面から倒したのが信じられない
    dil_e_fled: "smug", // 逃げて、妙に満足そう（「息を切らし」で疲れと推さない）
    dil_c_tricks: "smug", // ずるい手の決まり
    dil_m_zerina: "exasperated", // 帳面に三頁
    dil_m_kaidel: "exasperated", // 壊したものを指折り数える
    dil_b1: "shy", // 帳面の最後の頁
    dil_v1: "shy", // 黙って外套を繕う
    nora_l_port: "surprise", // 空気がしょっぱい
    nora_e_fled: "pout", // まだ殴れたのに
    nora_c_nuts: "sparkle", // 焼いた木の実
    nora_c_thunder: "fear", // 雷とお風呂
    nora_m_dil: "smug", // 得意そうに嘘の見分け方を話す
    sheila_l_ruins: "sparkle", // 本と壁を見比べる
    sheila_e_boss: "sparkle", // 寸法を測る
    sheila_m_nora: "faint_smile", // 字を教えて、少し誇らしげ
    sheila_c_apple: "faint_smile", // 焼き林檎
    sheila_c_sea: "surprise", // 波につま先をつけて、すぐ引っ込める
    sheila_b1: "faint_smile", // 七人目
    sheila_v1: "shy", // 余白の横顔
    zerina_l_leavel: "surprise", // 林檎の値段に固まる
    zerina_l_dranherz: "sparkle", // 鍛冶屋の刃物に釘付け
    zerina_c_coin: "smug", // 銅貨の芸
    zerina_c_rich: "sparkle", // 財布の厚み
    zerina_m_dil: "exasperated", // 三頁ぶんの借り
    bt_dz_debt: "smug", // 四頁目
    bt_sz_hat: "sparkle", // 帽子が似合う
    bt_nz_bath: "exasperated", // 五日に一回
  });
})(globalThis.G = globalThis.G || {});
