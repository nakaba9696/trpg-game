// Q7：ステータスの「能力」のタブの「名声と評判」を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_q7_repute.mjs
// docs/shots/q7_repute/<pc|phone>_<light|dark>.jpg を書く。縦にはみ出すか（スクロールが要るか）も出す
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 } };
mkdirSync(new URL("../docs/shots/q7_repute/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce", colorScheme: theme });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.goto(url);
    await page.waitForFunction(() => window.G && G.main && G.ui && G.q7 && G.q7.repute);
    const fit = await page.evaluate((theme) => {
      if (G.theme && G.theme.set) G.theme.set(theme);
      const D = G.data, stats = {};
      D.STATS.forEach((k) => { stats[k] = 50; });
      G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
      const S = G.S, here = G.nationOf();
      const other = Object.values(D.LOCS).map((l) => l.nation || l.region).find((n) => n && n !== here && !(D.LAWLESS || []).includes(n));
      S.fame = 84; S.title = "騎士"; S.titleAt = here;
      S.repute = { [here]: { rep: 42, inf: 6, wanted: false }, [other]: { rep: 3, inf: 41, wanted: true } };
      G.main.save();
      G.ui.render();
      G.ui.setSheetOpen(true);
      document.querySelector("#stab-self").click();
      const t = document.querySelector("#toast"); if (t) t.style.display = "none";
      const s = document.querySelector("#sheet");
      return { scroll: s.scrollHeight, view: s.clientHeight };
    }, theme);
    console.log(vn, theme, fit.scroll <= fit.view + 2 ? "fits" : `scrolls ${fit.scroll}/${fit.view}`);
    await page.waitForTimeout(350);
    const out = new URL(`../docs/shots/q7_repute/${vn}_${theme}.jpg`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: "jpeg", quality: 82 });
    console.log(vn, theme, "errors:", errs.length ? errs : "none");
    await ctx.close();
  }
}
await browser.close();
