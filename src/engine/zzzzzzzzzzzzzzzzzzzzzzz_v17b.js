// V17b：持ち主の決定（2026-10-13）で拾う伏線のうち、既存の出来事・敵・仲間に差し込むもの。新しい出来事は src/data/v17b_threads.js、カルラは src/data/v17b_kin.js。
//   元のファイルは書き換えず、読み込んだあと（文の差し替え D.V3_PROSE を当てたあと）に包む。状態で変わる文は getter にして、元の文を残したまま一行だけ変える。
//   t09 シグルン・ロデリクの仲間の一言を三本ずつ（G.m2Trait を包む。名のある仲間には昇格させない）
//   t10 ロデリクとの再会で印 f2_rival_hand・f2_rival_grudge を読み、台詞を一行変える
//   t11 竜の墓場で鉤槍を手にしたとき、持ち歩いてきた錆びた留め具が鳴る一行（片割れは物として出さない）
//   t13 剣翼の対面（e3_meet_azlag）：卵を返した（v2_egg_returned）なら一行やわらぐ。砦の上で転ぶのを見た（v1_azlag_seen）なら、口を封じに先に襲ってくる
//   t15 竜騎手カルラ（e4k_karla）は一度倒したらもう出ない。倒したあとは竜の卵の出来事（v2_egg）も出ない
//   t19 イオリの棋譜を受け取ったあと、冬が明けたら「冬を越せなかった」と年表に一行（S.c2.gone.iori = "dead"）
//   ほか：前の出来事で選んだことの印（v17b_bau_has・v17b_neilas_teo・v17b_malvina_read）を付ける。覚え書きは三十で古いものから消えるため
// セーブに足すもの：S.flags の v17b_* だけ（古いセーブで無くても動く）。乱数は使わない。DOM には触らない。名前の頭の z の数は、文の差し替え（zzzzzzzzzz_v3_prose.js）より後にするため。レーン V（V17b）
(function (G) {
  const D = G.data;
  const V = (G.v17b = G.v17b || {});
  const ev = (id) => (D.EVENTS || []).find((e) => e.id === id);
  const choice = (id, label) => { const e = ev(id); return e && (e.choices || []).find((c) => c.label === label); };
  const fl = (S, f) => !!(S && S.flags && S.flags[f]);
  // 文を getter にする。base は元の文（あとで代入されたら、それを新しい元にする）
  const wrapText = (o, key, fn) => {
    if (!o || typeof o[key] !== "string") return false;
    let base = o[key];
    Object.defineProperty(o, key, {
      configurable: true, enumerable: true,
      get() { try { const S = G.S; return S ? fn(base, S) : base; } catch (e) { return base; } },
      set(v) { base = v; },
    });
    return true;
  };
  const peak = (t) => { if (G.v3prose && G.v3prose.peakSet) G.v3prose.paras(t).forEach((x) => G.v3prose.peakSet.add(x)); };
  V.missing = [];
  const need = (ok, what) => { if (!ok) V.missing.push(what); };

  // ---------------------------------------------------------------- 前の出来事で選んだことの印
  const TAG = [
    ["c5_bau_tags", "札を一枚、町の家族へ届けると申し出る", "v17b_bau_has"],
    ["c19r_neilas_tray", "テオの歯車のことを書く", "v17b_neilas_teo"],
    ["c19r_malvina_shield", "端の盾の日付を読む", "v17b_malvina_read"],
  ];
  const tagOf = new Map();
  TAG.forEach(([id, label, f]) => {
    const c = choice(id, label);
    need(c && c.ok, `${id}「${label}」`);
    if (c && c.ok) tagOf.set(c.ok, f);
  });
  const apply0 = G.apply;
  G.apply = (o) => {
    const f = o && tagOf.get(o);
    if (f && G.S && !G.S.over) G.S.flags[f] = true;
    return apply0(o);
  };

  // ---------------------------------------------------------------- t09 シグルン・ロデリクの一言
  V.MATE_TALK = {
    sigrun: [
      "夜明け前に空を見るのは癖だ。……見上げて、何もいなければ、それでいい",
      "ときどきでいい。名前を呼んでくれ。巣で、名前を忘れた連中を見た",
      "片目でも、あなたの背中くらいは見える。前を向いていろ",
    ],
    roderick: [
      "兄上たちは、俺が家を出たのを、まだ家の恥だと思っている。……手柄を持って帰れば黙るさ",
      "食う前に手を洗え。……家で仕込まれたんだ。笑うな",
      "いつか、お前と正面から打ち合う。今じゃない。俺が勝てる日にだ",
    ],
  };
  const trait0 = G.m2Trait;
  if (trait0) G.m2Trait = (c) => {
    const t = trait0(c);
    const add = c && V.MATE_TALK[c.f2o];
    return add && t ? Object.assign({}, t, { talk: [...(t.talk || []), ...add] }) : t;
  };

  // ---------------------------------------------------------------- t10 ロデリクとの再会：前に手を差し出した／笑った
  const rf = choice("f2r_rod_friend", "礼を言い、どうしてここにいるのか訊く");
  need(rf && wrapText(rf.ok, "text", (t, S) => (fl(S, "f2_rival_hand") ? t.replace("借りはこれで返したぞ。", "あの日、差し出された手は握らなかったな。……借りはこれで返したぞ。") : t)), "f2r_rod_friend の礼の文");
  const rfoe = choice("f2r_rod_foe", "剣を抜く");
  need(rfoe && wrapText(rfoe.win, "text", (t, S) => (fl(S, "f2_rival_grudge") ? t.replace("「……また、負けた」", "「……笑え。あの日みたいに」") : t)), "f2r_rod_foe の勝ちの文");

  // ---------------------------------------------------------------- t11 竜の墓場：留め具が鳴る
  V.clasp = (S) => !!(S && S.echo && Array.isArray(S.echo.marks) && S.echo.marks.some((m) => m && m.k === "f2_tsuba_kept")) && !fl(S, "f2_sold_tsuba");
  V.CLASP_LINE = "荷の底で、錆びた留め具が一度だけ鳴った。";
  const gy = D.LOCS && D.LOCS.graveyard && D.LOCS.graveyard.reward;
  need(gy && wrapText(gy, "text", (t, S) => (V.clasp(S) ? t + "\n\n" + V.CLASP_LINE : t)), "竜の墓場の鉤槍の文");

  // ---------------------------------------------------------------- t13 剣翼の対面
  V.AZ_EGG = "鳥は首を伸ばし、岩陰のあなたの手のあたりを嗅いだ。それから、刃の羽を一枚だけ寝かせた。";
  V.AZ_SEEN = "羽づくろいの音が止んだ。鳥の目が、あなたの顔で止まっている。「……砦の下にいたな」刃の羽が、一斉に起きた。";
  const az = ev("e3_meet_azlag");
  const seen = (S) => fl(S, "v1_azlag_seen");
  if (az) {
    need(wrapText(az, "text", (t, S) => (seen(S) ? t + "\n\n" + V.AZ_SEEN : fl(S, "v2_egg_returned") ? t + "\n\n" + V.AZ_EGG : t)), "e3_meet_azlag の文");
    peak(V.AZ_SEEN); peak(V.AZ_EGG);
    az.choices.forEach((c) => { const c0 = c.cond; c.cond = (S) => !seen(S) && (!c0 || c0(S)); });
    az.choices.push({ label: "身構える", cond: seen, ok: { text: "刃の羽が一枚、先に降ってきた。肩を浅く裂かれた。鳥はもう、降りかたを気にしていなかった。", hp: -6, e3fight: "azlag" } });
  } else need(false, "e3_meet_azlag");

  // ---------------------------------------------------------------- t15 竜騎手カルラは一度きり
  V.karlaDown = (S) => fl(S, "e4clue:e4k_karla");
  const E4 = D.E4;
  if (E4 && E4.whenOk) {
    const when0 = E4.whenOk;
    E4.whenOk = (e, S) => (e === D.ENEMIES.e4k_karla && V.karlaDown(S || G.S) ? false : when0(e, S));
  } else need(false, "E4.whenOk");
  const egg = ev("v2_egg");
  if (egg) { const c0 = egg.cond; egg.cond = (S) => !V.karlaDown(S) && (!c0 || c0(S)); } else need(false, "v2_egg");

  // ---------------------------------------------------------------- t19 イオリは冬を越せなかった
  V.IORI_LINE = "島の盤指しのイオリが、冬を越せなかったと聞く";
  V.ioriTick = (S) => {
    if (!S || S.over || !fl(S, "ev:c4_iori_record") || fl(S, "v17b_iori_gone") || !G.seasonOf) return;
    if (G.seasonOf(S.day) === "冬") { S.flags.v17b_iori_w = true; return; }
    if (!fl(S, "v17b_iori_w")) return;
    S.flags.v17b_iori_gone = true;
    G.chron(V.IORI_LINE);
    if (G.c2State) { const m = G.c2State(S); if (!m.gone.iori) m.gone.iori = "dead"; }
  };
  const end0 = G.endTurn;
  G.endTurn = (...a) => { const r = end0(...a); V.ioriTick(G.S); return r; };
})(globalThis.G = globalThis.G || {});
