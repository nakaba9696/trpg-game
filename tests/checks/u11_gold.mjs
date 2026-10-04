// U11：所持金をひと目で（src/ui/u11_gold.js。DOM が無くても決まりの所は読める）
// - 桁区切り（1,234 G）
// - 増えた・減ったときの表示（+120 G・−50 G）。変わらないときは出さない
// - 店・宿・訓練場・ギルドなど金を払う画面では、行動の上に所持金を出す。戦闘中や値段の無い場面では出さない
// - 払えない物の数
// - 帯の札が HP・MP の横（#mGold）にあり、動きは prefers-reduced-motion で止まる
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

export default ({ G, fail, ok, seeded }) => {
  const D = G.data;
  let bad = 0;
  const no = (m) => { bad++; fail(m); };
  vm.runInContext(read("../../src/ui/u11_gold.js"), vm.createContext({ globalThis: { G } }));
  const u = G.u11;
  if (!u) { fail("G.u11 が無い"); return; }

  // 桁区切り
  [[0, "0"], [7, "7"], [999, "999"], [1000, "1,000"], [1234, "1,234"], [1234567, "1,234,567"], [12.9, "12"], [undefined, "0"], [-50, "−50"]]
    .forEach(([n, want]) => { if (u.fmt(n) !== want) no(`fmt(${n}) が ${u.fmt(n)}（${want} のはず）`); });
  if (u.gold(3000) !== "3,000 G") no(`gold(3000) が ${u.gold(3000)}`);

  // 増減
  const up = u.delta(100, 220), down = u.delta(220, 170);
  if (!up || up.text !== "+120 G" || !up.up) no(`増えたときの表示が違う：${up && up.text}`);
  if (!down || down.text !== "−50 G" || down.up) no(`減ったときの表示が違う：${down && down.text}`);
  if (u.delta(5, 5) !== null) no("変わらないのに増減が出る");
  if (u.delta(null, 5) !== null) no("前が分からないのに増減が出る");
  if (u.delta(0, 1500).text !== "+1,500 G") no("増減の数字が桁区切りでない");

  // 金を払う画面
  G.P = { trophies: {}, graves: [] };
  G.rand = seeded(1100);
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats: Object.fromEntries(D.STATS.map((k) => [k, 60])), caps: Object.fromEntries(D.STATS.map((k) => [k, 80])), goal: Object.keys(D.GOALS)[0], profile: { name: "テスト", sex: "男", age: 20, history: "テスト用", personality: "無口" } });
  const S = G.S;
  const town = Object.keys(D.LOCS).find((id) => D.LOCS[id].type === "town" && (D.LOCS[id].fac || []).includes("shop"));
  if (!town) { no("店のある町が見つからない"); return; }
  S.loc = town;
  for (const f of ["shop", "inn", "train", "guild"]) {
    if (!(D.LOCS[town].fac || []).includes(f)) continue;
    S.mode = "fac"; S.fac = f;
    if (!u.needsPurse(S, G.actions())) no(`${f} の画面に所持金が出ない`);
  }
  S.mode = "fac"; S.fac = "shop";
  S.gold = 0;
  const shopActs = G.actions();
  const priced = shopActs.flatMap((g) => g.list).filter((a) => String(a.id).startsWith("shop:buy:"));
  const short = u.shortCount(S, shopActs);
  if (!priced.length) no("店に売り物が無い");
  else if (short < priced.filter((a) => a.disabled).length) no(`払えない売り物の数が少ない：${short}／${priced.length}`);
  const want = shopActs.flatMap((g) => g.list).filter((a) => a.disabled && /\d+\s*G(?![a-zA-Z])/.test(`${a.label} ${a.sub || ""}`)).length;
  if (short !== want) no(`払えない物の数が違う：${short}（${want} のはず）`);
  S.gold = 1e7;
  if (u.shortCount(S, G.actions()) !== 0) no("十分な金があるのに払えない物がある");

  // 出さない場面
  if (u.needsPurse({ ...S, combat: { foes: [] } }, shopActs)) no("戦闘中に所持金の札が出る");
  if (u.needsPurse({ mode: "explore" }, [{ list: [{ label: "探索する", sub: "敏捷 50%" }] }])) no("値段の無い場面に所持金の札が出る");
  if (!u.needsPurse({ mode: "explore" }, [{ list: [{ label: "船でシェルアークへ", sub: "5日・40G" }] }])) no("値段のある行動があるのに所持金の札が出ない");
  if (u.needsPurse({ mode: "explore" }, [{ list: [{ label: "地図", sub: "GM に任せる" }] }])) no("「GM」を値段と見なしている");

  // 帯と見た目
  const html = read("../../src/index.html"), css = read("../../src/ui/u11_gold.css");
  if (!/class="mbars[^"]*"[\s\S]*?id="mHp"[\s\S]*?id="mGold"/.test(html)) no("所持金の札（#mGold）が HP・MP の帯に無い");
  if (!/prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none/.test(css)) no("prefers-reduced-motion で増減の動きが止まらない");
  if (!/prefers-color-scheme:\s*dark/.test(css) || !/data-theme="dark"/.test(css)) no("暗い見た目の色が無い");

  if (!bad) ok("所持金：桁区切り・増減・店などの画面の札・帯の札");
};
