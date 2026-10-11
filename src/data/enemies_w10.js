// W10 の山の敵。欄の意味は enemies.js・enemies_e4_regions.js と同じ（acts・weak・fleeAt・lines）
//   眠り山ロウネ（危険度 1）：岩跳び山羊・ガレ場の土竜（段 1）、霧かぶり（段 2）、尾根の大鷲（段 3。上の段だけ）
//   鉄冠岳ドラウゼ（危険度 3）：雪の大猿・氷柱蝙蝠（段 3）。尾根の大鷲はここの尾根にも
// 出る段は src/data/locations_zw10.js の w10.pools。耐性・弱点は E12 の形（data/e12_affinity.js の FOES に足す）
// rg を付けない（地域の出現表〔zzz_e4_foes.js〕でほかの場所に散らばらないように。山の段の表だけで出る）
// 絵は docs/art/monsters.json の same_as で近い魔物の絵を借りる（持ち主が描いたら same_as を外す）。レーン E（W10）
(function (G) {
  const D = (G.data = G.data || {});

  Object.assign(D.ENEMIES, {
    // ---------------------------------------------------------------- 段 1
    w10_rockgoat: {
      name: "岩跳び山羊", tier: 1, hp: 10, dmg: [1, 4, 0], hit: 50, def: 5, agi: 60, will: 30, mres: 0, gold: [0, 3], loot: [["pelt", 0.4], ["jerky", 0.15]], shape: "beast", eye: "#ffd84a",
      acts: ["steal"], fleeAt: 0.4,
      desc: "群れを離れて野に返った山羊。崖の上から頭突きで旅人を道の外へ押し出す。荷の紐をかじるのが好きで、干し肉の包みをくわえて逃げる。",
      look: { body: "quad", head: "goat", skin: "#c8bca0", skin2: "#f0e8d8", horns: "curl", eyes: "slit", mouth: "flat", tail: "stub", mood: "silly" },
      lines: {
        open: ["岩の上から、山羊がじっとこちらを見下ろしている。目の瞳が横に細い。あなたの荷の、干し肉の包みのあたりを見ている。"],
        turn: ["山羊は戦いの最中にも、あなたの外套の裾をかじっている。", "山羊は一段高い岩に跳び乗り、勝ち誇ったように鳴いた。"],
        flee: "山羊は崖をひょいひょいと跳ねて、見えなくなった。岩の上に、かじりかけの紐が残っていた。",
      },
    },
    w10_screemole: {
      name: "ガレ場の土竜", tier: 1, hp: 9, dmg: [1, 4, 1], hit: 50, def: 10, agi: 35, will: 40, mres: 0, gold: [0, 6], loot: [["gem", 0.05], ["herb", 0.2]], shape: "beast", eye: "#ff9a6a",
      weak: "ice",
      desc: "崩れた石の斜面の下を掘り進む、大きな土竜。足もとの石をわざと崩して、転んだ獲物に噛みつく。冬は穴にこもって出てこない。",
      look: { body: "quad", head: "mole", skin: "#6a5a4a", skin2: "#c89a8a", eyes: "dot", mouth: "fangs", ears: "none", tail: "thin", mood: "fierce" },
      lines: {
        open: ["足もとの石が、ざらりと流れた。石の下から、桃色の鼻が突き出てくる。"],
        turn: ["土竜は石の下に潜り、思いもよらない所から鼻を出した。", "土竜の掘った穴に、あなたの踵がはまりかけた。"],
      },
    },
    // ---------------------------------------------------------------- 段 2
    w10_fogimp: {
      name: "霧かぶり", tier: 2, hp: 14, dmg: [1, 6, 0], hit: 55, def: 5, agi: 55, will: 35, mres: 10, gold: [2, 12], loot: [["manawater", 0.1], ["gem", 0.06]], shape: "humanoid", eye: "#d8e8ff",
      acts: ["steal"], weak: "fire", fleeAt: 0.3,
      desc: "霧の日にだけ出る、膝ほどの背の小鬼。霧を頭からかぶって姿を隠し、道標の石を一つずつずらして旅人を迷わせる。迷った者の荷から、いちばん光る物を持っていく。",
      look: { body: "biped", build: "small", skin: "#a8b8c8", skin2: "#e0e8f0", head: "hood", eyes: "glow", mouth: "grin", outfit: "rags", cloth: "#c8d0d8", extra: ["float"], mood: "silly" },
      lines: {
        open: ["霧の中で、くすくす笑う声がした。右から。いや、左から。道標の石が、さっきと違う向きを指している。"],
        turn: ["霧かぶりは霧に溶け、あなたの背中を指でつついた。", "「こっち、こっち」霧の奥から、あなたの声の真似が聞こえた。"],
        flee: "霧かぶりは霧をかぶり直して消えた。笑い声だけが、しばらく斜面を転がっていた。",
      },
    },
    // ---------------------------------------------------------------- 段 3
    w10_cragbird: {
      name: "尾根の大鷲", tier: 3, hp: 24, dmg: [1, 8, 2], hit: 60, def: 5, agi: 70, will: 50, mres: 5, gold: [0, 15], loot: [["pelt", 0.3], ["gem", 0.08]], shape: "winged", eye: "#ffb33a",
      acts: ["disarm"], weak: "bolt",
      desc: "尾根の風に乗って舞う、翼の差し渡しが人の背丈の倍もある鷲。細い尾根で獲物の足をすくい、谷へ落としてから下りてきて食べる。",
      look: { body: "bird", skin: "#5a4a3a", skin2: "#e8e0d0", eyes: "slit", mouth: "beak", wings: "feather", tail: "fan", mood: "fierce" },
      lines: {
        open: ["頭の上を、大きな影が横切った。風の音が一瞬やむ。見上げると、鷲が翼をたたんで落ちてくるところだった。"],
        turn: ["大鷲は風に乗って高く上がり、また落ちてきた。", "大鷲の羽ばたきで、尾根の砂が目に入った。"],
      },
    },
    w10_snowape: {
      name: "雪の大猿", tier: 3, hp: 30, dmg: [1, 8, 2], hit: 55, def: 10, agi: 40, will: 50, mres: 0, gold: [0, 12], loot: [["pelt", 0.5], ["herb", 0.2]], shape: "beast", eye: "#7ad8ff",
      acts: ["enrage"], weak: "fire",
      desc: "白い長い毛の大猿。雪の斜面で雪玉を作って投げてくる。雪玉の芯には石が入っている。群れの若い猿は、人の帽子を集めて頭に重ねている。",
      look: { body: "biped", build: "brute", skin: "#e8eef0", skin2: "#8a9aa8", head: "ape", eyes: "glow", mouth: "fangs", arms: "claws", extra: ["fur"], mood: "fierce" },
      lines: {
        open: ["雪の斜面から、白い大きな背中が起き上がった。手には雪玉。帽子を三つ、頭に重ねてかぶっている。"],
        turn: ["大猿は雪をすくって丸めている。芯に石を入れるのを、あなたは見た。", "大猿は胸を叩いて吠えた。上の斜面で雪がずれる音がした。"],
      },
    },
    w10_icebat: {
      name: "氷柱蝙蝠", tier: 3, hp: 18, dmg: [1, 6, 1], hit: 60, def: 5, agi: 70, will: 40, mres: 5, gold: [0, 8], loot: [["fang", 0.3]], shape: "winged", eye: "#bfe8ff",
      acts: ["drain"], weak: "fire", fleeAt: 0.3,
      desc: "捨てられた坑道の天井に、氷柱に混じって下がっている蝙蝠。翼の縁が凍っていて、触れると切れる。血を吸うと体が温まり、氷が少し溶ける。",
      look: { body: "bat", skin: "#5a6a7a", skin2: "#c8e0f0", eyes: "glow", mouth: "fangs", wings: "bat", extra: ["float"], mood: "fierce" },
      lines: {
        open: ["坑口の天井の氷柱が、一本、二本と羽を広げた。氷柱ではなかった。"],
        turn: ["蝙蝠の翼が頬をかすめた。切れた所が、冷たいのに熱い。", "蝙蝠は天井にぶら下がり、こちらの首筋を見ている。"],
        flee: "蝙蝠は坑道の闇へ散っていった。天井から、溶けかけた氷の雫が落ちた。",
      },
    },
  });

  // 耐性と弱点（E12 の形。data/e12_affinity.js の頭の説明）
  if (D.E12 && D.E12.FOES) Object.assign(D.E12.FOES, {
    w10_rockgoat: "blunt- pierce+ wind-",          // 頭突きの石頭。崖の風には慣れている
    w10_screemole: "earth! ice+ blunt+",           // 土の中の獣。冬を嫌う
    w10_fogimp: "wind+ fire+ light+ dark-",        // 霧を吹き払われると隠れられない
    w10_cragbird: "wind! bolt+ pierce+",           // 風に乗る鳥。矢と雷に弱い
    w10_snowape: "ice! fire++ blunt-",             // 厚い毛皮は打撃を吸う。火は大嫌い
    w10_icebat: "ice! fire+ slash+ pierce-",       // 小さくて突きは当たりにくい。翼は刃で落ちる
  });
})(globalThis.G = globalThis.G || {});
