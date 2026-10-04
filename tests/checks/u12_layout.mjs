// U12：冒険画面の選択肢は一行に一つ（PC 配置・スマホ配置とも）。見た目は src/ui/zu12_layout.css（DOM なしなので、書き方を読む）
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default ({ G, fail: fail0, ok }) => {
  let bad = 0;
  const fail = (m) => { bad++; fail0(m); };
  const dir = fileURLToPath(new URL("../../src/ui/", import.meta.url));
  const css = readFileSync(dir + "zu12_layout.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  // v9_pc.css（PC 配置）より後に足される名前でないと、PC の 2 列・3 列が勝ってしまう（tools/build.mjs は名前順）
  const order = readdirSync(dir).filter((n) => n.endsWith(".css")).sort();
  const later = order.filter((n) => n > "zu12_layout.css" && /alist|\.act\b/.test(readFileSync(dir + n, "utf8")));
  if (order.indexOf("zu12_layout.css") < order.indexOf("v9_pc.css")) fail("U12: zu12_layout.css が v9_pc.css より先に読まれる");
  if (later.length) fail(`U12: zu12_layout.css より後に選択肢の並べ方を変える CSS がある（${later.join("・")}）`);
  // 一列：ふつう・PC・PC の戦闘の 3 つとも
  const one = css.match(/([^{}]+)\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);[^}]*\}/);
  const sel = one ? one[1] : "";
  for (const s of [".alist", "body.v9pc .alist", "body.v9pc.v9combat .alist"]) if (!sel.split(",").map((x) => x.trim()).includes(s)) fail(`U12: ${s} が一列になっていない`);
  // 本文は左、補足は右寄せ。狭い画面でも補足は本文の行（入らなければ下）
  if (!/\.act\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap/.test(css) || !/\.act > span\s*\{[^}]*margin-left:\s*auto/.test(css)) fail("U12: 選択肢の補足が右寄せになっていない");
  // 選んだ行が分かる（マウス・キー）
  if (!/\.act:focus-visible/.test(css) || !/\.act:hover:not\(:disabled\)/.test(css)) fail("U12: マウスを乗せた行・キーで選んだ行が分からない");
  // 選択肢が多いときは選択肢の欄だけ流れる（スマホ配置。PC は #panel が流れる）
  if (!/\.alist:has\(> \.act:nth-child\(8\)\)\s*\{[^}]*overflow-y:\s*auto/.test(css)) fail("U12: 選択肢が多いとき、選択肢の欄が流れない");
  const v9 = readFileSync(dir + "v9_pc.css", "utf8");
  if (!/body\.v9pc #panel\s*\{[^}]*overflow-y:\s*auto/.test(v9)) fail("U12: PC 配置の選択肢の欄（#panel）が流れない");
  // 選択肢の中身は 本文（b）・補足（span）のまま（ui.js の actionButton）
  const ui = readFileSync(dir + "ui.js", "utf8");
  const ab = ui.slice(ui.indexOf("function actionButton("), ui.indexOf("function actionButton(") + 600);
  if (!/h\("b", "", a\.label\)/.test(ab) || !/h\("span", "", a\.sub\)/.test(ab)) fail("U12: 選択肢のボタンの中身（本文 b・補足 span）が変わった");
  // 出来事の選択肢には、判定の能力・難しさ・成功率が補足に出る
  const D = G.data;
  const ev = D.EVENTS.find((e) => e.choices.some((c) => c.stat));
  if (ev) {
    const stats = {};
    D.STATS.forEach((k) => { stats[k] = 44; });
    G.newGame({ cls: Object.keys(D.CLASSES)[0], stats, goal: "majin", profile: { name: "テスト", sex: "女", age: 24 } });
    G.startEvent(ev.id);
    const list = (G.actions()[0] || { list: [] }).list;
    const withStat = list.filter((a) => /\d+%/.test(a.sub || ""));
    if (G.S.mode === "event" && ev.choices.some((c, i) => c.stat && list.some((a) => a.id === "ev:" + i)) && !withStat.length) fail("U12: 出来事の選択肢の補足に成功率が出ない");
  }
  // 冒険中の右上に「新しい冒険」は置かない（タイトル画面と、終わった冒険の「新しい冒険を始める」からだけ。持ち主の決定）
  const html = readFileSync(fileURLToPath(new URL("../../src/index.html", import.meta.url)), "utf8");
  const main = readFileSync(fileURLToPath(new URL("../../src/main.js", import.meta.url)), "utf8");
  if (/id="newGame"|>新しい冒険</.test(html) || /#newGame/.test(main)) fail("U12: 冒険中の右上に「新しい冒険」のボタンが残っている");
  if (!/新しい冒険を始める/.test(ui) || !/toSetup\(\)/.test(ui)) fail("U12: 終わった冒険の画面から新しい冒険を始められない");
  if (!bad) ok("U12: 選択肢は一行に一つ（本文は左・補足は右）。多いときは選択肢の欄だけ流れる。冒険中の「新しい冒険」は無い");
};
