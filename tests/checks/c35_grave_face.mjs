// #35：墓碑に主人公の絵（src/engine/zzzzzz_c35_grave_face.js・src/ui/ui.js の墓碑一覧と年表）
// - 新しい墓碑に hero（職業 id と人物設定）が残り、生きていたときと同じ絵の who になる
// - 保存して読み直しても（JSON を通しても）同じ who になる。古い墓碑（hero 無し）は絵なしで落ちない
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail, ok, loadEngine, seeded }) => {
  const G = loadEngine();
  const D = G.data;
  const vmc = vm.createContext({ console, G });
  for (const f of ["art_people.js", "r1_race.js"]) vm.runInContext(readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8"), vmc, { filename: "ui/" + f });
  let bad = 0;
  const f = (m) => { bad++; fail("C35: " + m); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const start = (cls, profile, seed) => {
    G.rand = seeded(seed);
    const stats = {}, caps = {};
    D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 70; });
    G.newGame({ cls, stats, caps, goal: Object.keys(D.GOALS)[0], profile });
    return G.S;
  };

  G.P = { trophies: {}, graves: [{ id: "old", name: "古い人", cls: "傭兵", goal: "昔の目的", end: "dead", cause: "老衰", date: "", turns: 3, stats: {}, chronicle: [], at: 1 }] };
  const cases = [
    ["merc", { name: "墓の人", sex: "女", age: 31, look: "銀髪、鋭い目つき", personality: "無口", history: "長い生い立ち" }],
    [Object.keys(D.CLASSES)[1], { name: "耳の人", sex: "男", age: 40, race: "elf", ageBand: "old", look: "白髪" }],
    [Object.keys(D.CLASSES)[2], { name: "獣の人", sex: "女", age: 19, race: "beast", beast: "fox" }],
  ];
  cases.forEach(([cls, prof], i) => {
    const S = start(cls, prof, 3500 + i);
    const live = G.heroWho(S.profile, S.cls);
    if (i % 2) G.retire(); else G.die("テスト");
    const g = G.P.graves[0];
    if (!g || g.id !== S.id) return f(`${prof.name}の墓碑が書かれない`);
    if (!g.hero || g.hero.cls !== cls) return f(`${prof.name}の墓碑に職業 id が残らない`);
    if ("history" in g.hero.profile) f("墓碑に絵に要らない生い立ちまで残している");
    if (!same(G.graveWho(g), live)) f(`${prof.name}の墓碑の絵が生前と違う：${JSON.stringify(G.graveWho(g))} / ${JSON.stringify(live)}`);
    const back = JSON.parse(JSON.stringify(G.P));
    if (!same(G.graveWho(back.graves[0]), live)) f(`${prof.name}の墓碑の絵が保存し直すと変わる`);
  });
  // 古い墓碑・壊れた墓碑は絵なし
  const old = G.P.graves.find((g) => g.id === "old");
  if (!old) f("古い墓碑が消えた");
  else if (G.graveWho(old) !== null) f("古い墓碑に絵を出している");
  for (const g of [null, {}, { hero: {} }, { hero: { cls: "merc" } }]) {
    try { if (G.graveWho(g) !== null) f(`項目の足りない墓碑に絵を出している：${JSON.stringify(g)}`); } catch (e) { f("項目の足りない墓碑で落ちる：" + e.message); }
  }
  // UI：墓碑一覧と年表が graveWho を使う
  const ui = readFileSync(new URL("../../src/ui/ui.js", import.meta.url), "utf8");
  if (!/G\.graveWho\(g\)/.test(ui) || !/G\.graveWho\(run\)/.test(ui)) f("墓碑一覧・年表で墓碑の絵を描いていない");
  if (!bad) ok("C35: 墓碑に主人公の絵（新しい墓碑に人物設定と職業 id、古い墓碑は絵なし）");
};
