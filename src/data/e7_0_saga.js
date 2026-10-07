// E7：使徒を正面から倒す長編の表（仕組みは src/engine/zzzzzzzzzzzzz_e7_saga.js）。文は e7_<使徒>_*.js の出来事。
// 試作は一体：微笑の使徒（mirza。刻印の環の二十八・B 級）。選んだ理由：
//   設定（D.MAJIN・majin.md）・眷属（E4 の糸吊りの踊り手と笑い面の侍従）・人物（C4 の眷属ミュゼットと、その師のベルトラン。C9 の頼みごと「糸の先」）・
//   世の出来事（M4 の三日三晩の踊り）・正気で見える名（M13）・会う出来事と弱み（E3）がそろっていて、どれも町の人の暮らしに落ちる被害を持つ。
// 格（持ち主の決定。S 級・A 級・B 級。格は G.e7.grade を通して読む）：B 級の使徒は、主人公たちだけで正面から倒せる。ただし備えが要る。
// 備えなしでは若君の糸の守りに刃が届かず（E11：若君は絶界を持たない。守りは糸）、届いても勝てない強さにする。grade は長編の表に書いた格（E3 の格と食い違わないことを tests/checks/e7_saga.mjs が見る）
//
// 欄（D.E7.SAGAS[id]）：
//   id・apostle（E3 の使徒 id）・foe（決戦の敵。E3 の使徒の敵 id）・flag（倒した印）・title（依頼の一覧の名）・kind・client・home（被害の町）
//   open(S) 噂を聞いて、行動の欄から始められるか（無くても、町の出来事 e7m_1 から始まる）・openLabel・openSub
//   chapters [{ title, line, at, start, gap, cond, subs, need, chron }]（エンジンの頭の説明）
//   preps { 鍵: { title, line, weak { hp, dmg, hit, def, agi, open, on }, chron } } 備え直す章の備え（weak は決戦での弱り）
//   weak [{ test(S, st), ...weak }] 仲間や話の印での弱り
//   final { hp, dmg, hit, def, agi, keyHp, minHp, minDmg, minHit, open [一行], wall, win, flee } 決戦の正面の強さ
//   toy { hp（元の何倍）, dmg, hit, agi, rounds, open, held, bored, after } 一度目の対面
//   allies { 鍵: { name, c2, cause } } 失いうる人
//   ends { 鍵: { name, chron, epithet, fame, trophy, memo, scar [{ at, line }], lose, say } } 結末
// 文の決まりは docs/VISION.md（四つの柱・メリハリ・避ける癖）と docs/lore/voice.md。物語の中で数値を出さない。使徒の名は地の文に出さない。
// レーン E＋V（E7）
(function (G) {
  const D = (G.data = G.data || {});
  const E7 = (D.E7 = D.E7 || {});
  E7.SAGAS = E7.SAGAS || {};
  E7.EVENTS = E7.EVENTS || [];

  // 出来事を足す道具（章のファイルが使う）。text は文字列か、段落の配列（\n\n でつなぐ）か、関数（S, st → 文字列。読むたびに組み立てる）
  const P = (...a) => a.join("\n\n");
  E7.P = P;
  E7.ev = (saga, spec) => {
    const e = Object.assign({ where: [], w: 0, noC10: true, e7: saga }, spec);
    const t = spec.text;
    // 関数の文は、空の段落（条件に合わなかった行）を落としてつなぐ
    if (typeof t === "function") Object.defineProperty(e, "text", { get: () => String(t(G.S || { flags: {} }) || "").split("\n\n").filter((x) => x.trim()).join("\n\n"), enumerable: true, configurable: true });
    else if (Array.isArray(t)) e.text = P(...t);
    (e.choices || []).forEach((c) => ["ok", "ng", "win"].forEach((k) => joinText(c[k])));
    if (D.EVENTS && !D.EVENTS.some((x) => x.id === e.id)) D.EVENTS.push(e);
    E7.EVENTS.push(e.id);
    return e;
  };
  // 長編の印（話の状態）を読む
  E7.st = (S, saga) => (S && S.e7 && S.e7[saga]) || { f: {}, prep: {}, sub: {} };
  // 結果の文が配列のときは段落にまとめる（戦いの勝ち・判定の結果の中の win も）
  // 関数の文（S → 文字列か段落の配列）は、読むたびに今の冒険で組み立てる（仲間がいるか、などで文が変わる結果）
  const clean = (v) => (Array.isArray(v) ? P(...v.filter(Boolean)) : String(v || "")).split("\n\n").filter((x) => x.trim()).join("\n\n");
  const joinText = (o) => {
    if (!o || typeof o !== "object") return;
    const t = o.text;
    if (typeof t === "function") Object.defineProperty(o, "text", { get: () => clean(t(G.S || { flags: {} })), enumerable: true, configurable: true });
    else if (Array.isArray(t)) o.text = clean(t);
    joinText(o.win);
  };
  E7.f = (saga, k, v) => (S) => { const x = E7.st(S, saga).f[k]; return v === undefined ? !!x : x === v; };

  // ================================================================ 微笑の使徒（灰の荒野の日傘の若君）
  const M = "mirza";
  const st = (S) => E7.st(S, M);
  const with_ = (k) => (S) => st(S).f["ally_" + k] === "with";
  const lore = (S, id) => !!(S.lore && Object.keys(S.lore).some((k) => k === id || k.startsWith(id + ":")));

  E7.SAGAS.mirza = {
    id: M, apostle: "mirza", grade: "B", foe: "e3_mirza", flag: "e3:mirza", home: "w7_salyues",
    title: "微笑の糸を断つ", kind: "使徒を追う", client: "芸の町サリュエスの人々",
    // 日傘の若君に会ったか、踊りの町の話を聞いたら、町で噂をたどれる
    open: (S) => !!(S.flags.mirza || S.flags["ev:e3_meet_mirza"] || S.flags["ev:m4_here_dance"] || lore(S, "m4_dance") || lore(S, "mirza")) && (S.day || 0) >= 10,
    openLabel: "微笑の糸を断つ：広場の音楽",
    openSub: "酒場で、日傘の話を聞く",

    // 入口（章に数えない）：町の酒場で噂を聞く。噂を聞いた人は行動の欄から、ほかは町の出来事 e7m_1 で
    opener: { at: "town", start: "e7m_1", cond: (S) => S.loc !== "w7_salyues" },
    // B 級は「そこそこ」：噂 → 調べる → 備え → 決戦 → その後 を五章と終章で（持ち主の決定。A 級は六〜八章、S 級は十〜十二章）
    chapters: [
      { title: "踊りのあと", line: "芸の町サリュエスで三日三晩の踊りがあったという。行って、広場で何があったのかを見る。", at: ["w7_salyues"], start: "e7m_2", gap: 0,
        chron: "芸の町サリュエスで、踊りのあとの広場を見る" },
      { title: "糸の出どころ", line: "日傘の若君のことを調べ、手を貸す者を探す。書庫・生き残り・糸屋・酒場の二階の絵描きのうち、二つ以上。", at: ["w7_melvi", "w7_hermitage", "karna"], need: 2,
        subs: {
          lib: { title: "写本の町の古い記録", at: ["w7_melvi"], start: "e7m_3_lib", line: "写本の町メルヴィの書庫で、昔の踊りの記録を探す" },
          old: { title: "峠の庵の老婆", at: ["w7_hermitage"], start: "e7m_3_old", line: "峠の庵ザレムに、昔の踊りの生き残りがいるという" },
          rope: { title: "糸屋の婆さん", at: ["karna"], start: "e7m_3_rope", line: "{place:karna}の糸屋に、広場の糸を見せる" },
          bert: { title: "付けの利く剣", at: ["karna"], start: "e7m_4", line: "{place:karna}の酒場の二階の絵描きに、剣を頼む", cond: (S, st) => !!(st.sub.rope || st.sub.lib || st.sub.old) },
        },
        chron: "日傘の若君の糸の出どころを調べる" },
      { title: "灰の荒野へ", line: "断界山脈を越えて使徒領・灰の荒野へ。日傘の庭の奥で、若君が待っている。", at: ["mountains"], start: "e7m_5",
        chron: "断界山脈を越え、灰の荒野の日傘の庭で若君に挑み、退く" },
      { title: "備え直す", line: "正面から勝つための備えをする。備えを二つ以上そろえたら、灰の荒野へ戻れる。", at: "town", need: 2,
        subs: {
          train: { title: "左手の稽古", at: ["w2_zalgros"], start: "e7m_8_train", line: "闘技の都ザルグロスの稽古場で、糸を見る目を鍛える" },
          arms: { title: "糸断ちの刃", at: ["w2_dranherz"], start: "e7m_8_arms", line: "鍛冶の都ドランヘルツで、糸を断つ刃を打たせる" },
          ward: { title: "糸返しの陣", at: ["zephara"], start: "e7m_8_ward", line: "首都エルメシアの学院で、糸を返す陣を描かせる" },
          host: { title: "灰色の傭兵", at: ["w7_glatz"], start: "e7m_8_host", line: "傭兵の町グラッツで、踊り手の列を押さえる人数を雇う" },
          price: { title: "顔の値段", at: ["w7_hermitage"], start: "e7m_8_price", line: "峠の庵ザレムの老婆に、糸の掛からない顔の作り方を聞く" },
        },
        chron: "日傘の若君を正面から討つ備えをする" },
      { title: "日傘を閉じる", line: "使徒領・灰の荒野へ戻り、日傘の若君と決着をつける。", at: ["wasteland"], start: "e7m_9",
        chron: "灰の荒野で、日傘の若君との決戦に臨む" },
      { title: "糸のあと", line: "芸の町サリュエスへ戻り、踊りのあとの広場を見る。", at: ["w7_salyues"], start: "e7m_10", after: true },
    ],

    preps: {
      train: { weak: { hit: 6, agi: 12, on: "糸の向きが、見える。若君の指が動く前に、肩が勝手に半歩ずれた。稽古場で何百回も転んだ体が、覚えている。" }, chron: "闘技の都ザルグロスの稽古場で、糸を見る目を鍛える" },
      arms: { weak: { def: 14, hp: 60, on: "腰の刃が、灰の中で鈍く光った。鍛冶屋が三晩寝ずに打った刃だ。糸に触れると、糸のほうが先に音を上げる。" }, chron: "鍛冶の都ドランヘルツで、糸断ちの刃を打たせる" },
      ward: { weak: { open: true, agi: 15, on: "足もとの灰に、学院で覚えた陣を描く。線を閉じた瞬間、見えない壁に指一本ぶんの隙が開いた。" }, chron: "首都エルメシアの学院で、糸返しの陣を描かせる" },
      host: { weak: { hp: 90, dmg: 0.88, on: "背後の岩陰で、弩の弦が一斉に鳴った。傭兵たちの矢は若君に届かない。届かなくていい。日傘の骨が、矢を払うたびに一本ずつ軋む。" }, chron: "傭兵の町グラッツで、灰色の傭兵を雇う" },
      price: { weak: { open: true, hit: 14, on: "あなたの顔は動かない。若君の糸が、頬の上を何度も滑って、掛かる所を見つけられずに垂れた。" }, chron: "峠の庵ザレムで、顔を差し出す" },
    },
    weak: [
      { test: with_("bert"), dmg: 0.9, hit: 3, on: "ベルトランが布を巻いた剣を肩に担いで、あなたの半歩前に立った。「お前の後ろの糸は、俺が切る。前だけ見てろ」" },
      { test: (S) => st(S).f.mus === "ally", hp: 40, dmg: 0.9, on: "若君の背後で、糸の束がいくつも垂れたまま動かない。人形師の娘が、針で縫い留めた糸だ。" },
      { test: (S) => ["with", "back"].includes(st(S).f.fine), agi: 8, on: "頭の上の綱から、フィーネの声が落ちてくる。「右。次、左の下から」糸の来る向きを、綱の上の娘は一度も外さない。" },
    ],

    final: {
      hp: 370, dmg: [3, 10, 5], hit: 88, def: 25, agi: 76, keyHp: 25, minHp: 150, minDmg: 0.5, minHit: 55,
      open: ["日傘が開いた。白いレースの縁取りの下で、若君が笑っている。今度は、退屈そうではなかった。"],
      wall: "刃が、若君の手前で幾重にもの糸に絡め取られる。陣か、差し出したもの、あるいは伝説の刃が無ければ、この刃は届かない。背を向けて逃げ、備え直すこともできる。",
      win: { text: "日傘の骨が、根元から折れた。", e7: { id: M, won: true }, next: "e7m_9_last" },
      flee: "e7m_9_flee",
    },
    toy: {
      hp: 3, dmg: [2, 8, 3], hit: 88, agi: 95, def: 30, rounds: 3, after: "e7m_7_after",
      open: ["若君は日傘を肩に預けたまま、指を一本だけ立てた。「いいよ。遊んであげよう。三つ数えるあいだだけね」"],
      held: "膝が折れかけた。折れなかった。手首と膝に絡んだ糸が、倒れることを許さない。若君は、倒れた顔より、立ったまま泣く顔のほうが好きなのだ。",
      bored: ["若君が、あくびをした。", "「うん。だいたい分かった。きみの困った顔は、あと三通りくらいだね」指が鳴った。糸がいっせいに緩み、あなたは灰の上に崩れ落ちた。"],
    },
    rage: ["若君の微笑が、はじめて消えた。日傘の骨が一本ずつ開き、灰の空いっぱいに糸が張られていく。", "「痛いな。……痛い。ねえ、これ、痛いって言うんだろう？」若君は自分の頬に触れた指を見て、笑い直した。"],

    allies: {
      bert: { name: "絵描きのベルトラン", c2: "bertrand", cause: "灰の荒野で、日傘の若君の最後の糸を一人で引き受けて" },
      fine: { name: "綱渡りのフィーネ", cause: "灰の荒野で、綱の上から落ちて" },
      mus: { name: "人形師の娘ミュゼット", c2: "musette", cause: "灰の荒野で、自分の糸を若君の糸に縫い留めて" },
      ans: { name: "鉄鍋団の団長アンゼルム", cause: "灰の荒野で、踊り手の列を押さえて" },
    },

    ends: {
      clean: { name: "糸の切れた町", epithet: "糸切り", fame: 260, trophy: ["e7_mirza", "e7_mirza_clean"],
        chron: "灰の荒野で、日傘の若君を正面から討つ。誰も、何も差し出さずに済んだ",
        memo: "日傘の若君を討った。最後の糸は、誰の命も使わずに断った",
        scar: [{ at: "w7_salyues", line: "広場の真ん中の敷石に、日傘の骨が一本、埋めこまれている。子どもたちはその上で跳ねて遊ぶ。踊りではない。ただ跳ねている。" }] },
      bert: { name: "描きかけの絵", epithet: "糸切り", fame: 220, trophy: ["e7_mirza"], lose: ["bert"], cause: "灰の荒野で、日傘の若君の最後の糸を一人で引き受けて",
        chron: "灰の荒野で、日傘の若君を正面から討つ。最後の糸は、絵描きのベルトランが引き受けた",
        memo: "日傘の若君を討った。ベルトランは帰らなかった",
        scar: [{ at: "karna", line: "酒場の階段の三段目は、今も鳴る。二階の部屋は、誰にも貸していない。付けの帳面が、まだ開いたまま帳場に置いてある。" },
          { at: "w7_salyues", line: "広場の真ん中の敷石に、日傘の骨が一本、埋めこまれている。その横に、炭で描いた小さな顔がある。雨が降るたびに、誰かが描き直している。" }] },
      fine: { name: "綱の上の娘", epithet: "糸切り", fame: 220, trophy: ["e7_mirza"],
        chron: "灰の荒野で、日傘の若君を正面から討つ。綱渡りのフィーネが、最後の糸の上を渡った",
        memo: "日傘の若君を討った。フィーネは二度と綱を渡れない",
        scar: [{ at: "w7_salyues", line: "広場の上の綱は、張られたままだ。誰も渡らない。端の柱に、小さな靴が片方だけ結んである。" }] },
      mus: { name: "人形の目", epithet: "糸切り", fame: 220, trophy: ["e7_mirza"], lose: ["mus"], cause: "灰の荒野で、自分の糸を若君の糸に縫い留めて",
        chron: "灰の荒野で、日傘の若君を正面から討つ。人形師の娘ミュゼットが、自分の糸で最後の糸を縫い留めた",
        memo: "日傘の若君を討った。人形師の娘は、人形のまま動かなくなった",
        scar: [{ at: "w7_salyues", line: "一座の小屋の奥に、小さな娘の人形が一体、座らせてある。目だけは、人の手で描き入れたものだ。笑っている目だ。" }] },
      face: { name: "笑わない顔", epithet: "糸切り", fame: 220, trophy: ["e7_mirza"],
        chron: "灰の荒野で、日傘の若君を正面から討つ。最後の糸は、自分の顔で受けた",
        memo: "日傘の若君を討った。あれから、顔が動かない",
        scar: [{ at: "w7_salyues", line: "広場の真ん中の敷石に、日傘の骨が一本、埋めこまれている。町の子どもは、笑わない顔の冒険者の話を、怖い話として覚えている。" }] },
      back: { name: "別の手で", say: "日傘の若君は倒れた。正面からではなかった。芸の町サリュエスの広場では、誰がどうやって倒したのかを、まだ誰も知らない。",
        chron: "日傘の若君は、正面から挑む前に、別の手で倒れた" },
    },
  };

  // ---------------------------------------------------------------- トロフィー（正面から挑んだ人だけ）と、物語の終わり方（M6）の節目と人生の物語の一行
  // トロフィーの表（trophies.js）と M6 の表（epilogue_m6.js）はこのファイルより後に読まれるので、エンジンが読み込みのあとで足す
  E7.TROPHIES = (E7.TROPHIES || []).concat([
    { key: "e7_mirza", name: "糸切り", tier: "金", desc: "長編「微笑の糸を断つ」で、日傘の若君を正面から討ち果たした", test: (S) => !!(S.flags && S.flags["e7:mirza"]) },
    { key: "e7_mirza_clean", name: "誰も払わなかった", tier: "金", desc: "日傘の若君の最後の糸を、誰の命も顔も差し出さずに断った", test: (S) => !!(S.flags && S.flags["e7:mirza:clean"]) },
  ]);
  E7.MILESTONES = (E7.MILESTONES || []).concat([
    { id: "e7_mirza", rank: 88, title: "閉じた日傘", after: "hero",
      test: (S) => !!(S.flags && S.flags["e7:mirza"]),
      text: "芸の町サリュエスの広場に、楽師のいない音楽はもう鳴らない。靴屋が暇そうにしている。それが、いちばんの報いだった。",
      end: "日傘を閉じた身で、旅を終える", line: "{name}は剣を置いた。糸の切れる音を、ときどき夢で聞いたという。" },
  ]);
  E7.HIGHLIGHTS = (E7.HIGHLIGHTS || []).concat([
    { key: "e7_mirza", score: 9, test: (L) => !!(L.flags && L.flags["e7:mirza"]),
      lines: ["{name}は、町ひとつを踊らせた日傘の主を、正面から討った{hear}灰の荒野まで何度も足を運び、一度は負けて逃げ帰ったという。", "芸の町サリュエスでは、{name}の名を出すと、年寄りが黙って靴を脱いで見せる。足の裏の古い傷を。それから、礼を言う。"] },
  ]);
})(globalThis.G = globalThis.G || {});
