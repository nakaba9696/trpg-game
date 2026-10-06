// U19：本文の欄を行動ごとに上から書き直す（src/ui/zzzz_u19_page.js・.css）。DOM なしで確かめられる範囲
// - 頁の頭（G.u19.pageStart）：押したあとに増えた記録だけが本文に並ぶ。押さずに描き直しても頁は変わらない。開き直したら最後の「あなた」の行から
// - 何を選んだか（G.u19.headOf）：エンジンが「あなた」の行を書けばそれ、無ければ押したボタンの名前を一行
// - 戦闘の直前の手番の要約（G.u19.summary）：一行（改行なし）、長すぎない
// - 実際に遊んで：毎手、本文の欄はその手で増えた記録だけ。記録（S.log）には G.log の行が全部残る（ログの窓が読むのはこれ）
// - CSS：前の頁の行は隠すだけ（消さない）。頭の二行は #log の ::before／::after（#log の子を増やさない）
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ fail: failTo, ok, loadEngine, seeded }) => {
  let bad = 0;
  const fail = (m) => { bad++; failTo("U19：" + m); };
  const src = (f) => readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  const G = loadEngine();
  const D = G.data;
  vm.runInContext(src("ui/zzzz_u19_page.js"), vm.createContext({ console, G }), { filename: "ui/zzzz_u19_page.js" });
  const U = G.u19;
  for (const k of ["pageStart", "headOf", "summary", "lineOf"]) if (!U || typeof U[k] !== "function") return fail(`G.u19.${k} が無い`);

  // ---------------------------------------------------------------- 決まり
  const kinds = ["title", "nar", "you", "nar", "nar", "you", "dice", "nar"];
  if (U.pageStart({ n: 8, kinds, fresh: 3, prev: 2, acted: true }) !== 5) fail("押したあとに増えた 3 行から頁が始まらない");
  if (U.pageStart({ n: 8, kinds, fresh: 0, prev: 2, acted: false }) !== 2) fail("押さずに描き直したのに頁が変わる");
  if (U.pageStart({ n: 8, kinds, fresh: 2, prev: 2, acted: false }) !== 2) fail("押さずに増えた行（演出の続き）で頁が改まる");
  if (U.pageStart({ n: 8, kinds, fresh: 0, prev: -1, acted: false }) !== 5) fail("開き直したとき、最後の「あなた」の行から始まらない");
  if (U.pageStart({ n: 3, kinds: ["title", "nar", "nar"], fresh: 0, prev: -1 }) !== 0) fail("「あなた」の行が無いのに全部を出さない");
  if (U.pageStart({ n: 8, kinds, fresh: 20, prev: 2, acted: true }) !== 0) fail("増えた行が並ぶ数より多いとき、頭が 0 にならない");
  if (U.headOf({ k: "you", text: "x" }, "酒場で噂を聞く") !== "") fail("「あなた」の行があるのに、選んだことを二度出す");
  if (U.headOf({ k: "nar", text: "x" }, "  酒場で\n噂を聞く ") !== "▶ 酒場で 噂を聞く") fail(`選んだことの一行が「▶ …」にならない：${U.headOf({ k: "nar" }, "酒場で噂を聞く")}`);
  if (U.headOf({ k: "nar" }, "") !== "") fail("押したボタンが分からないのに頭の一行を出す");
  if (U.headOf({ k: "nar" }, "あ".repeat(60)).length > 33) fail("選んだことの一行が長すぎる");
  const sum = U.summary([{ k: "you", text: "鉄の長剣でオーガに斬りかかる" }, { k: "dice", reason: "攻撃", label: "成功", stat: "筋力", chance: 90, roll: 30 }, { k: "nar", text: "オーガに 14 のダメージ" }, { k: "nar", text: "長い文。".repeat(40) }], "");
  if (!sum.startsWith("▶ 鉄の長剣でオーガに斬りかかる ── 攻撃：成功") || /\n/.test(sum) || sum.length > 130) fail(`直前の手番の要約が一行にならない：${sum}`);
  if (U.summary([], "x") !== "") fail("空の手番に要約を出す");
  if (U.summary([{ k: "nar", text: "a" }], "攻撃") !== "▶ 攻撃 ── a") fail("「あなた」の行が無いとき、押したボタンの名前で要約しない");
  if (!U.lineOf({ k: "dice", reason: "攻撃", stat: "筋力", chance: 90, roll: 30, label: "成功" }).includes("出目30")) fail("ログの窓の判定の行に出目が無い");
  if (U.stack !== false) fail("既定が「積み上げる」になっている");

  // ---------------------------------------------------------------- 実際に遊んで：毎手、本文はその手の記録だけ・記録は全部残る
  const stats = {};
  D.STATS.forEach((k) => { stats[k] = 50; });
  const KEEP = 90; // ui.js の本文に並ぶ行の数
  let turns = 0, youHead = 0, checked = 0;
  for (const seed of [19, 1919]) {
    G.rand = seeded(seed);
    G.newGame({ cls: Object.keys(D.CLASSES)[seed % Object.keys(D.CLASSES).length], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
    const S = G.S;
    let pushed = 0;
    const log0 = G.log;
    G.log = (...a) => { pushed++; return log0(...a); };
    let prevEntry = null;
    for (let i = 0; i < 260 && !S.over; i++) {
      const acts = G.actions().flatMap((g) => g.list).filter((a) => !a.disabled);
      if (!acts.length) break;
      const a = acts[Math.floor(G.rand() * acts.length)];
      const before = S.log.length, last = S.log[S.log.length - 1];
      pushed = 0;
      G.act(a.id);
      // G.log の行は全部 S.log に入る（240 件を超えた分だけ古い方から落ちる）
      const at = last ? S.log.lastIndexOf(last) : -1;
      const grown = at < 0 ? S.log.length : S.log.length - 1 - at;
      if (grown < Math.min(pushed, 240) && !(at < 0 && before >= 240)) { fail(`手 ${i}（${a.id}）：G.log ${pushed} 行のうち ${grown} 行しか記録に入らない`); break; }
      // 画面の頁：本文に並ぶ 90 行のうち、この手で増えた行だけ
      const shown = S.log.slice(-KEEP);
      const fresh = Math.min(shown.length, grown);
      const prev = prevEntry ? shown.indexOf(prevEntry) : -1;
      const start = U.pageStart({ n: shown.length, kinds: shown.map((e) => e.k), fresh, prev, acted: true });
      if (fresh && start !== shown.length - fresh) { fail(`手 ${i}：本文の頁がこの手の記録だけにならない（頭 ${start}・並び ${shown.length}・増えた ${fresh}）`); break; }
      if (fresh && shown.slice(0, start).some((e) => shown.slice(start).includes(e))) { fail(`手 ${i}：前の頁の行が今の頁に混ざる`); break; }
      if (fresh) {
        turns++;
        const head = U.headOf(shown[start], a.label);
        if (!head && shown[start].k !== "you" && a.label) fail(`手 ${i}：選んだこと（${a.label}）が本文の頭に出ない`);
        if (shown[start].k === "you") youHead++;
        prevEntry = shown[start];
      }
      // 押さずに描き直す：頁は同じまま
      if (prevEntry && U.pageStart({ n: shown.length, kinds: shown.map((e) => e.k), fresh: 0, prev: shown.indexOf(prevEntry), acted: false }) !== shown.indexOf(prevEntry)) { fail(`手 ${i}：押さずに描き直すと頁が変わる`); break; }
      checked++;
    }
    G.log = log0;
  }
  if (turns < 100) fail(`記録が増えた手が少なすぎる（${turns}）`);
  if (youHead < turns * 0.3) fail(`「あなた」の行で始まる頁が少ない（${youHead}/${turns}）。行動の名前が本文の頭に出ていないかもしれない`);

  // ---------------------------------------------------------------- CSS
  const css = src("ui/zzzz_u19_page.css");
  if (!/#log\s*>\s*\.u19gone\s*\{[^}]*display:\s*none/.test(css)) fail("前の頁の行を隠す決まりが無い");
  if (!/#log\[data-u19head\]::after[^{]*\{[^}]*order:\s*-1/.test(css) || !/#log\[data-u19prev\]::before[^{]*\{[^}]*order:\s*-2/.test(css)) fail("頭の二行が #log の ::before／::after で頭に並ばない");
  if (!/white-space:\s*nowrap/.test(css)) fail("直前の手番の要約が一行に収まらない");
  const js = src("ui/zzzz_u19_page.js");
  if (/\.remove\(\)/.test(js.split("-- ログの窓")[0])) fail("本文の行を消している（隠すだけにする。並びで合わせるファイルがある）");
  if (!bad) ok(`U19：本文の頁 ${turns} 手（「あなた」の行で始まる ${youHead}）・記録は全部残る・確認 ${checked} 手`);
};
