// v17a（持ち主の決定 t01）：黒曜の獣（刻印の環の二十四・A 級・敵対）を使徒の表（E3）に足す。長編「王の仇討ち」（E7。表は v17a_golvan_1.js）の相手。
// 設定（docs/lore/igyo.md の二十四・canon_2026-10-11.md）：黒曜石の体の四つ足。壊れては治り続け、物では壊せない。縄張りの中では重さと方角が狂う。
//   いちばん多くの人を殺した異形と記録される。国王ヴァレオンの兄を殺した（c2_people.js の valeon・events_c2.js の c2_valeon）。
// 縄張り：設定に場所が無いので、既にある断界山脈（mountains）の、人の地図の東の端の奥にする（山脈には剣翼の巣と峠の館もあるが、
//   山脈は広く、ここは人の通らない黒い石の斜面。人と魔の境なので、王国の内に国難の獣がいて誰も手を出さない、という食い違いが起きない）。
// 討伐の数（E8：討伐できる使徒は S 2・A 6・B 8。持ち主の決定）は変えない：この獣は「物では壊せない」ので、ふつうに挑んでも倒せない使徒（D.E8.UNSLAY）に入れ、
//   倒す道は長編「王の仇討ち」の決戦だけにする（その決戦だけ戦いになる。src/engine/zz_v17a_golvan.js）。
// 名（刻印の読み）は戦いの見出しにだけ出る。地の文・台詞・噂には書かない（docs/lore/voice.md）。レーン E＋V
(function (G) {
  const D = (G.data = G.data || {});
  const E3 = D.E3;
  if (!E3) return;
  const has = (id) => (S) => !!(S.inv && S.inv[id] > 0);
  const sky = (...w) => (S) => !!(G.skyAt && w.includes(G.skyAt(S.loc, S.day).weather));
  const KEY = (name, desc, flavor) => ({ name, type: "key", price: 0, desc, flavor });

  // ---------------------------------------------------------------- 戦闘データ（A 級の基準。戦いが始まるときに D.ENEMIES へ入る）
  const BASE = (D.E3_BASE && D.E3_BASE.A) || { tier: 7, hp: 320, dmg: [3, 10, 8], hit: 85, def: 30, agi: 60, mres: 40, gold: [500, 1000] };
  E3.FOES.e3_golvan = Object.assign({ boss: true, majin: true, will: 999 }, BASE, { loot: [["gem", 1]] }, {
    name: "黒曜の使徒ゴルヴァン", hp: 360, dmg: [4, 10, 9], hit: 86, def: 36, agi: 46, shape: "beast", eye: "#d8d0c0",
    desc: "黒い石でできた四つ足の獣。割れても、割れた端から閉じていく。近くでは、自分の剣の重さが分からなくなる。",
    look: { body: "quad", skin: "#141418", skin2: "#3a3a44", horns: "none", eyes: "glow", mouth: "fangs", tail: "short", mood: "fierce" },
    lines: {
      open: ["足もとの重さが、裏返った。剣が軽くなり、膝が重くなる。黒い獣が、斜面の上からこちらを見下ろしていた。", "獣は吠えない。前脚が一歩、石を踏んだ。踏まれた石が、粉になった。"],
      turn: ["黒い前脚が薙いだ。避けたはずの方角から、爪が来た。", "割った肩が、刃を引き抜くより先に閉じていく。", "どちらが上り坂なのか、分からなくなる。獣だけが迷わずに歩いてくる。"],
    },
  });

  // 耐性と弱点（E12）：黒い石は叩けば欠け、急に冷やせば泣く。穂先は滑る。土は効かない。斬撃は等倍のまま（e12_affinity.js の頭の説明）
  if (D.E12 && D.E12.FOES) D.E12.FOES.e3_golvan = "blunt+ ice+ earth! pierce- @blunt @earth";

  // ---------------------------------------------------------------- 条件の品と骸の素材
  const items = {
    e3_golvanchip: KEY("戻らなかった黒い欠け", "黒い石の獣の体から欠け落ちた、親指ほどの欠片。ほかの割れ目はみな閉じたのに、これだけは戻らなかったという。", "握っていると、手の中の重さだけが確かになる。王宮の獲物の間の、空欄の札の下に置かれていた。"),
    e3_d_golvan: { name: "閉じかけの割れ目の石", type: "loot", price: 900, desc: "黒い石の獣の、最後に閉じかけた割れ目から取れた石。断面が鏡のように光る。", flavor: "ときどき、勝手に縁が寄っていく。机に置くと、少しずつ北へずれる。" },
  };
  Object.assign(E3.ITEMS, items);
  Object.assign(D.ITEMS, items);

  // ---------------------------------------------------------------- 使徒の表
  const a = {
    id: "golvan", foe: "e3_golvan", no: 24, rank: "A", calm: "敵対", flag: "e3:golvan", home: "mountains",
    keys: [
      { id: "chip", label: "戻らなかった黒い欠け", zekkai: true, test: has("e3_golvanchip"),
        on: "懐の黒い欠けが、ひとりでに冷たくなった。獣のまわりの狂った重さが、欠けを握る手のところだけ、元に戻っている。" },
      { id: "snow", label: "雪の日に挑む", test: sky("雪"),
        on: "雪が降っている。黒い背に積もった雪は解けずに滑り落ち、冷えた石の継ぎ目が、きしりと鳴った。" },
    ],
    win: { text: "黒い獣の体に走った割れ目が、閉じなかった。割れ目は背から腹へ、腹から脚へ広がり、獣は立ったまま、いくつもの黒い塊に分かれて斜面を転がり落ちた。足もとの重さが戻った。北は北にあった。", fame: 180, chron: "断界山脈の黒い石の斜面で、黒い石の獣を討つ。割れ目は二度と閉じなかった" },
    drop: { id: "e3_d_golvan", name: items.e3_d_golvan.name, price: items.e3_d_golvan.price, desc: items.e3_d_golvan.desc },
    after: { where: ["mountains"], title: "黒い石の斜面", text: "黒い石の斜面に、雪が積もっていた。積もった雪の上を、山羊の群れが斜面の向こうへ渡っていく。群れの最後の一頭が、黒い塊のひとつに鼻をこすりつけてから、群れを追った。" },
  };
  a.meet = {
    where: ["mountains"], title: "黒い石の斜面", who: "majin", lore: "golvan:met",
    text: "尾根を回りこんだ先で、雪が途切れた。斜面一面が黒い。石だ。割れ口が刃物のように光る、黒い石の斜面。踏み出した足が、思ったより深く沈んだ。体が重い。水筒は、羽のように軽い。斜面の中ほどを、黒い四つ足の獣が歩いていた。家ほどの背。獣の歩いたあとの石だけが、粉になって白く残っていく。",
    dare: "黒い石の獣に斬りかかる",
    peek: { stat: "知力", text: "獣の背に、古い割れ目の跡が何本も走っている。どれも閉じて、筋だけが残っている。肩口に一か所だけ、閉じていない欠けがあった。欠けのまわりだけ、雪が解けずに積もっている。", memo: "黒い石の獣の肩に、閉じていない欠けが一つある。そこだけ雪が解けない" },
    leave: "斜面に背を向けて、尾根まで戻る",
    leaveText: "尾根に戻ると、体の重さが戻った。振り返ると、獣はこちらを見ていなかった。斜面の下の、雪の残る谷のほうを見ていた。帰り道、二度ほど方角を間違えた。三度目は間違えなかった。",
  };
  E3.LIST.golvan = a;

  // 会う出来事・倒したあと（e3_apostles.js の読み込みのあとに足すので、ここで同じ形に組む）
  const alive = (S) => !(S.flags && S.flags[a.flag]);
  const m = a.meet;
  D.EVENTS.push({
    id: "e3_meet_golvan", where: m.where, w: 1, title: m.title, who: m.who, lore: m.lore, e3: "golvan",
    // 人の地図の東の端の奥。噂を聞いたか王の話を聞いたあとでしか、そこまで踏みこまない
    cond: (S) => alive(S) && (S.day || 0) >= 20 && !!(S.flags.c2_valeon_eye || (S.lore && Object.keys(S.lore).some((k) => k.startsWith("golvan:")))),
    text: m.text,
    choices: [
      { label: m.dare, ok: { e3fight: "golvan" } },
      { label: "様子をうかがう", stat: m.peek.stat, diff: "普通", ok: { text: m.peek.text, memo: m.peek.memo, lore: "golvan:scar" }, ng: { text: "目を凝らしたが、どちらが斜面の上なのか分からなくなった。尾根に戻るまで、地面に手をついて歩いた。" } },
      { label: m.leave, ok: { text: m.leaveText } },
    ],
  });
  D.EVENTS.push({
    id: "e3_after_golvan", where: a.after.where, w: 4, once: true, title: a.after.title, e3: "golvan",
    cond: (S) => !alive(S), text: a.after.text,
    choices: [{ label: "見届ける", ok: { text: "あなたは黙って、それを見届けた。", fame: 3 } }],
  });
  D.EVENT_NOBODY = D.EVENT_NOBODY || [];
  D.EVENT_NOBODY.push("e3_after_golvan");

  // ---------------------------------------------------------------- 倒せない使徒（E8）：ふつうに挑んでも、割れた端から閉じる（物では壊せない）
  D.E8 = D.E8 || {};
  D.E8.UNSLAY = D.E8.UNSLAY || {};
  D.E8.UNSLAY.golvan = "刃は黒い肩に入った。入った所から、石が閉じた。抜こうとした刃が、もう抜けない。獣が一歩踏み出すと、体の重さが裏返り、あなたは刃を手放して斜面を転がり落ちていた。尾根の下で起き上がると、獣の肩から、あなたの剣が黒い石に呑まれていくのが見えた。剣は、あとで雪の中に落ちていた。";

  // ---------------------------------------------------------------- 手がかり（噂・用語説明の行。答えは書かない）
  const RUMORS = [
    "王都の獲物の間には、札が一枚だけ空いてるんだと。陛下の兄君の仇の分だって、近衛の爺さんが言ってた。",
    "断界山脈で方角が分からなくなったら、鐘の聞こえるほうへ戻れ。山の上じゃ、方角が嘘をつく斜面があるんだとさ。",
    "黒鉄の砦の古参は、雪の日には黒い斜面のほうを見張らない。見張らなくていいんだと言う。わけは言わねえ。",
    "火山の都の学者が言ってた。黒い石は火から生まれて、冷えて固まる。だから急に冷やすと泣くんだと。何が泣くのかは聞きそびれた。",
  ];
  D.RUMORS.push(...RUMORS);
  E3.LORE.golvan = [
    ["met", "断界山脈の奥の黒い石の斜面では、体が重く、持ち物が軽くなった。黒い四つ足の獣が、その中を迷わずに歩いていた。", { hint: ["方角が嘘をつく"] }],
    ["scar", "黒い石の獣の背の割れ目は、みな閉じて筋だけが残っていた。肩の欠けだけが閉じていなかった。", { hint: ["戻らなかった"] }],
  ];
  D.LORE = D.LORE || {};
  if (!D.LORE.golvan) D.LORE.golvan = { sec: "人ならざる者", title: "黒い石の獣", lines: [
    ["rumor", "断界山脈の奥に、黒い石の体の獣がいるという。斬っても割れた端から閉じる。王国の古い記録では、いちばん多くの人を殺したものとして書かれている。", { hint: ["黒い石の体", "空欄"] }],
    ["snow", "黒鉄の砦の古参は、雪の日には黒い斜面のほうを見張らない。", { hint: ["雪の日には"] }],
  ] };

  // ---------------------------------------------------------------- 縁で聞いた名（M13）・呼び名（R13 の噂の言い方）・覚え書き（L1）
  if (D.LORE.m13_names) {
    D.LORE.m13_names.lines.push(["golvan", "黒い石の獣の名は、閉じた割れ目の筋に沿って書いてある。閉じなかった欠けの上でだけ、字が途切れている。"]);
    if (D.M13 && D.M13.DEPTH) D.M13.DEPTH["m13_names:golvan"] = 2;
  }
  if (D.R13_TODO && D.R13_TODO.NAMES) D.R13_TODO.NAMES.golvan = "黒い石の獣";
  D.KNOW = D.KNOW || {};
  D.KNOW.ap_golvan = { kind: "apostle", ap: "golvan", title: "『黒い石の獣』", text: "黒い石の獣：割れた所は閉じる。閉じなかった欠けが一つ。雪の日の継ぎ目は鳴る。" };

  // ---------------------------------------------------------------- 長編の決戦の曲（S6。討てる使徒の曲は持たない。決戦だけ専用曲）
  const B = D.BGM;
  if (B && B.TRACKS) {
    const march = [
      "1 - - - - - - - b2 - - - 1 - - -", "5, - - - - - - - b6, - - - 5, - - -", "1 - - - b3 - - - 2 - - - b2 - - -", "1 - - - - - - - . . . . . . . .",
      "5 - - - - - 4 - b3 - - - 2 - - -", "b6 - - - - - 5 - 4 - - - b3 - - -", "4 - - - b3 - - - b2 - - - 7, - - -", "1 - - - - - - - . . . . 5, - - -"];
    B.TRACKS.s6_ap_saga_golvan = {
      name: "割れない石の行進", mood: "王の仇の、黒い石の獣との決戦。低い弦と鉄槌の歩みが斜面を踏み、半音ずれる金管が重さの狂いを鳴らす。後半は合唱と鐘が加わり、石が鳴いて割れる",
      scene: "apostle", key: 40, scale: "phryg", bpm: 96, meter: 16, bars: 24, wet: 0.4, gain: 0.62,
      prog: ["1", "1", "b2M", "1", "4m", "4m", "b2M", "5D"],
      parts: [
        { inst: "bass", kind: "chord", oct: -2, vol: 0.6, pat: ["0 . . . 0 . . . 0 . 0 . 0 . . ."] },
        { inst: "cello", kind: "chord", oct: -1, vol: 0.45, pan: -0.2, pat: ["0 . 0 . 2 . 0 . 0 . 0 . 2 . 1 ."] },
        { inst: "brass", kind: "mel", oct: 0, vol: 0.5, pan: 0.15, mel: march },
        { inst: "choir", kind: "pad", oct: 0, vol: 0.32, center: 5, on: [[8, 24]] },
        { inst: "bell", kind: "mel", oct: 1, vol: 0.28, wet: 0.6, on: [[16, 24]], mel: march },
        { kind: "drum", vol: 0.62, pat: ["K . . . S . . . K . K . S . . .", "K . . . S . . . K . K . S . c c", "K . . . S . . . K . K . S . . .", "N . k k S . k k K . k k S S S S"] },
      ],
    };
    B.ROUTES = B.ROUTES || {};
    B.ROUTES["apostle@saga_golvan"] = ["s6_ap_saga_golvan"];
  }
})(globalThis.G = globalThis.G || {});
