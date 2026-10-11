// R11：文章の直し（前の時間の感覚の言い回し・言伝・薬草の選択肢・煙玉・同じ文の繰り返し）
import fs from "node:fs";
import path from "node:path";
export default ({ G: _G, fail, ok, loadEngine, seeded }) => {
  let n = 0;
  const F = (m) => { n++; fail("R11: " + m); };
  const G = loadEngine();
  const D = G.data;

  // 中 4：データの文に、日数を言い切る前の時間の言い回しが残っていない
  const dir = path.resolve("src/data");
  const BAD = [/一日もかからない/, /(門|町|街)を出て、?半日/, /町の外の野に(、使徒の通った)?跡/, /(丘陵|丘|森)[^。]{0,12}毎週/];
  fs.readdirSync(dir).filter((f) => f.endsWith(".js")).forEach((f) => {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    BAD.forEach((re) => { const m = re.exec(t); if (m) F(`${f} に前の時間の言い回し「${m[0]}」`); });
  });

  // 中 12：苔むした石段・祠の出来事に薬草知識の選択肢が付かない
  const herb = D.K1_CATS.herb;
  if (!herb.not.test("苔に覆われた石段が、地面へ下っている。")) F("石段の出来事が薬草の種類に入っている");
  if (!herb.re.test("道ばたの草むらに薬草が見える。") || herb.not.test("道ばたの草むらに薬草が見える。")) F("草むらの出来事が薬草の種類から外れた");

  // 低 17：煙玉の説明が一覧の字数（16 字）に収まる
  if (D.ITEMS.smoke.desc.length > 16) F("煙玉の説明が一覧で切れる: " + D.ITEMS.smoke.desc);

  // 低 18：語りの一行を続けて同じ文にしない
  {
    G.rand = seeded(5);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 50]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "文", sex: "女", age: 20, history: "テスト用", personality: "無口" } });
    let prev = null;
    for (let i = 0; i < 40; i++) {
      G.S.turn = (G.S.turn || 0) + (i % 3 === 0 ? 5 : 0); // 手番が進まなくても、進んでも
      const t = G.voiceLine("win", null, "");
      if (t && t === prev) F("戦いのあとの一行が続けて同じ: " + t);
      prev = t;
    }
  }

  // 低 22：石積みの目印は一度きり
  const cache = D.EVENTS.find((e) => e.id === "w8x_cache");
  if (!cache || !cache.once) F("石積みの目印に once が無い");

  // 低 23：膨れる敵の気配の文が一種類ではない
  if ((D.F1_TELLS.heavy.blob || []).length < 3) F("blob の大技の気配が少ない");

  // 低 28：白金の手がかりがすべてある
  D.TROPHIES.filter((t) => t.tier === "白金").forEach((t) => { if (!D.R7_TROPHY_HINTS[t.key]) F(`白金「${t.name}」に手がかりが無い`); });

  if (!n) ok("R11 文章の直し");
};
