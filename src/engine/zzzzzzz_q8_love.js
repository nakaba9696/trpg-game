// Q8：恋人になる条件（data/q8_love.js の D.Q8L）。好感度のほかに、その人ならではの条件がそろうまで、恋仲にならない。
// 包むもの（書き換えない）：
//   - 恋の筋（R2）の告白の段（5）：G.r2Gate。条件がそろうまで、その段の話題が出ない
//   - M10 の告白の出来事：G.m10P.confess。条件がそろうまで、告白の出来事が起きない
//   - 恋仲になる所：G.m10Do("love")。ほかの道（出来事の結果）から来ても、条件がそろっていなければ先送り（しばらく冷ます）
//   - 罪：G.crime。犯した罪の種類を S.q8deeds に数える（条件の「この罪を犯していない」に使う）
//   - 旅：G.arrive。その人を連れて着いた場所を S.q8with に覚える
// 古いセーブ：S.q8deeds・S.q8with が無ければ、罪は無し・連れて着いた場所は無しとして読む。すでに恋仲・約束・連れ合いの仲は、そのまま（壊さない）。
// 名前の頭の zzzzzzz は、zzzzzz_romance2.js・zzzz_romance.js より後に読ませて包むため。レーン Q
(function (G) {
  const D = G.data;
  const L = () => D.Q8L;
  const heardOf = (S) => (G.tkState ? G.tkState(S).heard : (S.tk && S.tk.heard) || {});
  const joinedOf = (c, S) => {
    const j = c.c2 && G.c2State ? G.c2State(S).joined[c.c2] : undefined;
    return j !== undefined ? j : c.joined !== undefined ? c.joined : S.day;
  };
  const keyOf = (c) => c.c2 || c.id;
  G.q8LoveRule = (c) => (c && c.c2 && L().PEOPLE[c.c2]) || L().ANY;

  // その人と恋仲になれるか（好感度のほかの条件）。足りないものの名を返す（無ければ空）
  G.q8LoveMissing = (c, S) => {
    S = S || G.S;
    if (!c || !S) return ["?"];
    if (L().off) return []; // off：条件なし（恋の筋の仕組みだけを確かめるテスト用）
    const r = G.q8LoveRule(c);
    const miss = [];
    (r.heard || []).forEach((id) => { if (!heardOf(S)[id]) miss.push("heard:" + id); });
    if (r.days && S.day - joinedOf(c, S) < r.days) miss.push("days");
    if (r.with && !((S.q8with || {})[keyOf(c)] || {})[r.with]) miss.push("with:" + r.with);
    (r.clean || []).forEach((k) => { if ((S.q8deeds || {})[k]) miss.push("clean:" + k); });
    if (r.arc) {
      const A = D.R2 && D.R2.ARCS && D.R2.ARCS[c.c2];
      const need = A && A.hard && A.hard.need && A.hard.need[5];
      if (need && !need.test(S, c)) miss.push("arc");
    }
    return miss;
  };
  G.q8LoveOk = (c, S) => G.q8LoveMissing(c, S).length === 0;

  // ---------------------------------------------------------------- 罪と旅を覚える
  const crime0 = G.crime;
  G.crime = (kind, n) => {
    const S = G.S;
    if (S && D.CRIMES && D.CRIMES[kind]) { S.q8deeds = S.q8deeds || {}; S.q8deeds[kind] = (S.q8deeds[kind] || 0) + 1; }
    return crime0(kind, n);
  };
  const arrive0 = G.arrive;
  G.arrive = (dest) => {
    const S = G.S;
    if (S) {
      S.q8with = S.q8with || {};
      (S.companions || []).forEach((c) => { const k = keyOf(c); (S.q8with[k] = S.q8with[k] || {})[dest] = true; });
    }
    return arrive0(dest);
  };

  // ---------------------------------------------------------------- 告白の段・告白の出来事・恋仲になる所
  const PARTNER = ["love", "vow", "wed"];
  const st = (c) => (G.m10St ? G.m10St(c) : (c && c.m10 && c.m10.st) || "");
  if (G.r2Gate) {
    const gate0 = G.r2Gate;
    G.r2Gate = (tp, c, S) => {
      if (!gate0(tp, c, S)) return false;
      const meta = tp && tp.r2;
      if (meta && meta.type === "step" && meta.n === 5 && !PARTNER.includes(st(c))) return G.q8LoveOk(c, S || G.S);
      return true;
    };
  }
  const MP = G.m10P;
  if (MP && MP.confess) {
    const confess0 = MP.confess;
    MP.confess = (c, S) => confess0(c, S) && G.q8LoveOk(c, S);
  }
  if (G.m10Do) {
    const do0 = G.m10Do;
    G.m10Do = (kind, c, o) => {
      const S = G.S;
      if (kind === "love" && c && S && !PARTNER.includes(st(c)) && !G.q8LoveOk(c, S)) {
        const x = G.m10Of ? G.m10Of(c) : (c.m10 = c.m10 || {});
        x.cool = Math.max(x.cool || 0, S.day + 7);
        G.note(L().HOLD.replace("{n}", G.m2Short ? G.m2Short(c) : c.name));
        return;
      }
      return do0(kind, c, o);
    };
  }
})(globalThis.G = globalThis.G || {});
