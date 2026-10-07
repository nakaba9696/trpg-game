// S7：職業の向き不向きで伸びやすさが変わる（持ち主「平均的に上げるのを正解にしないでほしい」）
// - 職業の補正（mod2）が + の能力は伸びやすく高くても伸び続け、− の能力は低いうちから鈍る。苦手を伸ばす道は残る（とても遅いだけ）
// - 同じ回数鍛えるなら、得意 2 つに寄せた育て方の方が、全部を均等に上げた育て方より強敵（角兜の将）に勝ち、難しい判定（40 点の相手）に通る
// - 画面の印（伸びやすい／ふつう／伸びにくい）、古いセーブ（職業の補正が無い・S.s5use が無い）でも動く
export default ({ G, fail: fail0, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const st = (n) => Object.fromEntries(D.STATS.map((k) => [k, n]));
  const fresh = (cls, seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const q = G.cre.quickStats(cls, G.rand);
    G.newGame({ cls, stats: q.stats, caps: q.caps, goal: "rich", profile: { name: "テスト", sex: "男", age: 25, history: "テスト用" } });
    return G.S;
  };

  // ---------------------------------------------------------------- 向き不向き
  const S = fresh("merc", 7700);
  const up = D.STATS.filter((k) => G.s5Apt(k) > 0), down = D.STATS.filter((k) => G.s5Apt(k) < 0);
  if (!up.length || !down.length) fail(`傭兵に得意・苦手の能力が無い（${up}／${down}）`);
  if (G.s5AptKind(up[0]) !== "伸びやすい" || G.s5AptKind(down[0]) !== "伸びにくい") fail("向き不向きの印が出ない");
  // 同じ点・同じ経験で、得意 > ふつう > 苦手
  const gain = (k, from, n) => { S.stats[k] = from; S.s5exp = {}; G.grow(k, n); return S.stats[k] + (S.s5exp[k] || 0) / G.s5Need(S.stats[k], G.s5Apt(k)); };
  const mid = D.STATS.find((k) => G.s5Apt(k) === 0);
  const best = up.sort((a, b) => G.s5Apt(b) - G.s5Apt(a))[0], worst = down.sort((a, b) => G.s5Apt(a) - G.s5Apt(b))[0];
  for (const from of [12, 40, 70]) {
    const g = { up: gain(best, from, 200) - from, mid: mid ? gain(mid, from, 200) - from : null, down: gain(worst, from, 200) - from };
    if (!(g.up > g.down * 2)) fail(`${from} 点から：得意（${best}）の伸び ${g.up.toFixed(1)} が苦手（${worst}）${g.down.toFixed(1)} の 2 倍に届かない`);
    if (mid && !(g.up > g.mid && g.mid > g.down)) fail(`${from} 点から：得意 > ふつう > 苦手 になっていない（${g.up.toFixed(1)}・${g.mid.toFixed(1)}・${g.down.toFixed(1)}）`);
    if (!(g.down > 0)) fail(`${from} 点から：苦手な能力がまったく伸びない`);
  }
  // 得意は高い所でも伸び続ける：70 点からの伸びが、12 点からの伸びの 3 分の 1 より大きい
  if (!(gain(best, 70, 200) - 70 > (gain(best, 12, 200) - 12) / 3)) fail("得意な能力が高い所で伸びなくなる");
  // 苦手は低いうちから鈍る：12 点からでも、ふつうの能力より次の 1 点に要る経験が多い
  if (!(G.s5Need(12, G.s5Apt(worst)) > G.s5Need(12, 0))) fail("苦手な能力が低いうちから鈍らない");
  // 苦手も、長く鍛えれば伸びる
  S.stats[worst] = 8; S.s5exp = {};
  G.rand = seeded(7701);
  for (let i = 0; i < 400; i++) G.grow(worst, G.d(3) + 1);
  if (!(S.stats[worst] >= 25)) fail(`苦手な能力を 400 回鍛えても 25 点に届かない（${S.stats[worst]}）`);

  // ---------------------------------------------------------------- 得意に寄せる ＞ 均等に上げる
  // 同じ回数（120 回）訓練場で鍛える（訓練の式：経験 1D3＋1 × 使い方の偏り）。得意 2 つ（武器の能力と体力）に寄せるか、6 つを順に均等にか
  const train = (plan, seed) => {
    const T = fresh("merc", seed);
    const ks = plan === "focus" ? [G.weapon().stat, "体力"] : D.STATS;
    for (let i = 0; i < 120; i++) { const k = ks[i % ks.length]; G.grow(k, (G.d(3) + 1) * G.s5Used(k)); }
    return T;
  };
  const fightRate = (plan) => {
    let win = 0, rounds = 0;
    for (let i = 0; i < 30; i++) {
      const T = train(plan, 7800 + i);
      T.hp = T.maxHp; T.inv = { potion: 2 };
      G.startCombat(["general"]);
      let n = 0;
      while (T.mode === "combat" && !T.over && n++ < 80) G.act(T.hp < T.maxHp * 0.35 && T.inv.potion ? "cb:item:potion" : "cb:attack");
      if (!T.over && T.mode !== "combat") win++;
      rounds += n;
    }
    return win / 30;
  };
  const F = train("focus", 7900), E = train("even", 7900);
  const w = G.weapon().stat;
  const sum = (T) => D.STATS.reduce((a, k) => a + T.stats[k], 0);
  const focusW = F.stats[w], evenW = E.stats[w];
  if (!(focusW > evenW + 8)) fail(`得意に寄せても、武器の能力が均等の育て方より大きく伸びない（寄せる ${focusW}・均等 ${evenW}）`);
  const winF = fightRate("focus"), winE = fightRate("even");
  if (!(winF > winE + 0.15)) fail(`得意に寄せた方が強敵（角兜の将）に勝ちやすくなっていない（寄せる ${Math.round(winF * 100)}%・均等 ${Math.round(winE * 100)}%）`);
  // 依頼：いちばん得意な能力で、40 点の相手の判定（後半の難しい依頼）
  const hardOf = (T) => { G.S = T; T.conds = []; return Math.max(...D.STATS.map((k) => G.chance(k, { vs: 40 }))); };
  const hF = hardOf(F), hE = hardOf(E);
  if (!(hF > hE + 10)) fail(`得意に寄せた方が40 点の相手の判定に通りやすくなっていない（寄せる ${hF}%・均等 ${hE}%）`);

  // ---------------------------------------------------------------- 古いセーブ
  {
    const T = fresh("thief", 7950);
    const old = JSON.parse(JSON.stringify(T));
    delete old.s5use;
    old.cls = "no_such_class";   // 職業の表に無い（古い・消えた職業）
    G.S = old;
    if (G.s5Apt("敏捷") !== 0 || G.s5AptKind("敏捷") !== "ふつう") fail("職業の表に無いセーブで向き不向きが付いた");
    const [a, b] = G.grow("敏捷", 8);
    if (!(b >= a)) fail("職業の表に無いセーブで成長が壊れる");
  }

  if (!bad) ok(`S7 向き不向き（120 回鍛えて 武器の能力 寄せる ${focusW}・均等 ${evenW}、能力値の合計 ${sum(F)}・${sum(E)}。角兜の将に勝つ ${Math.round(winF * 100)}%・${Math.round(winE * 100)}%。40 点の相手 ${hF}%・${hE}%）`);
};
