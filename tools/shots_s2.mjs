// S2：作成画面の能力値（ふつうのとき・大当たりのとき）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_s2.mjs
// docs/shots/s2/<normal|lucky|jackpot>.jpg と、旅立つ前のシート sheet.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const browser = await pw.chromium.launch();
const out = (n) => new URL(`../docs/shots/s2/${n}.jpg`, import.meta.url).pathname;
for (const [name, tier] of [["normal", "ふつう"], ["lucky", "当たり"], ["jackpot", "大当たり"]]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href);
  await page.waitForFunction(() => window.G && G.setup && G.cre);
  await page.click('[data-fid="t-start"]');
  await page.click('[data-fid="p-next"]');
  await page.waitForSelector('[data-fid="s-roll"]');
  // 決めた段の数が出るまで振る
  for (let i = 0; i < 3000; i++) {
    const t = await page.locator(".bonusTier").first().textContent();
    if (t.replace("！", "") === tier) break;
    await page.click('[data-fid="s-roll"]');
  }
  // 高い能力値の上から 3 つへ順に配る
  await page.evaluate(() => {
    const rows = () => [...document.querySelectorAll(".creStats .srow")];
    const top = rows().map((r, i) => [i, Number(r.querySelector(".v").textContent)]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => i);
    for (let n = 0; n < 80; n++) {
      const can = top.map((i) => rows()[i].querySelector('[data-fid^="p-"]')).filter((b) => b && !b.disabled);
      if (!can.length) { const any = rows().map((r) => r.querySelector('[data-fid^="p-"]')).find((b) => b && !b.disabled); if (!any) break; any.click(); continue; }
      can[n % can.length].click();
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(name), type: "jpeg", quality: 82, fullPage: true });
  console.log("wrote", out(name));
  if (name === "jackpot") {
    await page.click('[data-fid="s-next"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: out("sheet"), type: "jpeg", quality: 82, fullPage: true });
    console.log("wrote", out("sheet"));
  }
  await page.close();
}
await browser.close();
