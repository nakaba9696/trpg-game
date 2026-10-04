// Q7：ステータスの整理（持ち主の声「ステータスに内容が入りすぎてる」。ui/ui.js の renderSheet・ui/q7_sheet.css）
// - タブで分ける：能力／装備と持ち物／仲間／その他。はじめは「能力」。前のタブは覚える（変数だけ。セーブには残さない）
// - ほかに入口があるものはステータスに置かない：受けている依頼（右上の「依頼」）・地図（右上）・セーブとロード（右上）・所持金（帯）・保存の説明
// - 「覚えていること」の欄も置かない（覚え書きは図鑑の各項目に振り分ける。V12）
// - 能力値の見出しに内部の数の説明（1点＝成功率4％）を出さない。名前の下に名声の数を出さない
// - ほかのファイルが書き足す所（持ち物の .ssec「持ち物」・装備の dl.kv の 武器/防具/装飾品・仲間の .comps .comp）は残す
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export default ({ fail }) => {
  const F = (m) => fail("Q7 ステータス: " + m);
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
  const read = (f) => readFileSync(path.join(src, f), "utf8");
  const ui = read("ui/ui.js");
  const a = ui.indexOf("// ---------------------------------------------------------------- キャラクターシート");
  const b = ui.indexOf("async function copyLog()");
  if (a < 0 || b < a) { F("ui.js のステータスの所が見つからない"); return; }
  const sheet = ui.slice(a, b).split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n"); // コメントの行は見ない

  // タブ
  const tabs = /const SHEET_TABS = (\[[^;]*\]);/.exec(sheet);
  if (!tabs) F("タブの表（SHEET_TABS）が無い");
  else {
    const labels = [...tabs[1].matchAll(/\["(\w+)", "([^"]+)"\]/g)].map((m) => m[2]);
    if (labels.join("／") !== "能力／装備と持ち物／仲間／その他") F(`タブの並びが違う：${labels.join("／")}`);
  }
  if (!/let sheetTab = "self";/.test(sheet)) F("はじめのタブが「能力」でない");
  if (/S\.sheetTab|G\.S\.[a-z]*[Tt]ab/.test(sheet)) F("開いていたタブをセーブに残している");
  if (!/role", "tablist"/.test(sheet) || !/role", "tab"/.test(sheet) || !/role", "tabpanel"/.test(sheet)) F("タブに tablist・tab・tabpanel の役割が無い");
  if (!/ArrowRight/.test(sheet)) F("タブを矢印キーで移れない");

  // ほかに入口があるものを置かない
  if (/function sheetQuests|`受けている依頼/.test(sheet)) F("受けている依頼がステータスに残っている（右上の「依頼」がある）");
  if (/mk\("地図"/.test(sheet)) F("地図のボタンがステータスに残っている（右上の「地図」がある）");
  if (/\["所持金"/.test(sheet)) F("所持金がステータスに残っている（帯に出ている）");
  if (/\["日付"|\["場所"/.test(sheet)) F("日付・場所がステータスに残っている（場面の絵の下に出ている）");
  if (/自動で保存される/.test(sheet)) F("保存の説明の文が残っている");
  for (const f of ["ui/q7_slots.js", "ui/q7_quests.js"]) if (/#sheet \.sheet-actions/.test(read(f))) F(`${f} がまだステータスに入口を書き足している`);

  // 覚え書きは図鑑の各項目へ（V12）。ステータスには「覚えていること」の欄を置かない
  if (/function sheetMemos|"覚えていること"/.test(sheet)) F("ステータスに「覚えていること」の欄が残っている");

  // 内部の数の説明
  if (/成功率4％|1点＝/.test(sheet)) F("能力値の見出しに内部の数の説明が残っている");
  if (/（名声 \$\{S\.fame\}）/.test(sheet)) F("名前の下に名声の数が出ている");

  // ほかのファイルが書き足す所
  if (!/sheetSection\("inv", `持ち物/.test(sheet)) F("持ち物の欄（.ssec「持ち物」）が無い（I2・I3 が書き足す）");
  if (!/\["武器"/.test(sheet) || !/\["防具"/.test(sheet) || !/\["装飾品"/.test(sheet)) F("装備の表（武器・防具・装飾品）が無い");
  if (!/h\("div", "comps"\)/.test(sheet)) F("仲間の .comps が無い（会話の「話す」が書き足す）");
  if (!/mk\("物語を終える|const label = can \? "物語を終える"/.test(sheet)) F("「物語を終える」が無い");
  if (!/mk\("年表"/.test(sheet) || !/mk\("ログをコピー"/.test(sheet) || !/mk\("タイトルへ"/.test(sheet)) F("年表・ログをコピー・タイトルへ のどれかが無い");

  const css = read("ui/q7_sheet.css");
  if (!/\.spane\[hidden\] \{ display: none; \}/.test(css)) F("見せないタブが隠れない");
};
