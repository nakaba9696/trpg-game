// U32：作成画面の能力値で、振り直したあとの合計と術の才がスクロールなしで見えるかを撮って確かめる（Playwright）
// node tools/build.mjs && node tools/shots_u32.mjs → docs/review/u32/*.png
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = new URL("../docs/review/u32/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const browser = await pw.chromium.launch();
let bad = 0;
for (const [name, vp] of [["pc1366", { width: 1366, height: 768 }], ["pc1600", { width: 1600, height: 900 }], ["phone390", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp, reducedMotion: "reduce" });
  await page.goto(pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href);
  await page.waitForFunction(() => window.G && G.setup && G.cre);
  await page.click('[data-fid="t-start"]');
  await page.click('[data-fid="p-next"]');
  await page.waitForTimeout(300);
  for (let n = 0; n < 4; n++) {
    const re = page.locator("button", { hasText: "振り直す" }).first();
    if (await re.count()) await re.click();
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const vh = innerHeight, q = (s) => document.querySelector(s);
      const inView = (e) => { if (!e) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.top >= 0 && b.bottom <= vh; };
      return { sum: inView(q(".u32top .statSum")), tal: inView(q(".u32tal")), btn: !!q(".u32top") };
    });
    console.log(name, n, JSON.stringify(r));
    if (!r.sum || !r.tal) bad++;
    if (n === 3) await page.screenshot({ path: dir + name + ".png" });
  }
  await page.close();
}
await browser.close();
if (bad) { console.error("見えない回:", bad); process.exit(1); }
