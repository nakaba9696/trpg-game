// 通行人のひとこと（U3）。町をぶらついたとき・野外を探索して何も起きなかったときに、ときどき一行出る（src/engine/ambient.js）。
// 通行人は世界の説明役ではない。名前か仕事か用事があり、あなたと関係なく暮らしている。語り方は docs/lore/voice.md
// where: 出来事と同じ場所のタグ（town / wild / dungeon / capital / port / snow / realm / 場所の id / any）
// cond(S): 出る条件（日数・フラグ・名声など）。lore: 手引きに書き足す用語説明（src/data/lore_u3.js の "<項目>:<行>"）。w: 出やすさ（既定 1）
// レーン U（U3）が管理
(function (G) {
  const D = (G.data = G.data || {});
  const later = (n) => (S) => S.day >= n;

  D.AMBIENT = [
    // ---------------------------------------------------------------- どの町でも（身近なこと）
    { id: "u3_baker", where: ["town"], w: 2, text: "パン屋の娘が、焦げたパンを一つだけ籠の底に隠して、何食わぬ顔で客に笑いかけている。" },
    { id: "u3_well", where: ["town"], w: 2, text: "井戸端で女たちが、誰それの亭主がまた賭場で負けたと話している。一人が「ネフィリアさまに嫌われたのさ」と言い、みんなが笑った。", lore: "gods:nefilia" },
    { id: "u3_oath", where: ["town"], w: 2, text: "八百屋の親父が胸に手を当てた。「ソラスさまに誓って、このかぶは今朝抜いたやつだ」隣の女房が黙って首を横に振った。", lore: "gods:soras" },
    { id: "u3_charm", where: ["town"], text: "出かける夫の背中に、女が指で小さく三つの印を切った。夫は振り返らない。毎朝のことらしい。" },
    { id: "u3_boy_sword", where: ["town"], w: 2, text: "木の枝を剣にした男の子たちが、使徒ごっこをしている。使徒の役はいつも一番小さい子で、今日も泣いている。" },
    { id: "u3_tax", where: ["town"], text: "徴税人に追われた靴屋が、あなたの横を走り抜けていった。片方の靴しか履いていない。" },
    { id: "u3_dog", where: ["town"], text: "痩せた犬が肉屋の前に座っている。肉屋は追い払う真似をして、裏で骨を投げてやった。" },
    { id: "u3_letter", where: ["town"], cond: later(3), text: "代書屋の前に老婆が並んでいる。「砦の息子に。……元気か、と。それだけでいい。それだけで」" },
    { id: "u3_bell", where: ["town"], text: "昼の鐘が鳴ると、通りの半分が足を止め、軽く頭を下げた。残りの半分は、そのすきに屋台の列を詰めた。" },
    { id: "u3_redmoon_cloth", where: ["town"], cond: later(5), text: "宿の窓という窓に、女中が赤い布を畳んで積んでいる。「次の満月の用意ですよ。赤いのが来たら掛けるんです」なぜ、とは言わなかった。", lore: "redmoon:rumor" },
    { id: "u3_gravedigger", where: ["town"], text: "墓守の爺さんが、帳面に名前を書き写しながら舌打ちした。「字が汚いとハルガさまに読んでもらえん」", lore: "gods:harga" },
    { id: "u3_drunk_count", where: ["town"], text: "酔っ払いが、指を折りながら何かを数えている。「七十……七十二……いや、八十五だったか。使徒ってのは何匹いるんだっけな」誰も答えない。", lore: "majin:count" },
    { id: "u3_wedding", where: ["town"], text: "婚礼の行列が通っていく。花嫁の父親だけが、ずっと空を見上げていた。雲一つない。" },
    { id: "u3_orphans", where: ["town"], text: "教会の孤児たちが、募金箱を抱えて歌っている。三番の歌詞を、みんな少しずつ違えて覚えていた。" },
    { id: "u3_merchant_rain", where: ["town"], text: "露店の婆さんが、雨も降っていないのに品物に布を掛けはじめた。「膝が痛む。今夜は何か来るよ」" },

    // ---------------------------------------------------------------- 町ごと
    { id: "u3_karna_clerk", where: ["karna"], w: 2, text: "ギルドの見習い書記が、依頼の紙を抱えて走っていく。一枚落とした。「ドブ掃除　報酬3G　命の危険なし（たぶん）」" },
    { id: "u3_karna_moneychanger", where: ["karna"], cond: later(4), text: "表通りの両替商の前で、男が幸せそうに笑いながら金貨を数えている。足元の影が少し本人より細い。", lore: "zalve:rumor" },
    { id: "u3_karna_rubbing", where: ["karna"], cond: (S) => !!(S.lore && S.lore.kokuin), text: "ギルドの壁の拓本の前で、酔った老人が言った。「あれは墓碑だよ。墓碑ってのは死んだ者の分だけ彫るもんだ」誰も相手にしない。", lore: "kokuin:grave" },
    { id: "u3_nerva_net", where: ["nerva"], w: 2, text: "網を繕う漁師が鼻歌をやめた。「夜の海じゃ歌うな。歌われたら下手でも歌い返せ。うちの爺さんの言いつけでな」", lore: "lugu:rumor" },
    { id: "u3_nerva_fleet", where: ["nerva"], text: "桟橋の老いた船大工が、東の沖を顎でしゃくった。「わしの兄貴は、東の大地へ行く艦隊に乗った。一隻も帰らんかった。……まあ、兄貴は借金も返さんかったがな」", lore: "hikarikabe" },
    { id: "u3_nerva_widow", where: ["nerva"], text: "桟橋の先に、毎朝同じ女が立っているという。今朝もいた。沖を見ている。船はもう十年帰っていない。" },
    { id: "u3_leavel_knight", where: ["leavel"], w: 2, text: "白銀の鎧の若い騎士が、鏡の前で口上の練習をしている。「我が剣は国王陛下に……陛下の……」三回目で噛んだ。" },
    { id: "u3_leavel_pilgrim", where: ["leavel"], cond: later(3), text: "巡礼の母親が、子どもの首筋を撫でながら言った。「聖女さまに触れていただいた痕よ。ありがたいねえ」子どもは眠そうに笑っている。", lore: "mark:blessed" },
    { id: "u3_garmund_widows", where: ["garmund"], w: 2, text: "雪かきをしているのは女と年寄りばかりだ。男たちは、みんな北の防衛線か、四騎士さまの誰かの陣にいる。" },
    { id: "u3_garmund_game", where: ["garmund"], cond: later(6), text: "宮廷の近くの酒場で、下働きの男が声をひそめた。「北の賢人さまは、駒を取るたびに謝るんだとよ。人の首を取るときは謝らないのにな」", lore: "chezar:rumor" },
    { id: "u3_fort_sky", where: ["fort"], w: 2, text: "見張りの兵が空ばかり見ている。「下は魔物、上は……上はいいんだ。上を見てりゃ、少なくとも最初に分かる」", lore: "azlag:rumor" },
    { id: "u3_fort_king", where: ["fort"], text: "砦の古参兵が、山脈の向こうを見ながら言った。「向こうに何がいるのか、誰も知らねえ。知ってるやつは帰ってこねえからな」新兵が小声で知りたくない、と言った。" },
    { id: "u3_fort_cook", where: ["fort"], text: "砦の炊事番が、鍋をかき回しながら新兵の数を数えている。先月より、鍋が一つ少ない。" },
    { id: "u3_zephara_smoke", where: ["zephara"], w: 2, text: "学院の塔から紫の煙が上がった。通りの誰も見上げない。パン屋だけが窓を閉めた。" },
    { id: "u3_zephara_mute", where: ["zephara"], text: "魔法の使えない荷運びの男が、荷の上の印章を指でなぞっている。字は読めないが形で覚えているらしい。" },
    { id: "u3_yakumo_lantern", where: ["yakumo"], w: 2, text: "港の婆さまが、沖に向けて提灯を一つ流した。「祭りの島に行った孫に。……帰り道が分かるように」", lore: "yoihime:rumor" },
    { id: "u3_yakumo_oni", where: ["yakumo"], text: "漁師の子が、父親の刀の手入れをしながら言った。「鬼ってのは、もとは約束を破った人なんだと。だからおれは約束しない」" },

    // ---------------------------------------------------------------- 先へ進むほど（遠い影）
    { id: "u3_maou_brawl", where: ["town"], cond: later(4), text: "酒場の前で、酔っ払い二人が、山の向こうの化け物と海の底の化け物のどっちがでかいかで殴り合いを始めた。どちらも見たことはない。" },
    { id: "u3_twomoons", where: ["town", "wild"], cond: later(7), text: "年寄りが孫の頭を押さえて言った。「月が二つの晩は上を見るんじゃない」孫は見たそうにしている。", lore: "tojizuki" },
    { id: "u3_bellhoods", where: ["town"], cond: later(5), text: "揃いの灰色の頭巾の一団が、鐘楼に登っていく。宿の女将が舌打ちした。「また鐘の人たちだよ。今夜は眠れないね」", lore: "gyoushou" },
    { id: "u3_bellcount", where: ["town"], cond: (S) => S.day >= 8 && !!(S.lore && S.lore.gyoushou), text: "夜通し鳴った鐘が、明け方にぴたりと止んだ。鐘楼から「……九百九十八だった！」「九百九十九だ！」と言い争う声が降ってくる。", lore: "gyoushou:count" },
    { id: "u3_refugee", where: ["town"], cond: later(8), text: "東の街道から、荷車に家財を積んだ一家が来た。どこから来たのかと聞かれると、父親は「もう無い町だ」とだけ言った。" },
    { id: "u3_bard", where: ["town"], cond: later(10), text: "吟遊詩人の歌の途中で、客の一人が泣き出した。消えた町の歌だった。その町の名前を詩人は毎回ちがえて歌う。" },
    { id: "u3_priest_quiet", where: ["town"], cond: later(12), text: "教会の若い司祭が石段に座り込んでいる。「祈りが届いたんです。届いてしまった。……いえ、何でもありません」" },
    { id: "u3_clap", where: ["any"], cond: (S) => S.day >= 15 && S.fame >= 20, text: "人混みの向こうで誰かが手を打った。ひとつ、ふたつ。振り返ると誰も手を上げていない。", lore: "clap:crowd" },

    // ---------------------------------------------------------------- 野外
    { id: "u3_shepherd", where: ["wild"], w: 2, text: "丘の上で、羊飼いの娘が羊を数え直している。一頭足りない。娘は泣かずに、もう一度最初から数えはじめた。" },
    { id: "u3_peddler_road", where: ["wild"], w: 2, text: "すれ違った行商人のロバが、あなたの袖を食べようとした。行商人は謝りもせず、「こいつの好物は麻でね」と得意げに言った。" },
    { id: "u3_roadshrine", where: ["wild"], text: "街道の小さな祠に、摘んだばかりの花が供えてある。花の下に、子どもの字で「おとうさんが かえってきますように」。" },
    { id: "u3_hunter", where: ["forest", "plains"], text: "猟師が、罠にかかった兎を外しながら言った。「この辺りはまだましさ。山の向こうは兎の方が人を獲る」" },
    { id: "u3_frost_toll", where: ["frost", "mountains"], text: "吹きだまりの中に、半分埋もれた道標がある。誰かが行き先の町の名前を削り、「帰れ」と彫り直していた。" },
    { id: "u3_mountain_lot", where: ["mountains"], cond: later(6), text: "山道の村で、子どもたちが草の茎でくじを引いて遊んでいる。当たりを引いた子に、母親が駆け寄って茎を取り上げ、捨てた。", lore: "kuji:play" },
    { id: "u3_swamp_flowers", where: ["swamp"], text: "毒沼のほとりに、見たこともない白い花が咲いている。蜂が一匹、止まったまま動かない。" },
    { id: "u3_realm_sign", where: ["realm"], text: "灰の中から人の町の看板が突き出ている。「ようこそ」の文字だけがまだ読める。" },
  ];
})(globalThis.G = globalThis.G || {});
