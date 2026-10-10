// R13（R10 の中 20「八年目からは初めて見る出来事がほぼ無い」）：終盤に、プレイヤーが自分で選べる目標を見せる文と数。
// 仕組みは src/engine/zzzzzzzzzzzzzzzzzzzz_r13_unfinished.js。新しい出来事は足さず、使徒（E3・E7）・仲間の頼みごと（C9）・迷宮・トロフィーを数え直す。
// 使徒の名と正体は地の文に出さない（docs/lore/voice.md）。呼び名は会う出来事の見出しか「〇〇の主」。レーン C＋V
(function (G) {
  const D = G.data;
  D.R13_TODO = {
    FROM_YEAR: 7,          // この年から、宿と依頼の一覧で「やり残したこと」が見える
    STIR_YEAR: 8,          // この年から、倒していない使徒が動き出す
    STIR_FIRST: 20,        // 八年目に入って何日目に最初の知らせが立つか
    STIR_GAP: 75,          // 次の使徒が動き出すまでの日数
    STIR_MAX: 4,           // 一つの冒険で動き出す使徒の数（動くのは APOSTLES の passive だけ）
    SETTLE_FAME: 12,       // 動き出した使徒を討ったときの名声
    GO_MAX: 4,             // 宿に並べる「向かう」の数
    LIST_MAX: 8,           // 一覧に出す行の数
    TROPHY_MAX: 2,
    REGION_MAX: 2,         // 一覧に出す、足を踏み入れていない地方の数（近い順）         // 一覧に出すトロフィーの手がかりの数
    GROUP: "やり残したこと",
    COUNT: "やり残したことを数える",
    COUNT_SUB: "引退まで{left}",
    HEAD: "指を折って数えてみる。引退まで{left}。",
    NONE: "数えてみたが、やり残したことは思い当たらない。悪くない十年だった。",
    QTITLE: "引退までに",
    NEW: "引退まで、あと数年。やり残したことが気になりはじめた。（宿屋で数えられる。右上の「依頼」にも）",
    // 一覧の一行
    APOSTLE_STIR: "{label}が動き出した（{place}）。弱みの手がかりは{got}／{all}。引退の前に決着をつけるか",
    APOSTLE_UNKNOWN: "名も知らぬ使徒が、まだ大陸のどこかにいる",
    MATE_OPEN: "{who}の頼み「{title}」が、まだ途中（{place}）",
    MATE_WAIT: "{who}の頼みごとは、まだ聞いていない（話してみる）",
    REGION: "{region}には、まだ足を踏み入れていない（近いのは{place}）",
    DEPTH: "{place}は地下{d}階まで（全{n}階）。最奥には、まだ届いていない",
    TROPHY: "トロフィーの手がかり：『{name}』──{desc}",
    GO: "{place}へ向かう",
    GO_SAY: "{place}へ向かうことにした。{why}",
    GO_FAR: "道は長い。{place}までおよそ{days}日。",
    GO_NONE: "{place}への道が見つからない。",
    // 使徒ごとの終盤の動き（持ち主：「設定や世界観、キャラの性格をねじまげない」「受動的なイベントと能動的なイベントがある」）
    //   passive：設定に人の世へ手を出す理由がある者だけ。八年目から自分で動き出し、町で「世の大事」になる（stir の文。根拠は why）
    //   active：縄張りから出ない・人に無関心・友好の者。勝手に攻めてこない。七年目から、その使徒の場所を探り続ける（seek 回）か、
    //           迷宮を奥まで降りる（deep。最奥の一つ手前まで）と、はじめて会う出来事（E3 の e3_meet_<id>）に行き当たる
    //   居城の主（graw・gormore・mordu の会い方）は居城の最奥で会う（E2・E3 のまま）。倒せない使徒（E8 の noslay）は一覧に出さない
    STIR_HEAD: "世の大事",
    APOSTLES: {
      mirza: { how: "passive", why: "人に強い興味を持ち、気に入った人を糸で吊って踊らせる（world.js の微笑・M4 の dance）",
        stir: "{place}に近い町で、また人が踊りだしたという。顔は泣いているのに、足だけが楽しそうに跳ねる。三日目の晩、見物していた子どもが、拍手をやめられなくなった。" },
      azlag: { how: "passive", why: "空から刃を撃つ鳥。砦や町を焼く（M4 の sky）",
        stir: "黒鉄の砦の見張りが、昼の空に刃の雨を見た。翼の影は{place}のほうへ消えた。砦では今、鉄の匂いのする物を片端から地下へ運び込んでいる。" },
      chezar: { how: "passive", why: "宮廷に化けて潜み、人に戦をさせて楽しむ（world.js の百面・M4 の宮廷の黒幕）",
        stir: "帝都で、また宰相府の役人が一人、職を辞した。北の賢人と呼ばれる客人が来てから、国境の砦に兵が集まりはじめている。酒場の誰も、戦の相手の名を知らない。" },
      mordu: { how: "passive", why: "触れた土地を腐らせる。疫病を「庭の手入れ」と呼ぶ（world.js の苔衣・M4 の rot）",
        stir: "{place}のほうから来た旅人の荷が、着く前に苔に覆われていた。庭が、少しずつ広がっているらしい。手入れの行き届いた、静かな庭だという。" },
      gormore: { how: "passive", why: "飢饉の年には山脈を越えて町の食糧庫を喰らう（world.js の灼け口・M4 の hunger）",
        stir: "今年の秋は不作だった。{place}に近い村で、冬の蓄えがひと晩で消えた。食糧庫の壁には、大きな歯の跡が三列並んでいたという。干し肉の樽だけ、きれいに残されていた。" },
      aurelia: { how: "passive", why: "聖女に化けて人の中に潜み、信者の祈りを集めている（world.js の蝶翅）",
        stir: "{place}の御堂に詣でた巡礼が、帰ってこなくなっている。生き聖女さまの前の祈りの声は日ごとに大きくなり、近ごろは夜も止まないという。" },
      lugu: { how: "passive", why: "港の沖に出て、歌に答えない船を呑む（world.js の海嘯）",
        stir: "港に、沖から歌が聞こえる夜が続いている。調子の外れた、ひどく寂しい歌だ。答えなかった漁船が二隻、戻らなかった。" },
      tetsukui: { how: "passive", why: "金属の匂いに寄ってきて、町の中で鉄を食う（igyo.md の鉄喰い）",
        stir: "{place}で、夕べの鐘のあとに鍛冶場の鉄床が消えた。見た者の話では、犯人はとても大きく、食べ終えてから小さくげっぷをしたらしい。町じゅうの鍋が隠された。" },
      graw: { how: "active", why: "城で、強い者が訪ねてくるのを待っている（world.js の黒鎧）" },
      levian: { how: "active", deep: true, why: "遺構の奥の水の書庫で、抜いた記憶を読んでいる（world.js の忘れ水）" },
      zalve: { how: "active", seek: 6, why: "帳場の奥で金を貸す。取引の相手で、攻めてはこない（world.js の砂塵）" },
      yura: { how: "active", why: "眠り続ける幼子。夢の中に現れるだけ（world.js の逆夢）" },
      notari: { how: "active", seek: 8, why: "ほとんど何もしない。何年かに一度、先のことを一言だけ答える（world.js の白霧）" },
      kurobane: { how: "active", seek: 8, why: "こちらを見もしない（igyo.md の黒翼）" },
      tojizuki: { how: "active", why: "夜の空の眼。人に無関心（igyo.md の閉じ月）" },
      togaoi: { how: "active", why: "罪ある者だけを追う。追われる出来事はすでにある（events_m3.js の m3_togaoi）" },
      sanno: { how: "active", seek: 6, why: "谷底から出ず、底の緑の石を探している（igyo.md の酸溜まり）" },
    },
    SEEK: 6,                // seek を書いていない使徒の、探る回数の既定
    FOUND: "奥へ、奥へと探るうちに、空気が変わった。ここから先は、人の来る所ではない。",
    HINT_LAIR: "{place}の最奥（地下{n}階）まで降りれば、主に会える（今は地下{d}階まで）",
    HINT_SEEK: "{place}の奥に、まだ何かいる気配がある。あと{n}回ほど探れば行き当たりそうだ",
    HINT_DEEP: "{place}を地下{n}階まで降りれば、何かに行き当たりそうだ（今は地下{d}階まで）",
    HINT_KEYS: "{label}（{place}）：弱みの手がかりは{got}／{all}。揃えるほど刃が届く",
    STIR_MEMO: "噂：{label}が動き出した（{place}）",
    STIR_CHRON: "世の大事：{label}が動き出したと聞く",
    SETTLE: "動き出していた{label}を討ち、決着をつけた。町に着けば、この話でもちきりになるだろう。",
    SETTLE_CHRON: "動き出した{label}を討ち、決着をつける",
    // エピローグ（十年の引退）の一行（{name} 主人公）
    EPI_LEFT: "{label}は、ついに討たれないまま残った。{name}は晩年、{place}の噂を聞くたびに、黙って杯を置いたという。",
    EPI_SETTLED: "引退の前の年、{name}は動き出した{label}と決着をつけた。その話をせがまれると、{name}はいつも短く切り上げて、酒の話に変えた。",
    EPI_TODO: "やり残したことも、いくつかあった。{thing}──それを口にするとき、{name}は少しだけ若い顔をした。",
    TROPHY_KEY: "r13_settle",
  };
  // 動き出した使徒を、引退の前に討つ（S.r13.settled。古いセーブでは無いので付かない）
  if (Array.isArray(D.TROPHIES)) D.TROPHIES.push({ key: "r13_settle", name: "決着", tier: "金", desc: "動き出した使徒を、引退の前に討った", test: (S) => !!(S.r13 && S.r13.settled > 0) });
})(globalThis.G = globalThis.G || {});
