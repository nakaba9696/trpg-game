// C11：恋の相手は 18 歳以上で、人の姿の者だけ（data/zc11_love_human.js・engine/zzzzzzzz_c11_love_human.js）
// - 魔物の子分・ギグラ（ゴブリン）・人の姿でない者は、Q8 の一覧を切っても（仕組みだけのテストの形でも）恋の相手にならない
// - 人の姿の恋の相手（人間・エルフ・獣人）は今まで通り恋の相手になれる
// - ギグラは信頼の話題（kind: "bond"）が出て、恋の筋の段・恋の話題は出ない
// - 格の違う相手は、人の姿で現れる者（D.C11L.AP）だけ。人の姿の使徒（香煙のベリエラ yoi・砂塵のドレイゼ zalve）の恋は残る
// - 古いセーブ：魔物の子分・ギグラと恋人・約束・連れ合いになっていても壊れず、「固い絆の仲間」になる（仲間のまま・年表の過去の行は残る）
export default ({ fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("C11 人の姿の恋: " + m); };
  const start = (sex, ids, off) => {
    const G = loadEngine();
    if (off) G.data.Q8P.off = G.data.Q8Q.off = true;
    G.rand = seeded(11);
    G.P = { trophies: {}, graves: [] };
    const { stats, caps } = G.cre.quickStats("merc", G.rand);
    G.newGame({ cls: "merc", stats, caps, goal: "custom", goalText: "店を持つ", profile: { name: "測定", sex, age: 26 } });
    ids.forEach((id) => G.c2Join(id));
    return G;
  };
  const by = (G, id) => G.S.companions.find((c) => c.c2 === id);

  // ---- 表と G.loveHuman
  {
    const G = loadEngine();
    const D = G.data;
    if (!G.loveHuman || !D.C11L) return F("G.loveHuman・D.C11L が無い");
    const P = D.C2_PEOPLE;
    if (P.gigra.humanLike !== false || P.gigra.romance === true) F("ギグラに humanLike: false が無いか、まだ恋の相手の印がある");
    for (const id of G.romanceIds()) if (!G.loveHuman({ c2: id, name: P[id].name })) F(`${id}: 人の姿でないのに恋の相手の印がある`);
    for (const id of ["dil", "mirlene", "nora", "izra", "takimaru"]) if (!G.loveHuman({ c2: id, name: P[id].name })) F(`${id}: 人の姿（人間・エルフ・獣人）なのに人の姿でないと見る`);
    for (const c of [{ name: "樽ゴブリンのダル", cls: "ゴブリン" }, { name: "オークのブグ", cls: "斧使い" }, { name: "ぷるぷる", cls: "スライム" }, { name: "骨のカタ", cls: "骸骨" }, { name: "テス", cls: "傭兵", humanLike: false }])
      if (G.loveHuman(c)) F(`${c.name}（${c.cls}）を人の姿と見る`);
    if (!G.loveHuman({ name: "槍兵のテス", cls: "傭兵" })) F("名の無い人の仲間を人の姿でないと見る");
    for (const key of Object.keys(D.M11.AP)) if (D.M11.AP[key].romance && !D.C11L.AP[key]) F(`格の違う相手 ${key} が、人の姿の表（D.C11L.AP）に無い`);
  }

  // ---- 恋の相手にならない（Q8 の一覧を切っても）
  for (const off of [false, true]) {
    const tag = off ? "（Q8 なし）" : "";
    const G = start("男", ["gigra", "adele"], off);
    const S = G.S;
    S.day = 120;
    G.addCompanion({ name: "樽ゴブリンのダル", cls: "ゴブリン", power: 30, dmg: 1, desc: "酒好き。", sex: "女" });
    const gig = by(G, "gigra"), ade = by(G, "adele"), gob = S.companions.find((c) => c.name === "樽ゴブリンのダル");
    for (const c of [gig, gob]) {
      c.bond = 100;
      if (G.m10Can(c)) F(`${c.name} が恋の相手になる${tag}`);
      if (G.m10P.spark(c, S)) F(`${c.name} に恋の気配が立つ${tag}`);
      if (G.tk.loveOk(c, S)) F(`${c.name} に恋の話題が出る${tag}`);
      if (G.m10P.rival(c, S)) F(`${c.name} が嫉妬する${tag}`);
      G.m10Of(c).st = "spark"; c.m10.cool = 0;
      if (G.m10P.confess(c, S)) F(`${c.name} が告白してくる${tag}`);
      G.m10Do("love", c, {});
      if (G.m10St(c) === "love") F(`${c.name} と恋仲になる（出来事の結果から）${tag}`);
      c.m10.st = "love"; c.m10.since = 0;
      if (G.m10P.propose(c, S)) F(`${c.name} に求婚できる（古いセーブの恋仲）${tag}`);
      c.m10.st = "";
      if (!G.bondKin(c, S)) F(`${c.name} が好感度最大でも情の出来事の主役にならない${tag}`);
    }
    if (G.r2Topics(gig, S).some((t) => t.r2 && t.r2.type === "step")) F(`ギグラに恋の筋の段が出る${tag}`);
    // ギグラの信頼の話題（恋の筋の場面を書き直したもの）
    const T = G.data.TALK.gigra.topics;
    for (const id of ["gigra_b3", "gigra_b4", "gigra_b5"]) {
      const tp = T.find((t) => t.id === id);
      if (!tp || tp.kind !== "bond" || tp.love) { F(`${id} が信頼の話題でない`); continue; }
      if ((tp.replies || []).some((r) => r.m10)) F(`${id} に恋の結果がある`);
    }
    gig.bond = 100;
    G.affAdd && G.affAdd("gigra", 100);
    if (!G.tk.can(T.find((t) => t.id === "gigra_b3"), gig, S, {})) F(`ギグラに信頼の話題（返ってきた銅貨）が出ない${tag}`);
    if (T.some((t) => t.love || t.kind === "love")) F("ギグラに恋の話題が残る");
    if ((G.data.R2.ARCS || {}).gigra) F("ギグラに恋の筋（D.R2.ARCS.gigra）が残る");
    if (T.filter((t) => /^gigra_t\d$/.test(t.id)).length !== 3) F("ギグラの 18 歳未満の主人公への信頼の筋が、信頼の話題に移っていない");
    if (G.tk.can(T.find((t) => t.id === "gigra_t1"), gig, S, {})) F(`大人の主人公に、18 歳未満向けのギグラの信頼の話題が出る${tag}`);
    // 人の姿の相手は今まで通り
    ade.bond = 100;
    if (!G.m10Can(ade)) F(`人の恋の相手（アデル）が恋の相手になれない${tag}`);
    // 格の違う相手：人の姿の表に無ければ進まない
    const keep = G.data.C11L.AP.yoi;
    delete G.data.C11L.AP.yoi;
    if (G.m11ApAt("yoi", 0, S)) F(`人の姿の表に無い格の違う相手の続き物が進む${tag}`);
    G.data.C11L.AP.yoi = keep;
  }

  // ---- 人の姿の使徒（香煙のベリエラ yoi・砂塵のドレイゼ zalve）との恋の続き物と恋の筋は残る（配り役の確定）
  for (const [sex, key] of [["男", "yoi"], ["女", "zalve"]]) {
    const G = start(sex, []);
    const S = G.S;
    S.day = 50;
    if (!G.data.C11L.AP[key]) F(`${key}: 人の姿の使徒が、人の姿の表から外れている`);
    if (!G.data.M11.AP[key] || G.data.M11.AP[key].romance !== true) F(`${key}: 格の違う相手の恋の印が無い`);
    if (!G.m11ApAt(key, 0, S)) F(`${key}: 人の姿の使徒との恋の続き物が始められない`);
    if (!G.data.EVENTS.some((e) => e.id === `m11_${key}_last`) || !G.data.EVENTS.some((e) => e.id.startsWith(`r2_${key}_`))) F(`${key}: 恋の続き物か恋の筋（R2）の出来事が無い`);
  }

  // ---- 古いセーブ：魔物の子分・ギグラと恋人・連れ合い
  {
    const G = start("女", ["gigra", "dil"]);
    const S = G.S;
    S.day = 200;
    G.addCompanion({ name: "樽ゴブリンのダル", cls: "ゴブリン", power: 30, dmg: 1, desc: "酒好き。" });
    const gig = by(G, "gigra"), dil = by(G, "dil"), gob = S.companions.find((c) => c.name === "樽ゴブリンのダル");
    // 前の版の形：ギグラと連れ合い・ダルと恋仲（ありえない組み合わせだが、両方直ることを見る）・ディルは何もなし
    const m = G.m10State(S);
    G.m10Of(gig).st = "wed"; gig.m10.since = 100; gig.bond = 85;
    G.m10Of(gob).st = "love"; gob.m10.since = 150; gob.bond = 70;
    m.lover = gob.id;
    m.spouse = { id: gig.id, name: gig.name, cls: gig.cls, sex: "女", day: 100, loc: "黒鉄の砦", how: "church" };
    S.flags.m10_sp = gig.name;
    S.chronicle.push({ date: "古い日", kind: "comp", text: `${gig.name}と、黒鉄の砦で結ばれる` });
    G.r2Of("gigra", S).st = 8;
    const before = S.chronicle.length;
    // セーブを読み込む形（JSON を通して fixOldNames）
    const sv = JSON.parse(JSON.stringify(S));
    try { G.fixOldNames(sv); } catch (e) { F("古いセーブの直しで例外 " + (e.stack || e)); }
    G.S = sv;
    const g2 = sv.companions.find((c) => c.c2 === "gigra"), d2 = sv.companions.find((c) => c.c2 === "dil"), b2 = sv.companions.find((c) => c.name === "樽ゴブリンのダル");
    if (!g2 || !b2 || !d2) F("古いセーブを直したら、仲間がいなくなった");
    else {
      if (G.m10St(g2) || G.m10St(b2)) F(`ギグラ・魔物の子分の恋の間柄が残る（${G.m10St(g2)}・${G.m10St(b2)}）`);
      if (!g2.c11 || g2.c11.was !== "wed" || !b2.c11 || b2.c11.was !== "love") F("固い絆の仲間の印（c.c11）が無い");
      if (g2.bond !== 85 || b2.bond !== 70) F("固い絆の仲間にしたら好感度が変わった");
      if (G.m10Partner(sv)) F("直したあとも恋人・連れ合いがいる");
      if (sv.m10.spouse || sv.m10.lover || sv.flags.m10_sp) F("直したあとも連れ合い・恋人の記録が残る");
      if (!sv.chronicle.some((c) => c.text.includes("黒鉄の砦で結ばれる"))) F("年表の過去の行が消えた");
      if (sv.chronicle.length !== before + 2 || !sv.chronicle.slice(before).every((c) => c.text.includes("固い絆の仲間"))) F("年表に固い絆の仲間の行が足されない");
      if (!G.m10Rows(sv).some(([k, v]) => k === "固い絆の仲間" && v.includes(g2.name) && v.includes(b2.name))) F("シートに固い絆の仲間の行が出ない");
      if (G.m10Rows(sv).some(([k]) => k === "連れ合い" || k === "恋仲")) F("シートに連れ合い・恋仲の行が残る");
      // 二度目の直しで何も変わらない
      if (G.c11Fix(sv) !== 0) F("二度目の直しでまた何かを直した");
      // 情の出来事と信頼の話題には出る・恋の話題と筋の段には出ない
      if (!G.bondKin(g2, sv)) F("固い絆の仲間になったギグラが情の出来事の主役にならない");
      if (G.r2Topics(g2, sv).some((t) => t.r2 && t.r2.type === "step")) F("固い絆の仲間になったギグラに恋の筋の段が出る");
      if (!G.data.EVENTS.find((e) => e.id === "m11_mon_words").m2.pick(b2, sv)) F("固い絆の仲間になった魔物の子分に、子分との情の出来事が出ない");
      // 人の仲間とは、ここから新しく恋の道が開ける（恋人・連れ合いが残っていない）
      if (!G.m10Can(d2)) F("直したあとの人の仲間が恋の相手になれない");
      // 人生の物語・遊び続けても壊れない
      try {
        G.m6Compose(sv);
        for (let i = 0; i < 40 && !sv.over; i++) { const l = G.actions().flatMap((x) => x.list).filter((x) => !x.disabled); G.act(l[Math.floor(G.rand() * l.length)].id); }
      } catch (e) { F("直した古いセーブで遊ぶと例外 " + (e.stack || e)); }
    }
  }
  // ---- 古いセーブ：家に残った連れ合いが魔物の子分（一党がいっぱい）
  {
    const G = start("男", ["dil", "kaidel", "bruno"]);
    const S = G.S;
    S.day = 300;
    const m = G.m10State(S);
    const gob = { id: "old_gob", name: "樽ゴブリンのダル", cls: "ゴブリン", power: 30, dmg: 1, desc: "酒好き。", bond: 80, m10: { st: "wed", since: 100 } };
    m.atHome = gob;
    m.home = { loc: S.loc, name: G.loc().name, day: 100, seen: 290 };
    m.spouse = { id: gob.id, name: gob.name, cls: gob.cls, sex: "女", day: 100, loc: "どこか", how: "feast" };
    G.c11Fix(S);
    if (m.atHome || m.spouse) F("家に残った魔物の子分の連れ合いが、連れ合いのまま");
    if (S.companions.includes(gob) || S.c11home !== gob) F("一党がいっぱいなのに、家を守る仲間にならない");
    if (!G.m10Rows(S).some(([k]) => k === "家を守る仲間")) F("シートに家を守る仲間の行が出ない");
    S.mode = "explore"; S.travel = null;
    const a = G.exploreActions().flatMap((g) => g.list).find((x) => x.id === "c11bring");
    if (!a || !a.disabled) F("一党がいっぱいのとき、家を守る仲間を連れ出す行動が無いか、押せる");
    S.companions.pop();
    G.act("c11bring");
    if (!S.companions.includes(gob) || S.c11home) F("家を守る仲間を旅に連れ出せない");
  }
  if (!n) ok("C11 恋の相手は人の姿だけ（魔物の子分・ギグラは恋にならず情と信頼の話題・格の違う相手は人の姿の表・古いセーブは固い絆の仲間に）");
};
