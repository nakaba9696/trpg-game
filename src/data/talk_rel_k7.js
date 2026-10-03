// 仲間どうしの間柄の始まり（K7）。S.tk.rel に値が無いときに使う（−100〜+100）。書いていない組は 0（ふつう）。
// 鍵は二人の id を名前順に並べて | でつなぐ。仕組みは src/engine/zzzzzz_banter2.js、段の名は docs/talk.md の「仲間どうし（K7）」。
// 目安：犬猿・張り合い −15〜−30（険悪にはしない。−35 より下は書かない）・気安い仲 +20〜+35・家族のような仲 +40〜+50。
// 出どころ：c2〜c8_people.js の相性のメモ（memo.pairs・note.pairs・talk.pals）と、talk_banter_*.js の頭の相性の説明。
// レーン V（会話の中身）
(function (G) {
  const D = (G.data = G.data || {});
  D.TALK_REL0 = D.TALK_REL0 || {};
  Object.assign(D.TALK_REL0, {
    // ---------------------------------------------------------------- C2・C4（talk_banter_c2.js・k2.js：ディルとゼリナは犬猿・シェイラとノラは先生同士・ゼリナはルイを可愛がる ほか）
    "dil|zerina": -25,
    "nora|sheila": 30,
    "dil|sheila": 20,
    "rui|zerina": 35,
    "kaidel|natalia": -15, // 古い武の張り合い
    "elnea|mirlene": 30, // 同じ共和国のエルフ
    "rui|tula": 25, // トゥーラはルイの世話を焼く
    "kaidel|tula": 25, // 兄貴と洗濯物
    "dil|ilse": -15, // 読み合い
    "bertrand|kaidel": 20, // 先達と考えなし
    // ---------------------------------------------------------------- C6（c6_people.js の memo.pairs・talk_banter_k6.js）
    "lucien|margot": -15, // 帳面をごまかす者同士。互いに軽蔑しつつ認める
    "lucien|solenne": -20, // 騎士は徴税吏を軽蔑し、徴税吏は目をそらす
    "aubin|lucien": 30, // 責めずに並んで黙って飲む
    "dil|lucien": -15, // 卑怯な若者に昔の自分を見る
    "barnabe|kaidel": 30, // 迷ったら殴る者同士
    "elnea|selevan": 20, // 同じ共和国のエルフ。噛み合わないまま延々話す
    "nora|selevan": -20, // 体に興味津々で、毎回嫌がられる
    "aubin|sheila": 50, // 姫を孫のように扱い、姫も懐く
    "aubin|natalia": 30, // 並んで酒を飲む
    "aubin|lazare": 25, // 本を居眠りしながら全部聞く
    "dil|lazare": 20, // 本好き同士。悪態をつき合いながら貸し借りする
    "bertrand|lazare": 30, // 絵描きのおじさんに懐く
    "nora|rodolphe": -15, // 同じ獣人。厳しく当たるが、罠の外し方を教える
    "lisette|rodolphe": 30, // 追いかけっこの仲
    "margot|rodolphe": 35, // 見逃し合いの古い腐れ縁
    "kaidel|rodolphe": -20, // 流れ者の傭兵を信用しない
    "margot|zerina": -20, // 商売敵
    "margot|rui": 30, // 子どもには甘く、菓子を持たせる
    "natalia|solenne": 20, // 十指に憧れて話しかけられない
    "nora|pipinelle": 35, // 森の娘をかわいがり、尻尾の手入れをする
    "pipinelle|rui": 35, // 古いものどうし、黙って並んで座る
    "pipinelle|tula": -15, // 母ちゃん気質どうしで張り合う
    "barnabe|pipinelle": 30, // 大男を「坊」と呼んで頭を撫でさせる
    "kaidel|lisette": 25, // 二人で突っ込む
    // ---------------------------------------------------------------- C7（c7_people.js の note.pairs・talk_banter_k3.js）
    "sieglinde|wolfram": 35, // 軍の後輩として目をかける
    "gustav|wolfram": -20, // 卑怯な戦い方に毎回怒る
    "hartmut|wolfram": 25, // 声を褒められて三日寝られない
    "hartmut|tula": -20, // あの日、娘の父親を担ぎ出せなかった
    "hartmut|ingrid": -15, // 詩を解剖のように指摘される
    "gustav|radmila": 30, // 隙を探しあう飲み仲間
    "noeris|timo": 25, // 賭けで巻き上げ、宿代だけ返す
    "lumia|noeris": 40, // 学院で泣いていた頃から知っている
    "ilse|ingrid": 30, // 話が合いすぎる
    "annelise|elnea": 35, // ギルドのかわいい後輩
    "bertrand|radmila": 20, // 剣の重さを一目で見抜く
    // ---------------------------------------------------------------- C8（c8_people.js の talk.pals・talk_banter_k4.js）
    "gigra|polf": 35, // 盗み食いを見逃し合う悪友
    "gigra|roswitha": -12, // 帳簿の数字で毎晩喧嘩する。仲は悪くない
    "gigra|izra": -20, // 鷹の女は苦手。からかわれる
    "izra|valdun": 25, // 手合わせを毎晩せがむ
    "tsuyuha|valdun": 30, // 長く生きる者どうし、黙って茶を飲む
    "polf|valdun": 30, // 昔話を毎回はじめて聞くように聞く
    "gensai|takimaru": -15, // 嫌っているが困ると頼る。顔役は裏で借金を肩代わり
    "gensai|tsuyuha": 40, // 子どもの頃に尻を叩かれた。頭が上がらない
    "anselmo|gensai": 35, // 悪党どうし酒を酌み交わす
    "takimaru|tsuyuha": 50, // 子どもの頃から面倒を見てきた孫のようなもの
    "takimaru|valdun": 35, // 一目で懐き、兄貴と呼ぶ
    "anselmo|yurien": 35, // 骨の話で夜通し盛り上がる
    "roswitha|yurien": 20, // 毒舌に毒舌で返せる唯一の人
    "anselmo|roswitha": -15, // 酒代の帳簿を付けられて閉口する
    "polf|roswitha": 40, // 砦の娘だと思って可愛がる
    "izra|polf": 20, // 鐘の音を遠くからでも聞き分ける
    // ---------------------------------------------------------------- C5（talk_banter_k5.js の頭の相性）
    "bruno|trude": 20, // 発明家は巨漢に飯を食わせたがり、巨漢は爆発に怯える
    "bruno|souhaku": 30, // 嵐の海を泳いだ者どうし
    "adele|felix": 20, // 同じ麦の都
    "felix|trude": -15, // 帝国の出。「上官」と「退く順番」
    "felix|wolfram": -30, // 脱走兵と元の将軍
    "felix|sieglinde": -20, // 署名した命令書
    "trude|tula": -20, // 母親役の取り合い
    "adele|annelise": -15, // 先輩の張り合い
    "souhaku|tsuyuha": 30, // 島の婆さまには頭が上がらない
  });
})(globalThis.G = globalThis.G || {});
