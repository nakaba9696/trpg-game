// U8：用語集に載る言葉の強調を撮る（Playwright。Chromium は PLAYWRIGHT_BROWSERS_PATH のもの）
// node tools/build.mjs && node tools/shots_u8.mjs
// docs/shots/u8/<1280|1920>_<light|dark>_<log|tip>.jpg を書く
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const VIEWS = { 1280: { width: 1280, height: 800 }, 1920: { width: 1920, height: 1080 } };
const browser = await pw.chromium.launch();
for (const [vn, vp] of Object.entries(VIEWS)) {
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: "reduce" });
    await page.goto(pathToFileURL(new URL("../dist/site/index.html", import.meta.url).pathname).href);
    await page.waitForFunction(() => window.G && G.main && G.ui && G.ui.render && G.gloss);
    await page.evaluate((theme) => { G.theme && G.theme.set(theme); const D = G.data, stats = {}, caps = {};
      D.STATS.forEach((k) => { stats[k] = 50; caps[k] = 60; });
      G.main.start({ cls: Object.keys(D.CLASSES)[0], stats, caps, goal: Object.keys(D.GOALS)[0], profile: { name: "撮影", sex: "女", age: 24, history: "撮影用", personality: "無口" } });
      G.openLore("gods:soras", true); G.openLore("redmoon:first", true);
      G.ui.render();
      const n = document.querySelector("#u8note"); if (n) n.textContent = "";
      // 次の手番：新しく載る語（使徒）と、前から載っている語（ソラス・赤い月・冒険者ギルド）
      G.log("you", "掲示板を読む");
      G.say("冒険者ギルドの掲示板に、古い張り紙がある。赤い月の晩には外に出るな、と書いてある。その下に、もっと新しい字で「使徒が出た。近づくな」。");
      G.say("ソラスさまに誓って本当だ、と受付の男は言った。赤い月の話は、もう誰も笑わない。");
      G.openLore("majin:first");
      G.ui.after();
      const t = document.querySelector("#toast"); if (t) t.style.display = "none";
    }, theme);
    await page.waitForTimeout(1500);
    const shot = async (name) => { const out = new URL(`../docs/shots/u8/${vn}_${theme}_${name}.jpg`, import.meta.url).pathname; await page.screenshot({ path: out, type: "jpeg", quality: 80 }); console.log("wrote", out); };
    await shot("log");
    await page.locator("#log > :not(.v9old) .u8term:not(.u8new)").first().hover();
    await page.waitForTimeout(300);
    await shot("tip");
    await page.close();
  }
}
await browser.close();
