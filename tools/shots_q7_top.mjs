// Q7：右上のセーブ・ロードと、ログのダメージ（赤）・回復（緑）を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_q7_top.mjs
// docs/shots/q7_top/<pc|phone>_<light|dark>_<top|combat|nosave>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { try { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); } catch { pw = createRequire("/opt/node22/lib/node_modules/")("playwright"); } }
const VIEWS = { pc: { width: 1280, height: 860, scale: 1 }, phone: { width: 390, height: 844, scale: 2 }, narrow: { width: 360, height: 760, scale: 2 } };
mkdirSync(new URL("../docs/shots/q7_top/", import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const url = pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href;
for (const [vn, vp] of Object.entries(VIEWS)) {
  for (const theme of ["light", "dark"]) {
    if (vn === "narrow" && theme === "dark") continue;
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: "reduce", colorScheme: theme });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    const shot = async (name) => { await page.waitForTimeout(400); const out = new URL(`../docs/shots/q7_top/${vn}_${theme}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 82 }); console.log("wrote", out); };
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.goto(url);
    await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.openSlots);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await page.evaluate((theme) => {
      if (G.theme && G.theme.set) G.theme.set(theme);
      const D = G.data, stats = {};
      D.STATS.forEach((k) => { stats[k] = 50; });
      G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, goal: Object.keys(D.GOALS)[0], profile: { name: "ユリア", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
      const t = document.querySelector("#toast"); if (t) t.style.display = "none";
    }, theme);
    await shot("top");
    if (await overflow()) console.log(vn, theme, "OVERFLOW at top");
    // 戦闘：与えた・受けたダメージと回復のログ
    await page.evaluate(() => {
      const S = G.S;
      G.startCombat(["goblin"], {});
      G.log("sys", "ゴブリンに 7 のダメージ（残り 5/12）", { fx: "hit", foe: "ゴブリン", n: 7 });
      G.log("nar", "ゴブリンの攻撃！ 4 のダメージ。", { fx: "hurt", n: 4, heavy: false });
      G.note("HP +6");
      G.note("MP +3");
      G.note("HP -2");
      G.ui.render();
      const t = document.querySelector("#toast"); if (t) t.style.display = "none";
      const log = document.querySelector("#log"); if (log) log.scrollTop = log.scrollHeight;
    });
    await shot("combat");
    // 戦闘中にセーブを押す → 理由
    await page.evaluate(() => { const t = document.querySelector("#toast"); if (t) t.style.display = ""; });
    await page.evaluate(() => document.querySelector("#q7TopSave").click());
    await shot("nosave");
    if (await overflow()) console.log(vn, theme, "OVERFLOW in combat");
    console.log(vn, theme, "errors:", errs.length ? errs : "none");
    await ctx.close();
  }
}
await browser.close();
