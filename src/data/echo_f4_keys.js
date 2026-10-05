// F4：選んだことが、あとで返ってくる（因果）の表。仕組みは src/engine/zzzzzzzzz_echo_f4.js
// D.ECHO_KEYS：覚えの鍵 → { name（テスト・覚え書き用）, tone（町の空気に足す数。+1 慕われる方へ、-1 嫌われる方へ）, after（返ってくるまでの日数）, same（同じ場所でも返る） }
// D.ECHO_TAGS：既存の出来事 id → [{ pick（選択肢の名の正規表現）, on（"ok"・"ng"・"any"・"win"）, key }]。出来事のファイルは書き換えない
// D.ECHO_ARRIVE・D.ECHO_FIRST：町に着いたときの一文（町の空気ごと）。噂と町の空気の通行人のひとことは D.AMBIENT に足す
// 物語の文に内部の数は書かない。レーン C＋V（F4）
(function (G) {
  const D = (G.data = G.data || {});
  const X = () => G.echo;

  D.ECHO_KEYS = Object.assign(D.ECHO_KEYS || {}, {
    // ---- 既存の出来事から
    spared_thief: { name: "スリの子を見逃した", tone: 1, after: 4 },
    caught_thief: { name: "スリの子を捕まえた", tone: 0, after: 5 },
    saved_child: { name: "馬車の前の子を救った", tone: 1, after: 5 },
    ignored_child: { name: "馬車の前の子を見捨てた", tone: -1, after: 4 },
    freed_heretic: { name: "処刑台の老人を逃がした", tone: 0, after: 6 },
    helped_traveler: { name: "倒れた旅人を助けた", tone: 0, after: 4 },
    robbed_traveler: { name: "倒れた旅人の身ぐるみを剥いだ", tone: 0, after: 5 },
    saved_caravan: { name: "襲われた隊商を助けた", tone: 0, after: 5 },
    left_caravan: { name: "襲われた隊商を見捨てた", tone: 0, after: 4 },
    looted_caravan: { name: "襲われた隊商の荷を漁った", tone: 0, after: 5 },
    spared_soldier: { name: "逃げた兵を見逃した", tone: 0, after: 6 },
    beat_drunk: { name: "酒場の大男を殴り倒した", tone: 0, after: 3 },
    freed_slaves: { name: "奴隷を自由にした", tone: 1, after: 6 },
    kept_stall: { name: "屋台の店番をしてやった", tone: 1, after: 4 },
    hid_conscript: { name: "徴兵から少年を逃がした", tone: 1, after: 6 },
    // ---- 迷う選択（src/data/echo_f4_events.js）
    grain_told: { name: "村の隠し麦を役人に教えた", tone: 0, after: 5 },
    grain_hidden: { name: "村の隠し麦を黙っていた", tone: 0, after: 5 },
    cure_young: { name: "一人分の薬を若い傭兵に使った", tone: 0, after: 5 },
    cure_old: { name: "一人分の薬を薬師の婆さんに使った", tone: 0, after: 5 },
    letter_sold: { name: "商会の裏帳面を競争相手に売った", tone: -1, after: 5 },
    letter_back: { name: "商会の裏帳面を持ち主に返した", tone: 0, after: 5 },
    letter_guard: { name: "商会の裏帳面を衛兵に渡した", tone: 1, after: 5 },
    hid_runaway: { name: "追われる娘をかくまった", tone: 0, after: 5 },
    gave_runaway: { name: "追われる娘を衛兵に渡した", tone: 0, after: 5 },
    opened_house: { name: "閉ざされた病の家を開けた", tone: -1, after: 5 },
    sealed_house: { name: "閉ざされた病の家を開けなかった", tone: 0, after: 5 },
    took_blame: { name: "見習いの代わりに罪をかぶった", tone: 1, after: 4 },
    named_thief: { name: "見習いの名を言った", tone: 0, after: 4 },
    // ---- 町の空気の出来事から
    sided_widow: { name: "町の揉めごとで寡婦の側についた", tone: 0, after: 5, same: true },
    sided_guild: { name: "町の揉めごとで組合の側についた", tone: 0, after: 5, same: true },
  });

  D.ECHO_TAGS = Object.assign(D.ECHO_TAGS || {}, {
    pickpocket: [{ pick: /見逃して/, on: "any", key: "spared_thief" }, { pick: /追いかける/, on: "ok", key: "caught_thief" }],
    carriage: [{ pick: /飛び込んで/, on: "any", key: "saved_child" }, { pick: /見なかった/, on: "any", key: "ignored_child" }],
    heretic: [{ pick: /縄を切って/, on: "ok", key: "freed_heretic" }, { pick: /縄を切って/, on: "win", key: "freed_heretic" }],
    fallen: [{ pick: /助け起こす/, on: "any", key: "helped_traveler" }, { pick: /身ぐるみ/, on: "any", key: "robbed_traveler" }],
    caravan: [{ pick: /助けに入る/, on: "any", key: "saved_caravan" }, { pick: /見捨てる/, on: "any", key: "left_caravan" }, { pick: /荷を漁る/, on: "any", key: "looted_caravan" }],
    m4_deserter: [{ pick: /^見逃す|干し肉/, on: "any", key: "spared_soldier" }],
    w4_w_runner: [{ pick: /見逃して/, on: "any", key: "spared_soldier" }],
    brawl: [{ pick: /殴り返す/, on: "ok", key: "beat_drunk" }],
    slaver: [{ pick: /買い取って|力ずく/, on: "ok", key: "freed_slaves" }, { pick: /力ずく/, on: "win", key: "freed_slaves" }],
    m3_stall: [{ pick: /店番/, on: "any", key: "kept_stall" }],
    v1_conscript: [{ pick: /少年を連れて/, on: "ok", key: "hid_conscript" }],
  });

  // ---------------------------------------------------------------- 町に着いたとき（町の空気ごと）
  D.ECHO_ARRIVE = {
    loved: [
      "門番が、あなたの顔を見て槍を下ろした。「お帰り」と言われるほどの町ではないはずなのに、そう聞こえた。",
      "通りのパン屋が、焼き上がりを一つ、黙ってあなたの手に押しつけた。代金は受け取らなかった。",
      "広場の子どもたちが、あなたの名前を呼んで駆けてきて、呼んだことに照れて逃げていった。",
    ],
    hated: [
      "門をくぐると、通りの話し声がひとつずつ止んでいった。あなたの後ろで、また始まる。",
      "井戸端の女たちが、あなたを見て桶を抱え直し、家の中へ入った。戸が閉まる音が三つ続いた。",
      "宿の看板娘が、窓からあなたを見て、鎧戸を下ろした。昼なのに。",
    ],
  };
  // はじめての町で、名が先に届いているとき（U14 の「誰もあなたの顔を知らない」の代わり）
  D.ECHO_FIRST = {
    known: [
      "はじめての町なのに、門番があなたの名を聞いて顔を上げた。噂は、あなたより先に着いていたらしい。",
      "はじめて来る町だ。それでも酒場の前の男が、連れに何か耳打ちしてこちらを見た。名前は、足より速い。",
    ],
    loved: [
      "はじめての町なのに、門番があなたの名を聞いて、笑って通してくれた。よい噂が先に着いていたらしい。",
    ],
    hated: [
      "はじめての町なのに、門番があなたの名を聞いて、手元の帳面に何か書きつけた。噂は、あなたより先に着いていた。",
    ],
  };

  // ---------------------------------------------------------------- 通行人のひとこと：噂が広がる・町の空気
  const heard = (k, d) => (S) => !!(X() && X().heard(S, k, d));
  const mood = (m) => (S) => !!(X() && X().mood(S) === m);
  D.AMBIENT = D.AMBIENT || [];
  D.AMBIENT.push(
    // 噂（よそでやったことが、ここまで届いている）
    { id: "u3_f4_saved_child", where: ["town"], w: 3, cond: heard("saved_child"), text: "荷車引きが連れに話している。「暴れ馬車の前に飛び込んで、よその子を拾った冒険者がいたとさ。……馬鹿だね。いい馬鹿だ」" },
    { id: "u3_f4_ignored_child", where: ["town"], w: 2, cond: heard("ignored_child"), text: "井戸端で女が言う。「子どもが馬車にはねられるのを、突っ立って見てた冒険者がいたんだって。剣を下げてたくせにさ」あなたの剣に、誰も気づかなかった。" },
    { id: "u3_f4_spared_thief", where: ["town"], w: 2, cond: heard("spared_thief"), text: "裸足の子どもたちが、路地で何か言い合っている。「財布を盗られても追っかけてこない冒険者がいるんだって」「うそだあ」あなたの財布を、何人かがちらりと見た。" },
    { id: "u3_f4_freed_heretic", where: ["town"], w: 2, cond: heard("freed_heretic", 3), text: "教会の前で、助祭が掲示を貼り替えている。「処刑台から異端を逃がした者を探している」とある。人相書きは、あまり似ていなかった。" },
    { id: "u3_f4_robbed_traveler", where: ["town"], w: 2, cond: heard("robbed_traveler", 3), text: "街道の話をしていた荷運びが、声を落とした。「倒れてる旅人の身ぐるみを剥ぐ奴が出るんだと。……人だか獣だか、分からねえな」" },
    { id: "u3_f4_saved_caravan", where: ["town"], w: 2, cond: heard("saved_caravan"), text: "商人宿の前で、隊商の男たちが乾杯している。「街道で盗賊に囲まれたとき、通りがかりが一人で斬り込んできてさ」誰も、その一人の顔を覚えていないようだった。" },
    { id: "u3_f4_left_caravan", where: ["town"], w: 2, cond: heard("left_caravan"), text: "商人宿の帳場で、隊商頭がこぼしている。「襲われてるのを、丘の上から見てた奴がいたんだ。剣を持ってた。……見てただけだ」" },
    { id: "u3_f4_beat_drunk", where: ["town"], w: 2, cond: heard("beat_drunk"), text: "酒場の外で、腕に包帯の男が仲間に言っている。「あの拳は忘れねえ。今度会ったら、兄貴たちを連れていく」あなたの拳を、誰も見ていなかった。" },
    { id: "u3_f4_freed_slaves", where: ["town"], w: 2, cond: heard("freed_slaves"), text: "広場の隅で、奴隷商人の手下らしい男が、似顔絵を見せて回っている。「この顔、見なかったか。商品を逃がしやがった」似顔絵の目は、あなたより少し悪そうだった。" },
    { id: "u3_f4_grain", where: ["town"], w: 2, cond: heard("grain_told", 3), text: "粉屋の前で、農夫が吐き捨てた。「どこの村だか、隠し麦を役人に売った奴がいるとよ。冬が越せねえ家が出る」" },
    { id: "u3_f4_runaway", where: ["town"], w: 2, cond: heard("hid_runaway", 3), text: "衛兵の詰所の前に、新しい手配書。逃げた小間使いの娘と、それを「かくまった流れ者」。流れ者の人相は、ほとんど空白だった。" },
    { id: "u3_f4_house", where: ["town"], w: 2, cond: heard("opened_house", 3), text: "薬屋の主が、客に首を振っている。「よその町で、病で閉じた家の板を外した奴がいるそうだ。おかげでそこは、今、咳の音ばかりだと」" },
    // 町の空気
    { id: "u3_f4_loved_1", where: ["town"], w: 3, cond: mood("loved"), text: "八百屋の親父が、あなたの籠に頼んでもいないかぶを一つ放り込んだ。「この前の礼だ。何の礼かは、女房に聞いてくれ」" },
    { id: "u3_f4_loved_2", where: ["town"], w: 3, cond: mood("loved"), text: "路地で遊んでいた子どもが、木の剣を構えてあなたの真似をした。母親が笑って、あなたに頭を下げた。" },
    { id: "u3_f4_loved_3", where: ["town"], w: 2, cond: mood("loved"), text: "教会の鐘撞きが、すれ違いざまに言った。「あんたの名前、祈りの帳面に書いといたよ。頼まれちゃいないがね」" },
    { id: "u3_f4_hated_1", where: ["town"], w: 3, cond: mood("hated"), text: "屋台の女が、あなたが近づくと品物に布をかけた。隣の屋台も、その隣も。" },
    { id: "u3_f4_hated_2", where: ["town"], w: 3, cond: mood("hated"), text: "背中に小石が当たった。振り返ると、路地の子どもたちが散っていくところだった。大人は誰も叱らなかった。" },
    { id: "u3_f4_hated_3", where: ["town"], w: 2, cond: mood("hated"), text: "酒場の前を通ると、中の歌がやんだ。あなたが通り過ぎるまで、誰も杯を置かなかった。" },
    { id: "u3_f4_known_1", where: ["town"], w: 2, cond: mood("known"), text: "鍛冶屋の徒弟が、あなたの剣をちらちら見ている。親方に頭をはたかれて、仕事に戻った。" },
    { id: "u3_f4_known_2", where: ["town"], w: 2, cond: mood("known"), text: "宿の前で、若い冒険者があなたの名を口にして、連れに肘でつつかれた。「本人の前で言うな」" },
  );

  // ---------------------------------------------------------------- 施設の「あなたなら」（C10）：町の空気で現れる
  const FAC = (D.C10_FAC = D.C10_FAC || {});
  const add = (fac, list) => { FAC[fac] = (FAC[fac] || []).concat(list); };
  add("inn", [
    { on: "echo:loved", label: "女将に、奥の部屋を空けてもらう", ok: { text: "女将はあなたの顔を見るなり、帳場の奥の鍵を外した。「あんたから宿代は取れないよ。……一晩だけね」干した布団の匂いがした。", heal: "full" } },
  ]);
  add("tavern", [
    { on: "echo:loved", label: "町の者に、困りごとを聞いて回る", ok: { text: "あなたが卓につくと、頼みごとのある顔がひとつずつ寄ってきた。迷い山羊、壊れた樋、隣の家の犬。どれも小さい。どれも、ここで生きる人の悩みだ。半日かけて片づけると、酒場の主が皿を一枚多く出した。", hp: 6, fame: 1, town: 1 } },
    { on: "echo:hated", label: "黙って、店じゅうに一杯ずつおごる", cost: 20, ok: { text: "誰も礼は言わなかった。それでも何人かは杯を空け、一人だけ、帰りがけにあなたの肩を軽く叩いていった。", town: 1 } },
  ]);
  add("church", [
    { on: "echo:hated", label: "町の者の前で寄進をして、頭を下げる", cost: 30, ok: { text: "朝の祈りの終わりに、あなたは寄進箱の前で深く頭を下げた。囁きが広がる。許されたわけではない。ただ、明日からは石が少し減るだろう。", town: 2, virtue: 1 } },
  ]);
  add("shop", [
    { on: "echo:loved", label: "店の主に、奥の棚を見せてもらう", ok: { text: "店の主は表の戸を半分閉めて、奥の棚から小瓶を一つ取った。「これは売り物じゃない。あんたが持ってる方がいい」", item: { potion: 1 } } },
  ]);
})(globalThis.G = globalThis.G || {});
