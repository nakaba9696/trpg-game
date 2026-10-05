// Q7：「保存済み」を毎回出さない（持ち主の声「保存済みっていちいち出るの気になるからやめて」）
// 画面は DOM なしでは動かないので、作りを読んで確かめる（実際の出方は tools/check_q7_quietsave.mjs が Chromium で確かめる）
// - 行動のたびの自動保存（G.main.save）には、保存の印（u11.showSaved）を付けない
// - 印を出すのは、手動でセーブしたとき（「セーブしました」）と、町に着いてオートセーブの枠に書いたとき（「オートセーブしました」）だけ
// - 自動保存に失敗したとき（保存の場所が使えない・いっぱい）は知らせる（main.onSaveFail）
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export default ({ fail }) => {
  const F = (m) => fail("Q7 保存の印: " + m);
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
  const read = (f) => readFileSync(path.join(src, f), "utf8");
  const code = (t) => t.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n"); // コメントの行は見ない
  const u11 = code(read("ui/zu11_quick.js")), slots = code(read("ui/q7_slots.js")), main = code(read("main.js"));
  // 行動のたびの保存に印を付けない（main.save を包んで showSaved を呼ばない）
  if (/m\.save = \([^)]*\) => \{[^}]*showSaved/.test(u11) || /main\.save[^\n]*showSaved/.test(u11)) F("行動のたびの保存で「保存済み」が出る（zu11_quick.js が main.save を包んでいる）");
  for (const f of ["ui/ui.js", "main.js"]) if (/showSaved/.test(code(read(f)))) F(`${f} が保存の印を出している`);
  if (!/u11\.showSaved = \(text\)/.test(u11)) F("保存の印に出す文を渡せない");
  // 手動のセーブと町のオートセーブだけ
  if (!/showSaved\("✓ セーブしました"\)/.test(slots)) F("手動でセーブしたときに「セーブしました」が出ない");
  if (!/showSaved\("✓ オートセーブしました"\)/.test(slots)) F("町のオートセーブで「オートセーブしました」が出ない");
  const calls = [...slots.matchAll(/showSaved\(/g)].length;
  if (calls !== 2) F(`q7_slots.js の保存の印が 2 か所でない（${calls}）`);
  // 失敗したときは知らせる
  if (!/return true; \} catch \{ return false; \}/.test(main) || !/if \(!store\.write\("save"[^\n]*main\.onSaveFail/.test(main)) F("自動保存に失敗しても知らせない（main.js）");
  if (!/G\.main\.onSaveFail = /.test(slots) || !/ui\.toast\("保存できませんでした"/.test(slots)) F("自動保存の失敗を画面に出していない");
};
