// U22：図鑑の窓を PC の一画面に収める（src/ui/zu22_codex_pc.js・.css）。DOM なしで確かめられる範囲
// - ページの分け方（G.u22.pages）：行の途中で切らない・どの物もちょうど一つのページに入る・入りきらない物も一ページに一つは載る
// - 何ページ目か（G.u22.pageOf）・最初に見せる区分（G.u22.pickGroup：選んだ項目 → 前に見た区分 → 新しい印 → 最初）・区分の名前と数（G.u22.splitHead）
// - 見た目（.css）は PC の幅・高さ（min-width: 761px・min-height: 500px）の中だけに効く（スマホは今の縦に流れる形のまま）
// - 図鑑の中身を描くファイル（f2・q5・zi3・zk）より後に読まれる名前
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok, loadEngine }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U22：" + m); };
  const dir = new URL("../../src/ui/", import.meta.url);
  const src = (f) => readFileSync(new URL(f, dir), "utf8");
  const G = loadEngine();
  vm.runInContext(src("zu22_codex_pc.js"), vm.createContext({ console, G, globalThis: { G } }), { filename: "ui/zu22_codex_pc.js" });
  const U = G.u22;
  for (const k of ["pages", "pageOf", "pickGroup", "splitHead"]) if (!U || typeof U[k] !== "function") return fail(`G.u22.${k} が無い`);

  // ---------------------------------------------------------------- ページの分け方
  // 格子：7 列・高さ 100・間 10 → 1 行の送りは 110
  const grid = (n, cols, hh, gap) => Array.from({ length: n }, (_, i) => ({ top: Math.floor(i / cols) * (hh + gap), h: hh }));
  for (const [n, cols, avail] of [[31, 7, 440], [31, 7, 330], [5, 7, 440], [100, 6, 1000], [1, 4, 50], [52, 5, 215]]) {
    const items = grid(n, cols, 100, 10);
    const st = U.pages(items, avail);
    const at = `${n} 個・${cols} 列・高さ ${avail}`;
    if (st[0] !== 0) fail(`${at}：最初のページが 0 から始まらない`);
    if (st.some((s, k) => k && s <= st[k - 1])) fail(`${at}：ページの頭が順になっていない`);
    if (st.some((s) => s % cols)) fail(`${at}：行の途中でページを切っている（${st.join(",")}）`);
    const rows = Math.max(1, Math.floor((avail + 10) / 110));
    if (st.length !== Math.ceil(n / (rows * cols))) fail(`${at}：ページの数が ${st.length}（入る行 ${rows} なら ${Math.ceil(n / (rows * cols))}）`);
    st.forEach((s, k) => {
      const e = k + 1 < st.length ? st[k + 1] : n;
      const top = items[s].top, bottom = Math.max(...items.slice(s, e).map((x) => x.top + x.h));
      if (bottom - top > avail && e - s > cols) fail(`${at}：${k + 1} ページ目が入りきらない`);
    });
    if (U.pageOf(st, n - 1) !== st.length - 1 || U.pageOf(st, 0) !== 0) fail(`${at}：何ページ目かがずれる`);
  }
  // 高さがまちまちな段（説明）：一つで入りきらない段も一ページに一つ
  const tall = [{ top: 0, h: 40 }, { top: 40, h: 500 }, { top: 540, h: 30 }, { top: 570, h: 30 }];
  if (JSON.stringify(U.pages(tall, 300)) !== "[0,1,2]") fail(`高さがまちまちな段の分け方が違う：${JSON.stringify(U.pages(tall, 300))}`);
  if (JSON.stringify(U.pages([], 300)) !== "[0]") fail("物が無いときも 1 ページにならない");

  // ---------------------------------------------------------------- 最初に見せる区分
  const gs = [{ key: "a" }, { key: "b", fresh: true }, { key: "c" }, { key: "d", picked: true }];
  if (U.pickGroup(gs, "c") !== 3) fail("選んだ項目のある区分を先に見せない");
  if (U.pickGroup(gs.map((g) => ({ ...g, picked: false })), "c") !== 2) fail("前に見た区分に戻らない");
  if (U.pickGroup(gs.map((g) => ({ ...g, picked: false })), "zz") !== 1) fail("新しい印のある区分を見せない");
  if (U.pickGroup([{ key: "a" }, { key: "b" }], null) !== 0) fail("何も無ければ最初の区分にならない");
  if (U.pickGroup([], null) !== -1) fail("区分が無いときの扱いが違う");
  const sp = U.splitHead("レオネスト王国　29／52！");
  if (sp.name !== "レオネスト王国" || sp.count !== "29／52") fail(`区分の名前と数の分け方が違う：${JSON.stringify(sp)}`);
  if (U.splitHead("近ごろの依頼").name !== "近ごろの依頼" || U.splitHead("近ごろの依頼").count) fail("数の無い見出しを名前だけにしない");
  if (U.splitHead("材質（金属） 0/9").count !== "0/9") fail("半角の／の数を拾わない");

  // ---------------------------------------------------------------- 見た目は PC の中だけ
  const css = src("zu22_codex_pc.css").replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0, outside = "";
  for (const c of css) { if (c === "{") depth++; else if (c === "}") depth--; else if (depth === 0) outside += c; }
  const tops = outside.split(/\n/).map((x) => x.trim()).filter(Boolean);
  const loose = tops.filter((x) => !/^@media \(min-width: 761px\) and \(min-height: 500px\)/.test(x));
  if (loose.length) fail(`PC の大きさの外にも効く見た目がある：${loose.join("／")}`);
  // 読む順：図鑑に手を足すファイルより後
  const js = readdirSync(dir).filter((n) => n.endsWith(".js")).sort();
  for (const f of ["f2_codex.js", "q5_quests.js", "zi3_gear.js", "zk_know_l1.js", "f4_roster.js"]) if (js.includes(f) && js.indexOf(f) > js.indexOf("zu22_codex_pc.js")) fail(`${f} が zu22_codex_pc.js より後に読まれる`);

  if (!bad) ok("U22：図鑑を PC の一画面に（ページの分け方は行の途中で切らず、どの物も一度ずつ・最初に見せる区分・見た目は PC の大きさの中だけ）");
};
