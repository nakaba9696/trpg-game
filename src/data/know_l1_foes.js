// L1：覚え書き（魔物の癖と弱点）。engine/zzz_know_l1.js が読む。覚えていても効き目は無い（覚えるのはプレイヤー）。
//   aim はその書きつけが言っている弱点：blade 刃が通る・magic 術が通る・talk 脅しが効く・flee 足が遅い・habit 癖だけ（弱点は言わない）。
//   書きつけは敵のデータと食い違わないこと（tests/checks/l1_know.mjs が守り・魔法の守り・意志・素早さで確かめる）
// 文は手帳の書きつけ。答えをそのまま書かない。レーン C＋F（L1）
(function (G) {
  const D = (G.data = G.data || {});
  D.KNOW = D.KNOW || {};
  const foe = (id, aim, text) => { D.KNOW["foe_" + id] = { kind: "foe", foe: id, aim, text }; };

  // ---------------------------------------------------------------- 魔物
  foe("goblin", "habit", "ゴブリン：振りかぶる前に、必ず一度、仲間の顔を見る。");
  foe("wolf", "habit", "野犬：跳ぶ前に後ろ脚がたわむ。たわんだら、横へ一歩。");
  foe("barrelgob", "blade", "樽ゴブリン：樽の継ぎ目は、たいてい腐っている。");
  foe("dogu", "magic", "ドグー：刃は欠けるだけ。土の体は、熱で乾いてひび割れた。");
  foe("bandit", "talk", "街道の盗賊：頭の名前を出すと、下っ端の目が泳いだ。");
  foe("orc", "habit", "オーク：大振りのあと、斧が抜けるまで間がある。");
  foe("werewolf", "habit", "人狼：脇腹の古傷を庇って、右に回りたがる。");
  foe("spider", "magic", "大蜘蛛：糸は火に弱い。巣ごと燃やすと、本体も慌てる。");
  foe("slime", "magic", "酸のスライム：刃を入れると刃が減る。火を見せると縮んだ。");
  foe("banditboss", "talk", "山賊の頭：手下の前では引けない男。手下が減ると、急に話が分かる。");
  foe("ogre", "habit", "オーガ：腹が鳴ると、腕より先に口が出る。");
  foe("zombie", "flee", "屍の群れ：遅い。逃げるなら、振り返らずに坂を上る。");
  foe("wyvern", "magic", "翼竜：皮の薄い翼の付け根。降りてきた一瞬に。");
  foe("deserter", "talk", "帝国脱走兵：軍の号令を真似ると、体が先に気をつけをする。");
  foe("ninja", "habit", "はぐれ忍：消える前に、足の指で地面をつかむ。");
  foe("mimic", "magic", "ミミック：蓋は硬い。火を吹きかけると、たまらず口を開ける。");
  foe("oni", "habit", "鬼：酒の匂いのする日は、二撃目が遅れる。");
  foe("warlock", "blade", "呪術師：詠唱中は、杖を持つ手が空く。");
  foe("chimera", "habit", "キメラ：首同士で揉める。どの首が噛むか、目でわかる。");
  foe("blackknight", "magic", "黒騎士：鎧の中は暑いらしい。熱に弱い。");
  foe("general", "habit", "魔物将軍：号令の前に、必ず咳払いをする。");
  foe("kin", "blade", "使徒の眷属：血の印の上だけ、刃が通りやすい。");
  foe("e1_crowngob", "talk", "王冠ゴブリン：王冠を褒めると、隙だらけになる。");
  foe("e1_bowshroom", "magic", "おじぎ茸：乾くと縮む。火にかけると、深々とおじぎをした。");
  foe("e1_tollrat", "talk", "関所ネズミ：通行料を値切ると、親分が出てくる前に散る。");
  foe("e1_frostgrave", "magic", "凍えた旅人：火を見ると、手をかざしに寄ってくる。");
  foe("e1_frogprophet", "talk", "沼の預言蛙：予言を外したと言うと、ひどく落ち込む。");
  foe("e1_sweeper", "habit", "掃除人形：決まった順にしか掃かない。三歩目は、いつも左。");
  foe("e1_lantern", "blade", "提灯お化け：灯りの芯を狙う。紙は脆い。");
  foe("e1_melted", "flee", "溶けかけた見習いたち：床に貼りついて、角を曲がれない。");
  foe("e1_sleepgiant", "habit", "寝返り巨人：寝返りの前に、いびきが止まる。");
  foe("e1_bonepicker", "talk", "骨並べ：並べた骨を崩すと言うと、手が止まる。");
  foe("e1_ashhound", "habit", "灰喰い犬：跳びかかる前に、体の灰を一度ふるい落とす。");
  foe("w1_candlemite", "magic", "蝋燭かじり：火に寄ってきて、火で溶ける。");
  foe("w1_husk", "blade", "祈り殻：組んだ指の間が、いちばん薄い。");
  foe("w1_choir", "habit", "聖歌の髑髏：歌は三節。三節目の終わりに、必ず息を継ぐ。");
  foe("w1_beastpriest", "habit", "獣憑きの司祭：祈りの途中で、獣のほうが喉を鳴らす。それが合図。");
  foe("w1_tanuki", "blade", "祭りの煙小鬼：煙の中では強いが、尻尾は煙から出ている。");
  foe("e2_cookgob", "talk", "見習い料理ゴブリン：料理長の名前を出すと、包丁を背中に隠す。");
  foe("e2_meatling", "flee", "逃げた食材：自分も逃げているので、追ってはこない。");
  foe("e2_planted", "blade", "植えられた人：根元は柔らかい。刃で足元を払う。");
  foe("e2_rotbloom", "blade", "腐れ花：花びらより茎。茎は一本しかない。");
  foe("m5_feverfolk", "talk", "熱に浮いた村人：名前を呼ぶと、少しのあいだ目が戻る。");
  foe("m5_nightwatch", "habit", "夜番崩れ：見回りの癖が抜けない。角ごとに一度止まる。");
  foe("w3_smuggler", "talk", "港の用心棒：雇い主より給金の話をすると、手が止まる。");
  foe("w3_hermit", "magic", "舟殻ヤドカリ：殻は硬い。殻の中は、煮えやすい。");
  foe("w3_cinder", "talk", "火の粉小僧：怒鳴ると、火の粉ごと縮こまる。");
  foe("w3_drowned", "blade", "溺れ船乗り：ふやけた体。首の縄の跡が、いちばん脆い。");
  foe("w3_ashmoth", "blade", "灰喰い蛾：翅は薄い。刃をひと振りすれば裂ける。");
  foe("guard", "talk", "町の衛兵：上役の名前と、詰所の当番の話。どちらかで足が止まる。");
  foe("w3_silentmonk", "habit", "口縫いの修道士：縫い目が引きつると、次は杖が来る。");
  foe("m5_remnant", "habit", "成れの果て：明かりのほうを、ときどき振り返る。");
  foe("m5_oldbeast", "blade", "首に布を巻いた獣：布の下に、塞がらない傷がある。");
  foe("e1_herald", "habit", "使徒の触れ役：触れの文句を途中で遮ると、最初から言い直す。");
  foe("m2_traitor", "habit", "裏切った仲間：癖は変わらない。踏み込む前に、右肩が上がる。");
  foe("c2_zork", "habit", "首狩りゾルク：首を狙うときだけ、構えが低くなる。");
  foe("c2_rustspawn", "magic", "錆鎧の分かれ身：錆は熱で剥がれる。剥がれた所は、ただの空洞。");
  foe("m3_hunter", "talk", "賞金稼ぎ：手配書の額より高い話には、耳を貸す。");

})(globalThis.G = globalThis.G || {});
