// E11：絶界は特定の使徒の固有の守り（src/data/zz_e11_wall.js・src/engine/zz_e3y_e11_wall.js）
// - 絶界を持つのは一体か二体だけ。ほかの使徒には、はじめから刃が届く（剣が無くても弾かれない）。挑んだときに固有の守りの一行が出る
// - 絶界を持つ使徒は、伝説の刃かその使徒の伝承の条件（zekkai）が無いと刃が弾かれる
// - 長編の若君（カルマトス）の決戦の守りは「糸」と書く（絶界と書かない）
// - 文から「使徒はみな絶界」「二振りの剣でしか斬れない」を消した
import { readFileSync } from "node:fs";

const PROFILE = { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" };

export default ({ fail, loadEngine, seeded }) => {
  const G0 = loadEngine();
  const D0 = G0.data;
  const E11 = D0.E11;
  if (!E11 || !G0.hasWall) return fail("絶界の表（D.E11・G.hasWall）が無い");
  if (!(E11.WALL.length >= 1 && E11.WALL.length <= 2)) fail(`絶界を持つ使徒が ${E11.WALL.length} 体（一体か二体）`);
  for (const id of E11.WALL) if (!D0.E3.LIST[id] || !D0.E3.LIST[id].keys.some((k) => k.zekkai)) fail(`絶界を持つ ${id} に、伝承の破り方（zekkai の条件）が無い`);
  for (const a of Object.values(D0.E3.LIST).filter((x) => !x.noslay && !G0.hasWall(x.id))) if (!E11.GUARD[a.id]) fail(`絶界を持たない使徒 ${a.id} に固有の守りの一行が無い`);

  const start = (G, seed) => {
    G.rand = seeded(seed);
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    G.data.STATS.forEach((k) => { stats[k] = 60; caps[k] = 99; });
    G.newGame({ cls: "merc", stats, caps, goal: "majin", profile: { ...PROFILE } });
    G.S.weapon = "mithril";
    G.S.mode = "event";
  };
  const walls = (G) => G.S.log.filter((l) => l.fx === "wall").length;
  // 絶界を持たない使徒：剣が無くても弾かれない・固有の守りの一行
  {
    const G = loadEngine();
    start(G, 1);
    G.data.E3.LIST.levian.keys.forEach((k) => { k.test = () => false; });
    G.apply({ e3fight: "levian" });
    if (!G.S.combat) fail("忘れ水に挑んでも戦いにならない");
    if (!G.S.log.some((l) => l.text === E11.GUARD.levian)) fail("挑んだとき、固有の守りの一行が出ない");
    if (G.S.log.some((l) => /絶界/.test(l.text || ""))) fail("絶界を持たない使徒との戦いで、絶界と出る");
    for (let i = 0; i < 6 && G.S.combat; i++) { G.S.hp = 9999; G.combatAct("attack"); }
    if (walls(G)) fail("絶界を持たない使徒に、剣が無いのに刃が弾かれる");
  }
  // 絶界を持つ使徒：剣も条件も無ければ弾かれる。条件（宿敵の抜け羽）があれば届く
  for (const id of E11.WALL) {
    const a = D0.E3.LIST[id];
    {
      const G = loadEngine();
      start(G, 2);
      G.data.E3.LIST[id].keys.forEach((k) => { k.test = () => false; });
      G.apply({ e3fight: id });
      for (let i = 0; i < 10 && G.S.combat; i++) { G.S.hp = 9999; G.combatAct("attack"); }
      if (!walls(G)) fail(`絶界を持つ ${id} に、剣も条件も無いのに刃が届く`);
    }
    {
      const G = loadEngine();
      start(G, 3);
      G.data.E3.LIST[id].keys.forEach((k) => { k.test = () => !!k.zekkai; });
      G.apply({ e3fight: id });
      for (let i = 0; i < 6 && G.S.combat; i++) { G.S.hp = 9999; G.combatAct("attack"); }
      if (walls(G)) fail(`絶界を持つ ${a.id} に、伝承の条件をそろえても刃が弾かれる`);
    }
  }
  // 若君の糸
  if (G0.wallOf({ id: "e3_mirza" }).name === "絶界") fail("長編の若君の守りが絶界のまま");
  // 文
  const vision = readFileSync(new URL("../../docs/VISION.md", import.meta.url), "utf8");
  if (/絶界に守られ、二振りの剣でしか斬れない/.test(vision)) fail("VISION に「使徒はみな絶界に守られ、二振りの剣でしか斬れない」が残っている");
  const BAD = /(使徒は(みな|全員)絶界|二振り(の剣)?だけが斬れる|二振りの剣でしか|使徒の絶界を斬)/;
  const texts = [];
  Object.values(D0.LORE).forEach((e) => e.lines.forEach((l) => texts.push(l[1])));
  (D0.LORE_GM || []).forEach((t) => texts.push(t));
  Object.values(D0.ITEMS).forEach((it) => texts.push(it.desc));
  (D0.RUMORS || []).forEach((r) => texts.push(typeof r === "string" ? r : r && r.text));
  for (const t of texts) if (typeof t === "string" && BAD.test(t)) fail(`「使徒はみな絶界」の書き方が残っている：${t.slice(0, 40)}…`);
};
