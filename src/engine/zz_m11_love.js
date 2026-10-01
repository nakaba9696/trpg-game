// 恋の広がり（M11・#117）。M10（src/engine/m10_love.js）の上に、次を足す。DOM には触らない。m10_love.js・zz_c2_people.js は書き換えず、包んで足す。
// - 魔物の子分（ゴブリンなど）とも恋仲になれる。ただし人の仲間よりずっと遠い道：気配の立つ好感度が高く、立つ日も少ない。
//   打ち明けても、言葉が通じきらずに空振りしやすい。告白と求婚の好感度も高く、求婚までの日数も長い。
// - 格の違う相手（朧島の狐面の女・ブランデールの片眼鏡の両替商）との恋。仲間にはならない。何度も会いに行く続き物で、最後の一歩はごく稀にしか通らない。
//   成就しても人の恋の形にはならない。人生の物語に一文が出る。
// 名前の頭の zz は、zz_c2_people.js（子どもの姿の者を恋の相手から外す G.m10Can・恋のひとこと G.c2Line）より後に読ませるため（manifest は触らない）。
//
// セーブ（G.S）に足すもの。古いセーブで無くても動く（G.m11State が埋める）
//   S.m11 = { ap: { yoi|zalve: { st 何度目まで進んだか, day 最後に会った日, won 成就した日, tries 最後の一歩を踏んだ回数 } }, balk 魔物の子分への空振りの数 }
// 出来事のデータ（src/data/events_m11_love.js）の結果に書けるもの：
//   m11ap: "yoi" 続き物を一つ進める・m11try: "yoi" 最後の一歩（ごく稀に成就の出来事へ、だめなら断りの出来事へ）・m11won: "yoi" 成就
//   文の中の {boss} 魔物の子分があなたを呼ぶ名（アニキ／アネキ）
// レーン C（コア）＋ V（出来事）の M11 が管理
(function (G) {
  const D = G.data;
  const M = () => D.M11;
  const MONSTER = /ゴブ|ゴブリン|オーク|スライム/;
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (Math.imul(31, h) + ch.codePointAt(0)) | 0; return Math.abs(h); };
  // 魔物の子分の道の重さ（人の仲間との差）
  const MON = { spark: 86, tell: 88, confess: 92, propose: 95, proposeDays: 20, balk: 0.5, sparkDays: 3 };
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
  // 恋の相手：魔物の子分も入れる（子どもの姿の者を外すのは、zz_c2_people.js の包みのまま）
  const can0 = G.m10Can;
  G.m10Can = (c) => !!c && (can0(c) || G.m11Monster(c));
  const P = G.m10P;
  const spark0 = P.spark, confess0 = P.confess, propose0 = P.propose;
  // 気配が立つ日は、名前と日付で決まる（乱数を使わない。三日に一日くらい）
  const sparkDay = (c, S) => hash(`${c.id || c.name}:${S.day}`) % MON.sparkDays === 0;
  P.spark = (c, S) => spark0(c, S) && (!G.m11Monster(c) || (c.bond >= MON.spark && sparkDay(c, S)));
  P.confess = (c, S) => confess0(c, S) && (!G.m11Monster(c) || c.bond >= MON.confess);
  P.propose = (c, S) => propose0(c, S) && (!G.m11Monster(c) || (c.bond >= MON.propose && S.day - (c.m10.since ?? S.day) >= MON.proposeDays));

  // 「想いを打ち明ける」：魔物の子分は、好感度がもっと高くないと出ない
  const acts0 = G.exploreActions;
  G.exploreActions = () => {
    const groups = acts0();
    const S = G.S;
    if (!S) return groups;
    const g = groups.find((x) => x.title === "想い");
    if (g) {
      g.list = g.list.filter((a) => {
        if (!a.id.startsWith("m10tell:")) return true;
        const c = S.companions.find((x) => "m10tell:" + x.id === a.id);
        return !G.m11Monster(c) || c.bond >= MON.tell;
      });
      if (!g.list.length) groups.splice(groups.indexOf(g), 1);
    }
    return groups;
  };

  // 恋のひとこと：魔物の子分は、魔物の言葉で（名前で一つに決まる）
  const line0 = G.c2Line;
  G.c2Line = (c, k) => {
    const r = line0 ? line0(c, k) : null;
    if (r || !G.m11Monster(c)) return r;
    const L = M().MON_LINES[k];
    return L && L.length ? L[hash(c.name) % L.length] : null;
  };
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
    // 魔物の子分に打ち明けて、通じなかった
    if (o.m10 === "love" && o.confess && G.m11Monster(c) && G.rand() < MON.balk) {
      G.m11State(S).balk++;
      o = { text: G.pick(M().MON_BALK), bond: 1, m10: "cool", coolDays: 12 };
    }
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
    if (o.m10 === "love" && G.m11Monster(c) && G.m10St(c) === "love") G.award("m11_mon");
  };

  // ---------------------------------------------------------------- 人生の物語（M6）
  // 恋人・連れ合いが魔物の子分だったとき、M10 の段落に一文を添える
  const paras0 = G.m10StoryParas;
  G.m10StoryParas = (S, r) => {
    const P2 = paras0(S, r);
    try {
      const m = S.m10;
      const p = (S.companions || []).find((c) => ["love", "vow", "wed"].includes(G.m10St(c))) || m.atHome;
      const rec = p || (m.spouse && m.spouse.lost ? m.spouse : null) || [...(m.past || [])].reverse()[0];
      if (P2.life && rec && G.m11Monster(rec)) {
        const name = (S.profile && S.profile.name) || S.name || "その人";
        const T = M().STORY_MON[p ? "together" : "lost"];
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
