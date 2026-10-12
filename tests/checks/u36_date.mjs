// U36：今日の日付を左上の状態の窓にいつも短く出す（ui/zzzzzzzzz_u36_date.js。持ち主の声「今何日かの表示は左上に出して」）
// - 日付の文（DOM なし）：PC は年・季節・月・日、スマホは季節・月・日。暦（G.dateOf）と食い違わない
// - 要素は一つ（#u36date）を使い回す（何手進めても行が増えない）。PC・スマホで実際に一行に収まるかは tools/shots_u36.mjs が Chromium で見る
import { readFileSync } from "node:fs";
import vm from "node:vm";

export default ({ G, fail, ok }) => {
  const F = (m) => fail("U36 日付: " + m);
  const src = readFileSync(new URL("../../src/ui/zzzzzzzzz_u36_date.js", import.meta.url), "utf8");
  vm.runInContext(src, vm.createContext({ G }), { filename: "ui/zzzzzzzzz_u36_date.js" });
  const U = G.u36 || {};
  if (!U.dateText) return F("G.u36.dateText が無い");
  for (const day of [0, 1, 40, 95, 400, 3000]) {
    const full = U.dateText(day, false), short = U.dateText(day, true);
    const want = `${G.calYear(day)}年 ${G.SEASONS[G.calSi(day)]} ${G.MONTHS[G.calMi(day)]}${G.calMd(day)}日`;
    if (full !== want) F(`PC の日付が違う（${day} 日目）：${full}`);
    if (G.dateOf(day).replace(/\s+/g, "") !== full.replace(/\s+/g, "")) F(`暦（G.dateOf）と食い違う：${full} / ${G.dateOf(day)}`);
    if (!full.replace(/\s+/g, "").endsWith(short)) F(`スマホの日付が PC の日付の終わりと違う：${short}`);
  }
  if (!/el\.id = "u36date"/.test(src) || !/querySelectorAll\("\.u36date"\)\.forEach\(\(x\) => \{ if \(x !== el\) x\.remove\(\); \}\)/.test(src)) F("日付の要素を一つに保っていない（描くたびに増える）");
  ok("U36 日付：左上に今日の日付（PC は年から、スマホは季節から）");
};
