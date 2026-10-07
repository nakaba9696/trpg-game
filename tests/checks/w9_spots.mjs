// W9：町の特色の場所（src/engine/w9_spots.js・src/data/w9_spots_*.js）
// - 担当の地方（W9.REGIONS）の町すべてに、宿・酒場・店・ギルド・教会・訓練場・裏路地・王城のほかの施設が一つ以上ある（大きな都でも二つまで）
// - 施設のデータの整合：町・名前・絵・行いの数（3〜6）・行いの id・判定の能力値と難しさ・状態・持ち物・敵・罪・先の行い
// - 稼ぎの場にしない：金や物が手に入る行いは、一度きりか 5 日以上あけないとできない。買い物は値が物の八割以上
// - 町の画面に名前で出て、入って、どの行いも例外なく動く（条件を外して全部押す）。古いセーブ（S.w9 なし）でも動く
// - 一日に一度・一度きり・先の行いが効く
export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  const W9 = G.w9;
  if (!W9) { fail("G.w9 が無い"); return; }
  const SP = D.W9_SPOTS || {};
  const REGIONS = ["エルメシア共和国", "光天教会領", "シェルアーク"];
  const MINE = ["zephara", "w2_amyrein", "w2_nagris"]; // もう特色があった町（W2・M1）
  const special = (L) => (L.fac || []).filter((f) => !W9.BASE.includes(f));
  let towns = 0;
  for (const [id, L] of Object.entries(D.LOCS)) {
    if (L.type !== "town" || !REGIONS.includes(L.region)) continue;
    towns++;
    const s = special(L);
    if (!s.length) fail(`${L.name}（${id}）に特色の場所が無い`);
    const w9 = s.filter((f) => SP[f]);
    if (w9.length > 2) fail(`${L.name} に W9 の場所が三つ以上`);
    if (!MINE.includes(id) && !w9.length) fail(`${L.name} に W9 の場所が無い`);
  }

  // ---------------------------------------------------------------- データの整合
  const outs = (o) => (o == null ? [] : Array.isArray(o) ? o.flatMap(outs) : typeof o === "function" ? [] : [o, ...outs(o.win)]);
  const STATES = new Set(Object.keys(G.c10.STATES));
  let acts = 0;
  for (const [f, sp] of Object.entries(SP)) {
    const where = `W9 ${f}`;
    if (!/^w9_/.test(f)) fail(`${where}: id が w9_ で始まらない`);
    const L = D.LOCS[sp.town];
    if (!L || L.type !== "town") { fail(`${where}: 町 ${sp.town} が無い`); continue; }
    if (!(L.fac || []).includes(f)) fail(`${where}: ${L.name} の施設に入っていない`);
    if (G.FAC_NAMES[f] !== sp.name) fail(`${where}: 施設の名前が G.FAC_NAMES に無い`);
    if (!D.FAC_SCENE[f]) fail(`${where}: 絵の名前が無い`);
    if (!(sp.enter && (typeof sp.enter === "function" || sp.enter.length))) fail(`${where}: 入ったときの文が無い`);
    if (!(sp.acts.length >= 3 && sp.acts.length <= 6)) fail(`${where}: 行いが ${sp.acts.length}（3〜6）`);
    const ids = new Set();
    for (const a of sp.acts) {
      acts++;
      const w = `${where}:${a.id}`;
      if (!a.id || ids.has(a.id)) fail(`${w}: id が無いか重なっている`);
      ids.add(a.id);
      if (!a.label) fail(`${w}: label が無い`);
      if (a.stat && !D.STATS.includes(a.stat)) fail(`${w}: 能力値 ${a.stat} が無い`);
      if (a.diff && !(a.diff in D.DIFF)) fail(`${w}: 難しさ ${a.diff} が無い`);
      if (a.stat && !a.ng) fail(`${w}: 判定があるのに失敗の結果が無い`);
      if (a.on && !STATES.has(a.on) && !(G.c10.state(a.on))) fail(`${w}: 状態 ${a.on} が無い`);
      if (a.after && !sp.acts.some((x) => x.id === a.after && x.once)) fail(`${w}: 先の行い ${a.after} が無いか一度きりでない`);
      if (a.need && !D.ITEMS[a.need]) fail(`${w}: 持ち物 ${a.need} が無い`);
      const take = a.take == null ? {} : typeof a.take === "string" ? { [a.take]: 1 } : a.take;
      Object.keys(take).forEach((id) => { if (!D.ITEMS[id]) fail(`${w}: 渡す物 ${id} が無い`); });
      if (/\{n\}/.test(a.label) && !/^comp:/.test(a.on || "")) fail(`${w}: {n} があるのに仲間の行いでない`);
      let gain = 0;
      for (const o of [...outs(a.ok), ...outs(a.ng), ...outs(a.crit)]) {
        if (!o.text) fail(`${w}: 文の無い結果`);
        if (/\{n\}/.test(o.text || "") && !/^comp:/.test(a.on || "")) fail(`${w}: 結果の文に {n}`);
        if (/\d+\s*(G|日|%)|HP|MP/.test(o.text || "")) fail(`${w}: 物語の文に内部の数「${o.text.slice(0, 20)}」`);
        let g = Math.max(0, o.gold || 0);
        Object.entries(typeof o.item === "string" ? { [o.item]: 1 } : o.item || {}).forEach(([id, n]) => {
          if (!D.ITEMS[id]) fail(`${w}: 物 ${id} が無い`); else g += (D.ITEMS[id].price || 0) * n;
        });
        gain = Math.max(gain, g); // 結果のうち、いちばん得なもの
        (Array.isArray(o.fight) ? o.fight : o.fight ? [o.fight] : []).forEach((id) => { if (!D.ENEMIES[id]) fail(`${w}: 敵 ${id} が無い`); });
        if (o.crime && !D.CRIMES[o.crime]) fail(`${w}: 罪 ${o.crime} が無い`);
        Object.keys(o.grow || {}).forEach((k) => { if (!D.STATS.includes(k)) fail(`${w}: 伸びる能力値 ${k} が無い`); });
        (Array.isArray(o.mark) ? o.mark : o.mark ? [o.mark] : []).forEach((id) => { if (!sp.acts.some((x) => x.id === id)) fail(`${w}: mark ${id} が無い`); });
      }
      // 稼ぎの場にしない
      const given = Object.entries(take).reduce((s, [id, n]) => s + (D.ITEMS[id] ? D.ITEMS[id].price * n : 0), 0);
      if (gain > 0 && !a.once && (a.every || 1) < 5 && !(a.buy && (a.cost || 0) + given >= gain * 0.8))
        fail(`${w}: 金や物が手に入るのに、何度でもできる（once か every 5 以上に）`);
      if (gain > 0 && !a.once && gain - (a.cost || 0) - given > 60 * (a.every || 1) / 7 + 40) fail(`${w}: 一度に得るものが多すぎる（${gain}）`);
    }
  }

  // ---------------------------------------------------------------- 遊ぶ
  const stats = Object.fromEntries(D.STATS.map((k) => [k, 60]));
  const start = (seed) => {
    G.rand = seeded(seed);
    G.newGame({ cls: "priest", stats: { ...stats }, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.mode = "explore"; S.event = null; S.combat = null;
    return S;
  };
  const acts0 = () => G.actions().flatMap((g) => g.list);
  let pressed = 0;
  for (const [f, sp] of Object.entries(SP)) {
    for (let seed = 1; seed <= 3; seed++) {
      const S = start(seed * 31 + f.length);
      delete S.w9; // 古いセーブ
      S.loc = sp.town; S.visited[sp.town] = true; S.gold = 2000; S.fame = 120; S.sin = 0;
      const btn = acts0().find((a) => a.id === "fac:" + f);
      if (!btn) { fail(`${f}: ${D.LOCS[sp.town].name} の画面に出ない`); break; }
      if (btn.label !== sp.name) fail(`${f}: ボタンの名前が「${btn.label}」`);
      G.act("fac:" + f);
      if (S.mode !== "fac" || S.fac !== f) { fail(`${f}: 入れない`); break; }
      // 条件を外して全部押す（状態は満たしたことにする）
      const state0 = G.c10.state;
      G.c10.state = (k) => ({ tag: "テスト", cond: () => true });
      try {
        for (const a of sp.acts) {
          const T = G.S;
          if (T.over) break;
          T.mode = "fac"; T.fac = f; T.combat = null; T.loc = sp.town; T.gold = 2000; T.hp = T.maxHp;
          T.memos = [...(T.memos || []), "一", "二", "三", "四", "五", "大聖堂の「下ろす分」の蝋燭"];
          T.phase = a.phase ? a.phase[0] : 1;
          if (a.need) G.give(a.need);
          if (a.take) Object.entries(typeof a.take === "string" ? { [a.take]: 1 } : a.take).forEach(([id, n]) => G.give(id, n));
          if (a.after) W9.st(T).once[`${f}:${a.after}`] = T.day;
          if (a.when && !a.when(T)) T.sin = 10;
          if (a.when && !a.when(T)) { fail(`${f}:${a.id}: when を満たせない`); continue; }
          W9.st(T).last = {};
          const id = `w9:${f}:${a.id}`;
          const b = acts0().find((x) => x.id === id);
          if (!b) { fail(`${f}:${a.id}: 行いが出ない`); continue; }
          if (b.disabled) { fail(`${f}:${a.id}: 押せない（${b.sub}）`); continue; }
          if (/\{n\}/.test(b.label)) fail(`${f}:${a.id}: ボタンに {n} が残る`);
          const day = T.day, phase = T.phase;
          try { G.act(id); pressed++; } catch (e) { fail(`${f}:${a.id}: 例外 ${e.message}`); continue; }
          if (!T.over && T.day === day && T.phase === phase && (a.time == null || a.time > 0)) fail(`${f}:${a.id}: 時間が進まない`);
          if (!["fac", "combat", "event", "explore", "over"].includes(T.mode)) fail(`${f}:${a.id}: mode が変 ${T.mode}`);
          if (T.combat) { T.combat = null; T.mode = "fac"; }
          if (!T.over) {
            const again = acts0().find((x) => x.id === id);
            if (a.once && again) fail(`${f}:${a.id}: 一度きりなのにまた出る`);
            if (!a.once && T.mode === "fac" && T.day === W9.st(T).last[`${f}:${a.id}`] && again && !again.disabled) fail(`${f}:${a.id}: 同じ日にまた押せる`);
          }
          if (Number.isNaN(T.gold) || Number.isNaN(T.hp) || T.gold < 0) fail(`${f}:${a.id}: 数が壊れた（金 ${T.gold}・HP ${T.hp}）`);
        }
      } finally { G.c10.state = state0; }
    }
  }

  // ---------------------------------------------------------------- 条件
  {
    const S = start(5);
    const f = "w9_cathedral";
    S.loc = SP[f].town; S.fame = 0; S.sin = 0; S.virtue = 0;
    G.act("fac:" + f);
    const ids = () => acts0().map((a) => a.id);
    if (ids().includes(`w9:${f}:ledger`)) fail("先の行い（拝謁）の前に、名簿を盗み見られる");
    if (ids().includes(`w9:${f}:wash`)) fail("善行の無い者に、施療院の行いが出る");
    if (ids().includes(`w9:${f}:confess`)) fail("罪の無い者に、告解が出る");
    S.sin = 3;
    if (!ids().includes(`w9:${f}:confess`)) fail("罪のある者に、告解が出ない");
    S.gold = 0;
    const c = acts0().find((a) => a.id === `w9:${f}:confess`);
    if (c && !c.disabled) fail("金が無いのに告解できる");
    if (!ids().includes(`w9:${f}:pulpit`)) fail("破戒神官に、説教壇の行いが出ない");
  }
  ok(`町の特色の場所（W9）：地方 ${REGIONS.join("・")} の町 ${towns}・場所 ${Object.keys(SP).length}・行い ${acts}。${pressed} 回押して例外なし`);
};
