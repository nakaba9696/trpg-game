// U26：持ち主のレビューからの右の行動列の直し（src/ui/zzzzzz_u26_review.js・.css）。DOM なしで確かめられる範囲
// - 同じ名前の組は一つに・中身の無い組は出さない・報告は組の先頭（G.u26.tidy）。選択肢は増えも減りもしない
// - 同じ名前の札（「教わる（○○）」が二つ → 札はどちらも「教わる」）は一つの札に（G.u26.mergeTabs）
// - 着いたときに開く組（G.u26.preferred）：報告のある組 → 町の「施設」（スマホは「街で」）→ 最初の組
// - 場所の印（G.u26.placeSig）：町・施設・迷宮の階で変わる。同じ場所の描き直しでは変わらない
// - テスト（DOM なし）では G.actions を変えない。所持金の行は CSS で出さない（上の札の一か所に）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U26：" + m); };
  const src = (f) => readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;
  const before = G.actions;
  vm.runInContext(src("zzzzzz_u26_review.js"), vm.createContext({ console, G, globalThis: { G } }), { filename: "ui/zzzzzz_u26_review.js" });
  const U = G.u26;
  for (const k of ["tidy", "mergeTabs", "preferred", "placeSig", "isReport"]) if (!U || typeof U[k] !== "function") return fail(`G.u26.${k} が無い`);
  // DOM なしでは G.actions はそのまま（包んでも中身を変えない）
  G.rand = seeded(2600); G.P = { trophies: {}, graves: [] };
  const stats = {}; D.STATS.forEach((k) => { stats[k] = 60; });
  G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
  if (JSON.stringify(G.actions()) !== JSON.stringify(before())) fail("DOM なしで G.actions の中身が変わる");

  const a = (id, label) => ({ id, label: label || id });
  const gs = [
    { title: "酒場", list: [a("t:1"), a("t:2")] },
    { title: "教わる（片目の老傭兵）", list: [a("k:1")] },
    { title: "空", list: [] },
    { title: "教わる（片目の老傭兵）", list: [a("k:2")] },
    { title: "冒険者ギルド", list: [a("guild:board"), a("guild:report:q1", "報告：鼠退治"), a("guild:take")] },
    { title: "", list: [a("leave")] },
  ];
  const t = U.tidy(gs);
  const ids = (x) => x.flatMap((g) => g.list.map((y) => y.id)).sort().join(",");
  if (ids(t) !== ids(gs)) fail("組を整えたら選択肢が増えた・減った");
  if (t.some((g) => !g.list.length)) fail("中身の無い組が残る");
  if (t.filter((g) => g.title === "教わる（片目の老傭兵）").length !== 1) fail("同じ名前の組が二つ残る");
  const guild = t.find((g) => g.title === "冒険者ギルド");
  if (!guild || guild.list[0].id !== "guild:report:q1") fail("報告が組の先頭に来ない");
  if (gs[4].list[0].id !== "guild:board") fail("元の組（エンジンの値）を書き換えている");

  const plan = { tabs: [{ key: "g:酒場", label: "酒場", groups: [0], ids: ["t:1"] }, { key: "g:教わる", label: "教わる", groups: [1], ids: ["k:1"] }, { key: "g:教わる", label: "教わる", groups: [3], ids: ["k:2"] }], top: [], bottom: [] };
  const m = U.mergeTabs(plan);
  if (m.tabs.length !== 2 || JSON.stringify(m.tabs[1].groups) !== "[1,3]" || m.tabs[1].ids.length !== 2) fail(`同じ名前の札が一つにならない：${JSON.stringify(m.tabs)}`);
  if (plan.tabs.length !== 3) fail("元の plan を書き換えている");
  if (U.mergeTabs({ kind: "combat", tabs: plan.tabs }).tabs.length !== 3) fail("戦闘の札までまとめている");

  const town = { tabs: [{ key: "t:spot", ids: ["walk"] }, { key: "t:fac", ids: ["fac:inn"] }, { key: "t:quest", ids: ["q5go:1"] }] };
  if (U.preferred(town, [{ list: [a("walk"), a("fac:inn")] }]) !== "t:fac") fail("町で「施設」を開かない");
  if (U.preferred({ tabs: [{ key: "here", ids: ["fac:inn"] }, { key: "adv", ids: [] }] }, []) !== "here") fail("スマホの町で「街で」を開かない");
  const g2 = { tabs: [{ key: "g:a", ids: ["x"] }, { key: "g:b", ids: ["guild:report:q1"] }] };
  if (U.preferred(g2, [{ list: [a("x"), a("guild:report:q1", "報告：鼠退治")] }]) !== "g:b") fail("報告のある組を開かない");
  if (U.preferred({ tabs: [{ key: "g:x", ids: [] }, { key: "g:y", ids: [] }] }, []) !== "g:x") fail("ほかでは最初の組を開かない");

  const S = { loc: "karna", mode: "explore", depth: 0 };
  if (U.placeSig(S) !== U.placeSig({ ...S })) fail("同じ場所なのに場所の印が変わる");
  if (U.placeSig(S) === U.placeSig({ ...S, mode: "fac", fac: "guild" }) || U.placeSig(S) === U.placeSig({ ...S, loc: "nerva" }) || U.placeSig({ ...S, depth: 1 }) === U.placeSig({ ...S, depth: 2 })) fail("場所が変わっても場所の印が同じ");
  const css = src("zzzzzz_u26_review.css");
  if (!/#panel > \.u11purse\s*\{\s*display:\s*none/.test(css)) fail("選択肢の欄の所持金の行を消していない");
  if (!bad) ok("U26：右の行動列（同じ名前の組・札を一つに・空の組を出さない・報告を先頭に・着いたら施設／報告の組を開く）");
};
