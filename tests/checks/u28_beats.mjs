// U28：行動 → 記録 → 結果 → 得たもの → 選択肢 の順（src/ui/zzzzzz_u28_beats.js・.css）。DOM なしで確かめられる範囲
// - 出す順と間（G.u28.plan）：選んだ一行はすぐ・ほかは一行ずつ（長い行のあとは長めに、上限あり）・得たものの枠は短い間で最後
//   場面（背景・場所の名前・BGM）を切り替えるのは、最初の見出しの行（着いた）。見出しが無ければ得たものの枠、それも無ければ最後
// - 今の状態の名前（G.u28.stateOf）と、いる所（G.u28.placeOf）
// - エンジンは変えない：DOM なしでは G.act・G.actions・記録は今までどおり（このファイルを読んでも何も包まない）
// - 見た目：まだ出していない行は隠す・出している間は選択肢を押せない・場面を待つ間は町の見出しを出さない
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok, loadEngine }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U28：" + m); };
  const src = (f) => readFileSync(new URL("../../src/ui/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const act0 = G.act, actions0 = G.actions;
  vm.runInContext(src("zzzzzz_u28_beats.js"), vm.createContext({ console, G, globalThis: { G } }), { filename: "ui/zzzzzz_u28_beats.js" });
  const U = G.u28;
  for (const k of ["plan", "stateOf", "placeOf"]) if (!U || typeof U[k] !== "function") return fail(`G.u28.${k} が無い`);
  if (G.act !== act0 || G.actions !== actions0) fail("DOM なしで G.act・G.actions を包んでいる");

  const p = U.plan([{ kind: "you", len: 10 }, { kind: "line", len: 40 }, { kind: "line", len: 400 }, { kind: "title", len: 8 }, { kind: "line", len: 20 }, { kind: "gain", len: 12 }]);
  if (p.steps.length !== 6 || p.steps[0].at !== 0) fail("選んだ一行がすぐに出ない");
  if (p.steps[1].at !== U.BASE) fail("選んだ一行の次の行の間が決まった間でない");
  if (!(p.steps[2].at > U.BASE) || p.steps[3].at !== U.MAX) fail(`長い行のあとの間が長くならない・上限で止まらない（${p.steps[2].at}・${p.steps[3].at}）`);
  if (p.steps[5].at !== U.GAIN) fail("得たものの枠の前の間が違う");
  if (p.arrive !== 3) fail(`場面を切り替える行が見出しでない（${p.arrive}）`);
  if (U.plan([{ kind: "you" }, { kind: "line", len: 5 }, { kind: "gain" }]).arrive !== 2) fail("見出しが無いとき、得たものの枠で場面を切り替えない");
  if (U.plan([{ kind: "you" }, { kind: "line", len: 5 }]).arrive !== 2) fail("見出しも枠も無いとき、最後に場面を切り替えない");
  if (p.steps.some((x) => x.at < 0 || x.at > U.MAX)) fail("間が負か、上限を超える");
  const many = U.plan([{ kind: "you" }, ...Array.from({ length: 20 }, () => ({ kind: "line", len: 120 })), { kind: "gain" }]);
  const total = many.steps.reduce((a, x) => a + x.at, 0);
  if (total > U.TOTAL + U.MIN * 2 || many.steps.slice(1).some((x) => x.at < U.MIN)) fail(`行が多いとき、全体が上限に収まらない（${total}ms）か、間が短すぎる`);

  const D = G.data;
  const town = Object.keys(D.LOCS).find((k) => D.LOCS[k].type === "town");
  const dun = Object.keys(D.LOCS).find((k) => D.LOCS[k].type === "dungeon");
  const want = [[{ loc: town, mode: "explore" }, "町"], [{ loc: dun, mode: "explore", depth: 2 }, "迷宮・地下2階"], [{ loc: town, mode: "event" }, "出来事"], [{ loc: town, mode: "explore", travel: town }, "旅の途中"], [{ loc: town, mode: "explore", combat: {} }, "戦闘"], [{ loc: town, mode: "explore", tk: { cur: 1 } }, "会話"]];
  want.forEach(([S, w]) => { if (U.stateOf(S) !== w) fail(`状態の名前が「${U.stateOf(S)}」（${w} のはず）`); });
  if (U.placeOf({ loc: town, mode: "explore" }) !== D.LOCS[town].name) fail("いる所の名前が違う");
  if (!U.placeOf({ loc: town, mode: "explore", travel: town }).endsWith("へ")) fail("旅の途中に行き先が出ない");

  const css = src("zzzzzz_u28_beats.css");
  if (!/\.u28wait\s*\{\s*display:\s*none/.test(css)) fail("まだ出していない行を隠していない");
  if (!/body\.u28busy #panel\s*\{[^}]*pointer-events:\s*none/.test(css)) fail("出している間に選択肢を押せてしまう");
  if (!/body\.u28hold #u14card/.test(css)) fail("場面を待つ間に町の見出しが出る");
  if (!bad) ok("U28：行動 → 記録 → 結果 → 得たもの → 選択肢（出す順と間・着いた見出しで場面を切り替える・状態の名前。エンジンは変えない）");
};
