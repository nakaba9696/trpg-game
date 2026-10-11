// E7：職業「島の剣士」を「武士」に（持ち主「刀であれば武士とかにして」）。id は samurai のまま（古いセーブが壊れない）
// - 主人公の職業名が「武士」で、説明（blurb）も武士の言葉になっている
// - src に「島の剣士」が残っていない（島の人々一般は「島の武士」。仲間の職業名として古い名が来ても人物の型は引ける）
// - 古いセーブ（cls: "samurai"）で遊び始められる
import { readFileSync, readdirSync } from "node:fs";

const ROOT = new URL("../../src/", import.meta.url);
const PROFILE = { name: "テスト", sex: "男", age: 30, history: "テスト用", personality: "無口" };

export default ({ fail, ok, loadEngine, seeded }) => {
  let failures = 0;
  const bad = (m) => { failures++; fail(m); };
  const G = loadEngine();
  const C = G.data.CLASSES.samurai;
  if (!C) return bad("武士: D.CLASSES.samurai が無い");
  if (C.name !== "武士") bad(`武士: 職業名が「${C.name}」`);
  if (!/武士/.test(C.blurb) || /剣士/.test(C.blurb)) bad(`武士: 説明が武士の言葉になっていない（${C.blurb}）`);
  if (!/シェルアーク/.test(C.blurb) || !/刀/.test(C.blurb) || !/常識/.test(C.blurb)) bad("武士: 説明から島の生まれ・刀・本土の常識に疎い、が抜けた");
  for (const dir of ["data", "engine", "ui"]) {
    for (const f of readdirSync(new URL(dir + "/", ROOT))) {
      if (!/\.(js|css)$/.test(f) || f === "changelog.js" || f === "art_people.js") continue; // 更新履歴は前の名を説明してよい。art_people は古い名も型に引く表
      readFileSync(new URL(`${dir}/${f}`, ROOT), "utf8").split("\n").forEach((line, i) => {
        if (line.includes("島の剣士")) bad(`武士: ${dir}/${f}:${i + 1} に「島の剣士」が残っている`);
      });
    }
  }
  // 古いセーブの形でも遊び始められる（職業の id は samurai のまま）
  try {
    G.rand = seeded("e7");
    G.P = { trophies: {}, graves: [] };
    const stats = {}, caps = {};
    G.data.STATS.forEach((k) => { stats[k] = 50; caps[k] = 99; });
    const S = G.newGame({ cls: "samurai", stats, caps, goal: "majin", profile: { ...PROFILE } }) || G.S;
    if (S.cls !== "samurai") bad(`武士: 新しい冒険の職業 id が ${S.cls}`);
    if ((G.data.CLASSES[S.cls] || {}).name !== "武士") bad("武士: 冒険中の職業名が武士でない");
  } catch (e) { bad(`武士: samurai で冒険を始められない（${e.message}）`); }
  if (failures === 0) ok("職業「武士」（id は samurai のまま。島の剣士の名は残っていない）");
};
