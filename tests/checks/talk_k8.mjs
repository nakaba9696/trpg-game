// 仲間同士の掛け合いの八回目（K8）：地域をまたぐ組。src/data/talk_banter_k8_*.js（id は bt_k8_ で始める）。
// 片方は C2・C4・C5 の仲間（ディル〜フェリクスの 18 人）。前の回までに掛け合いの無かった組だけを書く。
// - 量：新しい組 60 以上・掛け合い 150 以上・続き物（after）のある組 20 以上・問い（side）は三分の一以上
// - 人：二人とも仲間になる人で、会話の表がある。片方が C2・C4・C5 の仲間。C6・C7・C8 の二人だけの組は書かない（K9 の分）
// - id：bt_k8_ で始まり、重ならない。after は同じ組の前の掛け合いを指す
// - 恋めいた話は書かない（恋の相手でない人・18 歳未満・子どもの姿の人を含む組で「恋」「惚れ」などを使わない）
// - 遊ぶ：組を連れて、掛け合いが出る・肩を持つと好感度が動く・置き換えが残らない
const MINE = ["dil", "sheila", "nora", "zerina", "kaidel", "rui", "elnea", "natalia", "bertrand", "ilse", "tula", "mirlene", "bruno", "trude", "souhaku", "adele", "celestin", "felix"];

export default ({ G: G0, fail, ok, loadEngine }) => {
  let n = 0;
  const F = (m) => { n++; fail("掛け合いK8: " + m); };
  const D0 = G0.data;
  const T = D0.TALK || {};
  const P = D0.C2_PEOPLE || {};
  const ALL = D0.TALK_BANTER || [];
  const B = ALL.filter((b) => /^bt_k8_/.test(b.id));
  const key = (b) => [b.a, b.b].sort().join("+");
  const old = new Set(ALL.filter((b) => !/^bt_k8_/.test(b.id) && !/^bt_r2_/.test(b.id) && !/^bt_q9_/.test(b.id)).map(key)); // R2 の恋・C9 の頼みごとの結末の掛け合いは数えない

  // ---------------------------------------------------------------- 量
  const pairs = new Map();
  for (const b of B) pairs.set(key(b), (pairs.get(key(b)) || []).concat(b));
  if (pairs.size < 60) F(`新しい組が ${pairs.size}（60 以上）`);
  if (B.length < 150) F(`掛け合いが ${B.length}（150 以上）`);
  const chained = [...pairs.values()].filter((l) => l.some((b) => b.after)).length;
  if (chained < 20) F(`続き物の組が ${chained}（20 以上）`);
  const sides = B.filter((b) => b.side).length;
  if (sides < Math.floor(B.length / 3)) F(`問いのある掛け合いが ${sides}（${Math.floor(B.length / 3)} 以上）`);

  // ---------------------------------------------------------------- 人と id
  const ids = new Set();
  for (const b of B) {
    if (ids.has(b.id)) F(`${b.id}: id が重なっている`);
    ids.add(b.id);
    for (const k of ["a", "b"]) if (!T[b[k]] || !(P[b[k]] || {}).join) F(`${b.id}: ${b[k]} は会話の表のある仲間でない`);
    if (!MINE.includes(b.a) && !MINE.includes(b.b)) F(`${b.id}: C2・C4・C5 の仲間が入っていない（${b.a}・${b.b}）`);
    if (old.has(key(b))) F(`${b.id}: 前の回に掛け合いのある組（${key(b)}）`);
    if (b.after) {
      const prev = B.find((x) => x.id === b.after);
      if (!prev) F(`${b.id}: 前の掛け合い ${b.after} が K8 に無い`);
      else if (key(prev) !== key(b)) F(`${b.id}: 前の掛け合い ${b.after} が別の組`);
    }
    // 恋めいた話：恋の相手どうしの組だけ
    const adult = (id) => (P[id].age || 0) >= 18 && !P[id].childLook && P[id].romance;
    if (!(adult(b.a) && adult(b.b))) {
      const text = JSON.stringify([b.title, b.lines, b.side ? [b.side.q, b.side.a, b.side.b, b.side.none] : null]);
      const m = text.match(/恋|惚れ|口づけ|求婚|愛して/);
      if (m) F(`${b.id}: 恋の相手でない人を含む組に「${m[0]}」`);
    }
  }

  // ---------------------------------------------------------------- 遊ぶ：組を連れて、掛け合いを起こす
  let fired = 0, moved = 0;
  for (const [k, list] of pairs) {
    const [x, y] = k.split("+");
    const G = loadEngine();
    const D = G.data;
    const stats = Object.fromEntries(D.STATS.map((s) => [s, 50]));
    const caps = Object.fromEntries(D.STATS.map((s) => [s, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 24, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.maxHp = S.hp = 999;
    S.mode = "explore";
    try {
      G.c2Join(x); G.c2Join(y);
      G.tkState(S);
      const cs = S.companions.filter((c) => c.c2 === x || c.c2 === y);
      if (cs.length < 2) { F(`${k}: 二人とも仲間にならない`); continue; }
      cs.forEach((c) => G.tk.addAff(c, 60 - G.tk.aff(c)));
      // 場所の札を問わず、順に起こす（after の順）
      const done = new Set();
      for (let i = 0; i < list.length; i++) {
        const b = list.find((z) => !done.has(z.id) && (!z.after || done.has(z.after)));
        if (!b) { F(`${k}: 続きが開かない掛け合いがある`); break; }
        done.add(b.id);
        const before = cs.map((c) => G.tk.aff(c));
        S.event = null;
        G.tk.banter(b);
        fired++;
        if (b.side) {
          if (S.event !== "tk_banter") { F(`${b.id}: 肩を持つ選択にならない`); continue; }
          G.tk.side("a");
          if (cs.some((c, j) => G.tk.aff(c) !== before[j])) moved++;
        }
        if (!S.tk.bant[b.id]) F(`${b.id}: 起きたことが残らない`);
      }
      if (S.log.some((l) => /\{[a-z0-9_]+\}/.test(l.text || ""))) F(`${k}: 置き換えが残っている`);
    } catch (e) { F(`${k}: 例外 ${e.message}`); }
  }

  if (n === 0) ok(`掛け合いK8（地域をまたぐ組 ${pairs.size}・掛け合い ${B.length}・続き物の組 ${chained}・問い ${sides}。全部起こして ${fired} 件、肩を持って好感度が動いた ${moved} 件）`);
};
