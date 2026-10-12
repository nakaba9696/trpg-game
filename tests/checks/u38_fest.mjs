// U38：季節の催しは、その季節にその町で「町をぶらつく」を押せば最初の一回で必ず起きる（V13 の season の組の全部）。済んだら起きない・季節外は起きない
export default ({ fail, loadEngine, seeded }) => {
  const G0 = loadEngine(); // 読み込みが重いので、一つを使い回して newGame でやり直す
  const sets = (G0.data.V13 && G0.data.V13.LEADS || []).filter((s) => s.kind === "season");
  if (!sets.length || !G0.festPending) { fail("季節の催しの組か G.festPending が無い"); return; }
  const G = G0;
  // 暦は新しい冒険ごとに始まりの季節が違うので、日は冒険を始めてから数える
  const dayOf = (S, ev, on) => { for (let d = 2; d <= 721; d++) { S.day = d; let r = false; try { r = !ev.cond || !!ev.cond(S); } catch { r = false; } if (r === on) return d; } return 0; };
  const start = (seed, set, want) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(G.data.STATS.map((k) => [k, 50]));
    G.newGame({ cls: Object.keys(G.data.CLASSES)[0], stats, goal: Object.keys(G.data.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
    const S = G.S;
    S.loc = set.loc; S.visited[set.loc] = true; S.phase = 3; S.maxHp = S.hp = 999; S.gold = 999;
    const ev = G.data.EVENTS.find((e) => e.id === set.ev);
    S.day = want === undefined ? 2 : dayOf(S, ev, want) || 2;
    return { S, day: S.day };
  };
  for (const set of sets) {
    const ev = G.data.EVENTS.find((e) => e.id === set.ev);
    if (!ev) { fail(`${set.id}：出来事 ${set.ev} が無い`); continue; }
    // 「町をぶらつく」があるのは町だけ（野の催しは対象外）
    if (G.data.LOCS[set.loc].type !== "town") continue;
    if (!dayOf(start(1, set, true).S, ev, true)) { fail(`${set.id}：催しの起きる日が見つからない`); continue; }
    // 季節の町で、最初の一回で起きる（乱数の種を変えても）
    for (let seed = 1; seed <= 20; seed++) {
      const { S } = start(seed, set, true);
      G.act("walk");
      if (S.mode !== "event" || S.event !== set.ev) fail(`${set.id}（種 ${seed}）：季節の町でぶらついても ${set.ev} が起きない（mode ${S.mode}・event ${S.event}）`);
    }
    // 済んだら起きない（once の催しだけ。毎年ある催しは、その年のぶんが済んだ印を持たない）
    if (ev.once) {
      const { S } = start(3, set, true);
      S.flags["ev:" + ev.id] = true;
      if (G.festPending()) fail(`${set.id}：済んだ催しが起きる状態のまま`);
      for (let i = 0; i < 30 && !S.over; i++) {
        S.mode = "explore"; S.event = null; S.combat = null;
        G.act("walk");
        if (S.event === set.ev) fail(`${set.id}：済んだ催しがまた起きた`);
      }
    }
    // 毎年ある催しは、この季節に一度起きたら続けて起きない（翌年の季節にはまた起きる）
    if (!ev.once) {
      const { S } = start(4, set, true);
      G.act("walk");
      if (S.event !== set.ev) fail(`${set.id}：一回目が起きない`);
      for (let i = 0; i < 10 && !S.over; i++) {
        S.mode = "explore"; S.event = null; S.combat = null;
        G.act("walk");
        if (S.event === set.ev) fail(`${set.id}：毎年ある催しが同じ季節に続けて起きた`);
      }
      S.mode = "explore"; S.event = null; S.combat = null;
      const was = S.day;
      let again = 0;
      for (let d = was + 90; d < was + 800 && !again; d++) { S.day = d; if (!ev.cond || ev.cond(S)) { const p = G.festPending(); if (p && p.id === set.ev) again = d; } }
      if (!again) fail(`${set.id}：次の年の季節にまた起きない`);
    }
    // 季節外は強制しない
    {
      const { S, day } = start(5, set, false);
      const f = G.festPending();
      if (dayOf(S, ev, false) && f && f.id === set.ev) fail(`${set.id}：季節外（${day}日）なのに起きる状態`);
    }
    // 別の町では強制しない
    {
      const { S } = start(7, set, true);
      S.loc = Object.keys(G.data.LOCS).find((id) => id !== set.loc && G.data.LOCS[id].type === "town" && !(ev.where || []).includes(id));
      const f = G.festPending();
      if (f && f.id === set.ev) fail(`${set.id}：別の町で起きる状態`);
    }
  }
};
