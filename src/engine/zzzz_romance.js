// 恋の相手を絞る（C・持ち主の方針「恋愛・結婚できるのは 20 人ほど」）。DOM には触らない。
// - 名のある人物（D.C2_PEOPLE。C4 以降の人物も同じ表に入る）は、romance: true がある人だけが恋（M10・M11）の相手になる。
//   無い人は、好感度が上がっても恋の気配・告白・求婚・嫉妬にならず、信頼・親友・家族のような情の出来事（src/data/events_c_bond.js）と終わり方になる。
// - 名の無い（乱数の）仲間・魔物の子分は今のまま（m10_love.js・zz_m11_love.js の決まり）。18 歳未満・子どもの姿は romance があっても外す（zzz_love_age.js）。
// - 格の違う相手（M11 の D.M11.AP）も、その相手に romance: true が無ければ続き物が進まない。
// - 古いセーブで、印の無い人とすでに恋仲・約束・連れ合いになっていれば、その仲はそのまま（壊さない）。まだ「気配」だけなら、そこで止まる。
// 一覧は docs/romance.md。m10_love.js・zz_m11_love.js・zzz_love_age.js は書き換えず、G.m10Can・G.m10P・G.m11ApAt・G.exploreActions・G.m6Compose を包む。
// 名前の頭の zzzz は、zzz_love_age.js より後に読ませるため。レーン C
(function (G) {
  const D = G.data;
  const P = () => D.C2_PEOPLE || {};
  const PARTNER = ["love", "vow", "wed"];
  const st = (c) => (c && c.m10 && c.m10.st) || "";

  // 名のある人物か（その人のデータ）
  G.romancePerson = (c) => (c && c.c2 && P()[c.c2]) || null;
  // 印の上で恋の相手になれるか（名の無い人は true。年齢の線は G.m10Can 側）
  G.romanceOk = (c) => {
    const p = G.romancePerson(c);
    return !p || p.romance === true;
  };
  // 恋の相手になれる名のある人の id（docs/romance.md・テストと突き合わせる）
  G.romanceIds = () => Object.keys(P()).filter((id) => P()[id].romance === true);

  const can0 = G.m10Can;
  if (can0) G.m10Can = (c) => can0(c) && G.romanceOk(c);

  // 気配のまま止める（古いセーブで、印の無い人に気配が立っていたとき）
  const MP = G.m10P;
  if (MP) {
    const sparked0 = MP.sparked, confess0 = MP.confess;
    MP.sparked = (c, S) => G.m10Can(c) && sparked0(c, S);
    MP.confess = (c, S) => G.m10Can(c) && confess0(c, S);
  }
  const acts0 = G.exploreActions;
  if (acts0) G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    const g = S && groups.find((x) => x.title === "想い");
    if (!g) return groups;
    g.list = g.list.filter((a) => {
      if (!a.id.startsWith("m10tell:")) return true;
      const c = S.companions.find((x) => "m10tell:" + x.id === a.id);
      return !c || G.m10Can(c);
    });
    if (!g.list.length) groups.splice(groups.indexOf(g), 1);
    return groups;
  };

  // 格の違う相手：その相手に romance が無ければ続き物は進まない
  const ap0 = G.m11ApAt;
  if (ap0) G.m11ApAt = (key, n, S) => !!(D.M11 && D.M11.AP && D.M11.AP[key] && D.M11.AP[key].romance === true) && ap0(key, n, S);

  // ---------------------------------------------------------------- 恋でない深い情
  // 恋の相手にならない仲間で、好感度が高い人（events_c_bond.js の pick から呼ぶ）
  G.bondKin = (c, S) => !!c && !G.m10Can(c) && !PARTNER.includes(st(c)) && (c.bond || 0) >= 62;

  // 終わり方（M6）：恋人・連れ合いがいないとき、いちばん近い「恋でない」仲間との情を一文で
  if (G.m6Compose) {
    const compose0 = G.m6Compose;
    G.m6Compose = (S) => {
      const r = compose0(S);
      if (!r || !r.life || !r.life.length || !S || !D.C_BOND) return r;
      try {
        if (G.m10Partner && G.m10Partner(S)) return r;
        const c = (S.companions || []).filter((x) => G.bondKin(x, S) && x.bond >= 75).sort((a, b) => b.bond - a.bond)[0];
        if (!c) return r;
        const name = (S.profile && S.profile.name) || S.name || "その人";
        const T = D.C_BOND.STORY[G.loveMinor && G.loveMinor(c) ? "young" : "kin"];
        r.life[Math.max(0, r.life.length - 2)] += G.pick(T).replace(/\{name\}/g, name).replace(/\{who\}/g, G.m2Short(c));
      } catch (e) { /* 一文なしでも物語は出る */ }
      return r;
    };
  }
})(globalThis.G = globalThis.G || {});
