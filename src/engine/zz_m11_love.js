// 恋の広がり（M11・#117）。M10（src/engine/m10_love.js）の上に、次を足す。DOM には触らない。m10_love.js・zz_c2_people.js は書き換えず、包んで足す。
// - 格の違う相手（朧島の煙をまとった女〔香煙のベリエラ〕・ブランデールの片眼鏡の両替商〔砂塵のドレイゼ〕）との恋。仲間にはならない。何度も会いに行く続き物で、最後の一歩はごく稀にしか通らない。
//   成就しても人の恋の形にはならない。人生の物語に一文が出る。
// - 魔物の子分（ゴブリンなど）は恋の相手にしない（C11・持ち主の決定「人間っぽいやつ以外と恋愛させないで」）。
//   かわりに、好感度が高い子分との情の出来事（src/data/events_m11_love.js の m11_mon_*）と、人生の物語の一文がある。
//   人の姿でない者を恋の相手から外す最後の包みと、古いセーブの直しは src/engine/zzzzzzzz_c11_love_human.js。
// 名前の頭の zz は、zz_c2_people.js より後に読ませるため（manifest は触らない）。
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.m11State が埋める）
//   S.m11 = { ap: { yoi|zalve: { st 何度目まで進んだか, day 最後に会った日, won 成就した日, tries 最後の一歩を踏んだ回数 } }, balk 古いセーブの数（今は増えない） }
// 出来事のデータ（src/data/events_m11_love.js）の結果に書けるもの：
//   m11ap: "yoi" 続き物を一つ進める・m11try: "yoi" 最後の一歩（ごく稀に成就の出来事へ、だめなら断りの出来事へ）・m11won: "yoi" 成就
//   文の中の {boss} 魔物の子分があなたを呼ぶ名（アニキ／アネキ）
// レーン C（コア）＋ V（出来事）の M11 が管理
(function (G) {
  const D = G.data;
  const M = () => D.M11;
  const MONSTER = /ゴブ|ゴブリン|オーク|スライム/;
  // 魔物の子分との情：好感度がこれ以上になると、トロフィー（言葉の半分）
  const MON = { bond: 90 };
  // 格の違う相手：何度会えば最後の一歩か・次に会えるまでの日数・最後の一歩が通る割合・断られたあと待つ日数
  const AP = { stages: 4, gap: 6, win: 0.3, wait: 20 };
  G.m11Tune = { MON, AP };

  G.m11State = (S) => {
    S = S || G.S;
    if (!S.m11) S.m11 = {};
    const m = S.m11;
    m.ap = m.ap || {};
    m.balk = m.balk || 0;
    return m;
  };
  G.m11Ap = (key, S) => {
    const m = G.m11State(S);
    if (!m.ap[key]) m.ap[key] = { st: 0, day: -999, won: 0, tries: 0 };
    return m.ap[key];
  };
  // 続き物の n 段目に来られるか（events_m11_love.js の cond から呼ぶ）
  G.m11ApAt = (key, n, S) => {
    S = S || G.S;
    const a = (S.m11 && S.m11.ap && S.m11.ap[key]) || { st: 0, day: -999 };
    return !a.won && (a.st || 0) === n && S.day - (a.day ?? -999) >= AP.gap;
  };
  G.m11ApWon = (key, S) => { S = S || G.S; return !!(S.m11 && S.m11.ap && S.m11.ap[key] && S.m11.ap[key].won); };

  // ---------------------------------------------------------------- 魔物の子分
  G.m11Monster = (c) => !!c && MONSTER.test(`${c.name} ${c.cls}`);
  const fill0 = G.m2Fill;
  G.m2Fill = (t) => {
    t = fill0(t);
    if (typeof t !== "string" || t.indexOf("{boss}") < 0) return t;
    const S = G.S;
    return t.replace(/\{boss\}/g, S && S.profile && S.profile.sex === "女" ? "アネキ" : "アニキ");
  };

  // ---------------------------------------------------------------- 結果の当てはめ
  const apply0 = G.apply;
  G.apply = (o) => {
    const S = G.S;
    if (!o || !S || S.over) return apply0(o);
    const c = G.m2Focus && G.m2Focus();
    const key = o.m11ap || o.m11try || o.m11won;
    if (key) {
      const a = G.m11Ap(key, S);
      if (o.m11ap) a.st = (a.st || 0) + 1;
      if (o.m11try) {
        a.tries = (a.tries || 0) + 1;
        a.day = S.day;
        const won = G.rand() < AP.win;
        if (!won) a.day = S.day + AP.wait - AP.gap; // 断られたら、しばらく会えない
        o = Object.assign({}, o, { next: `m11_${key}_${won ? "won" : "no"}` });
      }
      if (o.m11won && !a.won) {
        a.won = S.day || 1;
        G.chron(M().AP[key].chron, "comp");
        G.award("m11_ap");
      }
    }
    apply0(o);
    // 次に会えるまでの日数は、戻ってきた日から数える（島で過ぎた日数のあとから）
    if (o.m11ap) G.m11Ap(o.m11ap, S).day = S.day;
    if (G.m11Monster(c) && S.companions.includes(c) && (c.bond || 0) >= MON.bond) G.award("m11_mon");
  };

  // ---------------------------------------------------------------- 人生の物語（M6）
  // 好感度の高い魔物の子分（固い絆の仲間）がいる・いたとき、M10 の段落に一文を添える（恋の文ではない）
  const paras0 = G.m10StoryParas;
  G.m10StoryParas = (S, r) => {
    const P2 = paras0(S, r);
    try {
      const m = S.m10 || {};
      const live = (S.companions || []).find((c) => G.m11Monster(c) && ((c.bond || 0) >= MON.bond || c.c11));
      const rec = live || [...(m.past || [])].reverse().find((g) => G.m11Monster(g));
      if (P2.life && rec) {
        const name = (S.profile && S.profile.name) || S.name || "その人";
        const T = M().STORY_MON[live ? "together" : "lost"];
        P2.life += G.pick(T).replace(/\{name\}/g, name).replace(/\{sp\}/g, G.m2Short(rec));
      }
    } catch (e) { /* 一文なしでも物語は出る */ }
    return P2;
  };
  // 格の違う相手との恋：最後の前の段落に一文
  if (G.m6Compose) {
    const compose0 = G.m6Compose;
    G.m6Compose = (S) => {
      const r = compose0(S);
      if (!r || !r.life || !r.life.length || !S || !S.m11 || !S.m11.ap) return r;
      try {
        const name = (S.profile && S.profile.name) || S.name || "その人";
        const won = Object.keys(S.m11.ap).filter((k) => S.m11.ap[k].won && M().AP[k]);
        won.forEach((k) => { r.life[Math.max(0, r.life.length - 2)] += G.pick(M().AP[k].story).replace(/\{name\}/g, name); });
      } catch (e) { /* 一文なしでも物語は出る */ }
      return r;
    };
  }
  // シートの行（m10 の行のあとに）
  const rows0 = G.m10Rows;
  G.m10Rows = (S) => {
    const rows = rows0(S);
    const ap = (S && S.m11 && S.m11.ap) || {};
    Object.keys(ap).filter((k) => ap[k].won && M().AP[k]).forEach((k) => rows.push(["契り", M().AP[k].who]));
    return rows;
  };
})(globalThis.G = globalThis.G || {});
