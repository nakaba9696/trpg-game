// D10：「自由都市連合」を無くした。商都ブランデール・港町ヴァレンツァはレオネスト王国のふつうの町
// - 画面に出る文（src の、コメントでない行・読み込んだデータ）に「自由都市」が残っていない（古いセーブを移す src/engine/zd10_merge_free.js だけ例外）
// - 場所の id はそのまま。ブランデールのあたりの地方は「レオネスト王国」、国は王国
// - 古いセーブ：評判・悪名・手配・依頼の国・世の大事の値上がりに残る「自由都市連合」が王国として動く
// - 旅の出来事の地方 "free" は "leo" として当たる。戦の「どちらにも売る町」は王国が戦をしていないときだけ
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OLD = "自由都市連合", LEO = "レオネスト王国";

export default ({ fail, ok, loadEngine, seeded }) => {
  let bad = 0;
  const F = (m) => { bad++; fail("D10：" + m); };

  // ---- 文に残っていない
  for (const dir of ["src/data", "src/engine", "src/ui"]) {
    for (const f of readdirSync(ROOT + dir)) {
      if (!/\.(js|css|html)$/.test(f) || f === "zd10_merge_free.js") continue;
      readFileSync(`${ROOT}${dir}/${f}`, "utf8").split("\n").forEach((line, i) => {
        if (/^\s*\/\//.test(line)) return;
        if (line.includes("自由都市")) F(`${dir}/${f}:${i + 1} に「自由都市」が残っている`);
      });
    }
  }
  for (const f of ["src/index.html", "src/style.css"]) if (readFileSync(ROOT + f, "utf8").includes("自由都市")) F(`${f} に「自由都市」が残っている`);

  const G = loadEngine();
  const D = G.data;
  const seen = new WeakSet();
  const walk = (x, path) => {
    if (typeof x === "string") { if (x.includes("自由都市")) F(`${path} に「自由都市」：${x.slice(0, 40)}`); return; }
    if (!x || typeof x !== "object" || seen.has(x)) return;
    seen.add(x);
    for (const [k, v] of Object.entries(x)) { if (String(k).includes("自由都市")) F(`${path} の鍵「${k}」`); walk(v, `${path}.${k}`); }
  };
  walk(D, "D");

  // ---- 場所と国
  for (const id of ["karna", "nerva", "forest", "ruins", "w3_bells", "w7_russen", "w7_glatz", "w7_durm", "w7_vinale"]) {
    const L = D.LOCS[id];
    if (!L) { F(`場所の id ${id} が無い`); continue; }
    if (L.region !== LEO) F(`${id} の地方が「${L.region}」`);
  }
  if (D.LOCS.karna && D.LOCS.karna.name !== "商都ブランデール") F(`karna の名前が「${D.LOCS.karna.name}」`);
  if (D.LOCS.nerva && D.LOCS.nerva.name !== "港町ヴァレンツァ") F(`nerva の名前が「${D.LOCS.nerva.name}」`);
  if (G.nationOf("karna") !== LEO) F(`ブランデールの国が ${G.nationOf("karna")}`);
  if (G.w6 && G.w6.REGIONS.includes("free")) F("旅の地方に free が残っている");
  if (G.w6 && G.w6.regionOf("karna") !== "leo") F(`ブランデールの旅の地方が ${G.w6.regionOf("karna")}`);
  if (G.m4Nation && G.m4Nation("karna") !== "kingdom") F(`ブランデールの戦の国が ${G.m4Nation("karna")}`);

  // ---- 古いセーブ
  const start = () => {
    G.rand = seeded(10);
    G.P = { trophies: {}, graves: [] };
    const stats = Object.fromEntries(D.STATS.map((k) => [k, 60]));
    const caps = Object.fromEntries(D.STATS.map((k) => [k, 80]));
    return G.newGame({ cls: "merc", stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  };
  {
    const S = start();
    S.loc = "karna";
    S.repute = { [OLD]: { rep: 12, inf: 45, wanted: true }, [LEO]: { rep: 5, inf: 3, wanted: false } };
    S.titleAt = OLD;
    S.quests = (S.quests || []).concat([{ id: "d10q", nation: OLD, q5: {} }]);
    S.world = S.world || {};
    S.world.fx = (S.world.fx || []).concat([{ type: "price", nations: [OLD, LEO], ids: [], rate: 0.2, until: S.day + 10 }]);
    G.fixOldNames(S);
    G.fixOldNames(S); // 二度呼んでも同じ
    const r = S.repute[LEO];
    if (S.repute[OLD]) F("古いセーブの自由都市連合の評判が残っている");
    if (!r || r.rep !== 17 || r.inf !== 48 || !r.wanted) F(`評判・悪名・手配が王国へまとまらない（${JSON.stringify(r)}）`);
    if (!G.wanted()) F("古いセーブの手配が、ブランデールで効かない");
    if (S.titleAt !== LEO) F(`位の国が移らない（${S.titleAt}）`);
    if (S.quests.find((q) => q.id === "d10q").nation !== LEO) F("依頼を受けた国が移らない");
    const fx = S.world.fx[S.world.fx.length - 1];
    if (fx.nations.join() !== LEO) F(`世の大事の値上がりの国が移らない（${fx.nations.join("・")}）`);
    G.addInfamy(1);
    if (S.repute[OLD]) F("ブランデールでの悪名が自由都市連合に付いた");
    // 手配の線より 10 下がると解ける（王国の評判で数える）
    r.inf = 0; G.updateWanted(LEO);
    if (G.wanted()) F("悪名が消えても手配が解けない");
  }

  // ---- 旅の出来事：前の地方 free は leo として当たる
  if (G.w6) {
    const S = start();
    const ev = { id: "d10_test", w6: { w: 1, reg: ["free"] } };
    const c = { sea: false, days: 1, danger: 0, tod: "昼", reg: ["leo", "leo"] };
    if (!G.w6.fits(ev, S, c)) F("旅の出来事の reg: [\"free\"] が王国の道で当たらない");
    if (G.w6.fits(ev, S, { ...c, reg: ["nord", "nord"] })) F("旅の出来事の reg: [\"free\"] が帝国の道で当たる");
    const leoEv = D.EVENTS.filter((e) => e.w6 && e.w6.reg && [].concat(e.w6.reg).includes("free"));
    if (leoEv.length) F(`旅の出来事の地方に free が残っている：${leoEv.map((e) => e.id).join("・")}`);
  }

  // ---- 戦：王国が戦に加わっていないときだけ、ブランデールは「どちらにも売る町」
  if (G.m4WarAt) {
    const S = start();
    S.world = S.world || { towns: {} };
    S.world.war = { foe: "republic" };
    if (G.m4WarAt("karna", S) !== "free") F("共和国との戦のときに、ブランデールがどちらにも売る町にならない");
    if (G.m4WarAt("leavel", S) !== "") F("共和国との戦のときに、王都が戦に巻き込まれている");
    S.world.war = { foe: "kingdom" };
    if (G.m4WarAt("karna", S) !== "home") F("王国との戦のときに、ブランデールが戦をしている国の町にならない");
    S.world.war = null;
  }

  // ---- 依頼の傾向：南の商いの町は前の傾向のまま
  const Q = D.Q5;
  if (Q && Q.NATION_BIAS) {
    if (Q.NATION_BIAS[OLD]) F("依頼の傾向に自由都市連合が残っている");
    if (!Q.MARKET_BIAS || !Q.MARKET_BIAS.deliver) F("依頼の傾向に南の商いの町（D.Q5.MARKET_BIAS）が無い");
  }

  if (!bad) ok("D10 自由都市連合を無くした（文に残らない・ブランデールは王国・古いセーブの評判と依頼と値上がりを王国へ・旅と戦と依頼の扱い）");
};
