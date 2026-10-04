// Q7：ステータスのタブ（能力／装備と持ち物／仲間／その他）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_q7_sheet.mjs
// docs/shots/q7_sheet/<pc|phone>_<self|gear|party|more>.jpg を書く。どのタブも縦にはみ出さず（スクロールなしで）収まるかを出す
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/q7_sheet/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openSlots);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    G.addCompanion({ name: "弓使いのセラ", cls: "弓使い", power: 40, dmg: 1, desc: "無口だが義理堅い" });
    G.addCompanion({ name: "剣士のロイド", cls: "剣士", power: 45, dmg: 1, desc: "陽気なほら吹き" });
    G.memo && G.memo("港町の古株の写し手は、昔話を振ると口が軽くなる");
    G.main.save();
    G.ui.render();
    G.ui.setSheetOpen(true);
    const t = document.querySelector("#toast"); if (t) t.style.display = "none";
  });
  for (const tab of ["self", "gear", "party", "more"]) {
    await page.click(`#stab-${tab}`);
    await page.waitForTimeout(350);
    const fit = await page.evaluate(() => { const s = document.querySelector("#sheet"); return { scroll: s.scrollHeight, view: s.clientHeight }; });
    console.log(vn, tab, fit.scroll <= fit.view + 2 ? "fits" : `scrolls ${fit.scroll}/${fit.view}`);
    const out = new URL(`../docs/shots/q7_sheet/${vn}_${tab}.jpg`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: "jpeg", quality: 82 });
  }
  // 閉じて開き直すと、前のタブのまま
  const kept = await page.evaluate(() => { G.ui.setSheetOpen(false); G.ui.render(); G.ui.setSheetOpen(true); return document.querySelector("#stab-more").getAttribute("aria-selected"); });
  console.log(vn, "tab kept after reopen:", kept, "errors:", errs.length ? errs : "none");
  await ctx.close();
}
await browser.close();
