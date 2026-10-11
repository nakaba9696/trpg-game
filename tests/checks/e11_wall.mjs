// E11：絶界は特定の使徒の固有の守り（src/data/zz_e11_wall.js・src/engine/zz_e3y_e11_wall.js）
// - 絶界を持つのはちょうど一体（持ち主の決定「絶界は使徒1名だけの能力にして」）。ほかの使徒には、はじめから刃が届く（剣が無くても弾かれない）。挑んだときに固有の守りの一行が出る
// - 絶界を持つ使徒は、伝説の刃かその使徒の伝承の条件（zekkai）が無いと刃が弾かれる
// - 長編の若君（カルマトス）の決戦の守りは「糸」と書く（絶界と書かない）
// - 文から「使徒はみな絶界」「二振りの剣でしか斬れない」を消した
// - 伝説の武具（id volgrim・byakuya）は、しゃべらない・剣でも刀でもない形（鉤槍ヴォルグリム・明けの鎖）。古いセーブの id のまま新しい姿で読める
import { readFileSync, readdirSync } from "node:fs";

const PROFILE = { name: "テスト", sex: "女", age: 30, history: "テスト用", personality: "無口" };

export default ({ fail, loadEngine, seeded }) => {
  const G0 = loadEngine();
  const D0 = G0.data;
  const E11 = D0.E11;
  if (!E11 || !G0.hasWall) return fail("絶界の表（D.E11・G.hasWall）が無い");
  if (E11.WALL.length !== 1) fail(`絶界を持つ使徒が ${E11.WALL.length} 体（持ち主の決定「絶界は使徒1名だけの能力」。ちょうど一体）`);
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
  // 仲間の一撃も G.wallOf で言う：黒鎧なら絶界に弾かれる。絶界を持たない使徒には弾かれない
  if (G0.cbAllyStrike) {
    for (const [id, walled] of [[E11.WALL[0], true], ["levian", false]]) {
      const G = loadEngine();
      start(G, 5);
      G.data.E3.LIST[id].keys.forEach((k) => { k.test = () => false; });
      G.apply({ e3fight: id });
      const f = G.S.combat && G.S.combat.foes[0];
      if (!f) { fail(`${id} に挑んでも戦いにならない（仲間の一撃の確認）`); continue; }
      const n0 = G.S.log.length;
      G.cbAllyStrike({ name: "仲間", dmg: 3 }, f, G.foeData(f));
      const got = G.S.log.slice(n0).filter((l) => l.fx === "wall");
      if (walled && !got.some((l) => l.text.includes(`${G.wallOf(f).name}に弾かれた`))) fail(`仲間の一撃が、絶界を持つ ${id} に弾かれない（G.wallOf の言い方で）`);
      if (!walled && got.length) fail(`仲間の一撃が、絶界を持たない ${id} に弾かれる`);
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
  // 伝説の武具：しゃべらない・剣でも刀でもない
  for (const id of ["volgrim", "byakuya"]) {
    const it = D0.ITEMS[id];
    if (!it) { fail(`伝説の武具 ${id} が無い`); continue; }
    if (/剣|刀/.test(it.name)) fail(`伝説の武具 ${id} の名が剣・刀のまま：${it.name}`);
    if (/しゃべ|口が悪|意思を持つ/.test(it.desc)) fail(`伝説の武具 ${id} の説明がしゃべる武器のまま`);
    const K = G0.k1;
    const kind = K && K.kindOf ? K.kindOf(it, id) : null;
    if (kind && /^(剣|刀)$/.test(kind)) fail(`伝説の武具 ${id} の型が ${kind}`);
  }
  const SPEAK = /しゃべる剣|白く光る刀|魔剣ヴォルグリム|聖刀白夜|白夜を抜|ヴォルグリム「|剣がしゃべ/;
  const root = new URL("../../src/", import.meta.url);
  for (const dir of ["data", "engine", "ui"]) {
    for (const f of readdirSync(new URL(dir + "/", root))) {
      if (!f.endsWith(".js") || f === "changelog.js") continue;
      const src = readFileSync(new URL(`${dir}/${f}`, root), "utf8");
      const m = src.split("\n").filter((l) => !/古いセーブ/.test(l)).join("\n").match(SPEAK);
      if (m) fail(`src/${dir}/${f} に、しゃべる剣・白い刀の書き方が残っている：${m[0]}`);
    }
  }
  // 古いセーブ：id はそのまま、新しい姿で読める
  {
    const G = loadEngine();
    start(G, 4);
    G.S.inv.byakuya = 1; G.S.weapon = "byakuya";
    const S2 = JSON.parse(JSON.stringify(G.S));
    G.S = S2;
    if (!G.weapon() || G.weapon().name !== D0.ITEMS.byakuya.name) fail("古いセーブの byakuya が新しい姿で読めない");
  }
};
