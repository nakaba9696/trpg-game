// Q8：悪名は、罪が人に知られたときだけ上がる（data/q8_hidden.js の D.Q8H）。core.js・m3_repute.js・zr1_race.js は書き換えず、G.crime を包む。
//   罪を犯す → その罪の中で上がるはずの悪名（core の悪名・R1 の「覚えられやすい」）をいったん預かる → 見られたかを決める
//   見られた：預かった悪名をそのまま上げる。見られなかった：「隠れた罪」として残し、日が変わるたびに発覚するかを決める
//   罪の匂い（S.sin）と犯した行い（S.q8deeds）は、見られたかどうかに関係なく残る（core と zzzzzzz_q8_love.js のまま）
// セーブに足すもの：S.q8hid = [{ kind, day, inf: [[悪名, 国], …], loose }]・S.q8hidDay（最後に発覚を決めた日）。古いセーブで無くても動く（無ければ隠れた罪は無し）。
// 乱数は G.rand だけ。名前の頭の zzzzzzz は、zr1_race.js・zzzzz_talk.js の G.crime の包みより外側にするため。レーン Q
(function (G) {
  const D = G.data;
  const H = () => D.Q8H;
  const kindOf = (k) => H().KIND[k] || H().ANY;
  const hid = (S) => (Array.isArray(S.q8hid) ? S.q8hid : (S.q8hid = []));

  // その場で見られる見込み（判定の前）
  G.q8Watch = (kind, S) => {
    S = S || G.S;
    const L = G.loc();
    let p = kindOf(kind).seen * (H().PLACE[L.type] || 1);
    if (S.phase === 3) p *= H().NIGHT;
    return Math.min(1, p);
  };
  // 一緒にいた仲間の影響（口を滑らす見込みの足し分・かばう割合）
  const comps = (S) => S.companions || [];
  const loose = (S) => comps(S).filter((c) => (c.bond || 0) < H().LOOSE).length * H().LOOSE_ADD;
  const cover = (S) => (comps(S).some((c) => (c.bond || 0) >= H().COVER) ? H().COVER_MUL : 1);

  // 罪が見られたか（G.rand）。見られたら true
  G.q8Seen = (kind) => {
    const S = G.S;
    const K = kindOf(kind);
    if (G.rand() >= G.q8Watch(kind, S)) return false;
    const hide = (G.chance(K.stat, K.diff) / 100) * H().HIDE;
    return G.rand() >= hide;
  };

  const raise = (list) => list.forEach(([v, n]) => addInf0(v, n));
  let addInf0 = G.addInfamy;
  const crime0 = G.crime;
  G.crime = (kind, n) => {
    const S = G.S;
    if (!S || H().off || !(D.CRIMES || {})[kind]) return crime0(kind, n);
    // 罪の中で上がるはずの悪名を預かる
    const held = [];
    addInf0 = G.addInfamy;
    G.addInfamy = (v, at) => { const where = at === undefined ? G.nationOf() : at; if (where && v) held.push([v, where]); };
    let r;
    try { r = crime0(kind, n); } finally { G.addInfamy = addInf0; }
    if (!held.length || S.over) return r;
    if (G.q8Seen(kind)) {
      G.say(G.pick(H().SEEN));
      raise(held);
    } else {
      G.say(G.pick(H().UNSEEN));
      hid(S).push({ kind, day: S.day, inf: held, loose: loose(S) });
    }
    return r;
  };

  // 日が変わるたびに、隠れた罪が発覚するかを決める
  // day を渡すと、その日のこととして決める（旅で何日か進んだときは、一日ずつ）
  G.q8Discover = (day) => {
    const S = G.S;
    if (!S || S.over || !Array.isArray(S.q8hid) || !S.q8hid.length) return;
    day = day === undefined ? S.day : day;
    const keep = [];
    for (const h of S.q8hid) {
      const age = day - h.day;
      if (age > H().KEEP) continue;
      const p = (kindOf(h.kind).later + (h.loose || 0)) * H().DAILY * Math.pow(H().FADE, age) * cover(S);
      if (age >= 1 && G.rand() < p) {
        G.say(G.pick(kindOf(h.kind).how));
        raise(h.inf);
        G.chron(`隠していた罪（${(D.CRIMES[h.kind] || {}).name || h.kind}）が知られる`, "event");
      } else keep.push(h);
    }
    S.q8hid = keep;
  };
  const end0 = G.endTurn;
  G.endTurn = () => {
    const S = G.S;
    const day = S && S.q8hidDay;
    end0();
    if (!G.S || G.S.over) return;
    if (day === G.S.day) return;
    G.S.q8hidDay = G.S.day;
    if (day !== undefined) for (let d = Math.max(day + 1, G.S.day - 9); d <= G.S.day && !G.S.over; d++) G.q8Discover(d);
  };
})(globalThis.G = globalThis.G || {});
