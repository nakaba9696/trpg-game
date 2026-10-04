// 仲間どうしの掛け合い（K9）：C6・C7・C8 の仲間 30 人の、まとまりをまたぐ組（src/data/talk_banter_k9_*.js）。
// - 量：K9 の掛け合いが 150 以上、新しい組（K9 より前に掛け合いの無かった組）が 60 以上、after で続き物にした組が 20 以上。問い（side）のあるものが四割以上
// - 形：id は bt_k9_ で始まり重ならない。二人とも C6・C7・C8 の仲間（C2・C4・C5 の人は K8 が書く）。after は同じ組の前の掛け合いを指す。表情は moods.md の種類
// - 中身：C6×C7・C6×C8・C7×C8 のまとまりをまたぐ組がどれも 15 組以上。30 人が一人残らずどこかの組に入る
// - 遊ぶ：続き物の一組を仲間にして、順に全部起こせる（after・min が開く。問いに答えて好感度が動く）
const C6 = ["lucien", "barnabe", "selevan", "aubin", "lazare", "rodolphe", "margot", "solenne", "pipinelle", "lisette"];
const C7 = ["wolfram", "hartmut", "gustav", "timo", "noeris", "ingrid", "lumia", "sieglinde", "annelise", "radmila"];
const C8 = ["gigra", "valdun", "gensai", "tsuyuha", "takimaru", "yurien", "roswitha", "izra", "anselmo", "polf"];
const ALL = [...C6, ...C7, ...C8];
const group = (id) => (C6.includes(id) ? "C6" : C7.includes(id) ? "C7" : C8.includes(id) ? "C8" : null);

export default ({ G: G0, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("掛け合いK9: " + m); };
  const D0 = G0.data;
  const P = D0.C2_PEOPLE || {};
  const all = D0.TALK_BANTER || [];
  const K9 = all.filter((b) => String(b.id).startsWith("bt_k9_"));
  const old = all.filter((b) => !String(b.id).startsWith("bt_k9_"));
  const key = (b) => [b.a, b.b].sort().join("+");

  // ---------------------------------------------------------------- 形
  const ids = new Set();
  for (const b of K9) {
    if (ids.has(b.id)) F(`${b.id} の id が重なっている`);
    ids.add(b.id);
    for (const k of ["a", "b"]) {
      if (!group(b[k])) F(`${b.id}: ${b[k]} は C6・C7・C8 の仲間でない`);
      if (!(P[b[k]] || {}).join) F(`${b.id}: ${b[k]} が仲間になる人でない`);
    }
    if (b.after) {
      const prev = all.find((x) => x.id === b.after);
      if (!prev) F(`${b.id}: 前の掛け合い ${b.after} が無い`);
      else if (key(prev) !== key(b)) F(`${b.id}: 前の掛け合い ${b.after} が別の組`);
    }
    if (b.mood && !(G0.isMood && G0.isMood(b.mood))) F(`${b.id}: 表情 ${b.mood} が moods.md に無い`);
    if (b.side) for (const s of ["a", "b", "none"]) if (!b.side[s] || !b.side[s].label || !(b.side[s].aff || []).length) F(`${b.id}: 問いの ${s} が無いか、aff が無い`);
    if (b.side && !(b.side.a.aff[0] > 0 && b.side.b.aff[1] > 0)) F(`${b.id}: 肩を持った人の好感度が上がらない`);
  }

  // ---------------------------------------------------------------- 量
  const oldPairs = new Set(old.map(key));
  const pairs = new Map();
  for (const b of K9) pairs.set(key(b), (pairs.get(key(b)) || []).concat(b));
  const fresh = [...pairs.keys()].filter((k) => !oldPairs.has(k));
  const chained = [...pairs.values()].filter((l) => l.some((b) => b.after));
  const sides = K9.filter((b) => b.side).length;
  if (K9.length < 150) F(`掛け合いが ${K9.length}（150 以上）`);
  if (fresh.length < 60) F(`新しい組が ${fresh.length}（60 以上）`);
  if (chained.length < 20) F(`続き物の組が ${chained.length}（20 以上）`);
  if (sides < K9.length * 0.4) F(`問いのある掛け合いが ${sides}/${K9.length}（四割以上）`);
  for (const [k, l] of pairs) if (l.length < 2) F(`${k}: 一組 1 件だけ（2 以上）`);
  const cross = { "C6+C7": 0, "C6+C8": 0, "C7+C8": 0 };
  for (const k of pairs.keys()) { const g = k.split("+").map(group).sort().join("+"); if (g in cross) cross[g]++; }
  for (const [g, c] of Object.entries(cross)) if (c < 15) F(`${g} をまたぐ組が ${c}（15 以上）`);
  for (const who of ALL) if (!K9.some((b) => b.a === who || b.b === who)) F(`${P[who] ? P[who].name : who} の入る組が無い`);

  // ---------------------------------------------------------------- 遊ぶ：続き物の組を、順に全部起こす
  const G = loadEngine();
  G.data.Q8B.off = G.data.Q8L.off = true; // Q8 の上がり方・恋人の条件は tests/checks/q8_love.mjs で確かめる。ここは仕組みだけ
  const D = G.data;
  G.rand = seeded(909);
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
  const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" } });
  const S = G.S;
  S.maxHp = S.hp = 999;
  S.mode = "explore";
  let played = 0;
  // 野営・宿・旅のどれかで起きる続き物を、長いものから三組
  const NIGHT = ["camp", "inn", "road"];
  const chains = [...pairs.values()].filter((l) => l.length >= 2 && l.every((b) => [].concat(b.where || []).some((w) => NIGHT.includes(w)))).sort((x, y) => y.length - x.length).slice(0, 3);
  for (const chain of chains) {
    try {
      const [a, b] = [chain[0].a, chain[0].b];
      S.companions = [];
      G.c2Join(a); G.c2Join(b);
      const st = G.tkState(S);
      for (const bt of chain) {
        S.day += 1;
        G.affState(S)[a] = 75; G.affState(S)[b] = 75;
        const w = [].concat(bt.where || []).find((x) => NIGHT.includes(x));
        if (!G.tk.banters(S, w).some((x) => x.id === bt.id)) { F(`${bt.id}: 二人がそろい、前の掛け合いのあとでも起きない（${w}）`); break; }
        const before = [G.affState(S)[a], G.affState(S)[b]];
        G.tk.banter(bt);
        if (!st.bant[bt.id]) F(`${bt.id}: 起こしても記録されない`);
        if (bt.side) {
          if (S.event !== "tk_banter") { F(`${bt.id}: 問いのある掛け合いで、肩を持つ選択にならない`); break; }
          G.tk.side("a");
          if (!(G.affState(S)[a] > before[0])) F(`${bt.id}: {a} の肩を持っても好感度が上がらない`);
          if (S.mode === "event") { S.mode = "explore"; S.event = null; S.tk.cur = null; }
        }
        played++;
      }
      if (S.log.some((l) => /\{[a-z0-9_]+\}/.test(l.text || ""))) F(`${a}・${b}: 記録に {a} などが残る`);
    } catch (e) {
      F(`遊んでいて例外：${e.stack || e}`);
    }
  }

  if (n === 0) ok(`掛け合いK9（${K9.length} 件・新しい組 ${fresh.length}・続き物 ${chained.length} 組・問いのあるもの ${sides}・C6×C7 ${cross["C6+C7"]}／C6×C8 ${cross["C6+C8"]}／C7×C8 ${cross["C7+C8"]} 組・続き物を ${played} 件起こした）`);
};
