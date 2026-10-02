// V5：話している人物の肖像（大きく立たせる）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_v5.mjs [前につける名前]
// docs/shots/v5/<名前>_<pc|sp>_<light|dark>_<出来事>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const tag = process.argv[2] || "after";
const EVENTS = (process.argv[3] || "c2_nora,c2_sheila_hire").split(",");
const VIEWS = { pc: { width: 1280, height: 800 }, sp: { width: 390, height: 844 } };
const browser = await pw.chromium.launch();
for (const [vn, vp] of Object.entries(VIEWS)) {
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: "reduce" });
    await page.goto(pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href);
    await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render);
    await page.evaluate((theme) => { G.theme && G.theme.set(theme); const D = G.data, stats = {}, caps = {};
      D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
      G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "撮影", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    }, theme);
    for (const id of EVENTS) {
      await page.evaluate((id) => { G.startEvent(G.data.EVENTS.find((e) => e.id === id)); G.ui.render(); window.scrollTo(0, 0); const t = document.querySelector("#toast"); if (t) t.style.display = "none"; }, id);
      await page.waitForTimeout(1500);
      const out = new URL(`../docs/shots/v5/${tag}_${vn}_${theme}_${id}.jpg`, import.meta.url).pathname;
      await page.screenshot({ path: out, type: "jpeg", quality: 78 });
      console.log("wrote", out);
    }
    await page.close();
  }
}
await browser.close();
