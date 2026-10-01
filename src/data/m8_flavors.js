// M8：暮らしの才（フレーバー程度の才能）。判定や戦闘には効かない。シート・見立て・出来事の文の端・人生の物語・墓碑に顔を出す。
// 一人がいくつか持つ（D.FLAVOR_COUNT）。段階は 1〜3（3 はまずいない）。決まりは src/engine/zm8_talent.js。
// name：才の名前（「料理の才」）、story：人生の物語に入る一文、grave：墓碑の一行、aside：出来事が始まったとき、ときどき添える一文（where のタグの場所で）
// 才は〔知〕の「生まれつきの才」。どこから来たかは書かない。レーン C（M8）
(function (G) {
  const D = G.data;

  D.FLAVORS = {
    cook: { name: "料理", story: "焚き火で作る鍋が、妙にうまかった。", grave: "鍋の味を覚えている者がいる", aside: { where: ["wild", "dungeon"], text: "腹が鳴った。帰ったら何を煮るか、頭のどこかで考えている。" } },
    song: { name: "歌", story: "歌うと、酒場が少しだけ静かになった。", grave: "歌のうまい人だった", aside: { where: ["town"], text: "通りの奥で誰かが歌っている。音を外した。直してやりたくなる。" } },
    fish: { name: "釣り", story: "水辺に座れば、何かしら釣って帰ってきた。", grave: "釣りの名人", aside: { where: ["port", "wild"], text: "水の匂いがする。こういう日は、よく釣れる。" } },
    beasts: { name: "獣に好かれる", story: "野良犬も荷馬も、なぜかこの人には懐いた。", grave: "犬が墓のそばを離れなかった", aside: { where: ["town", "wild"], text: "痩せた犬が一匹、少し離れてついてくる。追い払っても、また来る。" } },
    compass: { name: "道を覚える", story: "一度歩いた道は、忘れなかった。", grave: "迷ったことの無い人", aside: { where: ["wild", "dungeon"], text: "来た道は、頭の中ではっきりしている。帰り道の心配はしていない。" } },
    sleep: { name: "寝つき", story: "どこでも眠れた。墓場の脇でも、雨の中でも。", grave: "よく眠る人だった", aside: { where: ["wild"], text: "あくびが出た。こんな所でも、横になれば眠れる気がする。" } },
    dice: { name: "博打", story: "骰子を振らせれば、負けるより勝つ方が多かった。", grave: "博打の借りを残さなかった", aside: { where: ["town"], text: "どこかで骰子の音がする。今日の目は、なんとなく分かる気がする。" } },
    drink: { name: "酒に強い", story: "どれだけ飲んでも、翌朝はけろりとしていた。", grave: "酒樽ひとつぶんの墓", aside: { where: ["town"], text: "昨夜の酒は、もう一滴も残っていない。" } },
    needle: { name: "繕い物", story: "破れた外套を、誰よりもきれいに繕った。", grave: "繕いの跡がきれいだった", aside: { where: ["wild", "dungeon"], text: "袖のほつれが目に入った。夜になったら繕おう。" } },
    letters: { name: "字", story: "字がきれいで、よく手紙の代筆を頼まれた。", grave: "代筆の字が残っている", aside: { where: ["town"], text: "張り紙の字が汚い。書き直してやりたくなる。" } },
    mimic: { name: "声まね", story: "鳥の声も、酔っ払いの声も、そっくりに真似た。", grave: "誰の声でも真似た", aside: { where: ["wild", "town"], text: "鳥が鳴いた。口の中で同じ節をなぞってみる。" } },
    weather: { name: "空を読む", story: "明日の天気を、外したことが無かった。", grave: "空を読む人", aside: { where: ["wild"], text: "風の向きが変わった。夕方には降る。" } },
    herbs: { name: "草を見分ける", story: "道端の草のどれが薬で、どれが毒か、ひと目で分かった。", grave: "草をよく知る人", aside: { where: ["wild"], text: "足元に、熱冷ましの草が生えている。覚えておく。" } },
    faces: { name: "顔を覚える", story: "一度会った者の顔と名前は、忘れなかった。", grave: "人の名前を忘れなかった", aside: { where: ["town"], text: "人混みに、前にどこかで見た顔がある。どこでだったかも、覚えている。" } },
    dance: { name: "踊り", story: "祭りの夜には、決まって輪の真ん中にいた。", grave: "祭りの輪の真ん中にいた", aside: { where: ["town"], text: "どこかの笛に合わせて、つま先が勝手に拍子を取っていた。" } },
    kids: { name: "子どもに好かれる", story: "どこの町でも、子どもがまとわりついてきた。", grave: "子どもたちが花を置いていく", aside: { where: ["town"], text: "子どもが二人、あなたの後ろをついてくる。振り向くと、笑って逃げた。" } },
    nose: { name: "鼻が利く", story: "腐った肉と、嘘をつく者の汗の匂いを、嗅ぎ分けた。", grave: "鼻の利く人", aside: { where: ["dungeon", "town"], text: "どこからか、嫌な匂いがする。まだ何も見えないが。" } },
    carve: { name: "木彫り", story: "暇さえあれば、小刀で木を削って何かを彫っていた。", grave: "小さな木彫りが、あちこちに残っている", aside: { where: ["wild"], text: "手ごろな枝を拾った。夜に何か彫ろう。" } },
    luck: { name: "くじ運", story: "くじを引けば、なぜか当たった。本人がいちばん気味悪がっていた。", grave: "くじ運だけは強かった", aside: { where: ["town"], text: "道に銅貨が落ちている。拾うのは、今月これで三度目だ。" } },
    calm: { name: "肝が据わる", story: "何が起きても、顔色ひとつ変えなかった。", grave: "最期まで顔色を変えなかった", aside: { where: ["dungeon"], text: "暗がりの奥で何かが動いた。心臓は、いつもの速さで打っている。" } },
  };
  D.FLAVOR_KEYS = Object.keys(D.FLAVORS);
  // 一人が持つ数の分布（0〜3 個）と、段階の線（[3, 2] より小さければその段、ほかは 1）
  D.FLAVOR_COUNT = [0.15, 0.6, 0.92]; // 0 個 < 0.15 ≦ 1 個 < 0.6 ≦ 2 個 < 0.92 ≦ 3 個
  D.FLAVOR_ODDS = [0.03, 0.3];
  D.FLAVOR_ASIDE = 0.12; // 出来事が始まったとき、添える割合
})(globalThis.G = globalThis.G || {});
