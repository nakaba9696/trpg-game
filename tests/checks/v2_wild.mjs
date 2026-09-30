// V2：野外・迷宮の出来事・その2（src/data/events_wild2.js・lore_v2.js）
// - 本編 15 件（w > 0）が野外と迷宮の 10 か所以上にばらけ、どれも判定なしの選択肢を持つ
// - 全部の選択肢を種を変えて最後まで（戦闘・続きの出来事まで）回しても、例外も存在しない続きも出ない
// - 用語説明に書き足した行が、ちゃんと載っている
export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const evs = D.EVENTS.filter((e) => e.id.startsWith("v2_"));
  const main = evs.filter((e) => e.w > 0);
  if (main.length !== 15) fail(`V2 の本編の出来事が ${main.length} 件（15 件のはず）`);
  const places = new Set(main.flatMap((e) => e.where).filter((w) => D.LOCS[w] && D.LOCS[w].type !== "town"));
  if (places.size < 10) fail(`V2 の出来事の場所が ${places.size} か所しかない`);
  for (const e of main) if (!e.choices.some((c) => !c.stat && !c.fight)) fail(`${e.id}: 判定なしの選択肢が無い`);
  for (const k of ["mordu:v2_met", "azlag:v2_ridge", "notari:v2_market", "swords:v2_bones", "dice:v2_road"]) {
    const [id, key] = k.split(":");
    if (!D.LORE[id]?.lines.some((l) => l[0] === key)) fail(`用語 ${k} が載っていない`);
  }

  let runs = 0;
  for (const e of evs) e.choices.forEach((_, i) => {
    for (let seed = 1; seed <= 4; seed++) {
      try {
        G.rand = seeded(seed * 31 + i);
        G.P = { trophies: {}, graves: [] };
        const stats = {}, caps = {};
        D.STATS.forEach((k) => { stats[k] = 30 + G.d(40); caps[k] = 90; });
        G.newGame({ cls: G.pick(Object.keys(D.CLASSES)), stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
        G.S.loc = e.where.find((w) => D.LOCS[w]) || "plains";
        G.S.gold = 500;
        G.S.flags.v2_morudu = true;
        G.startEvent(e.id);
        G.chooseEvent(i);
        runs++;
        for (let step = 0; step < 200 && !G.S.over; step++) {
          if (G.S.combat) { G.combatAct("attack"); continue; }
          if (G.S.mode !== "event") break;
          if (!D.EVENTS.some((x) => x.id === G.S.event)) { fail(`${e.id}[${i}]: 続きの出来事 ${G.S.event} が無い`); break; }
          G.chooseEvent(G.pick(G.eventChoices()).i);
        }
      } catch (err) {
        fail(`${e.id}[${i}] 種 ${seed}: ${err.message}`);
      }
    }
  });
  ok(`V2 の出来事（本編 ${main.length} 件・続き ${evs.length - main.length} 件・場所 ${places.size}・${runs} 回）`);
};
