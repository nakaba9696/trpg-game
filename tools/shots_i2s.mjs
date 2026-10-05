// I2（装備の枠）：装備のタブ（7 枠）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_i2s.mjs
// docs/shots/i2s/<pc|phone>_<gear|twohand>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 360, height: 780, scale: 2 } };
mkdirSync(new URL("../docs/shots/i2s/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name) => { await page.waitForTimeout(400); const out = new URL(`../docs/shots/i2s/${vn}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.G && G.main && G.ui && G.i2s);
  await page.evaluate(() => {
    const D = G.data, stats = {};
    D.STATS.forEach((k) => { stats[k] = 50; });
    G.main.start({ cls: "merc", stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
    ["i2s_ironhelm", "i2s_leatherboots", "i2s_buckler", "i1_fangring", "i3w_greatsword", "dagger", "i2s_softboots"].forEach((id) => G.give(id));
    G.equip("i2s_ironhelm"); G.equip("i2s_leatherboots"); G.equip("i2s_buckler"); G.equip("i1_fangring");
    G.main.save();
    G.ui.render();
    G.ui.setSheetOpen(true);
    const t = document.querySelector("#toast"); if (t) t.style.display = "none";
  });
  await page.click("#stab-gear");
  await shot("gear");
  await page.evaluate(() => { G.equip("i3w_greatsword"); G.ui.render(); });
  await page.click("#stab-gear").catch(() => {});
  await shot("twohand");
  const over = await page.evaluate(() => { const d = document.querySelector(".i2doll"); return d ? [d.scrollWidth, d.clientWidth, document.documentElement.scrollWidth, innerWidth] : null; });
  console.log(vn, "doll widths", over, "errors:", errs.length ? errs : "none");
  await ctx.close();
}
await browser.close();
