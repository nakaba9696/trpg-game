// U24：図鑑の探す・絞る・並べる（src/ui/zu24_codex_read.js・.css）。DOM なしで確かめられる範囲
// - 絞り込み（G.u24.match）：名前（知っている物だけ）・区分・格・分かった弱点・倒した／まだ・！だけ
// - 並べ替え（G.u24.sort）：いつもの順（区分 → 区分の中の順）・名前順・格の高い順・見つけた順（新しい順）。まだ見ぬものは後ろ
// - 区分の見出しから名前だけ（G.u24.groupName）、条件なし（G.u24.plain）
// - 一画面に収めるページ送り（U22）は外した（図鑑はスクロールしてよい：持ち主の方針）。読む順は図鑑に手を足すファイルより後
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok, loadEngine }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U24：" + m); };
  const dir = new URL("../../src/ui/", import.meta.url);
  const G = loadEngine();
  vm.runInContext(readFileSync(new URL("zu24_codex_read.js", dir), "utf8"), vm.createContext({ console, G, globalThis: { G } }), { filename: "ui/zu24_codex_read.js" });
  const U = G.u24;
  for (const k of ["match", "sort", "view", "plain", "groupName"]) if (!U || typeof U[k] !== "function") return fail(`G.u24.${k} が無い`);

  const E = [
    { id: "a", name: "ゴブリン", known: true, group: "王国", gi: 0, i: 0, grade: "D", kills: 3, at: 30, weak: ["blunt"], fresh: false },
    { id: "b", name: "樽ゴブリン", known: true, group: "王国", gi: 0, i: 1, grade: "C", kills: 0, at: 50, weak: [], fresh: true },
    { id: "c", name: "", known: false, group: "王国", gi: 0, i: 2, grade: "B", kills: 0, at: 0, weak: [], fresh: false },
    { id: "d", name: "アンジェリカ", known: true, group: "帝国", gi: 1, i: 0, grade: "A", kills: 1, at: 10, weak: ["fire", "blunt"], fresh: false },
    { id: "e", name: "影", known: true, group: "帝国", gi: 1, i: 1, grade: "S", kills: 0, at: 40, weak: [], fresh: true },
  ];
  const ids = (o) => U.view(E, o).map((e) => e.id).join("");
  const want = [
    [{}, "abcde", "条件なしのいつもの順"],
    [{ q: "ゴブリン" }, "ab", "名前で探す"],
    [{ q: "ごぶりん" }, "", "ひらがなでは当たらない（そのまま）"],
    [{ q: "" , group: "帝国" }, "de", "区分で絞る"],
    [{ grade: "C" }, "b", "格で絞る"],
    [{ weak: "blunt" }, "ad", "分かった弱点で絞る"],
    [{ killed: "yes" }, "ad", "倒した"],
    [{ killed: "no" }, "be", "出会ったが、まだ倒していない（まだ見ぬものは入れない）"],
    [{ fresh: true }, "be", "！だけ"],
    [{ sort: "name" }, "daebc", "名前順（かなは漢字より先・まだ見ぬものは後ろ）"],
    [{ sort: "grade" }, "edbac", "格の高い順（まだ見ぬものは後ろ）"],
    [{ sort: "at" }, "beadc", "見つけた順（新しい順）"],
    [{ group: "王国", sort: "at" }, "bac", "絞ってから並べる"],
  ];
  want.forEach(([o, w, what]) => { const got = ids(o); if (got !== w) fail(`${what}：${got}（${w} のはず）`); });
  if (!U.plain({}) || !U.plain({ q: "  " }) || U.plain({ sort: "name" }) || U.plain({ fresh: true })) fail("条件なしの見分けが違う");
  if (U.groupName("レオネスト王国　29／52！") !== "レオネスト王国" || U.groupName("材質（金属） 0/9") !== "材質（金属）" || U.groupName("近ごろの依頼") !== "近ごろの依頼") fail("区分の見出しから名前だけを取れない");
  // 読む順と、U22 の一画面の縛りを外したこと
  const js = readdirSync(dir).filter((n) => n.endsWith(".js")).sort();
  for (const f of ["f2_codex.js", "q5_quests.js", "zi3_gear.js", "zk_know_l1.js", "f4_roster.js"]) if (js.indexOf(f) > js.indexOf("zu24_codex_read.js")) fail(`${f} が zu24_codex_read.js より後に読まれる`);
  if (js.includes("zu22_codex_pc.js")) fail("一画面に収めるページ送り（U22）が残っている");
  if (!bad) ok("U24：図鑑の探す・絞る・並べる（名前・区分・格・弱点・倒した・！だけ、名前順・格順・見つけた順。まだ見ぬものは後ろ）");
};
